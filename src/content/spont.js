// Content for the spontaneous-activity lab (textbook Ch 14, printed p.230–242; Table 14.1).
import { L } from './i18n.js';
import { fmt } from '../core/util.js';
import { PV } from '../core/params.js';

const isPswLike = (c) => c.type === 'psw' || (c.type === 'myotonic' && c.myoWave === 'psw');

export const TYPE_LABEL = {
  fib: { zh: '纤颤电位', en: 'Fibrillation' },
  psw: { zh: '正锐波', en: 'Positive sharp wave' },
  endplate: { zh: '终板电位（正常）', en: 'Endplate (normal)' },
  myotonic: { zh: '肌强直放电', en: 'Myotonic discharge' },
  crd: { zh: '复合重复放电 CRD', en: 'Complex repetitive (CRD)' },
  fasc: { zh: '束颤/运动单位自发放电', en: 'Fasciculation / MU discharges' },
};

export function controls(c) {
  return [
    {
      title: { zh: '发生源类型', en: 'Generator' },
      pathology: true,
      items: [
        {
          type: 'chips',
          path: 'type',
          label: { zh: '自发电位', en: 'Spontaneous potential' },
          options: Object.entries(TYPE_LABEL).map(([value, label]) => ({ value, label })),
        },
      ],
    },
    {
      title: { zh: '参数', en: 'Parameters' },
      items: [
        { type: 'range', path: 'dist', label: { zh: '针尖到纤维距离', en: 'Needle–fibre distance' }, min: 0.05, max: 0.8, step: 0.05, fmt: (v) => `${v.toFixed(2)} mm`, show: (q) => ['fib', 'psw', 'myotonic', 'endplate'].includes(q.type), help: { zh: '距离越远，波幅越低、波形越钝（体积传导）。', en: 'Farther away → smaller and blunter (volume conduction).' } },
        { type: 'range', path: 'rate', label: { zh: '放电频率（第 1 个发生源）', en: 'Firing rate (generator 1)' }, min: 0.5, max: 30, step: 0.5, fmt: (v) => `${v} Hz`, show: (q) => q.type === 'fib' || q.type === 'psw', help: { zh: '教科书：通常 0.5–10 Hz，偶可达 30 Hz（p.234）。', en: 'Textbook: usually 0.5–10 Hz, occasionally up to 30 Hz (p.234).' } },
        { type: 'steps', path: 'nSources', values: [1, 2, 3, 5], label: { zh: '针尖附近的自发放电纤维数', en: 'Firing fibres near the tip' }, fmt: (v) => `${v}`, show: (q) => q.type === 'fib' || q.type === 'psw', help: { zh: '每根纤维各自规律放电；叠加后整体看似不规则——要逐个追踪单个电位。', en: 'Each fibre fires regularly on its own; superimposed they look irregular — follow one potential at a time.' } },
        { type: 'steps', path: 'months', values: [0.5, 1, 3, 6, 9, 12, 15], label: { zh: '去神经后时间（纤维萎缩）', en: 'Time since denervation (fibre atrophy)' }, fmt: (v) => (v < 1 ? L('2 周', '2 wk') : L(`${v} 个月`, `${v} mo`)), show: (q) => q.type === 'fib' || q.type === 'psw', help: { zh: '纤维萎缩 → 电位变小；慢性 >6–12 个月可 <10 µV（p.234）。萎缩时程为示意参数。', en: 'Fibre atrophy → smaller potentials; after >6–12 months they can be <10 µV (p.234). Atrophy timing is illustrative.' } },
        {
          type: 'chips',
          path: 'epKind',
          label: { zh: '终板区活动', en: 'Endplate activity' },
          show: (q) => q.type === 'endplate',
          options: [
            { value: 'noise', label: { zh: '终板噪声', en: 'noise' } },
            { value: 'spikes', label: { zh: '终板棘波', en: 'spikes' } },
            { value: 'both', label: { zh: '两者', en: 'both' } },
          ],
        },
        { type: 'range', path: 'myoMax', label: { zh: '最高频率', en: 'Peak rate' }, min: 40, max: 150, step: 5, fmt: (v) => `${v} Hz`, show: (q) => q.type === 'myotonic', help: { zh: '教科书：20–150 Hz，频率与波幅渐增渐减（p.238）。', en: 'Textbook: 20–150 Hz, rate and amplitude wax and wane (p.238).' } },
        {
          type: 'chips',
          path: 'myoWave',
          label: { zh: '单个电位形态', en: 'Single potential' },
          show: (q) => q.type === 'myotonic',
          options: [
            { value: 'spike', label: { zh: '短棘波', en: 'brief spike' } },
            { value: 'psw', label: { zh: '正向波', en: 'positive wave' } },
          ],
          help: { zh: '与纤颤/正锐波同一形态——区别在放电方式（p.238）。', en: 'Same morphology as fibrillations/PSWs — the firing pattern is what differs (p.238).' },
        },
        { type: 'steps', path: 'crdFibers', values: [3, 4, 5, 6, 8], label: { zh: '环路中的纤维数', en: 'Fibres in the loop' }, fmt: (v) => `${v}`, show: (q) => q.type === 'crd' },
        { type: 'range', path: 'crdRate', label: { zh: '环路频率', en: 'Loop rate' }, min: 5, max: 100, step: 5, fmt: (v) => `${v} Hz`, show: (q) => q.type === 'crd', help: { zh: '教科书：通常 5–100 Hz，完全规则（p.237）。', en: 'Textbook: typically 5–100 Hz, perfectly regular (p.237).' } },
        { type: 'toggle', path: 'crdDrop', label: { zh: '中途一根纤维脱出环路', en: 'One fibre drops out mid-way' }, show: (q) => q.type === 'crd', help: { zh: '形态与频率突然“量子式”改变（p.237）。', en: 'Shape and rate change abruptly, in a quantal jump (p.237).' } },
        {
          type: 'chips',
          path: 'fascUnit',
          label: { zh: '放电的运动单位', en: 'Discharging unit' },
          show: (q) => q.type === 'fasc',
          options: [
            { value: 'normal', label: { zh: '正常单位', en: 'normal unit' } },
            { value: 'reinnervated', label: { zh: '慢性再支配单位', en: 'reinnervated unit' } },
          ],
        },
        {
          type: 'chips',
          path: 'fascPattern',
          label: { zh: '放电方式', en: 'Pattern' },
          show: (q) => q.type === 'fasc',
          options: [
            { value: 'single', label: { zh: '单个（束颤）', en: 'single (fasciculation)' } },
            { value: 'doublet', label: { zh: '双联', en: 'doublet' } },
            { value: 'triplet', label: { zh: '三联', en: 'triplet' } },
            { value: 'myokymic', label: { zh: '肌颤搐放电', en: 'myokymic' } },
          ],
        },
        { type: 'range', path: 'fascRate', label: { zh: '平均频率', en: 'Mean rate' }, min: 0.1, max: 2, step: 0.1, fmt: (v) => `${v.toFixed(1)} Hz`, show: (q) => q.type === 'fasc' && q.fascPattern !== 'myokymic', help: { zh: '教科书：通常 <1–2 Hz，不规则（p.238）。', en: 'Textbook: usually <1–2 Hz, irregular (p.238).' } },
        { type: 'steps', path: 'seed', values: [1, 2, 3, 4, 5], label: { zh: '随机种子', en: 'Random seed' }, fmt: (v) => `#${v}`, help: { zh: '换一组随机的纤维/放电时刻；同一种子总是得到同一记录。', en: 'Another random set of fibres/discharge times; the same seed always gives the same record.' } },
      ],
    },
  ];
}

