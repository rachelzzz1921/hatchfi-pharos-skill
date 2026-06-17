#!/usr/bin/env python3
"""Static security scanner for Pharos/Cursor skills.

This is a small, zero-dependency "Pharos Skill Inspector" tailored to this
repository's threat model:

- skills can instruct agents to read wallet keys, call cast/forge, broadcast
  transactions, or hit RPC endpoints;
- static inspection must happen before a skill is shared, published, or imported;
- reports must redact secrets and fail closed on high-risk findings.

The scanner intentionally does not execute target code.
"""

from __future__ import annotations

import argparse
import dataclasses
import json
import os
import re
import sys
import zipfile
from pathlib import Path
from typing import Iterable


SEVERITY_ORDER = {"info": 0, "low": 1, "medium": 2, "high": 3, "critical": 4}
SEVERITY_WEIGHT = {"info": 0, "low": 2, "medium": 8, "high": 20, "critical": 35}

TEXT_EXTS = {
    ".md",
    ".mdc",
    ".txt",
    ".json",
    ".yaml",
    ".yml",
    ".toml",
    ".sh",
    ".bash",
    ".zsh",
    ".py",
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".sol",
    ".html",
}
CODE_EXTS = {".sh", ".bash", ".zsh", ".py", ".js", ".jsx", ".ts", ".tsx", ".sol"}
SKIP_DIRS = {
    ".git",
    ".dev",
    "cache",
    "out",
    "broadcast",
    "lib",
    "node_modules",
    "__pycache__",
}
SKIP_FILES = {
    "scripts/skill_inspector.py",  # avoid matching our own detector strings
    "state.json",  # local sovereign ledger; gitignored and never published
    "docs/SKILL_SECURITY_REPORT.md",
    "docs/SKILL_SECURITY_REPORT.json",
    "docs/SKILL_SECURITY_REPORT.sarif",
}

PHAROS_RPC_HINTS = (
    "pharos",
    "dplabs-internal.com",
    "atlantic",
    "pacific",
)
DOC_URL_ALLOWLIST = (
    "github.com",
    "githubusercontent.com",
    "docs.pharos.xyz",
    "pharos.xyz",
    "atlantic.pharosscan.xyz",
    "discord.com",
    "t.me",
    "skills.sh",
    "paradigm.xyz",
)


@dataclasses.dataclass
class Finding:
    severity: str
    category: str
    rule: str
    path: str
    line: int
    message: str
    evidence: str
    recommendation: str

    def as_dict(self) -> dict:
        return dataclasses.asdict(self)


@dataclasses.dataclass
class ScanTarget:
    path: str
    text: str
    source: str = "local"


def redact(text: str) -> str:
    text = re.sub(r"0x[a-fA-F0-9]{64}", "0x[REDACTED_PRIVATE_KEY]", text)
    text = re.sub(
        r"(?i)(private[_-]?key|mnemonic|seed|secret|api[_-]?key)\s*[:=]\s*['\"]?[^'\"\s]+",
        r"\1=[REDACTED]",
        text,
    )
    text = re.sub(r"(?i)(bearer\s+)[a-z0-9._~+/=-]{20,}", r"\1[REDACTED]", text)
    return text.strip()[:220]


def looks_like_private_key_context(line: str) -> bool:
    lowered = line.lower()
    if any(token in lowered for token in ("private_key", "private-key", "private key", "mnemonic", "seed phrase")):
        # Command usage like "--private-key $PRIVATE_KEY" is not a hardcoded key
        # unless a literal 64-hex value appears in the same assignment context.
        return True
    return bool(re.search(r"(?i)\b(pk|key|secret)\b\s*[:=]\s*['\"]?0x[a-f0-9]{64}", line))


def looks_like_tx_or_address_context(line: str) -> bool:
    lowered = line.lower()
    tx_markers = (
        "/tx/",
        "transaction",
        "txhash",
        "tx hash",
        "deploy tx",
        "deploymenttx",
        "minttx",
        "\"tx\"",
        "`tx`",
        "smoke mint",
        "pharosscan",
        "socialscan",
    )
    return any(marker in lowered for marker in tx_markers)


