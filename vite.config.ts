import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

const isCapacitor = process.env.CAPACITOR_BUILD === "true";

// https://vitejs.dev/config/
export default defineConfig({
  base: isCapacitor ? "./" : "/Personal-Performance-System/",
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react({
      disableOxcRecommendation: true,
    }),
    {
      name: "rolldown-jsx-warning-fix",
      enforce: "post",
      config(cfg) {
        if (cfg.optimizeDeps?.rollupOptions) {
          if ("jsx" in (cfg.optimizeDeps.rollupOptions as any)) {
            delete (cfg.optimizeDeps.rollupOptions as any).jsx;
          }
          if (Object.keys(cfg.optimizeDeps.rollupOptions).length === 0) {
            delete (cfg.optimizeDeps as any).rollupOptions;
          }
        }
      },
      configResolved(config) {
        if (config.optimizeDeps?.rollupOptions) {
          if ("jsx" in (config.optimizeDeps.rollupOptions as any)) {
            delete (config.optimizeDeps.rollupOptions as any).jsx;
          }
          if (Object.keys(config.optimizeDeps.rollupOptions).length === 0) {
            delete (config.optimizeDeps as any).rollupOptions;
          }
        }
        if ((config.optimizeDeps as any)?.rolldownOptions && "jsx" in (config.optimizeDeps as any).rolldownOptions) {
          delete (config.optimizeDeps as any).rolldownOptions.jsx;
        }
      },
    },
    VitePWA({
      disable: isCapacitor || process.env.NODE_ENV === "development",
      devOptions: {
        enabled: false,
      },
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "masked-icon.svg"],
      manifest: {
        name: "PPS - Personal Performance System",
        short_name: "PPS",
        description: "Gamified habit tracker and personal performance system by UpaLakshya Labs",
        theme_color: "#6366f1",
        background_color: "#0f0f14",
        display: "standalone",
        lang: "en",
        dir: "ltr",
        categories: ["productivity", "lifestyle", "education"],
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
        shortcuts: [
          {
            name: "Dashboard",
            short_name: "Dashboard",
            description: "Open your daily performance dashboard",
            url: "#/dashboard",
            icons: [{ src: "pwa-192x192.png", sizes: "192x192" }],
          },
          {
            name: "Focus Timer",
            short_name: "Focus",
            description: "Start a focus sprint",
            url: "#/dashboard?section=tracker",
            icons: [{ src: "pwa-192x192.png", sizes: "192x192" }],
          },
          {
            name: "Settings",
            short_name: "Settings",
            description: "Open app settings",
            url: "#/settings",
            icons: [{ src: "pwa-192x192.png", sizes: "192x192" }],
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes("node_modules")) {
            if (id.includes("jspdf") || id.includes("html2canvas")) return "pdf";
            if (id.includes("recharts") || id.includes("d3-")) return "charts";
            if (id.includes("framer-motion")) return "motion";
            if (id.includes("@radix-ui") || id.includes("cmdk") || id.includes("vaul")) return "ui";
            if (id.includes("lucide-react")) return "icons";
            if (id.includes("@supabase")) return "supabase";
            if (id.includes("react") || id.includes("react-dom") || id.includes("react-router")) return "vendor";
          }
        },
      },
    },
  },
});