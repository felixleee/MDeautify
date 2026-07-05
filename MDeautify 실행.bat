@echo off
rem === MDeautify 앱 모드 런처 (오프라인, 주소창 없는 독립 창) ===
rem 이 bat 파일과 MDeautify_Season3.html 을 같은 폴더에 함께 두세요.
setlocal
set "HTML=%~dp0MDeautify_Season3.html"
if not exist "%HTML%" (
  echo [오류] 같은 폴더에서 MDeautify_Season3.html 을 찾을 수 없습니다.
  echo 이 bat 파일과 HTML 을 같은 폴더에 두었는지 확인하세요.
  pause
  exit /b 1
)
set "URL=file:///%HTML:\=/%"
rem Edge 우선, 없으면 Chrome 로 앱 모드 실행
start "" msedge --app="%URL%" 2>nul || start "" chrome --app="%URL%"
