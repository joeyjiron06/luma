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
      if (
        req.url?.includes(
          "models/deepfilter-standalone/models/DeepFilterNet3_onnx.tar.gz"
        )
      ) {
        try {
          const bytes = await fs.readFile(
            path.join(deepFilterPublicRoot, "models/DeepFilterNet3_onnx.tar.gz")
          );
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/gzip");
          res.setHeader("Content-Length", String(bytes.length));
          // Important: do not send Content-Encoding for .tar.gz here.
          res.end(bytes);
          return;
        } catch {
          res.statusCode = 404;
          res.end("DeepFilter asset not found");
          return;
        }
      }

      return next();
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

  assetsInclude: ["**/*.onnx"],

  // ffmpeg.wasm uses a runtime worker entry that can break when pre-bundled by Vite.
  optimizeDeps: {
    exclude: [
      "@ffmpeg/ffmpeg",
      "@ffmpeg/util",
      "@ffmpeg/core",
      "onnxruntime-web",
    ],
  },
}));
