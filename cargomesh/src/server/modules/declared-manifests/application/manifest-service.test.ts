import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ManifestService, type ManifestRepository } from "./manifest-service";
import { prepareDeclaredManifestCandidate } from "../domain/prepare-candidate";

// Synthetic contract data. These tests do not call a provider or database.
const fixture = JSON.parse(readFileSync("../docs/meta/contracts/fixtures/cr00/complete.json", "utf8"));
const request = fixture.request;
const actor = { organizationId: request.organizationId, memberId: "60000000-0000-4000-8000-000000000001" };
const key = "70000000-0000-4000-8000-000000000001";
const candidate = prepareDeclaredManifestCandidate(request, {
  actorOrganizationId: actor.organizationId, expectedRequestDraftVersion: 1,
  groupBindings: request.cargoSpecification.units.map((_: unknown, index: number) => ({
    groupId: `50000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`, sourceUnitIndex: index,
  })),
});
const preparation = {
  id: "80000000-0000-4000-8000-000000000001", preparedByMemberId: actor.memberId,
  expectedManifestRevision: 0, preparedAt: "2026-11-01T00:00:00Z", expiresAt: "2026-11-01T00:30:00Z",
  contentHash: "a".repeat(64), candidate,
};
const manifest = {
  id: "90000000-0000-4000-8000-000000000001", revision: 1, status: "CONFIRMED",
  preparationId: preparation.id, confirmedByMemberId: actor.memberId,
  confirmedAt: "2026-11-01T00:01:00Z", contentHash: preparation.contentHash, declaration: candidate,
};
function repository(overrides: Partial<ManifestRepository> = {}): ManifestRepository {
  return {
    prepare: async () => ({ record: preparation, replay: false }),
    confirm: async () => ({ record: manifest, replay: false }),
    current: async () => ({ record: manifest, currentRequestDraftVersion: 1 }),
    list: async () => [manifest], read: async () => manifest, ...overrides,
  };
}
const confirmation = {
  preparationId: preparation.id, expectedDraftVersion: 1, expectedManifestRevision: 0,
  contentHash: preparation.contentHash, confirmed: true,
};

describe("Declared manifest command boundary", () => {
  it("rejects forged scope, implicit approval, duplicate mappings and unbounded reads before persistence", async () => {
    let calls = 0;
    const service = new ManifestService(repository({
      prepare: async () => { calls++; throw new Error("Unexpected persistence"); },
      confirm: async () => { calls++; throw new Error("Unexpected persistence"); },
      list: async () => { calls++; throw new Error("Unexpected persistence"); },
    }));
    await assert.rejects(service.prepare(actor, request.id, {
      expectedDraftVersion: 1, expectedManifestRevision: 0, organizationId: actor.organizationId,
    }, key));
    await assert.rejects(service.confirm(actor, request.id, { ...confirmation, confirmed: false }, key));
    await assert.rejects(service.prepare(actor, request.id, {
      expectedDraftVersion: 1, expectedManifestRevision: 0,
      groups: [{ groupId: null, sourceUnitIndex: 0 }, { groupId: null, sourceUnitIndex: 0 }],
    }, key));
    await assert.rejects(service.list(actor, request.id, { limit: 101 }));
    await assert.rejects(service.confirm(actor, request.id, confirmation, "invalid-key"));
    assert.equal(calls, 0);
  });
  it("preserves confirmation receipts without rechecking an elapsed local clock or newer request", async () => {
    const service = new ManifestService(repository({ confirm: async () => ({ record: manifest, replay: true }) }));
    const result = await service.confirm(actor, request.id, confirmation, key);
    assert.equal(result.meta.idempotentReplay, true);
    assert.equal(result.data.id, manifest.id);
    assert.deepEqual(result.data.declaration.groupBindings, candidate.groupBindings);
  });
  it("rejects cross-tenant/cross-request repository responses and mismatched review hashes", async () => {
    const foreign = structuredClone(manifest);
    foreign.declaration.source.organizationId = "10000000-0000-4000-8000-000000000099";
    await assert.rejects(new ManifestService(repository({ read: async () => foreign }))
      .read(actor, request.id, manifest.id), /SCOPE_MISMATCH/);
    await assert.rejects(new ManifestService(repository())
      .confirm(actor, request.id, { ...confirmation, contentHash: "b".repeat(64) }, key), /RECEIPT_MISMATCH/);
  });
  it("reports the historical manifest when the request version has advanced", async () => {
    const service = new ManifestService(repository({
      current: async () => ({ record: manifest, currentRequestDraftVersion: 2 }),
    }));
    const current = await service.current(actor, request.id);
    assert.equal(current.meta.matchesCurrentRequest, false);
    assert.equal(current.data?.revision, 1);
    assert.equal(current.data?.declaration.source.requestDraftVersion, 1);
  });
  it("empty history has no fabricated manifest", async () => {
    const service = new ManifestService(repository({
      current: async () => ({ record: null, currentRequestDraftVersion: 1 }), list: async () => [],
    }));
    assert.equal((await service.current(actor, request.id)).data, null);
    assert.equal((await service.current(actor, request.id)).meta.matchesCurrentRequest, null);
    assert.deepEqual((await service.list(actor, request.id, {})).data, []);
  });
});
