/** Placeholder rendering only. Amounts, results and payment remain server-owned. */
export function createRenderer(board) {
  let finish;
  function render(event) {
    const cells = event.grid.flatMap((row, r) => row.map((symbol, c) => {
      const cell = document.createElement('span');
      cell.textContent = symbol;
      cell.setAttribute('aria-label', `${c + 1}열 ${r + 1}행 ${symbol}`);
      return cell;
    }));
    board.replaceChildren(...cells);
  }
  return {
    render,
    async play(event, { signal }) {
      render(event); board.classList.add('playing');
      await new Promise(resolve => {
        const done = () => { clearTimeout(timer); signal.removeEventListener('abort', done); finish = null; resolve(); };
        const timer = setTimeout(done, 1800);
        finish = done;
        if (signal.aborted) done();
        else signal.addEventListener('abort', done, { once: true });
      });
      board.classList.remove('playing');
    },
    skip() { finish?.(); },
    dispose() { finish?.(); },
  };
}
