import { BETS, PAYLINES } from '../../../games/slot-001/spec/rules.js';

// Deterministic display examples, not a random distribution or production math.
export const SCENARIOS = Object.freeze([
  ['mix', '일반 플레이', '합성 예시를 순서대로 재생합니다. 실제 발생 확률이 아닙니다.'],
  ['loss', '당첨 없음', '0 크레딧 확정과 다음 판 진행을 확인합니다.'],
  ['single', '단일 라인', '맥주잔 3개 일치 · 총 베팅의 1배 예시입니다.'],
  ['multi', '복수 라인', '맥주잔 4개와 10 3개 · 2배 + 0.1배 = 2.1배입니다.'],
  ['wild', '와일드', '와일드 대체로 맥주잔 5개 일치 · 4배 예시입니다.'],
  ['bonus', '무료 스핀 10회', '총 3배 예시 · 10,000−1,000+3,000=12,000입니다.'],
  ['retrigger', '무료 스핀 재진입', '10회 진행 중 3 Bonus로 5회를 추가합니다.'],
  ['chests', '상자 2×3', '상자 시험: 배수 전 0.6배 × 2 × 3 = 3.6배입니다.'],
  ['drop', 'Drop 보너스', '4 Bonus · 해제된 상자 5×5 · 총 15배 합성 예시입니다.'],
  ['max', '최대 당첨 예시', '상자 100×100 · 총 10,000배 합성 경계값입니다.'],
  ['response-loss', '응답 유실', '가상 지급 저장 후 응답만 유실합니다. 같은 판을 조회해 복구합니다.'],
  ['invalid-result', '결과 형식 오류', '잘못된 응답을 거절한 뒤 저장된 정상 판을 조회합니다.'],
].map(([id, label, description]) => Object.freeze({ id, label, description })));

const ids = new Set(SCENARIOS.map(({ id }) => id));
const regular = ['mug', 'ten', 'potion', 'meat', 'meal'];
const clone = value => structuredClone(value);
const emptyChests = () => Array.from({ length: 5 }, () => ({ mask: Array(5).fill(false), unlocked: false, multiplier: null }));
export const makeIdleGrid = (shift = 0) => Array.from({ length: 5 }, (_, row) => Array.from({ length: 5 }, (_, column) => regular[(row + 2 * column + shift) % 5]));

function lineGrid(lineId, count, symbol = 'mug', wild = false) {
  const grid = makeIdleGrid();
  // Avoid accidental additional lines through untouched cells around the win.
  for (const row of grid) for (let column = 0; column < 5; column += 1) if (row[column] === symbol) row[column] = symbol === 'potion' ? 'jack' : 'potion';
  for (let column = 0; column < count; column += 1) grid[PAYLINES[lineId - 1][column]][column] = wild && column === 1 ? 'wild' : symbol;
  // Keep the right edge distinct for a declared three/four-symbol run.
  if (count < 5) grid[PAYLINES[lineId - 1][count]][count] = symbol === 'potion' ? 'ten' : 'potion';
  return grid;
}

function triggerGrid(count) {
  const grid = makeIdleGrid();
  for (let column = 0; column < count; column += 1) grid[(column + 1) % 5][column] = 'bonus';
  return grid;
}

function win(lineId, count, amountMinor) { return { lineId, count, amountMinor }; }
function cover(chests, wins) {
  for (const hit of wins) for (let column = 0; column < hit.count; column += 1) chests[column].mask[PAYLINES[hit.lineId - 1][column]] = true;
  for (const chest of chests) chest.unlocked = chest.mask.every(Boolean);
}

