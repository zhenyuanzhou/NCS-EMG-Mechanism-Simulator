// Content for technical confounders (textbook p.21, 23, 26, 32–33, 78–83, 97).
import { L } from './i18n.js';
import { fmt } from '../core/util.js';
import { PV } from '../core/params.js';
import { theme, withAlpha } from '../render/theme.js';

function txt(ctx, s, x, y, color, align = 'left', size = 10.5, weight = 500) {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px system-ui, sans-serif`;
  ctx.textAlign = align;
  ctx.fillText(s, x, y);
}

const GAIN_LABEL = { motor: ['0.2 mV', '0.5 mV', '2 mV', '5 mV', '10 mV'], sensory: ['2 µV', '5 µV', '10 µV', '20 µV', '50 µV'] };

export function controls(c) {
  return [
    {
      title: { zh: '检查（患者正常，不变）', en: 'Study (the patient is normal throughout)' },
      items: [
        { type: 'chips', path: 'study', label: { zh: '检查', en: 'Study' }, options: [{ value: 'motor', label: { zh: '运动 CMAP', en: 'motor CMAP' } }, { value: 'sensory', label: { zh: '感觉 SNAP', en: 'sensory SNAP' } }] },
        { type: 'chips', path: 'stim', label: { zh: '刺激部位', en: 'Stimulation site' }, show: (q) => q.study === 'motor', options: [{ value: 'wrist', label: { zh: '腕', en: 'wrist' } }, { value: 'elbow', label: { zh: '肘', en: 'elbow' } }] },
      ],
    },
    {
      title: { zh: '技术因素（与病理控制分开）', en: 'Technical factors (kept separate from pathology)' },
      items: [
        { type: 'range', path: 'tempC', label: { zh: '肢体温度', en: 'Limb temperature' }, min: 24, max: 36, step: 1, fmt: (v) => `${v} °C`, help: { zh: '教科书：每降 1 °C，CV 慢 1.5–2.5 m/s、远端潜伏期 +0.2 ms，波幅与时程增大（p.78–79）。保持 32–34 °C。', en: 'Textbook: per 1 °C cooler, CV slows 1.5–2.5 m/s, distal latency +0.2 ms, amplitude and duration increase (p.78–79). Keep 32–34 °C.' } },
        { type: 'range', path: 'intensity', label: { zh: '刺激强度', en: 'Stimulus intensity' }, min: 4, max: 60, step: 1, fmt: (v) => (v >= 60 ? L('超强', 'supramaximal') : `${v} mA`), help: { zh: '超强 = 达到平台后再加 20–25%（p.32）。次强刺激只兴奋部分轴突。强度单位为示意。', en: 'Supramaximal = 20–25% above the plateau (p.32). Submaximal stimulation excites only some axons. Units are illustrative.' } },
        { type: 'range', path: 'offset', label: { zh: 'G1 偏离运动点', en: 'G1 off the motor point' }, min: 0, max: 30, step: 2, fmt: (v) => `${v} mm`, show: (q) => q.study === 'motor', help: { zh: '去极化不在 G1 下开始 → 起始正相、波幅降低（p.21, p.23）。', en: 'Depolarisation no longer starts under G1 → initial positivity and lower amplitude (p.21, p.23).' } },
        {
          type: 'chips',
          path: 'filter',
          label: { zh: '滤波', en: 'Filters' },
          options: [
            { value: 'standard', label: { zh: '标准', en: 'standard' } },
            { value: 'lowLFF', label: { zh: '低频滤波↓', en: 'LFF lowered' } },
            { value: 'highLFF', label: { zh: '低频滤波↑', en: 'LFF raised' } },
            { value: 'lowHFF', label: { zh: '高频滤波↓', en: 'HFF lowered' } },
          ],
          help: { zh: '标准：运动 10 Hz–10 kHz，感觉 20 Hz–2 kHz（p.83）。时程是低频成分，波幅是高频成分。', en: 'Standard: motor 10 Hz–10 kHz, sensory 20 Hz–2 kHz (p.83). Duration is a low-frequency feature, amplitude a high-frequency one.' },
        },
        { type: 'steps', path: 'gainIdx', values: [0, 1, 2, 3, 4], label: { zh: '显示灵敏度（/div）', en: 'Display sensitivity (/div)' }, fmt: (v) => GAIN_LABEL[c.study][v], help: { zh: '灵敏度越高（每格数值越小），读出的起始潜伏期越短；峰潜伏期不受影响（p.97）。', en: 'Higher sensitivity (smaller value per division) shortens the onset latency you read; peak latency is unaffected (p.97).' } },
      ],
    },
  ];
}

export function scopeLegend() {
  return L('“读出的起始”= 曲线离开基线到肉眼可见（约 0.05 格，示意）的时刻——它随显示灵敏度而变。', '“Onset read” = when the trace visibly leaves baseline (≈0.05 division, illustrative) — it changes with display sensitivity.');
}
export function macroLegend() {
  return L('宏观：检查装置。红色 = 偏离标准的设置。患者的神经和肌肉始终正常。', 'Macro: the recording setup. Red = settings that differ from standard. The patient’s nerve and muscle are always normal.');
}
export function mesoLegend() {
  return L('中观：每根轴突的兴奋阈值（排序）。竖线 = 当前刺激强度；线左侧的轴突被兴奋，右侧的不参与反应。', 'Meso: each axon’s threshold (sorted). Vertical line = current intensity; axons to its left fire, those to the right do not contribute.');
}

export function drawSetup(ctx, w, h, r, c, lang) {
  const th = theme();
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = th.panel;
  ctx.fillRect(0, 0, w, h);
  const changed = (k) => c[k] !== { tempC: 33, intensity: 60, offset: 0, filter: 'standard', gainIdx: 2 }[k];
  const col = (k) => (changed(k) ? th.bad : th.ink);
  const y = h * 0.45;
  // limb
  ctx.fillStyle = withAlpha(th.skin, 0.9);
  ctx.beginPath();
  ctx.roundRect(20, y - 26, w * 0.62, 52, 26);
  ctx.fill();
  // nerve
  ctx.strokeStyle = th.motor;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(30, y + 4);
  ctx.lineTo(w * 0.62, y + 4);
  ctx.stroke();
  // muscle / digit
  if (c.study === 'motor') {
    ctx.fillStyle = withAlpha(th.muscle, 0.9);
    ctx.beginPath();
    ctx.ellipse(70, y + 6, 48, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    txt(ctx, L('肌腹（运动点）', 'muscle (motor point)'), 70, y + 40, th.muscleDark, 'center', 10, 600);
    const g1x = 70 + c.offset * 1.6;
    ctx.fillStyle = col('offset');
    ctx.fillRect(g1x - 6, y - 34, 12, 8);
    txt(ctx, 'G1', g1x, y - 38, col('offset'), 'center', 10, 700);
    ctx.fillStyle = th.ink;
    ctx.fillRect(22, y - 34, 10, 8);
    txt(ctx, 'G2', 27, y - 38, th.ink, 'center', 10, 700);
    ctx.strokeStyle = th.muscleDark;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(70, y - 24);
    ctx.lineTo(70, y + 24);
    ctx.stroke();
    ctx.setLineDash([]);
  } else {
    txt(ctx, L('手指（环形电极 G1/G2）', 'digit (ring electrodes G1/G2)'), 60, y + 44, th.muted, 'center', 10, 600);
    ctx.fillStyle = th.ink;
    ctx.fillRect(40, y - 30, 6, 60);
    ctx.fillRect(70, y - 30, 6, 60);
  }
  // stimulator
  const sx = c.study === 'motor' && c.stim === 'elbow' ? w * 0.55 : w * 0.3;
  ctx.fillStyle = col('intensity');
  ctx.fillRect(sx - 14, y - 46, 28, 14);
  txt(ctx, c.intensity >= 60 ? L('超强', 'supramax') : `${c.intensity} mA`, sx, y - 52, col('intensity'), 'center', 10.5, 700);
  ctx.strokeStyle = withAlpha(col('intensity'), 0.5);
  ctx.beginPath();
  ctx.arc(sx, y + 4, 8 + Math.min(60, c.intensity) * 0.35, 0, Math.PI * 2);
  ctx.stroke();
  // thermometer
  const tx = w * 0.45;
  ctx.strokeStyle = col('tempC');
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(tx - 5, y + 36, 10, 40, 5);
  ctx.stroke();
  const level = (c.tempC - 24) / 12;
  ctx.fillStyle = col('tempC');
  ctx.fillRect(tx - 3, y + 74 - 36 * level, 6, 36 * level);
  txt(ctx, `${c.tempC} °C`, tx + 12, y + 62, col('tempC'), 'left', 11, 700);
  // amplifier / filter / screen
  const ax = w * 0.72;
  ctx.strokeStyle = th.ink;
  ctx.lineWidth = 1.4;
  ctx.strokeRect(ax, y - 50, w * 0.25, 38);
  txt(ctx, L('放大器 + 滤波', 'amplifier + filters'), ax + w * 0.125, y - 36, th.ink, 'center', 10, 700);
  txt(ctx, `${r.cur.band[0]} Hz – ${r.cur.band[1] >= 1000 ? r.cur.band[1] / 1000 + ' kHz' : r.cur.band[1] + ' Hz'}`, ax + w * 0.125, y - 20, col('filter'), 'center', 11, 700);
  ctx.strokeRect(ax, y + 2, w * 0.25, 44);
  txt(ctx, L('显示', 'display'), ax + w * 0.125, y + 18, th.ink, 'center', 10, 700);
  txt(ctx, `${GAIN_LABEL[c.study][c.gainIdx]}/div`, ax + w * 0.125, y + 36, col('gainIdx'), 'center', 11, 700);
  ctx.strokeStyle = th.muted;
  ctx.beginPath();
  ctx.moveTo(c.study === 'motor' ? 70 : 60, y - 30);
  ctx.quadraticCurveTo(w * 0.5, y - 90, ax, y - 31);
  ctx.stroke();
  txt(ctx, L(`被兴奋的轴突：${r.cur.nAct}/${r.cur.nTot}`, `Axons excited: ${r.cur.nAct}/${r.cur.nTot}`), 12, h - 12, col('intensity'), 'left', 11, 600);
}

export function drawActivation(ctx, w, h, r, c, lang) {
  const th = theme();
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = th.panel;
  ctx.fillRect(0, 0, w, h);
  const x0 = 50;
  const x1 = w - 16;
  const y0 = 26;
  const y1 = h - 34;
  const th0 = r.thresholds;
  const maxT = 60;
  const yOf = (v) => y1 - ((y1 - y0) * Math.min(maxT, v)) / maxT;
  const bw = (x1 - x0) / th0.length;
  const I = c.intensity >= 60 ? Infinity : c.intensity;
  th0.forEach((v, i) => {
    ctx.fillStyle = v <= I ? withAlpha(th.good, 0.7) : withAlpha(th.muted, 0.35);
    ctx.fillRect(x0 + i * bw, yOf(v), Math.max(1, bw - (bw > 3 ? 1 : 0)), y1 - yOf(v));
  });
  if (Number.isFinite(I)) {
    ctx.strokeStyle = th.bad;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x0, yOf(I));
    ctx.lineTo(x1, yOf(I));
    ctx.stroke();
    txt(ctx, `${I} mA`, x1, yOf(I) - 4, th.bad, 'right', 10.5, 700);
  }
  for (const v of [0, 20, 40, 60]) txt(ctx, `${v}`, x0 - 6, yOf(v) + 4, th.muted, 'right', 10);
  txt(ctx, L(`轴突兴奋阈值（mA，示意；已排序）；兴奋 ${r.cur.nAct}/${r.cur.nTot}`, `Axon thresholds (mA, illustrative; sorted); excited ${r.cur.nAct}/${r.cur.nTot}`), x0, 16, th.muted, 'left', 10.5, 600);
}

export function explain(r, c) {
  const m = r.cur.m;
  const s = r.ref.m;
  const fa = (a) => (c.study === 'motor' ? `${fmt(a, 1)} mV` : `${fmt(a * 1000, 0)} µV`);
  const items = [];
  if (c.tempC !== 33)
    items.push(
      L(`温度 ${c.tempC} °C：钠通道失活变慢 → 每个结点去极化更慢 → 传导减慢；单纤维动作电位变大变宽 → 复合电位波幅、时程增加（p.78）。陷阱：假性多发神经病、假性腕管综合征、把轴突性神经病“冷”到脱髓鞘范围（Box 8.2）。`, `Temperature ${c.tempC} °C: slower Na-channel inactivation → slower depolarisation at each node → slower conduction; larger, longer fibre potentials → higher, longer compound responses (p.78). Pitfalls: false polyneuropathy, false carpal tunnel, an axonal neuropathy cooled into the demyelinating range (Box 8.2).`)
    );
  if (c.intensity < 60)
    items.push(
      L(`次强刺激（${c.intensity} mA）：只有 ${r.cur.nAct}/${r.cur.nTot} 根轴突达到阈值 → 波幅下降。若只在近端次强，会伪装成传导阻滞（p.32–33）。`, `Submaximal stimulation (${c.intensity} mA): only ${r.cur.nAct}/${r.cur.nTot} axons reach threshold → lower amplitude. Submaximal only proximally mimics conduction block (p.32–33).`)
    );
  if (c.study === 'motor' && c.offset > 0)
    items.push(L(`G1 偏离运动点 ${c.offset} mm：肌纤维去极化从 G1 旁开始并向其传来 → 起始正相，负峰降低；起始潜伏期读数也随之改变（p.21, 23）。`, `G1 ${c.offset} mm off the motor point: fibre depolarisation starts beside G1 and travels toward it → initial positivity and a lower negative peak; the onset reading shifts too (p.21, 23).`));
  if (c.filter !== 'standard')
    items.push(
      {
        lowLFF: L('降低低频滤波：保留更多低频成分 → 时程略延长（p.83）。', 'Lower low-frequency filter: more low-frequency content kept → duration slightly longer (p.83).'),
        highLFF: L('升高低频滤波：去除低频成分 → 时程缩短、波形变尖，可出现额外相位，波幅也可下降（p.83）。', 'Higher low-frequency filter: low-frequency content removed → shorter duration, sharper shape, possible extra phase, amplitude can fall (p.83).'),
        lowHFF: L('降低高频滤波：去除高频成分 → 波幅降低、峰后移（p.83）。', 'Lower high-frequency filter: high-frequency content removed → lower amplitude, later peak (p.83).'),
      }[c.filter]
    );
  if (c.gainIdx !== 2)
    items.push(
      c.study === 'motor'
        ? L('改变显示灵敏度：同一信号，读出的起始潜伏期随灵敏度而变——灵敏度高则更早（p.97）。', 'Display sensitivity changed: same signal, but the onset you read shifts — earlier at higher sensitivity (p.97).')
        : L('改变显示灵敏度：此 SNAP 呈三相，起始取初始正峰（p.26），峰的位置不随灵敏度改变——这正是峰潜伏期更稳健的原因（p.97）。', 'Display sensitivity changed: this SNAP is triphasic, so onset is taken at the initial positive peak (p.26); a peak does not move with sensitivity — which is why peak latencies are more robust (p.97).')
    );
  const chain = [
    items.length ? L('患者完全正常；只改变了检查技术。', 'The patient is entirely normal; only the technique changed.') : L('标准条件，正常神经与肌肉。', 'Standard conditions; normal nerve and muscle.'),
    items.length ? items.join('<br>') : L('所有技术因素均为标准设置。', 'All technical factors at standard settings.'),
    L('电极只能“看到”到达其附近的电流：温度改变电源本身，刺激强度改变参与的电源数量，电极位置改变几何关系，滤波与显示改变的是测量链而非生理。', 'The electrode only sees the currents near it: temperature changes the sources themselves, intensity changes how many sources take part, electrode position changes the geometry, filters and display change the measurement chain, not the physiology.'),
    m.present ? L(`潜伏期 ${fmt(m.onset, 2)} ms（标准 ${fmt(s.onset, 2)}），波幅 ${fa(m.amp)}（标准 ${fa(s.amp)}），时程 ${fmt(m.duration, 1)} ms（标准 ${fmt(s.duration, 1)}）${r.cv ? `，CV ${fmt(r.cv, 0)} m/s（33 °C 时 ${fmt(r.cvRef, 0)}）` : ''}。`, `Latency ${fmt(m.onset, 2)} ms (standard ${fmt(s.onset, 2)}), amplitude ${fa(m.amp)} (standard ${fa(s.amp)}), duration ${fmt(m.duration, 1)} ms (standard ${fmt(s.duration, 1)})${r.cv ? `, CV ${fmt(r.cv, 0)} m/s (at 33 °C ${fmt(r.cvRef, 0)})` : ''}.`) : L('无可测反应。', 'No measurable response.'),
    L('判读前先排除技术因素：同样的波形变化可以来自病理，也可以来自温度、刺激、电极或仪器设置（第 8 章）。', 'Rule out technical factors before interpreting: the same change can come from pathology or from temperature, stimulation, electrodes or settings (Ch 8).'),
  ];
  const pct = (a, b) => (b ? (100 * (a - b)) / b : null);
  return {
    chain,
    measures: {
      cols: [L('标准', 'Standard'), L('当前', 'Current'), L('变化 %', 'Change %')],
      rows: [
        { label: L('起始潜伏期（读出）', 'Onset latency (as read)'), unit: 'ms', vals: [s.onset, m.present ? m.onset : NaN, m.present ? pct(m.onset, s.onset) : null], digits: 2, hl: true },
        { label: L('负峰潜伏期', 'Negative-peak latency'), unit: 'ms', vals: [s.negPeakLat, m.present ? m.negPeakLat : NaN, m.present ? pct(m.negPeakLat, s.negPeakLat) : null], digits: 2 },
        { label: L('波幅', 'Amplitude'), unit: c.study === 'motor' ? 'mV' : 'µV', vals: c.study === 'motor' ? [s.amp, m.amp, pct(m.amp, s.amp)] : [s.amp * 1000, m.amp * 1000, pct(m.amp, s.amp)], digits: 1 },
        { label: L('负相时程', 'Negative-peak duration'), unit: 'ms', vals: [s.duration, m.present ? m.duration : NaN, m.present ? pct(m.duration, s.duration) : null], digits: 2 },
        { label: L('负相面积', 'Negative-peak area'), vals: [s.area, m.area, pct(m.area, s.area)], digits: 2 },
        { label: c.study === 'motor' ? L('前臂 CV（温度）', 'Forearm CV (temperature)') : L('感觉 CV（温度）', 'Sensory CV (temperature)'), unit: 'm/s', vals: [r.cvRef, r.cv, r.cv && r.cvRef ? pct(r.cv, r.cvRef) : null], digits: 1 },
      ],
      note: L(`温度模型：CV 每 °C ${PV.cvPerDegC} m/s（教科书 1.5–2.5）、DL 每 °C ${PV.dlPerDegC} ms（p.78）；单纤维电位随冷却变宽（示意系数）。“肉眼可见”阈值 0.05 格为示意。`, `Temperature model: CV ${PV.cvPerDegC} m/s per °C (textbook 1.5–2.5), DL ${PV.dlPerDegC} ms per °C (p.78); fibre potentials widen with cooling (illustrative factor). The 0.05-division “visible” threshold is illustrative.`),
    },
    caveat: L('<p>这些控制只改变记录，不改变病理；它们被刻意放在独立模块中。临床上：测量并维持肢体温度 32–34 °C，确认刺激为超强（平台后再加 20–25%），G1 置于运动点，使用标准滤波与灵敏度（p.32, 79, 83, 97）。</p>', '<p>These controls change the recording, not the pathology, and are deliberately kept in a separate module. Clinically: measure and keep the limb at 32–34 °C, confirm supramaximal stimulation (20–25% above the plateau), place G1 on the motor point, and use standard filters and sensitivity (p.32, 79, 83, 97).</p>'),
    sources: L('来源：p.21, 23, 26, 32–33, 78–83, 97。', 'Sources: p.21, 23, 26, 32–33, 78–83, 97.'),
  };
}

export function why(prev, cur) {
  const t = {
    tempC: L('只改变了温度：电源本身（每根纤维的动作电位与传导速度）改变了。', 'Only temperature changed: the sources themselves (each fibre’s action potential and conduction velocity) changed.'),
    intensity: L('只改变了刺激强度：参与反应的轴突数量改变。', 'Only intensity changed: the number of axons taking part changed.'),
    offset: L('只移动了 G1：电源不变，电极与电源的几何关系改变。', 'Only G1 moved: same sources, different electrode–source geometry.'),
    filter: L('只改变了滤波：同一信号，不同频率成分被去除。', 'Only filters changed: same signal, different frequency content removed.'),
    gainIdx: L('只改变了显示灵敏度：信号完全相同，改变的是你能“看到”离开基线的时刻。', 'Only display sensitivity changed: the signal is identical; what changes is when you can see it leave baseline.'),
    study: L('换了检查类型。', 'Changed the study.'),
    stim: L('换了刺激部位。', 'Changed the stimulation site.'),
  }[prev.changed];
  const a = prev.result?.cur?.m;
  const b = cur.result?.cur?.m;
  let h = `<p>${t || L('参数已改变。', 'A parameter changed.')}</p>`;
  if (a && b && a.present && b.present) h += `<ul><li>${L('潜伏期', 'latency')} ${fmt(a.onset, 2)} → <b>${fmt(b.onset, 2)}</b> ms</li><li>${L('波幅', 'amplitude')} ${fmt(a.amp, 3)} → <b>${fmt(b.amp, 3)}</b> mV</li><li>${L('时程', 'duration')} ${fmt(a.duration, 2)} → <b>${fmt(b.duration, 2)}</b> ms</li></ul>`;
  return h;
}

export function modelNotes() {
  return L('<p>温度通过模型的传导速度与单纤维电位宽度起作用；刺激强度按每根轴突的阈值（示意，粗纤维阈值低）决定是否兴奋；G1 移动改变表面电极与各肌纤维终板的轴向距离；滤波为二阶 Butterworth 型数字高/低通（20 kHz 采样），有相位延迟，与真实仪器一样会轻微影响潜伏期；起始潜伏期按“偏离基线 0.05 格”读取（示意）。</p>', '<p>Temperature acts through the model’s conduction velocities and fibre-potential widths; intensity excites each axon according to its threshold (illustrative; larger fibres lower); moving G1 changes the axial distance between the surface electrode and each fibre’s endplate; filters are 2nd-order Butterworth-type digital high/low-pass (20 kHz sampling) with phase delay, which—as on real machines—slightly shifts latencies; onset is read at a 0.05-division departure from baseline (illustrative).</p>');
}
