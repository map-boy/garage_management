#!/bin/bash
cd /home/azureuser/OpenWA
KEY=$(docker logs openwa-api 2>&1 | grep -oE "[a-f0-9]{64}" | head -1)
SID="89b929b1-ebe8-4983-8b69-b88b974bbfcd"
echo "=== POLLING FOR QR (up to 60s) ==="
for i in {1..12}; do
  RESP=$(curl -s "http://localhost:2785/api/sessions/$SID/qr" -H "X-API-Key: $KEY")
  echo "attempt $i: $RESP"
  echo "$RESP" | grep -q "qrCode" && break
  sleep 5
done