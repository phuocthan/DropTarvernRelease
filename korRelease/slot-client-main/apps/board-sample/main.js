import { createRoundController } from '../player-web/src/round-controller.js';
import * as contract from './contract.js';
import { createRenderer } from './renderer.js';
import { createRecordedAdapter } from './recorded.js';

const $ = id => document.getElementById(id);
const storage = {
  getItem: key => sessionStorage.getItem(`slot.recorded3.${key}`),
  setItem: (key, value) => sessionStorage.setItem(`slot.recorded3.${key}`, value),
  removeItem: key => sessionStorage.removeItem(`slot.recorded3.${key}`),
};
const controller = createRoundController({ adapter: createRecordedAdapter(), storage, contract,
  renderer: createRenderer($('board')), onChange(state) {
    $('replay').disabled = ['loading', 'requesting', 'playing', 'error'].includes(state.phase);
    $('skip').hidden = state.phase !== 'playing';
    $('status').textContent = state.phase === 'error' ? state.message : `Recorded sample: ${state.phase}`;
    $('balance').textContent = state.balanceMinor.toLocaleString('en-US');
    $('win').textContent = state.lastWinMinor.toLocaleString('en-US');
    $('round').textContent = state.snapshot?.roundId || 'recorded-round-1';
    $('event').textContent = String(state.event?.seq || 0);
  },
});
$('replay').addEventListener('click', async () => { await controller.init(); await controller.recover(); });
$('skip').addEventListener('click', () => controller.skip());
window.addEventListener('pagehide', () => controller.dispose());
window.addEventListener('pageshow', event => { if (event.persisted) window.location.reload(); });
void controller.init();
