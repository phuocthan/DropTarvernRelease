# Player contract v2 — proposal, not an active endpoint

Contract ID `player-draft-v2`; examples `synthetic-contract`. API names below are proposed paths. They are **not implemented by preview.py**.

## Authority and identity

Authenticated launch/session determines environment, integration route, operator, site, member, game and currency. They are server-side identity, not editable spin fields. A browser receives only public game/currency/configuration and permitted mode/bet quotes. No wallet route, key, operator admin role, RNG seed, weight or private outcome ID belongs in the response.

Proposed request: `requestId`, `modeId`, `baseBetMinor`, and a server-issued `termsVersion` if the final quote contract requires it. Unknown fields, client `chargeMinor`, `totalWinMinor`, `balance`, operator/member/currency overrides and outcome selectors are rejected. The supplied arithmetic files omit `termsVersion` in the minimal request example until quote handling is agreed; that field is not an implemented v1 option.

`requestId` identifies one user intent; `roundId` identifies the server's accepted paid round; wallet BET/SETTLE IDs are separate private durable identities. Deduplicate persistently within the trusted integration/operator/site scope. Same ID + same member/game/currency/mode/base bet/terms returns the original accepted result, including after policy changes. Changed meaning is `REQUEST_ID_CONFLICT`. An old accepted request is not repriced. A new request rechecks current contract, active game, limits and capacity. A session refresh must bind to the same actor before recovering an old round.

## Proposed operations

| Operation | Meaning | Current implementation / required work |
|---|---|---|
| POST `/player/v2/session` | Exchange short-lived, single-use launch proof; cookie session; public game/modes/precision/expiry | External session/identity/quotes require agreed implementation |
| POST `/player/v2/spins` | Accept one paid intent and persist it before external debit; return 202 state snapshot | Backend admission and mode quotes require agreed implementation |
| GET `/player/v2/requests/{requestId}` | Recover acceptance/round after lost initial reply | Public recovery response pending integration |
| GET `/player/v2/rounds/{roundId}` | Read the same stored result/payment and currently released prefix | Public released-prefix recovery pending integration |
| POST `/player/v2/rounds/{roundId}/advance` | Proposed idempotent presentation transition with expected revision | Joint decision required. Never accepts arbitrary reveal index or triggers debit/credit/RNG. Not implemented |

No query parameter should select a fixture, forced win, mode price, wallet, role or unapproved version in a public build. Static synthetic scripts do expose all test stages for development; they are absent from a future production asset allowlist.

## Money

All v2 money fields are canonical unsigned decimal **strings**. `currencyExponent` is a small integer from the server currency contract. Example TST exponent2: `"100"` means1.00. This fictional currency is not a supported operator currency promise. No floating-point division/rounding. UI uses exact integer/string formatting; the wallet owns actual balances.

`baseBetMinor` is the underlying stake; `chargeMinor` is the actual mode cost. `totalWinMinor` is gross return, not net profit. Free spins/retriggers are inside the same paid round and do not create another charge. The whole round cap is base bet×10,000, including base wins, bonus, retriggers and chests; purchase price never changes the cap basis.

Server import/bet validation must prove exact conversion for charge and every displayed monetary amount. A non-integral conversion fails until a rounding rule and distribution impact are explicitly approved. Proposed mode factors1/3/6/125/300 are toy/reference assumptions, not activated prices. Actual currencies, minimum stake/increment, maximum charge/payout/balance and rounding are unresolved product/currency choices.

Each event's `deltaWinMinor` is the admitted increment; `cumulativeWinMinor` equals previous cumulative + delta. `rawWinMinor` is the uncapped line amount; clipping is explicit. Chest reveal adds only the uplift, not subtotal plus the entire multiplied amount. Do not issue wallet calls from events or animation-complete callbacks.

## State, disclosure and replay

