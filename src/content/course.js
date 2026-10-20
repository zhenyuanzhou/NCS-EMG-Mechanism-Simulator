// Content for the time-course module.
import { L } from './i18n.js';
import { fmt } from '../core/util.js';
import { theme, withAlpha } from '../render/theme.js';
import { PV } from '../core/params.js';
import { POS, LESION_SITES } from '../physiology/nerve.js';

const DAYS = [0.5, 2, 4, 7, 10, 14, 21, 30, 45, 60, 90, 120, 180, 270, 365, 540, 730];
export function dayLabel(d) {
  if (d < 1) return L('12 小时', '12 h');
  if (d < 45) return L(`${d} 天`, `day ${d}`);
  if (d < 365) return L(`${Math.round(d / 30)} 个月`, `${Math.round(d / 30)} months`);
  return L(`${(d / 365).toFixed(d % 365 ? 1 : 0)} 年`, `${(d / 365).toFixed(d % 365 ? 1 : 0)} y`);
}

export function controls(c) {
  return [
    {
      title: { zh: '病变', en: 'Lesion' },
      items: [
        {
          type: 'chips',
          path: 'kind',
          label: { zh: '类型（前臂正中神经样病灶）', en: 'Type (forearm, median-like nerve)' },
          options: [
            { value: 'partial', label: { zh: '部分轴突损伤', en: 'partial axonal' } },
            { value: 'complete', label: { zh: '完全离断', en: 'complete transection' } },
            { value: 'block', label: { zh: '脱髓鞘阻滞', en: 'demyelinating block' } },
          ],
        },
        { type: 'range', path: 'frac', label: { zh: '受损轴突比例', en: 'Axons lost' }, min: 0.2, max: 0.95, step: 0.05, fmt: (v) => `${Math.round(v * 100)}%`, show: (q) => q.kind === 'partial' },
        { type: 'range', path: 'reinnervation', label: { zh: '侧支再支配程度', en: 'Collateral reinnervation' }, min: 0, max: 1, step: 0.05, fmt: (v) => `${Math.round(v * 100)}%`, show: (q) => q.kind === 'partial' },
        { type: 'toggle', path: 'regeneration', label: { zh: '轴突自损伤处再生（≤1 mm/天）', en: 'Axonal regrowth from the injury (≤1 mm/day)' }, show: (q) => q.kind === 'complete', help: { zh: '没有存活轴突可做侧支芽生时，只能靠再生（p.255）。', en: 'With no surviving axons to sprout, regrowth is the only route (p.255).' } },
        { type: 'range', path: 'block', label: { zh: '初始阻滞比例', en: 'Initial block' }, min: 0.2, max: 0.9, step: 0.05, fmt: (v) => `${Math.round(v * 100)}%`, show: (q) => q.kind === 'block', help: { zh: '随再髓鞘化逐渐恢复（时间常数 30 天，示意）。', en: 'Recovers with remyelination (time constant 30 days, illustrative).' } },
      ],
    },
    {
      title: { zh: '病程时钟（与波形毫秒时钟分开）', en: 'Disease clock (separate from the ms waveform clock)' },
      items: [
        { type: 'steps', path: 'day', values: DAYS, label: { zh: '距损伤时间', en: 'Time since injury' }, fmt: dayLabel, help: { zh: '也可点击宏观时间轴图选择日期。', en: 'You can also click the timeline chart.' } },
        {
          type: 'chips',
          path: 'view',
          label: { zh: '查看', en: 'Show' },
          options: [
            { value: 'ncs', label: { zh: '神经传导', en: 'NCS' } },
            { value: 'rest', label: { zh: '静息 EMG', en: 'rest EMG' } },
            { value: 'muap', label: { zh: 'MUAP', en: 'MUAP' } },
          ],
        },
      ],
    },
  ];
}

