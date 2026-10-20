// Explanatory content for the NCS module (kept separate from physiology and rendering).
// Clinical criteria quoted here are those stated in Preston & Shapiro 4th ed. (page cited).

import { L } from './i18n.js';
import { STIM_SITES, LESION_SITES } from '../physiology/nerve.js';
import { fmt, pctChange } from '../core/util.js';
import { DEFAULT_PARAMS } from '../physiology/subject.js';

const siteOptions = Object.entries(LESION_SITES).filter(([, v]) => !v.hidden).map(([k, v]) => ({ value: k, label: { zh: v.zh, en: v.en } }));
const DAY_STEPS = [0.5, 1, 2, 3, 4, 5, 6, 7, 8, 10, 14, 21, 30, 60, 90, 180, 365];
const dayFmt = (d) => (d < 1 ? L('12 小时', '12 h') : d >= 30 ? L(`${Math.round(d / 30)} 个月`, `${Math.round(d / 30)} mo`) : L(`${d} 天`, `${d} d`));

export function controls(p) {
  return [
    {
      title: { zh: '检查类型', en: 'Study' },
      items: [
        { type: 'chips', path: 'study', label: { zh: '记录', en: 'Recording' }, options: [{ value: 'motor', label: { zh: '运动 CMAP', en: 'Motor CMAP' } }, { value: 'sensory', label: { zh: '感觉 SNAP', en: 'Sensory SNAP' } }] },
        {
          type: 'chips',
          path: 'stim',
          label: { zh: '动画刺激部位', en: 'Animated stimulation site' },
          options: (p.study === 'motor' ? ['wrist', 'elbow', 'axilla'] : ['wrist', 'elbow']).map((k) => ({ value: k, label: STIM_SITES[k] })),
          help: { zh: '所有部位的波形都会显示；此处只决定解剖动画。', en: 'All sites are recorded; this only chooses the animated one.' },
        },
      ],
    },
    {
      title: { zh: '轴突丢失 Axonal loss', en: 'Axonal loss' }, pathology: true,
      items: [
        { type: 'toggle', path: 'axonal.on', label: { zh: '启用轴突离断', en: 'Transect axons' } },
        { type: 'range', path: 'axonal.frac', label: { zh: '受累轴突比例', en: 'Fraction of axons affected' }, min: 0, max: 1, step: 0.05, fmt: (v) => `${Math.round(v * 100)}%`, show: (q) => q.axonal.on },
        {
          type: 'chips',
          path: 'axonal.population',
          label: { zh: '受累纤维群', en: 'Population' },
          options: [
            { value: 'motor', label: { zh: '运动', en: 'motor' } },
            { value: 'sensory', label: { zh: '感觉', en: 'sensory' } },
            { value: 'both', label: { zh: '两者', en: 'both' } },
          ],
          show: (q) => q.axonal.on,
        },
        { type: 'select', path: 'axonal.site', label: { zh: '病变部位', en: 'Lesion site' }, options: siteOptions, show: (q) => q.axonal.on },
        {
          type: 'select',
          path: 'axonal.selection',
          label: { zh: '哪些轴突丢失', en: 'Which axons are lost' },
          options: [
            { value: 'random', label: { zh: '随机', en: 'random' } },
            { value: 'largest', label: { zh: '最大/最快者优先', en: 'largest/fastest first' } },
            { value: 'smallest', label: { zh: '最小/最慢者优先', en: 'smallest/slowest first' } },
          ],
          show: (q) => q.axonal.on,
          help: { zh: '对应教科书 Fig 3.17：只有最快纤维决定潜伏期与传导速度。', en: 'Cf. Fig 3.17: only the fastest fibres set latency and CV.' },
        },
        { type: 'steps', path: 'day', values: DAY_STEPS, label: { zh: '距损伤时间', en: 'Time since injury' }, fmt: dayFmt, show: (q) => q.axonal.on, help: { zh: '沃勒变性：运动 3–5 天、感觉 6–10 天（p.35）。', en: 'Wallerian degeneration: motor 3–5 d, sensory 6–10 d (p.35).' } },
        { type: 'range', path: 'reinnervation', label: { zh: '侧支再支配程度', en: 'Collateral reinnervation' }, min: 0, max: 1, step: 0.05, fmt: (v) => `${Math.round(v * 100)}%`, show: (q) => q.axonal.on && q.day > 25, help: { zh: '数月后，存活单位接管去神经肌纤维，CMAP 波幅可部分恢复，而轴突数并未恢复（p.264）。', en: 'Months later surviving units adopt denervated fibres, so CMAP amplitude can partly recover although the number of axons does not (p.264).' } },
      ],
    },
    {
      title: { zh: '脱髓鞘 / 传导失败', en: 'Demyelination / conduction failure' }, pathology: true,
      items: [
        { type: 'toggle', path: 'demyel.on', label: { zh: '启用', en: 'Enable' } },
        { type: 'select', path: 'demyel.site', label: { zh: '部位', en: 'Site' }, options: [...siteOptions, { value: 'diffuse', label: { zh: '弥漫均一（遗传性样）', en: 'Diffuse uniform (inherited-like)' } }], show: (q) => q.demyel.on },
        { type: 'range', path: 'demyel.slowing', label: { zh: '病灶段减速', en: 'Slowing in segment' }, min: 0, max: 0.9, step: 0.05, fmt: (v) => `−${Math.round(v * 100)}%`, show: (q) => q.demyel.on && q.demyel.site !== 'diffuse' && q.demyel.mechanism !== 'nodal' },
        { type: 'range', path: 'demyel.dispersion', label: { zh: '各轴突减速差异（离散）', en: 'Variation between axons (dispersion)' }, min: 0, max: 1.5, step: 0.05, fmt: (v) => v.toFixed(2), show: (q) => q.demyel.on && q.demyel.site !== 'diffuse' && q.demyel.mechanism !== 'nodal' },
        { type: 'range', path: 'demyel.block', label: { zh: '传导失败（阻滞）比例', en: 'Conduction failure (block)' }, min: 0, max: 1, step: 0.05, fmt: (v) => `${Math.round(v * 100)}%`, show: (q) => q.demyel.on && q.demyel.site !== 'diffuse' },
        { type: 'range', path: 'demyel.diffuseSlowing', label: { zh: '全程均一减速', en: 'Uniform slowing (whole nerve)' }, min: 0, max: 0.7, step: 0.05, fmt: (v) => `−${Math.round(v * 100)}%`, show: (q) => q.demyel.on && q.demyel.site === 'diffuse' },
        {
          type: 'chips',
          path: 'demyel.mechanism',
          label: { zh: '机制（进阶）', en: 'Mechanism (advanced)' },
          options: [
            { value: 'demyelination', label: { zh: '节段性脱髓鞘', en: 'segmental demyelination' } },
            { value: 'nodal', label: { zh: '郎飞结功能障碍', en: 'nodal dysfunction' } },
          ],
          show: (q) => q.demyel.on && q.demyel.site !== 'diffuse',
          help: { zh: '传导失败不一定证明结构性脱髓鞘（p.503）。', en: 'Conduction failure does not always prove structural demyelination (p.503).' },
        },
      ],
    },
    {
      title: { zh: '肌肉', en: 'Muscle' }, pathology: true,
      items: [
        { type: 'toggle', path: 'myopathy.on', label: { zh: '肌病：运动单位内肌纤维丢失', en: 'Myopathy: fibre loss inside units' } },
        { type: 'range', path: 'myopathy.fiberLoss', label: { zh: '肌纤维丢失', en: 'Fibre loss' }, min: 0, max: 0.85, step: 0.05, fmt: (v) => `${Math.round(v * 100)}%`, show: (q) => q.myopathy.on, help: { zh: '本模型记录的是远端肌（APB）；多数肌病累及近端，故 CMAP 常正常（p.38）。', en: 'The modelled muscle is distal (APB); most myopathies are proximal, so CMAPs are usually normal (p.38).' } },
      ],
    },
    {
      title: { zh: '显示', en: 'Display' },
      items: [{ type: 'toggle', path: 'noise', label: { zh: '显示噪声与刺激伪迹', en: 'Show noise and stimulus artefact' } }],
    },
  ];
}

