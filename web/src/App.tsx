import { useMemo, useRef, useState } from "react";

import {
  DiligenceGate,
  InMemoryAttestationRegistry,
  createDiligenceSkills,
  callMcpTool,
} from "../../lib/hatchfi-gate/src";
import type {
  AttestationRecord,
  DiligenceFlags,
  GateDecision,
} from "../../lib/hatchfi-gate/src";

const registry = new InMemoryAttestationRegistry();
const gate = new DiligenceGate(registry);
const skills = createDiligenceSkills(gate);

const TOKEN_ADDRESS = "0x975704ca2182b3fc64fd82ad2c01d8ec5be0b5c3";
const EXPLORER = `https://atlantic.pharosscan.xyz/address/${TOKEN_ADDRESS}`;

const ALL_FALSE: DiligenceFlags = {
  sanctionsHit: false,
  duplicateTokenization: false,
  liquidityExitMissing: false,
  rightsUnclear: false,
  docsIncomplete: false,
  kycExpiredOrMissing: false,
  onchainAnomaly: false,
};

type Lang = "en" | "zh";

type Scenario = {
  id: string;
  expected: "GREEN" | "YELLOW" | "RED";
  subject: string;
  evidenceHash: string;
  assetFingerprint: string;
  flags: DiligenceFlags;
};

const SCENARIOS: Scenario[] = [
  {
    id: "clean",
    expected: "GREEN",
    subject: "0xA54A3C2766a80d3AFe7C4Bf00D5bcfF9e1892bc4",
    evidenceHash: "0xgreen-demo-hash",
    assetFingerprint: "0xe8d343f2ca60abadc7ac491a9272fa3b4a19eadfe82629924c4d52794e4c65f3",
    flags: { ...ALL_FALSE },
  },
  {
    id: "ofac",
    expected: "RED",
    subject: "0x7F367cC41522cE07553e823bf3be79A889DEbe1B",
    evidenceHash: "0xred-ofac-hash",
    assetFingerprint: "0x11c1a0d5e0f4b2a7c3d9e8f6a1b2c3d4e5f60718293a4b5c6d7e8f9a0b1c2d3e4",
    flags: { ...ALL_FALSE, sanctionsHit: true },
  },
  {
    id: "kyc",
    expected: "RED",
    subject: "0x2E1b342132f2C619F1A2E4d7f0B8bE0aA8F4C5D6",
    evidenceHash: "0xred-kyc-hash",
    assetFingerprint: "0x22d2b1e6f1a5c3b8d4eaf907b2c3d4e5f60718293a4b5c6d7e8f9a0b1c2d3e4f5",
    flags: { ...ALL_FALSE, kycExpiredOrMissing: true },
  },
  {
    id: "liquidity",
    expected: "YELLOW",
    subject: "0x3F2c453243a3D72aA2B3F5e8f1C9cF1bB9a5D6E7",
    evidenceHash: "0xyellow-liq-hash",
    assetFingerprint: "0x33e3c2f7a2b6d4c9e5fbfa18c3d4e5f60718293a4b5c6d7e8f9a0b1c2d3e4f506",
    flags: { ...ALL_FALSE, liquidityExitMissing: true },
  },
];

type LogEntry = {
  time: string;
  tool: string;
  summary: string;
  tone: "ok" | "warn" | "no" | "info";
  payload: string;
};

