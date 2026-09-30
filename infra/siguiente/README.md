# Siguiente experiencia: observaciones de la profesora

Referencia: `RubricaExperiencia 1-JoseMuñoz-SebastianSantander.pdf`, página 2. Este trabajo cubre servicio de usuarios, RDS, CORS AWS, guard y template de Login Admin. No incorpora el cambio PKCE que existía preparado en otros directorios.

## Código que corresponde a esta versión

Los cuatro repositorios originales tienen un worktree en `siguiente-experiencia/` y rama `feature/siguiente-experiencia`. El nuevo proyecto `siguiente-experiencia/campuslab_users` tiene Git local propio. No se ha creado un repositorio remoto para users ni publicado esta rama todavía. Los directorios originales conservan los cambios anteriores: no iniciar esa otra versión por accidente. La versión nueva se abre en **http://localhost:4200/login**; la revisión visual utiliza también 4300.

## Arquitectura desplegada

Angular local -> API Gateway -> catálogo / reservas / usuarios en Docker EC2 -> PostgreSQL RDS.
Login: Angular -> BFF local -> Cognito. Contraseñas y grupos de acceso permanecen en Cognito.

- EC2 existente: `i-0e59dc1bacbdc9483`, región `us-east-1`.
- RDS: `campuslab-postgres`, PostgreSQL 18.3, `db.t3.micro`, 20 GiB gp3, cifrado, Single-AZ, backup de un día y protección de eliminación.
- RDS privada: sin acceso público; puerto 5432 permitido solo desde el Security Group de la EC2.
- Bases: `bdcatalogo`, `bdbookings`, `bdusuarios`. Aplicaciones conectadas con usuario `campuslabapp`, diferente del administrador RDS.
- Conexión Java a RDS: `sslmode=verify-full`, certificado CA oficial de AWS montado en los contenedores.
- EC2: contenedores `campuslab-next-catalog-1`, `campuslab-next-bookings-1`, `campuslab-next-users-1`; puertos publicados 8082, 8083 y 8084. Todos exigen JWT y Admin para las APIs de negocio.
- API Gateway `pludtc2ix3`: rutas de los tres servicios con authorizer JWT; conserva el path mediante `overwrite:path`.
- CORS permite explícitamente localhost y 127.0.0.1 en 4200 y 4300; métodos GET, POST, PUT, PATCH, DELETE y OPTIONS; headers authorization y content-type; sin credenciales de cookies.

RDS y EC2 consumen presupuesto mientras estén activos. El importe depende del tiempo de uso y las condiciones del Lab. Esta implementación no configura escalado automático ni alta disponibilidad Multi-AZ.

## Servicio de usuarios

CRUD de perfiles con nombre, correo, sub de Cognito, estado activo y versión para detectar edición concurrente. Sub y correo únicos, entradas validadas, listado paginado. Baja lógica. El panel `/admin/usuarios` consume el servicio real por Gateway.

Crear un perfil NO crea una cuenta Cognito. Desactivar un perfil NO revoca el acceso de esa cuenta. El servicio no administra contraseñas ni otorga roles. El Admin obtiene el sub de una cuenta existente; actualmente esa asociación no se verifica mediante una consulta a Cognito. Esta separación evita atribuir funciones de identidad que no se implementaron.

## Migración y recuperación

`migrate.sh` se ejecutó como root en `/opt/campuslab/next`. Detuvo el catálogo anterior durante el snapshot, guardó una copia privada y restauró catálogo y reservas en RDS. La copia de reservas procede de PostgreSQL local. La base local no se borra. El PostgreSQL Docker anterior y su volumen se conservan detenidos.

El secreto maestro y la credencial de aplicación se guardan fuera de Git, en archivos privados de la estación de trabajo y de EC2. No ejecutar `cat .env`, `docker inspect` completo ni publicar esos archivos. `compose.yml` requiere `RDS_HOST` y `RDS_APP_PASSWORD` definidos fuera del código.

La migración es de una sola ejecución. No repetirla sobre bases pobladas: el marcador `migration-complete` la bloquea tras completarse. Si una ejecución queda a medias, revisar las bases y backups antes de reintentar. No borrar datos para repetir una demostración.

Volver al contenedor anterior implica volver al snapshot antiguo: antes de un rollback, respaldar RDS y reconciliar nuevas escrituras. No ejecutar `docker compose down -v`.

## Renovar el Lab y las rutas

1. Activar AWS Academy; configurar variables AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY y AWS_SESSION_TOKEN vigentes en la terminal, o un perfil AWS autorizado.
2. Encender EC2 y revisar RDS en la consola. Su disponibilidad depende del Lab.
3. En este directorio: `npm ci`, `node aws-config.mjs inspect`, `node aws-config.mjs configure`. El último actualiza las IP de integraciones y CORS sin recrear la base.
4. En EC2: `cd /opt/campuslab/next` y `sudo docker compose up -d --wait`.
5. En `siguiente-experiencia/campuslab_bff`, iniciar el JAR con las variables AWS nuevas, CATALOG_BASE_URL apuntando a la raíz de API Gateway y CAMPUSLAB_ALLOWED_ORIGINS con los orígenes elegidos.
6. En `siguiente-experiencia/frontend-campuslab`, `npm ci` y `npm start` para 4200, o `npm start -- --port 4300` para revisión.

## Evidencias y límites

- `evidence/cloud-tests-final.json`: 30 comprobaciones reales a través de Gateway con tokens de Cognito, incluidos 401, 403, CRUD, edición concurrente y CORS. No contiene tokens ni contraseñas.
- `evidence/rds-verification.json`: conexiones TLS 1.3 a las tres bases y coincidencia de cantidad y checksum de los cuatro registros del catálogo anterior. Perfil persistente después de reiniciar EC2.
- `evidence/browser-tests.json`: seis comprobaciones de navegador, incluyendo login real, cuenta sin Admin, sesión vencida y vista móvil sin desbordamiento.
- `evidence/cleanup.json`: cuenta QA eliminada de Cognito y dos perfiles temporales retirados de la base. Se incorporó el perfil de la cuenta Admin existente, sin modificar su contraseña ni sus grupos.
- Capturas del login y panel de usuarios: datos de prueba, no datos de estudiantes reales.
- Pruebas backend: PostgreSQL real y rollback; JWT simulado para autorización y firma RSA real en pruebas específicas del decoder.
- Las pruebas automatizadas del guard comprueban sesión y rol. La validación criptográfica y autorización efectiva se mantienen en Gateway y backend.
- La sesión AWS fue revocada durante el trabajo (`voc-cancel-cred`), luego se renovó, se actualizaron las IP de integración y se completaron las verificaciones y limpieza. Nuevas expiraciones requieren renovar credenciales y reiniciar BFF; no se incluyeron claves en el repositorio.
- Pruebas locales finales: usuarios 8, catálogo 5, reservas 1 y BFF 1; Angular 19. Todas aprobadas. No representan una certificación de todos los escenarios posibles.

Documentación técnica de referencia: [RDS PostgreSQL y TLS](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/PostgreSQL.Concepts.General.SSL.html), [conectividad EC2/RDS](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/ec2-rds-connect.html).
