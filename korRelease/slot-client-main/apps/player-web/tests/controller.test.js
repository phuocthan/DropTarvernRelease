import test from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import { createMockAdapter } from '../src/adapters/mock-adapter.js';
import { createRoundController, REPLAY_STORAGE_KEY } from '../src/round-controller.js';

function memoryStorage() {
  const entries = new Map([['mini.untouched', 'preserve']]);
  return { entries, getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value), removeItem: key => entries.delete(key) };
}
function immediateRenderer() {
  return { events: [], restored: [], skips: 0, speeds: [], disposed: false,
    async play(event) { this.events.push(event.seq); }, skip() { this.skips += 1; },
    render(event) { this.restored.push(event.seq); },
    setSpeed(value) { this.speeds.push(value); }, dispose() { this.disposed = true; }, reset() { this.events = []; } };
}
function gatedRenderer({ blockSeq = 1 } = {}) {
  const renderer = immediateRenderer();
  renderer.play = function (event, { signal }) {
    this.events.push(event.seq);
    if (event.seq !== blockSeq) return Promise.resolve();
    return new Promise(resolve => {
      const finish = () => { signal.removeEventListener('abort', finish); resolve(); };
      this.release = finish;
      signal.addEventListener('abort', finish, { once: true });
    });
  };
  renderer.skip = function () { this.skips += 1; this.release?.(); };
  renderer.dispose = function () { this.disposed = true; this.release?.(); };
  return renderer;
}
function setup({ storage = memoryStorage(), renderer = immediateRenderer(), delayMs = 0 } = {}) {
  const adapter = createMockAdapter({ storage, delayMs });
  const changes = [];
  const sounds = [];
  const controller = createRoundController({ adapter, renderer, storage, onChange: state => changes.push(state), onEvent: event => sounds.push(event.seq) });
  return { storage, adapter, renderer, controller, changes, sounds };
}
async function until(predicate) {
  for (let count = 0; count < 20; count += 1) { if (predicate()) return; await setImmediate(); }
  assert.fail('Expected asynchronous state was not reached');
}

test('request → events → confirmed balance → ready is a playable mock round', async () => {
  const { controller, renderer, adapter, changes, sounds, storage } = setup();
  await controller.init();
  assert.equal(controller.getState().balanceMinor, 10000);
  assert.equal(await controller.spin({ betMinor: 1000, scenario: 'bonus' }), true);
  const final = controller.getState();
  assert.equal(final.phase, 'ready');
  assert.equal(final.balanceMinor, 12000);
  assert.equal(final.lastWinMinor, 3000);
  assert.deepEqual(renderer.events, Array.from({ length: 11 }, (_, index) => index + 1));
  assert.deepEqual(sounds, renderer.events);
  assert.equal(changes.find(state => state.phase === 'playing').balanceMinor, 9000);
  assert.equal((await adapter.session()).activeRound, null);
  assert.equal(storage.getItem(REPLAY_STORAGE_KEY), null);
  assert.equal(storage.getItem('mini.untouched'), 'preserve');
});

test('double click / spin during replay admit only one request', async () => {
  const fixture = setup({ renderer: gatedRenderer() });
  await fixture.controller.init();
  const first = fixture.controller.spin({ betMinor: 1000, scenario: 'single' });
  assert.equal(await fixture.controller.spin({ betMinor: 1000, scenario: 'max' }), false);
  await until(() => fixture.renderer.release);
  assert.equal((await fixture.adapter.session()).roundsUsed, 1);
  fixture.renderer.release();
  await first;
  assert.equal(fixture.controller.getState().phase, 'ready');
});

test('lost response locks new spin; recover reads same round and does not debit again', async () => {
  const { controller, adapter } = setup();
  await controller.init();
  assert.equal(await controller.spin({ betMinor: 1000, scenario: 'response-loss' }), false);
  assert.equal(controller.getState().phase, 'recovery');
  const accepted = (await adapter.session()).activeRound;
  assert.equal(await controller.spin({ betMinor: 1000, scenario: 'loss' }), false);
  assert.equal(await controller.recover(), true);
  assert.equal(controller.getState().snapshot.roundId, accepted.roundId);
  assert.equal(controller.getState().balanceMinor, 12000);
  assert.equal((await adapter.session()).roundsUsed, 1);
});

