param(
  [string]$Region = 'us-east-1',
  [string]$ApiId = 'pludtc2ix3',
  [string]$InstanceId = 'i-0e59dc1bacbdc9483'
)
$ErrorActionPreference = 'Stop'
# Use AWS CLI credentials from the environment/profile. Never put credentials here.
function Invoke-AwsJson([string[]]$Arguments) {
  $result = & aws @Arguments --region $Region --output json --no-cli-pager
  if ($LASTEXITCODE -ne 0) { throw 'AWS CLI request failed.' }
  return ($result | ConvertFrom-Json)
}
$instance = Invoke-AwsJson @('ec2','describe-instances','--instance-ids',$InstanceId)
$server = $instance.Reservations[0].Instances[0]
if ($server.State.Name -ne 'running' -or !$server.PublicIpAddress) { throw 'Start the CampusLab instance before refreshing Gateway.' }
$integrations = Invoke-AwsJson @('apigatewayv2','get-integrations','--api-id',$ApiId)
foreach ($item in $integrations.Items) {
  $uri = [uri]$item.IntegrationUri
  if ($uri.Scheme -eq 'http' -and $uri.Port -in @(8081,8082,8083,8084)) {
    $builder = [System.UriBuilder]::new($uri)
    $builder.Host = $server.PublicIpAddress
    $null = Invoke-AwsJson @('apigatewayv2','update-integration','--api-id',$ApiId,'--integration-id',$item.IntegrationId,'--integration-uri',$builder.Uri.AbsoluteUri)
  }
}
$routes = Invoke-AwsJson @('apigatewayv2','get-routes','--api-id',$ApiId)
$academic = $routes.Items | Where-Object RouteKey -eq 'ANY /api/bff/academic/{proxy+}'
$preflight = $routes.Items | Where-Object RouteKey -eq 'OPTIONS /api/bff/academic/{proxy+}'
if (!$academic.Target) { throw 'Academic BFF integration is missing.' }
$bffIntegration = $academic.Target -replace '^integrations/', ''
$null = Invoke-AwsJson @('apigatewayv2','update-integration','--api-id',$ApiId,'--integration-id',$bffIntegration,'--request-parameters','overwrite:path=$request.path')
if ($preflight) {
  $null = Invoke-AwsJson @('apigatewayv2','update-route','--api-id',$ApiId,'--route-id',$preflight.RouteId,'--authorization-type','NONE','--target',$academic.Target)
} else {
  $null = Invoke-AwsJson @('apigatewayv2','create-route','--api-id',$ApiId,'--route-key','OPTIONS /api/bff/academic/{proxy+}','--authorization-type','NONE','--target',$academic.Target)
}
Write-Output "Gateway targets updated to $($server.PublicIpAddress). Allow a moment for automatic deployment, then verify CORS and login."
