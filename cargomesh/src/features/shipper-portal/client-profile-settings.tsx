'use client';

import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { z } from 'zod';
import { Plus, Trash2 } from 'lucide-react';
import { Button, Dialog, Input, Select } from '@/components/ui';
import { useLocale } from '@/features/i18n/locale-provider';
import { CargoProfileCards } from './cargo-profile-cards';
import { profileOptionLabel } from './cargo-profile-presentation';
import { CatalogInputsV2, CatalogRecordV2Schema, parseCatalogRecordV2, type CatalogRecordV2 } from '@/shared/schemas/v2/catalog';
import { IntakeOptionsV2ResponseSchema, RequirementCodeV2Schema } from '@/shared/schemas/v2/intake-options';
import { EquipmentCodeV2Schema, TransportModeV2Schema, RankingObjectiveV2Schema } from '@/shared/schemas/v2/freight-request';
import { ClientSettingsError, collectionSchema, recordSchema, settingsRequest, settingsCommand, sendSettingsCommand, settingsError, type SettingsCommand } from './client-settings-api';
import styles from './client-settings.module.css';
import modalStyles from './cargo-profile-modal.module.css';

type Kind = 'cargo-profiles' | 'preferences';
type Profile = z.infer<typeof CatalogInputsV2['cargo-profiles']>;
type Preference = z.infer<typeof CatalogInputsV2['preferences']>;

function cleanDemoText(text: string | null | undefined): string {
  if (!text) return '';
  return text.replace(/^\[SYNTHETIC\]\s*/i, '').replace(/\s*·\s*Demo$/i, '').trim();
}

const blankProfile: Profile = {
  schemaVersion: '2.0',
  name: '',
  categoryId: '',
  typicalUnits: [],
  requirements: [],
  preferredEquipment: null,
  active: true,
};

const blankPreference: Preference = {
  schemaVersion: '2.0',
  objective: null,
  maximumWaitMinutes: null,
  preferredMode: null,
  preferredEquipment: null,
  usualBudget: null,
  validUntil: null,
};

const blankUnit = {
  packageType: 'PALLET',
  quantity: 1,
  weightPerUnitKg: 1,
  volumePerUnitM3: 1,
  dimensionsCm: { length: 100, width: 100, height: 100 },
  indivisible: false,
  stackable: false,
  unitsPerPackage: 1,
};

const endpoint = (kind: Kind) => (kind === 'cargo-profiles' ? '/cargo-profiles' : '/organizations/current/preferences');

