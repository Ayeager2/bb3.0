import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5173,
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
    }
  },
});