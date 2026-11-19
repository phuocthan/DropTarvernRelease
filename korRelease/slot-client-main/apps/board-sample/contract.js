import { createSnapshotAcceptor } from '../player-web/src/snapshot-revisions.js';
import { isWalletBalance } from '../player-web/src/wallet-balance.js';

// Narrow consumer for the hand-authored recorded loss. Not a game engine.
const requireResult = value => {
  if (!value) throw Object.assign(new Error('3×3 샘플의 저장 결과와 규격이 다릅니다.'), { code: 'INVALID_RESULT' });
};
const integer = (n, min = 0) => Number.isSafeInteger(n) && n >= min && n <= 1_000_000_000_000;
const id = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,96}$/.test(value);
export function validateSnapshot(raw) {
  requireResult(raw && JSON.stringify(raw).length <= 128000);
  requireResult(raw.contractVersion === 'mock-replay-3x3-v1');
  requireResult(raw.gameId === 'synthetic-3x3' && raw.ruleVersion === 'synthetic-3x3-v1');
  requireResult(raw.currency === 'KRW' && raw.currencyExponent === 0 && [100, 1000].includes(raw.betMinor));
  requireResult(id(raw.roundId) && id(raw.requestId) && integer(raw.revision, 1) && raw.revision <= 1000000);
  requireResult(raw.resultState === 'FINAL' && ['PENDING', 'CONFIRMED'].includes(raw.payoutState));
  requireResult(isWalletBalance(raw.balanceMinor) && raw.roundTotalWinMinor === 0 && raw.eventSeq === 1);
  requireResult(Array.isArray(raw.events) && raw.events.length === 1);
  const event = raw.events[0];
  requireResult(event?.seq === 1 && event.kind === 'BASE' && event.bonus === null);
  requireResult(Array.isArray(event.grid) && event.grid.length === 3 && event.grid.every(row => Array.isArray(row) && row.length === 3 && row.every(s => ['A', 'B', 'C'].includes(s))));
  requireResult(new Set(event.grid[0]).size > 1); // The only line must be a loss.
  requireResult(Array.isArray(event.wins) && event.wins.length === 0 && event.stepWinMinor === 0 && event.roundWinMinor === 0);
  return structuredClone(raw);
}
export const acceptSnapshot = createSnapshotAcceptor(validateSnapshot);