test('invalid response is not replayed; only authoritative recover is played', async () => {
  const { controller, renderer, adapter } = setup();
  await controller.init();
  await controller.spin({ betMinor: 1000, scenario: 'invalid-result' });
  assert.equal(controller.getState().phase, 'recovery');
  assert.equal(renderer.events.length, 0);
  assert.equal(await controller.recover(), true);
  assert.equal(renderer.events.length, 11);
  assert.equal((await adapter.session()).roundsUsed, 1);
});

test('refresh/dispose preserves financial receipt and resumes after saved visual cursor', async () => {
  const storage = memoryStorage();
  const old = setup({ storage, renderer: gatedRenderer({ blockSeq: 3 }) });
  await old.controller.init();
  const interrupted = old.controller.spin({ betMinor: 1000, scenario: 'bonus' });
  await until(() => old.renderer.events.includes(3));
  assert.equal(JSON.parse(storage.getItem(REPLAY_STORAGE_KEY)).seq, 2);
  old.controller.dispose();
  assert.equal(await interrupted, false);
  const fresh = setup({ storage });
  await fresh.controller.init();
  assert.equal(fresh.controller.getState().phase, 'recovery');
  assert.equal(fresh.controller.getState().eventIndex, 2);
  assert.equal(fresh.controller.getState().lastWinMinor, 1000);
  assert.deepEqual(fresh.renderer.restored, [2]);
  await fresh.controller.recover();
  assert.equal(fresh.changes.find(state => state.phase === 'playing').lastWinMinor, 1000);
  assert.deepEqual(fresh.renderer.events, Array.from({ length: 9 }, (_, index) => index + 3));
  assert.equal(fresh.controller.getState().balanceMinor, 12000);
  assert.equal((await fresh.adapter.session()).roundsUsed, 1);
});

test('completed chest-reveal cursor restores displayed payout before acknowledgement', async () => {
  const { controller, adapter, storage, renderer, changes } = setup();
  const pending = await adapter.spin({ requestId: 'chest-refresh', betMinor: 1000, scenario: 'chests' });
  const lastEvent = pending.events.at(-1);
  assert.equal(lastEvent.kind, 'CHEST_REVEAL');
  storage.setItem(REPLAY_STORAGE_KEY, JSON.stringify({ version: 1, roundId: pending.roundId, seq: lastEvent.seq }));
  await controller.init();
  assert.equal(controller.getState().phase, 'recovery');
  assert.equal(controller.getState().lastWinMinor, 3600);
  assert.deepEqual(controller.getState().event.bonus.chests.map(chest => chest.multiplier), [2, 3, null, null, null]);
  assert.deepEqual(renderer.restored, [lastEvent.seq]);
  await controller.recover();
  assert.equal(changes.find(state => state.phase === 'playing').lastWinMinor, 3600);
  assert.deepEqual(renderer.events, []);
  assert.equal(controller.getState().balanceMinor, 12600);
  assert.equal((await adapter.session()).roundsUsed, 1);
});

test('bounded autoplay rejects >10, completes requested count, no unbounded timer', async () => {
  const { controller, adapter } = setup();
  await controller.init();
  assert.equal(await controller.startAuto({ count: 11, betMinor: 100, scenario: 'loss' }), false);
  assert.equal(await controller.startAuto({ count: 10, betMinor: 100, scenario: 'loss' }), true);
  assert.equal(controller.getState().autoRemaining, 0);
  assert.equal(controller.getState().balanceMinor, 9000);
  assert.equal((await adapter.session()).roundsUsed, 10);
});

