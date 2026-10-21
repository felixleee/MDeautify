# 보안 핸드오버 #4 — 미리보기 HTML 정화(DOMPurify) · 작은따옴표 이스케이프

> 작성 2026-10-21 · 기준 구현 = **MDeautify**(작업트리, v1.8.9로 낼 예정) · 대상 = **MDocify**, **MDhwpxify**
> 각 앱은 그 앱 세션에서 따로 적용·검증·릴리스한다. 이 문서는 "무엇을, 어디를, 어떻게 확인할지"만 정리한다.
> 줄번호는 2026-10-21 기준 — 고치기 전에 다시 찾을 것.

## 0. 무슨 문제인가

세 앱 모두 marked가 만든 HTML을 정화 없이 미리보기에 `innerHTML`로 넣는다. marked는 md 안에 섞인 HTML을 그대로 내보내므로, 남이 준 `.md`를 **열기만 해도** 그 안의 코드가 실행된다.

- `<script>` 태그는 innerHTML 특성상 안 돌지만, `<img src=x onerror="…">` 같은 **이벤트 속성은 미리보기를 그리는 순간 실행**된다.
- exe에선 같은 페이지에 Neutralino API가 열려 있고 `nativeAllowList`에 `os.*`가 있다 → 그 코드가 `Neutralino.os.execCommand(…)`로 **사용자 권한의 명령 실행**까지 닿는다(execCommand는 앱 기능이 써서 허용 목록으로 막을 수 없음 → 정화가 본 해결).
- 그 밖에 `[x](javascript:…)` 링크, `<style>`(앱 화면 전체 모양을 바꿈), `<form>`·`<map>/<area>`(앱 링크 처리를 우회해 앱 창 자체를 다른 주소로 보냄), 앱 요소와 같은 id(`<div id="appModal">` 등 — 앱이 엉뚱한 요소를 잡음)도 그대로 들어간다.
- 별개로, 파일 팝오버·탐색기는 이름을 `title='…'`·`data-rm='…'` 같은 **작은따옴표 속성**에 넣는데 이스케이프 함수가 `'`를 안 바꿔서, 이미지 참조 이름이나 파일·폴더 이름으로 속성을 끼워 넣을 수 있다.

MDeautify 1.8.8에서 무해한 재현으로 확인함: onerror 2회 실행, (가짜 Neutralino 기준) `execCommand` 호출 2회, `javascript:` 주소 4종 잔존, 문서 안 `<style>`로 앱 탭바 숨김, md 속 `id="appModal"`이 앱의 모달 자리를 가로챔.

## 1. 기준 구현 (MDeautify) — 공통 파일 2개 + 앱별 연결

| 무엇 | 위치(`MDeautify-app/resources/`) | 내용 |
|---|---|---|
| 정화 라이브러리 | `vendor/purify.min.js` | **DOMPurify 3.4.17** — npm `dompurify@3.4.17` 패키지 sha512 일치 확인 후 dist 파일만. 29,828B, sha256 `cd37898f9782adf54820c413191b5691803f0f137c799d6edcfd38523b4c2c31`. 라이선스(Apache-2.0/MPL-2.0) 문구는 파일 머리 |
| **공통 정화 파일** | `js/sanitize.js` | `window.__sanitize(html)` 하나. **세 앱이 같은 파일을 그대로 쓴다**(앱별 수정 없음). 작업트리 사본 sha256 `57b5a186…`(CRLF — 줄바꿈 따라 해시가 달라지니 내용으로 비교) |
| 스크립트 순서 | `index.html` | `vendor/purify.min.js` → `js/sanitize.js` 를 **app.js 보다 먼저** |
| 적용 ① | `app.js` buildSource | `"<div class='content'>"+window.__sanitize(marked.parse(srcmd))+"</div>"` — marked 출력을 innerHTML 넣기 **직전**에 |
| 적용 ② | `app.js` 릴리스 노트 | `window.__sanitize(marked.parse(stripHead(j.body)))` (GitHub에서 받은 글도) |
| 작은따옴표 | 파일 팝오버 `esc`, `explorer.js` `esc` | `/[&<>"']/g` + `"'":"&#39;"` |
| (MDeautify만) #링크 맞춤 | `app.js` buildSource | 정화가 글 속 HTML id 앞에 `user-content-`를 붙이므로, `[x](#id)`의 대상이 `user-content-id`로만 있으면 href를 맞춘다. **자매앱엔 문서 안 #링크 이동 기능(제목 id·클릭 처리)이 없어 불필요** |

