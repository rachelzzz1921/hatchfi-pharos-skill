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

const ALL_FALSE: DiligenceFlags = {
  sanctionsHit: false,
  duplicateTokenization: false,
  liquidityExitMissing: false,
  rightsUnclear: false,
  docsIncomplete: false,
  kycExpiredOrMissing: false,
  onchainAnomaly: false,
};

type Scenario = {
  id: string;
  label: string;
  blurb: string;
  expected: "GREEN" | "YELLOW" | "RED";
  subject: string;
  evidenceHash: string;
  assetFingerprint: string;
  flags: DiligenceFlags;
};

const SCENARIOS: Scenario[] = [
  {
    id: "clean",
    label: "Clean institutional issuer",
    blurb: "Sanctions clear · KYC valid · rights + docs + exit path complete",
    expected: "GREEN",
    subject: "0xA54A3C2766a80d3AFe7C4Bf00D5bcfF9e1892bc4",
    evidenceHash: "0xgreen-demo-hash",
    assetFingerprint: "0xe8d343f2ca60abadc7ac491a9272fa3b4a19eadfe82629924c4d52794e4c65f3",
    flags: { ...ALL_FALSE },
  },
  {
    id: "ofac",
    label: "OFAC-sanctioned counterparty",
    blurb: "Sanctions screen hits the Mock OFAC oracle — a hard red line",
    expected: "RED",
    subject: "0x7F367cC41522cE07553e823bf3be79A889DEbe1B",
    evidenceHash: "0xred-ofac-hash",
    assetFingerprint: "0x11c1a0d5e0f4b2a7c3d9e8f6a1b2c3d4e5f60718293a4b5c6d7e8f9a0b1c2d3e4",
    flags: { ...ALL_FALSE, sanctionsHit: true },
  },
  {
    id: "kyc",
    label: "Issuer with expired KYC",
    blurb: "Off-chain KYC has lapsed — cannot admit until refreshed",
    expected: "RED",
    subject: "0x2E1b342132f2C619F1A2E4d7f0B8bE0aA8F4C5D6",
    evidenceHash: "0xred-kyc-hash",
    assetFingerprint: "0x22d2b1e6f1a5c3b8d4eaf907b2c3d4e5f60718293a4b5c6d7e8f9a0b1c2d3e4f5",
    flags: { ...ALL_FALSE, kycExpiredOrMissing: true },
  },
  {
    id: "liquidity",
    label: "Thin liquidity / no exit path",
    blurb: "No documented redemption route — admit with caution (YELLOW)",
    expected: "YELLOW",
    subject: "0x3F2c453243a3D72aA2B3F5e8f1C9cF1bB9a5D6E7",
    evidenceHash: "0xyellow-liq-hash",
    assetFingerprint: "0x33e3c2f7a2b6d4c9e5fbfa18c3d4e5f60718293a4b5c6d7e8f9a0b1c2d3e4f506",
    flags: { ...ALL_FALSE, liquidityExitMissing: true },
  },
];

const FLAG_LABELS: Record<keyof DiligenceFlags, string> = {
  sanctionsHit: "Sanctions hit",
  duplicateTokenization: "Duplicate tokenization",
  kycExpiredOrMissing: "KYC expired / missing",
  liquidityExitMissing: "Liquidity exit missing",
  rightsUnclear: "Rights unclear",
  docsIncomplete: "Documents incomplete",
  onchainAnomaly: "On-chain anomaly",
};

const RATING_COPY: Record<string, { verb: string; note: string }> = {
  GREEN: { verb: "ADMITTED", note: "All checks pass — issuance is allowed to proceed." },
  YELLOW: { verb: "ADMITTED · REVIEW", note: "Soft flags raised — allowed, but flagged for human review." },
  RED: { verb: "BLOCKED", note: "A hard red line tripped — the gate refuses issuance." },
};

const TOOL_NAMES = [
  "diligence_screen",
  "diligence_rate",
  "diligence_attest",
  "diligence_gate_mint",
  "diligence_get_attestation",
];

