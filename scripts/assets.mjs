import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
export const figures={
  'loss.svg':{type:'loss',title:'Training and validation loss',x:[1,2,3,4,5,6],
    train:[.9,.62,.40,.28,.20,.13],validation:[.90,.65,.50,.56,.66,.80]},
  'step.svg':{type:'step',title:'Parameter updates on J(w) = (w - 2)^2',
    points:[{label:'t0',w:0},{label:'t1',w:6},{label:'t2',w:-6}]}
};
const svg=(title,body)=>`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="380" viewBox="0 0 640 380"><title>${title}</title><rect width="640" height="380" fill="#ffffff"/><g font-family="sans-serif" font-size="16" fill="#173d3b">${body}</g></svg>`;
function loss(f){
  const x=i=>70+i*96,y=v=>305-v*245;
  let body='<text x="70" y="30" font-size="20">Loss (lower is better)</text>';
  for(let v=0;v<=1.001;v+=.2)body+=`<path d="M70 ${y(v)} H570" stroke="#d9e2dd"/><text x="22" y="${y(v)+6}">${v.toFixed(1)}</text>`;
  f.x.forEach((v,i)=>{body+=`<text x="${x(i)-4}" y="333">${v}</text>`;});
  body+='<text x="490" y="365">Epoch</text>';
  for(const [key,color,dash,label]of [['train','#196b67','','Training'],['validation','#a55416','8 5','Validation']]){
    body+=`<polyline points="${f[key].map((v,i)=>`${x(i)},${y(v)}`).join(' ')}" fill="none" stroke="${color}" stroke-width="3" stroke-dasharray="${dash}"/>`;
    body+=f[key].map((v,i)=>`<circle cx="${x(i)}" cy="${y(v)}" r="5" fill="${color}"/>`).join('');
    const dx=key==='train'?100:290;
    body+=`<path d="M${dx} 357 h32" stroke="${color}" stroke-width="3" stroke-dasharray="${dash}"/><text x="${dx+40}" y="363">${label}</text>`;
  }
  return svg(f.title,body);
}
function step(f){
  const x=w=>65+(w+7)*35,y=v=>300-v*2.8;
  let body='<text x="40" y="28" font-size="20">J(w) = (w - 2)^2</text>';
  for(const v of [0,20,40,60,80])body+=`<path d="M65 ${y(v)} H600" stroke="#dde5df"/><text x="20" y="${y(v)+6}">${v}</text>`;
  const curve=Array.from({length:151},(_,i)=>{const w=-7+i*.1;return `${x(w)},${y((w-2)**2)}`;});
  body+=`<polyline points="${curve.join(' ')}" stroke="#196b67" stroke-width="3" fill="none"/>`;
  for(const w of [-6,-4,-2,0,2,4,6,8])body+=`<text x="${x(w)-6}" y="325">${w}</text>`;
  for(const p of f.points)body+=`<circle cx="${x(p.w)}" cy="${y((p.w-2)**2)}" r="7" fill="#a55416"/><text x="${x(p.w)+12}" y="${y((p.w-2)**2)-12}">${p.label}: w=${p.w}</text>`;
  body+='<text x="82" y="365">Update order: t0 → t1 → t2</text><text x="580" y="353">w</text>';
  return svg(f.title,body);
}
function crc32(buffer){
  let crc=0xffffffff;
  for(const b of buffer){crc^=b;for(let k=0;k<8;k++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
  return (crc^0xffffffff)>>>0;
}
function chunk(type,data){
  const label=Buffer.from(type),len=Buffer.alloc(4),crc=Buffer.alloc(4);
  len.writeUInt32BE(data.length);crc.writeUInt32BE(crc32(Buffer.concat([label,data])));
  return Buffer.concat([len,label,data,crc]);
}
function icon(size){
  const raw=Buffer.alloc((size*4+1)*size),bg=[22,60,58,255],fg=[210,240,124,255];
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const u=x/size,v=y/size;
    const step=(u>.23&&u<.34&&v>.52&&v<.76)||(u>.23&&u<.49&&v>.48&&v<.58)||
      (u>.43&&u<.54&&v>.38&&v<.58)||(u>.43&&u<.69&&v>.34&&v<.44)||
      (u>.63&&u<.74&&v>.24&&v<.44)||(u>.63&&u<.82&&v>.20&&v<.30);
    Buffer.from(step?fg:bg).copy(raw,y*(size*4+1)+1+x*4);
  }
  const h=Buffer.alloc(13);h.writeUInt32BE(size,0);h.writeUInt32BE(size,4);h[8]=8;h[9]=6;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',h),chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
}
export function generateAssets(dir){
  fs.mkdirSync(dir,{recursive:true});
  for(const[name,f]of Object.entries(figures))fs.writeFileSync(path.join(dir,name),f.type==='loss'?loss(f):step(f));
  for(const n of [192,512])fs.writeFileSync(path.join(dir,`icon-${n}.png`),icon(n));
}
