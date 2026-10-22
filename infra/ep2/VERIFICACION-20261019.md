# Verificación de integración — 19 de octubre de 2026

## Conexión corregida

- Angular local en http://localhost:4200 consume `https://pludtc2ix3.execute-api.us-east-1.amazonaws.com/api/bff/academic`.
- Se actualizaron las integraciones HTTP a la IP actual de la instancia de aplicaciones. AWS Academy puede cambiarla al reiniciar el laboratorio.
- La ruta `OPTIONS /api/bff/academic/{proxy+}` no exige JWT y ahora tiene una integración asociada. El preflight devuelve 200 con el origen localhost:4200 permitido.
- La integración del BFF conserva la ruta completa mediante `overwrite:path=$request.path`; sin ese mapeo la llamada autenticada terminaba en 404.
- Las operaciones académicas siguen protegidas por el autorizador JWT de Azure y el scope `access-all`, además de validación de JWT y roles en Spring.
- Catálogo, reservas y BFF saludables en EC2; conexiones PostgreSQL RDS con TLS y RabbitMQ privado.

## Pruebas realizadas

1. Inicio de sesión Microsoft con la cuenta académica autorizada; comprobación de administrador por el BFF cloud.
2. Creación desde Angular de cola y exchange `lab.qa20261019`, enlace `demo.created` y consulta: cero mensajes, cero consumidores, cola classic.
3. Reserva de prueba #6, solicitante `Prueba CampusLab 20261019`, recurso #1: SOLICITADA → APROBADA → EN_PREPARACION → EN_USO → DEVUELTA.
4. Stock del recurso: 10 → 9 al aprobar → 10 al devolver.
5. Generación asíncrona del ticket #6 y respuesta técnica persistida desde Angular.
6. Descarga de `campuslab-6-RETIRO.pdf` y `campuslab-6-DEVOLUCION.pdf` desde Angular; retiro con una página y datos de la reserva correctos.
7. Prueba directa sobre RabbitMQ en EC2: dos nodos, correo capturado en Mailpit, duplicado suprimido y mensaje inválido enviado a DLQ. Evento: `9ceca9bb-664d-44fd-9ce1-cd5934553165`.

Se usó `student@example.test`. Mailpit captura SMTP: estas pruebas no enviaron correo a personas reales ni certifican entrega a una bandeja externa.

## Repetir después de iniciar AWS Academy

Con AWS CLI instalado y credenciales temporales cargadas en el entorno o perfil, ejecutar `./refresh-gateway.ps1`. No guardar credenciales en el código. Esperar el despliegue automático y comprobar el preflight y el inicio de sesión. El script actualiza integraciones de puertos 8081–8084 y mantiene el mapeo de ruta y la integración de OPTIONS.

## Alcance y límites

- Angular: 25 pruebas aprobadas en 11 archivos el 19/10. Rabbit Admin: 7 pruebas aprobadas (API y JWT); la integración local con broker se omite si no está configurada.
- Prueba temporal de estudiante: los servicios se reiniciaron correctamente, pero el control del navegador fue deshabilitado en Work antes de comprobar la vista final. Se restauró la configuración de administrador autorizada y los tres servicios terminaron saludables. No registrar esta prueba como aprobada.
- Recursos de demostración `lab.qa20261019` conservados para inspección. El mensaje inválido de la prueba permanece en DLQ como evidencia. La reserva #6 quedó DEVUELTA y liberó el stock.

- La prueba completa descrita usa el rol administrador. Las verificaciones por otros roles se documentan aparte; no confundir resolución de rol con pruebas de todos los endpoints.
- El clúster usa colas classic durables; dos nodos no implican replicación de mensajes ni alta disponibilidad de cada cola.
- Los tests que arrancan el contexto de reservas necesitan PostgreSQL local; el test general de contexto falló por localhost:5432 no disponible. Las pruebas unitarias de permisos, JWT, consumidor y PDF se ejecutaron por separado correctamente.
- Queda documentada una limitación de consistencia distribuida: el stock se actualiza por HTTP antes del commit de reservas. La operación es idempotente, pero una falla entre ambos commits requiere reconciliación; no hay una transacción distribuida.

Referencia de configuración CORS: https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-cors.html

Verificación final adicional: preflight OPTIONS 200, GET sin token 401; PDF de devolución con una página y reserva #6 correctos; pruebas de stock y JWT de catálogo aprobadas. Compilación Angular correcta, con advertencia de tamaño inicial de 685,51 kB frente al presupuesto de aviso de 500 kB.
