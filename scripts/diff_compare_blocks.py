"""List posts whose rendered #compare-table block differs between two builds."""

from __future__ import annotations

import argparse
from pathlib import Path


OPEN_TAG = '<section id="compare-table"'
CLOSE_TAG = "</section>"


def compare_block(html: str) -> str:
    start = html.find(OPEN_TAG)
    if start < 0:
        return ""
    end = html.find(CLOSE_TAG, start)
    if end < 0:
        raise ValueError("unclosed #compare-table section")
    return html[start : end + len(CLOSE_TAG)]


def blocks(dist: Path) -> dict[str, str]:
    posts = dist / "posts"
    if not posts.is_dir():
        raise ValueError(f"posts directory not found: {posts}")
    return {
        page.parent.name: compare_block(page.read_text(encoding="utf-8"))
        for page in posts.glob("*/index.html")
    }


def changed_slugs(before: Path, after: Path) -> list[str]:
    old, new = blocks(before), blocks(after)
    return sorted(slug for slug in old.keys() | new.keys() if old.get(slug) != new.get(slug))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("before", type=Path, help="Baseline dist directory")
    parser.add_argument("after", type=Path, help="New dist directory")
    args = parser.parse_args()
    slugs = changed_slugs(args.before, args.after)
    print(f"Changed compare-table blocks: {len(slugs)}")
    for slug in slugs:
        print(slug)


if __name__ == "__main__":
    main()
