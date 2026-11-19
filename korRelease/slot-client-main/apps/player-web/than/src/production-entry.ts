// Production entry deliberately has no fixture imports and no development adapter.
import "./shell.css";
const root = document.querySelector<HTMLElement>("#app")!;
root.innerHTML = `<main class="integration"><h1>fw-pixi client</h1><p>Client integration is not configured.</p></main>`;
