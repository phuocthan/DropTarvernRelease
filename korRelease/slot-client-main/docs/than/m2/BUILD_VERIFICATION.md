# Milestone 2 clean-build verification

Verified on Windows with Node.js 24.20.0 and Chromium. The review app requires Node.js 22.18 or newer. The exact dependencies are pinned in the review app lockfile.

| Check | Result |
| --- | --- |
| Standalone release checkout | Clean `npm ci`, 63/63 unit tests, TypeScript check, Vite build and local Node review server |
| Client-layout staging checkout | Clean `npm ci`, 63/63 unit tests, manifest verification, TypeScript check, Vite build and local Node review server |
| Tavern 5×5 in Chromium | 1280×720 desktop, 390×844 portrait and 844×390 landscape. Continue, visible foreground table, KRW balance, completed mock spin and M2 Bonus Buy notice. Confirmation left the balance unchanged and sent no buy request. |
| Shared-framework 3×3 | Loaded and completed a synthetic spin in both package layouts |

[Build file hashes](BUILD_ARTIFACT_SHA256.json) identify the actual local mock artifact and lockfile. [Desktop](evidence/tavern-1280x720.png), [portrait](evidence/tavern-390x844.png) and [landscape](evidence/tavern-844x390.png) show the verified builds.

The results cover Chromium viewport emulation. Physical phone testing, approved math and RTP, asset rights for production and a live backend integration remain open.
