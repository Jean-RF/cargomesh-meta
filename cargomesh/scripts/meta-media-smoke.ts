import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { interpretMetaMediaDeclaration } from "../src/server/ai/meta/interpret-media-declaration";
import { readMetaProposalConfig } from "../src/server/ai/meta/config";
import { prepareDeclarationImages } from "../src/server/ai/meta/media-input";
import { DeclarationInputSchema } from "../src/shared/schemas/meta/model-proposal";
import type { DeclarationInput, ModelProposal } from "../src/shared/schemas/meta/model-proposal";

const evidenceId = "11111111-1111-4111-8111-111111111111";
const measurements = ["unitWeightKg", "unitLengthCm", "unitWidthCm", "unitHeightCm"];
function value(p: ModelProposal, field: string) { return p.fields.find(item => item.field === field)?.value; }

async function main() {
  const args = process.argv.slice(2);
  const checkOnly = args.includes("--check"), live = args.includes("--live");
  if (args.some(arg => !["--live", "--check", "--report", "--suite=luis"].includes(arg)) ||
      new Set(args).size !== args.length || (checkOnly && live) || (args.includes("--report") && !live)) {
    console.log(JSON.stringify({ check: "meta-media", status: "INVALID_ARGUMENTS", liveRequestMade: false }));
    process.exitCode = 2; return;
  }
  if (!live && !checkOnly) {
    console.log(JSON.stringify({ check: "meta-media", status: "LIVE_OPT_IN_REQUIRED", liveRequestMade: false }));
    process.exitCode = 2; return;
  }
  if (live && !readMetaProposalConfig()) {
    console.log(JSON.stringify({ check: "meta-media", status: "NOT_CONFIGURED", liveRequestMade: false }));
    process.exitCode = 2; return;
  }
  const luisSuite = args.includes("--suite=luis");
  const assets = new URL(`../../docs/meta/demo-assets/${luisSuite ? "luis" : "ax02"}/`, import.meta.url);
  // Evaluation expectations below NEVER enter provider input, system prompt or image metadata.
  const cases = luisSuite ? [
    { name: "foreground-cargo-es", file: "cargo-scene.png", kind: "photo" as const,
      text: "Describe las cajas cerradas visibles en el suelo. No inventes su peso ni sus medidas.",
      check: (p: ModelProposal) => value(p, "unitQuantity") === 4 && value(p, "unitType") === "BOX" &&
        measurements.every(field => value(p, field) === undefined && p.missingFields.some(missing => missing === field)) &&
        p.warnings.includes("NO_SCALE") && p.warnings.includes("VISIBLE_COUNT_ONLY") },
    { name: "printed-label-es", file: "shipping-label.png", kind: "label" as const, text: null,
      check: (p: ModelProposal) => value(p, "unitQuantity") === 4 && value(p, "unitType") === "BOX" &&
        value(p, "unitWeightKg") === 8 && value(p, "unitLengthCm") === 40 &&
        value(p, "unitWidthCm") === 30 && value(p, "unitHeightCm") === 20 && p.warnings.includes("UNVERIFIED_LABEL") },
    { name: "damaged-label-es", file: "damaged-label.png", kind: "label" as const, text: null,
      check: (p: ModelProposal) => ["unitQuantity", ...measurements].every(field => value(p, field) === undefined) &&
        (p.status === "REFUSED" || measurements.every(field => p.missingFields.some(missing => missing === field))) },
    { name: "newer-correction-es", file: null, kind: "audio" as const,
      text: "Corrección: son 3 cajas, no cuatro. Cada caja pesa 8 kg.",
      check: (p: ModelProposal) => value(p, "unitQuantity") === 3 && value(p, "unitWeightKg") === 8 &&
        p.fields.find(field => field.field === "unitQuantity")?.provenance.source === "text" },
  ] : [
    { name: "foreground-boxes-no-scale", file: "boxes-no-scale.png", kind: "photo" as const,
      text: "Describe the closed shipping boxes on the foreground floor only. Leave other warehouse stock out of scope.",
      check: (p: ModelProposal) => value(p, "unitQuantity") === 3 && value(p, "unitType") === "BOX" &&
        measurements.every(field => value(p, field) === undefined && p.missingFields.some(missing => missing === field)) &&
        p.warnings.includes("NO_SCALE") && p.warnings.includes("VISIBLE_COUNT_ONLY") },
    { name: "readable-label", file: "readable-label.png", kind: "label" as const, text: null,
      check: (p: ModelProposal) => value(p, "unitQuantity") === 2 && value(p, "unitType") === "BOX" &&
        value(p, "unitWeightKg") === 15 && value(p, "unitLengthCm") === 50 &&
        value(p, "unitWidthCm") === 40 && value(p, "unitHeightCm") === 30 && p.warnings.includes("UNVERIFIED_LABEL") },
    { name: "unreadable-label", file: "unreadable-label.png", kind: "label" as const, text: null,
      check: (p: ModelProposal) => ["unitQuantity", ...measurements].every(field => value(p, field) === undefined) &&
        (p.status === "REFUSED" || measurements.every(field => p.missingFields.some(missing => missing === field))) },
    { name: "transcript-with-latest-correction", file: null, kind: "audio" as const,
      text: "Correction: 10 boxes, not twelve. Each box weighs 15 kg.",
      check: (p: ModelProposal) => value(p, "unitQuantity") === 10 && value(p, "unitWeightKg") === 15 &&
        p.fields.find(field => field.field === "unitQuantity")?.provenance.source === "text" },
  ];
  // Validate every local fixture before any provider invocation. Check mode needs no key.
  const prepared = [];
  for (const item of cases) {
    const bytes = item.file ? await readFile(new URL(item.file, assets)) : null;
    const input: DeclarationInput = { schemaVersion: "1.0", inputRevision: 2, language: luisSuite ? "es" : "en", text: item.text,
      evidence: [{ evidenceId, kind: item.kind, text: item.kind === "audio" ?
        (luisSuite ? "Son 4 cajas, de 8 kg cada una." : "12 boxes, 15 kg per box.") : null }] };
    const images = bytes ? [{ evidenceId, mimeType: "image/png" as const, bytes }] : [];
    if (!DeclarationInputSchema.safeParse(input).success || prepareDeclarationImages(input, images) === null) {
      console.log(JSON.stringify({ check: "meta-media", case: item.name, status: "MEDIA_INVALID", liveRequestMade: false }));
      process.exitCode = 2; return;
    }
    prepared.push({ item, bytes, input, images });
  }
  if (checkOnly) {
    console.log(JSON.stringify({ check: "meta-media", suite: luisSuite ? "luis" : "axel",
      status: "PASS_INPUTS_ONLY", liveRequestMade: false, recognitionVerified: false,
      cases: prepared.map(({ item, bytes }) => ({ case: item.name, asset: item.file,
        material: bytes ? "AI_GENERATED_SYNTHETIC_IMAGE" : "SYNTHETIC_TRANSCRIPT_NO_ASR",
        sha256: bytes ? createHash("sha256").update(bytes).digest("hex") : null,
        bytes: bytes?.byteLength ?? 0 })), commercialWrites: 0 }, null, 2));
    return;
  }
  const results = [];
  for (const { item, bytes, input, images } of prepared) {
    const result = await interpretMetaMediaDeclaration(input,
      { currentInputRevision: 2, authorizedEvidenceIds: [evidenceId], expectedUnit: null },
      { images });
    const accepted = result.ok && item.check(result.proposal);
    results.push({ case: item.name, status: accepted ? "PASS" : "FAILED_ACCEPTANCE",
      material: item.kind === "audio" ? "SYNTHETIC_TRANSCRIPT_NO_ASR" : "AI_GENERATED_SYNTHETIC_IMAGE",
      asset: item.file, sha256: bytes ? createHash("sha256").update(bytes).digest("hex") : null,
      metadata: result.metadata, error: result.ok ? null : result.error,
      // Only own synthetic data; never use this runner with private user records.
      proposal: result.ok ? result.proposal : null,
      commercialWrites: 0 });
    console.log(JSON.stringify({ case: item.name, status: accepted ? "PASS" : "FAILED_ACCEPTANCE",
      metadata: result.metadata, error: result.ok ? null : result.error, commercialWrites: 0 }));
  }
  if (args.includes("--report")) {
    const report = luisSuite ? "demo-assets/luis/LIVE_RESULTS.json" : "AX02_LIVE_RESULTS_2026-10-29.json";
    await writeFile(new URL(`../../docs/meta/${report}`, import.meta.url),
      JSON.stringify({ check: "meta-media", evaluatedAt: new Date().toISOString(),
        syntheticInputs: true, actualMetaInference: true, realAudioOrShipment: false, results }, null, 2) + "\n");
  }
  if (results.some(result => result.status !== "PASS")) process.exitCode = 1;
}
main().catch(() => {
  console.log(JSON.stringify({ check: "meta-media", status: "FAILED", privateDetailsOmitted: true }));
  process.exitCode = 1;
});
