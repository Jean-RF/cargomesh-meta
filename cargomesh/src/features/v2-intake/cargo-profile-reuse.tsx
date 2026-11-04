"use client";
import { useEffect,useRef,useState } from "react";
import { usePathname,useSearchParams } from "next/navigation";
import type { z } from "zod";
import { Button,Dialog } from "@/components/ui";
import { CatalogInputsV2,CatalogRecordV2Schema,parseCatalogRecordV2,type CatalogRecordV2 } from "@/shared/schemas/v2/catalog";
import { recordSchema,settingsRequest,settingsError } from "@/features/shipper-portal/client-settings-api";
import { operationsHistoryState } from "@/features/shipper-portal/operations-query";
import { displayDemoText } from "@/shared/lib/demo-presentation";
import { useIntakeSession } from "./intake-session";
import type { DraftCargoGroup } from "./cargo-groups";
type Profile=z.infer<typeof CatalogInputsV2['cargo-profiles']>;
export function CargoProfileReuse(){
  const session=useIntakeSession(),params=useSearchParams(),pathname=usePathname(),id=params.get('cargoProfile');
  const [profile,setProfile]=useState<CatalogRecordV2|null>(null),[category,setCategory]=useState(''),[error,setError]=useState(''),[loading,setLoading]=useState(false),applied=useRef(false);
  useEffect(()=>{if(!id)return;let active=true;setProfile(null);setCategory('');setError('');setLoading(true);applied.current=false;
    void (async()=>{if(!/^[0-9a-f-]{36}$/i.test(id))throw new Error(session.t('Perfil no válido.','Invalid profile.'));const response=await settingsRequest(`/cargo-profiles/${encodeURIComponent(id)}`,recordSchema(CatalogRecordV2Schema)),record=parseCatalogRecordV2('cargo-profiles',response.data),value=record.value as Profile;
      if(!value.active)throw new Error(session.t('Este perfil está inactivo.','This profile is inactive.'));
      const raw=await settingsRequest(`/cargo-categories/${encodeURIComponent(value.categoryId)}`,recordSchema(CatalogRecordV2Schema)),saved=parseCatalogRecordV2('cargo-categories',raw.data).value as {code:string;active:boolean};
      if(!saved.active)throw new Error(session.t('La categoría del perfil está inactiva.','The profile category is inactive.'));
      if(active){setProfile(record);setCategory(saved.code);}
    })().catch(e=>{if(active)setError(e instanceof Error?e.message:settingsError(e));}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};
  },[id]);
  function close(){const next=new URLSearchParams(window.location.search);next.delete('cargoProfile');window.history.replaceState(operationsHistoryState(window.history.state),'',`${pathname}${next.size?'?'+next:''}`);}
  const value=profile?.value as Profile|undefined;
  const unavailable=Boolean(value&&(!session.activeOptions.cargoCategories.some(row=>row.code===category)||value.requirements.some(code=>!session.activeOptions.requirementOptions.some(row=>row.code===code))||value.preferredEquipment&&!session.activeOptions.equipmentOptions.some(row=>row.code===value.preferredEquipment)||value.typicalUnits.some(unit=>!session.activeOptions.packagingOptions.some(row=>row.code===unit.packageType))));
  const busy=['creating','revising','reading','evaluating'].includes(session.submitPhase)||session.media.busy||session.media.recording||session.media.requestingMic;
  function apply(){if(!value||!profile||applied.current||busy||session.request||unavailable||session.optionsSource!=='api'||!value.typicalUnits.length||value.typicalUnits.length>20)return;applied.current=true;
    const groups:DraftCargoGroup[]=value.typicalUnits.map((unit,index)=>({id:`profile-${index}`,unitPackageType:unit.packageType,unitQuantity:String(unit.quantity),unitWeightPerUnitKg:String(unit.weightPerUnitKg),unitVolumePerUnitM3:String(unit.volumePerUnitM3),unitLengthCm:String(unit.dimensionsCm.length),unitWidthCm:String(unit.dimensionsCm.width),unitHeightCm:String(unit.dimensionsCm.height),unitIndivisible:unit.indivisible,unitStackable:unit.stackable,unitUnitsPerPackage:String(unit.unitsPerPackage)}));
    session.pauseAssistantAdvance();session.updateCargoGroups(groups);session.update('categoryCode',category);session.update('cargoDescription',value.name);session.update('packaging',value.typicalUnits[0].packageType);session.update('requirements',[...value.requirements]);session.update('requiredEquipment',value.preferredEquipment??'');
    session.update('temperatureMinCelsius','');session.update('temperatureMaxCelsius','');close();
  }
  if(!id)return null;
  const blocked=!value||loading||busy||Boolean(error)||Boolean(session.request)||unavailable||session.optionsSource!=='api'||!value.typicalUnits.length||value.typicalUnits.length>20;
  return <Dialog open title={session.t('Usar perfil de carga','Use cargo profile')} description={session.t('Sólo se precargan los datos de carga. Revisa sedes, fechas y condiciones antes de crear el envío.','Only cargo details are prefilled. Review facilities, dates and requirements before creating the shipment.')} closeLabel={session.t('Cancelar','Cancel')} onClose={close}
    footer={<><Button variant="secondary" onClick={close}>{session.t('Cancelar','Cancel')}</Button><Button disabled={blocked} onClick={apply}>{session.t('Aplicar al borrador','Apply to draft')}</Button></>}>
    {loading?<p role="status">{session.t('Cargando perfil…','Loading profile…')}</p>:error?<p role="alert">{error}</p>:value?<><strong>{displayDemoText(value.name)}</strong><p>{value.typicalUnits.length} {session.t('grupos de carga','cargo groups')}</p><p>{session.t('Reemplazará los datos de carga del borrador abierto.','This replaces the cargo details in the open draft.')}</p>{session.request?<p role="alert">{session.t('Ya hay una solicitud guardada abierta. Inicia un borrador nuevo antes de reutilizar un perfil.','A saved request is already open. Start a new draft before reusing a profile.')}</p>:unavailable?<p role="alert">{session.t('Revisa el perfil: una categoría, equipo o requisito ya no está disponible.','Review the profile: a category, equipment or requirement is no longer available.')}</p>:!value.typicalUnits.length||value.typicalUnits.length>20?<p role="alert">{session.t('El formulario admite de 1 a 20 grupos. Ajusta el perfil antes de reutilizarlo.','The form supports 1–20 groups. Update the profile before reusing it.')}</p>:null}</>:null}
  </Dialog>;
}
