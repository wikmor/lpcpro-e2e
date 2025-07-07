#!/bin/bash
# Usage: ./scripts/download-paper.sh <mc_version> <target_dir>
# Example: ./scripts/download-paper.sh 1.16.5 paper/1.16.5

set -euo pipefail

MC_VERSION="$1"
TARGET_DIR="$2"
PAPER_JAR="$TARGET_DIR/paper-${MC_VERSION}.jar"

mkdir -p "$TARGET_DIR"

# Fetch latest build number for this MC version
BUILD=$(curl -s "https://api.papermc.io/v2/projects/paper/versions/${MC_VERSION}" \
  | jq -r '.builds[-1]')

# Download JAR
echo "📦 Downloading Paper ${MC_VERSION} build ${BUILD}..."
curl -fsSL "https://api.papermc.io/v2/projects/paper/versions/${MC_VERSION}/builds/${BUILD}/downloads/paper-${MC_VERSION}-${BUILD}.jar" \
  -o "$PAPER_JAR"

echo "✅ Saved to $PAPER_JAR"
