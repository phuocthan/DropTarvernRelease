# slot-001 presentation and runtime asset increment

Read the unchanged [client asset requirements](../../../../docs/ASSETS.md). This game folder contains presentation-only geometry/symbol config, native Spine `spin/land/idle/win` mapping, sampled vertical bounds, reference runtime exports and an interactive compatibility probe. Shared services live under `apps/player-web/than`; no server, prices, paytable evaluator, RNG weights or wallet logic is copied here.

`ASSET_INVENTORY.json` is the explicit 71-file allowlist: eight skeletons, HD/SD atlases and pages, web/bitmap fonts, combined OGG/MP3/JSON audio, loading/static art and HUD SVGs. Each file records SHA-256/size/source/category/rights evidence and original-project availability. The seed's root `ASSET_INVENTORY.json` remains unchanged and describes only its supplied placeholders.

Source: the existing reference asset collection previously supplied for this project; CDN origin is recorded per file. Runtime exports are available; editable Spine/graphics/audio authoring originals and a commercial redistribution permission document were not supplied. **Compatibility evidence is not rights clearance.** Production has no reference-asset allowlist entry until appropriate review/permission is recorded. Do not claim missing authoring projects as newly promised deliverables.

The first recorded 5×5 flow uses original symbol Spine art. The probe loads and samples all eight skeletons, allows clip playback and audio-sprite cue playback, and tests OGG decoding plus a non-silent cue. This is not a completed whole-scene Tavern implementation or full audiovisual acceptance. The required later scenes still include both bonuses, five chests, controls/help, Big/Super/Mega/Epic/Max Win and final brand/API integration.

See [M1 evidence](../../../../docs/than/M1_EVIDENCE.md) for actual browser/viewport/version and open device/reference review. A resized headless desktop browser is not a physical mobile-device approval.
