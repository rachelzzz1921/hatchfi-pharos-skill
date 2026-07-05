import { useMemo, useState } from "react";

import {
  DiligenceGate,
  InMemoryAttestationRegistry,
  createDiligenceSkills,
  callMcpTool,
  evaluateDiligence,
} from "../../lib/hatchfi-gate/src";
import type { DiligenceFlags } from "../../lib/hatchfi-gate/src";

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

const T: Record<Lang, Record<string, string>> = {
  en: {
    brand: "HatchFi",
    brandZh: "链孵",
    tagline: "Where compliant RWAs hatch into Agent Skills",
    intro:
      "A deterministic RED / YELLOW / GREEN admission gate for compliant RWA issuance — one pure-function engine shipped as CLI, MCP tools, and an on-chain attestation-gated mint.",
    liveChip: "Live on Pharos Atlantic · strict 6/6",
    step1: "Pick a scenario",
    step2: "Read the verdict",
    step3: "Same gate, as MCP tools",
    advanced: "Advanced — toggle individual diligence flags",
    attestMint: "Attest evidence → run mint gate",
    mintAllowed: "mint ALLOWED",
    mintDenied: "mint DENIED",
    mcpIntro:
      "Every surface calls the identical engine. Pick a tool to see the exact request an agent would send and the response it gets back.",
    request: "Request",
    response: "Response",
    runTool: "Run tool",
    runToolHint: "Run the tool to see the JSON response.",
    footer: "Verify locally — no wallet needed:",
    verdictGREEN: "ADMITTED",
    verdictYELLOW: "ADMITTED · REVIEW",
    verdictRED: "BLOCKED",
    noteGREEN: "All checks pass — issuance is allowed to proceed.",
    noteYELLOW: "Soft flags raised — allowed, but flagged for human review.",
    noteRED: "A hard red line tripped — the gate refuses issuance.",
    gateResult: "Gate result",
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
  },
  zh: {
    brand: "链孵",
    brandZh: "HatchFi",
    tagline: "合规 RWA 在这里孵化为 Agent Skill",
    intro:
      "面向合规 RWA 发行的确定性 RED / YELLOW / GREEN 准入闸门——同一个纯函数引擎，以 CLI、MCP 工具与链上 attestation 门禁 mint 三种形态交付。",
    liveChip: "已上线 Pharos Atlantic · strict 6/6",
    step1: "选择场景",
    step2: "查看判定",
    step3: "同一闸门 · MCP 工具形态",
    advanced: "高级 — 逐项切换尽调标志",
    attestMint: "存证 evidence → 运行 mint 闸门",
    mintAllowed: "mint 放行",
    mintDenied: "mint 拒绝",
    mcpIntro: "所有形态调用同一引擎。选择一个工具，查看 agent 实际发送的请求与收到的响应。",
    request: "请求",
    response: "响应",
    runTool: "运行工具",
    runToolHint: "运行工具以查看 JSON 响应。",
    footer: "本地验证——无需钱包：",
    verdictGREEN: "准入",
    verdictYELLOW: "准入 · 需复核",
    verdictRED: "拦截",
    noteGREEN: "全部检查通过——允许继续发行。",
    noteYELLOW: "存在软性标志——放行，但标记人工复核。",
    noteRED: "触碰硬红线——闸门拒绝发行。",
    gateResult: "闸门结果",
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
  },
};

const TOOL_NAMES = [
  "diligence_screen",
  "diligence_rate",
  "diligence_attest",
  "diligence_gate_mint",
  "diligence_get_attestation",
];

