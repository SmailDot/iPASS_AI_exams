"""Execute only trusted repository-authored fixtures, never imported user code."""
import json, pathlib, subprocess, sys
ROOT=pathlib.Path(__file__).resolve().parents[1]
raw=subprocess.check_output(['node','--input-type=module','-e',"import {catalog} from './web/src/catalog.js'; console.log(JSON.stringify(catalog));"],cwd=ROOT,text=True,encoding='utf-8')
catalog=json.loads(raw)
passed=[]
for q in catalog['questions']:
    if 'code' not in q: continue
    run=subprocess.run([sys.executable,'-I','-c',q['code']],capture_output=True,text=True,timeout=15)
    assert run.returncode==0,(q['id'],run.stderr)
    assert run.stdout==q['codeCheck']['stdout'],(q['id'],run.stdout,q['codeCheck']['stdout'])
    choice=next(o for o in q['options'] if o['id']==q['correct'])
    assert run.stdout.strip() in choice['text'],(q['id'],'answer mismatch')
    passed.append(q['id'])
assert len(passed)==8
assert 54/.75-54==18
assert abs((2.2-1)/6-.2)<1e-12
assert 3*4*3==36
assert (103+19)//20*2==12
assert 7*3+3==24
assert .8*.01/(.8*.01+.1*.99)<.8*.1/(.8*.1+.1*.9)
print('PASS:',len(passed),'exact code outputs and six independent arithmetic assertions')
for item in passed: print(' ',item)
