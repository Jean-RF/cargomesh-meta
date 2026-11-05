'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Building2, Plus } from 'lucide-react';
import { Button, Dialog, Input, Select } from '@/components/ui';
import { WorkspaceLink as Link } from '@/features/workspace-mode/workspace-link';
import { useLocale } from '@/features/i18n/locale-provider';
import { OrganizationRecordV2Schema, OrganizationValueV2Schema, type OrganizationV2 } from '@/shared/schemas/v2/organization';
import { ClientSettingsError, recordSchema, settingsRequest, settingsCommand, sendSettingsCommand, settingsError, type SettingsCommand } from './client-settings-api';
import { ClientCatalogSettings } from './client-profile-settings';
import { OrganizationDocuments } from '@/features/documents/document-panel';
import { OrganizationOverview } from './organization-overview';
import { operationsHistoryState } from './operations-query';
import styles from './client-settings.module.css';
import orgStyles from './client-organization.module.css';
import design from './organization-design.module.css';

function cleanDemoText(text: string | null | undefined): string {
  return (text ?? '').replace(/^\[SYNTHETIC\]\s*/i, '').replace(/\s*·\s*Demo$/i, '').trim();
}
const schema = recordSchema(OrganizationRecordV2Schema);
const previewOrganization: OrganizationV2 = {
  id: '00000000-0000-4000-8000-000000000001', version: 1,
  value: {schemaVersion: '2.0', code: 'LOCAL_PREVIEW', commercialName: 'Northstar Logistics · Test organization',
    legalName: 'Northstar Logistics', taxIdType: null, taxIdValue: null, countryCode: 'PE',
    corporateEmail: 'operations@example.test', corporatePhone: '+5115550100', defaultCurrency: 'USD', status: 'ACTIVE'},
  createdAt: '2026-10-27T00:00:00Z', updatedAt: '2026-10-27T00:00:00Z',
};
const organizationTabs = ['overview', 'documents', 'profiles'] as const;
type OrganizationTab = typeof organizationTabs[number];

