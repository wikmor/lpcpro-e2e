import os
import time
import pathlib
import pytest

def test_plugin_enabled():
    log_path = pathlib.Path("/logs/latest.log")

    assert log_path.exists(), "❌ Log file does not exist"
    content = log_path.read_text(encoding="utf-8", errors="ignore")

    # Test if libraries folder which is in the main server's folder is not missing
    libraries_path = pathlib.Path("/libraries")
    assert libraries_path.exists(), "❌ Libraries folder does not exist"

    assert "Downloading library adventure-platform-bukkit-" in content, "❌ Adventure Platform Bukkit library not found in logs"
    assert "Downloading library adventure-api-" in content, "❌ Adventure API library not found in logs"
    assert "Downloading library adventure-text-serializer-plain-" in content, "❌ Adventure Text Serializer Plain library not found in logs"
    assert "Downloading library adventure-text-serializer-gson-" in content, "❌ Adventure Text Serializer Gson library not found in logs"
    assert "Downloading library adventure-text-serializer-legacy-" in content, "❌ Adventure Text Serializer Legacy library not found in logs"
    assert "Downloading library adventure-text-serializer-bungeecord-" in content, "❌ Adventure Text Serializer BungeeCord library not found in logs"
    assert "Downloading library adventure-text-minimessage-" in content, "❌ Adventure Text Minimessage library not found in logs"

    assert "Done (" in content, "❌ Server did not finish startup"
    assert "LPC-Pro" in content, "❌ LPC-Pro not mentioned in logs"
    assert "Error occurred while enabling LPC-Pro" not in content, "❌ Plugin failed to load"
    assert "Exception" not in content, "❌ Exception found in logs"