const sgn = (m) => (m.initial > 0 ? L('起始正相（向下）', 'initial positive (down)') : m.initial < 0 ? L('起始负相（向上）', 'initial negative (up)') : '—');

export function firingNote(r) {
  const m = r.meas;
  if (r.c.type === 'crd') return L(`${m.pooledN} 个复合波 · ${fmt(m.rate, 1)} Hz · 间期变异 ${fmt(m.isiCV, 1)}%`, `${m.pooledN} complexes · ${fmt(m.rate, 1)} Hz · interval CV ${fmt(m.isiCV, 1)}%`);
  return L(`${m.n} 次放电 · ${fmt(m.rate, 1)} Hz · 间期变异 ${fmt(m.isiCV, 0)}%`, `${m.n} discharges · ${fmt(m.rate, 1)} Hz · interval CV ${fmt(m.isiCV, 0)}%`);
}
export function morphNote(r) {
  const m = r.meas;
  return `${fmt(m.p2p, 0)} µV · ${isFinite(m.duration) ? fmt(m.duration, 1) + ' ms · ' : ''}${sgn(m)}`;
}
export function scopeTitle(r) {
  return L(`${L(TYPE_LABEL[r.c.type])}：上 = ${r.W >= 1000 ? r.W / 1000 + ' s' : r.W + ' ms'} 连续记录；下 = 光标前最近一次放电（放大）`, `${L(TYPE_LABEL[r.c.type])}: top = ${r.W >= 1000 ? r.W / 1000 + ' s' : r.W + ' ms'} free run; bottom = the discharge just before the cursor (expanded)`);
}
export function scopeLegend(r) {
  return L('同一合成信号既画在示波器上，也可作为声音播放（20 kHz，未做频率缩放）。黄色竖线 = 被放大的那次放电。', 'The same synthesized signal is drawn and can be played as sound (20 kHz, no frequency scaling). Yellow tick = the discharge shown expanded.');
}
export function mesoCaption(r) {
  if (r.c.type === 'fasc') return L('整个运动单位的纤维同时放电（彩色）', 'All fibres of one motor unit fire together (colour)');
  if (r.c.type === 'crd') return L('相邻纤维依次放电（成组萎缩）', 'Adjacent fibres fire in sequence (grouped atrophy)');
  return L('针尖周围 1 mm：亮点 = 正在放电的单根纤维', '1 mm around the tip: bright dot = the single fibre that fires');
}
export function mesoLegend(r) {
  return L('中观：哪些肌纤维参与。单纤维电位只来自 1 根纤维；束颤来自整个运动单位；CRD 来自一组相邻纤维。', 'Meso: which fibres take part. Single-fibre potentials come from one fibre; a fasciculation from a whole motor unit; a CRD from a cluster of adjacent fibres.');
}
export function microTitle(r) {
  const c = r.c;
  if (c.type === 'endplate') return L('终板处起源：动作电位从针下开始向两端传播', 'Origin at the endplate: the AP starts under the tip and spreads both ways');
  if (isPswLike(c)) return L('动作电位传到针致变形区即终止', 'The AP stops at the needle-deformed zone');
  return L('动作电位从远处传来、经过针尖、再离开', 'The AP approaches from afar, passes the tip, then leaves');
}
export function microLegend(r) {
  return L('微观：膜电流（源/汇）与针尖位置决定波形极性。源在前方 → 正相；汇在针下 → 负相（负相向上显示）。', 'Micro: membrane sources/sinks relative to the tip set polarity. Source ahead → positive; sink under the tip → negative (negative is drawn up).');
}
export function macroLegend(r) {
  return L('宏观：发生源位于运动单位的哪一层（神经元/轴突、末梢、肌膜）。红圈 = 发生源；黄光 = 此刻正在放电。示意图，不按比例。', 'Macro: which level of the motor unit generates the discharge (neuron/axon, terminal, muscle membrane). Red ring = generator; yellow glow = firing now. Schematic, not to scale.');
}

