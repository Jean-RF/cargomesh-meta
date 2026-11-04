import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { OrganizationValueV2Schema,OrganizationRecordV2Schema } from "@/shared/schemas/v2/organization";
import { OrganizationServiceV2, type OrganizationRepositoryV2 } from "./organization-service";

const actor = { organizationId: "c2300000-0000-4000-8000-000000000001",
  memberId: "c2320000-0000-4000-8000-000000000001" };
const value = OrganizationValueV2Schema.parse({ schemaVersion: "2.0", code: "SHIPPER",
  commercialName: "Shipper", legalName: null, taxIdType: null, taxIdValue: null,
  countryCode: "PE", corporateEmail: "ops@example.com", corporatePhone: "+51999000111",
  defaultCurrency: "USD", status: "ACTIVE" });
const record = { id: actor.organizationId, version: 2, value,
  createdAt: "2026-10-04T00:00:00Z", updatedAt: "2026-10-04T00:00:00Z" };
describe("Organization aggregate boundary", () => {
  it('reads a stored PEN profile without conversion while USD write and tenant guards remain active',async()=>{
    const saved={...record,value:{...value,defaultCurrency:'PEN'}};let writes=0;
    const parsed=OrganizationRecordV2Schema.parse(saved);
    const service=new OrganizationServiceV2({get:async()=>parsed,revise:async()=>{writes++;throw Error('No implicit conversion allowed');}});
    const result=await service.get(actor);assert.equal(result.data.value.defaultCurrency,'PEN');assert.equal(result.data.version,2);assert.equal(writes,0);
    await assert.rejects(service.revise(actor,{expectedVersion:2,value:saved.value},actor.memberId));assert.equal(writes,0);
    const foreign=new OrganizationServiceV2({get:async()=>({...parsed,id:actor.memberId}),revise:async()=>{throw Error('Unused');}});await assert.rejects(foreign.get(actor),/TENANT_MISMATCH/);
  });
  it('rejects malformed stored currencies without changing accepted commercial money',()=>{
    for(const currency of ['','usd','PENN','<script>'])assert.equal(OrganizationRecordV2Schema.safeParse({...record,value:{...value,defaultCurrency:currency}}).success,false);
    assert.equal(OrganizationRecordV2Schema.parse(record).value.defaultCurrency,'USD');
  });
  it("rejects incomplete identifiers, forged auth state, phone and currency", () => {
    for (const patch of [{ taxIdType: "RUC" }, { corporatePhone: "999" },
      { defaultCurrency: "PEN" }, { verifiedAt: "2026-10-04T00:00:00Z" }]) {
      assert.equal(OrganizationValueV2Schema.safeParse({ ...value, ...patch }).success, false);
    }
  });
  it("validates before persistence and refuses another tenant in output", async () => {
    let writes = 0;
    const repo: OrganizationRepositoryV2 = { get: async () => ({ ...record, id: actor.memberId }),
      revise: async () => { writes++; return { record, replay: true }; } };
    const service = new OrganizationServiceV2(repo);
    await assert.rejects(service.revise(actor, { expectedVersion: 0, value }, actor.memberId));
    await assert.rejects(service.revise(actor, { expectedVersion: 1, value }, "invalid"));
    assert.equal(writes, 0);
    await assert.rejects(service.get(actor), /TENANT_MISMATCH/);
    const result = await service.revise(actor, { expectedVersion: 1, value }, actor.memberId);
    assert.equal(result.meta.idempotentReplay, true);
    assert.equal(result.data.version, 2);
  });
});
