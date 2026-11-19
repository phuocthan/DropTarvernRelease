# Client repository working rules

- The delivery stack is TypeScript/PixiJS. Keep reusable client code separate from the first game's presentation/assets. The same new core must demonstrate both 3×3 and 5×5; the supplied JavaScript reference is not that delivery.
- Server data owns results, mode costs, awards, balances and authoritative recovery. Never add client RNG/weights, payout authority, wallet calls or a hidden mock fallback to production.
- Keep request/round identity and event order during skip, speed changes, reconnect and replay. Unknown/undisclosed amounts are not zero. Version any API change and agree examples with the backend owner before integration.
- Check branch/local changes before editing. Preserve others' work. Commit reproducible source and lockfiles, push working increments and open a Draft MR against the coordinator's integration branch. No force push, main merge, production deployment or credential sharing is implied.
- Keep fixtures, test selectors and the development-only mock out of production build entries. Static assets use an explicit allowlist. Do not expand a recursive collector to all repository files.
- Record official source/version/license/notices for dependencies and actual rights/version/export evidence for assets. Distinguish available editable originals from runtime exports; unavailable original authoring projects are not newly promised.
- Never commit credentials, real accounts, private math, real transactions, personal contact information, installed dependencies or generated builds. Keep `.env.example` placeholder-only and commit the actual dependency lockfile when introduced.
- Client source is maintained here once. Internal backend integration consumes reviewed client build artifacts and approved versioned API examples; it does not create a second manually maintained client copy.
