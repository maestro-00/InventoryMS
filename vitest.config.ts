import { defineConfig } from "vitest/config";
import path from "node:path";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@app": path.resolve(import.meta.dirname, "src/app"),
      "@features": path.resolve(import.meta.dirname, "src/features"),
      "@shared": path.resolve(import.meta.dirname, "src/shared"),
      "@routes": path.resolve(import.meta.dirname, "src/routes"),
    },
  },
  test: {
    environment: "jsdom",
    globals: false,
    setupFiles: ["src/shared/test/setup.ts"],
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "tests/**/*.test.ts"],
    exclude: ["tests/e2e/**", "tests/visual/**", "node_modules/**"],
    retry: 0,
    testTimeout: 20000,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/shared/api/generated/**",
        "src/routeTree.gen.ts",
        "src/**/*.test.ts",
        "src/**/*.test.tsx",
        "src/shared/test/**",
        "src/app/service-worker.ts",
        "src/main.tsx",
        // Thin route shells and camera/workspace chrome are covered by Playwright criticals.
        "src/routes/**",
        "src/features/pos/pos-workspace.tsx",
        "src/features/pos/acquisition/camera-scanner.tsx",
        "src/features/pos/checkout/payment-panel.tsx",
        "src/features/registers/shifts/open-shift-resume-store.ts",
        "src/shared/ui/alert-dialog.tsx",
        "src/shared/ui/checkbox.tsx",
        "src/shared/ui/dialog.tsx",
        "src/shared/ui/dropdown-menu.tsx",
        "src/shared/ui/form.tsx",
        "src/shared/ui/popover.tsx",
        "src/shared/ui/radio-group.tsx",
        "src/shared/ui/scroll-area.tsx",
        "src/shared/ui/select.tsx",
        "src/shared/ui/switch.tsx",
        "src/shared/ui/table.tsx",
        "src/shared/ui/tabs.tsx",
      ],
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 80,
        statements: 85,
        "src/shared/money/**.{ts,tsx}": {
          lines: 95,
          branches: 90,
          functions: 95,
          statements: 95,
        },
        "src/shared/auth/access-policy.ts": {
          lines: 95,
          branches: 90,
          functions: 95,
          statements: 95,
        },
        "src/features/pos/checkout/online-checkout.ts": {
          lines: 95,
          branches: 90,
          functions: 95,
          statements: 95,
        },
        "src/features/pos/checkout/offline-checkout.ts": {
          lines: 95,
          branches: 90,
          functions: 95,
          statements: 95,
        },
      },
    },
  },
});
