import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {catalog} from '../web/src/catalog.js';
import {generateAssets,figures} from './assets.mjs';
const root=path.resolve(import.meta.dirname,'..'),dest=path.join(root,'dist');
fs.rmSync(dest,{recursive:true,force:true});
fs.cpSync(path.join(root,'web'),dest,{recursive:true});
generateAssets(path.join(dest,'assets'));
const data=structuredClone(catalog);
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
for(const q of data.questions){
  if(q.asset){
    q.assetHash=hash(fs.readFileSync(path.join(dest,'assets',q.asset)));
    q.figure=figures[q.asset];
  }
  q.hash=hash(JSON.stringify(q));
}
fs.writeFileSync(path.join(dest,'src/data.js'),'export const catalog = '+JSON.stringify(data)+';\n');
fs.rmSync(path.join(dest,'src/catalog.js'));
fs.writeFileSync(path.join(dest,'.nojekyll'),'');
fs.writeFileSync(path.join(dest,'build-info.json'),JSON.stringify({
  app:catalog.appVersion,bank:catalog.version,questionCount:data.questions.length,
  codeCount:data.questions.filter(q=>q.code).length,assetCount:Object.keys(figures).length
},null,2));
console.log(`Built dist: ${data.questions.length} questions, ${data.questions.filter(q=>q.code).length} code questions; no runtime CDN.`);
