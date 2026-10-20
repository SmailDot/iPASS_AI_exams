import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import net from 'node:net';
import {createHash} from 'node:crypto';
import {createLocalServer,parseOptions,verifyBundle,PREFIX} from '../scripts/local-server.mjs';
async function fixture(fn) {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'ipas-local-'));
  const dir=path.join(root,'dist');fs.mkdirSync(dir);fs.mkdirSync(path.join(dir,'src'));
  fs.writeFileSync(path.join(dir,'index.html'),'<h1>trial</h1>');fs.writeFileSync(path.join(dir,'src/test.js'),'export const n=1;');
  fs.writeFileSync(path.join(root,'private.txt'),'must not serve');
  const probe=net.createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
  const server=createLocalServer({dir,port});await new Promise(r=>server.listen(port,'127.0.0.1',r));
  const request=(url,options={})=>new Promise((resolve,reject)=>{
    const req=http.request({hostname:'127.0.0.1',port,path:url,...options},res=>{
      const chunks=[];res.on('data',x=>chunks.push(x));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks).toString()}));
    });req.on('error',reject);req.end();
  });
  try{await fn({root,dir,port,server,request});}finally{server.closeAllConnections();await new Promise(r=>server.close(r));fs.rmSync(root,{recursive:true,force:true});}
}
test('startup defaults to loopback; no LAN or browser automatically',()=>{
  const c=parseOptions([],{});assert.equal(c.host,'127.0.0.1');assert.equal(c.port,4173);assert.equal(c.lan,false);assert.equal(c.open,false);
  assert.equal(parseOptions(['--open'],{IPAS_NO_OPEN:'1'}).open,false);
});
test('invalid port, unknown options and partial TLS settings are rejected',()=>{
  for(const port of ['0','443','NaN','65536'])assert.throws(()=>parseOptions([],{IPAS_PORT:port}));
  assert.throws(()=>parseOptions(['--host=0.0.0.0'],{}));assert.throws(()=>parseOptions([],{IPAS_TLS_KEY:'key'}));
});
test('LAN refuses public IP and plain HTTP',()=>{
  assert.throws(()=>parseOptions(['--lan'],{IPAS_LAN_IP:'8.8.8.8'}));
  assert.throws(()=>parseOptions(['--lan'],{}));
});
test('local root redirects to stable subpath and health identifies trial mode',async()=>fixture(async({request})=>{
  const r=await request('/');assert.equal(r.status,302);assert.equal(r.headers.location,PREFIX);
  assert.equal((await request(PREFIX.slice(0,-1))).status,302);
  const h=await request('/__ipas_health');assert.equal(JSON.parse(h.body).mode,'loopback-only');
}));
test('HTML/JS are served with no-store and correct MIME; HEAD is empty',async()=>fixture(async({request})=>{
  assert.equal((await request(PREFIX)).body,'<h1>trial</h1>');
  const r=await request(PREFIX+'src/test.js');assert.equal(r.status,200);assert.match(r.headers['content-type'],/javascript/);assert.equal(r.headers['cache-control'],'no-store');
  assert.equal((await request(PREFIX,{method:'HEAD'})).body,'');
}));
test('private files, hidden files, directory listing and traversal are rejected',async()=>fixture(async({request})=>{
  for(const p of ['/private.txt',PREFIX+'../private.txt',PREFIX+'%2e%2e/private.txt',PREFIX+'..%5cprivate.txt',PREFIX+'.env',PREFIX+'src/',PREFIX+'%00']) {
    assert.ok([400,403,404].includes((await request(p)).status),p);
  }
}));
test('write methods, foreign Host and foreign Origin are rejected',async()=>fixture(async({request})=>{
  assert.equal((await request(PREFIX,{method:'POST'})).status,405);
  assert.equal((await request(PREFIX,{headers:{Host:'untrusted.example'}})).status,403);
  assert.equal((await request(PREFIX,{headers:{Origin:'https://untrusted.example'}})).status,403);
}));
test('port conflicts fail instead of silently changing storage origin',async()=>fixture(async({dir,port})=>{
  const second=createLocalServer({dir,port});const e=await new Promise(r=>{second.once('error',r);second.listen(port,'127.0.0.1');});assert.equal(e.code,'EADDRINUSE');
}));
test('prebuilt manifest checks complete bytes, extra files and modified files',async()=>fixture(async({root,dir})=>{
  const files=Object.fromEntries(['dist/index.html','dist/src/test.js'].map(p=>[p,createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex')]));
  fs.writeFileSync(path.join(root,'local-manifest.json'),JSON.stringify({format:1,files}));assert.equal(verifyBundle(root),true);
  fs.writeFileSync(path.join(dir,'extra.json'),'{}');assert.throws(()=>verifyBundle(root));fs.unlinkSync(path.join(dir,'extra.json'));
  fs.writeFileSync(path.join(dir,'src/test.js'),'tampered');assert.throws(()=>verifyBundle(root));
}));
test('missing manifest is supported for fresh source builds',async()=>fixture(async({root})=>assert.equal(verifyBundle(root),false)));
