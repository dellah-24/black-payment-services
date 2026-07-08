// Prepares the OpenNext Cloudflare build output for deployment to
// Cloudflare Pages.
//
// `opennextjs-cloudflare build` produces a Cloudflare Worker entry
// (`.open-next/worker.js`) plus a set of sibling modules it imports
// (`.open-next/cloudflare`, `.open-next/.build`, `.open-next/middleware`,
// `.open-next/server-functions`) and the static assets (`.open-next/assets`).
//
// Cloudflare Pages deploys the directory referenced by `pages_build_output_dir`
// in wrangler.toml (here: `.open-next/assets`) and uses a `_worker.js` inside it
// as the Pages Functions worker that handles every request (API routes + SSR),
// serving static files through the auto-provided `ASSETS` binding.
//
// The OpenNext `worker.js` is NOT a single self-contained bundle — it imports
// its sibling modules via relative paths (e.g. `./cloudflare/images.js`,
// `./.build/durable-objects/queue.js`, `./server-functions/default/handler.mjs`).
// If we only copied `worker.js` into `.open-next/assets/_worker.js`, those
// relative imports would fail to resolve during the Pages Functions build
// ("Could not resolve ..."). So we copy the ENTIRE OpenNext worker runtime
// (everything under `.open-next` except the `assets` directory itself) into
// `.open-next/assets`, placing the entry as `_worker.js`. This keeps every
// relative import resolvable right next to the worker.

import { cpSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const openNextDir = resolve(root, ".open-next");
const assetsDir = resolve(openNextDir, "assets");

if (!existsSync(openNextDir)) {
  console.error(
    "[prepare-pages] .open-next not found. Run `opennextjs-cloudflare build` first."
  );
  process.exit(1);
}

mkdirSync(assetsDir, { recursive: true });

const entries = readdirSync(openNextDir);
for (const entry of entries) {
  // Never copy the assets directory into itself.
  if (entry === "assets") continue;

  const src = join(openNextDir, entry);
  if (entry === "worker.js") {
    // The Pages Functions entry point must be named exactly `_worker.js`.
    cpSync(src, join(assetsDir, "_worker.js"), { recursive: true });
  } else {
    cpSync(src, join(assetsDir, entry), { recursive: true });
  }
}

console.log(
  `[prepare-pages] Prepared Pages output: copied OpenNext worker runtime into ${assetsDir} (entry: _worker.js)`
);
