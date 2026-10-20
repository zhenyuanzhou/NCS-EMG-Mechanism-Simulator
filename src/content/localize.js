// Content for the localization module (textbook p.28–29, 33, 236, 528–534, 561–566, 583–584, 677–678).
import { L } from './i18n.js';
import { fmt } from '../core/util.js';
import { LESIONS, MUSCLES, NERVES } from '../physiology/localize.js';
import { findingShort } from '../render/plexus.js';

const LOC_DAYS = [2, 7, 14, 21, 35, 60, 120, 365];
const dayLabel = (d) => (d < 60 ? L(`${d} 天`, `day ${d}`) : d < 365 ? L(`${Math.round(d / 30)} 个月`, `${Math.round(d / 30)} months`) : L('1 年', '1 year'));

export function gradeText(g) {
  return g ? `${g}+` : '0';
}

export function controls(c) {
  return [
    {
      title: { zh: '病变', en: 'Lesion' },
      pathology: true,
      items: [
        { type: 'chips', path: 'lesion', label: { zh: '病变部位/类型', en: 'Site / type' }, options: Object.entries(LESIONS).map(([value, v]) => ({ value, label: { zh: v.zh, en: v.en } })) },
        { type: 'range', path: 'sev', label: { zh: '严重度', en: 'Severity' }, min: 0.2, max: 0.95, step: 0.05, fmt: (v) => `${Math.round(v * 100)}%`, help: { zh: '受累根/神经中被中断的轴突比例（肌病：肌纤维丢失程度）。', en: 'Fraction of axons interrupted in the affected root/nerve (myopathy: degree of fibre loss).' } },
        { type: 'toggle', path: 'inflam', label: { zh: '炎性/坏死性（肌纤维易激惹）', en: 'Inflammatory/necrotising (irritable fibres)' }, show: (q) => q.lesion === 'myopathy' },
      ],
    },
    {
      title: { zh: '病程时钟', en: 'Disease clock' },
      items: [{ type: 'steps', path: 'day', values: LOC_DAYS, label: { zh: '起病后', en: 'Since onset' }, fmt: dayLabel, help: { zh: '纤颤出现的时间取决于病灶到各肌肉的长度：椎旁肌最早、手部肌最晚（p.236）。', en: 'Fibrillations appear according to lesion-to-muscle length: paraspinals first, hand muscles last (p.236).' } }],
    },
    {
      title: { zh: '查看', en: 'Inspect' },
      items: [
        {
          type: 'select',
          path: 'sel',
          label: { zh: '显示波形', en: 'Waveforms for' },
          options: [...MUSCLES.map((m) => ({ value: m.id, label: { zh: `针极：${m.zh}`, en: `EMG: ${m.en}` } })), ...NERVES.map((n) => ({ value: n.id, label: { zh: `NCS：${n.zh}`, en: `NCS: ${n.en}` } }))],
          help: { zh: '也可在解剖图或根–肌肉图中点击。', en: 'Or click in the anatomy or the root–muscle map.' },
        },
      ],
    },
  ];
}

function lists(r) {
  const abnM = r.muscles.filter((m) => m.grade || m.muap !== 'normal' || m.recruit !== 'normal');
  const snaps = r.nerves.filter((n) => n.kind === 'sensory');
  const lowSnap = snaps.filter((n) => n.pct < 50);
  const cmaps = r.nerves.filter((n) => n.kind === 'motor');
  return { abnM, snaps, lowSnap, cmaps };
}
const nm = (x) => L(x.zh.replace(/（.*?）/, ''), x.en.replace(/ \(.*\)/, ''));

