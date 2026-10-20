// Records a demonstration video of the REAL application (headless Chromium + Playwright video).
// Usage: node tools/demo.mjs [outDir]   → outDir/demo.webm (convert with ffmpeg to mp4)
// Captions are a thin overlay added by this script; everything else is the live app.
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';

const root = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const outDir = process.argv[2] || path.join(root, 'dist', 'video');
fs.mkdirSync(outDir, { recursive: true });
const W = 1440;
const H = 900;
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: W, height: H }, recordVideo: { dir: outDir, size: { width: W, height: H } }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto('file://' + path.join(root, 'dist', 'index.html'));
await page.waitForTimeout(2500);
await page.evaluate(() => {
  const d = document.createElement('div');
  d.id = '__cap';
  d.style.cssText = 'position:fixed;left:50%;bottom:18px;transform:translateX(-50%);max-width:1100px;background:rgba(20,24,30,.88);color:#fff;font:600 17px/1.45 system-ui,sans-serif;padding:10px 18px;border-radius:10px;z-index:9999;text-align:center;pointer-events:none';
  document.body.appendChild(d);
  window.__caption = (zh, en) => (d.innerHTML = `${zh}<br><span style="font-weight:500;font-size:14px;opacity:.85">${en}</span>`);
  window.__play = (speed) => {
    const a = window.__app;
    const w = a.window();
    if (speed) a.speed = speed;
    a.t = w.t0;
    a.playing = true;
  };
  window.__set = (patch, key) => window.__app.setParams({ ...JSON.parse(JSON.stringify(window.__app.p)), ...patch }, key);
});
const step = async (js, ms) => {
  await page.evaluate(js);
  await page.waitForTimeout(ms);
};

