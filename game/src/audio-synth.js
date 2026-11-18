// WebAudio synthesis only: engine hum, sirens, gunshots, horns and jingles. No audio files.

export function createAudioSynth() {
  let context = null;
  let engineOscillator = null;
  let engineGain = null;

  function ensureContext() {
    if (!context) {
      try { context = new (window.AudioContext || window.webkitAudioContext)(); } catch { context = null; }
    }
    if (context && context.state === 'suspended') context.resume();
    return context;
  }

  function tone(freq, duration, type = 'square', volume = 0.12, slideTo = null, delay = 0) {
    const ac = ensureContext(); if (!ac) return;
    const t0 = ac.currentTime + delay;
    const osc = ac.createOscillator(); const gain = ac.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), t0 + duration);
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    osc.connect(gain).connect(ac.destination); osc.start(t0); osc.stop(t0 + duration + 0.02);
  }

  function noiseBurst(duration, volume = 0.2, delay = 0) {
    const ac = ensureContext(); if (!ac) return;
    const t0 = ac.currentTime + delay;
    const buffer = ac.createBuffer(1, Math.max(1, ac.sampleRate * duration), ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = ac.createBufferSource(); src.buffer = buffer;
    const gain = ac.createGain(); gain.gain.value = volume;
    const filter = ac.createBiquadFilter(); filter.type = 'highpass'; filter.frequency.value = 900;
    src.connect(filter).connect(gain).connect(ac.destination); src.start(t0);
  }

  return {
    unlockAudio() { ensureContext(); },
    playGunshot() { noiseBurst(0.11, 0.22); tone(160, 0.08, 'square', 0.1, 60); },
    playCrash() { noiseBurst(0.25, 0.28); tone(90, 0.22, 'sawtooth', 0.14, 45); },
    playHorn() { tone(370, 0.18, 'square', 0.09); tone(466, 0.18, 'square', 0.07, null, 0.01); },
    playPickup() { tone(660, 0.09, 'sine', 0.14); tone(990, 0.14, 'sine', 0.14, null, 0.09); },
    playMissionCompleteJingle() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.16, 'triangle', 0.16, null, i * 0.11)); },
    playBustedSting() { [392, 330, 262, 196].forEach((f, i) => tone(f, 0.2, 'triangle', 0.15, null, i * 0.13)); },
    playSirenStep(step) { tone(step % 2 ? 660 : 880, 0.16, 'sine', 0.035); },
    // Impact and feedback sounds, priority-ordered (Sakurai sound #10):
    // hits outrank ambience, so these stay short, attack-heavy, low reverb.
    playHit(down = false) { noiseBurst(0.06, 0.16); tone(down ? 220 : 300, 0.07, 'triangle', 0.14, 90); if (down) tone(523, 0.12, 'triangle', 0.1, null, 0.05); },
    playNearMiss() { noiseBurst(0.16, 0.1); tone(900, 0.14, 'sine', 0.05, 1500); },
    playFootstep(step) { noiseBurst(0.03, 0.035); tone(step % 2 ? 95 : 82, 0.03, 'sine', 0.03); },
    playDrift(active) { if (active) noiseBurst(0.09, 0.045); },
    setEngineLevel(level, driving) {
      const ac = ensureContext(); if (!ac) return;
      if (!engineOscillator) {
        engineOscillator = ac.createOscillator(); engineGain = ac.createGain();
        engineOscillator.type = 'sawtooth'; engineGain.gain.value = 0;
        engineOscillator.connect(engineGain).connect(ac.destination); engineOscillator.start();
      }
      engineOscillator.frequency.value = 55 + Math.abs(level) * 130;
      engineGain.gain.value = driving ? 0.028 : 0;
    },
  };
}
