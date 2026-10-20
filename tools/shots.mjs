// Dev helper: several screenshots in one browser session.
// Usage: node tools/shots.mjs <url> <outPrefix> <steps.json>  (steps: [{js, name, w?, h?, wait?}])
import fs from 'node:fs';
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const [url, prefix, stepsFile] = process.argv.slice(2);
const steps = JSON.parse(fs.readFileSync(stepsFile, 'utf8'));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 }, deviceScaleFactor: 1 });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(2000);
for (const s of steps) {
  if (s.w) await page.setViewportSize({ width: s.w, height: s.h || 1000 });
  if (s.js) { try { await page.evaluate(s.js); } catch (e) { errors.push(`[${s.name}] eval: ${e.message}`); } }
  await page.waitForTimeout(s.wait ?? 1500);
  if (s.name) await page.screenshot({ path: `${prefix}${s.name}.png`, fullPage: s.full ?? true });
}
console.log(errors.length ? errors.join('\n') : 'no console errors');
await browser.close();