test('stop autoplay finishes accepted current round, never starts next one', async () => {
  const { controller, renderer, adapter } = setup({ renderer: gatedRenderer() });
  await controller.init();
  const auto = controller.startAuto({ count: 10, betMinor: 1000, scenario: 'single' });
  await until(() => renderer.release);
  controller.stopAuto();
  renderer.release();
  await auto;
  assert.equal((await adapter.session()).roundsUsed, 1);
  assert.equal(controller.getState().phase, 'ready');
  assert.equal(controller.getState().autoRemaining, 0);
});

test('autoplay stops on unknown outcome without retrying a new request', async () => {
  const { controller, adapter } = setup();
  await controller.init();
  await controller.startAuto({ count: 10, betMinor: 1000, scenario: 'response-loss' });
  assert.equal(controller.getState().phase, 'recovery');
  assert.equal(controller.getState().autoRemaining, 0);
  assert.equal((await adapter.session()).roundsUsed, 1);
});

test('skip and speed only affect renderer, not receipt or accumulated payout', async () => {
  const { controller, renderer, adapter } = setup({ renderer: gatedRenderer() });
  await controller.init();
  controller.setSpeed(2);
  assert.equal(controller.setSpeed(0), false);
  const play = controller.spin({ betMinor: 1000, scenario: 'bonus' });
  await until(() => renderer.release);
  controller.skip();
  await play;
  assert.deepEqual(renderer.speeds, [2]);
  assert.equal(controller.getState().balanceMinor, 12000);
  assert.equal((await adapter.session()).roundsUsed, 1);
});

test('failed cursor write blocks new spin; reset touches only mock keys', async () => {
  const { controller, storage, adapter } = setup();
  await controller.init();
  const set = storage.setItem;
  storage.setItem = (key, value) => { if (key === REPLAY_STORAGE_KEY) throw new Error('quota'); set(key, value); };
  await controller.spin({ betMinor: 1000, scenario: 'bonus' });
  assert.equal(controller.getState().phase, 'error');
  assert.equal(await controller.spin({ betMinor: 1000, scenario: 'loss' }), false);
  assert.equal((await adapter.session()).balanceMinor, 12000);
  storage.setItem = set;
  await controller.recover();
  assert.equal((await adapter.session()).roundsUsed, 1);
  await controller.reset();
  assert.equal(controller.getState().balanceMinor, 10000);
  assert.equal(storage.getItem('mini.untouched'), 'preserve');
});

test('corrupted cursor requires explicit reset and cannot pretend the round is complete', async () => {
  const fixture = setup();
  await fixture.adapter.spin({ requestId: 'corrupt-test', betMinor: 1000, scenario: 'bonus' });
  fixture.storage.setItem(REPLAY_STORAGE_KEY, '{bad');
  await fixture.controller.init();
  assert.equal(fixture.controller.getState().phase, 'error');
  assert.equal(await fixture.controller.spin({ betMinor: 1000, scenario: 'loss' }), false);
  await fixture.controller.reset();
  assert.equal(fixture.controller.getState().phase, 'ready');
});

test('dispose during pending response prevents late rendering and retains resumable round', async () => {
  const { controller, renderer, adapter } = setup({ delayMs: 5 });
  await controller.init();
  const spin = controller.spin({ betMinor: 1000, scenario: 'bonus' });
  controller.dispose();
  await spin;
  assert.equal(renderer.events.length, 0);
  assert.equal(renderer.disposed, true);
  assert.equal((await adapter.session()).activeRound.roundTotalWinMinor, 3000);
});

test('renderer failure stops playback but original mock balance is recoverable', async () => {
  const renderer = immediateRenderer();
  renderer.play = async () => { throw new Error('합성 렌더러 장애'); };
  const { controller, adapter } = setup({ renderer });
  await controller.init();
  await controller.spin({ betMinor: 1000, scenario: 'bonus' });
  assert.equal(controller.getState().phase, 'recovery');
  renderer.play = async () => {};
  await controller.recover();
  assert.equal(controller.getState().balanceMinor, 12000);
  assert.equal((await adapter.session()).roundsUsed, 1);
});
