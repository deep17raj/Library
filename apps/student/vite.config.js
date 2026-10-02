import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// One build serves every library. Express serves its files at /student/* and the app
// itself at /s/<slug>/ (server/src/static/serveStudentApp.js). Dev works the same way:
// open http://localhost:5174/s/<slug>/ — page loads under /s/ get this index.html,
// and /api plus each library's manifest/icons are proxied to the Express server.
function libraryPagesInDev() {
  return {
    name: "library-pages-in-dev",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const wantsPage = (req.headers.accept || "").includes("text/html");
        if (req.method === "GET" && wantsPage && /^\/s\/[a-z0-9-]+(\/|$|\?)/.test(req.url)) {
          req.url = "/student/index.html";
        }
        next();
      });
    },
  };
}

export default defineConfig({
  base: "/student/",
  plugins: [react(), libraryPagesInDev()],
  build: { outDir: "dist", emptyOutDir: true },
  server: {
    port: 5174,
    proxy: {
      "/api": "http://localhost:5060",
      "/files": "http://localhost:5060",
      "^/s/[a-z0-9-]+/(manifest\\.webmanifest|icon-[a-z0-9-]+\\.png)": "http://localhost:5060",
    },
  },
});
