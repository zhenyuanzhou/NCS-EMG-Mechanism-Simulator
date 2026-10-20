import { LESSONS } from './content/lessons.js';
// Entry point.
import { App } from './ui/app.js';
import { MODULES } from './ui/modules/index.js';

document.documentElement.lang = 'zh-CN';
const app = new App(MODULES);
window.__app = app; // for debugging and automated demos
window.__LESSONS = LESSONS;
app.start();
