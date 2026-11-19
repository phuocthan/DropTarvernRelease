import { PAYLINES, SYMBOLS } from '../spec/rules.js';

// Original placeholder art and a non-winning welcome board; not a result draw.
export const INITIAL_GRID = Object.freeze([
  Object.freeze(['ace', 'mug', 'queen', 'potion', 'jack']),
  Object.freeze(['king', 'meat', 'ace', 'mug', 'ten']),
  Object.freeze(['mug', 'queen', 'wild', 'king', 'meal']),
  Object.freeze(['potion', 'jack', 'mug', 'ten', 'ace']),
  Object.freeze(['queen', 'king', 'meal', 'bonus', 'mug']),
]);

const SVG_NS = 'http://www.w3.org/2000/svg';
const ART_PATH = '/games/slot-001/client/symbols.svg';
const LINE_COLORS = ['#f8ce73', '#77e2ce', '#c4a0fb', '#f7a36d', '#94caf4'];

function svgElement(document, name, attributes = {}) {
  const element = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) {
    element.setAttribute(key, String(value));
  }
  return element;
}

function symbolArt(document, id, className) {
  const svg = svgElement(document, 'svg', {
    viewBox: '0 0 100 100', class: className, 'aria-hidden': 'true', focusable: 'false',
  });
  svg.append(svgElement(document, 'use', { href: `${ART_PATH}#${id}` }));
  return svg;
}

