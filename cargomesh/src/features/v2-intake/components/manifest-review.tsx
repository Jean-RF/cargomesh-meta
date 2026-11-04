'use client';
import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { Button, Checkbox, Select } from '@/components/ui';
import { useLocale } from '@/features/i18n/locale-provider';
import type { ConfirmedManifest, ManifestPreparation } from '@/shared/schemas/meta/manifest-commands';
import type { FreightRequestV2Data } from '../contracts';
import type { V2IntakePrototypeDraft } from '../prototype-model';
import { confirmManifest, ManifestIntents, prepareManifest, readCurrentManifest, reopenManifest } from '../manifest-client';
import { manifestPreparationInput, restoredManifestGroups, reviewStillCurrent } from '../manifest-review-model';
import styles from '../v2-intake-prototype.module.css';

type Props = {request: FreightRequestV2Data; draft: V2IntakePrototypeDraft; dirty: boolean;
  requestBusy: boolean; onBusyChange: (busy: boolean) => void};
export function ManifestReview({request, draft, dirty, requestBusy, onBusyChange}: Props) {
  const {t} = useLocale();
  const titleId = useId();
  const [baseline, setBaseline] = useState<ConfirmedManifest | null>(null);
  const [preparation, setPreparation] = useState<ManifestPreparation | null>(null);
  const [choices, setChoices] = useState<Record<number, string>>({});
  const [phase, setPhase] = useState<'loading' | 'idle' | 'preparing' | 'confirming' | 'reopening'>('loading');
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [readEpoch, setReadEpoch] = useState(0);
  const [reviewedFingerprint, setReviewedFingerprint] = useState<string | null>(null);
  const [clock, setClock] = useState(Date.now());
  const generation = useRef(0), inFlight = useRef(false);
  const intents = useRef(new ManifestIntents());
  const fingerprint = JSON.stringify(draft);
  const latest = useRef({requestId: request.id, version: request.draftVersion, dirty, fingerprint});
  latest.current = {requestId: request.id, version: request.draftVersion, dirty, fingerprint};
  const busy = phase !== 'idle';
  const confirmedCurrent = baseline?.declaration.source.requestDraftVersion === request.draftVersion;
  const validReview = reviewStillCurrent(preparation, request, dirty, reviewedFingerprint, fingerprint, clock);
  const editable = request.status === 'DRAFT';

  useEffect(() => {
    const ticket = ++generation.current;
    setLoaded(false); setPhase('loading'); setError(''); setPreparation(null); setAccepted(false); setChoices({});
    void readCurrentManifest(request).then(result => {
      if (ticket !== generation.current) return;
      setBaseline(result.data); setChoices(restoredManifestGroups(request, result.data)); setLoaded(true);
    }).catch(caught => {if (ticket === generation.current) setError(message(caught));})
      .finally(() => {if (ticket === generation.current) setPhase('idle');});
    return () => {generation.current++;};
  }, [request.id, request.organizationId, request.draftVersion, readEpoch]);
  useEffect(() => {
    setPreparation(null); setAccepted(false); setReviewedFingerprint(null);
  }, [fingerprint, dirty]);
  useEffect(() => {onBusyChange(busy); return () => onBusyChange(false);}, [busy, onBusyChange]);
  useEffect(() => {
    if (!preparation) return;
    const timer = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [preparation]);

  function current(ticket: number, revision: number, captured: string) {
    return generation.current === ticket && latest.current.requestId === request.id
      && latest.current.version === revision && !latest.current.dirty && latest.current.fingerprint === captured;
  }
  async function prepare() {
    if (inFlight.current || busy || requestBusy || dirty || !loaded || !editable || confirmedCurrent) return;
    const ticket = generation.current, revision = request.draftVersion, captured = fingerprint;
    inFlight.current = true; setPhase('preparing'); setError(''); setAccepted(false); setPreparation(null);
    try {
      const input = manifestPreparationInput(request, baseline, choices);
      if (preparation && Date.parse(preparation.expiresAt) <= Date.now()) intents.current.clear();
      const result = await prepareManifest(request, input, intents.current.key(request.id, 'prepare', input));
      if (!current(ticket, revision, captured)) return;
      setPreparation(result.data); setReviewedFingerprint(captured); setClock(Date.now());
    } catch (caught) {if (ticket === generation.current) setError(message(caught));}
    finally {inFlight.current = false; if (ticket === generation.current) setPhase('idle');}
  }
  async function confirm() {
    if (inFlight.current || busy || requestBusy || !accepted || !editable
      || !reviewStillCurrent(preparation, request, dirty, reviewedFingerprint, fingerprint) || !preparation) return;
    const ticket = generation.current, revision = request.draftVersion, captured = fingerprint;
    const input = {preparationId: preparation.id, expectedDraftVersion: revision,
      expectedManifestRevision: preparation.expectedManifestRevision, contentHash: preparation.contentHash, confirmed: true as const};
    inFlight.current = true; setPhase('confirming'); setError('');
    try {
      const result = await confirmManifest(request, input, intents.current.key(request.id, 'confirm', input));
      if (!current(ticket, revision, captured)) return;
      setBaseline(result.data); setChoices(restoredManifestGroups(request, result.data));
      setPreparation(null); setAccepted(false); intents.current.clear();
    } catch (caught) {if (ticket === generation.current) setError(message(caught));}
    finally {inFlight.current = false; if (ticket === generation.current) setPhase('idle');}
  }
  async function reopen() {
    if (!baseline || inFlight.current || busy || requestBusy) return;
    const ticket = generation.current;
    inFlight.current = true; setPhase('reopening'); setError('');
    try {
      const result = await reopenManifest(request, baseline.id);
      if (ticket === generation.current) setBaseline(result.data);
    } catch (caught) {if (ticket === generation.current) setError(message(caught));}
    finally {inFlight.current = false; if (ticket === generation.current) setPhase('idle');}
  }
  const declaration = preparation?.candidate ?? baseline?.declaration;
  return <section className={styles.integrationArea} aria-labelledby={titleId} aria-busy={busy}>
    <header className={styles.integrationHeader}>
      <div><h2 id={titleId}>{t('Manifiesto de carga', 'Cargo declaration')}</h2>
        <p>{t('Guardar el borrador no confirma su manifiesto ni reserva transporte.', 'Saving a draft does not confirm its declaration or book transport.')}</p></div>
      <Button variant="secondary" type="button" disabled={busy || requestBusy} onClick={() => setReadEpoch(n => n + 1)}>
        {t('Recargar manifiesto', 'Reload declaration')}</Button>
    </header>
    {error && <p className={styles.errorSummary} role="alert">{error}</p>}
    {busy && <p role="status">{phase === 'confirming' ? t('Confirmando la revisión…', 'Confirming the review…') : t('Consultando el manifiesto…', 'Loading the declaration…')}</p>}
    {dirty && <p role="status">{t('Guarda primero los cambios del borrador. Cualquier cambio requiere una revisión nueva.', 'Save your draft changes first. Any change requires a new review.')}</p>}
    {baseline && <p role="status">{t('Manifiesto confirmado', 'Confirmed declaration')} · v{baseline.revision}
      {' · '}{confirmedCurrent ? t('Corresponde al borrador guardado', 'Matches the saved draft') : t('Histórico: el pedido tiene una versión posterior', 'Historical: the request has a newer version')}
      {' · '}<Button type="button" variant="secondary" disabled={busy || requestBusy} onClick={() => void reopen()}>{t('Reabrir revisión guardada', 'Reopen saved revision')}</Button></p>}
    {confirmedCurrent && !dirty && !busy && !requestBusy && <p><Link href={'/tetris?view=sessions&requestId=' + encodeURIComponent(request.id)}>
      {t('Continuar a sesión de carga de esta solicitud', 'Continue to a loading session for this request')}</Link></p>}
    {loaded && !baseline && !preparation && <p>{t('Aún no se ha confirmado ningún manifiesto.', 'No declaration has been confirmed yet.')}</p>}
    {loaded && baseline && !confirmedCurrent && editable && <fieldset disabled={busy || requestBusy || dirty}>
      <legend>{t('Identifica cada grupo de esta revisión', 'Identify each group in this revision')}</legend>
      <p>{t('Relaciona los grupos existentes o indica que son nuevos. No inferimos identidad por posición.', 'Match existing groups or mark them as new. Position does not establish identity.')}</p>
      {request.cargoSpecification.units.map((unit, index) => <div key={index}>
        <Select label={`${t('Grupo', 'Group')} ${index + 1} · ${unit.quantity} × ${unit.packageType}`} value={choices[index] ?? ''}
          onChange={event => {setChoices(previous => ({...previous, [index]: event.target.value})); setPreparation(null); setAccepted(false);}}>
          <option value="">{t('Selecciona una identidad', 'Choose an identity')}</option><option value="new">{t('Grupo nuevo', 'New group')}</option>
          {baseline.declaration.groupBindings.map(binding => <option key={binding.groupId} value={binding.groupId}>
            {t('Grupo anterior', 'Previous group')} {binding.sourceUnitIndex + 1} · {binding.groupId.slice(0, 8)}</option>)}
        </Select></div>)}
    </fieldset>}
    {declaration && <div>
      <p>{preparation ? t('Revisión pendiente de tu confirmación', 'Review awaiting your confirmation') : t('Contenido de la revisión guardada', 'Saved revision contents')}</p>
      <p>{declaration.route.origin.label} → {declaration.route.destination.label}</p>
      <p>{declaration.cargoSpecification.description}</p>
      <p>{t('Categoría / embalaje', 'Category / packaging')}: {declaration.cargoSpecification.categoryCode} · {declaration.cargoSpecification.packaging}</p>
      <p>{t('La carga puede dividirse', 'Cargo may be split')}: {declaration.cargoSpecification.divisible ? t('Sí', 'Yes') : t('No', 'No')}</p>
      <p>{declaration.cargoSpecification.totalWeightKg} kg · {declaration.cargoSpecification.totalVolumeM3} m³</p>
      <ul>{declaration.groupBindings.map(binding => {
        const unit = declaration.cargoSpecification.units[binding.sourceUnitIndex];
        return <li key={binding.groupId}>{t('Grupo', 'Group')} {binding.sourceUnitIndex + 1}: {unit.quantity} × {unit.packageType}
          {' · '}{unit.weightPerUnitKg} kg/{t('unidad', 'unit')} · {unit.volumePerUnitM3} m³/{t('unidad', 'unit')}
          {' · '}{unit.dimensionsCm.length} × {unit.dimensionsCm.width} × {unit.dimensionsCm.height} cm
          {' · '}{unit.indivisible ? t('Indivisible', 'Indivisible') : t('Divisible', 'Divisible')}
          {' · '}{unit.stackable ? t('Apilable', 'Stackable') : t('No apilable', 'Not stackable')}
          {unit.unitsPerPackage != null && <> · {unit.unitsPerPackage} {t('unidades por bulto', 'units per package')}</>}
          {' · '}ID {binding.groupId}</li>;
      })}</ul>
      <p>{t('Recojo', 'Pickup')}: {declaration.route.pickupWindow.startsAt} — {declaration.route.pickupWindow.endsAt}</p>
      <p>{t('Entrega', 'Delivery')}: {declaration.route.deliveryWindow.startsAt} — {declaration.route.deliveryWindow.endsAt}</p>
      <p>{t('Requisitos', 'Requirements')}: {declaration.cargoSpecification.requirements.join(', ') || '—'}</p>
      {declaration.cargoSpecification.temperatureRange && <p>{t('Temperatura declarada', 'Declared temperature')}: {declaration.cargoSpecification.temperatureRange.minCelsius} — {declaration.cargoSpecification.temperatureRange.maxCelsius} °C</p>}
      {declaration.route.planningPreferences && <div>
        <p>{t('Preferencias de planificación', 'Planning preferences')}: {declaration.route.planningPreferences.urgency}
          {' · '}{declaration.route.planningPreferences.loadSize ?? t('Sin clasificar', 'Unclassified')}
          {' · '}{declaration.route.planningPreferences.timeZone}</p>
        <ul>{(['pickupWindows', 'deliveryWindows'] as const).flatMap(kind =>
          declaration.route.planningPreferences![kind].map((window, index) => <li key={`${kind}-${index}`}>
            {kind === 'pickupWindows' ? t('Ventana de recojo', 'Pickup window') : t('Ventana de entrega', 'Delivery window')}
            {' '}{index + 1}: {window.startsAt} — {window.endsAt}</li>))}</ul>
      </div>}
      {!!declaration.cargoSpecification.availableDocuments?.length && <div>
        <p>{t('Referencias documentales declaradas; no equivalen a documentos verificados.', 'Declared document references; these are not verified documents.')}</p>
        <ul>{declaration.cargoSpecification.availableDocuments.map((document, index) => <li key={index}>
          {document.code}: {document.reference} · {document.issuedAt ?? '—'} — {document.validUntil ?? '—'}</li>)}</ul>
      </div>}
    </div>}
    {loaded && editable && !confirmedCurrent && <Button type="button" disabled={busy || requestBusy || dirty} onClick={() => void prepare()}>
      {preparation ? t('Preparar otra revisión', 'Prepare another review') : t('Preparar manifiesto para revisar', 'Prepare declaration for review')}</Button>}
    {preparation && <div>
      {!validReview && <p role="status">{t('La revisión cambió o venció. Prepara una revisión nueva.', 'The review changed or expired. Prepare a new review.')}</p>}
      <Checkbox checked={accepted} disabled={!validReview || busy || requestBusy} onChange={event => setAccepted(event.target.checked)}
        label={t('He revisado la carga y la identidad de todos sus grupos.', 'I have reviewed the cargo and every group identity.')} />
      <Button type="button" disabled={!validReview || !accepted || busy || requestBusy} onClick={() => void confirm()}>
        {t('Confirmar y guardar manifiesto', 'Confirm and save declaration')}</Button>
    </div>}
  </section>;
}
function message(caught: unknown) {
  if (caught instanceof Error && caught.message === 'GROUP_MAPPING_REQUIRED') return 'Choose the identity of every group, or mark it as new.';
  if (caught instanceof Error && caught.name === 'ZodError') return 'Review group identities: each existing group can only be assigned once.';
  if (caught instanceof Error) return caught.message;
  return 'The declaration could not be completed. Reload before trying again.';
}
