export function canonicalAmount(value: unknown): asserts value is string {
 if (typeof value !== "string" || !/^(0|[1-9][0-9]*)$/.test(value)) throw Error("Invalid canonical amount string");
}
/** Formatting only: never derives an award, charge or wallet balance. */
export function formatAmount(value: string | null, currency: string, exponent: number) {
 if (value === null) return "—";
 canonicalAmount(value);
 if (!Number.isInteger(exponent) || exponent < 0 || exponent > 8) throw Error("Invalid currency exponent");
 const digits = value.padStart(exponent + 1, "0");
 const whole = exponent ? digits.slice(0, -exponent) : digits;
 const fraction = exponent ? "." + digits.slice(-exponent) : "";
 return (currency === "KRW" ? "₩" : currency + " ") + whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + fraction;
}
