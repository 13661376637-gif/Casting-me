param(
  [string]$SourceDir = (Join-Path $PSScriptRoot '..\public\avatars'),
  [string]$OutputDir = (Join-Path $PSScriptRoot '..\public\avatar-layers')
)

$compiler = 'C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe'
$source = (Resolve-Path (Join-Path $PSScriptRoot 'AvatarLayerGenerator.cs')).Path
$output = Join-Path ([System.IO.Path]::GetTempPath()) 'casting-me-avatar-layer-generator.exe'
$sourceDir = (Resolve-Path $SourceDir).Path
$outputDir = [System.IO.Path]::GetFullPath($OutputDir)

& $compiler /nologo /target:exe /optimize+ /reference:System.Drawing.dll /out:$output $source
if ($LASTEXITCODE -ne 0) { throw 'Avatar layer generator compilation failed.' }
& $output $sourceDir $outputDir
if ($LASTEXITCODE -ne 0) { throw 'Avatar layer generation failed.' }
Remove-Item -LiteralPath $output -Force -ErrorAction SilentlyContinue
