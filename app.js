// Entry point for cPanel "Setup Node.js App" (Phusion Passenger). Passenger loads this
// file with require(), but the server is written as ES modules, so it is imported.
import("./server/src/main.js").catch((error) => {
  console.error("Server startup failed:", error);
  process.exit(1);
});
