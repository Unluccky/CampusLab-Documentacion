# Demostración CampusLab — hasta 10 minutos

Usar cuentas académicas autorizadas, datos claramente identificados como prueba y correo `student@example.test` con Mailpit. No mostrar tokens, contraseñas, archivos `.env` o credenciales AWS en la presentación.

| Tiempo | Acción | Evidencia esperada |
|---|---|---|
| 0:00–1:00 | Explicar arquitectura y mostrar login Microsoft | Angular local → Azure; JWT → Gateway → BFF → EC2/RDS |
| 1:00–2:00 | Solicitar reserva | Estado SOLICITADA, propietario derivado del JWT |
| 2:00–3:30 | Técnico aprueba | Stock disminuye; outbox publica; aparece ticket |
| 3:30–4:30 | Responder ticket y preparar | Respuesta persistida; aviso capturado en Mailpit |
| 4:30–5:30 | Pasar a EN_USO y descargar vale | PDF de retiro con reserva correcta |
| 5:30–6:30 | Devolver y descargar acta | Estado DEVUELTA; stock recuperado; PDF devolución |
| 6:30–8:00 | Administrar cola, exchange y binding `lab.demo` | Crear, consultar, borrar enlace y recursos vacíos |
| 8:00–9:00 | Mostrar tratamiento de fallos | ACK explícito; duplicado suprimido; mensaje inválido en DLQ; logs sin secretos |
| 9:00–10:00 | Resumir criterios y límites | Configuración central, separación de dominio, validación y pruebas |

## Preparación previa

1. Iniciar AWS Academy y comprobar ambas EC2, RDS y SSM.
2. Actualizar las IP de integraciones con `infra/ep2/refresh-gateway.ps1`; requiere AWS CLI y credenciales válidas en el entorno/perfil.
3. Comprobar CORS OPTIONS 200 y GET sin token 401 sobre `/api/bff/academic/me`.
4. Iniciar Angular con `npm start`. Aceptar invitación de la cuenta técnica y verificar su rol en CampusLab antes de la presentación.
5. Identificar recursos `lab.*` creados específicamente para la demostración. No borrar colas operativas ni purgar mensajes.
6. Tener visibles los repositorios y la matriz de rúbrica. Repartir explicación por conocimientos reales de cada integrante.

## Pruebas de autorización por cerrar

- Estudiante: lista propia, bloqueo de reservas ajenas, sin cambio de estados ni acceso a Rabbit Admin.
- Técnico: lista operativa, aprobación, preparación y respuesta; bloqueo de Rabbit Admin.
- Admin: operaciones anteriores y administración de recursos `lab.*`.

La interfaz oculta acciones según rol; el rechazo debe comprobarse también en el servidor. No presentar controles ocultos como única prueba de seguridad.
