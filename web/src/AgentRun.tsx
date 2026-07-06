import { useCallback, useEffect, useMemo, useState } from "react";

type Lang = "en" | "zh";
type RunStatus = "ok" | "fail" | "skip" | "running" | "warn";

export type RunEvent = {
  ts: string;
  phase: string;
  step: string;
  status: RunStatus;
  summary: string;
  tx?: string;
  address?: string;
  evidence?: string;
};

const PHASES = [
  { id: "A", en: "Diligence", zh: "尽调", fullEn: "Diligence Gate", fullZh: "尽调闸门" },
  { id: "B", en: "Issuance", zh: "发行", fullEn: "Compliant Issuance", fullZh: "合规发行" },
  { id: "C", en: "Lifecycle", zh: "运营", fullEn: "Lifecycle Ops", fullZh: "生命周期" },
  { id: "D", en: "Skill", zh: "孵化", fullEn: "Skill Hatch", fullZh: "Skill 孵化" },
  { id: "E", en: "Verify", zh: "验证", fullEn: "Security Gate", fullZh: "安全闸门" },
] as const;

const T: Record<Lang, Record<string, string>> = {
  en: {
    title: "Agent Run",
    subtitle: "What the agent is doing — and the audit trail behind it",
    back: "Console",
    live: "Live",
    updated: "Updated",
    now: "Current step",
    progress: "Pipeline",
    of: "/",
    phases: "phases complete",
    recent: "Step history",
    showAll: "Show all steps",
    showLess: "Show fewer",
    emptyTitle: "No activity yet",
    emptyHint: "Run the demo feed to see the agent pipeline:",
    statusOk: "On track",
    statusFail: "Blocked",
    statusWarn: "Needs review",
    statusRunning: "Running",
    statusIdle: "Waiting",
    viewTx: "Transaction",
    viewContract: "Contract",
    evidence: "Evidence",
    step: "step",
    steps: "steps",
    success: "success",
    filterClear: "All phases",
    filterActive: "Showing phase",
    tapPhase: "Tap a phase to filter history",
    harness: "Source: .hatchfi/run-events.jsonl · mirrored to state.progress[]",
    expand: "Details",
    collapse: "Hide",
    onChain: "on-chain",
  },
  zh: {
    title: "Agent 运行",
    subtitle: "Agent 在做什么 — 以及背后的审计轨迹",
    back: "控制台",
    live: "实时",
    updated: "更新于",
    now: "当前步骤",
    progress: "流水线",
    of: "/",
    phases: "阶段完成",
    recent: "步骤历史",
    showAll: "展开全部步骤",
    showLess: "收起",
    emptyTitle: "暂无运行记录",
    emptyHint: "运行 demo 即可看到 Agent 流水线：",
    statusOk: "正常进行",
    statusFail: "已阻断",
    statusWarn: "需人工复核",
    statusRunning: "执行中",
    statusIdle: "等待中",
    viewTx: "交易",
    viewContract: "合约",
    evidence: "证据",
    step: "步",
    steps: "步",
    success: "成功",
    filterClear: "全部阶段",
    filterActive: "筛选阶段",
    tapPhase: "点击阶段可筛选下方历史",
    harness: "来源：.hatchfi/run-events.jsonl · 同步 state.progress[]",
    expand: "详情",
    collapse: "收起",
    onChain: "链上",
  },
};

function parseNdjson(text: string): RunEvent[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => JSON.parse(l) as RunEvent);
}

function statusClass(s: RunStatus): string {
  if (s === "ok") return "run-ok";
  if (s === "fail") return "run-fail";
  if (s === "warn") return "run-warn";
  if (s === "running") return "run-running";
  return "run-skip";
}

function statusLabel(s: RunStatus, lang: Lang): string {
  const m = T[lang];
  if (s === "ok") return m.statusOk;
  if (s === "fail") return m.statusFail;
  if (s === "warn") return m.statusWarn;
  if (s === "running") return m.statusRunning;
  return m.statusIdle;
}

