// Transport: play/pause, slow motion, single step, reset and a movable time cursor.
// Physiological time (ms of the simulated event) is shown separately from playback speed.

import { L, UI } from '../content/i18n.js';

const ICON = {
  play: '<svg viewBox="0 0 16 16"><path d="M4 2.5v11l9-5.5z" fill="currentColor"/></svg>',
  pause: '<svg viewBox="0 0 16 16"><path d="M4 2.5h3v11H4zM9 2.5h3v11H9z" fill="currentColor"/></svg>',
  step: '<svg viewBox="0 0 16 16"><path d="M3 2.5v11l7-5.5zM11 2.5h2v11h-2z" fill="currentColor"/></svg>',
  reset: '<svg viewBox="0 0 16 16"><path d="M3 2.5h2v11H3zM13 2.5v11L6 8z" fill="currentColor"/></svg>',
};

// playback speed = ms of physiological time per ms of wall-clock time
const SPEEDS = [0.0005, 0.001, 0.002, 0.005, 0.02, 0.1, 0.25, 1];

function speedLabel(s) {
  if (s >= 1) return L('实时 1×', 'real time 1×');
  const sec = 1 / (s * 1000);
  if (sec < 0.1) return L(`慢放 ${+(1 / s).toFixed(1)}×（1 s ≙ ${+(1 / s).toFixed(1)} s）`, `${+(1 / s).toFixed(1)}× slower (1 s ≙ ${+(1 / s).toFixed(1)} s)`);
  return L(`1 ms ≙ ${+sec.toFixed(2)} s`, `1 ms ≙ ${+sec.toFixed(2)} s`);
}

export function buildTransport(host, app) {
  host.innerHTML = '';
  const mk = (icon, title) => {
    const b = document.createElement('button');
    b.className = 'tbtn';
    b.innerHTML = icon;
    b.title = title;
    b.setAttribute('aria-label', title);
    host.appendChild(b);
    return b;
  };
  const bPlay = mk(ICON.play, L(UI.play));
  const bStep = mk(ICON.step, L(UI.step));
  const bReset = mk(ICON.reset, L(UI.reset));
  const sel = document.createElement('select');
  sel.title = L(UI.playback);
  SPEEDS.forEach((s) => {
    const o = document.createElement('option');
    o.value = s;
    o.textContent = speedLabel(s);
    sel.appendChild(o);
  });
  host.appendChild(sel);
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = 0;
  slider.max = 1000;
  slider.setAttribute('aria-label', L(UI.physTime));
  host.appendChild(slider);
  const clock = document.createElement('div');
  clock.className = 'clock';
  host.appendChild(clock);

  bPlay.onclick = () => {
    const w = app.window();
    if (!app.playing && app.t >= w.t1 - 1e-6) app.t = w.t0;
    app.playing = !app.playing;
    sync();
  };
  bStep.onclick = () => {
    app.playing = false;
    const w = app.window();
    app.t = Math.min(w.t1, app.t + w.step);
    sync();
    app.draw(true);
  };
  bReset.onclick = () => {
    app.playing = false;
    app.t = app.window().t0;
    sync();
    app.draw(true);
  };
  sel.onchange = () => {
    app.speed = +sel.value;
    app.speedTouched = true;
    sync();
  };
  slider.oninput = () => {
    const w = app.window();
    app.playing = false;
    app.t = w.t0 + (slider.value / 1000) * (w.t1 - w.t0);
    sync();
    app.draw(true);
  };
  window.addEventListener('keydown', (e) => {
    if (e.target && ['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
    if (e.code === 'Space') {
      e.preventDefault();
      bPlay.click();
    } else if (e.code === 'ArrowRight') bStep.click();
  });

  function sync() {
    const w = app.window();
    if (!app.speedTouched && w.defaultSpeed && app._lastWin !== w.key) {
      app.speed = w.defaultSpeed;
      app._lastWin = w.key;
    }
    bPlay.innerHTML = app.playing ? ICON.pause : ICON.play;
    [...sel.options].forEach((o) => (o.textContent = speedLabel(+o.value))); // language may have changed
    sel.title = L(UI.playback);
    sel.value = String(SPEEDS.reduce((a, b) => (Math.abs(b - app.speed) < Math.abs(a - app.speed) ? b : a)));
    slider.value = String(Math.round(((app.t - w.t0) / Math.max(1e-9, w.t1 - w.t0)) * 1000));
    const tt = app.t >= 1000 ? `${(app.t / 1000).toFixed(3)} s` : `${app.t.toFixed(2)} ms`;
    clock.innerHTML = `${L(UI.physTime)} <b>${tt}</b><br>${L(UI.playback)}: ${speedLabel(app.speed)}${w.clockNote ? ' · ' + w.clockNote : ''}`;
  }
  return { sync };
}