// ---------------------------------------------------------------------------------------
function ampTxt(r, v) {
  if (v === null || v === undefined) return '—';
  return r.p.study === 'motor' ? `${fmt(v, 1)} mV` : `${fmt(v * 1000, 0)} µV`;
}

function spread(arrivals) {
  const t = arrivals.filter((a) => a.ok).map((a) => a.t).sort((a, b) => a - b);
  if (t.length < 3) return { n: t.length, range: null };
  const q = (x) => t[Math.floor(x * (t.length - 1))];
  return { n: t.length, range: q(0.9) - q(0.1) };
}

function lesionText(p) {
  const parts = [];
  if (p.axonal.on) {
    const pop = { motor: L('运动', 'motor'), sensory: L('感觉', 'sensory'), both: L('运动+感觉', 'motor + sensory') }[p.axonal.population || 'both'];
    parts.push(L(`${LESION_SITES[p.axonal.site].zh}：${Math.round(p.axonal.frac * 100)}% ${pop}轴突离断（伤后 ${dayFmt(p.day)}）`, `${LESION_SITES[p.axonal.site].en}: ${Math.round(p.axonal.frac * 100)}% of ${pop} axons transected (${dayFmt(p.day)} after injury)`));
  }
  if (p.demyel.on) {
    if (p.demyel.site === 'diffuse') parts.push(L(`全程均一脱髓鞘：传导速度 −${Math.round(p.demyel.diffuseSlowing * 100)}%`, `Diffuse uniform demyelination: CV −${Math.round(p.demyel.diffuseSlowing * 100)}%`));
    else if (p.demyel.mechanism === 'nodal') parts.push(L(`${LESION_SITES[p.demyel.site].zh}：郎飞结功能障碍，${Math.round(p.demyel.block * 100)}% 轴突传导失败`, `${LESION_SITES[p.demyel.site].en}: nodal dysfunction, ${Math.round(p.demyel.block * 100)}% conduction failure`));
    else parts.push(L(`${LESION_SITES[p.demyel.site].zh}：节段性脱髓鞘（减速 ${Math.round(p.demyel.slowing * 100)}%，离散 ${p.demyel.dispersion.toFixed(2)}，阻滞 ${Math.round(p.demyel.block * 100)}%）`, `${LESION_SITES[p.demyel.site].en}: segmental demyelination (slowing ${Math.round(p.demyel.slowing * 100)}%, dispersion ${p.demyel.dispersion.toFixed(2)}, block ${Math.round(p.demyel.block * 100)}%)`));
  }
  if (p.myopathy.on) parts.push(L(`肌病：${Math.round(p.myopathy.fiberLoss * 100)}% 肌纤维丢失（轴突与运动单位数目完整）`, `Myopathy: ${Math.round(p.myopathy.fiberLoss * 100)}% fibre loss (axons and number of units intact)`));
  return parts.length ? parts.join('<br>') : L('无病变——正常对照（同一受试者、同一随机种子）。', 'No lesion — normal reference (same subject, same seed).');
}

