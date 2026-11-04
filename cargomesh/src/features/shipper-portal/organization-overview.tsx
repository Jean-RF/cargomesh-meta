"use client";
import { Info, LockKeyhole, Pencil } from "lucide-react";
import { useLocale } from "@/features/i18n/locale-provider";
import type { OrganizationV2 } from "@/shared/schemas/v2/organization";
import { displayDemoText } from "@/shared/lib/demo-presentation";
import { formatDateTime } from "@/shared/lib/date-time";
import s from "./organization-design.module.css";

export function OrganizationOverview({ record, owner, preview, onEdit }: { record: OrganizationV2; owner: boolean; preview: boolean; onEdit: () => void }) {
  const {t,localeTag}=useLocale(),v=record.value;
  const fields=[{label:t("Nombre comercial","Commercial name"),value:v.commercialName},{label:t("Código de organización","Organization code"),value:v.code},{label:t("Razón social","Legal name"),value:v.legalName},{label:t("País","Country"),value:v.countryCode},{label:t("Tipo de identificación fiscal","Tax identifier type"),value:v.taxIdType},{label:t("Identificación fiscal","Tax identifier"),value:v.taxIdValue},{label:t("Correo corporativo","Corporate email"),value:v.corporateEmail},{label:t("Teléfono corporativo","Corporate phone"),value:v.corporatePhone},{label:t("Moneda predeterminada","Default currency"),value:v.defaultCurrency}];
  const missing=fields.filter(field=>!field.value?.trim()),count=fields.length-missing.length;
  const fact=(index:number)=>{const field=fields[index];return <div key={field.label}><dt>{field.label}</dt><dd>{field.value?<span>{index<3?displayDemoText(field.value):index===8?<span className={s.currencyInfo}>{field.value}{field.value!=="USD"&&<Info size={13} aria-label={t("La edición actual admite USD; se conserva la moneda guardada.","Editing currently supports USD; the stored currency is preserved.")}/>}</span>:index===6?<a href={`mailto:${field.value}`}>{field.value}</a>:index===7?<a href={`tel:${field.value}`}>{field.value}</a>:field.value}</span>:<span className={s.missingValue}>{t("Sin registrar","Not provided")}</span>}</dd></div>;};
  return <div className={s.overview}>
    <section className={s.card}><header className={s.cardHeader}><div><h2>{t("Información de la empresa","Company information")}</h2><p>{t("Identidad, registro y contacto.","Identity, registration and contact details.")}</p></div>
      {owner&&!preview&&v.defaultCurrency==="USD"?<button type="button" className={s.link} onClick={onEdit}><Pencil size={13}/>{t("Editar","Edit")}</button>:<span className={s.readOnly}><LockKeyhole size={12}/>{owner&&v.defaultCurrency!=="USD"?t("Sólo lectura · moneda guardada","View only · stored currency"):t("Sólo lectura · edita el propietario","View only · owner can edit")}</span>}
    </header>
      <section className={s.section}><h3>{t("Identidad","Identity")}</h3><dl className={s.facts}>{[0,1,2,3].map(fact)}</dl></section>
      <section className={s.section}><h3>{t("Información fiscal","Tax")}</h3><dl className={s.facts}>{[4,5].map(fact)}</dl></section>
      <section className={s.section}><h3>{t("Contacto y preferencias","Contact & preferences")}</h3><dl className={s.facts}>{[6,7,8].map(fact)}</dl></section>
    </section>
    <aside className={s.side}>
      <section className={s.sideCard}><div className={s.sideHeading}><h2>{t("Datos del perfil","Profile completeness")}</h2><strong>{t(`${count} de ${fields.length}`,`${count} of ${fields.length}`)}</strong></div>
        <progress className={s.progress} value={count} max={fields.length} aria-label={t("Campos registrados","Recorded fields")}/>
        {missing.length?<><p>{t("Datos pendientes","Missing details")}</p><div className={s.missing}>{missing.map(field=><span key={field.label}>{field.label}</span>)}</div><p>{owner?t("Completa estos datos al editar el perfil.","Complete these details when editing the profile."):t("Un propietario puede completar estos datos.","An organization owner can complete these details.")}</p></>:<p>{t("Los datos del perfil están completos.","Profile details are complete.")}</p>}
      </section>
      <section className={s.sideCard}><div className={s.sideHeading}><h2>{t("Actividad reciente","Recent activity")}</h2></div>
        {preview?<p>{t("Vista previa sin actividad conectada.","Preview without connected activity.")}</p>:<ul className={s.events}><li><strong>{t("Perfil creado","Profile created")}</strong><small>{formatDateTime(record.createdAt,localeTag)}</small></li><li><strong>{t("Último perfil guardado","Latest saved profile")}</strong><small>{t("Versión","Revision")} {record.version} · {formatDateTime(record.updatedAt,localeTag)}</small></li></ul>}
      </section>
    </aside>
  </div>;
}
