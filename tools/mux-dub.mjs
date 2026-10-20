// Builds the narration track from the per-scene clips and muxes it onto the recorded video.
// Each clip starts at its scene's `voiceAtMs`, so the voice always follows its own picture.
//
// Usage: node tools/mux-dub.mjs <video.webm> <timeline.json> <wavDir> <out.mp4> [--gain 1.0]
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const [video, timelineFile, wavDir, out] = process.argv.slice(2);
if (!video || !timelineFile || !wavDir || !out) {
  console.error('usage: node tools/mux-dub.mjs <video> <timeline.json> <wavDir> <out.mp4> [--gain g]');
  process.exit(1);
}
const gi = process.argv.indexOf('--gain');
const gain = gi > 0 ? Number(process.argv[gi + 1]) : 1.0;
const ci = process.argv.indexOf('--crf');
const crf = ci > 0 ? process.argv[ci + 1] : '26';

const tl = JSON.parse(fs.readFileSync(timelineFile, 'utf8'));
const clips = [];
for (const s of tl.scenes) {
  const f = path.join(wavDir, `${s.id}.wav`);
  if (!fs.existsSync(f)) {
    console.warn(`missing clip: ${s.id}`);
    continue;
  }
  clips.push({ file: f, delay: Math.round(s.voiceAtMs) });
}
if (!clips.length) {
  console.error('no clips found in ' + wavDir);
  process.exit(1);
}

// Playwright writes the capture at a fixed 25 fps tag regardless of how fast frames actually
// arrived, so the file plays slower than the wall clock the timeline was measured against.
// Retime the picture to real time first; then the recorded scene starts are directly valid.
const probed = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', video]).toString().trim());
const realSec = tl.endMs / 1000;
const factor = probed / realSec;
console.log(`video ${probed.toFixed(2)}s tagged vs ${realSec.toFixed(2)}s real → retime x${factor.toFixed(4)}`);

const args = ['-y', '-loglevel', 'error', '-i', video];
clips.forEach((c) => args.push('-i', c.file));
const parts = clips.map((c, i) => `[${i + 1}:a]aresample=48000,adelay=${c.delay}|${c.delay}[a${i}]`);
const mix = clips.map((_, i) => `[a${i}]`).join('');
// normalize=0: the clips do not overlap, so summing keeps each at its own level
const filter = `${parts.join(';')};${mix}amix=inputs=${clips.length}:normalize=0:dropout_transition=0[mixed];[mixed]volume=${gain},loudnorm=I=-17:TP=-1.5:LRA=11[aout]`;
args.push(
  '-filter_complex', `[0:v]setpts=PTS/${factor.toFixed(6)},fps=30[v];${filter}`,
  '-map', '[v]', '-map', '[aout]',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', crf, '-pix_fmt', 'yuv420p',
  '-c:a', 'aac', '-b:a', '128k', '-ar', '48000',
  '-movflags', '+faststart',
  out
);
console.log(`muxing ${clips.length} clips → ${out}`);
execFileSync('ffmpeg', args, { stdio: 'inherit' });
const dur = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', out]).toString().trim();
console.log(`done: ${out}  ${Number(dur).toFixed(1)}s  ${(fs.statSync(out).size / 1e6).toFixed(1)} MB`);