export function ClientOrganization({ role, preview = false }: { role: 'OWNER' | 'SUPERVISOR' | 'REQUESTER'; preview?: boolean }) {
  const {t}=useLocale(),params=useSearchParams(),pathname=usePathname();
  const current:OrganizationTab=organizationTabs.find(tab=>tab===params.get('tab'))??'overview';
  const [visited,setVisited]=useState<Set<OrganizationTab>>(()=>new Set([current]));
  const [record,setRecord]=useState<OrganizationV2|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true),[notice,setNotice]=useState('');
  const [editing,setEditing]=useState(false),[editBusy,setEditBusy]=useState(false),[createSignal,setCreateSignal]=useState(0);
  const read=useRef(0),tabs=useRef(new Map<OrganizationTab,HTMLButtonElement>());
  async function load(){const ticket=++read.current;if(preview){setRecord(previewOrganization);setError('');setLoading(false);return;}setLoading(true);setError('');try{const result=await settingsRequest('/organizations/current',schema);if(ticket===read.current)setRecord(result.data);}catch(e){if(ticket===read.current)setError(settingsError(e));}finally{if(ticket===read.current)setLoading(false);}}
  useEffect(()=>{void load();return()=>{read.current++;};},[preview]);
  function select(tab:OrganizationTab){setVisited(old=>new Set([...old,tab]));const next=new URLSearchParams(window.location.search);if(tab==='overview')next.delete('tab');else next.set('tab',tab);window.history.replaceState(operationsHistoryState(window.history.state),'',`${pathname}${next.size?'?'+next:''}`);}
  const labels={overview:t('Resumen','Overview'),documents:t('Documentos','Documents'),profiles:t('Perfiles de carga','Cargo profiles')};
  const roleLabel={OWNER:t('Propietario','Owner'),SUPERVISOR:t('Supervisor','Supervisor'),REQUESTER:t('Solicitante','Requester')}[role];
  if(loading&&!record&&current!=='documents')return <OrganizationSkeleton/>;
  return <div className={design.page}>
    <section className={design.header} aria-label={t('Organización','Organization')}><div className={design.headerTop}>
      <span className={design.logo}><Building2 size={26}/></span><div className={design.identity}><h1>{cleanDemoText(record?.value.commercialName)||t('Organización','Organization')}</h1><div className={design.badges}>
        {record&&<span className={design.badge} data-active={record.value.status==='ACTIVE'}>{record.value.status==='ACTIVE'?t('Activa','Active'):t('Inactiva','Inactive')}</span>}
        <span className={design.badge}>{t('Cliente','Client')}</span><span className={design.badge} data-blue="true">{roleLabel}</span>
      </div></div><div className={design.headerActions}><Link className={design.link} href="/facilities"><Building2 size={14}/>{t('Ver sedes','View facilities')}</Link>
        <button type="button" className={design.primary} disabled={!record||preview||role==='REQUESTER'} onClick={()=>{select('profiles');setCreateSignal(value=>value+1);}}><Plus size={15}/>{t('Perfil de carga','Cargo profile')}</button>
      </div></div><nav className={design.tabs} role="tablist" aria-label={t('Secciones de organización','Organization sections')}>{organizationTabs.map((tab,index)=><button type="button" role="tab" id={`organization-tab-${tab}`} aria-controls={`organization-panel-${tab}`} aria-selected={current===tab} tabIndex={current===tab?0:-1} key={tab}
        ref={node=>{if(node)tabs.current.set(tab,node);else tabs.current.delete(tab);}} onClick={()=>select(tab)} onKeyDown={event=>{const next=event.key==='ArrowRight'?organizationTabs[(index+1)%organizationTabs.length]:event.key==='ArrowLeft'?organizationTabs[(index+organizationTabs.length-1)%organizationTabs.length]:event.key==='Home'?organizationTabs[0]:event.key==='End'?organizationTabs[organizationTabs.length-1]:null;if(next){event.preventDefault();select(next);tabs.current.get(next)?.focus();}}}>{labels[tab]}</button>)}</nav>
    </section>
    {notice&&<p className={design.notice} role="status">{notice}</p>}
    {error&&<div className={design.error} role="alert">{error} <Button variant="ghost" size="compact" disabled={loading} onClick={()=>void load()}>{t('Reintentar','Retry')}</Button></div>}
    {organizationTabs.map(tab=><section className={design.tabPanel} key={tab} role="tabpanel" id={`organization-panel-${tab}`} aria-labelledby={`organization-tab-${tab}`} hidden={current!==tab}>
      {(visited.has(tab)||current===tab)&&(tab==='overview'?record?<OrganizationOverview record={record} owner={role==='OWNER'} preview={preview} onEdit={()=>setEditing(true)}/>:null
        :tab==='profiles'?preview?<p className={design.notice}>{t('Los perfiles requieren una organización conectada.','Profiles require a connected organization.')}</p>:record?<ClientCatalogSettings kind="cargo-profiles" editable={role!=='REQUESTER'} organization createSignal={createSignal}/>:null
        :preview?<p className={design.notice}>{t('Los documentos privados requieren una organización conectada.','Private documents require a connected organization.')}</p>:role==='REQUESTER'?<p className={design.notice}>{t('Un propietario o supervisor administra los documentos privados.','An owner or supervisor manages private documents.')}</p>:<OrganizationDocuments/>)}
    </section>)}
    {editing&&<Dialog open={Boolean(record)} className={design.dialog} title={t('Editar información de empresa','Edit company information')} description={t('Actualiza los datos de la organización.','Update your organization details.')} closeLabel={t('Cerrar','Close')} closeDisabled={editBusy} onClose={()=>setEditing(false)} footer={<></>}>
      {record&&<OrganizationEditor key={record.version} record={record} editable={!preview&&role==='OWNER'} onBusyChange={setEditBusy} onCancel={()=>setEditing(false)} onSaved={value=>{setRecord(value);setEditing(false);setNotice(t('Información actualizada.','Company information updated.'));}} onReload={()=>void load()}/>}
    </Dialog>}
  </div>;
}
function OrganizationEditor({
  record,
  editable,
  onSaved,
  onReload,
  onBusyChange,
  onCancel,
}: {
  record: OrganizationV2;
  editable: boolean;
  onSaved: (value: OrganizationV2) => void;
  onReload: () => void;
  onBusyChange: (busy: boolean) => void;
  onCancel: () => void;
}) {
  const {t}=useLocale();
  const value = record.value;
  const supportsRevision=value.defaultCurrency==='USD';
  const pending = useRef<SettingsCommand | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editable || busy || conflict || !supportsRevision) return;
    const form = new FormData(event.currentTarget);
    const text = (key: string) => String(form.get(key) ?? '').trim();
    const optional = (key: string) => text(key) || null;

    try {
      const revised = OrganizationValueV2Schema.parse({
        schemaVersion: '2.0',
        code: text('code'),
        commercialName: text('commercialName'),
        legalName: optional('legalName'),
        taxIdType: optional('taxIdType'),
        taxIdValue: optional('taxIdValue'),
        countryCode: optional('countryCode')?.toUpperCase() ?? null,
        corporateEmail: optional('corporateEmail'),
        corporatePhone: optional('corporatePhone'),
        defaultCurrency: value.defaultCurrency,
        status: text('status'),
      });
      pending.current = settingsCommand('/organizations/current/revisions', {
        expectedVersion: record.version,
        value: revised,
      }, pending.current);
      setBusy(true);
      onBusyChange(true);
      setError('');
      await sendSettingsCommand(pending.current, schema);
      const current = await settingsRequest('/organizations/current', schema);
      pending.current = null;
      onSaved(current.data);
    } catch (e) {
      setError(settingsError(e));
      setConflict(e instanceof ClientSettingsError && e.code === 'STALE_DRAFT');
    } finally {
      setBusy(false);
      onBusyChange(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={save}>
      {!editable && (
        <p className={styles.notice}>
          Only an organization owner can edit these details. Your role permits review.
        </p>
      )}

      {!supportsRevision&&<p className={styles.notice}>Stored profile currency: {value.defaultCurrency}. The current profile edit command supports USD only; the stored currency is preserved. Documents remain available independently.</p>}
      <fieldset disabled={!editable || busy || conflict || !supportsRevision}>
        <div className={orgStyles.fieldsGrid}>
          <Input
            label="Commercial name"
            name="commercialName"
            defaultValue={cleanDemoText(value.commercialName) || value.commercialName}
            required
            maxLength={200}
          />
          <Input
            label="Organization code"
            name="code"
            defaultValue={value.code}
            required
            maxLength={100}
          />
          <Input
            label="Legal name"
            name="legalName"
            defaultValue={cleanDemoText(value.legalName) || value.legalName || ''}
            maxLength={200}
          />
          <Input
            label="Country code"
            name="countryCode"
            defaultValue={value.countryCode ?? ''}
            pattern="[A-Za-z]{2}"
            maxLength={2}
          />
          <Input
            label="Tax identifier type"
            name="taxIdType"
            defaultValue={value.taxIdType ?? ''}
            maxLength={50}
          />
          <Input
            label="Tax identifier"
            name="taxIdValue"
            defaultValue={value.taxIdValue ?? ''}
            maxLength={100}
          />
          <Input
            label="Corporate email"
            name="corporateEmail"
            type="email"
            defaultValue={value.corporateEmail ?? ''}
          />
          <Input
            label="Corporate phone"
            name="corporatePhone"
            defaultValue={value.corporatePhone ?? ''}
            placeholder="+5115550100"
          />
          <Input label="Default currency" value={value.defaultCurrency} readOnly />
          <Select label="Status" name="status" defaultValue={value.status}>
            <option>ACTIVE</option>
            <option>INACTIVE</option>
          </Select>
        </div>
        <p className={styles.muted}>
          Tax type and identifier must be entered together. Inactive organizations cannot open the connected workspace.
        </p>
      </fieldset>

      {error && <p className={styles.error} role="alert">{error}</p>}

      <div className={styles.actions}>
        {editable && (
          <Button type="submit" disabled={conflict||!supportsRevision} isLoading={busy} loadingLabel={t('Guardando…','Saving…')}>
            {error && !conflict ? t('Reintentar','Retry save') : t('Guardar organización','Save organization')}
          </Button>
        )}
        <Button type="button" variant="secondary" disabled={busy} onClick={onReload}>
          {t('Recargar datos (descartar cambios)','Reload latest (discard edits)')}
        </Button>
        <Button type="button" variant="ghost" disabled={busy} onClick={onCancel}>{t('Cancelar','Cancel')}</Button>
      </div>
    </form>
  );
}

