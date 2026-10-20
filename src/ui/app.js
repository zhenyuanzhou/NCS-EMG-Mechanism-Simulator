// Application host: modules, controls, synchronized anatomy / waveform / explanation panels,
// transport (physiological time vs playback speed), comparison and "why did this change".

import { L, UI, getLang, setLang } from '../content/i18n.js';
import { fitCanvas, theme } from '../render/theme.js';
import { drawScope } from '../render/scope.js';
import { renderControls, flashControl } from './controls.js';
import { buildTransport } from './transport.js';
import { PARAM_TABLE } from '../core/params.js';
import { fmt, setPath } from '../core/util.js';
import { LESSONS } from '../content/lessons.js';
import { playSignal, stopAudio, audioSupported } from './audio.js';

export class App {
  constructor(modules) {
    this.modules = modules;
    this.mode = 'explore';
    this.moduleId = modules[0].id;
    this.params = {};
    this.prev = {};
    this.results = {};
    this.ui = {};
    this.t = 0;
    this.playing = false;
    this.speed = 0.002;
    this.gainMul = 1;
    this.sweepOverride = null;
    this.overlayNormal = true;
    this.showContrib = false;
    this.lesson = null;
    this.compareSel = {};
    modules.forEach((m) => {
      this.params[m.id] = m.defaults();
      this.ui[m.id] = { scale: m.scales[0], highlight: null };
    });
    try {
      const saved = JSON.parse(localStorage.getItem('emgsim.ui') || '{}');
      if (saved.moduleId && modules.find((m) => m.id === saved.moduleId)) this.moduleId = saved.moduleId;
    } catch (e) {
      /* ignore */
    }
    this.el = (id) => document.getElementById(id);
    this.anatCanvas = this.el('anatomy-canvas');
    this.scopeCanvas = this.el('scope-canvas');
    this.anatHits = [];
    this.scopeGeom = null;
    this.computing = false;
  }

  get mod() {
    return this.modules.find((m) => m.id === this.moduleId);
  }
  get p() {
    return this.params[this.moduleId];
  }
  get res() {
    return this.results[this.moduleId];
  }

