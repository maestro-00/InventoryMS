import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
      routesDirectory: "src/routes",
      generatedRouteTree: "src/routeTree.gen.ts",
    }),
    react(),
    tailwindcss(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src/app",
      filename: "service-worker.ts",
      injectRegister: false,
      registerType: "prompt",
      manifest: false,
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,svg,ico,webmanifest,woff2,png}"],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@app": path.resolve(import.meta.dirname, "src/app"),
      "@features": path.resolve(import.meta.dirname, "src/features"),
      "@shared": path.resolve(import.meta.dirname, "src/shared"),
      "@routes": path.resolve(import.meta.dirname, "src/routes"),
    },
  },
  build: {
    target: "es2022",
    sourcemap: true,
    modulePreload: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/@zxing")) {
            return "scanner";
          }
          if (id.includes("node_modules/recharts")) {
            return "charts";
          }
          if (id.includes("node_modules/@tanstack/react-table")) {
            return "table";
          }
          if (
            id.includes("node_modules/@radix-ui") ||
            id.includes("node_modules/lucide-react") ||
            id.includes("node_modules/class-variance-authority") ||
            id.includes("node_modules/clsx") ||
            id.includes("node_modules/tailwind-merge")
          ) {
            return "ui-vendor";
          }
          if (
            id.includes("node_modules/react-dom") ||
            id.includes("node_modules/react/") ||
            id.includes("node_modules/scheduler")
          ) {
            return "react-vendor";
          }
          if (
            id.includes("node_modules/@tanstack/react-query") ||
            id.includes("node_modules/@tanstack/react-router") ||
            id.includes("node_modules/@tanstack/router-core")
          ) {
            return "tanstack";
          }
          if (
            id.includes("node_modules/zod") ||
            id.includes("node_modules/decimal.js") ||
            id.includes("node_modules/openapi-fetch")
          ) {
            return "data-vendor";
          }
        },
      },
    },
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    headers: {
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "X-Frame-Options": "DENY",
    },
  },
  preview: {
    headers: {
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "X-Frame-Options": "DENY",
      "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
    },
  },
});
