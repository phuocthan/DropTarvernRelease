import { BETS, CHEST_MULTIPLIERS, GAME_ID, PAYLINES, RULE_VERSION, SYMBOLS } from '../../../games/slot-001/spec/rules.js';
import { createSnapshotAcceptor } from './snapshot-revisions.js';
import { isWalletBalance } from './wallet-balance.js';

export const CONTRACT_VERSION = 'mock-player-v1';
export const MAX_EVENTS = 32;
const MAX_MINOR = 1_000_000_000_000;
const idPattern = /^[A-Za-z0-9._:-]{1,128}$/;
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
const integer = (value, min = 0, max = MAX_MINOR) => Number.isSafeInteger(value) && value >= min && value <= max;
const identical = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function requireResult(condition) {
  if (!condition) throw Object.assign(new Error('목 결과 형식이 올바르지 않습니다. 저장된 판을 조회해 주세요.'), { code: 'INVALID_RESULT' });
}

/** Validate a bounded, already-public mock replay. Never evaluates payout odds. */
export function validateSnapshot(raw) {
  let size;
  try { size = JSON.stringify(raw).length; } catch { requireResult(false); }
  requireResult(size <= 128_000 && plain(raw));
  const connected = raw.contractVersion === 'rgs-replay-v1';
  requireResult((raw.contractVersion === CONTRACT_VERSION || connected) && raw.gameId === GAME_ID && raw.ruleVersion === RULE_VERSION);
  if (connected) requireResult(raw.sourceContractVersion === 'player-local-v1' && raw.resultState === 'FINAL' && raw.currencyExponent === 0);
  requireResult(typeof raw.requestId === 'string' && typeof raw.roundId === 'string' && idPattern.test(raw.requestId) && idPattern.test(raw.roundId));
  requireResult(integer(raw.revision, 1, 1_000_000) && raw.currency === 'KRW' && BETS.includes(raw.betMinor));
  requireResult(isWalletBalance(raw.balanceMinor) && ['PENDING', 'CONFIRMED'].includes(raw.payoutState));
  requireResult(Array.isArray(raw.events) && raw.events.length >= 1 && raw.events.length <= MAX_EVENTS);
  requireResult(raw.eventSeq === raw.events.length);
  if (raw.payoutState === 'PENDING' && !connected) requireResult(raw.roundTotalWinMinor === null);
  else requireResult(integer(raw.roundTotalWinMinor, 0, raw.betMinor * 10000));

  let running = 0;
  let previousBonus = null;
  const covered = Array.from({ length: 5 }, () => Array(5).fill(false));
  for (let index = 0; index < raw.events.length; index += 1) {
    const event = raw.events[index];
    requireResult(plain(event) && event.seq === index + 1);
    requireResult(['BASE', 'BONUS_TRIGGER', 'FREE_SPIN', 'CHEST_REVEAL'].includes(event.kind));
    requireResult(Array.isArray(event.grid) && event.grid.length === 5 && event.grid.every(row => Array.isArray(row) && row.length === 5 && row.every(symbol => typeof symbol === 'string' && Object.hasOwn(SYMBOLS, symbol))));
    requireResult(Array.isArray(event.wins) && event.wins.length <= 15);
    requireResult(integer(event.stepWinMinor, 0, raw.betMinor * 10000) && integer(event.roundWinMinor, 0, raw.betMinor * 10000));
    const usedLines = new Set();
    for (const hit of event.wins) {
      requireResult(plain(hit) && integer(hit.lineId, 1, 15) && integer(hit.count, 3, 5) && integer(hit.amountMinor, 1, raw.betMinor * 10000));
      requireResult(!usedLines.has(hit.lineId));
      usedLines.add(hit.lineId);
      const symbols = PAYLINES[hit.lineId - 1].slice(0, hit.count).map((row, column) => event.grid[row][column]);
      const target = symbols.find(symbol => symbol !== 'wild') ?? 'wild';
      requireResult(target !== 'bonus' && symbols.every(symbol => symbol === target || symbol === 'wild'));
      if (hit.count < 5) {
        const following = event.grid[PAYLINES[hit.lineId - 1][hit.count]][hit.count];
        requireResult(following !== target && following !== 'wild');
      }
      if (event.kind === 'FREE_SPIN') for (let column = 0; column < hit.count; column += 1) covered[column][PAYLINES[hit.lineId - 1][column]] = true;
    }
    if (event.kind !== 'CHEST_REVEAL') requireResult(event.stepWinMinor === event.wins.reduce((sum, hit) => sum + hit.amountMinor, 0));
    requireResult(event.roundWinMinor === running + event.stepWinMinor);

    if (event.kind === 'BASE') {
      requireResult(index === 0 && raw.events.length === 1 && event.bonus === null);
    } else {
      const bonus = event.bonus;
      requireResult(plain(bonus) && integer(bonus.remaining, 0, 30) && integer(bonus.total, 10, 30) && bonus.remaining <= bonus.total);
      requireResult(Array.isArray(bonus.chests) && bonus.chests.length === 5);
      for (let column = 0; column < 5; column += 1) {
        const chest = bonus.chests[column];
        requireResult(plain(chest) && Array.isArray(chest.mask) && chest.mask.length === 5 && chest.mask.every(value => typeof value === 'boolean'));
        requireResult(identical(chest.mask, covered[column]) && typeof chest.unlocked === 'boolean' && chest.unlocked === chest.mask.every(Boolean));
        requireResult(chest.multiplier === null || (chest.unlocked && CHEST_MULTIPLIERS.includes(chest.multiplier)));
        if (event.kind !== 'CHEST_REVEAL') requireResult(chest.multiplier === null);
      }
      if (event.kind === 'BONUS_TRIGGER') {
        const scatters = event.grid.flat().filter(symbol => symbol === 'bonus').length;
        requireResult(index === 0 && (scatters === 3 || scatters === 4) && bonus.remaining === 10 && bonus.total === 10 && event.wins.length === 0);
        requireResult(event.bonusType === (scatters === 4 ? 'DROP' : 'TAVERN'));
      } else {
        requireResult(previousBonus !== null);
        if (event.kind === 'FREE_SPIN') {
          const added = bonus.total - previousBonus.total;
          requireResult(previousBonus.remaining > 0 && (added === 0 || added === 5) && bonus.remaining === previousBonus.remaining - 1 + added);
          if (added === 5) requireResult(event.grid.flat().filter(symbol => symbol === 'bonus').length === 3);
        } else {
          requireResult(index === raw.events.length - 1 && previousBonus.remaining === 0 && bonus.remaining === 0 && bonus.total === previousBonus.total && event.wins.length === 0);
          let multiplier = 1;
          for (const chest of bonus.chests) {
            requireResult(!chest.unlocked || chest.multiplier !== null);
            if (raw.events[0].bonusType === 'DROP' && chest.unlocked) requireResult(chest.multiplier >= 5);
            if (chest.unlocked) multiplier *= chest.multiplier;
          }
          requireResult(event.preMultiplierWinMinor === running && event.roundWinMinor === Math.min(raw.betMinor * 10000, running * multiplier));
        }
      }
      previousBonus = bonus;
    }
    running = event.roundWinMinor;
  }
  if (previousBonus) requireResult(previousBonus.remaining === 0);
  if (raw.payoutState === 'CONFIRMED' || connected) requireResult(raw.roundTotalWinMinor === running);
  return structuredClone(raw);
}

/** Event deduplication and payout revisions are deliberately independent. */
export const acceptSnapshot = createSnapshotAcceptor(validateSnapshot);