const T: Record<Lang, Record<string, string>> = {
  en: {
    brand: "HatchFi",
    brandZh: "链孵",
    tagline: "Compliance Operator Console",
    intro:
      "You are the issuer's compliance operator. Before any MPF shares can be minted, the counterparty must pass this diligence gate — screen them, attest the evidence, then attempt the mint. The gate, not you, decides.",
    liveChip: "Live on Pharos Atlantic · strict 6/6",
    step1: "Choose a counterparty",
    step2: "Operate the gate",
    step2Hint:
      "Three actions, in order — each unlocks the next, exactly like the on-chain contract: mint() reverts unless the evidence hash is attested and passable.",
    step3: "Audit log · every action, on the record",
    step3Hint:
      "Each button above called a real gate tool. This is the operator's trail — and below it, the same tools an AI agent would call over MCP.",
    advanced: "Advanced — edit individual diligence flags",
    actScreen: "Run screening",
    actAttest: "Attest evidence",
    actMint: "Attempt mint",
    stScreen: "Screening",
    stAttest: "Attestation",
    stMint: "Mint",
    stPending: "—",
    stRecorded: "recorded",
    counterparty: "Counterparty",
    evidence: "Evidence",
    mintAllowed: "MINT ALLOWED",
    mintDenied: "MINT DENIED",
    verdictGREEN: "ADMITTED",
    verdictYELLOW: "ADMITTED · REVIEW",
    verdictRED: "BLOCKED",
    noteGREEN: "All checks pass — attest the evidence, then mint.",
    noteYELLOW: "Soft flags raised — the gate admits, but flags for human review.",
    noteRED: "A hard red line tripped. You can still try to attest and mint — watch the gate refuse.",
    logEmpty: "No actions yet. Run the screening in step 2 — every call lands here.",
    rawTools: "Raw MCP tool access (what an agent sees)",
    request: "Request",
    response: "Response",
    runTool: "Run tool",
    runToolHint: "Run the tool to see the JSON response.",
    footer: "Verify locally — no wallet needed:",
    reason_sanctions_ok: "No sanctions hit",
    reason_sanctions_no: "Sanctions hit detected",
    reason_duplicateTokenization_ok: "No duplicate tokenization detected",
    reason_duplicateTokenization_no: "Asset fingerprint already tokenized",
    reason_kyc_ok: "KYC validity present",
    reason_kyc_no: "KYC expired or missing",
    reason_liquidityExit_ok: "Liquidity exit path documented",
    reason_liquidityExit_no: "Liquidity exit path missing",
    reason_rights_ok: "Tokenization rights are clear",
    reason_rights_no: "Rights are unclear",
    reason_documents_ok: "Required documents are complete",
    reason_documents_no: "Required documents are incomplete",
    reason_onchain_ok: "No critical on-chain anomaly",
    reason_onchain_no: "On-chain anomaly detected",
    sc_clean_label: "Clean institutional issuer",
    sc_clean_blurb: "Sanctions clear · KYC valid · rights + docs + exit path complete",
    sc_ofac_label: "OFAC-sanctioned counterparty",
    sc_ofac_blurb: "Sanctions screen hits the Mock OFAC oracle — a hard red line",
    sc_kyc_label: "Issuer with expired KYC",
    sc_kyc_blurb: "Off-chain KYC has lapsed — cannot admit until refreshed",
    sc_liquidity_label: "Thin liquidity / no exit path",
    sc_liquidity_blurb: "No documented redemption route — admit with caution",
    flag_sanctionsHit: "Sanctions hit",
    flag_duplicateTokenization: "Duplicate tokenization",
    flag_kycExpiredOrMissing: "KYC expired / missing",
    flag_liquidityExitMissing: "Liquidity exit missing",
    flag_rightsUnclear: "Rights unclear",
    flag_docsIncomplete: "Documents incomplete",
    flag_onchainAnomaly: "On-chain anomaly",
    log_screen_ok: "screening passed — GREEN",
    log_screen_warn: "screening admitted with review — YELLOW",
    log_screen_no: "screening blocked — RED",
    log_attest: "evidence attested to registry",
    log_attest_red: "RED evidence recorded — not passable for mint",
    log_mint_ok: "mint ALLOWED — decision passed and evidence attested",
    log_mint_no: "mint DENIED by gate",
  },
  zh: {
    brand: "链孵",
    brandZh: "HatchFi",
    tagline: "合规操作员控制台",
    intro:
      "你是发行方的合规操作员。任何 MPF 份额 mint 之前，交易对手必须先过这道尽调闸门——先筛查、再存证、然后尝试 mint。做决定的是闸门，不是你。",
    liveChip: "已上线 Pharos Atlantic · strict 6/6",
    step1: "选择交易对手",
    step2: "操作闸门",
    step2Hint:
      "三个动作，按顺序执行——每一步解锁下一步，与链上合约行为完全一致：evidence hash 未存证或不可通过时 mint() 直接 revert。",
    step3: "审计日志 · 每个动作都有记录",
    step3Hint:
      "上面每个按钮都调用了真实的闸门工具。这是操作员的留痕——下方是 AI agent 通过 MCP 调用的同一批工具。",
    advanced: "高级 — 逐项编辑尽调标志",
    actScreen: "运行筛查",
    actAttest: "存证 evidence",
    actMint: "尝试 mint",
    stScreen: "筛查",
    stAttest: "存证",
    stMint: "Mint",
    stPending: "—",
    stRecorded: "已记录",
    counterparty: "交易对手",
    evidence: "证据",
    mintAllowed: "MINT 放行",
    mintDenied: "MINT 拒绝",
    verdictGREEN: "准入",
    verdictYELLOW: "准入 · 需复核",
    verdictRED: "拦截",
    noteGREEN: "全部检查通过——先存证，再 mint。",
    noteYELLOW: "存在软性标志——闸门放行，但标记人工复核。",
    noteRED: "触碰硬红线。你仍可尝试存证和 mint——看闸门如何拒绝。",
    logEmpty: "尚无操作。在第 2 步运行筛查——每次调用都会落在这里。",
    rawTools: "底层 MCP 工具（agent 看到的形态）",
    request: "请求",
    response: "响应",
    runTool: "运行工具",
    runToolHint: "运行工具以查看 JSON 响应。",
    footer: "本地验证——无需钱包：",
    reason_sanctions_ok: "无制裁命中",
    reason_sanctions_no: "检测到制裁命中",
    reason_duplicateTokenization_ok: "未发现重复代币化",
    reason_duplicateTokenization_no: "资产指纹已被代币化",
    reason_kyc_ok: "KYC 有效",
    reason_kyc_no: "KYC 过期或缺失",
    reason_liquidityExit_ok: "流动性退出路径已成文",
    reason_liquidityExit_no: "缺少流动性退出路径",
    reason_rights_ok: "代币化权利清晰",
    reason_rights_no: "权利不清晰",
    reason_documents_ok: "必要文件齐备",
    reason_documents_no: "必要文件不完整",
    reason_onchain_ok: "无关键链上异常",
    reason_onchain_no: "检测到链上异常",
    sc_clean_label: "干净的机构发行人",
    sc_clean_blurb: "制裁清白 · KYC 有效 · 权利/文件/退出路径齐备",
    sc_ofac_label: "OFAC 受制裁交易方",
    sc_ofac_blurb: "制裁筛查命中 Mock OFAC 预言机——硬红线",
    sc_kyc_label: "KYC 过期的发行人",
    sc_kyc_blurb: "链下 KYC 已失效——刷新前不得准入",
    sc_liquidity_label: "流动性薄弱 / 无退出路径",
    sc_liquidity_blurb: "无成文赎回通道——谨慎准入",
    flag_sanctionsHit: "制裁命中",
    flag_duplicateTokenization: "重复代币化",
    flag_kycExpiredOrMissing: "KYC 过期/缺失",
    flag_liquidityExitMissing: "缺流动性退出",
    flag_rightsUnclear: "权利不清晰",
    flag_docsIncomplete: "文件不完整",
    flag_onchainAnomaly: "链上异常",
    log_screen_ok: "筛查通过 — GREEN",
    log_screen_warn: "筛查放行但需复核 — YELLOW",
    log_screen_no: "筛查拦截 — RED",
    log_attest: "evidence 已存证到 registry",
    log_attest_red: "RED evidence 已记录——mint 不可通过",
    log_mint_ok: "mint 放行——判定通过且 evidence 已存证",
    log_mint_no: "mint 被闸门拒绝",
  },
};

