import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Lab 2 API fixtures share one isolated PostgreSQL database. Serial file
    // execution prevents a reference-data assertion from observing another
    // test file's temporary fixture before that file has cleaned it up.
    fileParallelism: false,
  },
});
