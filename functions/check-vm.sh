#!/bin/bash
echo "=== OPENWA SESSION / NUMBER STATUS ==="
curl -s -m 5 http://localhost:2785/api/health 2>/dev/null || curl -s -m 5 http://localhost:2785/api/ping 2>/dev/null || echo "no simple status endpoint, will check via app logic"
echo ""
echo "=== EXISTING AUTO-SHUTDOWN SETUP (if any) ==="
crontab -l 2>/dev/null | grep -i shutdown || echo "NO shutdown cron found"
systemctl list-timers --all 2>/dev/null | grep -i shutdown || echo "NO shutdown timer found"
ls -la /home/azureuser/*.sh 2>/dev/null
echo ""
echo "=== CONTAINER + WATCHDOG STATUS ==="
docker ps -a --format "table {{.Names}}\t{{.Status}}"
docker inspect openwa-api --format="mem_limit={{.HostConfig.Memory}}"
crontab -l