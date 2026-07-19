import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({
  // The app uses Node.js built-ins (crypto, stream, async_hooks, fs, path, ...)
  // so we rely on the Node.js runtime via `nodejs_compat`. This is applied via
  // `compatibility_flags = ["nodejs_compat"]` in `wrangler.toml` for the
  // Cloudflare **Workers** deployment. The OpenNext build produces
  // `.open-next/worker.js` (the Worker entry) plus static assets in
  // `.open-next/assets`, served through the `ASSETS` binding with
  // `run_worker_first = true`.
});
