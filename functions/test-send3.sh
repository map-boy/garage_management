#!/bin/bash
cd /home/azureuser/OpenWA
echo "=== LIVE API KEY FROM CONTAINER LOG ==="
LIVE_KEY=$(docker logs openwa-api 2>&1 | grep -A1 "API Key:" | tail -1 | tr -d "[:space:]")
echo "$LIVE_KEY"

echo ""
echo "=== IS THE KEY PINNED, OR AUTO-GENERATED EACH RESTART? ==="
grep -i "api_key\|apikey" docker-compose.yml .env 2>/dev/null || echo "NOT PINNED - a fresh random key is generated on every container restart"

PDF_B64=$(printf "%%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Size 4/Root 1 0 R>>\n%%%%EOF" | base64 -w0)
SESSION_ID=$(curl -s -H "X-API-Key: $LIVE_KEY" http://localhost:2785/api/sessions | python3 -c "import sys,json; d=json.load(sys.stdin); s=d if isinstance(d,list) else d.get(chr(115)+chr(101)+chr(115)+chr(115)+chr(105)+chr(111)+chr(110)+chr(115),[]); print(s[0][chr(105)+chr(100)] if s else chr(39)+chr(39))")

echo ""
echo "=== RETEST SEND WITH LIVE KEY ==="
curl -s -w "\nHTTP_STATUS:%%{http_code}\n" -X POST "http://localhost:2785/api/sessions/$SESSION_ID/messages/send-document" \
  -H "X-API-Key: $LIVE_KEY" -H "Content-Type: application/json" \
  -d "{\"chatId\":\"25078XXXXXXX@c.us\",\"base64\":\"$PDF_B64\",\"filename\":\"test.pdf\",\"mimetype\":\"application/pdf\",\"caption\":\"test\"}"
sleep 3
echo ""
echo "=== CONTAINER LOG, LAST 15s ==="
docker logs --since 15s openwa-api 2>&1