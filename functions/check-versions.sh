#!/bin/bash
cd /home/azureuser/OpenWA
echo "=== whatsapp-web.js version in container ==="
docker exec openwa-api cat /app/node_modules/whatsapp-web.js/package.json | grep "\"version\""
echo "=== Puppeteer / Chromium version ==="
docker exec openwa-api cat /app/node_modules/puppeteer-core/package.json | grep "\"version\""