function chain(r) {
  const c = r.c;
  const m = r.meas;
  const s0 = r.sources[0];
  const dist = s0 && s0.r !== undefined ? fmt(s0.r, 2) : '—';
  switch (c.type) {
    case 'fib':
    case 'psw':
      return [
        L(`去神经（轴突丢失或功能性断开）后 ${c.months < 1 ? '2 周' : c.months + ' 个月'}。`, `${c.months < 1 ? '2 weeks' : c.months + ' months'} after denervation (axon lost or functionally disconnected).`),
        L(`失去神经支配的肌纤维静息膜电位不稳，自发产生动作电位；纤维直径系数 ${fmt(r.diam, 2)}（萎缩）。`, `The denervated fibre has an unstable resting membrane and fires on its own; fibre diameter factor ${fmt(r.diam, 2)} (atrophy).`),
        c.type === 'psw'
          ? L(`AP 从终板端传来，到针致变形的不可兴奋膜区（距针 ${dist} mm）停止——没有“经过并离开”的阶段。`, `The AP travels from the endplate end and stops at the needle-deformed, inexcitable membrane (${dist} mm from the tip) — it never passes and leaves.`)
          : L(`AP 沿单根纤维传播：先接近（源在前 → 正相）、到针下（汇 → 负相）、再离开（正相）。针–纤维距离 ${dist} mm。`, `The AP propagates along one fibre: approaching (source ahead → positive), under the tip (sink → negative), leaving (positive). Needle–fibre distance ${dist} mm.`),
        c.type === 'psw'
          ? L(`起始短正相 + 缓慢负向回复 = 正锐波，${fmt(m.p2p, 0)} µV；放电规则 ${fmt(m.rate, 1)} Hz（间期变异 ${fmt(m.isiCV, 1)}%）。`, `Brief positive phase + slow return = positive sharp wave, ${fmt(m.p2p, 0)} µV; regular firing ${fmt(m.rate, 1)} Hz (interval CV ${fmt(m.isiCV, 1)}%).`)
          : L(`短小三相棘波，${sgn(m)}，${fmt(m.p2p, 0)} µV、${fmt(m.duration, 1)} ms；放电规则 ${fmt(m.rate, 1)} Hz（间期变异 ${fmt(m.isiCV, 1)}%）。`, `Brief triphasic spike, ${sgn(m)}, ${fmt(m.p2p, 0)} µV, ${fmt(m.duration, 1)} ms; regular firing ${fmt(m.rate, 1)} Hz (interval CV ${fmt(m.isiCV, 1)}%).`),
        L('提示“活动性失神经”。纤颤与正锐波意义相同，只是针与纤维的关系不同（p.234–236）；但并非神经源性特异（见下方注意）。', '“Active denervation”. Fibrillations and PSWs mean the same thing; only the needle–fibre relationship differs (p.234–236). Not specific to neuropathic disease (see caveat).'),
      ];
    case 'endplate':
      return [
        L('正常肌肉；针尖位于终板区（肌腹中部，常伴深部烧灼痛，p.233）。', 'Normal muscle; the tip sits in the endplate zone (mid-belly, often a deep burning pain, p.233).'),
        c.epKind === 'noise'
          ? L('神经末梢自发释放单个量子 → 微终板电位（MEPP），不产生传播性 AP。', 'Single quanta released spontaneously → miniature endplate potentials (MEPPs); no propagated AP.')
          : L('针机械刺激末梢神经支 → 神经 AP → 肌纤维 AP 恰在针下起始（p.233–234）。', 'The needle irritates a terminal twig → nerve AP → muscle-fibre AP starting right under the tip (p.233–234).'),
        c.epKind === 'noise'
          ? L('局部电位，只有针尖贴近终板时才记录得到。', 'A local potential, recorded only with the tip right at the endplate.')
          : L('AP 从针下向两侧离开：没有“接近”阶段 → 没有起始正相。', 'The AP leaves the tip in both directions: no approach phase → no initial positive phase.'),
        c.epKind === 'noise'
          ? L(`低幅单相负向小电位，不规则（模型 ≈30 Hz）。`, 'Small monophasic negative potentials, irregular (model ≈30 Hz).')
          : L(`双相、${sgn(m)}，${fmt(m.p2p, 0)} µV；放电不规则（间期变异 ${fmt(m.isiCV, 0)}%）、“噼啪”样。`, `Biphasic, ${sgn(m)}, ${fmt(m.p2p, 0)} µV; irregular (interval CV ${fmt(m.isiCV, 0)}%), “sputtering”.`),
        L('正常现象，不要误判为纤颤：区别在于起始负相与高度不规则放电（p.233）。', 'Normal — do not call them fibrillations: the clues are the initial negative phase and the highly irregular firing (p.233).'),
      ];
    case 'myotonic':
      return [
        L('肌膜离子通道病（如强直性肌营养不良、先天性肌强直、先天性副肌强直；p.238）。', 'Muscle-membrane channel disorder (e.g. myotonic dystrophy, myotonia congenita, paramyotonia congenita; p.238).'),
        L('肌膜复极异常 → 单根肌纤维在一次去极化后反复自发放电（模型中频率先升后降，示意）。', 'Abnormal membrane repolarisation → one fibre fires repetitively after a depolarisation (in the model the rate rises then falls; schematic).'),
        L(`仍是单根纤维的 AP，经过（或止于）针尖，与纤颤/正锐波的电源相同。`, 'Still a single-fibre AP passing (or stopping at) the tip — the same source as fibrillations/PSWs.'),
        L(`频率 ${fmt(m.fMin, 0)}–${fmt(m.fMax, 0)} Hz 渐增渐减，波幅随之起伏；单个电位 ${sgn(m)}。`, `Rate ${fmt(m.fMin, 0)}–${fmt(m.fMax, 0)} Hz waxing and waning, amplitude varying with it; single potential ${sgn(m)}.`),
        L('识别靠“渐增渐减”的放电方式（“引擎加速”声），而非单个波形（p.238）。', 'Recognised by the waxing–waning pattern (“revving engine”), not by the single waveform (p.238).'),
      ];
    case 'crd':
      return [
        L('慢性神经源性（失神经→再支配→再失神经，成组萎缩）或伴坏死/纤维分裂的肌病（p.237）。', 'Chronic neuropathic (denervation → reinnervation → denervation again, grouped atrophy) or myopathies with necrosis/fibre splitting (p.237).'),
        L(`一根起搏纤维放电，经电突触样（膜到膜）传递依次激活 ${c.crdFibers} 根相邻去神经纤维，再回到起搏纤维形成环路（p.236–237）。`, `A pacemaker fibre fires and spreads ephaptically (membrane to membrane) through ${c.crdFibers} adjacent denervated fibres, then re-excites the pacemaker (p.236–237).`),
        L('每根纤维的 AP 依次经过针尖；没有突触 → 各纤维之间的时间关系每次都相同。', 'Each fibre’s AP passes the tip in turn; no synapse → the timing between fibres is identical every cycle.'),
        L(`多棘复合波，${fmt(m.rate, 1)} Hz，复合波间期变异 ${fmt(m.isiCV, 1)}%，复合波内抖动 ${fmt(m.jitter, 1)} µs；起止突然${c.crdDrop ? '；中途一根纤维脱出 → 形态与频率突变' : ''}。`, `Multi-spike complex, ${fmt(m.rate, 1)} Hz, interval CV ${fmt(m.isiCV, 1)}%, within-complex jitter ${fmt(m.jitter, 1)} µs; abrupt start and stop${c.crdDrop ? '; a fibre drops out mid-way → abrupt change in shape and rate' : ''}.`),
        L('提示慢性过程（神经源或肌源），并不区分两者；SFEMG 上抖动异常低（p.237–238）。', 'Points to chronicity (neurogenic or myopathic) without separating them; abnormally low jitter on SFEMG (p.237–238).'),
      ];
    case 'fasc':
    default:
      return [
        c.fascPattern === 'myokymic'
          ? L('神经脱髓鞘节段（如放射性臂丛病，p.240）。', 'Demyelinated nerve segment (e.g. radiation plexopathy, p.240).')
          : L(`下运动神经元/轴突兴奋性增高（${c.fascUnit === 'reinnervated' ? '此单位已慢性再支配' : '此单位形态正常'}）。`, `Increased excitability of the lower motor neuron/axon (${c.fascUnit === 'reinnervated' ? 'this unit is chronically reinnervated' : 'this unit is normal in shape'}).`),
        c.fascPattern === 'myokymic'
          ? L('脱髓鞘段自发去极化或电突触样传递 → 同一运动单位成串放电（p.240）。', 'Spontaneous depolarisation or ephaptic transmission at the demyelinated segment → the same unit fires in bursts (p.240).')
          : L('运动神经元或其轴突（多数在远端轴突，p.238）自发去极化，在末梢分支之前。', 'The motor neuron or its axon (most often distally, p.238) depolarises spontaneously, before the terminal branches.'),
        L('冲动沿轴突及其全部分支传到整个运动单位的所有肌纤维 → 它们几乎同时放电。', 'The impulse spreads through the axon and all its branches → every fibre of the unit fires nearly together.'),
        L(`MUAP 形态，${fmt(m.p2p / 1000, 2)} mV、${fmt(m.duration, 1)} ms、${fmt(m.phases, 0)} 相；${c.fascPattern === 'myokymic' ? `成串放电，串间 ≈1 Hz` : `${fmt(m.rate, 2)} Hz、间期变异 ${fmt(m.isiCV, 0)}%`}。`, `MUAP morphology, ${fmt(m.p2p / 1000, 2)} mV, ${fmt(m.duration, 1)} ms, ${fmt(m.phases, 0)} phases; ${c.fascPattern === 'myokymic' ? 'bursts ≈1 Hz apart' : `${fmt(m.rate, 2)} Hz, interval CV ${fmt(m.isiCV, 0)}%`}.`),
        c.fascPattern === 'myokymic'
          ? L('同一 MUAP 成组反复放电（“行军”声），帮助缩窄鉴别诊断（Box 14.1）。', 'Grouped repetitive discharges of the same MUAP (“marching soldiers”) narrow the differential (Box 14.1).')
          : L(`低于 4–5 Hz 的放电不可能是随意放电（p.232）。束颤本身不等于 ALS：可见于正常人（良性）、根病、多发神经病与卡压（p.238）；意义取决于伴随的失神经与 MUAP 改变。`, `Firing below 4–5 Hz cannot be voluntary (p.232). A fasciculation is not ALS by itself: seen in normal people (benign), radiculopathy, polyneuropathy and entrapment (p.238); its meaning depends on accompanying denervation and MUAP changes.`),
      ];
  }
}

