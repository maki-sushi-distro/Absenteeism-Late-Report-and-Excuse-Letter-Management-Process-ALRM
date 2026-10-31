import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import React from "react";
import { createServer } from "vite";

let server, HttpErrorPage;

before(async () => {
  server = await createServer({
    server: { middlewareMode: true, ws: false },
    appType: "custom",
    plugins: [{
      name: "http-error-page-test-context",
      enforce: "pre",
      transform(code, id) {
        if (!id.replaceAll("\\", "/").endsWith("/src/pages/HttpErrorPage.jsx")) return;
        return code
          .replace('import { useLocation, useNavigate } from "react-router-dom";', 'const useLocation = () => ({ pathname: "/500" }); const useNavigate = () => globalThis.__httpErrorNavigate;')
          .replace('import { useAuth } from "@/context/AuthContext";', 'const useAuth = () => ({ user: null });');
      },
    }],
  });
  HttpErrorPage = (await server.ssrLoadModule("/src/pages/HttpErrorPage.jsx")).default;
});

after(async () => { await server?.close(); });

function nodes(element) {
  if (!React.isValidElement(element)) return [];
  return [element, ...React.Children.toArray(element.props.children).flatMap(nodes)];
}

test("the 500-page sign-in action resets the error boundary with a hard redirect", () => {
  const hardRedirects = [];
  const spaNavigations = [];
  const originalWindow = globalThis.window;
  globalThis.__httpErrorNavigate = destination => spaNavigations.push(destination);
  globalThis.window = { location: { reload() {}, assign: destination => hardRedirects.push(destination) } };
  try {
    const page = HttpErrorPage({ status: 500 });
    const button = nodes(page).find(node => React.Children.toArray(node.props.children).includes("Go to sign in"));
    button.props.onClick();
    assert.deepEqual(hardRedirects, ["/login"]);
    assert.deepEqual(spaNavigations, []);
  } finally {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
    delete globalThis.__httpErrorNavigate;
  }
});