def iter_targets(path: Path) -> list[ScanTarget]:
    if path.is_file() and path.suffix.lower() == ".zip":
        return iter_zip_targets(path)
    if path.is_file():
        return [read_file_target(path, path.name)] if path.suffix.lower() in TEXT_EXTS else []
    if not path.is_dir():
        raise SystemExit(f"Target not found: {path}")

    targets: list[ScanTarget] = []
    for root, dirs, files in os.walk(path):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for name in files:
            file_path = Path(root) / name
            rel = file_path.relative_to(path).as_posix()
            if rel in SKIP_FILES:
                continue
            if file_path.suffix.lower() not in TEXT_EXTS:
                continue
            # Large generated artifacts are not useful for static skill review.
            try:
                if file_path.stat().st_size > 750_000:
                    continue
            except OSError:
                continue
            target = read_file_target(file_path, rel)
            if target:
                targets.append(target)
    return targets


def iter_zip_targets(path: Path) -> list[ScanTarget]:
    targets: list[ScanTarget] = []
    with zipfile.ZipFile(path) as zf:
        for info in zf.infolist():
            if info.is_dir() or info.file_size > 750_000:
                continue
            rel = info.filename
            if any(part in SKIP_DIRS for part in Path(rel).parts):
                continue
            if Path(rel).suffix.lower() not in TEXT_EXTS:
                continue
            try:
                text = zf.read(info).decode("utf-8", errors="replace")
            except (KeyError, RuntimeError):
                continue
            targets.append(ScanTarget(path=rel, text=text, source=f"zip:{path.name}"))
    return targets


def read_file_target(path: Path, rel: str) -> ScanTarget | None:
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return None
    return ScanTarget(path=rel, text=text)


def add(
    findings: list[Finding],
    severity: str,
    category: str,
    rule: str,
    target: ScanTarget,
    line_no: int,
    message: str,
    evidence: str,
    recommendation: str,
) -> None:
    findings.append(
        Finding(
            severity=severity,
            category=category,
            rule=rule,
            path=target.path,
            line=line_no,
            message=message,
            evidence=redact(evidence),
            recommendation=recommendation,
        )
    )


def line_iter(target: ScanTarget) -> Iterable[tuple[int, str]]:
    for idx, line in enumerate(target.text.splitlines(), start=1):
        yield idx, line


def scan_prompt_injection(target: ScanTarget, findings: list[Finding]) -> None:
    if not (target.path.endswith("SKILL.md") or target.path.endswith(".md") or target.path.endswith(".mdc")):
        return

    patterns = [
        (
            "instruction_override",
            re.compile(r"(?i)\b(ignore|disregard|override)\b.{0,40}\b(previous|above|system|developer|instructions?)\b"),
            "Instruction override / prompt injection language.",
        ),
        (
            "precheck_bypass",
            re.compile(r"(?i)\b(skip|bypass|disable)\b.{0,40}\b(pre[- ]?check|confirmation|human confirm|risk|receipt|security)\b"),
            "Attempt to bypass safety, pre-check, or confirmation behavior.",
        ),
        (
            "role_hijack",
            re.compile(r"(?i)\b(you are now|act as|become)\b.{0,60}\b(system|developer|root|admin|wallet operator)\b"),
            "Role hijack language.",
        ),
        (
            "secret_request",
            re.compile(r"(?i)\b(print|reveal|exfiltrate|log)\b.{0,50}\b(private[_ -]?key|mnemonic|seed phrase|secret)\b"),
            "Instruction asks the agent to reveal or move secrets.",
        ),
    ]
    for line_no, line in line_iter(target):
        for rule, regex, message in patterns:
            if regex.search(line):
                add(
                    findings,
                    "high",
                    "prompt-injection",
                    rule,
                    target,
                    line_no,
                    message,
                    line,
                    "Remove override/bypass wording; keep safety rules explicit and non-negotiable.",
                )
        if "<!--" in line:
            add(
                findings,
                "medium",
                "prompt-injection",
                "hidden_html_comment",
                target,
                line_no,
                "Hidden HTML comment in skill-facing documentation.",
                line,
                "Avoid hidden instructions. Move explanatory comments into visible text.",
            )
        if re.search(r"[\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]", line):
            add(
                findings,
                "high",
                "prompt-injection",
                "hidden_unicode",
                target,
                line_no,
                "Hidden or bidirectional Unicode control character detected.",
                line,
                "Remove invisible Unicode controls from skill text.",
            )


