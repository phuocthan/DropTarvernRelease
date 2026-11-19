// User-enabled, locally synthesized cues. No downloaded audio or network access.
export function createAudio() {
  let context = null;
  let enabled = false;
  const voices = new Set();
  async function enable(value) {
    enabled = Boolean(value);
    if (!enabled) return;
    const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Audio) { enabled = false; return; }
    context ||= new Audio();
    try { await context.resume(); } catch { enabled = false; }
  }
  function play(win = false) {
    if (!enabled || !context || context.state !== 'running' || voices.size >= 4) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(win ? 659 : 220, now);
    oscillator.frequency.exponentialRampToValueAtTime(win ? 988 : 147, now + 0.12);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.06, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    oscillator.connect(gain).connect(context.destination);
    voices.add(oscillator);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); voices.delete(oscillator); };
    oscillator.start(now);
    oscillator.stop(now + 0.18);
  }
  function stop() { for (const voice of voices) { try { voice.stop(); } catch { /* already ended */ } } }
  function dispose() { enabled = false; stop(); void context?.close(); context = null; }
  return { enable, play, stop, dispose, isEnabled: () => enabled };
}
