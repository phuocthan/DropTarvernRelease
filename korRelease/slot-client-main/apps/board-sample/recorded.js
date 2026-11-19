// One hand-authored, already-recorded loss. Playback only; no spin or wallet API.
export const RECORDED = Object.freeze({
  contractVersion: 'mock-replay-3x3-v1', gameId: 'synthetic-3x3', ruleVersion: 'synthetic-3x3-v1',
  requestId: 'recorded-intent-1', roundId: 'recorded-round-1', revision: 1,
  currency: 'KRW', currencyExponent: 0, betMinor: 1000, balanceMinor: 9000,
  resultState: 'FINAL', payoutState: 'CONFIRMED', roundTotalWinMinor: 0, eventSeq: 1,
  events: [{ seq: 1, kind: 'BASE', grid: [['A', 'B', 'C'], ['B', 'C', 'A'], ['C', 'A', 'B']],
    wins: [], stepWinMinor: 0, roundWinMinor: 0, bonus: null }],
});
export function createRecordedAdapter() {
  return {
    async session() { return { balanceMinor: RECORDED.balanceMinor, activeRound: structuredClone(RECORDED), history: [] }; },
    async recover(requestId) {
      if (requestId !== undefined && requestId !== RECORDED.requestId) throw new Error('Unknown recorded request');
      return structuredClone(RECORDED);
    },
    async spin() { throw new Error('Recorded playback only; no new spin is accepted'); },
    async completePresentation(roundId) {
      if (roundId !== RECORDED.roundId) throw new Error('Unknown recorded round');
      return { history: [] };
    },
  };
}
