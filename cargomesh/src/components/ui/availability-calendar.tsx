'use client';
import {useId,useState} from 'react';
import {CalendarDays,ChevronLeft,ChevronRight} from 'lucide-react';
import {Button,Dialog,Input} from '@/components/ui';
import {useLocale} from '@/features/i18n/locale-provider';
import {planningClock,planningInstant} from '@/shared/lib/planning-clock';
import s from './availability-calendar.module.css';
export function calendarDays(month:string){const [year,m]=month.split('-').map(Number),first=new Date(Date.UTC(year,m-1,1)),offset=(first.getUTCDay()+6)%7;return Array.from({length:42},(_,i)=>new Date(Date.UTC(year,m-1,i-offset+1)).toISOString().slice(0,10));}
export function AvailabilityCalendar({label,startsAt,endsAt,timeZone,onChange,error}:{label:string;startsAt:string;endsAt:string;timeZone:string;onChange:(start:string,end:string)=>void;error?:string}){
 const {t,localeTag}=useLocale(),id=useId();const [open,setOpen]=useState(false),[month,setMonth]=useState(''),[start,setStart]=useState(''),[end,setEnd]=useState(''),[from,setFrom]=useState(''),[until,setUntil]=useState(''),[selectEnd,setSelectEnd]=useState(false);
 const today=planningClock(Date.now(),timeZone).slice(0,10),instantStart=planningInstant(`${start}T${from}`,timeZone),instantEnd=planningInstant(`${end}T${until}`,timeZone);
 const valid=instantStart!==null&&instantEnd!==null&&instantEnd>instantStart&&instantEnd>Date.now();
 function reveal(){setStart(startsAt.slice(0,10));setEnd(endsAt.slice(0,10));setFrom(startsAt.slice(11,16));setUntil(endsAt.slice(11,16));setMonth((startsAt||today).slice(0,7));setSelectEnd(false);setOpen(true);}
 function choose(day:string){if(!selectEnd){setStart(day);setEnd('');setSelectEnd(true);}else if(day<start){setStart(day);setEnd('');}else{setEnd(day);setSelectEnd(false);}}
 function move(delta:number){const [y,m]=month.split('-').map(Number);setMonth(new Date(Date.UTC(y,m-1+delta,1)).toISOString().slice(0,7));}
 const readable=(value:string)=>value?new Intl.DateTimeFormat(localeTag,{dateStyle:'medium',timeZone:'UTC'}).format(new Date(`${value}T12:00:00Z`)):'';
 return <fieldset className={s.card}><legend>{label}</legend><Button variant="secondary" onClick={reveal}><CalendarDays size={17}/>{start||startsAt?t('Cambiar rango y horas','Change dates and times'):t('Elegir rango y horas','Choose dates and times')}</Button>
  <p>{startsAt&&endsAt?`${readable(startsAt.slice(0,10))} ${startsAt.slice(11,16)} → ${readable(endsAt.slice(0,10))} ${endsAt.slice(11,16)}`:t('Días y horarios pendientes','Dates and times not selected')}</p>{error&&<p role="alert" className={s.error}>{error}</p>}
  <Dialog open={open} title={label} description={t('Elige el primer y último día y los horarios de disponibilidad.','Choose the first and last day and the availability hours.')} closeLabel={t('Cancelar','Cancel')} className={s.dialog} onClose={()=>setOpen(false)} footer={<><Button variant="secondary" onClick={()=>setOpen(false)}>{t('Cancelar','Cancel')}</Button><Button disabled={!valid} onClick={()=>{if(valid){onChange(`${start}T${from}`,`${end}T${until}`);setOpen(false);}}}>{t('Aplicar rango','Apply range')}</Button></>}>
   <div className={s.layout}><section aria-label={t('Calendario de disponibilidad','Availability calendar')}>
    <div className={s.month}><Button variant="ghost" aria-label={t('Mes anterior','Previous month')} onClick={()=>move(-1)}><ChevronLeft size={18}/></Button><strong aria-live="polite">{month?new Intl.DateTimeFormat(localeTag,{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(`${month}-01T12:00:00Z`)):''}</strong><Button variant="ghost" aria-label={t('Mes siguiente','Next month')} onClick={()=>move(1)}><ChevronRight size={18}/></Button></div>
    <p id={`${id}-hint`} role="status">{selectEnd?t('Ahora elige el último día (puede ser el mismo).','Now choose the last day (it can be the same day).'):t('Elige el primer día del rango.','Choose the first day of the range.')}</p>
    <div className={s.grid}>{Array.from({length:7},(_,i)=><small key={i}>{new Intl.DateTimeFormat(localeTag,{weekday:'short',timeZone:'UTC'}).format(new Date(Date.UTC(2026,10,2+i)))}</small>)}</div>
    <div className={s.grid} aria-describedby={`${id}-hint`}>{month&&calendarDays(month).map(day=><button key={day} type="button" disabled={day<today} aria-pressed={day===start||day===end} aria-label={readable(day)} data-other={!day.startsWith(month)} data-range={!!start&&!!end&&day>start&&day<end} onClick={()=>choose(day)}>{Number(day.slice(-2))}</button>)}</div>
   </section><section className={s.fields}><p>{timeZone}</p><Input type="date" label={t('Primer día','First day')} min={today} value={start} onChange={e=>{setStart(e.target.value);if(end<e.target.value)setEnd('');}}/><Input type="date" label={t('Último día','Last day')} min={start||today} value={end} onChange={e=>setEnd(e.target.value)}/><Input type="time" label={t('Disponible desde','Available from')} value={from} onChange={e=>setFrom(e.target.value)}/><Input type="time" label={t('Disponible hasta','Available until')} value={until} onChange={e=>setUntil(e.target.value)}/>
    {start&&end&&from&&until&&!valid&&<p className={s.error} role="alert">{t('Revisa el rango: el final debe ser posterior al inicio y no estar vencido.','Check the range: the end must follow the start and must not have elapsed.')}</p>}
   </section></div>
  </Dialog>
 </fieldset>;
}
