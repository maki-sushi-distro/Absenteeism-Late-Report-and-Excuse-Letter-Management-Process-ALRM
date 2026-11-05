import { mockApiFetch } from "./helpers/mockApiFetch.js";
import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, mock, test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import { readFileSync } from "node:fs";
import * as requests from "../src/api/studentRequests.js";

let server;
let originalStorage;
let originalWindow;
const record = { id: "request-one", status: "pending" };
const success = { success: true, message: "Follow-up sent to your instructor.", data: { id: "flag-one", request_id: record.id, status: "open" } };

before(async () => { server = await createServer({ server: { middlewareMode: true, ws: false }, appType: "custom" }); });
after(async () => { await server?.close(); });
beforeEach(() => {
  originalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  originalWindow = globalThis.window;
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: () => "student-session" } });
  globalThis.window = new EventTarget();
});
afterEach(() => {
  mock.restoreAll();
  if (originalStorage) Object.defineProperty(globalThis, "localStorage", originalStorage);
  else delete globalThis.localStorage;
  if (originalWindow === undefined) delete globalThis.window;
  else globalThis.window = originalWindow;
});

test("student follow-up sends an authenticated POST to the registered endpoint without a payload", async () => {
  assert.equal(typeof requests.followUpStudentRequest, "function");
  const controller = new AbortController();
  const fetch = mockApiFetch(async (url, options) => {
    assert.ok(String(url).endsWith("/api/requests/request%2Fone/follow-up"));
    assert.equal(options.method, "POST");
    assert.equal(options.headers.get("Authorization"), null);
    assert.equal(options.body, undefined);
    assert.equal(options.signal, controller.signal);
    return Response.json(success, { status: 201 });
  });
  assert.deepEqual(await requests.followUpStudentRequest("request/one", { signal: controller.signal }), success);
  assert.equal(fetch.mock.callCount(), 1);
});

test("follow-up preserves backend ownership, pending-only and cooldown errors", async () => {
  assert.equal(typeof requests.followUpStudentRequest, "function");
  for (const [status, message] of [[403, "Unauthorized."], [422, "Only pending requests can be followed up."], [429, "You already followed up. You can follow up again in 24 hours."]]) {
    const fetch = mockApiFetch(async () => Response.json({ success: false, message, data: null }, { status }));
    await assert.rejects(requests.followUpStudentRequest(record.id), error => error.status === status && error.message === message);
    fetch.mock.restore();
  }
});

test("follow-up never treats an unsuccessful or malformed 2xx response as a sent reminder", async () => {
  assert.equal(typeof requests.followUpStudentRequest, "function");
  for (const response of [Response.json({ success: false, message: "Unable to create the follow-up." }), Response.json({ success: true, data: null }), new Response("<!doctype html><title>Login</title>", { headers: { "Content-Type": "text/html" } })]) {
    const fetch = mockApiFetch(async () => response);
    await assert.rejects(requests.followUpStudentRequest(record.id));
    fetch.mock.restore();
  }
});

test("follow-up does not retry network failures and passes cancellation to the existing API client", async () => {
  assert.equal(typeof requests.followUpStudentRequest, "function");
  const fetch = mockApiFetch(async () => { throw new TypeError("Failed to fetch"); });
  await assert.rejects(requests.followUpStudentRequest(record.id), /Failed to fetch/);
  assert.equal(fetch.mock.callCount(), 1);
});

test("a successful follow-up starts an exact 24-hour cooldown", async () => {
  const { activeFollowUpCooldown, followUpCooldownExpiresAt } = await server.ssrLoadModule("/src/pages/auth/student/records/useRequestFollowUp.js");
  const sentAt = "2026-10-29T08:00:00.000Z";

  assert.equal(followUpCooldownExpiresAt(sentAt), Date.parse(sentAt) + 24 * 60 * 60 * 1000);
  assert.equal(followUpCooldownExpiresAt(undefined, 1_000), 1_000 + 24 * 60 * 60 * 1000);
  assert.equal(typeof activeFollowUpCooldown, "function");
  assert.equal(activeFollowUpCooldown({ followup_flag: { flagged_date: sentAt } }, Date.parse(sentAt) + 1_000), Date.parse(sentAt) + 24 * 60 * 60 * 1000);
  assert.equal(activeFollowUpCooldown({ followupFlag: { flagged_date: sentAt } }, Date.parse(sentAt) + 25 * 60 * 60 * 1000), null);
});

test("record rows only show the view action", async () => {
  const Actions = (await server.ssrLoadModule("/src/pages/auth/student/records/RecordActions.jsx")).default;
  const props = { record, description: "Math", onView() {} };
  const html = renderToStaticMarkup(React.createElement(Actions, props));
  assert.match(html, /View Record/);
  assert.doesNotMatch(html, /Follow up|lucide-bell-check/);
});

test("record modal shows a text follow-up action without another view action", async () => {
  const Actions = (await server.ssrLoadModule("/src/pages/auth/student/records/RecordActions.jsx")).default;
  const html = renderToStaticMarkup(React.createElement(Actions, { record, description: "Math", onFollowUp() {} }));

  assert.match(html, />Follow up</);
  assert.doesNotMatch(html, /View Record|lucide-bell-check/);
});

