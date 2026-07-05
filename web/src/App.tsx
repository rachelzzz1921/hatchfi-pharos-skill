import { useMemo, useState } from "react";

import {
  DiligenceGate,
  InMemoryAttestationRegistry,
  createDiligenceSkills,
  callMcpTool,
} from "../../lib/hatchfi-gate/src";

const registry = new InMemoryAttestationRegistry();
const gate = new DiligenceGate(registry);
const skills = createDiligenceSkills(gate);

type Flags = {
  sanctionsHit: boolean;
  duplicateTokenization: boolean;
  liquidityExitMissing: boolean;
  rightsUnclear: boolean;
  docsIncomplete: boolean;
  kycExpiredOrMissing: boolean;
  onchainAnomaly: boolean;
};

const defaultFlags: Flags = {
  sanctionsHit: false,
  duplicateTokenization: false,
  liquidityExitMissing: false,
  rightsUnclear: false,
  docsIncomplete: false,
  kycExpiredOrMissing: false,
  onchainAnomaly: false,
};

export default function App() {
  const [subject, setSubject] = useState("0xA54A3C2766a80d3AFe7C4Bf00D5bcfF9e1892bc4");
  const [assetFingerprint, setAssetFingerprint] = useState("0xe8d343f2ca60abadc7ac491a9272fa3b4a19eadfe82629924c4d52794e4c65f3");
  const [evidenceHash, setEvidenceHash] = useState("0xgreen-demo-hash");
  const [flags, setFlags] = useState<Flags>(defaultFlags);
  const [screenOutput, setScreenOutput] = useState<string>("");
  const [mintOutput, setMintOutput] = useState<string>("");
  const [mcpOutput, setMcpOutput] = useState<string>("");
  const [toolName, setToolName] = useState("diligence_screen");
  const [activeTab, setActiveTab] = useState<"demo" | "docs">("demo");

  const input = useMemo(
    () => ({
      subject,
      assetFingerprint,
      evidenceHash,
      flags,
    }),
    [subject, assetFingerprint, evidenceHash, flags]
  );

  async function runScreen() {
    try {
      const result = await gate.screen(input);
      setScreenOutput(JSON.stringify(result, null, 2));
    } catch (error) {
      setScreenOutput(String(error));
    }
  }

  async function attestCurrent() {
    try {
      const result = await gate.attest(input);
      setScreenOutput(JSON.stringify({ attested: result }, null, 2));
    } catch (error) {
      setScreenOutput(String(error));
    }
  }

  async function runGateMint() {
    try {
      const attestationBefore = await gate.getAttestation(evidenceHash);
      const result = await gate.gateMint({
        to: subject,
        amount: "1000000000000000000",
        evidenceHash,
        flags,
      });
      setMintOutput(JSON.stringify(result, null, 2));
    } catch (error) {
      setMintOutput(String(error));
    }
  }

  function toggleFlag(key: keyof Flags) {
    setFlags((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function runTool() {
    try {
      const args =
        toolName === "diligence_get_attestation"
          ? { evidenceHash }
          : toolName === "diligence_attest"
          ? input
          : toolName === "diligence_gate_mint"
          ? { to: subject, amount: "1000000000000000000", evidenceHash, flags }
          : input;
      const result = await callMcpTool(skills, toolName, args);
      setMcpOutput(JSON.stringify(result, null, 2));
    } catch (error) {
      setMcpOutput(String(error));
    }
  }

  return (
    <main className="layout">
      <header className="header">
        <h1>HatchFi Diligence Gate</h1>
        <p>Deterministic RED/YELLOW/GREEN gate + MCP-ready tools.</p>
        <div className="tabs">
          <button onClick={() => setActiveTab("demo")} className={activeTab === "demo" ? "active" : ""}>
            Demo
          </button>
          <button onClick={() => setActiveTab("docs")} className={activeTab === "docs" ? "active" : ""}>
            Docs
          </button>
        </div>
      </header>

      {activeTab === "docs" ? (
        <section className="card">
          <h2>Judge Quick Test</h2>
          <ol>
            <li>Set sanctions hit to true and click <code>Run Diligence</code> → must return <strong>RED</strong>.</li>
            <li>Turn all flags off and click <code>Run Diligence</code> → must return <strong>GREEN</strong>.</li>
            <li>Click <code>Attest Current</code>, then <code>Gate Mint</code> → <code>allowed: true</code>.</li>
            <li>Try MCP tool runner on the right with all four tools.</li>
          </ol>
          <pre>{`npm run gate:demo
npm run gate:test
npm run judge:readiness`}</pre>
        </section>
      ) : (
        <section className="grid">
          <div className="card">
            <h2>Inputs</h2>
            <label>
              Subject
              <input value={subject} onChange={(e) => setSubject(e.target.value)} />
            </label>
            <label>
              Asset Fingerprint
              <input value={assetFingerprint} onChange={(e) => setAssetFingerprint(e.target.value)} />
            </label>
            <label>
              Evidence Hash
              <input value={evidenceHash} onChange={(e) => setEvidenceHash(e.target.value)} />
            </label>

            <div className="flags">
              {Object.keys(flags).map((k) => (
                <button
                  key={k}
                  className={flags[k as keyof Flags] ? "on" : ""}
                  onClick={() => toggleFlag(k as keyof Flags)}
                >
                  {k}: {flags[k as keyof Flags] ? "true" : "false"}
                </button>
              ))}
            </div>

            <div className="actions">
              <button onClick={runScreen}>Run Diligence</button>
              <button onClick={attestCurrent}>Attest Current</button>
              <button onClick={runGateMint}>Gate Mint</button>
            </div>
          </div>

          <div className="card">
            <h2>Diligence Output</h2>
            <pre>{screenOutput || "Run diligence to see result."}</pre>
            <h2>Mint Gate Output</h2>
            <pre>{mintOutput || "Run gate mint to see result."}</pre>
          </div>

          <div className="card">
            <h2>MCP Tool Playground</h2>
            <label>
              Tool
              <select value={toolName} onChange={(e) => setToolName(e.target.value)}>
                <option value="diligence_screen">diligence_screen</option>
                <option value="diligence_rate">diligence_rate</option>
                <option value="diligence_attest">diligence_attest</option>
                <option value="diligence_gate_mint">diligence_gate_mint</option>
                <option value="diligence_get_attestation">diligence_get_attestation</option>
              </select>
            </label>
            <button onClick={runTool}>Run Tool</button>
            <pre>{mcpOutput || "Run selected tool to inspect JSON result."}</pre>
          </div>
        </section>
      )}
    </main>
  );
}