export default function App() {
  const [scenarioId, setScenarioId] = useState<string>("clean");
  const [flags, setFlags] = useState<DiligenceFlags>({ ...ALL_FALSE });
  const [subject, setSubject] = useState(SCENARIOS[0].subject);
  const [evidenceHash, setEvidenceHash] = useState(SCENARIOS[0].evidenceHash);
  const [assetFingerprint, setAssetFingerprint] = useState(SCENARIOS[0].assetFingerprint);
  const [mintOutput, setMintOutput] = useState<string>("");
  const [mintAllowed, setMintAllowed] = useState<boolean | null>(null);
  const [toolName, setToolName] = useState("diligence_screen");
  const [mcpOutput, setMcpOutput] = useState<string>("");

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
      <header className="header">
        <h1>HatchFi Diligence Gate</h1>
        <p>
          A deterministic RED / YELLOW / GREEN admission gate for compliant RWA issuance — the same
          pure-function engine that ships as CLI, MCP tools, and an on-chain attestation.
        </p>
      </header>

      {/* STEP 1 */}
      <section className="step">
        <div className="step-head">
          <span className="step-num">1</span>
          <h2>Pick a scenario</h2>
        </div>
        <div className="scenarios">
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              className={`scenario ${scenarioId === s.id ? "active" : ""} r-${s.expected}`}
              onClick={() => selectScenario(s)}
            >
              <span className={`pill r-${s.expected}`}>{s.expected}</span>
              <strong>{s.label}</strong>
              <span className="blurb">{s.blurb}</span>
            </button>
          ))}
        </div>
        <details className="advanced">
          <summary>Advanced — toggle individual diligence flags</summary>
          <div className="flags">
            {(Object.keys(FLAG_LABELS) as (keyof DiligenceFlags)[]).map((k) => (
              <button key={k} className={flags[k] ? "on" : ""} onClick={() => toggleFlag(k)}>
                {FLAG_LABELS[k]}: {flags[k] ? "true" : "false"}
              </button>
            ))}
          </div>
        </details>
      </section>

      {/* STEP 2 */}
      <section className="step">
        <div className="step-head">
          <span className="step-num">2</span>
          <h2>Read the verdict</h2>
        </div>
        <div className={`verdict r-${decision.rating}`}>
          <div className="verdict-main">
            <span className="rating">{decision.rating}</span>
            <span className="verb">{RATING_COPY[decision.rating].verb}</span>
          </div>
          <p className="verdict-note">{RATING_COPY[decision.rating].note}</p>
        </div>
        <ul className="checks">
          {decision.checks.map((c) => (
            <li key={c.key} className={c.passed ? "pass" : "fail"}>
              <span className="mark">{c.passed ? "✓" : "✗"}</span>
              <span className="ckey">{c.key}</span>
              <span className="creason">{c.reason}</span>
            </li>
          ))}
        </ul>
        <div className="mint-row">
          <button onClick={runAttestAndMint}>Attest evidence → run mint gate</button>
          {mintAllowed !== null && (
            <span className={`mint-badge ${mintAllowed ? "ok" : "no"}`}>
              mint {mintAllowed ? "ALLOWED" : "DENIED"}
            </span>
          )}
        </div>
        {mintOutput && <pre className="io">{mintOutput}</pre>}
      </section>

      {/* STEP 3 */}
      <section className="step">
        <div className="step-head">
          <span className="step-num">3</span>
          <h2>Same gate, as MCP tools</h2>
        </div>
        <p className="muted">
          Every surface calls the identical engine. Pick a tool to see the exact request an agent
          would send and the response it gets back.
        </p>
        <div className="mcp">
          <div className="mcp-controls">
            <select value={toolName} onChange={(e) => setToolName(e.target.value)}>
              {TOOL_NAMES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <button onClick={runTool}>Run tool</button>
          </div>
          <div className="mcp-io">
            <div>
              <h3>Request</h3>
              <pre className="io">{JSON.stringify(mcpRequest, null, 2)}</pre>
            </div>
            <div>
              <h3>Response</h3>
              <pre className="io">{mcpOutput || "Run the tool to see the JSON response."}</pre>
            </div>
          </div>
        </div>
      </section>

      <footer className="footer">
        Verify locally — no wallet needed:{" "}
        <code>npm run gate:cli</code> · <code>npm run mcp:probe</code> · <code>npm run gate:test</code>
      </footer>
    </main>
  );
}