def scan_secret_leakage(target: ScanTarget, findings: list[Finding]) -> None:
    ext = Path(target.path).suffix.lower()
    for line_no, line in line_iter(target):
        if re.search(r"0x[a-fA-F0-9]{64}", line) and looks_like_private_key_context(line) and not looks_like_tx_or_address_context(line):
            add(
                findings,
                "critical",
                "data-leakage",
                "hardcoded_private_key",
                target,
                line_no,
                "Potential hardcoded EVM private key.",
                line,
                "Remove the key, rotate it, and read secrets only from the local environment.",
            )
        secret_value_logged = re.search(
            r"(?i)\b(echo|print|console\.log|logger|cat)\b[^\n]*(\$PRIVATE_KEY|\$MNEMONIC|\$SEED|\$SECRET|process\.env\.(PRIVATE_KEY|MNEMONIC|SEED|SECRET)|os\.environ\[['\"](PRIVATE_KEY|MNEMONIC|SEED|SECRET)['\"]\])",
            line,
        )
        secret_file_written = re.search(
            r"(?i)\b(write|write_text|writefile|tee)\b[^\n]*(PRIVATE_KEY|MNEMONIC|SEED|SECRET)",
            line,
        )
        if secret_value_logged or secret_file_written:
            add(
                findings,
                "critical",
                "data-leakage",
                "secret_logging",
                target,
                line_no,
                "Potential secret logging or printing.",
                line,
                "Never print or write secrets. Redact or omit secret values in reports.",
            )
        if ext in CODE_EXTS and re.search(r"(?i)(env\s*\||printenv|os\.environ|process\.env).*(PRIVATE_KEY|MNEMONIC|SECRET|API_KEY)?", line):
            severity = "high" if re.search(r"PRIVATE_KEY|MNEMONIC|SECRET|API_KEY", line, re.I) else "info"
            add(
                findings,
                severity,
                "data-leakage",
                "env_harvesting",
                target,
                line_no,
                "Code reads environment variables.",
                line,
                "Read only the specific env vars needed; never enumerate or export all env.",
            )
        if re.search(r"(?i)(curl|wget|fetch|axios|requests\.).*(PRIVATE_KEY|MNEMONIC|SEED|SECRET|API_KEY)", line):
            add(
                findings,
                "critical",
                "data-leakage",
                "secret_exfiltration",
                target,
                line_no,
                "Potential secret exfiltration to an external endpoint.",
                line,
                "Remove network transmission of secrets; keep keys local.",
            )


def scan_dangerous_code(target: ScanTarget, findings: list[Finding]) -> None:
    ext = Path(target.path).suffix.lower()
    if ext not in CODE_EXTS:
        return

    rules = [
        ("dangerous_eval", re.compile(r"\b(eval|exec)\s*\("), "Dynamic code execution."),
        ("shell_true", re.compile(r"subprocess\.[a-zA-Z_]+\([^)]*shell\s*=\s*True"), "subprocess with shell=True."),
        ("os_system", re.compile(r"\bos\.system\s*\("), "Shell command execution via os.system."),
        ("node_child_process", re.compile(r"require\(['\"]child_process['\"]\)|from ['\"]child_process['\"]"), "Node child_process import."),
        ("dangerous_rm", re.compile(r"rm\s+-rf\s+/(?:\s|$)"), "Destructive rm -rf / command."),
        ("chmod_777", re.compile(r"chmod\s+777"), "Over-broad chmod 777."),
        ("curl_pipe_shell", re.compile(r"(curl|wget)[^|\n]*\|\s*(bash|sh)"), "Remote script piped into shell."),
    ]
    for line_no, line in line_iter(target):
        for rule, regex, message in rules:
            if regex.search(line):
                if rule == "curl_pipe_shell" and re.search(r"\becho\b", line):
                    continue
                severity = "high" if rule in {"dangerous_eval", "shell_true", "node_child_process", "dangerous_rm"} else "medium"
                add(
                    findings,
                    severity,
                    "dangerous-code",
                    rule,
                    target,
                    line_no,
                    message,
                    line,
                    "Avoid dynamic shell/code execution, or require an explicit human confirmation gate.",
                )


