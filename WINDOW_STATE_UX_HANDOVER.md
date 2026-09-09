# 창 상태 UX 이식 핸드오버 — MDeautify → MDocify(docx) / MDhwpxify(hwpx)

MDeautify(v1.5.1)에서 완성한 **부팅 스플래시 + 창 상태 기억 + 최소 크기 보장** UX 세트를
자매 앱 **MDocify**(md→Word)와 **MDhwpxify**(md→한글)에 이식하기 위한 문서.

작성 2026-09-08. 세 앱 모두 Neutralino 단일 exe, `build.ps1 -Exe`로 빌드.

---

## 1. 이식할 기능 세트 (MDeautify에서 검증 완료)

1. **단일창 부팅 스플래시** — 창을 처음엔 작게(330×450) + 테두리 없이 띄워 스플래시를 보여주고,
   준비되면(최소 2초) **같은 창을 앱 크기로 '변신'**(borderless 해제 → 크기/위치 복원 → 최대화).
   프로세스가 하나라 멀티창 생명주기 레이스가 없음.
2. **창 크기/위치/최대화 기억** — 창모드는 절대좌표(x/y)로, 최대화는 **그 모니터까지** 복원.
3. **닫을 때(X·Alt+F4) 마지막 상태 저장 후 종료** (`exitProcessOnClose:false` + `windowClose` 핸들러).
4. **본 화면 최소 크기 보장(800×500)** — 런타임 네이티브 제약. config min은 스플래시 때문에 작게 둬야 함.
5. **라이트/다크 스플래시 깜빡임 방지 + 최소 2초** — 테마 하이드레이션 완료까지 오버레이로 가림.
6. (부수) 안내를 **모달**로: `window.__appAlert(msg,title)` — MDocify엔 modal.js가 없어 필요 시 함께 이식.

---

## 2. 정본(원본) 위치 — 여기서 복사/참조

| 조각 | 경로 |
|---|---|
| **핵심 로직** | `D:\MDeautify\MDeautify-app\resources\js\settings-store.js` (전체 139줄) |
| 스플래시 마크업 | `resources\index.html` 의 `#bootSplash` 블록(로고 SVG·워드마크·태그·프로그레스 바) |
| 스플래시 CSS | `resources\css\style.css` 의 `.boot-splash` / `.boot-*` / `body.booted` 규칙 |
| config | `MDeautify-app\neutralino.config.json` 의 `modes.window`(스플래시용 값) |
| 모달 | `resources\js\modal.js` (`__appAlert`, `__appConfirm`) |

핵심은 **settings-store.js 하나**. 나머지는 마크업/CSS/설정 어댑팅.

---

## 3. 대상 앱 현재 상태 (출발점이 다름!)