test("record modal disables follow-up while refreshing its server cooldown", async () => {
  const Actions = (await server.ssrLoadModule("/src/pages/auth/student/records/RecordActions.jsx")).default;
  const html = renderToStaticMarkup(React.createElement(Actions, { record, onFollowUp() {}, checkingCooldown: true }));

  assert.match(html, /disabled=""/);
  assert.match(html, />Checking follow-up…</);
});

test("a successful server cooldown check is reused when the record modal reopens", async () => {
  const { shouldRefreshFollowUpCooldown } = await server.ssrLoadModule("/src/pages/auth/student/records/useRequestFollowUp.js");
  const checkedRequestIds = new Set();

  assert.equal(typeof shouldRefreshFollowUpCooldown, "function");
  assert.equal(shouldRefreshFollowUpCooldown(record, checkedRequestIds), true);
  checkedRequestIds.add(record.id);
  assert.equal(shouldRefreshFollowUpCooldown(record, checkedRequestIds), false);
  assert.equal(shouldRefreshFollowUpCooldown({ ...record, id: "reviewed", status: "approved" }, checkedRequestIds), false);
});

test("follow-up requires a separate confirmation before it is sent", async () => {
  const ConfirmDialog = (await server.ssrLoadModule("/src/pages/auth/student/records/FollowUpConfirmDialog.jsx")).default;
  const calls = [];
  const node = ConfirmDialog({
    record,
    description: "Digital Citizenship and Online Safety",
    onCancel() { calls.push(["cancel"]); },
    onConfirm(value) { calls.push(["confirm", value]); },
  });
  const elements = [];
  function visit(element) {
    if (!React.isValidElement(element)) return;
    elements.push(element);
    React.Children.forEach(element.props.children, visit);
  }
  visit(node);

  assert.equal(calls.length, 0);
  assert.match(node.props.children.props.className, /max-w-\[560px\]/);
  assert.match(node.props.children.props.className, /sm:p-8/);
  const confirm = elements.find((element) => element.props.children === "Send follow-up");
  assert.ok(confirm);
  confirm.props.onClick();
  assert.deepEqual(calls, [["confirm", record]]);
  node.props.onOpenChange(false);
  assert.deepEqual(calls, [["confirm", record], ["cancel"]]);
});

test("follow-up feedback uses the shared toast instead of an inline notice", () => {
  const main = readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");
  const records = readFileSync(new URL("../src/pages/auth/student/StudentRecords.jsx", import.meta.url), "utf8");
  const followUp = readFileSync(new URL("../src/pages/auth/student/records/useRequestFollowUp.js", import.meta.url), "utf8");

  assert.match(main, /<Toaster>/);
  assert.match(followUp, /toast\.add\(/);
  assert.doesNotMatch(records, /FollowUpNotice/);
});

test("sending shows a spinner only for the active row and disables follow-ups on other rows", async () => {
  const Actions = (await server.ssrLoadModule("/src/pages/auth/student/records/RecordActions.jsx")).default;
  const props = { record, onView() {}, onFollowUp() {}, followingUpId: record.id };
  const active = renderToStaticMarkup(React.createElement(Actions, props));
  assert.match(active, /aria-busy="true"/);
  assert.match(active, /animate-spin/);
  assert.match(active, /disabled=""/);
  const other = renderToStaticMarkup(React.createElement(Actions, { ...props, record: { ...record, id: "another-request" } }));
  assert.match(other, /disabled=""/);
  assert.doesNotMatch(other, /animate-spin/);
});

test("cooldown replaces the follow-up action with a disabled 24-hour countdown", async () => {
  const Actions = (await server.ssrLoadModule("/src/pages/auth/student/records/RecordActions.jsx")).default;
  const html = renderToStaticMarkup(React.createElement(Actions, {
    record,
    description: "Math",
    onView() {},
    onFollowUp() {},
    cooldownSeconds: 86_399,
  }));

  assert.match(html, /disabled=""/);
  assert.match(html, /aria-label="Follow up available in 23:59:59"/);
  assert.doesNotMatch(html, /lucide-bell-check/);
  assert.match(html, />Follow up in 23:59:59</);
});

test("reviewed and cancelled requests do not offer follow-up and view remains available", async () => {
  const Actions = (await server.ssrLoadModule("/src/pages/auth/student/records/RecordActions.jsx")).default;
  for (const status of ["approved", "noted", "invalid", "cancelled"]) {
    const html = renderToStaticMarkup(React.createElement(Actions, { record: { ...record, status }, onView() {}, onFollowUp() {} }));
    assert.match(html, /View Record/);
    assert.doesNotMatch(html, /Follow up/);
  }
});

test("record action callbacks receive the selected record without firing during render", async () => {
  const Actions = (await server.ssrLoadModule("/src/pages/auth/student/records/RecordActions.jsx")).default;
  const calls = [];
  const node = Actions({ record, description: "Math", onView: value => calls.push(["view", value]), onFollowUp: value => calls.push(["follow-up", value]) });
  const buttons = [];
  function visit(element) {
    if (!React.isValidElement(element)) return;
    if (element.type === "button") buttons.push(element);
    React.Children.forEach(element.props.children, visit);
  }
  visit(node);
  assert.equal(calls.length, 0);
  buttons[0].props.onClick();
  buttons[1].props.onClick();
  assert.deepEqual(calls, [["view", record], ["follow-up", record]]);
});
