import { BETS, PAYLINES, SYMBOLS, OBSERVED_PAYTABLE } from '../../../games/slot-001/spec/rules.js';
import { createRenderer } from '../../../games/slot-001/client/renderer.js';
import { SCENARIOS } from '../../../fixtures/rounds/slot-001-frontend/scenarios.js';
import { createMockAdapter } from './adapters/mock-adapter.js';
import { createRoundController } from './round-controller.js';
import { createAudio } from './audio.js';
import { formatWalletBalance } from './wallet-balance.js';

const $ = id => document.getElementById(id);
const format = value => Number.isSafeInteger(value) ? value.toLocaleString('ko-KR') : '—';
const phases = { loading: '불러오는 중', ready: '플레이 준비', requesting: '결과 확인 중', playing: '결과 재생 중', recovery: '판 복구 필요', error: '확인 필요' };
const payoutLabels = { PENDING: '지급 확인 중', CONFIRMED: '가상 지급 확정' };
const eventLabels = { BASE: '기본 스핀', BONUS_TRIGGER: '보너스 시작', FREE_SPIN: '무료 스핀', CHEST_REVEAL: '상자 배수 공개' };
const audio = createAudio();
const renderer = createRenderer({ board: $('board'), chests: $('chests'), lineLayer: $('line-layer'), reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches });
let storage;
try { storage = window.sessionStorage; }
catch { storage = { getItem() { throw new Error('Storage unavailable'); }, setItem() { throw new Error('Storage unavailable'); }, removeItem() { throw new Error('Storage unavailable'); } }; }
const adapter = createMockAdapter({ storage, delayMs: 220 });
let speed = 1;
let previousHistory = '';

function option(value, label) {
  const node = document.createElement('option');
  node.value = String(value);
  node.textContent = label;
  return node;
}
for (const bet of BETS) $('bet').append(option(bet, `${format(bet)} C`));
$('bet').value = '1000';
for (const scenario of SCENARIOS) $('scenario').append(option(scenario.id, scenario.label));
$('payline-select').append(option('', '라인 선택'), option('all', '15라인 전체'));
PAYLINES.forEach((rows, index) => $('payline-select').append(option(index + 1, `라인 ${String(index + 1).padStart(2, '0')} · ${rows.map(r => r + 1).join('–')}`)));
for (const [id, payout] of Object.entries(OBSERVED_PAYTABLE.payouts)) {
  const row = document.createElement('tr');
  for (const label of [SYMBOLS[id].label, ...[3, 4, 5].map(n => Number.isFinite(payout[n]) ? `${payout[n] / OBSERVED_PAYTABLE.scale}×` : '—')]) {
    const cell = document.createElement('td'); cell.textContent = label; row.append(cell);
  }
  $('paytable').append(row);
}
if (matchMedia('(max-width: 899px)').matches) $('test-panel').open = false;

function scenarioDescription() {
  $('scenario-description').textContent = SCENARIOS.find(s => s.id === $('scenario').value)?.description || '';
}
scenarioDescription();

