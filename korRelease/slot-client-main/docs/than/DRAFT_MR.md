# Draft MR preparation — feat/than-m1-client-core

Official project: https://gitlab.com/game-studio9172445/slot-client
Approved starting commit: `880a75e406d3a28c03dfa39b3ead93d1a4b4a13b`
Source branch: `feat/than-m1-client-core`; target: `main`; **Draft** until client review.

GitLab access was unavailable from this environment. No branch, MR or protected-main update is claimed. The supplied ZIP has no `.git` history; snapshot hash validation proves seed integrity, not ancestry from that Git commit.

Once access is granted, use a separate clone and verify the approved object before copying the scoped additions:

```sh
git clone https://gitlab.com/game-studio9172445/slot-client.git
cd slot-client
git fetch origin main
git cat-file -t 880a75e406d3a28c03dfa39b3ead93d1a4b4a13b
git switch -c feat/than-m1-client-core 880a75e406d3a28c03dfa39b3ead93d1a4b4a13b
git rev-parse HEAD
```

Copy only additions under `apps/player-web/than`, `games/slot-001/client/than`, `contracts/player-draft-v2/than`, `docs/than`, and the byte-preserving `.gitattributes`; retain the client's original files. Use `DELIVERY_MANIFEST.json` to verify additions. Do not copy `.git`, backend/server source, credentials, dependencies, generated builds, unrelated internal history or mock wallets. Verify against the actual GitLab seed before reconciling any differences.

Then install/build/test, commit working increments, push only `feat/than-m1-client-core`, and create a Draft MR targeting main through GitLab. No force push or main merge. The client team reviews/merges. Subsequent client fixes belong in that official repository; backend owners consume reviewed artifacts/versioned examples rather than a manually maintained second client.

## Suggested MR description

Adds the first fw-pixi TypeScript/PixiJS client increment, with one shared controller/board for 5×5 and recorded 3×3, native symbol runtime asset loading and a separate compatibility probe. The explicit development build uses recorded synthetic input; production exports the core but has no configured authenticated adapter or hidden mock fallback. Original seed/examples are retained unchanged.

Review [START_HERE](START_HERE.md), [M1 evidence](M1_EVIDENCE.md), exact dependency/asset manifests, and [proposed mapping](../../contracts/player-draft-v2/than/MAPPING.md). No private backend or wallet implementation is included. Joint API approval, asset-rights evidence, physical-device/reference review, full game presentation and final production integration remain open; this MR is not a milestone acceptance claim.
