// Declarative control rendering. Every control writes one parameter path; modules decide
// which controls are visible, so only implemented, meaningful controls are shown.

import { L } from '../content/i18n.js';
import { getPath } from '../core/util.js';

export function renderControls(host, groups, params, onChange, changedPath) {
  groups.forEach((g) => {
    if (g.show && !g.show(params)) return;
    const gd = document.createElement('div');
    gd.className = 'ctl-group';
    if (g.title) gd.innerHTML = `<div class="gt">${L(g.title)}</div>`;
    if (g.html) {
      const d = document.createElement('div');
      d.className = 'help';
      d.innerHTML = L(g.html);
      gd.appendChild(d);
    }
    g.items.forEach((c) => {
      if (c.show && !c.show(params)) return;
      gd.appendChild(controlEl(c, params, onChange, changedPath));
    });
    host.appendChild(gd);
  });
}

function controlEl(c, params, onChange, changedPath) {
  const d = document.createElement('div');
  d.className = `ctl ${c.type === 'toggle' ? 'toggle' : ''} ${changedPath === c.path ? 'changed' : ''}`;
  d.dataset.path = c.path || '';
  const val = c.path ? getPath(params, c.path) : null;
  const fmtv = (v) => (c.fmt ? c.fmt(v) : v);
  if (c.type === 'range') {
    d.innerHTML = `<label class="lab"><span>${L(c.label)}</span><span class="val">${fmtv(val)}</span></label>`;
    const inp = document.createElement('input');
    inp.type = 'range';
    inp.min = c.min;
    inp.max = c.max;
    inp.step = c.step;
    inp.value = val;
    inp.setAttribute('aria-label', L(c.label));
    inp.oninput = () => {
      d.querySelector('.val').textContent = fmtv(+inp.value);
    };
    inp.onchange = () => onChange(c.path, +inp.value);
    d.appendChild(inp);
  } else if (c.type === 'steps') {
    // slider over a list of (non-linear) values, e.g. days since injury
    const idx = Math.max(0, c.values.findIndex((v) => v >= val));
    d.innerHTML = `<label class="lab"><span>${L(c.label)}</span><span class="val">${fmtv(val)}</span></label>`;
    const inp = document.createElement('input');
    inp.type = 'range';
    inp.min = 0;
    inp.max = c.values.length - 1;
    inp.step = 1;
    inp.value = idx;
    inp.setAttribute('aria-label', L(c.label));
    inp.oninput = () => {
      d.querySelector('.val').textContent = fmtv(c.values[+inp.value]);
    };
    inp.onchange = () => onChange(c.path, c.values[+inp.value]);
    d.appendChild(inp);
  } else if (c.type === 'select') {
    d.innerHTML = `<label class="lab"><span>${L(c.label)}</span></label>`;
    const s = document.createElement('select');
    c.options.forEach((o) => {
      const op = document.createElement('option');
      op.value = String(o.value);
      op.textContent = L(o.label);
      if (String(o.value) === String(val)) op.selected = true;
      s.appendChild(op);
    });
    s.onchange = () => {
      const o = c.options.find((x) => String(x.value) === s.value);
      onChange(c.path, o ? o.value : s.value);
    };
    d.appendChild(s);
  } else if (c.type === 'chips') {
    d.innerHTML = `<label class="lab"><span>${L(c.label)}</span></label>`;
    const w = document.createElement('div');
    w.className = 'chips';
    c.options.forEach((o) => {
      const b = document.createElement('button');
      b.textContent = L(o.label);
      b.className = String(o.value) === String(val) ? 'on' : '';
      b.onclick = () => onChange(c.path, o.value);
      w.appendChild(b);
    });
    d.appendChild(w);
  } else if (c.type === 'toggle') {
    const lab = document.createElement('label');
    lab.innerHTML = `<input type="checkbox" ${val ? 'checked' : ''}/> <span>${L(c.label)}</span>`;
    lab.querySelector('input').onchange = (e) => onChange(c.path, e.target.checked);
    d.appendChild(lab);
  } else if (c.type === 'info') {
    d.innerHTML = `<div class="help">${typeof c.text === 'function' ? c.text(params) : L(c.text)}</div>`;
  }
  if (c.help) {
    const h = document.createElement('div');
    h.className = 'help';
    h.innerHTML = L(c.help);
    d.appendChild(h);
  }
  return d;
}

export function flashControl(host, path) {
  const el = host.querySelector(`[data-path="${path}"]`);
  if (!el) return;
  el.classList.remove('flash');
  void el.offsetWidth;
  el.classList.add('flash');
  el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}
