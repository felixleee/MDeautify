<#
  MDeautify 배포 빌드 스크립트
  - 멀티파일 소스(MDeautify-app/resources)에서 배포본을 생성합니다.
  - 결과물은 release\ 폴더에 모입니다.

  사용법:
    .\build.ps1           # HTML + exe 둘 다
    .\build.ps1 -Html     # 단일 HTML만
    .\build.ps1 -Exe      # exe만
#>
param(
  [switch]$Html,
  [switch]$Exe
)
$ErrorActionPreference = "Stop"
$root    = $PSScriptRoot
$appDir  = Join-Path $root "MDeautify-app"
$resDir  = Join-Path $appDir "resources"
$release = Join-Path $root "release"
New-Item -ItemType Directory -Force $release | Out-Null

# 플래그가 하나도 없으면 둘 다
$doHtml = $Html -or (-not $Html -and -not $Exe)
$doExe  = $Exe  -or (-not $Html -and -not $Exe)

if ($doHtml) {
  Write-Host "== 단일 HTML 빌드 ==" -ForegroundColor Cyan
  node (Join-Path $root "build\inline.mjs") $resDir (Join-Path $release "MDeautify.html")
}

if ($doExe) {
  Write-Host "== exe 빌드 (Neutralino) ==" -ForegroundColor Cyan
  Push-Location $appDir
  try {
    npx --yes @neutralinojs/neu build
  } finally {
    Pop-Location
  }
  $built = Join-Path $appDir "dist\MDeautify-app\MDeautify-app-win_x64.exe"
  if (-not (Test-Path $built)) { throw "빌드 산출물을 찾을 수 없음: $built" }
  Copy-Item $built (Join-Path $release "MDeautify.exe") -Force
  Write-Host "[EXE] release\MDeautify.exe 생성" -ForegroundColor Green
}

Write-Host ""
Write-Host "완료. release\ 내용:" -ForegroundColor Green
Get-ChildItem $release | Format-Table Name, @{N="Size(KB)";E={[math]::Round($_.Length/1KB)}} -AutoSize
