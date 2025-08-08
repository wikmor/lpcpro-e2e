#!/bin/bash
set -e

VERSION="$1"
ENGINE="$2"
VERSION_SAFE="${VERSION//./_}"
PORT=$((25560 + RANDOM % 100))  # Avoid port conflicts, is it even necessary if containerized?

# Determine Java version
if [[ "$VERSION" == 1.8.* || "$VERSION" == 1.9.* || "$VERSION" == 1.10.* || "$VERSION" == 1.11.* || "$VERSION" == 1.12.* || "$VERSION" == 1.13.* || "$VERSION" == 1.14.* || "$VERSION" == 1.15.* ]]; then
  JAVA_VER=11
elif [[ "$VERSION" == 1.16.* ]]; then
  JAVA_VER=16
elif [[ "$VERSION" == 1.17.* || "$VERSION" == 1.18.* || "$VERSION" == 1.19.* || "$VERSION" == 1.20.* ]]; then
  JAVA_VER=21
else
  JAVA_VER=21
fi

cat <<EOF
version: '3.8'
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
      - ./bukkit.yml:/server/bukkit.yml:ro
      - ./world:/server/world:ro
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
EOF
