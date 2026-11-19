import { readFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { createHash } from 'node:crypto';
const root=resolve(import.meta.dirname,'../../../..');
function verify(files){for(const [name,info] of Object.entries(files)){const file=resolve(root,name);if(relative(root,file).startsWith('..'))throw Error('Unsafe manifest path');const bytes=readFileSync(file);if(createHash('sha256').update(bytes).digest('hex')!==info.sha256)throw Error('Hash mismatch: '+name);}}
const seed=JSON.parse(readFileSync(resolve(root,'SNAPSHOT_MANIFEST.json'),'utf8'));
const delivery=JSON.parse(readFileSync(resolve(root,'DELIVERY_MANIFEST.json'),'utf8'));
verify(seed.files);verify(delivery.files);
console.log(`Verified ${Object.keys(seed.files).length} seed files and ${Object.keys(delivery.files).length} delivery files; manifests exclude their own bytes.`);
