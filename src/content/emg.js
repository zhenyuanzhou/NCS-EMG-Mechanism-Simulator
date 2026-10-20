// Explanatory content for the needle EMG module.
import { L } from './i18n.js';
import { fmt, pctChange } from '../core/util.js';
import { DEFAULT_PARAMS } from '../physiology/subject.js';
import { theme, unitColor } from '../render/theme.js';
import { DMAX } from '../physiology/recruitment.js';

const DAY_STEPS = [1, 3, 5, 7, 10, 14, 21, 28, 35, 45, 60, 90, 120, 180, 270, 365, 540, 730];
const dayFmt = (d) => (d >= 30 ? L(`${(d / 30).toFixed(d % 30 ? 1 : 0)} 个月`, `${(d / 30).toFixed(d % 30 ? 1 : 0)} mo`) : L(`${d} 天`, `${d} d`));

export function controls(p, r) {
  const focusOpts = [{ value: null, label: { zh: '自动（最低阈值的可辨单位）', en: 'auto (lowest-threshold discernible unit)' } }];
  if (r && r.muaps) {
    [...r.muaps.keys()]
      .map((u) => [u, r.qA.get(u)])
      .filter(([, q]) => q.p2p >= 0.15)
      .sort((a, b) => b[1].p2p - a[1].p2p)
      .slice(0, 10)
      .forEach(([u, q]) => focusOpts.push({ value: u, label: { zh: `MU ${u}（${(q.p2p * 1000).toFixed(0)} µV）`, en: `MU ${u} (${(q.p2p * 1000).toFixed(0)} µV)` } }));
  }
  const vol = (q) => !['rest', 'insertion'].includes(q.activity);
  return [
    {
      title: { zh: '记录', en: 'Recording' },
      items: [
        {
          type: 'chips',
          path: 'display',
          label: { zh: '层级', en: 'Level' },
          options: [
            { value: 'muap', label: { zh: '纤维 → MUAP', en: 'fibres → MUAP' } },
            { value: 'record', label: { zh: '放电与募集', en: 'firing & recruitment' } },
          ],
        },
        {
          type: 'chips',
          path: 'activity',
          label: { zh: '状态', en: 'State' },
          options: [
            { value: 'rest', label: { zh: '静息', en: 'rest' } },
            { value: 'insertion', label: { zh: '插入', en: 'insertion' } },
            { value: 'mild', label: { zh: '轻收缩', en: 'mild' } },
            { value: 'strong', label: { zh: '强收缩', en: 'strong' } },
            { value: 'max', label: { zh: '最大用力', en: 'maximal' } },
          ],
        },
        {
          type: 'chips',
          path: 'effortMode',
          label: { zh: '比较条件', en: 'Matched condition' },
          options: [
            { value: 'force', label: { zh: '相同目标力', en: 'same target force' } },
            { value: 'drive', label: { zh: '相同神经驱动', en: 'same neural drive' } },
          ],
          show: (q) => vol(q) && q.activity !== 'max',
          help: { zh: '“相同神经驱动”：给出同样的中枢指令，看产生多少力；“相同目标力”：达到同样的力需要募集多少单位。', en: '“Same drive”: give the same central command and see how much force results; “same force”: see how many units are needed to reach the same force.' },
        },
        { type: 'range', path: 'targetForce', label: { zh: '目标力（正常最大力的 %）', en: 'Target force (% of normal max)' }, min: 2, max: 100, step: 1, fmt: (v) => `${v}%`, show: (q) => vol(q) && q.activity !== 'max' && q.effortMode === 'force' },
        { type: 'range', path: 'drive', label: { zh: '神经驱动（% 最大）', en: 'Neural drive (% of max)' }, min: 0, max: 100, step: 1, fmt: (v) => `${v}%`, show: (q) => vol(q) && q.activity !== 'max' && q.effortMode === 'drive' },
      ],
    },
    {
      title: { zh: '针电极', en: 'Needle' },
      items: [
        { type: 'range', path: 'needle.z', label: { zh: '距终板带的距离', en: 'Distance from endplate band' }, min: 2, max: 22, step: 1, fmt: (v) => `${v} mm` },
        { type: 'select', path: 'focus', label: { zh: '聚焦的运动单位', en: 'Focus motor unit' }, options: focusOpts },
        { type: 'toggle', path: 'zoom', label: { zh: '放大针尖附近（6 mm 视野）', en: 'Zoom around the tip (6 mm field)' } },
        { type: 'info', text: { zh: '在中观图中点击可移动针尖：病理不变，只有采样到的纤维改变。', en: 'Click the Meso view to move the tip: pathology stays the same, only the sampled fibres change.' } },
      ],
    },
    {
      title: { zh: '神经源性', en: 'Neurogenic' }, pathology: true,
      items: [
        { type: 'toggle', path: 'axonal.on', label: { zh: '运动轴突丢失（前臂病灶）', en: 'Motor axon loss (forearm lesion)' } },
        { type: 'range', path: 'axonal.frac', label: { zh: '丢失的运动轴突', en: 'Motor axons lost' }, min: 0.1, max: 0.95, step: 0.05, fmt: (v) => `${Math.round(v * 100)}%`, show: (q) => q.axonal.on },
        { type: 'steps', path: 'day', values: DAY_STEPS, label: { zh: '距损伤时间', en: 'Time since injury' }, fmt: dayFmt, show: (q) => q.axonal.on },
        { type: 'range', path: 'reinnervation', label: { zh: '侧支再支配程度', en: 'Collateral reinnervation extent' }, min: 0, max: 1, step: 0.05, fmt: (v) => `${Math.round(v * 100)}%`, show: (q) => q.axonal.on, help: { zh: '被孤立肌纤维最终被邻近存活单位接管的比例（示意参数）。', en: 'Fraction of orphaned fibres eventually adopted by nearby surviving units (illustrative).' } },
        { type: 'range', path: 'block', label: { zh: '传导阻滞（无轴突丢失）', en: 'Conduction block (no axon loss)' }, min: 0, max: 0.9, step: 0.05, fmt: (v) => `${Math.round(v * 100)}%`, help: { zh: '被阻滞的单位不能被随意激活，但不发生去神经。', en: 'Blocked units cannot be voluntarily activated, but are not denervated.' } },
      ],
    },
    {
      title: { zh: '肌源性', en: 'Myopathic' }, pathology: true,
      items: [
        { type: 'toggle', path: 'myopathy.on', label: { zh: '运动单位内肌纤维丢失', en: 'Fibre loss inside motor units' } },
        { type: 'range', path: 'myopathy.fiberLoss', label: { zh: '肌纤维丢失', en: 'Fibre loss' }, min: 0.1, max: 0.85, step: 0.05, fmt: (v) => `${Math.round(v * 100)}%`, show: (q) => q.myopathy.on },
        { type: 'range', path: 'myopathy.sizeVar', label: { zh: '纤维大小变异', en: 'Fibre-size variability' }, min: 0, max: 1, step: 0.05, fmt: (v) => v.toFixed(2), show: (q) => q.myopathy.on },
        { type: 'toggle', path: 'irritabilityOnly', label: { zh: '膜易激性（独立于纤维丢失）', en: 'Membrane irritability (independent of fibre loss)' }, help: { zh: '部分肌纤维自发放电（纤颤电位/正锐波）。', en: 'Some fibres discharge spontaneously (fibrillations/PSWs).' } },
      ],
    },
    {
      title: { zh: '中枢', en: 'Central' }, pathology: true,
      items: [{ type: 'range', path: 'centralCap', label: { zh: '可达到的中枢驱动', en: 'Achievable central drive' }, min: 0.15, max: 1, step: 0.05, fmt: (v) => `${Math.round(v * 100)}%`, help: { zh: '疼痛、配合不佳或上运动神经元病变时，放电频率无法提高（激活减少，p.253）。', en: 'With pain, poor effort or upper motor neuron lesions, firing rates cannot rise (reduced activation, p.253).' } }],
    },
  ];
}