function physText(p) {
  const out = [];
  if (p.axonal.on) {
    const motorDegen = p.day >= 5 ? L('已完成', 'complete') : p.day >= 3 ? L('进行中', 'in progress') : L('尚未开始', 'not yet');
    const sensDegen = p.day >= 10 ? L('已完成', 'complete') : p.day >= 6 ? L('进行中', 'in progress') : L('尚未开始', 'not yet');
    if (p.axonal.site === 'rootPre') out.push(L('节前根损伤：感觉纤维的胞体（DRG）在病灶远端，周围感觉突起不变性 → SNAP 保留（p.28–29）。运动纤维与前角细胞断开 → 远端变性。', 'Preganglionic root lesion: sensory cell bodies (DRG) lie distal to the lesion, so peripheral sensory processes do not degenerate → SNAP preserved (p.28–29). Motor axons are cut off from their AHCs → distal degeneration.'));
    out.push(L(`离断的轴突远端残端发生沃勒变性：运动纤维 ${motorDegen}（3–5 天），感觉纤维 ${sensDegen}（6–10 天）。变性前，远端仍可被刺激并传导（p.34–35）。`, `Distal stumps of transected axons undergo Wallerian degeneration: motor ${motorDegen} (days 3–5), sensory ${sensDegen} (days 6–10). Before that, the distal stump can still be stimulated and conducts (p.34–35).`));
  }
  if (p.demyel.on) {
    if (p.demyel.site === 'diffuse') out.push(L('所有节段髓鞘均一受损 → 每根轴突都同样减慢；轴突间差异不明显增加，故波形形态在近远端间相似（p.34 Fig 3.16C）。', 'All internodes uniformly affected → every axon slows similarly; little extra variation between axons, so morphology is similar between sites (p.34, Fig 3.16C).'));
    else if (p.demyel.mechanism === 'nodal') out.push(L('结区/旁结区功能障碍可在髓鞘大体完整时造成传导失败，几乎不伴减速；可迅速可逆（p.503“nodopathy”概念）。', 'Nodal/paranodal dysfunction can cause conduction failure with little slowing and without gross demyelination; may reverse quickly (p.503, “nodopathy”).'));
    else out.push(L('脱髓鞘的结间段：跳跃式传导变慢或失败。各轴突受累程度不同 → 到达时间分散（时间离散）；部分轴突完全不能通过病灶（传导阻滞）。轴突本身完整，不发生沃勒变性（p.35–38）。', 'Demyelinated internodes: saltatory conduction slows or fails. Axons are affected unequally → arrival times spread (temporal dispersion); some cannot pass at all (conduction block). Axons stay intact, no Wallerian degeneration (p.35–38).'));
  }
  if (p.myopathy.on) out.push(L('轴突、神经肌肉接头数目正常；每个运动单位内能产生动作电位的肌纤维减少。', 'Axons and NMJ counts are normal; fewer muscle fibres per unit generate action potentials.'));
  return out.length ? out.join(' ') : L('所有有髓轴突以 35–65 m/s 传导；CMAP = 所有肌纤维电位之和，SNAP = 所有感觉纤维电位之和（p.23–26）。', 'Myelinated axons conduct at 35–65 m/s; the CMAP sums all muscle-fibre potentials, the SNAP all sensory-fibre potentials (p.23–26).');
}