function chainFor(r, c) {
  const { abnM, snaps, lowSnap, cmaps } = lists(r);
  const sev = Math.round(c.sev * 100);
  const ps = r.muscles.find((m) => m.paraspinal);
  const snapTxt = snaps.map((n) => `${nm(n)} ${n.pct.toFixed(0)}%`).join(L('，', ', '));
  const cmapTxt = cmaps.map((n) => `${nm(n)} ${n.pct.toFixed(0)}%`).join(L('，', ', '));
  const musTxt = abnM.length ? abnM.map((m) => `${nm(m)}${L('（', ' (')}${findingShort(m, L('zh', 'en') === 'zh')}${L('）', ')')}`).join(L('；', '; ')) : L('无', 'none');
  const wf = L(`SNAP：${snapTxt}。CMAP：${cmapTxt}。异常肌肉：${musTxt}。`, `SNAP: ${snapTxt}. CMAP: ${cmapTxt}. Abnormal muscles: ${musTxt}.`);
  const g = LESIONS[c.lesion].group;
  const timeNote = (() => {
    const pending = r.muscles.filter((m) => m.onset && m.mi.fm > 0.02 && c.day < m.onset);
    if (c.day < 5) return L(' 起病不足 5 天：远端 NCS 可仍正常（沃勒变性未完成，p.34–35）。', ' Under 5 days: distal NCS may still be normal (Wallerian degeneration incomplete, p.34–35).');
    if (pending.length) return L(` 尚未出现纤颤：${pending.map((m) => `${nm(m)}（约 ${m.onset.toFixed(0)} 天）`).join('、')}。`, ` Fibrillations not yet present in: ${pending.map((m) => `${nm(m)} (≈day ${m.onset.toFixed(0)})`).join(', ')}.`);
    return '';
  })();
  switch (g) {
    case 'root': {
      const rt = c.lesion === 'c7' ? 'C7' : 'C8';
      return [
        L(`${rt} 神经根，节前（DRG 与脊髓之间），${sev}% 轴突中断。`, `${rt} root, preganglionic (between DRG and cord), ${sev}% of axons interrupted.`),
        L('前根运动轴突离断 → 沃勒变性 → 该肌节肌纤维失神经；感觉神经元胞体在 DRG，节前病灶只切断其中枢突，DRG 细胞与周围突完好（p.28–29）。', 'Ventral-root motor axons are cut → Wallerian degeneration → the myotome’s fibres are denervated. Sensory cell bodies sit in the DRG; a preganglionic lesion cuts only their central processes, leaving the DRG cells and peripheral axons intact (p.28–29).'),
        L('SNAP 来自 DRG 周围突 → 保留；CMAP 与针极反映运动单位丢失；椎旁肌由在根水平分出的后支支配 → 可受累。', 'The SNAP comes from the DRG’s peripheral axons → preserved; CMAP and needle EMG reflect motor-unit loss; paraspinals are supplied by dorsal rami leaving at root level → can be involved.'),
        wf + timeNote,
        L(`同一肌节跨多条周围神经（正中、尺、桡）、SNAP 正常${ps.grade ? '、椎旁肌异常' : ''} → 神经根病（p.561–563）。${ps.grade ? '' : '椎旁肌正常不能排除根病（仅约一半异常，p.563）。'}`, `One myotome across several peripheral nerves (median, ulnar, radial), normal SNAPs${ps.grade ? ', abnormal paraspinals' : ''} → radiculopathy (p.561–563).${ps.grade ? '' : ' Normal paraspinals do not exclude it (abnormal in only about half, p.563).'}`),
      ];
    }
    case 'plexus':
      return [
        L(`臂丛下干（C8–T1 纤维，DRG 远端），${sev}% 轴突中断。`, `Lower trunk (C8–T1 fibres, distal to the DRG), ${sev}% of axons interrupted.`),
        L('运动与感觉轴突都在 DRG 远端被切断 → 两者均发生沃勒变性。', 'Both motor and sensory axons are cut distal to the DRG → both undergo Wallerian degeneration.'),
        L('C8–T1 支配的 SNAP（尺神经小指、MABC）下降；C6–C7 的正中示指 SNAP 不受影响（表 33.2）；椎旁肌后支在丛近端分出 → 正常。', 'SNAPs from C8–T1 (ulnar to little finger, MABC) fall; the median index SNAP (C6–C7) is unaffected (Table 33.2); paraspinal dorsal rami leave proximal to the plexus → normal.'),
        wf + timeNote,
        L('与 C8 根病的关键区别：SNAP 降低（节后）且椎旁肌正常（p.561–563, 584）。与尺神经病的区别：正中 C8 肌（APB、FPL）与桡神经 C8 肌（EIP）也受累，且 MABC 异常。', 'Key differences from C8 radiculopathy: low SNAPs (postganglionic) and normal paraspinals (p.561–563, 584). From ulnar neuropathy: median C8 muscles (APB, FPL) and radial C8 (EIP) are also involved, and MABC is abnormal.'),
      ];
    case 'mono':
      if (c.lesion === 'medianWrist')
        return [
          L(`腕部正中神经，${sev}% 轴突中断（示教用的轴突性病变；腕管综合征多为脱髓鞘性）。`, `Median nerve at the wrist, ${sev}% of axons interrupted (an axonal lesion for teaching; carpal tunnel syndrome is usually demyelinating).`),
          L('病灶以远的运动与感觉轴突沃勒变性。', 'Motor and sensory axons distal to the lesion degenerate.'),
          L('只有在病灶以远分出的分支受累：APB 与示指 SNAP；前臂的正中神经肌（PT、FCR、FPL）不受累。', 'Only branches leaving distal to the lesion are affected: APB and the index SNAP; forearm median muscles (PT, FCR, FPL) are spared.'),
          wf + timeNote,
          L('局限于一条神经、在某一点以远 → 单神经病，定位于最近端受累分支与最远端正常分支之间。', 'Confined to one nerve, distal to a point → mononeuropathy, localized between the most proximal affected and the most distal spared branch.'),
        ];
      return [
        L(`肘部尺神经，${sev}% 轴突中断。`, `Ulnar nerve at the elbow, ${sev}% of axons interrupted.`),
        L('病灶以远的尺神经运动与感觉轴突沃勒变性。', 'Ulnar motor and sensory axons distal to the lesion degenerate.'),
        L('FDI、ADM 与小指 SNAP 受累；FCU 分支靠近肘部，可不同程度受累（模型取 50%，示意）；MABC 来自内侧束，不经过肘部尺神经 → 正常。', 'FDI, ADM and the little-finger SNAP are affected; FCU branches near the elbow and is variably involved (model: 50%, illustrative); MABC comes from the medial cord, not the ulnar nerve → normal.'),
        wf + timeNote,
        L('与 C8/下干的区别：正中 C8 肌（APB、FPL）、桡神经 C8 肌（EIP）正常，MABC 正常。', 'Different from C8/lower trunk: median C8 muscles (APB, FPL), radial C8 (EIP) and MABC are normal.'),
      ];
    case 'poly':
      return [
        L(`长度依赖性轴突多发神经病，严重度 ${sev}%（每侧对称；此处只画一侧）。`, `Length-dependent axonal polyneuropathy, severity ${sev}% (symmetric; one side drawn).`),
        L('最长的轴突最先、最重受累（远端轴突逆死）；感觉常重于运动（模型：运动 ×0.7，示意）。', 'The longest axons fail first and most (distal dying-back); sensory often more than motor (model: motor ×0.7, illustrative).'),
        L('腓肠 SNAP 与足/小腿肌最先异常，其次手部；近端肌保留（长度系数为示意曲线）。', 'Sural SNAP and leg/foot muscles first, then the hand; proximal muscles spared (length curve illustrative).'),
        wf + timeNote,
        L('远端→近端梯度、下肢重于上肢、双侧对称 → 多发神经病模式（p.492–495）；不同于以肌节或单神经分布的病变。', 'Distal-to-proximal gradient, legs before arms, symmetric → polyneuropathy pattern (p.492–495); unlike myotomal or single-nerve patterns.'),
      ];
    case 'mnd':
      return [
        L(`前角细胞（下运动神经元）丢失，严重度 ${sev}%，各肌程度不一（模型中为一次性丢失，不含持续进展）。`, `Anterior-horn-cell (lower motor neuron) loss, severity ${sev}%, patchy across muscles (modelled as a single loss, without ongoing progression).`),
        L('整个运动单位消失；感觉神经元完好。', 'Whole motor units disappear; sensory neurons are intact.'),
        L('CMAP 随运动单位丢失下降，SNAP 正常；针极：多个节段（包括椎旁肌）失神经与再支配，可见束颤。', 'CMAPs fall with motor-unit loss while SNAPs stay normal; needle EMG: denervation and reinnervation across segments (including paraspinals), with fasciculations.'),
        wf + timeNote,
        L('广泛、跨节段、跨神经的纯运动受累 + SNAP 正常 → 支持运动神经元病（诊断需多个节段，p.528–534）。SNAP 异常应使人质疑 ALS（除非另有解释）。', 'Widespread pure-motor involvement across segments and nerves with normal SNAPs → supports motor neuron disease (requires several segments, p.528–534). Abnormal SNAPs should make one question ALS unless otherwise explained.'),
      ];
    case 'myo':
    default:
      return [
        L(`肌病，近端为主，严重度 ${sev}%${c.inflam ? '，炎性/坏死性' : ''}。`, `Myopathy, proximal-predominant, severity ${sev}%${c.inflam ? ', inflammatory/necrotising' : ''}.`),
        L('运动神经元与轴突完好；每个运动单位中能工作的肌纤维减少、大小不一。', 'Motor neurons and axons are intact; each motor unit has fewer working fibres of variable size.'),
        L(`MUAP 由更少的纤维组成 → 短、小、多相；产生同样力量需要更多单位 → 早募集${c.inflam ? '；易激惹纤维 → 纤颤/正锐波' : ''}。神经传导不经过肌纤维病变 → 正常。`, `MUAPs are built from fewer fibres → short, small, polyphasic; more units are needed for the same force → early recruitment${c.inflam ? '; irritable fibres → fibrillations/PSWs' : ''}. Nerve conduction does not involve the diseased fibres → normal.`),
        wf,
        L('近端肌短小 MUAP + 早募集 + 感觉 NCS 正常 → 肌病模式（p.266, 677）。注意：正常 EMG 不能排除肌病（如类固醇肌病、部分代谢/线粒体肌病，p.678）。', 'Short/small MUAPs with early recruitment proximally and normal sensory NCS → myopathic pattern (p.266, 677). A normal EMG does not exclude myopathy (e.g. steroid and some metabolic/mitochondrial myopathies, p.678).'),
      ];
  }
}

