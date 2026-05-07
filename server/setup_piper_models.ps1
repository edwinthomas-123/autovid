
$piperDir = "f:\Anti Gravity Projets\autovid\server\piper"
$modelsDir = "$piperDir\models"

if (!(Test-Path $modelsDir)) { New-Item -ItemType Directory -Path $modelsDir -Force }

Write-Host "Downloading Voice Models..."
$models = @(
    @{ name = "en_US-lessac-high.onnx"; url = "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/high/en_US-lessac-high.onnx?download=true" },
    @{ name = "en_US-lessac-high.onnx.json"; url = "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/high/en_US-lessac-high.onnx.json?download=true" },
    @{ name = "en_US-ryan-high.onnx"; url = "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/ryan/high/en_US-ryan-high.onnx?download=true" },
    @{ name = "en_US-ryan-high.onnx.json"; url = "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/ryan/high/en_US-ryan-high.onnx.json?download=true" },
    @{ name = "en_GB-alba-medium.onnx"; url = "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_GB/alba/medium/en_GB-alba-medium.onnx?download=true" },
    @{ name = "en_GB-alba-medium.onnx.json"; url = "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_GB/alba/medium/en_GB-alba-medium.onnx.json?download=true" }
)

foreach ($model in $models) {
    $dest = "$modelsDir\$($model.name)"
    # Redownload if file is too small (less than 1MB for .onnx)
    $tooSmall = $false
    if ($model.name -like "*.onnx" -and (Test-Path $dest) -and (Get-Item $dest).Length -lt 1MB) {
        $tooSmall = $true
    }

    if (!(Test-Path $dest) -or $tooSmall) {
        Write-Host "Downloading $($model.name)..."
        curl.exe -L -o $dest $model.url
    } else {
        Write-Host "$($model.name) already exists and looks valid, skipping."
    }
}

Write-Host "Models setup complete!"
