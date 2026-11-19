// Public demo INFO observation; not an approved RNG distribution or backend ID map.
export const GAME_ID = 'slot-001';
export const RULE_VERSION = 'tavern-observed-v1';
export const RULE_STATUS = 'PUBLIC_RULE_OBSERVATION';
export const RULE_OBSERVATION = Object.freeze({ date: '2026-11-06', demoVersion: '13', rulesVersion: '1.0.0', source: 'https://paperclipgaming.com/es/games/tavern-drop', lineIds: 'display-order; backend IDs unconfirmed' });
export const INITIAL_BALANCE = 10000;
export const BETS = Object.freeze([100, 200, 500, 1000]);
export const SYMBOLS = Object.freeze(Object.fromEntries([
  ['ten', '10'], ['jack', 'J'], ['queen', 'Q'], ['king', 'K'], ['ace', 'A'],
  ['mug', '맥주잔'], ['potion', '포션'], ['meat', '고기'], ['meal', '만찬'],
  ['wild', '와일드'], ['bonus', '보너스'],
].map(([id, label]) => [id, Object.freeze({ id, label })])));
export const PAYLINES = Object.freeze([
  [0, 0, 0, 0, 0], [1, 1, 1, 1, 1], [2, 2, 2, 2, 2],
  [3, 3, 3, 3, 3], [4, 4, 4, 4, 4], [0, 1, 0, 1, 0],
  [1, 2, 1, 2, 1], [2, 3, 2, 3, 2], [3, 4, 3, 4, 3],
  [1, 0, 1, 0, 1], [2, 1, 2, 1, 2], [3, 2, 3, 2, 3],
  [4, 3, 4, 3, 4], [0, 1, 2, 3, 4], [4, 3, 2, 1, 0],
].map(Object.freeze));
export const CHEST_MULTIPLIERS = Object.freeze([2, 3, 4, 5, 10, 25, 50, 100]);

// Read from the manufacturer's public demo INFO by the parent on 2026-11-06.
// Values are hundredths of total bet. Observation does not approve RNG/math.
export const OBSERVED_PAYTABLE = Object.freeze({
  scale: 100,
  payouts: Object.freeze(Object.fromEntries([
    ['ten', [10, 30, 100]], ['jack', [10, 30, 100]], ['queen', [10, 30, 100]],
    ['king', [10, 30, 100]], ['ace', [10, 30, 100]], ['mug', [100, 200, 400]],
    ['potion', [200, 400, 800]], ['meat', [300, 500, 1000]], ['meal', [500, 1000, 2000]],
    ['wild', [null, null, 2000]],
  ].map(([id, values]) => [id, Object.freeze({ 3: values[0], 4: values[1], 5: values[2] })]))),
});