function lesionText(p) {
  const out = [];
  if (p.axonal.on) out.push(L(`前臂病灶：${Math.round(p.axonal.frac * 100)}% 运动轴突离断，伤后 ${dayFmt(p.day)}；侧支再支配程度 ${Math.round(p.reinnervation * 100)}%。`, `Forearm lesion: ${Math.round(p.axonal.frac * 100)}% of motor axons transected, ${dayFmt(p.day)} after injury; collateral reinnervation ${Math.round(p.reinnervation * 100)}%.`));
  if (p.block > 0) out.push(L(`前臂传导阻滞：${Math.round(p.block * 100)}% 运动轴突无法通过（轴突完整）。`, `Forearm conduction block: ${Math.round(p.block * 100)}% of motor axons cannot pass (axons intact).`));
  if (p.myopathy.on) out.push(L(`肌病：每个运动单位约 ${Math.round(p.myopathy.fiberLoss * 100)}% 肌纤维丢失，纤维大小变异 ${p.myopathy.sizeVar.toFixed(2)}。`, `Myopathy: ≈${Math.round(p.myopathy.fiberLoss * 100)}% of fibres lost within each unit, size variability ${p.myopathy.sizeVar.toFixed(2)}.`));
  if (p.irritabilityOnly) out.push(L('肌膜易激：少量肌纤维自发放电。', 'Membrane irritability: a few fibres discharge spontaneously.'));
  if ((p.centralCap ?? 1) < 1) out.push(L(`中枢驱动最多只能达到正常的 ${Math.round(p.centralCap * 100)}%（周围运动单位完整）。`, `Central drive limited to ${Math.round(p.centralCap * 100)}% of normal (peripheral motor units intact).`));
  return out.length ? out.join('<br>') : L('无病变（正常肌肉）。', 'No lesion (normal muscle).');
}

