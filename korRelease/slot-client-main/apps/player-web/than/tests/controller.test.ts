import test from "node:test";
import assert from "node:assert/strict";
import { PlayerController } from "../src/player-controller.ts";
import { canonicalAmount, formatAmount } from "../src/money.ts";
import type { PublicSnapshot } from "../src/player-types.ts";
const base:PublicSnapshot={contractVersion:"review",requestId:"request",roundId:"round",revision:1,gameId:"slot",rulesVersion:"rules1",modeId:"normal",currency:"KRW",currencyExponent:0,baseBetMinor:"1000",chargeMinor:"1000",debitState:"CONFIRMED",resultState:"RECORDED",payoutState:"PENDING",releasedThrough:1,replayComplete:false,events:[{eventSeq:1,kind:"BOARD",deltaWinMinor:"200",cumulativeWinMinor:"200"}],visibleWinMinor:"200",totalWinMinor:null,confirmedBalanceMinor:null};
function memory(){const map=new Map<string,string>();return {getItem:(k:string)=>map.get(k)??null,setItem:(k:string,v:string)=>{map.set(k,v);},removeItem:(k:string)=>{map.delete(k);}};}
test("amount formatting preserves long exact strings and null differs from zero",()=>{assert.equal(formatAmount("123456789012345678901","KRW",0),"₩123,456,789,012,345,678,901");assert.equal(formatAmount("100","TST",2),"TST 1.00");assert.equal(formatAmount(null,"KRW",0),"—");assert.equal(formatAmount("0","KRW",0),"₩0");for(const x of [1000,"01","1.0","-1"])assert.throws(()=>canonicalAmount(x));});
test("pending payout hides final amount/balance even when disclosed; final confirmation releases display",()=>{const c=new PlayerController();c.accept({...base,totalWinMinor:"200",confirmedBalanceMinor:"9200",replayComplete:true});assert.equal(c.finalAmount,null);assert.equal(c.confirmedBalance,null);assert.equal(c.canReplay,false);c.accept({...base,revision:2,totalWinMinor:"200",confirmedBalanceMinor:"9200",replayComplete:true,payoutState:"CONFIRMED"});assert.equal(c.finalAmount,"200");assert.equal(c.confirmedBalance,"9200");assert.equal(c.canReplay,true);});
test("reload resumes only unfinished local presentation without mutating released input",async()=>{const store=memory(),c=new PlayerController(store);const before=JSON.stringify(base);c.accept(base);let release!:()=>void;const gate=new Promise<void>(r=>{release=r;});const work=c.present(async()=>{await gate;});assert.equal(c.presentedThrough,0);release();await work;assert.equal(c.presentedThrough,1);assert.equal(JSON.stringify(base),before);const reload=new PlayerController(store);reload.accept(base);let played=0;await reload.present(async()=>{played++;});assert.equal(played,0);});
test("stale revisions cannot roll back, and identities/prefixes cannot change",()=>{const c=new PlayerController();c.accept(base);assert.equal(c.accept({...base,revision:1}),false);assert.throws(()=>c.accept({...base,revision:2,roundId:"other"}),/identity/);assert.throws(()=>c.accept({...base,revision:2,events:[{...base.events[0],deltaWinMinor:"999"}]}),/prefix/);});
test("dispose cancels in-flight local progress and rejects new snapshots",async()=>{const c=new PlayerController();c.accept(base);await c.present(async()=>{c.dispose();});assert.equal(c.presentedThrough,0);assert.throws(()=>c.accept(base),/disposed/);});

// The proposed schema remains a separate input version; all 22 records stay unchanged.
test("all client v2 synthetic prefixes can be consumed without deriving outcomes", async () => {
 const { readFileSync, readdirSync } = await import("node:fs");
 const { resolve } = await import("node:path");
 const folder = resolve(import.meta.dirname,"../../../../contracts/player-draft-v2/examples/cases");
 const files = readdirSync(folder).filter(name=>name.endsWith(".json"));
 assert.equal(files.length,22);
 for(const file of files){const record=JSON.parse(readFileSync(resolve(folder,file),"utf8"));const c=new PlayerController();for(const snapshot of record.snapshots){c.accept(snapshot);await c.present(async()=>{});}assert.equal(c.finalAmount,record.expected.totalWinMinor,file);assert.equal(c.confirmedBalance,record.expected.closingMinor,file);}
});
