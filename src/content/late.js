// Content and drawings for late responses (textbook Ch 4, p.41–50; p.265).
import { L } from './i18n.js';
import { fmt } from '../core/util.js';
import { PV } from '../core/params.js';
import { POS } from '../physiology/nerve.js';
import { theme, withAlpha, unitColor } from '../render/theme.js';

function txt(ctx, s, x, y, color, align = 'left', size = 10.5, weight = 500) {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px system-ui, sans-serif`;
  ctx.textAlign = align;
  ctx.fillText(s, x, y);
}

export const LATE_LESIONS = {
  none: { zh: '正常', en: 'Normal' },
  proxDemyel: { zh: '近端脱髓鞘（神经丛/根，GBS 样）', en: 'Proximal demyelination (plexus/root, GBS-like)' },
  diffuse: { zh: '弥漫性均匀减慢', en: 'Diffuse uniform slowing' },
  axonal: { zh: '前臂轴突丢失', en: 'Forearm axonal loss' },
};

export function controls(c) {
  return [
    {
      title: { zh: '晚反应', en: 'Late response' },
      items: [
        { type: 'chips', path: 'response', label: { zh: '类型', en: 'Type' }, options: [{ value: 'f', label: { zh: 'F 波', en: 'F wave' } }, { value: 'h', label: { zh: 'H 反射', en: 'H reflex' } }] },
        { type: 'chips', path: 'stim', label: { zh: '刺激部位', en: 'Stimulation site' }, options: [{ value: 'wrist', label: { zh: '腕', en: 'wrist' } }, { value: 'elbow', label: { zh: '肘', en: 'elbow' } }], help: { zh: '近端刺激：M 波潜伏期延长、F 波潜伏期缩短（p.42）。', en: 'Proximal stimulation: M latency longer, F latency shorter (p.42).' } },
        { type: 'range', path: 'intensity', label: { zh: '刺激强度（1 ms 脉冲）', en: 'Intensity (1 ms pulse)' }, min: 2, max: 46, step: 1, fmt: (v) => `${v} mA`, show: (q) => q.response === 'h', help: { zh: 'Ia 传入阈值低于运动轴突：低强度时只有 H，无 M（p.47）。强度为示意单位。', en: 'Ia afferents have a lower threshold than motor axons: at low intensity H appears without M (p.47). Intensity units are illustrative.' } },
      ],
    },
    {
      title: { zh: '病理', en: 'Pathology' },
      pathology: true,
      items: [
        { type: 'chips', path: 'lesion', label: { zh: '病变', en: 'Lesion' }, show: (q) => q.response === 'f', options: Object.entries(LATE_LESIONS).map(([value, label]) => ({ value, label })) },
        { type: 'range', path: 'severity', label: { zh: '严重度', en: 'Severity' }, min: 0.2, max: 1, step: 0.05, fmt: (v) => `${Math.round(v * 100)}%`, show: (q) => q.response === 'f' && q.lesion !== 'none' },
        { type: 'info', show: (q) => q.response === 'h', text: { zh: 'H 反射部分只演示生理机制（强度、碰撞）；病变请在 F 波部分探索。', en: 'The H-reflex part demonstrates the mechanism (intensity, collision); explore lesions with F waves.' } },
      ],
    },
  ];
}

export function fLegend() {
  return L('M 波后约 25–30 ms 的小波即 F 波：只有 1–5% 的运动神经元每次回返放电，而且每次是不同的一组（p.42–43）。', 'The small waves ≈25–30 ms after M are F waves: only 1–5% of motor neurons backfire each time, and a different set each time (p.42–43).');
}
export function hLegend() {
  return L('上：当前强度；下：超强刺激。H 反射是真正的反射（Ia 传入 → 一个突触 → 运动神经元），F 波不是（p.41, 46）。', 'Top: current intensity; bottom: supramaximal. The H reflex is a true reflex (Ia afferent → one synapse → motor neuron); the F wave is not (p.41, 46).');
}
export function fRasterLegend() {
  return L('中观：每一行是一次刺激，每一点是当次回返放电的运动单位（按大小排列）。每次只有少数、而且不同的单位。', 'Meso: each row is one stimulus, each dot a motor unit that backfired (ordered by size). Only a few, and different ones, each time.');
}
export function hCurveLegend() {
  return L('中观：H 与 M 的募集曲线。随强度增加 M 增大，H 先增后减（碰撞），超强时 H 消失（p.47–48, Fig 4.8）。', 'Meso: H and M recruitment curves. As intensity rises M grows while H first grows then falls (collision); at supramaximal H disappears (p.47–48, Fig 4.8).');
}
export function pathwayLegend(r) {
  return r.kind === 'h'
    ? L('宏观：绿色 = Ia 传入（向上）→ 脊髓突触 → 运动神经元（向下）；蓝色 = 被直接刺激的运动轴突：顺向到肌肉（M），逆向上行；两个方向相反的冲动在同一轴突相遇即相互抵消（✕ 碰撞）。示意，不按比例。', 'Macro: green = Ia afferent (up) → spinal synapse → motor neuron (down); blue = motor axons stimulated directly: orthodromic to muscle (M) and antidromic up; opposite volleys meeting in the same axon cancel (✕ collision). Schematic, not to scale.')
    : L('宏观：每条线是一根运动轴突。刺激后冲动同时向肌肉（M 波）与脊髓（逆向）传导；大多数在前角细胞处终止（•），少数回返放电（橙色）再顺向传回肌肉形成 F 波。无突触——不是反射。', 'Macro: each line is a motor axon. After the stimulus, impulses run both to the muscle (M wave) and up to the cord (antidromic); most stop at the cell body (•), a few backfire (orange) and return to the muscle as the F wave. No synapse — not a reflex.');
}

export function drawPathway(ctx, w, h, r, c, t, lang) {
  const th = theme();
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = th.panel;
  ctx.fillRect(0, 0, w, h);
  const xm = 46;
  const xc = w - 60;
  const xOf = (pos) => xm + ((pos - POS.MOTOR_POINT) / (POS.CORD - POS.MOTOR_POINT)) * (xc - xm);
  const top = 40;
  const bot = h - 30;
  // muscle and cord
  ctx.fillStyle = withAlpha(th.muscle, 0.8);
  ctx.beginPath();
  ctx.roundRect(8, top - 10, xm - 14, bot - top + 20, 8);
  ctx.fill();
  txt(ctx, L('肌肉', 'muscle'), (8 + xm - 6) / 2, top - 16, th.muscleDark, 'center', 10, 700);
  ctx.fillStyle = withAlpha(th.muted, 0.12);
  ctx.strokeStyle = th.muted;
  ctx.beginPath();
  ctx.roundRect(xc + 8, top - 10, 44, bot - top + 20, 8);
  ctx.fill();
  ctx.stroke();
  txt(ctx, L('脊髓', 'cord'), xc + 30, top - 16, th.muted, 'center', 10, 700);
  const sx = xOf(r.stimPos);
  ctx.strokeStyle = th.accent;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(sx, top - 18);
  ctx.lineTo(sx, bot + 8);
  ctx.stroke();
  txt(ctx, L('刺激', 'stim'), sx, bot + 22, th.accent, 'center', 10, 700);
  txt(ctx, L(`t = ${t.toFixed(1)} ms`, `t = ${t.toFixed(1)} ms`), w - 8, 16, th.ink, 'right', 11, 700);
  const dot = (x, y, col, rr = 4.5) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(x, y, rr, 0, Math.PI * 2);
    ctx.fill();
  };
  const lanes = r.lanes;
  const n = lanes.length + (r.kind === 'h' ? 1 : 0);
  const yOf = (i) => top + ((bot - top) * (i + 0.5)) / n;
  if (r.kind === 'h') {
    // Ia afferent lane
    const y = yOf(0);
    ctx.strokeStyle = th.sensory;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(sx, y);
    ctx.lineTo(xc + 20, y);
    ctx.stroke();
    txt(ctx, 'Ia', sx - 6, y + 4, th.sensory, 'right', 10, 700);
    const iaOn = r.cur.h.drive > 0;
    const vI = r.iaV;
    const pos = r.stimPos + vI * t;
    if (iaOn && pos < POS.CORD) dot(xOf(pos), y, th.sensory);
    const tSyn = (POS.CORD - r.stimPos) / vI;
    if (iaOn && t >= tSyn && t < tSyn + PV.hSynapseMs) txt(ctx, L('突触', 'synapse'), xc + 30, y + 4, th.sensory, 'center', 10, 700);
    lanes.forEach((ln, k) => {
      const yy = yOf(k + 1);
      ctx.strokeStyle = th.ink;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(xm, yy);
      ctx.lineTo(xc + 8, yy);
      ctx.stroke();
      txt(ctx, `MU ${ln.id}`, xc + 12, yy + 4, ln.reflex ? th.sensory : th.muted, 'left', 9, 600);
      const v = ln.v;
      // direct stimulation: orthodromic to muscle and antidromic up
      if (ln.direct) {
        const pd = r.stimPos - v * t;
        if (pd > POS.MOTOR_POINT) dot(xOf(pd), yy, th.trace);
        const pu = r.stimPos + v * t;
        // collision with the reflex volley coming down (if this unit was reflexly excited)
        if (ln.reflex) {
          const tDownStart = tSyn + PV.hSynapseMs;
          // meeting time: stim + v t = CORD - v (t - tDownStart)
          const tMeet = (POS.CORD - r.stimPos + v * tDownStart) / (2 * v);
          if (t < tMeet) {
            dot(xOf(pu), yy, th.trace);
            if (t > tDownStart) dot(xOf(POS.CORD - v * (t - tDownStart)), yy, th.sensory);
          } else txt(ctx, '✕', xOf(r.stimPos + v * tMeet), yy + 4, th.bad, 'center', 13, 800);
        } else if (pu < POS.CORD) dot(xOf(pu), yy, th.trace);
      } else if (ln.reflex) {
        const tDownStart = tSyn + PV.hSynapseMs;
        if (t > tDownStart) {
          const pd = POS.CORD - v * (t - tDownStart);
          if (pd > POS.MOTOR_POINT) dot(xOf(pd), yy, th.sensory);
        }
      }
    });
    return;
  }
  lanes.forEach((ln, k) => {
    const yy = yOf(k);
    ctx.strokeStyle = ln.dead ? withAlpha(th.muted, 0.4) : th.ink;
    ctx.lineWidth = 1.2;
    ctx.setLineDash(ln.dead ? [3, 3] : []);
    ctx.beginPath();
    ctx.moveTo(xm, yy);
    ctx.lineTo(xc + 8, yy);
    ctx.stroke();
    ctx.setLineDash([]);
    txt(ctx, `MU ${ln.id}`, xc + 12, yy + 4, ln.backfire ? th.accent : th.muted, 'left', 9, 600);
    if (ln.dead) return;
    const v = ln.v;
    // orthodromic (M)
    if (ln.mT !== null) {
      const pd = r.stimPos - ((r.stimPos - POS.MOTOR_POINT) / ln.mT) * t;
      if (t <= ln.mT) dot(xOf(pd), yy, th.trace);
    }
    // antidromic
    if (ln.up === null) {
      const stopT = (ln.stopPos - r.stimPos) / v;
      if (t < stopT) dot(xOf(r.stimPos + v * t), yy, th.trace);
      else txt(ctx, '✕', xOf(ln.stopPos), yy + 4, th.bad, 'center', 12, 800);
      return;
    }
    if (t < ln.up) dot(xOf(r.stimPos + (POS.CORD - r.stimPos) * (t / ln.up)), yy, th.trace);
    else if (!ln.backfire) dot(xc + 8, yy, th.muted, 3);
    else if (t < ln.up + PV.ahcTurnaroundMs) dot(xc + 8, yy, th.accent, 6);
    else {
      const tt = t - ln.up - PV.ahcTurnaroundMs;
      if (tt < ln.down) dot(xOf(POS.CORD - (POS.CORD - POS.MOTOR_POINT) * (tt / ln.down)), yy, th.accent);
    }
  });
}

export function drawFRaster(ctx, w, h, r, c, lang) {
  const th = theme();
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = th.panel;
  ctx.fillRect(0, 0, w, h);
  const x0 = 54;
  const x1 = w - 16;
  const y0 = 26;
  const y1 = h - 30;
  const n = r.ab.sweeps.length;
  const rowH = (y1 - y0) / n;
  r.ab.sweeps.forEach((s, k) => {
    const y = y0 + k * rowH + rowH / 2;
    txt(ctx, `#${k + 1}`, x0 - 6, y + 3, th.muted, 'right', 9);
    ctx.strokeStyle = th.grid;
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x1, y);
    ctx.stroke();
    s.units.forEach((u) => {
      ctx.fillStyle = unitColor(u.id);
      ctx.beginPath();
      ctx.arc(x0 + ((x1 - x0) * u.id) / 119, y, Math.min(5, rowH / 2.5), 0, Math.PI * 2);
      ctx.fill();
    });
    txt(ctx, `${s.units.length}`, x1 + 2, y + 3, th.muted, 'left', 9);
  });
  txt(ctx, L('回返放电的运动单位（左 = 小，右 = 大）', 'Motor units that backfired (left = small, right = large)'), x0, 16, th.muted, 'left', 10.5, 600);
}