export function explain(r, p) {
  const qA = r.focus !== null ? r.qA.get(r.focus) : null;
  const qN = r.focus !== null && r.qN.has(r.focus) ? r.qN.get(r.focus) : null;
  const rest = p.activity === 'rest' || p.activity === 'insertion';
  const nNear = r.fm ? r.fm.fibers.filter((f) => f.r < 1).length : 0;
  const nNearN = r.fmN ? r.fmN.fibers.filter((f) => f.r < 1).length : 0;
  const nReinn = r.fm ? r.fm.fibers.filter((f) => f.reinnervated).length : 0;
  const spontNear = r.rest.events.filter((e) => e.kind !== 'insertion').length;
  const phys = [];
  if (p.axonal.on) {
    const lost = r.totalUnits - r.aliveUnits;
    if (p.day < 3) phys.push(L('沃勒变性尚未完成：远端轴突与终板仍完整，但这些单位已不能被中枢驱动（病灶在其近端）。', 'Wallerian degeneration not complete: distal axons and endplates still intact, but these units can no longer be driven centrally (lesion proximal to them).'));
    phys.push(L(`可被随意激活的单位：${r.aliveUnits}/${r.totalUnits}。去神经肌纤维 ${r.denervated} 根，其中 ${r.fibrillating} 根已出现自发放电（纤颤）。`, `Voluntarily available units: ${r.aliveUnits}/${r.totalUnits}. Denervated fibres: ${r.denervated}, of which ${r.fibrillating} already fire spontaneously (fibrillation).`));
    if (p.day >= 25) phys.push(L('存活轴突的侧支芽生接管孤立的肌纤维：新芽细、传导慢、NMJ 不成熟 → 早期出现“卫星电位”与不稳定；成熟后并入主波 → 单位变大（p.248–249, p.255–256）。', 'Surviving axons sprout and adopt orphaned fibres: new sprouts are thin, slow and have immature NMJs → early satellite potentials and instability; when mature they merge into the main potential → larger units (p.248–249, p.255–256).'));
  }
  if (p.block > 0) phys.push(L('被阻滞的单位轴突完整：不去神经、不再支配，只是不能被随意激活。', 'Blocked units keep their axons: no denervation, no reinnervation — they simply cannot be activated voluntarily.'));
  if (p.myopathy.on) phys.push(L(`前角细胞与轴突完整，运动单位数目不变；每个单位内可兴奋的肌纤维减少（共丢失 ${r.lost} 根），剩余纤维大小不一 → 单位产生的力变小。`, `Anterior horn cells and axons are intact, the number of units is unchanged; fewer excitable fibres per unit (${r.lost} lost in total) with variable sizes → each unit makes less force.`));
  if ((p.centralCap ?? 1) < 1) phys.push(L('周围运动单位正常；问题在于中枢不能使其高频放电（激活不足）。', 'Peripheral units are normal; the problem is that they cannot be driven to fire fast (poor activation).'));
  if (!phys.length) phys.push(L('每个运动单位：一个前角细胞、一根轴突和散布在 5–10 mm 区域内的肌纤维（p.245）。', 'Each motor unit: one anterior horn cell, one axon and fibres scattered over a 5–10 mm territory (p.245).'));
  const src = [];
  src.push(L(`针尖附近：MU ${r.focus ?? '—'} 在 1 mm 内有 ${nNear} 根纤维（正常 ${nNearN}）${nReinn ? `，其中 ${nReinn} 根为再支配纤维` : ''}。可辨单位（≥0.5 mV）：${r.dA.length}（正常 ${r.dN.length}）。`, `Near the tip: MU ${r.focus ?? '—'} has ${nNear} fibres within 1 mm (normal ${nNearN})${nReinn ? `, ${nReinn} of them reinnervated` : ''}. Discernible units (≥0.5 mV): ${r.dA.length} (normal ${r.dN.length}).`));
  if (rest) src.push(L(`静息时针尖附近每秒约 ${spontNear} 次单纤维自发放电。`, `At rest ≈${spontNear} single-fibre spontaneous discharges per second near the tip.`));
  else src.push(L(`神经驱动 ${fmt((100 * r.eA.drive) / DMAX, 0)}%（正常 ${fmt((100 * r.eN.drive) / DMAX, 0)}%）→ 全肌募集 ${r.stA.nActive} 个单位（正常 ${r.stN.nActive}）→ 力 ${fmt(r.stA.forcePct, 0)}%（正常 ${fmt(r.stN.forcePct, 0)}%）。`, `Neural drive ${fmt((100 * r.eA.drive) / DMAX, 0)}% (normal ${fmt((100 * r.eN.drive) / DMAX, 0)}%) → ${r.stA.nActive} units recruited in the muscle (normal ${r.stN.nActive}) → force ${fmt(r.stA.forcePct, 0)}% (normal ${fmt(r.stN.forcePct, 0)}%).`));
  const wf = [];
  if (qA && qA.present) wf.push(L(`聚焦 MUAP：${fmt(qA.p2p * 1000, 0)} µV、${fmt(qA.duration, 1)} ms、${qA.phases} 相${qN && qN.present ? `（同一单位正常时 ${fmt(qN.p2p * 1000, 0)} µV、${fmt(qN.duration, 1)} ms、${qN.phases} 相）` : ''}。`, `Focus MUAP: ${fmt(qA.p2p * 1000, 0)} µV, ${fmt(qA.duration, 1)} ms, ${qA.phases} phases${qN && qN.present ? ` (same unit when normal: ${fmt(qN.p2p * 1000, 0)} µV, ${fmt(qN.duration, 1)} ms, ${qN.phases} phases)` : ''}.`));
  wf.push(L(`多部位取样（${r.sA.n} 个 MUAP）：平均时程 ${fmt(r.sA.dur, 1)} ms（正常 ${fmt(r.sN.dur, 1)}），平均波幅 ${fmt(r.sA.amp * 1000, 0)} µV（正常 ${fmt(r.sN.amp * 1000, 0)}），多相 ${fmt(r.sA.poly, 0)}%（正常 ${fmt(r.sN.poly, 0)}%）。`, `Survey (${r.sA.n} MUAPs): mean duration ${fmt(r.sA.dur, 1)} ms (normal ${fmt(r.sN.dur, 1)}), mean amplitude ${fmt(r.sA.amp * 1000, 0)} µV (normal ${fmt(r.sN.amp * 1000, 0)}), polyphasic ${fmt(r.sA.poly, 0)}% (normal ${fmt(r.sN.poly, 0)}%).`));
  if (!rest) wf.push(L(`募集：针尖处 ${r.firingA.length} 个可辨单位在放电，最快 ${fmt(r.rateA, 0)} Hz（正常 ${r.firingN.length} 个，最快 ${fmt(r.rateN, 0)} Hz）。`, `Recruitment: ${r.firingA.length} discernible units firing at the tip, fastest ${fmt(r.rateA, 0)} Hz (normal ${r.firingN.length}, fastest ${fmt(r.rateN, 0)} Hz).`));
  return {
    chain: [lesionText(p), phys.join(' '), src.join('<br>'), wf.join('<br>'), interpret(r, p)],
    measures: measures(r, p),
    caveat: caveat(p),
    sources: L('来源：第12、14、15、16章（p.135–137, 231–268）。', 'Sources: Ch 12, 14, 15, 16 (p.135–137, 231–268).'),
  };
}

