import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({
  // The app uses Node.js built-ins (crypto, stream, async_hooks, fs, path, ...)
  // so we rely on the Node.js runtime via `nodejs_compat`. For the live
  // Cloudflare **Pages** project, `nodejs_compat` is applied via the Pages
  // project's compatibility settings (Dashboard → Settings → Functions →
  // Compatibility flags), NOT wrangler.toml. Keep that flag enabled on the
  // project. `scripts/prepare-pages.mjs` (run by `pnpm run build:pages`) copies
  // the OpenNext worker runtime into `.open-next/assets/_worker.js` for Pages.
});
