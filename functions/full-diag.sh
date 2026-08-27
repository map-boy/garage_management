#!/bin/bash
cd /home/azureuser/OpenWA
echo "=== VM-SIDE FULL DIAGNOSTIC ==="
echo "--- Live API key (clean extract) ---"
LIVE_KEY=$(docker logs openwa-api 2>&1 | grep -oE "[a-f0-9]{64}" | head -1)
echo "$LIVE_KEY"
echo "--- Container health ---"
docker ps -a --format "table {{.Names}}\t{{.Status}}"
docker inspect openwa-api --format="mem_limit={{.HostConfig.Memory}}"
echo "--- All WhatsApp sessions on this VM ---"
curl -s -H "X-API-Key: $LIVE_KEY" http://localhost:2785/api/sessions
echo ""
echo "--- Watchdog + cron ---"
crontab -l
echo "--- Full container log, last 300 lines ---"
docker logs openwa-api --tail 300