import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Generated acceptance receipts/browser profiles contain locked Windows files.
  // They are not application source and must not enter the development watcher.
  server: { watch: { ignored: ["**/work/**"] } },
});
