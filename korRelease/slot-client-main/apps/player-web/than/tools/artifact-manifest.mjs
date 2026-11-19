import { readFileSync, writeFileSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { resolve, relative } from 'node:path';
const profile=process.argv[2];if(!['mock','production'].includes(profile))throw Error('Explicit build profile required');
const root=resolve(import.meta.dirname,'..'),out=resolve(root,'dist',profile),files=[];
// Generated artifact enumeration only; source/assets are selected by the explicit Vite allowlist.
async function walk(folder){for(const f of await readdir(folder,{withFileTypes:true})){const p=resolve(folder,f.name);if(f.isDirectory())await walk(p);else if(f.name!=='BUILD_MANIFEST.json'){const b=readFileSync(p);files.push({path:relative(out,p).replaceAll('\\','/'),sha256:createHash('sha256').update(b).digest('hex'),bytes:b.length});}}}
await walk(out);
if(profile==='production')for(const f of files){const data=readFileSync(resolve(out,f.path),'utf8');if(/synthetic-contract|request-normal-multiple|game-assets\/|thanM1/.test(data))throw Error('Development content leaked into production');}
let commitAtBuild=null,workingTreeDirty=null;try{commitAtBuild=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();workingTreeDirty=!!execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}).trim();}catch{}
const lockfileSha256=createHash('sha256').update(readFileSync(resolve(root,'package-lock.json'))).digest('hex');
const pkg=JSON.parse(readFileSync(resolve(root,'package.json'),'utf8'));
writeFileSync(resolve(out,'BUILD_MANIFEST.json'),JSON.stringify({profile,commitAtBuild,workingTreeDirty,lockfileSha256,apiRevision:'player-draft-v2 proposal',approvedApiRevision:null,apiConnected:false,productionIntegrationConfigured:false,clientPackage:pkg.name,dependencies:pkg.dependencies,files},null,2)+'\n');
console.log(`Wrote ${profile} manifest for ${files.length} artifact files.`);