`sanitize.js` 정책(파일 머리 주석과 같음 — MDhwpxify 세션이 먼저 만든 정책에 MDeautify 쪽 필요분을 합친 것):
- **남기는 것**: 글자 서식·표(colspan·colgroup)·그림(상대/절대·`D:…` 드라이브 경로 모든 형태·UNC·`data:image`)·링크(http·mailto·file·`#`)·할 일 체크박스·`<details>`·align·style **속성**·SVG·KaTeX(MathML의 `semantics`·`annotation`까지)
- **빼는 것**: `<script>`·`on…` 이벤트 속성·`javascript:`/`vbscript:` 주소·iframe/object/embed·`<style>` **요소**·`<form>`·`<button>`·`<textarea>`·`<select>` 등 폼·`<map>/<area>`·`action`/`formaction` 속성
- `SANITIZE_NAMED_PROPS: true` — 글 속 HTML의 id·name 앞에 `user-content-` (앱 요소 id 가로채기 방지)
- 주소 규칙: DOMPurify 기본값 + `file:` + **드라이브 문자 `[a-z]:` 뒤 무엇이든**. 기본값은 `D:`를 모르는 주소 형식으로 보고 지우고, marked는 역슬래시를 `%5C`로 바꿔 넣는다(`D:%5C폴더…`). `D:/`만 허용하면 역슬래시 경로 이미지·링크가 지워진다. 한 글자 주소 형식으로 실행되는 것은 없다.
- 정화기를 못 불러오면 HTML을 **글자 그대로** 보여 준다(실행되는 쪽보다 안전).

정화 위치가 중요하다: marked 출력 문자열을 innerHTML에 넣기 **직전**에 거른다. 그 뒤 앱이 직접 붙이는 것(제목 id·목차·외부 링크 `target=_blank`·다이어그램 SVG·코드 강조·표 열 폭·스크롤 동기화 태그)은 정화 이후라 영향이 없다.

MDeautify 검증 결과: 공격 항목 전부 0 · 사용 안내서·KaTeX 샘플·mermaid 샘플·실문서 등 **12개 문서 렌더 결과가 1.8.8과 같음**(조판 직전 소스 HTML·이미지 주소·링크·쪽수 비교, 차이는 `<a id="anchor1">` → `user-content-anchor1` 한 곳뿐이고 그 링크는 맞춰짐) · 역슬래시/슬래시 드라이브 경로 4종 1.8.8과 동일 · 기존 회귀(편집·탭·PDF·표) 전부 통과.

## 2. 앱별 할 일

### MDocify (`D:\MDocify`, 현재 v1.1.0 `b2df2c6`, 정화 없음 — 전부 적용)
1. `vendor/purify.min.js`, `js/sanitize.js` 를 MDeautify에서 **그대로 복사**.
2. `index.html`: 9줄 `vendor/marked.min.js` 다음에 `<script src="vendor/purify.min.js"></script>`, `<script src="js/sanitize.js"></script>` (app.js는 302줄 — 그보다 앞이면 됨).
3. `js/app.js:113` `window.marked.parse(srcmd)` → `window.__sanitize(window.marked.parse(srcmd))`.
4. `js/update.js:50` 릴리스 노트 `marked.parse(stripHead(j.body))` → `window.__sanitize(marked.parse(stripHead(j.body)))`.
5. 작은따옴표: `js/app.js:474`의 `esc`(파일 팝오버 500·506·507줄이 `title='…'`·`data-rm/ins/del='…'`), `js/explorer.js:42`의 `esc`(148·186줄 `title='…'`).
6. docx 변환(`md2docx.js`)은 미리보기 DOM이 아니라 md 토큰을 직접 변환하고 HTML 토큰은 태그를 떼고 글자만 쓴다(164·190줄) → **docx 결과는 이번 수정과 무관**. 미리보기만 확인.
7. KaTeX는 없지만 sanitize.js의 MathML 허용은 무해 → 공통 파일 그대로.

