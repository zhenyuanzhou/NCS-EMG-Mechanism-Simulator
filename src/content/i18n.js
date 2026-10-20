// Language handling. Default: Chinese explanations with English technical terms.
let lang = 'zh';
try {
  const saved = localStorage.getItem('emgsim.lang');
  if (saved === 'en' || saved === 'zh') lang = saved;
} catch (e) {
  /* storage unavailable */
}

export function getLang() {
  return lang;
}
export function setLang(l) {
  lang = l;
  try {
    localStorage.setItem('emgsim.lang', l);
  } catch (e) {
    /* ignore */
  }
}
// L('中文', 'English') or L({zh, en})
export function L(zh, en) {
  if (zh && typeof zh === 'object') return lang === 'en' ? zh.en : zh.zh;
  return lang === 'en' ? en ?? zh : zh;
}

export const UI = {
  title: { zh: '神经传导与肌电图机制模拟器', en: 'NCS & EMG Mechanism Simulator' },
  sub: { zh: 'NCS · 针极 EMG · RNS · SFEMG —— 从病变到波形', en: 'From lesion to waveform — NCS · needle EMG · RNS · SFEMG' },
  modes: {
    guided: { zh: '引导讲解', en: 'Guided' },
    explore: { zh: '自由探索', en: 'Explore' },
    compare: { zh: '机制比较', en: 'Compare' },
  },
  model: { zh: '模型与来源', en: 'Model & sources' },
  anatomy: { zh: '解剖与机制', en: 'Anatomy & mechanism' },
  waveform: { zh: '记录波形', en: 'Recorded waveform' },
  scales: { macro: { zh: '宏观', en: 'Macro' }, meso: { zh: '中观', en: 'Meso' }, micro: { zh: '微观', en: 'Micro' } },
  chain: {
    zh: ['解剖病变', '生理改变', '电源与传播', '记录波形', '临床解读'],
    en: ['Anatomical lesion', 'Physiological change', 'Electrical sources & propagation', 'Recorded waveform', 'Clinical interpretation'],
  },
  measures: { zh: '测量（由生成信号计算）', en: 'Measurements (computed from the generated signal)' },
  caveat: { zh: '解读注意', en: 'Interpretation caveat' },
  why: { zh: '为什么会改变？', en: 'Why did this change?' },
  whyNone: { zh: '请先调整一个参数，再点此按钮。', en: 'Change one parameter first, then press this button.' },
  normal: { zh: '正常', en: 'Normal' },
  current: { zh: '当前', en: 'Current' },
  change: { zh: '变化', en: 'Change' },
  play: { zh: '播放/暂停', en: 'Play/pause' },
  step: { zh: '单步', en: 'Step' },
  reset: { zh: '重置', en: 'Reset' },
  physTime: { zh: '生理时间', en: 'Physiological time' },
  playback: { zh: '播放速度', en: 'Playback' },
  overlayNormal: { zh: '叠加正常', en: 'Overlay normal' },
  contributions: { zh: '显示单个成分', en: 'Show contributions' },
  gain: { zh: '增益', en: 'Gain' },
  sweep: { zh: '扫描', en: 'Sweep' },
  auto: { zh: '自动', en: 'auto' },
  close: { zh: '关闭', en: 'Close' },
};