export function drawTimeline(ctx, w, h, r, c, vo) {
  const th = theme();
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = th.panel;
  ctx.fillRect(0, 0, w, h);
  const left = 48;
  const right = w - 16;
  const top = 26;
  const bottom = h - 40;
  const lx0 = Math.log(0.4);
  const lx1 = Math.log(800);
  const xOf = (d) => left + ((Math.log(d) - lx0) / (lx1 - lx0)) * (right - left);
  const yOf = (pct) => bottom - (Math.min(150, Math.max(0, pct)) / 150) * (bottom - top);
  // event bands
  const band = (a, b, col, label, row) => {
    ctx.fillStyle = withAlpha(col, 0.12);
    ctx.fillRect(xOf(a), top, xOf(b) - xOf(a), bottom - top);
    ctx.fillStyle = col;
    ctx.font = '10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, (xOf(a) + xOf(b)) / 2, top - 6 - row * 0);
  };
  if (c.kind !== 'block') {
    band(PV.wallerianMotorDays[0], PV.wallerianMotorDays[1], th.motor, L('运动沃勒变性', 'motor Wallerian'), 0);
    band(PV.wallerianSensoryDays[0], PV.wallerianSensoryDays[1], th.sensory, L('感觉', 'sensory'), 0);
    const line = (d, col, label, y) => {
      ctx.strokeStyle = col;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(xOf(d), top);
      ctx.lineTo(xOf(d), bottom);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = col;
      ctx.font = '10px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(label, xOf(d) + 3, top + 12 + y * 12);
    };
    line(r.fibOnset, th.bad, L(`APB 纤颤出现 ≈${r.fibOnset.toFixed(0)} 天`, `APB fibs ≈ day ${r.fibOnset.toFixed(0)}`), 0);
    if (c.kind === 'partial') line(PV.sproutStartDays, th.good, L('侧支芽生开始（示意）', 'sprouting begins (illustr.)'), 1);
    if (c.kind === 'complete' && c.regeneration) line((LESION_SITES.forearm.a - POS.MOTOR_POINT) / 1 + 10, th.good, L('再生轴突到达肌肉（1 mm/天）', 'regrowth reaches muscle (1 mm/day)'), 1);
  }
  // axes
  ctx.strokeStyle = th.gridMajor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(left, top);
  ctx.lineTo(left, bottom);
  ctx.lineTo(right, bottom);
  ctx.stroke();
  ctx.fillStyle = th.muted;
  ctx.font = '10px system-ui, sans-serif';
  ctx.textAlign = 'right';
  for (const pct of [0, 50, 100, 150]) {
    ctx.fillText(`${pct}%`, left - 4, yOf(pct) + 3);
    ctx.strokeStyle = pct === 100 ? withAlpha(th.muted, 0.5) : th.grid;
    ctx.beginPath();
    ctx.moveTo(left, yOf(pct));
    ctx.lineTo(right, yOf(pct));
    ctx.stroke();
  }
  ctx.textAlign = 'center';
  for (const [d, lab] of [
    [1, L('1天', '1 d')],
    [7, L('1周', '1 wk')],
    [30, L('1月', '1 mo')],
    [90, L('3月', '3 mo')],
    [365, L('1年', '1 y')],
    [730, L('2年', '2 y')],
  ]) {
    ctx.fillText(lab, xOf(d), bottom + 14);
  }
  ctx.textAlign = 'left';
  ctx.fillText(L('相对于正常（%）· 对数时间轴', '% of normal · log time axis'), left, h - 6);
  // curves
  const { ref, pts } = r.curves;
  const series = [
    { key: 'cmapW', col: th.trace, lab: L('CMAP 腕', 'CMAP wrist'), f: (p) => (100 * p.cmapW) / ref.cmapW },
    { key: 'cmapE', col: th.trace, dash: [5, 3], lab: L('CMAP 肘', 'CMAP elbow'), f: (p) => (100 * p.cmapE) / ref.cmapE },
    { key: 'snap', col: th.sensory, lab: 'SNAP', f: (p) => (100 * p.snap) / ref.snap },
    { key: 'units', col: th.muted, lab: L('可随意激活单位', 'units available'), f: (p) => (100 * p.units) / ref.units },
    { key: 'dur', col: th.accent, lab: L('MUAP 时程', 'MUAP duration'), f: (p) => (p.dur ? (100 * p.dur) / ref.dur : null) },
    { key: 'fib', col: th.bad, lab: L('纤颤纤维（占全部纤维 %）', 'fibrillating fibres (% of all)'), f: (p) => (100 * p.fib) / p.nFib },
  ];
  series.forEach((s, si) => {
    ctx.strokeStyle = s.col;
    ctx.lineWidth = 2;
    ctx.setLineDash(s.dash || []);
    ctx.beginPath();
    let started = false;
    pts.forEach((p) => {
      const v = s.f(p);
      if (v === null || !Number.isFinite(v)) return;
      const x = xOf(p.day);
      const y = yOf(v);
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.setLineDash([]);
  });
  // cursor
  const cx = xOf(c.day);
  ctx.strokeStyle = th.highlight;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, top);
  ctx.lineTo(cx, bottom);
  ctx.stroke();
  ctx.fillStyle = th.ink;
  ctx.font = '600 11px system-ui, sans-serif';
  ctx.textAlign = cx > w - 90 ? 'right' : 'left';
  ctx.fillText(dayLabel(c.day), cx + (cx > w - 90 ? -5 : 5), bottom - 6);
  const legend = series.map((s) => `<span><i style="background:${s.col}${s.dash ? ';opacity:.6' : ''}"></i>${s.lab}</span>`).join('') + `<span>${L('点击图表选择日期', 'click the chart to pick a day')}</span>`;
  return {
    hits: [],
    legend,
    dayOfX: (x) => (x < left || x > right ? null : Math.exp(lx0 + ((x - left) / (right - left)) * (lx1 - lx0))),
  };
}

function stage(c) {
  const d = c.day;
  if (c.kind === 'block') return L('脱髓鞘阻滞：轴突完整，无沃勒变性；随再髓鞘化恢复。', 'Demyelinating block: axons intact, no Wallerian degeneration; recovers with remyelination.');
  if (d < 3) return L('<b>超急性（&lt;3 天）</b>：沃勒变性尚未开始（p.263）。', '<b>Hyperacute (&lt;3 days)</b>: Wallerian degeneration has not begun (p.263).');
  if (d < 14) return L('<b>急性（数天至数周）</b>：沃勒变性已完成，失神经电位尚未出现（p.263）。', '<b>Acute (days–weeks)</b>: Wallerian degeneration complete; denervation potentials not yet present (p.263).');
  if (d < 60) return L('<b>亚急性（数周）</b>：出现纤颤/正锐波，MUAP 形态仍正常（p.264）。', '<b>Subacute (weeks)</b>: fibrillations/PSWs present, MUAP morphology still normal (p.264).');
  if (d < 270) return L('<b>亚急性-慢性（数月）</b>：失神经与再支配并存，MUAP 变长、变大、多相（p.264）。', '<b>Subacute–chronic (months)</b>: denervation and reinnervation coexist; MUAPs longer, larger, polyphasic (p.264).');
  return L('<b>慢性（数月–数年）</b>：再支配完成后纤颤减少或消失，再支配 MUAP 持续存在；运动波幅可部分恢复（p.264）。', '<b>Chronic (months–years)</b>: after reinnervation fibrillations wane or vanish; reinnervated MUAPs persist; motor amplitudes may partly recover (p.264).');
}

export function explain(r, c) {
  const ref = r.curves.ref;
  const cur = r.curves.pts.find((p) => p.day === c.day) || r.curves.pts[0];
  const mw = r.nm.rows.find((x) => x.key === 'wrist').mAb;
  const me = r.nm.rows.find((x) => x.key === 'elbow').mAb;
  const sw = r.ns.rows.find((x) => x.key === 'wrist').mAb;
  const lesion =
    c.kind === 'partial'
      ? L(`前臂：${Math.round(c.frac * 100)}% 运动与感觉轴突离断；侧支再支配 ${Math.round(c.reinnervation * 100)}%。`, `Forearm: ${Math.round(c.frac * 100)}% of motor and sensory axons transected; collateral reinnervation ${Math.round(c.reinnervation * 100)}%.`)
      : c.kind === 'complete'
        ? L(`前臂：全部轴突离断${c.regeneration ? '，允许自损伤处再生' : '，无再生'}。`, `Forearm: all axons transected${c.regeneration ? ', regrowth allowed' : ', no regrowth'}.`)
        : L(`前臂：初始 ${Math.round(c.block * 100)}% 轴突传导阻滞（轴突完整）。`, `Forearm: initial conduction block of ${Math.round(c.block * 100)}% of axons (axons intact).`);
  const phys = `${stage(c)} ${L(`当前：可随意激活单位 ${cur.units}/${ref.units}，去神经纤维 ${cur.den}，其中 ${cur.fib} 根自发放电。`, `Now: ${cur.units}/${ref.units} units available, ${cur.den} denervated fibres, ${cur.fib} firing spontaneously.`)}`;
  const src = L(
    `NCS 取决于远端是否还有可兴奋的轴突与被支配的肌纤维；静息 EMG 取决于是否有去神经纤维且已过“长度依赖”的潜伏期（此肌约 ${r.fibOnset.toFixed(0)} 天，p.236）；MUAP 大小取决于每个存活单位拥有多少肌纤维。`,
    `NCS depends on whether excitable distal axons and innervated fibres remain; rest EMG on denervated fibres that have passed the length-dependent delay (≈${r.fibOnset.toFixed(0)} days for this muscle, p.236); MUAP size on how many fibres each surviving unit owns.`
  );
  const wf = L(
    `CMAP 腕 ${fmt(mw.amp, 1)} mV（正常 ${fmt(ref.cmapW, 1)}），肘 ${me.present ? fmt(me.amp, 1) : '—'} mV；SNAP ${sw.present ? fmt(sw.amp * 1000, 0) : '—'} µV（正常 ${fmt(ref.snap * 1000, 0)}）；取样 MUAP 时程 ${fmt(cur.dur, 1)} ms（正常 ${fmt(ref.dur, 1)}），波幅 ${fmt(cur.amp * 1000, 0)} µV。`,
    `CMAP wrist ${fmt(mw.amp, 1)} mV (normal ${fmt(ref.cmapW, 1)}), elbow ${me.present ? fmt(me.amp, 1) : '—'} mV; SNAP ${sw.present ? fmt(sw.amp * 1000, 0) : '—'} µV (normal ${fmt(ref.snap * 1000, 0)}); survey MUAP duration ${fmt(cur.dur, 1)} ms (normal ${fmt(ref.dur, 1)}), amplitude ${fmt(cur.amp * 1000, 0)} µV.`
  );
  let interp;
  if (c.kind === 'block') interp = L('只有跨病灶刺激异常、只有募集减少而无纤颤、MUAP 形态正常——这是纯脱髓鞘阻滞的特征；数周内恢复提示预后好（p.38, p.265）。', 'Only stimulation across the lesion is abnormal; only reduced recruitment, no fibrillations, normal MUAPs — the signature of pure demyelinating block; recovery over weeks implies a good prognosis (p.38, p.265).');
  else if (c.day < 3) interp = L('此时远端 NCS 可完全正常，跨病灶刺激下降（假性阻滞），EMG 只有募集减少——极早期检查可能低估病变；约 1 周后复查（p.263）。', 'Distal NCS can be entirely normal now, with a drop across the lesion (pseudo-block) and only reduced recruitment on EMG — a very early study underestimates the lesion; repeat after ~1 week (p.263).');
  else if (c.day < r.fibOnset) interp = L('NCS 已呈轴突丢失模式，但 EMG 静息仍安静：纤颤尚未出现，不能据此排除失神经（p.236）。', 'NCS now shows the axonal pattern but rest EMG is still quiet: fibrillations have not yet appeared, so their absence does not exclude denervation (p.236).');
  else if (c.kind === 'complete' && cur.units > 0 && cur.dur < ref.dur) interp = L('再生的“新生单位”：短小多相、不稳定，但伴严重募集减少——不要误判为肌病（p.257）。', 'Regenerating “nascent” units: small, polyphasic, unstable, but with severely reduced recruitment — do not mistake them for myopathy (p.257).');
  else interp = L('结合 NCS、自发电位、MUAP 形态与募集可估计病程：这是“时间依赖”的组合模式，而不是单一波形（p.261）。', 'Combining NCS, spontaneous activity, MUAP morphology and recruitment estimates the time course — a time-dependent pattern, not a single waveform (p.261).');
  const pct = (a, b) => (b ? (100 * a) / b : null);
  return {
    chain: [lesion, phys, src, wf, interp],
    measures: {
      cols: [L('正常', 'Normal'), dayLabel(c.day), L('% 正常', '% normal')],
      rows: [
        { label: L('CMAP 腕', 'CMAP wrist'), unit: 'mV', vals: [ref.cmapW, cur.cmapW, pct(cur.cmapW, ref.cmapW)], digits: 1, hl: true },
        { label: L('CMAP 肘', 'CMAP elbow'), unit: 'mV', vals: [ref.cmapE, cur.cmapE, pct(cur.cmapE, ref.cmapE)], digits: 1 },
        { label: 'SNAP', unit: 'µV', vals: [ref.snap * 1000, cur.snap * 1000, pct(cur.snap, ref.snap)], digits: 0 },
        { label: L('可随意激活单位', 'Units available'), vals: [ref.units, cur.units, pct(cur.units, ref.units)], digits: 0 },
        { label: L('自发放电纤维', 'Spontaneous fibres'), vals: [0, cur.fib, ''], digits: 0, flag: ['', cur.fib ? 'bad' : '', ''] },
        { label: L('取样 MUAP 时程', 'Survey MUAP duration'), unit: 'ms', vals: [ref.dur, cur.dur, pct(cur.dur, ref.dur)], digits: 1 },
        { label: L('取样 MUAP 波幅', 'Survey MUAP amplitude'), unit: 'µV', vals: [ref.amp * 1000, cur.amp * 1000, pct(cur.amp, ref.amp)], digits: 0 },
      ],
      note: L('时间轴上的曲线来自模型在 17 个时间点的计算；病程参数（芽生开始、成熟时间、再生延迟）为示意参数。', 'Timeline curves are computed by the model at 17 time points; course parameters (sprouting onset, maturation, regrowth latency) are illustrative.'),
    },
    caveat: L('<p>失神经电位的出现取决于病灶到肌肉的长度，而非固定天数：根病变时椎旁肌约 10–14 天、足部肌约 5–6 周（p.236）；靠近 NMJ 的病变（如肉毒中毒）仅需数天。慢性 &gt;6–12 个月的纤颤可变得极小（&lt;10 µV，p.234）。</p>', '<p>Denervation potentials appear after a delay set by the lesion-to-muscle length, not a fixed number of days: for a root lesion ≈10–14 days in paraspinals and 5–6 weeks in foot muscles (p.236); lesions near the NMJ (e.g. botulism) take only a few days. After &gt;6–12 months fibrillations may become tiny (&lt;10 µV, p.234).</p>'),
    sources: L('来源：p.34–35, 234–236, 255–257, 260–265。', 'Sources: p.34–35, 234–236, 255–257, 260–265.'),
  };
}

export function why(prev, cur) {
  const k = prev.changed;
  const t = {
    day: L('只移动了病程时钟：同一病灶，不同时间点。变化来自沃勒变性、失神经潜伏期、芽生与成熟/再生的时间进程。', 'Only the disease clock moved: same lesion, different time. The changes come from the timing of Wallerian degeneration, the denervation delay, sprouting and maturation/regrowth.'),
    reinnervation: L('改变了侧支再支配程度：更多孤立纤维被存活单位接管 → CMAP 部分恢复、纤颤减少、MUAP 变大；但单位数不变。', 'You changed collateral reinnervation: more orphaned fibres adopted → CMAP partly recovers, fewer fibrillations, larger MUAPs; the number of units is unchanged.'),
    frac: L('改变了受损轴突比例：影响所有下游指标的幅度。', 'You changed the fraction of axons lost: scales every downstream measure.'),
    kind: L('改变了病变类型：轴突损伤与脱髓鞘阻滞的时间进程完全不同。', 'You changed the lesion type: axonal injury and demyelinating block follow entirely different courses.'),
    regeneration: L('切换了轴突再生：没有存活轴突时，只有再生能带来再支配（新生单位）。', 'You toggled regrowth: with no surviving axons only regrowth can reinnervate (nascent units).'),
  }[k];
  const a = prev.result;
  const b = cur.result;
  let h = `<p>${t || L('参数已改变。', 'A parameter changed.')}</p>`;
  if (a && b && a.curves) {
    const pa = a.curves.pts.find((p) => p.day === a.c.day);
    const pb = b.curves.pts.find((p) => p.day === b.c.day);
    if (pa && pb) h += `<ul><li>CMAP ${fmt(pa.cmapW, 1)} → <b>${fmt(pb.cmapW, 1)}</b> mV</li><li>${L('纤颤纤维', 'fibrillating fibres')} ${pa.fib} → <b>${pb.fib}</b></li><li>${L('MUAP 时程', 'MUAP duration')} ${fmt(pa.dur, 1)} → <b>${fmt(pb.dur, 1)}</b> ms</li></ul>`;
  }
  return h;
}

export function modelNotes() {
  return L('<p>时间点上的值由完整模型重新计算（每个时间点生成新的肌肉状态）。示意参数：侧支芽生从约 25 天开始、成熟时间常数约 120 天、再生速度 1 mm/天（教科书上限，p.255）加 10 天潜伏、脱髓鞘阻滞恢复时间常数 30 天。</p>', '<p>Each time point is recomputed with the full model (a new muscle state per point). Illustrative parameters: collateral sprouting from ≈25 days, maturation constant ≈120 days, regrowth 1 mm/day (textbook upper bound, p.255) plus a 10-day latency, block recovery time constant 30 days.</p>');
}
