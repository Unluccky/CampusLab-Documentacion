# CampusLab: cómo demostrar y defender la rúbrica

Guía para José y Sebastián. Basada en EP3 (encargo), EP4 (presentación), requisitos
de Experiencia 2, aclaración de la profesora y código de CampusLab. Revisión:
22/10/2026. Los porcentajes de los ocho criterios son iguales en EP3 y EP4.

## Antes de empezar

1. En AWS Academy, iniciar el laboratorio y entrar con su botón **AWS**.
2. Elegir región **N. Virginia / us-east-1** en la consola.
3. EC2: aplicaciones `i-0e59dc1bacbdc9483` y mensajería
   `i-051be91877ac35724` deben estar Running. RDS: `campuslab-postgres`, Available.
4. Si cambió la IP de EC2, actualizar las integraciones del Gateway con
   `infra/ep2/refresh-gateway.ps1` (requiere AWS CLI y credenciales temporales).
5. En la carpeta `frontend-campuslab`, ejecutar `npm start`. Abrir
   <http://localhost:4200/cuenta> y comprobar “Identidad y permisos verificados”.
6. Tener abiertos Entra, API Gateway, EC2, la presentación y esta guía.
   No mostrar archivos `.env`, contraseñas ni el contenido de tokens.

Las EC2 y RDS cobran saldo mientras estén disponibles según las reglas del
laboratorio. No borrar instancias o volúmenes para cerrar un ensayo.

## Recorrido funcional en Angular

### A. Cuenta y acceso

Abrir **Mi cuenta**. Mostrar nombre académico, sesión activa y permisos verificados
por el servidor. El administrador ve Mensajería. El técnico puede gestionar
reservas y tickets, pero no administrar RabbitMQ.

**Qué decir:** “Azure autentica la cuenta. La autorización de CampusLab se decide
en el backend con un JWT validado y sus roles; ocultar botones no es la protección”.

La invitación de Sebastián está aceptada y su Object ID está configurado como
operador. Su sesión real sigue pendiente porque no está disponible. No demostrar
una sesión de administrador afirmando que corresponde a una cuenta técnica.

### B. Reserva, preparación y comprobantes

Abrir **Reservas** y usar datos de ensayo: recurso disponible, laboratorio,
solicitante “Ensayo defensa”, correo `student@example.test` y fecha futura.

1. Solicitar reserva: aparece **SOLICITADA**. Anotar su número y stock inicial.
2. Con Admin o Técnico, aprobar: **APROBADA** y stock disminuye una unidad.
3. Actualizar: aparece el ticket de preparación producido mediante RabbitMQ.
4. Pasar a **EN_PREPARACION** y responder el ticket con un texto de prueba.
5. Pasar a **EN_USO**, actualizar si hace falta y descargar PDF de **RETIRO**.
6. Pasar a **DEVUELTA**, descargar PDF de **DEVOLUCION** y comprobar stock restituido.

**Qué decir:** “La reserva persiste su evento en una outbox dentro de la misma
transacción. Un publicador lo entrega a RabbitMQ; consumidores independientes
generan ticket, aviso o comprobante. El frontend puede actualizar mientras termina
el procesamiento asíncrono”.

La reserva #6 ya completó este recorrido el 19/10. Los PDF deben corresponder al
número de reserva mostrado. Mailpit captura SMTP: no afirmar recepción en una
bandeja externa ni envío exactamente una vez.

### C. Administración y validación

Abrir <http://localhost:4200/mensajeria/admin> con Admin.

1. Poner un nombre nuevo como `lab.ensayo001` en **Cola** y crearla.
2. Consultarla: cero mensajes y cero consumidores si es nueva.
3. Poner `lab.ensayo001` en **Exchange**, elegir **direct** y crear.
4. Poner `demo.created` en **Clave de enrutamiento** y crear enlace.
5. Eliminar enlace, después cola vacía y finalmente exchange.
6. Para mostrar validación, intentar crear una cola con nombre vacío o
   `nombre_invalido_sin_prefijo`. Debe fallar y no crear el recurso.

Usar recursos de ensayo nuevos; las colas `q.cmd.*` pertenecen al flujo real.
Eliminar un exchange elimina también sus bindings; por eso se demuestra primero
la eliminación explícita del enlace. Una cola con mensajes o consumidores no
se fuerza ni se purga para borrarla.

**Qué decir:** “Angular llama una API REST; RabbitAdminService encapsula AMQP.
El backend valida los DTO y restringe la administración a nombres `lab.*`”.

## Los ocho criterios: qué abrir y qué explicar

Las rutas siguientes parten de `D:\DUOC TRABAJOS\campuslab`.

