# Comparación de EP3, EP4 y CampusLab

Revisión: 22/10/2026. Fuentes: `EP3_DSY1107_Estudiante_encargo.pdf` y `EP4_DSY1107_Estudiante_presentación.pdf`. Ambas pautas repiten los ocho indicadores técnicos. EP3 corresponde al encargo y EP4 a la presentación, con evaluación individual aunque la exposición sea grupal.

Esta comparación se basa en el código, pruebas locales y evidencia cloud del 19/10 y 22/10. No certifica disponibilidad permanente de AWS ni garantiza una nota.

## Indicadores técnicos compartidos

| Criterio | EP3 | EP4 | CampusLab | Trabajo restante |
|---|---:|---:|---|---|
| Nombres centralizados | 12% | 12% | RabbitTopology concentra nombres de colas, exchanges y bindings mediante propiedades | Mostrar la configuración y explicar cómo se utiliza |
| Beans Queue, Exchange y Binding | 13% | 13% | Correo, preparación y comprobantes con sus DLQ; direct/topic/dead | Mostrar correspondencia entre beans y topología real |
| Separación negocio/configuración | 10% | 10% | Clases de configuración, servicios de dominio y outbox separados | Explicar responsabilidades y flujo |
| Consumidores organizados por dominio | 15% | 15% | EmailConsumer, PreparationConsumer y VoucherConsumer | Mostrar los tres casos de uso |
| ACK, errores, reintentos y DLQ | 20% | 20% | ACK explícito, reintentos transitorios limitados y NACK sin reencolado infinito; tres DLQ verificadas en AWS con eventId y x-death rejected | Mostrar evidencia JSON y logs del 22/10 |
| API REST de administración | 13% | 13% | Crear/eliminar colas, exchanges y bindings; consultar colas; eliminación desde Angular verificada en AWS el 22/10 | Repetir con recursos de ensayo durante exposición |
| Servicio dedicado | 10% | 10% | RabbitAdminService encapsula operaciones AMQP | Mostrar delegación desde controlador |
| Validación | 7% | 7% | DTO, tipos permitidos, nombres y protección de topología operativa | Mostrar solicitudes válidas e inválidas y sus respuestas |

## Instrucciones adicionales

| Requisito | Pauta | Estado | Pendiente |
|---|---|---|---|
| Componentes completos, compilables y con pruebas básicas | EP3 | Implementados; 39 pruebas backend aprobadas en la revisión del 22/10 | Verificación final del entorno antes de entregar |
| Base de datos cloud mediante entidades/repositorios/conexión | EP3 | PostgreSQL RDS integrado; flujo completo probado | Mostrar persistencia y configuración sin exponer secretos |
| Login IDaaS y JWT frontend/backend | Ambas | Azure/MSAL y validación Gateway/Spring; login académico real probado | Estudiante probado según confirmación del usuario el 22/10; falta sesión real del técnico |
| Instancia de API Manager y configuración de endpoints | EP4 | AWS API Gateway configurado | Mostrar rutas e integraciones |
| Frontend consume API Manager | EP4 | Ruta académica Angular → Gateway → BFF funcionando en evidencia del 19/10 | Repetir durante presentación |
| JWT válido aceptado y peticiones inválidas rechazadas | EP4 | Implementado y probado | Preparar ambos ejemplos visibles |
| Tenant y usuarios registrados | EP4 | Cuenta administradora operativa; invitación del compañero aceptada y Object ID configurado como Técnico/Operador en los tres servicios | Prueba de su sesión real pendiente por disponibilidad |
| Backend/frontend desplegados en cloud | EP4 | Backend en AWS, Angular local | La profesora aclaró expresamente que Angular puede correr local en esta entrega |
| Dos nodos RabbitMQ en clúster | EP4 | Configurados y comprobados en AWS | Mostrar running_nodes y estado del clúster |
| Tres colas con sus DLQ funcionando | EP4 | Seis colas configuradas; flujos normales y las tres rutas de rechazo verificadas en AWS | Mostrar evidencia del 22/10 o repetir script con servicios saludables |
| Exchanges direct y topic configurados | EP4 | Ambos declarados con bindings | Mostrar configuración; publicar por topic es una demostración adicional recomendada, no un requisito separado |
| Ejecución cloud de Docker Compose para RabbitMQ | EP4 | Desplegado | Mostrar comandos y servicios activos |
| Entrega de fuentes por GitHub y .gitignore | Ambas | Implementación publicada en main de siete repositorios; feature/siguiente-experiencia conservada | Verificar acceso docente y entregar enlaces en AVA y copia por correo |
| Exposición entre 5 y 10 minutos; explicación individual | EP4 | Guion disponible | Ensayar con ambos integrantes y cubrir infraestructura además del flujo funcional |

## Alcance del correo y robustez

Las dos pautas no exigen expresamente recepción en una bandeja externa. Mailpit captura el SMTP de pruebas; la entrega real a personas debe revisarse además contra el caso y las indicaciones docentes. No afirmar que se comprobó recepción externa.

La coordinación de stock usa HTTP idempotente entre dominios y necesita reconciliación si falla entre ambos commits. Los dos nodos RabbitMQ usan colas classic sin replicación de mensajes. Son limitaciones documentadas; no presentarlas como transacciones distribuidas ni alta disponibilidad.

## Documentación relacionada

- [Matriz técnica y pruebas](RUBRICA-EP2.md).
- [Guion de demostración](DEMOSTRACION-EP2.md).
- [Evidencia cloud del 19/10](../infra/ep2/VERIFICACION-20261019.md).
- [Tres DLQ, eliminación y técnico: 22/10](../infra/ep2/VERIFICACION-20261022.md).
- [Guía para defender cada criterio](GUIA-DEFENSA-RUBRICA.md).
- [Arquitectura y repositorios](../README.md).
