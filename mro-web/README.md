# Caravan MRO Visual — local viewer

Nuxt 4 + Vue 3 + TypeScript, Babylon.js for the client-only 3D island.

## Run locally

Node 22 is used for this project. Install the exact dependency graph from the lockfile:

```sh
npm ci
npm run dev -- --port 3100
```

Production preview, bound to loopback:

```sh
npm run build
HOST=127.0.0.1 PORT=3101 npm run preview
```

## Implemented

- Load the existing Caravan GLB and its source object manifest.
- Select meshes by pointer or component list; selection is synchronized with the information panel.
- Search Indonesian draft labels and original object names.
- Focus, isolate, make other objects translucent, reset, and switch camera presets.
- Mouse drag/zoom and Babylon's ArcRotateCamera touch controls; actual touch hardware still needs testing.
- Responsive component panel and information tabs with keyboard navigation.
- Loading/error/retry states and live model diagnostics.
- Engine/scene disposal and resize/visibility handling.
- Create component findings with category, priority, description, and up to three photos.
- Persist records and JPEG photo Blobs in IndexedDB, scoped to `cessna-208-demo` and the asset object ID.
- Change recording status with a required follow-up note; keep a timestamped event history.
- Search/filter all demo-aircraft findings and navigate back to the component.
- Severity-colored outlines and tree badges for components with active findings; teal also identifies selection.
- Protect unsaved drafts and reject stale revisions instead of overwriting concurrent changes.
- Restore source textures on 392 objects, preserving all 434 source identities and original geometry.
- Start a six-step presentation across workspaces with three labelled sample findings and source-model illustrations.
- Restart only the presentation scenario; keep the practice notebook in separate browser storage.
- Switch between persistent light/dark themes, initially following the operating system; the 3D ground follows the theme.
- Use a subtle, uncalibrated ground grid as a visual orientation reference.
- Browse a searchable two-document library with source, revision, applicability and reference status.
- Classify 373 of 434 source objects into 12 groups, with nested instrument/area families; keep 61 objects explicitly awaiting verification.
- Link 365 objects to shared POH references, distinguishing function descriptions (108), system/area context (43), and location/identification references (214).
- Open verified printed/PDF page pairs, including the conditional KI227-family ADF supplement; return to the same source identity and camera.
- Search manual summary text alongside component names. Uncertain door panels and unmapped objects retain an unmatched state.
- Read local PDFs using client-only PDF.js: page navigation, full-page/width fit, zoom, extracted page text, open/download and retry.
- Read filled-surface forms with stronger boundaries, visible labels, required hints and accessible help text.

The page shell renders on the server. `AircraftViewer.client.vue` imports browser-dependent Babylon code; `PdfReader.client.vue` starts the PDF reader and its local worker when the Manual tab is first opened. Ordinary Vue state and props handle the single-page selection flow; Pinia can be introduced when several routes need shared application state.

## Files

- `app/app.vue`: layout, selection state, search, controls, information panel.
- `app/components/AircraftViewer.client.vue`: Babylon lifecycle, import, picking, highlighting, visibility and camera.
- `app/data/components.ts`: draft human-readable mappings; unknown objects retain original names.
- `public/models/component-map.json`: stable object IDs from the phase-1 asset snapshot.
- `public/models/caravan-demo.glb`: textured demo asset (7,038,012 bytes).
- `public/models/model-info.json`: material provenance and actual model size.
- `public/models/caravan-geometry-trial.glb`: retained neutral baseline from phase 1.
- `app/composables/useFindings.ts`: local record state, refresh, and cross-tab notifications.
- `app/utils/findingsRepository.ts`: IndexedDB reads and transactional writes with revision checks.
- `app/utils/findingPhotos.ts`: image validation, JPEG re-encoding, and resize to at most 1600 px.
- `app/components/NewFindingDialog.vue`: draft, photos, required fields, and save/discard behavior.
- `app/components/FindingDetailDialog.vue`: stored details, photos, status changes and history.
- `app/components/FindingsOverview.vue`: all-aircraft list with search and status filtering.
- `app/components/DemoControls.vue`: start/restart confirmation and return to practice.
- `app/data/demoScenario.ts`: three labelled samples; `app/utils/demoGuide.ts` projects the six-step guide from saved work.
- `public/demo/`: illustrations rendered from isolated source objects, not inspection photographs.