export function drawHCurve(ctx, w, h, r, c, lang) {
  const th = theme();
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = th.panel;
  ctx.fillRect(0, 0, w, h);
  const x0 = 54;
  const x1 = w - 16;
  const y0 = 26;
  const y1 = h - 34;
  const maxA = Math.max(r.mMax, r.hMax) * 1.1;
  const xOf = (I) => x0 + ((x1 - x0) * (I - 2)) / 44;
  const yOf = (a) => y1 - ((y1 - y0) * a) / maxA;
  ctx.strokeStyle = th.gridMajor;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x0, y1);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  const line = (key, col, lab) => {
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    ctx.beginPath();
    r.curve.forEach((p, i) => (i ? ctx.lineTo(xOf(p.I), yOf(p[key])) : ctx.moveTo(xOf(p.I), yOf(p[key]))));
    ctx.stroke();
    const last = r.curve[r.curve.length - 1];
    txt(ctx, lab, xOf(last.I) - 4, yOf(last[key]) - 6, col, 'right', 10.5, 700);
  };
  line('mAmp', th.trace, 'M');
  line('hAmp', th.sensory, 'H');
  ctx.strokeStyle = th.highlight;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(xOf(c.intensity), y0);
  ctx.lineTo(xOf(c.intensity), y1);
  ctx.stroke();
  ctx.setLineDash([]);
  for (const I of [2, 10, 20, 30, 40]) txt(ctx, `${I}`, xOf(I), y1 + 14, th.muted, 'center', 10);
  txt(ctx, L('刺激强度（mA，示意）', 'intensity (mA, illustrative)'), (x0 + x1) / 2, h - 6, th.muted, 'center', 10);
  txt(ctx, L(`峰–峰波幅（mV）；H 最大 ${fmt(r.hMax, 2)} mV，H/M ${fmt((100 * r.hMax) / r.mMax, 0)}%`, `Peak-to-peak (mV); H max ${fmt(r.hMax, 2)} mV, H/M ${fmt((100 * r.hMax) / r.mMax, 0)}%`), x0, 16, th.muted, 'left', 10.5, 600);
}

