# /// script
# requires-python = ">=3.11"
# dependencies = ["opencv-python-headless>=4.10", "requests>=2.32"]
# ///
"""End-to-end check of the print pipeline: form API -> Todoist -> headless render -> R2 -> SQS.

Usage: uv run e2e/ticket_e2e.py https://remind.deadpackets.pw
A real ticket prints on the desk printer. Set FAXMEMAYBE_API_KEY to delete the test task afterwards.
Writes e2e/artifacts/<timestamp>/{ticket.png,report.json} and exits non-zero on any failed check.
"""

import json
import os
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import cv2
import requests

PRINTER_DOTS = 576
ROOT = Path(__file__).resolve().parent
SERVER = ROOT.parent / "fax-me-maybe-server"


def main(base_url: str) -> int:
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    out = ROOT / "artifacts" / stamp
    out.mkdir(parents=True)
    checks: list[dict] = []
    report = {"base_url": base_url, "started": stamp, "checks": checks}

    def check(name: str, ok: bool, detail) -> bool:
        checks.append({"name": name, "ok": bool(ok), "detail": detail})
        print(f"{'PASS' if ok else 'FAIL'}  {name}: {detail}")
        return ok

    try:
        t0 = time.monotonic()
        res = requests.post(
            f"{base_url}/api/todos",
            json={"todo": f"E2E check {stamp[9:13]}", "importance": 2, "from": "e2e", "source": "e2e"},
            timeout=90,
        )
        body = res.json()
        report["response"] = body
        check("POST /api/todos returns 200", res.status_code == 200, f"{res.status_code} in {time.monotonic() - t0:.1f}s")
        if not check("ticket printed", body.get("printed") is True, body.get("message")):
            return finish(report, out)

        png = out / "ticket.png"
        get = subprocess.run(
            ["npx", "wrangler", "r2", "object", "get", f"fax-me-maybe-tickets/todo-tickets/todo-{body['todoId']}.png", "--remote", "--file", str(png)],
            cwd=SERVER, capture_output=True, text=True, timeout=120,
        )
        if not check("ticket PNG stored in R2", get.returncode == 0 and png.exists(), get.stderr.strip()[-200:] or "downloaded"):
            return finish(report, out)

        img = cv2.imread(str(png))
        height, width = img.shape[:2]
        check("PNG matches the 80 mm printer width", width == PRINTER_DOTS, f"{width}x{height}")

        decoded, _, _ = cv2.QRCodeDetector().detectAndDecode(img)
        expected = f"https://app.todoist.com/app/task/{body['todoistTaskId']}"
        check("QR opens the Todoist task", decoded == expected, decoded or "no QR found")
    finally:
        cleanup(base_url, report)
    return finish(report, out)


def cleanup(base_url: str, report: dict) -> None:
    key = os.environ.get("FAXMEMAYBE_API_KEY")
    todo_id = report.get("response", {}).get("todoId")
    if not (key and todo_id):
        report["cleanup"] = "skipped: set FAXMEMAYBE_API_KEY to delete the test task"
        return
    res = requests.delete(f"{base_url}/api/todos/{todo_id}", headers={"X-API-KEY": key}, timeout=30)
    report["cleanup"] = f"DELETE {res.status_code}"


def finish(report: dict, out: Path) -> int:
    report["passed"] = all(c["ok"] for c in report["checks"])
    (out / "report.json").write_text(json.dumps(report, indent=2))
    print(f"{'PASSED' if report['passed'] else 'FAILED'}  artifacts: {out}")
    return 0 if report["passed"] else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1].rstrip("/") if len(sys.argv) > 1 else "https://remind.deadpackets.pw"))
