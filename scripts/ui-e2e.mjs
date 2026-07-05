#!/usr/bin/env node
/**
 * Browser E2E audit — exercises React demo + SUBMISSION_DASHBOARD interactions.
 * Writes NDJSON directly to debug log (HTTP ingest may be unavailable in CI).
 */
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cwd = path.join(__dirname, "..");
const logPath = process.env.DEBUG_LOG_PATH || path.join(cwd, "..", ".cursor", "debug-26459c.log");
const sessionId = "26459c";
const runId = process.env.DEBUG_RUN_ID || "ui-e2e";
const demoUrl = process.env.DEMO_URL || "http://localhost:5173";
const dashboardPort = Number(process.env.DASHBOARD_PORT || 8799);
const dashboardBase = process.env.DASHBOARD_BASE || `http://127.0.0.1:${dashboardPort}`;
const dashboardUrl = `${dashboardBase}/SUBMISSION_DASHBOARD.html`;

function log(hypothesisId, location, message, data = {}) {
  const line = JSON.stringify({ sessionId, runId, hypothesisId, location, message, data, timestamp: Date.now() });
  fs.appendFileSync(logPath, line + "\n");
  console.log(hypothesisId, message, data.pass === false ? "FAIL" : data.pass === true ? "PASS" : "");
}

let failures = 0;
function fail(h, loc, msg, data) {
  failures += 1;
  log(h, loc, msg, { ...data, pass: false });
}
function pass(h, loc, msg, data) {
  log(h, loc, msg, { ...data, pass: true });
}

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

try {
  // --- React Demo App ---
  await page.goto(demoUrl, { waitUntil: "networkidle", timeout: 30000 });

  await page.locator(".tabs button", { hasText: /^Docs$/ }).click();
  const docsVisible = await page.getByText("Judge Quick Test").isVisible();
  if (docsVisible) pass("H2", "e2e:tab", "Docs tab renders", {});
  else fail("H2", "e2e:tab", "Docs tab missing content", {});

  await page.locator(".tabs button", { hasText: /^Demo$/ }).click();
  const demoVisible = await page.getByRole("button", { name: "Run Diligence" }).isVisible();
  if (demoVisible) pass("H2", "e2e:tab", "Demo tab renders", {});
  else fail("H2", "e2e:tab", "Demo tab missing content", {});

  // RED path
  await page.getByRole("button", { name: /sanctionsHit/ }).click();
  await page.getByRole("button", { name: "Run Diligence" }).click();
  await page.waitForTimeout(300);
  const redText = await page.locator("pre").first().textContent();
  if (redText?.includes('"rating": "RED"')) pass("H1", "e2e:screen", "RED rating shown", {});
  else fail("H1", "e2e:screen", "RED rating missing", { snippet: redText?.slice(0, 120) });

  // GREEN path
  await page.getByRole("button", { name: /sanctionsHit: true/ }).click();
  await page.getByRole("button", { name: "Run Diligence" }).click();
  await page.waitForTimeout(300);
  const greenText = await page.locator("pre").first().textContent();
  if (greenText?.includes('"rating": "GREEN"')) pass("H1", "e2e:screen", "GREEN rating shown", {});
  else fail("H1", "e2e:screen", "GREEN rating missing", { snippet: greenText?.slice(0, 120) });

  await page.getByRole("button", { name: "Attest Current" }).click();
  await page.waitForTimeout(200);
  await page.getByRole("button", { name: "Gate Mint" }).click();
  await page.waitForTimeout(300);
  const mintText = await page.locator("pre").nth(1).textContent();
  if (mintText?.includes('"allowed": true')) pass("H1", "e2e:mint", "Post-attest mint allowed", {});
  else fail("H1", "e2e:mint", "Mint not allowed after attest", { snippet: mintText?.slice(0, 120) });

  const tools = [
    "diligence_screen",
    "diligence_rate",
    "diligence_attest",
    "diligence_gate_mint",
    "diligence_get_attestation",
  ];
  for (const tool of tools) {
    await page.locator("select").selectOption(tool);
    await page.getByRole("button", { name: "Run Tool" }).click();
    await page.waitForTimeout(250);
    const mcpText = await page.locator("pre").last().textContent();
    const ok = mcpText && !mcpText.includes("Error") && mcpText !== "Run selected tool to inspect JSON result.";
    if (ok) pass("H3", "e2e:mcp", `Tool ${tool} ok`, { tool });
    else fail("H3", "e2e:mcp", `Tool ${tool} failed`, { snippet: mcpText?.slice(0, 120) });
  }

  // H5: input overflow at mobile width
  await page.setViewportSize({ width: 375, height: 812 });
  await page.locator(".tabs button", { hasText: /^Demo$/ }).click();
  const layout = await page.evaluate(() => {
    const layoutEl = document.querySelector(".layout");
    const input = document.querySelector("input");
    if (!layoutEl || !input) return { error: "missing elements" };
    const layoutRect = layoutEl.getBoundingClientRect();
    const inputRect = input.getBoundingClientRect();
    const bodyScrollW = document.documentElement.scrollWidth;
    const bodyClientW = document.documentElement.clientWidth;
    return {
      layoutWidth: layoutRect.width,
      inputRight: inputRect.right,
      viewport: window.innerWidth,
      horizontalOverflow: bodyScrollW > bodyClientW + 2,
      inputOverflowsLayout: inputRect.right > layoutRect.right + 2,
    };
  });
  if (layout.horizontalOverflow || layout.inputOverflowsLayout) {
    fail("H5", "e2e:overflow", "Mobile input/layout overflow detected", layout);
  } else {
    pass("H5", "e2e:overflow", "No mobile overflow detected", layout);
  }

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
    if (inView.found && inView.inViewport) pass("H6", "e2e:nav", `Nav scroll ok: ${id}`, inView);
    else fail("H6", "e2e:nav", `Nav scroll failed: ${id}`, inView);
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
  if (zhOnly.lang === "lang-zh" && zhOnly.zhVisible && !zhOnly.enVisible) pass("H8", "e2e:lang", "ZH mode hides EN", zhOnly);
  else fail("H8", "e2e:lang", "ZH toggle broken", zhOnly);

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
    pass("H7", "e2e:backTop", "Back to top works", topState);
  } else {
    fail("H7", "e2e:backTop", "Back to top failed", topState);
  }

  log("SUMMARY", "e2e:summary", "E2E finished", { failures });
} catch (error) {
  fail("SUMMARY", "e2e:fatal", "E2E crashed", { error: error instanceof Error ? error.message : String(error) });
} finally {
  await browser.close();
  dashboardServer.close();
}

console.log(`\nE2E complete: ${failures} failure(s)`);
process.exit(failures > 0 ? 1 : 0);
