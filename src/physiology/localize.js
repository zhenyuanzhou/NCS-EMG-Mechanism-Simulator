// Localization: a small nerve–root–muscle map and the rules that turn one lesion into the
// fraction of axons (or muscle fibres) affected in each sampled nerve and muscle.
// The map is from the textbook (Table 32.6 marker muscles, p.564; Table 33.2 SNAP–plexus
// mapping, p.584). Path lengths and the length-dependence curve are illustrative.

// Root weights: 'G' = most often abnormal ("marker"), 'b' = less often (Table 32.6, after Wilbourn).
export const W_G = 1;
export const W_B = 0.4; // illustrative numeric weight for a "less frequent" root contribution

export const ROOTS = ['C5', 'C6', 'C7', 'C8', 'T1'];

// lenMm: illustrative axon path length from the cervical cord (upper limb) or lumbosacral
// cord (lower limb) to the muscle's motor point / recording site.
export const MUSCLES = [
  { id: 'paraspinal', abZh: '椎旁肌', abEn: 'PSP', zh: '颈椎旁肌（C7–C8 水平）', en: 'Cervical paraspinals (C7–C8)', nerve: 'dorsal ramus', nerveZh: '后支', roots: { C7: 'G', C8: 'G' }, trunk: null, cord: null, lenMm: 40, proximal: true, paraspinal: true },
  { id: 'deltoid', abZh: '三角肌', abEn: 'Delt', zh: '三角肌', en: 'Deltoid', nerve: 'axillary', nerveZh: '腋神经', roots: { C5: 'G', C6: 'G' }, trunk: 'upper', cord: 'posterior', lenMm: 220, proximal: true },
  { id: 'biceps', abZh: '肱二头', abEn: 'Biceps', zh: '肱二头肌', en: 'Biceps', nerve: 'musculocutaneous', nerveZh: '肌皮神经', roots: { C5: 'G', C6: 'G' }, trunk: 'upper', cord: 'lateral', lenMm: 300, proximal: true },
  { id: 'triceps', abZh: '肱三头', abEn: 'Triceps', zh: '肱三头肌', en: 'Triceps', nerve: 'radial', nerveZh: '桡神经', roots: { C6: 'b', C7: 'G', C8: 'b' }, trunk: 'upper/middle/lower', cord: 'posterior', lenMm: 300, proximal: true },
  { id: 'pt', abZh: 'PT', abEn: 'PT', zh: '旋前圆肌', en: 'Pronator teres', nerve: 'median', nerveZh: '正中神经', roots: { C6: 'G', C7: 'G' }, trunk: 'upper/middle', cord: 'lateral', lenMm: 470 },
  { id: 'fcr', abZh: 'FCR', abEn: 'FCR', zh: '桡侧腕屈肌', en: 'Flexor carpi radialis', nerve: 'median', nerveZh: '正中神经', roots: { C6: 'G', C7: 'G' }, trunk: 'upper/middle', cord: 'lateral', lenMm: 490 },
  { id: 'fcu', abZh: 'FCU', abEn: 'FCU', zh: '尺侧腕屈肌', en: 'Flexor carpi ulnaris', nerve: 'ulnar', nerveZh: '尺神经', roots: { C7: 'b', C8: 'G', T1: 'b' }, trunk: 'lower', cord: 'medial', lenMm: 500 },
  { id: 'eip', abZh: 'EIP', abEn: 'EIP', zh: '示指伸肌', en: 'Extensor indicis', nerve: 'radial (PIN)', nerveZh: '桡神经（骨间后）', roots: { C8: 'G' }, trunk: 'lower', cord: 'posterior', lenMm: 650 },
  { id: 'fpl', abZh: 'FPL', abEn: 'FPL', zh: '拇长屈肌', en: 'Flexor pollicis longus', nerve: 'median (AIN)', nerveZh: '正中神经（骨间前）', roots: { C8: 'G', T1: 'b' }, trunk: 'lower', cord: 'medial', lenMm: 620 },
  { id: 'apb', abZh: 'APB', abEn: 'APB', zh: '拇短展肌', en: 'Abductor pollicis brevis', nerve: 'median', nerveZh: '正中神经', roots: { C8: 'G', T1: 'G' }, trunk: 'lower', cord: 'medial', lenMm: 760, handMedian: true },
  { id: 'fdi', abZh: 'FDI', abEn: 'FDI', zh: '第一骨间背侧肌', en: 'First dorsal interosseous', nerve: 'ulnar', nerveZh: '尺神经', roots: { C8: 'G', T1: 'G' }, trunk: 'lower', cord: 'medial', lenMm: 770, handUlnar: true },
  { id: 'adm', abZh: 'ADM', abEn: 'ADM', zh: '小指展肌', en: 'Abductor digiti minimi', nerve: 'ulnar', nerveZh: '尺神经', roots: { C8: 'G', T1: 'G' }, trunk: 'lower', cord: 'medial', lenMm: 780, handUlnar: true },
  { id: 'ta', abZh: '胫前肌', abEn: 'TA', zh: '胫骨前肌', en: 'Tibialis anterior', nerve: 'deep peroneal', nerveZh: '腓深神经', roots: {}, lower: true, lenMm: 820 },
  { id: 'mg', abZh: '腓肠肌', abEn: 'MG', zh: '腓肠肌内侧头', en: 'Medial gastrocnemius', nerve: 'tibial', nerveZh: '胫神经', roots: {}, lower: true, lenMm: 700 },
];