export function ClientCatalogSettings({ kind, editable, organization = false, createSignal = 0 }: { kind: Kind; editable: boolean; organization?: boolean; createSignal?: number }) {
  const {t}=useLocale();
  const [records, setRecords] = useState<CatalogRecordV2[]>([]);
  const [selected, setSelected] = useState<CatalogRecordV2 | null>(null);
  const [creating, setCreating] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [offset, setOffset] = useState(0);
  const [next, setNext] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const label = kind === 'cargo-profiles' ? 'Cargo profiles' : 'Transport preferences';
  const read = useRef(0);

  async function load(at = offset) {
    const ticket = ++read.current;
    setLoading(true);
    setError('');
    try {
      const response = await settingsRequest(
        endpoint(kind) + '?limit=25&offset=' + at,
        collectionSchema(CatalogRecordV2Schema)
      );
      if (ticket !== read.current) return;
      const current = response.data.map(v => parseCatalogRecordV2(kind, v));
      setRecords(current);
      setOffset(at);
      setNext(response.meta.nextOffset);
      if (kind === 'cargo-profiles') {
        const options = await settingsRequest('/intake/options', IntakeOptionsV2ResponseSchema);
        if (ticket === read.current) setCategories(options.data.cargoCategories);
      }
    } catch (e) {
      if (ticket === read.current) setError(settingsError(e));
    } finally {
      if (ticket === read.current) setLoading(false);
    }
  }

  async function open(id: string) {
    setError('');
    try {
      const response = await settingsRequest(endpoint(kind) + '/' + id, recordSchema(CatalogRecordV2Schema));
      setSelected(parseCatalogRecordV2(kind, response.data));
      setCreating(false);
    } catch (e) {
      setError(settingsError(e));
    }
  }

  useEffect(() => {
    void load(offset);
    return () => {
      read.current++;
    };
  }, []);

  useEffect(()=>{if(organization&&editable&&createSignal>0){setCreating(true);setSelected(null);setMessage('');}},[createSignal,organization,editable]);

  if(organization&&kind==='cargo-profiles')return <div>
    {error&&<p className={styles.error} role="alert">{error} <Button variant="ghost" size="compact" onClick={()=>void load()}>{t('Reintentar','Retry')}</Button></p>}
    {message&&<p className={styles.success} role="status">{message}</p>}
    {loading&&!records.length?<div className={modalStyles.skeletonBone} style={{height:180}} aria-label={t('Cargando perfiles','Loading profiles')} aria-busy="true"/>:<CargoProfileCards records={records} categories={categories} editable={editable} busy={loading} onOpen={id=>void open(id)}/>}
    <div className={styles.actions}>{offset>0&&<Button variant="secondary" size="compact" disabled={loading} onClick={()=>void load(Math.max(0,offset-25))}>{t('Anterior','Previous')}</Button>}{next!==null&&<Button variant="secondary" size="compact" disabled={loading} onClick={()=>void load(next)}>{t('Siguiente','Next')}</Button>}</div>
    {(selected||creating)&&<CargoProfileModal key={selected?selected.id+':'+selected.version:'new'} kind={kind} record={selected} editable={editable} categories={categories} onClose={()=>{setSelected(null);setCreating(false);}} onReload={()=>selected&&void open(selected.id)} onSaved={async()=>{setSelected(null);setCreating(false);setMessage(t('Perfil guardado.','Profile saved.'));await load(offset);}}/>}
  </div>;

  return (
    <section className={styles.panel}>
      <div className={styles.header}>
        <div>
          <h2>{label}</h2>
          <p className={styles.muted}>
            {kind === 'cargo-profiles'
              ? 'Reuse saved cargo units and requirements when preparing a request.'
              : 'Preferences guide planning; they never authorize booking or confirm availability.'}
          </p>
        </div>
        {editable && (kind === 'cargo-profiles' || records.length === 0) && (
          <button
            type="button"
            className={modalStyles.createBtn}
            onClick={() => {
              setCreating(true);
              setSelected(null);
              setMessage('');
            }}
          >
            Create {kind === 'cargo-profiles' ? 'cargo profile' : 'preferences'}
          </button>
        )}
      </div>

      {error && (
        <div className={styles.error} role="alert">
          {error} <Button variant="secondary" onClick={() => void load()}>Retry</Button>
        </div>
      )}
      {message && <p className={styles.success} role="status">{message}</p>}

      {loading && !records.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '10px 0' }} aria-busy="true">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className={modalStyles.skeletonBone}
              style={{ height: '54px', borderRadius: '10px' }}
            />
          ))}
        </div>
      ) : (
        <>
          <div className={styles.list}>
            {records.map(record => (
              <button
                className={styles.item}
                type="button"
                key={record.id}
                aria-pressed={selected?.id === record.id}
                onClick={() => void open(record.id)}
              >
                <strong>
                  {kind === 'cargo-profiles'
                    ? cleanDemoText((record.value as Profile).name) || (record.value as Profile).name
                    : 'Organization transport preferences'}
                </strong>
                <span className={styles.muted}>
                  Version {record.version} · {record.id}
                </span>
              </button>
            ))}
          </div>
          {!records.length && <p className={styles.empty}>No {label.toLowerCase()} saved.</p>}
          <div className={styles.actions}>
            {offset > 0 && (
              <Button variant="secondary" onClick={() => void load(Math.max(0, offset - 25))}>
                Previous
              </Button>
            )}
            {next !== null && (
              <Button variant="secondary" onClick={() => void load(next)}>
                Next
              </Button>
            )}
          </div>
        </>
      )}

      {(selected || creating) && (
        <CargoProfileModal
          key={selected ? selected.id + ':' + selected.version : 'new'}
          kind={kind}
          record={selected}
          editable={editable}
          categories={categories}
          onClose={() => {
            setSelected(null);
            setCreating(false);
          }}
          onReload={() => selected && void open(selected.id)}
          onSaved={async () => {
            setSelected(null);
            setCreating(false);
            setMessage(label + ' saved and read back from the database.');
            await load(offset);
          }}
        />
      )}
    </section>
  );
}

