import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  // Cổng mặc định 3000 để khớp link trong email BE (vd: http://localhost:3000/auth/verify-email?token=...)
  // Đổi cổng: `npm run dev -- --port 5173`
  server: {
    port: 3000,
    strictPort: false,
  },
});
