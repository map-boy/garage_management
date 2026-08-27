#!/bin/bash
KEY=$(docker logs openwa-api 2>&1 | grep -oE "[a-f0-9]{64}" | head -1)
SESSION=$(curl -s -H "X-API-Key: $KEY" http://localhost:2785/api/sessions | grep -oE "\"[a-zA-Z0-9_-]+\":\{\"status\":\"ready\"" | cut -d'"' -f2)
echo "Session: $SESSION"
# 1x1 red pixel PNG, base64
curl -s -X POST -H "X-API-Key: $KEY" -H "Content-Type: application/json" \
  http://localhost:2785/api/sessions/$SESSION/messages/send-image \
  -d "{\"chatId\":\"250780867473@c.us\",\"base64\":\"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=\",\"filename\":\"test.png\",\"mimetype\":\"image/png\",\"caption\":\"test\"}"