function ratio(rate, n) {
  return n ? rate / n : null;
}

function interpret(r, p) {
  const out = [];
  const rest = p.activity === 'rest' || p.activity === 'insertion';
  const ra = ratio(r.rateA, r.firingA.length);
  if (rest) {
    if (r.rest.events.some((e) => e.kind === 'fib' || e.kind === 'psw')) out.push(L('静息时可见纤颤电位/正锐波：单根肌纤维的自发放电，提示“活动性失神经”，但也见于部分肌病（炎性、坏死性、肌营养不良）及重度 NMJ 病（肉毒中毒）（p.234）。', 'Fibrillations/PSWs at rest: spontaneous single-fibre discharges indicating active denervation — but also seen in some myopathies (inflammatory, necrotising, dystrophies) and severe NMJ disease (botulism) (p.234).'));
    else if (p.axonal.on && p.day < 10) out.push(L('静息电静息：失神经电位尚未出现——出现时间取决于病灶到肌肉的神经长度（p.236）。早期检查正常并不排除轴突损伤。', 'Electrically silent at rest: denervation potentials have not yet appeared — onset depends on nerve length between lesion and muscle (p.236). An early normal study does not exclude axonal injury.'));
    else out.push(L('静息无自发电位。插入活动正常应 ≤300 ms（p.137）。', 'No spontaneous activity at rest. Normal insertional activity lasts ≤300 ms (p.137).'));
    return out.join('<br>');
  }
  if (ra !== null) {
    if (ra > 7.5 && (p.axonal.on || p.block > 0)) out.push(L(`<b>募集减少</b>：最快单位 ${fmt(r.rateA, 0)} Hz 而针尖处只有 ${r.firingA.length} 个单位（比值 ≈${fmt(ra, 0)}:1，正常约 5:1，p.253）。剩余单位只能靠更快放电来产生力。`, `<b>Reduced recruitment</b>: fastest unit ${fmt(r.rateA, 0)} Hz with only ${r.firingA.length} units at the tip (ratio ≈${fmt(ra, 0)}:1 vs ≈5:1 normally, p.253). The remaining units must fire faster to make force.`));
    if ((p.centralCap ?? 1) < 1 && r.rateA < 0.8 * r.rateN) out.push(L(`<b>激活减少</b>：放电频率最高只有 ${fmt(r.rateA, 0)} Hz，但单位数与频率之比仍正常——干扰相稀疏并不等于周围运动单位丢失（p.253–254）。`, `<b>Reduced activation</b>: firing rates rise only to ${fmt(r.rateA, 0)} Hz, but the number of units remains appropriate for that rate — a sparse interference pattern does not by itself mean peripheral unit loss (p.253–254).`));
  }
  if (p.myopathy.on) {
    if (p.effortMode === 'force' && r.stA.nActive > r.stN.nActive) out.push(L(`<b>早期募集</b>：为达到同样的 ${p.targetForce}% 力，需要募集 ${r.stA.nActive} 个单位（正常 ${r.stN.nActive}），因为每个单位的力变小（p.254, p.256–257）。`, `<b>Early recruitment</b>: reaching the same ${p.targetForce}% force needs ${r.stA.nActive} units (normal ${r.stN.nActive}) because each unit makes less force (p.254, p.256–257).`));
    if (p.effortMode === 'drive') out.push(L(`相同神经驱动下，单位数与频率与正常相同，但只产生 ${fmt(r.stA.forcePct, 0)}% 的力（正常 ${fmt(r.stN.forcePct, 0)}%）——“早期募集”是相对于力而言的（p.254）。`, `With the same drive, the same units fire at the same rates, but produce only ${fmt(r.stA.forcePct, 0)}% force (normal ${fmt(r.stN.forcePct, 0)}%) — “early recruitment” is relative to force (p.254).`));
    out.push(L('短时程、低波幅、多相 MUAP + 正常或早期募集 = 典型肌病模式（p.256–257）。', 'Short, small, polyphasic MUAPs with normal or early recruitment = the classic myopathic pattern (p.256–257).'));
  }
  if (p.axonal.on) {
    if (r.sA.dur > 1.1 * r.sN.dur && r.sA.amp > 1.1 * r.sN.amp) out.push(L('长时程、高波幅（多相）MUAP + 募集减少 = 慢性神经源性（再支配）模式；至少需数周、通常数月形成（p.256）。', 'Long-duration, high-amplitude (polyphasic) MUAPs with reduced recruitment = chronic neurogenic (reinnervation) pattern; takes at least weeks and usually months (p.256).'));
    else if (p.day < 21) out.push(L('急性期：MUAP 形态仍正常，唯一异常为募集减少（p.255）。', 'Acute: MUAP morphology still normal; reduced recruitment is the only abnormality (p.255).'));
    if (p.reinnervation < 0.2 && p.day > 90) out.push(L('再支配很少：若只靠轴突再生，早期的“新生单位”短小多相，却伴明显募集减少——不要误认为肌病（p.257）。', 'Little collateral reinnervation: early regenerated “nascent” units are small and polyphasic but with markedly reduced recruitment — do not mistake them for myopathy (p.257).'));
  }
  if (p.block > 0 && !p.axonal.on) out.push(L('单纯脱髓鞘传导阻滞：募集减少而 MUAP 形态正常、无纤颤（p.256, p.262）。', 'Pure demyelinating block: reduced recruitment with normal MUAP morphology and no fibrillations (p.256, p.262).'));
  if (!out.length) out.push(L('MUAP 形态与募集与正常一致。', 'MUAP morphology and recruitment match normal.'));
  return out.join('<br>');
}