export function explain(r, c) {
  const rows = [];
  r.nerves.forEach((n) => {
    const frac = n.kind === 'motor' ? n.p.axonal?.on ? n.p.axonal.frac : n.p.mnd?.on ? n.p.mnd.frac : 0 : n.ni.fs;
    const pre = n.kind === 'sensory' && n.ni.sensSite === 'rootPre' && n.ni.fs > 0;
    rows.push({
      label: L(n.zh, n.en),
      vals: [n.kind === 'motor' && n.p.myopathy?.on ? L('肌纤维', 'fibres') : `${Math.round(frac * 100)}%${pre ? L('（节前）', ' (pre-G)') : ''}`, `${n.s.m.present ? (n.kind === 'motor' ? fmt(n.s.m.amp, 1) + ' mV' : fmt(n.s.m.amp * 1000, 0) + ' µV') : L('无', 'absent')} · ${n.pct.toFixed(0)}%`],
      flag: ['', n.kind === 'sensory' && n.pct < 50 ? 'bad' : ''],
      hl: c.sel === n.id,
    });
  });
  r.muscles.forEach((m) => {
    const ab = m.grade || m.muap !== 'normal' || m.recruit !== 'normal';
    rows.push({
      label: L(m.zh, m.en),
      vals: [m.mi.myo > 0 ? `${L('肌', 'myo')} ${Math.round(m.mi.myo * 100)}%` : `${Math.round(m.mi.fm * 100)}%`, findingShort(m, L('zh', 'en') === 'zh')],
      flag: ['', ab ? 'bad' : ''],
      hl: c.sel === m.id,
    });
  });
  return {
    chain: chainFor(r, c),
    measures: {
      cols: [L('受累（模型）', 'Involved (model)'), L('结果', 'Result')],
      rows,
      note: L(
        '受累比例来自根–神经–肌肉图；每项结果由完整模型对该神经/肌肉单独模拟得到（NCS 为合成波形；肌肉为模拟的纤颤纤维比例、每单位纤维数与可用单位数）。纤颤分级与“大/小 MUAP、募集↓”的分界为示意映射。SNAP 红色 = 低于正常 50%（对侧比较的常用界限，p.584）。',
        'Involvement comes from the root–nerve–muscle map; each result is simulated separately by the full model (NCS: synthesized waveforms; muscles: simulated fibrillating fraction, fibres per unit and units available). Fibrillation grade and the “large/small MUAP, recruitment↓” cut-offs are illustrative mappings. Red SNAP = below 50% of normal (the usual side-to-side criterion, p.584).'
      ),
    },
    caveat: L(
      '<p>SNAP 在根病中保留的规律几乎总是成立（&gt;99%）；少见例外是 L5 根病时腓浅神经 SNAP（DRG 位于椎间孔内，p.561–562）。多数肌肉受多个肌节支配，单一节段定位有限，假阴性并不少见（p.566）。束颤见于多种下运动神经元病变及正常人，本模块只在运动神经元病中显示（p.238）。本模型所有神经共用同一条“正中样”神经的正常值，比较的是 % 正常而非绝对值。</p>',
      '<p>The “SNAP preserved in radiculopathy” rule holds &gt;99% of the time; a rare exception is the superficial peroneal SNAP in L5 radiculopathy (intraforaminal DRG, p.561–562). Most muscles are multi-myotomal, so single-level localization is limited and false negatives are not rare (p.566). Fasciculations occur in many lower-motor-neuron disorders and in normal people; this module shows them only for motor neuron disease (p.238). All nerves here share one “median-like” nerve’s normal values; compare % of normal, not absolute values.</p>'
    ),
    sources: L('来源：p.28–29, 34–35, 236, 266, 492–495, 528–534, 561–566, 584（表 32.6、33.2）, 677–678。', 'Sources: p.28–29, 34–35, 236, 266, 492–495, 528–534, 561–566, 584 (Tables 32.6, 33.2), 677–678.'),
  };
}

