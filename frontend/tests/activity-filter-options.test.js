import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { createServer } from "vite";

let server;
let ActivityTable;

before(async () => {
  server = await createServer({
    server: { middlewareMode: true, ws: false },
    appType: "custom",
    plugins: [{
      name: "activity-filter-options",
      enforce: "pre",
      transform(_code, id) {
        if (!id.replaceAll("\\", "/").endsWith("/src/components/common/FilterMenu.jsx")) return undefined;
        return `
          import React from "react";
          export function RadioFilterGroup({ name, label, options }) {
            return React.createElement("fieldset", { "aria-label": label }, options.map(option =>
              React.createElement("input", { key: option.value, type: "radio", name: \`user-filter-\${name}\`, value: option.value })
            ));
          }
          export default function FilterMenu({ children }) {
            return React.createElement("div", null, children);
          }
        `;
      },
    }],
  });
  ({ default: ActivityTable } = await server.ssrLoadModule("/src/components/common/ActivityTable.jsx"));
});

after(async () => {
  await server?.close();
});

test("activity action filter omits unsupported and retired choices without hiding audit rows", () => {
  const rows = [
    { id: "updated", action: "Updated", date: "2026-11-05T08:00:00Z" },
    { id: "cancelled", action: "Cancelled", date: "2026-11-05T09:00:00Z" },
  ];
  const html = renderToStaticMarkup(
    React.createElement(MemoryRouter, null,
      React.createElement(ActivityTable, { rows, viewKey: "test:activity-filter-options" })),
  );
  const actionInputs = [...html.matchAll(/<input\b[^>]*name="user-filter-action"[^>]*>/g)];
  const optionValues = actionInputs.map(([input]) => input.match(/value="([^"]*)"/)?.[1] ?? "");

  assert.deepEqual(optionValues, ["", "Submitted", "Followed up", "Approved", "Denied", "Resolved"]);
  assert.match(html, />Updated</);
  assert.match(html, />Cancelled</);
});