export function explain(r, c) {
  if (r.kind === 'h') {
    const cur = r.cur;
    const nDirect = cur.h.direct.filter(Boolean).length;
    return {
      chain: [
        L(`正常神经；刺激强度 ${c.intensity} mA（1 ms 长脉冲）。`, `Normal nerve; intensity ${c.intensity} mA (1 ms pulse).`),
        L(`Ia 传入兴奋 ${Math.round(cur.h.drive * 100)}%；运动轴突被直接兴奋 ${nDirect}/120。`, `Ia afferents excited ${Math.round(cur.h.drive * 100)}%; motor axons excited directly ${nDirect}/120.`),
        L(`Ia 冲动上行 → 脊髓一个突触（${PV.hSynapseMs} ms，示意）→ ${cur.h.reflex.size} 个运动神经元（小者优先）放电下行；其中 ${cur.h.collided.length} 个的轴突同时被直接刺激，逆向冲动与反射冲动相遇抵消（碰撞）。`, `Ia volley up → one spinal synapse (${PV.hSynapseMs} ms, illustrative) → ${cur.h.reflex.size} motor neurons (smallest first) fire down; ${cur.h.collided.length} of them were also stimulated directly, so the antidromic and reflex volleys meet and cancel (collision).`),
        L(`M ${fmt(cur.mAmp, 2)} mV，H ${fmt(cur.hAmp, 2)} mV（潜伏期 ${r.hLat !== null ? fmt(r.hLat, 1) + ' ms' : '—'}）；H 最大 / M 最大 = ${fmt((100 * r.hMax) / r.mMax, 0)}%。`, `M ${fmt(cur.mAmp, 2)} mV, H ${fmt(cur.hAmp, 2)} mV (latency ${r.hLat !== null ? fmt(r.hLat, 1) + ' ms' : '—'}); H max / M max = ${fmt((100 * r.hMax) / r.mMax, 0)}%.`),
        L('H 反射是踝反射的电生理对应（p.49）；侧–侧潜伏期差 &gt;1.5 ms 有意义；老年人双侧缺失未必异常；上运动神经元病变时 H/M 比升高（p.49）。', 'The H reflex is the electrical counterpart of the ankle reflex (p.49); a side-to-side latency difference &gt;1.5 ms is significant; bilateral absence in the elderly is not necessarily abnormal; H/M rises with upper-motor-neuron lesions (p.49).'),
      ],
      measures: {
        cols: [L('当前', 'Current')],
        rows: [
          { label: 'M', unit: 'mV', vals: [cur.mAmp], digits: 2 },
          { label: 'H', unit: 'mV', vals: [cur.hAmp], digits: 2, hl: true },
          { label: L('H 潜伏期', 'H latency'), unit: 'ms', vals: [r.hLat ?? NaN], digits: 1 },
          { label: L('H 最大 / M 最大', 'H max / M max'), unit: '%', vals: [(100 * r.hMax) / r.mMax], digits: 0 },
          { label: L('碰撞的反射单位', 'Collided reflex units'), vals: [cur.h.collided.length], digits: 0 },
        ],
        note: L('教科书：H/M ≤50%（p.41），H 潜伏期 25–34 ms（胫–比目鱼，p.47–48）。本模型用上肢长度的模型神经，绝对潜伏期仅作示意；Ia 阈值、反射募集上限（45%）为示意参数。', 'Textbook: H/M ≤50% (p.41), H latency 25–34 ms (tibial–soleus, p.47–48). This model uses the arm-length model nerve, so absolute latencies are illustrative; Ia thresholds and the reflex recruitment ceiling (45%) are illustrative.'),
      },
      caveat: L('<p>成人常规只能在胫神经–比目鱼肌稳定引出 H 反射（p.46）。低强度时 H 可无 M 出现；强度增加时 H 因碰撞而下降，超强刺激时被 F 波取代（p.47–48）。</p>', '<p>Beyond infancy the H reflex is routinely obtained only tibial→soleus (p.46). At low intensity H appears without M; with more intensity it falls through collision and is replaced by F waves at supramaximal stimulation (p.47–48).</p>'),
      sources: L('来源：p.41, 46–49。', 'Sources: p.41, 46–49.'),
    };
  }
  const a = r.ab;
  const nm = r.nm;
  const lesion = {
    none: L('正常神经。', 'Normal nerve.'),
    proxDemyel: L(`神经丛/根段脱髓鞘：减慢 + 部分阻滞（严重度 ${Math.round(c.severity * 100)}%），远端段正常。`, `Demyelination in the plexus/root segment: slowing + partial block (severity ${Math.round(c.severity * 100)}%); distal segments normal.`),
    diffuse: L(`全长均匀减慢（严重度 ${Math.round(c.severity * 100)}%）。`, `Uniform slowing along the whole nerve (severity ${Math.round(c.severity * 100)}%).`),
    axonal: L(`前臂运动轴突丢失 ${Math.round(0.9 * c.severity * 100)}%（第 60 天）。`, `Forearm motor axon loss ${Math.round(0.9 * c.severity * 100)}% (day 60).`),
  }[c.lesion];
  const interp = {
    none: L('正常：F 波检查的是整条运动通路（含常规 NCS 达不到的近端段）。', 'Normal: the F wave tests the whole motor pathway, including proximal segments routine NCS cannot reach.'),
    proxDemyel: L('远端 NCS 可完全正常，而 F 波延长或消失——早期 GBS 的典型线索（p.46, 265）。', 'Distal NCS can be entirely normal while F waves are prolonged or absent — the classic clue in early GBS (p.46, 265).'),
    diffuse: L('F 波延长与远端减慢成比例（F 估算也延长）：多发神经病时 F 波反映全长减慢，并不提示单独的近端病变（p.44–45）。', 'F latency is prolonged in proportion to distal slowing (the F estimate is prolonged too): in polyneuropathy F waves reflect slowing along the whole nerve, not a separate proximal lesion (p.44–45).'),
    axonal: L('CMAP 降低时 F 持续率下降或引不出，但最短潜伏期基本正常（p.46）；F 波对根病不敏感（p.46）。', 'With a low CMAP, F persistence falls or F waves become unobtainable, but minimal latency stays near normal (p.46); F waves are insensitive for radiculopathy (p.46).'),
  }[c.lesion];
  return {
    chain: [
      lesion,
      L(`超强刺激使所有可兴奋的运动轴突产生双向冲动：顺向到肌肉（M），逆向到前角细胞；每次只有约 ${Math.round(PV.fBackfireFraction * 100)}% 回返放电（转折 ${PV.ahcTurnaroundMs} ms）。`, `Supramaximal stimulation sends impulses both ways in every excitable motor axon: orthodromic to muscle (M), antidromic to the anterior horn; ≈${Math.round(PV.fBackfireFraction * 100)}% backfire each time (turnaround ${PV.ahcTurnaroundMs} ms).`),
      L('回返冲动走过“刺激点→脊髓→肌肉”的全程，经过近端段两次；没有突触，所以不是反射（p.42）。', 'Backfired impulses travel stimulation site → cord → muscle, crossing the proximal segment twice; no synapse, so not a reflex (p.42).'),
      L(`M 潜伏期 ${a.mM.present ? fmt(a.mM.onset, 1) : '—'} ms；F 最短 ${a.minLat !== null ? fmt(a.minLat, 1) : '—'} ms（正常 ${nm.minLat !== null ? fmt(nm.minLat, 1) : '—'}），持续率 ${fmt(a.persistence, 0)}%，时间离散 ${a.chrono !== null ? fmt(a.chrono, 1) : '—'} ms。`, `M latency ${a.mM.present ? fmt(a.mM.onset, 1) : '—'} ms; minimal F ${a.minLat !== null ? fmt(a.minLat, 1) : '—'} ms (normal ${nm.minLat !== null ? fmt(nm.minLat, 1) : '—'}), persistence ${fmt(a.persistence, 0)}%, chronodispersion ${a.chrono !== null ? fmt(a.chrono, 1) : '—'} ms.`),
      interp,
    ],
    measures: {
      cols: [L('正常', 'Normal'), L('当前', 'Current')],
      rows: [
        { label: L('M 潜伏期', 'M latency'), unit: 'ms', vals: [nm.mM.onset, a.mM.present ? a.mM.onset : NaN], digits: 1 },
        { label: L('M 波幅', 'M amplitude'), unit: 'mV', vals: [nm.mM.amp, a.mM.present ? a.mM.amp : 0], digits: 1 },
        { label: L('F 最短潜伏期', 'F minimal latency'), unit: 'ms', vals: [nm.minLat ?? NaN, a.minLat ?? NaN], digits: 1, hl: true },
        { label: L('F 估算（腕）', 'F estimate (wrist)'), unit: 'ms', vals: [r.estN ? r.estN.est : NaN, r.est ? r.est.est : NaN], digits: 1 },
        { label: L('F 持续率', 'F persistence'), unit: '%', vals: [nm.persistence, a.persistence], digits: 0, flag: ['', a.persistence < 50 ? 'bad' : ''] },
        { label: L('时间离散', 'Chronodispersion'), unit: 'ms', vals: [nm.chrono ?? NaN, a.chrono ?? NaN], digits: 1 },
        { label: L('F 平均波幅 / M', 'Mean F / M'), unit: '%', vals: [(100 * nm.fAmpMean) / nm.mM.amp, a.mM.present ? (100 * a.fAmpMean) / a.mM.amp : NaN], digits: 1 },
      ],
      note: L(`F 估算 = (2D/CV)×10 + 1 ms + DL（p.44–45），D = 刺激点到脊髓 ${((POS.CORD - POS.WRIST) / 10).toFixed(0)} cm，CV 与 DL 由同一模型的腕/肘 CMAP 测得。持续率正常 80–100%、一般 &gt;50%（p.43）；F 波幅为 CMAP 的 1–5%（p.41–42）。模型神经长度为示意，绝对潜伏期勿与正常值表比较。`, `F estimate = (2D/CV)×10 + 1 ms + DL (p.44–45), D = ${((POS.CORD - POS.WRIST) / 10).toFixed(0)} cm from stimulus to cord, CV and DL measured from the same model’s wrist/elbow CMAPs. Persistence is normally 80–100%, generally &gt;50% (p.43); F amplitude is 1–5% of the CMAP (p.41–42). Model nerve length is illustrative; do not compare absolute latencies with normal tables.`),
    },
    caveat: L('<p>需 ≥10 次刺激（p.43）。F 波在睡眠/镇静患者可缺失（p.43）；CMAP 严重降低时无法引出（p.46）。F 波对根病不敏感，因为肌肉通常有 ≥2 个肌节支配（p.46）。</p>', '<p>Use ≥10 stimuli (p.43). F waves may be absent in sleeping/sedated patients (p.43) and cannot be obtained when the CMAP is severely reduced (p.46). They are insensitive for radiculopathy because muscles have ≥2 myotomes (p.46).</p>'),
    sources: L('来源：p.41–46, 265。', 'Sources: p.41–46, 265.'),
  };
}

