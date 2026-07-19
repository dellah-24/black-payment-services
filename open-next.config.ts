import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({
  // The app uses Node.js built-ins (crypto, stream, async_hooks, fs, path, ...)
  // so we rely on the Node.js runtime via `nodejs_compat`, which is set in
  // wrangler.toml and applied when deploying as a Cloudflare Worker (the
  // OpenNext for Cloudflare default). Do NOT deploy as a Pages Functions
  // `_worker.js` — the Pages build pipeline ignores `compatibility_flags`
  // from wrangler.toml, causing "Could not resolve 'async_hooks'/'fs'/...".
});
