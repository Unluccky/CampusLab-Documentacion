import fs from 'node:fs/promises';
import { EC2Client, DescribeInstancesCommand, StartInstancesCommand, StopInstancesCommand, waitUntilInstanceRunning } from '@aws-sdk/client-ec2';
import { ApiGatewayV2Client, UpdateIntegrationCommand } from '@aws-sdk/client-apigatewayv2';

const path = new URL('./deployment.json', import.meta.url);
const state = JSON.parse(await fs.readFile(path, 'utf8'));
const ec2 = new EC2Client({ region: state.region });
const gateway = new ApiGatewayV2Client({ region: state.region });
const action = process.argv[2] ?? 'status';
if (!['status', 'start', 'stop'].includes(action)) {
  throw new Error('Uso: node manage.mjs status|start|stop');
}
const input = { InstanceIds: [state.instanceId] };
if (action === 'stop') {
  await ec2.send(new StopInstancesCommand(input));
  console.log('Detención solicitada. El volumen y los datos se conservan; el almacenamiento sigue teniendo costo.');
}
if (action === 'start') {
  await ec2.send(new StartInstancesCommand(input));
  console.log('Esperando a EC2. Docker reiniciará los contenedores automáticamente.');
  await waitUntilInstanceRunning({ client: ec2, maxWaitTime: 300 }, input);
}
const result = await ec2.send(new DescribeInstancesCommand(input));
const instance = result.Reservations[0].Instances[0];
if (action === 'start') {
  if (!instance.PublicIpAddress) throw new Error('EC2 aún no tiene IP pública. Reintenta start.');
  await gateway.send(new UpdateIntegrationCommand({
    ApiId: state.apiId,
    IntegrationId: state.integrationId,
    IntegrationUri: `http://${instance.PublicIpAddress}:8082`,
  }));
  state.publicIp = instance.PublicIpAddress;
  await fs.writeFile(path, JSON.stringify(state, null, 2) + '\n');
  console.log('API Gateway actualizado a la IP actual de EC2.');
}
console.log(JSON.stringify({ instanceId: state.instanceId, status: instance.State.Name,
  publicIp: instance.PublicIpAddress, apiEndpoint: state.apiEndpoint }, null, 2));
