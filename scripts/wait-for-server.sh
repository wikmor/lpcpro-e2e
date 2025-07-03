#!/bin/bash
set -e

LOG_PATH=$1

echo "⏳ Waiting for server log to contain 'Done (' at $LOG_PATH..."

for _ in {1..60}; do
  if [ -f "$LOG_PATH" ]; then
    if grep -q "Done (" "$LOG_PATH"; then
      echo "✅ Server is ready"
      exit 0
    fi
  fi
  sleep 1
done

echo "❌ Server did not start in time"
exit 1
