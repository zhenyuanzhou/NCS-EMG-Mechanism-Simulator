// Explanatory content: recording principles.
import { L } from './i18n.js';
import { fmt } from '../core/util.js';

const DIST = [0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10];

export function controls(p) {
  return [
    {
      title: { zh: '演示', en: 'Demonstration' },
      items: [
        {
          type: 'chips',
          path: 'demo',
          label: { zh: '主题', en: 'Topic' },
          options: [
            { value: 'electrode', label: { zh: '移动电极', en: 'Move the electrode' } },
            { value: 'summation', label: { zh: '复合电位与相位抵消', en: 'Summation & cancellation' } },
          ],
        },
      ],
    },
    {
      title: { zh: '电极（源不变，只移动电极）', en: 'Electrode (the source never changes)' },
      show: (q) => q.demo === 'electrode',
      items: [
        {
          type: 'chips',
          path: 'position',
          label: { zh: '电极位置', en: 'Electrode position' },
          options: [
            { value: 'under', label: { zh: '终板上方', en: 'over endplate' } },
            { value: 'approach', label: { zh: '沿纤维 14 mm', en: '14 mm along fibre' } },
            { value: 'beyond', label: { zh: '纤维末端之外', en: 'beyond fibre end' } },
          ],
        },
        { type: 'steps', path: 'distance', values: DIST, label: { zh: '电极与纤维距离', en: 'Distance from the fibre' }, fmt: (v) => `${v} mm` },
        {
          type: 'chips',
          path: 'montage',
          label: { zh: '导联', en: 'Montage' },
          options: [
            { value: 'mono', label: { zh: '单极（参考在远处）', en: 'monopolar (distant reference)' } },
            { value: 'bipolar', label: { zh: '双极 G1−G2', en: 'bipolar G1−G2' } },
          ],
        },
        { type: 'range', path: 'g2offset', label: { zh: 'G2 位于 G1 远侧', en: 'G2 distal to G1' }, min: 5, max: 40, step: 5, fmt: (v) => `${v} mm`, show: (q) => q.montage === 'bipolar' },
      ],
    },
    {
      title: { zh: '总和', en: 'Summation' },
      show: (q) => q.demo === 'summation',
      items: [
        {
          type: 'chips',
          path: 'sumKind',
          label: { zh: '成分类型', en: 'Component type' },
          options: [
            { value: 'sensory', label: { zh: '感觉纤维电位（短）', en: 'sensory fibre potentials (brief)' } },
            { value: 'motor', label: { zh: '运动单位表面电位（长）', en: 'motor-unit surface potentials (long)' } },
          ],
        },
        { type: 'range', path: 'spread', label: { zh: '到达时间离散（SD）', en: 'Arrival-time spread (SD)' }, min: 0, max: 2, step: 0.05, fmt: (v) => `${v.toFixed(2)} ms` },
      ],
    },
  ];
}

