import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import { initialForm } from "../src/pages/auth/student/request-form/constants.js";

let server;
before(async () => { server = await createServer({ server: { middlewareMode: true, ws: false }, appType: "custom" }); });
after(async () => { await server?.close(); });

async function renderAttachment(file = null) {
  const Step = (await server.ssrLoadModule("/src/pages/auth/student/request-form/steps/AttachmentStep.jsx")).default;
  return renderToStaticMarkup(React.createElement(Step, { step: 5,
    form: { ...initialForm, requestType: "late", evidenceFile: file }, user: {},
    updateField() {}, toggleListField() {},
  }));
}

test("an empty attachment area shows the drop prompt and chooser", async () => {
  const html = await renderAttachment();
  assert.match(html, /Drag and drop your file here/);
  assert.match(html, />Choose file</);
  assert.doesNotMatch(html, /aria-label="Remove file"/);
});

test("a selected image replaces the drop prompt with a visible preview and file actions", async () => {
  const html = await renderAttachment(new File(["selected image"], "proof.png", { type: "image/png" }));
  assert.doesNotMatch(html, /Drag and drop your file here|>Choose file</);
  assert.match(html, /<img[^>]*alt="Preview of proof.png"/);
  for (const text of ["proof.png", ">Preview<", ">Change<", 'aria-label="Remove file"']) assert.ok(html.includes(text), text);
});

test("a selected PDF replaces the drop prompt with a safe document preview and download", async () => {
  const html = await renderAttachment(new File(["%PDF-1.7"], "proof.pdf", { type: "application/pdf" }));
  assert.doesNotMatch(html, /Drag and drop your file here|>Choose file</);
  assert.match(html, /aria-label="Preview of proof.pdf"/);
  assert.match(html, />Download</);
  assert.match(html, />Change</);
  assert.doesNotMatch(html, /<(iframe|embed|object)\b/);
});
