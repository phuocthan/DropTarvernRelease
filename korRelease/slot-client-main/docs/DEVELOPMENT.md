# Development and versioned integration

`slot-client` is the official source of client delivery. The coordinator supplies the approved initial commit, access and target branch. Start `feat/than-m1-client-core` from that exact approved commit after comparing `git rev-parse HEAD`. Propose an initial integration target of `main`, subject to the coordinator's branch protection/setup. Keep it a Draft MR until review. There is no old project history to fetch or merge.

Commit and push working increments from the first runnable build. Every delivery identifies the commit, runtime/dependency versions, lockfile, install/build/run commands, entry URLs, artifact hashes and known gaps. The seed needs no dependencies or invented lockfile; the new TypeScript/PixiJS setup must include its real lockfile. Review scripts/dependencies before executing them without production secrets.

| Path | Responsibility |
|---|---|
| `apps/player-web/than/` | Than's reusable TypeScript/PixiJS entry/build/core; propose versions/build tools and internal modules |
| `games/slot-001/client/than/` | First-game presentation, permitted assets and their manifest |
| Existing `apps/player-web/src` and game root renderer/SVG | Legacy browser-only reference and regression fixtures; retain until an explicit replacement review |
| `apps/board-sample/` | Minimal recorded 3×3 reference using the same existing controller. Than still demonstrates 3×3 with his own new reusable core |
| `games/slot-001/spec/` | Public observations used by the old mock; not a probability model or final rule approval |
| `contracts/player-draft-v2/` | Public proposed semantics and synthetic scripts; versioned changes reviewed with the backend owner |

The legacy mock uses `mock-player-v1`; the recorded 3×3 uses `mock-replay-3x3-v1`; public discussion uses `player-draft-v2`. Do not silently treat them as interchangeable. The legacy fixture limits and local numeric amounts are not future API/currency limits. Test data may show the full scripted future for development; actual player responses may contain only the server-released prefix.

## One client source, two change owners

1. The backend owner proposes or approves an API revision and publishes only the public schema/examples/change notes with content hashes. Private exporters, weights, server source, wallet details and credentials remain outside this repository.
2. Pin the accepted API revision and example hash set in the client delivery/MR. Preserve existing accepted versions; propose breaking changes with before/after examples and compatibility tests. `examples/FILES.json` checks this seed's examples, not approval of the proposed API.
3. Than implements the client adapter/rendering here and submits a reproducible build manifest: client commit, accepted API revision, asset hashes and artifact SHA-256. The backend team integrates that reviewed artifact through its deployment process. Backend-specific adapters/configuration remain with their owner.
4. A client defect is fixed here and a new reviewed artifact is produced. Do not manually develop or patch a second client copy in the backend repository. Do not mirror unrelated internal commits into this repository. The initial snapshot is a one-time seed, not a recurring whole-repository sync.

No external API credential or hosting access is included. Local mock operation does not need them. Joint mapping of the existing client sample and API proposal precedes actual authenticated integration; missing API access is not a reason to embed private server code.
