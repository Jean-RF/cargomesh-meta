"use client";
import { useRef, useState } from "react";
import { FileUp, FileText, X } from "lucide-react";
import { Button, Dialog, Input, Select } from "@/components/ui";
import { useLocale } from "@/features/i18n/locale-provider";
import { DocumentMetadata, DOCUMENT_LIMIT, type DocumentRevision } from "@/shared/schemas/meta/documents";
import { documents } from "./document-client";
import s from "./request-documents.module.css";

export function DocumentUploadDialog({ requestId, replacement, onClose, onSaved }: { requestId?: string; replacement: DocumentRevision | null; onClose: () => void; onSaved: () => Promise<void> }) {
  const {t}=useLocale(), [title,setTitle]=useState(replacement?.title??""),[kind,setKind]=useState<"COMPANY_PROFILE"|"PACKING_LIST"|"OTHER">(replacement?.kind??(requestId?"PACKING_LIST":"COMPANY_PROFILE"));
  const [issued,setIssued]=useState(replacement?.issuedOn??""),[expiry,setExpiry]=useState(replacement?.expiresOn??""),[file,setFile]=useState<File|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const input=useRef<HTMLInputElement>(null),intent=useRef<{signature:string;key:string}|null>(null),inFlight=useRef(false),saved=useRef(false);
  function choose(value:File|null){if(!value)return;setError("");if(value.size===0||value.size>DOCUMENT_LIMIT){setError(t("El archivo debe pesar entre 1 byte y 4 MiB.","Choose a non-empty file up to 4 MiB."));return;}if(!["application/pdf","image/png","image/jpeg"].includes(value.type)){setError(t("Selecciona un PDF, PNG o JPEG.","Choose a PDF, PNG or JPEG."));return;}setFile(value);intent.current=null;}
  async function save(){if(!file||inFlight.current)return;inFlight.current=true;setBusy(true);setError("");try{
    const parsed=DocumentMetadata.safeParse({title,kind,requestId:replacement?replacement.requestId:kind==='COMPANY_PROFILE'?null:requestId??null,documentId:replacement?.documentId??null,expectedVersion:replacement?.documentVersion??0,issuedOn:issued||null,expiresOn:expiry||null});
    if(!parsed.success)throw new Error(t("Revisa el nombre y las fechas del documento.","Check the document name and dates."));
    const metadata=parsed.data;
    const signature=JSON.stringify({metadata,name:file.name,size:file.size,lastModified:file.lastModified});if(intent.current?.signature!==signature)intent.current={signature,key:crypto.randomUUID()};
    if(!saved.current){await documents.upload(file,metadata,intent.current.key);saved.current=true;window.dispatchEvent(new Event('cargomesh:documents-changed'));}
    await onSaved();intent.current=null;onClose();
  }catch(e){setError(e instanceof Error?e.message:t("No se pudo subir el archivo.","Upload failed."));}finally{inFlight.current=false;setBusy(false);}}
  return <Dialog open title={replacement?t("Subir nueva versión","Upload new revision"):t("Subir documento","Upload document")} description={requestId?t("Se guarda de forma privada. Tú eliges cuándo adjuntarlo y compartirlo.","Saved privately. You choose when to attach and share it."):t("Agrega un archivo a tu biblioteca privada.","Add a file to your private library.")} className={`${s.dialog} ${!requestId?s.libraryUpload:''}`} closeLabel={t("Cerrar","Close")} closeDisabled={busy} onClose={onClose}
    footer={<><Button variant="secondary" disabled={busy} onClick={onClose}>{t("Cancelar","Cancel")}</Button><Button disabled={busy||!file||!title.trim()} isLoading={busy} onClick={()=>void save()}>{saved.current?t("Actualizar lista","Refresh list"):requestId?t("Guardar documento","Save document"):t("Guardar versión privada","Save private revision")}</Button></>}>
    <div className={s.form}>
      <Input label={t("Nombre del documento","Document name")} value={title} disabled={busy||saved.current||Boolean(replacement)} maxLength={160} onChange={e=>setTitle(e.target.value)}/>
      <Select label={t("Tipo de documento","Document type")} value={kind} disabled={busy||saved.current||Boolean(replacement)} onChange={e=>setKind(e.target.value as typeof kind)}>{(requestId||replacement?.kind==='PACKING_LIST')&&<option value="PACKING_LIST">{t("Lista de empaque","Packing list")}</option>}<option value="COMPANY_PROFILE">{t("Perfil de empresa · reutilizable","Company profile · reusable")}</option><option value="OTHER">{t("Otro documento","Other document")}</option></Select>
      <div className={s.dates}><Input label={t("Emisión (opcional)","Issued (optional)")} type="date" disabled={busy||saved.current} value={issued} onChange={e=>setIssued(e.target.value)}/><Input label={t("Vencimiento (opcional)","Expires (optional)")} type="date" min={issued||undefined} disabled={busy||saved.current} value={expiry} onChange={e=>setExpiry(e.target.value)}/></div>
      <div className={s.dropzone} onDragOver={e=>{e.preventDefault();}} onDrop={e=>{e.preventDefault();if(!busy&&!saved.current)choose(e.dataTransfer.files[0]??null);}}>
        <input ref={input} className={s.hiddenInput} type="file" accept="application/pdf,image/png,image/jpeg" aria-label={t("Seleccionar archivo","Choose file")} disabled={busy||saved.current} onChange={e=>{choose(e.target.files?.[0]??null);e.target.value="";}}/>
        {file?<><FileText size={28}/><strong>{file.name}</strong><small>{Math.ceil(file.size/1024)} KiB</small><Button variant="ghost" size="compact" disabled={busy||saved.current} onClick={()=>setFile(null)}><X size={14}/>{t("Cambiar archivo","Change file")}</Button></>
          : <><FileUp size={28}/><strong>{t("Arrastra el archivo aquí","Drop a file here")}</strong><Button variant="secondary" size="compact" disabled={busy} onClick={()=>input.current?.click()}>{t("Seleccionar archivo","Choose file")}</Button><small>PDF, PNG, JPEG · 4 MiB</small></>}
      </div>
      {error&&<p role="alert" className={s.error}>{error}</p>}
    </div>
  </Dialog>;
}