function measures(r, p) {
  const qA = r.focus !== null ? r.qA.get(r.focus) : null;
  const qN = r.focus !== null && r.qN.has(r.focus) ? r.qN.get(r.focus) : null;
  const rows = [
    { label: L('神经驱动', 'Neural drive'), unit: '%', vals: [(100 * r.eN.drive) / DMAX, (100 * r.eA.drive) / DMAX], digits: 0 },
    { label: L('产生的力', 'Force produced'), unit: '%', vals: [r.stN.forcePct, r.stA.forcePct], digits: 0, hl: p.effortMode === 'drive' },
    { label: L('全肌募集的单位', 'Units recruited (muscle)'), vals: [r.stN.nActive, r.stA.nActive], digits: 0, hl: p.effortMode === 'force' },
    { label: L('针尖处放电的可辨单位', 'Discernible units firing at tip'), vals: [r.firingN.length, r.firingA.length], digits: 0 },
    { label: L('最快单位放电频率', 'Fastest unit firing rate'), unit: 'Hz', vals: [r.rateN, r.rateA], digits: 0 },
    { label: L('频率 : 单位数', 'Rate : units'), vals: [ratio(r.rateN, r.firingN.length), ratio(r.rateA, r.firingA.length)], digits: 1, flag: ['', ratio(r.rateA, r.firingA.length) > 7.5 ? 'warn' : ''] },
    { label: L('聚焦 MUAP 波幅', 'Focus MUAP amplitude'), unit: 'µV', vals: [qN && qN.present ? qN.p2p * 1000 : null, qA && qA.present ? qA.p2p * 1000 : null], digits: 0 },
    { label: L('聚焦 MUAP 时程', 'Focus MUAP duration'), unit: 'ms', vals: [qN && qN.present ? qN.duration : null, qA && qA.present ? qA.duration : null], digits: 1 },
    { label: L('聚焦 MUAP 相数', 'Focus MUAP phases'), vals: [qN && qN.present ? qN.phases : null, qA && qA.present ? qA.phases : null], digits: 0 },
    { label: L('取样平均时程', 'Survey mean duration'), unit: 'ms', vals: [r.sN.dur, r.sA.dur], digits: 1, hl: true },
    { label: L('取样平均波幅', 'Survey mean amplitude'), unit: 'µV', vals: [r.sN.amp * 1000, r.sA.amp * 1000], digits: 0 },
    { label: L('多相 MUAP 比例', 'Polyphasic MUAPs'), unit: '%', vals: [r.sN.poly, r.sA.poly], digits: 0 },
    { label: L('自发放电的肌纤维（全肌）', 'Spontaneously firing fibres (muscle)'), vals: [0, r.fibrillating], digits: 0, flag: ['', r.fibrillating ? 'bad' : ''] },
  ];
  return {
    cols: [L('正常', 'Normal'), L('当前', 'Current')],
    rows,
    note: L('“可辨单位”= 正常肌肉在此针位峰-峰值 ≥0.5 mV 的 MUAP（模型标定 5:1 规则所用的定义）；病理肌肉中追踪同一批单位（仍 ≥0.1 mV 且可被随意激活者），再加上新变为 ≥0.5 mV 的单位（如再支配后变大）。'+'MUAP 时程阈值窗 ±15 µV（算法参数，非临床标准）。正常值随肌肉与年龄而异（p.247 表15.1），此处“正常”为同一模拟受试者。', '“Discernible” = MUAPs ≥0.5 mV peak-to-peak at this needle position in the normal muscle (the definition used to calibrate the 5:1 rule); in the abnormal muscle the same units are followed (if still ≥0.1 mV and voluntarily available), plus any unit that has newly become ≥0.5 mV (e.g. enlarged by reinnervation).'+' MUAP duration window ±15 µV (algorithm parameter, not a clinical criterion). Normal values depend on muscle and age (p.247, Table 15.1); “normal” here is the same simulated subject.'),
  };
}

