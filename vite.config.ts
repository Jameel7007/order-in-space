import { defineConfig } from "vite";

export default defineConfig(({ command }) => ({
  base: command === "build" ? "/order-in-space/" : "/",
  server: {
    host: "127.0.0.1",
  },
  preview: {
    host: "127.0.0.1",
  },
}));
