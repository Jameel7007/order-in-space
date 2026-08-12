import { cloudflare } from "@cloudflare/vite-plugin";
import { defineConfig } from "vite";

import { sites } from "./build/sites-vite-plugin.js";

export default defineConfig({
  plugins: [
    sites(),
    cloudflare({ viteEnvironment: { name: "server" } }),
  ],
  server: {
    host: "127.0.0.1",
  },
  preview: {
    host: "127.0.0.1",
  },
});
