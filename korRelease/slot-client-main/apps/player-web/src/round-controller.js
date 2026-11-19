import * as defaultContract from './contract.js';

export const REPLAY_STORAGE_KEY = 'tavern.replay.v1';
const clone = value => structuredClone(value);
const fault = (code, message) => Object.assign(new Error(message), { code });

/** Coordinates one request and visual replay. It never calculates or settles money. */
export function createRoundController({ adapter, renderer, storage, contract = defaultContract, onChange = () => {}, onEvent = () => {} }) {
  const { acceptSnapshot, validateSnapshot } = contract;
  let disposed = false;
  let busy = false;
  let speed = 1;
  let replayAbort = null;
  let pendingRequestId;
  let autoGeneration = 0;
  let autoTask = false;
  let skipRemaining = false;
  const state = {
    phase: 'loading', balanceMinor: 0, lastWinMinor: 0, snapshot: null,
    event: null, eventIndex: 0, message: '목 세션을 준비하고 있습니다.',
    autoRemaining: 0, history: [], speed: 1,
  };
  const getState = () => clone(state);
  function publish(patch = {}) {
    if (disposed) return;
    Object.assign(state, patch);
    onChange(getState());
  }
  function readCursor(snapshot) {
    try {
      const encoded = storage.getItem(REPLAY_STORAGE_KEY);
      if (encoded === null) return 0;
      if (typeof encoded !== 'string' || encoded.length > 512) throw new Error();
      const cursor = JSON.parse(encoded);
      if (!cursor || cursor.version !== 1 || typeof cursor.roundId !== 'string' || !Number.isInteger(cursor.seq) || cursor.seq < 0 || cursor.seq > 32) throw new Error();
      if (cursor.roundId !== snapshot.roundId) return 0;
      if (cursor.seq > snapshot.eventSeq) throw new Error();
      return cursor.seq;
    } catch { throw fault('STORAGE_CORRUPT', '목 재생 기록을 읽을 수 없습니다. 목 세션을 초기화해 주세요.'); }
  }
  function saveCursor(roundId, seq) {
    try { storage.setItem(REPLAY_STORAGE_KEY, JSON.stringify({ version: 1, roundId, seq })); }
    catch { throw fault('STORAGE_UNAVAILABLE', '재생 위치를 저장할 수 없습니다. 신규 스핀을 중지했습니다.'); }
  }
  function clearCursor() {
    try { storage.removeItem(REPLAY_STORAGE_KEY); }
    catch { throw fault('STORAGE_UNAVAILABLE', '목 재생 기록을 정리할 수 없습니다.'); }
  }
  function stopAuto() {
    autoGeneration += 1;
    publish({ autoRemaining: 0 });
  }
  function fail(error) {
    if (disposed) return;
    stopAuto();
    const storageError = ['STORAGE_CORRUPT', 'STORAGE_UNAVAILABLE', 'STORAGE_FULL'].includes(error?.code);
    const definiteRejection = ['INSUFFICIENT_BALANCE', 'INVALID_REQUEST', 'SESSION_FULL', 'REQUEST_CONFLICT'].includes(error?.code);
    publish({
      phase: storageError ? 'error' : definiteRejection ? 'ready' : 'recovery',
      message: error?.message || '화면 재생을 완료하지 못했습니다. 저장된 목 라운드를 조회해 주세요.',
      errorCode: error?.code || 'REPLAY_FAILED',
    });
  }
  async function play(snapshot) {
    const previous = state.snapshot?.roundId === snapshot.roundId ? state.snapshot : null;
    const accepted = acceptSnapshot(previous, snapshot);
    const cursor = readCursor(accepted);
    replayAbort = new AbortController();
    const signal = replayAbort.signal;
    skipRemaining = false;
    publish({ phase: 'playing', snapshot: accepted, balanceMinor: accepted.balanceMinor, eventIndex: cursor,
      lastWinMinor: cursor ? accepted.events[cursor - 1].roundWinMinor : 0,
      event: cursor ? accepted.events[cursor - 1] : null, message: '확정된 목 결과를 재생하고 있습니다.', errorCode: null });
    if (cursor) renderer.render?.(accepted.events[cursor - 1]);
    for (let index = cursor; index < accepted.events.length; index += 1) {
      if (disposed || signal.aborted) return false;
      const event = accepted.events[index];
      publish({ event, eventIndex: index + 1 });
      onEvent(clone(event));
      const playback = renderer.play(event, { signal, speed });
      if (skipRemaining) renderer.skip?.();
      await playback;
      if (disposed || signal.aborted) return false;
      saveCursor(accepted.roundId, event.seq);
      publish({ lastWinMinor: event.roundWinMinor });
    }
    const rawConfirmed = await adapter.recover(accepted.requestId);
    if (disposed || signal.aborted) return false;
    if (!rawConfirmed) throw fault('NOT_FOUND', '저장된 판을 찾지 못했습니다. 신규 스핀 대신 다시 조회해 주세요.');
    const confirmed = acceptSnapshot(accepted, rawConfirmed);
    if (confirmed.payoutState !== 'CONFIRMED') throw fault('UNKNOWN', '목 지급 상태가 아직 미확정입니다. 같은 판을 다시 조회해 주세요.');
    publish({ snapshot: confirmed, balanceMinor: confirmed.balanceMinor, lastWinMinor: confirmed.roundTotalWinMinor });
    const session = await adapter.completePresentation(confirmed.roundId);
    if (disposed || signal.aborted) return false;
    clearCursor();
    pendingRequestId = undefined;
    publish({ phase: 'ready', history: session?.history ?? state.history, message: confirmed.roundTotalWinMinor > 0 ? '목 라운드 완료 · 가상 크레딧 반영' : '목 라운드 완료 · 다음 스핀을 준비하세요.' });
    return true;
  }
  async function runSpin({ betMinor, scenario = 'mix' } = {}, fromAuto = false) {
    if (disposed || busy || state.phase !== 'ready' || (!fromAuto && autoTask)) return false;
    busy = true;
    pendingRequestId = crypto.randomUUID();
    publish({ phase: 'requesting', lastWinMinor: 0, eventIndex: 0, event: null, snapshot: null, message: '목 결과를 요청하고 있습니다.', errorCode: null });
    try {
      const raw = await adapter.spin({ requestId: pendingRequestId, betMinor, scenario });
      if (disposed) return false;
      return await play(validateSnapshot(raw));
    } catch (error) { fail(error); return false; }
    finally { busy = false; replayAbort = null; }
  }

  return {
    getState,
    async init() {
      if (disposed || busy) return false;
      busy = true;
      try {
        const session = await adapter.session();
        if (disposed) return false;
        if (session.pendingRequestId) {
          pendingRequestId = session.pendingRequestId;
          publish({ phase: 'recovery', balanceMinor: session.balanceMinor, history: session.history,
            message: '응답을 확인하지 못한 요청이 있습니다. 같은 판 복구를 눌러 주세요.' });
        } else if (session.activeRound) {
          const snapshot = validateSnapshot(session.activeRound);
          const cursor = readCursor(snapshot);
          pendingRequestId = snapshot.requestId;
          if (cursor) renderer.render?.(snapshot.events[cursor - 1]);
          publish({ phase: 'recovery', balanceMinor: session.balanceMinor, history: session.history, snapshot,
            lastWinMinor: cursor ? snapshot.events[cursor - 1].roundWinMinor : 0,
            eventIndex: cursor, event: cursor ? snapshot.events[cursor - 1] : null,
            message: '저장된 목 라운드가 있습니다. 같은 판 이어보기를 눌러 주세요.' });
        } else {
          clearCursor();
          publish({ phase: 'ready', balanceMinor: session.balanceMinor, history: session.history,
            message: '가상 크레딧으로 목 플레이를 시작하세요.' });
        }
        return true;
      } catch (error) { fail(error); return false; }
      finally { busy = false; }
    },
    spin: options => runSpin(options),
    async recover() {
      if (disposed || busy || !['recovery', 'error'].includes(state.phase)) return false;
      busy = true;
      publish({ phase: 'requesting', message: '같은 목 라운드를 조회하고 있습니다.' });
      try {
        const raw = await adapter.recover(pendingRequestId);
        if (disposed) return false;
        if (!raw) throw fault('NOT_FOUND', '저장된 판을 찾지 못했습니다. 목 세션 상태를 확인해 주세요.');
        return await play(validateSnapshot(raw));
      } catch (error) { fail(error); return false; }
      finally { busy = false; replayAbort = null; }
    },
    async startAuto({ count, betMinor, scenario = 'mix' } = {}) {
      if (disposed || busy || autoTask || state.phase !== 'ready' || !Number.isInteger(count) || count < 1 || count > 10) return false;
      autoTask = true;
      const generation = ++autoGeneration;
      publish({ autoRemaining: count });
      let completed = 0;
      try {
        for (let index = 0; index < count; index += 1) {
          if (disposed || generation !== autoGeneration) break;
          if (!await runSpin({ betMinor, scenario }, true)) break;
          completed += 1;
          if (generation !== autoGeneration) break;
          publish({ autoRemaining: count - completed });
        }
        return completed > 0;
      } finally { autoTask = false; if (!disposed) publish({ autoRemaining: 0 }); }
    },
    stopAuto,
    skip() { if (state.phase === 'playing') { skipRemaining = true; renderer.skip?.(); } },
    setSpeed(value) {
      if (![1, 2, 4].includes(value)) return false;
      speed = value; renderer.setSpeed?.(value); publish({ speed }); return true;
    },
    async reset() {
      if (disposed || busy) return false;
      busy = true;
      stopAuto();
      try {
        const session = await adapter.reset();
        if (disposed) return false;
        clearCursor(); pendingRequestId = undefined;
        renderer.reset?.();
        publish({ phase: 'ready', balanceMinor: session.balanceMinor, lastWinMinor: 0, snapshot: null, event: null,
          eventIndex: 0, history: [], message: '목 세션을 초기화했습니다. 가상 크레딧 10,000부터 시작합니다.', errorCode: null });
        return true;
      } catch (error) { fail(error); return false; }
      finally { busy = false; }
    },
    dispose() {
      if (disposed) return;
      disposed = true; autoGeneration += 1; replayAbort?.abort(); renderer.dispose?.();
    },
  };
}
