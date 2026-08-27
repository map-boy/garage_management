#!/bin/bash
echo "=== CLONED main BRANCH VERSION ==="
grep '"version"' /home/azureuser/wwebjs-latest/package.json

echo ""
echo "=== LAST FEW COMMITS ON main (to see recent fixes) ==="
cd /home/azureuser/wwebjs-latest
git log --oneline -15

echo ""
echo "=== CURRENT docker-compose.yml ==="
cat /home/azureuser/OpenWA/docker-compose.yml