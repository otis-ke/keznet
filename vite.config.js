import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { BASE_PATH } from "./src/lib/seo.js";

// Two pages: the shop (index.html) and the price editor (prices.html).
// base "/" because the site is served from the root of otishub.online;
// pages like /p/<id>/ and /c/<slug>/ need absolute asset paths.
export default defineConfig({
  base: BASE_PATH,
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, "index.html"),
        prices: resolve(import.meta.dirname, "prices.html"),
      },
    },
  },
});