export function explain(r, p) {
  const motor = p.study === 'motor';
  const rows = r.rows;
  const d0 = rows[0];
  const sp = rows.map((row) => ({ key: row.key, ab: spread(row.ab.arrivals), nm: spread(row.nm.arrivals) }));
  const nTot = motor ? r.sc.subj.nerve.motor.length : r.sc.subj.nerve.sensory.length;
  const srcTxt = sp
    .map((s) => L(`${STIM_SITES[s.key].zh}刺激：${s.ab.n}/${nTot} 条${motor ? '运动轴突的运动单位' : '感觉轴突'}到达（正常 ${s.nm.n}）；到达时间 10–90% 跨度 ${fmt(s.ab.range, 2)} ms（正常 ${fmt(s.nm.range, 2)} ms）`, `${STIM_SITES[s.key].en}: ${s.ab.n}/${nTot} ${motor ? 'motor units' : 'sensory axons'} arrive (normal ${s.nm.n}); 10–90% arrival spread ${fmt(s.ab.range, 2)} ms (normal ${fmt(s.nm.range, 2)} ms)`))
    .join('<br>');
  const wf = rows
    .map((row) => {
      const a = row.mAb;
      const n = row.mNm;
      if (!a.present) return L(`${STIM_SITES[row.key].zh}：无可测反应`, `${STIM_SITES[row.key].en}: no measurable response`);
      return L(
        `${STIM_SITES[row.key].zh}：波幅 ${ampTxt(r, a.amp)}（${fmt(pctChange(n.amp, a.amp), 0)}%），面积 ${fmt(pctChange(n.area, a.area), 0)}%，时程 ${fmt(a.duration, 2)} ms（正常 ${fmt(n.duration, 2)}），潜伏期 ${fmt(a.onset, 2)} ms`,
        `${STIM_SITES[row.key].en}: amplitude ${ampTxt(r, a.amp)} (${fmt(pctChange(n.amp, a.amp), 0)}%), area ${fmt(pctChange(n.area, a.area), 0)}%, duration ${fmt(a.duration, 2)} ms (normal ${fmt(n.duration, 2)}), onset ${fmt(a.onset, 2)} ms`
      );
    })
    .join('<br>');
  // interpretation
  const interp = [];
  const minCV = Math.min(...r.segs.map((s) => s.cvAb ?? Infinity), r.sensCV?.ab ?? Infinity);
  if (Number.isFinite(minCV) && minCV < 35) interp.push(L(`<b>节段传导速度 ${fmt(minCV, 0)} m/s &lt; 35 m/s（上肢）</b>：按教科书属于明确的脱髓鞘范围（p.35）。`, `<b>Segment CV ${fmt(minCV, 0)} m/s &lt; 35 m/s (arm)</b>: unequivocally in the demyelinating range per the textbook (p.35).`));
  for (let i = 1; i < rows.length; i++) {
    const a = rows[i - 1].mAb;
    const b = rows[i].mAb;
    if (!a.present) continue;
    const ampDrop = b.present ? (100 * (a.amp - b.amp)) / a.amp : 100;
    const areaDrop = b.present ? (100 * (a.area - b.area)) / a.area : 100;
    const durInc = b.present ? (100 * (b.duration - a.duration)) / a.duration : null;
    const seg = `${L(STIM_SITES[rows[i - 1].key])}→${L(STIM_SITES[rows[i].key])}`;
    if (motor) {
      if (areaDrop > 50) interp.push(L(`<b>${seg}：面积下降 ${fmt(areaDrop, 0)}% (&gt;50%)</b> —— 符合电生理传导阻滞（p.38，基于计算机模拟的标准）。`, `<b>${seg}: area drop ${fmt(areaDrop, 0)}% (&gt;50%)</b> — meets electrophysiologic conduction block (p.38, simulation-based criterion).`));
      else if (ampDrop > 20 || areaDrop > 20) interp.push(L(`${seg}：波幅下降 ${fmt(ampDrop, 0)}%、面积下降 ${fmt(areaDrop, 0)}%。正常人通常 ≤20%（p.37），但仅凭离散与相位抵消面积即可下降达 50%（p.38）——不能单凭波幅下降判定阻滞。`, `${seg}: amplitude −${fmt(ampDrop, 0)}%, area −${fmt(areaDrop, 0)}%. Normal subjects usually ≤20% (p.37), yet dispersion and phase cancellation alone can reduce area by up to 50% (p.38) — amplitude drop alone does not prove block.`));
      if (durInc !== null && durInc > 15) interp.push(L(`${seg}：时程增加 ${fmt(durInc, 0)}% (&gt;15%) —— 异常时间离散（p.37）。`, `${seg}: duration +${fmt(durInc, 0)}% (&gt;15%) — abnormal temporal dispersion (p.37).`));
    }
  }
  const nAmp = d0.mNm.amp;
  const aAmp = d0.mAb.present ? d0.mAb.amp : 0;
  if (aAmp < 0.7 * nAmp && !(Number.isFinite(minCV) && minCV < 35)) {
    interp.push(L('远端波幅降低而传导速度/潜伏期相对保留：与轴突丢失相符，但并不特异——远端以下的阻滞、神经肌肉接头病（突触前）或严重/远端肌病也可降低 CMAP（p.24, p.34）。', 'Low distal amplitude with relatively preserved CV/latency: consistent with axonal loss but not specific — block distal to the stimulation site, presynaptic NMJ disease or severe/distal myopathy also lower the CMAP (p.24, p.34).'));
  }
  if (p.axonal.on && p.day < 5 && p.axonal.site !== 'distal') interp.push(L('<b>超急性期</b>：远端刺激正常而跨病灶刺激下降 = “假性传导阻滞”。约 1 周后复查（沃勒变性完成）才能与真性脱髓鞘阻滞区分（p.35, p.263）。', '<b>Hyperacute</b>: normal distal response with a drop across the lesion = “pseudo-conduction block”. Repeat after ~1 week (Wallerian degeneration complete) to separate it from true demyelinating block (p.35, p.263).'));
  if (p.axonal.on && p.axonal.site === 'rootPre' && !motor && p.axonal.population !== 'motor') {
    interp.push(L('<b>SNAP 正常，尽管 80% 级别的感觉根纤维被离断</b>：病灶位于 DRG 近端（节前），周围感觉突起与其胞体仍相连而不变性。患者可有感觉缺失而 SNAP 正常——提示节前病变（根、脊髓）（p.28–29）。', '<b>Normal SNAP despite transected sensory root fibres</b>: the lesion is proximal to the DRG (preganglionic), so peripheral sensory processes remain attached to their cell bodies and do not degenerate. Sensory loss with a normal SNAP suggests a preganglionic lesion (root, cord) (p.28–29).').replace('80% 级别的', ''));
  }
  if (p.axonal.on && p.axonal.site === 'plexus' && !motor && p.axonal.population !== 'motor' && p.day >= 10) {
    interp.push(L('SNAP 降低：病灶位于 DRG 或其远端（节后，如神经丛），感觉轴突远端发生沃勒变性——这是与神经根病鉴别的关键（p.584）。', 'Low SNAP: the lesion is at or distal to the DRG (postganglionic, e.g. plexus), so sensory axons degenerate distally — the key difference from radiculopathy (p.584).'));
  }
  if (!interp.length) interp.push(L('各项测量与该受试者的正常值一致。临床判断需与年龄/身高/温度匹配的实验室正常值比较。', 'Measurements match this subject’s normal values. Clinical judgement requires age/height/temperature-matched laboratory reference values.'));
  // measures table
  const cols = [L('正常', 'Normal'), L('当前', 'Current'), 'Δ%'];
  const mrows = [];
  rows.forEach((row) => {
    const a = row.mAb;
    const n = row.mNm;
    const site = L(STIM_SITES[row.key]);
    const sc = motor ? 1 : 1000;
    const u = motor ? 'mV' : 'µV';
    mrows.push({ label: `${site} · ${L('起始潜伏期', 'onset latency')}`, unit: 'ms', vals: [n.onset, a.present ? a.onset : null, a.present ? pctChange(n.onset, a.onset) : null], digits: 2 });
    mrows.push({ label: `${site} · ${L('波幅（基线-负峰）', 'amplitude (base–neg peak)')}`, unit: u, vals: [n.amp * sc, a.amp * sc, pctChange(n.amp, a.amp)], digits: motor ? 2 : 0, hl: true });
    mrows.push({ label: `${site} · ${L('负相时程', 'neg. duration')}`, unit: 'ms', vals: [n.duration, a.present ? a.duration : null, a.present ? pctChange(n.duration, a.duration) : null], digits: 2 });
    mrows.push({ label: `${site} · ${L('负相面积', 'neg. area')}`, unit: `${u}·ms`, vals: [n.area * sc, a.area * sc, pctChange(n.area, a.area)], digits: motor ? 1 : 0 });
  });
  r.segs.forEach((s) => {
    mrows.push({
      label: `CV ${L(STIM_SITES[s.from])}–${L(STIM_SITES[s.to])} (${s.dist} mm)`,
      unit: 'm/s',
      vals: [s.cvNm, s.cvAb, s.cvAb ? pctChange(s.cvNm, s.cvAb) : null],
      digits: 1,
      flag: ['', s.cvAb !== null && s.cvAb < 35 ? 'bad' : '', ''],
    });
  });
  if (r.sensCV) mrows.push({ label: L(`感觉 CV（距离/起始潜伏期，${r.sensCV.dist} mm）`, `Sensory CV (distance/onset, ${r.sensCV.dist} mm)`), unit: 'm/s', vals: [r.sensCV.nm, r.sensCV.ab, r.sensCV.ab ? pctChange(r.sensCV.nm, r.sensCV.ab) : null], digits: 1, flag: ['', r.sensCV.ab !== null && r.sensCV.ab < 35 ? 'bad' : '', ''] });
  for (let i = 1; i < rows.length; i++) {
    const a = rows[i - 1].mAb;
    const b = rows[i].mAb;
    const lab = `${L(STIM_SITES[rows[i - 1].key])}→${L(STIM_SITES[rows[i].key])}`;
    const nA = rows[i - 1].mNm;
    const nB = rows[i].mNm;
    const drop = (x, y) => (x && x.present ? (100 * (x.amp - (y.present ? y.amp : 0))) / x.amp : null);
    const adrop = (x, y) => (x && x.present ? (100 * (x.area - (y.present ? y.area : 0))) / x.area : null);
    const ad = adrop(a, b);
    mrows.push({ label: `${lab} ${L('波幅下降', 'amplitude drop')}`, unit: '%', vals: [drop(nA, nB), drop(a, b), ''], digits: 0, flag: ['', motor && drop(a, b) > 20 ? 'warn' : '', ''] });
    mrows.push({ label: `${lab} ${L('面积下降', 'area drop')}`, unit: '%', vals: [adrop(nA, nB), ad, ''], digits: 0, flag: ['', motor && ad > 50 ? 'bad' : motor && ad > 20 ? 'warn' : '', ''] });
    mrows.push({ label: `${lab} ${L('时程增加', 'duration increase')}`, unit: '%', vals: [pctChange(nA.duration, nB.duration), a.present && b.present ? pctChange(a.duration, b.duration) : null, ''], digits: 0, flag: ['', motor && a.present && b.present && pctChange(a.duration, b.duration) > 15 ? 'warn' : '', ''] });
  }
  const measures = {
    cols,
    rows: mrows,
    note: L(
      `测量约定（p.24–27）：潜伏期至首个偏离基线点${motor ? '' : '（三相 SNAP 取起始正峰）'}；波幅 = 基线至负峰；时程 = 负相时程；面积 = 负相面积。运动 CV = 距离 ÷（近端潜伏期 − 远端潜伏期），因为远端潜伏期还包含 NMJ 传递与肌纤维去极化时间（p.25）。彩色阈值标记仅采用教科书给出的标准；“正常”列是同一模拟受试者，而非实验室正常值。`,
      `Conventions (p.24–27): latency to first departure from baseline${motor ? '' : ' (initial positive peak for a triphasic SNAP)'}; amplitude = baseline to negative peak; duration = negative-peak duration; area = negative-peak area. Motor CV = distance ÷ (proximal − distal latency) because distal latency also contains NMJ and muscle depolarisation time (p.25). Coloured flags use only textbook-stated criteria; the “Normal” column is the same simulated subject, not a laboratory reference range.`
    ),
  };
  return {
    chain: [lesionText(p), physText(p), srcTxt, wf, interp.join('<br>')],
    measures,
    caveat: caveat(p),
    sources: L('来源：Preston & Shapiro 第4版 第2–3章（p.13–40），第16章（p.260–266），第29章 p.503。', 'Sources: Preston & Shapiro 4th ed., Ch 2–3 (p.13–40), Ch 16 (p.260–266), Ch 29 p.503.'),
  };
}

