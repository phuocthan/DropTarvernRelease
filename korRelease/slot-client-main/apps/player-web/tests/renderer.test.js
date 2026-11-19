import test from 'node:test';
import assert from 'node:assert/strict';
import { createRenderer, INITIAL_GRID } from '../../../games/slot-001/client/renderer.js';

// Focused DOM/Web Animations doubles exercise ownership and cancellation.
// These tests do not substitute for browser layout, frame-time, or memory checks.
class FakeElement {
  constructor(document) {
    this.ownerDocument = document;
    this.children = [];
    this.attributes = {};
    this.dataset = {};
    this.hidden = false;
    this.className = '';
    const mutate = (callback) => {
      const classes = new Set(this.className.split(/\s+/).filter(Boolean));
      callback(classes);
      this.className = [...classes].join(' ');
    };
    this.classList = {
      add: (...values) => mutate(classes => values.forEach(value => classes.add(value))),
      remove: (...values) => mutate(classes => values.forEach(value => classes.delete(value))),
      toggle: (value, enabled) => mutate(classes => enabled ? classes.add(value) : classes.delete(value)),
      contains: value => this.className.split(/\s+/).includes(value),
    };
  }

  setAttribute(name, value) { this.attributes[name] = String(value); }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
  get firstElementChild() { return this.children[0]; }

  animate(_frames, options) {
    let resolve;
    let reject;
    const finished = new Promise((yes, no) => { resolve = yes; reject = no; });
    const animation = {
      options, finished, playbackRate: 1, cancellations: 0,
      updatePlaybackRate(value) { this.playbackRate = value; },
      cancel() { this.cancellations += 1; reject(new Error('Animation cancelled')); },
    };
    this.ownerDocument.animations.push(animation);
    if (this.ownerDocument.autoFinish) queueMicrotask(resolve);
    return animation;
  }
}

class TrackedSignal {
  aborted = false;
  listeners = new Set();
  addEventListener(type, listener) { assert.equal(type, 'abort'); this.listeners.add(listener); }
  removeEventListener(type, listener) { assert.equal(type, 'abort'); this.listeners.delete(listener); }
  abort() {
    this.aborted = true;
    for (const listener of [...this.listeners]) listener();
  }
}

function setup({ autoFinish = true, reducedMotion = false } = {}) {
  const document = {
    autoFinish, animations: [],
    createElement() { return new FakeElement(this); },
    createElementNS() { return new FakeElement(this); },
  };
  const board = new FakeElement(document);
  const chests = new FakeElement(document);
  const lineLayer = new FakeElement(document);
  return { document, board, chests, lineLayer, renderer: createRenderer({ board, chests, lineLayer, reducedMotion }) };
}

function baseEvent() {
  return { seq: 1, kind: 'BASE', grid: INITIAL_GRID.map(row => [...row]), wins: [], bonus: null, stepWinMinor: 0, roundWinMinor: 0 };
}

function bonusEvent() {
  const event = baseEvent();
  event.kind = 'FREE_SPIN';
  event.wins = [{ lineId: 1, count: 3, amountMinor: 100 }];
  event.bonus = {
    remaining: 1, total: 10,
    chests: Array.from({ length: 5 }, (_, index) => ({
      mask: Array(5).fill(index === 0), unlocked: index === 0, multiplier: index === 0 ? 2 : null,
    })),
  };
  return event;
}

test('renderer reuses exactly 25 row-major cells and shows only bonus chests', () => {
  const { renderer, board, chests, lineLayer } = setup();
  const originalCells = [...board.children];
  assert.equal(originalCells.length, 25);
  assert.equal(chests.hidden, true);
  assert.equal(chests.children.length, 5);
  assert.deepEqual(originalCells.map(cell => [Number(cell.dataset.row), Number(cell.dataset.col)]),
    Array.from({ length: 25 }, (_, index) => [Math.floor(index / 5), index % 5]));

  renderer.render(bonusEvent());
  assert.deepEqual(board.children, originalCells);
  // Observed line 1 is the top row; a 3-symbol win must not mark columns 4/5.
  assert.deepEqual(board.children.flatMap((cell, index) => cell.classList.contains('is-winning') ? [index] : []), [0, 1, 2]);
  assert.equal(chests.hidden, false);
  assert.equal(chests.children[0].children[1].children.filter(dot => dot.classList.contains('is-filled')).length, 5);
  assert.equal(chests.children[0].children[2].textContent, '×2');
  assert.equal(chests.children[1].children[2].textContent, '0 / 5');

  renderer.showLine(15);
  assert.equal(lineLayer.children[0].attributes['data-line-id'], '15');
  assert.throws(() => renderer.showLine(16), RangeError);
  renderer.reset();
  assert.deepEqual(board.children, originalCells);
  assert.equal(lineLayer.children.length, 0);
  assert.equal(chests.hidden, true);
  assert.equal(board.children[0].dataset.symbol, INITIAL_GRID[0][0]);
});

