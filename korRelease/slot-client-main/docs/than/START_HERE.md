# Than M1 staging package — start here

Prepared 19 November 2026. Read the unchanged client [README](../../README.md), [AGENTS](../../AGENTS.md) and [DEVELOPMENT](../DEVELOPMENT.md) first. [Client instructions and access status](CLIENT_REQUEST.md) preserve the requested repository/workflow.

This folder is the user's explicitly requested GitHub staging package. The official client source remains `gitlab.com/game-studio9172445/slot-client`. This is a one-time seed plus client additions, not an ongoing mirror of the development/backend repositories.

| Folder | Delivered here |
| --- | --- |
| `apps/player-web/than/` | New fw-pixi TypeScript/PixiJS board/resource/audio core, recorded-prefix controller, exact money formatter, explicit mock and production entry points, tests and real lockfile |
| `games/slot-001/client/than/` | Presentation-only JSON, native Spine symbol mapping, compatibility probe and explicit 71-file runtime asset inventory; no payout table, RNG weights or backend |
| `contracts/player-draft-v2/` | All original 22 synthetic examples retained byte-for-byte; `than/MAPPING.md` lists proposed adapter mapping and conflicts awaiting A |
| `docs/than/` | Instructions, branch/MR workflow, architecture, M1 checklist/evidence and verification |

## Run the new TypeScript/PixiJS client

From the client root (this folder), Node >=22.18:

```sh
cd apps/player-web/than
node tools/verify-delivery.mjs
npm ci
npm test
npm run dev
```

- `http://127.0.0.1:4361/mock.html` — 5×5 Drop, original symbol Spine runtime exports and explicit recorded v2 synthetic input.
- `http://127.0.0.1:4361/mock.html?game=3x3` — one recorded KRW loss on the same new controller/renderer.
- The asset probe below the 5×5 board plays all indexed skeleton clips and sound cues. An asset failure is visible; no fabricated result is substituted.
- Replay repeats the same recorded intent; it does not create a new wager, charge or payment. Reload restores only the local presentation cursor; it is not proof of server-side recovery.

```sh
npm run build:mock
npm run preview:mock
npm run build
```

The mock artifact is in `dist/mock` and opens `/mock.html`. The separate production artifact in `dist/production` exposes `fw-pixi.js` and an integration-not-configured entry. It intentionally has no fixtures, test hook, reference assets or hidden local fallback. A production API/asset approval is not invented. Generated builds and installed dependencies are not committed; each build emits a hashed manifest.

For browser tests, install Chromium with `npx playwright install chromium` or set `CHROMIUM_PATH` to an installed browser on your machine, then `npm run test:browser`. The test harness records browser/viewport and marks physical-device review false.

The original JavaScript seed still runs unchanged with `node apps/player-web/tools/server.mjs` from the client root, on port 4318. It is distinct from the new delivery. The original Python preview remains read-only; it is not an implemented API.

## Review

[Architecture](ARCHITECTURE.md) · [Evidence and outstanding acceptance items](M1_EVIDENCE.md) · [Draft MR](DRAFT_MR.md) · [API mapping](../../contracts/player-draft-v2/than/MAPPING.md) · [Asset inventory/provenance](../../games/slot-001/client/than/IMPLEMENTATION.md).

M1 acceptance is not claimed. GitLab access/MR, joint adapter approval, asset rights evidence and physical-device/reference review remain open. Full two-bonus audiovisual delivery is a later milestone; this initial flow does not replace the whole-scene Tavern quality target.
