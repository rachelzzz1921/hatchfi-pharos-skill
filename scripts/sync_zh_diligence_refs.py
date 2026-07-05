#!/usr/bin/env python3
"""Generate zh locale mirrors from English diligence references."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PAIRS = [
    ("onchain-diligence.md", "链上尽调（#2–#10）"),
    ("offchain-diligence.md", "链下背景尽调（#12–#15）"),
    ("sanctions-screening.md", "制裁筛查（#1/#11）"),
    ("compliance-knowledge.md", "合规知识对照"),
    ("onchain-attestation.md", "链上尽调存证"),
    ("post-issuance-monitoring.md", "发行后监控"),
]

HEADER = """> 中文 locale · 与 `references/{name}` 同步维护。
> 命令与 JSON 保持英文以便 agent 直接执行；章节标题与表格说明为中文。

"""


def main() -> None:
    out_dir = ROOT / "docs" / "locale" / "zh" / "references"
    out_dir.mkdir(parents=True, exist_ok=True)
    for name, title_zh in PAIRS:
        src = ROOT / "references" / name
        body = src.read_text(encoding="utf-8")
        # Replace first heading with bilingual title
        lines = body.splitlines()
        if lines and lines[0].startswith("# Reference:"):
            lines[0] = f"# Reference: {title_zh}（{name.replace('.md', '')}）"
        elif lines and lines[0].startswith("# "):
            lines[0] = f"# {title_zh}（{name.replace('.md', '')}）"
        content = HEADER.format(name=name) + "\n".join(lines) + "\n"
        (out_dir / name).write_text(content, encoding="utf-8")
        print(f"Wrote docs/locale/zh/references/{name}")


if __name__ == "__main__":
    main()
