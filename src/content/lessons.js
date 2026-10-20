// Guided lessons. Each lesson changes ONE main variable per step and names the signal
// change to look for. params(base) returns the full parameter set for the step.

const clone = (o) => JSON.parse(JSON.stringify(o));

function ncs(base, patch) {
  const p = clone(base);
  for (const [k, v] of Object.entries(patch)) {
    const parts = k.split('.');
    let o = p;
    for (let i = 0; i < parts.length - 1; i++) o = o[parts[i]];
    o[parts[parts.length - 1]] = v;
  }
  return p;
}

export const LESSONS = [
  {
    id: 'axonal-loss',
    module: 'ncs',
    title: { zh: '为什么轴突丢失会降低复合电位？', en: 'Why does axonal loss reduce a compound response?' },
    steps: [
      {
        title: { zh: '1. 正常 CMAP', en: '1. Normal CMAP' },
        text: { zh: '<p>CMAP 是所有被激活肌纤维电位的总和（p.23）。每个运动单位贡献一份；潜伏期只取决于最快的纤维。</p>', en: '<p>The CMAP is the sum of all activated muscle-fibre potentials (p.23). Each motor unit contributes one share; latency depends only on the fastest fibres.</p>' },
        look: { zh: '勾选“显示单个成分”可看到单个运动单位的贡献。', en: 'Tick “Show contributions” to see single-unit shares.' },
        params: (b) => ncs(b, { study: 'motor', stim: 'wrist' }),
        scale: 'macro',
      },
      {
        title: { zh: '2. 离断 50% 运动轴突（慢性期）', en: '2. Transect 50% of motor axons (chronic)' },
        text: { zh: '<p>只改变一个变量：受累轴突比例 0 → 50%。被离断轴突的运动单位不再贡献电位。</p>', en: '<p>One variable changes: fraction affected 0 → 50%. Units of transected axons no longer contribute.</p>' },
        look: { zh: '所有刺激部位的波幅与面积都下降约一半；潜伏期与 CV 基本不变。', en: 'Amplitude and area fall by about half at every site; latency and CV barely change.' },
        change: 'axonal.frac',
        from: null,
        params: (b) => ncs(b, { study: 'motor', stim: 'wrist', 'axonal.on': true, 'axonal.frac': 0.5, 'axonal.population': 'motor' }),
      },
      {
        title: { zh: '3. 让最快的纤维先丢失', en: '3. Lose the fastest fibres first' },
        text: { zh: '<p>改变“哪些轴突丢失”：最大/最快者优先。</p>', en: '<p>Change which axons are lost: largest/fastest first.</p>' },
        look: { zh: 'CV 轻度下降、潜伏期轻度延长——但仍远高于脱髓鞘范围（p.34, Fig 3.17）。', en: 'CV falls slightly and latency lengthens slightly — but stays far from the demyelinating range (p.34, Fig 3.17).' },
        change: 'axonal.selection',
        params: (b) => ncs(b, { study: 'motor', stim: 'wrist', 'axonal.on': true, 'axonal.frac': 0.5, 'axonal.population': 'motor', 'axonal.selection': 'largest' }),
      },
    ],
  },
  {
    id: 'dispersion',
    module: 'ncs',
    title: { zh: '离散如何在没有同等轴突丢失时降低峰值？', en: 'How can dispersion lower the peak without equivalent axon loss?' },
    steps: [
      {
        title: { zh: '1. 前臂均匀减速', en: '1. Uniform slowing in the forearm' },
        text: { zh: '<p>前臂段所有轴突减速 50%，轴突间差异很小。</p>', en: '<p>All axons slow by 50% in the forearm segment, with little variation between them.</p>' },
        look: { zh: '肘刺激潜伏期延长，但波形形态与面积接近腕刺激。', en: 'Elbow latency increases, but shape and area stay close to the wrist response.' },
        params: (b) => ncs(b, { study: 'motor', stim: 'elbow', 'demyel.on': true, 'demyel.slowing': 0.5, 'demyel.dispersion': 0 }),
        scale: 'meso',
      },
      {
        title: { zh: '2. 增加轴突间减速差异', en: '2. Increase variation between axons' },
        text: { zh: '<p>只改变“离散”：各轴突的减速程度不同，到达时间分散。没有轴突被阻滞。</p>', en: '<p>Only dispersion changes: axons slow unequally and arrive spread out. No axon is blocked.</p>' },
        look: { zh: '肘部 CMAP 变宽、峰值降低；面积下降较少——部分来自正负相抵消（p.31, p.38）。在“中观”视图中观察到达时间的分散。', en: 'The elbow CMAP widens and its peak falls; area falls less — partly from cancellation of positive and negative phases (p.31, p.38). See the spread of arrivals in the Meso view.' },
        change: 'demyel.dispersion',
        params: (b) => ncs(b, { study: 'motor', stim: 'elbow', 'demyel.on': true, 'demyel.slowing': 0.5, 'demyel.dispersion': 1.2 }),
        scale: 'meso',
      },
      {
        title: { zh: '3. 感觉纤维更敏感', en: '3. Sensory responses are more sensitive' },
        text: { zh: '<p>同样的病变改看 SNAP。</p>', en: '<p>Same lesion, now look at the SNAP.</p>' },
        look: { zh: 'SNAP 单纤维电位很短，同样的离散造成更多相位抵消，近端 SNAP 可几乎消失（p.30–32）。', en: 'Single sensory potentials are brief, so the same dispersion causes more cancellation; the proximal SNAP can almost vanish (p.30–32).' },
        change: 'study',
        params: (b) => ncs(b, { study: 'sensory', stim: 'elbow', 'demyel.on': true, 'demyel.slowing': 0.5, 'demyel.dispersion': 1.2 }),
      },
    ],
  },
  {
    id: 'block',
    module: 'ncs',
    title: { zh: '为什么远端刺激可以绕过局灶传导阻滞？', en: 'Why can distal stimulation bypass a focal conduction block?' },
    steps: [
      {
        title: { zh: '1. 前臂阻滞 0%', en: '1. Forearm block 0%' },
        text: { zh: '<p>前臂段有轻度脱髓鞘，但没有传导失败。</p>', en: '<p>Mild forearm demyelination without conduction failure.</p>' },
        look: { zh: '腕与肘 CMAP 面积相近。', en: 'Wrist and elbow CMAP areas are similar.' },
        params: (b) => ncs(b, { study: 'motor', stim: 'elbow', 'demyel.on': true, 'demyel.slowing': 0.3, 'demyel.dispersion': 0.2, 'demyel.block': 0 }),
      },
      {
        title: { zh: '2. 阻滞 60%', en: '2. Block 60%' },
        text: { zh: '<p>只改变阻滞比例。被阻滞的轴突在病灶处停止，但其远端部分完好。</p>', en: '<p>Only the block fraction changes. Blocked axons stop at the lesion, but their distal parts are intact.</p>' },
        look: { zh: '腕刺激（病灶远端）CMAP 正常；肘、腋刺激（跨病灶）面积下降 &gt;50%（p.37–38, Fig 3.20）。解剖图中观察冲动在病灶处终止（✕）。', en: 'Wrist stimulation (distal to the lesion) is normal; elbow/axilla (across it) lose &gt;50% area (p.37–38, Fig 3.20). In the anatomy, watch impulses stop at the lesion (✕).' },
        change: 'demyel.block',
        params: (b) => ncs(b, { study: 'motor', stim: 'elbow', 'demyel.on': true, 'demyel.slowing': 0.3, 'demyel.dispersion': 0.2, 'demyel.block': 0.6 }),
      },
      {
        title: { zh: '3. 对照：超急性轴突离断（第2天）', en: '3. Contrast: hyperacute transection (day 2)' },
        text: { zh: '<p>换成前臂轴突离断，伤后第 2 天：沃勒变性尚未发生。</p>', en: '<p>Switch to forearm transection on day 2: Wallerian degeneration has not happened yet.</p>' },
        look: { zh: '同样表现为“阻滞”——假性传导阻滞。将时间调到 7 天后，远端波幅也下降（p.35）。', en: 'It looks like block too — pseudo-conduction block. Move time to day 7 and the distal amplitude falls as well (p.35).' },
        change: 'day',
        params: (b) => ncs(b, { study: 'motor', stim: 'elbow', 'axonal.on': true, 'axonal.frac': 0.6, 'axonal.population': 'motor', day: 2 }),
      },
    ],
  },
  {
    id: 'chronic-muap',
    module: 'emg',
    title: { zh: '为什么慢性神经源性 MUAP 又大又长？', en: 'Why are chronic neurogenic MUAPs large and long?' },
    steps: [
      {
        title: { zh: '1. 正常 MUAP', en: '1. Normal MUAP' },
        text: { zh: '<p>MUAP 时程反映单位中纤维数及其放电时间的离散；波幅主要来自针尖附近的少数纤维（p.247–249）。</p>', en: '<p>MUAP duration reflects how many fibres a unit has and how spread their firing times are; amplitude comes mainly from the few fibres nearest the tip (p.247–249).</p>' },
        look: { zh: '在“中观”视图中看到该单位的纤维与其他单位交错分布。', en: 'In the Meso view, see this unit’s fibres intermingled with other units.' },
        params: (b) => ncs(b, { display: 'muap', activity: 'mild', 'axonal.on': false }),
        scale: 'meso',
      },
      {
        title: { zh: '2. 急性：丢失 60% 运动轴突（第 10 天）', en: '2. Acute: lose 60% of motor axons (day 10)' },
        text: { zh: '<p>被离断轴突的单位消失；存活单位还没有接管任何孤立纤维。</p>', en: '<p>Units of cut axons vanish; surviving units have not yet adopted any orphaned fibres.</p>' },
        look: { zh: '存活单位的 MUAP 形态正常——急性期只有募集减少（p.255）。', en: 'The surviving unit’s MUAP is unchanged — acutely only recruitment is reduced (p.255).' },
        change: 'axonal.on',
        params: (b) => ncs(b, { display: 'muap', activity: 'mild', 'axonal.on': true, 'axonal.frac': 0.6, day: 10, reinnervation: 0.7 }),
        scale: 'meso',
      },
      {
        title: { zh: '3. 早期再支配（第 60 天）', en: '3. Early reinnervation (day 60)' },
        text: { zh: '<p>只移动时间：存活轴突发出芽枝，接管邻近的失神经纤维。新芽枝细、髓鞘不成熟，传导慢、传递不稳定。</p>', en: '<p>Only time moves: surviving axons sprout and adopt nearby denervated fibres. New sprouts are thin and immature — slow and insecure.</p>' },
        look: { zh: '出现迟发的卫星电位，6 次放电叠加时形态不稳定（p.248, 250）。', en: 'Late satellite potentials appear and the shape varies across the 6 overlaid discharges (p.248, 250).' },
        change: 'day',
        params: (b) => ncs(b, { display: 'muap', activity: 'mild', 'axonal.on': true, 'axonal.frac': 0.6, day: 60, reinnervation: 0.7 }),
        scale: 'meso',
      },
      {
        title: { zh: '4. 成熟再支配（第 1 年）', en: '4. Mature reinnervation (1 year)' },
        text: { zh: '<p>只移动时间：芽枝成熟，被接管的纤维同步放电。每个存活单位拥有的纤维更多、分布区更大。</p>', en: '<p>Only time moves: sprouts mature and adopted fibres fire in step. Each surviving unit now owns more fibres over a wider territory.</p>' },
        look: { zh: 'MUAP 时程延长、波幅增高；卫星电位并入主波。募集仍减少——单位数没有恢复（p.255–256）。', en: 'Duration and amplitude increase; satellites merge into the main complex. Recruitment is still reduced — the number of units has not recovered (p.255–256).' },
        change: 'day',
        params: (b) => ncs(b, { display: 'muap', activity: 'mild', 'axonal.on': true, 'axonal.frac': 0.6, day: 365, reinnervation: 0.7 }),
        scale: 'meso',
      },
    ],
  },
  {
    id: 'myopathy-recruit',
    module: 'emg',
    title: { zh: '为什么肌病会“早募集”？', en: 'Why does myopathy produce early recruitment?' },
    steps: [
      {
        title: { zh: '1. 正常肌肉，目标力 15%', en: '1. Normal muscle, target force 15%' },
        text: { zh: '<p>为了产生一定的力，神经系统按大小原则逐个募集单位并提高放电频率（p.251–253）。</p>', en: '<p>To make a given force the nervous system recruits units in size order and raises their firing rates (p.251–253).</p>' },
        look: { zh: '记录中可见少数几个单位放电。', en: 'A few units fire in the record.' },
        params: (b) => ncs(b, { display: 'record', activity: 'mild', effortMode: 'force', targetForce: 15, 'myopathy.on': false, 'axonal.on': false }),
      },
      {
        title: { zh: '2. 肌病：同样的目标力', en: '2. Myopathy: the same target force' },
        text: { zh: '<p>只改变一个变量：每个单位丢失约一半肌纤维。单位数不变，但每个单位的力变小。</p>', en: '<p>One variable changes: each unit loses about half its fibres. The number of units is unchanged, but each produces less force.</p>' },
        look: { zh: '要达到同样的力需要更多单位同时放电——“早募集”；MUAP 短小多相（p.256–257）。', en: 'More units must fire for the same force — “early recruitment”; MUAPs are short, small and polyphasic (p.256–257).' },
        change: 'myopathy.on',
        params: (b) => ncs(b, { display: 'record', activity: 'mild', effortMode: 'force', targetForce: 15, 'myopathy.on': true, 'myopathy.fiberLoss': 0.5, 'axonal.on': false }),
      },
      {
        title: { zh: '3. 改为相同的神经驱动', en: '3. Switch to the same neural drive' },
        text: { zh: '<p>不再要求同样的力，而是给同样的神经驱动。</p>', en: '<p>Instead of the same force, give the same neural drive.</p>' },
        look: { zh: '放电单位数与频率和正常相同，只是力更小：相对于驱动，募集其实是正常的；“早”是相对于力而言（p.254）。', en: 'The number and rates of firing units match normal; only force is lower. Relative to drive, recruitment is normal; it is “early” only relative to force (p.254).' },
        change: 'effortMode',
        params: (b) => ncs(b, { display: 'record', activity: 'mild', effortMode: 'drive', drive: 30, 'myopathy.on': true, 'myopathy.fiberLoss': 0.5, 'axonal.on': false }),
      },
    ],
  },
  {
    id: 'radic-snap',
    module: 'localize',
    title: { zh: '为什么神经根病的 SNAP 可以正常？', en: 'Why can a radiculopathy have a normal SNAP?' },
    steps: [
      {
        title: { zh: '1. C8 神经根病：看尺神经 SNAP', en: '1. C8 radiculopathy: the ulnar SNAP' },
        text: { zh: '<p>病灶在 DRG 与脊髓之间（节前）。感觉神经元胞体在 DRG，只有其中枢突被切断（p.28–29）。</p>', en: '<p>The lesion lies between the DRG and the cord (preganglionic). Sensory cell bodies are in the DRG; only their central processes are cut (p.28–29).</p>' },
        look: { zh: '患者可有感觉缺失，但小指 SNAP 正常；而 C8 支配的肌肉已有失神经。', en: 'The patient may have sensory loss, yet the little-finger SNAP is normal, while C8 muscles are denervated.' },
        params: (b) => ({ ...b, lesion: 'c8', sev: 0.6, day: 35, sel: 'ulnSen' }),
        scale: 'macro',
      },
      {
        title: { zh: '2. 同样严重度，病灶移到下干', en: '2. Same severity, lesion moved to the lower trunk' },
        text: { zh: '<p>只改变病灶部位：现在病灶在 DRG 远端（节后）。</p>', en: '<p>Only the site changes: the lesion is now distal to the DRG (postganglionic).</p>' },
        look: { zh: '感觉轴突与胞体断开 → 沃勒变性 → 小指 SNAP 与 MABC 下降；椎旁肌变为正常（p.561–563, 584）。', en: 'Sensory axons are cut off from their cell bodies → Wallerian degeneration → little-finger SNAP and MABC fall; paraspinals become normal (p.561–563, 584).' },
        change: 'lesion',
        params: (b) => ({ ...b, lesion: 'lowerTrunk', sev: 0.6, day: 35, sel: 'ulnSen' }),
        scale: 'macro',
      },
      {
        title: { zh: '3. 回到 C8：读肌节模式', en: '3. Back to C8: read the myotomal pattern' },
        text: { zh: '<p>回到 C8 根病，改看根–肌肉图。</p>', en: '<p>Back to C8 radiculopathy; look at the root–muscle map.</p>' },
        look: { zh: 'C8 肌肉跨正中（APB、FPL）、尺（FDI、ADM、FCU）、桡（EIP）多条神经受累，椎旁肌也异常——这是根而不是任何一条周围神经（p.563）。', en: 'C8 muscles across median (APB, FPL), ulnar (FDI, ADM, FCU) and radial (EIP) nerves are involved, plus paraspinals — a root, not any single peripheral nerve (p.563).' },
        change: 'lesion',
        params: (b) => ({ ...b, lesion: 'c8', sev: 0.6, day: 35, sel: 'paraspinal' }),
        scale: 'meso',
      },
    ],
  },
  {
    id: 'early-late',
    module: 'course',
    title: { zh: '为什么早期检查与后期检查结果不同？', en: 'Why can an early study differ from a later one?' },
    steps: [
      {
        title: { zh: '1. 伤后 12 小时', en: '1. 12 hours after injury' },
        text: { zh: '<p>前臂 60% 轴突离断。远端轴突虽与胞体断开，但仍可兴奋。</p>', en: '<p>60% of axons cut in the forearm. The distal stumps are disconnected but still excitable.</p>' },
        look: { zh: '腕刺激（病灶远端）CMAP 正常；肘刺激跨病灶下降——像传导阻滞（p.34–35）。', en: 'Wrist stimulation (distal to the lesion) is normal; elbow stimulation across it is reduced — it looks like block (p.34–35).' },
        params: (b) => ({ ...b, kind: 'partial', frac: 0.6, day: 0.5, view: 'ncs' }),
        scale: 'macro',
      },
      {
        title: { zh: '2. 第 10 天', en: '2. Day 10' },
        text: { zh: '<p>只移动病程时钟。运动纤维在 3–5 天、感觉纤维在 6–10 天内完成沃勒变性（p.34–35）。</p>', en: '<p>Only the disease clock moves. Wallerian degeneration completes in 3–5 days for motor and 6–10 days for sensory fibres (p.34–35).</p>' },
        look: { zh: '远端 CMAP 与 SNAP 也下降了：现在是轴突丢失模式。', en: 'Distal CMAP and SNAP have now fallen too: the axonal pattern.' },
        change: 'day',
        params: (b) => ({ ...b, kind: 'partial', frac: 0.6, day: 10, view: 'ncs' }),
        scale: 'macro',
      },
      {
        title: { zh: '3. 第 10 天的静息 EMG', en: '3. Rest EMG on day 10' },
        text: { zh: '<p>同一天，改看针极静息记录。</p>', en: '<p>Same day, now the needle at rest.</p>' },
        look: { zh: '还没有纤颤：病灶到拇短展肌的距离决定了约两周的潜伏期（p.236）。早期 EMG“正常”不能排除失神经。', en: 'No fibrillations yet: the lesion-to-APB length sets a delay of about two weeks (p.236). An early “normal” EMG does not exclude denervation.' },
        change: 'view',
        params: (b) => ({ ...b, kind: 'partial', frac: 0.6, day: 10, view: 'rest' }),
        scale: 'macro',
      },
      {
        title: { zh: '4. 第 21 天', en: '4. Day 21' },
        text: { zh: '<p>只移动时间。</p>', en: '<p>Only time moves.</p>' },
        look: { zh: '纤颤电位与正锐波出现。', en: 'Fibrillations and positive sharp waves have appeared.' },
        change: 'day',
        params: (b) => ({ ...b, kind: 'partial', frac: 0.6, day: 21, view: 'rest' }),
        scale: 'macro',
      },
      {
        title: { zh: '5. 第 1 年：MUAP', en: '5. Year 1: MUAPs' },
        text: { zh: '<p>一年后改看 MUAP。</p>', en: '<p>One year later, look at the MUAPs.</p>' },
        look: { zh: '侧支再支配使 MUAP 增大、延长，CMAP 部分恢复，纤颤减少——同一病灶，不同时间，完全不同的检查结果（p.261, 263–264）。', en: 'Collateral reinnervation has enlarged and lengthened MUAPs, the CMAP has partly recovered and fibrillations are fewer — same lesion, different time, a very different study (p.261, 263–264).' },
        change: 'day',
        params: (b) => ({ ...b, kind: 'partial', frac: 0.6, day: 365, view: 'muap' }),
        scale: 'macro',
      },
    ],
  },
];