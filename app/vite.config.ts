import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";

const host = process.env.TAURI_DEV_HOST;

const currentFile = fileURLToPath(import.meta.url);
const __dirname = path.dirname(currentFile);
const deepFilterPublicRoot = path.resolve(
  __dirname,
  "./public/models/deepfilter-standalone"
);

const deepFilterLocalAssetPlugin = {
  name: "deepfilter-local-asset-plugin",
  configureServer(server: import("vite").ViteDevServer) {
    server.middlewares.use(async (req, res, next) => {
      const reqUrl = req.url ?? "";
      const mapping: Record<string, { filePath: string; contentType: string }> =
        {
          "/deepfilter-local/pkg/df_bg.wasm": {
            filePath: path.join(deepFilterPublicRoot, "pkg/df_bg.wasm"),
            contentType: "application/wasm",
          },
          "/deepfilter-local/models/DeepFilterNet3_onnx.tar.gz": {
            filePath: path.join(
              deepFilterPublicRoot,
              "models/DeepFilterNet3_onnx.tar.gz"
            ),
            contentType: "application/gzip",
          },
        };

      const asset = mapping[reqUrl];
      if (!asset) {
        next();
        return;
      }

      try {
        const bytes = await fs.readFile(asset.filePath);
        res.statusCode = 200;
        res.setHeader("Content-Type", asset.contentType);
        res.setHeader("Content-Length", String(bytes.length));
        // Important: do not send Content-Encoding for .tar.gz here.
        res.end(bytes);
      } catch {
        res.statusCode = 404;
        res.end("DeepFilter asset not found");
      }
    });
  },
};

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react(), tailwindcss(), deepFilterLocalAssetPlugin],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cross-Origin-Resource-Policy": "cross-origin",
      "Access-Control-Allow-Origin": "*",
    },
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  // ffmpeg.wasm uses a runtime worker entry that can break when pre-bundled by Vite.
  optimizeDeps: {
    exclude: ["@ffmpeg/ffmpeg", "@ffmpeg/util", "@ffmpeg/core"],
  },
}));
