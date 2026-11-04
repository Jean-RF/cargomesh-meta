"use client";

import { useEffect, useRef, useState } from "react";
import type { z } from "zod";
import { FileUp, Share2 } from "lucide-react";
import { Button, Dialog, Select } from "@/components/ui";
import { useLocale } from "@/features/i18n/locale-provider";
import { DocumentDossier, type DocumentRevision } from "@/shared/schemas/meta/documents";
import { displayReference } from "@/shared/lib/display-identity";
import { formatDateTime } from "@/shared/lib/date-time";
import { documents } from "./document-client";
import { DocumentUploadDialog } from "./document-upload-dialog";
import { DocumentActionsMenu } from "./document-actions-menu";
import s from "./request-documents.module.css";

type Dossier = z.infer<typeof DocumentDossier>;
type Link = Dossier["data"][number];
type Share = Link["shares"][number];
type Confirm = { kind: "unlink"; link: Link } | { kind: "revoke"; shares: Share[] };

/** One row per document. Attached revisions remain pinned until the user replaces them. */
export function RequestDocumentWorkspace({ requestId, blocked = false, bookingLabels = {} }: { requestId: string; blocked?: boolean; bookingLabels?: Record<string,string> }) {
  const {t,localeTag}=useLocale();
  const [dossier,setDossier]=useState<Dossier|null>(null),[library,setLibrary]=useState<DocumentRevision[]>([]),[next,setNext]=useState<number|null>(null);
  const [busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState(""),[loadFailed,setLoadFailed]=useState(false);
  const [upload,setUpload]=useState<{replacement:DocumentRevision|null}|null>(null),[confirm,setConfirm]=useState<Confirm|null>(null);
  const [sharing,setSharing]=useState(false),[booking,setBooking]=useState(""),[selection,setSelection]=useState<string[]>([]);
  const [history,setHistory]=useState<{documentId:string;title:string;rows:DocumentRevision[];next:number|null}|null>(null);
  const inFlight=useRef(false),intents=useRef(new Map<string,string>());
  const kindLabel=(kind:string)=>({COMPANY_PROFILE:t("Perfil de empresa","Company profile"),PACKING_LIST:t("Lista de empaque","Packing list"),OTHER:t("Otro documento","Other document")})[kind]??kind;
  const reviewLabel=(state:string)=>({PENDING:t("En revisión","Pending review"),ACCEPTED:t("Aceptado para esta reserva","Accepted for this booking"),CORRECTION_REQUESTED:t("Requiere corrección","Correction requested"),REVOKED:t("Acceso revocado","Access revoked")})[state]??state;
  async function load(){const [value,files]=await Promise.all([documents.dossier(requestId),documents.library(requestId)]);setDossier(value);setLibrary(files.data);setNext(files.nextOffset);setLoadFailed(false);setBooking(old=>value.relations.some(row=>row.id===old)?old:value.relations[0]?.id??"");}
  useEffect(()=>{let active=true;void Promise.all([documents.dossier(requestId),documents.library(requestId)]).then(([value,files])=>{if(active){setDossier(value);setLibrary(files.data);setNext(files.nextOffset);setBooking(value.relations[0]?.id??"");}}).catch(e=>{if(active){setError(e instanceof Error?e.message:t("No se pudieron consultar los documentos.","Documents could not be loaded."));setLoadFailed(true);}});return()=>{active=false;};},[requestId]);
  async function run(work:()=>Promise<void>){if(inFlight.current)return;inFlight.current=true;setBusy(true);setError("");setNotice("");try{await work();}catch(e){setError(e instanceof Error?e.message:t("No se pudo completar la acción.","Action failed."));}finally{inFlight.current=false;setBusy(false);}}
  async function command(body:unknown){const signature=JSON.stringify(body);if(!intents.current.has(signature))intents.current.set(signature,crypto.randomUUID());await documents.command(requestId,body,intents.current.get(signature)!);intents.current.delete(signature);}
  async function attach(row:DocumentRevision){if(blocked)return;const current=await documents.dossier(requestId),previous=current.data.find(link=>link.revision.documentId===row.documentId);
    if(!(previous?.active&&previous.revision.id===row.id&&previous.correspondenceCurrent))await command({action:"link",revisionId:row.id,expectedVersion:previous?.version??0});
    await load();setNotice(t("Documento adjuntado al envío.","Document attached to shipment."));}
  async function download(row:DocumentRevision){const result=await documents.download(row.id);const anchor=document.createElement("a");anchor.href=result.url;anchor.rel="noopener noreferrer";anchor.download="";anchor.click();}
  async function readHistory(row:DocumentRevision){const result=await documents.library(requestId,0,row.documentId);setHistory({documentId:row.documentId,title:row.title,rows:result.data,next:result.nextOffset});}
  function openShare(ids:string[]){setSelection(ids);setSharing(true);setError("");}
  const links=dossier?.data.filter(link=>link.active)??[];
  const latest=library.filter((row,index)=>library.findIndex(item=>item.id===row.id)===index&&!library.some(item=>item.documentId===row.documentId&&item.version>row.version));
  const rows=[...links.map(link=>({revision:link.revision,link})),...latest.filter(row=>!links.some(link=>link.revision.documentId===row.documentId)).map(revision=>({revision,link:null}))];
  const eligible=links.filter(link=>link.correspondenceCurrent&&link.revision.state==="READY"&&(!link.revision.expiresOn||link.revision.expiresOn>=new Date().toISOString().slice(0,10)));
  const locked=blocked||busy||loadFailed||!dossier;
  async function shareSelected(){if(locked||!booking||!selection.length)return;
    for(const id of selection){const current=await documents.dossier(requestId),link=current.data.find(row=>row.id===id&&row.active);
      if(!link||!link.correspondenceCurrent||!current.relations.some(row=>row.id===booking))throw new Error(t("El documento o la reserva cambió. Actualiza antes de compartir.","The document or booking changed. Refresh before sharing."));
      if(!link.shares.some(share=>share.bookingId===booking&&share.state==="ACTIVE"))await command({action:"share",linkId:link.id,bookingId:booking,expectedVersion:link.version});}
    await load();setSharing(false);setNotice(t("Documentos compartidos con el transportista.","Documents shared with the carrier."));}
  async function confirmAction(){if(!confirm||blocked)return;
    const current=await documents.dossier(requestId);
    if(confirm.kind==="unlink"){const link=current.data.find(row=>row.id===confirm.link.id);if(link?.active)await command({action:"unlink",linkId:link.id,expectedVersion:link.version});}
    else for(const selected of confirm.shares){const share=current.data.flatMap(row=>row.shares).find(row=>row.id===selected.id);if(share?.state==="ACTIVE")await command({action:"revoke",shareId:share.id,expectedVersion:share.version});}
    await load();setConfirm(null);setNotice(t("Acceso actualizado.","Access updated."));}
  return <section className={s.panel} aria-labelledby="request-documents-title">
    <header className={s.toolbar}><div><h2 id="request-documents-title">{t("Documentos del envío","Shipment documents")}</h2><p>{t("Archivos adjuntos y biblioteca privada.","Attachments and private library.")}</p></div>
      <div className={s.actions}><Button variant="secondary" size="compact" disabled={locked||!eligible.length||!dossier?.relations.length} onClick={()=>openShare(eligible.map(link=>link.id))}><Share2 size={15}/>{t("Compartir","Share")}</Button>
        <Button size="compact" disabled={locked} onClick={()=>setUpload({replacement:null})}><FileUp size={15}/>{t("Subir documento","Upload document")}</Button></div></header>
    {error&&<p className={s.error} role="alert">{error} <Button variant="ghost" size="compact" disabled={busy} onClick={()=>void run(load)}>{t("Actualizar","Refresh")}</Button></p>}
    {notice&&<p className={s.notice} role="status">{notice}</p>}
    {!dossier&&!error?<p className={s.empty} role="status">{t("Cargando documentos…","Loading documents…")}</p>:!rows.length?<p className={s.empty}>{t("Todavía no hay documentos. Sube el primero para este envío.","No documents yet. Upload the first for this shipment.")}</p>:<div className={s.tableViewport}><table className={s.table}><thead><tr>
      <th scope="col">{t("Nombre","Name")}</th><th scope="col">{t("Tipo","Type")}</th><th scope="col">{t("Versión","Version")}</th><th scope="col">{t("Estado","Status")}</th><th scope="col">{t("Compartido con el transportista","Shared with carrier")}</th><th scope="col"><span className={s.hiddenInput}>{t("Acciones","Actions")}</span></th>
    </tr></thead><tbody>{rows.map(({revision:row,link})=>{
      const shares=link?.shares.filter(share=>share.state==="ACTIVE")??[],expired=Boolean(row.expiresOn&&row.expiresOn<new Date().toISOString().slice(0,10));
      const label=row.state!=="READY"?t("Carga incompleta","Upload incomplete"):expired?t("Vencido","Expired"):link&&!link.correspondenceCurrent?t("Revisar carga","Review cargo"):link?t("Adjunto","Attached"):t("En biblioteca","In library");
      return <tr key={row.documentId}><td><strong>{row.title}</strong><small>{row.filename} · {Math.ceil(row.bytes/1024)} KiB</small></td><td>{kindLabel(row.kind)}</td><td>v{row.version}</td>
        <td><span className={s.chip} data-tone={expired||row.state!=="READY"||link&&!link.correspondenceCurrent?"warning":link?"blue":undefined}>{label}</span></td>
        <td><button type="button" role="switch" aria-checked={shares.length>0} aria-label={`${t("Compartir","Share")}: ${row.title}`} className={s.switch} disabled={locked||!link||!shares.length&&(!eligible.some(item=>item.id===link.id)||!dossier?.relations.length)} onClick={()=>{if(shares.length)setConfirm({kind:"revoke",shares});else if(link)openShare([link.id]);}}><span aria-hidden="true"/><span>{shares.length?t("Compartido","Shared"):t("Privado","Private")}</span></button>
          {shares.length>0&&<small>{shares.length===1?reviewLabel(shares[0].review):t(`${shares.length} reservas`,`${shares.length} bookings`)}</small>}</td>
        <td><DocumentActionsMenu label={row.title} actions={[
          {label:t("Descargar","Download"),disabled:busy||row.state!=="READY",action:()=>void run(()=>download(row))},
          {label:t("Historial de versiones","Revision history"),disabled:busy,action:()=>void run(()=>readHistory(row))},
          {label:t("Subir nueva versión","Upload new revision"),disabled:locked,action:()=>{setError("");setUpload({replacement:row});}},
          ...(link?[{label:t("Quitar del envío","Remove from shipment"),disabled:locked,action:()=>setConfirm({kind:"unlink",link})}]:[{label:t("Adjuntar al envío","Attach to shipment"),disabled:locked||row.state!=="READY",action:()=>void run(()=>attach(row))}]),
        ]}/></td></tr>;
    })}</tbody></table></div>}
    <footer className={s.footer}><span>{rows.length} {t("documentos cargados","loaded documents")}</span><details><summary>{t("Sobre la revisión y el acceso","About review and access")}</summary><p>{t("Aceptar un documento no confirma que el envío esté listo ni sustituye una verificación legal. Revocar impide nuevas descargas; los enlaces ya emitidos vencen en 60 segundos.","Accepting a document does not confirm shipment readiness or replace legal verification. Revocation blocks new downloads; issued links expire within 60 seconds.")}</p></details>
      {next!==null&&<Button variant="ghost" size="compact" disabled={busy} onClick={()=>void run(async()=>{const result=await documents.library(requestId,next);setLibrary(old=>[...old,...result.data]);setNext(result.nextOffset);})}>{t("Cargar más","Load more")}</Button>}</footer>
    {upload&&<DocumentUploadDialog requestId={requestId} replacement={upload.replacement} onClose={()=>setUpload(null)} onSaved={async()=>{await load();setNotice(t("Guardado en privado. Adjunta la versión cuando esté lista.","Saved privately. Attach the revision when ready."));}}/>}
    <Dialog open={sharing} className={s.dialog} title={t("Compartir con el transportista","Share with carrier")} description={t("Sólo se compartirán las versiones seleccionadas para esta reserva.","Only selected revisions will be shared for this booking.")} closeLabel={t("Cerrar","Close")} closeDisabled={busy} onClose={()=>setSharing(false)}
      footer={<><Button variant="secondary" disabled={busy} onClick={()=>setSharing(false)}>{t("Cancelar","Cancel")}</Button><Button disabled={locked||!booking||!selection.length} isLoading={busy} onClick={()=>void run(shareSelected)}>{t("Compartir versiones","Share revisions")}</Button></>}>
      <Select label={t("Reserva","Booking")} value={booking} disabled={busy} onChange={e=>setBooking(e.target.value)}>{dossier?.relations.map(row=><option value={row.id} key={row.id}>{displayReference(null,"BKG",row.id)}{bookingLabels[row.id]?` · ${bookingLabels[row.id]}`:""}</option>)}</Select>
      <fieldset className={s.selection} disabled={busy}><legend>{t("Versiones adjuntas","Attached revisions")}</legend>{eligible.map(link=><label key={link.id}><input type="checkbox" checked={selection.includes(link.id)} onChange={e=>setSelection(old=>e.target.checked?[...old,link.id]:old.filter(id=>id!==link.id))}/><span>{link.revision.title}<small>v{link.revision.version} · {kindLabel(link.revision.kind)}</small></span></label>)}</fieldset>
      {error&&<p className={s.error} role="alert">{error}</p>}
    </Dialog>
    <Dialog open={Boolean(confirm)} className={s.dialog} title={confirm?.kind==="unlink"?t("Quitar documento del envío","Remove document from shipment"):t("Revocar acceso del transportista","Revoke carrier access")} description={confirm?.kind==="unlink"?t("La versión seguirá en tu biblioteca privada y dejará de estar adjunta a este envío.","The revision stays in your private library and will no longer be attached to this shipment."):t("Se bloquearán nuevas descargas de esta versión para las reservas indicadas. Los enlaces emitidos vencen en 60 segundos.","New downloads of this revision will be blocked for the bookings below. Issued links expire within 60 seconds.")} closeLabel={t("Cancelar","Cancel")} closeDisabled={busy} onClose={()=>setConfirm(null)}
      footer={<><Button variant="secondary" disabled={busy} onClick={()=>setConfirm(null)}>{t("Cancelar","Cancel")}</Button><Button disabled={locked} isLoading={busy} onClick={()=>void run(confirmAction)}>{t("Confirmar","Confirm")}</Button></>}>
      {confirm?.kind==="unlink"?<p>{confirm.link.revision.title}</p>:confirm?.shares.map(share=><p key={share.id}>{displayReference(null,"BKG",share.bookingId)}</p>)}{error&&<p className={s.error} role="alert">{error}</p>}
    </Dialog>
    <Dialog open={Boolean(history)} className={s.drawer} title={t("Historial de versiones","Revision history")} description={history?.title??""} closeLabel={t("Cerrar","Close")} closeDisabled={busy} onClose={()=>setHistory(null)}>
      <div className={s.revisions}>{history?.rows.map(row=><article className={s.revision} key={row.id}><h3>v{row.version}</h3><p>{row.filename}</p><p>{formatDateTime(row.createdAt,localeTag)}</p>{row.expiresOn&&<p>{t("Vencimiento","Expiry")}: {row.expiresOn}</p>}<span className={s.chip}>{row.state==="READY"?t("Guardado","Saved"):t("Carga incompleta","Upload incomplete")}</span>
        {dossier?.data.filter(link=>link.revision.id===row.id).flatMap(link=>link.shares).map(share=><details key={share.id}><summary>{displayReference(null,"BKG",share.bookingId)} · {reviewLabel(share.state==="ACTIVE"?share.review:share.state)}</summary>{share.reason&&<p>{share.reason}</p>}{share.reviewedAt&&<p>{formatDateTime(share.reviewedAt,localeTag)}</p>}</details>)}
        <div className={s.actions}>
        <Button variant="secondary" size="compact" disabled={busy||row.state!=="READY"} onClick={()=>void run(()=>download(row))}>{t("Descargar","Download")}</Button>
        <Button variant="secondary" size="compact" disabled={locked||row.state!=="READY"} onClick={()=>void run(()=>attach(row))}>{t("Usar esta versión","Use this revision")}</Button></div></article>)}
        {history?.next!==null&&history&&<Button variant="ghost" size="compact" disabled={busy} onClick={()=>void run(async()=>{const result=await documents.library(requestId,history.next!,history.documentId);setHistory(old=>old?{...old,rows:[...old.rows,...result.data],next:result.nextOffset}:old);})}>{t("Más versiones","More revisions")}</Button>}
        {error&&<p className={s.error} role="alert">{error}</p>}
      </div>
    </Dialog>
  </section>;
}
