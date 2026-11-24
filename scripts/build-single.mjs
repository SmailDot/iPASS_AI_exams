// Packs the static site into ONE self-contained index.html (for assignments that require a single file).
// Same catalog, same SHA-256 asset checks; figures are embedded as data: URLs. No network needed at runtime.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const dist = path.join(root, 'dist');
const outDir = path.join(dist, 'single-file');
execFileSync(process.execPath, [path.join(root, 'scripts/build.mjs')], {stdio: 'inherit'});

const read = p => fs.readFileSync(path.join(dist, p), 'utf8');

// Order matters: a module may only import modules that were already bundled.
const modules = [
  ['data', 'src/data.js'],
  ['engine', 'src/engine.js'],
  ['storage', 'src/storage.js'],
  ['assets', 'src/assets.js'],
  ['app', 'src/app.js'],
];

const bundled = new Map();
let bundle = '';
for (const [name, file] of modules) {
  let src = read(file);
  // Imports become destructuring from already-bundled module objects.
  src = src.replace(/^import\s*\{([^}]*)\}\s*from\s*'\.\/(\w+)\.js';?$/gm, (_, names, dep) => {
    if (!bundled.has(dep)) throw new Error(`${file}: import of unbundled module ${dep}`);
    return `const {${names.trim()}} = __mod_${dep};`;
  });
  if (/^import\s/m.test(src)) throw new Error(`${file}: unsupported import form`);
  const exported = [...src.matchAll(/^export (?:async )?(?:function|const|let|class) (\w+)/gm)].map(m => m[1]);
  src = src.replace(/^export (async function|function|const|let|class) /gm, '$1 ');
  bundled.set(name, exported);
  const returns = exported.length ? `\n  return {${exported.join(', ')}};` : '';
  bundle += `// ---- ${file} ----\nconst __mod_${name} = (() => {\n${src}${returns}\n})();\n`;
}

const assetMap = {};
for (const f of fs.readdirSync(path.join(dist, 'assets'))) {
  if (!f.endsWith('.svg')) continue;
  assetMap[f] = 'data:image/svg+xml;base64,' + fs.readFileSync(path.join(dist, 'assets', f)).toString('base64');
}

let html = read('index.html');
const must = (cond, msg) => { if (!cond) throw new Error('single-file packing: ' + msg); };
const icon = 'data:image/svg+xml;base64,' + fs.readFileSync(path.join(dist, 'assets/icon.svg')).toString('base64');
const csp = /<meta http-equiv="Content-Security-Policy" content="([^"]*)">/;
must(csp.test(html), 'CSP meta not found');
html = html.replace(csp, (_, policy) => {
  const p = policy
    .replace("script-src 'self'", "script-src 'unsafe-inline'")
    .replace("connect-src 'self'", "connect-src 'self' data:");
  must(p.includes("script-src 'unsafe-inline'") && p.includes('data:'), 'CSP rewrite failed');
  return `<meta http-equiv="Content-Security-Policy" content="${p}">`;
});
const styles = read('styles.css');
const headReplacements = [
  ['<link rel="icon" href="./assets/icon.svg" type="image/svg+xml">', `<link rel="icon" href="${icon}" type="image/svg+xml">`],
  ['<link rel="manifest" href="./manifest.webmanifest">', ''],
  ['<link rel="stylesheet" href="./styles.css">', `<style>\n${styles}\n</style>`],
  ['<script src="./src/boot.js" defer></script>', `<script>\n${read('src/boot.js')}\n</script>`],
  ['<script type="module" src="./src/app.js"></script>',
   `<script>globalThis.__IPAS_EMBEDDED_ASSETS__=${JSON.stringify(assetMap)};</script>\n<script type="module">\n${bundle}</script>`],
];
for (const [from, to] of headReplacements) {
  must(html.includes(from), `missing ${from.slice(0, 40)}`);
  html = html.replace(from, () => to);
}
must(!/src="\.\/|href="\.\/(?!#)/.test(html), 'relative resource left in output');

fs.mkdirSync(outDir, {recursive: true});
fs.writeFileSync(path.join(outDir, 'index.html'), html);
console.log(`Built single-file: ${path.relative(root, path.join(outDir, 'index.html'))} (${html.length} bytes, modules: ${modules.map(m => m[0]).join(', ')})`);
