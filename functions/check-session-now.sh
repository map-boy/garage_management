#!/bin/bash
cd /home/azureuser/OpenWA
echo "=== SESSION STATUS ==="
KEY=$(docker logs openwa-api 2>&1 | grep -oE "[a-f0-9]{64}" | head -1)
curl -s -H "X-API-Key: $KEY" http://localhost:2785/api/sessions
echo ""
echo "=== CONTAINER STATUS ==="
docker ps -a --format "table {{.Names}}\t{{.Status}}"
echo ""
echo "=== OPENWA LOGS 13:16-13:18 UTC ==="
docker logs openwa-api --since "2026-08-09T13:16:00" --until "2026-08-09T13:18:00" 2>&1