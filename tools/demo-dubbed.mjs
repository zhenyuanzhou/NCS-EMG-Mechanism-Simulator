// Records the demonstration video of the REAL application, paced by the narration.
// Each scene is held for as long as its narration clip lasts, and the physiological animation
// is slowed so that it finishes exactly within that scene — so the picture and the voice stay
// together without cutting either.
//
// Usage: node tools/demo-dubbed.mjs <outDir> [timings.json] [lang]
//   timings.json: { "<scene id>": <seconds>, ... }  (from the TTS step; defaults used if absent)
//   lang: 'zh' (default) or 'en' — sets the application's own interface language AND the
//         caption language, so an English tour is English throughout, not just in the voice.
// Writes <outDir>/demo.webm and <outDir>/timeline.json (scene start times, for the audio mux).
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';

const root = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const outDir = process.argv[2] || path.join(root, 'dist', 'video');
const timingsFile = process.argv[3];
const LANG = (process.argv[4] || 'zh').toLowerCase() === 'en' ? 'en' : 'zh';
const timings = timingsFile && fs.existsSync(timingsFile) ? JSON.parse(fs.readFileSync(timingsFile, 'utf8')) : {};
fs.mkdirSync(outDir, { recursive: true });

const W = 1440;
const H = 900;
const LEAD = 350; // ms of picture before the voice starts
const TAIL = 700; // ms of picture after the voice ends
const MIN_HOLD = 4200;

// setup: JS run at the start of the scene. play: slow the animation to fill the scene.
const SCENES = [
  { id: '01_basics', zh: '记录原理：同一个动作电位，电极位置不同，波形不同（负相向上）', en: 'Recording basics: one action potential, different electrode positions, different waveforms (negative up)', setup: `__app.selectModule('basics')`, play: true },
  { id: '02_ncs', zh: '正常运动 NCS：刺激 → 轴突传导 → NMJ → 肌纤维 → CMAP', en: 'Normal motor NCS: stimulus → axonal conduction → NMJ → muscle fibres → CMAP', setup: `__app.selectModule('ncs'); __app.ui.ncs.scale='macro'`, play: true },
  { id: '03_axonal', zh: '轴突丢失 60%：各刺激点波幅都下降，传导速度基本不变', en: 'Axonal loss 60%: amplitude falls at every site, conduction velocity barely changes', setup: `__set({ axonal: { ...__app.p.axonal, on: true, frac: 0.6, population: 'motor' } }, 'axonal.on')`, play: true },
  { id: '04_block', zh: '前臂传导阻滞 60%：腕刺激（病灶远端）正常，肘刺激面积下降 >50%', en: 'Forearm conduction block 60%: wrist (distal) normal, elbow area falls >50%', setup: `__set({ axonal: { ...__app.p.axonal, on: false }, demyel: { ...__app.p.demyel, on: true, site: 'forearm', slowing: 0.3, dispersion: 0.2, block: 0.6 }, stim: 'elbow' }, 'demyel.block'); __app.ui.ncs.scale='macro'`, play: true },
  { id: '05_dispersion', zh: '时间离散：到达时间分散 → 峰值降低、时程增宽（相位抵消）', en: 'Temporal dispersion: arrivals spread → lower peak, longer duration (phase cancellation)', setup: `__set({ demyel: { ...__app.p.demyel, block: 0, slowing: 0.5, dispersion: 1.2 } }, 'demyel.dispersion'); __app.ui.ncs.scale='meso'`, play: true },
  { id: '06_muap', zh: '针极 EMG：一个运动单位的肌纤维 → MUAP', en: 'Needle EMG: the fibres of one motor unit → MUAP', setup: `__app.selectModule('emg'); __app.ui.emg.scale='meso'; __set({ display: 'muap', activity: 'mild' }, 'display')`, play: true },
  { id: '07_myopathy', zh: '肌病：每个单位纤维减少 → 短小 MUAP；同样的力需要更多单位（早募集）', en: 'Myopathy: fewer fibres per unit → small MUAPs; more units for the same force (early recruitment)', setup: `__set({ display: 'record', myopathy: { ...__app.p.myopathy, on: true, fiberLoss: 0.5 } }, 'myopathy.on')`, play: true },
  { id: '08_reinn', zh: '慢性再支配（1 年）：MUAP 又大又长，募集仍减少', en: 'Chronic reinnervation (1 year): large, long MUAPs; recruitment still reduced', setup: `__set({ display: 'muap', myopathy: { ...__app.p.myopathy, on: false }, axonal: { ...__app.p.axonal, on: true, frac: 0.6 }, day: 365, reinnervation: 0.7 }, 'day')`, play: true },
  { id: '09_fib', zh: '纤颤电位：单根去神经纤维，起始正相，规则放电', en: 'Fibrillation: one denervated fibre, initial positive, regular firing', setup: `__app.selectModule('spont'); __app.ui.spont.scale='micro'`, play: true },
  { id: '10_myotonic', zh: '肌强直放电：同样的单纤维形态，频率与波幅渐增渐减', en: 'Myotonic discharge: same single-fibre shape, rate and amplitude wax and wane', setup: `__set({ type: 'myotonic' }, 'type'); __app.ui.spont.scale='macro'`, play: true },
  { id: '11_course12h', zh: '病程：第 12 小时——远端正常，只有跨病灶刺激下降', en: 'Time course, hour 12 — distal normal, only across-lesion reduced', setup: `__app.selectModule('course'); __set({ day: 0.5, view: 'ncs' }, 'day')` },
  { id: '12_course10', zh: '第 10 天：沃勒变性完成，远端 CMAP/SNAP 下降', en: 'Day 10: Wallerian degeneration complete, distal CMAP/SNAP fall', setup: `__set({ day: 10 }, 'day')` },
  { id: '13_course21', zh: '第 21 天：纤颤电位出现（时间取决于病灶到肌肉的长度）', en: 'Day 21: fibrillations appear (timing set by lesion-to-muscle length)', setup: `__set({ day: 21, view: 'rest' }, 'day')` },
  { id: '14_course1y', zh: '第 1 年：再支配，MUAP 增大，CMAP 部分恢复', en: 'Year 1: reinnervation, larger MUAPs, partial CMAP recovery', setup: `__set({ day: 365, view: 'muap' }, 'day')` },
  { id: '15_radic', zh: '定位：C8 根病——节前病灶，SNAP 保留；C8 肌节跨多条神经受累', en: 'Localization: C8 radiculopathy — preganglionic, SNAPs preserved; C8 myotome across nerves', setup: `__app.selectModule('localize'); __set({ lesion: 'c8', sev: 0.5, day: 35, sel: 'apb' }, 'lesion')` },
  { id: '16_plexus', zh: '病灶移到下干（节后）：尺神经 SNAP 与 MABC 下降，椎旁肌正常', en: 'Lesion at the lower trunk (postganglionic): ulnar SNAP and MABC fall, paraspinals normal', setup: `__set({ lesion: 'lowerTrunk', sel: 'ulnSen' }, 'lesion')` },
  { id: '17_nmj', zh: '重症肌无力：3 Hz RNS，安全系数低的纤维逐次失败 → 递减', en: 'Myasthenia gravis: 3 Hz RNS; low-safety-factor fibres fail one by one → decrement', setup: `__app.selectModule('nmj'); __app.ui.nmj.scale='macro'`, play: true },
  { id: '18_fwave', zh: 'F 波：逆向冲动到达前角细胞，少数回返放电——不是反射', en: 'F wave: antidromic impulses reach the anterior horn; a few backfire — not a reflex', setup: `__app.selectModule('late'); __app.ui.late.scale='macro'`, play: true },
  { id: '19_outro', zh: '所有波形均由模型实时生成并测量', en: 'All waveforms are generated and measured by the model', setup: `__caption_only()` },
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: W, height: H }, recordVideo: { dir: outDir, size: { width: W, height: H } }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const t0 = Date.now();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto('file://' + path.join(root, 'dist', 'index.html'));
await page.waitForTimeout(2200);
await page.evaluate((lang) => {
  window.__lang = lang;
  const d = document.createElement('div');
  d.id = '__cap';
  d.style.cssText =
    'position:fixed;left:50%;bottom:18px;transform:translateX(-50%);max-width:1150px;background:rgba(20,24,30,.88);color:#fff;font:600 17px/1.45 system-ui,sans-serif;padding:10px 18px;border-radius:10px;z-index:9999;text-align:center;pointer-events:none';
  document.body.appendChild(d);
  // an English tour shows one English line; the Chinese tour keeps the English term line under it
  window.__caption = (zh, en) =>
    (d.innerHTML = window.__lang === 'en' ? en : `${zh}<br><span style="font-weight:500;font-size:14px;opacity:.85">${en}</span>`);
  window.__set = (patch, key) => window.__app.setParams({ ...JSON.parse(JSON.stringify(window.__app.p)), ...patch }, key);
  window.__caption_only = () => {};
  // play the physiological animation so that it fills exactly `ms` of wall-clock time
  window.__playOver = (ms) => {
    const a = window.__app;
    const w = a.window();
    a.speed = (w.t1 - w.t0) / ms;
    a.speedTouched = true;
    a.t = w.t0;
    a.playing = true;
  };
}, LANG);

