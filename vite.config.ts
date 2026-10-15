import vinext from "vinext";
import { defineConfig } from "vite";
export default defineConfig({
  server: {
    port: 5173,
  },
  plugins: [vinext()],
  ssr: { external: ["cloudflare:workers"] },
  build: { rolldownOptions: { external: ["cloudflare:workers"] } },
});
