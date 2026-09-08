import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    // Vite 8 blocks unknown Host headers. Cloud preview and some tunnels
    // (Cursor, ngrok) fail with "Blocked request. This host is not allowed"
    // unless this is set.
    allowedHosts: true,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on("error", (_err, _req, res) => {
            if (res && "writeHead" in res && !res.headersSent) {
              res.writeHead(502, { "Content-Type": "application/json" });
              res.end(
                JSON.stringify({
                  error:
                    "Backend unreachable. Start it with: cd backend && npm run dev",
                })
              );
            }
          });
        },
      },
    },
  },
})