// 1. Recording basics
await step(`__app.selectModule('basics'); __caption('记录原理：同一个动作电位，电极位置不同，波形不同（负相向上）', 'Recording basics: one action potential, different electrode positions, different waveforms (negative up)')`, 1500);
await step(`__play(0.002)`, 6500);
// 2. Normal NCS
await step(`__app.selectModule('ncs'); __app.ui.ncs.scale='macro'; __caption('正常运动 NCS：刺激 → 轴突传导 → NMJ → 肌纤维 → CMAP', 'Normal motor NCS: stimulus → axonal conduction → NMJ → muscle fibres → CMAP')`, 2500);
await step(`__play(0.003)`, 7000);
// 3. Axonal loss
await step(`__set({ axonal: { ...__app.p.axonal, on: true, frac: 0.6, population: 'motor' } }, 'axonal.on'); __caption('轴突丢失 60%：各刺激点波幅都下降，传导速度基本不变', 'Axonal loss 60%: amplitude falls at every site, conduction velocity barely changes')`, 3500);
await step(`__play(0.003)`, 6000);
// 4. Demyelination: block and dispersion
await step(`__set({ axonal: { ...__app.p.axonal, on: false }, demyel: { ...__app.p.demyel, on: true, site: 'forearm', slowing: 0.3, dispersion: 0.2, block: 0.6 }, stim: 'elbow' }, 'demyel.block'); __app.ui.ncs.scale='macro'; __caption('前臂传导阻滞 60%：腕刺激（病灶远端）正常，肘刺激面积下降 >50%', 'Forearm conduction block 60%: wrist (distal) normal, elbow area falls >50%')`, 3500);
await step(`__play(0.003)`, 6500);
await step(`__set({ demyel: { ...__app.p.demyel, block: 0, slowing: 0.5, dispersion: 1.2 } }, 'demyel.dispersion'); __app.ui.ncs.scale='meso'; __caption('时间离散：到达时间分散 → 峰值降低、时程增宽（相位抵消）', 'Temporal dispersion: arrivals spread → lower peak, longer duration (phase cancellation)')`, 3500);
await step(`__play(0.003)`, 6000);
// 5. Needle EMG: normal then myopathy
await step(`__app.selectModule('emg'); __app.ui.emg.scale='meso'; __set({ display: 'muap', activity: 'mild' }, 'display'); __caption('针极 EMG：一个运动单位的肌纤维 → MUAP', 'Needle EMG: the fibres of one motor unit → MUAP')`, 3500);
await step(`__play(0.003)`, 5000);
await step(`__set({ display: 'record', myopathy: { ...__app.p.myopathy, on: true, fiberLoss: 0.5 } }, 'myopathy.on'); __caption('肌病：每个单位纤维减少 → 短小 MUAP；同样的力需要更多单位（早募集）', 'Myopathy: fewer fibres per unit → small MUAPs; more units for the same force (early recruitment)')`, 4000);
await step(`__play(0.25)`, 5000);
// 6. Reinnervation
await step(`__set({ display: 'muap', myopathy: { ...__app.p.myopathy, on: false }, axonal: { ...__app.p.axonal, on: true, frac: 0.6 }, day: 365, reinnervation: 0.7 }, 'day'); __caption('慢性再支配（1 年）：存活单位接管孤立纤维 → MUAP 又大又长，募集仍减少', 'Chronic reinnervation (1 year): surviving units adopt orphaned fibres → large, long MUAPs; recruitment still reduced')`, 4500);
await step(`__play(0.003)`, 5000);
// 7. Spontaneous activity
await step(`__app.selectModule('spont'); __app.ui.spont.scale='micro'; __caption('自发电位：纤颤电位——单根去神经纤维，起始正相，规则放电', 'Spontaneous activity: fibrillation — one denervated fibre, initial positive, regular firing')`, 2500);
await step(`__play(0.25)`, 5000);
await step(`__set({ type: 'myotonic' }, 'type'); __app.ui.spont.scale='macro'; __caption('肌强直放电：同样的单纤维形态，频率与波幅渐增渐减', 'Myotonic discharge: same single-fibre shape, rate and amplitude wax and wane')`, 2500);
await step(`__play(0.25)`, 5000);
// 8. Time course
await step(`__app.selectModule('course'); __caption('病程：同一病灶，第 12 小时（远端正常）……', 'Time course: same lesion at 12 hours (distal normal)…')`, 7000);
for (const d of [10, 21, 365]) await step(`__set({ day: ${d} }, 'day'); __caption('…第 ${d === 365 ? '1 年' : d + ' 天'}：' + ({10:'远端 CMAP/SNAP 下降', 21:'纤颤出现', 365:'再支配、CMAP 部分恢复'})[${d}], '…${d === 365 ? 'year 1' : 'day ' + d}: ' + ({10:'distal CMAP/SNAP fall', 21:'fibrillations appear', 365:'reinnervation, partial CMAP recovery'})[${d}])`, 3000);
// 9. Localization
await step(`__app.selectModule('localize'); __caption('定位：C8 根病——节前病灶，SNAP 保留；C8 肌节跨多条神经受累', 'Localization: C8 radiculopathy — preganglionic, SNAPs preserved; C8 myotome involved across nerves')`, 6500);
await step(`__set({ lesion: 'lowerTrunk', sel: 'ulnSen' }, 'lesion'); __caption('病灶移到下干（节后）：尺神经 SNAP 与 MABC 下降，椎旁肌正常', 'Lesion moved to the lower trunk (postganglionic): ulnar SNAP and MABC fall, paraspinals normal')`, 5500);
// 10. NMJ
await step(`__app.selectModule('nmj'); __caption('重症肌无力：3 Hz RNS，安全系数低的纤维逐次失败 → 递减', 'Myasthenia gravis: 3 Hz RNS; fibres with a low safety factor fail one by one → decrement')`, 2500);
await step(`__play(0.03)`, 7000);
// 11. F wave
await step(`__app.selectModule('late'); __app.ui.late.scale='macro'; __caption('F 波：逆向冲动到达前角细胞，少数回返放电——不是反射', 'F wave: antidromic impulses reach the anterior horn; a few backfire — not a reflex')`, 2500);
await step(`__play(0.004)`, 9000);
await step(`__caption('所有波形均由模型实时生成并测量 · All waveforms are generated and measured by the model', '')`, 2500);
const video = page.video();
await ctx.close();
await browser.close();
const p = await video.path();
const dest = path.join(outDir, 'demo.webm');
fs.renameSync(p, dest);
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors', '\n', dest);