function caveat(p) {
  if (p.demyel.on && p.demyel.mechanism === 'nodal') return L('<p>传导失败（阻滞）常被视为获得性脱髓鞘的标志，但结区/旁结区功能障碍（如部分多灶性运动神经病）也可产生阻滞，且改善速度可能快于再髓鞘化所需时间（p.503）。</p>', '<p>Conduction failure is usually taken as a marker of acquired demyelination, but nodal/paranodal dysfunction (e.g. some multifocal motor neuropathy) can also produce block, and may recover faster than remyelination would allow (p.503).</p>');
  if (p.demyel.on) return L('<p>近端波幅下降不等于传导阻滞：离散与相位抵消可单独使 CMAP 面积下降达 50%（p.38）；还须排除近端刺激不足、刺激扩散、Martin-Gruber 吻合（p.67），胫神经腘窝刺激正常人也可下降达 50%（p.37）。</p>', '<p>A proximal amplitude drop is not automatically conduction block: dispersion and phase cancellation alone can cut CMAP area by up to 50% (p.38). Also exclude submaximal proximal stimulation, current spread, Martin-Gruber anastomosis (p.67); tibial popliteal stimulation can drop up to 50% in normals (p.37).</p>');
  if (p.axonal.on) return L('<p>波幅降低并非轴突丢失所特有：远端刺激点与记录电极之间的阻滞、突触前 NMJ 病、严重肌病同样可降低波幅（p.24, p.36–37）。急性损伤数天内远端检查可完全正常（p.34）。</p>', '<p>Low amplitude is not unique to axonal loss: block between the distal stimulation site and the muscle, presynaptic NMJ disease, or severe myopathy also lower it (p.24, p.36–37). Within the first days after injury the distal study can be entirely normal (p.34).</p>');
  if (p.myopathy.on) return L('<p>多数肌病 NCS 正常；只有远端受累或严重全身性肌病才降低 CMAP，而潜伏期与 CV 保持正常（p.38, p.266）。</p>', '<p>Most myopathies have normal NCS; only distal or severe generalised myopathy lowers the CMAP, while latency and CV stay normal (p.38, p.266).</p>');
  return L('<p>正常情况下，近端 SNAP 的波幅与面积明显小于远端，这是生理性的时间离散与相位抵消，运动纤维受影响小得多（p.30–32, Fig 3.11–3.12）。</p>', '<p>Normally, proximal SNAPs are much smaller in amplitude and area than distal ones — physiological dispersion and phase cancellation, which affect motor responses far less (p.30–32, Fig 3.11–3.12).</p>');
}

