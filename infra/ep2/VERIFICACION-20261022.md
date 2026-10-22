# Verificación cloud de DLQ, administración y configuración técnica

## Actualización de pruebas y corrección de laboratorio

El 22/10 el usuario confirmó haber realizado la prueba del estudiante; esta
confirmación no representa una nueva comprobación automatizada de todos los
rechazos HTTP. La prueba con la cuenta real del técnico está prevista para el
23/10 y permanece pendiente.

Angular muestra el laboratorio como solo lectura, derivado del recurso elegido.
Bookings consulta el catálogo al crear la reserva e ignora el laboratorio enviado
por el cliente. Esta corrección de backend está pendiente de despliegue en AWS;
publicar el código en GitHub no actualiza los contenedores en ejecución.

Validación local de la corrección: Angular compila y sus 25 pruebas pasan;
`ReservationAccessTests` pasa sus seis pruebas, incluidas la sustitución del
laboratorio manipulado y la ausencia de persistencia si falla el catálogo.
La suite completa de bookings registra 16 pruebas: 13 correctas, dos omitidas
y un error al cargar el contexto por PostgreSQL local no disponible en 5432.

Fecha: 22/10/2026. Se iniciaron las dos EC2 existentes y se actualizaron las
integraciones de API Gateway a la IP actual de aplicaciones. RDS estaba disponible.

## Tres DLQ funcionando

Se ejecutó `infra/mq/verify-dlqs.py` en la EC2 de mensajería con los consumidores
activos. Los dos nodos `rabbit@rabbit1` y `rabbit@rabbit2` estaban en ejecución.
Cada evento con tipo inválido fue rechazado por su consumidor real y encontrado
por `eventId` en la DLQ correcta con `x-death.reason=rejected`:

| Flujo | Cola principal | DLQ | Resultado |
|---|---|---|---|
| Correo | q.cmd.email | q.cmd.email.dlq | Verificado |
| Preparación | q.cmd.prep | q.cmd.prep.dlq | Verificado |
| Comprobantes | q.cmd.voucher | q.cmd.voucher.dlq | Verificado |

[Resultado JSON](evidence/dlqs-20261022.json). Los mensajes de prueba se conservaron
como evidencia. No se purgaron colas ni se modificaron reservas o enviaron correos.
La primera ejecución coincidió con el reinicio de bookings y agotó su espera para
preparación; se confirmó el rechazo en logs y se repitió tras estabilizar los
servicios. La ejecución registrada pasó los tres flujos.

## Eliminación desde Angular

Con sesión académica administradora real en Angular → API Gateway → BFF → Rabbit
Admin, se crearon cola y exchange `lab.qa20261022delete` y binding `demo.created`.
Se eliminó el binding desde Angular y se confirmó que la cola y el exchange
seguían existiendo sin ese enlace. Después se eliminaron la cola vacía y el
exchange desde Angular. La lectura independiente de RabbitMQ confirmó ausencia
de ambos recursos y del enlace. No se tocaron las colas operativas.

[Antes y después](evidence/angular-delete-20261022.json).

## Técnico: configuración aplicada, sesión real pendiente

Entra mostró la invitación de Sebastián en estado **Aceptado**, cuenta habilitada.
Se verificó su Object ID y se añadió a `AZURE_OPERATOR_OBJECT_IDS` en el `.env`
privado de aplicaciones. Se recrearon BFF, catálogo y bookings y se comprobó esa
variable en los tres contenedores. Se conservó la lista de administradores.
No se concedió ningún rol administrativo del directorio Azure.

La asignación se resuelve a partir del `oid` de un JWT Azure validado; no por el
correo enviado desde Angular. El usuario confirmó que Sebastián no está disponible.
Por ello **no se declara aprobada la prueba de sesión técnica real**. Al estar
disponible, iniciar sesión con su cuenta académica, comprobar Técnico/Operador,
aprobar y preparar una reserva, responder su ticket y verificar que Rabbit Admin
no sea accesible. No compartir su contraseña.
