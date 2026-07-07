/**
 * make_demo_video.mjs — produce a fully narrated, subtitled HatchFi demo film.
 *
 *   npm run web:build && npm run demo:video          # serves dist-web, records, muxes
 *   SILICONFLOW_API_KEY=sk-... npm run demo:video     # nicer neural voice (else macOS `say`)
 *
 * Pipeline: narration lines → TTS (SiliconFlow /v1/audio/speech, or macOS `say`
 * fallback) → measure each clip → drive a Playwright screen recording paced to the
 * audio → burn English subtitles → mux one MP4. Output: ~/Desktop/hatchfi-demo/.
 *
 * The narration is descriptive (not lip-synced), so approximate A/V alignment is fine.
 */
import { chromium } from "playwright";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const OUT = process.env.DEMO_OUT || path.join(os.homedir(), "Desktop", "hatchfi-demo");
const WORK = path.join(OUT, ".build");
const URL = process.env.DEMO_URL || "http://localhost:5173";
const KEY = process.env.SILICONFLOW_API_KEY || "";
const SF_MODEL = process.env.SF_TTS_MODEL || "FunAudioLLM/CosyVoice2-0.5B";
const SF_VOICE = process.env.SF_TTS_VOICE || "FunAudioLLM/CosyVoice2-0.5B:david";
const SAY_VOICE = process.env.SAY_VOICE || "Samantha";
const W = 1280, H = 800;
const GAP = 0.45;      // silence after each line (breathing room)
const PREROLL = 0.7;   // leading silence (covers browser launch)
const TAIL = 1.6;      // extra video hold at the end (trimmed by -shortest)

fs.mkdirSync(WORK, { recursive: true });
const ff = (args) => { const r = spawnSync("ffmpeg", ["-y", "-loglevel", "error", ...args]); if (r.status !== 0) throw new Error("ffmpeg: " + (r.stderr || "")); };
const dur = (f) => parseFloat(spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).stdout.toString().trim());
const silence = (secs, out) => ff(["-f", "lavfi", "-i", `anullsrc=r=44100:cl=stereo`, "-t", String(secs), "-c:a", "pcm_s16le", out]);

function tts(text, outWav) {
  if (KEY) {
    const mp3 = outWav.replace(/\.wav$/, ".mp3");
    const body = JSON.stringify({ model: SF_MODEL, input: text, voice: SF_VOICE, response_format: "mp3" });
    const r = spawnSync("curl", ["-sS", "--max-time", "90", "-X", "POST",
      "https://api.siliconflow.cn/v1/audio/speech",
      "-H", `Authorization: Bearer ${KEY}`, "-H", "Content-Type: application/json",
      "-d", body, "-o", mp3]);
    const ok = fs.existsSync(mp3) && fs.statSync(mp3).size > 2000 && fs.readFileSync(mp3).slice(0, 1)[0] !== 0x7b;
    if (!ok) throw new Error("SiliconFlow TTS failed: " + (fs.existsSync(mp3) ? fs.readFileSync(mp3).toString().slice(0, 200) : "no output"));
    ff(["-i", mp3, "-ar", "44100", "-ac", "2", "-c:a", "pcm_s16le", outWav]);
  } else {
    const aiff = outWav.replace(/\.wav$/, ".aiff");
    spawnSync("say", ["-v", SAY_VOICE, "-r", "182", "-o", aiff, text]);
    ff(["-i", aiff, "-ar", "44100", "-ac", "2", "-c:a", "pcm_s16le", outWav]);
  }
}

// ── Caption overlay: burned into the recording via the DOM (this ffmpeg has no
//    libass/drawtext), styled to match the brand. Installed on every navigation.
const CAP_JS = `
(() => {
  const install = () => {
    if (window.__capInit) return; window.__capInit = true;
    const el = document.createElement('div'); el.id = '__cap';
    el.style.cssText = 'position:fixed;left:50%;bottom:36px;transform:translateX(-50%);max-width:80%;z-index:2147483647;'
      + 'font-family:Inter,system-ui,-apple-system,sans-serif;font-size:20px;line-height:1.5;font-weight:500;color:#eaf3ec;'
      + 'background:rgba(8,20,16,.92);border:1px solid rgba(217,166,33,.5);border-radius:13px;padding:12px 24px;'
      + 'text-align:center;box-shadow:0 12px 44px rgba(0,0,0,.55);opacity:0;transition:opacity .28s ease;'
      + '-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);pointer-events:none;';
    document.body.appendChild(el);
    window.__cap = (t) => { el.textContent = t || ''; el.style.opacity = t ? '1' : '0'; };
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install); else install();
})();`;
const caption = (p, t) => p.evaluate((x) => window.__cap && window.__cap(x), t);