// ---------------------------------------------------------------------------------------
const WHY = {
  'axonal.frac': {
    zh: '改变了离断轴突的比例。每根被离断（且已沃勒变性）的轴突带走其运动单位的全部肌纤维电位（或其感觉纤维电位），因此波幅与面积大致按比例下降；只要最快纤维仍存活，潜伏期与 CV 几乎不变（p.34）。',
    en: 'You changed the fraction of transected axons. Each transected (and degenerated) axon removes all of its unit’s fibre potentials (or its sensory fibre potential), so amplitude and area fall roughly in proportion; latency and CV barely change as long as the fastest fibres survive (p.34).',
  },
  'axonal.selection': {
    zh: '改变了“哪些轴突丢失”。潜伏期与 CV 只反映最快的纤维（p.25）：若最快纤维优先丢失，CV 会轻度下降、潜伏期轻度延长，但不会低于约 75% LLN（p.34）。',
    en: 'You changed which axons are lost. Latency and CV reflect only the fastest fibres (p.25): losing the fastest first slows CV slightly and prolongs latency slightly, but not below ≈75% of LLN (p.34).',
  },
  day: {
    zh: '改变了距损伤的时间。沃勒变性前，病灶远端的轴突仍可被刺激；之后远端残端失去兴奋性，所有刺激部位的反应都下降（运动 3–5 天、感觉 6–10 天，p.35）。',
    en: 'You changed the time since injury. Before Wallerian degeneration the distal stump is still excitable; afterwards it is not, and responses fall at every site (motor 3–5 d, sensory 6–10 d, p.35).',
  },
  'axonal.site': {
    zh: '改变了病灶部位。刺激点位于病灶远端还是近端决定冲动是否需要穿过病灶；节前根病灶不影响 DRG 以下的感觉突起（p.28–29）。',
    en: 'You changed the lesion site. Whether the stimulation site lies distal or proximal to the lesion decides if impulses must cross it; a preganglionic root lesion spares sensory processes below the DRG (p.28–29).',
  },
  'axonal.population': { zh: '改变了受累的纤维群：只累及运动纤维时 SNAP 不变，反之亦然。', en: 'You changed the affected population: a motor-only lesion leaves the SNAP unchanged, and vice versa.' },
  'demyel.slowing': {
    zh: '改变了病灶段的减速程度。冲动通过病灶所需时间增加 → 跨病灶刺激的潜伏期延长、节段 CV 降低；远端刺激（未穿过病灶）不受影响。',
    en: 'You changed the slowing in the segment. Crossing the lesion takes longer → latency from stimulation across the lesion increases and segmental CV falls; distal stimulation (not crossing it) is unaffected.',
  },
  'demyel.dispersion': {
    zh: '改变了各轴突减速的差异。到达时间更分散 → 复合电位时程延长、峰值降低；一根纤维的正相与另一根的负相重叠相互抵消，面积也随之下降（相位抵消，p.31, p.38）。感觉电位时程短，受影响更大。',
    en: 'You changed how unequally axons slow. Arrivals spread out → the compound response lasts longer with a lower peak; the positive phase of one fibre overlapping the negative phase of another cancels, lowering area too (phase cancellation, p.31, p.38). Short sensory potentials are affected more.',
  },
  'demyel.block': {
    zh: '改变了传导失败的比例。被阻滞的轴突在病灶处停止：病灶近端刺激时其贡献消失（波幅与面积下降），病灶远端刺激时仍正常——远端刺激“绕过”了阻滞（p.37, Fig 3.20）。',
    en: 'You changed the fraction of blocked axons. Blocked axons stop at the lesion: with stimulation proximal to it their contribution disappears (amplitude and area fall); with stimulation distal to it they are normal — distal stimulation bypasses the block (p.37, Fig 3.20).',
  },
  'demyel.site': { zh: '改变了脱髓鞘部位：只有跨越该部位的刺激-记录路径受影响（p.262 Fig 16.2）。', en: 'You moved the demyelinated segment: only stimulation–recording paths that cross it are affected (p.262, Fig 16.2).' },
  'demyel.diffuseSlowing': { zh: '改变了全程均一减速：所有潜伏期按比例延长、CV 降低；因各轴突同样减慢，近远端波形形态相似（遗传性脱髓鞘样，p.34, p.38）。', en: 'You changed uniform slowing: all latencies lengthen and CVs fall; because every axon slows similarly, morphology stays similar between sites (inherited-like, p.34, p.38).' },
  'demyel.mechanism': { zh: '切换了阻滞机制。节性功能障碍在模型中只造成传导失败而无减速/离散——提示“阻滞”本身不能区分结构性脱髓鞘与结区功能障碍。', en: 'You switched the block mechanism. Nodal dysfunction here causes failure without slowing or dispersion — block alone cannot tell structural demyelination from nodal dysfunction.' },
  'myopathy.fiberLoss': { zh: '改变了肌纤维丢失。CMAP 是肌纤维电位之和，因此按比例下降；而潜伏期、CV（神经与 NMJ 正常）不变；SNAP 完全不受影响（p.38）。', en: 'You changed fibre loss. The CMAP sums muscle-fibre potentials, so it falls; latency and CV (normal nerve and NMJ) do not; the SNAP is unaffected (p.38).' },
  study: { zh: '切换了记录类型：CMAP 是肌肉的复合反应（经过 NMJ 与肌纤维），SNAP 是感觉神经本身的复合反应（p.23–26）。', en: 'You switched the study: the CMAP is a summed muscle response (through NMJ and muscle fibres); the SNAP is a summed response of the sensory nerve itself (p.23–26).' },
};