Do not infer part numbers, serial numbers, airworthiness, or an AMA aircraft configuration from mesh names. Main wings are one source object, so selecting each wing independently needs asset separation. An object can contain several physical parts; glass and interior lining can also be separate from an outer panel.

The primary model uses restored source texture assignments, including the red livery, wheels and cockpit. This is the source asset's appearance, not a verified AMA unit configuration. Web material roughness is an approximation, with original glass alpha retained. Internal brake geometry and a technical exploded view are not available in the source wheel objects.

## Manuals and themes

The library contains the archived Cessna Model 208 (675 SHP) POH/AFM, D1352-6-13PH Revision 6 (2002), including temporary revisions through 2004, and CAA New Zealand TAR 96/10 Revision 3 (2017). The 1,112-page POH file opens at its title page (file page 79); first-file pages contain temporary revisions. It is explicitly marked **For Training Purposes Only**, and is not a current AMM. The second document is a certification reference, not maintenance instructions. Source links, applicability and revision labels are always available in the library. Controlled AMM, IPC and wiring manuals are linked through Textron 1View, where publisher account/subscription requirements apply.

PDFs are served locally. The dev server supports byte ranges; the production preview serves complete files, so the 63.7 MB POH is fetched as a full file. PDF.js worker, image decoders (including JPX/OpenJPEG), CMaps and standard fonts are served locally as well; `scripts/prepare-pdf-assets.mjs` copies the matching pinned dependency assets on install, before dev, and before build. No external viewer/CDN is used. The original PDF bytes and source hashes are recorded in `../reports/phase-5/manual-manifest.json`. Public availability does not establish redistribution rights; this is a local demo reference collection.

`mro-color-theme` stores the explicit theme preference. Without a saved choice the UI follows system changes; a blocked preference store still allows session-only toggling. It is independent of findings and presentation storage. Changing workspace tabs pauses 3D rendering while preserving camera and selection. PDF page paper stays white in dark mode to preserve original document colors. Extracted text is provided per page; the reader does not implement full-document search or document annotations.

## Component-to-manual mapping

`app/data/componentManuals.ts` holds curated Indonesian paraphrases and citations, keyed by preserved source object names. References describe POH systems and construction; they do not certify a part number or make unavailable internal geometry appear verified. Fifteen known components are covered. Door panels B/H and other unmapped objects have no assigned manual citation.

`ComponentManual.vue` displays the summary, scope and exact printed/PDF page references. A new navigation request selects the correct document, clears a conflicting catalog filter, and opens the cited page. An existing PDF instance handles same-file jumps without re-downloading the book. Repeated citations and failed-load retries retain the requested page. Selecting another library document clears the component context. The reference banner returns to the source component without reframing the camera.

The underlying POH remains unchanged; `../reports/phase-6/source-audit.json` records its checked hash and nine reviewed pages. `../reports/phase-6/reference-catalog.json` is a snapshot of the curated mapping. Regenerate that snapshot after editing the mapping before running `tools/verify_component_manuals.py`. Run the test from repository root against dev port 3100, or set `MRO_VERIFY_URL=http://127.0.0.1:3101` for the final preview. Test profiles are isolated from user storage.

## Operations demo

The current aircraft selector has exactly one enabled/default option, `cessna-208-demo`. The provided transparent logos are copied byte-for-byte into `public/brand/`; theme CSS chooses the appropriate variant and an SVG viewport trims surrounding transparent padding in the header without editing the files. `../reports/phase-7/brand-manifest.json` records source and copy hashes.

Work entries derive directly from `useFindings` and use the existing detail/status-history dialog. There is no second work-order database or duplicated status. Practice/presentation isolation and revision checks remain intact. Active findings add a severity-colored mesh outline plus highlight, including when selected; closed-only components lose that outline. Low is yellow, medium orange, high red, critical deep crimson, and unassessed neutral gray. The highest assessed active level wins per component; any unassessed count remains explicit. Source IDs, geometry and restored textures are unchanged.

