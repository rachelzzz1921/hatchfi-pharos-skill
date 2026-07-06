# HatchFi · Zero-to-One Demo Video — Storyboard

A ~2:30 split-screen video that shows a compliant real-world asset going from
**nothing → admitted → issued → hatched → verified**, driven by one command while
the Agent Run dashboard fills in live.

## Setup (before recording)

Two windows, side by side:

- **Left — terminal** (large font, dark theme):
  ```bash
  cd pharos-rwa-skill
  npm run web:dev            # in a separate tab; leave running
  # then, in the recording tab, have this ready to press Enter on:
  npm run demo:journey
  ```
- **Right — browser** at `http://localhost:5173/#/agent-run` (the Agent Run dashboard).
  It polls every 3 s, so each phase the terminal completes lights up on the right within ~3 s.

Optional B-roll to cut to at the end: the operator console (`/`), the deck (`docs/deck/index.html`),
and PharosScan for the live token.

Interactive mode pauses between phases (press Enter) — perfect for narrating each beat. Use
`npm run demo:journey -- --auto` for a rehearsal/timing pass, or `-- --broadcast` (with a funded
`PRIVATE_KEY`) if you want phase B to be a real Atlantic deploy on camera.

## Shots

| # | Time | Left (terminal) | Right (dashboard) | Narration (EN) |
|---|---|---|---|---|
| 0 | 0:00–0:12 | Title card / empty console | Agent Run: **0 steps**, stepper all grey | "This is HatchFi. Watch a regulated real-world asset go from nothing to live on-chain — and every step lands in an audit trail as it happens." |
| 1 | 0:12–0:40 | `npm run demo:journey` → **Phase A · Diligence**: RED block, then GREEN, then attest | **A · Diligence** turns green ✓, first step rows appear | "First, admission. Screen the counterparty against the OFAC snapshot — a sanctioned address is blocked, RED. A clean issuer passes, GREEN. We attest the evidence hash on-chain — a hash only, no PII ever leaves the issuer." |
| 2 | 0:40–1:05 | Enter → **Phase B · Issuance**: preflight OK, deploy the ERC-3643 token + registry | **B · Issuance** ✓ | "Now issuance. Preflight Atlantic, then deploy the ERC-3643-style compliant token and the attestation registry." (say "dry-run here; the real token is already live at 0x9757…b5C3") |
| 3 | 1:05–1:30 | Enter → **Phase C · Lifecycle**: gated mint ALLOWED | **C · Lifecycle** ✓ | "Register the investor, then mint. The contract reverts unless the evidence hash is attested, still valid, and bound to this exact recipient — a stale or reused clearance can't mint." |
| 4 | 1:30–1:50 | Enter → **Phase D · Skill hatch** | **D · Skill** ✓ | "When the asset issues, it hatches its own private operating Skill — address baked in, playbooks scoped. The more you use it, the better it fits. That's the flywheel." |
| 5 | 1:50–2:10 | Enter → **Phase E · Verify**: strict 6/6 · 45 tests · 64/64 evals · 0 critical/high | **E · Verify** ✓, **5/5 phases · 100% success** | "And it's all reproducible: strict on-chain readiness six-of-six, forty-five contract tests, sixty-four evals, zero critical findings — and every step you just saw is a timestamped event on the record." |
| 6 | 2:10–2:30 | (cut to B-roll) | Operator console → deck → PharosScan token page | "Compliance, made verifiable. One command, zero-to-one, on Pharos." |

## Notes

- The RED→GREEN screening beat (shot 1) is the emotional core — let it breathe; zoom the terminal.
- Keep the dashboard's `LIVE · Updated …` timestamp visible so viewers see it's real-time, not a mockup.
- The `demo:start --reset` at the top clears the feed, so the dashboard genuinely starts at 0 steps on camera.
- 中文配音：术语（diligence / attest / mint / RED / GREEN）保留英文，其余用中文口播；节奏同上。
