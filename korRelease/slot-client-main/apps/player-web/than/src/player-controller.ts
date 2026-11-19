import { canonicalAmount } from "./money.ts";
import type { PublicEvent, PublicSnapshot, CursorStore } from "./player-types.ts";

/** Recorded-prefix playback only. No random result, paytable, charge, wallet write or live fallback. */
export class PlayerController {
 snapshot: PublicSnapshot | null = null;
 presentedThrough = 0;
 private disposed = false;
 private playing = false;
 private generation = 0;
 private storage: CursorStore | undefined;
 constructor(storage?: CursorStore) { this.storage = storage; }
 private key(snapshot: PublicSnapshot) { return `fw-pixi.presented.${snapshot.contractVersion}.${snapshot.gameId}.${snapshot.roundId}`; }
 accept(input: PublicSnapshot) {
  if (this.disposed) throw Error("Controller disposed");
  if (!input.requestId || !input.roundId || !input.rulesVersion || !input.contractVersion) throw Error("Missing recorded identity/config version");
  if (!Number.isSafeInteger(input.revision) || input.revision < 1 || input.releasedThrough !== input.events.length) throw Error("Invalid released prefix");
  for (const key of ["baseBetMinor", "chargeMinor", "visibleWinMinor"] as const) canonicalAmount(input[key]);
  for (const key of ["totalWinMinor", "confirmedBalanceMinor"] as const) if (input[key] !== null) canonicalAmount(input[key]);
  input.events.forEach((event, index) => {
   if (event.eventSeq !== index + 1) throw Error("Non-contiguous event order");
   canonicalAmount(event.deltaWinMinor); canonicalAmount(event.cumulativeWinMinor);
  });
  const previous = this.snapshot;
  if (previous) {
   if (input.roundId !== previous.roundId || input.requestId !== previous.requestId || input.gameId !== previous.gameId || input.rulesVersion !== previous.rulesVersion || input.contractVersion !== previous.contractVersion)
    throw Error("Recorded identity changed");
   if (input.revision <= previous.revision) return false;
   if (input.events.length < previous.events.length || JSON.stringify(input.events.slice(0, previous.events.length)) !== JSON.stringify(previous.events)) throw Error("Recorded prefix changed");
  }
  this.snapshot = structuredClone(input);
  const saved = Number(this.storage?.getItem(this.key(input)) ?? 0);
  this.presentedThrough = Math.min(Number.isSafeInteger(saved) && saved >= 0 ? saved : 0, input.releasedThrough);
  return true;
 }
 get finalAmount() {
  const s = this.snapshot;
  return s?.replayComplete && s.payoutState === "CONFIRMED" ? s.totalWinMinor : null;
 }
 get confirmedBalance() {
  const s = this.snapshot;
  return s?.payoutState === "CONFIRMED" ? s.confirmedBalanceMinor : null;
 }
 get canReplay() { return !this.disposed && !this.playing && !!this.snapshot?.replayComplete && this.snapshot.payoutState === "CONFIRMED"; }
 async present(presentEvent: (event: PublicEvent) => Promise<void>) {
  if (!this.snapshot || this.playing || this.disposed) return;
  this.playing = true;
  const generation = this.generation;
  try {
   for (const event of this.snapshot.events) {
    if (event.eventSeq <= this.presentedThrough) continue;
    await presentEvent(structuredClone(event));
    if (generation !== this.generation || this.disposed) return;
    this.presentedThrough = event.eventSeq;
    this.storage?.setItem(this.key(this.snapshot), String(this.presentedThrough));
   }
  } finally { if (generation === this.generation) this.playing = false; }
 }
 resetPresentation() {
  if (!this.snapshot || this.playing || this.disposed) throw Error("Cannot replay during playback");
  this.storage?.removeItem(this.key(this.snapshot)); this.presentedThrough = 0;
 }
 dispose() { this.disposed = true; this.generation++; this.playing = false; }
}
