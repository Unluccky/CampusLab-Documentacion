#!/usr/bin/env python3
"""Verify the three live consumers reject invalid events to their own DLQ.

Run on the RabbitMQ host: sudo python3 verify-dlqs.py
Credentials are read privately from rabbit1's Docker environment. Management
stays on loopback. Existing messages are never purged or acknowledged away.
Each run leaves one labelled test message in each DLQ as evidence.
"""
import argparse
import base64
from datetime import datetime, timezone
import json
import os
import subprocess
import time
from urllib.parse import quote
from urllib.request import Request, urlopen
from uuid import uuid4


def verify(base_url, username, password, timeout):
    authorization = 'Basic ' + base64.b64encode(
        f'{username}:{password}'.encode()).decode()

    def api(path, body=None):
        data = None if body is None else json.dumps(body).encode()
        request = Request(base_url + '/api/' + path, data=data, headers={
            'Authorization': authorization, 'Content-Type': 'application/json'})
        with urlopen(request, timeout=10) as response:
            return json.load(response)

    vhost = 'campuslab'
    nodes = [node['name'] for node in api('nodes') if node['running']]
    if len(nodes) != 2:
        raise RuntimeError(f'Expected two running RabbitMQ nodes; found {len(nodes)}')
    exchanges = {item['name']: item['type'] for item in api('exchanges/' + vhost)}
    for name, expected in [('cmd.direct', 'direct'), ('cmd.topic', 'topic'),
                           ('cmd.dead.dlx', 'direct')]:
        if exchanges.get(name) != expected:
            raise RuntimeError(f'{name} must have type {expected}')

    def queue(name):
        return api(f'queues/{vhost}/{quote(name, safe="")}')

    # Check every consumer before publishing any event.
    targets = [('q.cmd.email', 'email.send'), ('q.cmd.prep', 'prep.ticket'),
               ('q.cmd.voucher', 'voucher.gen')]
    for name, _ in targets:
        source = queue(name)
        args = source.get('arguments', {})
        if (source.get('consumers', 0) < 1
                or args.get('x-dead-letter-exchange') != 'cmd.dead.dlx'
                or args.get('x-dead-letter-routing-key') != name + '.dlq'):
            raise RuntimeError(f'{name}: active consumer or DLX configuration missing')
        queue(name + '.dlq')

    run_id = 'qa-dlq-' + str(uuid4())
    results = []
    for name, routing_key in targets:
        dlq = name + '.dlq'
        initial = queue(dlq).get('messages_ready', 0)
        event_id = str(uuid4())
        # An invalid type makes each real consumer NACK before any DB/SMTP effect.
        envelope = dict(type='qa.invalid', eventId=event_id,
                        timestamp=datetime.now(timezone.utc).isoformat(),
                        traceId=run_id, correlationId=run_id, payload={})
        published = api(f'exchanges/{vhost}/cmd.direct/publish', dict(
            properties=dict(delivery_mode=2, content_type='application/json',
                            correlation_id=run_id, message_id=event_id),
            routing_key=routing_key, payload=json.dumps(envelope),
            payload_encoding='string'))
        if not published.get('routed'):
            raise RuntimeError(f'Event was not routed to {name}')
        deadline = time.monotonic() + timeout
        found = None
        final = initial
        while time.monotonic() < deadline:
            final = queue(dlq).get('messages_ready', 0)
            if final > initial:
                # Requeue every inspected message, including our evidence.
                messages = api(f'queues/{vhost}/{dlq}/get', dict(
                    count=min(final, 1000), ackmode='ack_requeue_true',
                    encoding='auto', truncate=50000))
                for message in messages:
                    if message.get('payload_encoding') != 'string':
                        continue
                    try:
                        content = json.loads(message['payload'])
                    except (ValueError, KeyError):
                        continue
                    if content.get('eventId') != event_id:
                        continue
                    deaths = message.get('properties', {}).get('headers', {}).get('x-death', [])
                    if any(d.get('queue') == name and d.get('reason') == 'rejected'
                           and d.get('count', 0) >= 1 for d in deaths):
                        found = deaths
                        break
            if found:
                break
            time.sleep(1)
        if not found:
            raise RuntimeError(f'No matching rejected event found in {dlq}; run {run_id}')
        results.append(dict(queue=name, dlq=dlq, eventId=event_id,
                            messagesBefore=initial, messagesAfter=final,
                            xDeath=found, verified=True))
    return dict(checkedAt=datetime.now(timezone.utc).isoformat(), runId=run_id,
                nodes=nodes, exchanges=exchanges, dlqs=results,
                evidenceRetained=True, businessEffects='none: invalid event types')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--container', help='Rabbit1 container; otherwise discover by Compose label')
    parser.add_argument('--url', default='http://127.0.0.1:15672')
    parser.add_argument('--timeout', type=int, default=45)
    args = parser.parse_args()
    username = os.environ.get('RABBIT_USER')
    password = os.environ.get('RABBIT_PASSWORD')
    if not username or not password:
        container = args.container
        if not container:
            ids = subprocess.check_output([
                'docker', 'ps', '-q', '--filter', 'label=com.docker.compose.service=rabbit1'
            ], text=True).split()
            if len(ids) != 1:
                raise RuntimeError('Specify --container: expected one running rabbit1')
            container = ids[0]
        inspected = json.loads(subprocess.check_output(['docker', 'inspect', container], text=True))[0]
        env = dict(item.split('=', 1) for item in inspected['Config']['Env'] if '=' in item)
        username = env['RABBITMQ_DEFAULT_USER']
        password = env['RABBITMQ_DEFAULT_PASS']
    print(json.dumps(verify(args.url.rstrip('/'), username, password, args.timeout), indent=2))


if __name__ == '__main__':
    main()
