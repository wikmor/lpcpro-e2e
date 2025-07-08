#!/usr/bin/env bash
# scripts/download-plugins.sh
# Fetches all required Bukkit/Paper plugins if they’re not already present.
set -euo pipefail

mkdir -p plugins

###############################################################################
# 👉 Define desired plugin filenames & URLs here
###############################################################################
declare -A PLUGINS=(
  # Format:  ["<LocalFileName.jar>"]="https://download/url/to/jar"

  ["LuckPerms.jar"]="https://ci.lucko.me/job/LuckPerms/5/artifact/bukkit/loader/build/libs/LuckPerms-Bukkit-5.5.9.jar"
  ["PlaceholderAPI.jar"]="https://ci.extendedclip.com/job/PlaceholderAPI/lastSuccessfulBuild/artifact/build/libs/PlaceholderAPI-2.11.7-DEV-212.jar"

  # Add more plugins here ↓↓↓
  # ["SomePlugin.jar"]="https://example.com/path/SomePlugin-1.2.3.jar"
)

###############################################################################
# Parallel download function
###############################################################################
download_if_missing() {
  local file="$1" url="$2"
  if [[ -f "plugins/$file" ]]; then
    echo "✅  $file already present — skipping"
  else
    echo "⬇️   Downloading $file …"
    # Use --fail to make curl return non-zero if HTTP error
    curl --fail -sL -o "plugins/$file" "$url"
    echo "✅  Finished $file"
  fi
}

export -f download_if_missing   # Allow xargs to see the function
export -A PLUGINS               # Export associative array for subshells

# Feed the download function to xargs -P<N> for parallelism
printf '%s\0%s\n' "${!PLUGINS[@]}" "${PLUGINS[@]}" | \
  xargs -0 -n2 -P4 bash -c 'download_if_missing "$@"' _