export function why(prev, cur) {
  const t = {
    stim: L('只改变了刺激部位：近端刺激时到肌肉的路程更长（M 晚），到脊髓的路程更短（F 早）（p.42）。', 'Only the stimulation site changed: from a proximal site the path to the muscle is longer (later M) and to the cord shorter (earlier F) (p.42).'),
    lesion: L('换了病变：F 波穿过近端段两次，所以对近端减慢/阻滞最敏感。', 'Changed the lesion: the F wave crosses the proximal segment twice, so it is most sensitive to proximal slowing/block.'),
    severity: L('改变了严重度。', 'Changed severity.'),
    intensity: L('只改变了刺激强度：更多 Ia 被兴奋（H↑），但也更多运动轴突被直接兴奋（M↑，并与反射冲动碰撞 → H↓）。', 'Only intensity changed: more Ia afferents (H↑), but also more motor axons stimulated directly (M↑, colliding with reflex volleys → H↓).'),
    response: L('换了晚反应类型：F = 逆向–回返（无突触）；H = Ia → 突触 → 运动神经元（真反射）。', 'Changed the late response: F = antidromic backfiring (no synapse); H = Ia → synapse → motor neuron (a true reflex).'),
  }[prev.changed];
  return `<p>${t || L('参数已改变。', 'A parameter changed.')}</p>`;
}

export function modelNotes() {
  return L(
    '<p>F：每根可兴奋的运动轴突逆向传导到脊髓，以 3% 的概率（教科书 1–5%）回返放电，折返 1 ms（p.44–45），再顺向传回；F 波 = 这些单位的模板之和。近端脱髓鞘位于腋部至脊神经的长段（含阻滞），弥漫减慢作用于全长。H：80 根 Ia 传入（传导速度 68 m/s，阈值 4–14 mA，均为示意），1 ms 中枢延迟（示意），反射兴奋按大小原则募集运动神经元，最多 45%（示意）；被直接刺激的轴突中的反射冲动视为碰撞消失。</p>',
    '<p>F: each excitable motor axon conducts antidromically to the cord and backfires with probability 3% (textbook 1–5%), turnaround 1 ms (p.44–45), then returns orthodromically; the F wave = the sum of those units’ templates. Proximal demyelination spans the long axilla-to-spinal-nerve segment (with block); diffuse slowing acts along the whole nerve. H: 80 Ia afferents (68 m/s, thresholds 4–14 mA, illustrative), 1 ms central delay (illustrative), reflex drive recruits motor neurons by size up to 45% (illustrative); reflex volleys in axons that were also stimulated directly are lost by collision.</p>'
  );
}
