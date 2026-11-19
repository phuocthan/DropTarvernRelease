# M1 evidence — initial fw-pixi client increment

Reviewed 19 November 2026. This is an initial source/build/compatibility candidate, **not M1 acceptance**. The original [M1_ACCEPTANCE](../M1_ACCEPTANCE.md) remains unchanged.

| Requirement | Evidence in this increment | Status / remaining review |
| --- | --- | --- |
| TypeScript/PixiJS source/build | `apps/player-web/than`, pinned packages, real npm lock, explicit build commands and upstream notices | Mock and core production builds pass; authenticated adapter not configured |
| Same new core for 5×5 and 3×3 | `PlayerController` + `BoardView`, two JSON layouts and recorded inputs | Browser playback/reload pass on both; not the supplied JS controller reused as the new deliverable |
| Data/financial boundary | No backend/RNG/weights/paytable engine/wallet calls in added core; immutable prefix/revision/identity checks, string formatting, unknown not zero | Proposed mapping requires A approval; local visual cursor does not prove persistent server recovery |
| Asset compatibility | Explicit 71-file runtime inventory/hashes; eight skeletons, 141 clips sampled at start/middle/end; all reported export version 4.2.43, runtime 4.2.120 | Successful sampled rendering is not full visual/timing acceptance of every clip |
| Fonts/audio | Outfit load/render; three bitmap font XML/textures load through resources; 66 sound ranges fit 629s OGG, decoded cue renders non-silent PCM | MP3 fallback file is present; this audit specifically decodes OGG, not all formats/devices |
| Source/rights/originals | Per-file source, hash, rights-evidence and editable-original fields; dependency source/version/license/notice records | Commercial reference rights document and editable originals not supplied; do not mark them approved |
| Device/whole-scene review | Headless desktop Chromium plus resized portrait screenshots | No named physical mobile device/reviewer approval; full whole-scene/bonus/win-tier quality review remains later work |
| Official GitLab delivery | Approved SHA/branch/MR instructions preserved | Access unavailable; no branch/MR or ancestry verification claimed |

## Actual checks

- Original seed: **69 manifest-listed files retain exact bytes**; original 22 v2 case hashes unchanged.
- Original seed tests: **42 passed**. Original static allowlist check: **19 files, zero failures**.
- New fw-pixi unit tests: **6 passed**, including all 22 v2 scripts, exact long money strings, null/pending gates, immutable identity/prefix, local resume and disposal.
- New fw-pixi browser tests: **2 passed**, 5×5/3×3 recorded playback and reload. Images and JSON reports are in `evidence/`.
- `npm run check`, `npm run build:mock`, `npm run build`: passed. Mock copies only explicit asset entries; production verifier rejects fixture/test-hook/reference-asset leakage.
- Runtime: Node v24.20.0; browser `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/157.0.0.0 Safari/537.36`. Browser report viewport 390×844; physical-device flag is false. Desktop captures use Playwright's desktop viewport.

[Runtime audit](evidence/runtime-asset-audit.json) · [Audio audit](evidence/audio-audit.json) · [Desktop 5×5](evidence/5x5-desktop.png) · [Desktop 3×3](evidence/3x3-desktop.png) · [Portrait 5×5](evidence/5x5-portrait.png) · [Portrait 3×3](evidence/3x3-portrait.png).

## Handoff limits

Do not treat a loading screen, fixture arithmetic, sampled asset poses or these passing tests as completion of the full Tavern target. This increment does not deliver complete freegame/chest/menu/whole-scene/win-tier flow, final branding, production money admission/recovery or final math. A reviews the versioned adapter boundary; reference reviewers must test real devices and visuals on the same identified build; the authorized client records acceptance.

## Reproducible build record

Both build reports identify source commit `80b1ad0578d18a88ef9c6bdcdcc94e187b30d495`, a clean worktree at build time, the exact npm lockfile SHA-256, API proposal status and each artifact's SHA-256/size. [Mock report](evidence/mock-BUILD_MANIFEST.json) contains 94 allowlisted output files; [production core report](evidence/production-BUILD_MANIFEST.json) contains 6 output files and no fixture/reference-asset/test-hook data. Build bytes themselves remain generated, not committed.

A second copy containing only tracked seed/client additions was installed with `npm ci` in an isolated directory outside the development/release package dependency trees. Its six tests and both builds passed, demonstrating no accidental dependency on the parent project's installed packages. The declared delivery directory remains the only maintained copy; the isolated directory is temporary verification output.
