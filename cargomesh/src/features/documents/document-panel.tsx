'use client';
import {useEffect,useRef,useState} from 'react';
import {Button,Input,Select} from '@/components/ui';
import {DocumentMetadata,DOCUMENT_LIMIT,type DocumentRevision,DocumentDossier} from '@/shared/schemas/meta/documents';
import {documents} from './document-client';
import s from './documents.module.css';
import {OrganizationDocumentLibrary} from './organization-document-library';
const kindName=(kind:string)=>({COMPANY_PROFILE:'Company profile',PACKING_LIST:'Packing list',OTHER:'Other document'}[kind]??kind);
const stateName=(state:string)=>({PENDING:'Pending carrier review',ACCEPTED:'Accepted for this booking',CORRECTION_REQUESTED:'Correction requested',REVOKED:'Access revoked'}[state]??state);
const validity=(r:DocumentRevision)=>r.expiresOn?new Date(r.expiresOn+'T23:59:59Z')<new Date()?'Expired':`Expiry supplied: ${r.expiresOn}`:'No expiry supplied';
function useIntent(){const intent=useRef<{signature:string;key:string}|null>(null);return {key(value:unknown){const signature=JSON.stringify(value);if(intent.current?.signature!==signature)intent.current={signature,key:crypto.randomUUID()};return intent.current.key;},clear(){intent.current=null;}};}
async function download(id:string,carrierId?:string){const result=await documents.download(id,carrierId);const a=document.createElement('a');a.href=result.url;a.rel='noopener noreferrer';a.download='';a.click();}
export function OrganizationDocuments(){return <OrganizationDocumentLibrary/>;}
function DocumentLibrary({requestId,blocked=false,onChanged}:{requestId?:string;blocked?:boolean;onChanged?:()=>Promise<void>}){
 const [rows,setRows]=useState<DocumentRevision[]>([]),[next,setNext]=useState<number|null>(null),[loaded,setLoaded]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [file,setFile]=useState<File|null>(null),[title,setTitle]=useState(''),[kind,setKind]=useState<'COMPANY_PROFILE'|'PACKING_LIST'|'OTHER'>(requestId?'PACKING_LIST':'COMPANY_PROFILE'),[issued,setIssued]=useState(''),[expiry,setExpiry]=useState(''),[replacement,setReplacement]=useState<DocumentRevision|null>(null);
 const [history,setHistory]=useState<string|null>(null),[historyRows,setHistoryRows]=useState<DocumentRevision[]>([]),[historyNext,setHistoryNext]=useState<number|null>(null);
 const intent=useIntent(),fileInput=useRef<HTMLInputElement>(null);
 async function load(offset=0){const result=await documents.library(requestId,offset);setRows(old=>offset?[...old,...result.data]:result.data);setNext(result.nextOffset);setLoaded(true);}
 useEffect(()=>{let active=true;void documents.library(requestId).then(r=>{if(active){setRows(r.data);setNext(r.nextOffset);setLoaded(true);}}).catch(e=>{if(active){setError(e.message);setLoaded(true);}});return()=>{active=false;};},[requestId]);
 async function run(work:()=>Promise<void>){setBusy(true);setError('');setNotice('');try{await work();}catch(e){setError(e instanceof Error?e.message:'Document action failed.');}finally{setBusy(false);}}
 async function upload(){if(!file)return;
  const metadata=DocumentMetadata.parse({title:replacement?.title??title,kind:replacement?.kind??kind,requestId:replacement?replacement.requestId:kind==='COMPANY_PROFILE'?null:requestId??null,documentId:replacement?.documentId??null,expectedVersion:replacement?.documentVersion??0,issuedOn:issued||null,expiresOn:expiry||null});
  const key=intent.key({metadata,file:{name:file.name,size:file.size,lastModified:file.lastModified}});
  const saved=await documents.upload(file,metadata,key);
  intent.clear();setFile(null);if(fileInput.current)fileInput.current.value='';setTitle('');setReplacement(null);await load();await onChanged?.();setNotice(`Revision ${saved.version} saved privately.${requestId?' Select Attach below to use it for this request.':''}`);
 }
 async function readHistory(id:string,offset=0){const result=await documents.library(requestId,offset,id);setHistory(id);setHistoryRows(old=>offset?[...old,...result.data]:result.data);setHistoryNext(result.nextOffset);}
 const current=rows.filter((row,index)=>rows.findIndex(x=>x.id===row.id)===index&&!rows.some(x=>x.documentId===row.documentId&&x.version>row.version));
 return <div>
  {error?<p className={s.error} role="alert">{error} <Button variant="ghost" onClick={()=>void run(()=>load())}>Reload documents</Button></p>:null}
  {notice?<p className={s.notice} role="status">{notice}</p>:null}
  <fieldset disabled={busy||blocked} className={s.item}><legend>{replacement?`New revision: ${replacement.title}`:'Upload a document'}</legend>
   <div className={s.form}>
    {!replacement?<><Input label="Document title" value={title} maxLength={160} onChange={e=>setTitle(e.target.value)}/><Select label="Document type" value={kind} onChange={e=>setKind(e.target.value as typeof kind)}><option value="COMPANY_PROFILE">Company profile · reusable</option>{requestId?<option value="PACKING_LIST">Packing list · this request</option>:null}<option value="OTHER">Other document</option></Select></>:null}
    <Input label="Issue date · optional" type="date" value={issued} onChange={e=>setIssued(e.target.value)}/><Input label="Expiry date · optional" type="date" value={expiry} onChange={e=>setExpiry(e.target.value)}/>
    <label className={s.file}>PDF, PNG or JPEG · up to 4 MiB<input ref={fileInput} type="file" accept="application/pdf,image/png,image/jpeg" onChange={e=>{setFile(e.target.files?.[0]??null);intent.clear();}}/></label>
   </div>
   <div className={s.actions}><Button disabled={!file||(!replacement&&!title.trim())||Boolean(file&&file.size>DOCUMENT_LIMIT)} isLoading={busy} loadingLabel="Uploading…" onClick={()=>void run(upload)}>Save private revision</Button>{replacement?<Button variant="ghost" onClick={()=>setReplacement(null)}>Cancel revision</Button>:null}</div>
   <p className={s.muted}>Content/type checks only; no antivirus or official verification. Failed uploads stay incomplete and can be retried with the same file.</p>
  </fieldset>
  {!loaded?<p role="status">Loading private documents…</p>:!current.length?<p>No documents uploaded yet.</p>:<div className={s.list}>{current.map(row=><article className={s.item} key={row.id}>
   <h4>{row.title} · v{row.version}</h4><p className={s.muted}>{kindName(row.kind)} · {row.filename} · {Math.ceil(row.bytes/1024)} KiB · {row.state==='READY'?'Ready for review':'Upload incomplete'} · {validity(row)}</p>
   <div className={s.actions}><Button variant="secondary" disabled={busy||row.state!=='READY'} onClick={()=>void run(()=>download(row.id))}>Download</Button><Button variant="secondary" disabled={busy||blocked} onClick={()=>{setReplacement(row);setIssued(row.issuedOn??'');setExpiry(row.expiresOn??'');setFile(null);intent.clear();}}>Upload new revision</Button><Button variant="ghost" disabled={busy} onClick={()=>void run(()=>readHistory(row.documentId))}>Revision history</Button>
   {requestId&&row.state==='READY'?<AttachDocument row={row} requestId={requestId} blocked={busy||blocked} onChanged={onChanged}/>:null}</div>
  </article>)}</div>}
  {next!==null?<Button variant="ghost" disabled={busy} onClick={()=>void run(()=>load(next))}>Load more documents</Button>:null}
  {history?<section className={s.item}><h4>Revision history</h4>{historyRows.map(r=><p key={r.id}>v{r.version} · {r.filename} · {r.createdAt} · {r.state} <Button size="compact" variant="ghost" disabled={busy||r.state!=='READY'} onClick={()=>void run(()=>download(r.id))}>Download revision</Button>{requestId&&r.state==='READY'?<AttachDocument row={r} requestId={requestId} blocked={busy||blocked} onChanged={onChanged}/>:null}</p>)}{historyNext!==null?<Button variant="ghost" onClick={()=>void run(()=>readHistory(history,historyNext))}>More revisions</Button>:null}<Button variant="ghost" onClick={()=>setHistory(null)}>Close history</Button></section>:null}
 </div>;
}
function AttachDocument({row,requestId,blocked,onChanged}:{row:DocumentRevision;requestId:string;blocked:boolean;onChanged?:()=>Promise<void>}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');const intent=useIntent();
 return <span><Button variant="secondary" disabled={busy||blocked} onClick={()=>{setBusy(true);setError('');void (async()=>{const current=await documents.dossier(requestId);const previous=current.data.find(l=>l.revision.documentId===row.documentId);if(previous?.active&&previous.revision.id===row.id&&previous.correspondenceCurrent){await onChanged?.();return;}const body={action:'link',revisionId:row.id,expectedVersion:previous?.version??0};await documents.command(requestId,body,intent.key(body));intent.clear();await onChanged?.();})().catch(e=>setError(e.message)).finally(()=>setBusy(false));}}>Attach this revision</Button>{error?<span role="alert" className={s.error}>{error}</span>:null}</span>;
}
export function RequestDocuments({requestId,blocked=false}:{requestId:string;blocked?:boolean}){
 const [open,setOpen]=useState(false);
 return <details className={s.panel} onToggle={e=>setOpen(e.currentTarget.open)}><summary>Shipment documents</summary><p className={s.muted}>Reuse organization documents and attach the packing list for this shipment. Share individual revisions with the carrier after selecting its offer and authorizing a booking.</p>{blocked?<p className={s.warning}>Save the current cargo changes before editing document links.</p>:null}{open?<RequestDossier key={requestId} requestId={requestId} blocked={blocked}/>:null}</details>;
}
function RequestDossier({requestId,blocked}:{requestId:string;blocked:boolean}){
 const [value,setValue]=useState<ReturnType<typeof DocumentDossier.parse>|null>(null),[booking,setBooking]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');const intent=useIntent();
 async function load(){const v=await documents.dossier(requestId);setValue(v);setBooking(old=>old&&v.relations.some(b=>b.id===old)?old:v.relations[0]?.id??'');}
 useEffect(()=>{let active=true;void documents.dossier(requestId).then(v=>{if(active){setValue(v);setBooking(v.relations[0]?.id??'');}}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[requestId]);
 async function command(body:unknown){setBusy(true);setError('');setNotice('');try{await documents.command(requestId,body,intent.key(body));intent.clear();await load();setNotice('Document linkage updated.');}catch(e){setError(e instanceof Error?e.message:'Document action failed.');}finally{setBusy(false);}}
 return <div>{error?<p role="alert" className={s.error}>{error} <Button variant="ghost" onClick={()=>void load().catch(e=>setError(e.message))}>Reload</Button></p>:null}{notice?<p role="status">{notice}</p>:null}<p className={s.warning}>Requirements to confirm with the carrier. An accepted file does not mean the entire shipment is compliant or ready to depart.</p>
  {value?.relations.length?<Select label="Share with the carrier for this booking" value={booking} onChange={e=>setBooking(e.target.value)}>{value.relations.map(b=><option key={b.id} value={b.id}>Booking {b.id.slice(0,8)} · carrier {b.carrierId.slice(0,8)} · {b.status}</option>)}</Select>:<p>No booking selected yet. Files remain private to your organization.</p>}
  {!value&&!error?<p role="status">Loading linked documents…</p>:null}
  {value?.data.filter(link=>link.active).map(link=><article className={s.item} key={link.id}><h4>{link.revision.title} · v{link.revision.version}</h4><p>{kindName(link.revision.kind)} · {validity(link.revision)}</p>{!link.correspondenceCurrent?<p className={s.warning}>Cargo changed: review this file against the current manifest and attach the corresponding revision again.</p>:null}<div className={s.actions}><Button variant="secondary" disabled={busy} onClick={()=>void download(link.revision.id).catch(e=>setError(e.message))}>Download</Button><Button variant="secondary" disabled={busy||blocked||!booking||!link.correspondenceCurrent} onClick={()=>void command({action:'share',linkId:link.id,bookingId:booking,expectedVersion:link.version})}>Share this revision</Button><Button variant="ghost" disabled={busy||blocked} onClick={()=>void command({action:'unlink',linkId:link.id,expectedVersion:link.version})}>Remove from shipment</Button></div>
   {link.shares.map(share=><div className={s.item} key={share.id}><p>Booking {share.bookingId.slice(0,8)} · {share.state==='ACTIVE'?stateName(share.review):stateName(share.state)}{share.reason?` · ${share.reason}`:''}</p>{share.state==='ACTIVE'?<Button variant="ghost" disabled={busy||blocked} onClick={()=>void command({action:'revoke',shareId:share.id,expectedVersion:share.version})}>Revoke carrier access</Button>:null}</div>)}
  </article>)}
  {value&&!value.data.some(link=>link.active)?<p>No files linked to this shipment.</p>:null}
  <DocumentLibrary requestId={requestId} blocked={blocked||busy} onChanged={load}/>
  <p className={s.muted}>Revocation blocks new downloads. Download links already issued expire within 60 seconds.</p>
 </div>;
}
export function CarrierDocuments({carrierId,bookingId,canReview=false}:{carrierId:string;bookingId:string;canReview?:boolean}){
 const [open,setOpen]=useState(false);
 return <details className={s.panel} onToggle={e=>setOpen(e.currentTarget.open)}><summary>Document review</summary>{open?<CarrierReview key={carrierId+bookingId} carrierId={carrierId} bookingId={bookingId} canReview={canReview}/>:null}</details>;
}
function CarrierReview({carrierId,bookingId,canReview}:{carrierId:string;bookingId:string;canReview:boolean}){
 const [data,setData]=useState<Awaited<ReturnType<typeof documents.carrier>>|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[reasons,setReasons]=useState<Record<string,string>>({});const intent=useIntent();
 async function load(){setData(await documents.carrier(carrierId,bookingId));}
 useEffect(()=>{let active=true;void documents.carrier(carrierId,bookingId).then(d=>{if(active)setData(d);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[carrierId,bookingId]);
 async function review(id:string,version:number,decision:'ACCEPTED'|'CORRECTION_REQUESTED'){setBusy(true);setError('');const value={expectedVersion:version,decision,reason:reasons[id]??''};try{await documents.review(carrierId,id,value,intent.key({id,...value}));intent.clear();await load();}catch(e){setError(e instanceof Error?e.message:'Review failed.');}finally{setBusy(false);}}
 return <section>{!canReview?<p className={s.muted}>Your carrier role can read documents. An administrator or dispatcher records the review.</p>:null}<p className={s.muted}>Only the revisions explicitly shared for this booking appear here. Review is separate from confirming capacity or dispatch.</p><p className={s.warning}>Documentary requirements remain to be confirmed; this is not an automated legal checklist.</p>{error?<p role="alert" className={s.error}>{error} <Button variant="ghost" onClick={()=>void load().catch(e=>setError(e.message))}>Reload</Button></p>:null}{!data&&!error?<p role="status">Loading shared files…</p>:null}{data&&!data.data.length?<p>The shipper has not shared documents for this booking.</p>:null}
  {data?.data.map(({share,revision,correspondenceCurrent})=><article className={s.item} key={share.id}><h4>{revision.title} · v{revision.version}</h4><p>{kindName(revision.kind)} · {validity(revision)} · {stateName(share.review)}</p>{share.reason?<p>Last review: {share.reason} · {share.reviewedAt}</p>:null}{!correspondenceCurrent?<p className={s.warning}>Declaration changed. Ask for the updated packing list.</p>:null}<div className={s.review}><Button variant="secondary" disabled={busy} onClick={()=>void download(share.id,carrierId).catch(e=>setError(e.message))}>Download shared revision</Button><Input disabled={!canReview||busy} label="Review reason" value={reasons[share.id]??''} minLength={3} maxLength={1000} onChange={e=>setReasons(old=>({...old,[share.id]:e.target.value}))}/><div className={s.actions}><Button disabled={busy||!canReview||!correspondenceCurrent||(reasons[share.id]?.trim().length??0)<3} onClick={()=>void review(share.id,share.version,'ACCEPTED')}>Accept this revision</Button><Button variant="secondary" disabled={busy||!canReview||(reasons[share.id]?.trim().length??0)<3} onClick={()=>void review(share.id,share.version,'CORRECTION_REQUESTED')}>Request correction</Button></div></div></article>)}
 </section>;
}
