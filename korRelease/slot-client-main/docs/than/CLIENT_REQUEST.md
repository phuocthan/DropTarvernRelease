# Client repository instructions — supplied 19 November 2026

The technical instructions below are retained as supplied by the user. The greeting/contact hyperlink is omitted from this repository; no personal contact information or credentials is included.

> The dedicated client repository is ready. Please use this repository instead of the earlier repository URL:
>
> Approved starting commit on main: `880a75e406d3a28c03dfa39b3ead93d1a4b4a13b`
> Once project access is arranged, create `feat/than-m1-client-core` from that exact commit and open a Draft MR targeting main. Please keep committing/pushing working increments from the first runnable build. Main is protected: no direct pushes or force pushes; our team reviews and merges MRs.
>
> Start with README.md, AGENTS.md and docs/DEVELOPMENT.md:
> https://gitlab.com/game-studio9172445/slot-client/-/blob/880a75e406d3a28c03dfa39b3ead93d1a4b4a13b/README.md
>
> - apps/player-web/than/ — your reusable TypeScript/PixiJS client/core/build setup.
> - games/slot-001/client/than/ — first-game presentation and assets.
> - contracts/player-draft-v2/ — proposed public API semantics and 22 synthetic examples for joint review with A.
> - docs/GAME_SCOPE.md, M1_ACCEPTANCE.md and ASSETS.md — current scope, M1 evidence and asset/runtime inventory requirements.
>
> The seed includes independently checked, local-only 5×5 mock playback and a recorded 3×3 example using the same reference controller. Node.js 22+ is sufficient to run the browser examples; the optional JSON preview uses Python 3.12+. No real backend credentials are needed for this starting point. These temporary references are separate from your agreed reusable TypeScript/PixiJS delivery and the Tavern Drop visual-quality target. The v2 proposal and older mock vocabulary still need a jointly agreed adapter mapping; they are not a live API.
>
> This repository will be the single source for client delivery. A maintains the backend separately and we coordinate through versioned API examples and reviewed client builds. Your GitLab account and existing API/mock sample requests above remain in this thread. Thanks!

## What was read before adapting

`README.md`, `AGENTS.md`, `docs/DEVELOPMENT.md`, `docs/GAME_SCOPE.md`, `docs/M1_ACCEPTANCE.md`, `docs/ASSETS.md`, both existing `than/README.md` files, and `contracts/player-draft-v2/{README,API,CASES}.md` were read. All 69 manifest-listed seed files match their original hashes. The seed has no Git metadata: its ZIP and manifest cannot independently prove the approved GitLab commit ID.

GitLab remote access was attempted without interactive credentials on 19 November and was unavailable. No GitLab branch, MR, main push or force push was made. The user explicitly requested this staged package in their own GitHub release repository at `korRelease/slot-client-main`; this does not replace the official GitLab delivery workflow.
