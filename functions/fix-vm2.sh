#!/bin/bash
cd /home/azureuser/OpenWA
touch .env
grep -q "OPENWA_MEM_LIMIT" .env && sed -i "s/OPENWA_MEM_LIMIT=.*/OPENWA_MEM_LIMIT=4g/" .env || echo "OPENWA_MEM_LIMIT=4g" >> .env
grep OPENWA_MEM_LIMIT .env
docker compose up -d --force-recreate openwa-api
sleep 30
echo "===RESULT==="
docker inspect openwa-api --format="mem_limit={{.HostConfig.Memory}}"
docker ps -a --format "table {{.Names}}\t{{.Status}}"