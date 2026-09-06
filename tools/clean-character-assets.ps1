param(
  [string]$OriginalSheet = 'C:\Users\shang\Desktop\项目三\游戏人物形象和设定\image 127.png',
  [string]$SourceDir = (Join-Path $PSScriptRoot '..\public\avatars'),
  [string]$OutputDir = (Join-Path $PSScriptRoot '..\public\looks-v14'),
  [string]$QipaoSource = (Join-Path $PSScriptRoot '..\public\characters\lin-dragon.png'),
  [string]$EditorialSource = '',
  [string]$PremiereSource = ''
)

$compiler = 'C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe'
$sourceCode = (Resolve-Path (Join-Path $PSScriptRoot 'CleanCharacterAsset.cs')).Path
$executable = Join-Path ([System.IO.Path]::GetTempPath()) 'casting-me-clean-character-asset.exe'
$outputPath = [System.IO.Path]::GetFullPath($OutputDir)
$sourcePath = (Resolve-Path $SourceDir).Path
$sheetPath = (Resolve-Path $OriginalSheet).Path

& $compiler /nologo /target:exe /optimize+ /reference:System.Drawing.dll /out:$executable $sourceCode
if ($LASTEXITCODE -ne 0) { throw 'Character asset cleaner compilation failed.' }

New-Item -ItemType Directory -Path $outputPath -Force | Out-Null
& $executable 'sheet-front' $sheetPath (Join-Path $outputPath 'lin-natural.png')
if ($LASTEXITCODE -ne 0) { throw 'Original protagonist extraction failed.' }

$existing = @{
  'lin-sleek.png' = 'lin-sleek.png'
  'lin-bob.png' = 'lin-bob.png'
  'lin-pony.png' = 'lin-pony.png'
}
foreach ($entry in $existing.GetEnumerator()) {
  & $executable 'cutout' (Join-Path $sourcePath $entry.Key) (Join-Path $outputPath $entry.Value)
  if ($LASTEXITCODE -ne 0) { throw "Character cleanup failed: $($entry.Key)" }
}

& $executable 'cutout' ([System.IO.Path]::GetFullPath($QipaoSource)) (Join-Path $outputPath 'lin-qipao.png')
if ($LASTEXITCODE -ne 0) { throw 'Qipao cleanup failed.' }

if ($EditorialSource) {
  & $executable 'cutout' ([System.IO.Path]::GetFullPath($EditorialSource)) (Join-Path $outputPath 'lin-editorial.png')
  if ($LASTEXITCODE -ne 0) { throw 'Editorial look cleanup failed.' }
}
if ($PremiereSource) {
  & $executable 'cutout' ([System.IO.Path]::GetFullPath($PremiereSource)) (Join-Path $outputPath 'lin-premiere.png')
  if ($LASTEXITCODE -ne 0) { throw 'Premiere look cleanup failed.' }
}

Remove-Item -LiteralPath $executable -Force -ErrorAction SilentlyContinue