// Sampled nerve conduction studies. dRoots: roots whose dorsal-root-ganglion cells supply
// the SNAP (from the trunk/cord mapping of Table 33.2: upper trunk C5–C6, middle C7, lower C8–T1).
export const NERVES = [
  { id: 'medMot', kind: 'motor', zh: '正中神经运动（APB）', en: 'Median motor (APB)', muscle: 'apb' },
  { id: 'ulnMot', kind: 'motor', zh: '尺神经运动（ADM）', en: 'Ulnar motor (ADM)', muscle: 'adm' },
  { id: 'perMot', kind: 'motor', zh: '腓总神经运动（EDB）', en: 'Peroneal motor (EDB)', muscle: null, lower: true, lenMm: 1000 },
  { id: 'medSen', kind: 'sensory', zh: '正中神经感觉（示指）', en: 'Median sensory (index)', dRoots: ['C6', 'C7'], trunk: 'upper/middle', cord: 'lateral', lenMm: 700, median: true },
  { id: 'ulnSen', kind: 'sensory', zh: '尺神经感觉（小指）', en: 'Ulnar sensory (little finger)', dRoots: ['C8'], trunk: 'lower', cord: 'medial', lenMm: 720, ulnar: true },
  { id: 'radSen', kind: 'sensory', zh: '桡浅神经感觉', en: 'Superficial radial sensory', dRoots: ['C6', 'C7'], trunk: 'upper/middle', cord: 'posterior', lenMm: 620 },
  { id: 'mabc', kind: 'sensory', zh: '前臂内侧皮神经（MABC）', en: 'Medial antebrachial cutaneous', dRoots: ['C8', 'T1'], trunk: 'lower', cord: 'medial', lenMm: 520 },
  { id: 'sural', kind: 'sensory', zh: '腓肠神经感觉', en: 'Sural sensory', dRoots: ['S1'], lower: true, lenMm: 1000 },
];

export const LESIONS = {
  c7: { zh: 'C7 神经根病', en: 'C7 radiculopathy', group: 'root' },
  c8: { zh: 'C8 神经根病', en: 'C8 radiculopathy', group: 'root' },
  lowerTrunk: { zh: '下干臂丛病', en: 'Lower-trunk plexopathy', group: 'plexus' },
  medianWrist: { zh: '腕部正中神经病（轴突性）', en: 'Median neuropathy at the wrist (axonal)', group: 'mono' },
  ulnarElbow: { zh: '肘部尺神经病（轴突性）', en: 'Ulnar neuropathy at the elbow (axonal)', group: 'mono' },
  lengthDep: { zh: '长度依赖性轴突多发神经病', en: 'Length-dependent axonal polyneuropathy', group: 'poly' },
  mnd: { zh: '运动神经元病（ALS 样）', en: 'Motor neuron disease (ALS-like)', group: 'mnd' },
  myopathy: { zh: '肌病（近端为主）', en: 'Myopathy (proximal-predominant)', group: 'myo' },
};

function rootShare(roots, set) {
  let tot = 0;
  let hit = 0;
  for (const [r, g] of Object.entries(roots)) {
    const w = g === 'G' ? W_G : W_B;
    tot += w;
    if (set.includes(r)) hit += w;
  }
  return tot ? hit / tot : 0;
}

