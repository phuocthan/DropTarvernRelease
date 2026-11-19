# Synthetic case coverage

22 scripts, all explicitly synthetic. Each has ordered public snapshots, a minimal request example, expected charge/gross return/closing arithmetic and same-ID recovery expectation. They contain no probability distribution or real source-model result. The read-only preview does not exercise wallet idempotency; the backend owner verifies that separately.

| Cases | Purpose | Base100 / charge / final return |
|---|---|---|
| normal-loss/single/multiple | Zero versus null, single/multiple line fields | 100 / 0,100,300 |
| extra-loss/win | Separate base and Chance charge | 300 / 0,300 |
| super-loss/win | Same distinction for Super | 600 / 0,600 |
| natural-tavern/drop | Natural bonus example within original paid round | 100 /100 |
| tavern-buy/drop-buy | Bought entry and no extra free-spin debit | 12500 or30000 /100 |
| tavern-retrigger/drop-retrigger | Increment awarded and remaining without resetting played/round | 12500 or30000 /100 |
| tavern-chests | Subtotal600, ×2×3, uplift3000 | 12500 /3600 |
| drop-chests | Subtotal600, ×5×5, uplift14400 | 30000 /15000 |
| chests-zero-win | Unlocked chest cannot turn zero subtotal into money | 12500 /0 |
| cap-below/exact/overshoot | Cap999999/1000000/clip2000100→1000000 | 30000 /999999 or1000000 |
| cap-during-bonus/base | Immediate terminal cap; bonus cancels4 unplayed spins | 30000 or100 /1000000 |
| long-retrigger | 45 events; no trimming to old32-event pack | 12500 /100 |

Opening balance is100000 fictional minor units. Closing = opening−actual charge+gross return. The cap remains100×10000 even for charge30000. The overshoot example explicitly keeps base award100 outside featureSubtotal200×100×100; that eligible-subtotal choice is **unapproved eligible-subtotal policy**. The cap itself is a confirmed requirement.

Toy initial spins2 and retrigger+1, long example40+1, allowed displayed multipliers and outcome timings are interface assumptions. They do not override the observed ten-spin baseline or approve trigger thresholds. Boards and winning positions are typed placeholders, not a valid15-line evaluator or approved model-generated cases. The supplied 5×5 browser mock has separate legacy line examples; final model-generated cases will replace toy cases after mapping.

The catalog also lists pending/conflict/precision/auth/HOLD meanings. Every script begins with unavailable result/unconfirmed debit, progresses through recorded-result/payout-pending snapshots and ends with confirmed payout. Error transport, two-operator isolation, restart and worker-replacement evidence remain server tests rather than claims about these files.

Before acceptance we still need: approved Wild/tie/line and trigger/retrigger rules, actual cost/precision, cap event order and leftover behavior, chest eligibility/subtotal, large real export samples, Than's event adapter and device proof. API arithmetic success is not visual quality approval. Full Tavern Drop reference scope remains the UI quality baseline.
