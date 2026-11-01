import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";
import { createServer } from "vite";

test("middleware tests use a different dependency cache than the browser dev server", async () => {
  const server = await createServer({
    server: { middlewareMode: true, ws: false },
    appType: "custom",
  });
  try {
    const cache = path.relative(server.config.root, server.config.cacheDir).replaceAll("\\", "/");
    assert.match(cache, /^node_modules\/\.vite-tests\/\d+$/);
    assert.notEqual(server.config.cacheDir, path.resolve(server.config.root, "node_modules/.vite"));
    await server.ssrLoadModule("/src/pages/landing/StudentDashboardPreview.jsx");
  } finally {
    await server.close();
  }
});