export function why(prev, cur) {
  const k = prev.changed;
  const t = {
    lesion: L('换了病变部位：同一套取样神经与肌肉，受累分布（哪个肌节、哪条神经、DRG 近端还是远端）改变了。', 'Different lesion site: the same nerves and muscles are sampled; the distribution (which myotome, which nerve, proximal or distal to the DRG) changed.'),
    sev: L('只改变了严重度：分布不变，受累程度按比例改变。', 'Only severity changed: same distribution, scaled involvement.'),
    day: L('只移动了病程时钟：NCS 随沃勒变性下降（运动 3–5 天、感觉 6–10 天），纤颤按病灶到肌肉的长度依次出现，再支配需数月。', 'Only the clock moved: NCS fall with Wallerian degeneration (motor 3–5 d, sensory 6–10 d), fibrillations appear muscle by muscle according to length, reinnervation takes months.'),
    sel: L('只换了查看的项目：病变不变。', 'Only the inspected item changed; the lesion is the same.'),
    inflam: L('切换了肌纤维易激惹：决定肌病中是否出现纤颤/正锐波。', 'Toggled fibre irritability: decides whether a myopathy shows fibrillations/PSWs.'),
  }[k];
  let h = `<p>${t || L('参数已改变。', 'A parameter changed.')}</p>`;
  const a = prev.result;
  const b = cur.result;
  if (a && b && a.nerves && b.nerves) {
    const diff = [];
    b.nerves.forEach((n, i) => {
      const o = a.nerves[i];
      if (Math.abs(o.pct - n.pct) >= 5) diff.push(`<li>${L(n.zh, n.en)} ${o.pct.toFixed(0)}% → <b>${n.pct.toFixed(0)}%</b></li>`);
    });
    b.muscles.forEach((m, i) => {
      const o = a.muscles[i];
      const fo = findingShort(o, L('zh', 'en') === 'zh');
      const fn = findingShort(m, L('zh', 'en') === 'zh');
      if (fo !== fn) diff.push(`<li>${L(m.zh, m.en)}：${fo} → <b>${fn}</b></li>`);
    });
    if (diff.length) h += `<ul>${diff.slice(0, 10).join('')}</ul>`;
  }
  return h;
}