export function explain(r, p) {
  if (r.kind === 'electrode') {
    const pos = {
      under: L('动作电位从电极正下方（终板）开始，然后离开：没有“接近”阶段，故首个偏转为负（Fig 2.19 下）。这就是 G1 置于运动点时 CMAP 为起始负相双相波的原因（p.21, Fig 2.20 上）。', 'The action potential starts right under the electrode (endplate) and moves away: there is no approaching phase, so the first deflection is negative (Fig 2.19 bottom). This is why a CMAP with G1 over the motor point is biphasic and initially negative (p.21, Fig 2.20 top).'),
      approach: L('动作电位起源于远处，先接近（电流源在前 → 正），再从下方通过（电流汇 → 负），最后离开（正）：三相 + − +（p.20, Fig 2.19 上）。G1 偏离运动点时 CMAP 出现起始正相（Fig 2.20 中）；纤颤电位也是这种形态（p.231）。', 'The action potential arises at a distance: it approaches (leading source → positive), passes under (sink → negative) and leaves (positive): triphasic + − + (p.20, Fig 2.19 top). A CMAP with G1 off the motor point gains an initial positivity (Fig 2.20 middle); fibrillation potentials share this shape (p.231).'),
      beyond: L('动作电位接近但在到达电极前于纤维末端消失：主要只看到正相（p.21, Fig 2.20 下——例如刺激正中神经而在小鱼际记录）。', 'The action potential approaches but dies out at the fibre end before reaching the electrode: mainly positivity is seen (p.21, Fig 2.20 bottom — e.g. median stimulation recorded over the hypothenar muscles).'),
    }[p.position];
    const distTxt = L(`距离 ${p.distance} mm：峰-峰值 ${fmt(r.m.p2p * 1000, 0)} µV。距离越远，波幅越小、波形越圆钝（组织相当于高频滤波器，p.249）——源本身完全没有改变。`, `Distance ${p.distance} mm: peak-to-peak ${fmt(r.m.p2p * 1000, 0)} µV. Farther away the potential is smaller and blunter (tissue acts as a high-frequency filter, p.249) — the source itself has not changed at all.`);
    return {
      chain: [
        L('无病变：一根正常肌纤维，动作电位起于终板，向两侧以约 4 m/s 传播（示意参数）。', 'No lesion: one normal muscle fibre; the action potential starts at the endplate and propagates both ways at ≈4 m/s (illustrative).'),
        L('细胞内：去极化区沿纤维移动。膜电流 ∝ 膜电位的空间二阶导数：前沿外向（源，+），峰区内向（汇，−），后沿外向（源，+）。', 'Inside: a depolarised zone moves along the fibre. Membrane current ∝ the second spatial derivative of membrane potential: outward at the leading edge (source, +), inward at the peak (sink, −), outward behind (source, +).'),
        L('电极测的是细胞外体积导体中两点之间的电压差（记录电极 vs 参考电极），不是细胞内去极化本身（p.20）。', 'The electrode measures a voltage difference in the extracellular volume conductor (recording vs reference), not intracellular depolarisation itself (p.20).'),
        `${pos}<br>${distTxt}${p.montage === 'bipolar' ? '<br>' + L('双极记录 = G1 − G2：当 G2 也“看到”同一电源时，部分电位被相减，波形相应改变。', 'Bipolar = G1 − G2: when G2 also “sees” the same source, part of the potential is subtracted and the shape changes.') : ''}`,
        L('显示约定：负向上（p.21）。向上的偏转不等于“去极化”，向下的也不等于“复极化”：它们反映电流源/汇相对电极的位置与运动方向。', 'Display convention: negative up (p.21). An upward deflection is not “depolarisation” and a downward one is not “repolarisation”: they reflect where sources/sinks are relative to the electrode and how they move.'),
      ],
      measures: {
        cols: [L('值', 'Value')],
        rows: [
          { label: L('首个偏转', 'First deflection'), vals: [r.m.first ? (r.m.first === '−' ? L('负（向上）', 'negative (up)') : L('正（向下）', 'positive (down)')) : '—'] },
          { label: L('相位序列', 'Phase sequence'), vals: [r.m.lobes || '—'] },
          { label: L('峰-峰值', 'Peak-to-peak'), unit: 'µV', vals: [r.m.p2p * 1000], digits: 0 },
          { label: L('负相峰值', 'Negative peak'), unit: 'µV', vals: [r.m.neg * 1000], digits: 0 },
        ],
        note: L('所有数值由同一根纤维的线源模型直接计算。', 'All values computed directly from the same fibre’s line-source model.'),
      },
      caveat: L('<p>同一电源在不同电极位置可产生起始负相、三相或单纯正相的波形；因此单凭形态不能确定发生器，还需要稳定性与放电方式（p.231）。刺激伪迹是远场电位：在各记录部位同时出现（p.21）。</p>', '<p>The same source can give an initially negative, triphasic or purely positive waveform depending on electrode position; morphology alone cannot identify the generator — stability and firing pattern are needed (p.231). The stimulus artefact is a far-field potential: it appears at the same time at every recording site (p.21).</p>'),
      sources: L('来源：p.20–21（Fig 2.19–2.21），p.135–137，p.231，p.249。', 'Sources: p.20–21 (Fig 2.19–2.21), p.135–137, p.231, p.249.'),
    };
  }
  const ampPct = r.mD.amp * 100;
  const areaPct = (r.mD.area / r.mS.area) * 100;
  return {
    chain: [
      L('无病变：模拟 20 个相同成分，只改变其到达时间的离散程度。', 'No lesion: 20 identical components; only the spread of their arrival times changes.'),
      L('各纤维/运动单位传导速度不同 → 到达时间不同（时间离散）；传导路径越长、速度差异越大，离散越明显（“马拉松”比喻，p.31, p.36）。', 'Different conduction velocities → different arrival times (temporal dispersion); longer paths and larger velocity differences increase it (the “marathon” analogy, p.31, p.36).'),
      L(`每个成分都有负相与正相。当离散使一个成分的正相与另一个的负相重叠时，二者相互抵消（相位抵消）。`, 'Each component has negative and positive phases. When dispersion makes the positive phase of one overlap the negative phase of another, they cancel (phase cancellation).'),
      L(`离散 SD ${p.spread.toFixed(2)} ms：总和峰值为同步时的 ${fmt(ampPct, 0)}%，面积为 ${fmt(areaPct, 0)}%，时程 ${fmt(r.mD.duration, 2)} ms（同步时 ${fmt(r.mS.duration, 2)} ms）。`, `Spread SD ${p.spread.toFixed(2)} ms: summed peak ${fmt(ampPct, 0)}% of synchronous, area ${fmt(areaPct, 0)}%, duration ${fmt(r.mD.duration, 2)} ms (synchronous ${fmt(r.mS.duration, 2)} ms).`),
      p.sumKind === 'sensory'
        ? L('感觉成分很短：少量离散就足以造成大量抵消——这就是近端刺激时 SNAP 显著变小的原因（p.30–32, Fig 3.11–3.12）。', 'Sensory components are brief: a little dispersion causes much cancellation — why SNAPs shrink markedly with proximal stimulation (p.30–32, Fig 3.11–3.12).')
        : L('运动单位电位长（约 5–6 ms）：同样的离散造成的抵消小得多，正常近端 CMAP 只轻度变小（p.32）。', 'Motor-unit potentials are long (≈5–6 ms): the same dispersion causes much less cancellation; a normal proximal CMAP shrinks only slightly (p.32).'),
    ],
    measures: {
      cols: [L('同步', 'Synchronous'), L('有离散', 'Dispersed')],
      rows: [
        { label: L('峰值（相对）', 'Peak (relative)'), unit: '%', vals: [100, ampPct], digits: 0, hl: true },
        { label: L('负相面积（相对）', 'Negative area (relative)'), unit: '%', vals: [100, areaPct], digits: 0 },
        { label: L('负相时程', 'Negative duration'), unit: 'ms', vals: [r.mS.duration, r.mD.duration], digits: 2 },
      ],
    },
    caveat: L('<p>如果每个成分都是单相的，离散只会降低峰值而保留面积；正是双相/三相成分的正负相重叠导致面积也下降（p.31）。因此波幅和面积下降都可以在没有轴突丢失的情况下出现。</p>', '<p>If each component were monophasic, dispersion would lower the peak but preserve area; it is the overlap of positive and negative phases of bi/triphasic components that lowers area too (p.31). Both amplitude and area can therefore fall without any axon loss.</p>'),
    sources: L('来源：p.30–32, p.36–38。', 'Sources: p.30–32, p.36–38.'),
  };
}

