#!/bin/bash
cd /home/azureuser/OpenWA
docker logs openwa-api --since "2026-08-09T12:17:00" --until "2026-08-09T12:18:05" 2>&1 | grep -B 40 "Error downloading media" | head -100