def scan_web3_pharos(target: ScanTarget, findings: list[Finding], declared_write: bool) -> None:
    for line_no, line in line_iter(target):
        if re.search(r"cast\s+send|forge\s+script|--broadcast", line):
            if not declared_write:
                add(
                    findings,
                    "high",
                    "pharos-web3",
                    "undeclared_write_capability",
                    target,
                    line_no,
                    "On-chain write/broadcast found but SKILL.md does not declare write-operation checks.",
                    line,
                    "Declare write pre-checks, risk tiers, human confirmation, and receipt assertions in SKILL.md.",
                )
            elif "--broadcast" in line or "cast send" in line:
                add(
                    findings,
                    "info",
                    "pharos-web3",
                    "declared_write_capability",
                    target,
                    line_no,
                    "On-chain write capability is present and declared in SKILL.md.",
                    line,
                    "Keep preflight, human-confirm, and receipt assertions mandatory.",
                )
        if re.search(r"approve\s*\([^,\n]+,\s*(type\s*\(\s*uint256\s*\)\s*\.\s*max|2\s*\*\*\s*256\s*-\s*1|MAX_UINT)", line):
            add(
                findings,
                "high",
                "pharos-web3",
                "unlimited_erc20_approval",
                target,
                line_no,
                "Unlimited ERC20 approval detected.",
                line,
                "Use bounded approvals and require explicit human confirmation.",
            )
        for url in re.findall(r"https?://[^\s)\"'`]+", line):
            lowered = url.lower()
            is_rpc_like = any(token in lowered for token in ("rpc", "eth_", "alchemy", "infura", "ankr", "quicknode"))
            is_allowed_doc = any(host in lowered for host in DOC_URL_ALLOWLIST)
            is_pharos = any(hint in lowered for hint in PHAROS_RPC_HINTS)
            if is_rpc_like and not is_pharos:
                add(
                    findings,
                    "medium",
                    "pharos-web3",
                    "non_pharos_rpc_endpoint",
                    target,
                    line_no,
                    "RPC-like endpoint is not clearly Pharos/Atlantic/Pacific.",
                    url,
                    "Confirm the endpoint is intended; Pharos skills should default to declared Pharos networks.",
                )
            elif target.path.endswith("SKILL.md") and not is_allowed_doc and not is_pharos:
                add(
                    findings,
                    "low",
                    "pharos-web3",
                    "external_url_in_skill",
                    target,
                    line_no,
                    "External URL in SKILL.md.",
                    url,
                    "Ensure external links cannot receive secrets or alter wallet operations.",
                )


