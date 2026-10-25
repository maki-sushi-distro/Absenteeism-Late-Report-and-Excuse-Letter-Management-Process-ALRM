import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import { initialForm } from "../src/pages/auth/student/request-form/constants.js";
import { normalizePhoneInput, profileDefaults } from "../src/pages/auth/student/request-form/utils.js";
import { buildRequestPayload } from "../src/pages/auth/student/request-form/buildPayload.js";
import { validateStep } from "../src/pages/auth/student/request-form/validation.js";

let server;
before(async () => { server = await createServer({ server: { middlewareMode: true, ws: false }, appType: "custom" }); });
after(async () => { await server?.close(); });

test("contact numbers normalize nine digits and saved local numbers to the fixed +639 prefix", () => {
  for (const value of ["123456789", "09123456789", "+639123456789", "639123456789", "09 123 456 789"]) {
    assert.equal(normalizePhoneInput(value), "+639123456789");
  }
  assert.equal(normalizePhoneInput(""), "");
  assert.equal(normalizePhoneInput("letters"), "");
  assert.equal(normalizePhoneInput("12a3-45"), "+63912345");
  assert.equal(normalizePhoneInput("123456789012"), "+639123456789");
  assert.equal(normalizePhoneInput("912345678"), "+639912345678");
  assert.equal(profileDefaults({ contact_number: "09123456789" }, null).contactNumber, "+639123456789");
});

test("both form entry and final review show a fixed prefix and nine-digit numeric input", async () => {
  const Step = (await server.ssrLoadModule("/src/pages/auth/student/request-form/steps/StudentInfoStep.jsx")).default;
  const Editor = (await server.ssrLoadModule("/src/pages/auth/student/request-form/components/RequestReviewEditor.jsx")).default;
  const props = { step: 3, form: { ...initialForm, requestType: "late", contactNumber: "09123456789" },
    user: {}, fieldErrors: {}, classes: [], updateField() {}, toggleListField() {}, handleRadioClick() {} };
  for (const Component of [Step, Editor]) {
    const html = renderToStaticMarkup(React.createElement(Component, props));
    assert.match(html, />\+639</);
    const input = html.match(/<input[^>]*name="contactNumber"[^>]*>/)?.[0];
    assert.ok(input, "the phone input retains its field name");
    for (const attribute of ['type="tel"', 'inputMode="numeric"', 'maxLength="9"', 'minLength="9"', 'pattern="[0-9]{9}"', 'value="123456789"']) {
      assert.ok(input.includes(attribute), `phone input requires ${attribute}`);
    }
  }
});

test("late and absence payloads keep the complete contact number, not just its editable suffix", () => {
  for (const requestType of ["late", "absence"]) {
    const payload = buildRequestPayload({ ...initialForm, requestType, guardianName: "Alex Parent",
      contactNumber: normalizePhoneInput("123456789"), minutesLate: "10", absenceReasons: [] }, []);
    assert.equal(payload.contact_number, "+639123456789");
  }
});

test("an incomplete suffix explains the fixed-prefix input format", () => {
  const errors = validateStep({ step: 3, form: { ...initialForm, contactNumber: "+639123" } });
  assert.match(errors.contactNumber, /9 digits after \+639/);
});