const CAVEAT = () => ({
  fib: L('<p>纤颤/正锐波是活动性失神经的标志，但<b>不特异</b>：也见于部分肌病（尤其炎性肌病与肌营养不良），偶见于严重 NMJ 病（尤其肉毒中毒）（p.234）。仅凭单个形态不能确定发生源，还需看稳定性与放电方式（p.231）。持续 &lt;2–3 s 的只算插入活动增多（p.236）。</p>', '<p>Fibrillations/PSWs mark active denervation but are <b>not specific</b>: also seen in some myopathies (especially inflammatory myopathies and dystrophies) and rarely in severe NMJ disease (especially botulism) (p.234). Morphology alone cannot identify the source; stability and firing pattern are needed (p.231). Runs lasting &lt;2–3 s count only as increased insertional activity (p.236).</p>'),
  psw: L('<p>正锐波的产生机制尚无定论：可能是 AP 止于针致变形区，也可能起源于针尖处（Dumitru 双针实验，p.235–236）。两种解释都意味着：它与纤颤是同一根纤维的自发放电，意义相同、无需分别分级（p.236）。远处的随意 MUAP 也可呈正向波形，但放电不规则（p.234）。</p>', '<p>How a PSW forms is not settled: the AP may stop at the needle-deformed zone, or the potential may originate at the tip (Dumitru two-needle experiments, p.235–236). Either way it is the same fibre firing spontaneously as a fibrillation, with the same meaning and no separate grade (p.236). Distant voluntary MUAPs can look like positive waves but fire irregularly (p.234).</p>'),
  endplate: L('<p>终板区是唯一正常存在自发活动的部位（p.233）。终板棘波需要针的刺激才出现。若把终板棘波误认作纤颤，会把正常肌肉判为失神经。模型中 MEPP 的形状与波幅为示意。</p>', '<p>The endplate zone is the only place where spontaneous activity is normal (p.233). Endplate spikes need the needle to irritate the twig. Calling them fibrillations turns a normal muscle into a “denervated” one. The MEPP shape and amplitude in the model are illustrative.</p>'),
  myotonic: L('<p>常见误读：把肌强直放电当作广泛失神经，从而误诊运动神经元病（p.238）。肌强直放电也可见于其他肌病（酸性麦芽糖酶缺乏、多发性肌炎、肌管性肌病）、高钾周期性麻痹，以及少见的任何原因失神经——但在失神经中从不是主要波形（p.238）。模型的“渐增渐减”包络与波幅变化为示意形状。</p>', '<p>A classic error: reading myotonic discharges as widespread denervation and diagnosing motor neuron disease (p.238). They also occur in other myopathies (acid maltase deficiency, polymyositis, myotubular myopathy), hyperkalaemic periodic paralysis, and rarely in denervation of any cause — but never as the predominant waveform there (p.238). The waxing–waning envelope in the model is a schematic shape.</p>'),
  crd: L('<p>CRD 只说明“相邻纤维都处于去神经状态”，常见于慢性神经源性和部分肌病，不能区分两者（p.237）。急性期一般不出现，因为正常肌肉中不同单位的纤维相互交错（p.237）。CRD 由肌纤维产生，NMJ 阻滞时通常持续（p.238）。纤维间延迟为示意参数。</p>', '<p>A CRD only says that adjacent fibres are denervated; it occurs in chronic neuropathic and some myopathic disorders and does not separate them (p.237). It is not expected acutely because fibres of different units are intermingled in normal muscle (p.237). Generated in muscle fibres, it usually persists with NMJ blockade (p.238). Fibre-to-fibre delays are illustrative.</p>'),
  fasc: L('<p><b>束颤 ≠ ALS。</b>多数正常人有良性束颤；临床上区分良性与恶性几乎不可能，良性者不伴无力、萎缩或反射异常（p.238）。束颤频率很低，要静置针并耐心等待才能看到（p.239）。双联/三联放电也见于低钙手足搐搦（p.239）。模型中双联间隔与肌颤搐串内频率为示意值（教科书范围：串内 5–60 Hz，串间 &lt;2 Hz）。</p>', '<p><b>Fasciculation ≠ ALS.</b> Most normal people have benign fasciculations; separating benign from malignant clinically is nearly impossible, and benign ones come without weakness, wasting or reflex change (p.238). They fire so slowly that you must leave the needle still and wait (p.239). Doublets/triplets also occur in hypocalcaemic tetany (p.239). The doublet interval and within-burst myokymic rate are illustrative values (textbook ranges: 5–60 Hz within bursts, &lt;2 Hz between).</p>'),
});