`debitState` and `payoutState` are financial facts. `resultState=RECORDED` means a result is frozen after confirmed debit, even when some presentation is withheld. `PENDING` is not zero; `totalWinMinor=null` is undisclosed/unavailable, while `"0"` is a disclosed losing result. A recorded result with payout pending is not a settled balance.

The prototype takes a **trusted server release cursor**, projects an allowlist of events through it, and excludes private weights, package/outcome IDs and future fields. Before confirmed debit, events are empty. Before the final release, total win and final balance are null, including when payout is already confirmed: the balance would reveal future winnings. Current disclosed cumulative win remains available. A payment confirmation is not permission to disclose future chest values.

The server must persist release progress and enforce permitted transitions and actor scope before calling this pure projection. This is pending implementation/agreement; a client-supplied cursor alone is insufficient. Authenticated skip may release an agreed final view without a new result or wallet write. Repeated advance, reload and older revisions must not change paid outcome, award spins twice or roll back a newer view. Client playback position may lag the server release but is never an authority for money.

Board is `grid[row][column]`, top/left zero. Positions are `[row,column]`; chest index is column. Provisional symbols: ten/jack/queen/king/ace/mug/potion/meat/meal/wild/bonus. Lines1–15 are proposed local IDs. The complete observed line map and approved Wild/trigger rules must be mapped separately; these toy boards do not establish that geometry or paytable.

Prototype event kinds: BOARD, BONUS_START, FREE_SPIN, RETRIGGER, CHEST_COLLECT, CHEST_REVEAL, BONUS_END, ROUND_END. Sequence starts1 and is uninterrupted; bonus state contains instance/kind/awarded/played/remaining. A cap ends remaining play with explicit cancelled count. Mask rows are distinct and monotonic; unlocked values stay absent until CHEST_REVEAL. This is a proposed replay vocabulary, not a request to change Than's reusable core blindly.

## Failures and recovery

After timeout or lost reply, query the original request. Retry only that same intent under the agreed idempotency contract. Do not invent a new request, auto-refund, force ACK or treat temporary wallet 'not found' as a final rejection. `HOLD` preserves evidence and stops new spins; it requires investigation. Keep the oldest uncertainty timestamp server-side. Session expiry requires reauthentication before lookup, not a new spin.

| Condition | Response/action |
|---|---|
| Invalid unauthorised input | 400/401/403, do not accept a new round; resolve input/auth |
| Changed same-ID meaning | 409 REQUEST_ID_CONFLICT; stop and investigate |
| Another open round | 409 ROUND_PENDING; recover original |
| Recovery capacity or wallet delay | 429; bounded wait/lookup, no unbounded new requests |
| Storage failure / unknown transport outcome | 503 or no reply; lookup same request because acceptance may have happened |
| Confirmed debit rejection | Explicit terminal rejection; no result/payout; new corrected intent only after proof of terminal rejection |
| Payout pending / HOLD | Same round retained; no client payment retries or replacement round |

External implementation must reject cross-actor lookup without revealing existence; same-origin HTTPS, CSRF protection and expiring/revocable sessions are required. Exact error payload names, retry hints and user-facing text will be agreed with Than. Do not expose private wallet failures/raw responses.

## Mapping from the legacy reference vocabulary

| Current v1 | Proposed v2 | Compatibility action |
|---|---|---|
| requestId / roundId / revision | Same meanings | Preserve identity and monotonic revision |
| betMinor integer | baseBetMinor string + chargeMinor string + modeId | Versioned conversion; never use purchase debit as base bet |
| result.events (full pack) | Public events prefix | Explicit projection; no direct object serialization |
| roundTotalWinMinor | totalWinMinor null until disclosed | Null differs from zero |
| lastConfirmedBalanceMinor | confirmedBalanceMinor after permitted disclosure | Preserve observation semantics, avoid future-result leak |
| local fixed pack ID/startup scenario | No public selector | Test setup only, excluded from public request/build |
| ten-FS/32-event mock guard | Validated full round / agreed paging if needed | Do not truncate or reinterpret as game rules |
