# Milestone 2 review

M2 delivers Tavern Drop's 5×5 base-game presentation with the reusable TypeScript/PixiJS client. The same review runtime also serves the 3×3 example.

- `apps/player-web/than/m2-review/` contains the framework, review entry point, lockfile and local synthetic API.
- `games/slot-001/client/than/m2/` contains the Tavern-specific source and runtime asset exports. The app checks their SHA-256 values against `RUNTIME_MANIFEST.json` before staging them for a local run.
- The accepted M1 production build entry, client seed and versioned contract examples remain available at their existing paths.

From the GitLab repository root, use Node.js 22.18 or newer:

```sh
cd apps/player-web/than/m2-review
npm ci
npm test
npm run build
npm start
```

Open `http://127.0.0.1:4000/?game=tavern` for Tavern Drop or `http://127.0.0.1:4000/?game=default` for the shared 3×3 example. Press Continue and spin. The review app uses synthetic KRW data with the versioned v1 adapter. Real-backend integration and final RTP, math and rule approval remain pending. The default Bonus Buy confirmation shows the Bonus not available notice and does not charge the wallet. The runtime asset exports are listed in the checklist. Approval for commercial distribution remains separate.

| Document | Purpose |
| --- | --- |
| [M2 re-review evidence](milestone-2-evidence/re-review/README.md) | Revised build checks, recovery fixtures and recordings |
| [Features and testing](milestone-2-features-and-testing.md) · [PDF](milestone-2-features-and-testing.pdf) | Scope, verification steps and expected results |
| [Asset and sound checklist](milestone-2-asset-checklist.md) · [PDF](milestone-2-asset-checklist.pdf) | Runtime artwork, Spine, fonts and audio inventory |
| [Upgrade and deploy](milestone-2-upgrade-and-deploy.md) | Standalone review distribution and deployment instructions |
| [Verification](BUILD_VERIFICATION.md) | Clean staging and GitLab-layout verification |
| [API mapping](../../../contracts/player-draft-v2/than/MAPPING.md) | Existing public contract review, unchanged for M2 |
