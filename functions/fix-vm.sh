#!/bin/bash
cd /home/azureuser/OpenWA
cp docker-compose.yml docker-compose.yml.bak
grep -n "mem_limit" docker-compose.yml || echo "no mem_limit found for openwa-api - will add one"
sed -i "/container_name: openwa-api/,/^\s*[a-z_]*:/ s/mem_limit:.*/mem_limit: 4g/" docker-compose.yml
grep -B5 "mem_limit: 4g" docker-compose.yml
docker compose up -d --force-recreate openwa-api

cat > /home/azureuser/openwa-watchdog.sh << 'WATCHDOG'
#!/bin/bash
STATUS=$(docker inspect --format="{{.State.Health.Status}}" openwa-api 2>/dev/null)
if [ "$STATUS" = "unhealthy" ]; then
  echo "$(date): openwa-api unhealthy, restarting" >> /home/azureuser/watchdog.log
  docker restart openwa-api
fi
WATCHDOG
chmod +x /home/azureuser/openwa-watchdog.sh
(crontab -l 2>/dev/null | grep -v openwa-watchdog; echo "*/2 * * * * /home/azureuser/openwa-watchdog.sh") | crontab -

sleep 35
echo "===RESULT==="
docker inspect openwa-api --format="mem_limit={{.HostConfig.Memory}}"
docker ps -a --format "table {{.Names}}\t{{.Status}}"
crontab -l