const TOOL_NAMES = [
  "diligence_screen",
  "diligence_rate",
  "diligence_attest",
  "diligence_gate_mint",
  "diligence_get_attestation",
];

function now(): string {
  return new Date().toLocaleTimeString("en-GB", { hour12: false });
}

export default function App() {
  const [lang, setLang] = useState<Lang>("en");
  const [scenarioId, setScenarioId] = useState<string>("clean");
  const [flags, setFlags] = useState<DiligenceFlags>({ ...ALL_FALSE });
  const [subject, setSubject] = useState(SCENARIOS[0].subject);
  const [evidenceHash, setEvidenceHash] = useState(SCENARIOS[0].evidenceHash);
  const [assetFingerprint, setAssetFingerprint] = useState(SCENARIOS[0].assetFingerprint);

  // Operator pipeline state — each stage unlocks the next
  const [screened, setScreened] = useState<GateDecision | null>(null);
  const [attested, setAttested] = useState<AttestationRecord | null>(null);
  const [minted, setMinted] = useState<{ allowed: boolean } | null>(null);
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [openLog, setOpenLog] = useState<number | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  const [toolName, setToolName] = useState("diligence_screen");
  const [mcpOutput, setMcpOutput] = useState<string>("");

  const t = T[lang];

  const input = useMemo(
    () => ({ subject, assetFingerprint, evidenceHash, flags }),
    [subject, assetFingerprint, evidenceHash, flags]
  );

  const mcpRequest = useMemo(() => {
    const args =
      toolName === "diligence_get_attestation"
        ? { evidenceHash }
        : toolName === "diligence_gate_mint"
        ? { to: subject, amount: "1000000000000000000", evidenceHash, flags }
        : input;
    return { tool: toolName, arguments: args };
  }, [toolName, input, subject, evidenceHash, flags]);

  function pushLog(entry: Omit<LogEntry, "time">) {
    setLogEntries((prev) => [...prev, { time: now(), ...entry }]);
    setTimeout(() => logRef.current?.scrollTo({ top: 999999, behavior: "smooth" }), 60);
  }

  function resetPipeline() {
    setScreened(null);
    setAttested(null);
    setMinted(null);
  }

  function selectScenario(s: Scenario) {
    setScenarioId(s.id);
    setFlags({ ...s.flags });
    setSubject(s.subject);
    setEvidenceHash(s.evidenceHash);
    setAssetFingerprint(s.assetFingerprint);
    resetPipeline();
  }

  function toggleFlag(key: keyof DiligenceFlags) {
    setScenarioId("custom");
    setFlags((prev) => ({ ...prev, [key]: !prev[key] }));
    resetPipeline();
  }

  async function runScreen() {
    const decision = await gate.screen(input);
    setScreened(decision);
    setAttested(null);
    setMinted(null);
    const tone = decision.rating === "GREEN" ? "ok" : decision.rating === "YELLOW" ? "warn" : "no";
    pushLog({
      tool: "diligence_screen",
      summary: `${subject.slice(0, 8)}… → ${t[`log_screen_${tone}`]}`,
      tone,
      payload: JSON.stringify(decision, null, 2),
    });
  }

  async function runAttest() {
    const record = await gate.attest(input);
    setAttested(record);
    setMinted(null);
    const isRed = record.rating === "RED";
    pushLog({
      tool: "diligence_attest",
      summary: `${record.evidenceHash.slice(0, 14)}… (${record.rating}) — ${isRed ? t.log_attest_red : t.log_attest}`,
      tone: isRed ? "warn" : "info",
      payload: JSON.stringify(record, null, 2),
    });
  }

  async function runMint() {
    const result = await gate.gateMint({
      to: subject,
      amount: "1000000000000000000",
      evidenceHash,
      flags,
    });
    setMinted({ allowed: result.allowed });
    pushLog({
      tool: "diligence_gate_mint",
      summary: result.allowed ? t.log_mint_ok : t.log_mint_no,
      tone: result.allowed ? "ok" : "no",
      payload: JSON.stringify(result, null, 2),
    });
  }

  async function runTool() {
    try {
      const result = await callMcpTool(skills, toolName, mcpRequest.arguments);
      setMcpOutput(JSON.stringify(result, null, 2));
      pushLog({
        tool: `mcp:${toolName}`,
        summary: `agent called ${toolName}`,
        tone: "info",
        payload: JSON.stringify(result, null, 2),
      });
    } catch (error) {
      setMcpOutput(String(error));
    }
  }

  const verdict = screened;

  return (
    <main className="layout">
      <header className="hero">
        <div className="hero-top">
          <div className="brand">
            <img src={`${import.meta.env.BASE_URL}logo.png`} alt="HatchFi logo" className="brand-logo" />
            <div className="brand-name">
              <h1>
                {t.brand} <span className="brand-alt">· {t.brandZh}</span>
              </h1>
              <p className="tagline">{t.tagline}</p>
            </div>
          </div>
          <button
            className="lang-toggle"
            onClick={() => {
              const next = lang === "en" ? "zh" : "en";
              setLang(next);
              document.documentElement.lang = next === "zh" ? "zh-CN" : "en";
            }}
            aria-label="Switch language"
          >
            {lang === "en" ? "中文" : "EN"}
          </button>
        </div>
        <p className="intro">{t.intro}</p>
        <a className="live-chip" href={EXPLORER} target="_blank" rel="noreferrer">
          <span className="live-dot" />
          {t.liveChip}
          <span className="live-addr">{TOKEN_ADDRESS.slice(0, 6)}…{TOKEN_ADDRESS.slice(-4)}</span>
          <span aria-hidden="true">↗</span>
        </a>
      </header>

      {/* STEP 1 · counterparty */}
      <section className="step">
        <div className="step-head">
          <span className="step-num">1</span>
          <h2>{t.step1}</h2>
        </div>
        <div className="scenarios">
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              className={`scenario ${scenarioId === s.id ? "active" : ""}`}
              onClick={() => selectScenario(s)}
            >
              <span className={`pill r-${s.expected}`}>{s.expected}</span>
              <strong>{t[`sc_${s.id}_label`]}</strong>
              <span className="blurb">{t[`sc_${s.id}_blurb`]}</span>
            </button>
          ))}
        </div>
        <div className="subject-row">
          <span className="subject-label">{t.counterparty}</span>
          <code className="subject-addr">{subject}</code>
          <span className="subject-label">{t.evidence}</span>
          <code className="subject-addr">{evidenceHash}</code>
        </div>
        <details className="advanced">
          <summary>{t.advanced}</summary>
          <div className="flags">
            {(Object.keys(ALL_FALSE) as (keyof DiligenceFlags)[]).map((k) => (
              <button key={k} className={flags[k] ? "on" : ""} onClick={() => toggleFlag(k)}>
                {t[`flag_${k}`]}: {flags[k] ? "true" : "false"}
              </button>
            ))}
          </div>
        </details>
      </section>

      {/* STEP 2 · operate */}
      <section className="step">
        <div className="step-head">
          <span className="step-num">2</span>
          <h2>{t.step2}</h2>
        </div>
        <p className="muted">{t.step2Hint}</p>

        <div className="pipeline-status" role="status">
          <span className={`ps ${verdict ? `r-${verdict.rating}` : ""}`}>
            {t.stScreen}: {verdict ? verdict.rating : t.stPending}
          </span>
          <span className="ps-arrow">→</span>
          <span className={`ps ${attested ? (attested.rating === "RED" ? "r-RED" : "r-GREEN") : ""}`}>
            {t.stAttest}: {attested ? `${t.stRecorded} (${attested.rating})` : t.stPending}
          </span>
          <span className="ps-arrow">→</span>
          <span className={`ps ${minted ? (minted.allowed ? "r-GREEN" : "r-RED") : ""}`}>
            {t.stMint}: {minted ? (minted.allowed ? t.mintAllowed : t.mintDenied) : t.stPending}
          </span>
        </div>

        <div className="action-row">
          <button className="primary" onClick={runScreen}>
            ① {t.actScreen}
          </button>
          <button className="primary" onClick={runAttest} disabled={!screened}>
            ② {t.actAttest}
          </button>
          <button
            className={verdict && verdict.rating === "RED" ? "primary danger" : "primary"}
            onClick={runMint}
            disabled={!attested}
          >
            ③ {t.actMint}
          </button>
        </div>

        {verdict && (
          <>
            <div key={verdict.rating + scenarioId} className={`verdict r-${verdict.rating}`}>
              <div className="verdict-main">
                <span className="rating">{verdict.rating}</span>
                <span className="verb">{t[`verdict${verdict.rating}`]}</span>
                {minted !== null && (
                  <span className={`mint-badge ${minted.allowed ? "ok" : "no"}`}>
                    {minted.allowed ? `✓ ${t.mintAllowed}` : `✗ ${t.mintDenied}`}
                  </span>
                )}
              </div>
              <p className="verdict-note">{t[`note${verdict.rating}`]}</p>
            </div>
            <ul className="checks" key={`checks-${verdict.rating}-${scenarioId}`}>
              {verdict.checks.map((c, i) => (
                <li
                  key={c.key}
                  className={c.passed ? "pass" : "fail"}
                  style={{ animationDelay: `${i * 55}ms` }}
                >
                  <span className="mark">{c.passed ? "✓" : "✗"}</span>
                  <span className="ckey">{c.key}</span>
                  <span className="creason">
                    {t[`reason_${c.key}_${c.passed ? "ok" : "no"}`] ?? c.reason}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {/* STEP 3 · audit log + raw tools */}
      <section className="step">
        <div className="step-head">
          <span className="step-num">3</span>
          <h2>{t.step3}</h2>
        </div>
        <p className="muted">{t.step3Hint}</p>

        <div className="console" ref={logRef}>
          {logEntries.length === 0 && <div className="console-empty">{t.logEmpty}</div>}
          {logEntries.map((e, i) => (
            <div key={i} className={`console-line tone-${e.tone}`}>
              <button className="console-head" onClick={() => setOpenLog(openLog === i ? null : i)}>
                <span className="console-time">{e.time}</span>
                <span className="console-tool">{e.tool}</span>
                <span className="console-summary">{e.summary}</span>
                <span className="console-caret">{openLog === i ? "▾" : "▸"}</span>
              </button>
              {openLog === i && <pre className="io console-payload">{e.payload}</pre>}
            </div>
          ))}
        </div>

        <details className="advanced" style={{ marginTop: 16 }}>
          <summary>{t.rawTools}</summary>
          <div className="mcp" style={{ marginTop: 12 }}>
            <div className="mcp-controls">
              <select value={toolName} onChange={(e) => setToolName(e.target.value)}>
                {TOOL_NAMES.map((tn) => (
                  <option key={tn} value={tn}>
                    {tn}
                  </option>
                ))}
              </select>
              <button className="primary" onClick={runTool}>
                {t.runTool}
              </button>
            </div>
            <div className="mcp-io">
              <div>
                <h3>{t.request}</h3>
                <pre className="io">{JSON.stringify(mcpRequest, null, 2)}</pre>
              </div>
              <div>
                <h3>{t.response}</h3>
                <pre className="io">{mcpOutput || t.runToolHint}</pre>
              </div>
            </div>
          </div>
        </details>
      </section>

      <footer className="footer">
        <span>{t.footer}</span>
        <code>npm run gate:cli</code>
        <code>npm run mcp:probe</code>
        <code>npm run judge:package</code>
        <a href={EXPLORER} target="_blank" rel="noreferrer">
          PharosScan ↗
        </a>
      </footer>
    </main>
  );
}
