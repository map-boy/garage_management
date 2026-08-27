#!/bin/bash
cd /home/azureuser/OpenWA
echo "=== OPENWA CONTAINER LOGS 12:16-12:19 UTC ==="
docker logs openwa-api --since "2026-08-09T12:16:00" --until "2026-08-09T12:19:00" 2>&1