def scan_solidity(target: ScanTarget, findings: list[Finding]) -> None:
    if Path(target.path).suffix.lower() != ".sol":
        return
    lines = target.text.splitlines()
    has_only_owner = "onlyOwner" in target.text or "onlyAgent" in target.text
    for line_no, line in enumerate(lines, start=1):
        if re.search(r"\btx\.origin\b", line):
            add(findings, "high", "solidity", "tx_origin_auth", target, line_no, "tx.origin usage detected.", line, "Use msg.sender and explicit access control.")
        if re.search(r"\bselfdestruct\s*\(", line):
            add(findings, "critical", "solidity", "selfdestruct", target, line_no, "selfdestruct detected.", line, "Remove selfdestruct from skill-deployed contracts.")
        if re.search(r"\bdelegatecall\b", line):
            add(findings, "high", "solidity", "delegatecall", target, line_no, "delegatecall detected.", line, "Avoid delegatecall unless heavily constrained and audited.")
        if re.search(r"pragma\s+solidity\s+\^", line):
            add(findings, "low", "solidity", "floating_pragma", target, line_no, "Floating Solidity pragma.", line, "Pin compiler versions for reproducible builds.")
        if re.search(r"\.call\s*\{\s*value\s*:", line) and not has_only_owner:
            add(findings, "medium", "solidity", "native_value_call", target, line_no, "Native value transfer without obvious owner/agent guard in file.", line, "Ensure withdrawals are access-controlled and use checks-effects-interactions.")


def declared_write_capability(targets: list[ScanTarget]) -> bool:
    skill_text = "\n".join(t.text for t in targets if t.path.endswith("SKILL.md"))
    markers = [
        "Write Operation Pre-checks",
        "写操作",
        "human confirm",
        "receipt",
        "risk tiers",
        "风险三档",
        "preflight",
    ]
    return any(marker.lower() in skill_text.lower() for marker in markers)


def scan(targets: list[ScanTarget]) -> list[Finding]:
    findings: list[Finding] = []
    declared_write = declared_write_capability(targets)
    for target in targets:
        scan_prompt_injection(target, findings)
        scan_secret_leakage(target, findings)
        scan_dangerous_code(target, findings)
        scan_web3_pharos(target, findings, declared_write)
        scan_solidity(target, findings)
    findings.sort(key=lambda f: (-SEVERITY_ORDER[f.severity], f.path, f.line, f.rule))
    return findings


def score(findings: list[Finding]) -> tuple[int, str]:
    total = min(100, sum(SEVERITY_WEIGHT[f.severity] for f in findings))
    if total == 0:
        label = "SAFE"
    elif total < 20:
        label = "LOW"
    elif total < 50:
        label = "MEDIUM"
    elif total < 80:
        label = "HIGH"
    else:
        label = "CRITICAL"
    return total, label


def counts(findings: list[Finding]) -> dict:
    result = {sev: 0 for sev in ("critical", "high", "medium", "low", "info")}
    for finding in findings:
        result[finding.severity] += 1
    return result


def render_text(findings: list[Finding], target: str) -> str:
    total, label = score(findings)
    c = counts(findings)
    lines = [
        "== Pharos Skill Inspector ==",
        f"Target: {target}",
        f"Score: {total}/100 {label}",
        "Findings: "
        f"critical={c['critical']} high={c['high']} medium={c['medium']} low={c['low']} info={c['info']}",
    ]
    blocking = [f for f in findings if SEVERITY_ORDER[f.severity] >= SEVERITY_ORDER["high"]]
    if not findings:
        lines.append("✅ No findings. Skill package is SAFE.")
    elif not blocking:
        lines.append("✅ No blocking findings. Review medium/low/info items before sharing.")
    else:
        lines.append("❌ Blocking findings detected.")
    for f in findings:
        lines.append("")
        lines.append(f"[{f.severity.upper()}] {f.category}/{f.rule} @ {f.path}:{f.line}")
        lines.append(f"  {f.message}")
        lines.append(f"  evidence: {f.evidence}")
        lines.append(f"  fix: {f.recommendation}")
    return "\n".join(lines) + "\n"


