import vue from "@astrojs/vue";
import { defineConfig } from "astro/config";

export default defineConfig({
  integrations: [vue()],
  output: "static",
  site: "https://www.hangge.xyz",
  vite: {
    server: {
      proxy: {
        "/api": "http://127.0.0.1:8080",
      },
    },
  },
});
