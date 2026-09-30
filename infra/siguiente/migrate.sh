#!/usr/bin/env bash
set -euo pipefail
cd /opt/campuslab/next
[ ! -f migration-complete ] || { echo 'Already migrated; refusing to overwrite data'; exit 1; }
umask 077
source rds-secret.env
source .env
mkdir -p certs backups
curl --fail --silent --show-error https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem -o certs/global-bundle.pem
docker pull postgres:18-alpine
export PGPASSWORD="$RDS_MASTER_PASSWORD"
psql_rds() { docker run --rm -i -e PGPASSWORD -v "$PWD/certs:/certs:ro" postgres:18-alpine psql "host=$RDS_HOST user=campuslabadmin dbname=postgres sslmode=verify-full sslrootcert=/certs/global-bundle.pem" -v ON_ERROR_STOP=1 "$@"; }
# Password comes from a protected environment file, never from source control.
if [ "$(psql_rds -tAc "SELECT 1 FROM pg_roles WHERE rolname='campuslabapp'")" != 1 ]; then
  printf "CREATE ROLE campuslabapp LOGIN PASSWORD '%s';\n" "$RDS_APP_PASSWORD" | psql_rds
fi
printf 'GRANT campuslabapp TO campuslabadmin;\n' | psql_rds
printf 'CREATE DATABASE bdcatalogo OWNER campuslabapp;\nCREATE DATABASE bdbookings OWNER campuslabapp;\nALTER DATABASE bdusuarios OWNER TO campuslabapp;\n' | psql_rds
# Freeze writes during the catalog snapshot. Keep original volume and restore on failure.
docker stop campuslab-catalog-1
trap 'docker compose stop catalog >/dev/null 2>&1 || true; docker start campuslab-catalog-1 >/dev/null || true' ERR
docker exec campuslab-postgres-1 pg_dump -U campuslab -d bdcatalogo -Fc > backups/catalog-before-rds.dump
export PGPASSWORD="$RDS_APP_PASSWORD"
for db in bdcatalogo bdbookings; do
  file=backups/catalog-before-rds.dump
  if [ "$db" = bdbookings ]; then file=bookings.dump; fi
  docker run --rm -i -e PGPASSWORD -v "$PWD/certs:/certs:ro" postgres:18-alpine pg_restore --exit-on-error --no-owner --no-acl --dbname="host=$RDS_HOST user=campuslabapp dbname=$db sslmode=verify-full sslrootcert=/certs/global-bundle.pem" < "$file"
done
docker compose build
docker compose up -d --wait --wait-timeout 240
trap - ERR
# The original database and its volume remain intact for rollback.
docker stop campuslab-postgres-1
touch migration-complete
echo 'RDS migration and service startup completed'
