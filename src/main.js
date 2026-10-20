import { LESSONS } from './content/lessons.js';
// Entry point.
import { App } from './ui/app.js';
import { MODULES } from './ui/modules/index.js';
import { getLang } from './content/i18n.js';

document.documentElement.lang = getLang() === 'en' ? 'en' : 'zh-CN';
const app = new App(MODULES);
window.__app = app; // for debugging and automated demos
window.__LESSONS = LESSONS;
app.start();