function caveat(p) {
  if (p.myopathy.on) return L('<p>晚期或特殊肌病可偏离典型模式：慢性肌病可同时出现长大 MUAP（伴去神经/再支配）；终末期肌病可募集减少；类固醇肌病及部分代谢/线粒体肌病 EMG 可正常——EMG 正常不能排除所有肌病（p.257, p.267, p.678）。</p>', '<p>Advanced or specific myopathies can deviate from the classic pattern: chronic myopathies may also show long, large MUAPs (denervation/reinnervation); end-stage myopathy can reduce recruitment; steroid and some metabolic/mitochondrial myopathies may have a normal EMG — a normal EMG does not exclude all myopathies (p.257, p.267, p.678).</p>');
  if (p.axonal.on) return L('<p>多相性本身无特异性：既见于早期再支配，也见于肌病（p.248）。短小多相 MUAP 也可能是重度失神经后的“新生单位”——要看募集（p.257）。失神经电位的出现时间取决于病灶到肌肉的长度，而非固定天数（p.236）。</p>', '<p>Polyphasia alone is nonspecific: it occurs in early reinnervation and in myopathy (p.248). Small polyphasic MUAPs can also be “nascent” units after severe denervation — look at recruitment (p.257). Denervation potentials appear after a length-dependent delay, not a fixed number of days (p.236).</p>');
  if ((p.centralCap ?? 1) < 1) return L('<p>疼痛、配合差、功能性无力或中枢病变都可导致激活减少；同一肌肉也可同时存在募集减少与激活减少（如肌萎缩侧索硬化，或伴疼痛的神经根病，p.254）。</p>', '<p>Pain, poor cooperation, functional weakness or CNS lesions all reduce activation; reduced recruitment and reduced activation can coexist in one muscle (e.g. ALS, or radiculopathy with pain, p.254).</p>');
  return L('<p>MUAP 波幅主要来自离针尖最近的少数（2–12 根）纤维，对针位极敏感；时程反映更多纤维，受针位影响较小（p.249–251）。判断须基于多个 MUAP 的平均（约 20 个，p.246）。</p>', '<p>MUAP amplitude comes mainly from the few (2–12) fibres nearest the tip and is very sensitive to needle position; duration reflects more fibres and is less position-dependent (p.249–251). Judgements need the mean of many MUAPs (≈20, p.246).</p>');
}

const WHY = {
  'axonal.frac': { zh: '改变了丢失的运动轴突比例：可被驱动的单位变少 → 为了产生同样的力，剩余单位必须更快放电（募集减少）；被孤立的肌纤维随后去神经并可被侧支再支配。', en: 'You changed the fraction of motor axons lost: fewer units can be driven → the survivors must fire faster for the same force (reduced recruitment); orphaned fibres later denervate and may be reinnervated.' },
  day: { zh: '改变了距损伤时间：病程（天–月）与波形时间轴（毫秒）是分开的。急性期只有募集减少；数周后出现纤颤；数月后再支配使 MUAP 变大变长。', en: 'You changed the time since injury: the disease clock (days–months) is separate from the waveform clock (ms). Acutely only recruitment is reduced; fibrillations appear after weeks; months later reinnervation enlarges and prolongs MUAPs.' },
  reinnervation: { zh: '改变了侧支再支配程度：更多孤立纤维被存活单位接管 → 这些单位的纤维数、分布区、时程与波幅增加，但单位“数目”不会恢复（募集仍减少）。', en: 'You changed the reinnervation extent: more orphaned fibres join surviving units → their fibre count, territory, duration and amplitude increase, but the NUMBER of units does not recover (recruitment stays reduced).' },
  'myopathy.fiberLoss': { zh: '改变了单位内肌纤维丢失：MUAP 中靠近针尖的纤维更少 → 波幅、时程下降，剩余纤维不同步 → 多相；每个单位的力变小 → 同样的力需要更多单位。', en: 'You changed fibre loss within units: fewer fibres near the tip → lower amplitude and shorter duration; asynchronous remaining fibres → polyphasia; each unit makes less force → more units are needed for the same force.' },
  'myopathy.sizeVar': { zh: '改变了纤维大小变异：纤维传导速度与电位大小不一 → 到达针尖的时间更分散 → 更多相位/转折。', en: 'You changed fibre-size variability: unequal fibre velocities and potentials → arrivals at the tip are more dispersed → more phases/turns.' },
  centralCap: { zh: '改变了可达到的中枢驱动：周围单位不变，但放电频率与募集都停在较低水平；单位数与频率之比仍正常。', en: 'You changed achievable central drive: peripheral units are unchanged, but firing rates and recruitment stop at a lower level; the units-to-rate relationship stays normal.' },
  block: { zh: '改变了传导阻滞：被阻滞的单位不能被随意激活（募集减少），但其肌纤维仍有神经支配，不出现纤颤，MUAP 形态不变。', en: 'You changed conduction block: blocked units cannot be activated voluntarily (reduced recruitment), but their fibres stay innervated — no fibrillations, unchanged MUAP morphology.' },
  needle: { zh: '移动了针尖：病理完全没变，只是采样到的纤维不同。波幅变化最大（取决于最近的少数纤维），时程变化较小。', en: 'You moved the needle: the pathology is unchanged; only the sampled fibres differ. Amplitude changes most (it depends on the nearest few fibres); duration changes less.' },
  anatomy: { zh: '移动了针尖：病理完全没变，只是采样到的纤维不同。波幅变化最大（取决于最近的少数纤维），时程变化较小（p.250–251, Fig 15.10）。', en: 'You moved the needle: the pathology is unchanged; only the sampled fibres differ. Amplitude changes most (nearest few fibres), duration less (p.250–251, Fig 15.10).' },
  'needle.z': { zh: '改变了针尖与终板带的距离：动作电位需传播更远才到达针尖，纤维间速度差导致到达更分散。在终板带内还会记录到终板电位。', en: 'You changed the distance from the endplate band: APs travel farther to the tip and fibre velocity differences spread their arrival.' },
  targetForce: { zh: '改变了目标力：先通过提高已放电单位的频率（频率编码），再募集更高阈值的单位（大小原则，p.246, p.251–253）。', en: 'You changed the target force: force rises first by faster firing (rate coding), then by recruiting higher-threshold units (size principle, p.246, p.251–253).' },
  drive: { zh: '改变了神经驱动：驱动越大，已募集单位放电越快，阈值更高的单位依次加入。', en: 'You changed neural drive: more drive → recruited units fire faster and higher-threshold units join in order.' },
  effortMode: { zh: '切换了比较条件：相同力（看需要多少单位）与相同驱动（看产生多少力）回答的是不同问题。', en: 'You switched the matched condition: same force (how many units are needed) and same drive (how much force results) answer different questions.' },
  activity: { zh: '切换了状态：静息看自发电位，插入看插入电位，收缩看 MUAP 与募集。', en: 'You switched state: rest shows spontaneous activity, insertion shows insertional activity, contraction shows MUAPs and recruitment.' },
};

