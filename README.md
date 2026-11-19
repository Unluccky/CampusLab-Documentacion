# CampusLab — Experiencias 2 y 3

Plataforma de reservas académicas desarrollada con Angular, microservicios Spring Boot, Microsoft Entra ID/Cognito, API Gateway, EC2, PostgreSQL RDS, RabbitMQ y Kafka. Esta documentación contiene arquitectura, infraestructura, operación y evidencias; las credenciales se inyectan por entorno o SSM y no se versionan.

## Repositorios del proyecto

| Componente | Repositorio |
|---|---|
| Frontend Angular | [frontend-campuslab](https://github.com/Unluccky/frontend-campuslab) |
| BFF académico y autenticación | [campuslab_bff](https://github.com/Unluccky/campuslab_bff) |
| Catálogo y stock | [CampusLab-Catalog](https://github.com/se-santander/CampusLab-Catalog) |
| Reservas, tickets, comprobantes y eventos | [CampusLab-Bookings](https://github.com/se-santander/CampusLab-Bookings) |
| Reportería, consumidor Kafka y administración de topics | [campuslab_reportes](https://github.com/Unluccky/campuslab_reportes) |
| Consumidor de correo | [campuslab_notify](https://github.com/Unluccky/campuslab_notify) |
| Administración RabbitMQ | [campuslab_rabbit_admin](https://github.com/Unluccky/campuslab_rabbit_admin) |
| Arquitectura, Docker Compose y evidencia | [CampusLab-Documentacion](https://github.com/Unluccky/CampusLab-Documentacion) |

## Arquitectura

### Experiencia 2: reservas y RabbitMQ

Angular local se autentica con Microsoft Entra ID o el flujo Cognito existente. API Gateway enruta al BFF y a los servicios Spring. Bookings y Catálogo persisten en PostgreSQL/RDS. La aprobación retiene stock; Outbox y RabbitMQ desacoplan notificaciones, tickets de preparación y comprobantes PDF. Rabbit Admin limita la gestión manual de mensajería al rol Admin.

### Experiencia 3: Kafka y reportería

Bookings publica eventos de creación/cambio de estado en `campuslab.reservas.v1`. En EC2, Docker Compose levanta ZooKeeper, dos brokers Kafka, Kafka UI, Reportería, Prometheus y Grafana. Reportería consume los eventos y actualiza su proyección PostgreSQL; BFF expone KPI y administración de topics bajo autenticación académica. Angular incluye el dashboard Grafana en `/cuenta/reportes`.

## Infraestructura y operación

- [EP2: servicios de aplicación y Gateway](infra/ep2/README.md) y [mensajería RabbitMQ](infra/mq/README.md).
- [EP3: Kafka, Reportería, Prometheus y Grafana](infra/ep3/README.md).
- [Actualizar integraciones de API Gateway al iniciar AWS Academy](infra/ep2/refresh-gateway.ps1).
- [Guía de demostración](docs/DEMOSTRACION-EP2.md) y [guía de defensa](docs/GUIA-DEFENSA-RUBRICA.md).
- [Matriz EP2](docs/RUBRICA-EP2.md); los requisitos de EP3/EP4 se contrastan con la pauta entregada para cada experiencia.

## Seguridad y operación del laboratorio

- No guardar `.env`, contraseñas, tokens AWS, secretos OAuth ni claves privadas en Git.
- Angular puede ejecutarse localmente en `http://localhost:4200`; API Gateway y servicios dependen de AWS Academy y del estado de las EC2.
- Al reiniciar una EC2, su IP pública puede cambiar; actualizar las integraciones Gateway antes de probar.
- Grafana y Kafka UI se acceden mediante túneles SSM; sus puertos no se publican en grupos de seguridad.
- Dos brokers Kafka o nodos RabbitMQ no implican automáticamente replicación o alta disponibilidad de cada dato/cola.

## Validación y evidencia

Las guías de infraestructura documentan los comandos, las variables requeridas y las pruebas que corresponden a cada experiencia. Las evidencias registran una ejecución en una fecha específica y no garantizan disponibilidad permanente. Antes de una exposición, iniciar AWS Academy y repetir el flujo visible de autenticación, reserva, mensajería y reportería.
