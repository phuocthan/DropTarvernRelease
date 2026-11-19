import "../src/shell.css";
import { Container, Graphics, Text } from "pixi.js";
import { BoardView } from "../src/presentation/board.ts";
import { PlayerController } from "../src/player-controller.ts";
import { formatAmount } from "../src/money.ts";
import { ResourceManager, ResourceStore } from "../src/resources/resource-manager.ts";
import { browserResourceDriver } from "../src/resources/browser-driver.ts";
import { resolveResourceUrl } from "../src/remote/asset-resolver.ts";
import { loadTavernSymbols } from "@game/skin.ts";
import { mountAssetReview } from "@game/asset-review.ts";
import gameConfig from "@game/game.config.json";
import smallConfig from "./recorded-3x3.config.json";
import { fiveByFive, threeByThree } from "./recorded-source.ts";
import type { SymbolFactory } from "../src/presentation/board.ts";
import type { GameDefinition as Layout } from "../src/domain/contracts.ts";

const small = new URLSearchParams(location.search).get("game") === "3x3";
const config = structuredClone(small ? smallConfig : gameConfig) as Layout;
const records = small ? threeByThree : fiveByFive;
const root = document.querySelector<HTMLElement>("#app")!;
root.innerHTML = `<header class="review-banner"><strong>fw-pixi · M1 recorded playback</strong><a href="mock.html">5×5 reference assets</a><a href="mock.html?game=3x3">3×3 same core</a></header>
<main class="recorded-page"><h1 class="recorded-heading">${small ? "3×3 Normal" : "Tavern 5×5 Drop"}</h1>
<p class="note">Development-only recorded input. No new wager, RNG or wallet API. ${small ? "One recorded KRW loss." : "Unchanged client-provided toy v2 example in TST; not commercial prices or math."}</p>
<div class="recorded-grid"><div class="board-surface" id="board"></div><aside class="data-panel"><dl>
<dt>Current win</dt><dd id="visible-win">—</dd><dt>Total win</dt><dd id="total-win">—</dd><dt>Confirmed balance</dt><dd id="balance">—</dd></dl>
<div class="controls"><button id="replay" disabled>Replay recorded result</button><button id="skip" disabled>Skip animation</button></div><p id="status" role="status">Loading required assets…</p></aside></div>
<section id="asset-review"></section></main>`;
const replay = document.querySelector<HTMLButtonElement>("#replay")!, skip = document.querySelector<HTMLButtonElement>("#skip")!;
const status = document.querySelector<HTMLElement>("#status")!;
const resources = new ResourceManager(config.resources ?? { assets:{},bundles:{} }, new ResourceStore(browserResourceDriver),
 (src,base) => resolveResourceUrl(src,base,{baseUrl:document.baseURI}));
const controller = new PlayerController(localStorage);
let board: BoardView | undefined;
let review: Awaited<ReturnType<typeof mountAssetReview>> | undefined;
const nativeMap: Record<string,string> = { ten:"10",jack:"J",queen:"Q",king:"K",ace:"A",mug:"ale",potion:"coin",meat:"barrel",meal:"crown",wild:"wild",bonus:"bonus" };
function sync() {
 const s = controller.snapshot;
 if (!s) return;
 document.querySelector("#visible-win")!.textContent = formatAmount(s.visibleWinMinor,s.currency,s.currencyExponent);
 document.querySelector("#total-win")!.textContent = formatAmount(controller.finalAmount,s.currency,s.currencyExponent);
 document.querySelector("#balance")!.textContent = formatAmount(controller.confirmedBalance,s.currency,s.currencyExponent);
}
async function play(reset=false) {
 replay.disabled=true; skip.disabled=false;
 try {
  if (reset) controller.resetPresentation();
  for (const snapshot of records) {
   controller.accept(snapshot); sync();
   await controller.present(async event => {
    if (!event.grid) return;
    const columns = Array.from({length:config.reels},(_,reel) => event.grid!.map(row=>small ? row[reel] : nativeMap[row[reel]]));
    board!.clearHighlight(); board!.start(false); await board!.stop(columns);
    const positions = event.wins?.flatMap(win=>win.positions.map(([row,reel])=>({row,reel}))) ?? [];
    if (positions.length) { await board!.focusWins(positions); board!.clearHighlight(); }
   });
  }
  sync(); status.textContent="Recorded playback complete. Reload preserves presentation progress.";
 } catch (error) { status.className="error";status.textContent="Playback could not continue. Reload the same recorded result."; console.error(error); }
 finally { replay.disabled=!controller.canReplay; skip.disabled=true; }
}
try {
 let factory: SymbolFactory;
 if (!small) {
  await resources.prepare();
  factory=await loadTavernSymbols(resources);
 } else {
  factory=cell=>{
   const view=new Container(), text=new Text({style:{fontSize:cell*.42,fill:0xffdd8c}});
   text.anchor.set(.5);text.position.set(cell/2);
   view.addChild(new Graphics().roundRect(3,3,cell-6,cell-6,10).fill(0x352735),text);
   return {view,set(id){text.text=id;}};
  };
 }
 board=new BoardView(config,factory); await board.mount(document.querySelector<HTMLElement>("#board")!);
 document.querySelector<HTMLElement>("#board")!.style.aspectRatio=`${board.contentWidth}/${board.contentHeight}`;
 replay.onclick=()=>void play(true); skip.onclick=()=>board?.skip();
 await play();
 if (!small) review=await mountAssetReview(document.querySelector<HTMLElement>("#asset-review")!,resources);
 (window as any).thanM1 = { controller, board, review };
 document.documentElement.dataset.m1Ready="true";
} catch(error) {status.className="error";status.textContent="Required assets failed to load. See the recorded error; no fallback result is generated.";console.error(error);}
addEventListener("pagehide",()=>{ controller.dispose(); board?.destroy(); review?.dispose(); void resources.dispose(); },{once:true});