export function why(prev, cur) {
  const k = prev.changed;
  const a = prev.result;
  const b = cur.result;
  let h = `<p>${WHY[k] ? L(WHY[k]) : L(`改变了“${k}”。`, `You changed “${k}”.`)}</p>`;
  if (a && b && a.sA) {
    h += '<ul>';
    h += `<li>${L('取样平均时程', 'Survey mean duration')}: ${fmt(a.sA.dur, 1)} → <b>${fmt(b.sA.dur, 1)}</b> ms; ${L('波幅', 'amplitude')} ${fmt(a.sA.amp * 1000, 0)} → <b>${fmt(b.sA.amp * 1000, 0)}</b> µV; ${L('多相', 'polyphasic')} ${fmt(a.sA.poly, 0)} → <b>${fmt(b.sA.poly, 0)}</b>%</li>`;
    h += `<li>${L('募集单位（全肌）', 'Units recruited (muscle)')}: ${a.stA.nActive} → <b>${b.stA.nActive}</b>; ${L('力', 'force')} ${fmt(a.stA.forcePct, 0)} → <b>${fmt(b.stA.forcePct, 0)}</b>%; ${L('最快频率', 'fastest rate')} ${fmt(a.rateA, 0)} → <b>${fmt(b.rateA, 0)}</b> Hz</li>`;
    h += `<li>${L('自发放电纤维', 'Spontaneously firing fibres')}: ${a.fibrillating} → <b>${b.fibrillating}</b></li>`;
    h += '</ul>';
  }
  return h;
}

const base = () => JSON.parse(JSON.stringify(DEFAULT_PARAMS));
export function comparePresets() {
  const mk = (key, label, f) => ({
    key,
    label,
    params: (cur) => {
      const p = { ...JSON.parse(JSON.stringify(cur)), ...base(), block: 0, irritabilityOnly: false };
      p.axonal = { ...base().axonal, population: 'motor', frac: 0.6 };
      return { ...p, ...f(p) };
    },
  });
  return [
    mk('normal', { zh: '正常', en: 'Normal' }, () => ({})),
    mk('acute', { zh: '急性神经源性（第7天）', en: 'Acute neurogenic (day 7)' }, (p) => ({ day: 7, axonal: { ...p.axonal, on: true } })),
    mk('early', { zh: '早期再支配（2个月）', en: 'Early reinnervation (2 mo)' }, (p) => ({ day: 60, axonal: { ...p.axonal, on: true } })),
    mk('chronic', { zh: '慢性再支配（1年）', en: 'Chronic reinnervation (1 y)' }, (p) => ({ day: 365, reinnervation: 0.85, axonal: { ...p.axonal, on: true } })),
    mk('myopathy', { zh: '肌病', en: 'Myopathy' }, () => ({ myopathy: { ...base().myopathy, on: true, fiberLoss: 0.5, sizeVar: 0.6 } })),
    mk('central', { zh: '中枢激活不足', en: 'Poor central activation' }, () => ({ centralCap: 0.3 })),
    mk('block', { zh: '传导阻滞 60%', en: 'Conduction block 60%' }, () => ({ block: 0.6 })),
  ];
}