`app/data/operations.ts` supplies explicitly synthetic inventory, flight logs and recurring plans. Inventory availability is physical stock minus reservations; all part numbers begin with DEMO. Flight totals sum eight example legs to 2,000 km, 460 minutes and eight cycles. The mileage is not GPS-derived or a claim about an operator's real aircraft history. Recurring status uses the earliest reached calendar/flight-time/cycle threshold at a fixed 2026-10-31 snapshot. Example intervals are not an approved maintenance program. Detail dialogs explain these limits. Inventory now supports local sparepart requests linked to work findings; flight logs and recurring plans remain read-only examples.

`OperationsWorkspace.vue` keeps module filters in memory while switching tabs. Table overflow stays within its own container. Tablet layouts cover portrait and landscape, larger touch targets and 16px fields. A headless viewport check does not certify actual touch hardware or GPU performance.

Data arithmetic checks: `node tools/verify_operations_data.mjs`. Browser integration: `python tools/verify_operations_ui.py`, or set `MRO_VERIFY_URL=http://127.0.0.1:3101` for the preview. Run these from repository root and see `../reports/phase-7/`.

## Severity assessments

The optional finding `severity` field supports `unassessed`, `low`, `medium`, `high`, and `critical`, independently of recording priority and status. Existing records with no severity remain readable as unassessed without an IndexedDB rewrite or version upgrade. No priority-to-severity inference is performed. New forms default to unassessed.

`types/severity.ts` supplies shared labels, colors and active-component aggregation. All lists, filters, counters, legend and Babylon outlines use that shared definition. Closed findings retain historical assessment labels but do not affect active model colors. Mixed assessed/unassessed components display their highest known level and disclose how many remain unassessed.

The finding detail form can save a severity-only assessment, or status and severity together, with a required follow-up note. `changeFindingStatus` retains its existing status-only API and accepts an optional severity after the storage-space argument. The existing transaction/revision guard applies to both fields. Severity-only events use `severity_changed`; combined edits use a status event with before/after severity fields. Photo Blobs, identity and priority are preserved.

Checks: `node tools/verify_severity_rules.mjs` and `python tools/verify_severity_ui.py` (dev port 3100), with `MRO_VERIFY_URL=http://127.0.0.1:3101` for the final build. See `../reports/phase-8/`. These are user-entered demo assessments, not automated damage diagnosis or an approved airworthiness determination.

## Validation

```sh
npm run typecheck
npm run build
```

Browser regression checks are in `../tools/verify_viewer.py`. Start a local dev server and an `agent-browser` session called `mro-caravan`, then run the script from the project root. The script uses live scene diagnostics exposed by Vue in development, so it is a dev-server test suite. It temporarily renames only the public GLB copy to verify HTTP failure/recovery and restores it in `finally`; do not run it against a shared/deployed site.

Screenshots and verification reports are in `../reports/phase-2/`. Chromium in this environment uses SwiftShader; its FPS values are not a benchmark for technician devices.

Findings checks: start a separate automation browser session named `mro-phase3`, open the dev site, then run `python ../tools/verify_findings.py`. The script clears only that automation profile's findings database on startup. Never point this test session at a browser profile containing user records. Phase-3 screenshots and results are in `../reports/phase-3/`.

Demo checks: use the isolated session `mro-demo4` and run `python ../tools/verify_demo.py`. This test clears the two demo databases in that test profile, verifies storage isolation, and injects illustration/reset failures to check preservation of existing data. Phase-4 results are in `../reports/phase-4/`.

Presentation instructions: [DEMO.md](DEMO.md).

## Local data behavior

IndexedDB database `mro-visual-findings-demo`, version 1, contains the `findings` object store. Photos are saved inside a finding as Blobs in the same transaction as the finding metadata. Each status change reads the stored revision, verifies the expected revision, and commits status plus history together. UI success is shown only after the write transaction completes.

