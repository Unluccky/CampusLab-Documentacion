import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

// Local integration test only: Mailpit captures all SMTP, no real email is sent.
const env = Object.fromEntries((await readFile(new URL('.env', import.meta.url), 'utf8'))
  .split(/\r?\n/).filter(l => l && !l.startsWith('#')).map(l => {
    const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)];
  }));
const authorization = 'Basic ' + Buffer.from(`${env.RABBIT_USER}:${env.RABBIT_PASSWORD}`).toString('base64');
async function api(path, body) {
  const r = await fetch('http://127.0.0.1:15672/api/' + path, {
    method: body ? 'POST' : 'GET', headers: { authorization, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  if (!r.ok) throw new Error(`Rabbit HTTP ${r.status}`);
  return r.json();
}
const eventId = randomUUID();
const envelope = { type: 'email.send', eventId, timestamp: new Date().toISOString(),
  traceId: randomUUID(), correlationId: 'integration-test',
  payload: { recipient: 'student@example.test', subject: `CampusLab test ${eventId}`, message: 'Reserva de prueba aprobada.' } };
async function publish(payload) {
  const result = await api('exchanges/campuslab/cmd.direct/publish', {
    properties: { delivery_mode: 2, content_type: 'application/json' },
    routing_key: 'email.send', payload: JSON.stringify(payload), payload_encoding: 'string'
  });
  if (!result.routed) throw new Error('Message was not routed');
}
async function matchingMail() {
  const r = await fetch('http://127.0.0.1:8025/api/v1/messages');
  if (!r.ok) throw new Error(`Mailpit HTTP ${r.status}`);
  return (await r.json()).messages.filter(m => m.Subject === envelope.payload.subject);
}
await publish(envelope);
let delivered = false;
for (let n = 0; n < 20; n++) {
  if ((await matchingMail()).length === 1) { delivered = true; break; }
  await delay(500);
}
if (!delivered) throw new Error('SMTP message not delivered to Mailpit');
await publish(envelope);
await delay(2000);
if ((await matchingMail()).length !== 1) throw new Error('Duplicate mail delivery');
const initialDeadLetters = (await api('queues/campuslab/q.cmd.email.dlq')).messages_ready ?? 0;
await publish({ ...envelope, eventId: randomUUID(), type: 'invalid' });
let rejected = false;
for (let n = 0; n < 20; n++) {
  const q = await api('queues/campuslab/q.cmd.email.dlq');
  if (q.messages_ready > initialDeadLetters) { rejected = true; break; }
  await delay(500);
}
if (!rejected) throw new Error('Malformed message did not reach DLQ');
const nodes = await api('nodes');
if (nodes.filter(n => n.running).length !== 2) throw new Error('Expected two running nodes');
console.log(JSON.stringify({ clusterNodes: 2, smtpDelivered: true, duplicateSuppressed: true,
  invalidMessageInDlq: true, eventId, checkedAt: new Date().toISOString() }, null, 2));