| Criterio | Peso | Archivo que debes abrir | Qué señalar |
|---|---:|---|---|
| Nombres centralizados | 12% | `campuslab_bookings/src/main/java/com/ms/campuslab_bookings/config/RabbitTopology.java` | `@Configuration`, propiedades `@Value`, nombres direct/topic/DLX y nombres/rutas de las tres colas. El listener utiliza `#{@rabbitTopology.prepQueue}` en vez de repetir el nombre físico. |
| Beans de RabbitMQ | 13% | El mismo `RabbitTopology.java` | Métodos `@Bean` de `Queue`, `DirectExchange`, `TopicExchange` y `Binding`. La cola declara DLX y routing key de su DLQ. |
| Negocio y configuración separados | 10% | `.../services/ReservaService.java`, `.../messaging/ReservaOutbox.java`, `.../messaging/OutboxPublisher.java` | El servicio cambia la reserva; la outbox registra el evento; el publicador lo envía. La topología está en `config`, no en el controlador de reservas. |
| Consumidores por dominio | 15% | `campuslab_bookings/.../messaging/preparation/PreparationConsumer.java`, `.../messaging/voucher/VoucherConsumer.java`, `campuslab_notify/src/main/java/com/ms/campuslab_notify/messaging/email/EmailConsumer.java` | Cada clase tiene `@RabbitListener` y una responsabilidad: ticket, comprobante o correo. |
| ACK y errores | 20% | Los tres consumidores anteriores | `basicAck(tag,false)` tras completar el efecto; `basicNack(tag,false,false)` ante rechazo; reintentos acotados para errores transitorios; logs y DLQ. Es el criterio de mayor peso. |
| Endpoints REST | 13% | `campuslab_rabbit_admin/src/main/java/com/ms/campuslab_rabbit_admin/controller/RabbitAdminController.java` | `@PostMapping`, `@GetMapping`, `@DeleteMapping`; 201 al crear y 204 al eliminar. Mostrar los botones de Angular que los consumen a través del BFF. |
| Servicio dedicado | 10% | `campuslab_rabbit_admin/src/main/java/com/ms/campuslab_rabbit_admin/service/RabbitAdminService.java` | El controlador delega. El servicio usa `AmqpAdmin`, crea recursos y hace borrado condicionado a cola vacía/sin consumidores. |
| Validación de entrada | 7% | `campuslab_rabbit_admin/src/main/java/com/ms/campuslab_rabbit_admin/dto/Requests.java`, el servicio anterior y `controller/ApiErrors.java` | `@Valid`, `@NotBlank`, `@Pattern`, `@NotNull`, enum de tipos, restricción `lab.*`, 400 por datos inválidos y 409 ante rechazo del broker. |

En las rutas abreviadas con `...`, continuar desde
`src/main/java/com/ms/campuslab_bookings`. Los nombres de eventos, como `prep.ticket`,
describen el contrato del mensaje; no confundirlos con el nombre físico de la cola.

### Cómo leer las líneas de confirmación

```java
channel.basicAck(tag, false);
channel.basicNack(tag, false, false);
```

- `tag`: identificador de la entrega en ese canal.
- Segundo argumento `false`: actuar solo sobre ese mensaje.
- Último `false` del NACK: no devolverlo a la misma cola; con nuestra configuración
  DLX el broker lo enruta a la DLQ.
- Un error transitorio de BD o SMTP tiene hasta tres intentos en el consumidor;
  si no se resuelve, se rechaza. Un evento inválido se rechaza sin intentar negocio.
- La outbox tiene su propia política de reintento de publicación; no confundirla
  con los intentos del consumidor.

## Infraestructura exigida por EP4

### API Gateway y JWT

En AWS: **API Gateway → APIs → identificar `pludtc2ix3` → Routes**.
Mostrar la ruta académica, la integración con BFF y el authorizer JWT. En
**Authorization/Authorizers**, mostrar issuer de Azure y audience de la API backend.
La aplicación Angular tiene un client ID distinto del backend.

En el código abrir `frontend-campuslab/src/app/auth-config.ts` y `app.config.ts`:
authority, redirect URI localhost:4200, scope `access-all`, `MsalInterceptor` y
`protectedResourceMap`. El interceptor incorpora el Bearer en las llamadas a la API.

Abrir `campuslab_bff/src/main/java/com/ms/campuslab_bff/config/JwtConfig.java`:
firma con claves públicas de Azure, emisor, expiración, audience, tenant,
cliente autorizado y scope. Spring vuelve a validar aunque Gateway ya lo haga.

Prueba inválida desde PowerShell (no necesita credenciales ni tokens reales):

```powershell
curl.exe -i https://pludtc2ix3.execute-api.us-east-1.amazonaws.com/api/bff/academic/me
curl.exe -i -H "Authorization: Bearer invalido" https://pludtc2ix3.execute-api.us-east-1.amazonaws.com/api/bff/academic/me
```