The presentation has its own version-1 database, `mro-visual-scenario-v1`. Start/reset replaces only this database's findings in a single transaction. A synchronous insert failure explicitly aborts the transaction, rolling back the clear and earlier queued inserts. Practice notes are never copied into or cleared by this operation. The `mro-presentation-space` preference remembers which space to reopen; reload retains the existing scenario rather than resetting it.

BroadcastChannel and visibility refresh update other tabs on the same origin; stale open forms require the user to use the latest revision. This is local conflict protection, not server authentication or protected auditing.

Incoming JPG/PNG/WebP images are limited to 4 MB each and re-encoded as JPEG at a maximum 1600 px, with a 1 MB output limit. Up to 3 photos per finding. Invalid files and oversized selections are rejected without replacing the draft.

Data is specific to the browser profile and site origin, including port. `localhost`, `127.0.0.1`, and ports 3100/3101 have separate storage. Browser data clearing/eviction removes local records; JSON backup/restore and per-job PDF reports are available; shared server storage is not implemented. No authentication, certification signature, or airworthiness release is implied by closing a demo record.

Malformed records are reported without automatic deletion. A failed read disables creation until storage is readable; failed writes keep the form draft.

## Asset provenance and license status

Author listed in the archive: Emmanuel Baranger (helijah). Selected listing: https://blendswap.com/blend/8327.

The supplied archive includes conflicting notices: BlendSwap's file states CC0 and the author's Read-Me states GPL. Both original texts are preserved in `model-source-licenses/`; no resolution is asserted. The repository preserves both notices without asserting a resolution. Original Blender inputs, local research material and generated verification artifacts are not included in Git.

## Current target: demonstration

The agreed target is a repeatable local demonstration: textured aircraft, visual component navigation, findings/photos/history, guided sample scenario and safe restart. Further iteration should focus on presentation clarity and target-device testing. Shared backend, accounts and permission management belong to a future operational project if explicitly requested.

## Reproducing material recovery

The original Blender 2.65 file stores image assignment on UV faces, which is no longer exposed after modern Blender conversion. `tools/blender/extract_legacy_materials.py` reads these assignments with the official portable Blender 2.79b, with script autoexec disabled. `restore_caravan_materials.py` applies the measured mapping to node materials in Blender 5, preserving the existing source IDs and UV coordinates, and exports the GLB plus JPEG illustrations. `verify_demo_asset.py` checks round-trip geometry, identity and texture presence. Original files remain unchanged.

From repository root: `python tools/verify_theme_manuals.py` checks dev port 3100; `python tools/verify_production_smoke.py` checks production preview port 3101. See `../reports/phase-5/`. Browser profiles are isolated from user data.

## Classification and manual coverage

`app/data/componentClassifications.json` is a closed sidecar list of 417 formerly miscellaneous objects, organized from source names and restored texture materials. The original 17 exterior mappings remain in `components.ts`. `componentClassification.ts` resolves families and readable subobject labels. The GLB, 434 manifest IDs, and source names remain unchanged; no finding migration is performed. Multiple digits, needles or glass surfaces can belong to the same instrument. Copy suffixes are not interpreted as aircraft sides or operational seat positions.

`componentManuals.ts` retains the exterior references and adds stable shared family entries. `coverage` distinguishes actual function descriptions, broader system/area references, and location/identification only. A book icon means a reference is available, not that the exact source device is verified. KX165/KMA20/KT70/KI252a/KRA/KI266/GPS source families receive only general panel-location references. The KI227 family links conditionally to Section 9 Supplement 3 (KR-87 / KI 227-01, S3-3, PDF 571); its variant and receiver pairing remain unconfirmed.

Unsupported source gear controls, `Mixture`, generic instrument glass/digits and ambiguous external details remain in verification groups without invented references. `tank` objects on the engine-instrument texture are treated as graphic gauge details, not physical tanks. Interior trim references cover the cabin area and do not supply technical part identities. No interior light or ventilation geometry is invented when the asset does not identify it.

Verification: `node tools/verify_classification_data.mjs` writes the full object/reference audit and checks stable identity, prior references, reviewed subject pages, unmatched cases, citation identity and unchanged source-PDF hash. `python tools/verify_classification_ui.py` checks the hierarchy, search, real PDF targets, keyboard access, responsive layouts, and an old finding/photo attached to a formerly unmapped instrument. Set `MRO_VERIFY_URL=http://127.0.0.1:3101` for the built preview. See `../reports/phase-9/`.

