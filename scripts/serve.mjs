import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {runLocalServer} from './local-server.mjs';
const root=path.resolve(import.meta.dirname,'..');
try {
  // Git checkout: build offline using repository files. Trial ZIP: use verified dist.
  if(fs.existsSync(path.join(root,'web/src/catalog.js'))) {
    execFileSync(process.execPath,[path.join(root,'scripts/build.mjs')],{stdio:'inherit'});
  }
  await runLocalServer(root);
} catch(e) {console.error('\nSTART FAILED: '+e.message);process.exitCode=1;}
