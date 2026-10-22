# RabbitMQ CampusLab

Clúster de dos nodos solicitado por el caso. Preparado para EC2 dedicada a mensajería;
no desplegar ambos nodos sobre la EC2 de aplicaciones de 2 GiB sin revisar capacidad.

Copiar `.env.example` a `.env` y generar contraseña y cookie aleatorias propias.
Ejecutar `docker compose config --quiet`, `docker compose up -d` y
`docker compose exec rabbit1 rabbitmqctl cluster_status`.
Ambos nodos deben figurar en `Running Nodes`. No usar `down -v`: elimina los mensajes.

El panel escucha solo en loopback. En EC2 acceder por túnel SSM; AMQP debe
escuchar en la IP privada y su Security Group admitir únicamente al grupo de apps.
Los puertos internos de descubrimiento no se publican fuera de Docker.

Dos nodos cumplen la cantidad del caso, pero no proporcionan tolerancia a la pérdida
de un nodo para colas quorum: una mayoría de dos requiere ambos. No presentar esto
como alta disponibilidad. Separar nodos en hosts distintos y añadir un tercero es
una mejora para producción, fuera de esta configuración académica.

Topología de negocio en `definitions.json`: `cmd.direct`, `cmd.topic`, `cmd.dead.dlx`;
`q.cmd.email`, `q.cmd.prep`, `q.cmd.voucher` y una DLQ por flujo. La declaración
se importa después de iniciar el clúster:

```powershell
docker compose cp definitions.json rabbit1:/tmp/campuslab-definitions.json
docker compose exec rabbit1 rabbitmqctl import_definitions /tmp/campuslab-definitions.json
docker compose exec rabbit1 rabbitmqctl list_queues -p campuslab name messages consumers
```

Las colas clásicas son durables y tienen DLX, pero sus mensajes no se replican.
Levantar el clúster y declarar las colas no demuestra todavía el consumidor Spring.

## Comprobación real de las tres DLQ

Con los consumidores activos, ejecutar en la EC2 de RabbitMQ:

```bash
sudo python3 verify-dlqs.py
```

El script obtiene las credenciales del contenedor `rabbit1` sin mostrarlas y usa
la API de administración por loopback. Comprueba los dos nodos, los exchanges,
los consumidores y la configuración DLX. Publica un evento JSON con tipo inválido
por cada ruta de negocio y verifica su `eventId` y `x-death.reason=rejected` en
la DLQ correspondiente. El tipo inválido provoca el rechazo antes de tocar la
base de datos o SMTP. No purga ni elimina mensajes; las lecturas de evidencia
usan `ack_requeue_true` y conservan los mensajes, aunque pueden cambiar su orden
en la DLQ. Cada ejecución añade un mensaje de prueba por flujo.

La ejecución cloud del 22/10/2026 está en
[`../ep2/evidence/dlqs-20261022.json`](../ep2/evidence/dlqs-20261022.json).

Referencia de configuración: https://www.rabbitmq.com/docs/cluster-formation
