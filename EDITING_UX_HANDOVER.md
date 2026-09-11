# 편집 경험 UX 이식 핸드오버 #2 — MDeautify → MDocify(docx) / MDhwpxify(hwpx)

지난 핸드오버 **#1(`WINDOW_STATE_UX_HANDOVER.md`, 2026-09-08, 창 상태 UX 세트)** 이후
MDeautify에 추가된 **편집 경험 계열** 기능들을 자매 앱에 이식하기 위한 문서.

작성 2026-09-10. 대상 버전: MDeautify **v1.6.0**(핸드오버 #1은 v1.5.1 시점).
세 앱 모두 Neutralino 단일 exe, `build.ps1 -Exe`로 빌드.

---

## 0. ⚠️ 먼저 — 메모 정정 (중요)

기존 메모(`mdeautify-pending-release-notes`)에 "MDocify·MDhwpxify는 **Paged.js 미사용**이라 조판 버그와 무관"이라고 적혀 있으나 **부정확함**.
실측(2026-09-10): 두 자매 앱 `app.js` 모두 **미리보기에 `PagedModule.Previewer`를 사용**한다(최종 출력만 docx/hwpx로 분기).
→ 따라서 아래 **A(조판 품질 수정)** 은 자매 앱 **미리보기에도 그대로 유효**하며, 이식 가치가 가장 높다.

---

## 1. 이번 핸드오버가 다루는 델타 (핸드오버 #1 이후)

| # | 기능 | 최초 버전 | 자매앱 적용성 | 공수 |
|---|---|---|---|---|
| A1 | 긴 코드블록 페이지 경계 잘림 수정 | v1.5.2 | ✅ 높음(미리보기 공유) | 낮음 |
| A2 | 조판 경쟁 가드 + 오버플로 자동 재조판 | v1.6.0 | ✅ 높음(미리보기 공유) | 낮음 |
| B1 | 인-앱 모달 3지선다(`__confirmSave3`/open3) | v1.5.3 | ⭕ 저장흐름 이식 시 필요 | 낮음 |
| B2 | 변경감지(dirty) 인프라 | v1.3.1+v1.5.3 | ⭕ 데이터 유실 방지 | 낮음 |
| B3 | 문서 전환 저장 가드(`__confirmReplaceDoc`) | v1.5.3 | ⭕ 드롭/파일열기 유실 방지 | 낮음 |
| B4 | 자동 저장(`__autoSaveMd`) | v1.3.1 | ⭕ 경로 연결 시 | 낮음 |
| C1 | 탭(멀티문서) `tabs.js` | v1.6.0 | △ UX 결정 필요(컨버터라) | **높음** |
| C2 | Ctrl+W 문서 닫기 | v1.6.0 | △ 탭 이식 시 동반 | 낮음 |
| D1 | 폴더 탐색기 사이드바 + 실시간 파일 감시 `explorer.js` | v1.5.0 | △ UX 결정 필요 | **높음** |
| E1 | 이미지 첨부 팝오버 | v1.6.0 | ⭕ 선택 | 낮음 |
| E2 | 안내 토스트 위치(📎 배지 옆) | v1.6.0 | ⭕ 선택 | 낮음 |
| E3 | 찾기/바꾸기 `find.js` | v1.3.1 | ⭕ 선택(미이식) | 중간 |

> **권장 순서**: **A(즉시·저비용·고가치)** → **B(유실 방지 위생)** → 그 다음 필요 시 C/D/E.
> A1·A2는 v1.5.2 이전 기준으로도 자매앱에 없을 가능성이 높아 **우선 이식** 권장.

---

## 2. 대상 앱 현재 상태 (2026-09-10 실측)

두 앱 모두 **린(lean) 컨버터** — MDeautify의 풀 에디터 생태계 모듈이 대부분 없음.

| 모듈 | MDeautify | MDocify | MDhwpxify |
|---|---|---|---|
| 에디터+미러+미리보기 | ✅ `#rawInput`/`#raw` | ✅ `#editor` | ✅ `#editor` |
| Paged.js 미리보기 | ✅ | ✅ | ✅ |
| 드롭 열기 + 이미지 풀(`__drop`) | ✅ | ✅ | ✅ |
| `modal.js`(모달) | ✅ | ❌ | ❌ |
| dirty/자동저장 인프라 | ✅ | ❌ | ❌ |
| `tabs.js`(탭) | ✅ | ❌ | ❌ |
| `explorer.js`(탐색기) | ✅ | ❌ | ❌ |
| `find.js`(찾기) | ✅ | ❌ | ❌ |
| 창상태 UX(핸드오버 #1) | ✅ | ✅ 이식됨 | ✅ 이식됨 |

**핵심 id 차이(반드시 치환):** 에디터 textarea = MDeautify **`#rawInput`** ↔ 자매앱 **`#editor`**.
**공유 전역:** 자매앱은 이미 `window.__render`, `window.__setEditorText`, `window.__drop`, `window.__fname` 보유.
**미보유 전역(이식 시 추가):** `__markClean/__isDirty/__getSaved/__setSaved`, `__autoSaveMd`, `__confirmSave3`, `__confirmReplaceDoc`, `__openMdPath`, `__tabsOnEdit`, `__openDoc`.

---

## 3. A. 미리보기 조판 품질 (최우선 · 저비용 · 자매앱 미리보기에 직접 유효)

### A1. 긴 코드블록 페이지 경계 잘림 수정 (v1.5.2)
**증상:** 구문 강조(인라인 span)가 든 코드블록이 한 페이지 높이를 넘으면 Paged.js가 통짜로 보고
페이지 경계에서 못 쪼개 **잘림**(실측 750px/~40줄 손실).

**정본:** `MDeautify-app\resources\js\app.js:201` (renderMarkdown 내)
```js
src.querySelectorAll(".content pre > code").forEach(function(c){
  var h=c.innerHTML.replace(/\n$/,"");
  c.innerHTML=h.split("\n").map(function(ln){
    return "<span class='cl'>"+(ln===""?"​":ln)+"</span>";   // 빈 줄=제로폭공백
  }).join("");
});
```
+ CSS: `.content pre .cl{display:block}` (style.css) — 줄 단위 블록으로 만들어 Paged.js에 분할 지점 제공.
+ `pre`의 `break-inside`는 **avoid가 아니라 auto** 여야 함(PAGED_CSS + 미리보기 경로 CSS 둘 다). auto라 짧은 블록은 안 쪼개짐.

**이식:** 자매앱 renderMarkdown/하이라이트 직후 동일 래핑 추가 + CSS 2줄. `.content pre` 선택자만 자매앱 마크업에 맞게 확인.
⚠️ `break-inside:auto`만으론 부족 — **줄 단위 `.cl` 래핑이 핵심**.

### A2. 조판 경쟁 가드 + 오버플로 자동 재조판 (v1.6.0)
**증상:** 탭 전환/연속 편집으로 이전 Paged.js 조판이 끝나기 전 새 조판이 겹쳐, 내용이 한 단을 넘어
**다단 오버플로**("간격 과하게 넓음/뷰어 깨짐"). 간헐적이라 재현이 까다로움.

**정본:** `MDeautify-app\resources\js\app.js:282` `runPaged(src,keepScroll,attempt)`
- **세대 가드:** `var myGen=(window.__pgGen=(window.__pgGen||0)+1);` — 더 새 조판 시작되면 이 결과 폐기.
  콜백/fail마다 `if(myGen!==window.__pgGen){dropStaging();return;}` 로 스테일 결과 버림(app.js:319·326).
- **오버플로 검출+재조판:** 완료 시 스테이징의 `.pagedjs_page_content`에서 `scrollWidth>clientWidth+4` 검출 시
  `attempt<2`면 50ms 후 재조판(app.js:329~331).
```js
var bad=false,pcs=staging.querySelectorAll(".pagedjs_page_content");
for(var bi=0;bi<pcs.length;bi++){if(pcs[bi].scrollWidth>pcs[bi].clientWidth+4){bad=true;break;}}
if(bad&&attempt<2){dropStaging();setTimeout(function(){if(myGen===window.__pgGen)runPaged(src,keepScroll,attempt+1);},50);return;}
```
**이식:** 자매앱은 `runPaged`가 별도 함수로 없을 수 있음(renderPreview 안에서 `PagedModule.Previewer` 직접 호출: MDocify `app.js:138`, MDhwpxify `app.js:222`). 그 조판 호출을 **세대 번호로 감싸고**, 완료 콜백에 오버플로 검사+재조판을 넣으면 됨. 스테이징(off-DOM에 조판 후 교체)을 안 쓰면 우선 세대 가드만이라도 적용.
⚠️ **브라우저 테스트 pane은 페인트 스로틀로 조판이 완결 안 돼** 오버플로가 재현되나 완치 검증은 불가 → **실제 exe에서 확인** 필요.

---

## 4. B. 저장 흐름 / 모달 (유실 방지 위생 · 저비용)

### B1. 인-앱 모달 3지선다 `__confirmSave3` (v1.5.3)
**정본:** `MDeautify-app\resources\js\modal.js` — `open3()` / `window.__confirmSave3(opts)`.
resolve `"save"|"discard"|"cancel"`, Enter=save·Esc/바깥클릭=cancel. 버튼: 취소 / 저장 안 함 / 저장(저장하고 …).
CSS: `.am-discard`(중립, 호버 시 빨강 힌트).
> 핸드오버 #1은 `__appAlert`/`__appConfirm`만 언급 — **open3가 신규**. 자매앱엔 modal.js 자체가 없으니 **modal.js 통째 이식**(3종 다 가져오면 됨).

### B2. 변경감지(dirty) 인프라 (v1.3.1 기반, v1.5.3에서 전역 노출)
**정본:** `app.js:615~620`
```js
var savedText=null;                                        // 마지막 저장/로드 내용 = 변경감지 기준선
window.__markClean=function(){savedText=ta.value;};        // 새 문서 로드/저장 시 기준선 리셋
window.__isDirty =function(){return document.body.classList.contains("loaded")&&ta.value!==savedText;};
window.__getSaved=function(){return savedText;};           // 탭 스냅샷용
window.__setSaved=function(t){savedText=(t==null?null:t);};// 탭 복원용(dirty 보존)
```
- renderMarkdown(새 문서 로드) 끝에서 `window.__markClean()` 호출(app.js:356).
- `ta`는 자매앱에선 `#editor`로 치환.

### B3. 문서 전환 저장 가드 `__confirmReplaceDoc` (v1.5.3)
**정본:** `app.js:396`. 드롭·탐색기 클릭·파일열기 전에 호출 → 저장 안 된 변경 있을 때만 개입.
```
loaded 아님 → true(그냥 진행)
dirty 아님 → true
자동저장 ON + __mdPath 있음 → 저장 후 true
그 외 → __confirmSave3 3지선다 (cancel→false, save→저장후 true[경로없음+취소=false 유실방지], discard→true)
```
**이식:** 자매앱의 "드롭으로 새 md 열기" / "파일 열기" 진입점에서 `if(!await window.__confirmReplaceDoc())return;` 가드만 추가하면 됨. (현재 자매앱은 무경고로 덮어씀 → 편집 중 드롭 시 유실 위험)

### B4. 자동 저장 `__autoSaveMd` (v1.3.1)
**정본:** `app.js:650~655`(경로 연결 시 편집 debounce 시점에 원본 .md 덮어쓰기, `text===savedText`면 생략), 설정 토글 `__autoSave`.
자매앱은 파일 경로 연결(filesystem write) 흐름이 있어야 의미 있음 → 경로 저장 UX가 없으면 후순위.

---

## 5. C. 탭(멀티문서) — 큰 이식, UX 결정 필요

> 자매 앱은 **단일 문서 컨버터**라 탭이 UX에 맞는지 먼저 판단할 것. 이식하면 공수 큼(반나절~).

### C1. `tabs.js` (v1.6.0) — 스냅샷/복원 방식
**정본:** `MDeautify-app\resources\js\tabs.js`(약 200줄).
- 설계: 전역변수(`__mdPath`·`__mdDir`·`__mdName`·`__fname`·`__drop`·savedText·`__imgFiles`)를 **활성 문서 라이브 상태**로 두고,
  탭 전환 때만 세션 객체로 **스냅샷/복원** → 기존 코드 대량 수정 없이 재사용.
- 세션: `{id,path,dir,name,fname,text,baseline,drop,imgFiles,scroll}`, `baseline`≠`text`면 dirty.
- 탭바 UI: 파일명 + dirty 점 + 닫기(×) + 가운데클릭 닫기, 오버플로 스크롤.
- 열기 진입점(`__openDoc`)이 openMd·drop·explorer·recover를 대체.
- 닫기(`closeTab`)는 **B1 `__confirmSave3` 재사용**(더티 시 저장/버리기/취소), 마지막 탭이면 빈 화면.
- 전역: `window.__openDoc`, `window.__tabsCount`, `window.__closeActiveTab`, `window.__tabsOnEdit`(편집 시 dirty 점 갱신).
**전제:** B1·B2 먼저 이식되어야 함. 자매앱 id/이벤트명 치환 필수.
⚠️ MVP 한계(그대로 승계): 탭 전환 시 textarea 네이티브 undo 초기화, 재시작 시 탭 복원 없음.

### C2. Ctrl/Cmd+W 문서 닫기 (v1.6.0)
**정본:** `tabs.js` 하단 keydown 핸들러 + `window.__closeActiveTab`.
- 활성 탭 닫기 + 이웃 활성화. **capture 단계 + preventDefault + `e.repeat` 가드.**
- **"md뷰어/에디터에 있을 때만"**: 모달/팝오버(`appModal·updModal·notesModal·themeModal·settingsModal`) 열림, 찾기 입력(`fbFind·fbRepl`) 포커스, 열린 문서 없음이면 **양보**.
- exe 확인 완료: WebView2는 Ctrl+W 기본 바인딩이 없어 창닫기로 새지 않고 문서만 닫힘.
**이식:** 자매앱의 모달/입력 id 목록으로 가드 배열만 교체. 탭 없이 단일문서면 "문서 닫기=빈 화면"으로 축소 가능.

---

## 6. D. 폴더 탐색기 + 실시간 파일 감시 — 큰 이식, UX 결정 필요

### D1. `explorer.js` (v1.5.0)
**정본:** `MDeautify-app\resources\js\explorer.js`.
- 작업 폴더 등록 → 트리, `.md` 클릭=열기(`__openMdPath`/탭), 이미지 클릭=커서에 `![](경로)` 삽입(`__insertImageFromPath`, app.js:780).
- 상태 localStorage: `md2pdf_explorer_open`·`md2pdf_folders`·`md2pdf_explorer_w`(리사이저, dblclick 214px 리셋).
- 실시간 감시: `filesystem.createWatcher`+`watchFile`, 디바운스 300ms·펼친 폴더만 재읽기·`.git/node_modules/...` 무시, 부팅 시 `getWatchers`로 중복/고아 워처 정리.
- 중복 폴더 자동 정리(상위만 유지, `isUnder` norm 비교), Ctrl/Cmd+B 토글(explorer.js:311).
**이식:** 사이드바 레이아웃(index.html/CSS) + explorer.js + `__openMdPath`/`__insertImageFromPath` 진입점 필요. prefix `md2pdf_`→`mdocify_` 치환. 실기기 watchFile 실동작은 사용자 테스트로 확인.

---

## 7. E. 소소한 것 (선택)

- **E1. 이미지 첨부 팝오버(v1.6.0)** — 우상단 📎 배지 클릭 시 문서 연결 이미지 목록 팝오버. 자매앱도 `__drop` 풀이 있어 적용 가능(app.js badge/pop 블록 참조).
- **E2. 안내 토스트 위치(v1.6.0)** — `__toast`를 `#editorBody` 기준 우상단 📎 배지 옆/그 자리에 정렬(배지 숨김 시 코너). 자매앱 `toast` 함수 위치만 조정.
- **E3. 찾기/바꾸기 `find.js`(v1.3.1, 미이식)** — Ctrl+F/H, 전체 매치 하이라이트(`#findHl`), execCommand로 Ctrl+Z 보존. 컨버터에도 유효하나 별도 이식 건.

---

## 8. 공통 치환값 (핸드오버 #1과 동일 규약)

| 항목 | MDeautify(원본) | 자매앱 |
|---|---|---|
| 에디터 textarea id | `#rawInput` | **`#editor`** |
| 미러 id | `#raw` | 자매앱 미러 id 확인 |
| localStorage prefix | `md2pdf_` | `mdocify_` |
| 설정 이벤트 | `md2pdf:settings-*` | `mdocify:settings-*` |
| %APPDATA% dir | `MDeautify` | `MDocify` / `MDhwpxify` |

모달/탭/탐색기 이식 시 keydown 가드의 **모달·입력 id 목록**도 자매앱 것으로 교체할 것.

---

## 9. 검증

- **A(조판):** 실제 exe에서 (1)긴 코드블록 문서가 페이지 넘어 안 잘리는지, (2)탭 전환/연속 편집 반복 시 미리보기 다단 깨짐 없는지. **브라우저 pane은 페인트 스로틀로 완치 검증 불가** → exe 필수.
- **B(저장흐름):** 편집(dirty) 상태에서 다른 md 드롭/열기 → 3지선다 모달 뜨는지, 취소 시 유실 없는지, 자동저장 ON 시 조용히 저장 후 전환인지.
- **C(탭):** 탭 3개 열고 전환/닫기, 더티 탭 닫기 시 저장 모달, 마지막 탭 닫으면 빈 화면, Ctrl+W가 창을 안 닫는지.
- 로직 단위 검증은 **합성 KeyboardEvent/직접 전역 호출**로 가능(브라우저에서 실제 Ctrl+W는 브라우저 탭을 닫으니 합성 이벤트로).

---

## 10. 빌드 / 릴리스

- 소스 수정 후 **항상 `build.ps1 -Exe`** 재빌드(sha256 생성). (memory `mdeautify-rebuild-every-change`)
- 릴리스: `git credential fill`로 토큰 → GitHub REST API. MDeautify는 upstream `felixleee/MDeautify`, 리모트명 **`upstream`**.
- 각 앱 릴리스 상태/방법: MDocify=`mdocify-tool-overview`, MDhwpxify=`md2hwpx-tool-overview`·`mdhwpxify-release-status`.

## 11. 참고 메모리
`window-state-ux-handover`(핸드오버 #1) · `mdeautify-pending-release-notes`(원본 최종 상태·⚠️0절 Paged.js 정정 반영 필요) ·
`mdeautify-tool-overview` · `mdocify-tool-overview` · `md2hwpx-tool-overview` · `mdeautify-oneclick-pdf-export`.
