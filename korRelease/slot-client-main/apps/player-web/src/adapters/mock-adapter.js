import { BETS, GAME_ID, INITIAL_BALANCE, RULE_VERSION } from '../../../../games/slot-001/spec/rules.js';
import { makeRoundEvents, SCENARIOS } from '../../../../fixtures/rounds/slot-001-frontend/scenarios.js';
import { CONTRACT_VERSION, validateSnapshot } from '../contract.js';

export const MOCK_STORAGE_KEY = 'tavern.mock.v1';
export const MAX_ROUNDS = 64;
const MAX_STORAGE_CHARS = 3_000_000;
const clone = value => structuredClone(value);
const allowedScenarios = new Set(SCENARIOS.map(({ id }) => id));
const idPattern = /^[A-Za-z0-9._:-]{1,128}$/;
const failure = (code, message) => Object.assign(new Error(message), { code });
const freshState = () => ({ version: 1, balanceMinor: INITIAL_BALANCE, activeRoundId: null, records: [] });

/** Browser-local synthetic authority. No requests, real accounts, or real money. */
export function createMockAdapter({ storage, delayMs = 250 } = {}) {
  const delay = Math.min(5000, Math.max(0, Number.isFinite(delayMs) ? delayMs : 250));
  const pause = () => delay ? new Promise(resolve => setTimeout(resolve, delay)) : Promise.resolve();

  function persist(state) {
    const encoded = JSON.stringify(state);
    if (encoded.length > MAX_STORAGE_CHARS) throw failure('STORAGE_FULL', '목 기록 보관 한도에 도달했습니다. 목 세션을 초기화해 주세요.');
    try { storage.setItem(MOCK_STORAGE_KEY, encoded); }
    catch { throw failure('STORAGE_UNAVAILABLE', '목 기록을 저장할 수 없습니다. 신규 스핀을 중지했습니다.'); }
  }

  function load() {
    let encoded;
    try { encoded = storage.getItem(MOCK_STORAGE_KEY); }
    catch { throw failure('STORAGE_UNAVAILABLE', '이 탭의 목 저장소에 접근할 수 없습니다.'); }
    if (encoded === null) { const state = freshState(); persist(state); return state; }
    try {
      if (typeof encoded !== 'string' || encoded.length > MAX_STORAGE_CHARS) throw new Error();
      const state = JSON.parse(encoded);
      if (!state || state.version !== 1 || !Array.isArray(state.records) || state.records.length > MAX_ROUNDS) throw new Error();
      let balance = INITIAL_BALANCE;
      const requestIds = new Set();
      const roundIds = new Set();
      for (const record of state.records) {
        const snapshot = validateSnapshot(record.snapshot);
        if (snapshot.payoutState !== 'CONFIRMED' || requestIds.has(snapshot.requestId) || roundIds.has(snapshot.roundId) || !allowedScenarios.has(record.scenario)) throw new Error();
        if (record.fingerprint !== `${snapshot.betMinor}:${record.scenario}` || record.balanceAfterBetMinor !== balance - snapshot.betMinor || record.balanceAfterBetMinor < 0) throw new Error();
        balance = record.balanceAfterBetMinor + snapshot.roundTotalWinMinor;
        if (snapshot.balanceMinor !== balance) throw new Error();
        requestIds.add(snapshot.requestId); roundIds.add(snapshot.roundId);
      }
      if (state.balanceMinor !== balance || (state.activeRoundId !== null && state.activeRoundId !== state.records.at(-1)?.snapshot.roundId)) throw new Error();
      return state;
    } catch { throw failure('STORAGE_CORRUPT', '목 기록이 손상됐거나 다른 버전입니다. 목 세션을 초기화해야 합니다.'); }
  }

  function sessionFrom(state) {
    return {
      balanceMinor: state.balanceMinor, currency: 'KRW',
      activeRound: clone(state.records.find(record => record.snapshot.roundId === state.activeRoundId)?.snapshot ?? null),
      history: state.records.slice(-12).map(({ snapshot }) => ({ roundId: snapshot.roundId, betMinor: snapshot.betMinor, winMinor: snapshot.roundTotalWinMinor })),
      roundsUsed: state.records.length, roundsLimit: MAX_ROUNDS,
    };
  }

  return {
    async session() { return sessionFrom(load()); },
    async spin({ requestId, betMinor, scenario = 'mix' } = {}) {
      if (typeof requestId !== 'string' || !idPattern.test(requestId) || !BETS.includes(betMinor) || !allowedScenarios.has(scenario)) throw failure('INVALID_REQUEST', '지원하는 베팅 금액과 목 예시를 선택해 주세요.');
      const state = load();
      const fingerprint = `${betMinor}:${scenario}`;
      const known = state.records.find(record => record.snapshot.requestId === requestId);
      if (known) {
        if (known.fingerprint !== fingerprint) throw failure('REQUEST_CONFLICT', '같은 요청 번호의 내용이 다릅니다.');
        await pause();
        return clone(known.snapshot);
      }
      if (state.activeRoundId !== null) throw failure('ROUND_ACTIVE', '진행 중인 목 라운드를 먼저 복구하거나 끝내 주세요.');
      if (state.records.length >= MAX_ROUNDS) throw failure('SESSION_FULL', '64판 목 기록 한도입니다. 목 세션을 초기화해 주세요.');
      if (state.balanceMinor < betMinor) throw failure('INSUFFICIENT_BALANCE', '가상 크레딧이 부족합니다. 베팅을 낮추거나 목 세션을 초기화해 주세요.');
      const { events, totalWinMinor } = makeRoundEvents(scenario, betMinor, state.records.length);
      const balanceAfterBetMinor = state.balanceMinor - betMinor;
      const confirmed = validateSnapshot({
        contractVersion: CONTRACT_VERSION, gameId: GAME_ID, ruleVersion: RULE_VERSION,
        requestId, roundId: `mock-round-${state.records.length + 1}-${requestId.slice(0, 64)}`,
        revision: 2, eventSeq: events.length, payoutState: 'CONFIRMED', currency: 'KRW',
        betMinor, balanceMinor: balanceAfterBetMinor + totalWinMinor, roundTotalWinMinor: totalWinMinor, events,
      });
      state.balanceMinor = confirmed.balanceMinor;
      state.activeRoundId = confirmed.roundId;
      state.records.push({ fingerprint, scenario, balanceAfterBetMinor, snapshot: confirmed });
      // One atomic storage replacement contains both synthetic debit and credit.
      // Presentation completion never settles a round; reload can recover now.
      persist(state);
      await pause();
      if (scenario === 'response-loss') throw failure('UNKNOWN', '응답이 유실됐습니다. 같은 목 라운드를 조회해 주세요.');
      const pending = clone(confirmed);
      pending.revision = 1; pending.payoutState = 'PENDING';
      pending.balanceMinor = balanceAfterBetMinor; pending.roundTotalWinMinor = null;
      if (scenario === 'invalid-result') pending.events[0].grid[0][0] = '<script>invalid-result</script>';
      return pending;
    },
    async recover(requestId) {
      const state = load();
      if (requestId !== undefined && (typeof requestId !== 'string' || !idPattern.test(requestId))) throw failure('INVALID_REQUEST', '올바른 요청 번호가 필요합니다.');
      const record = requestId === undefined
        ? state.records.find(item => item.snapshot.roundId === state.activeRoundId)
        : state.records.find(item => item.snapshot.requestId === requestId);
      await pause();
      return clone(record?.snapshot ?? null);
    },
    async completePresentation(roundId) {
      const state = load();
      if (state.activeRoundId === null) return sessionFrom(state);
      if (roundId !== state.activeRoundId) throw failure('ROUND_CONFLICT', '표시 완료 대상 라운드가 일치하지 않습니다.');
      state.activeRoundId = null;
      persist(state);
      return sessionFrom(state);
    },
    async reset() { const state = freshState(); persist(state); return sessionFrom(state); },
  };
}
