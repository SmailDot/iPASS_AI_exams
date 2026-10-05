import {APP_ID, copy} from './engine.js';
export class ConflictError extends Error {}
/** One revisioned transaction prevents lost updates across tabs. */
export async function openStorage() {
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error('本機資料庫開啟逾時')),3500);
    let request;
    try{request=indexedDB.open(APP_ID,1);}catch(e){clearTimeout(timer);reject(e);return;}
    request.onupgradeneeded=()=>request.result.createObjectStore('records');
    request.onerror=()=>{clearTimeout(timer);reject(request.error);};
    request.onblocked=()=>{clearTimeout(timer);reject(new Error('資料庫被其他分頁占用'));};
    request.onsuccess=()=>{
      clearTimeout(timer);const db=request.result;
      db.onversionchange=()=>db.close();
      resolve({
        read:()=>new Promise((yes,no)=>{
          const tx=db.transaction('records','readonly'),r=tx.objectStore('records').get('state');
          r.onsuccess=()=>yes(r.result||{revision:0,data:null});r.onerror=()=>no(r.error);
        }),
        write:(data,expected)=>new Promise((yes,no)=>{
          const tx=db.transaction('records','readwrite'),store=tx.objectStore('records');
          const r=store.get('state');let failure=null,next;
          r.onsuccess=()=>{
            const rev=r.result?.revision||0;
            if(rev!==expected){failure=new ConflictError('另一個分頁已保存較新的紀錄。此頁沒有覆寫它。');tx.abort();return;}
            next=rev+1;
            try{store.put({revision:next,data:copy(data)},'state');}
            catch(e){failure=e;tx.abort();}
          };
          tx.oncomplete=()=>yes(next);
          tx.onabort=()=>no(failure||tx.error||new Error('保存被中止'));
          tx.onerror=()=>{}; // onabort is the single rejection path
        }),
        close:()=>db.close()
      });
    };
  });
}