test('100 completed replays retain 25 cells and no active animation or abort listener', { timeout: 2000 }, async () => {
  const { renderer, board } = setup();
  const originalCells = [...board.children];
  for (let index = 0; index < 100; index += 1) {
    const signal = new TrackedSignal();
    await renderer.play(index % 2 ? bonusEvent() : baseEvent(), { speed: 4, signal });
    assert.deepEqual(renderer.stats(), { activeAnimations: 0, cellCount: 25 });
    assert.deepEqual(board.children, originalCells);
    assert.equal(signal.listeners.size, 0);
  }
});

test('skip and abort settle blocked play promises and remove their listeners', { timeout: 1000 }, async () => {
  const { renderer, document } = setup({ autoFinish: false });
  const firstSignal = new TrackedSignal();
  const first = renderer.play(bonusEvent(), { signal: firstSignal });
  assert.equal(renderer.stats().activeAnimations, 25);
  assert.equal(firstSignal.listeners.size, 1);
  assert.equal(renderer.skip(), true);
  assert.deepEqual(await first, { skipped: true });
  assert.equal(firstSignal.listeners.size, 0);
  assert.equal(renderer.stats().activeAnimations, 0);
  assert.ok(document.animations.every(animation => animation.cancellations === 1));
  assert.equal(renderer.skip(), false);

  const nextSignal = new TrackedSignal();
  const next = renderer.play(baseEvent(), { signal: nextSignal });
  nextSignal.abort();
  assert.deepEqual(await next, { skipped: true });
  assert.equal(nextSignal.listeners.size, 0);
  assert.equal(renderer.stats().activeAnimations, 0);
});

test('reset during playback cancels the run and restores the idle grid without new cells', { timeout: 1000 }, async () => {
  const { renderer, board, chests, lineLayer } = setup({ autoFinish: false });
  const originalCells = [...board.children];
  const playing = renderer.play(bonusEvent());
  renderer.showLine('all');
  assert.ok(lineLayer.children.length > 0);
  renderer.reset();
  assert.deepEqual(await playing, { skipped: true });
  assert.deepEqual(board.children, originalCells);
  assert.deepEqual(board.children.map(cell => cell.dataset.symbol), INITIAL_GRID.flat());
  assert.equal(chests.hidden, true);
  assert.equal(lineLayer.children.length, 0);
  assert.equal(board.classList.contains('is-spinning'), false);
  assert.deepEqual(renderer.stats(), { activeAnimations: 0, cellCount: 25 });
});

test('mid-run speed changes apply one effective rate and carry over to the next play', { timeout: 1000 }, async () => {
  const { renderer, document } = setup({ autoFinish: false });
  const first = renderer.play(baseEvent(), { speed: 2 });
  const animation = document.animations[0];
  const initialEffectiveDuration = animation.options.duration / animation.playbackRate;
  renderer.setSpeed(1);
  assert.equal(animation.options.duration / animation.playbackRate, initialEffectiveDuration * 2);
  renderer.setSpeed(4);
  assert.equal(animation.options.duration / animation.playbackRate, initialEffectiveDuration / 2);
  renderer.skip();
  await first;

  const offset = document.animations.length;
  const second = renderer.play(baseEvent());
  assert.equal(document.animations[offset].options.duration, initialEffectiveDuration / 2);
  renderer.skip();
  await second;
});

test('superseded replay cannot repaint over a newer result', { timeout: 1000 }, async () => {
  const { renderer, board, chests } = setup({ autoFinish: false });
  const first = renderer.play(bonusEvent());
  const latest = baseEvent();
  latest.grid[0][0] = 'potion';
  const second = renderer.play(latest);
  assert.deepEqual(await first, { skipped: true });
  renderer.skip();
  await second;
  await Promise.resolve();
  assert.equal(board.children[0].dataset.symbol, 'potion');
  assert.equal(chests.hidden, true);
  assert.deepEqual(renderer.stats(), { activeAnimations: 0, cellCount: 25 });
});

test('dispose is idempotent and resolves an unfinished replay without retaining DOM or listeners', { timeout: 1000 }, async () => {
  const { renderer, board, chests, lineLayer } = setup({ autoFinish: false });
  const signal = new TrackedSignal();
  const playing = renderer.play(bonusEvent(), { signal });
  renderer.dispose();
  assert.deepEqual(await playing, { skipped: true });
  assert.equal(signal.listeners.size, 0);
  assert.deepEqual(renderer.stats(), { activeAnimations: 0, cellCount: 0 });
  assert.equal(board.children.length + chests.children.length + lineLayer.children.length, 0);
  renderer.dispose();
  renderer.reset();
  renderer.setSpeed(2);
  assert.deepEqual(await renderer.play(baseEvent()), { skipped: true });
  assert.equal(board.children.length, 0);
});

test('reduced motion and an already-aborted request do not allocate animations', { timeout: 1000 }, async () => {
  const reduced = setup({ reducedMotion: true, autoFinish: false });
  await reduced.renderer.play(baseEvent());
  assert.equal(reduced.document.animations.length, 0);
  const aborted = setup({ autoFinish: false });
  const signal = new TrackedSignal();
  signal.abort();
  assert.deepEqual(await aborted.renderer.play(baseEvent(), { signal }), { skipped: true });
  assert.equal(aborted.document.animations.length, 0);
  assert.equal(signal.listeners.size, 0);
});
