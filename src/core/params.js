// Parameter registry.
// Every number that drives the simulation is declared here with its provenance:
//   textbook     – value or range stated in Preston & Shapiro, Electromyography and
//                  Neuromuscular Disorders, 4th ed. (printed page cited; PDF page = printed + 11)
//   derived      – interpolated or computed from textbook anchor values (method stated)
//   literature   – standard modelling convention from outside the textbook (reference given)
//   illustrative – chosen to make the teaching model work; NOT a clinical value or criterion
// The UI renders this table so the learner can always see which numbers are teaching knobs.

const R = [];
function def(key, value, unit, status, src, en, zh, note = '') {
  R.push({ key, value, unit, status, src, en, zh, note });
  return value;
}

export const PV = {
  // ---------------- Nerve fibre populations ----------------
  motorCVFast: def('motorCVFast', 62, 'm/s', 'textbook', 'p.34, Fig 3.17',
    'Fastest motor axons (median-like nerve)', '最快运动轴突传导速度', 'Book: fastest median fibres ≈65 m/s; slowest ≈35 m/s. Model distribution spans this range.'),
  motorCVSlow: def('motorCVSlow', 36, 'm/s', 'textbook', 'p.34, Fig 3.17',
    'Slowest normal myelinated motor axons', '最慢正常有髓运动轴突', ''),
  sensoryCVFast: def('sensoryCVFast', 64, 'm/s', 'textbook', 'p.17, p.19, p.32',
    'Fastest cutaneous sensory axons', '最快皮肤感觉轴突', 'Myelinated fibres 35–75 m/s; sensory CV range wider than motor (p.32).'),
  sensoryCVSlow: def('sensoryCVSlow', 34, 'm/s', 'textbook', 'p.17, p.32',
    'Slowest recorded myelinated sensory axons', '最慢有髓感觉轴突', ''),
  nMotorAxons: def('nMotorAxons', 120, 'axons', 'illustrative', '—',
    'Number of modelled motor axons', '模型运动轴突数', 'Computational sample; amplitudes are scaled so the normal CMAP is in the usual mV range.'),
  nSensoryAxons: def('nSensoryAxons', 600, 'axons', 'illustrative', '—',
    'Number of modelled sensory axons', '模型感觉轴突数', ''),
  sensoryNegPhaseMs: def('sensoryNegPhaseMs', 0.5, 'ms', 'textbook', 'p.31',
    'Negative-phase duration of one large sensory fibre AP (calibration target)', '单根大感觉纤维动作电位负相时程（校准目标）', 'Model spatial profile is scaled to reproduce ≈0.5 ms at a fast CV.'),

  // ---------------- Geometry (median-like upper limb) ----------------
  distWristToMotorPoint: def('distWristToMotorPoint', 70, 'mm', 'illustrative', '—',
    'Wrist stimulation → APB motor point', '腕刺激点→拇短展肌运动点', 'Typical laboratory set-up distance; not a criterion.'),
  distWristToElbow: def('distWristToElbow', 230, 'mm', 'illustrative', '—',
    'Wrist → elbow stimulation sites', '腕→肘刺激点距离', ''),
  distElbowToAxilla: def('distElbowToAxilla', 120, 'mm', 'illustrative', '—',
    'Elbow → axilla stimulation sites', '肘→腋刺激点距离', ''),
  distAxillaToCord: def('distAxillaToCord', 330, 'mm', 'illustrative', '—',
    'Axilla → spinal cord (for F wave circuit)', '腋→脊髓（F波环路）', ''),
  distWristToRing: def('distWristToRing', 130, 'mm', 'illustrative', '—',
    'Wrist stimulation → digit G1 ring (antidromic SNAP)', '腕刺激点→指环电极G1（逆向SNAP）', ''),
  ringSeparation: def('ringSeparation', 35, 'mm', 'textbook', 'p.26',
    'G1–G2 ring electrode separation', 'G1–G2指环电极间距', 'Book: 2.5–4 cm interelectrode distance.'),
  terminalDelayMs: def('terminalDelayMs', 1.4, 'ms', 'illustrative', 'concept p.24–25',
    'Terminal axon + NMJ transmission delay', '末梢轴突+神经肌肉接头传递延迟', 'Book defines the components (A+B+C) of distal latency but gives no single number; value is a teaching knob.'),

  // ---------------- Muscle fibres / motor units ----------------
  muscleFiberCV: def('muscleFiberCV', 4.0, 'm/s', 'illustrative', 'not in textbook',
    'Muscle fibre conduction velocity', '肌纤维传导速度', 'Textbook mentions muscle-fibre CV only qualitatively (p.717). Common physiological magnitude used for illustration.'),
  muTerritoryMinMm: def('muTerritoryMinMm', 5, 'mm', 'textbook', 'p.245',
    'Adult motor-unit territory (lower)', '成人运动单位分布区（下限）', 'Book: 5–10 mm.'),
  muTerritoryMaxMm: def('muTerritoryMaxMm', 10, 'mm', 'textbook', 'p.245',
    'Adult motor-unit territory (upper)', '成人运动单位分布区（上限）', ''),
  fiberSpacingMm: def('fiberSpacingMm', 0.11, 'mm', 'illustrative', '—',
    'Spacing of modelled muscle fibres in cross-section', '模型肌纤维间距', 'Real fibre density is higher; amplitude is scaled to compensate.'),
  needleMaxPickupMm: def('needleMaxPickupMm', 2.6, 'mm', 'illustrative', 'concept p.136 Fig 12.4',
    'Radius beyond which fibres are ignored for needle MUAPs', '针电极计算忽略半径', 'Fibres outside contribute negligibly (book: 90%/99% amplitude contours).'),

  // ---------------- Voluntary activation ----------------
  onsetFiringHz: def('onsetFiringHz', 5, 'Hz', 'textbook', 'p.251, p.232',
    'Onset firing rate of a voluntary MUAP', '随意运动单位起始放电频率', 'Book: 4–5 Hz; slower firing cannot be voluntary.'),
  maxFiringHz: def('maxFiringHz', 45, 'Hz', 'textbook', 'p.253',
    'Maximal voluntary firing rate (limb muscle)', '最大随意放电频率', 'Book: 30–50 Hz for most muscles.'),
  recruitRatio: def('recruitRatio', 5, 'Hz per unit', 'textbook', 'p.253',
    'Firing-rate : number-of-units ratio (calibration of thresholds)', '放电频率:运动单位数比例（阈值校准）', 'Book: ≈5:1 (2nd unit at ≈10 Hz, 3rd at ≈15 Hz).'),
  fusionHz: def('fusionHz', 40, 'Hz', 'textbook', 'p.251–252',
    'Tetanic fusion frequency (force saturates)', '强直融合频率', 'Book: 30–50 Hz.'),
  isiCV: def('isiCV', 0.12, '', 'illustrative', 'concept p.250–251',
    'Inter-spike-interval variability (semirhythmic firing)', '放电间隔变异（半节律）', ''),

  // ---------------- Lesion time course ----------------
  wallerianMotorDays: def('wallerianMotorDays', [3, 5], 'days', 'textbook', 'p.35, p.255, p.260',
    'Wallerian degeneration of motor fibres', '运动纤维沃勒变性', ''),
  wallerianSensoryDays: def('wallerianSensoryDays', [6, 10], 'days', 'textbook', 'p.35, p.260',
    'Wallerian degeneration of sensory fibres', '感觉纤维沃勒变性', ''),
  fibOnsetAnchors: def('fibOnsetAnchors', 'paraspinal 10–14 d; proximal thigh 2–3 wk; leg 3–4 wk; distal leg/foot 5–6 wk; lesion near NMJ: a few days', '', 'textbook', 'p.236, p.565',
    'First appearance of fibrillations/PSWs (L5–S1 root lesion example)', '纤颤电位/正锐波首次出现时间（L5–S1根病例）', 'Depends on nerve length between lesion and muscle.'),
  fibOnsetModel: def('fibOnsetModel', 'onset(d) ≈ 10.6 + 0.028·L(mm)', 'days', 'derived', 'fit to p.236 / p.565 root-lesion anchors',
    'Length-dependent onset of denervation potentials', '失神经电位出现时间（长度依赖）', 'Straight line through the L5–S1 anchor points (L = nerve length from lesion to muscle). Schematic; does not apply to NMJ-level denervation (botulism: a few days).'),
  sproutStartDays: def('sproutStartDays', 25, 'days', 'illustrative', 'concept p.255–256',
    'Start of collateral sprouting after denervation', '侧支芽生开始', 'Book: reinnervation takes many weeks to months.'),
  sproutMatureDays: def('sproutMatureDays', 120, 'days', 'illustrative', 'concept p.248–249',
    'Maturation time constant of reinnervating sprouts', '再支配芽枝成熟时间常数', 'Satellites move into the main MUAP as sprouts myelinate.'),

  // ---------------- Spontaneous activity ----------------
  fibRateHz: def('fibRateHz', [0.5, 10], 'Hz', 'textbook', 'p.234',
    'Fibrillation / PSW firing rate', '纤颤/正锐波放电频率', 'Occasionally up to 30 Hz; regular.'),
  fibAmplitudeUv: def('fibAmplitudeUv', [10, 100], 'µV', 'textbook', 'p.234',
    'Fibrillation amplitude', '纤颤电位波幅', '<10 µV in very chronic (>6–12 mo) denervation.'),
  myotonicHz: def('myotonicHz', [20, 150], 'Hz', 'textbook', 'p.238',
    'Myotonic discharge firing rate (waxing/waning)', '肌强直放电频率（渐增渐减）', ''),
  crdHz: def('crdHz', [5, 100], 'Hz', 'textbook', 'p.237',
    'Complex repetitive discharge rate (perfectly regular)', '复合重复放电频率（完全规则）', ''),
  fascHz: def('fascHz', '<1–2', 'Hz', 'textbook', 'p.238',
    'Fasciculation rate (slow, irregular)', '束颤电位频率（慢且不规则）', ''),
  spontFiberGain: def('spontFiberGain', 0.35, '×', 'illustrative', 'calibrated to p.234 (fibrillations typically 10–100 µV)',
    'Amplitude factor for spontaneously firing single-fibre potentials', '自发单纤维电位波幅系数', 'The needle model (tuned for MUAPs) gives single-fibre potentials of a few hundred µV at 0.1–0.4 mm; this factor brings spontaneous single-fibre potentials into the textbook range. PSWs use their own crushed-zone model and are not scaled.'),
  voluntaryMinHz: def('voluntaryMinHz', '4–5', 'Hz', 'textbook', 'p.232, p.238',
    'Lowest voluntary MU firing rate; slower discharges cannot be voluntary', '随意MU最低放电频率；更慢者不可能是随意的', ''),
  endplateNoiseHz: def('endplateNoiseHz', [20, 40], 'Hz', 'textbook', 'p.233, Table 14.1',
    'Endplate noise (MEPPs): monophasic negative, irregular', '终板噪声（MEPP）：单相负向、不规则', ''),
  endplateSpikeHz: def('endplateSpikeHz', '5–50', 'Hz', 'textbook', 'p.233, Table 14.1',
    'Endplate spikes: biphasic initial-negative, irregular sputtering', '终板棘波：双相、起始负向、不规则“噼啪”', 'Model mean rate 15 Hz (illustrative) with bursts/pauses.'),
  meppAmpUv: def('meppAmpUv', 15, 'µV', 'illustrative', '—',
    'Endplate noise amplitude in the model', '模型终板噪声波幅', 'Textbook: “low amplitude”; value chosen for display.'),
  myokymiaHz: def('myokymiaHz', 'within burst 5–60; between bursts <2', 'Hz', 'textbook', 'p.240',
    'Myokymic discharge: grouped bursts of the same MUAP', '肌纤维颤搐放电：同一MUAP成串爆发', 'Model: 30 Hz within, ≈1 Hz between bursts (illustrative choices inside the range).'),
  doubletIntervalMs: def('doubletIntervalMs', 12, 'ms', 'illustrative', '—',
    'Interval between the potentials of a doublet/triplet in the model', '模型中双联/三联放电的间隔', 'Textbook gives no number; chosen for display.'),
  crdEphapticDelayMs: def('crdEphapticDelayMs', [0.35, 1.1], 'ms', 'illustrative', '—',
    'Fibre-to-fibre ephaptic delay in the CRD loop', 'CRD环路中纤维间电突触样传递延迟', 'Sets the spacing of spikes inside each complex.'),

  // ---------------- NMJ (textbook teaching model) ----------------
  quantaStore: def('quantaStore', 1000, 'quanta', 'textbook', 'p.57–58',
    'Immediately available store n', '即刻可释放储备 n', ''),
  releaseP: def('releaseP', 0.2, '', 'textbook', 'p.58',
    'Probability of release p (m = p·n)', '释放概率 p（m = p·n）', ''),
  eppPerQuantumMv: def('eppPerQuantumMv', 0.2, 'mV/quantum', 'textbook', 'p.58–59 worked example',
    'EPP per quantum (200 quanta → 40 mV)', '每量子终板电位（200量子→40 mV）', ''),
  eppThresholdMv: def('eppThresholdMv', 15, 'mV', 'textbook', 'p.58 worked example',
    'EPP threshold for a muscle fibre AP (example value)', '产生肌纤维动作电位的EPP阈值（示例值）', 'Fibre-to-fibre spread added (illustrative).'),
  caClearMs: def('caClearMs', 100, 'ms', 'textbook', 'p.58',
    'Time to pump Ca²⁺ out of the terminal', '突触前钙离子清除时间', 'Stimulation >10 Hz → Ca accumulation.'),
  mobilizationS: def('mobilizationS', 1.5, 's', 'textbook', 'p.58, p.64',
    'Mobilization store begins to resupply', '动员储备开始补充', 'Book: after 1–2 s.'),
  decrementCut: def('decrementCut', 10, '%', 'textbook', 'p.64',
    'Abnormal decrement on slow RNS', '低频RNS异常递减', '>10% abnormal.'),
  incrementPseudo: def('incrementPseudo', 40, '%', 'textbook', 'p.65',
    'Upper limit of pseudofacilitation in normals', '正常人假性易化上限', ''),
  incrementPresyn: def('incrementPresyn', 100, '%', 'textbook', 'p.65',
    'Increment typical of presynaptic disorders', '突触前病变的典型递增', '40–100% equivocal.'),

  // ---------------- Late responses ----------------
  ahcTurnaroundMs: def('ahcTurnaroundMs', 1.0, 'ms', 'textbook', 'p.44–45',
    'Anterior-horn-cell turnaround time (F estimate)', '前角细胞折返时间（F估算）', ''),
  fBackfireFraction: def('fBackfireFraction', 0.03, 'fraction', 'textbook', 'p.42',
    'Fraction of motor units backfiring per stimulus', '每次刺激回返放电的运动单位比例', 'Book: F response = 1–5% of muscle fibres.'),
  hSynapseMs: def('hSynapseMs', 1.0, 'ms', 'illustrative', '—',
    'Central delay of the monosynaptic H-reflex arc', 'H反射单突触中枢延迟', ''),
  iaCV: def('iaCV', 68, 'm/s', 'textbook', 'p.19, p.32 (qualitative)',
    'Ia afferent conduction velocity', 'Ia传入纤维传导速度', 'Book: Ia are the largest, fastest fibres; numerical value illustrative.'),

  // ---------------- Technical factors ----------------
  cvPerDegC: def('cvPerDegC', 2.0, 'm/s per °C', 'textbook', 'p.78',
    'CV change per °C', '每°C传导速度变化', 'Book: 1.5–2.5 m/s per °C (linear 21–34 °C).'),
  dlPerDegC: def('dlPerDegC', 0.2, 'ms per °C', 'textbook', 'p.78',
    'Distal latency change per °C', '每°C远端潜伏期变化', ''),
  refTempC: def('refTempC', 33, '°C', 'textbook', 'p.79',
    'Reference limb temperature', '参考肢体温度', 'Book: maintain 32–34 °C.'),
  apWidthPerDegC: def('apWidthPerDegC', 0.03, 'fraction per °C', 'illustrative', 'direction p.78',
    'Fibre-AP prolongation per °C of cooling', '每降1°C纤维动作电位延长', 'Book states direction (larger, longer APs); magnitude illustrative.'),
  coolAmpPerDegC: def('coolAmpPerDegC', 0.07, 'fraction per °C', 'illustrative', 'direction p.78',
    'Single sensory-fibre potential amplitude increase per °C of cooling', '每降1°C感觉单纤维电位波幅增加', 'Book: cooling gives larger APs and larger SNAPs (less cancellation); magnitude chosen so the model SNAP grows on cooling as described.'),
  motorFilters: def('motorFilters', [10, 10000], 'Hz', 'textbook', 'p.83',
    'Motor NCS filters (LFF, HFF)', '运动NCS滤波（低频、高频）', ''),
  sensoryFilters: def('sensoryFilters', [20, 2000], 'Hz', 'textbook', 'p.83',
    'Sensory NCS filters (LFF, HFF)', '感觉NCS滤波', ''),
  needleFilters: def('needleFilters', [10, 10000], 'Hz', 'textbook', 'p.659',
    'Routine needle EMG LFF', '常规针极肌电图低频滤波', 'Book: LFF normally 10 Hz in routine EMG; raised to 500–1000 Hz for SFEMG.'),

  // ---------------- Volume conductor ----------------
  rosenfalck: def('rosenfalck', 'Vm(z) = 96·z³·e^(−z) − 90 mV', '', 'literature', 'Rosenfalck P. Acta Physiol Scand Suppl 1969;321',
    'Intracellular AP profile used for line-source synthesis', '线源合成所用的细胞内动作电位空间分布', 'External to the textbook; standard in EMG simulation.'),
  noiseUv: def('noiseUv', 1.5, 'µV rms', 'illustrative', '—',
    'Display noise for surface/needle traces', '显示噪声', 'Can be turned off.'),
};

export const PARAM_TABLE = R;

export function paramInfo(key) {
  return R.find((p) => p.key === key);
}
