
$piperDir = "f:\Anti Gravity Projets\autovid\server\piper"
$modelsDir = "$piperDir\models"
$zipPath = "$piperDir\piper.zip"
$extractPath = "$piperDir\extract"

# Create directories
if (!(Test-Path $modelsDir)) { New-Item -ItemType Directory -Path $modelsDir -Force }
if (!(Test-Path $extractPath)) { New-Item -ItemType Directory -Path $extractPath -Force }

if (!(Test-Path "$piperDir\piper.exe")) {
    Write-Host "Downloading Piper binary..."
    $piperUrl = "https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_windows_amd64.zip"
    curl.exe -L -o $zipPath $piperUrl

    Write-Host "Extracting Piper..."
    Expand-Archive -Path $zipPath -DestinationPath $extractPath -Force

    Write-Host "Moving files..."
    Get-ChildItem -Path "$extractPath\piper\*" | Move-Item -Destination $piperDir -Force

    # Cleanup
    Remove-Item $zipPath
    Remove-Item -Recurse $extractPath
} else {
    Write-Host "Piper binary already exists."
}

Write-Host "Downloading Voice Models..."
$models = @(
    @{ name = "en_US-lessac-high.onnx"; url = "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/high/en_US-lessac-high.onnx" },
    @{ name = "en_US-lessac-high.onnx.json"; url = "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/high/en_US-lessac-high.onnx.json" },
    @{ name = "en_US-ryan-high.onnx"; url = "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/ryan/high/en_US-ryan-high.onnx" },
    @{ name = "en_US-ryan-high.onnx.json"; url = "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/ryan/high/en_US-ryan-high.onnx.json" },
    @{ name = "en_GB-alba-medium.onnx"; url = "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_GB/alba/medium/en_GB-alba-medium.onnx" },
    @{ name = "en_GB-alba-medium.onnx.json"; url = "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_GB/alba/medium/en_GB-alba-medium.onnx.json" }
)

foreach ($model in $models) {
    $dest = "$modelsDir\$($model.name)"
    # Check if file exists and is not 0 bytes
    if (!(Test-Path $dest) -or (Get-Item $dest).Length -eq 0) {
        Write-Host "Downloading $($model.name)..."
        curl.exe -L -o $dest $model.url
    } else {
        Write-Host "$($model.name) already exists, skipping."
    }
}

Write-Host "Piper setup complete!"
