export interface PublicEvent {
 eventSeq: number; kind: string; deltaWinMinor: string; cumulativeWinMinor: string;
 grid?: string[][];
 wins?: { lineId: number; positions: [number, number][]; rawWinMinor: string }[];
 [field: string]: unknown;
}
export interface PublicSnapshot {
 contractVersion: string; requestId: string; roundId: string; revision: number;
 gameId: string; rulesVersion: string; modeId: string;
 currency: string; currencyExponent: number; baseBetMinor: string; chargeMinor: string;
 debitState: string; resultState: string; payoutState: string;
 releasedThrough: number; replayComplete: boolean; events: PublicEvent[];
 visibleWinMinor: string; totalWinMinor: string | null; confirmedBalanceMinor: string | null;
}
export interface CursorStore { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void }