export function why(prev, cur) {
  const key = prev.changed;
  const pr = prev.result;
  const cr = cur.result;
  let html = `<p>${WHY[key] ? L(WHY[key]) : L(`改变了参数“${key}”。`, `You changed “${key}”.`)}</p>`;
  if (pr && cr && pr.rows && cr.rows && pr.p.study === cr.p.study) {
    html += '<ul>';
    cr.rows.forEach((row, i) => {
      const a = pr.rows[i]?.mAb;
      const b = row.mAb;
      if (!a) return;
      const fmtAmp = (m) => (m.present ? (cr.p.study === 'motor' ? `${fmt(m.amp, 2)} mV` : `${fmt(m.amp * 1000, 0)} µV`) : '—');
      html += `<li>${L(STIM_SITES[row.key])}: ${L('波幅', 'amp')} ${fmtAmp(a)} → <b>${fmtAmp(b)}</b>; ${L('面积', 'area')} ${fmt(pctChange(a.area, b.area), 0)}%; ${L('时程', 'duration')} ${fmt(a.duration, 2)} → <b>${fmt(b.duration, 2)}</b> ms; ${L('潜伏期', 'latency')} ${fmt(a.onset, 2)} → <b>${fmt(b.onset, 2)}</b> ms</li>`;
    });
    cr.segs.forEach((s, i) => {
      const ps = pr.segs[i];
      if (ps) html += `<li>CV ${L(STIM_SITES[s.from])}–${L(STIM_SITES[s.to])}: ${fmt(ps.cvAb, 1)} → <b>${fmt(s.cvAb, 1)}</b> m/s</li>`;
    });
    html += '</ul>';
  }
  return html;
}

// ---------------------------------------------------------------------------------------
const base = () => JSON.parse(JSON.stringify(DEFAULT_PARAMS));
export function comparePresets() {
  // day 21: Wallerian degeneration complete, reinnervation not yet started (clean axonal pattern)
  const mk = (key, label, f) => ({ key, label, params: (cur) => ({ ...base(), day: 21, study: cur.study, stim: cur.stim, noise: cur.noise, ...f() }) });
  return [
    mk('normal', { zh: '正常', en: 'Normal' }, () => ({})),
    mk('axonal', { zh: '轴突丢失 50%', en: 'Axonal loss 50%' }, () => ({ axonal: { ...base().axonal, on: true, frac: 0.5 } })),
    mk('block', { zh: '前臂传导阻滞 50%', en: 'Forearm block 50%' }, () => ({ demyel: { ...base().demyel, on: true, slowing: 0.3, dispersion: 0.2, block: 0.5 } })),
    mk('dispersion', { zh: '离散为主（无阻滞）', en: 'Dispersion only (no block)' }, () => ({ demyel: { ...base().demyel, on: true, slowing: 0.55, dispersion: 1.2, block: 0 } })),
    mk('uniform', { zh: '均一减速（遗传性样）', en: 'Uniform slowing (inherited-like)' }, () => ({ demyel: { ...base().demyel, on: true, site: 'diffuse', diffuseSlowing: 0.45 } })),
    mk('hyper', { zh: '超急性轴突损伤（第2天）', en: 'Hyperacute axonal (day 2)' }, () => ({ day: 2, axonal: { ...base().axonal, on: true, frac: 0.5 } })),
    mk('nodal', { zh: '郎飞结传导失败 50%', en: 'Nodal failure 50%' }, () => ({ demyel: { ...base().demyel, on: true, mechanism: 'nodal', block: 0.5 } })),
    mk('myopathy', { zh: '重度肌病', en: 'Severe myopathy' }, () => ({ myopathy: { ...base().myopathy, on: true, fiberLoss: 0.6 } })),
  ];
}

