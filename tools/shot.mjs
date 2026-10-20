// Dev helper: open the app in headless Chromium, collect console errors, save screenshots.
// Usage: node tools/shot.mjs <url> <out.png> [jsToRunBeforeShot] [width] [height]
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const [url, out, js = '', w = '1500', h = '1000'] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(2500);
if (js) { await page.evaluate(js); await page.waitForTimeout(2500); }
await page.screenshot({ path: out, fullPage: true });
console.log(errors.length ? errors.join('\n') : 'no console errors');
await browser.close();
