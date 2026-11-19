// simulator-v1 balances are exact JSON integers; bet/award caps are separate.
export const MAX_WALLET_BALANCE_MINOR = Number.MAX_SAFE_INTEGER;
export const isWalletBalance = value => Number.isSafeInteger(value) && value >= 0 && value <= MAX_WALLET_BALANCE_MINOR;
export const formatWalletBalance = value => isWalletBalance(value) ? value.toLocaleString('ko-KR') : '—';
