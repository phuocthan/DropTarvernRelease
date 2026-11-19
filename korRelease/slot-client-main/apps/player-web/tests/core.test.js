import test from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { createMockAdapter, MOCK_STORAGE_KEY, MAX_ROUNDS } from '../src/adapters/mock-adapter.js';
import { acceptSnapshot, validateSnapshot } from '../src/contract.js';
import { BETS, PAYLINES, RULE_VERSION, SYMBOLS } from '../../../games/slot-001/spec/rules.js';
import { makeRoundEvents, SCENARIOS } from '../../../fixtures/rounds/slot-001-frontend/scenarios.js';

function memoryStorage() {
  const entries = new Map([['mini.unrelated', 'preserve']]);
  return { entries, getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value), removeItem: key => entries.delete(key) };
}
function setup(storage = memoryStorage(), delayMs = 0) { return { storage, adapter: createMockAdapter({ storage, delayMs }) }; }
const request = (scenario = 'bonus', requestId = 'request-1', betMinor = 1000) => ({ requestId, betMinor, scenario });
async function round(scenario = 'bonus') { const { adapter } = setup(); return { adapter, pending: await adapter.spin(request(scenario)), confirmed: await adapter.recover('request-1') }; }

test('15 coordinates match independently transcribed public demo; synthetic model stays separate', () => {
  assert.equal(RULE_VERSION, 'tavern-observed-v1');
  assert.deepEqual(PAYLINES[0], [0, 0, 0, 0, 0]);
  assert.deepEqual(PAYLINES[13], [0, 1, 2, 3, 4]);
  assert.equal(PAYLINES.length, 15);
  assert.equal(new Set(PAYLINES.map(JSON.stringify)).size, 15);
  assert.equal(Object.keys(SYMBOLS).length, 11);
});

test('all scenarios/bets produce bounded 25-cell compatible snapshots', async () => {
  for (const { id } of SCENARIOS) for (const betMinor of BETS) {
    const { adapter } = setup();
    const result = await adapter.spin(request(id, 'scenario-check', betMinor)).catch(error => error);
    if (id === 'response-loss') assert.equal(result.code, 'UNKNOWN');
    else if (id === 'invalid-result') assert.throws(() => validateSnapshot(result), { code: 'INVALID_RESULT' });
    else assert.equal(validateSnapshot(result).events.length, result.eventSeq);
    assert.equal(validateSnapshot(await adapter.recover('scenario-check')).payoutState, 'CONFIRMED');
  }
});

test('independent fixture expectations: loss/single/multi/wild/bonus/chests/drop/cap', () => {
  const expected = { loss: 0, single: 1000, multi: 2100, wild: 4000, bonus: 3000, retrigger: 3000, chests: 3600, drop: 15000, max: 10000000 };
  for (const [scenario, total] of Object.entries(expected)) assert.equal(makeRoundEvents(scenario, 1000).totalWinMinor, total);
  const multi = makeRoundEvents('multi', 1000).events[0];
  assert.deepEqual(multi.wins.map(hit => [hit.lineId, hit.amountMinor]), [[2, 100], [3, 2000]]);
  const bonus = makeRoundEvents('bonus', 1000);
  assert.equal(bonus.events.filter(event => event.kind === 'FREE_SPIN').length, 10);
  assert.deepEqual(bonus.events.slice(1, 3).map(event => event.stepWinMinor), [1000, 2000]);
});

test('every visible payline is independently counted: no undeclared or extra wins', () => {
  // Independent transcription, deliberately not derived from PAYLINES or the fixture builder.
  const observed = ['11111', '22222', '33333', '44444', '55555', '12121', '23232', '34343', '45454', '21212', '32323', '43434', '54545', '12345', '54321'];
  const hundredths = { ten: [10, 30, 100], jack: [10, 30, 100], queen: [10, 30, 100], king: [10, 30, 100], ace: [10, 30, 100], mug: [100, 200, 400], potion: [200, 400, 800], meat: [300, 500, 1000], meal: [500, 1000, 2000] };
  assert.deepEqual(PAYLINES, observed.map(line => [...line].map(row => Number(row) - 1)));
  for (const { id } of SCENARIOS) for (const bet of BETS) for (const event of makeRoundEvents(id, bet).events) {
    if (event.kind === 'CHEST_REVEAL') continue;
    const independentlyCounted = [];
    observed.forEach((line, index) => {
      const symbols = [...line].map((row, column) => event.grid[Number(row) - 1][column]);
      const target = symbols.find(symbol => symbol !== 'wild');
      if (!hundredths[target]) return;
      let count = 0;
      for (const symbol of symbols) { if (symbol === target || symbol === 'wild') count += 1; else break; }
      if (count >= 3) independentlyCounted.push({ lineId: index + 1, count, amountMinor: bet * hundredths[target][count - 3] / 100 });
    });
    assert.deepEqual([...event.wins].sort((a, b) => a.lineId - b.lineId), independentlyCounted, `${id}, bet ${bet}, event ${event.seq}`);
  }
});

