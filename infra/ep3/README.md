# Experiencia 3: Kafka y reportería

La infraestructura EP3 de CampusLab ejecuta ZooKeeper, dos brokers Kafka, Kafka UI, Reportería, Prometheus y Grafana en EC2. Reportería consume eventos de reservas y mantiene una proyección en PostgreSQL/RDS. El despliegue usa [docker-compose.yml](docker-compose.yml) y las configuraciones versionadas en esta carpeta.

## Red y acceso

- Los listeners Kafka reciben tráfico de la red privada de las instancias de CampusLab.
- Reportería escucha en el puerto 8085 para el BFF y Prometheus, con acceso limitado por los grupos de seguridad.
- Bookings mantiene la API de reservas en el puerto 8083 y expone métricas/gestión privada en 8085.
- Kafka UI, Grafana y Prometheus se enlazan a loopback en EC2; acceder mediante AWS Systems Manager port forwarding.
- Grafana permite Viewer anónimo para el dashboard embebido. El puerto 3000 debe seguir privado y accesible desde el equipo local solo mediante el túnel SSM.

## Configuración y despliegue

Copiar `.env.example` a `.env` privado y definir la URL/usuario/contraseña de RDS, issuer JWT, orígenes permitidos y clave de administrador Grafana. Mantener el certificado CA de RDS en `certs/global-bundle.pem`. No versionar `.env` ni credenciales.

Desde la carpeta `infra/ep3`, ejecutar:

```sh
docker compose up -d --build
docker compose ps
```

El topic `campuslab.reservas.v1` usa dos particiones y factor de replicación dos. La aplicación Bookings debe tener `KAFKA_ENABLED=true`, los brokers privados configurados y el topic correspondiente. Bookings publica creación/cambios de estado y Reportería los consume.

## Grafana y Prometheus

Datasource y dashboard se aprovisionan desde `grafana/provisioning` y `grafana/dashboards`. Prometheus recopila métricas de Reportería y Bookings cada 15 segundos; el dashboard presenta eventos publicados/procesados, reservas y salud de servicios.

Para mostrar Grafana dentro de Angular, iniciar un túnel SSM desde el equipo local al puerto 3000 de la instancia EP3, reemplazando `<INSTANCE_ID>` por el identificador vigente:

```powershell
aws ssm start-session --target <INSTANCE_ID> --document-name AWS-StartPortForwardingSession --parameters '{"portNumber":["3000"],"localPortNumber":["3000"]}' --region us-east-1
```

Mantener la sesión abierta y visitar `/cuenta/reportes` en Angular. La página obtiene KPI mediante el BFF académico e inserta Grafana desde `http://localhost:3000`. Kafka UI y Prometheus usan los puertos locales 8080 y 9090 respectivamente, con el mismo método de túnel; no publicar esos puertos en Internet.
