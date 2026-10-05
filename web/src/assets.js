const cache=new Map();
function hex(buffer){return [...new Uint8Array(buffer)].map(x=>x.toString(16).padStart(2,'0')).join('');}
/** A matching checksum plus successful decode is required, not just HTTP 200. */
export async function loadFigure(q,{retry=false}={}){
  if(!q.asset)return null;
  const key=q.asset+':'+q.assetHash;
  if(retry)cache.delete(key);
  if(cache.has(key))return cache.get(key);
  const job=(async()=>{
    if(!/^[a-z0-9-]+\.svg$/.test(q.asset))throw new Error('不合法的素材路徑');
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),6000);
    let blob;
    try{
      const response=await fetch(new URL('../assets/'+q.asset,import.meta.url),{signal:controller.signal,cache:retry?'reload':'default'});
      if(!response.ok)throw new Error('圖片回應 '+response.status);
      const bytes=await response.arrayBuffer();
      if(!bytes.byteLength || hex(await crypto.subtle.digest('SHA-256',bytes))!==q.assetHash)
        throw new Error('圖片版本或內容校驗失敗');
      blob=new Blob([bytes],{type:'image/svg+xml'});
    }finally{clearTimeout(timer);}
    const url=URL.createObjectURL(blob),image=new Image();
    try{
      image.src=url;
      await Promise.race([image.decode(),new Promise((_,reject)=>setTimeout(()=>reject(new Error('圖片解碼逾時')),4000))]);
      if(!image.naturalWidth||!image.naturalHeight)throw new Error('圖片尺寸無效');
      return url;
    }catch(e){URL.revokeObjectURL(url);throw e;}
  })();
  cache.set(key,job);
  return job;
}
