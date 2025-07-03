import os
import time
import pathlib
import pytest

def test_plugin_enabled():
    log_path = pathlib.Path("/logs/latest.log")

    # Record time at test start
    start_time = time.time()

    # ⏳ Wait for new log content
    for _ in range(30):
        if log_path.exists():
            content = log_path.read_text(encoding="utf-8", errors="ignore")
            if "Done (" in content:
                if log_path.stat().st_mtime >= start_time:
                    break
        time.sleep(1)
    else:
        pytest.fail("❌ Log file not ready or incomplete")

    lines = content.splitlines()
    assert any("Done (" in line for line in lines), "✅ Server did not finish startup"
    assert any("LPC-Pro" in line for line in lines), "📦 LPC-Pro not mentioned in logs"
    assert all("Error occurred while enabling LPC-Pro" not in line for line in lines), "❌ Plugin failed to load"
    # assert all("Exception" not in line for line in lines)
