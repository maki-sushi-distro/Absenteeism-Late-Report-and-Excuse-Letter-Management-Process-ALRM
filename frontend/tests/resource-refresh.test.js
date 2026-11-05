import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

let server;
let ResourceRefresh;

before(async () => {
  server = await createServer({ server: { middlewareMode: true, ws: false }, appType: "custom" });
  ResourceRefresh = (await server.ssrLoadModule("/src/components/common/ResourceRefresh.jsx")).default;
});

after(async () => { await server?.close(); });

test("shared refresh control omits timestamps while retaining the action", () => {
  const html = renderToStaticMarkup(React.createElement(ResourceRefresh, {
    updatedAt: new Date("2026-11-05T11:26:00+08:00"),
    loading: false,
    onRefresh() {},
  }));

  assert.match(html, /Refresh<\/button>/);
  assert.doesNotMatch(html, /Last updated|Not loaded yet/);
});