export default function App() {
  const [lang, setLang] = useState<Lang>("en");
  const [scenarioId, setScenarioId] = useState<string>("clean");
  const [flags, setFlags] = useState<DiligenceFlags>({ ...ALL_FALSE });
  const [subject, setSubject] = useState(SCENARIOS[0].subject);
  const [evidenceHash, setEvidenceHash] = useState(SCENARIOS[0].evidenceHash);
  const [assetFingerprint, setAssetFingerprint] = useState(SCENARIOS[0].assetFingerprint);
  const [mintOutput, setMintOutput] = useState<string>("");
  const [mintAllowed, setMintAllowed] = useState<boolean | null>(null);
  const [toolName, setToolName] = useState("diligence_screen");
  const [mcpOutput, setMcpOutput] = useState<string>("");

  const t = T[lang];
  const decision = useMemo(() => evaluateDiligence(flags), [flags]);

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

  function selectScenario(s: Scenario) {
    setScenarioId(s.id);
    setFlags({ ...s.flags });
    setSubject(s.subject);
    setEvidenceHash(s.evidenceHash);
    setAssetFingerprint(s.assetFingerprint);
    setMintOutput("");
    setMintAllowed(null);
    setMcpOutput("");
  }

  function toggleFlag(key: keyof DiligenceFlags) {
    setScenarioId("custom");
    setFlags((prev) => ({ ...prev, [key]: !prev[key] }));
    setMintOutput("");
    setMintAllowed(null);
  }

  async function runAttestAndMint() {
    try {
      await gate.attest(input);
      const result = await gate.gateMint({
        to: subject,
        amount: "1000000000000000000",
        evidenceHash,
        flags,
      });
      setMintAllowed(result.allowed);
      setMintOutput(JSON.stringify(result, null, 2));
    } catch (error) {
      setMintAllowed(false);
      setMintOutput(String(error));
    }
  }

  async function runTool() {
    try {
      const result = await callMcpTool(skills, toolName, mcpRequest.arguments);
      setMcpOutput(JSON.stringify(result, null, 2));
    } catch (error) {
      setMcpOutput(String(error));
    }
  }

  return (
    <main className="layout">
      <header className="hero">
        <div className="hero-top">
          <div className="brand">
            <img src="/logo.png" alt="HatchFi logo" className="brand-logo" />
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

      {/* STEP 1 */}
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

      {/* STEP 2 */}
      <section className="step">
        <div className="step-head">
          <span className="step-num">2</span>
          <h2>{t.step2}</h2>
        </div>
        <div key={decision.rating} className={`verdict r-${decision.rating}`}>
          <div className="verdict-main">
            <span className="rating">{decision.rating}</span>
            <span className="verb">{t[`verdict${decision.rating}`]}</span>
          </div>
          <p className="verdict-note">{t[`note${decision.rating}`]}</p>
        </div>
        <ul className="checks" key={`checks-${decision.rating}-${scenarioId}`}>
          {decision.checks.map((c, i) => (
            <li
              key={c.key}
              className={c.passed ? "pass" : "fail"}
              style={{ animationDelay: `${i * 55}ms` }}
            >
              <span className="mark">{c.passed ? "✓" : "✗"}</span>
              <span className="ckey">{c.key}</span>
              <span className="creason">{t[`reason_${c.key}_${c.passed ? "ok" : "no"}`] ?? c.reason}</span>
            </li>
          ))}
        </ul>
        <div className="mint-row">
          <button
            className={decision.allowed ? "primary" : "primary danger"}
            onClick={runAttestAndMint}
          >
            {t.attestMint}
          </button>
          {mintAllowed !== null && (
            <span className={`mint-badge ${mintAllowed ? "ok" : "no"}`}>
              {mintAllowed ? `✓ ${t.mintAllowed}` : `✗ ${t.mintDenied}`}
            </span>
          )}
        </div>
        {mintOutput && (
          <div className="gate-result">
            <h3 className="io-label">{t.gateResult}</h3>
            <pre className="io">{mintOutput}</pre>
          </div>
        )}
      </section>

      {/* STEP 3 */}
      <section className="step">
        <div className="step-head">
          <span className="step-num">3</span>
          <h2>{t.step3}</h2>
        </div>
        <p className="muted">{t.mcpIntro}</p>
        <div className="mcp">
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
