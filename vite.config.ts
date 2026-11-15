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
    react(),
    VitePWA({
      disable: isCapacitor || process.env.NODE_ENV === "development",
      devOptions: {
        enabled: false,
      },
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "masked-icon.svg"],
      manifest: {
        name: "Personal Performance System",
        short_name: "PPS",
        description: "Gamified habit tracking and personal performance system",
        theme_color: "#6366f1",
        background_color: "#0f172a",
        display: "standalone",
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
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