**Esperado: 401 en ambos casos.** Para el caso válido, pulsar **Verificar acceso**
en Mi cuenta y mostrar identidad/roles verificados. Si se usa Network del navegador,
mostrar URL de API Gateway y estado HTTP, evitando abrir o proyectar el token.
**401** significa autenticación ausente/inválida; **403**, autenticación aceptada
pero operación no permitida. Un OPTIONS 200 es CORS, no prueba acceso autenticado.

### Tenant y usuarios en Entra

En **Microsoft Entra → Usuarios**, mostrar José y Sebastián. En el perfil de
Sebastián, mostrar **Invitación B2B: Aceptado**. En **Registros de aplicaciones**,
mostrar los registros frontend y backend y el permiso delegado `access-all`.

**Qué decir:** “El tenant identifica nuestro directorio. Una cuenta académica
puede estar invitada. Ser invitado no equivale a ser administrador; el permiso
técnico se asigna en CampusLab al Object ID de esa identidad validada”.

No otorgar al técnico un rol de administrador de Azure. El rol Operador/Técnico
es un permiso de la aplicación.

### EC2, Docker Compose y RabbitMQ

En **EC2 → Instances → instancia → Connect → Session Manager → Connect**.
Si falla, revisar que la instancia esté Running y SSM Online. Hay dos terminales:
aplicaciones y mensajería. No ejecutar los comandos de una en la otra.

En EC2 **aplicaciones**:

```bash
cd /opt/campuslab/ep2/apps
sudo docker compose ps
sudo docker compose config --services
```

Esperado: BFF, catálogo y bookings activos/saludables. `config --services` muestra
los nombres sin expandir los secretos. No proyectar `docker compose config` completo.

En EC2 **mensajería**:

```bash
cd /opt/campuslab/ep2/mq
sudo docker compose ps
sudo docker compose exec -T rabbit1 rabbitmqctl cluster_status
sudo docker compose exec -T rabbit1 rabbitmqctl list_queues -p campuslab name messages_ready messages_unacknowledged consumers arguments
sudo docker compose exec -T rabbit1 rabbitmqctl list_exchanges -p campuslab name type durable
sudo docker compose exec -T rabbit1 rabbitmqctl list_bindings -p campuslab source_name destination_name routing_key
```

**Esperado:** `rabbit@rabbit1` y `rabbit@rabbit2` en Running Nodes; tres colas
principales y tres DLQ; `cmd.direct` de tipo direct, `cmd.topic` de tipo topic y
`cmd.dead.dlx` de tipo direct. Las colas principales deben tener consumidores.
Las DLQ normalmente no tienen consumidor automático: conservan mensajes fallidos.

| Ruta de negocio | Cola | DLQ |
|---|---|---|
| email.send | q.cmd.email | q.cmd.email.dlq |
| prep.ticket | q.cmd.prep | q.cmd.prep.dlq |
| voucher.gen | q.cmd.voucher | q.cmd.voucher.dlq |

**Qué decir:** “Un exchange decide el destino. Un binding enlaza exchange y cola
mediante una routing key. Direct compara exactamente; topic permite patrones:
`*` coincide con una palabra y `#` con cero o más palabras separadas por puntos”.

Nuestro flujo habitual publica por direct. Topic está declarado y enlazado;
no afirmar que el flujo habitual publica por ambos. Dos nodos y colas classic
durables no significan replicación de mensajes ni alta disponibilidad por cola.

### Demostración de las tres DLQ

Con los servicios saludables, en la EC2 de mensajería:

```bash
sudo python3 /opt/campuslab/ep2/mq/qa/verify-dlqs.py
```

El script ya está instalado allí. Publica un evento inválido por cada ruta y
confirma el `eventId` y el `x-death` de su DLQ. Esperar el resultado JSON: cada
flujo debe tener `verified: true`, origen de cola correcto y `reason: rejected`.
Añade un mensaje de ensayo por DLQ y los conserva como evidencia. No elimina
mensajes. Para logs de preparación y comprobantes, en EC2 aplicaciones:

```bash
sudo docker logs --since 10m campuslab-ep2-bookings-1 2>&1 | grep 'rejected to DLQ'
```

Para correo, en EC2 mensajería:

```bash
sudo docker logs --since 10m campuslab-mq-notify-1 2>&1 | grep 'rejected to DLQ'
```

**Qué decir:** “El mensaje entró en la cola principal, el consumidor lo rechazó
y el broker lo envió a su DLQ. No lo publicamos directamente en la DLQ para fingir
la prueba”. Evidencia del 22/10: `infra/ep2/evidence/dlqs-20261022.json`.

### Base de datos RDS y variables

