import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..');
execFileSync(process.execPath,[path.join(root,'scripts/build.mjs')],{stdio:'inherit'});
const dir=path.join(root,'dist'),port=Number(process.env.PORT||4173);
const prefix='/iPASS_AI_exams/';
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png'};
http.createServer((req,res)=>{
  let url;
  try{url=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400).end();return;}
  if(url==='/'){res.writeHead(302,{Location:prefix});res.end();return;}
  if(!url.startsWith(prefix)){res.writeHead(404).end('Not found');return;}
  let rel=url.slice(prefix.length)||'index.html';
  const file=path.resolve(dir,rel);
  if(!file.startsWith(dir+path.sep)){res.writeHead(403).end();return;}
  if(!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end('Not found');return;}
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});
  fs.createReadStream(file).pipe(res);
}).listen(port,'127.0.0.1',()=>console.log(`Open http://127.0.0.1:${port}${prefix}`));
