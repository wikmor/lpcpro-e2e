import os
import pathlib

# Versions with partially bundled Adventure libraries
EXPECTED_LIBRARIES = {
    "1.16.5": [
        "adventure-platform-bukkit",
        "adventure-api",
        "adventure-text-serializer-plain",
        "adventure-text-serializer-gson",
        "adventure-text-serializer-legacy",
        "adventure-text-serializer-bungeecord",
        "adventure-text-minimessage"
    ],
    "1.17.1": [
        "adventure-platform-bukkit",
        "adventure-api",
        "adventure-text-serializer-plain",
        "adventure-text-serializer-gson",
        "adventure-text-serializer-legacy",
        "adventure-text-serializer-bungeecord",
        "adventure-text-minimessage"
    ],
    "1.18.2": [
        "adventure-platform-bukkit",
        "adventure-text-serializer-bungeecord",
        "adventure-text-minimessage"
    ],
    "1.19.4": [
        "adventure-platform-bukkit",
        "adventure-text-serializer-bungeecord",
        "adventure-text-minimessage"
    ],
    "1.20.6": [
        "adventure-platform-bukkit",
        "adventure-text-serializer-bungeecord",
        "adventure-text-minimessage"
    ],
    "1.21.8": [
        "adventure-platform-bukkit",
        "adventure-text-serializer-bungeecord",
        "adventure-text-minimessage"
    ],
}

# Full list of Adventure libraries (assert all if not partially bundled)
ALL_ADVENTURE_LIBS = [
    "adventure-platform-bukkit",
    "adventure-api",
    "adventure-text-serializer-plain",
    "adventure-text-serializer-gson",
    "adventure-text-serializer-legacy",
    "adventure-text-serializer-bungeecord",
    "adventure-text-minimessage"
]

def test_plugin_enabled():
    log_path = pathlib.Path(os.getenv("LOG_PATH", "/logs/latest.log"))
    assert log_path.exists(), "❌ Log file does not exist"

    content = log_path.read_text(encoding="utf-8", errors="ignore")

    version = os.getenv("MC_VERSION", "")
    engine = os.getenv("MC_ENGINE", "").lower()

    def assert_libs_present(expected_libs):
        for lib in expected_libs:
            assert f"Downloading library {lib}-" in content, f"❌ Expected download of {lib} in {engine} {version}"

    if engine == "paper":
        if version in EXPECTED_LIBRARIES:
            assert_libs_present(EXPECTED_LIBRARIES[version])
        else:
            # For older versions (<1.16.5), assume none are bundled
            assert_libs_present(ALL_ADVENTURE_LIBS)
    elif engine == "spigot":
        # Always expect all Adventure libs for Spigot
        assert_libs_present(ALL_ADVENTURE_LIBS)
    else:
        raise AssertionError(f"❌ Unknown engine: {engine}")

    # Always validate server started and plugin loaded
    assert "Done (" in content, "❌ Server did not finish startup"
    assert "LPC-Pro" in content, "❌ LPC-Pro not mentioned in logs"
    assert "Error occurred while enabling LPC-Pro" not in content, "❌ Plugin failed to load"
    assert "Exception" not in content, "❌ Exception found in logs"