function phaseMeta(id: string, lang: Lang) {
  const p = PHASES.find((x) => x.id === id);
  if (!p) return { short: id, full: id };
  return {
    short: lang === "en" ? p.en : p.zh,
    full: lang === "en" ? p.fullEn : p.fullZh,
  };
}

function formatTimeShort(ts: string, lang: Lang): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleTimeString(lang === "zh" ? "zh-CN" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTimeFull(ts: string, lang: Lang): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleString(lang === "zh" ? "zh-CN" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  });
}

function friendlyStep(step: string): string {
  return step.replace(/:/g, " · ");
}

function shortHash(s: string): string {
  if (s.length <= 16) return s;
  return `${s.slice(0, 10)}…${s.slice(-8)}`;
}

function explorerTx(tx: string) {
  return `https://atlantic.pharosscan.xyz/tx/${tx}`;
}
function explorerAddr(addr: string) {
  return `https://atlantic.pharosscan.xyz/address/${addr}`;
}

function Attachments({ e, lang, compact }: { e: RunEvent; lang: Lang; compact?: boolean }) {
  const t = T[lang];
  const has = e.tx || e.address || e.evidence;
  if (!has) return null;

  return (
    <div className={`run-attach ${compact ? "run-attach-compact" : ""}`}>
      {e.tx && (
        <a className="run-attach-chip run-attach-tx" href={explorerTx(e.tx)} target="_blank" rel="noreferrer">
          <span className="run-attach-label">{t.viewTx}</span>
          <span className="run-attach-val">{shortHash(e.tx)}</span>
          <span className="run-attach-arrow" aria-hidden>
            ↗
          </span>
        </a>
      )}
      {e.address && (
        <a className="run-attach-chip" href={explorerAddr(e.address)} target="_blank" rel="noreferrer">
          <span className="run-attach-label">{t.viewContract}</span>
          <span className="run-attach-val">{shortHash(e.address)}</span>
          <span className="run-attach-arrow" aria-hidden>
            ↗
          </span>
        </a>
      )}
      {e.evidence && (
        <span className={`run-attach-chip run-attach-evidence ${e.evidence.startsWith("0x") ? "is-hash" : ""}`}>
          <span className="run-attach-label">{t.evidence}</span>
          <span className="run-attach-val" title={e.evidence}>
            {e.evidence.startsWith("0x") ? shortHash(e.evidence) : e.evidence}
          </span>
          {e.evidence.startsWith("0x") && <span className="run-attach-tag">{t.onChain}</span>}
        </span>
      )}
    </div>
  );
}

function HistoryRow({
  e,
  lang,
  isFirst,
  defaultOpen,
}: {
  e: RunEvent;
  lang: Lang;
  isFirst: boolean;
  defaultOpen?: boolean;
}) {
  const t = T[lang];
  const pm = phaseMeta(e.phase, lang);
  const hasExtra = Boolean(e.tx || e.address || e.evidence);
  const [open, setOpen] = useState(defaultOpen ?? false);

  return (
    <li className={`run-history-item ${statusClass(e.status)} ${isFirst ? "run-history-latest" : ""}`}>
      <div className="run-history-main">
        <span className={`run-history-icon ${statusClass(e.status)}`} aria-hidden>
          {e.status === "ok" ? "✓" : e.status === "fail" ? "✗" : e.status === "warn" ? "!" : "·"}
        </span>
        <div className="run-history-body">
          <div className="run-history-row1">
            <span className="run-history-phase">
              {e.phase} · {pm.short}
            </span>
            <span className={`run-history-status ${statusClass(e.status)}`}>{statusLabel(e.status, lang)}</span>
            <time className="run-history-time" dateTime={e.ts} title={formatTimeFull(e.ts, lang)}>
              {formatTimeShort(e.ts, lang)}
            </time>
          </div>
          <code className="run-history-step">{friendlyStep(e.step)}</code>
          <p className="run-history-summary">{e.summary}</p>
          {hasExtra && !open && <Attachments e={e} lang={lang} compact />}
        </div>
        {hasExtra && (
          <button
            type="button"
            className="run-history-toggle"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? t.collapse : t.expand}
          </button>
        )}
      </div>
      {open && hasExtra && (
        <div className="run-history-detail">
          <time className="run-history-fullts">{formatTimeFull(e.ts, lang)}</time>
          <Attachments e={e} lang={lang} />
        </div>
      )}
    </li>
  );
}

