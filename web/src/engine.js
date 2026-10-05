/** Pure domain functions: no browser UI, storage, network, or platform APIs. */
export const APP_ID = 'smaildot.ipas.l23';
export const DAY = 86400000;
export const RULE_VERSION = 'rules-0.1';
export const copy = value => structuredClone(value);
export function blankState() {
  return {schema:1, sessions:[], active:null, exposures:{}, lessons:{}, legacy:[],
    settings:{minutes:30, mode:'adaptive', skill:'all'}};
}
export function optionCorrect(item, answer) {
  return answer?.option === item.question.correct;
}
export function result(session) {
  const invalid = session.items.filter(i => session.answers[i.question.id]?.invalid);
  const valid = session.items.filter(i => !session.answers[i.question.id]?.invalid);
  const right = valid.filter(i => optionCorrect(i, session.answers[i.question.id])).length;
  const fresh = valid.filter(i => i.firstSeen && i.shown && !session.answers[i.question.id]?.aided);
  const code = valid.filter(i => !!i.question.code);
  return {right, total:valid.length, invalid:invalid.length, original:session.items.length,
    score:valid.length ? 100*right/valid.length : null,
    freshRight:fresh.filter(i=>optionCorrect(i,session.answers[i.question.id])).length,
    freshTotal:fresh.length,
    codeRight:code.filter(i=>optionCorrect(i,session.answers[i.question.id])).length, codeTotal:code.length,
    eligible:invalid.length===0 && valid.every(i=>i.firstSeen && !session.answers[i.question.id]?.aided)};
}
export function events(state, catalog) {
  const current = new Map(catalog.questions.map(q => [q.id,q.hash]));
  return state.sessions.filter(s=>s.submittedAt).flatMap(s=>s.items.flatMap(i=>{
    const a=s.answers[i.question.id];
    // Old or altered question revisions are archived, not used as current learning evidence.
    if (!a || a.invalid || !i.shown || !current.has(i.question.id) ||
        current.get(i.question.id)!==i.question.hash) return [];
    return [{...a, skill:i.question.skill, task:i.question.task, family:i.question.family,
      difficulty:i.question.difficulty, correct:optionCorrect(i,a), fresh:i.firstSeen,
      familyFresh:i.familyFresh, at:s.submittedAt, session:s.id}];
  })).sort((a,b)=>a.at-b.at);
}
export function summarize(state,catalog,now=Date.now()) {
  const all=events(state,catalog);
  return Object.fromEntries(catalog.skills.map(skill=>{
    const rows=all.filter(e=>e.skill===skill.id);
    const closed=rows.filter(e=>!e.aided);
    const unique=closed.filter(e=>e.fresh && e.familyFresh);
    const good=unique.filter(e=>e.correct && e.confidence==='sure');
    const last=closed.at(-1);
    const recent=closed.slice(-3);
    const families=new Set(good.map(e=>e.family));
    const days=new Set(good.map(e=>new Date(e.at).toDateString()));
    const tasks=new Set(good.map(e=>e.task));
    const anchor=Math.max(state.lessons[skill.id]||0,good[0]?.at||0);
    const delayed=good.some(e=>e.at-anchor>=DAY);
    const misconception=recent.some(e=>!e.correct&&e.confidence==='sure');
    let status='尚未測到';
    if(closed.length) status=(!last.correct || misconception)?'需要補強':
      good.length?'初步掌握':'跨情境待確認';
    if(families.size>=3 && days.size>=2 && tasks.size>=2 && delayed && !misconception)
      status='延後複測已確認';
    const interval=last?.correct ? [1,3,7,14][Math.min(3,Math.max(0,good.length-1))] : 1;
    const dueAt=last ? last.at+interval*DAY : null;
    const codeRows=closed.filter(e=>e.task==='讀碼');
    const weak=last && (!last.correct || last.confidence!=='sure');
    const previousWrong=closed.slice(-2).length===2&&closed.slice(-2).every(e=>!e.correct);
    const wantedDifficulty=previousWrong?1:good.length>=2?3:2;
    return [skill.id,{status, rows:closed.length, right:closed.filter(e=>e.correct).length,
      families:families.size, misconception, weak:!!weak, due:dueAt!==null&&dueAt<=now,dueAt,
      wantedDifficulty,codeRight:codeRows.filter(e=>e.correct).length,codeTotal:codeRows.length,
      needsTask:codeRows.length&&codeRows.at(-1).correct===false?'讀碼':null}];
  }));
}
function random(seed) { let s=seed>>>0; return ()=>{ s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;}; }
export function shuffle(array,seed=1) {
  const a=[...array],rand=random(seed);
  for(let i=a.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;
}
export function recommend(state,catalog,{count=8,mode='adaptive',skill='all',seed=1,now=Date.now()}={}) {
  const summary=summarize(state,catalog,now);
  const candidates=shuffle(catalog.questions.filter(q=>q.status==='verified' &&
    (mode!=='code'||q.task==='讀碼') && (skill==='all'||q.skill===skill)),seed);
  const used=new Set(),families=new Set(),selected=[];
  const prerequisiteWeak = new Set(catalog.skills.filter(s=>summary[s.id].weak)
    .flatMap(s=>s.prerequisites).filter(id=>summary[id]?.status!=='延後複測已確認'));
  const score=q=>{
    const s=summary[q.skill];
    return (!state.exposures[q.id]?100:0)+(s.misconception?35:0)+(s.weak?20:0)+
      (prerequisiteWeak.has(q.skill)?15:0)+(s.due?10:0)+(!s.rows?6:0)+
      (s.needsTask===q.task?8:0)-Math.abs(q.difficulty-s.wantedDifficulty)*3;
  };
  const pick=(predicate,n,reason)=>{
    for(const q of [...candidates].filter(predicate).sort((a,b)=>score(b)-score(a))){
      if(!n)break;
      if(used.has(q.id)||families.has(q.family))continue;
      used.add(q.id);families.add(q.family);selected.push({q,reason});n--;
    }
  };
  const limit=Math.min(Math.max(1,count),candidates.length);
  if(mode==='adaptive'&&skill==='all'){
    pick(q=>summary[q.skill].weak||prerequisiteWeak.has(q.skill),Math.ceil(limit/2),'補強近期卡點或其前置技能');
    pick(q=>summary[q.skill].due,Math.floor(limit/4),'已到複習時間，換個題目確認');
    pick(q=>!summary[q.skill].rows,Math.ceil(limit/4),'保留尚未測到的考點');
  }
  // Round-robin coverage before filling shortages; fixed within each new session.
  for(const s of catalog.skills){
    if(selected.length>=limit)break;
    if(!selected.some(x=>x.q.skill===s.id))pick(q=>q.skill===s.id,1,'補足本組考點覆蓋');
  }
  pick(()=>true,limit-selected.length,mode==='code'?'讀碼專練': '依未見題、難度與近期證據補足');
  // Same-family fallback is explicit. The starter bank currently has distinct families.
  for(const q of candidates){
    if(selected.length>=limit)break;
    if(!used.has(q.id)){selected.push({q,reason:'題庫有限：同題族補充練習'});used.add(q.id);}
  }
  return {selected,summary,shortfall:count-selected.length,rule:RULE_VERSION};
}
export function startSession(state,catalog,plan,id,now=Date.now()) {
  if(state.active)throw new Error('已有尚未交卷的練習，請先完成或保留它。');
  const seenFamilies=new Set(Object.values(state.exposures).map(e=>e.family));
  const items=plan.selected.map(({q,reason},index)=>({
    question:copy(q), order:shuffle(q.options.map(o=>o.id),now+index),
    firstSeen:!state.exposures[q.id],familyFresh:!seenFamilies.has(q.family),
    shown:false, reason
  }));
  if(!items.length)throw new Error('目前沒有符合條件的題目。');
  return {id,bankVersion:catalog.version,rule:RULE_VERSION,createdAt:now,submittedAt:null,
    index:0,paused:false,items,answers:Object.fromEntries(items.map(i=>[i.question.id,{
      option:null,confidence:'',note:'',aided:false,invalid:false,activeMs:0
    }]))};
}
export function expose(state,session,index,now=Date.now()){
  const i=session.items[index];
  if(!i.shown){
    i.shown=true;
    state.exposures[i.question.id] ||= {at:now,family:i.question.family,revealedAt:null};
  }
}
export function submit(state,now=Date.now()) {
  if(!state.active)return null; // Idempotent: repeated clicks cannot create another attempt.
  const s=state.active;
  if(s.submittedAt)return s;
  s.submittedAt=now;s.paused=true;
  for(const i of s.items){
    state.exposures[i.question.id] ||= {at:now,family:i.question.family,revealedAt:null};
    state.exposures[i.question.id].revealedAt=now;
  }
  state.sessions.push(copy(s));state.active=null;return s;
}
export async function digest(text){
  const bytes=new TextEncoder().encode(text);
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
}
export function questionPayload(q){const {hash,...rest}=q;return JSON.stringify(rest);}
export async function verifyQuestion(q){return q.hash===await digest(questionPayload(q));}
function assert(ok,message){if(!ok)throw new Error(message);}
const safeId=x=>typeof x==='string'&&!['__proto__','constructor','prototype'].includes(x)&&/^[a-zA-Z0-9_.:-]{1,100}$/.test(x);
const bounded=(x,max)=>typeof x==='string'&&x.length<=max;
const time=x=>Number.isFinite(x)&&x>=0&&x<1e15;
/** Validate untrusted backups without executing code or fetching their paths. */
export function validateState(s){
  assert(s && s.schema===1,'不支援的備份版本；沒有覆寫目前資料。');
  assert(Array.isArray(s.sessions)&&s.sessions.length<=1000,'練習紀錄格式或數量不合法。');
  assert(s.exposures&&typeof s.exposures==='object'&&!Array.isArray(s.exposures),'曝光紀錄格式錯誤。');
  assert(s.lessons&&typeof s.lessons==='object'&&!Array.isArray(s.lessons),'短課紀錄格式錯誤。');
  assert(Array.isArray(s.legacy)&&s.legacy.length<=50,'舊報告數量不合法。');
  for(const [id,e]of Object.entries(s.exposures)){
    assert(safeId(id)&&safeId(e?.family)&&time(e.at)&&(e.revealedAt===null||time(e.revealedAt)),'曝光紀錄內容不合法。');
  }
  for(const [id,t]of Object.entries(s.lessons))assert(safeId(id)&&time(t),'短課紀錄不合法。');
  for(const r of s.legacy)assert(safeId(r.id)&&bounded(r.text,100000)&&time(r.at),'舊報告不合法。');
  const ids=new Set();
  for(const x of [...s.sessions,...(s.active?[s.active]:[])]){
    assert(safeId(x.id)&&!ids.has(x.id),'練習ID無效或重複。');ids.add(x.id);
    assert(time(x.createdAt)&&(x.submittedAt===null||time(x.submittedAt)),'日期不合法。');
    assert(typeof x.paused==='boolean'&&bounded(x.bankVersion,100),'練習狀態不合法。');
    assert(Array.isArray(x.items)&&x.items.length>0&&x.items.length<=100,'題目數不合法。');
    assert(Number.isInteger(x.index)&&x.index>=0&&x.index<x.items.length,'題目索引不合法。');
    const qs=new Set();
    for(const i of x.items){
      const q=i.question,a=x.answers?.[q?.id];
      assert(q&&safeId(q.id)&&!qs.has(q.id)&&safeId(q.skill)&&safeId(q.family),'題目ID不合法。');qs.add(q.id);
      assert(Number.isInteger(q.version)&&q.version>0&&bounded(q.hash,64)&&/^[a-f0-9]{64}$/.test(q.hash),'題目版本或指紋不合法。');
      assert(bounded(q.stem,10000)&&bounded(q.explanation,10000)&&bounded(q.source,2000)&&bounded(q.hint,3000),'題目文字不合法。');
      assert(['讀碼','計算','概念','情境'].includes(q.task)&&[1,2,3].includes(q.difficulty),'題型或難度不合法。');
      assert(!q.code||bounded(q.code,20000),'程式文字太長。');
      assert(!q.asset||(/^[a-z0-9-]+\.svg$/.test(q.asset)&&/^[a-f0-9]{64}$/.test(q.assetHash)),'素材路徑不合法。');
      assert(Array.isArray(q.options)&&q.options.length===4,'選項數不合法。');
      const os=new Set(q.options.map(o=>o.id));
      assert(os.size===4&&os.has(q.correct)&&q.options.every(o=>safeId(o.id)&&bounded(o.text,5000)&&bounded(o.why,5000)),'選項不合法。');
      assert(Array.isArray(i.order)&&i.order.length===4&&new Set(i.order).size===4&&i.order.every(o=>os.has(o)),'選項順序不合法。');
      assert([i.firstSeen,i.familyFresh,i.shown].every(v=>typeof v==='boolean')&&bounded(i.reason,2000),'曝光資料不合法。');
      assert(a&&(a.option===null||a.option==='unknown'||os.has(a.option)),'答案不合法。');
      assert(['','sure','unsure','guess','unknown'].includes(a.confidence)&&bounded(a.note,4000),'筆記或信心不合法。');
      assert(typeof a.aided==='boolean'&&typeof a.invalid==='boolean'&&time(a.activeMs),'作答旗標不合法。');
    }
  }
  assert(s.sessions.every(x=>x.submittedAt!==null)&&(!s.active||s.active.submittedAt===null),'完成與未完成紀錄混用。');
  assert(s.settings&&[15,30,60,120].includes(s.settings.minutes)&&['adaptive','mixed','code'].includes(s.settings.mode)&&safeId(s.settings.skill),'設定不合法。');
  return s;
}
export async function makeBackup(state){
  const data=copy(state);const checksum=await digest(JSON.stringify(data));
  return JSON.stringify({type:APP_ID,format:1,checksum,data},null,2);
}
export async function parseBackup(text){
  assert(new TextEncoder().encode(text).length<=5*1024*1024,'檔案超過5MB。');
  const env=JSON.parse(text);
  assert(env?.type===APP_ID&&env.format===1,'這不是本站支援的JSON備份。');
  assert(await digest(JSON.stringify(env.data))===env.checksum,'備份校驗失敗；內容可能損壞。');
  validateState(env.data);
  for(const s of [...env.data.sessions,...(env.data.active?[env.data.active]:[])])
    for(const i of s.items)assert(await verifyQuestion(i.question),'題目快照與指紋不符。');
  return env.data;
}
export function mergeStates(local,incoming){
  validateState(local);validateState(incoming);
  const out=copy(local),byId=new Map(out.sessions.map(s=>[s.id,s]));
  for(const s of incoming.sessions){
    if(byId.has(s.id)){
      assert(JSON.stringify(byId.get(s.id))===JSON.stringify(s),'同一練習有不同版本，請先備份並保留原資料。');
    }else{out.sessions.push(copy(s));byId.set(s.id,s);}
  }
  out.sessions.sort((a,b)=>a.createdAt-b.createdAt);
  if(out.active&&byId.has(out.active.id))throw new Error('未完成練習與匯入結果衝突；請先完成本機練習。');
  if(incoming.active&&!byId.has(incoming.active.id)){
    if(out.active)assert(JSON.stringify(out.active)===JSON.stringify(incoming.active),'兩邊都有不同的未完成練習；請先完成或備份本機練習。');
    else out.active=copy(incoming.active);
  }
  for(const[id,e]of Object.entries(incoming.exposures)){
    const old=out.exposures[id];
    out.exposures[id]=old?{at:Math.min(old.at,e.at),family:old.family,revealedAt:Math.max(old.revealedAt||0,e.revealedAt||0)||null}:copy(e);
  }
  for(const[id,t]of Object.entries(incoming.lessons))out.lessons[id]=Math.max(out.lessons[id]||0,t);
  for(const r of incoming.legacy)if(!out.legacy.some(x=>x.id===r.id))out.legacy.push(copy(r));
  validateState(out);return out;
}
export function legacyPreview(text){
  assert(text.length<=100000&&/iPAS|iPASS/i.test(text)&&/診斷|學習報告|逐題記錄/.test(text),'未辨識為支援的舊學習報告。');
  const rows=text.split(/\r?\n/).filter(s=>/^Q\d+｜/.test(s));
  return {rows:rows.length,summary:text.split(/\r?\n/).filter(s=>/^(總分|程式|有效作答時間|用途)/.test(s)).slice(0,5)};
}