if (LANG === 'en') {
  // switch the application itself to English before the first scene
  await page.evaluate(() => document.querySelectorAll('#lang-seg button')[1].click());
  await page.waitForTimeout(1500);
  const ok = await page.evaluate(() => document.documentElement.lang);
  if (!ok.startsWith('en')) errors.push('interface did not switch to English');
  console.log(`interface language: ${ok}`);
}

const timeline = [];
for (const s of SCENES) {
  const narr = (timings[s.id] || 6) * 1000;
  const hold = Math.max(MIN_HOLD, narr + LEAD + TAIL);
  try {
    await page.evaluate(s.setup);
  } catch (e) {
    errors.push(`[${s.id}] setup: ${e.message}`);
  }
  await page.evaluate(([zh, en]) => window.__caption(zh, en), [s.zh, s.en]);
  // settle: a module switch recomputes on a timer before the first frame is meaningful
  await page.waitForTimeout(600);
  // the scene starts when its caption and its picture are on screen — a slow recompute above
  // must not let the narration run ahead of the picture it describes
  const start = Date.now() - t0;
  if (s.play) {
    try {
      await page.evaluate((ms) => window.__playOver(ms), hold - 300);
    } catch (e) {
      errors.push(`[${s.id}] play: ${e.message}`);
    }
  }
  await page.waitForTimeout(hold);
  timeline.push({ id: s.id, startMs: start, holdMs: hold, narrMs: narr, voiceAtMs: start + LEAD });
  console.log(`${s.id.padEnd(14)} start ${(start / 1000).toFixed(2)}s  hold ${(hold / 1000).toFixed(2)}s  narr ${(narr / 1000).toFixed(2)}s`);
}
const endMs = Date.now() - t0;
const video = page.video();
await ctx.close();
await browser.close();
const p = await video.path();
const dest = path.join(outDir, 'demo.webm');
fs.renameSync(p, dest);
fs.writeFileSync(path.join(outDir, 'timeline.json'), JSON.stringify({ endMs, lead: LEAD, lang: LANG, scenes: timeline }, null, 1));
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors');
console.log(`total ${(endMs / 1000).toFixed(1)}s →`, dest);