export function explain(r, c) {
  const m = r.meas;
  const voluntaryImpossible = isFinite(m.rate) && m.rate < 4 && c.type === 'fasc';
  const rows = [
    { label: L('发生源（第 1 个）放电次数', 'Discharges (generator 1)'), vals: [m.n], digits: 0 },
    { label: L('平均频率', 'Mean rate'), unit: 'Hz', vals: [m.rate], digits: 2, hl: true, flag: [voluntaryImpossible ? 'warn' : ''] },
    { label: L('间期变异系数（规则性）', 'Interval CV (regularity)'), unit: '%', vals: [m.isiCV], digits: 1 },
    { label: L('瞬时频率 最低–最高', 'Instantaneous rate min–max'), unit: 'Hz', vals: [isFinite(m.fMin) ? `${fmt(m.fMin, 1)}–${fmt(m.fMax, 1)}` : '—'] },
    { label: L('单个电位峰–峰波幅', 'Single potential peak-to-peak'), unit: 'µV', vals: [m.p2p], digits: 0, flag: [(c.type === 'fib' || c.type === 'psw') && m.p2p < 10 ? 'warn' : ''] },
    { label: L('单个电位时程', 'Single potential duration'), unit: 'ms', vals: [m.duration], digits: 1 },
    { label: L('起始偏转', 'Initial deflection'), vals: [sgn(m)] },
  ];
  if (c.type === 'fib' || c.type === 'psw') rows.push({ label: L('屏幕上全部电位的间期变异', 'Interval CV, all potentials pooled'), unit: '%', vals: [m.pooledCV], digits: 0 });
  if (c.type === 'crd') rows.push({ label: L('复合波内抖动', 'Within-complex jitter'), unit: 'µs', vals: [m.jitter], digits: 1 });
  const notes = [];
  if (voluntaryImpossible) notes.push(L('频率 <4–5 Hz：不可能是随意放电（p.232）。', 'Rate <4–5 Hz: cannot be voluntary (p.232).'));
  if ((c.type === 'fib' || c.type === 'psw') && m.p2p < 10) notes.push(L('&lt;10 µV 的“微小纤颤”提示慢性（&gt;6–12 个月）失神经（p.234）。', '&lt;10 µV “tiny” fibrillations suggest chronic (&gt;6–12 months) denervation (p.234).'));
  if ((c.type === 'fib' || c.type === 'psw') && c.nSources > 1) notes.push(L('多个规则发生源叠加 → 合并后的间期变异远大于单个发生源：判断规则性时要追踪同一个电位。', 'Several regular generators superimposed → the pooled interval CV is far larger than any single one: judge regularity by following one potential.'));
  return {
    chain: chain(r),
    measures: {
      cols: [L('测量值', 'Measured')],
      rows,
      note: L('全部由生成的事件时刻与波形计算。频率与规则性针对第 1 个发生源（CRD 为复合波）。', 'All computed from the generated event times and waveform. Rate and regularity refer to generator 1 (complexes for CRD).') + (notes.length ? '<br>' + notes.join('<br>') : ''),
    },
    caveat: CAVEAT()[c.type],
    sources: L('来源：p.230–240，表 14.1，Box 14.1。', 'Sources: p.230–240, Table 14.1, Box 14.1.'),
  };
}

