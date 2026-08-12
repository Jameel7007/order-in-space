import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@order-in-space/geometry": fileURLToPath(new URL("./packages/geometry/src/index.ts", import.meta.url)),
      "@order-in-space/render": fileURLToPath(new URL("./packages/render/src/index.ts", import.meta.url)),
      "@order-in-space/scenes": fileURLToPath(new URL("./packages/scenes/src/index.ts", import.meta.url)),
    },
  },
  test: {
    include: ["packages/**/*.test.ts"],
  },
});
