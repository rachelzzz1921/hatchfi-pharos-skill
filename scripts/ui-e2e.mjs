#!/usr/bin/env node
/**
 * Browser E2E audit — exercises the 3-step React demo + SUBMISSION_DASHBOARD.
 * Prereq: `npm run web:dev` serving http://localhost:5173 (or set DEMO_URL).
 * Writes NDJSON audit trail locally (path via UI_E2E_LOG, default .ui-e2e-log.ndjson).
 */
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cwd = path.join(__dirname, "..");
const logPath = process.env.UI_E2E_LOG || path.join(cwd, ".ui-e2e-log.ndjson");
const demoUrl = process.env.DEMO_URL || "http://localhost:5173";
const dashboardPort = Number(process.env.DASHBOARD_PORT || 8799);
const dashboardBase = process.env.DASHBOARD_BASE || `http://127.0.0.1:${dashboardPort}`;
const dashboardUrl = `${dashboardBase}/SUBMISSION_DASHBOARD.html`;

function log(id, location, message, data = {}) {
  const line = JSON.stringify({ id, location, message, data, timestamp: Date.now() });
  fs.appendFileSync(logPath, line + "\n");
  console.log(id, message, data.pass === false ? "FAIL" : data.pass === true ? "PASS" : "");
}

let failures = 0;
function fail(h, loc, msg, data) {
  failures += 1;
  log(h, loc, msg, { ...data, pass: false });
}
function pass(h, loc, msg, data) {
  log(h, loc, msg, { ...data, pass: true });
}

// Self-contained: if no external DEMO_URL is given, serve the built dist-web
// (build it first if missing) so `npm run ui:e2e` needs no manually-started server.
let consoleServer = null;
let resolvedDemoUrl = process.env.DEMO_URL || null;
if (!resolvedDemoUrl) {
  const dist = path.join(cwd, "dist-web");
  if (!fs.existsSync(path.join(dist, "index.html"))) {
    console.log("dist-web missing — building web app…");
    const { spawnSync } = await import("node:child_process");
    spawnSync("npm", ["run", "web:build"], { cwd, stdio: "inherit" });
  }
  const consolePort = Number(process.env.CONSOLE_PORT || 8790);
  consoleServer = http.createServer((req, res) => {
    let rel = (req.url || "/").split("?")[0].split("#")[0];
    let filePath = path.join(dist, rel.replace(/^\//, ""));
    // SPA fallback: unknown non-asset paths serve index.html (hash routing).
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(dist, "index.html");
    }
    const ext = path.extname(filePath);
    const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".png": "image/png", ".json": "application/json", ".svg": "image/svg+xml", ".jsonl": "application/json" };
    res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
    fs.createReadStream(filePath).pipe(res);
  });
  await new Promise((resolve) => consoleServer.listen(consolePort, "127.0.0.1", resolve));
  resolvedDemoUrl = `http://127.0.0.1:${consolePort}`;
  console.log(`serving built console at ${resolvedDemoUrl}`);
}
const demoUrlFinal = resolvedDemoUrl;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

