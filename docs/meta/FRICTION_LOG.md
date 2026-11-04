# Meta friction log

## 2026-11-01 — local worker integration is not a deployed Modal service

After PR #6 was integrated, the active Meta local database lacked the DockMind job/attempt migrations, the machine had no FFmpeg, and there was no worker URL/proxy/callback configuration or own loading footage. A remote Modal worker cannot reach loopback Storage/callback URLs. We backed up and migrated only the authorized Meta local database, prepared checksum-verified portable FFmpeg, and exercised the real Python/Hono/Storage pipeline through the owner's explicit local test dispatcher. SYNTHETIC_RENDER/FIXTURE and INJECTED explanation provenance remain recorded. Sandbox temporary-directory/child-process failures were resolved by using workspace temporaries in authorized local execution; no production HTTPS/auth guard was weakened. Real deployment, network reachability and physical/SAM acceptance remain Ramón's pending deliverable. [Evidence](pruebas/RECORRIDO_DOCKMIND_CONECTADO_2026-11-01.md).

## 2026-10-28 — local UI preview versus a connected workflow

The source checkout initially had no Meta database configuration. Its explicit visual preview opened the form, but the Organization preview attempted authenticated settings reads and the UI could revoke itself; the preview login also interrupted the requested direct entry. The loopback frontend preview now opens directly and its Organization page uses labelled sample data without API reads. This does not grant a backend identity.

For CR-01 acceptance the user subsequently selected a separate local Meta database. The frontend now uses its own ignored configuration and the existing automatic synthetic-account session, with real Hono/SQL authorization. No Amazon environment was copied and no hosted database was changed. A working visual preview alone was not reported as a persistent workflow.

## 2026-10-28 — Supabase CLI agent mode and local service readiness

CLI 2.117.0 could report the database as already running while its automatic agent mode had started PostgreSQL only. Auth and REST were still unavailable for a connected form. The isolated profile was started with explicit `--agent no`, without resetting or removing the other local projects. Native local Auth/REST and automatic workspace-session acceptance then passed. Raw CLI status values remain in ignored local setup only, never in repository evidence.

## 2026-10-27 — inherited authority and repository split

The copied AGENTS, root docs and workflow targeted Amazon main. The user requested a separate repository while the Amazon submission remains under review. Active instructions/docs and CI target meta-main in meta-hackathon; Amazon source/services remain untouched. Previous product docs remain identified as inherited. No cloud project or deployment link was copied.

## 2026-10-27 — SDK JSON Schema conversion

The installed openai 7.30.0 helper rejected Zod trim transformations in model-output schemas because transformations are not representable in strict JSON Schema. Output now uses structural constraints plus explicit semantic nonblank checks. The generated provider schema and server validation share the same structural source. No dependency version change was required.

## Runtime verification boundary

Local host: Node 24.14.1 and pnpm 10.33.0; package requires Node >=22. Inherited CI pins 24.20.0/11.19.0. Dependencies were installed from the unchanged lockfile with lifecycle scripts disabled. This is enough for focused TS tests, not a certification of a production build or all inherited CI jobs.

## 2026-10-27 — AX-01 live acceptance and local build

Axel confirmed no Meta Model API key is available. The SDK adapter is tested with injected HTTP and the smoke command fails closed without config; no fixture is presented as a real model response. Live text acceptance remains pending.

The production build initially hit EPERM creating generated .next directories under local execution restrictions. A repeat with sufficient filesystem access compiled successfully. AX-01 now has a passing local build, but no hosted gate or deployment is claimed.

## 2026-10-27 — rama remota existente al publicar

La publicación encontró codex/meta-axel ya creada sobre la estructura del equipo, cuyo target aceptado es main de este repositorio. Se conservó esa historia y se reaplicaron solo los commits locales inéditos de IA. Los conflictos fueron documentales: prevalecen AGENTS, prompts, backlog y estructura remotos; las referencias antiguas a meta-main describen preparación local, no el flujo activo. No hubo force-push ni cambios en main/Amazon.


## 2026-11-01 — supplied demo PDFs contain embedded attachments

Both supplied formal PDFs contained catalog attachment references (`/AF`, `/Names`, `/EmbeddedFile`). The existing private-document validator intentionally rejects embedded attachments. The originals were preserved. Plain copies were produced by copying only page/resource trees, without the attachment catalog. Full-page rendered pixel comparisons were identical. Both copies then passed real private upload/replay, binding, Carrier download/hash and review in isolated Meta local. The file format conversion does not add legal validity, OCR or automatic extraction.

## 2026-11-01 — integrating declaration media with the document dossier

The local dossier commit and Luis PR10 both registered Hono routes, tests and migration inventory. Integration preserved both modules, all additive migrations and author records. The chat stash conflict was due to mixed line endings plus independent memory/media changes; normalizing a temporary merge preserved both. TypeScript,27media,7document,11manifest and111chat tests passed. The document SQL test assumed an empty organization; it now asserts that its own finalized revision is present without deleting earlier demo documents. All39document pgTAP checks and35Luis transition checks passed with rollback on the existing local data. PR11 passed its three remote gates and was merged as2071886. No cloud migration or Amazon deployment changed.
