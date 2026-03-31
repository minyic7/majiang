import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/majiang/",
  server: {
    port: 3002,
    proxy: {
      "/majiang/api": {
        target: "http://localhost:7702",
        rewrite: (path) => path.replace(/^\/majiang/, ""),
      },
      "/majiang/socket.io": {
        target: "http://localhost:7702",
        ws: true,
        rewrite: (path) => path.replace(/^\/majiang/, ""),
      },
    },
  },
});
