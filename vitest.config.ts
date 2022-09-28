import { resolve } from "path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    root: resolve(__dirname),
    globals: true,
    environment: "jsdom",
    outputTruncateLength: 1000,
    coverage: {
      reporter: ["text", "json-summary", "json", "html"],
    },
  },
});
