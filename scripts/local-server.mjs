/** Private trial server. No uploads, shell endpoints, telemetry or public tunnel. */
import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
export const PREFIX = '/iPASS_AI_exams/';
export const LOCAL_VERSION = '0.1.1';
const MIME = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8',
  '.webmanifest':'application/manifest+json','.svg':'image/svg+xml', '.png':'image/png'};
const PRIVATE = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/;
export function privateAddresses() {
  return [...new Set(Object.values(os.networkInterfaces()).flat().filter(x=>x&&
    x.family==='IPv4'&&!x.internal&&PRIVATE.test(x.address)).map(x=>x.address))];
}
export function parseOptions(args=[], env=process.env) {
  const known=new Set(['--open','--lan','--check']);
  if(args.some(a=>!known.has(a))) throw new Error('Unknown option. Use --open, --check, or --lan.');
  const lan=args.includes('--lan');
  const port=Number(env.IPAS_PORT||env.PORT||4173);
  if(!Number.isInteger(port)||port<1024||port>65535) throw new Error('IPAS_PORT must be an integer from 1024 to 65535.');
  const cert=env.IPAS_TLS_CERT, key=env.IPAS_TLS_KEY;
  if(!!cert!==!!key) throw new Error('Set both IPAS_TLS_CERT and IPAS_TLS_KEY, or neither.');
  let host='127.0.0.1';
  if(lan){
    const ips=privateAddresses();
    host=env.IPAS_LAN_IP||(ips.length===1?ips[0]:'');
    if(!host||!ips.includes(host)) throw new Error('LAN requires IPAS_LAN_IP set to a private address assigned to this computer. Candidates: '+ips.join(', '));
    if(!cert||!key) throw new Error('LAN requires a trusted HTTPS certificate. Plain LAN HTTP is not supported. See docs/LOCAL_TESTING.md.');
  }
  return {host,port,lan,cert,key,check:args.includes('--check'),open:args.includes('--open')&&env.IPAS_NO_OPEN!=='1'};
}
/** Validate a prebuilt trial package for missing/corrupted bytes, not authenticity. */
export function verifyBundle(root) {
  const file=path.join(root,'local-manifest.json');
  if(!fs.existsSync(file)) return false; // Source checkout builds fresh before serving.
  const m=JSON.parse(fs.readFileSync(file,'utf8'));
  if(m.format!==1||!m.files||Array.isArray(m.files)) throw new Error('Invalid local package manifest.');
  const entries=Object.entries(m.files);
  if(!entries.length||entries.length>500) throw new Error('Invalid package file count.');
  const expected=new Set(entries.map(([rel])=>rel));
  const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{
    const p=path.join(dir,e.name);
    if(e.isSymbolicLink()) throw new Error('Symlinks are not allowed in the trial package.');
    return e.isDirectory()?walk(p):[path.relative(root,p).split(path.sep).join('/')];
  });
  const actual=walk(path.join(root,'dist'));
  if(actual.length!==expected.size||actual.some(p=>!expected.has(p))) throw new Error('The dist folder does not match this package. Extract the complete ZIP again.');
  for(const [rel,sha] of entries) {
    if(!/^dist\/[A-Za-z0-9_./-]+$/.test(rel)||rel.split('/').includes('..')||!/^([a-f0-9]{64})$/.test(sha)) throw new Error('Invalid package path/hash.');
    const bytes=fs.readFileSync(path.join(root,rel));
    if(createHash('sha256').update(bytes).digest('hex')!==sha) throw new Error('Package file missing or changed: '+rel+'. Extract the complete ZIP again.');
  }
  return true;
}
export function createLocalServer({dir,host='127.0.0.1',port=4173,cert,key,lan=false}) {
  const root=fs.realpathSync(dir);
  const secure=!!cert;
  const authority=h=>h.includes(':')?'['+h+']':h;
  const hosts=new Set([authority(host)+':'+port]);
  if(!lan) { hosts.add('localhost:'+port);hosts.add('127.0.0.1:'+port); }
  const origins=new Set([...hosts].map(h=>(secure?'https://':'http://')+h));
  const handler=(req,res)=>{
    const headers={'X-Content-Type-Options':'nosniff','Cache-Control':'no-store',
      'Referrer-Policy':'no-referrer','X-Frame-Options':'DENY','Cross-Origin-Resource-Policy':'same-origin'};
    const send=(status,text='',extra={})=>{
      res.writeHead(status,{'Content-Type':'text/plain; charset=utf-8',...headers,...extra});
      res.end(req.method==='HEAD'?'':text);
    };
    if(!hosts.has(req.headers.host)) return send(403,'Unapproved Host header. Use the printed local URL.');
    if(req.headers.origin&&!origins.has(req.headers.origin)) return send(403,'Cross-origin requests are not supported.');
    if(!['GET','HEAD'].includes(req.method)) return send(405,'Read-only local server.',{Allow:'GET, HEAD'});
    let p;
    try {
      if(!req.url.startsWith('/')||req.url.startsWith('//')) throw new Error();
      p=decodeURIComponent(req.url.split('?')[0]);
      if(p.includes('\0')||p.includes('\\')||p.split('/').some(x=>x==='..'||x==='.')) throw new Error();
    }catch{return send(400,'Invalid request path.');}
    if(p==='/__ipas_health') return send(200,JSON.stringify({app:'smaildot.ipas.l23',localVersion:LOCAL_VERSION,
      mode:lan?'private-lan-https':'loopback-only',origin:[...origins][0]}),{'Content-Type':'application/json'});
    if(p==='/'||p===PREFIX.slice(0,-1)) return send(302,'',{Location:PREFIX});
    if(!p.startsWith(PREFIX)) return send(404,'Not found.');
    const rel=p.slice(PREFIX.length)||'index.html';
    if(rel.split('/').some(x=>x.startsWith('.'))) return send(404,'Not found.');
    const target=path.resolve(root,rel);
    if(!target.startsWith(root+path.sep)) return send(403,'Not found.');
    try {
      const actual=fs.realpathSync(target);
      if(!actual.startsWith(root+path.sep)||!fs.statSync(actual).isFile()) return send(404,'Not found.');
      const type=MIME[path.extname(actual)];
      if(!type) return send(404,'Not found.');
      const bytes=fs.readFileSync(actual);
      return send(200,bytes,{'Content-Type':type,'Content-Length':bytes.length});
    }catch{return send(404,'Not found.');}
  };
  const server=secure?https.createServer({cert:fs.readFileSync(cert),key:fs.readFileSync(key),minVersion:'TLSv1.2'},handler):http.createServer(handler);
  server.requestTimeout=10000;server.headersTimeout=10000;server.keepAliveTimeout=3000;
  return server;
}
function openBrowser(url){
  const [cmd,args]=process.platform==='win32'?['rundll32.exe',['url.dll,FileProtocolHandler',url]]:
    process.platform==='darwin'?['open',[url]]:['xdg-open',[url]];
  const child=spawn(cmd,args,{stdio:'ignore',detached:true,shell:false});
  child.on('error',()=>console.log('Browser did not open automatically. Copy the printed URL.'));
  child.unref();
}
export async function runLocalServer(root, args=process.argv.slice(2), env=process.env) {
  const cfg=parseOptions(args,env);
  const dir=path.join(root,'dist');
  if(!fs.existsSync(path.join(dir,'index.html'))) throw new Error('Built files are missing. Extract the whole trial ZIP or run npm run build in the source checkout.');
  verifyBundle(root);
  if(cfg.check){console.log('Local package check passed. No server was started.');return null;}
  const server=createLocalServer({dir,...cfg});
  await new Promise((resolve,reject)=>{
    server.once('error',reject);server.listen(cfg.port,cfg.host,()=>{server.removeListener('error',reject);resolve();});
  }).catch(e=>{if(e.code==='EADDRINUSE')throw new Error('Port '+cfg.port+' is in use. Close your earlier iPAS server window. No other process was stopped and no alternate port was chosen.');throw e;});
  const url=(cfg.cert?'https://':'http://')+cfg.host+':'+cfg.port+PREFIX;
  console.log('\n[iPAS local trial '+LOCAL_VERSION+']\n'+url+'\n');
  console.log(cfg.lan?'PRIVATE LAN HTTPS: reachable on this selected network interface. Use a trusted network; do not forward the port.':'LOCAL COMPUTER ONLY: listening on 127.0.0.1. No tunnel or public deployment.');
  console.log('Keep this window open. Press Ctrl+C to stop.\nUse the SAME URL and browser each time. Export JSON before changing device, host or port.');
  if(cfg.open)openBrowser(url);
  const stop=()=>{server.closeAllConnections();server.close(()=>process.exit(0));};
  process.once('SIGINT',stop);process.once('SIGTERM',stop);
  return server;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  runLocalServer(path.resolve(import.meta.dirname,'..')).catch(e=>{console.error('\nSTART FAILED: '+e.message);process.exitCode=1;});
}
