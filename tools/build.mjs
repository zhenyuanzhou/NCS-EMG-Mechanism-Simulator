// Dependency-free bundler: turns src/ (ES modules) into ONE self-contained HTML file
// (dist/index.html) that opens by double-click (file://) and can be shared as-is.
// Usage: node tools/build.mjs
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const root = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'src');
const entry = path.join(src, 'main.js');

const order = [];
const seen = new Set();
const IMPORT_RE = /import\s+([\s\S]*?)\s+from\s+['"](\.[^'"]+)['"];?/g;

function visit(file) {
  if (seen.has(file)) return;
  seen.add(file);
  const code = fs.readFileSync(file, 'utf8');
  for (const m of code.matchAll(IMPORT_RE)) visit(path.resolve(path.dirname(file), m[2]));
  order.push(file);
}
visit(entry);

const id = (file) => path.relative(src, file).replace(/\\/g, '/');

function transform(file) {
  let code = fs.readFileSync(file, 'utf8');
  const exportsList = [];
  code = code.replace(IMPORT_RE, (all, spec, rel) => {
    const dep = JSON.stringify(id(path.resolve(path.dirname(file), rel)));
    spec = spec.trim();
    if (spec.startsWith('* as ')) return `const ${spec.slice(5).trim()} = __m[${dep}];`;
    if (spec.startsWith('{')) {
      const inner = spec
        .replace(/[{}]/g, '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => (s.includes(' as ') ? s.replace(/\s+as\s+/, ': ') : s))
        .join(', ');
      return `const { ${inner} } = __m[${dep}];`;
    }
    // default import (optionally followed by named imports)
    const [def, rest] = spec.split(/,(.+)/);
    let out = `const ${def.trim()} = __m[${dep}].default;`;
    if (rest) out += ` const ${rest.trim().replace(/\s+as\s+/g, ': ')} = __m[${dep}];`;
    return out;
  });
  code = code.replace(/export\s+default\s+/g, () => {
    exportsList.push('default: __default');
    return 'const __default = ';
  });
  code = code.replace(/export\s+(async\s+function|function|class|const|let|var)\s+([A-Za-z_$][\w$]*)/g, (all, kw, name) => {
    exportsList.push(name);
    return `${kw} ${name}`;
  });
  code = code.replace(/export\s*\{([^}]*)\};?/g, (all, names) => {
    names
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((n) => exportsList.push(n.includes(' as ') ? `${n.split(/\s+as\s+/)[1]}: ${n.split(/\s+as\s+/)[0]}` : n));
    return '';
  });
  if (/\bexport\b\s/.test(code.replace(/\/\/.*$/gm, ''))) {
    const line = code.split('\n').find((l) => /^\s*export\s/.test(l));
    if (line) throw new Error(`Unhandled export form in ${id(file)}: ${line}`);
  }
  // getters keep "export let" bindings live for importers that read them after a setter call
  const lets = [...fs.readFileSync(file, 'utf8').matchAll(/export\s+let\s+([A-Za-z_$][\w$]*)/g)].map((m) => m[1]);
  const props = exportsList.map((e) => (lets.includes(e) ? `get ${e}() { return ${e}; }` : e)).join(',\n    ');
  return `__m[${JSON.stringify(id(file))}] = (function () {\n${code}\n  return {\n    ${props}\n  };\n})();\n`;
}

let bundle = '"use strict";\nconst __m = {};\n';
for (const f of order) bundle += `\n// ===== ${id(f)} =====\n` + transform(f);

const css = fs.readFileSync(path.join(src, 'styles.css'), 'utf8');
let html = fs.readFileSync(path.join(src, 'index.html'), 'utf8');
html = html.replace(/<link rel="stylesheet" href="\.\/styles\.css" \/>/, `<style>\n${css}\n</style>`);
html = html.replace(/<script type="module" src="\.\/main\.js"><\/script>/, () => `<script>\n${bundle.replace(/<\/script>/g, '<\\/script>')}\n</script>`);
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
html = html.replace('<head>', `<head>\n<!-- ${pkg.name} v${pkg.version} · built ${new Date().toISOString()} · single-file bundle of src/ -->`);
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist', 'index.html'), html);
console.log(`dist/index.html written: ${(html.length / 1024).toFixed(0)} KB, ${order.length} modules`);

// Variant for hosting as a claude.ai artifact: the host supplies the document skeleton.
let art = html
  .replace(/<!doctype html>\s*/i, '')
  .replace(/<html[^>]*>\s*/i, '')
  .replace(/<\/html>\s*/i, '')
  .replace(/<head>\s*/i, '')
  .replace(/<\/head>\s*/i, '')
  .replace(/<body>\s*/i, '')
  .replace(/<\/body>\s*/i, '')
  .replace(/<meta charset="utf-8" \/>\s*/i, '')
  .replace(/<meta name="viewport"[^>]*>\s*/i, '');
const titleTag = art.match(/<title>[\s\S]*?<\/title>/)[0];
art = art.replace(titleTag, '');
art = `${titleTag}\n<meta name="claude:viewport-fit-sides" content="cover">\n` + art;
fs.writeFileSync(path.join(root, 'dist', 'artifact.html'), art);
console.log('dist/artifact.html written (skeleton-free variant for artifact hosting)');
