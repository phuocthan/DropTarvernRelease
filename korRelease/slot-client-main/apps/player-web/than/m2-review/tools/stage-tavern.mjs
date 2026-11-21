import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const app = new URL("../", import.meta.url);
const game = new URL("../../../../../games/slot-001/client/than/m2/", import.meta.url);
const manifest = JSON.parse(readFileSync(new URL("RUNTIME_MANIFEST.json", game), "utf8"));
const text = /\.(ts|js|mjs|json|md|txt|css|html|xml|atlas|svg)$/;
const safe = (path) => path.split("/").every((part) => /^[\w.-]+$/.test(part) && part !== "." && part !== "..");
for (const { from, to, sha256 } of manifest.files) {
  if (!safe(from) || !safe(to) ||
    !((from.startsWith("assets/") && to === "public/tavern-assets/" + from.slice(7)) ||
      (from.startsWith("source/") && to === "src/games/tavern/" + from.slice(7))))
    throw new Error("Invalid Tavern manifest path");
  const bytes = readFileSync(new URL(from, game));
  const content = text.test(from) ? Buffer.from(bytes.toString("utf8").replaceAll("\r\n", "\n")) : bytes;
  if (createHash("sha256").update(content).digest("hex") !== sha256) throw new Error(`Tavern checksum mismatch: ${from}`);
  const target = fileURLToPath(new URL(to, app));
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(new URL(from, game), target);
}