function update(state) {
  const busy = ['loading', 'requesting', 'playing'].includes(state.phase);
  const canSpin = state.phase === 'ready' && !state.autoRemaining;
  $('balance').textContent = formatWalletBalance(state.balanceMinor);
  $('last-win').textContent = format(state.lastWinMinor);
  $('status').textContent = state.message || phases[state.phase] || '확인 필요';
  $('status').dataset.phase = state.phase;
  $('phase').textContent = phases[state.phase] || state.phase;
  $('round-id').textContent = state.snapshot?.roundId || '—';
  $('event-seq').textContent = state.event ? `${state.event.seq} / ${state.snapshot?.events.length || 0}` : '—';
  $('payout-state').textContent = payoutLabels[state.snapshot?.payoutState] || '—';
  $('spin').disabled = !canSpin;
  $('spin').setAttribute('aria-label', busy ? '스핀 진행 중' : '가상 크레딧으로 스핀');
  $('skip').hidden = state.phase !== 'playing';
  $('recovery').hidden = state.phase !== 'recovery';
  $('reset').disabled = busy || Boolean(state.autoRemaining);
  $('bet').disabled = !canSpin;
  if (!canSpin && state.snapshot) $('bet').value = String(state.snapshot.betMinor);
  $('scenario').disabled = !canSpin;
  $('auto').disabled = !canSpin;
  $('auto-count').disabled = !canSpin;
  $('stop-auto').hidden = !state.autoRemaining;
  $('stop-auto').textContent = `자동 정지 · ${state.autoRemaining || 0}회 남음`;
  $('payline-select').disabled = busy;
  const bonus = state.event?.bonus;
  $('bonus-status').textContent = bonus ? `${eventLabels[state.event.kind]} · 무료 스핀 ${bonus.remaining}회 남음` : '5 × 5 · 15 PAYLINES';
  document.body.classList.toggle('bonus-active', Boolean(bonus));
  const historyKey = JSON.stringify(state.history || []);
  if (historyKey !== previousHistory) {
    previousHistory = historyKey;
    const rows = (state.history || []).slice(-5).reverse().map(item => {
      const row = document.createElement('li');
      const name = document.createElement('span');
      const value = document.createElement('strong');
      name.textContent = `${format(item.betMinor)} C 스핀`;
      value.textContent = `+${format(item.winMinor)} C`;
      row.append(name, value); return row;
    });
    if (!rows.length) { const row = document.createElement('li'); row.textContent = '첫 스핀을 시작해 보세요.'; rows.push(row); }
    $('history').replaceChildren(...rows);
  }
}

const controller = createRoundController({ adapter, renderer, storage, onChange: update, onEvent: event => audio.play(event.stepWinMinor > 0) });
const attempt = promise => Promise.resolve(promise).catch(() => { $('status').textContent = '처리를 완료하지 못했습니다. 같은 판 복구 또는 목 세션 초기화를 사용하세요.'; });
const spinInput = () => ({ betMinor: Number($('bet').value), scenario: $('scenario').value });
$('spin').addEventListener('click', () => { renderer.showLine(null); void attempt(controller.spin(spinInput())); });
$('scenario').addEventListener('change', scenarioDescription);
$('skip').addEventListener('click', () => controller.skip());
$('recovery').addEventListener('click', () => void attempt(controller.recover()));
$('reset').addEventListener('click', () => { renderer.showLine(null); void attempt(controller.reset()); });
$('auto').addEventListener('click', () => { renderer.showLine(null); void attempt(controller.startAuto({ ...spinInput(), count: Number($('auto-count').value) })); });
$('stop-auto').addEventListener('click', () => controller.stopAuto());
$('speed').addEventListener('click', () => {
  speed = speed === 1 ? 2 : 1;
  controller.setSpeed(speed);
  $('speed').textContent = `${speed}×`;
  $('speed').setAttribute('aria-pressed', String(speed > 1));
});
$('sound').addEventListener('click', async () => {
  await audio.enable(!audio.isEnabled());
  $('sound').textContent = audio.isEnabled() ? '음향 켜짐' : '음향 꺼짐';
  $('sound').setAttribute('aria-pressed', String(audio.isEnabled()));
});
$('payline-select').addEventListener('change', () => {
  const selected = $('payline-select').value;
  renderer.showLine(selected === 'all' ? 'all' : selected ? Number(selected) : null);
});
$('rules').addEventListener('click', () => { controller.stopAuto(); $('rule-dialog').showModal(); });
$('rule-close').addEventListener('click', () => $('rule-dialog').close());
document.addEventListener('keydown', event => {
  if (event.code !== 'Space' || event.repeat || event.altKey || event.ctrlKey || event.metaKey || $('rule-dialog').open) return;
  if (event.target.closest('button,input,select,textarea,summary,[contenteditable]')) return;
  event.preventDefault();
  const phase = controller.getState().phase;
  if (phase === 'playing') controller.skip();
  else if (phase === 'ready') { renderer.showLine(null); void attempt(controller.spin(spinInput())); }
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { controller.stopAuto(); controller.skip(); audio.stop(); }
});
window.addEventListener('pagehide', () => { controller.dispose(); audio.dispose(); });
window.addEventListener('pageshow', event => { if (event.persisted) window.location.reload(); });
void attempt(controller.init());
