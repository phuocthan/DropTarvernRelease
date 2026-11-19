import type { ResourceManifest } from "../resources/contracts.ts";
import type { LandingMotion } from "../presentation/landing-motion.ts";
export type Board = string[][];
export type Position = { reel: number; row: number };
/** Positions are presentation input only; no payout evaluation is performed. */
export interface LineWin { line: number; symbol: string; positions: Position[]; amount?: never }
export type ReelMotion = "normal" | "drop";
export type SymbolLandingEffects = Record<string, string>;
export interface BrandLoadingConfig {
  background: string;
  brandLogo: string;
  brandName: string;
  gameLogo: string;
  brandIntro?: { src: string; durationMs: number; holdUntilReady?: boolean };
}
export interface DropTiming {
  fallMs: number;
  reelStaggerMs: number;
  rowStaggerMs: number;
  holdMs: number;
}
export interface DropAnticipation {
  symbolId: string;
  count: number;
  reelPauseMs: number;
}
export interface ReelPresentation {
  allowForceStop?: boolean;
  foregroundWinSymbols?: string[];
  winOverflowPaddingPx?: number;
  landing?: LandingMotion;
  spinType: ReelMotion;
  cellSizePx: number;
  gapPx: number;
  symbolEdgeInsetPx?: number;
  reelMaskPaddingPx?: number;
  winDimmerOpacity?: number;
  symbolLandingEffects?: Record<string, SymbolLandingEffects>;
  loadingScreen?: BrandLoadingConfig;
  controls?: { menu: boolean; autoRounds: number[]; autoUnlimited?: boolean; autoTopUp?: number; betMenuCloseDelayMs?: number };
  checkWinDelayMs?: { normal: number; turbo: number };
  animationGrid?: { originSlot: string; reelPitch: number; rowPitch: number };
  scene?: {
    layers: Record<string, number>;
    slots: Record<string, string>;
    openingDimmerOpacity?: number;
    openingReveal?: { durationMs: number; symbolDelayMs: number; mascotDelayMs: number; playbackRate?: number };
    winScreen?: { centerY: number; paddingPx: number; landscapeFit: number; portraitFit: number };
    chestCamera?: { scale: number; originY: number; durationMs: number };
    sideLogo?: { referenceAspect: number; leftFactor: number; upFactor: number };
    backgroundCamera?: {
      width: number;
      top: number;
      landscapeBottom: number;
      portraitBottom: number;
      centerOffsetX: number;
    };
  };
  feature?: {
    startDelayMs: number;
    endDelayMs: number;
    hideSymbolsUntilFirstSpin?: boolean;
  };
  normal: {
    speedPxPerSecond: number;
    turboSpeedPxPerSecond: number;
    stopDelayMs: number;
    turboStopDelayMs: number;
    bounceMs: number;
    bouncePx: number;
  };
  drop: {
    exit: DropTiming;
    enter: DropTiming;
    bounceMs: number;
    bouncePx: number;
    turboMultiplier: number;
    anticipation?: DropAnticipation;
  };
}
export interface GameDefinition {
 schemaVersion: 1; id: string; title: string; reels: number; rows: number;
 initialBoard: Board; lines: number[][];
 symbols: { id: string; label: string; glyph: string; color: string }[];
 presentation: ReelPresentation; resources?: ResourceManifest;
}
