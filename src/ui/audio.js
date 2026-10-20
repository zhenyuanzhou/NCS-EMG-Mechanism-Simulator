// Loudspeaker output, as on an EMG machine. The SAME synthesized signal that is drawn on the
// scope (20 kHz sampling, 0.05 ms steps) is played at its own sample rate: no pitch or time
// scaling. Only the volume is normalised (peak → fixed level), so loudness between types is
// not comparable. Muted by default; starts only after a user click (browser autoplay rules).

let ctx = null;
let src = null;
let gainNode = null;

export const AUDIO_FS = 20000;

export function audioSupported() {
  return typeof window !== 'undefined' && !!(window.AudioContext || window.webkitAudioContext);
}

export function stopAudio() {
  if (src) {
    try {
      src.stop();
    } catch (e) {
      /* already stopped */
    }
    src.disconnect();
    src = null;
  }
}

// sig: Float64Array/array in mV at AUDIO_FS; loops until stopped.
export function playSignal(sig, { loop = true, volume = 0.5 } = {}) {
  if (!audioSupported() || !sig || !sig.length) return false;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    gainNode = ctx.createGain();
    gainNode.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  stopAudio();
  let peak = 1e-9;
  for (let i = 0; i < sig.length; i++) peak = Math.max(peak, Math.abs(sig[i]));
  const buf = ctx.createBuffer(1, sig.length, AUDIO_FS);
  const ch = buf.getChannelData(0);
  // remove DC, normalise, short fade at the loop edges to avoid clicks
  let m = 0;
  for (let i = 0; i < sig.length; i++) m += sig[i];
  m /= sig.length;
  const fade = Math.min(200, sig.length >> 3);
  for (let i = 0; i < sig.length; i++) {
    let v = ((sig[i] - m) / peak) * 0.9;
    if (i < fade) v *= i / fade;
    if (i > sig.length - fade) v *= (sig.length - i) / fade;
    ch[i] = v;
  }
  src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = loop;
  gainNode.gain.value = volume;
  src.connect(gainNode);
  src.start();
  return true;
}
