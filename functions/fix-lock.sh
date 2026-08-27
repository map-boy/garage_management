#!/bin/bash
cd /home/azureuser/OpenWA
echo "=== FINDING LOCK FILES ==="
find / -xdev \( -name "SingletonLock" -o -name "SingletonSocket" -o -name "SingletonCookie" \) 2>/dev/null

echo "=== REMOVING LOCK FILES ==="
find / -xdev \( -name "SingletonLock" -o -name "SingletonSocket" -o -name "SingletonCookie" \) -delete 2>/dev/null

echo "=== KILLING ANY ORPHANED CHROME PROCESSES INSIDE CONTAINER ==="
docker exec openwa-api pkill -9 -f chrome 2>/dev/null || echo "none found or exec unavailable"

echo "=== FULL RECREATE (clean process state, not just restart) ==="
docker compose up -d --force-recreate openwa-api
sleep 15

KEY=$(docker logs openwa-api 2>&1 | grep -oE "[a-f0-9]{64}" | head -1)
SID="89b929b1-ebe8-4983-8b69-b88b974bbfcd"
echo ""
echo "=== RETEST: START SESSION ==="
curl -s -w "\nSTATUS:%%{http_code}\n" -X POST "http://localhost:2785/api/sessions/$SID/start" -H "X-API-Key: $KEY"
sleep 10
echo ""
echo "=== RETEST: REQUEST QR ==="
curl -s -w "\nSTATUS:%%{http_code}\n" "http://localhost:2785/api/sessions/$SID/qr" -H "X-API-Key: $KEY"