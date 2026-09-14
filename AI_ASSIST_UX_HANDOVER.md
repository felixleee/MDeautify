# AI 도우미 · 레이아웃 UX 이식 핸드오버 #3 — MDeautify → MDocify(docx) / MDhwpxify(hwpx)

핸드오버 **#1(`WINDOW_STATE_UX_HANDOVER.md`, 2026-09-08, 창 상태 UX)**,
**#2(`EDITING_UX_HANDOVER.md`, 2026-09-10, 편집 경험)** 에 이어
그 이후 MDeautify에 들어간 **AI 작성 도우미 + 레이아웃/툴바 계열** 변경을 자매 앱에 이식하기 위한 문서.

작성 2026-09-14. 대상 버전: MDeautify **v1.8.1** (핸드오버 #2는 v1.6.0 시점).
세 앱 모두 Neutralino 단일 exe, `build.ps1 -Exe`로 빌드.

---

## 1. 이번 핸드오버가 다루는 델타 (v1.6.0 → v1.8.1)

| # | 기능 | 최초 버전 | 자매앱 적용성 | 공수 |
|---|---|---|---|---|
| A1 | CRLF 편집기 정렬 수정 | v1.7.0 | ❌ **해당 없음 — 두 앱은 구조적으로 이 버그가 안 생김**(3절) | — |
| A2 | 편집기/미리보기 폭 재계산(사이드 패널 제외 기준) | v1.8.1 | ✅ 높음 — 두 앱 모두 동일 구조·동일 증상 | 낮음 |
| A3 | 툴바 버튼 아이콘화 + 호버 시 라벨 슬라이드 | v1.8.1 | ⭕ 선택(툴바 혼잡할 때) | 매우 낮음 |
| B1 | **AI 작성 도우미 본체**(채팅 패널 + 로컬 `claude` CLI 백엔드) | v1.7.0 | △ UX·정책 결정 필요 | **높음** |
| B2 | 사용량 바 · 한도 팝오버 · Effort 선택 · 문서 첨부 칩 | v1.8.0 | △ B1 이식 시 동반 | 중간 |
| B3 | CLI 감지 · 원클릭 설치 · 로그인 안내 슬라이드 | v1.7.0 / v1.8.0 | △ B1 이식 시 필수 | 중간 |
| C1 | 시작 화면 `새 문서` 버튼 | v1.8.0 | ⭕ 선택 | 낮음 |
| C2 | 릴리스 노트 전체 보기 | v1.7.0 | ⭕ 선택 | 낮음 |

> **권장 순서**: **A2(레이아웃 버그 — 실측으로 자매앱에 재현 확인)** → 필요 시 A3/C → B는 별도 의사결정 후.
> A1은 **이식 대상이 아니라 회귀 방지용 주의사항**으로 읽을 것(3절 A1).

---

## 2. 대상 앱 현재 상태 (2026-09-14 실측)

| 항목 | MDeautify(원본) | MDocify | MDhwpxify |
|---|---|---|---|
| 버전 | v1.8.1 | v1.0.0 | v1.0.9 |
| 앱 디렉터리 | `MDeautify-app` | `MDocify-app` | `md2hwpx-app` |
| 편집 패널 id | `#editor` (section) | `#editorPane` | `#editorPane` |
| 편집 textarea id | `#rawInput` | `#editor` | `#editor` |
| 색상 미러 id | `#raw` | `#raw` | `#raw` |
| 미리보기 id | `#viewer` | `#previewWrap` | `#previewWrap` |
| 분할 기본값 | 50% (v1.8.1에서 수정) | **42%** | **42%** |
| 폴더 탐색기 | 있음 | 있음(`explorer.js`) | **없음** |
| 탭 | 있음 | 있음(`tabs.js`) | 있음(`tabs.js`) |
| `js/ai/` | 있음 | **없음** | **없음** |
| CRLF 정규화 | 있음(`hlMd` 진입부) | 없음(**불필요** — 아래 미러 구조) | 없음(**불필요** — 아래 미러 구조) |
| 색상 미러 입력원 | **원본 문자열**(`hlMd(text)`) ← 버그 원인 | `hlMd(ta.value)` (`syncMirror`) | `hlMd(ta.value)` (`syncMirror`) |
| nativeAllowList | `app os window filesystem debug.log` | `app os window filesystem events debug.log` | `app os window filesystem debug.log` |

> ⚠️ **id 주의**: MDeautify의 `#editor`는 **패널(section)**, 자매앱의 `#editor`는 **textarea**다.
> 아래 코드를 그대로 붙여넣으면 안 되고 반드시 6절 치환표대로 바꿔야 한다.

---

## 3. A. 편집기·레이아웃 (저비용)

### A1. CRLF 편집기 정렬 수정 (v1.7.0) — ⚠️ 자매앱은 **이식 대상 아님**

**결론 먼저**: 실측 결과 MDocify·MDhwpxify에는 이 버그가 **없다**. 미러를 먹이는 구조가 다르기 때문이다.
이 절은 이식 항목이 아니라 **회귀 방지용 주의사항**으로 남긴다.

**증상**: CRLF 줄바꿈인 .md 파일을 열면 색상 미러(`#raw`)의 줄 수가 textarea보다 많아져,
아래로 내려갈수록 **커서 위치와 색상 하이라이트가 점점 어긋난다**. 선택 영역도 밀린다.

**원인**: `<textarea>`는 값을 읽을 때 줄바꿈을 **LF로 정규화**하지만,
미러는 원본 문자열을 그대로 innerHTML에 넣어 CR이 살아남는다. 두 레이아웃의 줄 높이가 어긋난다.

**수정** — `hlMd()` 진입부 1줄 + 편집기 진입 텍스트 1줄:

```js
/* MDeautify js/app.js:3 */
function hlMd(t){
  t = String(t == null ? "" : t).replace(/\r\n?/g, "\n");   /* CRLF/CR → LF */
  var e = esc(t);
  /* ... */
}

/* 편집기에 텍스트를 넣는 경로(파일 열기·탭 복원 등) */
if (text != null) text = String(text).replace(/\r\n?/g, "\n");
```

**왜 자매앱에는 이 버그가 없나** (2026-09-14 실측):
두 앱은 `hlMd` 호출 지점이 **`syncMirror()` 한 곳뿐**이고, 거기서 `hlMd(ta.value)` — 즉
**textarea가 이미 LF로 정규화해 돌려준 값**을 읽는다. 원본 문자열이 미러로 직접 가는 경로가 없다.

```js
/* MDocify-app/resources/js/app.js:29 · md2hwpx-app/resources/js/app.js:35 — 동일 */
function syncMirror(){var r=$("raw"),ta=$("editor");if(r&&ta){r.innerHTML=hlMd(ta.value);}}
```

두 앱의 `hlMd`(각각 app.js:15, app.js:21)에 정규화가 없는 것은 맞지만, **넣을 필요가 없다.**

> ⚠️ **언제 생기나**: 미러를 `hlMd(원본문자열)`로 직접 먹이도록 바꾸는 순간
> (= MDeautify가 택한 구조) 바로 재현된다. 그렇게 바꿀 일이 있으면 위 2줄을 **반드시 함께** 넣을 것.
> 재현·검증법: CRLF로 저장한 긴 md(100줄 이상)를 열어 아래쪽 줄 클릭 → 커서와 글자가 맞는지.

### A2. 편집기/미리보기 폭 재계산 (v1.8.1)

**증상**: 편집 패널 폭이 `flex:0 0 42%`, 즉 **`#main` 전체 폭 기준**이라
폴더 탐색기(또는 AI 패널)를 열면 줄어드는 폭을 **미리보기가 혼자 떠안는다**. 화면이 한쪽으로 쏠린다.
MDocify는 탐색기가 있어 지금도 재현되고, MDhwpxify는 사이드 패널을 추가하는 순간 같은 문제가 생긴다.

**해결 규칙**: 분할 기준을 전체 폭이 아니라 **사이드 패널을 뺀 구간**으로 바꾸고,
그 구간을 **비율(기본 0.5)** 로 나눈다. 비율은 스플리터를 끌면 갱신되고, 패널을 여닫아도 유지된다.

```js
/* 스플리터 IIFE 안. editor=편집 패널, viewer=미리보기, sp=스플리터, main=#main */
var ratio = .5, lastBasis = "50%";

/* 가용폭 = main 내부폭 − (편집/미리보기가 아닌 모든 형제 폭)
   → 탐색기·AI 패널·각 리사이저·스플리터가 자동으로 빠진다.
   ⚠️ editor/viewer의 현재 rect로 계산하면 안 된다. 레이아웃이 이미 찌그러진 상태를
      기준으로 재게 되어 값이 어긋난다(실제로 겪은 함정). */
function avail() {
  var t = main.clientWidth, cs = main.children;
  for (var i = 0; i < cs.length; i++) {
    var c = cs[i];
    if (c === editor || c === viewer) continue;
    t -= c.getBoundingClientRect().width;
  }
  return t;
}

function relayout() {
  if (!viewer || dragging || document.body.classList.contains("editor-collapsed")) return;
  if (!editor.offsetWidth && !viewer.offsetWidth) return;          /* 아직 안 보이면 통과 */
  var a = avail(); if (!(a > 0)) return;
  var maxW = a - 260; if (maxW < 180) maxW = 180;                  /* 미리보기 최소 260 보장 */
  var w = Math.max(180, Math.min(maxW, Math.round(a * ratio)));
  if (Math.abs(editor.getBoundingClientRect().width - w) < .5) return;   /* 변화 없으면 no-op */
  editor.style.flex = "0 0 " + w + "px"; lastBasis = w + "px";
}

window.__relayoutPanes = relayout;
window.addEventListener("resize", relayout);

/* 스플리터 드래그 중 비율 갱신 — editor.style.flex 를 설정한 직후 */
var av = avail(); if (av > 0) ratio = w / av;
```

그리고 **CSS 기본값도 50%로** 바꾼다 (`#editorPane{flex:0 0 42%}` → `50%`).

**호출 지점** — 폭이 변하는 모든 순간에 `window.__relayoutPanes()`를 부른다:

| 지점 | 파일 |
|---|---|
| 탐색기 열기/닫기(`setOpen`) · 리사이저 드래그 | `explorer.js` |
| AI 패널 열기/닫기 · 리사이저 드래그·더블클릭 | `ai/ai-chat.js` (B 이식 시) |
| 문서 렌더 · 탭 복원 (`body.classList.add("loaded")` 직후) | `app.js`, `tabs.js` |
| 창 크기 변경 | 위 `resize` 리스너 |

> ⚠️ **ResizeObserver로 자동화하려다 실패했다.** 패널을 `hidden`(= `display:none`)으로
> 여닫는 구조에서는 **RO가 발화하지 않는다**(실측). 명시적 호출이 유일하게 확실한 방법이다.

> ⚠️ **자매앱 스플리터 드래그에 별도 버그가 있다.** 두 앱 모두
> `var w = e.clientX - r.left` 처럼 **`#main`의 왼쪽**을 기준으로 계산한다.
> 탐색기가 열려 있으면 탐색기 폭만큼 어긋난다(MDocify 해당).
> MDeautify는 `e.clientX - er.left`(편집 패널의 실제 왼쪽) 기준으로 고쳐져 있다. 같이 고칠 것.

### A3. 툴바 버튼 아이콘화 + 호버 라벨 슬라이드 (v1.8.1)

툴바가 붐빌 때 쓰는 VS Code식 패턴. 평소 아이콘만, 호버·포커스 시 라벨이 옆으로 펼쳐진다.
**라벨을 DOM에서 지우지 않고 폭만 접기** 때문에 스크린리더 접근성이 유지된다.

```html
<button id='btnAI' title='AI 작성 도우미 (Ctrl+Shift+A)'>
  <svg width='15' height='15' ...>...</svg><span class='ai-lbl'>AI 도우미</span>
</button>
```

```css
#bar button#btnAI{display:inline-flex;align-items:center;gap:0;white-space:nowrap;height:35px;padding:0 10px;overflow:hidden;}
#bar button#btnAI svg{display:block;flex:0 0 auto;}
#bar button#btnAI .ai-lbl{display:inline-block;max-width:0;margin-left:0;opacity:0;overflow:hidden;
  transition:max-width .2s ease,margin-left .2s ease,opacity .16s ease;}
#bar button#btnAI:hover .ai-lbl,#bar button#btnAI:focus-visible .ai-lbl{max-width:4.4em;margin-left:6px;opacity:1;}
@media (prefers-reduced-motion:reduce){#bar button#btnAI .ai-lbl{transition:none;}}
```

> **`max-width`는 라벨 실폭에 맞춰 조일 것.** 라벨이 52px인데 `7em`(91px)으로 두면
> 애니메이션이 60% 지점에서 이미 끝나 **뚝 끊기는 느낌**이 난다. `label.scrollWidth`를 재서 맞춘다.
> 버튼 오른쪽에 `flex:1`인 spacer가 있어야 펼쳐질 때 옆 버튼이 밀리지 않는다.

---

## 4. B. AI 작성 도우미 — 큰 이식 (의사결정 먼저)

### B1. 무엇을 복사하나

| 파일 | 규모 | 역할 |
|---|---|---|
| `js/ai/ai-chat.js` | 388줄 | 패널 UI·대화 상태·스트리밍 렌더·사용량 바·Effort·첨부 칩 |
| `js/ai/ai-providers/cli.js` | 209줄 | 백엔드 어댑터(로컬 `claude` CLI 실행·stream-json 파싱·감지/설치/로그인) |
| `index.html` AI 패널 마크업 | 약 64줄 | `#aiPanel` / `#aiResizer` + 툴바 버튼 |
| `css/style.css` AI 구역 | 약 142줄 | 패널·말풍선·사용량 바·팝오버 |
| `assets/claude/*.png` | 6장 | 로그인 안내 슬라이드 캡처 |

**구현 원리는 이 문서에서 반복하지 않는다.** 같은 저장소의 **`AI_INTEGRATION.md`** 에 전부 있다:
어댑터 계약(4절), 요청 한 번의 생애(5절), 감지·설치·로그인(6절), 사용량·한도(7절), 안전장치(8절).
이식할 때는 그 문서를 옆에 켜 두고 작업하면 된다.

### B2. 선행 조건 — 실측 결과 **설정 변경 불필요**

`cli.js`가 쓰는 네이티브 API는 `os.execCommand` / `os.spawnProcess` / `os.updateSpawnedProcess` /
`os.getEnv` / `filesystem.*` / `events.on|off` 이다.
**두 자매 앱 모두 `nativeAllowList`에 `os.*`와 `filesystem.*`이 이미 있다** → 그대로 동작한다.
(`events.*`는 클라이언트 측 등록이라 allowList와 무관. MDocify에만 들어 있는 건 무해한 잔재.)

### B3. 앱별로 반드시 바꿔야 하는 것

- **시스템 프롬프트**: MDeautify는 "마크다운 → PDF" 문맥이다.
  MDocify는 **docx**, MDhwpxify는 **hwpx** 산출물이라는 점을 프롬프트에 반영해야
  모델이 엉뚱한 조판 조언을 하지 않는다. (`AI_INTEGRATION.md` 5-2절)
- **프롬프트에 딸려 가는 문서 컨텍스트**: 첨부 칩이 가리키는 대상이 각 앱의 현재 문서여야 한다.
- **localStorage 키**: `md2pdf_ai_*` → `mdocify_ai_*` / `mdhwpxify_ai_*` (6절 치환표).
- **패널 폭 저장키·기본값**: `md2pdf_ai_w`(기본 340px) 동일 규약으로.
- **`order` 지정**: 문서가 없을 때 드롭존이 AI 패널 왼쪽에 끼는 버그가 있었다(커밋 `3ba6de3`).
  `#aiResizer`/`#aiPanel`에 `order:1`을 줘서 항상 우측 고정으로 해결했다. 같이 가져갈 것.

### B4. 알아둘 제약

- **exe 전용**. 브라우저 미리보기에서는 `Neutralino.os.*`가 없어 동작하지 않는다.
  → AI 관련 검증은 **반드시 빌드된 exe에서** 한다.
- 사용자의 **로컬 `claude` CLI 로그인을 재사용**한다. API 키를 앱이 보관하지 않는다.
- 사용자 환경의 훅·설정이 출력에 섞이지 않도록 **강한 system prompt로 차단**한다(`AI_INTEGRATION.md` 8절).
- exe에 서명이 없어 백신 오탐 가능성은 그대로다(`mdeautify-release-autoupdate` 참조).

---

## 5. C. 소소한 것 (선택)

- **C1. 시작 화면 `새 문서` 버튼**(v1.8.0): 파일을 열지 않고 빈 문서로 시작. 드롭존 안 버튼 1개 + 핸들러.
- **C2. 릴리스 노트 전체 보기**(v1.7.0): 업데이트 안내에서 노트를 접지 않고 전부 보여준다.

---

## 6. 공통 치환값 (핸드오버 #1·#2 규약 + 이번 추가분)

| 항목 | MDeautify(원본) | 자매앱 |
|---|---|---|
| 편집 **패널** id | `#editor` | **`#editorPane`** ⚠️ |
| 편집 **textarea** id | `#rawInput` | **`#editor`** ⚠️ |
| 색상 미러 id | `#raw` | `#raw` (동일) |
| 미리보기 id | `#viewer` | **`#previewWrap`** |
| localStorage prefix | `md2pdf_` | `mdocify_` / `mdhwpxify_` |
| 설정 이벤트 | `md2pdf:settings-*` | `mdocify:settings-*` |
| %APPDATA% dir | `MDeautify` | `MDocify` / `MDhwpxify` |

`#editor`가 두 앱에서 **서로 다른 것을 가리킨다**는 점이 이번 이식 최대의 함정이다.
A2 코드를 붙일 때 `editor` 변수에는 **`#editorPane`** 을, `viewer`에는 **`#previewWrap`** 을 넣어야 한다.

---

## 7. 검증

- **A1(CRLF)**: 자매앱은 **검증 대상 아님**(구조상 미발생). 단 미러 입력원을 `ta.value`에서 바꿨다면
  CRLF로 저장한 100줄 이상 md로 커서·하이라이트 일치, 드래그 선택 범위 일치를 확인할 것.
- **A2(폭)**: 탐색기(및 AI 패널) 여닫으며 편집/미리보기 폭 측정 → **두 값이 같아야** 한다.
  스플리터로 비율을 바꾼 뒤 여닫아도 **그 비율이 유지**되는지. 창 크기 변경 시 따라오는지.
  좁은 창에서는 미리보기 최소폭 260 보장이 먼저 걸려 반반이 아닐 수 있다(정상).
- **A3(호버)**: 마우스 호버와 **Tab 포커스** 양쪽에서 펼쳐지는지, 라벨이 잘리지 않는지
  (`label.scrollWidth === label.clientWidth`), 옆 버튼이 밀리지 않는지.
- **B(AI)**: **exe에서만** 검증 가능. CLI 미설치 상태·미로그인 상태·정상 상태 3가지를 각각 확인.
- 브라우저 pane 검증 시 주의: 패널이 숨겨져 있으면 **렌더링이 스로틀되어
  `getComputedStyle`·전환 중간값이 갱신되지 않는다**. 측정값이 이상하면 스크린샷으로 교차 확인할 것.

---

## 8. 빌드 / 릴리스

- 소스 수정 후 **항상 `build.ps1 -Exe`** 재빌드(sha256 자동 생성). (memory `mdeautify-rebuild-every-change`)
- **앱이 실행 중이면 빌드가 `EBUSY`/`Copy-Item` 오류로 실패한다.** 먼저 종료할 것.
  빌드 말미의 `ERRR EBUSY ... resources.neu`는 임시파일 정리 단계 경고로, 결과물 자체는 온전한 경우가 많다.
  의심되면 exe 안의 문자열을 직접 확인하는 게 가장 확실하다(`grep -a "<바뀐 문자열>" release/앱.exe`).
- 릴리스: `git credential fill`로 토큰 → GitHub REST API.
  자산 업로드는 `https://uploads.github.com/repos/.../releases/{id}/assets?name=...` 를 직접 쓴다
  (`upload_url` 정규식 치환은 hostname 파싱 오류). MDeautify 리모트명은 **`upstream`**.
- MDeautify 릴리스 자산은 **`exe` + `exe.sha256` 두 개**다(zip 미배포).

---

## 9. 참고 문서 · 메모리

- 같은 저장소: **`AI_INTEGRATION.md`**(AI 구현 상세) · `AI_ASSIST_DESIGN.md`(설계 초안)
- 핸드오버: `WINDOW_STATE_UX_HANDOVER.md`(#1) · `EDITING_UX_HANDOVER.md`(#2)
- 메모리: `mdeautify-ai-assistant` · `mdeautify-crlf-editor-sync` · `mdeautify-release-autoupdate` ·
  `mdeautify-tool-overview` · `mdocify-tool-overview` · `mdocify-editing-ux-ported` ·
  `md2hwpx-tool-overview` · `mdhwpxify-release-status` · `window-state-ux-handover`

---

## 10. 실제 이식 기록 — MDocify (2026-09-14 완료)

A2 + A3 + B 전부 이식하고 exe 빌드까지 확인. **실측 결과와 그때 걸린 것들**을 남긴다.

### 결과

| 검증 | 값 |
|---|---|
| 기본 분할 | 편집 637 / 미리보기 637 (반반) |
| 탐색기 열림 | 528 / 527 (탐색기 214 제외) |
| AI 패널 열림 | 465 / 464 (AI 340 제외) |
| 스플리터 드래그 | 커서 위치와 **오차 0px** (기존 탐색기 오프셋 버그 해소) |
| 비율 유지 | 0.46으로 끌어둔 뒤 패널 여닫아도 0.46 유지 |
| AI 버튼 | 37px ↔ 95px, 라벨 잘림 없음 |

### 걸린 것 5가지

1. **파일이 CRLF다.** MDocify `app.js`·`explorer.js`는 CRLF라 `\n` 기준 멀티라인 앵커가 **전부 빗나간다**.
   치환 스크립트는 파일의 EOL을 먼저 감지해 앵커·삽입문을 맞출 것.
   (한 줄짜리 앵커만 우연히 통과해서 **부분 적용된 채 실패**할 수 있으니 순서 주의.)

2. **CSS 변수는 다시 쓰지 말고 별칭으로 연결한다.** 이식한 AI CSS는 `--ui-brand-accent`,
   `--ui-editor-bg/-border/-fg`, `--ui-drop-fg`를 쓰는데 MDocify엔 이 이름이 없다.
   130줄을 고치는 대신 `body{}`에 **별칭 5줄**만 넣으면 끝이고, 대상 토큰이 `body.dark`에서
   재정의되므로 **다크 모드도 자동으로 따라온다**. `--tm-*`·`--st-bad`·`--sb-*`는 이름이 이미 같다.
   ```css
   body{
     --ui-brand-accent:var(--accent);   --ui-editor-bg:var(--ed-bg);
     --ui-editor-border:var(--ed-border); --ui-editor-fg:var(--ed-fg);
     --ui-drop-fg:var(--drop-fg);
   }
   ```
   덕분에 AI 패널이 MDeautify 보라가 아니라 **MDocify 파랑으로 자동 적용**된다.

3. **`avail()`에 오버레이 제외 가드가 필요하다.** MDocify는 `#drop`(드롭존)이 `#main`의
   **직계 자식**이면서 `position:absolute;inset:0`이다. 문서가 없을 때 이게 폭을 가진 것으로 잡히면
   계산이 틀어진다. 자식 순회에서 `position`이 `absolute`/`fixed`면 건너뛸 것.
   (MDeautify도 같은 구조지만 `body.loaded` 가드에 가려 드러나지 않았다.)

4. **부팅 스플래시가 브라우저 검증을 막는다.** 스플래시 해제는 Neutralino 네이티브 호출로 일어나서
   브라우저에서는 `#bootSplash`가 계속 덮고 `#main` 폭이 0으로 나온다.
   검증 전에 `document.getElementById('bootSplash').remove()` + `body.classList.add('loaded')`.

5. **Browser pane은 숨겨져 있으면 레이아웃이 0으로 읽힌다.** 측정값이 전부 0이면 코드 문제가 아니라
   렌더 스로틀일 수 있다. **스크린샷을 한 번 찍어 페인트를 깨운 뒤 다시 측정**하면 정상값이 나온다.

### 치환 목록 (그대로 재사용 가능)

| 대상 | 치환 |
|---|---|
| localStorage 13곳 | `md2pdf_` → `mdocify_` |
| 편집기 textarea 2곳 | `$("rawInput")` → `$("editor")` |
| 설정 이벤트 1곳 | `md2pdf:settings-hydrated` → `mdocify:settings-hydrated` |
| 임시파일 접두어 1곳 | `mdeautify_ai_sys_` → `mdocify_ai_sys_` |
| 시스템 프롬프트 | 산출물이 `.docx`(MDhwpxify는 `.hwpx`)라는 문장 1줄 추가 |
| `loaded` 호출지점 | app.js 4곳 + tabs.js 2곳에 `__relayoutPanes()` |

`window.__toast`·`__mdName`·`__mdPath`·`__img`는 자매앱에 **이미 전부 있다**(실측). 추가 작업 없음.
`nativeAllowList`도 손댈 필요 없었다.
