"use client";
import { useState } from "react";
import type { z } from "zod";
import { ArrowRight, Package, Truck } from "lucide-react";
import { SearchField } from "@/components/ui";
import { WorkspaceLink as Link } from "@/features/workspace-mode/workspace-link";
import { useLocale } from "@/features/i18n/locale-provider";
import type { CatalogInputsV2, CatalogRecordV2 } from "@/shared/schemas/v2/catalog";
import { displayDemoText } from "@/shared/lib/demo-presentation";
import { DocumentActionsMenu } from "@/features/documents/document-actions-menu";
import { profileOptionLabel } from "./cargo-profile-presentation";
import s from "./cargo-profile-cards.module.css";
type Profile=z.infer<typeof CatalogInputsV2['cargo-profiles']>;
export function CargoProfileCards({ records,categories,editable,busy,onOpen }: {records:CatalogRecordV2[];categories:{id:string;name:string}[];editable:boolean;busy:boolean;onOpen:(id:string)=>void}) {
  const {t,localeTag}=useLocale(),[search,setSearch]=useState(''),[filter,setFilter]=useState('ALL');
  const visible=records.filter(record=>{const value=record.value as Profile;return (filter==='ALL'||value.active===(filter==='ACTIVE'))&&(!search.trim()||[value.name,categories.find(row=>row.id===value.categoryId)?.name??''].join(' ').toLocaleLowerCase(localeTag).includes(search.trim().toLocaleLowerCase(localeTag)));});
  function unitFacts(unit:Profile['typicalUnits'][number]){return <dl className={s.facts}><div><dt>{t('Embalaje','Packaging')}</dt><dd>{profileOptionLabel(unit.packageType,t)} × {unit.quantity.toLocaleString(localeTag)}</dd></div><div><dt>{t('Peso por unidad','Weight per unit')}</dt><dd>{unit.weightPerUnitKg.toLocaleString(localeTag)} kg</dd></div><div><dt>{t('Volumen por unidad','Volume per unit')}</dt><dd>{unit.volumePerUnitM3.toLocaleString(localeTag)} m³</dd></div><div><dt>{t('Dimensiones','Dimensions')}</dt><dd>{unit.dimensionsCm.length.toLocaleString(localeTag)} × {unit.dimensionsCm.width.toLocaleString(localeTag)} × {unit.dimensionsCm.height.toLocaleString(localeTag)} cm</dd></div></dl>;}
  return <div className={s.workspace}><div className={s.toolbar}><SearchField fieldClassName={s.search} label={t('Buscar perfiles de carga','Search cargo profiles')} hideLabel placeholder={t('Buscar perfil…','Search profiles…')} value={search} onValueChange={setSearch} clearLabel={t('Limpiar búsqueda','Clear search')}/>
    <select className={s.filter} aria-label={t('Estado del perfil','Profile status')} value={filter} onChange={event=>setFilter(event.target.value)}><option value="ALL">{t('Todos los estados','All statuses')}</option><option value="ACTIVE">{t('Activos','Active')}</option><option value="INACTIVE">{t('Inactivos','Inactive')}</option></select><span className={s.count}>{visible.length} {t('perfiles cargados','loaded profiles')}</span></div>
    <div className={s.grid}>{visible.map(record=>{const value=record.value as Profile,first=value.typicalUnits[0];return <article className={s.card} data-inactive={!value.active} key={record.id}>
      <header className={s.heading}><span className={s.icon}><Package size={19}/></span><div className={s.name}><button type="button" disabled={busy} onClick={()=>onOpen(record.id)}>{displayDemoText(value.name)}</button><small>{displayDemoText(categories.find(row=>row.id===value.categoryId)?.name??t('Categoría guardada','Saved category'))}</small></div><span className={s.status} data-active={value.active}>{value.active?t('Activo','Active'):t('Inactivo','Inactive')}</span>
        <DocumentActionsMenu label={value.name} actions={[{label:editable?t('Editar perfil','Edit profile'):t('Ver perfil','View profile'),disabled:busy,action:()=>onOpen(record.id)}]}/></header>
      {first?unitFacts(first):<p className={s.emptyUnits}>{t('Sin plantillas de unidades.','No unit templates.')}</p>}
      {value.typicalUnits.length>1&&<details className={s.extra}><summary>{t(`${value.typicalUnits.length-1} grupos adicionales`,`${value.typicalUnits.length-1} more unit groups`)}</summary>{value.typicalUnits.slice(1).map((unit,index)=><section key={index}>{unitFacts(unit)}<small>{unit.unitsPerPackage} {t('unidades por bulto','units per package')}{unit.indivisible?` · ${t('Indivisible','Indivisible')}`:''}{unit.stackable?` · ${t('Apilable','Stackable')}`:''}</small></section>)}</details>}
      <div className={s.chips}>{value.requirements.map(requirement=><span key={requirement}>{profileOptionLabel(requirement,t)}</span>)}{first?.indivisible&&<span>{t('Indivisible','Indivisible')}</span>}{first?.stackable&&<span>{t('Apilable','Stackable')}</span>}{first&&first.unitsPerPackage>1&&<span>{first.unitsPerPackage} {t('unidades por bulto','units per package')}</span>}</div>
      <footer className={s.footer}><span><Truck size={14}/>{value.preferredEquipment?profileOptionLabel(value.preferredEquipment,t):t('Sin preferencia','No preference')}</span>{value.active?<Link href={`/freight-request/new?cargoProfile=${encodeURIComponent(record.id)}`} className={s.use}>{t('Usar en nueva solicitud','Use in new request')}<ArrowRight size={14}/></Link>:<button type="button" disabled className={s.use}>{t('Usar en nueva solicitud','Use in new request')}<ArrowRight size={14}/></button>}</footer>
    </article>;})}</div>
    {!visible.length&&<p className={s.empty}>{records.length?t('No hay perfiles que coincidan.','No matching profiles.'):t('Crea un perfil para reutilizar tu carga habitual.','Create a profile to reuse recurring cargo.')}</p>}
  </div>;
}
