let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function playBeep(freq = 880, durationMs = 180, volume = 0.18) {
  try {
    const ac = getCtx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, ac.currentTime);
    gain.gain.linearRampToValueAtTime(volume, ac.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + durationMs / 1000);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + durationMs / 1000);
  } catch {
    /* audio not available */
  }
}

export function playCountdownBeep() {
  playBeep(660, 120, 0.12);
}

export function playStartBeep() {
  playBeep(1000, 250, 0.2);
}

export function playRestStartBeep() {
  playBeep(440, 200, 0.15);
}

export function playFinishBeep() {
  playBeep(880, 150, 0.2);
  setTimeout(() => playBeep(1100, 150, 0.2), 160);
  setTimeout(() => playBeep(1320, 320, 0.22), 320);
}
