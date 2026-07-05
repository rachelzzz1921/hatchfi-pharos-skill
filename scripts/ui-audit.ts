#!/usr/bin/env node
/**
 * Static + logic audit for HatchFi UI surfaces (dashboard, web demo, docs links).
 * Writes NDJSON to the active debug session log when DEBUG_LOG_PATH is set.
 */
import fs from "node:fs";
import path from "node:path";
import { DiligenceGate, InMemoryAttestationRegistry } from "../lib/hatchfi-gate/src";
import { createDiligenceSkills, callMcpTool } from "../lib/hatchfi-gate/src/skills";

const cwd = process.cwd();
const logPath = process.env.DEBUG_LOG_PATH || path.join(cwd, "..", ".cursor", "debug-26459c.log");
const sessionId = "26459c";
const runId = process.env.DEBUG_RUN_ID || "ui-audit";

function log(hypothesisId, location, message, data = {}) {
  const line = JSON.stringify({
    sessionId,
    runId,
    hypothesisId,
    location,
    message,
    data,
    timestamp: Date.now(),
  });
  fs.appendFileSync(logPath, line + "\n");
  console.log(`${hypothesisId} ${message}`, data.pass === false ? "FAIL" : data.pass === true ? "PASS" : "");
}

const dashboardPath = path.join(cwd, "SUBMISSION_DASHBOARD.html");
const stylesPath = path.join(cwd, "web/src/styles.css");
const dashboardHtml = fs.readFileSync(dashboardPath, "utf8");
const stylesCss = fs.readFileSync(stylesPath, "utf8");

let failures = 0;

function fail(hypothesisId, location, message, data) {
  failures += 1;
  log(hypothesisId, location, message, { ...data, pass: false });
}

function pass(hypothesisId, location, message, data) {
  log(hypothesisId, location, message, { ...data, pass: true });
}

// H4: Dashboard nav section IDs match DOM targets
const navSections = [...dashboardHtml.matchAll(/data-section="([^"]+)"/g)].map((m) => m[1]);
const uniqueNav = [...new Set(navSections)];
for (const id of uniqueNav) {
  const found = dashboardHtml.includes(`id="${id}"`);
  if (!found) {
    fail("H4", "ui-audit:nav", `Nav target missing section id="${id}"`, { id });
  } else {
    pass("H4", "ui-audit:nav", `Nav target ok: ${id}`, { id });
  }
}

// Internal relative href targets
const localHrefs = [...dashboardHtml.matchAll(/href="(?!https?:|#|mailto:)([^"]+)"/g)].map((m) => m[1].split("#")[0]);
for (const href of [...new Set(localHrefs)]) {
  const target = path.join(cwd, href);
  if (!fs.existsSync(target)) {
    fail("H4", "ui-audit:href", `Broken local href: ${href}`, { href });
  } else {
    pass("H4", "ui-audit:href", `Local href ok: ${href}`, { href });
  }
}

// H5: CSS overflow safeguards
const overflowChecks = [
  { rule: "pre", has: /pre[\s\S]*word-break:\s*break-word/.test(stylesCss), label: "pre word-break" },
  { rule: "grid responsive", has: /@media[\s\S]*grid-template-columns:\s*1fr/.test(stylesCss), label: "mobile grid collapse" },
  { rule: "pre overflow", has: /pre[\s\S]*overflow:\s*auto/.test(stylesCss), label: "pre overflow auto" },
];
for (const check of overflowChecks) {
  if (!check.has) fail("H5", "ui-audit:css", `Missing CSS safeguard: ${check.label}`, check);
  else pass("H5", "ui-audit:css", `CSS safeguard present: ${check.label}`, check);
}

