"""Record exact golden exceptions for reviewed technical differences.

Usage: python3 record_golden_exceptions.py <owner-root> "<reason>" site/<path> [site/<path> ...]

Each path's before digest comes from <owner-root>/golden/, its after digest and unified diff from the
engine's public/ copy. An existing entry for the same path is replaced; other entries are kept.
"""
import hashlib
import json
import subprocess
import sys
from pathlib import Path

ENGINE = Path(__file__).resolve().parents[3]


def digest(path):
    return "sha256:" + hashlib.sha256(path.read_bytes()).hexdigest() if path.exists() else None


def main(owner_root, reason, paths):
    owner_root = Path(owner_root)
    manifest = owner_root / "golden-exceptions.json"
    entries = json.loads(manifest.read_text())["exceptions"] if manifest.exists() else []
    for path in paths:
        if not path.startswith("site/"):
            sys.exit(f"{path}: only site/ paths are recorded here")
        before = owner_root / "golden" / path
        after = ENGINE / "public" / path.removeprefix("site/")
        diff = subprocess.run(
            ["diff", "-u", "--label", f"golden/{path}", "--label", path, str(before), str(after)],
            capture_output=True, text=True,
        ).stdout
        if not diff:
            sys.exit(f"{path}: no difference to record")
        entries = [entry for entry in entries if entry["path"] != path]
        entries.append({"path": path, "before": digest(before), "after": digest(after), "reason": reason, "diff": diff})
    entries.sort(key=lambda entry: entry["path"])
    manifest.write_text(json.dumps({"exceptions": entries}, indent=2, ensure_ascii=False) + "\n")


if __name__ == "__main__":
    if len(sys.argv) < 4:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2], sys.argv[3:])