export default function AgentRun() {
  const [lang, setLang] = useState<Lang>("en");
  const [events, setEvents] = useState<RunEvent[]>([]);
  const [lastFetch, setLastFetch] = useState("—");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [filterPhase, setFilterPhase] = useState<string | null>(null);

  const t = T[lang];
  const RECENT = 5;

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch(`./run-events.jsonl?ts=${Date.now()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const parsed = parseNdjson(await res.text());
      setEvents(parsed);
      setLoadError(null);
      setLastFetch(new Date().toLocaleTimeString());
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    fetchEvents();
    const id = setInterval(fetchEvents, 3000);
    return () => clearInterval(id);
  }, [fetchEvents]);

  const latest = events.length > 0 ? events[events.length - 1] : null;

  const phaseState = useMemo(() => {
    const latestByPhase = new Map<string, RunEvent>();
    for (const e of events) {
      const p = latestByPhase.get(e.phase);
      if (!p || e.ts >= p.ts) latestByPhase.set(e.phase, e);
    }
    let done = 0;
    for (const p of PHASES) {
      const ev = latestByPhase.get(p.id);
      if (ev && (ev.status === "ok" || ev.status === "warn")) done++;
    }
    const okCount = events.filter((e) => e.status === "ok").length;
    const successPct = events.length ? Math.round((okCount / events.length) * 100) : 0;
    return { latestByPhase, done, currentPhase: latest?.phase ?? null, successPct, okCount };
  }, [events, latest]);

  const filtered = useMemo(
    () => (filterPhase ? events.filter((e) => e.phase === filterPhase) : events),
    [events, filterPhase]
  );
  const history = useMemo(() => [...filtered].reverse(), [filtered]);
  const visible = showAll ? history : history.slice(0, RECENT);
  const hiddenCount = Math.max(0, history.length - RECENT);

  const heroStatus = latest?.status ?? "skip";
  const latestPhase = latest ? phaseMeta(latest.phase, lang) : null;

  return (
    <div className="layout agent-run">
      <header className="run-topbar">
        <a className="run-back" href="#/">
          ← {t.back}
        </a>
        <div className="run-topbar-meta">
          <span className={`run-live-dot ${statusClass(heroStatus)}`} aria-hidden />
          <span className="run-live-text">{t.live}</span>
          <span className="run-live-time">
            {t.updated} {lastFetch}
          </span>
        </div>
        <button type="button" className="lang-toggle" onClick={() => setLang(lang === "en" ? "zh" : "en")}>
          {lang === "en" ? "中文" : "EN"}
        </button>
      </header>

      <div className="run-hero-title">
        <h1>{t.title}</h1>
        <p>{t.subtitle}</p>
      </div>

      {loadError && <p className="run-error">{loadError}</p>}

      {!latest && !loadError ? (
        <div className="run-empty">
          <p className="run-empty-title">{t.emptyTitle}</p>
          <p className="run-empty-hint">{t.emptyHint}</p>
          <code>npm run agent:run:seed</code>
        </div>
      ) : latest ? (
        <>
          {/* Compact audit snapshot — one line, all key metrics */}
          <p className="run-snapshot" aria-label="Run summary">
            <span>
              <strong>{events.length}</strong> {events.length === 1 ? t.step : t.steps}
            </span>
            <span className="run-snapshot-sep">·</span>
            <span>
              <strong>
                {phaseState.done}
                {t.of}
                {PHASES.length}
              </strong>{" "}
              {t.phases}
            </span>
            <span className="run-snapshot-sep">·</span>
            <span>
              <strong>{phaseState.successPct}%</strong> {t.success}
            </span>
          </p>

          {/* Primary: current step */}
          <section className={`run-now ${statusClass(heroStatus)}`} aria-label={t.now}>
            <div className="run-now-top">
              <span className="run-now-label">{t.now}</span>
              <span className={`run-now-badge ${statusClass(heroStatus)}`}>{statusLabel(heroStatus, lang)}</span>
            </div>
            <div className="run-now-phase">
              <span className="run-now-phase-id">{latest.phase}</span>
              {latestPhase?.full}
            </div>
            <p className="run-now-step">{friendlyStep(latest.step)}</p>
            <p className="run-now-summary">{latest.summary}</p>
            <time className="run-now-ts" dateTime={latest.ts}>
              {formatTimeFull(latest.ts, lang)}
            </time>
            <Attachments e={latest} lang={lang} />
          </section>

          {/* Pipeline stepper — tap to filter (single optional interaction) */}
          <section className="run-stepper" aria-label={t.progress}>
            <div className="run-stepper-head">
              <span className="run-stepper-count">
                {phaseState.done}
                {t.of}
                {PHASES.length} {t.phases}
              </span>
              <div
                className="run-stepper-bar"
                role="progressbar"
                aria-valuenow={phaseState.done}
                aria-valuemin={0}
                aria-valuemax={PHASES.length}
              >
                <div className="run-stepper-fill" style={{ width: `${(phaseState.done / PHASES.length) * 100}%` }} />
              </div>
            </div>
            <ol className="run-steps">
              {PHASES.map((p) => {
                const ev = phaseState.latestByPhase.get(p.id);
                const st = ev?.status ?? "skip";
                const isCurrent = phaseState.currentPhase === p.id;
                const isFilter = filterPhase === p.id;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      className={`run-step ${statusClass(st)} ${ev ? "run-step-touched" : ""} ${isCurrent ? "run-step-current" : ""} ${isFilter ? "run-step-filtered" : ""}`}
                      onClick={() => setFilterPhase(isFilter ? null : p.id)}
                      aria-pressed={isFilter}
                      title={ev ? `${friendlyStep(ev.step)}\n${ev.summary}` : lang === "en" ? p.fullEn : p.fullZh}
                    >
                      <span className="run-step-letter">{p.id}</span>
                      <span className="run-step-name">{lang === "en" ? p.en : p.zh}</span>
                      {ev && st === "ok" && <span className="run-step-check" aria-hidden>✓</span>}
                      {ev && st === "fail" && <span className="run-step-check run-step-x" aria-hidden>✗</span>}
                      {ev && st === "warn" && <span className="run-step-check run-step-warn" aria-hidden>!</span>}
                    </button>
                  </li>
                );
              })}
            </ol>
            <p className="run-stepper-hint">{filterPhase ? `${t.filterActive} ${filterPhase}` : t.tapPhase}</p>
            {filterPhase && (
              <button type="button" className="run-filter-reset" onClick={() => setFilterPhase(null)}>
                {t.filterClear} ×
              </button>
            )}
          </section>

          {/* History — full summary always; chain/evidence via expand or compact chips */}
          {history.length > 0 && (
            <section className="run-history">
              <h2 className="run-history-title">
                {t.recent}
                {filterPhase && <span className="run-history-filter-tag">{filterPhase}</span>}
                <span className="run-history-count">
                  {filtered.length} {filtered.length === 1 ? t.step : t.steps}
                </span>
              </h2>
              <ul className="run-history-list">
                {visible.map((e, i) => (
                  <HistoryRow key={`${e.ts}:${e.step}`} e={e} lang={lang} isFirst={i === 0} defaultOpen={i === 0 && Boolean(e.tx || e.address)} />
                ))}
              </ul>
              {hiddenCount > 0 && (
                <button type="button" className="run-expand" onClick={() => setShowAll((v) => !v)}>
                  {showAll ? t.showLess : `${t.showAll} (${history.length})`}
                </button>
              )}
            </section>
          )}

          <footer className="run-footnote">{t.harness}</footer>
        </>
      ) : null}
    </div>
  );
}