export function why(prev, cur) {
  const k = prev.changed;
  const a = prev.result?.meas;
  const b = cur.result?.meas;
  const t = {
    type: L('换了发生源：发生源位于运动单位的不同层次（肌膜、终板、环路、神经元/轴突），因此单个波形与放电方式都不同。', 'You changed the generator: it sits at a different level of the motor unit (membrane, endplate, loop, neuron/axon), so both the single waveform and the firing pattern change.'),
    dist: L('只改变了针–纤维距离：发生源与放电方式不变；体积传导使远处电位更小、更钝。', 'Only the needle–fibre distance changed: same generator and pattern; volume conduction makes a farther potential smaller and blunter.'),
    rate: L('只改变了发生源频率：波形不变，放电间隔改变；仍然规则。', 'Only the generator rate changed: same waveform, different intervals; still regular.'),
    nSources: L('增加了同时放电的纤维：每根仍然规则，但叠加后整体看似不规则。', 'More fibres firing: each stays regular, but together they look irregular.'),
    months: L('改变了去神经时间：纤维萎缩 → 直径变小 → 电流与传导速度降低 → 电位更小、稍宽。', 'Changed time since denervation: atrophy → smaller diameter → less current and slower conduction → smaller, slightly broader potential.'),
    myoMax: L('改变了肌强直放电的最高频率：渐增渐减的幅度改变。', 'Changed the myotonic peak rate: the waxing–waning swing changes.'),
    myoWave: L('改变了针与纤维的关系：同一放电方式，单个电位变成正向波或短棘波——证明形态不能单独定性（p.231）。', 'Changed the needle–fibre relationship: same firing, single potential becomes a positive wave or a spike — morphology alone does not identify the source (p.231).'),
    crdFibers: L('改变了环路中的纤维数：复合波中的棘波数随之改变。', 'Changed the number of fibres in the loop: the number of spikes per complex changes.'),
    crdRate: L('改变了环路频率：复合波形态不变，重复更快或更慢。', 'Changed the loop rate: same complex, repeated faster or slower.'),
    crdDrop: L('一根纤维脱出：环路变短 → 频率与形态突然“跳变”。', 'A fibre dropped out: the loop shortens → rate and shape jump abruptly.'),
    fascUnit: L('换了放电的运动单位：同样的自发放电方式，但慢性再支配单位的 MUAP 更大更宽。', 'Changed the discharging unit: same spontaneous pattern, but a chronically reinnervated unit gives a larger, longer MUAP.'),
    fascPattern: L('改变了运动单位的放电方式：单发、成对、成组——发生源仍是神经元/轴突。', 'Changed the unit’s firing pattern: single, paired, grouped — the generator is still the neuron/axon.'),
    fascRate: L('改变了束颤平均频率：仍然缓慢且不规则。', 'Changed the mean fasciculation rate: still slow and irregular.'),
    epKind: L('切换了终板区活动类型：MEPP 是局部电位；终板棘波是针诱发、从针下起始的肌纤维 AP。', 'Switched endplate activity: MEPPs are local potentials; endplate spikes are needle-triggered fibre APs starting under the tip.'),
    seed: L('只换了随机种子：同一机制的另一次“取样”。', 'Only the seed changed: another sample of the same mechanism.'),
  }[k];
  let h = `<p>${t || L('参数已改变。', 'A parameter changed.')}</p>`;
  if (a && b) h += `<ul><li>${L('频率', 'rate')} ${fmt(a.rate, 1)} → <b>${fmt(b.rate, 1)}</b> Hz</li><li>${L('间期变异', 'interval CV')} ${fmt(a.isiCV, 1)} → <b>${fmt(b.isiCV, 1)}</b>%</li><li>${L('波幅', 'amplitude')} ${fmt(a.p2p, 0)} → <b>${fmt(b.p2p, 0)}</b> µV</li></ul>`;
  return h;
}

