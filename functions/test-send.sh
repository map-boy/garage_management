#!/bin/bash
cd /home/azureuser/OpenWA
API_KEY=$(grep -oP "(?<=^OPENWA_API_KEY=).*" .env 2>/dev/null)
SESSION_ID=$(curl -s -H "X-API-Key: $API_KEY" http://localhost:2785/api/sessions | python3 -c "import sys,json; d=json.load(sys.stdin); s=d if isinstance(d,list) else d.get(chr(115)+chr(101)+chr(115)+chr(115)+chr(105)+chr(111)+chr(110)+chr(115),[]); print(s[0][chr(105)+chr(100)] if s else chr(39)+chr(39))")
echo "session: $SESSION_ID"

PDF_B64=$(printf "%%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Size 4/Root 1 0 R>>\n%%%%EOF" | base64 -w0)

echo "=== SENDING TEST DOCUMENT ==="
curl -s -X POST "http://localhost:2785/api/sessions/$SESSION_ID/messages/send-document" \
  -H "X-API-Key: $API_KEY" -H "Content-Type: application/json" \
  -d "{\"chatId\":\"25078XXXXXXX@c.us\",\"base64\":\"$PDF_B64\",\"filename\":\"test.pdf\",\"mimetype\":\"application/pdf\",\"caption\":\"test\"}"

sleep 3
echo ""
echo "=== FRESH LOGS RIGHT AFTER THE SEND ==="
docker logs openwa-api --tail 100