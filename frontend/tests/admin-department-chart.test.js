import assert from "node:assert/strict";
import { test } from "node:test";
import { chartProgramTick } from "../src/pages/auth/admin/dashboard/chartLabels.js";

test("chart program ticks fit long unrecognized program names", () => {
  assert.equal(chartProgramTick("ALRM AUDIT DISPOSABLE 20261031 CR"), "ALRM AUDIT…");
});

test("chart program ticks retain recognized abbreviations", () => {
  assert.equal(chartProgramTick("Associate in Computer Technology"), "ACT");
});
