# CampusLab EA1 en AWS

Catálogo Spring Boot y PostgreSQL se ejecutan en Docker Compose dentro de una EC2. API Gateway HTTP API valida el JWT de Cognito antes de enviar las solicitudes al catálogo, que comprueba `ROLE_ADMIN`.

El frontend y el BFF de login permanecen locales. Bookings no está desplegado en AWS.

## Recursos

Los identificadores actuales están en `deployment.json`. Región: `us-east-1`. Instancia: `t3.small`, 2 GB de RAM, disco gp3 cifrado de 12 GB, créditos CPU estándar. No se crearon RDS, balanceador ni Elastic IP.

- HTTPS público: API Gateway.
- Integración API Gateway → EC2: HTTP en 8082, protegido adicionalmente por JWT y rol en Spring Security.
- SSH: puerto 22 limitado a la IP pública del equipo que realizó el despliegue.
- PostgreSQL: puerto 5432 solamente en la red interna Docker, sin publicación en EC2.
- El directorio remoto es `/opt/campuslab` y el volumen persistente es `campuslab_catalog_data`.
- La base cloud es independiente de la local; no se copiaron registros locales.

## Configuración y despliegue

`compose.yml` recibe `SPRING_DATASOURCE_PASSWORD` desde el entorno o un archivo `.env` privado en EC2. No subir ese archivo ni claves privadas a GitHub. El catálogo no necesita claves AWS para validar JWT públicos de Cognito.

Para reconstruir, compilar catálogo con `mvnw.cmd -DskipTests package`, copiar su JAR como `app.jar` junto a `Dockerfile.catalog`, `.dockerignore` y `compose.yml` en EC2, y ejecutar:

```bash
cd /opt/campuslab
docker compose up -d --build
docker compose ps
docker compose logs --tail=80 catalog
```

La clave SSH se conserva fuera del proyecto en `C:/Users/josem/.ssh/campuslab-ea1.pem`.

## Detener y volver a iniciar

En PowerShell, definir `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` y `AWS_SESSION_TOKEN` con los valores vigentes de AWS Details. No guardarlos en scripts. Desde este directorio:

```powershell
npm ci
node manage.mjs status
node manage.mjs stop
# Cuando se necesite usar la aplicación otra vez:
node manage.mjs start
```

Al reiniciar EC2 puede cambiar su IP pública. `start` actualiza automáticamente la integración de API Gateway; la URL que usa Angular se mantiene. Tras iniciar, esperar a que el endpoint `/actuator/health` responda 200. Las credenciales del Learner Lab pueden caducar y requerir renovación.

Detener conserva los datos. No ejecutar `docker compose down -v` ni terminar la instancia si se desean conservar. El almacenamiento mantiene costo mientras exista, incluso con la instancia detenida.

## Evidencia para EA1

Mostrar EC2 en ejecución, `docker compose ps` con dos contenedores saludables, rutas de API Gateway y JWT authorizer de Cognito. En Angular, iniciar sesión y demostrar crear, editar y eliminar recursos con solicitudes hacia `execute-api.us-east-1.amazonaws.com` visibles en Network, sin mostrar tokens.

Verificación ejecutada el 22 de septiembre de 2026:

- Ambos contenedores saludables (`containers.txt`).
- `/actuator/health` a través de API Gateway: 200 y `UP`.
- `/api/catalogo` sin token o con token inválido: 401.
- Preflight CORS desde localhost:4200: 204, origen permitido.
- Angular compilado con la URL cloud en ambos archivos de entorno.
- `node manage.mjs status` comprobado contra AWS. `start` y `stop` están preparados, pero no se ejecutaron para evitar interrumpir la demostración.
- Resultados HTTP guardados en `verification.json`. Se comprobó en PostgreSQL cloud el recurso `Prueba AWS`, activo, con stock total y disponible de 19, durante la prueba del usuario. La eliminación final sigue pendiente de confirmación.
- Las 9 pruebas específicas de Angular siguen pasando tras conectar la URL cloud.

Fuentes técnicas: [JWT authorizers de AWS](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-jwt-authorizer.html) y [Docker Compose](https://docs.docker.com/compose/install/linux/).