export function compareExplain(list, p) {
  const cols = list.map((x) => L(x.preset.label));
  const motor = p.study === 'motor';
  const sc = motor ? 1 : 1000;
  const rows = [];
  const get = (r, i) => r.rows[i]?.mAb;
  const sites = list[0].result.rows.map((r) => r.key);
  sites.forEach((k, i) => {
    rows.push({ label: `${L(STIM_SITES[k])} ${L('波幅', 'amplitude')}`, unit: motor ? 'mV' : 'µV', vals: list.map((x) => (get(x.result, i)?.present ? get(x.result, i).amp * sc : null)), digits: motor ? 2 : 0 });
    rows.push({ label: `${L(STIM_SITES[k])} ${L('面积', 'area')}`, unit: motor ? 'mV·ms' : 'µV·ms', vals: list.map((x) => (get(x.result, i)?.present ? get(x.result, i).area * sc : null)), digits: 1 });
    rows.push({ label: `${L(STIM_SITES[k])} ${L('时程', 'duration')}`, unit: 'ms', vals: list.map((x) => (get(x.result, i)?.present ? get(x.result, i).duration : null)), digits: 2 });
    rows.push({ label: `${L(STIM_SITES[k])} ${L('潜伏期', 'latency')}`, unit: 'ms', vals: list.map((x) => (get(x.result, i)?.present ? get(x.result, i).onset : null)), digits: 2 });
  });
  list[0].result.segs.forEach((s, j) => rows.push({ label: `CV ${L(STIM_SITES[s.from])}–${L(STIM_SITES[s.to])}`, unit: 'm/s', vals: list.map((x) => x.result.segs[j]?.cvAb ?? null), digits: 1 }));
  return {
    chain: null,
    measures: { cols, rows, note: L('同一受试者、同一刺激、同一测量规则；只改变病理机制。注意不同机制可产生相似的远端波幅下降。', 'Same subject, stimulation and measurement rules; only the mechanism differs. Note how different mechanisms can produce similar amplitude reductions.') },
    caveat: L('<p>比较要点：轴突丢失使所有部位的波幅同等下降；阻滞只影响跨病灶的刺激；离散使波形变宽、峰值下降而面积相对保留；超急性轴突损伤在早期模拟阻滞（p.34–38）。</p>', '<p>What to compare: axonal loss lowers all sites equally; block affects only stimulation across the lesion; dispersion widens the response and lowers the peak while area is relatively preserved; hyperacute axonal injury mimics block early (p.34–38).</p>'),
  };
}

export function macroLegend(p, th) {
  return `<span><i style="background:${th.motor}"></i>${L('运动轴突（彩色 = 单个代表轴突）', 'motor axons (colour = one representative axon)')}</span><span><i style="background:${th.sensory}"></i>${L('DRG / 感觉', 'DRG / sensory')}</span><span><i style="background:${th.lesion};opacity:.5"></i>${L('轴突病灶', 'axonal lesion')}</span><span><i style="background:${th.warn};opacity:.5"></i>${L('脱髓鞘段', 'demyelinated segment')}</span><span>${L('虚线 = 已变性；✕ = 冲动在此终止', 'dashed = degenerated; ✕ = impulse stops here')}</span>`;
}

export function microLegend(p) {
  return `<span>${L('郎飞结（圆点）= 去极化部位；黄色 = 当前兴奋的结。微观图为示意，与时间轴同步但非比例。', 'Nodes (dots) depolarise; yellow = currently active node. Schematic, synchronised to the time cursor but not to scale.')}</span>`;
}

export function modelNotes() {
  return L(
    `<ul><li>CMAP：120 个运动单位，每个单位由数十至数百根肌纤维组成（共约 2.3 万根），每根肌纤维的表面电位由线源体积导体模型计算（Rosenfalck 细胞内电位分布），肌腹-肌腱双极导联。</li><li>SNAP：600 根感觉轴突，每根的行进电位在 G1 与 G2 处计算后相减。</li><li>每根轴突逐段积分传导时间；脱髓鞘只作用于病灶段；阻滞 = 该轴突在病灶处停止；轴突离断后远端在 3–5 天（运动）/6–10 天（感觉）内变性。</li><li>绝对波幅已标定为正常 CMAP ≈9 mV、SNAP ≈35 µV（示意标定）。</li><li>已知偏差：模型远端 SNAP 负相时程约 0.8 ms，短于教科书典型的 1.3 ms（见 KNOWN_ISSUES）。</li></ul>`,
    `<ul><li>CMAP: 120 motor units, each made of tens to hundreds of muscle fibres (~23,000 fibres); each fibre’s surface potential comes from a line-source volume-conductor model (Rosenfalck intracellular profile), belly–tendon bipolar montage.</li><li>SNAP: 600 sensory axons; each travelling potential is computed at G1 and G2 and subtracted.</li><li>Conduction time is integrated segment by segment per axon; demyelination acts only in the lesion segment; block = the axon stops there; transected distal stumps degenerate over 3–5 d (motor) / 6–10 d (sensory).</li><li>Absolute amplitudes are calibrated so the normal CMAP ≈9 mV and SNAP ≈35 µV (illustrative calibration).</li><li>Known deviation: modelled distal SNAP negative duration ≈0.8 ms, shorter than the textbook’s typical 1.3 ms (see KNOWN_ISSUES).</li></ul>`
  );
}
