# How to record the HatchFi demo video — smooth, in one take

Two reference recordings are already generated at `~/Desktop/hatchfi-demo/`:
- `hatchfi-console-tour.mp4` — the operator console, full flow (~30 s)
- `hatchfi-agentrun-fill.mp4` — the Agent Run dashboard filling in live (~26 s)

Watch those first: they *are* the smooth flow. You can either (A) narrate over them as
B-roll, or (B) film your own take using the steps below. The storyboard with shot timing
and narration is `docs/VIDEO_STORYBOARD.md`.

## Once, before recording

```bash
cd pharos-rwa-skill
npm install                       # if fresh
npm run web:dev                   # leave running in its own terminal tab
```

Then in the browser:
- Open `http://localhost:5173/` (operator console) and `http://localhost:5173/#/agent-run` (Agent Run) — one in each of two windows if you want split-screen.
- Browser zoom **100%**, window ~1280×800. Hide bookmarks bar. Enable **Do Not Disturb** (no notification banners).
- Recorder: macOS `Cmd+Shift+5` (or QuickTime / OBS). Record a **region** around the browser, not the whole screen. 1080p is plenty.

**Reset between takes** = just reload the page (`Cmd+R`). All console state (audit log, sedimented rules) is in-memory, so a reload gives you a clean slate every time.

## Option A — product tour (~40 s, no terminal, easiest)

Reload the console, then, slowly (pause ~1.5 s on each result so it reads on camera):

1. **Hero** — let the "Live on Pharos Atlantic · 6/6" chip breathe (2 s).
2. **Step 1** — click **OFAC-sanctioned counterparty**.
3. **Step 2** — **① Run screening** → giant **RED · BLOCKED** (point out `sanctions` ✗). **② Attest** → **③ Attempt mint** → **MINT DENIED**.
4. Click **Clean institutional issuer** → **① ② ③** again → **GREEN · ADMITTED → MINT ALLOWED**.
5. **Step 3** — scroll the audit log; expand one entry to show the raw JSON.
6. **Step 4** — pick **Default holder cap**, type `250`, tick the 🔑 consent box, **Sediment rule** → watch it join the profile + history + audit log. (This is the flywheel.)
7. Toggle **中文** once to show the whole thing is bilingual.

That single scroll-through *is* a complete demo. The reference `hatchfi-console-tour.mp4` follows exactly this.

## Option B — narrated zero-to-one, split-screen (the strong one)

Left = terminal, right = browser at `/#/agent-run`. The terminal drives; the dashboard fills in live (~3 s poll).

1. Have this ready in the terminal (don't press Enter yet):
   ```bash
   npm run demo:journey
   ```
2. Start recording. The first line does `--reset`, so the dashboard genuinely starts at **0 steps** on camera.
3. Press **Enter** to advance one phase at a time and narrate each beat:
   - **A · Diligence** — OFAC address blocked (RED), clean issuer admitted (GREEN), evidence attested.
   - **B · Issuance** — preflight + deploy the ERC-3643 token + registry (say "the real token is live at 0x9757…b5C3").
   - **C · Lifecycle** — attestation-gated mint, bound to the recipient.
   - **D · Skill hatch** — the asset spawns its own private Skill and sediments your rules.
   - **E · Verify** — strict 6/6 · 45 tests · 64/64 evals · 0 critical/high.
   Each time you press Enter, the matching phase lights up green on the right within ~3 s.
4. End on the dashboard showing **5/5 phases · 100% success**.

Reference: `hatchfi-agentrun-fill.mp4` shows the right-hand fill.

## Smoothness checklist

- **Rehearse once** with `npm run demo:journey -- --auto` (hands-free) to learn the beats.
- Move the mouse **deliberately**; pause on every verdict/badge so it registers on video.
- If a live on-chain part ever hesitates (RPC rate limit), it doesn't matter — screening/attest/mint in the console are the deterministic gate primitive, no network.
- Cut to B-roll at the end: the deck (`docs/deck/index.html`), and PharosScan for the live token.
- Suggested length **2:00–2:30**. Structure: RED-block hook (0:15) → GREEN issue (0:30) → lifecycle + flywheel (0:40) → verify + on-chain (0:30) → closing line.

## Closing line

> "Compliance, made verifiable. One command, zero-to-one, on Pharos."
