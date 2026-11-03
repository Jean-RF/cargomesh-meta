# AX-02 — synthetic image fixtures

Generated with the built-in image_gen tool on 29 October 2026 for CargoMesh Meta. These are **AI-generated synthetic demo assets, not real shipment evidence**. Prompts and creation method: [GENERATION.json](GENERATION.json). Originals were copied into this workspace; no private photos or personal data were used.

| Asset | Human-reviewed evaluation reference | Limits |
| --- | --- | --- |
| [boxes-no-scale.png](boxes-no-scale.png) | Three separate closed boxes on the foreground floor | Background warehouse stock is outside the test scope. No weight/dimensions can be inferred. Visible count is not a complete shipment census. |
| [readable-label.png](readable-label.png) | BOX; 2 boxes; 15 kg per box; 50 × 40 × 30 cm per box; machine parts | Printed synthetic claims, not independently verified measurements. |
| [unreadable-label.png](unreadable-label.png) | Label text is unreadable | Quantity, weight, dimensions and contents must stay missing; box appearance is not label text. |

The test runner uses neutral local filenames and binary data URLs. Expected numbers are checked **after** inference, never inserted into the provider prompt, filenames sent to the model or response fixtures. The foreground-only scope of the first image is stated in the user input without revealing the count. Generation prompts are not sent to Meta.

Reproduce from `cargomesh/`: `pnpm smoke:meta-media --live`. To save the safe synthetic-only evidence report, add `--report`; that explicitly replaces `docs/meta/AX02_LIVE_RESULTS_2026-10-29.json`. Each case may invoke the provider up to twice for output validation, sharing a 45-second deadline. Calls can incur charges. Do not run this synthetic-only reporter with private images or transcripts.

The fourth case uses a hand-authored synthetic transcript and a newer written correction. It tests transcript interpretation, **not ASR or real audio**. These static images do not test SAM, object tracking, video crossing counts, occlusion or loading-session completeness.
