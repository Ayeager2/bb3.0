import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5174,
    strictPort: true,
    hmr: {
      host: "127.0.0.1",
      protocol: "ws",
      clientPort: 5174,
    },
    proxy: {
      "/state": {
        target: "http://127.0.0.1:31337",
        changeOrigin: true,
      },
      "/events": {
        target: "http://127.0.0.1:31337",
        changeOrigin: true,
      },
      "/topology": {
        target: "http://127.0.0.1:31337",
        changeOrigin: true,
      },
      "/command": {
        target: "http://127.0.0.1:31337",
        changeOrigin: true,
      },
      "/command/status": {
        target: "http://127.0.0.1:31337",
        changeOrigin: true,
      },
      "/reasoning": {
        target: "http://127.0.0.1:31337",
        changeOrigin: true,
      },
      "/reasoning/history": {
        target: "http://127.0.0.1:31337",
        changeOrigin: true,
      },
    }
  },
});
