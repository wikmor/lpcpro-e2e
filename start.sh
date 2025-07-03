#!/bin/bash
set -e

# Optional: verify required files
[ ! -f server.jar ] && echo "Missing server.jar!" && exit 1
[ ! -f server.properties ] && echo "Missing server.properties!" && exit 1

# Accept EULA
echo "eula=true" > eula.txt

# Run the server
exec java -Xmx1G -jar server.jar --nogui
