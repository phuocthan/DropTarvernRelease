import { Application, Text } from "pixi.js";
import { Spine } from "@esotericsoftware/spine-pixi-v8";
import type { ResourceManager } from "../../../../apps/player-web/than/src/resources/resource-manager.ts";
import { AudioBus } from "../../../../apps/player-web/than/src/audio/howler-bus.ts";
import { audioSpriteCues } from "../../../../apps/player-web/than/src/presentation/audio.ts";
const aliases=["scene.background","scene.reelhouse","scene.screens","scene.mascot","symbols.low","symbols.high","symbols.wild","symbols.bonus"];
export async function mountAssetReview(host: HTMLElement, resources: ResourceManager) {
 host.className="asset-tools";
 host.innerHTML=`<h2>Runtime compatibility review</h2><p class="note">Runtime exports for development review. Rights and editable originals are not certified. This probe is not the finished whole-scene presentation.</p><label>Skeleton <select id="skeleton"></select></label> <label>Animation <select id="animation"></select></label> <button id="play-clip">Play clip</button><div class="asset-probe"></div><label>Sound cue <select id="sound-cue"></select></label> <button id="play-cue">Play cue</button> <button id="stop-cue">Stop</button><p class="note" id="asset-status"></p>`;
 const skeletonSelect=host.querySelector<HTMLSelectElement>("#skeleton")!,clipSelect=host.querySelector<HTMLSelectElement>("#animation")!,soundSelect=host.querySelector<HTMLSelectElement>("#sound-cue")!,probe=host.querySelector<HTMLElement>(".asset-probe")!;
 for(const alias of aliases)skeletonSelect.add(new Option(alias,alias));
 const app=new Application();await app.init({width:probe.clientWidth,height:probe.clientHeight,backgroundAlpha:0,preference:"webgl",autoStart:false,resolution:Math.min(devicePixelRatio,1.5)});
 probe.append(app.canvas);app.ticker.maxFPS=30;let spine:Spine|undefined;
 function play(){if(!spine||!clipSelect.value)return;spine.state.setAnimation(0,clipSelect.value,true);spine.update(0);const b=spine.getLocalBounds(),w=Math.max(1,b.width),h=Math.max(1,b.height),s=Math.min(probe.clientWidth/w,probe.clientHeight/h)*.8;spine.scale.set(s);spine.position.set(probe.clientWidth/2-(b.minX+w/2)*s,probe.clientHeight/2-(b.minY+h/2)*s);app.start();}
 function select(){if(spine){app.stage.removeChild(spine);spine.destroy();}spine=Spine.from({skeleton:resources.url(skeletonSelect.value),atlas:resources.url("atlas"),ticker:app.ticker,autoUpdate:true});spine.afterUpdateWorldTransforms=({skeleton})=>{skeleton.findSlot("fade")?.setAttachment(null);};app.stage.addChild(spine);clipSelect.replaceChildren();for(const clip of spine.skeleton.data.animations)clipSelect.add(new Option(clip.name,clip.name));play();}
 skeletonSelect.onchange=select;clipSelect.onchange=play;host.querySelector<HTMLButtonElement>("#play-clip")!.onclick=play;
 const resize=new ResizeObserver(()=>{app.renderer.resize(probe.clientWidth,probe.clientHeight);play();});resize.observe(probe);
 const manifest=resources.get<{src:string[];sprite:Record<string,[number,number,boolean?]>}>("audio.manifest"),cues=audioSpriteCues(manifest,new URL("game-assets/",document.baseURI).href),audio=new AudioBus(cues);
 for(const cue of Object.keys(cues))soundSelect.add(new Option(cue,cue));
 host.querySelector<HTMLButtonElement>("#play-cue")!.onclick=()=>{audio.unlock();audio.muted=false;audio.cue(soundSelect.value);};host.querySelector<HTMLButtonElement>("#stop-cue")!.onclick=()=>audio.stop(soundSelect.value);
 select();
 return {
  async audit(){app.stop();const skeletons=[];for(const alias of aliases){const sample=Spine.from({skeleton:resources.url(alias),atlas:resources.url("atlas"),autoUpdate:false});app.stage.addChild(sample);const clips=[];for(const clip of sample.skeleton.data.animations){for(const r of [0,.5,1]){sample.state.setAnimation(0,clip.name,false).trackTime=clip.duration*r;sample.update(0);app.render();}clips.push(clip.name);}skeletons.push({alias,version:sample.skeleton.data.version,clips,poseSamplesPerClip:3});app.stage.removeChild(sample);sample.destroy();}app.start();
   const font=new FontFace("M1Outfit",`url(${new URL("game-assets/assets/outfit-700-D9T176aR.woff2",document.baseURI).href})`);await font.load();document.fonts.add(font);const text=new Text({text:"KRW ₩1,000 3×3 5×5",style:{fontFamily:"M1Outfit",fontSize:24}});app.stage.addChild(text);app.render();text.destroy();document.fonts.delete(font);
   const result={skeletons,clipCount:skeletons.reduce((n,s)=>n+s.clips.length,0),cueCount:Object.keys(cues).length,fontLoaded:font.status==="loaded",browser:navigator.userAgent,viewport:{width:innerWidth,height:innerHeight},physicalDevice:false};host.querySelector("#asset-status")!.textContent=`Loaded ${skeletons.length} skeletons; sampled ${result.clipCount} clips; ${result.cueCount} sound cues indexed.`;return result;
  },
  async audioAudit(){const context=new OfflineAudioContext(1,44100,44100);const buffer=await context.decodeAudioData(await(await fetch(new URL("game-assets/assets/td_sounds.ogg",document.baseURI))).arrayBuffer());const cue=Object.values(cues).find(c=>typeof c!=="string"&&c.offsetMs>0);let nonSilent=false;if(cue&&typeof cue!=="string"){const src=context.createBufferSource();src.buffer=buffer;src.connect(context.destination);src.start(0,cue.offsetMs/1000,Math.min(1,cue.durationMs/1000));const rendered=await context.startRendering();nonSilent=rendered.getChannelData(0).some(s=>Math.abs(s)>.00001);}return {duration:buffer.duration,nonSilent,cueCount:Object.keys(cues).length,allCueRangesValid:Object.values(cues).every(c=>typeof c==="string"||(c.offsetMs+c.durationMs)/1000<=buffer.duration+.05)};},
  dispose(){resize.disconnect();audio.dispose();app.destroy(true,{children:true});host.replaceChildren();},
 };
}