def render_markdown(findings: list[Finding], target: str) -> str:
    total, label = score(findings)
    c = counts(findings)
    lines = [
        "# Pharos Skill Inspector Report",
        "",
        f"- **Target**: `{target}`",
        f"- **Score**: **{total}/100 {label}**",
        f"- **Counts**: critical={c['critical']} · high={c['high']} · medium={c['medium']} · low={c['low']} · info={c['info']}",
        "- **Mode**: static-only; target code was not executed; secrets are redacted.",
        "",
    ]
    blocking = [f for f in findings if SEVERITY_ORDER[f.severity] >= SEVERITY_ORDER["high"]]
    if not findings:
        lines.append("✅ No findings. Skill package is SAFE.")
    elif not blocking:
        lines.append("✅ No blocking findings. Review medium/low/info items before sharing.")
    else:
        lines.append("❌ Blocking findings detected. Do not publish/import until fixed.")
    lines.extend(["", "## Findings", ""])
    if not findings:
        lines.append("_None._")
    else:
        lines.append("| Severity | Rule | Location | Evidence | Recommendation |")
        lines.append("|---|---|---|---|---|")
        for f in findings:
            evidence = f.evidence.replace("|", "\\|").replace("\n", " ")
            recommendation = f.recommendation.replace("|", "\\|")
            lines.append(
                f"| **{f.severity.upper()}** | `{f.category}/{f.rule}` | `{f.path}:{f.line}` | `{evidence}` | {recommendation} |"
            )
    return "\n".join(lines) + "\n"


def render_json(findings: list[Finding], target: str) -> str:
    total, label = score(findings)
    payload = {
        "tool": "pharos-skill-inspector",
        "target": target,
        "score": total,
        "label": label,
        "counts": counts(findings),
        "static_only": True,
        "findings": [f.as_dict() for f in findings],
    }
    return json.dumps(payload, indent=2, ensure_ascii=False) + "\n"


def render_sarif(findings: list[Finding], target: str) -> str:
    rules = {}
    results = []
    for f in findings:
        rule_id = f"{f.category}/{f.rule}"
        rules.setdefault(
            rule_id,
            {
                "id": rule_id,
                "name": rule_id,
                "shortDescription": {"text": f.message},
                "help": {"text": f.recommendation},
            },
        )
        level = "error" if f.severity in {"critical", "high"} else "warning" if f.severity == "medium" else "note"
        results.append(
            {
                "ruleId": rule_id,
                "level": level,
                "message": {"text": f"{f.message} Evidence: {f.evidence}"},
                "locations": [
                    {
                        "physicalLocation": {
                            "artifactLocation": {"uri": f.path},
                            "region": {"startLine": max(1, f.line)},
                        }
                    }
                ],
            }
        )
    payload = {
        "$schema": "https://json.schemastore.org/sarif-2.1.0.json",
        "version": "2.1.0",
        "runs": [
            {
                "tool": {
                    "driver": {
                        "name": "pharos-skill-inspector",
                        "informationUri": "https://github.com/rachelzzz1921/hatchfi-pharos-skill",
                        "rules": list(rules.values()),
                    }
                },
                "invocations": [{"executionSuccessful": True, "arguments": [target]}],
                "results": results,
            }
        ],
    }
    return json.dumps(payload, indent=2, ensure_ascii=False) + "\n"


def fail_code(findings: list[Finding], fail_on: str) -> int:
    threshold = SEVERITY_ORDER[fail_on]
    return 1 if any(SEVERITY_ORDER[f.severity] >= threshold for f in findings) else 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Static security scanner for Pharos AI agent skills.")
    parser.add_argument("target", nargs="?", default=".", help="Directory, file, or zip archive to scan")
    parser.add_argument("--format", choices=["text", "json", "markdown", "sarif"], default="text")
    parser.add_argument("--output", help="Write report to this file")
    parser.add_argument("--fail-on", choices=["critical", "high", "medium", "low", "info"], default="high")
    args = parser.parse_args()

    target_path = Path(args.target).resolve()
    targets = iter_targets(target_path)
    findings = scan(targets)

    renderers = {
        "text": render_text,
        "json": render_json,
        "markdown": render_markdown,
        "sarif": render_sarif,
    }
    report = renderers[args.format](findings, args.target)
    if args.output:
        out = Path(args.output)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(report, encoding="utf-8")
    else:
        sys.stdout.write(report)

    return fail_code(findings, args.fail_on)


if __name__ == "__main__":
    raise SystemExit(main())