  start() {
    this.buildHeader();
    this.buildNav();
    this.transport = buildTransport(this.el('transport'), this);
    this.anatCanvas.addEventListener('click', (e) => this.onAnatClick(e));
    this.anatCanvas.addEventListener('mousemove', (e) => this.onAnatMove(e));
    this.scopeCanvas.addEventListener('click', (e) => this.onScopeClick(e));
    this.el('btn-model').addEventListener('click', () => this.showModel());
    this.el('modal-close').addEventListener('click', () => this.el('modal').classList.remove('on'));
    this.el('modal').addEventListener('click', (e) => {
      if (e.target.id === 'modal') this.el('modal').classList.remove('on');
    });
    window.addEventListener('resize', () => this.draw());
    if (window.matchMedia) window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => this.draw());
    this.selectModule(this.moduleId);
    let last = performance.now();
    const loop = (now) => {
      const dt = now - last;
      last = now;
      if (this.playing && this.res) {
        const win = this.window();
        this.t += dt * this.speed;
        if (this.t > win.t1) this.t = win.t0;
        this.transport.sync();
        this.draw(true);
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  buildHeader() {
    const modeSeg = this.el('mode-seg');
    modeSeg.innerHTML = '';
    ['guided', 'explore', 'compare'].forEach((k) => {
      const b = document.createElement('button');
      b.textContent = L(UI.modes[k]);
      b.className = this.mode === k ? 'on' : '';
      b.onclick = () => this.setMode(k);
      if (k === 'compare' && this.mod && !this.mod.comparePresets) {
        b.disabled = true;
        b.title = L('本模块没有机制比较；请在 NCS、针极 EMG、自发电位或 NMJ 模块中使用', 'No comparison in this module; use it in NCS, needle EMG, spontaneous activity or NMJ');
      }
      modeSeg.appendChild(b);
    });
    const langSeg = this.el('lang-seg');
    langSeg.innerHTML = '';
    [
      ['zh', '中文'],
      ['en', 'EN'],
    ].forEach(([k, t]) => {
      const b = document.createElement('button');
      b.textContent = t;
      b.className = getLang() === k ? 'on' : '';
      b.onclick = () => {
        setLang(k);
        document.documentElement.lang = k === 'en' ? 'en' : 'zh-CN';
        this.buildHeader();
        this.buildNav();
        this.renderAll();
      };
      langSeg.appendChild(b);
    });
    this.el('app-title').textContent = L(UI.title);
    this.el('app-sub').textContent = L(UI.sub);
    this.el('btn-model').textContent = L(UI.model);
    this.el('anat-title').textContent = L(UI.anatomy);
    this.el('scope-title').textContent = L(UI.waveform);
  }

  buildNav() {
    const nav = this.el('module-nav');
    nav.innerHTML = '';
    this.modules.forEach((m) => {
      const b = document.createElement('button');
      b.innerHTML = `${L(m.title)}<span class="ph">${m.phase ? 'P' + m.phase : ''}</span>`;
      b.className = m.id === this.moduleId ? 'on' : '';
      b.onclick = () => this.selectModule(m.id);
      nav.appendChild(b);
    });
  }

  setMode(k) {
    this.mode = k;
    if (k === 'guided' && !this.lesson) this.startLesson(LESSONS.find((l) => l.module === this.moduleId) || LESSONS[0]);
    if (k !== 'guided') this.lesson = null;
    this.buildHeader();
    this.recompute(true);
  }

  selectModule(id) {
    this.moduleId = id;
    try {
      localStorage.setItem('emgsim.ui', JSON.stringify({ moduleId: id }));
    } catch (e) {
      /* ignore */
    }
    this.sweepOverride = null;
    this.gainMul = 1;
    this.soundOn = false;
    stopAudio();
    if (this.mode === 'compare' && !this.mod.comparePresets) this.mode = 'explore';
    this.buildHeader();
    this.buildNav();
    this.recompute(true);
  }

  // ---- state changes -------------------------------------------------------------
  setParam(path, value, { fromLesson = false } = {}) {
    const p = this.p;
    this.prev[this.moduleId] = { params: JSON.parse(JSON.stringify(p)), result: this.res, changed: path };
    setPath(p, path, value);
    if (this.mod.onParam) this.mod.onParam(p, path, value);
    this.recompute();
    if (!fromLesson && this.lesson) this.lesson.dirty = true;
  }

  setParams(newParams, changedKey = null) {
    this.prev[this.moduleId] = { params: JSON.parse(JSON.stringify(this.p)), result: this.res, changed: changedKey };
    this.params[this.moduleId] = newParams;
    this.recompute();
  }

  recompute(resetTime = false) {
    const mod = this.mod;
    this.computing = true;
    this.el('scope-title').textContent = `${L(UI.waveform)} · ${L('计算中…', 'computing…')}`;
    clearTimeout(this._rc);
    this._rc = setTimeout(() => {
      try {
        if (this.mode === 'compare' && mod.comparePresets) {
          const presets = mod.comparePresets();
          const sel = this.compareSel[mod.id] || presets.slice(0, 3).map((p) => p.key);
          this.compareSel[mod.id] = sel;
          this.compareResults = sel.map((k) => {
            const pr = presets.find((x) => x.key === k);
            return { preset: pr, result: mod.compute(pr.params(this.p)) };
          });
        }
        this.results[mod.id] = mod.compute(this.p);
      } catch (e) {
        console.error(e);
      }
      this.computing = false;
      this.el('scope-title').textContent = L(UI.waveform);
      const win = this.window();
      const keyChanged = win.key !== undefined && win.key !== this.lastWinKey;
      this.lastWinKey = win.key;
      if (resetTime || keyChanged || this.t < win.t0 || this.t > win.t1) this.t = win.tInit ?? win.t1;
      this.renderAll();
    }, 15);
  }

  window() {
    const r = this.res;
    if (this.mode === 'compare' && this.mod.compareWindow && this.compareResults) return this.mod.compareWindow(this.compareResults, this.p);
    if (!r || !this.mod.timeWindow) return { t0: 0, t1: 30, step: 0.1, defaultSpeed: 0.002 };
    return this.mod.timeWindow(r, this.p);
  }

  // ---- rendering --------------------------------------------------------------------
  renderAll() {
    if (this.soundOn) this.updateSound();
    const ah = this.mod.anatHeight;
    this.anatCanvas.style.height = ah ? `${window.innerWidth < 700 ? ah.mobile : ah.desktop}px` : '';
    this.renderControls();
    this.renderScaleTabs();
    this.renderScopeTools();
    this.transport.sync();
    this.draw();
    this.renderExplain();
  }

  renderControls() {
    const host = this.el('controls');
    const mod = this.mod;
    host.innerHTML = '';
    if (this.mode === 'guided' && this.lesson) {
      host.appendChild(this.lessonCard());
    }
    if (this.mode === 'compare' && mod.comparePresets) {
      const g = document.createElement('div');
      g.className = 'ctl-group';
      g.innerHTML = `<div class="gt">${L('比较的机制（最多 3 个）', 'Mechanisms to compare (up to 3)')}</div>`;
      const chips = document.createElement('div');
      chips.className = 'ctl';
      const cw = document.createElement('div');
      cw.className = 'chips';
      const presets = mod.comparePresets();
      const sel = this.compareSel[mod.id] || presets.slice(0, 3).map((p) => p.key);
      presets.forEach((pr) => {
        const b = document.createElement('button');
        b.textContent = L(pr.label);
        b.className = sel.includes(pr.key) ? 'on' : '';
        b.onclick = () => {
          let s = this.compareSel[mod.id] || [];
          if (s.includes(pr.key)) s = s.filter((k) => k !== pr.key);
          else s = [...s, pr.key].slice(-3);
          if (!s.length) s = [pr.key];
          this.compareSel[mod.id] = s;
          this.recompute();
        };
        cw.appendChild(b);
      });
      chips.appendChild(cw);
      const help = document.createElement('div');
      help.className = 'help';
      help.textContent = L('每个机制使用同一受试者、同一随机种子，只改变病理参数。', 'Each mechanism uses the same subject and seed; only the pathology differs.');
      chips.appendChild(help);
      g.appendChild(chips);
      host.appendChild(g);
    }
    const groups = mod.controls(this.p, this.res).filter((g) => !(this.mode === 'compare' && mod.comparePresets && g.pathology));
    renderControls(host, groups, this.p, (path, v) => this.setParam(path, v), this.prev[mod.id]?.changed);
  }

  renderScaleTabs() {
    const seg = this.el('scale-seg');
    seg.innerHTML = '';
    const ui = this.ui[this.moduleId];
    this.mod.scales.forEach((s) => {
      const b = document.createElement('button');
      b.textContent = L(UI.scales[s]);
      b.className = ui.scale === s ? 'on' : '';
      b.onclick = () => {
        ui.scale = s;
        this.renderScaleTabs();
        this.draw();
      };
      seg.appendChild(b);
    });
  }

  updateSound() {
    if (!this.soundOn || !this.mod.audio || !this.res) {
      stopAudio();
      return;
    }
    try {
      playSignal(this.mod.audio(this.res, this.p));
    } catch (e) {
      console.error(e);
    }
  }

  renderScopeTools() {
    const host = this.el('scope-tools');
    host.innerHTML = '';
    const gl = document.createElement('label');
    gl.innerHTML = `${L(UI.gain)} `;
    const gs = document.createElement('select');
    [0.25, 0.5, 1, 2, 4, 10].forEach((g) => {
      const o = document.createElement('option');
      o.value = g;
      o.textContent = g === 1 ? `×1 (${L(UI.auto)})` : `×${1 / g >= 1 ? '1/' + 1 / g : g}`.replace('×1/1', '×1');
      o.textContent = g === 1 ? `${L('标准', 'default')}` : g < 1 ? `${L('灵敏度', 'sens.')} ×${1 / g}` : `${L('灵敏度', 'sens.')} ÷${g}`;
      if (g === this.gainMul) o.selected = true;
      gs.appendChild(o);
    });
    gs.onchange = () => {
      this.gainMul = +gs.value;
      this.draw();
    };
    gl.appendChild(gs);
    host.appendChild(gl);
    const sw = this.mod.sweeps ? this.mod.sweeps(this.p) : null;
    if (sw) {
      const sl = document.createElement('label');
      sl.innerHTML = `${L(UI.sweep)} `;
      const ss = document.createElement('select');
      const o0 = document.createElement('option');
      o0.value = '';
      o0.textContent = L(UI.auto);
      ss.appendChild(o0);
      sw.forEach((v) => {
        const o = document.createElement('option');
        o.value = v;
        o.textContent = `${v} ms/div`;
        if (this.sweepOverride === v) o.selected = true;
        ss.appendChild(o);
      });
      ss.onchange = () => {
        this.sweepOverride = ss.value === '' ? null : +ss.value;
        this.transport.sync();
        this.draw();
      };
      sl.appendChild(ss);
      host.appendChild(sl);
    }
    if (this.mod.audio && audioSupported()) {
      const sb = document.createElement('button');
      sb.className = 'btn small' + (this.soundOn ? ' primary' : '');
      sb.title = L('播放与示波器相同的合成信号（20 kHz，原始速度与音高，仅音量归一化）', 'Plays the same synthesized signal as the scope (20 kHz, original speed and pitch; only volume normalised)');
      sb.textContent = this.soundOn ? L('🔊 声音：开', '🔊 Sound: on') : L('🔇 声音：关', '🔇 Sound: off');
      sb.onclick = () => {
        this.soundOn = !this.soundOn;
        this.updateSound();
        this.renderScopeTools();
      };
      host.appendChild(sb);
    }
    if (this.mode !== 'compare' && !this.mod.noOverlay) {
      const ov = document.createElement('label');
      ov.innerHTML = `<input type="checkbox" ${this.overlayNormal ? 'checked' : ''}/> ${L(UI.overlayNormal)}`;
      ov.querySelector('input').onchange = (e) => {
        this.overlayNormal = e.target.checked;
        this.draw();
      };
      host.appendChild(ov);
    }
    if (this.mod.hasContributions) {
      const cb = document.createElement('label');
      cb.innerHTML = `<input type="checkbox" ${this.showContrib ? 'checked' : ''}/> ${L(UI.contributions)}`;
      cb.querySelector('input').onchange = (e) => {
        this.showContrib = e.target.checked;
        this.draw();
      };
      host.appendChild(cb);
    }
  }

  viewOpts() {
    return {
      t: this.t,
      lang: getLang(),
      scale: this.ui[this.moduleId].scale,
      highlight: this.ui[this.moduleId].highlight,
      overlayNormal: this.overlayNormal,
      showContrib: this.showContrib,
      mode: this.mode,
      compare: this.mode === 'compare' ? this.compareResults : null,
      playing: this.playing,
    };
  }

  draw(animOnly = false) {
    const mod = this.mod;
    const res = this.res;
    if (!res) return;
    const vo = this.viewOpts();
    // anatomy
    const a = fitCanvas(this.anatCanvas);
    try {
      const out = mod.drawAnatomy(a.ctx, a.w, a.h, res, this.p, vo) || {};
      this.anatHits = out.hits || [];
      this.anatInfo = out;
      if (!animOnly) this.el('anat-legend').innerHTML = out.legend || '';
    } catch (e) {
      console.error(e);
    }
    // scope
    const s = fitCanvas(this.scopeCanvas);
    let spec;
    try {
      spec = this.mode === 'compare' && mod.compareScope && this.compareResults ? mod.compareScope(this.compareResults, this.p, vo) : mod.scope(res, this.p, vo);
    } catch (e) {
      console.error(e);
      return;
    }
    const rows = spec.rows.map((r) => ({ ...r, gain: r.gain * this.gainMul }));
    const win = this.window();
    const sweep = this.sweepOverride || spec.sweep;
    this.scopeGeom = drawScope(s.ctx, s.w, s.h, {
      footer: L('负相向上 ↑', 'negative up ↑'),
      ...spec,
      rows,
      sweep,
      cursor: this.t,
      drawUntil: spec.progressive === false ? null : this.t,
    });
    if (!animOnly) this.el('scope-legend').innerHTML = spec.legend || '';
    if (animOnly && mod.liveExplain) this.renderExplain();
  }

  renderExplain() {
    const host = this.el('explain');
    const mod = this.mod;
    const res = this.res;
    if (!res) return;
    let ex;
    try {
      ex = this.mode === 'compare' && mod.compareExplain && this.compareResults ? mod.compareExplain(this.compareResults, this.p) : mod.explain(res, this.p, this.viewOpts());
    } catch (e) {
      console.error(e);
      return;
    }
    const chainNames = L(UI.chain);
    let html = '';
    if (ex.chain) {
      html += `<div class="panel-head"><h3>${L('因果链', 'Causal chain')}</h3></div><ol class="chain">`;
      ex.chain.forEach((c, i) => {
        html += `<li><b class="k">${chainNames[i]}</b>${c}</li>`;
      });
      html += '</ol>';
    }
    if (ex.measures) {
      html += `<div class="panel-head"><h3>${L(UI.measures)}</h3></div><div class="compare-table">${measureTable(ex.measures, this.prev[this.moduleId])}</div>`;
    }
    if (ex.caveat) html += `<div class="box caveat"><h4>${L(UI.caveat)}</h4>${ex.caveat}</div>`;
    html += `<div class="pad"><button class="btn" id="btn-why">${L(UI.why)}</button></div><div id="why-out"></div>`;
    if (ex.notes) html += `<div class="box note">${ex.notes}</div>`;
    if (ex.sources) html += `<div class="pad src">${ex.sources}</div>`;
    host.innerHTML = html;
    const btn = host.querySelector('#btn-why');
    btn.onclick = () => {
      const prev = this.prev[this.moduleId];
      const out = host.querySelector('#why-out');
      if (!prev || !prev.result) {
        out.innerHTML = `<div class="box why">${L(UI.whyNone)}</div>`;
        return;
      }
      out.innerHTML = `<div class="box why"><h4>${L(UI.why)}</h4>${mod.why(prev, { params: this.p, result: res }, getLang())}</div>`;
    };
  }

  // ---- interaction ------------------------------------------------------------------
  onAnatClick(e) {
    const r = this.anatCanvas.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    const mod = this.mod;
    const hit = this.anatHits.find((h) => Math.hypot(h.x - x, h.y - y) <= h.r);
    if (mod.onAnatomyClick) {
      const np = mod.onAnatomyClick({ x, y, hit, info: this.anatInfo }, JSON.parse(JSON.stringify(this.p)), this);
      if (np) this.setParams(np, hit ? hit.kind : 'anatomy');
    }
  }

  onAnatMove(e) {
    const r = this.anatCanvas.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    const hit = this.anatHits.find((h) => Math.hypot(h.x - x, h.y - y) <= h.r);
    this.anatCanvas.style.cursor = hit || this.mod.anatomyClickable ? 'pointer' : 'default';
  }

  onScopeClick(e) {
    if (!this.scopeGeom) return;
    const r = this.scopeCanvas.getBoundingClientRect();
    const t = this.scopeGeom.tOfX(e.clientX - r.left);
    const win = this.window();
    this.t = Math.max(win.t0, Math.min(win.t1, t));
    this.transport.sync();
    this.draw(true);
  }

  // ---- guided lessons ------------------------------------------------------------------
  startLesson(lesson) {
    if (!lesson) return;
    this.lesson = { def: lesson, step: 0 };
    if (lesson.module !== this.moduleId) this.moduleId = lesson.module;
    this.applyLessonStep();
    this.buildNav();
  }

  applyLessonStep() {
    const { def, step } = this.lesson;
    const st = def.steps[step];
    const mod = this.modules.find((m) => m.id === def.module);
    const base = mod.defaults();
    const prevParams = step > 0 ? st.from || def.steps[step - 1].params(base) : null;
    if (prevParams) {
      this.params[def.module] = JSON.parse(JSON.stringify(prevParams));
      this.results[def.module] = mod.compute(this.params[def.module]);
      this.prev[def.module] = { params: JSON.parse(JSON.stringify(prevParams)), result: this.results[def.module], changed: st.change };
    } else {
      this.prev[def.module] = null;
    }
    this.params[def.module] = st.params(base);
    if (st.scale) this.ui[def.module].scale = st.scale;
    this.recompute(true);
    setTimeout(() => st.change && flashControl(this.el('controls'), st.change), 120);
  }

  lessonCard() {
    const d = document.createElement('div');
    d.className = 'ctl-group';
    const { def, step } = this.lesson;
    const st = def.steps[step];
    const list = LESSONS.map((l) => `<option value="${l.id}" ${l.id === def.id ? 'selected' : ''}>${L(l.title)}</option>`).join('');
    d.innerHTML = `<div class="gt">${L('引导课程', 'Guided lesson')}</div>
      <div class="ctl"><select id="lesson-sel">${list}</select></div>
      <div class="box lesson" style="margin:6px 0"><h4>${L(st.title)}</h4>${L(st.text)}
      ${st.look ? `<p><b>${L('观察：', 'Look at: ')}</b>${L(st.look)}</p>` : ''}</div>
      <div class="lesson-steps">${def.steps.map((_, i) => `<span class="${i <= step ? 'on' : ''}"></span>`).join('')}</div>
      <div style="display:flex;gap:6px;margin-top:8px">
        <button class="btn small" id="l-prev" ${step === 0 ? 'disabled' : ''}>← ${L('上一步', 'Back')}</button>
        <button class="btn small primary" id="l-next">${step === def.steps.length - 1 ? L('完成', 'Finish') : L('下一步', 'Next')} →</button>
      </div>`;
    setTimeout(() => {
      d.querySelector('#lesson-sel').onchange = (e) => this.startLesson(LESSONS.find((l) => l.id === e.target.value));
      d.querySelector('#l-prev').onclick = () => {
        this.lesson.step = Math.max(0, step - 1);
        this.applyLessonStep();
      };
      d.querySelector('#l-next').onclick = () => {
        if (step >= def.steps.length - 1) {
          const idx = LESSONS.indexOf(def);
          this.startLesson(LESSONS[(idx + 1) % LESSONS.length]);
          return;
        }
        this.lesson.step = step + 1;
        this.applyLessonStep();
      };
    });
    return d;
  }

  // ---- model & sources modal -----------------------------------------------------------
  showModel() {
    const body = this.el('modal-body');
    this.el('modal-title').textContent = L(UI.model);
    const tagName = { textbook: L('教科书', 'textbook'), derived: L('推导', 'derived'), literature: L('文献模型', 'literature'), illustrative: L('示意参数', 'illustrative') };
    let html = `<p>${L(
      '所有驱动模拟的数值都在此列出并标明来源类型。<b>教科书</b>：Preston &amp; Shapiro《Electromyography and Neuromuscular Disorders》第4版给出的数值（印刷页码；PDF页 = 印刷页 + 11）。<b>推导</b>：由教科书锚点插值或计算。<b>文献模型</b>：教科书以外的标准建模约定。<b>示意参数</b>：为教学模型选择的数值，<u>不是临床诊断标准</u>。',
      'Every number that drives the simulation is listed here with its provenance. <b>Textbook</b>: value stated in Preston &amp; Shapiro, Electromyography and Neuromuscular Disorders, 4th ed. (printed page; PDF page = printed + 11). <b>Derived</b>: interpolated/computed from textbook anchors. <b>Literature</b>: standard modelling convention outside the textbook. <b>Illustrative</b>: chosen for the teaching model — <u>not a clinical criterion</u>.'
    )}</p>`;
    html += `<table class="params"><thead><tr><th>${L('参数', 'Parameter')}</th><th>${L('值', 'Value')}</th><th>${L('类型', 'Type')}</th><th>${L('来源', 'Source')}</th><th>${L('说明', 'Note')}</th></tr></thead><tbody>`;
    for (const p of PARAM_TABLE) {
      const v = Array.isArray(p.value) ? p.value.join('–') : p.value;
      html += `<tr><td>${getLang() === 'en' ? p.en : p.zh}<div class="src">${p.key}</div></td><td>${v} ${p.unit || ''}</td><td><span class="tag ${p.status}">${tagName[p.status]}</span></td><td>${p.src}</td><td>${p.note || ''}</td></tr>`;
    }
    html += '</tbody></table>';
    html += this.mod.modelNotes ? `<h3>${L('本模块的建模说明', 'Modelling notes for this module')}</h3>${this.mod.modelNotes()}` : '';
    body.innerHTML = html;
    this.el('modal').classList.add('on');
  }
}


// measures: { cols:[label…], rows:[{label, vals:[…], unit, digits, flag:[…], key, hl}] }
function measureTable(m, prev) {
  let h = '<table class="meas"><thead><tr><th></th>';
  m.cols.forEach((c) => (h += `<th>${c}</th>`));
  h += '</tr></thead><tbody>';
  m.rows.forEach((r) => {
    h += `<tr class="${r.hl ? 'hl' : ''}"><td>${r.label}${r.unit ? ` <span class="muted">(${r.unit})</span>` : ''}</td>`;
    r.vals.forEach((v, i) => {
      const fl = r.flag ? r.flag[i] : '';
      const txt = typeof v === 'string' ? v : fmt(v, r.digits ?? 1);
      h += `<td class="${fl ? 'flag-' + fl : ''}">${txt}</td>`;
    });
    h += '</tr>';
  });
  h += '</tbody></table>';
  if (m.note) h += `<div class="src" style="margin-top:4px">${m.note}</div>`;
  return h;
}