test('same eventSeq pending-to-confirmed: 10000 - 1000 + 3000 = 12000, no UI settlement', async () => {
  const { adapter, pending, confirmed } = await round();
  assert.equal(pending.balanceMinor, 9000);
  assert.equal(pending.roundTotalWinMinor, null);
  assert.equal(confirmed.balanceMinor, 12000);
  assert.equal(confirmed.roundTotalWinMinor, 3000);
  assert.equal(confirmed.eventSeq, pending.eventSeq);
  assert.equal(acceptSnapshot(pending, confirmed).balanceMinor, 12000);
  assert.equal(acceptSnapshot(confirmed, pending).balanceMinor, 12000);
  assert.equal((await adapter.session()).balanceMinor, 12000);
  await adapter.completePresentation(confirmed.roundId);
  assert.equal((await adapter.session()).balanceMinor, 12000);
  assert.equal((await adapter.session()).history.length, 1);
});

test('zero win remains confirmed zero rather than null', async () => {
  const { confirmed } = await round('loss');
  assert.equal(confirmed.roundTotalWinMinor, 0);
  assert.equal(confirmed.balanceMinor, 9000);
});

test('retrigger adds five spins, masks accumulate, two chest factors multiply once', () => {
  const re = makeRoundEvents('retrigger', 1000).events;
  assert.equal(re.filter(event => event.kind === 'FREE_SPIN').length, 15);
  const trigger = re.find(event => event.retriggered === 5);
  assert.equal(trigger.bonus.remaining, 12);
  assert.equal(trigger.bonus.total, 15);
  const chestEvents = makeRoundEvents('chests', 1000).events;
  const before = chestEvents.at(-2), after = chestEvents.at(-1);
  assert.equal(before.roundWinMinor, 600);
  assert.deepEqual(before.bonus.chests.map(chest => chest.unlocked), [true, true, false, false, false]);
  assert.ok(before.bonus.chests.every(chest => chest.multiplier === null));
  assert.deepEqual(after.bonus.chests.map(chest => chest.multiplier), [2, 3, null, null, null]);
  assert.equal(after.roundWinMinor, 3600);
  assert.equal(after.stepWinMinor, 3000);
});

test('duplicate request yields original receipt; altered meaning and concurrent new ID reject', async () => {
  const { adapter } = setup(memoryStorage(), 5);
  const firstPromise = adapter.spin(request('bonus', 'same-id'));
  await assert.rejects(adapter.spin(request('loss', 'other-id')), { code: 'ROUND_ACTIVE' });
  const first = await firstPromise;
  const duplicate = await adapter.spin(request('bonus', 'same-id'));
  assert.equal(duplicate.roundId, first.roundId);
  assert.deepEqual(duplicate.events, first.events);
  await assert.rejects(adapter.spin(request('loss', 'same-id')), { code: 'REQUEST_CONFLICT' });
  await assert.rejects(adapter.spin(request('bonus', 'same-id', 500)), { code: 'REQUEST_CONFLICT' });
  assert.equal((await adapter.session()).history.length, 1);
});

test('accepted response loss persists exactly one round across adapter reconstruction', async () => {
  const { adapter, storage } = setup();
  await assert.rejects(adapter.spin(request('response-loss')), { code: 'UNKNOWN' });
  const reloaded = createMockAdapter({ storage, delayMs: 0 });
  const session = await reloaded.session();
  assert.equal(session.activeRound.requestId, 'request-1');
  assert.equal(session.balanceMinor, 12000);
  const recovered = await reloaded.recover('request-1');
  const duplicate = await reloaded.spin(request('response-loss'));
  assert.equal(recovered.roundId, duplicate.roundId);
  assert.equal((await reloaded.session()).history.length, 1);
  await assert.rejects(reloaded.spin(request('loss', 'next')), { code: 'ROUND_ACTIVE' });
});

test('malformed response cannot corrupt the persisted authoritative fixture', async () => {
  const { adapter } = setup();
  const bad = await adapter.spin(request('invalid-result'));
  assert.throws(() => validateSnapshot(bad), { code: 'INVALID_RESULT' });
  assert.equal(validateSnapshot(await adapter.recover('request-1')).balanceMinor, 12000);
});

test('untrusted snapshots reject invalid versions, amounts, symbols, masks, sequence, totals', async () => {
  const { confirmed } = await round();
  const mutations = [
    value => { value.contractVersion = 'live'; }, value => { value.requestId = undefined; },
    value => { value.betMinor = -1; }, value => { value.balanceMinor = Number.MAX_SAFE_INTEGER + 1; },
    value => { value.events[1].grid[0][0] = '<img onerror=alert(1)>'; },
    value => { value.events[1].grid[0].pop(); }, value => { value.events[1].seq = 1; },
    value => { value.events[1].bonus.chests[0].mask[4] = true; },
    value => { value.events[1].wins.push(value.events[1].wins[0]); },
    value => { value.roundTotalWinMinor += 1; }, value => { value.events = Array(40).fill(value.events[0]); },
  ];
  for (const mutate of mutations) { const value = structuredClone(confirmed); mutate(value); assert.throws(() => validateSnapshot(value), { code: 'INVALID_RESULT' }); }
  assert.throws(() => validateSnapshot(null), { code: 'INVALID_RESULT' });
  assert.throws(() => validateSnapshot(undefined), { code: 'INVALID_RESULT' });
});

