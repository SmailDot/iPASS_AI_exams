"""Build a ready-to-run local ZIP from an already tested dist. Standard library only."""
from pathlib import Path
import hashlib
import json
import zipfile
ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / 'dist'
if not (DIST / 'index.html').is_file():
    raise SystemExit('Run npm run build first.')
files = sorted(p for p in DIST.rglob('*') if p.is_file())
if any(p.is_symlink() for p in DIST.rglob('*')):
    raise SystemExit('Refusing symlinked runtime files.')
manifest = {'format': 1, 'localVersion': '0.1.1', 'files': {
    p.relative_to(ROOT).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest() for p in files
}}
extras = ['Start_Local.cmd','package.json','scripts/serve.mjs','scripts/local-server.mjs','docs/LOCAL_TESTING.md']
for name in extras:
    if not (ROOT / name).is_file():
        raise SystemExit('Missing packaging input: ' + name)
out = ROOT / 'release' / 'iPAS_Local_0.1.1.zip'
out.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(out, 'w', compression=zipfile.ZIP_DEFLATED) as z:
    prefix = 'iPAS_Local/'
    for p in files:
        z.write(p, prefix + p.relative_to(ROOT).as_posix())
    for name in extras:
        data = (ROOT / name).read_bytes()
        if name.endswith('.cmd'):
            data = data.replace(b'\r\n',b'\n').replace(b'\n',b'\r\n')
        z.writestr(prefix + name, data)
    z.writestr(prefix + 'local-manifest.json', json.dumps(manifest, ensure_ascii=False, indent=2))
    z.writestr(prefix + 'START_HERE.txt', (
        '\u4f7f\u7528\u65b9\u5f0f\n'
        '1. \u5148\u89e3\u58d3\u7e2e\u6574\u500b ZIP\uff0c\u4e0d\u8981\u5728\u58d3\u7e2e\u6a94\u88e1\u57f7\u884c\u3002\n'
        '2. \u9700\u8981 Node.js 22 \u6216\u4ee5\u4e0a\uff08\u53ea\u9700\u5b89\u88dd\u4e00\u6b21\uff09\u3002\n'
        '3. \u96d9\u64ca Start_Local.cmd\u3002\n'
        '4. \u700f\u89bd\u5668\u958b\u555f http://127.0.0.1:4173/iPASS_AI_exams/\n'
        '5. \u4fdd\u7559\u555f\u52d5\u8996\u7a97\uff1b\u6309 Ctrl+C \u505c\u6b62\u3002\n'
        '\u4e0d\u5fc5 npm install\u3001Python\u3001API \u91d1\u9470\u6216 GitHub Pages\u3002\n'
        '\u7d00\u9304\u4fdd\u5b58\u5728\u76ee\u524d\u700f\u89bd\u5668\uff0c\u8acb\u532f\u51fa JSON \u5099\u4efd\u3002\n'
        '\u66f4\u591a\u8aaa\u660e\uff1adocs/LOCAL_TESTING.md\n'
    ))
print(out)
print('SHA256', hashlib.sha256(out.read_bytes()).hexdigest())
