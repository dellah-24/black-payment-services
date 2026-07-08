// Prepares the OpenNext Cloudflare build output for deployment to
// Cloudflare Pages.
//
// `opennextjs-cloudflare build` produces a Cloudflare Worker
// (`.open-next/worker.js`) plus static assets (`.open-next/assets`).
// Cloudflare Pages deploys the directory referenced by
// `pages_build_output_dir` in wrangler.toml (here: `.open-next/assets`)
// and uses a `_worker.js` inside it as the Pages Functions worker that
// handles every request (API routes + SSR), serving static files through
// the auto-provided `ASSETS` binding.
//
// This script copies the built worker to `.open-next/assets/_worker.js`
// so the Pages build output is complete.

import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const workerSrc = resolve(root, ".open-next", "worker.js");
const assetsDir = resolve(root, ".open-next", "assets");
const workerDest = resolve(assetsDir, "_worker.js");

if (!existsSync(workerSrc)) {
  console.error(
    "[prepare-pages] .open-next/worker.js not found. Run `opennextjs-cloudflare build` first."
  );
  process.exit(1);
}

mkdirSync(assetsDir, { recursive: true });
copyFileSync(workerSrc, workerDest);

console.log(
  `[prepare-pages] Copied .open-next/worker.js -> .open-next/assets/_worker.js`
);
