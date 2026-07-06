<#
  MDeautify 배포 빌드 스크립트
  - 멀티파일 소스(MDeautify-app/resources)에서 배포본을 생성합니다.
  - 결과물은 release\ 폴더에 모입니다.

  사용법:
    .\build.ps1            # HTML + exe + 배포 패키지 전부
    .\build.ps1 -Html      # 단일 HTML만
    .\build.ps1 -Exe       # 단일 exe만
    .\build.ps1 -Package   # 배포 패키지 zip만 (exe 빌드 후 guides 문서와 함께 묶음)
#>
param(
  [switch]$Html,
  [switch]$Exe,
  [switch]$Package
)
$ErrorActionPreference = "Stop"
$root    = $PSScriptRoot
$appDir  = Join-Path $root "MDeautify-app"
$resDir  = Join-Path $appDir "resources"
$release = Join-Path $root "release"
New-Item -ItemType Directory -Force $release | Out-Null

# 플래그가 하나도 없으면 전부. -Package 는 exe 가 필요하므로 exe 도 함께 빌드.
$any       = $Html -or $Exe -or $Package
$doHtml    = $Html -or (-not $any)
$doExe     = $Exe -or $Package -or (-not $any)
$doPackage = $Package -or (-not $any)

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
  Copy-Item $built (Join-Path $release "MDeautify.exe") -Force
  Write-Host "[EXE] release\MDeautify.exe (단일 파일, 리소스 내장) 생성" -ForegroundColor Green
}

if ($doPackage) {
  # 배포 패키지: MDeautify.exe + guides\(안내서 md·pdf) 를 zip 하나로 묶는다.
  Write-Host "== 배포 패키지 (zip) ==" -ForegroundColor Cyan
  $exeOut = Join-Path $release "MDeautify.exe"
  if (-not (Test-Path $exeOut)) { throw "exe 가 없습니다. 먼저 .\build.ps1 -Exe 로 빌드하세요." }

  # 스테이징은 TEMP 에서 (release\ 를 깨끗하게 유지)
  $stage  = Join-Path $env:TEMP ("MDeautify-pkg-" + $PID)
  $inner  = Join-Path $stage "MDeautify"
  $guides = Join-Path $inner "guides"
  if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
  New-Item -ItemType Directory -Force $guides | Out-Null
  Copy-Item $exeOut (Join-Path $inner "MDeautify.exe") -Force

  # 가이드 문서(있는 것만 복사)
  $docs = @(
    "MDeautify_사용안내서.md", "MDeautify_사용안내서.pdf",
    "MDeautify_User_Guide.md", "MDeautify_User_Guide.pdf"
  )
  foreach ($d in $docs) {
    $p = Join-Path $root $d
    if (Test-Path $p) { Copy-Item $p $guides -Force }
    else { Write-Host "  (없음, 건너뜀) $d" -ForegroundColor Yellow }
  }

  $zip = Join-Path $release "MDeautify-release.zip"
  if (Test-Path $zip) { Remove-Item $zip -Force }
  Compress-Archive -Path $inner -DestinationPath $zip -Force
  # 임시 스테이징 정리(잠금 등으로 실패해도 zip 은 이미 완성이므로 무시)
  try { Remove-Item $stage -Recurse -Force -ErrorAction Stop } catch { }
  Write-Host "[PKG] release\MDeautify-release.zip 생성 (MDeautify.exe + guides\ md 2 + pdf 2)" -ForegroundColor Green
}

Write-Host ""
Write-Host "완료. release\ 내용:" -ForegroundColor Green
Get-ChildItem $release | Format-Table Name, @{N="Size(KB)";E={[math]::Round($_.Length/1KB)}} -AutoSize
