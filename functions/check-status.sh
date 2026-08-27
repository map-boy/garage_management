#!/bin/bash
cd /home/azureuser/OpenWA
KEY=$(docker logs openwa-api 2>&1 | grep -oE "[a-f0-9]{64}" | head -1)
echo "=== SESSION STATUS ==="
curl -s -H "X-API-Key: $KEY" http://localhost:2785/api/sessions