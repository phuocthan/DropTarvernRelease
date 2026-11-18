# M1 review snapshot — 18 November 2026

This update replaces the earlier M1 preview with the current shared core and resumable synthetic v1 backend. The original `milestone-1` tag is retained; `milestone-1-v1.1` identifies this review candidate.

Included: reusable TypeScript/PixiJS services, JSON schema and two placeholder configurations, durable local synthetic backend, 22 sanitized current API examples, 47 unit tests, two production browser smoke scenarios, desktop/portrait captures, asset specification/evidence limits and build/run instructions.

Verified from this exported checkout: `npm ci`, `npm test` (47 passed), `npm run test:browser` (2 passed, including production build and reload). Windows export now reads JSON as UTF-8 and an exact-code-point regression test protects placeholder glyphs. No page errors or missing HTTP resources were observed in the two smoke scenarios. See the saved test output in this directory.

Excluded: full custom Tavern presentation, original reference assets, asset/animation viewer, development research files, local mock identities and state. M1 UI uses the shared basic skin; full feature presentation belongs to later game delivery. Bonus/chest/resume/payment behavior is demonstrated in API examples and tests. Final branding/asset-pack approval and the production contract with A remain open. Client acceptance is not implied by this snapshot.
