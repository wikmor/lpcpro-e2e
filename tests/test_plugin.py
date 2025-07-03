import os
import time
import pathlib
import pytest

def test_plugin_enabled():
    log_path = pathlib.Path("/logs/latest.log")

    assert log_path.exists(), "❌ Log file does not exist"
    content = log_path.read_text(encoding="utf-8", errors="ignore")

    assert "Done (" in content, "❌ Server did not finish startup"
    assert "LPC-Pro" in content, "📦 LPC-Pro not mentioned in logs"
    assert "Error occurred while enabling LPC-Pro" not in content, "❌ Plugin failed to load"
