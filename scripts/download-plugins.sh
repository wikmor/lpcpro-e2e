#!/usr/bin/env bash
set -euo pipefail

mkdir -p plugins

###############################################################################
# 🧩 Define plugin file names and URLs here
###############################################################################
declare -A PLUGINS=(
  # LuckPerms 5.5.9 (works from 1.8.8 up to 1.21)
  ["LuckPerms.jar"]="https://ci.lucko.me/job/LuckPerms/5/artifact/bukkit/loader/build/libs/LuckPerms-Bukkit-5.5.9.jar"

  # PlaceholderAPI 2.11.7-DEV-212
  ["PlaceholderAPI.jar"]="https://ci.extendedclip.com/job/PlaceholderAPI/lastSuccessfulBuild/artifact/build/libs/PlaceholderAPI-2.11.7-DEV-212.jar"

  # Add more plugins as needed:
  # ["SomePlugin.jar"]="https://example.com/path/SomePlugin-1.2.3.jar"
)

###############################################################################
# ⬇️ Download missing plugins
###############################################################################
for file in "${!PLUGINS[@]}"; do
  url="${PLUGINS[$file]}"
  if [[ -f "plugins/$file" ]]; then
    echo "✅ $file already exists — skipping"
  else
    echo "⬇️ Downloading $file"
    curl --fail -sL -o "plugins/$file" "$url"
    echo "✅ Downloaded $file"
  fi
done

echo "📦 plugins/ contents:"
ls -lh plugins