const dashboardServer = http.createServer((req, res) => {
  const rel = req.url === "/" ? "/SUBMISSION_DASHBOARD.html" : req.url?.split("?")[0] || "/";
  const filePath = path.join(cwd, rel.replace(/^\//, ""));
  if (!filePath.startsWith(cwd) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }
  const ext = path.extname(filePath);
  const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".png": "image/png", ".json": "application/json", ".md": "text/markdown" };
  res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
  fs.createReadStream(filePath).pipe(res);
});
await new Promise((resolve) => dashboardServer.listen(dashboardPort, "127.0.0.1", resolve));

async function noHorizontalOverflow(label) {
  const m = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  if (m.scrollWidth > m.clientWidth + 2) {
    fail("OVERFLOW", `e2e:overflow:${label}`, `Horizontal overflow at ${label}`, m);
  } else {
    pass("OVERFLOW", `e2e:overflow:${label}`, `No horizontal overflow at ${label}`, m);
  }
}

try {
  // --- React Demo App (3-step choreography) ---
  await page.goto(demoUrlFinal, { waitUntil: "networkidle", timeout: 30000 });

  // Hero: brand + live on-chain chip pointing at the hardened token
  // (the hero now has multiple chips; target the on-chain one, not the agent-run chip)
  const chipHref = await page.locator(".live-chip:not(.live-chip-agent)").first().getAttribute("href");
  if (chipHref?.includes("pharosscan.xyz/address/0x975704")) {
    pass("HERO", "e2e:hero", "Live chip links to hardened token", { chipHref });
  } else {
    fail("HERO", "e2e:hero", "Live chip href wrong", { chipHref });
  }

  // Step 1: four counterparty presets
  const cardCount = await page.locator(".scenarios .scenario").count();
  if (cardCount === 4) pass("STEP1", "e2e:scenarios", "4 counterparty cards render", { cardCount });
  else fail("STEP1", "e2e:scenarios", "Counterparty card count wrong", { cardCount });

  // Operator gating: attest + mint locked until screening ran
  const act = (n) => page.locator(".action-row button").nth(n);
  const initiallyLocked =
    (await act(1).isDisabled()) && (await act(2).isDisabled()) && !(await page.locator(".verdict").count());
  if (initiallyLocked) pass("GATING", "e2e:gating", "attest+mint locked before screening", {});
  else fail("GATING", "e2e:gating", "pipeline not locked initially", {});

  // RED path: OFAC counterparty → screen → RED → attest → mint DENIED
  await page.locator(".scenarios .scenario").nth(1).click();
  await page.waitForTimeout(200);
  await act(0).click();
  await page.waitForTimeout(250);
  const redVerdict = await page.locator(".verdict .rating").textContent();
  const redClass = await page.locator(".verdict").getAttribute("class");
  if (redVerdict === "RED" && redClass?.includes("r-RED")) {
    pass("RED", "e2e:verdict", "OFAC screening yields RED verdict", {});
  } else {
    fail("RED", "e2e:verdict", "RED verdict missing", { redVerdict, redClass });
  }
  const failedCheck = await page.locator(".checks li.fail .ckey").first().textContent();
  if (failedCheck === "sanctions") pass("RED", "e2e:checks", "sanctions check marked failed", {});
  else fail("RED", "e2e:checks", "sanctions check not marked failed", { failedCheck });

  await act(1).click();
  await page.waitForTimeout(200);
  await act(2).click();
  await page.waitForTimeout(250);
  const deniedBadge = await page.locator(".mint-badge").textContent();
  const redStatus = await page.locator(".pipeline-status").textContent();
  if (deniedBadge?.includes("DENIED") && redStatus?.includes("DENIED")) {
    pass("RED", "e2e:mint", "RED path mint denied via gated pipeline", {});
  } else {
    fail("RED", "e2e:mint", "RED path mint not denied", { deniedBadge, redStatus });
  }

  // GREEN path: clean counterparty → screen → attest → mint ALLOWED
  await page.locator(".scenarios .scenario").nth(0).click();
  await page.waitForTimeout(200);
  await act(0).click();
  await page.waitForTimeout(250);
  const greenVerdict = await page.locator(".verdict .rating").textContent();
  if (greenVerdict === "GREEN") pass("GREEN", "e2e:verdict", "Clean screening yields GREEN", {});
  else fail("GREEN", "e2e:verdict", "GREEN verdict missing", { greenVerdict });

  await act(1).click();
  await page.waitForTimeout(200);
  await act(2).click();
  await page.waitForTimeout(250);
  const allowedBadge = await page.locator(".mint-badge").textContent();
  if (allowedBadge?.includes("ALLOWED")) {
    pass("GREEN", "e2e:mint", "GREEN path mint allowed after attest", {});
  } else {
    fail("GREEN", "e2e:mint", "GREEN mint not allowed", { allowedBadge });
  }

  // Audit log: 6 operator actions recorded (3 RED + 3 GREEN)
  const logCount = await page.locator(".console-line").count();
  if (logCount >= 6) pass("LOG", "e2e:log", "audit log recorded all operator actions", { logCount });
  else fail("LOG", "e2e:log", "audit log incomplete", { logCount });

  // Raw MCP tools (inside disclosure): round-trips for all five gate tools
  await page.locator(".step").nth(2).locator("details.advanced summary").click();
  await page.waitForTimeout(200);
  const tools = [
    "diligence_screen",
    "diligence_rate",
    "diligence_attest",
    "diligence_gate_mint",
    "diligence_get_attestation",
  ];
  for (const tool of tools) {
    await page.locator(".mcp-controls select").selectOption(tool);
    await page.locator(".mcp-controls button").click();
    await page.waitForTimeout(250);
    const mcpText = await page.locator(".mcp-io pre.io").last().textContent();
    const ok = mcpText && !mcpText.startsWith("Error") && mcpText.trim().startsWith("{");
    if (ok) pass("MCP", "e2e:mcp", `Tool ${tool} ok`, { tool });
    else fail("MCP", "e2e:mcp", `Tool ${tool} failed`, { tool, snippet: mcpText?.slice(0, 120) });
  }

  // Overflow guards (the request-panel hash previously blew out the page)
  await noHorizontalOverflow("desktop");
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(250);
  await noHorizontalOverflow("mobile-375");
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.waitForTimeout(250);

  // Bilingual toggle: EN → ZH flips headings, translated check reasons, <html lang>
  await page.locator(".lang-toggle").click();
  await page.waitForTimeout(250);
  const zhState = await page.evaluate(() => ({
    lang: document.documentElement.lang,
    step1: document.querySelector(".step-head h2")?.textContent,
    reason: document.querySelector(".checks .creason")?.textContent,
  }));
  if (zhState.lang === "zh-CN" && zhState.step1 === "选择交易对手" && /[一-鿿]/.test(zhState.reason || "")) {
    pass("LANG", "e2e:lang", "ZH mode translates UI + check reasons", zhState);
  } else {
    fail("LANG", "e2e:lang", "ZH toggle incomplete", zhState);
  }
  await page.locator(".lang-toggle").click();
  await page.waitForTimeout(200);

  // --- Agent Run dashboard (institution-facing audit trail) ---
  await page.goto(`${demoUrlFinal}/#/agent-run`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(600);
  const agentText = await page.evaluate(() => document.body.innerText);
  const hasStepper = /phase|diligence|issuance|verify/i.test(agentText);
  const hasHistory = /step history|history/i.test(agentText);
  if (hasStepper && hasHistory) {
    pass("AGENTRUN", "e2e:agent-run", "Agent Run shows phase stepper + step history", {});
  } else {
    fail("AGENTRUN", "e2e:agent-run", "Agent Run missing stepper/history", { snippet: agentText.slice(0, 160) });
  }
  await noHorizontalOverflow("agent-run");

  // --- SUBMISSION_DASHBOARD ---
  await page.goto(dashboardUrl, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);

  const navIds = ["research", "progress", "live", "ecosystem", "compliance", "review", "reproduce"];
  for (const id of navIds) {
    const link = page.locator(`.nav-links a[data-section="${id}"]`);
    await link.click();
    await page.waitForTimeout(900);
    const inView = await page.evaluate((sectionId) => {
      const el = document.getElementById(sectionId);
      const nav = document.getElementById("sticky-nav");
      if (!el) return { found: false };
      const r = el.getBoundingClientRect();
      const navH = nav ? nav.offsetHeight : 52;
      return {
        found: true,
        top: r.top,
        inViewport: r.top >= navH && r.top <= window.innerHeight * 0.75,
      };
    }, id);
    if (inView.found && inView.inViewport) pass("DASHNAV", "e2e:nav", `Nav scroll ok: ${id}`, inView);
    else fail("DASHNAV", "e2e:nav", `Nav scroll failed: ${id}`, inView);
  }

  await page.getByRole("button", { name: "中文" }).click();
  const zhOnly = await page.evaluate(() => {
    const enVisible = [...document.querySelectorAll(".en")].some((el) => {
      const s = getComputedStyle(el);
      return s.display !== "none" && el.offsetParent !== null;
    });
    const zhVisible = [...document.querySelectorAll(".zh")].some((el) => {
      const s = getComputedStyle(el);
      return s.display !== "none" && el.offsetParent !== null;
    });
    return { lang: document.body.className, enVisible, zhVisible };
  });
  if (zhOnly.lang === "lang-zh" && zhOnly.zhVisible && !zhOnly.enVisible) pass("DASHLANG", "e2e:lang", "ZH mode hides EN", zhOnly);
  else fail("DASHLANG", "e2e:lang", "ZH toggle broken", zhOnly);

  await page.evaluate(() => window.scrollTo(0, 2000));
  await page.waitForTimeout(200);
  const backTop = page.locator("#back-top");
  await backTop.evaluate((el) => el.classList.add("visible"));
  await backTop.click();
  await page.waitForTimeout(300);
  const topState = await page.evaluate(() => {
    const top = document.getElementById("top");
    const rect = top ? top.getBoundingClientRect() : null;
    return { scrollY: window.scrollY, heroTop: rect ? rect.top : null };
  });
  if (topState.scrollY < 50 || (topState.heroTop != null && topState.heroTop <= 80)) {
    pass("DASHTOP", "e2e:backTop", "Back to top works", topState);
  } else {
    fail("DASHTOP", "e2e:backTop", "Back to top failed", topState);
  }

  log("SUMMARY", "e2e:summary", "E2E finished", { failures });
} catch (error) {
  fail("SUMMARY", "e2e:fatal", "E2E crashed", { error: error instanceof Error ? error.message : String(error) });
} finally {
  await browser.close();
  dashboardServer.close();
  if (consoleServer) consoleServer.close();
}

console.log(`\nE2E complete: ${failures} failure(s)`);
process.exit(failures > 0 ? 1 : 0);
