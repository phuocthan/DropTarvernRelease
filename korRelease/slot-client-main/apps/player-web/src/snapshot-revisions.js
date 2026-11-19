/** Common ordering checks; each registered consumer supplies its own validation. */
export function createSnapshotAcceptor(validate) {
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const requireResult = condition => {
    if (!condition) throw Object.assign(new Error('저장된 판과 응답이 일치하지 않습니다.'), { code: 'INVALID_RESULT' });
  };
  return (previous, incoming) => {
    const next = validate(incoming);
    if (!previous) return next;
    const before = validate(previous);
    for (const key of ['contractVersion', 'gameId', 'ruleVersion', 'currency', 'currencyExponent', 'roundId', 'requestId', 'betMinor']) requireResult(before[key] === next[key]);
    if (next.revision < before.revision) return before;
    if (next.revision === before.revision) { requireResult(same(before, next)); return before; }
    requireResult(next.eventSeq >= before.eventSeq);
    for (let index = 0; index < before.events.length; index++) requireResult(same(before.events[index], next.events[index]));
    requireResult(before.payoutState !== 'CONFIRMED' || (next.payoutState === 'CONFIRMED' && next.balanceMinor === before.balanceMinor && next.roundTotalWinMinor === before.roundTotalWinMinor));
    return next;
  };
}
