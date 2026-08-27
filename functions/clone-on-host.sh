#!/bin/bash
echo "=== GIT ON HOST? ==="
which git || echo "NOT FOUND — will install"

if ! which git > /dev/null 2>&1; then
  sudo apt-get update -y && sudo apt-get install -y git
fi

echo "=== CLONING ON HOST ==="
cd /home/azureuser
rm -rf wwebjs-latest
git clone --depth 1 https://github.com/wwebjs/whatsapp-web.js.git wwebjs-latest
ls wwebjs-latest