export function comparePresets() {
  const base = (o) => (p) => ({ ...p, ...o, winOverride: 1000 });
  return [
    { key: 'fib', label: TYPE_LABEL.fib, params: base({ type: 'fib', nSources: 1, rate: 5, months: 1 }) },
    { key: 'myotonic', label: TYPE_LABEL.myotonic, params: base({ type: 'myotonic', myoWave: 'spike' }) },
    { key: 'endplate', label: { zh: '终板棘波', en: 'Endplate spikes' }, params: base({ type: 'endplate', epKind: 'spikes' }) },
    { key: 'psw', label: TYPE_LABEL.psw, params: base({ type: 'psw', nSources: 1, rate: 5, months: 1 }) },
    { key: 'crd', label: TYPE_LABEL.crd, params: base({ type: 'crd' }) },
    { key: 'fasc', label: { zh: '束颤', en: 'Fasciculation' }, params: base({ type: 'fasc', fascPattern: 'single', fascRate: 1 }) },
  ];
}

export function compareExplain(list) {
  const rows = [
    { label: L('平均频率', 'Mean rate'), unit: 'Hz', vals: list.map((x) => x.result.meas.rate), digits: 1, hl: true },
    { label: L('间期变异', 'Interval CV'), unit: '%', vals: list.map((x) => x.result.meas.isiCV), digits: 1 },
    { label: L('波幅', 'Amplitude'), unit: 'µV', vals: list.map((x) => x.result.meas.p2p), digits: 0 },
    { label: L('时程', 'Duration'), unit: 'ms', vals: list.map((x) => x.result.meas.duration), digits: 1 },
    { label: L('起始偏转', 'Initial deflection'), vals: list.map((x) => sgn(x.result.meas)) },
  ];
  return {
    chain: null,
    measures: { cols: list.map((x) => L(x.preset.label)), rows, note: L('前 1 s 之外的数据也计入（各自的完整记录）。', 'Each column uses its full record.') },
    caveat: L('<p>纤颤、正锐波、肌强直放电都是<b>单根肌纤维</b>的电位，形态可以一样；终板棘波只差起始相。区分它们靠<b>放电方式</b>：规则（纤颤/正锐波）、渐增渐减（肌强直）、不规则“噼啪”（终板棘波）、完全规则且多棘（CRD）、慢而不规则的 MUAP（束颤）（p.231–232，表 14.1）。</p>', '<p>Fibrillations, PSWs and myotonic potentials are all <b>single muscle-fibre</b> potentials and can look identical; endplate spikes differ only in their initial phase. What separates them is the <b>firing pattern</b>: regular (fibrillation/PSW), waxing–waning (myotonic), irregular sputtering (endplate spike), perfectly regular multi-spike (CRD), slow irregular MUAP (fasciculation) (p.231–232, Table 14.1).</p>'),
  };
}

