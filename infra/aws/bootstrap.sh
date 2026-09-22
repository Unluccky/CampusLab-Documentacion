#!/bin/bash
set -euo pipefail
dnf install -y docker
systemctl enable --now docker
usermod -aG docker ec2-user
mkdir -p /usr/local/lib/docker/cli-plugins
curl --fail --location --retry 3 https://github.com/docker/compose/releases/download/v5.5.0/docker-compose-linux-x86_64 -o /usr/local/lib/docker/cli-plugins/docker-compose
chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
curl --fail --location --retry 3 https://github.com/docker/buildx/releases/download/v0.37.1/buildx-v0.37.1.linux-amd64 -o /usr/local/lib/docker/cli-plugins/docker-buildx
chmod +x /usr/local/lib/docker/cli-plugins/docker-buildx
docker compose version
docker buildx version
install -d -m 700 -o ec2-user -g ec2-user /opt/campuslab
