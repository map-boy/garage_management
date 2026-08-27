#!/bin/bash
cd /home/azureuser/OpenWA
echo "=== BACKING UP CURRENT node_modules/whatsapp-web.js ==="
docker exec openwa-api sh -c "cp -r /app/node_modules/whatsapp-web.js /app/node_modules/whatsapp-web.js.bak"

echo "=== CLONING LATEST whatsapp-web.js FROM GITHUB ==="
docker exec openwa-api sh -c "cd /tmp && rm -rf wwebjs-latest && git clone --depth 1 https://github.com/wwebjs/whatsapp-web.js.git wwebjs-latest"

echo "=== CHECKING IF GIT IS EVEN AVAILABLE IN CONTAINER ==="
docker exec openwa-api which git || echo "GIT NOT INSTALLED IN CONTAINER"