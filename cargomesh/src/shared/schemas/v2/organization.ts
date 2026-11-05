import { z } from "zod";

const OrganizationFieldsV2Schema = z.object({
  schemaVersion: z.literal("2.0"),
  code: z.string().trim().min(1).max(100),
  commercialName: z.string().trim().min(1).max(200),
  legalName: z.string().trim().min(1).max(200).nullable(),
  taxIdType: z.string().trim().min(1).max(50).nullable(),
  taxIdValue: z.string().trim().min(1).max(100).nullable(),
  countryCode: z.string().regex(/^[A-Z]{2}$/).nullable(),
  corporateEmail: z.string().email().max(254).nullable(),
  corporatePhone: z.string().regex(/^\+[1-9]\d{6,14}$/).nullable(),
  defaultCurrency: z.literal("USD"), status: z.enum(["ACTIVE", "INACTIVE"]),
}).strict();
const pairedTaxIdentity=(value:{taxIdType:string|null;taxIdValue:string|null})=>(value.taxIdType===null)===(value.taxIdValue===null);
// Commands keep the implemented USD-only contract. Reading an existing profile
// with another stored currency must not fail or silently convert its value.
export const OrganizationValueV2Schema=OrganizationFieldsV2Schema.refine(pairedTaxIdentity, {
  message: "Tax type and identifier must be supplied together.",
});
export const OrganizationReadValueV2Schema=OrganizationFieldsV2Schema.extend({
  defaultCurrency:z.string().regex(/^[A-Z]{3}$/),
}).refine(pairedTaxIdentity,{message:'Tax type and identifier must be supplied together.'});
export const OrganizationRecordV2Schema = z.object({
  id: z.string().uuid(), version: z.number().int().positive(),
  value: OrganizationReadValueV2Schema,
  createdAt: z.string().datetime({ offset: true }), updatedAt: z.string().datetime({ offset: true }),
}).strict();
export const OrganizationRevisionV2Schema = z.object({
  expectedVersion: z.number().int().positive(), value: OrganizationValueV2Schema,
}).strict();
export type OrganizationV2 = z.infer<typeof OrganizationRecordV2Schema>;
export type OrganizationValueV2 = z.infer<typeof OrganizationValueV2Schema>;