test('same revision mutation / new round identity / confirmed rollback fail closed', async () => {
  const { pending, confirmed } = await round();
  const changed = structuredClone(pending); changed.balanceMinor -= 1;
  assert.throws(() => acceptSnapshot(pending, changed), { code: 'INVALID_RESULT' });
  const wrongRound = structuredClone(confirmed); wrongRound.roundId = 'other';
  assert.throws(() => acceptSnapshot(pending, wrongRound), { code: 'INVALID_RESULT' });
  const latePending = structuredClone(pending); latePending.revision = 3;
  assert.throws(() => acceptSnapshot(confirmed, latePending), { code: 'INVALID_RESULT' });
  assert.deepEqual(acceptSnapshot(confirmed, confirmed), confirmed);
});

test('invalid request / insufficient balance reject without another receipt', async () => {
  const { adapter } = setup();
  for (const amount of [-1, 0, 0.5, 1, 1001, Number.MAX_SAFE_INTEGER]) await assert.rejects(adapter.spin(request('loss', 'bad', amount)), { code: 'INVALID_REQUEST' });
  for (let index = 0; index < 10; index += 1) {
    const result = await adapter.spin(request('loss', `loss-${index}`));
    await adapter.completePresentation(result.roundId);
  }
  await assert.rejects(adapter.spin(request('loss', 'empty')), { code: 'INSUFFICIENT_BALANCE' });
  assert.equal((await adapter.session()).balanceMinor, 0);
  assert.equal((await adapter.session()).roundsUsed, 10);
});

test('storage corruption and write failure stop admission; explicit reset preserves other apps', async () => {
  const { adapter, storage } = setup();
  storage.setItem(MOCK_STORAGE_KEY, '{bad');
  await assert.rejects(adapter.session(), { code: 'STORAGE_CORRUPT' });
  await assert.rejects(adapter.spin(request()), { code: 'STORAGE_CORRUPT' });
  await adapter.reset();
  assert.equal(storage.getItem('mini.unrelated'), 'preserve');
  storage.setItem = () => { throw new Error('quota'); };
  await assert.rejects(adapter.spin(request()), { code: 'STORAGE_UNAVAILABLE' });
  assert.equal((await adapter.session()).balanceMinor, 10000);
  const unavailable = createMockAdapter({ storage: { getItem() { throw new Error(); } }, delayMs: 0 });
  await assert.rejects(unavailable.session(), { code: 'STORAGE_UNAVAILABLE' });
});

test('storage receipts reject tampered balance and returned data does not mutate storage', async () => {
  const { adapter, storage } = setup();
  const pending = await adapter.spin(request());
  pending.events[0].grid[0][0] = 'tampered';
  const recovered = await adapter.recover(); recovered.balanceMinor = 1;
  assert.equal((await adapter.session()).balanceMinor, 12000);
  const stored = JSON.parse(storage.getItem(MOCK_STORAGE_KEY)); stored.balanceMinor += 1;
  storage.setItem(MOCK_STORAGE_KEY, JSON.stringify(stored));
  await assert.rejects(adapter.session(), { code: 'STORAGE_CORRUPT' });
});

test('bounded journal does not forget old request IDs; 100 local rounds remain bounded', async () => {
  const { adapter, storage } = setup();
  const started = performance.now();
  for (let index = 0; index < MAX_ROUNDS; index += 1) {
    const snapshot = await adapter.spin(request('bonus', `bounded-${index}`));
    await adapter.completePresentation(snapshot.roundId);
  }
  await assert.rejects(adapter.spin(request('bonus', 'overflow')), { code: 'SESSION_FULL' });
  const duplicate = await adapter.spin(request('bonus', 'bounded-0'));
  assert.equal(duplicate.roundId, 'mock-round-1-bounded-0');
  assert.equal((await adapter.session()).roundsUsed, 64);
  assert.ok(storage.getItem(MOCK_STORAGE_KEY).length < 3_000_000);
  await adapter.reset();
  for (let index = 64; index < 100; index += 1) {
    const snapshot = await adapter.spin(request('bonus', `bounded-${index}`));
    await adapter.completePresentation(snapshot.roundId);
  }
  assert.equal((await adapter.session()).roundsUsed, 36);
  assert.ok(performance.now() - started < 10_000, 'bounded in-memory workload finishes within a generous 10s guard');
});