### MDhwpxify (`D:\MDhwpxify`, 공개 v1.3.0 `a82d883` + **v1.3.1 정화 작업이 미커밋·사용자 확인 대기**)
그 세션이 같은 설계로 먼저 진행했다(`js/sanitize.js`·`vendor/purify.min.js` 미추적, app.js 100·1046줄 `__sanitize`, app.js·explorer.js의 esc `'` 처리 완료, 로컬 빌드 `24d5125d…`). **그 작업 위에** 아래만 맞추면 된다.
1. `vendor/purify.min.js` **3.2.7 → 3.4.17**(MDeautify 파일 복사, sha256 위 표).
2. `js/sanitize.js`를 **공통 파일로 교체**. 지금 파일과의 차이:
   - 주소 규칙의 드라이브 부분 `[a-z]:(?:[\\/]|%5c)` → `[a-z]:` (드라이브 뒤 어떤 형태든 — marked가 역슬래시를 떼거나 바꾸는 경우까지), `callto|sms|cid|xmpp|matrix` 포함
   - KaTeX용 `ADD_TAGS:['semantics','annotation']`·`ADD_ATTR:['encoding']` (MDhwpxify엔 수식이 없어 무해)
   - `SANITIZE_NAMED_PROPS`·`FORBID_TAGS`·`FORBID_ATTR`·폴백(글자로 표시)은 같다
3. 그쪽 sanitize.js 주석의 "다이어그램 SVG도 거름" 호출은 유지.
4. 바꾼 뒤 그 세션의 검증을 다시 돌리고 **v1.3.1 빌드를 다시 만들 것**(지금 사용자 확인 대기 중인 빌드는 3.2.7).

## 3. 검증 (두 앱 모두 고치기 전/후로 돌려서 통과시킨 뒤 빌드)

**① 공격 재현(무해)** — 아래 md를 열고 확인. 실제 명령은 실행하지 않는다.

```markdown
# 보안 확인용(무해)

<img src="x" onerror="window.__poc=(window.__poc||0)+1">

[링크](javascript:void(window.__jsLink=1))

<style>body{outline:5px solid red}</style>

<form action="https://example.invalid/x"><input name="q"><button>보내기</button></form>

<map name="m"><area shape="rect" coords="0,0,10,10" href="https://example.invalid/"></map>

<a href="JaVaScRiPt:void(0)">대소문자</a> <a href="&#106;avascript:void(0)">엔티티</a>

<div id="appModal">문서 속 가짜 앱 요소</div>
```

기대값(고친 뒤): `window.__poc` 없음(0) · 미리보기 안 `href`/`xlink:href` 중 `javascript:` 0개 · 미리보기 본문 안 `style`·`form`·`button`·`map`·`area` 요소 0개 · 문서의 `<style>`이 앱 UI에 영향 없음 · `document.getElementById('appModal')`(앱마다 실제 쓰는 id로)이 문서 속 요소를 잡지 않음. **고치기 전 코드로 돌리면 전부 걸려야** 테스트가 맞는 것.
exe 경로(`Neutralino.os.execCommand` 도달)는 가짜 Neutralino를 주입해 헤드리스 Edge에서 확인 — 방법은 메모 `mdeautify-exe-path-headless-testing`(같은 메모 폴더). onerror에 `Neutralino.os.execCommand('echo POC')`를 넣고 호출 기록이 0인지 본다.

**② 작은따옴표**: `![x](<it's data-pwn='1.png>)`가 든 문서를 열고 파일 팝오버를 펼쳤을 때 `[data-pwn]` 속성을 가진 요소가 0개. 탐색기는 `'`가 든 폴더·파일 이름의 툴팁이 잘리지 않는지.

