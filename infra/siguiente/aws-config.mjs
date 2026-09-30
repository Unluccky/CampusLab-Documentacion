import {EC2Client,DescribeInstancesCommand} from '@aws-sdk/client-ec2';
import {RDSClient,DescribeDBInstancesCommand} from '@aws-sdk/client-rds';
import {ApiGatewayV2Client,GetIntegrationsCommand,GetRoutesCommand,UpdateApiCommand,UpdateIntegrationCommand,CreateIntegrationCommand,CreateRouteCommand,UpdateRouteCommand} from '@aws-sdk/client-apigatewayv2';
import fs from 'node:fs/promises';
const region='us-east-1',ApiId='pludtc2ix3';
const ec2=new EC2Client({region}),rds=new RDSClient({region}),gw=new ApiGatewayV2Client({region});
const instance=(await ec2.send(new DescribeInstancesCommand({InstanceIds:['i-0e59dc1bacbdc9483']}))).Reservations[0].Instances[0];
const database=(await rds.send(new DescribeDBInstancesCommand({DBInstanceIdentifier:'campuslab-postgres'}))).DBInstances[0];
const snapshot={checkedAt:new Date().toISOString(),region,instanceId:instance.InstanceId,instanceState:instance.State.Name,publicIp:instance.PublicIpAddress,rds:{id:database.DBInstanceIdentifier,state:database.DBInstanceStatus,endpoint:database.Endpoint?.Address,public:database.PubliclyAccessible,encrypted:database.StorageEncrypted},apiEndpoint:'https://'+ApiId+'.execute-api.'+region+'.amazonaws.com'};
if(process.argv[2]==='configure'){
 if(instance.State.Name!=='running'||!instance.PublicIpAddress)throw Error('Inicia EC2 antes de actualizar las integraciones.');
 const origins=(process.env.CAMPUSLAB_ALLOWED_ORIGINS||'http://localhost:4200,http://127.0.0.1:4200,http://localhost:4300,http://127.0.0.1:4300').split(',').map(s=>s.trim());
 if(origins.includes('*'))throw Error('Usa orígenes explícitos.');
 await gw.send(new UpdateApiCommand({ApiId,CorsConfiguration:{AllowOrigins:origins,AllowMethods:['GET','POST','PUT','PATCH','DELETE','OPTIONS'],AllowHeaders:['authorization','content-type'],AllowCredentials:false,MaxAge:300}}));
 const integrations=(await gw.send(new GetIntegrationsCommand({ApiId}))).Items;
 const routes=(await gw.send(new GetRoutesCommand({ApiId}))).Items;
 for(const service of [{name:'catalog',port:8082,routes:['GET /api/catalogo','POST /api/catalogo','GET /api/catalogo/{id}','PUT /api/catalogo/{id}','DELETE /api/catalogo/{id}']},{name:'bookings',port:8083,routes:['GET /api/reservas','POST /api/reservas','GET /api/reservas/{id}','PATCH /api/reservas/{id}/estado']},{name:'users',port:8084,routes:['GET /api/usuarios','POST /api/usuarios','GET /api/usuarios/{id}','PUT /api/usuarios/{id}','DELETE /api/usuarios/{id}']}]){
  const existing=integrations.find(i=>service.name==='catalog'?i.IntegrationId==='gvb7hkq':i.Description==='CampusLab '+service.name);
  const data={ApiId,IntegrationType:'HTTP_PROXY',IntegrationMethod:'ANY',IntegrationUri:`http://${instance.PublicIpAddress}:${service.port}`,PayloadFormatVersion:'1.0',Description:'CampusLab '+service.name,RequestParameters:{'overwrite:path':'$request.path'}};
  const integration=await gw.send(existing?new UpdateIntegrationCommand({...data,IntegrationId:existing.IntegrationId}):new CreateIntegrationCommand(data));
  for(const RouteKey of service.routes){const old=routes.find(r=>r.RouteKey===RouteKey);const data={ApiId,RouteKey,Target:'integrations/'+integration.IntegrationId,AuthorizationType:'JWT',AuthorizerId:'72ogo4',AuthorizationScopes:['aws.cognito.signin.user.admin']};await gw.send(old?new UpdateRouteCommand({...data,RouteId:old.RouteId}):new CreateRouteCommand(data));}
 }
 snapshot.cors=origins;
}else if(process.argv[2]!=='inspect')throw Error('Uso: node aws-config.mjs inspect|configure');
await fs.writeFile(new URL('./deployment.json',import.meta.url),JSON.stringify(snapshot,null,2));
console.log(JSON.stringify(snapshot,null,2));
