import {build} from 'esbuild';
import {mkdirSync,copyFileSync,readFileSync,writeFileSync} from 'node:fs';
mkdirSync('dist',{recursive:true});
await build({entryPoints:['client/main.mjs'],outfile:'dist/app.js',bundle:true,minify:true,format:'esm',sourcemap:false});
copyFileSync('client/style.css','dist/style.css');
writeFileSync('dist/index.html',readFileSync('client/index.html','utf8').replace(/<script type="importmap">.*?<\/script>/,'').replace('src="/main.mjs"','src="/app.js"'));
console.log('Build complete: dist/ (requires included Node server for multiplayer and records)');