export function modelNotes() {
  return L(
    '<p>根–肌肉对应取自表 32.6（“主要”权重 1，“次要”权重 0.4，后者为示意数值）；SNAP 与干/束的对应取自表 33.2（上干 = C5–C6，中干 = C7，下干 = C8–T1）。每块肌肉的受累比例 = 严重度 × 病变根在该肌中的权重份额。病灶到肌肉的路径长度为示意值，用于纤颤出现时间（模型公式 10.6 + 0.028·L 天）。长度依赖曲线（400 mm 以下无影响、1000 mm 达到最大）与运动神经元病的“斑片状”分布为示意。所有神经共用同一模型神经与肌肉，只改变受累比例与病灶位置。</p>',
    '<p>Root–muscle pairs come from Table 32.6 (“marker” weight 1, “less often” weight 0.4, the latter an illustrative number); SNAP–trunk/cord pairs from Table 33.2 (upper trunk = C5–C6, middle = C7, lower = C8–T1). A muscle’s involvement = severity × the lesioned root’s share of its weights. Lesion-to-muscle path lengths are illustrative and set fibrillation onset (model formula 10.6 + 0.028·L days). The length-dependence curve (no effect below 400 mm, full by 1000 mm) and the patchy MND distribution are illustrative. All nerves share one model nerve and muscle; only involvement and lesion site differ.</p>'
  );
}
