/**
 * make_demo_video.mjs — produce a fully narrated, subtitled HatchFi demo film
 * with branded intro/outro cards.
 *
 *   npm run web:build && npm run web:dev
 *   SILICONFLOW_API_KEY=sk-... npm run demo:video     # neural voice (else macOS `say`)
 *   REUSE_TTS=1 ... npm run demo:video                # reuse cached voice clips
 *   SYNC_OFFSET=0.15 ... npm run demo:video           # nudge captions later (+) / earlier (-)
 *
 * Pipeline: narration → TTS (SiliconFlow /v1/audio/speech or `say`) → screen
 * recording paced to the audio, with captions + full-screen cards drawn in the DOM
 * (this ffmpeg has no libass/drawtext) → mux video + narration. A/V origin is aligned
 * by measuring the real page-load lead-in and using it as the audio pre-roll.
 * Output: ~/Desktop/hatchfi-demo/hatchfi-demo-film.mp4 (+ sidecar .srt).
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
const REUSE = process.env.REUSE_TTS === "1";
const SYNC_OFFSET = parseFloat(process.env.SYNC_OFFSET || "0"); // + = captions/narration later
const W = 1280, H = 800;
const GAP = 0.5;       // silence after each line
const TAIL_SIL = 1.1;  // trailing silence so the outro card lingers
const TAIL = TAIL_SIL + 0.8;

fs.mkdirSync(WORK, { recursive: true });
const ff = (args) => { const r = spawnSync("ffmpeg", ["-y", "-loglevel", "error", ...args]); if (r.status !== 0) throw new Error("ffmpeg: " + (r.stderr || "")); };
const dur = (f) => parseFloat(spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).stdout.toString().trim());
const silence = (secs, out) => ff(["-f", "lavfi", "-i", `anullsrc=r=44100:cl=stereo`, "-t", secs.toFixed(3), "-c:a", "pcm_s16le", out]);

function tts(text, outWav) {
  if (KEY) {
    const mp3 = outWav.replace(/\.wav$/, ".mp3");
    const body = JSON.stringify({ model: SF_MODEL, input: text, voice: SF_VOICE, response_format: "mp3" });
    spawnSync("curl", ["-sS", "--max-time", "90", "-X", "POST", "https://api.siliconflow.cn/v1/audio/speech",
      "-H", `Authorization: Bearer ${KEY}`, "-H", "Content-Type: application/json", "-d", body, "-o", mp3]);
    const ok = fs.existsSync(mp3) && fs.statSync(mp3).size > 2000 && fs.readFileSync(mp3).slice(0, 1)[0] !== 0x7b;
    if (!ok) throw new Error("SiliconFlow TTS failed: " + (fs.existsSync(mp3) ? fs.readFileSync(mp3).toString().slice(0, 200) : "no output"));
    ff(["-i", mp3, "-ar", "44100", "-ac", "2", "-c:a", "pcm_s16le", outWav]);
  } else {
    const aiff = outWav.replace(/\.wav$/, ".aiff");
    spawnSync("say", ["-v", SAY_VOICE, "-r", "182", "-o", aiff, text]);
    ff(["-i", aiff, "-ar", "44100", "-ac", "2", "-c:a", "pcm_s16le", outWav]);
  }
}

// ── Branded cards (full-screen in-page overlays; reuse the console's loaded fonts) ──
const INTRO_HTML = `
<div style="text-align:center;max-width:840px;padding:0 40px;animation:hf-rise .7s ease both">
  <img src="/favicon.png" style="width:104px;height:104px;border-radius:24px;box-shadow:0 14px 48px rgba(0,0,0,.55),0 0 0 1px #21362a;margin-bottom:30px"/>
  <div style="font-family:Fraunces,Georgia,serif;font-size:64px;font-weight:700;color:#eaf3ec;line-height:1.04;letter-spacing:.01em">HatchFi <span style="color:#d9a621">· 链孵</span></div>
  <div style="font-family:Inter,system-ui,sans-serif;font-size:22px;color:#d9a621;font-variant:small-caps;letter-spacing:.06em;margin-top:16px">Where compliant RWAs hatch into Agent Skills</div>
  <div style="font-family:Inter,system-ui,sans-serif;font-size:17px;color:#93a89a;margin-top:22px;line-height:1.65">A deterministic RED / YELLOW / GREEN compliance gate<br/>for real-world-asset issuance on Pharos.</div>
  <div style="display:inline-flex;align-items:center;gap:9px;margin-top:32px;padding:9px 18px;border:1px solid rgba(61,214,140,.35);border-radius:999px;background:rgba(61,214,140,.07);color:#3dd68c;font-family:Inter,system-ui,sans-serif;font-size:14px;font-weight:600">
    <span style="width:7px;height:7px;border-radius:50%;background:#3dd68c;box-shadow:0 0 0 4px rgba(61,214,140,.15)"></span> Live on Pharos Atlantic · strict readiness 6/6
  </div>
</div>`;
const OUTRO_HTML = `
<div style="text-align:center;max-width:880px;padding:0 40px;animation:hf-rise .7s ease both">
  <img src="/favicon.png" style="width:74px;height:74px;border-radius:18px;box-shadow:0 12px 40px rgba(0,0,0,.55),0 0 0 1px #21362a;margin-bottom:26px"/>
  <div style="font-family:Fraunces,Georgia,serif;font-size:54px;font-weight:700;color:#eaf3ec;line-height:1.1">Compliance, made verifiable.</div>
  <div style="font-family:Inter,system-ui,sans-serif;font-size:19px;color:#93a89a;margin-top:16px">One command, zero to one — on Pharos.</div>
  <div style="display:inline-flex;align-items:center;gap:9px;margin-top:30px;padding:9px 18px;border:1px solid rgba(61,214,140,.35);border-radius:999px;background:rgba(61,214,140,.07);color:#3dd68c;font-family:Inter,system-ui,sans-serif;font-size:14px;font-weight:600">
    <span style="width:7px;height:7px;border-radius:50%;background:#3dd68c;box-shadow:0 0 0 4px rgba(61,214,140,.15)"></span> Live on Atlantic · 0x9757…b5C3
  </div>
  <div style="font-family:ui-monospace,'SF Mono',Menlo,monospace;font-size:15px;color:#2ee0b4;margin-top:26px;background:#0e1c15;border:1px solid #21362a;border-radius:9px;padding:11px 20px;display:inline-block">npm run judge:package</div>
  <div style="font-family:Inter,system-ui,sans-serif;font-size:13px;color:#5c7568;margin-top:22px">github.com/rachelzzz1921/hatchfi-pharos-skill</div>
</div>`;

const CARD_BG = "radial-gradient(900px 480px at 78% -8%, rgba(217,166,33,.08), transparent 60%),radial-gradient(1100px 700px at 15% -10%, #10241a, #081410 60%)";
const OVERLAY_JS = `
(() => {
  const INTRO = ${JSON.stringify(INTRO_HTML)};
  const install = () => {
    if (window.__ovInit) return; window.__ovInit = true;
    const st = document.createElement('style'); st.textContent = '@keyframes hf-rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}'; document.head.appendChild(st);
    const card = document.createElement('div'); card.id='__card';
    card.style.cssText = 'position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;background:${CARD_BG};opacity:1;transition:opacity .45s ease;pointer-events:none';
    card.innerHTML = INTRO;
    const cap = document.createElement('div'); cap.id='__cap';
    cap.style.cssText = 'position:fixed;left:50%;bottom:38px;transform:translateX(-50%);max-width:80%;z-index:2147483647;font-family:Inter,system-ui,-apple-system,sans-serif;font-size:20px;line-height:1.5;font-weight:500;color:#eaf3ec;background:rgba(8,20,16,.92);border:1px solid rgba(217,166,33,.5);border-radius:13px;padding:12px 24px;text-align:center;box-shadow:0 12px 44px rgba(0,0,0,.55);opacity:0;transition:opacity .26s ease;-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);pointer-events:none';
    const add = () => { document.body.appendChild(card); document.body.appendChild(cap); };
    if (document.body) add(); else document.addEventListener('DOMContentLoaded', add);
    window.__card = (h) => { if (h) { card.innerHTML = h; card.style.opacity='1'; } else { card.style.opacity='0'; } };
    window.__cap = (t) => { cap.textContent = t || ''; cap.style.opacity = t ? '1' : '0'; };
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install); else install();
})();`;

const caption = (p, t) => p.evaluate((x) => window.__cap && window.__cap(x), t);
const showCard = (p, h) => p.evaluate((x) => window.__card && window.__card(x), h);
const hideCard = (p) => p.evaluate(() => window.__card && window.__card(""));

// ── Storyboard: narration + the beat it plays over ─────────────────────────
const act = (p, n) => p.locator(".action-row button").nth(n);
const scrollTo = (p, sel) => p.evaluate((s) => document.querySelector(s)?.scrollIntoView({ behavior: "smooth", block: "center" }), sel);

const SEGMENTS = [
  { id: "intro", card: true, text: "HatchFi. A compliant real-world asset — screened, issued, and hatched into its own agent skill. End to end, on Pharos.",
    run: async (p) => { await showCard(p, INTRO_HTML); } },
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
  { id: "closing", card: true, text: "Compliance, made verifiable. One command, zero to one, on Pharos.",
    run: async (p) => { await showCard(p, OUTRO_HTML); } },
];

const srtTime = (s) => {
  const ms = Math.round(s * 1000);
  const p2 = (n) => String(n).padStart(2, "0");
  return `${p2(Math.floor(ms / 3600000))}:${p2(Math.floor(ms / 60000) % 60)}:${p2(Math.floor(ms / 1000) % 60)},${String(ms % 1000).padStart(3, "0")}`;
};

async function main() {
  console.log(`▸ TTS via ${KEY ? `SiliconFlow (${SF_VOICE})` : `macOS say (${SAY_VOICE})`}${REUSE ? " · reusing cached clips" : ""}`);
  // 1. Narration + durations
  const durs = [];
  for (let i = 0; i < SEGMENTS.length; i++) {
    const wav = path.join(WORK, `seg${i}.wav`);
    if (!(REUSE && fs.existsSync(wav))) tts(SEGMENTS[i].text, wav);
    durs.push(dur(wav));
    console.log(`  · line ${i + 1}/${SEGMENTS.length}  ${durs[i].toFixed(1)}s  "${SEGMENTS[i].text.slice(0, 44)}…"`);
  }

  // 2. Record the screen, paced to the audio, measuring the real load lead-in
  const b = await chromium.launch({ headless: true });
  const ctx = await b.newContext({ viewport: { width: W, height: H }, recordVideo: { dir: WORK, size: { width: W, height: H } } });
  await ctx.addInitScript({ content: OVERLAY_JS });
  const pg = await ctx.newPage();
  const tRec = Date.now();
  await pg.goto(`${URL}/`, { waitUntil: "networkidle" });
  await pg.evaluate(OVERLAY_JS); // safety re-install
  const t0 = Date.now();
  const leadIn = (t0 - tRec) / 1000; // seconds of video before narration should start
  console.log(`  · lead-in measured: ${leadIn.toFixed(2)}s → audio pre-roll`);
  let cum = 0;
  for (let i = 0; i < SEGMENTS.length; i++) {
    if (SEGMENTS[i].card) { await caption(pg, ""); } else { await hideCard(pg); await caption(pg, SEGMENTS[i].text); }
    await SEGMENTS[i].run(pg);
    cum += durs[i] + GAP;
    const waitMs = cum * 1000 - (Date.now() - t0);
    if (waitMs > 0) await pg.waitForTimeout(waitMs);
  }
  await caption(pg, ""); // outro card stays up through the tail
  await pg.waitForTimeout(TAIL * 1000);
  await ctx.close(); await b.close();
  const webm = fs.readdirSync(WORK).filter((f) => f.endsWith(".webm")).map((f) => path.join(WORK, f))
    .sort((a, c) => fs.statSync(c).mtimeMs - fs.statSync(a).mtimeMs)[0];

  // 3. Assemble audio: pre-roll = measured lead-in (+ optional nudge), then lines + gaps + tail
  const preroll = Math.max(0.05, leadIn + SYNC_OFFSET);
  silence(preroll, path.join(WORK, "pre.wav"));
  silence(GAP, path.join(WORK, "gap.wav"));
  silence(TAIL_SIL, path.join(WORK, "tail.wav"));
  const list = ["pre.wav"];
  for (let i = 0; i < SEGMENTS.length; i++) { list.push(`seg${i}.wav`, "gap.wav"); }
  list.push("tail.wav");
  fs.writeFileSync(path.join(WORK, "alist.txt"), list.map((f) => `file '${f}'`).join("\n"));
  ff(["-f", "concat", "-safe", "0", "-i", path.join(WORK, "alist.txt"), "-ar", "44100", "-ac", "2", path.join(WORK, "narration.wav")]);

  // 4. Sidecar SRT on the same timeline
  let t = preroll, srt = "";
  for (let i = 0; i < SEGMENTS.length; i++) { srt += `${i + 1}\n${srtTime(t)} --> ${srtTime(t + durs[i])}\n${SEGMENTS[i].text}\n\n`; t += durs[i] + GAP; }
  fs.writeFileSync(path.join(WORK, "subs.srt"), srt);

  // 5. Mux — captions/cards are already in the pixels, so just combine video + narration
  fs.mkdirSync(OUT, { recursive: true });
  const final = path.join(OUT, "hatchfi-demo-film.mp4");
  ff(["-i", webm, "-i", path.join(WORK, "narration.wav"),
    "-map", "0:v:0", "-map", "1:a:0", "-c:v", "libx264", "-crf", "20", "-preset", "medium",
    "-pix_fmt", "yuv420p", "-r", "30", "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", "-shortest", final]);
  fs.copyFileSync(path.join(WORK, "subs.srt"), path.join(OUT, "hatchfi-demo-film.srt"));
  console.log(`\n✓ ${final}`);
  console.log(`  ${dur(final).toFixed(1)}s · ${(fs.statSync(final).size / 1e6).toFixed(1)} MB`);
}
main().catch((e) => { console.error(e); process.exit(1); });