### MDocify (`D:\MDocify\MDocify-app`) — ✅ 이식 완료(2026-09-08)
> 완료: config(window.* 허용 + 스플래시 창), index.html(#bootSplash + neutralino.js + settings-store.js 로드),
> style.css(파랑 boot 팔레트), settings-store.js(localStorage-only 신규). **실측 통과**: 스플래시 330×450→주모니터 최대화,
> 최소크기 800×500 클램프, 창모드 저장/복원. **고정 포트(52103)라 filesystem 없이 localStorage-only**로 감. neutralino.js 로드 추가가 핵심(아래 함정 8).
- (원래 상태) 스플래시 ❌, settings-store.js ❌, modal.js ❌.
- config `modes.window`: width 1280, height 840, **minWidth 900, minHeight 560**, center true,
  **borderless:false, maximize:true, hidden:false, exitProcessOnClose:true**.
- 설정은 `localStorage`에 `mdocify_*` 키로 직접 저장(파일 영속화 없음 → 포트 바뀌면 초기화 위험).
  → 이식 시 settings-store가 **settings.json 파일 영속화까지 덤으로** 해결(원본이 그 기능 포함).
- **전체 이식** 필요.

### MDhwpxify (`D:\MDhwpxify\md2hwpx-app`) — ✅ 이식 완료(사용자, 2026-09-08)
> 사용자가 직접 이식 완료. (검증은 별도 — 위 6절 실측 시나리오 참고)

(원래 상태) 구형 오버레이:
- `#bootSplash` 있음 + settings-store.js **있음(단, 구형)**: `reveal()`이 `body.booted`만 붙임 —
  **인-앱 오버레이 스플래시**(창은 처음부터 일반 최대화 창). morph/winstate/최소크기 **없음**.
- config `modes.window`: width 1280, height 840, minWidth 900, minHeight 560, center true,
  **borderless:false, maximize:true, exitProcessOnClose:true** (일반창).
- prefix `mdocify_`, dir `MDhwpxify`, 이벤트 `mdocify:settings-*`, settings.json 영속화는 이미 있음.
- **settings-store.js를 morph 버전으로 교체** + config를 스플래시 창으로 + 마크업/CSS 정비.

### 공통 치환값
- **prefix = `mdocify_`** (두 앱 다 동일; 원본의 `md2pdf_` → `mdocify_`)
- **이벤트 = `mdocify:settings-hydrated` / `mdocify:settings-ready`** (두 앱 기존 규약)
- **WKEY = `mdocify_winstate`**
- **dir 이름 = `MDocify` / `MDhwpxify`** (각 앱 %APPDATA% 폴더명 유지)

---

## 4. 이식 절차 (공통)

### A. neutralino.config.json — 스플래시 창으로
`modes.window`(또는 `window`)를 다음으로. **아이콘/타이틀은 각 앱 것 유지.**
```
"width": 330, "height": 450,
"minWidth": 300, "minHeight": 200,     // ★ 작게! (단일창이라 min이 스플래시에도 적용됨)
"center": true, "useSavedState": false,
"borderless": true, "maximize": false, "hidden": false,
"exitProcessOnClose": false            // ★ 닫을 때 직접 저장 후 exit
```

### B. 스플래시 마크업/CSS
- index.html에 `#bootSplash` 블록 배치(원본 복사 후 브랜드 교체):
  - MDocify: 태그 "Markdown → Word", 워드마크 `MD`+`ocify`, 로고색 각 앱 것.
  - MDhwpxify: 기존 bootSplash 재활용 OK. 태그 "Markdown → 한글(HWPX)".
  - 스플래시는 **세로형(330×450)** 비율에 맞게(원본은 세로 중앙 정렬).
- style.css의 `.boot-splash`(전체 덮개), `.boot-inner`, `.boot-logo/word/tag/bar`, `body.booted .boot-splash{opacity:0;pointer-events:none}` 복사.
- **라이트/다크**: 배경/글자에 각 앱 `--tm-*` 토큰 사용(테마 확정 전 깜빡임 방지가 목적).

### C. settings-store.js
원본을 복사 후 앱별 치환:
- `PREFIX="md2pdf_"` → `"mdocify_"`
- `WKEY="md2pdf_winstate"` → `"mdocify_winstate"`
- dir: `+"MDeautify"` → `+"MDocify"` / `+"MDhwpxify"`
- 이벤트명 `md2pdf:settings-hydrated`/`md2pdf:settings-ready` → `mdocify:...` (모듈이 듣는 이름과 일치!)
- `APP_W/APP_H`(기본 1280×840), `MINW/MINH`(최소 800×500) — 원하면 앱별 조정.
- index.html에서 `<script src="js/settings-store.js"></script>` 로드(다른 모듈보다 먼저 두는 게 안전; 원본 순서 참고).
- **MDhwpxify**: 기존 구형 settings-store.js를 이 파일로 **덮어쓰기**(prefix/dir/이벤트는 이미 mdocify_/MDhwpxify라 morph 로직만 추가되는 셈).
- **MDocify**: modal.js도 함께 넣고(안내 모달 쓸 경우), settings-store 로드 추가.

### D. app.js 연동 확인
- `Neutralino.init()` 멱등(양쪽 호출 OK).
- 테마/폰트 등 모듈이 `mdocify:settings-hydrated`/`-ready`에 재적용하는지 확인
  (MDocify는 현재 localStorage 직접 읽기라, 하이드레이션 후 재적용 훅이 없으면 스플래시 뒤 값이 안 붙을 수 있음 → 재적용 코드 추가 필요할 수 있음).
- `exitProcessOnClose:false`로 바꿨으니 app.js에 별도 close 처리 중복 없나 확인
  (저장+exit는 settings-store의 `windowClose` 핸들러가 담당).

---

## 5. 함정 (반드시 지킬 것)

1. **config min은 작게(300×200)** — 단일창이라 config min이 스플래시에도 적용됨.
   앱 최소크기는 **런타임** `window.setSize({minWidth,minHeight})`로. (실측: 네이티브 제약이라 프로그램적 SetWindowPos 축소도 클램프됨)
2. **최대화 경로 순서 = move→setSize(min)→maximize.** `center()`를 끼우지 말 것 —
   `setBorderless→setSize→center→maximize` 연속은 창을 최소화(-32000)시킴(실측).
3. **최대화 모니터 기억** — saveWin 최대화 분기에서 `getPosition`→`o.mx/o.my` 저장, morph에서 `move(mx,my)` 후 `maximize`.
   안 하면 항상 스플래시 있던 **주 모니터**에서 최대화됨(다른 모니터 무시).
4. **스플래시는 주 모니터 중앙 고정**(config center). 멀티모니터 추종은 보류 — 방법은 memory `mdeautify-multimonitor-splash-idea` 참고.
5. **변신 후에만 저장** — saveWin/doSave는 `morphed===true`일 때만. 스플래시 330×450이 winstate로 저장되면 안 됨.
6. **브라우저 모드 폴백** — `NL_PORT` 없으면 파일저장 스킵, 스플래시만 즉시 제거(동기 적용이라 깜빡임 없음).
7. **닫을 때 800ms 강제 종료 타이머** — 저장이 막혀도 종료 보장.
8. **★ neutralino.js(client lib) 로드 필수** — settings-store는 `Neutralino.window.*`를 씀. index.html에서 **settings-store.js보다 먼저** `<script src="js/neutralino.js"></script>`를 로드해야 함. 안 그러면 `Neutralino` 미정의 → settings-store의 `isExe`가 false → **morph가 통째로 스킵되고 스플래시 창(330×450)에 그대로 멈춤**(권한 문제처럼 보이지만 실은 이것). MDocify는 원래 순수 웹앱(저장=브라우저 다운로드)이라 neutralino.js를 아예 안 불렀었음 → 이식 때 추가함. **MDhwpxify는 이미 filesystem을 써서 로드 중일 가능성 높지만 반드시 확인.** (실측: MDocify 첫 빌드에서 이 누락으로 변신이 30초+ 안 일어남)

---

## 6. 검증 (화면캡처 대신 실측)

백신이 `CopyFromScreen` 화면캡처를 malicious로 차단함 → **P/Invoke로 창 지오메트리 측정**.
- `GetWindowRect`(크기/위치), `GetWindowLong(h,-16)`의 `WS_MINIMIZE 0x20000000` 비트(최소화 여부).
- 시나리오:
  1. 기본 실행 → 주 모니터 **최대화**(min=False), procs=1
  2. 창모드로 줄여 닫고 재실행 → **그 크기/위치 복원**
  3. **다른 모니터에서 최대화** 닫고 재실행 → **그 모니터에서 최대화**(음수 x대 등)
  4. 모서리로 최소크기 아래 축소 시도 → **800×500에서 클램프**
- `%APPDATA%\<앱>\settings.json`의 `<prefix>winstate`를 직접 심어 시나리오 강제 가능:
  예) `{"max":true,"w":1000,"h":700,"x":-3000,"y":200,"mx":-3840,"my":0}` → 3번 모니터 최대화 복원.