export function why(prev, cur) {
  const k = prev.changed;
  const txt = {
    position: L('只移动了电极：纤维、动作电位与传播方向都没变。波形改变完全来自电极相对于电流源/汇的几何关系。', 'Only the electrode moved: the fibre, its action potential and its direction are unchanged. The waveform changed purely because of the electrode’s geometry relative to sources and sinks.'),
    distance: L('改变了电极到纤维的距离：近场电位随距离迅速衰减，高频成分（尖峰）衰减最快，所以波形变小、变钝（p.249）。', 'You changed the electrode–fibre distance: near-field potentials fall off quickly with distance and high-frequency components (the spike) fall fastest, so the waveform gets smaller and blunter (p.249).'),
    montage: L('切换了导联：双极记录显示 G1 与 G2 之差；参考电极若也靠近电源，会改变所记录的形态与波幅。', 'You switched montage: bipolar recording shows G1 minus G2; a reference that also sees the source changes recorded shape and amplitude.'),
    g2offset: L('移动了 G2：G2 看到的电位与 G1 的时间差/相似度改变，差值波形随之改变。', 'You moved G2: the timing/similarity of what G2 sees relative to G1 changes, and so does the difference.'),
    spread: L('改变了到达时间离散：成分越分散，峰值越低、时程越长；正负相重叠还会降低面积。', 'You changed arrival spread: more spread → lower peak, longer duration; overlap of positive and negative phases also lowers area.'),
    sumKind: L('切换了成分类型：短成分（感觉）比长成分（运动单位）对相同离散更敏感。', 'You switched component type: brief (sensory) components are more sensitive to the same spread than long (motor-unit) ones.'),
  }[k];
  return `<p>${txt || L('参数已改变。', 'A parameter changed.')}</p>`;
}

export function electrodeLegend(th) {
  return `<span><i style="background:${th.highlight}"></i>${L('去极化区', 'depolarised zone')}</span><span><i style="background:${th.bad}"></i>${L('电流汇（内向）', 'current sink (inward)')}</span><span><i style="background:${th.sensory}"></i>${L('电流源（外向）', 'current source (outward)')}</span>`;
}

export function modelNotes() {
  return L('<p>单根肌纤维：Rosenfalck 细胞内电位分布（空间尺度 0.7 mm，示意），速度 4 m/s（示意），纤维半长 30 mm，末端处动作电位逐渐衰减（示意化的终止）。细胞外电位由线源模型计算（每个空间单元对 1/R 精确积分）。</p>', '<p>One muscle fibre: Rosenfalck intracellular profile (spatial scale 0.7 mm, illustrative), velocity 4 m/s (illustrative), half-length 30 mm, action potential decrementing towards the fibre ends (schematic termination). Extracellular potential from the line-source model (exact 1/R integral per spatial cell).</p>');
}
