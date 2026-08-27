#!/bin/bash
echo "=== WAITING FOR openwa-api TO BE HEALTHY ==="
for i in {1..20}; do
  STATUS=$(docker inspect --format="{{.State.Health.Status}}" openwa-api 2>/dev/null)
  echo "check $i: $STATUS"
  [ "$STATUS" = "healthy" ] && break
  sleep 5
done
echo ""
echo "=== LAST 150 RAW LOG LINES (openwa-api) ==="
docker logs openwa-api --tail 150
echo ""
echo "=== ERROR-FOCUSED LINES (media/500/download) ==="
docker logs openwa-api --tail 800 2>&1 | grep -i "error\|media\|500\|download\|send-document" | tail -60