#!/bin/bash
cd /home/azureuser/OpenWA
KEY=$(docker logs openwa-api 2>&1 | grep -oE "[a-f0-9]{64}" | head -1)
SID="89b929b1-ebe8-4983-8b69-b88b974bbfcd"
echo "=== STARTING SESSION ==="
curl -s -w "\nSTATUS:%%{http_code}\n" -X POST "http://localhost:2785/api/sessions/$SID/start" -H "X-API-Key: $KEY"
sleep 5
echo ""
echo "=== REQUESTING QR ==="
curl -s -w "\nSTATUS:%%{http_code}\n" "http://localhost:2785/api/sessions/$SID/qr" -H "X-API-Key: $KEY"
sleep 3
echo ""
echo "=== LOG SINCE ==="
docker logs --since 15s openwa-api 2>&1