# Matriz de rúbrica de mensajería

Referencia: `EP3_DSY1107_Estudiante_encargo.pdf`, pauta recibida para esta etapa. Las aclaraciones de la profesora permiten Angular local y sitúan Azure en autenticación; RDS, API Gateway y EC2 forman la arquitectura AWS. Esta matriz indica evidencia y pendientes, no una nota asegurada.

| Criterio | Peso | Implementación | Evidencia / límite |
|---|---:|---|---|
| Nombres centralizados | 12% | RabbitTopology en bookings y notify; propiedades `app.rabbit.topology.*` | Topología declarada por beans; revisar configuración en código |
| Beans Queue/Exchange/Binding | 13% | Correo, preparación y comprobantes con sus DLQ | Arranque y flujo real AWS el 19/10 |
| Separación negocio/configuración | 10% | Configuración en config; ReservaService delega en outbox | Lectura de módulos y tests |
| Consumidores por dominio | 15% | EmailConsumer, PreparationConsumer, VoucherConsumer | Correo, ticket y PDF comprobados en AWS |
| ACK y manejo de errores | 20% | ACK después de efecto persistido, reintentos transitorios limitados, NACK a DLQ | Tres DLQ verificadas en AWS el 22/10, con eventId y x-death rejected. SMTP conserva ambigüedad ante caída entre envío y recibo |
| API REST administrador | 13% | POST/GET/DELETE queues; POST/DELETE exchanges y bindings | Creación/consulta y eliminación de enlace, cola vacía y exchange desde Angular verificadas en AWS |
| Servicio dedicado | 10% | RabbitAdminService encapsula AMQP | Controlador delega, sin detalles AMQP en Angular/BFF |
| Validación | 7% | DTO, tipos enumerados, nombres `lab.*`, validación de parámetros | API tests 400/401/403; protege topología operativa |

## Requisitos transversales

- Java/Spring y Angular: compilación y tests por componente; no confundir tests unitarios con integración real.
- Azure académico: login real y JWT validado por Gateway y Spring. Invitación técnica aceptada y Object ID configurado en BFF, catálogo y bookings; sesión real del técnico comprobada el 26/10: aprobación, preparación, respuesta del ticket, uso y devolución de la reserva #12.
- RDS: catálogo, reservas y usuarios en PostgreSQL cloud; conexión TLS de los servicios actualizados.
- Mensajería: EC2 dedicada, dos nodos RabbitMQ. Colas classic sin replicación; no afirmar alta disponibilidad.
- GitHub: preparar y publicar todos los componentes; verificar enlaces y colaboración docente. Los módulos notify/admin están publicados en repositorios privados de Unluccky; falta autorizar acceso docente.
- Evidencia funcional: ver `../infra/ep2/VERIFICACION-20261019.md`.

## Pendientes que impiden cerrar la revisión

La prueba real del técnico quedó completada el 26/10; el estudiante fue probado según confirmación del usuario el 22/10. Quedan la revisión del acceso docente y el proveedor SMTP si se exige demostrar recepción externa. La coordinación de stock es idempotente pero requiere reconciliación ante un fallo entre los dos commits de dominio.

## Actualización 22/10/2026

BFF: cuatro pruebas nuevas sobre reenvío HTTP real hacia un servidor de prueba, incluidos DELETE con cuerpo, bloqueo de estudiante/emisor ajeno y protección de topología. Rabbit Admin: integración local real de creación/enrutamiento/eliminación y rechazo de eliminación de cola con mensajes, conservando el contenido. La verificación cloud posterior de las tres DLQ y de eliminación desde Angular está en [VERIFICACION-20261022.md](../infra/ep2/VERIFICACION-20261022.md).

Pruebas del 22/10: bookings 14/14 con PostgreSQL y Rabbit reales; Rabbit Admin 9/9 (incluidas dos integraciones); BFF 7/7 (JWT y proxy); Notify 4/4; catálogo 5/5 (stock y JWT). Los tests no envían correo a personas reales.

## Prueba técnica completada el 26/10

Ver [evidencia de la sesión real y reserva #12](../infra/ep2/VERIFICACION-TECNICO-20261026.md).
