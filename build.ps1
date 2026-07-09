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
  # ★ Neutralino 네이티브 --embed-resources 로 resources.neu 를 exe 안에 내장 →
  #   '단일 파일' MDeautify.exe (별도 resources.neu 불필요). 외부 도구 없음.
  Write-Host "== 단일 exe 빌드 (Neutralino --embed-resources) ==" -ForegroundColor Cyan
  Push-Location $appDir
  try {
    npx --yes @neutralinojs/neu build --embed-resources
  } finally {
    Pop-Location
  }
  $built = Join-Path $appDir "dist\MDeautify-app\MDeautify-app-win_x64.exe"
  if (-not (Test-Path $built)) { throw "빌드 산출물을 찾을 수 없음: $built" }
  $outExe = Join-Path $release "MDeautify.exe"
  Copy-Item $built $outExe -Force

  # ★ exe 버전 리소스 패치 (Neutralino 기본 'A Neutralinojs application' → 실제 앱 설명)
  #   버전은 neutralino.config.json 의 version 값과 동기화.
  $rcedit = Join-Path $root "tools\rcedit-x64.exe"
  if (Test-Path $rcedit) {
    $cfg = Get-Content (Join-Path $appDir "neutralino.config.json") -Raw | ConvertFrom-Json
    $ver = $cfg.version
    & $rcedit $outExe `
      --set-version-string "FileDescription" "MDeautify - Markdown to PDF" `
      --set-version-string "ProductName" "MDeautify" `
      --set-file-version "$ver.0" `
      --set-product-version "$ver" | Out-Null
    Write-Host "[EXE] 버전 리소스 패치: 설명='MDeautify - Markdown to PDF', 버전=$ver" -ForegroundColor DarkGray
  } else {
    Write-Host "[EXE] rcedit 없음 → 버전 리소스 패치 건너뜀 (tools\rcedit-x64.exe)" -ForegroundColor Yellow
  }
  Write-Host "[EXE] release\MDeautify.exe (단일 파일, 리소스 내장) 생성" -ForegroundColor Green
}

Write-Host ""
Write-Host "완료. release\ 내용:" -ForegroundColor Green
Get-ChildItem $release | Format-Table Name, @{N="Size(KB)";E={[math]::Round($_.Length/1KB)}} -AutoSize
