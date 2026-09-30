#!/usr/bin/env bash
set -euo pipefail
cd /opt/campuslab/next
source .env
export PGPASSWORD="$RDS_APP_PASSWORD"
docker start campuslab-postgres-1 >/dev/null
trap 'docker stop campuslab-postgres-1 >/dev/null' EXIT
for attempt in $(seq 1 20); do
  docker exec campuslab-postgres-1 pg_isready -U campuslab -d bdcatalogo >/dev/null && break
  sleep 1
done
sql="SELECT count(*) || ':' || md5(coalesce(json_agg(r ORDER BY id)::text,'[]')) FROM recursos r;"
old=$(docker exec campuslab-postgres-1 psql -U campuslab -d bdcatalogo -tAc "$sql")
new=$(docker run --rm -i -e PGPASSWORD -v "$PWD/certs:/certs:ro" postgres:18-alpine psql "host=$RDS_HOST user=campuslabapp dbname=bdcatalogo sslmode=verify-full sslrootcert=/certs/global-bundle.pem" -v ON_ERROR_STOP=1 -tAc "$sql")
[ "$old" = "$new" ] || { echo 'Catalog comparison differs; review changes before asserting migration equivalence'; exit 1; }
echo "Catalog migration count and content checksum match: $new"
