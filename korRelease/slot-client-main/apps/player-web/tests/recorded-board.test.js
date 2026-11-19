import test from 'node:test';
import assert from 'node:assert/strict';
import { RECORDED, createRecordedAdapter } from '../../board-sample/recorded.js';
import * as contract from '../../board-sample/contract.js';
import { createRoundController, REPLAY_STORAGE_KEY } from '../src/round-controller.js';

const memory = () => { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: k => m.delete(k) }; };
test('3x3 is recorded input: reject changed identity and new spin; copies cannot mutate the source', async () => {
  const a = createRecordedAdapter();
  await assert.rejects(a.spin());
  await assert.rejects(a.recover('another-request'));
  await assert.rejects(a.completePresentation('another-round'));
  const copy = await a.recover(); copy.events[0].grid[0][0] = 'C';
  assert.equal((await a.recover()).events[0].grid[0][0], 'A');
  const invalid = structuredClone(RECORDED); invalid.events[0].grid[0].push('A');
  assert.throws(() => contract.validateSnapshot(invalid), { code: 'INVALID_RESULT' });
});
test('shared controller resumes recorded cursor without playing a new event or asking for a spin', async () => {
  const storage = memory(); storage.setItem(REPLAY_STORAGE_KEY, JSON.stringify({ version: 1, roundId: RECORDED.roundId, seq: 1 }));
  let played = 0;
  const controller = createRoundController({ adapter: createRecordedAdapter(), storage, contract, renderer: { render() {}, async play() { played++; } } });
  await controller.init(); assert.equal(controller.getState().eventIndex, 1);
  await controller.recover(); assert.equal(played, 0); assert.equal(controller.getState().phase, 'ready');
  assert.equal(controller.getState().balanceMinor, 9000); assert.equal(controller.getState().lastWinMinor, 0); controller.dispose();
});
test('shared controller skips recorded playback without changing identity or amount', async () => {
  let finish, skipped = 0;
  const controller = createRoundController({ adapter: createRecordedAdapter(), storage: memory(), contract,
    renderer: { play() { return new Promise(resolve => { finish = resolve; }); }, skip() { skipped++; finish?.(); } } });
  await controller.init(); const done = controller.recover();
  while (!finish) await new Promise(resolve => setImmediate(resolve));
  controller.skip(); await done;
  assert.equal(skipped, 1); assert.equal(controller.getState().snapshot.roundId, RECORDED.roundId);
  assert.equal(controller.getState().balanceMinor, 9000); controller.dispose();
});
