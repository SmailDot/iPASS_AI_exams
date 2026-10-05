"""Real browser checks; synthetic records only. No managed-browser policy bypasses."""
import json, os, pathlib
from playwright.sync_api import sync_playwright, expect
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'test-output';OUT.mkdir(exist_ok=True)
BASE=os.environ.get('BASE_URL','http://127.0.0.1:4173/iPASS_AI_exams/')
READ="""async()=>await new Promise((yes,no)=>{const r=indexedDB.open('smaildot.ipas.l23',1);r.onsuccess=()=>{const d=r.result,t=d.transaction('records','readonly'),q=t.objectStore('records').get('state');q.onsuccess=()=>{yes(q.result);d.close()};q.onerror=()=>no(q.error)};r.onerror=()=>no(r.error)})"""
passed=[]
def ok(name): passed.append(name);print('PASS',name,flush=True)
def saved(p):p.wait_for_function("!document.querySelector('#notice').textContent.includes('正在保存')")
def state(p):return p.evaluate(READ)['data']
def boot(p):p.goto(BASE);expect(p.locator('[data-action="start"]')).to_be_visible()
def scope(p,unit='all',minutes='30',mode='adaptive'):
    p.locator('#minutes').select_option(minutes);p.locator('#mode').select_option(mode);p.locator('#skill').select_option(unit);saved(p)
def start(p):p.locator('[data-action="start"]').click();expect(p.locator('.question-title')).to_be_visible();saved(p)
def finish(p):
    p.locator('[data-action="confirm-submit"]').click();expect(p.locator('#modal-title')).to_have_text('確認交卷')
    p.locator('[data-action="submit"]').evaluate('(b)=>{b.click();b.click()}')
    expect(p.locator('.big-stat')).to_have_count(3);saved(p)
