import { test, expect } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
const evidence=resolve(import.meta.dirname,'../../../../..','docs/than/evidence');
mkdirSync(evidence,{recursive:true});
for(const small of [false,true])test(`same fw-pixi core recorded ${small?'3x3':'5x5'} playback and reload`,async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`/mock.html${small?'?game=3x3':''}`);await expect(page.locator('html')).toHaveAttribute('data-m1-ready','true',{timeout:90000});
 await expect(page.locator('#replay')).toBeEnabled();await expect(page.locator('#total-win')).toHaveText(small?'₩0':'TST 3.00');
 const before=await page.evaluate(()=>{const h=(window as any).thanM1;return {request:h.controller.snapshot.requestId,round:h.controller.snapshot.roundId,presented:h.controller.presentedThrough};});
 await page.screenshot({path:resolve(evidence,small?'3x3-desktop.png':'5x5-desktop.png'),fullPage:true});
 await page.reload();await expect(page.locator('html')).toHaveAttribute('data-m1-ready','true',{timeout:90000});
 expect(await page.evaluate(()=>{const h=(window as any).thanM1;return {request:h.controller.snapshot.requestId,round:h.controller.snapshot.roundId,presented:h.controller.presentedThrough};})).toEqual(before);
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:resolve(evidence,small?'3x3-portrait.png':'5x5-portrait.png'),fullPage:true});
 if(!small){const audit=await page.evaluate(()=>(window as any).thanM1.review.audit());expect(audit.skeletons).toHaveLength(8);expect(audit.clipCount).toBeGreaterThan(100);expect(audit.fontLoaded).toBe(true);writeFileSync(resolve(evidence,'runtime-asset-audit.json'),JSON.stringify(audit,null,2)+'\n');const audio=await page.evaluate(()=>(window as any).thanM1.review.audioAudit());expect(audio.nonSilent).toBe(true);expect(audio.allCueRangesValid).toBe(true);writeFileSync(resolve(evidence,'audio-audit.json'),JSON.stringify(audio,null,2)+'\n');}
 expect(errors).toEqual([]);
});