En **RDS → Databases → campuslab-postgres**, mostrar estado Available y motor
PostgreSQL. Después abrir `campuslab_bookings/src/main/resources/application.properties`,
`entities/Reserva.java` y `repository/ReservaRepository.java`. Mostrar entidad,
repositorio y conexión parametrizada. `infra/ep2/apps-compose.yml` referencia
RDS y TLS `sslmode=verify-full`, sin contener la contraseña real.

La reserva persistida y los tickets/PDF disponibles tras actualizar la página
son evidencia funcional. RDS “Available” por sí solo no demuestra integración.

**Qué decir:** “Las credenciales se inyectan por variables. No están escritas en
el código ni versionadas en `.env`. API Gateway publica el acceso; la base no
se consume directamente desde Angular”.

### GitHub y entrega

Mostrar los siete repositorios enlazados en el README y su rama `main`. Mostrar
README, `.gitignore`, fuentes y tests. Verificar que la profesora acceda también
a notify y Rabbit Admin, que son privados. La participación debe reflejar commits
reales de cada integrante. Entregar enlaces en AVA y copia por correo según la
pauta; no afirmar que están entregados si no se han enviado.

## Preguntas que te puede hacer la profesora

| Pregunta | Respuesta breve |
|---|---|
| ¿Para qué RabbitMQ? | Para desacoplar la solicitud de la generación de tickets, avisos y PDF; cada consumidor procesa su tarea. |
| ¿Qué es producer y consumer? | El productor publica un mensaje; el consumidor lo recibe y procesa. En CampusLab OutboxPublisher produce y las tres clases Consumer consumen. |
| ¿Qué es un bean? | Un objeto administrado por Spring; nuestros beans describen colas, exchanges y bindings que necesita la aplicación. |
| ¿Qué es una DLQ? | Una cola que conserva mensajes rechazados para inspección. Tenemos una por cada flujo. |
| ¿Qué pasa si falla la BD? | En el consumidor se reintentan errores transitorios hasta tres veces; si no se resuelve, se hace NACK sin requeue y pasa a DLQ. |
| ¿Y si falla publicar? | El evento queda en la outbox y el publicador reintenta; solo lo marca publicado tras confirmación y sin devolución por falta de ruta. |
| ¿Qué evita duplicados? | Tickets y comprobantes tienen controles idempotentes; correo usa recibos por eventId. SMTP conserva una ventana de posible duplicado ante una caída tras enviar. |
| ¿Por qué ACK después? | Para no confirmar al broker un trabajo que todavía puede fallar antes de persistir su efecto. |
| ¿Azure o AWS para mensajería? | AWS: RabbitMQ y servicios en EC2. Azure: identidad y login. RDS: base de datos. |
| ¿Angular está en cloud? | Corre local en puerto 4200 según la aclaración de la profesora para esta entrega; EP4 genéricamente menciona cloud. No decir que está desplegado si no lo está. |
| ¿Un JWT se valida solo decodificándolo? | No: hay que verificar firma, emisor, expiración y claims esperados. Decodificar sin verificar no autentica. |
| ¿El técnico puede administrar Rabbit? | No. Admin administra mensajería; Técnico/Operador gestiona reservas y tickets. |
| ¿Los dos nodos aseguran alta disponibilidad? | No en estas colas classic sin réplica. Demostramos clúster de dos nodos, no tolerancia a la pérdida de cada cola. |
| ¿Qué queda por probar? | La sesión real de Sebastián y aislamiento/operaciones con una cuenta estudiante distinta. No confundir configuración de rol con prueba de todos los endpoints. |

## Si algo falla durante la demostración

- **Error de conexión:** revisar laboratorio, EC2, IP actual de Gateway y servicios saludables.
- **401:** revisar sesión Azure, audience/scope/issuer y expiración; volver a iniciar sesión.
- **403:** comprobar el rol requerido y el Object ID autorizado. No quitar seguridad para mostrarlo.
- **409 al borrar cola:** puede tener mensajes/consumidores o configuración incompatible. Usar una cola de ensayo vacía.
- **Ticket/PDF no aparece:** actualizar y revisar consumidores, outbox y DLQ; no basta con pulsar repetidamente.
- **Consola en otra región:** elegir us-east-1.

## Orden para exponer en 10 minutos

1. Arquitectura e identidad (1 minuto).
2. Recorrido de reserva, ticket y PDF (3 minutos).
3. Código: topología, consumidores, ACK y servicio administrador (2 minutos).
4. AWS: Gateway/JWT, clúster, colas/DLQ y Compose (2 minutos).
5. Crear/eliminar recurso de ensayo, validación y cierre de límites (2 minutos).

Preparar las pestañas antes; no consumir los diez minutos buscando archivos.
Ambos integrantes deben poder explicar todo el sistema porque la evaluación es individual.