def fits(p):assert p.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_EXECUTABLE') or None,headless=True)
    errors=[]
    ctx=browser.new_context(viewport={'width':1440,'height':1000});p=ctx.new_page()
    p.on('pageerror',lambda e:errors.append(str(e)));requests=[];p.on('request',lambda r:requests.append(r.url))
    boot(p);fits(p);p.screenshot(path=str(OUT/'home-desktop.png'),full_page=True)
    assert all(u.startswith(BASE) or u.startswith('blob:') for u in requests)
    ok('Desktop subpath startup with no third-party resources')
    start(p);p.locator('input[name="answer"]').first.check()
    note='<img src=x onerror=window.BAD=true> Synthetic note'
    p.locator('#note').fill(note);p.locator('input[name="confidence"][value="sure"]').check();saved(p)
    first=state(p)['active'];qid=first['items'][0]['question']['id'];p.reload()
    expect(p.locator('#note')).to_have_value(note);assert p.evaluate('window.BAD') is None
    assert state(p)['active']['id']==first['id'];ok('Reload preserves answer/confidence/note; HTML-looking notes are inert')
    p.evaluate("window.confirm=()=>{throw new Error('native dialog forbidden')}")
    p.locator('[data-action="confirm-submit"]').click();p.locator('#modal [data-action="close"]').last.click()
    expect(p.locator('#note')).to_have_value(note);finish(p)
    assert len(state(p)['sessions'])==1;assert state(p)['sessions'][0]['answers'][qid]['note']==note
    p.reload();expect(p.locator('.big-stat')).to_have_count(3)
    p.screenshot(path=str(OUT/'result-desktop.png'),full_page=True)
    ok('In-page cancel/confirm, idempotent double submit, result deep-link reload')
    p.locator('[data-action="report-copy"]').click();assert note in p.locator('#copy-text').input_value();p.locator('#modal [data-action="close"]').click()
    p.goto(BASE+'#settings');p.locator('[data-action="backup-text"]').click();backup=p.locator('#copy-text').input_value()
    other=browser.new_context(viewport={'width':390,'height':844});rp=other.new_page();boot(rp);rp.goto(BASE+'#settings')
    rp.locator('#import-text').fill(backup);rp.locator('[data-action="preview-import"]').click();rp.locator('[data-action="apply-import"]').click();saved(rp)
    assert len(state(rp)['sessions'])==1
    rp.locator('#import-text').fill('{"type":"wrong"}');rp.locator('[data-action="preview-import"]').click();expect(rp.locator('#modal-title')).to_have_text('未匯入任何資料')
    assert len(state(rp)['sessions'])==1;ok('Valid import preview/merge and malformed backup preserves existing data');other.close();ctx.close()
    ctx=browser.new_context(viewport={'width':390,'height':844},has_touch=True,is_mobile=True);p=ctx.new_page();p.on('pageerror',lambda e:errors.append(str(e)))
    boot(p);p.screenshot(path=str(OUT/'home-mobile.png'),full_page=True)
    count=nc=nf=0
    for unit in ['prob','matrix','grad','metrics','python','prep','model','governance']:
        p.goto(BASE+'#home');scope(p,unit,'120');start(p);snapshot=state(p)['active']
        for n,item in enumerate(snapshot['items']):
            p.locator(f'[data-action="jump"][data-index="{n}"]').click();q=item['question']
            if q.get('asset'):
                expect(p.locator('.question-image')).to_be_visible(timeout=15000)
                assert p.locator('.question-image').evaluate('(i)=>i.complete&&i.naturalWidth>0')
                p.locator('[data-action="zoom"]').click();expect(p.locator('.zoom-scroll img')).to_be_visible()
                p.screenshot(path=str(OUT/f'figure-{unit}-mobile.png'),full_page=True);p.locator('#modal [data-action="close"]').click();nf+=1
            if q.get('code'):
                assert p.locator('.code-block code').inner_text()==q['code']
                p.locator('[data-action="copy-code"]').click();assert p.locator('#copy-text').input_value()==q['code'];p.locator('#modal [data-action="close"]').click()
                if unit=='python':p.screenshot(path=str(OUT/'code-mobile.png'),full_page=True)
                nc+=1
            p.locator(f'input[name="answer"][value="{q["correct"]}"]').check();p.locator('input[name="confidence"][value="sure"]').check();fits(p);count+=1
        finish(p);last=state(p)['sessions'][-1];assert len(last['items'])==4
        assert all(last['answers'][i['question']['id']]['option']==i['question']['correct'] for i in last['items'])
    assert (count,nc,nf)==(32,8,2);ok('All 32 mobile questions, eight exact code copies and two decoded/zoomable figures')
    p.goto(BASE+'#home');scope(p,'python','15');start(p)
    for size in [(320,720),(844,390),(768,1024)]:p.set_viewport_size({'width':size[0],'height':size[1]});fits(p)
    p.locator('#note').fill('orientation fixture');saved(p);p.set_viewport_size({'width':390,'height':844});expect(p.locator('#note')).to_have_value('orientation fixture')
    ok('320px narrow, landscape and tablet reflow; note retained')
    p.locator('[data-action="pause"]').click();saved(p);before=sum(a['activeMs'] for a in state(p)['active']['answers'].values());p.wait_for_timeout(2200)
    assert before==sum(a['activeMs'] for a in state(p)['active']['answers'].values());ok('Paused timer remains stopped')
    p.locator('[data-action="pause"]').click();p.locator('[data-action="hint"]').click();p.locator('#modal [data-action="close"]').click();p.reload()
    expect(p.locator('#aided')).to_be_checked();expect(p.locator('#aided')).to_be_disabled();ok('Used hint remains marked as assistance across reload');ctx.close()
    for mode in ['404','html','wrong-svg','empty','timeout']:
        ctx=browser.new_context(viewport={'width':390,'height':844});p=ctx.new_page();boot(p)
        def fail(route):
            if mode=='404':route.fulfill(status=404,body='missing')
            elif mode=='html':route.fulfill(status=200,content_type='text/html',body='<h1>error</h1>')
            elif mode=='wrong-svg':route.fulfill(status=200,content_type='image/svg+xml',body='<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>')
            elif mode=='empty':route.fulfill(status=200,body='')
            else:route.abort('timedout')
        p.route('**/assets/loss.svg',fail);scope(p,'model','120');start(p);items=state(p)['active']['items']
        n=next(n for n,i in enumerate(items) if i['question'].get('asset'));p.locator(f'[data-action="jump"][data-index="{n}"]').click()
        expect(p.locator('.asset-state.error')).to_be_visible(timeout=15000);expect(p.locator('input[name="answer"]').first).to_be_disabled();saved(p)
        assert state(p)['active']['answers']['model-loss-chart']['invalid'];finish(p)
        expect(p.locator('.big-stat').first).to_contain_text('有技術無效題');ok('Required image '+mode+': rejected and not counted wrong');ctx.close()
    ctx=browser.new_context();ctx.add_init_script("const orig=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(...a){if(this.name==='records')throw new DOMException('Synthetic quota test','QuotaExceededError');return orig.apply(this,a)}")
    p=ctx.new_page();boot(p);start(p);expect(p.locator('#notice')).to_contain_text('尚未安全保存');p.locator('#note').fill('unsaved fixture');finish(p)
    p.goto(BASE+'#settings');p.locator('[data-action="backup-text"]').click();memory=json.loads(p.locator('#copy-text').input_value())
    assert any(a['note']=='unsaved fixture' for a in memory['data']['sessions'][0]['answers'].values());ok('Quota failure disclosed; in-memory completed work exportable');ctx.close()
    ctx=browser.new_context();ctx.add_init_script("indexedDB.open=()=>{throw new Error('Synthetic blocked IndexedDB')}");p=ctx.new_page();boot(p)
    expect(p.locator('#notice')).to_contain_text('尚未安全保存');start(p);finish(p);ok('Blocked IndexedDB has visible temporary-memory fallback');ctx.close()
    ctx=browser.new_context();a=ctx.new_page();b=ctx.new_page();boot(a);boot(b);start(a);first=state(a)['active']['id'];start(b)
    expect(b.locator('#notice')).to_contain_text('另一個分頁');assert state(a)['active']['id']==first;ok('Stale concurrent-tab write rejected without overwriting first tab');ctx.close()
    ctx=browser.new_context(java_script_enabled=False);p=ctx.new_page();p.goto(BASE);expect(p.locator('noscript')).to_contain_text('需要啟用');assert p.locator('[data-action="submit"]').count()==0;ok('No JavaScript produces explanation rather than a dead submit control');ctx.close()
    assert not errors,errors;ok('Normal flows have no uncaught browser JavaScript errors')
    report={'passed':passed,'checks':len(passed),'browser':browser.version,'scope':'built project subpath; synthetic data','not_tested':['physical Android hardware','Safari/WebKit','Firefox','APK/signing','offline (not implemented)','live Pages']}
    (OUT/'browser-results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8');browser.close()
    print('PASS ALL',len(passed),'browser groups',flush=True)