export function compareScope(list, p, vo) {
  const th = theme();
  const rows = list.map(({ preset, result }) => {
    if (p.display === 'muap') {
      return {
        label: L(preset.label),
        gain: 0.2,
        traces: [result.fmN ? { data: result.fmN.wave, color: th.normal, dash: [5, 3], width: 1.2, ignoreCursor: true } : null, result.fm ? { data: result.fm.wave, color: unitColor(result.focus), width: 2 } : null].filter(Boolean),
        note: `${L('取样', 'survey')}: ${fmt(result.sA.dur, 1)} ms · ${fmt(result.sA.amp * 1000, 0)} µV · ${fmt(result.sA.poly, 0)}% ${L('多相', 'poly')}`,
      };
    }
    const rest = p.activity === 'rest' || p.activity === 'insertion';
    return {
      label: L(preset.label),
      gain: rest ? 0.05 : p.activity === 'strong' || p.activity === 'max' ? 1 : 0.2,
      traces: [{ data: result.rec, color: th.trace, width: 1.2 }],
      note: rest ? '' : `${L('力', 'force')} ${fmt(result.stA.forcePct, 0)}% · ${result.firingA.length} ${L('单位', 'units')} · ${fmt(result.rateA, 0)} Hz`,
    };
  });
  return { rows, sweep: p.display === 'muap' ? 3 : 100, t0: 0, compact: true, title: L('机制比较（同一受试者、同一针位、同一指令）', 'Mechanism comparison (same subject, needle position and instruction)') };
}

export function compareExplain(list, p) {
  const cols = list.map((x) => L(x.preset.label));
  const g = (f) => list.map((x) => f(x.result));
  return {
    measures: {
      cols,
      rows: [
        { label: L('取样平均时程', 'Survey mean duration'), unit: 'ms', vals: g((r) => r.sA.dur), digits: 1 },
        { label: L('取样平均波幅', 'Survey mean amplitude'), unit: 'µV', vals: g((r) => r.sA.amp * 1000), digits: 0 },
        { label: L('多相比例', 'Polyphasic'), unit: '%', vals: g((r) => r.sA.poly), digits: 0 },
        { label: L('力', 'Force'), unit: '%', vals: g((r) => r.stA.forcePct), digits: 0 },
        { label: L('募集单位（全肌）', 'Units recruited'), vals: g((r) => r.stA.nActive), digits: 0 },
        { label: L('针尖处单位 / 最快频率', 'Units at tip / fastest rate'), vals: g((r) => `${r.firingA.length} / ${fmt(r.rateA, 0)} Hz`) },
        { label: L('自发放电纤维', 'Spontaneous fibres'), vals: g((r) => r.fibrillating), digits: 0 },
      ],
      note: L('同一针位、同一指令（相同目标力或相同驱动）。', 'Same needle position and the same instruction (same target force or same drive).'),
    },
    caveat: L('<p>比较要点：急性神经源性 = 形态正常 + 募集减少；慢性再支配 = 长大 MUAP + 募集减少；肌病 = 短小多相 + 早期募集；中枢 = 形态与比例正常但频率低；阻滞 = 募集减少而无失神经。</p>', '<p>What to compare: acute neurogenic = normal morphology + reduced recruitment; chronic reinnervation = long, large MUAPs + reduced recruitment; myopathy = short, small, polyphasic + early recruitment; central = normal morphology and ratio but low rates; block = reduced recruitment without denervation.</p>'),
  };
}

export function mesoLegend(th, r) {
  return `<span><i style="background:${unitColor(r.focus ?? 0)}"></i>${L('聚焦单位（与波形同色）', 'focus unit (same colour as trace)')}</span><span><i style="background:${th.muted}"></i>${L('去神经纤维', 'denervated fibre')}</span><span><i style="background:${th.bad}"></i>${L('自发放电', 'spontaneous discharge')}</span><span>${L('黑框圆点 = 再支配纤维；虚线圆 = 单位分布区；实/虚圆 = 距针尖 0.5/1 mm', 'outlined dot = reinnervated fibre; dashed circle = unit territory; rings = 0.5/1 mm from tip')}</span>`;
}

export function modelNotes() {
  return L('<ul><li>约 2.3 万根肌纤维、120 个运动单位，单位分布区直径 5–10 mm、相互交错（p.245）。</li><li>每根纤维电位由线源模型计算；同心针尖电位减去沿针杆的部分参考（示意、经标定）。</li><li>募集：大小原则阈值；起始 5 Hz，频率随驱动线性上升至 45 Hz；增益按“约 5 Hz 增加一个可辨单位”标定（p.253）。力 = Σ 单位纤维力 × 强直融合曲线（示意）。</li><li>再支配：孤立纤维在约 25 天后开始被邻近存活单位接管，芽枝成熟时间常数约 120 天（示意参数）。</li><li>已知偏差：模型正常 MUAP 平均时程约 6 ms，处于教科书 5–15 ms 典型范围的低端。</li></ul>', '<ul><li>≈23,000 fibres, 120 motor units with 5–10 mm intermingled territories (p.245).</li><li>Each fibre potential from the line-source model; concentric needle tip minus a partial reference along the shaft (schematic, calibrated).</li><li>Recruitment: size-principle thresholds; onset 5 Hz, rate rising linearly with drive to 45 Hz; gain calibrated to ≈one new discernible unit per 5 Hz (p.253). Force = Σ unit fibre force × fusion curve (illustrative).</li><li>Reinnervation: orphaned fibres adopted by nearby survivors from ≈25 days, sprout maturation time constant ≈120 days (illustrative).</li><li>Known deviation: modelled normal mean MUAP duration ≈6 ms, at the low end of the textbook’s typical 5–15 ms.</li></ul>');
}