export function makeRoundEvents(requestedScenario, betMinor, sequence = 0) {
  if (!ids.has(requestedScenario) || !BETS.includes(betMinor)) throw new Error('Unsupported mock example');
  const cycle = ['loss', 'single', 'multi', 'loss', 'wild', 'bonus'];
  let scenario = requestedScenario === 'mix' ? cycle[Math.abs(sequence) % cycle.length] : requestedScenario;
  if (scenario === 'response-loss' || scenario === 'invalid-result') scenario = 'bonus';
  const events = [];
  let running = 0;
  const add = (kind, grid, wins = [], bonus = null, extra = {}) => {
    const stepWinMinor = wins.reduce((sum, hit) => sum + hit.amountMinor, 0);
    running += stepWinMinor;
    events.push({ seq: events.length + 1, kind, grid, wins, stepWinMinor, roundWinMinor: running, bonus: clone(bonus), ...extra });
  };
  if (['loss', 'single', 'multi', 'wild'].includes(scenario)) {
    let grid = makeIdleGrid();
    let wins = [];
    if (scenario === 'single') { grid = lineGrid(3, 3); wins = [win(3, 3, betMinor)]; }
    if (scenario === 'wild') { grid = lineGrid(3, 5, 'mug', true); wins = [win(3, 5, betMinor * 4)]; }
    if (scenario === 'multi') {
      grid = [
        ['potion', 'meat', 'meal', 'ten', 'potion'],
        ['ten', 'ten', 'ten', 'meat', 'mug'],
        ['mug', 'mug', 'mug', 'mug', 'potion'],
        ['meat', 'meal', 'potion', 'ten', 'meal'],
        ['meal', 'potion', 'meat', 'meal', 'ten'],
      ];
      wins = [win(2, 3, betMinor / 10), win(3, 4, betMinor * 2)];
    }
    add('BASE', grid, wins);
    return { events, totalWinMinor: running };
  }

  const chestCase = ['chests', 'drop', 'max'].includes(scenario);
  const bonus = { remaining: 10, total: 10, chests: emptyChests() };
  add('BONUS_TRIGGER', triggerGrid(scenario === 'drop' ? 4 : 3), [], bonus, { bonusType: scenario === 'drop' ? 'DROP' : 'TAVERN' });
  let index = 0;
  while (bonus.remaining > 0) {
    bonus.remaining -= 1;
    let grid = makeIdleGrid(index % 5);
    let wins = [];
    let retriggered = 0;
    if (chestCase && index < 6) {
      // These paths cover every row of reels 1/2, only rows 2/3/4 of reel 3.
      const lineId = [14, 15, 10, 8, 9, 12][index];
      const count = scenario === 'max' && index >= 4 ? 4 : 3;
      grid = lineGrid(lineId, count, 'ten');
      wins = [win(lineId, count, count === 4 ? betMinor * 3 / 10 : betMinor / 10)];
    } else if (!chestCase && index === 0) {
      grid = lineGrid(3, 3);
      wins = [win(3, 3, betMinor)];
    } else if (!chestCase && index === 1) {
      grid = lineGrid(3, 4);
      wins = [win(3, 4, betMinor * 2)];
    }
    if (scenario === 'retrigger' && index === 2) {
      grid = triggerGrid(3);
      bonus.remaining += 5;
      bonus.total += 5;
      retriggered = 5;
    }
    cover(bonus.chests, wins);
    add('FREE_SPIN', grid, wins, bonus, { retriggered });
    index += 1;
  }
  if (chestCase) {
    const beforeMultipliers = running;
    const multipliers = scenario === 'drop' ? [5, 5] : scenario === 'max' ? [100, 100] : [2, 3];
    bonus.chests[0].multiplier = multipliers[0];
    bonus.chests[1].multiplier = multipliers[1];
    running = Math.min(betMinor * 10000, running * multipliers[0] * multipliers[1]);
    events.push({ seq: events.length + 1, kind: 'CHEST_REVEAL', grid: clone(events.at(-1).grid), wins: [], stepWinMinor: running - beforeMultipliers, roundWinMinor: running, bonus: clone(bonus), preMultiplierWinMinor: beforeMultipliers });
  }
  return { events, totalWinMinor: running };
}
