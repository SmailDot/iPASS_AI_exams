$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Force test-output | Out-Null
$env:IPAS_NO_OPEN = '1'
$env:IPAS_NO_PAUSE = '1'
$env:IPAS_PORT = '4173'
$child = Start-Process cmd.exe -ArgumentList '/d /c Start_Local.cmd' -WorkingDirectory (Get-Location).Path -PassThru -RedirectStandardOutput 'test-output/windows-start.log' -RedirectStandardError 'test-output/windows-start-error.log'
try {
  $health = $null
  for ($i = 0; $i -lt 60; $i++) {
    try { $health = Invoke-RestMethod 'http://127.0.0.1:4173/__ipas_health' -TimeoutSec 2; break } catch { Start-Sleep -Seconds 1 }
    if ($child.HasExited) { throw 'Windows launcher exited before becoming ready.' }
  }
  if ($health.app -ne 'smaildot.ipas.l23' -or $health.mode -ne 'loopback-only') { throw 'Wrong health response.' }
  $page = Invoke-WebRequest 'http://127.0.0.1:4173/iPASS_AI_exams/'
  if ($page.StatusCode -ne 200 -or $page.Content -notmatch 'src/boot.js') { throw 'Built page is missing.' }
  $image = Invoke-WebRequest 'http://127.0.0.1:4173/iPASS_AI_exams/assets/loss.svg'
  if ($image.StatusCode -ne 200) { throw 'Local image is missing.' }
  $listeners = @(Get-NetTCPConnection -State Listen -LocalPort 4173)
  if ($listeners.Count -ne 1 -or $listeners[0].LocalAddress -ne '127.0.0.1') { throw 'Server is not loopback-only.' }
  @{passed=$true; checks=@('Windows cmd launcher','source auto-build','fixed local origin','local image response','loopback binding'); not_tested=@('automatic default browser opening','physical Android')} | ConvertTo-Json | Set-Content 'test-output/windows-launch.json'
  Write-Output 'PASS Windows Start_Local.cmd: auto-build, HTTP page/image and loopback-only listener.'
} finally {
  if (-not $child.HasExited) { & taskkill.exe /PID $child.Id /T /F | Out-Null }
}
