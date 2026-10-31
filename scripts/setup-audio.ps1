$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$toolsDir = Join-Path $projectRoot 'tools'
New-Item -ItemType Directory -Path $toolsDir -Force | Out-Null
Write-Output 'Downloading yt-dlp from its official GitHub release...'
$release = Invoke-RestMethod 'https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest'
$binary = $release.assets | Where-Object name -eq 'yt-dlp.exe'
$sums = $release.assets | Where-Object name -eq 'SHA2-256SUMS'
Invoke-WebRequest $binary.browser_download_url -OutFile (Join-Path $toolsDir 'yt-dlp.exe')
Invoke-WebRequest $sums.browser_download_url -OutFile (Join-Path $toolsDir 'SHA2-256SUMS')
$checksumText = Get-Content -Raw (Join-Path $toolsDir 'SHA2-256SUMS')
$expected = ([regex]::Match($checksumText, '(?m)^([a-fA-F0-9]{64})\s+\*?yt-dlp\.exe\s*$')).Groups[1].Value
$actual = (Get-FileHash (Join-Path $toolsDir 'yt-dlp.exe') -Algorithm SHA256).Hash
if (!$expected -or $expected -ne $actual) { throw 'yt-dlp checksum verification failed.' }
Write-Output 'Downloading FFmpeg from yt-dlp/FFmpeg-Builds...'
$ff = Invoke-RestMethod 'https://api.github.com/repos/yt-dlp/FFmpeg-Builds/releases/latest'
$asset = $ff.assets | Where-Object name -eq 'ffmpeg-master-latest-win64-gpl.zip'
if (!$asset) { throw 'Windows FFmpeg release not found.' }
$zip = Join-Path $toolsDir 'ffmpeg.zip'
Invoke-WebRequest $asset.browser_download_url -OutFile $zip
if ($asset.digest -like 'sha256:*') {
 if ((Get-FileHash $zip -Algorithm SHA256).Hash -ne $asset.digest.Substring(7)) { throw 'FFmpeg checksum verification failed.' }
}
Expand-Archive -LiteralPath $zip -DestinationPath (Join-Path $toolsDir 'ffmpeg-package') -Force
foreach ($name in @('ffmpeg.exe','ffprobe.exe')) {
 $file = Get-ChildItem (Join-Path $toolsDir 'ffmpeg-package') -Filter $name -Recurse | Select-Object -First 1
 if (!$file) { throw "Missing $name" }
 Copy-Item -LiteralPath $file.FullName -Destination (Join-Path $toolsDir $name) -Force
}
Write-Output 'Audio tools installed in the project tools directory.'