## Sparepart requests from work

Each finding can carry an optional `materialRequests` array. Legacy records are not rewritten and IndexedDB remains version 1. Requests belong to the same stable job/asset identity and practice or presentation database as the finding; resetting the presentation removes only its own requests and stock deltas.

The flow is **requested → ready → issued**, with cancellation allowed before issue. Requesting leaves stock unchanged and supports backorders for empty stock. Preparing reserves stock; issuing decreases physical stock and releases that request reservation. Cancelling releases a prepared reservation without replenishing physical stock. Issued requests remain in the ledger after work closes. The eight-item synthetic catalog remains immutable; displayed stock derives from its baseline plus stored reservations/issues. No automatic installation approval or part compatibility match is performed.

`changeFindingMaterial` reads all work and writes one revised finding inside a single IndexedDB read/write transaction, so competing jobs cannot reserve the same remaining stock. The finding revision guard prevents stale retries and double issues. Every action requires a note and adds a material event to the existing work history. Work can remain in progress while waiting. Repair submission requires all requests to be issued/cancelled and all issued quantities recorded as used or returned; closure then follows examiner acceptance. Closed work must be reopened before requesting material.

Work rows and finding details open the request form. The Sparepart tab contains a filterable queue with prepare/handover/cancel actions, job links and effective stock figures. These are local demo transactions in the current browser, not transactions in an operator warehouse.

Checks: `node tools/verify_material_rules.mjs` and `python tools/verify_repair_ui.py`; set `MRO_VERIFY_URL=http://127.0.0.1:3101` for the production preview. See `../reports/phase-10/`.

## Repair cards, review and material accounting

Open/in-progress/rework jobs can submit a repair card with technician, start/completion time, recorded actions, document reference and 1–3 before/after JPEG photos per stage. Original finding photos are offered as before evidence without rewriting them. Image upload uses the existing size/type checks and JPEG preparation. Submission is blocked by outstanding material requests or issued quantities that have not been accounted for. The form records what the user enters; it does not generate technical repair instructions from the POH.

Issued material now has an append-only dispositions ledger. Each used/returned quantity records actor, note, timestamp and optional serial/lot. Used quantities do not deduct stock again. Only unaccounted quantities can be returned, which restores physical stock exactly once; already used quantities cannot be returned through this flow. The transaction and finding-revision guard applies to the whole ledger.

Submitting a card changes work to awaiting_review and freezes material edits. A different manually entered examiner name can accept the evidence or request rework. Acceptance requires all three documentation checks and closes the work; rework keeps the reviewed card and permits a new cycle. These are demo names and decisions, not authenticated signatures or aircraft release approvals. Ordinary status editing cannot bypass review or close newly worked records. Old closed records remain readable without fabricated repair evidence; reopening requires a fresh reviewed card to close again.

Repair cards are immutable snapshots including document text, image Blobs and cumulative issued/used/returned material details. Optional repairCards and dispositions fields retain IndexedDB version 1 and legacy compatibility. Each action appends to existing finding history. The propeller presentation sample now includes an explicitly simulated accepted card, using labelled model illustrations. Practice/scenario data remain separate.

Current verification: `node tools/verify_repair_rules.mjs`, `node tools/verify_material_rules.mjs`, and `python tools/verify_repair_ui.py`; use `MRO_VERIFY_URL=http://127.0.0.1:3101` for production preview checks. Reports live in `../reports/phase-11/`. Earlier phase browser scripts describe the preceding workflow; the repair suite supersedes direct-close assumptions.

## Backup and per-job PDF reports

Open **Pekerjaan → Data & backup** to export a complete JSON backup of one storage space (practice or presentation). Each mode is exported separately. The file includes finding history, photo bytes, repair cards/reviews and material requests/dispositions. Images are keyed by SHA-256 so repeated photo attachments retain their IDs/names without repeating the same binary content. Read-only seeded flight logs, schedules, model assets and baseline inventory remain in the application; model and catalog fingerprints prevent restoring transactions against incompatible identities or stock baselines.

