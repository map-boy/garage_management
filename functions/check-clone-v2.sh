#!/bin/bash
echo "=== CLONED VERSION ==="
grep -m1 '"version"' /home/azureuser/wwebjs-latest/package.json

echo ""
echo "=== RECENT COMMITS ==="
cd /home/azureuser/wwebjs-latest
git log --oneline -10

echo ""
echo "=== openwa-api SERVICE BLOCK ONLY ==="
sed -n '/^  openwa-api:/,/^  dashboard:/p' /home/azureuser/OpenWA/docker-compose.yml