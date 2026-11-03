# AX-02 — photo, label and transcript interpretation

29 October 2026 (America/Lima). Owner: Axel, assisted by Codex. Repo `Chujutak2024/meta-hackathon`, branch `codex/meta-axel`, target `main`. This increment follows the AX-00/01 tree at `74bfe46`, integrated by PR #4 / `a5c2a4d` without a content delta. Publication to Axel's branch is authorized; the exact delivery commit is recorded in this file's Git history. No merge or deploy of AX-02 is asserted.

## Implemented seam

`cargomesh/src/server/ai/meta/interpret-media-declaration.ts` exports `interpretMetaMediaDeclaration(input, scope, options)` for the authenticated media/declaration service to consume. It reuses AX-00 JSON Schema/Zod, provenance/revision validation and the SDK from AX-01. The text-only `interpretMetaDeclaration` continues to reject evidence: its old contract is unchanged.

1. The caller authorizes actor/organization and evidence, loads the current draft revision and resolves image bytes from its private storage. Browser evidence IDs alone are not authorization.
2. Pass the existing `DeclarationInput` (evidence IDs/kinds and resolved OCR/transcript text when available), trusted `ProposalScope`, and internal `images: [{evidenceId, mimeType, bytes}]`.
3. The adapter checks the evidence allowlist and revision before invoking the provider. Visual evidence must match exactly one image; duplicate, extra or missing images fail. An audio reference requires a nonblank resolved transcript and takes no image.
4. `client.ts` sends a Chat Completions user content array containing the validated declaration plus each evidence ID and its actual base64 image. There is no arbitrary URL fetcher, storage key or credential inside the declaration DTO. Model configuration stays in server-only environment variables.
5. A schema-valid and semantically valid result remains a proposal with `requiresHumanConfirmation=true`. No draft, manifest, request, offer, booking or incident is persisted by this adapter.

The shared boundary now checks the **whole** evidence scope after inference and before a validation retry. Revocation returns `FORBIDDEN_TENANT` without retry, including empty/refusal replies; a changed input revision returns `INPUT_REVISION_MISMATCH`. This intentionally replaces the older revoked-evidence test's generic output error. The caller still needs atomic expected-version checking when applying a later human confirmation.

## Input limits

- Initial supported image formats: PNG and JPEG. MIME must match signatures; PNG IHDR/IEND and baseline/progressive JPEG SOF headers supply dimension checks. Other formats fail `MEDIA_INVALID`.
- Up to 4 images, 5 MiB per image, 12 MiB combined, dimensions 1–8,192 pixels and at most 20 million pixels. Limits apply before making base64 copies or calling the SDK.
- These are bounded **header checks, not full decoding, CRC verification, malware scanning or upload validation**. CR's upload/storage service must perform its own validation and authorization. The model can still reject a damaged image; do not expose this internal adapter as an unauthenticated endpoint.
- AX-00 text limits and total 45-second timeout remain. At most one validation retry; network/429 failures do not cause SDK retry storms or silently switch to AWS/Baseten. Unknown cost/usage remains null.

## Meaning of proposed facts

- A photo can propose visible description, packaging and foreground count, with `NO_SCALE`; a count also requires `VISIBLE_COUNT_ONLY`. It cannot establish weight, dimensions or hidden shipment contents.
- A label can propose legible written claims with quoted excerpts and `UNVERIFIED_LABEL`. Without independent OCR text, attribution to image pixels is model-generated and remains human-reviewable; it is not verified by string matching alone. Unreadable facts stay missing.
- Audio is **resolved transcript text**, not audio sent to Muse Spark. The quote must occur in the transcript. Luis owns actual transcription.
- Prompt instructions prioritize newer explicit user text and forbid instructions embedded in media from authorizing business actions. This is supplemented by field allowlists and no persistence/tools; it is not a proof that every prompt injection or contradictory statement is resolved correctly.
- Output does not overwrite the UI. Existing UI revision guards remain; CR must connect authorized media, proposal review and atomic confirmed edits. Measurements stay per unit, PALLET and BOX stay distinct, and totals remain domain calculations.

## Real acceptance on synthetic inputs

Used `pnpm smoke:meta-media --live --report` with a locally configured private Meta key. All four checks PASS; real provider inference, generated demo images and a synthetic transcript. [Assets/prompts](demo-assets/ax02/README.md), [safe result report with proposals, SHA-256 and request IDs](AX02_LIVE_RESULTS_2026-10-29.json).

| Case | Observed response | Latency | Input / output tokens |
| --- | --- | --- | --- |
| Foreground boxes without scale | 3 BOX; weight/dimensions missing; NO_SCALE and VISIBLE_COUNT_ONLY | 6,720 ms | 3,992 / 891 |
| Readable label | 2 BOX; 15 kg each; 50 × 40 × 30 cm each; UNVERIFIED_LABEL | 5,988 ms | 3,972 / 1,297 |
| Unreadable label | No proposed fields; all cargo fields missing | 3,938 ms | 4,056 / 655 |
| Synthetic transcript plus newer correction | 10 boxes at 15 kg each; correction sourced to user text | 4,275 ms | 2,017 / 942 |

Every call reported `muse-spark-1.3`, one attempt and zero commercial writes. Cost is unknown. UTC timestamp in the report is 30 October, corresponding to the evening of 29 October in Lima. One sample per case is acceptance evidence, not a reliability/latency benchmark. The evaluation reference is never supplied to the model as an answer.

## Verification and open integration

- `pnpm test:meta-ai`: 49 pass, including 12 new media cases. Covers transport, forbidden/stale evidence, image bounds, hallucinated photo weight, labels, transcript provenance/correction, revocation and safe provider errors.
- `pnpm test:v2-conversation`: 106 + 32 pass.
- `pnpm test:v2-chat-workflow`: 104 pass.
- `pnpm typecheck`: pass. `pnpm check:architecture`: pass, 784 modules / 236 client entry points.
- No new production build or visual/authenticated browser acceptance for this increment. Existing workflows remain covered by the above regressions; this is not a complete end-to-end media feature.

Remaining: CR media upload/access service and UI proposal review; real ASR integration from Luis; human tests with own physical photos/audio; CR review. SAM/video, deterministic crossing counts, loading sessions and Passport are separate owner increments. No infrastructure, SQL, AWS deployment or original CargoMesh repo was modified. `.env.local` remains ignored/untracked.

References checked during implementation: [Meta image understanding / Chat Completions](https://dev.meta.ai/docs/image-understanding), [structured output](https://dev.meta.ai/docs/structured-output).
