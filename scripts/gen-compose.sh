#!/bin/bash
set -e

VERSION="$1"
ENGINE="$2"
VERSION_SAFE="${VERSION//./_}"
PORT=$((25560 + RANDOM % 100))  # Avoid collisions


if [[ "$VERSION" == 1.8.* || "$VERSION" == 1.9.* || "$VERSION" == 1.10.* || "$VERSION" == 1.11.* ]]; then
  JAVA_VER=8
elif [[ "$VERSION" == 1.12.* || "$VERSION" == 1.13.* || "$VERSION" == 1.14.* || "$VERSION" == 1.15.* ]]; then
  JAVA_VER=11
elif [[ "$VERSION" == 1.16.* ]]; then
  JAVA_VER=16
elif [[ "$VERSION" == 1.17.* || "$VERSION" == 1.18.* || "$VERSION" == 1.19.* || "$VERSION" == 1.20.* ]]; then
  JAVA_VER=17
else
  JAVA_VER=21
fi

cat <<EOF
services:
  ${ENGINE}_${VERSION_SAFE}:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        JAVA_VERSION: ${JAVA_VER}
    volumes:
      - ./servers/${VERSION}:/server
      - ./server-jars/${ENGINE}/${VERSION}.jar:/server/server.jar:ro
      - ./plugins:/server/plugins
      - ./server.properties:/server/server.properties:ro
    ports:
      - "${PORT}:25565"

  test_${VERSION_SAFE}:
    build:
      context: .
      dockerfile: Dockerfile.test
    depends_on:
      - ${ENGINE}_${VERSION_SAFE}
    volumes:
      - ./servers/${VERSION}/logs:/logs:ro
      - ./tests:/tests
    environment:
      - LOG_PATH=/logs/latest.log
      - MC_VERSION=${VERSION}
      - MC_ENGINE=${ENGINE}

  bot_${VERSION_SAFE}:
    image: node:20-alpine
    working_dir: /app
    depends_on:
      - ${ENGINE}_${VERSION_SAFE}
    volumes:
      - ./bot:/app
    environment:
      - MC_HOST=${ENGINE}_${VERSION_SAFE}
      - MC_PORT=25565
      - BOT_USERNAME=EnderBot_${VERSION_SAFE}
      - CHAT_MESSAGE=e2e hello
      - EXPECTED_REGEX=\${EXPECTED_REGEX}
      - LISTEN_TIMEOUT_MS=15000
      - PREFER_SYSTEM_CHAT=true
      - BOT_DEBUG=false
    command: sh -c "npm install --silent --no-audit --no-fund && node bot.js"
EOF