**③ 드라이브 경로**: `![a](D:\폴더\그림.png)`, `![b](D:/폴더/그림.png)`, `<img src="D:\사진\a.png">`, `[c](D:\문서\a.pdf)` 의 주소가 고치기 전과 같게 남는지(지워지면 주소 규칙 문제).

**④ 회귀(가장 중요)**: 기능이 많은 문서(사용 안내서·표·체크박스·`<details>`·결재란 같은 HTML 표·`<br>`·절대경로/UNC/data: 이미지·file:/mailto: 링크·인라인 SVG 등)를 **HEAD 코드와 작업트리 코드로 각각 렌더**해 조판 직전 소스 HTML과 쪽수를 비교 → 같아야 한다(글 속 HTML id의 `user-content-` 접두어만 예외). HEAD 사본은 바뀐 파일을 `git show HEAD:경로`로 덮은 resources 복사본을 서빙하면 된다.

**⑤ exe**: 빌드 후 문서 몇 개를 열어 평소처럼 보이는지 사용자 확인.

## 4. 주의

- **index.html 줄바꿈**: 고친 뒤 `git diff --stat`과 `git diff --ignore-cr-at-eol --stat`을 비교해 추가한 두 줄만 바뀌었는지 확인(MDeautify index.html은 외톨이 CR 때문에 Edit 도구가 파일 전체 diff를 만든 적 있음 — 자매앱은 `i/lf`라 해당 없을 가능성이 큼).
- **사라지는 것**: md 안에 쓴 `<style>` 블록·입력 폼·iframe(유튜브 등)은 이제 표시되지 않는다. 릴리스 노트에 한 줄 적을 것.
- **커밋 작성자**: MDocify는 전역 git(`이재윤 <jaeyoon.lee@formationlabs.co.kr>`)을 따르므로 **커밋 전에 사용자에게 물을 것**(MDeautify에선 매번 "felixleee로 (이번 커밋만)" 선택 → `git -c user.name=felixleee -c user.email=felixleee@users.noreply.github.com commit`). MDhwpxify는 저장소 설정이 이미 felixleee이고 그 세션 규칙이 '묻지 않음'. 어느 앱이든 `Co-Authored-By` 트레일러는 넣지 않는다.
- **릴리스 노트**: 존댓말 + `## 앱이름 vX.Y.Z` / `### 보안` 형식. 예) "md 파일 안에 넣은 HTML에 스크립트가 섞여 있으면 미리보기를 열 때 실행될 수 있던 문제를 고쳤습니다. 이제 다른 사람에게 받은 md 파일도 안전하게 여실 수 있습니다. 이에 따라 md 안에 쓴 `<style>` 블록과 입력 폼은 표시되지 않습니다."

## 5. 각 세션에 붙여 넣을 말

**MDocify 세션**
```
MDeautify에서 미리보기 HTML 정화(보안) 작업을 끝냈어. D:\MDeautify\SECURITY_SANITIZE_HANDOVER.md 를 읽고 "MDocify" 절대로 같은 수정을 MDocify에 적용해 줘. 공통 파일(vendor/purify.min.js, js/sanitize.js)은 MDeautify에서 그대로 복사하고, 문서 3장의 검증(공격 재현·작은따옴표·드라이브 경로·회귀 비교)을 고치기 전/후로 돌려서 통과시킨 다음 exe 빌드까지 해 줘. 커밋 작성자와 릴리스는 나한테 먼저 물어보고.
```

**MDhwpxify 세션**
```
MDeautify에서도 같은 HTML 정화를 끝냈고, 세 앱이 같은 sanitize.js 를 쓰도록 맞추려고 해. D:\MDeautify\SECURITY_SANITIZE_HANDOVER.md 의 "MDhwpxify" 절을 읽고, 지금 진행 중인 v1.3.1 작업 위에 (1) purify.min.js 를 3.4.17로 교체 (2) js/sanitize.js 를 MDeautify의 공통 파일로 교체 — 이렇게 반영해 줘. 문서 3장의 검증(특히 드라이브 경로·회귀 비교)을 다시 통과시키고 v1.3.1 빌드를 새로 만든 뒤 알려줘.
```