// ── Storyboard: narration + the UI beat it plays over ──────────────────────
const act = (p, n) => p.locator(".action-row button").nth(n);
const scrollTo = (p, sel) => p.evaluate((s) => document.querySelector(s)?.scrollIntoView({ behavior: "smooth", block: "center" }), sel);

const SEGMENTS = [
  { id: "hero", text: "HatchFi. A compliant real-world asset — screened, issued, and hatched into its own agent skill. End to end, on Pharos.",
    run: async (p) => { await p.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" })); } },
  { id: "ofac", text: "Start with admission. This counterparty is on the sanctions list.",
    run: async (p) => { await scrollTo(p, ".scenarios"); await p.locator(".scenarios .scenario").nth(1).click(); } },
  { id: "screenRed", text: "The gate checks the address against the U.S. sanctions snapshot and returns red. Issuance is blocked.",
    run: async (p) => { await scrollTo(p, ".pipeline-status"); await act(p, 0).click(); } },
  { id: "mintRed", text: "We still attempt to attest and mint. The contract refuses. Mint denied. Fail closed.",
    run: async (p) => { await act(p, 1).click(); await p.waitForTimeout(700); await act(p, 2).click(); } },
  { id: "cleanScreen", text: "Now a clean institutional issuer. Screening passes. Green.",
    run: async (p) => { await p.locator(".scenarios .scenario").nth(0).click(); await scrollTo(p, ".pipeline-status"); await p.waitForTimeout(500); await act(p, 0).click(); } },
  { id: "mintGreen", text: "Attest the evidence on chain — a hash only, no private data — then mint. Allowed.",
    run: async (p) => { await act(p, 1).click(); await p.waitForTimeout(700); await act(p, 2).click(); } },
  { id: "audit", text: "Every action is on the record — a timestamped audit trail. And an A-I agent calls the very same tools over the Model Context Protocol.",
    run: async (p) => { await scrollTo(p, ".console"); } },
  { id: "personalize", text: "The asset also sediments the issuer's own rules into a private profile, with consent, so the next issuance fits better. That is the flywheel.",
    run: async (p) => { await scrollTo(p, ".pz-grid"); await p.waitForTimeout(600); await p.locator(".pz-deposit select").selectOption("pref_holderCap"); await p.locator(".pz-input").fill("250"); await p.locator(".pz-consent-box input").check(); await p.locator(".pz-deposit button").click(); } },
  { id: "agentrun", text: "And the whole run is verifiable on chain. Strict readiness, six of six. Forty-five tests. Zero critical findings.",
    run: async (p) => { await p.evaluate(() => { location.hash = "#/agent-run"; window.scrollTo({ top: 0 }); }); await p.waitForTimeout(400); } },
  { id: "closing", text: "Compliance, made verifiable. One command, zero to one, on Pharos.",
    run: async (p) => { await p.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" })); } },
];

const srtTime = (s) => {
  const ms = Math.round(s * 1000);
  const hh = String(Math.floor(ms / 3600000)).padStart(2, "0");
  const mm = String(Math.floor(ms / 60000) % 60).padStart(2, "0");
  const ss = String(Math.floor(ms / 1000) % 60).padStart(2, "0");
  const mmm = String(ms % 1000).padStart(3, "0");
  return `${hh}:${mm}:${ss},${mmm}`;
};

async function main() {
  const REUSE = process.env.REUSE_TTS === "1";
  console.log(`▸ TTS via ${KEY ? `SiliconFlow (${SF_VOICE})` : `macOS say (${SAY_VOICE})`}${REUSE ? " · reusing cached clips" : ""}`);
  // 1. Generate narration + durations
  const durs = [];
  for (let i = 0; i < SEGMENTS.length; i++) {
    const wav = path.join(WORK, `seg${i}.wav`);
    if (!(REUSE && fs.existsSync(wav))) tts(SEGMENTS[i].text, wav);
    durs.push(dur(wav));
    console.log(`  · line ${i + 1}/${SEGMENTS.length}  ${durs[i].toFixed(1)}s  "${SEGMENTS[i].text.slice(0, 46)}…"`);
  }

  // 2. Build subtitles (SRT) with the same timeline the video will follow
  let t = PREROLL, srt = "";
  const starts = [];
  for (let i = 0; i < SEGMENTS.length; i++) {
    starts.push(t);
    srt += `${i + 1}\n${srtTime(t)} --> ${srtTime(t + durs[i])}\n${SEGMENTS[i].text}\n\n`;
    t += durs[i] + GAP;
  }
  const totalAudio = t;
  fs.writeFileSync(path.join(WORK, "subs.srt"), srt);

  // 3. Concatenate audio: preroll + (seg, gap) per line
  silence(PREROLL, path.join(WORK, "pre.wav"));
  silence(GAP, path.join(WORK, "gap.wav"));
  const list = ["pre.wav"];
  for (let i = 0; i < SEGMENTS.length; i++) { list.push(`seg${i}.wav`); list.push("gap.wav"); }
  fs.writeFileSync(path.join(WORK, "alist.txt"), list.map((f) => `file '${f}'`).join("\n"));
  ff(["-f", "concat", "-safe", "0", "-i", path.join(WORK, "alist.txt"), "-ar", "44100", "-ac", "2", path.join(WORK, "narration.wav")]);

  // 4. Record the screen, paced to the audio timeline, captions burned via the DOM
  const b = await chromium.launch({ headless: true });
  const ctx = await b.newContext({ viewport: { width: W, height: H }, recordVideo: { dir: WORK, size: { width: W, height: H } } });
  await ctx.addInitScript(CAP_JS); // caption bar survives every navigation
  const p = await ctx.newPage();
  await p.goto(`${URL}/`, { waitUntil: "networkidle" });
  const t0 = Date.now();
  for (let i = 0; i < SEGMENTS.length; i++) {
    await caption(p, SEGMENTS[i].text);
    await SEGMENTS[i].run(p);
    const targetMs = (starts[i] - PREROLL + durs[i] + GAP) * 1000; // cumulative video offset
    const waitMs = targetMs - (Date.now() - t0);
    if (waitMs > 0) await p.waitForTimeout(waitMs);
  }
  await caption(p, "");
  await p.waitForTimeout(TAIL * 1000);
  await ctx.close(); await b.close();
  const webm = fs.readdirSync(WORK).filter((f) => f.endsWith(".webm")).map((f) => path.join(WORK, f))
    .sort((a, b2) => fs.statSync(b2).mtimeMs - fs.statSync(a).mtimeMs)[0];

  // 5. Mux: captions are already in the pixels → just combine video + narration (no libass needed)
  fs.mkdirSync(OUT, { recursive: true });
  const final = path.join(OUT, "hatchfi-demo-film.mp4");
  ff([
    "-i", webm, "-i", path.join(WORK, "narration.wav"),
    "-map", "0:v:0", "-map", "1:a:0", "-c:v", "libx264", "-crf", "20", "-preset", "medium",
    "-pix_fmt", "yuv420p", "-r", "30", "-c:a", "aac", "-b:a", "160k",
    "-movflags", "+faststart", "-shortest", final,
  ]);
  fs.copyFileSync(path.join(WORK, "subs.srt"), path.join(OUT, "hatchfi-demo-film.srt")); // sidecar SRT too
  console.log(`\n✓ ${final}`);
  console.log(`  ${dur(final).toFixed(1)}s · ${(fs.statSync(final).size / 1e6).toFixed(1)} MB · audio track ${totalAudio.toFixed(1)}s`);
}
main().catch((e) => { console.error(e); process.exit(1); });
