# slot-client — developer start

Official client delivery repository: [slot-client](https://gitlab.com/game-studio9172445/slot-client). This is a clean development seed with no backend, private math, wallet or previous repository history.

The agreed delivery is a reusable **TypeScript + PixiJS** client and complete source, with a full 5×5 first game. Propose exact versions, build tools and internal structure within that stack. The vanilla JavaScript reference here is a temporary playback/geometry example, not the final framework, final API or visual-quality target. Than owns the final client and permitted art/Spine/audio acquisition, compatibility and integration. Our internal backend/math team owns server rules, results and money; reference reviewers supply the reference/play/device inputs.

## First run

After the coordinator grants access, clone this repository using the URL above. From its root, use Node.js 22+; the seed has no external dependencies and requires no install:

```sh
node apps/player-web/tools/server.mjs
```

- Open `http://127.0.0.1:4318/` for the 5×5 browser-only mock. Spin, skip and reload/recover a synthetic round. No network wallet is called.
- Open `http://127.0.0.1:4318/3x3/` for a recorded 3×3 loss using the **same** round controller. Replay/skip/reload preserve that single record; there is no new bet or simulated server receipt.
- Ctrl+C stops the server. Both pages are development references. Their temporary SVG/DOM appearance is not the Tavern Drop quality bar.

The separately proposed public API examples require Python 3.12+ only:

```sh
python3 -B contracts/player-draft-v2/preview.py --profile synthetic-contract --port 49331
```

Open `http://127.0.0.1:49331/catalog.json` for 22 read-only synthetic scripts. This is a discussion preview, not a spin/session endpoint. These v2 scripts are not automatically consumed by the legacy v1 mock; the client adapter mapping still needs agreement. Stop it with Ctrl+C.

```sh
node --test apps/player-web/tests/*.test.js
node apps/player-web/tools/check.mjs
node apps/player-web/tools/build.mjs --profile=mock
node apps/player-web/tools/server.mjs --dist
```

The last command uses the same port, so stop the first mock server before starting it. The build is mock-only. A live build is deliberately refused. Do not publish these fixtures/test selectors as a production game.

Read [development and synchronization](docs/DEVELOPMENT.md), [full-game scope](docs/GAME_SCOPE.md), [API proposal](contracts/player-draft-v2/API.md), [M1 checklist](docs/M1_ACCEPTANCE.md) and [assets and dependencies](docs/ASSETS.md). `SNAPSHOT_MANIFEST.json` records every initial file's SHA-256/size except itself. It describes the seed only; future commits and build/API manifests identify later deliveries.
