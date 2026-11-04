'use client';
import {useRef,useState} from 'react';
import {Button,Dialog} from '@/components/ui';
import {useLocale} from '@/features/i18n/locale-provider';
import {ShipperApiError} from './shipper-api';
import {prepareBookingCapacity} from './booking-preparation-client';
export {prepareBookingCapacity} from './booking-preparation-client';
export function BookingPreparation({id,version,enabled,onChanged}:{id:string;version:number;enabled:boolean;onChanged:()=>void}){
 const {t}=useLocale(),[busy,setBusy]=useState(false),[error,setError]=useState(''),[open,setOpen]=useState(false);const pending=useRef<string|null>(null);
 return <div><Button variant="secondary" size="compact" disabled={!enabled||busy} onClick={()=>setOpen(true)}>{t('Preparar capacidad','Prepare capacity')}</Button>
  <Dialog open={open} title={t('Preparar o recuperar capacidad','Prepare or recover capacity')} description={t('Se revalidará la capacidad. Sólo se confirma automáticamente con autorización del transportista.','Capacity will be revalidated. Automatic confirmation requires carrier authorization.')} closeLabel={t('Cancelar','Cancel')} closeDisabled={busy} onClose={()=>setOpen(false)}
   footer={<><Button variant="secondary" disabled={busy} onClick={()=>setOpen(false)}>{t('Cancelar','Cancel')}</Button><Button disabled={!enabled||busy} isLoading={busy} onClick={()=>{if(busy||!enabled)return;setBusy(true);setError('');pending.current??=crypto.randomUUID();void prepareBookingCapacity(id,version,pending.current).then(()=>{pending.current=null;setOpen(false);onChanged();}).catch(e=>setError(e instanceof ShipperApiError?e.code:'CAPACITY_PREPARATION_FAILED')).finally(()=>setBusy(false));}}>{t('Confirmar preparación','Confirm preparation')}</Button></>}>
   {error?<p role="alert">{error}</p>:<p>{t('No inicia el transporte.','This does not start transport.')}</p>}
  </Dialog></div>;
}