Restore checks format/version, identifiers, exact object shapes, bounded data sizes, image checksums/JPEG dimensions and decoding, material conservation and repair/history references. Limits are 64 MiB/file, 40 MiB unique images, 300 unique images, 200 jobs, 40 repair cards/job, 100 requests/job and fewer than 2,000 history events/job. It previews the incoming mode and counts before explicit replacement. It replaces only C208 records in that mode in one IndexedDB transaction; the other mode is untouched. No merge is performed, so repeated restore cannot duplicate inventory movements. A full target snapshot is compared within the write transaction; changes after preview abort the restore. Restored records receive a new revision above all prior/imported revisions and a restore audit event, blocking stale drafts from older tabs. The restored mode becomes active without resetting its contents.

Open a job detail and use **Unduh laporan PDF**. Reports are generated on the client with lazy-loaded pdf-lib/fontkit, local licensed DejaVu fonts and the unchanged user-supplied logo. Pages include aircraft/source/work identity, saved status/severity, observations and photos, complete material requests/usage/returns, every repair/review cycle, document text, before/after evidence and event history. Long text wraps and paginates; no clipping/truncation is used. Reports stop with an explicit error above 200 pages or 40 MiB image input. Characters outside the embedded font are rendered as traceable [U+...] codes with a note rather than silently omitted. Reports reflect saved data, with a timestamp, revision, page numbers and demo status.

No upload or external storage service is used. The JSON is a data backup; photo checksums detect content inconsistency but do not authenticate its author. Import affects existing data only after validation and confirmation. The dialog offers a download of the current target data before replacement. A browser download notification means the download was initiated, not that the application can verify the user's filesystem.

Checks: `node tools/verify_backup_report_data.mjs`, `python tools/verify_report_layout.py`, and `python tools/verify_backup_report_ui.py` (`MRO_VERIFY_URL=http://127.0.0.1:3101` for the built preview). See `../reports/phase-12/`. A simulated sample report is saved under `../output/pdf/`.


## Aircraft summary and guided presentation

Ringkasan is the initial workspace. It derives active findings, assessed high/critical findings, pending reviews, pending material requests, low/empty stock, recent events and seeded maintenance/utilization from existing data. Closed findings are excluded from active severity counts; missing severity remains unassessed regardless of priority. Dynamic counts use the active IndexedDB mode and show an unknown/error state if storage is unavailable. Flight and recurring-maintenance figures remain explicitly dated synthetic snapshot data.

Every metric links to the corresponding workspace with matching filters. Dashboard navigation resets the relevant search/category/status filters, including repeated navigation to the same destination. Work filters now support all active work and combined high/critical severity. Queue filters support pending demand and one guide job; the context restriction can be cleared. Mode changes/reset clear navigation context to prevent a scenario-only filter hiding practice work.

The six-step presentation guide remains outside the tab panels: locate component, read/create finding, request/prepare/issue/account materials, record repair, examiner review, and PDF export. It operates on one explicitly selected work record; a new finding created through the guide becomes its target. It does not simulate transactions, invent repair evidence or change state when the user advances steps. An issued request counts complete only after usage/returns are fully recorded. Rework makes the repair/review steps incomplete again. Legacy closed work without accepted evidence never receives an accepted-review checkmark.

PDF progress is session-only and keyed to the saved revision returned by a successful report download initiation. Reload/reset/restore clears that export progress. A later saved revision needs another report; the UI does not claim to verify an operating-system file save. The guide opens compactly on tablet/phone, can expand into a bounded scrollable area, and keeps 44px controls with a 16px target picker.

Verification: `node tools/verify_dashboard_rules.mjs`; `python tools/verify_dashboard_ui.py`; `MRO_VERIFY_URL=http://127.0.0.1:3101 python tools/verify_dashboard_ui.py`. Evidence lives in `../reports/phase-13/`. Asset failure tests exercise existing model/manual retry screens without changing stored work. Headless viewport checks do not certify physical tablet hardware.
