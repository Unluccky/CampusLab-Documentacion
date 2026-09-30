#!/usr/bin/env bash
set -euo pipefail
cd /opt/campuslab/next
source .env
export PGPASSWORD="$RDS_APP_PASSWORD"
for database in bdcatalogo bdbookings bdusuarios; do
  docker run --rm -i -e PGPASSWORD -v "$PWD/certs:/certs:ro" postgres:18-alpine psql "host=$RDS_HOST user=campuslabapp dbname=$database sslmode=verify-full sslrootcert=/certs/global-bundle.pem" -v ON_ERROR_STOP=1 -tAc "SELECT current_database(), ssl, version FROM pg_stat_ssl WHERE pid=pg_backend_pid();"
done
docker run --rm -i -e PGPASSWORD -v "$PWD/certs:/certs:ro" postgres:18-alpine psql "host=$RDS_HOST user=campuslabapp dbname=bdcatalogo sslmode=verify-full sslrootcert=/certs/global-bundle.pem" -v ON_ERROR_STOP=1 -tAc 'SELECT count(*) FROM recursos;'
docker run --rm -i -e PGPASSWORD -v "$PWD/certs:/certs:ro" postgres:18-alpine psql "host=$RDS_HOST user=campuslabapp dbname=bdbookings sslmode=verify-full sslrootcert=/certs/global-bundle.pem" -v ON_ERROR_STOP=1 -tAc 'SELECT count(*) FROM reservas;'
