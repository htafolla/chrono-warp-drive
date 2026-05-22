import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  worker: {
    // IIFE format is REQUIRED for the neural.worker.ts + solarWorkerUtils setup.
    // It lets us keep normal ESM imports in the worker source while still
    // producing a classic script that can use self.importScripts() for the
    // TF.js CDN bundle at runtime. See detailed contract in src/lib/neuralWorker.ts.
    format: 'iife',
  },
}));
