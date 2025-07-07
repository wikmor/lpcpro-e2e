#!/bin/bash
set -euo pipefail

VERSION="$1"
DEST="paper/$VERSION"

mkdir -p "$DEST"

# Get the latest build number
BUILD=$(curl -s "https://api.papermc.io/v2/projects/paper/versions/$VERSION" | jq -r '.builds[-1]')

echo "➡️ Downloading Paper $VERSION build $BUILD"

# Download the latest Paper JAR
curl -o "$DEST/paper-${VERSION}.jar" -L \
  "https://api.papermc.io/v2/projects/paper/versions/${VERSION}/builds/${BUILD}/downloads/paper-${VERSION}-${BUILD}.jar"