/** Presentation only. All input events must pass the player contract first. */
export function createRenderer({ board, chests, lineLayer, reducedMotion = false }) {
  if (!board || !chests || !lineLayer) throw new TypeError('Renderer containers are required');
  const document = board.ownerDocument;
  const cells = [];
  const chestViews = [];
  const animations = new Set();
  let currentEvent = null;
  let activeRun = null;
  let disposed = false;
  let previewLine = null;
  let playbackSpeed = 1;

  const safeSpeed = (speed) => Number.isFinite(speed) ? Math.min(4, Math.max(0.5, speed)) : 1;

  board.classList.add('reel-grid');
  board.setAttribute('role', 'group');
  board.setAttribute('aria-label', '5열 5행 릴');
  lineLayer.setAttribute('viewBox', '0 0 500 500');
  lineLayer.setAttribute('preserveAspectRatio', 'none');
  lineLayer.setAttribute('aria-hidden', 'true');
  lineLayer.setAttribute('focusable', 'false');
  board.replaceChildren();
  chests.replaceChildren();

  for (let row = 0; row < 5; row += 1) {
    for (let col = 0; col < 5; col += 1) {
      const cell = document.createElement('div');
      cell.className = 'symbol-cell';
      cell.dataset.row = String(row);
      cell.dataset.col = String(col);
      cell.setAttribute('role', 'img');
      const art = symbolArt(document, 'mug', 'symbol-art');
      cell.append(art);
      cells.push({ element: cell, use: art.firstElementChild, row, col });
      board.append(cell);
    }
  }

  for (let col = 0; col < 5; col += 1) {
    const element = document.createElement('div');
    element.className = 'chest-item locked';
    element.dataset.col = String(col);
    element.setAttribute('role', 'img');
    const art = symbolArt(document, 'bonus', 'chest-art');
    const progress = document.createElement('div');
    progress.className = 'chest-progress';
    progress.setAttribute('aria-hidden', 'true');
    const dots = Array.from({ length: 5 }, () => {
      const dot = document.createElement('span');
      dot.className = 'chest-dot';
      progress.append(dot);
      return dot;
    });
    const label = document.createElement('span');
    label.className = 'chest-label';
    element.append(art, progress, label);
    chests.append(element);
    chestViews.push({ element, label, dots });
  }

  function drawLines() {
    lineLayer.replaceChildren();
    if (disposed || !currentEvent) return;
    const lines = previewLine === 'all'
      ? PAYLINES.map((_, index) => ({ lineId: index + 1, count: 5 }))
      : previewLine !== null
        ? [{ lineId: previewLine, count: 5 }]
        : currentEvent.wins;
    const isPreview = previewLine !== null;
    for (const win of lines) {
      const route = PAYLINES[win.lineId - 1];
      if (!route) continue;
      const points = route.slice(0, win.count).map((row, col) => [50 + col * 100, 50 + row * 100]);
      const color = LINE_COLORS[(win.lineId - 1) % LINE_COLORS.length];
      const path = svgElement(document, 'polyline', {
        points: points.map((point) => point.join(',')).join(' '),
        fill: 'none', stroke: color, 'stroke-width': isPreview ? 3 : 4,
        'stroke-linecap': 'round', 'stroke-linejoin': 'round',
        'vector-effect': 'non-scaling-stroke',
        class: `payline-path${isPreview ? ' is-preview' : ''}`,
        'data-line-id': win.lineId,
        opacity: previewLine === 'all' ? 0.5 : 0.9,
      });
      lineLayer.append(path);
      for (const [x, y] of points) {
        lineLayer.append(svgElement(document, 'circle', {
          cx: x, cy: y, r: 4, fill: color, class: 'payline-dot',
          opacity: previewLine === 'all' ? 0.4 : 1,
        }));
      }
    }
  }

  function paint(event) {
    if (disposed) return;
    currentEvent = event;
    chests.hidden = !event.bonus;
    const winningCells = new Set();
    for (const win of event.wins) {
      const route = PAYLINES[win.lineId - 1];
      for (let col = 0; route && col < win.count; col += 1) winningCells.add(`${route[col]}:${col}`);
    }
    for (const { element, use, row, col } of cells) {
      const id = event.grid[row][col];
      // Defense in depth: no untrusted value is interpolated into an SVG URL.
      const safeId = Object.hasOwn(SYMBOLS, id) ? id : 'mug';
      use.setAttribute('href', `${ART_PATH}#${safeId}`);
      element.dataset.symbol = safeId;
      const label = SYMBOLS[safeId]?.label ?? safeId;
      element.setAttribute('aria-label', `${col + 1}열 ${row + 1}행 ${label}`);
      element.classList.toggle('is-winning', winningCells.has(`${row}:${col}`));
      element.classList.toggle('is-covered', Boolean(event.bonus?.chests[col]?.mask[row]));
      element.classList.toggle('is-bonus', safeId === 'bonus');
      element.classList.toggle('is-wild', safeId === 'wild');
    }
    for (let col = 0; col < chestViews.length; col += 1) {
      const view = chestViews[col];
      const chest = event.bonus?.chests[col];
      const covered = chest?.mask.filter(Boolean).length ?? 0;
      const revealed = chest?.multiplier !== null && chest?.multiplier !== undefined;
      view.element.classList.toggle('locked', !chest?.unlocked);
      view.element.classList.toggle('unlocked', Boolean(chest?.unlocked));
      view.element.classList.toggle('revealed', revealed);
      view.dots.forEach((dot, row) => dot.classList.toggle('is-filled', Boolean(chest?.mask[row])));
      view.label.textContent = revealed ? `×${chest.multiplier}` : chest?.unlocked ? '해제 완료' : `${covered} / 5`;
      view.element.setAttribute('aria-label', `${col + 1}열 상자, ${covered}칸 수집, ${revealed ? `${chest.multiplier}배 공개` : chest?.unlocked ? '해제, 배수 미공개' : '잠김'}`);
    }
    drawLines();
  }

  function finish(run, skipped = false) {
    if (!run || run.done) return;
    run.done = true;
    run.removeAbort?.();
    for (const animation of run.animations) {
      animations.delete(animation);
      try { animation.cancel(); } catch { /* Detached elements may already be cancelled. */ }
    }
    if (activeRun === run) {
      activeRun = null;
      board.classList.remove('is-spinning');
      if (!disposed) paint(run.event);
    }
    run.resolve({ skipped });
  }

  function skip() {
    if (!activeRun) return false;
    finish(activeRun, true);
    return true;
  }

  function render(event) {
    if (disposed) return;
    skip();
    previewLine = null;
    paint(event);
  }

  function play(event, { speed = playbackSpeed, signal } = {}) {
    if (disposed) return Promise.resolve({ skipped: true });
    skip();
    previewLine = null;
    paint(event);
    const rate = safeSpeed(speed);
    playbackSpeed = rate;
    const run = { event, animations: [], initialRate: rate, done: false, resolve: null, removeAbort: null };
    const promise = new Promise((resolve) => { run.resolve = resolve; });
    activeRun = run;
    if (signal?.aborted || reducedMotion || typeof cells[0]?.element.animate !== 'function') {
      finish(run, Boolean(signal?.aborted));
      return promise;
    }
    const abort = () => finish(run, true);
    signal?.addEventListener('abort', abort, { once: true });
    run.removeAbort = () => signal?.removeEventListener('abort', abort);
    board.classList.add('is-spinning');
    try {
      const targets = event.kind === 'CHEST_REVEAL'
        ? chestViews.filter((view, col) => event.bonus?.chests[col]?.multiplier != null).map((view) => ({ element: view.element, row: 0, col: Number(view.element.dataset.col) }))
        : cells;
      for (const { element, row, col } of targets) {
        const reveal = event.kind === 'CHEST_REVEAL';
        const frames = reveal
          ? [{ transform: 'scale(.84)', filter: 'brightness(.8)' }, { transform: 'scale(1.14)', filter: 'brightness(1.6)', offset: 0.6 }, { transform: 'scale(1)', filter: 'brightness(1)' }]
          : [{ transform: 'translateY(-70%) scale(.94)', opacity: 0, filter: 'blur(5px)' }, { transform: 'translateY(7%) scale(1.025)', opacity: 1, filter: 'blur(0)', offset: 0.78 }, { transform: 'translateY(0) scale(1)', opacity: 1, filter: 'blur(0)' }];
        const animation = element.animate(frames, {
          duration: (reveal ? 620 : 460) / rate,
          delay: (col * 48 + row * 12) / rate,
          easing: 'cubic-bezier(.2,.7,.25,1)', fill: 'backwards',
        });
        animations.add(animation);
        run.animations.push(animation);
      }
      // Each rejection is handled, including cancellation during a skip or tab close.
      Promise.allSettled(run.animations.map((animation) => animation.finished)).then(() => finish(run));
    } catch {
      finish(run, true);
    }
    return promise;
  }

  function showLine(lineId = null) {
    if (disposed) return;
    if (lineId !== null && lineId !== 'all' && (!Number.isInteger(lineId) || lineId < 1 || lineId > PAYLINES.length)) {
      throw new RangeError('Line preview must be 1–15, all, or null');
    }
    previewLine = lineId;
    drawLines();
  }

  function setSpeed(speed) {
    playbackSpeed = safeSpeed(speed);
    if (!activeRun || disposed) return;
    // Durations already include the starting speed. Apply only the ratio so
    // changing speed during playback does not multiply that starting speed twice.
    const ratio = playbackSpeed / activeRun.initialRate;
    for (const animation of activeRun.animations) {
      if (typeof animation.updatePlaybackRate === 'function') animation.updatePlaybackRate(ratio);
      else animation.playbackRate = ratio;
    }
  }

  function reset() {
    render({ grid: INITIAL_GRID, wins: [], bonus: null });
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    skip();
    board.classList.remove('is-spinning');
    board.replaceChildren();
    chests.replaceChildren();
    lineLayer.replaceChildren();
    cells.length = 0;
    chestViews.length = 0;
    currentEvent = null;
  }

  reset();
  return { render, play, skip, showLine, setSpeed, reset, dispose, stats: () => ({ activeAnimations: animations.size, cellCount: cells.length }) };
}