export function modelNotes() {
  return L(
    `<p>单纤维电位由与 MUAP 相同的线源体积导体模型生成（同一针电极几何）。正锐波：在针尖处设不可兴奋区（AP 在此终止，p.235 的第一种解释）。纤颤放电完全规则并带极慢的漂移（p.234）；束颤为泊松式不规则放电；肌强直放电的频率包络为正弦平方（示意）；CRD 由固定的纤维间延迟循环构成，因此复合波内抖动为 0（与“无突触”一致，p.238）。萎缩：去神经 150 天后纤维直径线性下降（示意），电位幅度 ∝ 直径²，传导速度 ∝ 直径。声音：直接播放 20 kHz 合成信号，不做频率或时间缩放，仅归一化音量。</p>`,
    `<p>Single-fibre potentials use the same line-source volume-conductor model and needle geometry as the MUAPs. PSW: an inexcitable zone at the tip where the AP stops (the first explanation on p.235). Fibrillations fire perfectly regularly with a very slow drift (p.234); fasciculations are Poisson-like irregular; the myotonic rate envelope is a sine-squared shape (schematic); a CRD is a loop of fixed fibre-to-fibre delays, so within-complex jitter is 0 (consistent with “no synapse”, p.238). Atrophy: fibre diameter declines linearly after 150 days of denervation (illustrative); amplitude ∝ diameter², velocity ∝ diameter. Sound: the 20 kHz synthesized signal is played directly with no frequency or time scaling; only the volume is normalised.</p>`
  );
}
