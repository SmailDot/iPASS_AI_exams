import assert from 'node:assert/strict';
import fs from 'node:fs';
import {catalog} from '../web/src/catalog.js';
import {figures} from './assets.mjs';
const ids=new Set(),stems=new Set(),skills=new Set(catalog.skills.map(s=>s.id));
for(const q of catalog.questions){assert(!ids.has(q.id));ids.add(q.id);assert(!stems.has(q.stem));stems.add(q.stem);assert(skills.has(q.skill));assert.equal(q.status,'verified');assert.equal(q.kind,'original');assert.equal(q.options.length,4);assert.equal(new Set(q.options.map(o=>o.id)).size,4);assert.equal(new Set(q.options.map(o=>o.text)).size,4);assert.equal(q.options.filter(o=>o.id===q.correct).length,1);assert(q.options.every(o=>o.text&&o.why));assert(q.source&&q.hint&&q.explanation);assert(['讀碼','計算','情境','概念'].includes(q.task));if(q.code){assert(q.codeCheck?.stdout);assert(!q.code.includes('\t'));assert.equal(q.task,'讀碼');}if(q.asset)assert(figures[q.asset]);}
assert.equal(catalog.questions.length,32);assert.equal(catalog.questions.filter(q=>q.code).length,8);assert.equal(catalog.questions.filter(q=>q.asset).length,2);
for(const s of catalog.skills){assert(s.prerequisites.every(p=>skills.has(p)));assert(s.lesson.length>=4);}
assert.equal(figures['loss.svg'].validation.indexOf(Math.min(...figures['loss.svg'].validation))+1,3);assert.deepEqual(figures['step.svg'].points.map(p=>Math.abs(p.w-2)),[2,4,8]);
for(const name of ['app','engine','storage','assets']){const src=fs.readFileSync(new URL('../web/src/'+name+'.js',import.meta.url),'utf8');assert(!/\b(eval|new Function)\s*\(/.test(src));assert(!/(?<![\w.])(confirm|alert|prompt)\s*\(/.test(src));}
console.log('PASS content: 32 unique original questions, 8 code contracts, 2 generated figures');