function OrganizationSkeleton() {
  return (
    <div className={orgStyles.container} aria-busy="true" aria-label="Loading organization">
      <section className={orgStyles.profileHeaderCard}>
        <div className={orgStyles.profileHeaderTop}>
          <div className={orgStyles.profileIdentity}>
            <div className={`${orgStyles.profileLogo} ${orgStyles.skeletonBone}`} />
            <div className={orgStyles.profileMeta} style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div className={orgStyles.skeletonBone} style={{ width: '180px', height: '26px' }} />
              <div className={orgStyles.skeletonBone} style={{ width: '230px', height: '14px' }} />
              <div style={{ display: 'flex', gap: '6px', marginTop: '3px' }}>
                <div className={orgStyles.skeletonBone} style={{ width: '60px', height: '18px', borderRadius: '9999px' }} />
                <div className={orgStyles.skeletonBone} style={{ width: '50px', height: '18px', borderRadius: '9999px' }} />
                <div className={orgStyles.skeletonBone} style={{ width: '90px', height: '18px', borderRadius: '9999px' }} />
              </div>
            </div>
          </div>
          <div className={orgStyles.actionToolbar} style={{ gap: '8px' }}>
            <div className={orgStyles.skeletonBone} style={{ width: '85px', height: '32px', borderRadius: '8px' }} />
            <div className={orgStyles.skeletonBone} style={{ width: '95px', height: '32px', borderRadius: '8px' }} />
            <div className={orgStyles.skeletonBone} style={{ width: '115px', height: '32px', borderRadius: '8px' }} />
            <div className={orgStyles.skeletonBone} style={{ width: '105px', height: '32px', borderRadius: '8px' }} />
          </div>
        </div>
        <div className={orgStyles.navTabsRow} style={{ marginTop: '18px', gap: '16px' }}>
          <div className={orgStyles.skeletonBone} style={{ width: '80px', height: '26px', borderRadius: '6px' }} />
          <div className={orgStyles.skeletonBone} style={{ width: '110px', height: '26px', borderRadius: '6px' }} />
        </div>
      </section>

      <div className={orgStyles.mainContentGrid}>
        <div className={orgStyles.leftColumn}>
          <section className={orgStyles.infoCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div>
                <div className={orgStyles.skeletonBone} style={{ width: '170px', height: '20px', marginBottom: '6px' }} />
                <div className={orgStyles.skeletonBone} style={{ width: '280px', height: '13px' }} />
              </div>
              <div className={orgStyles.skeletonBone} style={{ width: '75px', height: '22px', borderRadius: '9999px' }} />
            </div>
            <div className={orgStyles.fieldsGrid}>
              {[...Array(8)].map((_, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div className={orgStyles.skeletonBone} style={{ width: '90px', height: '13px' }} />
                  <div className={orgStyles.skeletonBone} style={{ width: '100%', height: '38px', borderRadius: '8px' }} />
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className={orgStyles.rightColumn}>
          <div className={orgStyles.timelineCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div className={orgStyles.skeletonBone} style={{ width: '110px', height: '18px' }} />
              <div className={orgStyles.skeletonBone} style={{ width: '95px', height: '22px', borderRadius: '9999px' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {[...Array(4)].map((_, i) => (
                <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div className={orgStyles.skeletonBone} style={{ width: '12px', height: '12px', borderRadius: '9999px', flexShrink: 0, marginTop: '3px' }} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div className={orgStyles.skeletonBone} style={{ width: '55%', height: '13px' }} />
                    <div className={orgStyles.skeletonBone} style={{ width: '85%', height: '11px' }} />
                    <div className={orgStyles.skeletonBone} style={{ width: '35%', height: '15px', borderRadius: '4px' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