function CargoProfileModal({
  kind,
  record,
  editable,
  categories,
  onClose,
  onSaved,
  onReload,
}: {
  kind: Kind;
  record: CatalogRecordV2 | null;
  editable: boolean;
  categories: { id: string; name: string }[];
  onClose: () => void;
  onSaved: (value: CatalogRecordV2) => Promise<void>;
  onReload: () => void;
}) {
  const {t}=useLocale(),formId=useId();
  const [value, setValue] = useState<Profile | Preference>(
    record
      ? (record.value as Profile | Preference)
      : kind === 'cargo-profiles'
      ? { ...blankProfile, categoryId: categories[0]?.id ?? '', typicalUnits:[{...blankUnit,dimensionsCm:{...blankUnit.dimensionsCm}}] }
      : blankPreference
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(false);
  const pending = useRef<SettingsCommand | null>(null);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!editable || busy || conflict) return;
    try {
      const parsed = CatalogInputsV2[kind].parse(value);
      const route = endpoint(kind) + (record ? '/' + record.id + '/revisions' : '');
      pending.current = settingsCommand(
        route,
        record ? { expectedVersion: record.version, value: parsed } : parsed,
        pending.current
      );
      setBusy(true);
      setError('');
      const response = await sendSettingsCommand(pending.current, recordSchema(CatalogRecordV2Schema));
      const current = await settingsRequest(endpoint(kind) + '/' + response.data.id, recordSchema(CatalogRecordV2Schema));
      pending.current = null;
      await onSaved(parseCatalogRecordV2(kind, current.data));
    } catch (e) {
      setError(settingsError(e));
      setConflict(e instanceof ClientSettingsError && e.code === 'STALE_DRAFT');
    } finally {
      setBusy(false);
    }
  }

  const titleText = record
    ? kind === 'cargo-profiles'
      ? t('Editar perfil de carga','Edit cargo profile')
      : t('Preferencias guardadas','Saved preferences')
    : kind === 'cargo-profiles'
    ? t('Crear perfil de carga','Create cargo profile')
    : t('Nuevas preferencias','New preferences');

  return <Dialog open title={titleText} description={kind==='cargo-profiles'?t('Guarda tu carga habitual para reutilizarla en nuevas solicitudes.','Save recurring cargo so you can reuse it in new requests.'):t('Preferencias de planificación.','Planning preferences.')} className={modalStyles.dialog} closeLabel={t('Cerrar','Close')} closeDisabled={busy} onClose={onClose}
    footer={<><Button type="button" variant="secondary" disabled={busy} onClick={onClose}>{t('Cancelar','Cancel')}</Button>{record&&conflict&&<Button type="button" variant="secondary" disabled={busy} onClick={onReload}>{t('Recargar versión actual','Reload latest')}</Button>}{editable&&<Button type="submit" form={formId} className={modalStyles.saveButton} disabled={busy||conflict} isLoading={busy}>{error&&!conflict?t('Reintentar','Retry save'):record?t('Guardar cambios','Save changes'):t('Guardar perfil','Save profile')}</Button>}</>}>
    <form id={formId} className={modalStyles.modalForm} onSubmit={save}>
      {!editable&&<p className={styles.muted}>{t('Tu rol permite consultar este perfil.','Your role can view this profile.')}</p>}
      <fieldset disabled={!editable||busy||conflict}>{kind==='cargo-profiles'?<ProfileFields value={value as Profile} onChange={setValue} categories={categories}/>:<PreferenceFields value={value as Preference} onChange={setValue}/>}</fieldset>
      {error&&<p className={styles.error} role="alert">{error}</p>}
    </form>
  </Dialog>;
}
function Equipment({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (value: Profile['preferredEquipment']) => void;
}) {
  const {t}=useLocale();
  return (
    <Select
      label={t('Equipo preferido','Preferred equipment')}
      value={value ?? ''}
      onChange={e => onChange((e.target.value as Profile['preferredEquipment']) || null)}
    >
      <option value="">{t('Sin preferencia','No preference')}</option>
      {EquipmentCodeV2Schema.options.map(v => (
        <option key={v} value={v}>{profileOptionLabel(v,t)}</option>
      ))}
    </Select>
  );
}

