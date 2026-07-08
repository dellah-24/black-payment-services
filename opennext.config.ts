import { defineCloudflareConfig } from "opennextjs-cloudflare";

export default defineCloudflareConfig({
  // The app uses Node.js built-ins (crypto, stream) so we rely on the
  // Node.js runtime via `nodejs_compat` (set in wrangler.toml) rather than
  // the Edge Runtime. OpenNext supports this out of the box.
});
