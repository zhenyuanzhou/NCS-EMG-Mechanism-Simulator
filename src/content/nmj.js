// Content and plots for the NMJ module (textbook Ch 6 p.57–65; Ch 37 p.658–662; p.681).
import { L } from './i18n.js';
import { fmt } from '../core/util.js';
import { PV } from '../core/params.js';
import { DISEASES, PROTOCOLS, diseaseFactors, gainClasses, SF_K } from '../physiology/nmj.js';
import { theme, withAlpha } from '../render/theme.js';

function txt(ctx, s, x, y, color, align = 'left', size = 10.5, weight = 500) {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px system-ui, sans-serif`;
  ctx.textAlign = align;
  ctx.fillText(s, x, y);
}

export function receptorOf(c) {
  return diseaseFactors(c.disease, c.severity).receptor;
}

export function controls(c) {
  return [
    {
      title: { zh: '检查', en: 'Study' },
      items: [
        {
          type: 'chips',
          path: 'study',
          label: { zh: '方法', en: 'Method' },
          options: [
            { value: 'rns', label: { zh: '重复神经刺激 RNS', en: 'Repetitive stimulation (RNS)' } },
            { value: 'sfemg', label: { zh: '单纤维 EMG（入门）', en: 'Single-fibre EMG (intro)' } },
          ],
          help: { zh: 'RNS 看“多少纤维达到阈值”；SFEMG 看“达到阈值的时间是否稳定”。两者都是 NMJ 的检查，但测量的东西不同。', en: 'RNS asks how many fibres reach threshold; SFEMG asks how stable the time to threshold is. Both probe the NMJ, but measure different things.' },
        },
        {
          type: 'chips',
          path: 'protocol',
          label: { zh: '刺激方案', en: 'Protocol' },
          show: (q) => q.study === 'rns',
          options: Object.entries(PROTOCOLS).map(([value, label]) => ({ value, label })),
        },
      ],
    },
    {
      title: { zh: '病理', en: 'Pathology' },
      pathology: true,
      items: [
        { type: 'chips', path: 'disease', label: { zh: '病变', en: 'Disorder' }, options: Object.entries(DISEASES).map(([value, label]) => ({ value, label })) },
        { type: 'range', path: 'severity', label: { zh: '严重度', en: 'Severity' }, min: 0, max: 1, step: 0.05, fmt: (v) => `${Math.round(v * 100)}%`, show: (q) => q.disease !== 'normal', help: { zh: '突触后：ACh 受体减少（每个量子产生的 EPP 变小）。突触前：释放概率 p 降低。映射为示意。', en: 'Postsynaptic: fewer ACh receptors (smaller EPP per quantum). Presynaptic: lower release probability p. Mapping is illustrative.' } },
      ],
    },
  ];
}

export function trainLabel(x, c) {
  if (c.protocol === 'exercise') return x.label === 'pre' ? L('运动前', 'Before') : L('运动后\n（即刻）', 'After\n(immediately)');
  if (x.min === null || x.min === undefined) return L('运动前', 'Baseline');
  return L(`运动后 ${x.min} 分`, `${x.min} min after`);
}

export function scopeTitle(r, c) {
  if (c.protocol === 'rapid') return L('高频 RNS：50 Hz，真实时间轴（每 20 ms 一次 CMAP）；虚线 = 正常', 'Rapid RNS: 50 Hz on a real time axis (one CMAP every 20 ms); dashed = normal');
  if (c.protocol === 'slow') return L('低频 RNS 3 Hz：10 个 CMAP 依次排列（每格 25 ms，实际间隔 333 ms）；虚线 = 正常', 'Slow RNS 3 Hz: 10 CMAPs side by side (25 ms per slot; real interval 333 ms); dashed = normal');
  if (c.protocol === 'exercise') return L('10 秒最大用力前后的单次超强刺激 CMAP（每格 25 ms）', 'Single supramaximal CMAP before and after 10 s of maximal exercise (25 ms per slot)');
  return L('1 分钟运动前后各时间点的 3 Hz 序列（每格一次反应）', '3 Hz trains before and at each minute after 1 min of exercise (one response per slot)');
}
export function rnsLegend(c) {
  return L('每个 CMAP 都由同一块模型肌肉产生：只改变每次刺激时达到阈值的纤维比例。横轴为“依次排列”的显示，不是连续时间（高频方案除外）。', 'Every CMAP comes from the same model muscle; only the fraction of fibres reaching threshold changes between stimuli. The horizontal axis lines responses up side by side (except rapid RNS, which is real time).');
}
export function sfLegend() {
  return L('触发在纤维 1 上；纤维 2 的位置变化 = 抖动（两个终板传递时间之差的变化）。', 'Triggered on fibre 1; the wander of fibre 2 = jitter (variation in the difference of the two endplates’ transmission times).');
}
export function microLegend(r) {
  return L('微观：m = p·n 个量子释放；EPP = m × 每量子电位 × 受体因子；EPP ≥ 阈值则肌纤维兴奋（p.57–59）。数值为教科书示教模型。', 'Micro: m = p·n quanta are released; EPP = m × per-quantum potential × receptor factor; the fibre fires when EPP ≥ threshold (p.57–59). Numbers follow the textbook teaching model.');
}
export function mesoLegend() {
  return L('中观：按“安全系数”（EPP 增益）排列的 24 组肌纤维。柱 = 当前刺激下的 EPP，虚线 = 阈值；红色 = 该组多数纤维传递失败。', 'Meso: 24 fibre groups ordered by safety factor (EPP gain). Bars = EPP at the current stimulus, dashed = threshold; red = most fibres in the group fail.');
}
export function macroLegend(c) {
  return c.protocol === 'slow'
    ? L('宏观：每次刺激的 CMAP 波幅（% 第 1 次）。教科书：低频递减 &gt;10% 为异常（p.64）；最低点常在第 4 次，之后因动员储备而回升（“U 形”）。', 'Macro: CMAP amplitude per stimulus (% of the first). Textbook: a slow-RNS decrement &gt;10% is abnormal (p.64); the lowest is usually the 4th, then recovery from mobilization (“U shape”).')
    : L('宏观：CMAP 波幅相对第 1 次的变化。教科书：≤40% 可为正常人的假性易化；40–100% 可疑；&gt;100% 多见于突触前病变（p.65）。', 'Macro: CMAP amplitude relative to the first. Textbook: ≤40% can be pseudofacilitation in normals; 40–100% equivocal; &gt;100% often presynaptic (p.65).');
}
export function mesoSfLegend() {
  return L('中观：EPP 的随机波动（量子数波动）与达阈时间的关系。EPP 越接近阈值，曲线越陡 → 同样的波动产生更大的抖动；低于阈值 = 阻滞。', 'Meso: random EPP fluctuation (quantal content) vs time to threshold. The closer the EPP is to threshold, the steeper the curve → the same fluctuation gives more jitter; below threshold = blocking.');
}
export function macroSfLegend() {
  return L('宏观：100 次连续放电的电位间间隔（IPI）。MCD = 相邻 IPI 差值绝对值的平均（p.659）。× = 阻滞。', 'Macro: interpotential interval (IPI) over 100 consecutive discharges. MCD = mean absolute difference of consecutive IPIs (p.659). × = blocking.');
}

function axes(ctx, x0, y0, x1, y1, th) {
  ctx.strokeStyle = th.gridMajor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x0, y1);
  ctx.lineTo(x1, y1);
  ctx.stroke();
}

export function drawTrainPlot(ctx, w, h, r, c, k, lang) {
  const th = theme();
  const x0 = 54;
  const x1 = w - 16;
  const y0 = 26;
  const y1 = h - 40;
  axes(ctx, x0, y0, x1, y1, th);
  const trains = r.trains;
  const maxPct = c.protocol === 'slow' || c.protocol === 'exhaust' ? 110 : Math.max(150, ...trains.flatMap((t) => t.amps.map((a) => (100 * a) / trains[0].amps[0]))) * 1.08;
  const yOf = (p) => y1 - ((y1 - y0) * p) / maxPct;
  for (const g of [0, 50, 100, maxPct > 200 ? 200 : null, maxPct > 400 ? 400 : null].filter((v) => v !== null)) {
    ctx.strokeStyle = th.grid;
    ctx.beginPath();
    ctx.moveTo(x0, yOf(g));
    ctx.lineTo(x1, yOf(g));
    ctx.stroke();
    txt(ctx, `${g}%`, x0 - 6, yOf(g) + 4, th.muted, 'right', 10);
  }
  if (c.protocol === 'slow' || c.protocol === 'exhaust') {
    ctx.strokeStyle = th.bad;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(x0, yOf(90));
    ctx.lineTo(x1, yOf(90));
    ctx.stroke();
    ctx.setLineDash([]);
    txt(ctx, L('递减 10%（p.64）', '10% decrement (p.64)'), x1, yOf(90) - 4, th.bad, 'right', 10, 600);
  } else {
    for (const [v, lab] of [
      [140, L('+40%（p.65）', '+40% (p.65)')],
      [200, L('+100%（p.65）', '+100% (p.65)')],
    ]) {
      if (v > maxPct) continue;
      ctx.strokeStyle = th.bad;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(x0, yOf(v));
      ctx.lineTo(x1, yOf(v));
      ctx.stroke();
      ctx.setLineDash([]);
      txt(ctx, lab, x1, yOf(v) - 4, th.bad, 'right', 10, 600);
    }
  }
  if (c.protocol === 'exhaust' || c.protocol === 'exercise') {
    // grouped bars: one group per train
    const groups = trains.length;
    const gw = (x1 - x0) / groups;
    trains.forEach((t, gi) => {
      const base = trains[0].amps[0];
      const n = t.amps.length;
      const bw = Math.max(2, (gw * 0.8) / n);
      t.amps.forEach((a, i) => {
        const p = (100 * a) / base;
        ctx.fillStyle = withAlpha(th.trace, 0.75);
        ctx.fillRect(x0 + gi * gw + gw * 0.1 + i * bw, yOf(p), bw - 1, y1 - yOf(p));
      });
      txt(ctx, trainLabel(t, c).replace('\n', ' '), x0 + gi * gw + gw / 2, y1 + 14, th.ink, 'center', 10, 600);
      if (c.protocol === 'exhaust') txt(ctx, `${t.dec.toFixed(0)}%`, x0 + gi * gw + gw / 2, y1 + 27, t.dec > PV.decrementCut ? th.bad : th.muted, 'center', 10, 700);
    });
    txt(ctx, c.protocol === 'exhaust' ? L('CMAP 波幅（% 运动前第 1 次）；下方 = 递减', 'CMAP amplitude (% of baseline #1); below = decrement') : L('CMAP 波幅（% 运动前）', 'CMAP amplitude (% of pre-exercise)'), x0, 16, th.muted, 'left', 10.5, 600);
    return;
  }
  const t = trains[0];
  const n = t.amps.length;
  const bw = (x1 - x0) / n;
  const tn = r.trainsN[0];
  t.amps.forEach((a, i) => {
    const p = (100 * a) / t.amps[0];
    ctx.fillStyle = i === k ? th.highlight : withAlpha(th.trace, 0.75);
    ctx.fillRect(x0 + i * bw + bw * 0.15, yOf(p), bw * 0.7, y1 - yOf(p));
    if (n <= 12) txt(ctx, `${i + 1}`, x0 + i * bw + bw / 2, y1 + 14, th.muted, 'center', 10);
  });
  // normal reference line
  ctx.strokeStyle = th.normal;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  tn.amps.forEach((a, i) => {
    const x = x0 + i * bw + bw / 2;
    const y = yOf((100 * a) / tn.amps[0]);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.setLineDash([]);
  txt(ctx, L(`CMAP 波幅（% 第 1 次）；第 1 次 = ${fmt(t.amps[0], 1)} mV（正常 ${fmt(tn.amps[0], 1)} mV）；虚线 = 正常`, `CMAP amplitude (% of #1); #1 = ${fmt(t.amps[0], 1)} mV (normal ${fmt(tn.amps[0], 1)} mV); dashed = normal`), x0, 16, th.muted, 'left', 10.5, 600);
  txt(ctx, L('刺激序号', 'stimulus number'), (x0 + x1) / 2, h - 8, th.muted, 'center', 10);
}

export function drawSafetyClasses(ctx, w, h, r, k, lang) {
  const th = theme();
  const st = r.trains[0].res[k];
  const classes = gainClasses();
  const x0 = 54;
  const x1 = w - 16;
  const y0 = 30;
  const y1 = h - 34;
  axes(ctx, x0, y0, x1, y1, th);
  const maxE = 60;
  const yOf = (v) => y1 - ((y1 - y0) * Math.min(maxE, v)) / maxE;
  for (const g of [0, 15, 30, 45, 60]) txt(ctx, `${g}`, x0 - 6, yOf(g) + 4, th.muted, 'right', 10);
  const bw = (x1 - x0) / classes.length;
  classes.forEach((g, i) => {
    const e = st.epp * g;
    const f = st.fire[i];
    ctx.fillStyle = f > 0.5 ? withAlpha(th.good, 0.65) : withAlpha(th.bad, 0.7);
    ctx.fillRect(x0 + i * bw + 1, yOf(e), bw - 2, y1 - yOf(e));
  });
  ctx.strokeStyle = th.ink;
  ctx.setLineDash([5, 3]);
  ctx.beginPath();
  ctx.moveTo(x0, yOf(PV.eppThresholdMv));
  ctx.lineTo(x1, yOf(PV.eppThresholdMv));
  ctx.stroke();
  ctx.setLineDash([]);
  txt(ctx, L(`阈值 ${PV.eppThresholdMv} mV`, `threshold ${PV.eppThresholdMv} mV`), x1, yOf(PV.eppThresholdMv) - 4, th.ink, 'right', 10, 600);
  txt(ctx, L(`第 ${k + 1} 次刺激：各组纤维的 EPP（mV）；${Math.round(st.frac * 100)}% 纤维兴奋`, `Stimulus #${k + 1}: EPP per fibre group (mV); ${Math.round(st.frac * 100)}% of fibres fire`), x0, 18, th.muted, 'left', 10.5, 600);
  txt(ctx, L('← 安全系数低  ·  高 →', '← low safety factor  ·  high →'), (x0 + x1) / 2, h - 12, th.muted, 'center', 10);
}

export function drawEppToThreshold(ctx, w, h, r, lang) {
  const th = theme();
  const x0 = 54;
  const x1 = w - 16;
  const y0 = 26;
  const y1 = h - 38;
  axes(ctx, x0, y0, x1, y1, th);
  const eMax = 45;
  const tMax = 1.2;
  const xOf = (e) => x0 + ((x1 - x0) * e) / eMax;
  const yOf = (t) => y1 - ((y1 - y0) * Math.min(tMax, t)) / tMax;
  const thr = PV.eppThresholdMv;
  // time-to-threshold curve
  ctx.strokeStyle = th.ink;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  let first = true;
  for (let e = thr + 0.05; e <= eMax; e += 0.1) {
    const t = -SF_K.riseTauMs * Math.log(1 - thr / e);
    if (first) ctx.moveTo(xOf(e), yOf(t));
    else ctx.lineTo(xOf(e), yOf(t));
    first = false;
  }
  ctx.stroke();
  // block zone
  ctx.fillStyle = withAlpha(th.bad, 0.1);
  ctx.fillRect(x0, y0, xOf(thr) - x0, y1 - y0);
  txt(ctx, L('阻滞', 'block'), (x0 + xOf(thr)) / 2, y0 + 14, th.bad, 'center', 10.5, 700);
  // distributions (normal and current)
  const gauss = (mu, sd, color, label) => {
    ctx.strokeStyle = color;
    ctx.fillStyle = withAlpha(color, 0.15);
    ctx.beginPath();
    ctx.moveTo(xOf(Math.max(0, mu - 4 * sd)), y1);
    for (let e = Math.max(0, mu - 4 * sd); e <= Math.min(eMax, mu + 4 * sd); e += 0.1) ctx.lineTo(xOf(e), y1 - 40 * Math.exp(-((e - mu) ** 2) / (2 * sd * sd)));
    ctx.lineTo(xOf(Math.min(eMax, mu + 4 * sd)), y1);
    ctx.fill();
    ctx.stroke();
    txt(ctx, label, xOf(mu), y1 - 46, color, 'center', 10, 700);
  };
  gauss(r.sfN.epp, r.sfN.eppSd, th.normal, L('正常', 'normal'));
  if (r.c.disease !== 'normal') gauss(r.sf.epp, r.sf.eppSd, th.bad, L('当前', 'current'));
  for (const e of [15, 20, 30, 40]) txt(ctx, `${e}`, xOf(e), y1 + 14, th.muted, 'center', 10);
  for (const t of [0, 0.4, 0.8, 1.2]) txt(ctx, `${t}`, x0 - 6, yOf(t) + 4, th.muted, 'right', 10);
  txt(ctx, L('EPP（mV）', 'EPP (mV)'), (x0 + x1) / 2, h - 8, th.muted, 'center', 10);
  txt(ctx, L('达阈时间（ms）；曲线 = EPP 指数上升达阈所需时间（示意 τ）', 'Time to threshold (ms); curve = time for an exponentially rising EPP to reach threshold (illustrative τ)'), x0, 16, th.muted, 'left', 10.5, 600);
}

export function drawIpiPlot(ctx, w, h, r, lang) {
  const th = theme();
  const x0 = 54;
  const x1 = w - 16;
  const y0 = 26;
  const y1 = h - 34;
  axes(ctx, x0, y0, x1, y1, th);
  const vals = r.sf.ipi.filter((v) => v !== null);
  const valsN = r.sfN.ipi.filter((v) => v !== null);
  const all = [...vals, ...valsN];
  const mid = valsN.reduce((s, v) => s + v, 0) / valsN.length;
  const span = Math.max(0.15, ...all.map((v) => Math.abs(v - mid))) * 1.15;
  const yOf = (v) => (y0 + y1) / 2 - ((v - mid) / span) * ((y1 - y0) / 2);
  const n = r.sf.ipi.length;
  const xOf = (i) => x0 + ((x1 - x0) * (i + 0.5)) / n;
  r.sfN.ipi.forEach((v, i) => {
    if (v === null) return;
    ctx.fillStyle = withAlpha(th.normal, 0.8);
    ctx.fillRect(xOf(i) - 1.5, yOf(v) - 1.5, 3, 3);
  });
  r.sf.ipi.forEach((v, i) => {
    if (v === null) {
      txt(ctx, '×', xOf(i), y1 - 4, th.bad, 'center', 10, 700);
      return;
    }
    ctx.fillStyle = th.trace;
    ctx.beginPath();
    ctx.arc(xOf(i), yOf(v), 2.2, 0, Math.PI * 2);
    ctx.fill();
  });
  for (const d of [-span, 0, span]) txt(ctx, `${d >= 0 ? '+' : ''}${(d * 1000).toFixed(0)} µs`, x0 - 4, yOf(mid + d) + 4, th.muted, 'right', 9.5);
  txt(ctx, L(`IPI 相对正常均值的偏移；蓝点 = 当前（MCD ${fmt(r.sf.mcd, 0)} µs），灰点 = 正常（MCD ${fmt(r.sfN.mcd, 0)} µs）`, `IPI offset from the normal mean; blue = current (MCD ${fmt(r.sf.mcd, 0)} µs), grey = normal (MCD ${fmt(r.sfN.mcd, 0)} µs)`), x0, 16, th.muted, 'left', 10.5, 600);
  txt(ctx, L('放电序号 1 → 100', 'discharge 1 → 100'), (x0 + x1) / 2, h - 10, th.muted, 'center', 10);
}

function chainRNS(r, c) {
  const t = r.trains[0];
  const f = diseaseFactors(c.disease, c.severity);
  const lesion = {
    normal: L('正常神经肌肉接头。', 'Normal neuromuscular junction.'),
    mg: L(`突触后 ACh 受体减少（模型：受体因子 ${fmt(f.receptor, 2)}）。`, `Fewer postsynaptic ACh receptors (model receptor factor ${fmt(f.receptor, 2)}).`),
    lems: L(`突触前电压门控钙通道受损 → 释放概率 p 降低（模型 ×${fmt(f.release, 2)}）。`, `Presynaptic voltage-gated Ca channels impaired → lower release probability p (model ×${fmt(f.release, 2)}).`),
    botulism: L(`突触前 ACh 释放受阻（模型：p ×${fmt(f.release, 2)}）。`, `Presynaptic ACh release blocked (model: p ×${fmt(f.release, 2)}).`),
    reinn: L(`再支配早期的不成熟终板，安全系数低（模型：受体因子 ${fmt(f.receptor, 2)}）。`, `Immature endplates early in reinnervation with a low safety factor (model receptor factor ${fmt(f.receptor, 2)}).`),
  }[c.disease];
  const first = t.res[0];
  const phys = L(`第 1 次刺激：m = p·n = ${first.p.toFixed(2)} × ${first.n.toFixed(0)} = ${first.m.toFixed(0)} 个量子 → 典型纤维 EPP ${first.epp.toFixed(1)} mV（阈值 ${PV.eppThresholdMv} mV）。`, `Stimulus 1: m = p·n = ${first.p.toFixed(2)} × ${first.n.toFixed(0)} = ${first.m.toFixed(0)} quanta → typical-fibre EPP ${first.epp.toFixed(1)} mV (threshold ${PV.eppThresholdMv} mV).`);
  const src = {
    slow: L('3 Hz：钙在两次刺激间已清除（&gt;100 ms），p 不升高；可释放储备 n 逐次下降，1–2 s 后动员储备补充（p.58–59）。安全系数低的纤维先掉到阈值以下 → 不再参与 CMAP。', '3 Hz: Ca is cleared between stimuli (&gt;100 ms), so p does not rise; the available store n falls with each stimulus and the mobilization store resupplies after 1–2 s (p.58–59). Fibres with a low safety factor drop below threshold first → they leave the CMAP.'),
    rapid: L('50 Hz：钙来不及清除而累积 → p 升高，同时 n 消耗（p.60）。原本低于阈值的纤维可被“救回” → 递增；正常人则主要是同步化带来的假性易化（p.61–62）。', '50 Hz: Ca accumulates faster than it is cleared → p rises while n is consumed (p.60). Fibres below threshold can be recruited back → increment; in normals mainly pseudofacilitation from better synchrony (p.61–62).'),
    exercise: L('短暂最大用力（30–50 Hz 放电）相当于一次高频刺激：运动后即刻释放增强（运动后易化，p.60）。', 'Brief maximal exercise (firing 30–50 Hz) acts like rapid stimulation: release is enhanced right afterwards (postexercise facilitation, p.60).'),
    exhaust: L('1 分钟运动后即刻易化，2–4 分钟出现“运动后衰竭”：低频递减加重（p.60）。衰竭的时间形状为示意。', 'After 1 min of exercise: facilitation immediately, then “postexercise exhaustion” at 2–4 min with a worse slow-RNS decrement (p.60). The exhaustion time course is illustrative.'),
  }[c.protocol];
  let wf;
  if (c.protocol === 'slow') wf = L(`第 1 次 CMAP ${fmt(t.amps[0], 1)} mV（正常 ${fmt(r.ref, 1)}），递减 ${fmt(t.dec, 0)}%；最低在第 ${t.amps.slice(0, 6).indexOf(Math.min(...t.amps.slice(0, 6))) + 1} 次。`, `CMAP #1 ${fmt(t.amps[0], 1)} mV (normal ${fmt(r.ref, 1)}), decrement ${fmt(t.dec, 0)}%; lowest at #${t.amps.slice(0, 6).indexOf(Math.min(...t.amps.slice(0, 6))) + 1}.`);
  else if (c.protocol === 'rapid') wf = L(`第 1 次 ${fmt(t.amps[0], 1)} mV → 最高 ${fmt(Math.max(...t.amps), 1)} mV（递增 ${fmt(t.inc, 0)}%），最后一次 ${fmt(t.amps[t.amps.length - 1], 1)} mV。`, `#1 ${fmt(t.amps[0], 1)} mV → peak ${fmt(Math.max(...t.amps), 1)} mV (increment ${fmt(t.inc, 0)}%), last ${fmt(t.amps[t.amps.length - 1], 1)} mV.`);
  else if (c.protocol === 'exercise') wf = L(`运动前 ${fmt(r.trains[0].amps[0], 1)} mV → 运动后 ${fmt(r.trains[1].amps[0], 1)} mV（${r.exInc >= 0 ? '+' : ''}${fmt(r.exInc, 0)}%）。`, `Before ${fmt(r.trains[0].amps[0], 1)} mV → after ${fmt(r.trains[1].amps[0], 1)} mV (${r.exInc >= 0 ? '+' : ''}${fmt(r.exInc, 0)}%).`);
  else wf = L(`递减：运动前 ${fmt(r.trains[0].dec, 0)}%，运动后 ${r.trains.slice(1).map((x) => `${x.min} 分 ${fmt(x.dec, 0)}%`).join('、')}。`, `Decrement: baseline ${fmt(r.trains[0].dec, 0)}%, after exercise ${r.trains.slice(1).map((x) => `${x.min} min ${fmt(x.dec, 0)}%`).join(', ')}.`);
  let interp;
  const lowBase = t.amps[0] < 0.6 * r.ref;
  if (c.disease === 'normal') interp = L('正常：低频无递减；高频或运动后最多为假性易化（≤40%，面积基本不变，p.61–62）。', 'Normal: no decrement at slow rates; at most pseudofacilitation with rapid RNS or exercise (≤40%, area roughly unchanged, p.61–62).');
  else if (lowBase) interp = L('静息 CMAP 低 + 低频递减 + 高频/运动后显著递增（常 &gt;100%）→ 突触前模式（p.65, p.268）。', 'Low resting CMAP + slow-RNS decrement + marked increment after rapid RNS/exercise (often &gt;100%) → presynaptic pattern (p.65, p.268).');
  else if (c.protocol === 'slow' && t.dec > PV.decrementCut) interp = L('CMAP 正常 + 低频递减 &gt;10% → 符合突触后病变（如 MG）；但递减也见于运动神经元病/再支配、肌强直与代谢性肌病（p.65）。', 'Normal CMAP + slow-RNS decrement &gt;10% → consistent with a postsynaptic disorder (e.g. MG); but decrements also occur in MND/reinnervation, myotonic and metabolic myopathies (p.65).');
  else interp = L('此方案下改变不明显；可换低频方案、近端肌或运动后衰竭方案提高检出（p.62–63）。', 'Little change with this protocol; slow RNS, proximal muscles or the exhaustion protocol raise the yield (p.62–63).');
  return [lesion, phys, src, wf, interp];
}

function chainSF(r, c) {
  const s = r.sf;
  return [
    L(`${L(DISEASES[c.disease])}；同一运动单位的两根肌纤维。`, `${L(DISEASES[c.disease])}; two muscle fibres of one motor unit.`),
    L(`约 10 Hz 随意放电时每次释放约 ${s.m.toFixed(0)} 个量子，量子数随机波动 → EPP ${s.epp.toFixed(1)} ± ${s.eppSd.toFixed(1)} mV（阈值 ${PV.eppThresholdMv} mV）。`, `At ≈10 Hz voluntary firing each impulse releases ≈${s.m.toFixed(0)} quanta with random variation → EPP ${s.epp.toFixed(1)} ± ${s.eppSd.toFixed(1)} mV (threshold ${PV.eppThresholdMv} mV).`),
    L('EPP 达到阈值所需的时间取决于 EPP 大小；接近阈值时曲线最陡 → 传递时间变异变大；低于阈值则不产生动作电位（p.658）。', 'The time for the EPP to reach threshold depends on its size; near threshold the curve is steepest → transmission time varies more; below threshold no action potential (p.658).'),
    L(`电极记录两根纤维的电位；电位间间隔的变化 = 抖动：MCD ${fmt(s.mcd, 0)} µs（正常模型 ${fmt(r.sfN.mcd, 0)} µs），阻滞 ${s.blockPct.toFixed(0)}%。`, `The electrode records both fibres; the variation of the interpotential interval = jitter: MCD ${fmt(s.mcd, 0)} µs (normal model ${fmt(r.sfN.mcd, 0)} µs), blocking ${s.blockPct.toFixed(0)}%.`),
    L('抖动增加提示 NMJ 传递不稳定；阻滞与无力相关，通常在 MCD &gt;80–100 µs 时出现（p.658, 660）。SFEMG 不能区分 MG 与 LEMS（p.662），也见于肌病与再支配（p.681, 250）——敏感但不特异。', 'Increased jitter means insecure NMJ transmission; blocking correlates with weakness and usually appears when MCD &gt;80–100 µs (p.658, 660). SFEMG cannot separate MG from LEMS (p.662) and is also abnormal in myopathy and reinnervation (p.681, 250) — sensitive but not specific.'),
  ];
}

export function explain(r, c) {
  if (r.study === 'sfemg') {
    return {
      chain: chainSF(r, c),
      measures: {
        cols: [L('正常模型', 'Normal model'), L('当前', 'Current')],
        rows: [
          { label: 'MCD', unit: 'µs', vals: [r.sfN.mcd, r.sf.mcd], digits: 0, hl: true },
          { label: L('阻滞', 'Blocking'), unit: '%', vals: [r.sfN.blockPct, r.sf.blockPct], digits: 0, flag: ['', r.sf.blockPct > 0 ? 'bad' : ''] },
          { label: L('平均 EPP', 'Mean EPP'), unit: 'mV', vals: [r.sfN.epp, r.sf.epp], digits: 1 },
          { label: L('EPP / 阈值（安全系数）', 'EPP / threshold (safety factor)'), vals: [r.sfN.epp / PV.eppThresholdMv, r.sf.epp / PV.eppThresholdMv], digits: 2 },
        ],
        note: L('MCD 由 100 次模拟放电计算（教科书：50–100 次，p.659）。正常值依年龄与肌肉而异（表 37.3，本应用不复制）；此处只与同一模型的正常状态比较。EPP 上升时间常数为示意参数。', 'MCD from 100 simulated discharges (textbook: 50–100, p.659). Normal limits depend on age and muscle (Table 37.3, not reproduced here); compare only with the same model’s normal state. The EPP rise time constant is illustrative.'),
      },
      caveat: L('<p>SFEMG 需要把低频滤波提高到 500–1000 Hz，记录针尖 200–300 µm 内的纤维（p.659）。异常定义：平均 MCD 超过正常上限或 &gt;10% 的纤维对超限（p.660）。抖动增加本身没有临床对应，阻滞才与无力相关（p.658）。</p>', '<p>SFEMG raises the low-frequency filter to 500–1000 Hz and records fibres within 200–300 µm of the tip (p.659). Abnormal: mean MCD above the limit, or &gt;10% of pairs above it (p.660). Increased jitter alone has no clinical correlate; blocking correlates with weakness (p.658).</p>'),
      sources: L('来源：p.57–60, 250, 658–662, 681。', 'Sources: p.57–60, 250, 658–662, 681.'),
    };
  }
  const t = r.trains[0];
  const rows = [
    { label: L('第 1 次 CMAP', 'CMAP #1'), unit: 'mV', vals: [r.ref, t.amps[0]], digits: 1, hl: true, flag: ['', t.amps[0] < 0.6 * r.ref ? 'bad' : ''] },
  ];
  if (c.protocol === 'slow' || c.protocol === 'exhaust') rows.push({ label: L('递减（第 1→最低，前 5 次）', 'Decrement (#1 → lowest of first 5)'), unit: '%', vals: [r.trainsN[0].dec, t.dec], digits: 0, flag: ['', t.dec > PV.decrementCut ? 'bad' : ''] });
  if (c.protocol === 'rapid') rows.push({ label: L('递增（最高 vs 第 1 次）', 'Increment (highest vs #1)'), unit: '%', vals: [r.trainsN[0].inc, t.inc], digits: 0, flag: ['', t.inc > PV.incrementPresyn ? 'bad' : t.inc > PV.incrementPseudo ? 'warn' : ''] });
  if (c.protocol === 'rapid') rows.push({ label: L('最后一次 / 第 1 次', 'Last / first'), unit: '%', vals: [(100 * r.trainsN[0].amps.at(-1)) / r.trainsN[0].amps[0], (100 * t.amps.at(-1)) / t.amps[0]], digits: 0 });
  if (c.protocol === 'exercise') rows.push({ label: L('运动后变化', 'Change after exercise'), unit: '%', vals: [(100 * (r.trainsN[1].amps[0] - r.trainsN[0].amps[0])) / r.trainsN[0].amps[0], r.exInc], digits: 0, flag: ['', r.exInc > PV.incrementPresyn ? 'bad' : r.exInc > PV.incrementPseudo ? 'warn' : ''] });
  if (c.protocol === 'exhaust') r.trains.slice(1).forEach((x, i) => rows.push({ label: L(`递减：运动后 ${x.min} 分`, `Decrement: ${x.min} min after`), unit: '%', vals: [r.trainsN[i + 1].dec, x.dec], digits: 0, flag: ['', x.dec > PV.decrementCut ? 'bad' : ''] }));
  return {
    chain: chainRNS(r, c),
    measures: {
      cols: [L('正常', 'Normal'), L('当前', 'Current')],
      rows,
      note: L('递减 % = (基线 − 最低)/基线；递增 % = (最高 − 基线)/基线（p.64–65）。判读界限（10%、40%、100%）来自教科书；CMAP 均由生成波形测得。', 'Decrement % = (baseline − lowest)/baseline; increment % = (highest − baseline)/baseline (p.64–65). Cut-offs (10%, 40%, 100%) are from the textbook; CMAPs are measured from the generated waveforms.'),
    },
    caveat: L('<p>技术要点（p.62–63）：刺激必须超强（次强刺激会造成假递减/递增）；肢体固定；肢体温度 ≥33 °C（冷却减轻递减）；检查前停用溴吡斯的明 3–4 小时；近端肌检出率更高。递减并非 NMJ 病特有：运动神经元病/失神经–再支配、肌强直与代谢性肌病也可出现（p.65）。肉毒中毒的递增通常小于 LEMS。</p>', '<p>Technique (p.62–63): stimuli must be supramaximal (submaximal stimulation causes false decrement/increment); immobilise the limb; keep it ≥33 °C (cooling lessens the decrement); hold pyridostigmine 3–4 h; proximal muscles have higher yield. A decrement is not unique to NMJ disease: MND/denervation–reinnervation, myotonic and metabolic myopathies can show it (p.65). Increments in botulism are usually smaller than in LEMS.</p>'),
    sources: L('来源：p.57–65, 268。', 'Sources: p.57–65, 268.'),
  };
}

export function why(prev, cur) {
  const k = prev.changed;
  const t = {
    disease: L('换了病变：改变的是 NMJ 的哪一侧——突触后（受体因子）或突触前（释放概率 p）。', 'Changed the disorder: which side of the NMJ is affected — postsynaptic (receptor factor) or presynaptic (release probability p).'),
    severity: L('改变了严重度：安全系数随之改变，更多（或更少）纤维落在阈值附近。', 'Changed severity: the safety factor changes, so more (or fewer) fibres sit near threshold.'),
    protocol: L('换了刺激方案：频率决定钙是否累积（p 升高）以及储备 n 消耗多快。', 'Changed protocol: the rate decides whether Ca accumulates (p rises) and how fast the store n is used.'),
    study: L('换了检查方法：RNS 计数“多少纤维达阈”，SFEMG 测量“达阈时间是否稳定”。', 'Changed method: RNS counts how many fibres reach threshold; SFEMG measures how stable the time to threshold is.'),
  }[k];
  return `<p>${t || L('参数已改变。', 'A parameter changed.')}</p>`;
}

export function comparePresets() {
  const base = (o) => (p) => ({ ...p, ...o });
  return [
    { key: 'normal', label: DISEASES.normal, params: base({ disease: 'normal', severity: 0 }) },
    { key: 'mg', label: { zh: 'MG（中度）', en: 'MG (moderate)' }, params: base({ disease: 'mg', severity: 0.7 }) },
    { key: 'lems', label: { zh: 'LEMS（重度）', en: 'LEMS (severe)' }, params: base({ disease: 'lems', severity: 0.8 }) },
    { key: 'botulism', label: DISEASES.botulism, params: base({ disease: 'botulism', severity: 0.7 }) },
    { key: 'reinn', label: DISEASES.reinn, params: base({ disease: 'reinn', severity: 0.7 }) },
  ];
}

export function compareExplain(list, c) {
  if (list[0].result.study === 'sfemg')
    return {
      measures: { cols: list.map((x) => L(x.preset.label)), rows: [{ label: 'MCD', unit: 'µs', vals: list.map((x) => x.result.sf.mcd), digits: 0, hl: true }, { label: L('阻滞', 'Blocking'), unit: '%', vals: list.map((x) => x.result.sf.blockPct), digits: 0 }] },
      caveat: L('<p>MG、LEMS 与再支配都可使抖动增加——SFEMG 本身不能区分它们（p.662, 681）。</p>', '<p>MG, LEMS and reinnervation can all raise jitter — SFEMG alone cannot tell them apart (p.662, 681).</p>'),
    };
  const rows = [
    { label: L('第 1 次 CMAP', 'CMAP #1'), unit: 'mV', vals: list.map((x) => x.result.trains[0].amps[0]), digits: 1, hl: true },
    { label: c.protocol === 'slow' ? L('递减', 'Decrement') : L('递增', 'Increment'), unit: '%', vals: list.map((x) => (c.protocol === 'slow' ? x.result.trains[0].dec : x.result.trains[0].inc)), digits: 0 },
  ];
  return {
    measures: { cols: list.map((x) => L(x.preset.label)), rows },
    caveat: L('<p>区分突触前与突触后，要同时看静息 CMAP、低频递减与高频/运动后递增三者（p.268）。</p>', '<p>Separating presynaptic from postsynaptic needs all three: resting CMAP, slow-RNS decrement and the increment after rapid RNS/exercise (p.268).</p>'),
  };
}

export function modelNotes() {
  return L(
    '<p>教科书示教模型：n = 1000、p = 0.2、每量子 0.2 mV、阈值 15 mV、钙清除约 100 ms、动员储备 1–2 s 后补充（p.57–60）。示意参数：储备补充时间常数（静息 0.87 s，动员后 0.45 s，钙可加速补充）、每次冲动的钙增量、p 上限 0.45、纤维 EPP 增益离散（与肌肉模型相同，均值 1、标准差 0.12）、运动后易化与衰竭的时间形状、假性易化的同步化程度（≤约 25%）、EPP 指数上升时间常数 0.25 ms（SFEMG）。疾病严重度到受体因子/释放因子的映射为示意。每次刺激的 CMAP = 各安全系数组模板 × 该组达阈比例（量子波动按二项分布近似）。</p>',
    '<p>Textbook teaching model: n = 1000, p = 0.2, 0.2 mV per quantum, threshold 15 mV, Ca clearance ≈100 ms, mobilization store resupplies after 1–2 s (p.57–60). Illustrative: store refill time constants (0.87 s at rest, 0.45 s after mobilization, faster with residual Ca), Ca increment per impulse, p ceiling 0.45, fibre EPP-gain scatter (as in the muscle model, mean 1, SD 0.12), the time courses of postexercise facilitation and exhaustion, the pseudofacilitation synchrony gain (≤≈25%), and the 0.25 ms EPP rise time constant (SFEMG). The severity → receptor/release factor mapping is illustrative. Each CMAP = Σ safety-class templates × fraction of the class reaching threshold (quantal fluctuation approximated as binomial).</p>'
  );
}