// length-dependence (illustrative): nothing below 400 mm, full effect by 1000 mm
export function lengthFactor(L) {
  const u = Math.max(0, Math.min(1, (L - 400) / 600));
  return u * u * (3 - 2 * u);
}
const hash01 = (s) => {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return ((h >>> 0) % 1000) / 1000;
};

// For a lesion → per muscle: { motor fraction, site, lesion-to-muscle length, myopathy severity }
export function muscleInvolvement(lesion, sev, m) {
  const out = { fm: 0, site: 'plexus', lenMm: m.lenMm, myo: 0, mnd: false };
  switch (lesion) {
    case 'c7':
    case 'c8': {
      if (m.lower) break;
      const root = lesion === 'c7' ? 'C7' : 'C8';
      out.fm = m.paraspinal ? sev * (root in m.roots ? 1 : 0) : sev * rootShare(m.roots, [root]);
      out.site = 'rootPre';
      break;
    }
    case 'lowerTrunk':
      if (m.lower || m.paraspinal) break; // dorsal rami leave proximal to the plexus
      out.fm = sev * rootShare(m.roots, ['C8', 'T1']);
      out.lenMm = m.lenMm - 120;
      break;
    case 'medianWrist':
      if (m.handMedian) {
        out.fm = sev;
        out.site = 'distal';
        out.lenMm = 50;
      }
      break;
    case 'ulnarElbow':
      if (m.handUlnar) out.fm = sev;
      else if (m.id === 'fcu') out.fm = sev * 0.5; // branches near the elbow: variably involved (illustrative)
      out.site = 'forearm';
      out.lenMm = Math.max(60, m.lenMm - 450);
      break;
    case 'lengthDep':
      out.fm = sev * 0.7 * lengthFactor(m.lenMm); // motor less affected than sensory (illustrative)
      out.site = 'distal';
      out.lenMm = Math.max(60, m.lenMm * 0.3);
      break;
    case 'mnd':
      // patchy, widespread anterior-horn-cell loss (illustrative per-muscle variation)
      out.fm = sev * (0.45 + 0.55 * hash01(m.id));
      out.mnd = true;
      break;
    case 'myopathy':
      out.myo = sev * (m.proximal ? 1 : m.lower ? 0.45 : m.lenMm < 550 ? 0.6 : 0.3);
      break;
  }
  out.fm = Math.min(0.98, out.fm);
  return out;
}

// For a lesion → per nerve: { fm (motor), fs (sensory), sensory site (pre/post ganglionic) }
export function nerveInvolvement(lesion, sev, n) {
  const out = { fm: 0, fs: 0, site: 'plexus', sensSite: 'plexus' };
  if (n.kind === 'motor') {
    if (n.muscle) {
      const m = MUSCLES.find((x) => x.id === n.muscle);
      const mi = muscleInvolvement(lesion, sev, m);
      out.fm = mi.fm;
      out.site = mi.site;
      out.lenMm = mi.lenMm;
      out.mnd = mi.mnd;
      out.myo = mi.myo;
    } else if (lesion === 'lengthDep') {
      out.fm = sev * 0.7 * lengthFactor(n.lenMm);
      out.site = 'distal';
    } else if (lesion === 'mnd') {
      out.fm = sev * (0.45 + 0.55 * hash01(n.id));
      out.mnd = true;
    }
    return out;
  }
  switch (lesion) {
    case 'c7':
    case 'c8': {
      const root = lesion === 'c7' ? 'C7' : 'C8';
      // DRG cell bodies are intact: the lesion is preganglionic
      out.fs = n.dRoots.includes(root) ? sev * (1 / n.dRoots.length) : 0;
      out.sensSite = 'rootPre';
      break;
    }
    case 'lowerTrunk':
      out.fs = n.trunk === 'lower' ? sev : 0;
      break;
    case 'medianWrist':
      out.fs = n.median ? sev : 0;
      out.sensSite = 'distal';
      break;
    case 'ulnarElbow':
      out.fs = n.ulnar ? sev : 0;
      out.sensSite = 'forearm';
      break;
    case 'lengthDep':
      out.fs = sev * lengthFactor(n.lenMm);
      out.sensSite = 'distal';
      break;
    default:
      break;
  }
  out.fs = Math.min(0.98, out.fs);
  return out;
}