// H1/H3: Gate demo flow parity (same logic as React App.tsx)
async function runGateAudit() {
const registry = new InMemoryAttestationRegistry();
const gate = new DiligenceGate(registry);
const skills = createDiligenceSkills(gate);

const baseInput = {
  subject: "0xA54A3C2766a80d3AFe7C4Bf00D5bcfF9e1892bc4",
  assetFingerprint: "0xe8d343f2ca60abadc7ac491a9272fa3b4a19eadfe82629924c4d52794e4c65f3",
  evidenceHash: "0xgreen-demo-hash",
  flags: {
    sanctionsHit: false,
    duplicateTokenization: false,
    liquidityExitMissing: false,
    rightsUnclear: false,
    docsIncomplete: false,
    kycExpiredOrMissing: false,
    onchainAnomaly: false,
  },
};

const redScreen = await gate.screen({ ...baseInput, flags: { ...baseInput.flags, sanctionsHit: true } });
if (redScreen.rating !== "RED") {
  fail("H1", "ui-audit:gate", "RED path broken", { rating: redScreen.rating });
} else {
  pass("H1", "ui-audit:gate", "RED diligence path ok", { rating: redScreen.rating });
}

const greenScreen = await gate.screen(baseInput);
if (greenScreen.rating !== "GREEN") {
  fail("H1", "ui-audit:gate", "GREEN path broken", { rating: greenScreen.rating });
} else {
  pass("H1", "ui-audit:gate", "GREEN diligence path ok", { rating: greenScreen.rating });
}

const preMint = await gate.gateMint({
  to: baseInput.subject,
  amount: "1000000000000000000",
  evidenceHash: baseInput.evidenceHash,
  flags: baseInput.flags,
});
if (preMint.allowed !== false) {
  fail("H1", "ui-audit:gate", "Pre-attest mint should be blocked", { allowed: preMint.allowed });
} else {
  pass("H1", "ui-audit:gate", "Pre-attest mint blocked", { allowed: preMint.allowed });
}

await gate.attest(baseInput);
const postMint = await gate.gateMint({
  to: baseInput.subject,
  amount: "1000000000000000000",
  evidenceHash: baseInput.evidenceHash,
  flags: baseInput.flags,
});
if (postMint.allowed !== true) {
  fail("H1", "ui-audit:gate", "Post-attest mint should be allowed", { allowed: postMint.allowed });
} else {
  pass("H1", "ui-audit:gate", "Post-attest mint allowed", { allowed: postMint.allowed });
}

// H3: MCP tool arg routing (mirrors App.tsx runTool)
for (const toolName of [
  "diligence_screen",
  "diligence_rate",
  "diligence_attest",
  "diligence_gate_mint",
  "diligence_get_attestation",
]) {
  try {
    const args =
      toolName === "diligence_get_attestation"
        ? { evidenceHash: baseInput.evidenceHash }
        : toolName === "diligence_gate_mint"
        ? { to: baseInput.subject, amount: "1000000000000000000", evidenceHash: baseInput.evidenceHash, flags: baseInput.flags }
        : baseInput;
    const result = await callMcpTool(skills, toolName, args);
    pass("H3", "ui-audit:mcp", `MCP tool ok: ${toolName}`, { toolName, hasResult: result != null });
  } catch (error) {
    fail("H3", "ui-audit:mcp", `MCP tool failed: ${toolName}`, {
      toolName,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// H2: Docs tab content references exist
const docsChecks = ["docs/JUDGE_MANUAL.md", "docs/DEMO_SCRIPT.md", "docs/slides.html", "dist-web/index.html"];
for (const rel of docsChecks) {
  const ok = fs.existsSync(path.join(cwd, rel));
  if (!ok) fail("H2", "ui-audit:docs", `Missing docs artifact: ${rel}`, { rel });
  else pass("H2", "ui-audit:docs", `Docs artifact ok: ${rel}`, { rel });
}

console.log(`\nUI audit complete: ${failures} failure(s)`);
log("SUMMARY", "ui-audit:summary", "Audit finished", { failures, navCount: uniqueNav.length, localHrefCount: localHrefs.length });
process.exit(failures > 0 ? 1 : 0);
}

runGateAudit().catch((error) => {
  console.error(error);
  process.exit(1);
});
