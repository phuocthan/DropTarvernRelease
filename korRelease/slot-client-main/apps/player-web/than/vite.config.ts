import { defineConfig, type Plugin } from "vite";
import { readFileSync, createReadStream } from "node:fs";
import { cp, mkdir } from "node:fs/promises";
import { resolve, extname } from "node:path";
const gameRoot = resolve(import.meta.dirname, "../../../games/slot-001/client/than");
const inventory = JSON.parse(readFileSync(resolve(gameRoot, "ASSET_INVENTORY.json"), "utf8"));
const names = new Set<string>(inventory.files.map((file: { path: string }) => file.path));
const mime: Record<string,string> = { ".json":"application/json", ".svg":"image/svg+xml", ".webp":"image/webp", ".png":"image/png", ".gif":"image/gif", ".woff2":"font/woff2", ".xml":"text/xml", ".atlas":"text/plain", ".ogg":"audio/ogg", ".mp3":"audio/mpeg", ".skel":"application/octet-stream" };
function reviewAssets(): Plugin {
 return {
  name: "than-explicit-review-asset-allowlist",
  configureServer(server) {
   server.middlewares.use((req, res, next) => {
    if (!req.url?.startsWith("/game-assets/")) return next();
    const name = decodeURIComponent(req.url.slice(13).split("?")[0]);
    if (!names.has(name)) { res.statusCode=404; res.end("Not allowlisted"); return; }
    const file = resolve(gameRoot, "assets/runtime", name);
    res.setHeader("Content-Type", mime[extname(file)] ?? "application/octet-stream");
    createReadStream(file).pipe(res);
   });
  },
  async writeBundle() {
   for (const name of names) {
    if (name.includes("..") || name.startsWith("/") || name.includes("\\")) throw Error("Unsafe asset name");
    const target = resolve(import.meta.dirname, "dist/mock/game-assets", name);
    await mkdir(resolve(target, ".."), { recursive: true });
    await cp(resolve(gameRoot, "assets/runtime", name), target);
   }
  },
 };
}
export default defineConfig(({mode, command}) => ({
 base: "./", publicDir: false,
 resolve: { alias: { "@game":gameRoot, "@core":resolve(import.meta.dirname,"src") }, dedupe:["pixi.js","@esotericsoftware/spine-pixi-v8"] },
 server: { fs: { allow:[resolve(import.meta.dirname,"../../..")] } },
 plugins: mode === "mock" || command === "serve" ? [reviewAssets()] : [],
 build: { outDir: `dist/${mode === "mock" ? "mock" : "production"}`, emptyOutDir: true,
  rollupOptions: { input: mode === "mock" ? resolve(import.meta.dirname,"mock.html") : { index:resolve(import.meta.dirname,"index.html"),core:resolve(import.meta.dirname,"src/index.ts") }, output:{ entryFileNames:chunk=>chunk.name==="core"?"fw-pixi.js":"assets/[name]-[hash].js" } } },
}));
