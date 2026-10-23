# Quick registration smoke tests for the API
$base = "http://localhost:3001/api/auth/register"

$tests = @(
  @{ name='Auto Student'; body = @{ name='Auto Student'; email='auto.student@example.com'; password='Student123'; role='Student'; studentId='AS100' } },
  @{ name='Auto Teacher'; body = @{ name='Auto Teacher'; email='auto.teacher@example.com'; password='Teacher123'; role='Teacher' } },
  @{ name='Auto Admin'; body = @{ name='Auto Admin'; email='auto.admin@example.com'; password='Admin123'; role='Admin' } }
)

foreach ($t in $tests) {
  Write-Host "\n== Running test: $($t.name) =="
  $json = $t.body | ConvertTo-Json -Depth 5
  try {
    $res = Invoke-RestMethod -Uri $base -Method POST -ContentType 'application/json' -Body $json -UseBasicParsing
    Write-Host "Success:" ($res | ConvertTo-Json -Depth 5)
  } catch {
    Write-Host "Error:" $_.Exception.Message
    if ($_.Exception.Response) {
      try { $text = $_.Exception.Response.GetResponseStream() | Select-Object -First 1; Write-Host $text } catch {}
    }
  }
}