function ProfileFields({value,onChange,categories}:{value:Profile;onChange:(value:Profile)=>void;categories:{id:string;name:string}[]}) {
  const {t}=useLocale();
  const updateUnit=(index:number,patch:Partial<Profile['typicalUnits'][number]>)=>onChange({...value,typicalUnits:value.typicalUnits.map((unit,i)=>i===index?{...unit,...patch}:unit)});
  const requirements=[...new Set([...RequirementCodeV2Schema.options,...value.requirements])];
  return <>
    <div className={modalStyles.fieldsGrid}>
      <Input label={t('Nombre del perfil','Profile name')} placeholder={t('Ej. Pallets de productos empacados','e.g. Pallets of packaged goods')} value={value.name} onChange={event=>onChange({...value,name:event.target.value})} required maxLength={200}/>
      <Select label={t('Categoría de carga','Cargo category')} value={value.categoryId} required onChange={event=>onChange({...value,categoryId:event.target.value})}>
        <option value="">{t('Seleccionar categoría','Select category')}</option>{value.categoryId&&!categories.some(row=>row.id===value.categoryId)&&<option value={value.categoryId}>{t('Categoría guardada (inactiva)','Saved category (inactive)')}</option>}
        {categories.map(row=><option key={row.id} value={row.id}>{cleanDemoText(row.name)||row.name}</option>)}
      </Select>
      <Equipment value={value.preferredEquipment} onChange={preferredEquipment=>onChange({...value,preferredEquipment})}/>
      <label className={modalStyles.active}><input type="checkbox" role="switch" checked={value.active} onChange={event=>onChange({...value,active:event.target.checked})}/><span>{t('Perfil activo','Active profile')}</span></label>
    </div>
    <section className={modalStyles.sectionBlock}><h3 className={modalStyles.sectionTitle}>{t('Requisitos de manipulación','Handling requirements')} <span>· {t('opcional','optional')}</span></h3>
      <div className={modalStyles.reqGrid}>{requirements.map(requirement=><button key={requirement} type="button" aria-pressed={value.requirements.includes(requirement)} onClick={()=>onChange({...value,requirements:value.requirements.includes(requirement)?value.requirements.filter(item=>item!==requirement):[...value.requirements,requirement]})}>{profileOptionLabel(requirement,t)}</button>)}</div>
    </section>
    <section className={modalStyles.sectionBlock}><header className={modalStyles.unitsHeading}><h3 className={modalStyles.sectionTitle}>{t('Plantillas de unidades de carga','Cargo unit templates')}</h3><Button type="button" variant="secondary" size="compact" disabled={value.typicalUnits.length>=100} onClick={()=>onChange({...value,typicalUnits:[...value.typicalUnits,{...blankUnit,dimensionsCm:{...blankUnit.dimensionsCm}}]})}><Plus size={14}/>{t('Agregar unidad','Add unit')}</Button></header>
      {!value.typicalUnits.length&&<p className={styles.muted}>{t('Agrega una unidad para guardar medidas y cantidades.','Add a unit to save dimensions and quantities.')}</p>}
      {value.typicalUnits.map((unit,index)=><div key={index} className={modalStyles.unitCard}>
        <div className={modalStyles.unitPrimary}>
          <Select label={t('Embalaje','Packaging')} value={unit.packageType} onChange={event=>updateUnit(index,{packageType:event.target.value})}>{Array.from(new Set(['PALLET','BOX','CRATE','DRUM','BULK',unit.packageType])).map(type=><option value={type} key={type}>{profileOptionLabel(type,t)}</option>)}</Select>
          <Input label={t('Cantidad','Quantity')} type="number" min={1} step={1} required value={unit.quantity} onChange={event=>updateUnit(index,{quantity:Number(event.target.value)})}/>
          <Input label={t('Peso por unidad (kg)','Weight per unit (kg)')} type="number" min={0.000001} step="any" required value={unit.weightPerUnitKg} onChange={event=>updateUnit(index,{weightPerUnitKg:Number(event.target.value)})}/>
          <Input label={t('Volumen por unidad (m³)','Volume per unit (m³)')} type="number" min={0.000001} step="any" required value={unit.volumePerUnitM3} onChange={event=>updateUnit(index,{volumePerUnitM3:Number(event.target.value)})}/>
        </div>
        <div className={modalStyles.unitSecondary}><fieldset className={modalStyles.dimensionFields}><legend>{t('Dimensiones (cm)','Dimensions (cm)')} <span>{t('L × A × H','L × W × H')}</span></legend><div>{(['length','width','height'] as const).map(dimension=><Input key={dimension} label={dimension==='length'?t('Largo','Length'):dimension==='width'?t('Ancho','Width'):t('Alto','Height')} type="number" min={0.000001} step="any" required value={unit.dimensionsCm[dimension]} onChange={event=>updateUnit(index,{dimensionsCm:{...unit.dimensionsCm,[dimension]:Number(event.target.value)}})}/>)}</div></fieldset>
          <Input label={t('Unidades por bulto','Units per package')} type="number" min={1} step={1} max={1000000} required value={unit.unitsPerPackage} onChange={event=>updateUnit(index,{unitsPerPackage:Number(event.target.value)})}/>
        </div>
        <div className={modalStyles.unitFooter}><div className={modalStyles.reqGrid}><button type="button" aria-pressed={unit.indivisible} onClick={()=>updateUnit(index,{indivisible:!unit.indivisible})}>{t('Indivisible','Indivisible')}</button><button type="button" aria-pressed={unit.stackable} onClick={()=>updateUnit(index,{stackable:!unit.stackable})}>{t('Apilable','Stackable')}</button></div>
          <Button type="button" variant="ghost" size="compact" className={modalStyles.removeUnit} onClick={()=>onChange({...value,typicalUnits:value.typicalUnits.filter((_,i)=>i!==index)})}><Trash2 size={13}/>{t('Quitar unidad','Remove unit')}</Button></div>
      </div>)}
    </section>
  </>;
}
function PreferenceFields({
  value,
  onChange,
}: {
  value: Preference;
  onChange: (value: Preference) => void;
}) {
  return (
    <div className={modalStyles.fieldsGrid}>
      <Select
        label="Ranking objective"
        value={value.objective ?? ''}
        onChange={e => onChange({ ...value, objective: (e.target.value as Preference['objective']) || null })}
      >
        <option value="">No preference</option>
        {RankingObjectiveV2Schema.options.map(v => (
          <option key={v}>{v}</option>
        ))}
      </Select>
      <Input
        label="Maximum wait (minutes)"
        type="number"
        min={0}
        max={525600}
        step={1}
        value={value.maximumWaitMinutes ?? ''}
        onChange={e =>
          onChange({
            ...value,
            maximumWaitMinutes: e.target.value === '' ? null : Number(e.target.value),
          })
        }
      />
      <Select
        label="Preferred mode"
        value={value.preferredMode ?? ''}
        onChange={e => onChange({ ...value, preferredMode: (e.target.value as Preference['preferredMode']) || null })}
      >
        <option value="">No preference</option>
        {TransportModeV2Schema.options.map(v => (
          <option key={v}>{v}</option>
        ))}
      </Select>
      <Equipment value={value.preferredEquipment} onChange={v => onChange({ ...value, preferredEquipment: v })} />
      <Input
        label="Usual budget (USD)"
        type="number"
        min={0.01}
        step="any"
        value={value.usualBudget?.amount ?? ''}
        onChange={e =>
          onChange({
            ...value,
            usualBudget: e.target.value === '' ? null : { amount: Number(e.target.value), currency: 'USD' },
          })
        }
      />
      <Input
        label="Valid until (ISO instant, optional)"
        hint="Include Z or an explicit offset, for example 2026-11-01T00:00:00Z."
        value={value.validUntil ?? ''}
        onChange={e => onChange({ ...value, validUntil: e.target.value || null })}
      />
    </div>
  );
}
