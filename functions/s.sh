#!/bin/bash
cd /home/azureuser/OpenWA
LIVE_KEY=$(docker logs openwa-api 2>&1 | grep -oE "[a-f0-9]{64}" | head -1)
echo "=== SESSIONS ==="
curl -s -H "X-API-Key: $LIVE_KEY" http://localhost:2785/api/sessions