- PowerShell 측정 스니펫은 MDeautify 작업 이력(이 세션) 참고: `Add-Type`으로 `GetWindowRect/GetWindowLong` 선언 후
  `MainWindowHandle`로 rect 측정.

---

## 7. 빌드 / 릴리스 (각 앱)

- 소스 수정 후 **항상 `build.ps1 -Exe` 재빌드**(sha256 생성). (memory `mdeautify-rebuild-every-change`)
- 릴리스는 **in-place 자산 교체**: `git credential fill`로 토큰 → GitHub API로 기존 exe/sha256 delete + 재업로드.
  - ⚠️ `Remove-Item`을 업로드와 **같은 PowerShell 명령에 넣지 말 것** — `D:\` 보호 정적분석에 명령 전체가 막힘. 정리는 분리 실행.
  - 검증: 릴리스 URL에서 다시 받아 sha256이 로컬과 일치하는지 확인.
- 각 앱 릴리스 상태/방법: MDocify=memory `mdocify-tool-overview`, MDhwpxify=`md2hwpx-tool-overview`·`mdhwpxify-release-status`.

---

## 8. 참고 메모리
`mdeautify-pending-release-notes`(원본 최종 상태·sha 이력) · `mdeautify-tool-overview` ·
`mdocify-tool-overview` · `md2hwpx-tool-overview` · `mdeautify-multimonitor-splash-idea` ·
`mdeautify-exe-settings-persistence`(settings.json 영속화 배경) · `mdeautify-rebuild-every-change`.
