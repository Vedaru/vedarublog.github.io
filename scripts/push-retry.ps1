# Git push retry script with exponential backoff
param(
    [int]$MaxRetries = 5,
    [int]$InitialDelaySeconds = 5
)

$delay = $InitialDelaySeconds
for ($attempt = 1; $attempt -le $MaxRetries; $attempt++) {
    Write-Host "Attempt $attempt/$MaxRetries to push..."
    
    & 'D:\Git\cmd\git.exe' push origin HEAD
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Push successful!"
        exit 0
    }
    
    if ($attempt -lt $MaxRetries) {
        Write-Host "❌ Push failed. Waiting ${delay} seconds before retry..."
        Start-Sleep -Seconds $delay
        $delay = [Math]::Min($delay * 2, 300)  # Exponential backoff, max 5 min
    }
}

Write-Host "❌ Push failed after $MaxRetries attempts."
exit 1
