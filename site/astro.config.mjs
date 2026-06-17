// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import svgr from "vite-plugin-svgr";

import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  integrations: [react(), sitemap()],
  redirects: {
    "/tools/mp4-to-wav": "/audio/mp4-to-wav",
  },
  site: 'https://luma.pub',
  vite: {
    plugins: [tailwindcss(), svgr()],
    optimizeDeps: {
      exclude: ["@ffmpeg/ffmpeg", "@ffmpeg/util"],
    },
    server: {
      allowedHosts: ["omarchy.tail1eb3a2.ts.net"],
    },
  },
});
