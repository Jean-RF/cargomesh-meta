# Tetris: reviewed AI data to physical preview

4 November 2026. Axel assisted by Codex, `codex/meta-axel` in `Jean-RF/cargomesh-meta`, based on main `78aad26`. Reuses Axel/Codex's locally prepared 1-Nov packing implementation from the separate Meta working checkout; it was not previously integrated here. Juan's fleet, factory and loading-session modules remain their own contributions.

## Added connection

The existing declaration-media flow calls Meta for photo/label proposals, then requires review before applying fields and confirming a versioned manifest. A photo alone does not establish mass, physical dimensions or an authorized loading plan.

`/tetris/plan` now reads the authorized current confirmed manifest through the existing API. It rejects manifests that no longer match the saved request revision and requires explicit BOX/PALLET mapping when packaging text is ambiguous. The confirmed-manifest review links to this page with its request ID; the fleet workspace also links to the planner.

The operator supplies useful internal vehicle dimensions and payload, reviews the input, and explicitly calculates a temporary 2D/3D preview. The deterministic `FLOOR_BOTTOM_LEFT_V1` algorithm places at most 200 units on one floor layer, checking payload, height, floor bounds and overlaps. Horizontal rotation is opt-in. Counts and reasons for unplaced units remain visible. Editing input invalidates confirmation and marks the preceding result stale.

Meta proposes shipment facts; code calculates placement. This is not an AI-generated geometry claim. No provider or API credential is added for the solver, and the visual fleet catalog is not treated as verified internal vehicle geometry.

## Verified locally

- Loading/packing suites: 59 passing; includes conservation, collision checks, payload/height bounds, unit mapping, stale and foreign-manifest rejection.
- Voice selection/status/turn tests: 11 passing in the accompanying voice change.
- TypeScript and architecture pass (920 modules / 266 client entry points).
- Browser: synthetic sample 12 boxes placed, 0 pending, 480 kg; 2D and rendered WebGL 3D checked. This is demo input, not a live shipment.
- Production build recorded separately in the integration result. No remote migration or cloud configuration performed by this implementation.

## Still outside this increment

- No persistent plan submission to the loading-session `Planned` column, no capacity reservation and no automatic commercial mutation. That needs a reviewed versioned plan contract and server validation.
- No stacking, axle/center-of-gravity calculations, restraint certification, unloading-sequence optimization or guaranteed optimum.
- Camera/video observations require the existing DockMind/SAM worker deployment, callback credentials, private storage and database migrations. A calculated placement is never an observed count.
- An authenticated manifest-to-preview run on hosted data and production acoustic acceptance remain separate deployment checks. The planner currently uses Spanish copy.

The route is a conservative planning aid. Unknown weight or dimensions must be supplied and reviewed, never inferred from an unscaled photo.
