import normal from "../../../../contracts/player-draft-v2/examples/cases/normal-multiple.json" with { type: "json" };
import type { PublicSnapshot } from "../src/player-types.ts";
/** Explicit development input only. No server emulation, result generation, random draw or wallet write. */
export const fiveByFive = normal.snapshots as PublicSnapshot[];
export const threeByThree: PublicSnapshot[] = [{
 contractVersion: "fw-pixi-recorded-3x3-v1", requestId:"recorded-3x3-intent", roundId:"recorded-3x3-round",
 revision:1, gameId:"recorded-3x3", rulesVersion:"recorded-3x3-v1", modeId:"recorded",
 currency:"KRW", currencyExponent:0, baseBetMinor:"1000", chargeMinor:"1000",
 debitState:"CONFIRMED", resultState:"RECORDED", payoutState:"CONFIRMED", releasedThrough:2, replayComplete:true,
 events:[{eventSeq:1,kind:"BOARD",deltaWinMinor:"0",cumulativeWinMinor:"0",grid:[["A","K","Q"],["Q","A","K"],["K","Q","A"]],wins:[]},
 {eventSeq:2,kind:"ROUND_END",deltaWinMinor:"0",cumulativeWinMinor:"0"}],
 visibleWinMinor:"0",totalWinMinor:"0",confirmedBalanceMinor:"9000",
}];
