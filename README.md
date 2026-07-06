# MDeautify (md2pdf)

마크다운(`.md`) 문서를 페이지 단위로 정돈된 **깔끔한 PDF**로 바꿔 주는 오프라인 도구입니다.

- **오프라인 100%** — 인터넷 없이 동작합니다. 마크다운 파싱·변환 엔진이 전부 파일 안에 들어 있습니다.
- **설치 불필요** — 단일 HTML 파일 하나(또는 실행 파일 `MDeautify.exe`) 하나로 끝납니다.
- **왼쪽 원본 / 오른쪽 미리보기** — 마크다운 원문과 실제 PDF 모양을 나란히 봅니다.
- **테마·글꼴·바닥글** — 클릭 몇 번으로 스타일을 바꿉니다.
- **다이어그램 지원** — Mermaid(flowchart, erDiagram, sequenceDiagram 등)를 렌더된 그래픽으로 PDF에 담습니다.

## 구성

| 경로 | 설명 |
|------|------|
| `MDeautify.exe` | 실행 파일 (배포용). Neutralino로 감싼 Windows 앱 |
| `MDeautify-app/resources/` | **도구 본체(소스).** 모듈로 분리됨: `css/`, `fonts/`, `vendor/`(marked·Paged.js), `js/`(diagram·app·settings) |
| `build/`, `build.ps1` | 배포 빌드 스크립트 (아래 참고) |
| `MDeautify_사용안내서.md` / `.pdf` | 사용 안내서(마크다운 원본 + 이 도구로 생성한 PDF 예시) |

## 사용법

`MDeautify.exe`를 실행하고, 왼쪽 영역에 `.md` 파일을 끌어다 놓거나 내용을 붙여넣습니다. `PDF 저장/인쇄` 버튼 → 대상을 **PDF로 저장** 선택.

> 브라우저만으로 쓰려면 `MDeautify-app/resources/index.html`을 열어도 동일하게 동작합니다.

자세한 내용은 [사용 안내서](MDeautify_사용안내서.pdf)를 참고하세요.

## 개발 & 빌드

도구 본체는 `MDeautify-app/resources/`에 **여러 파일로 분리**되어 있습니다. 편집은 해당 파일(`css/style.css`, `js/app.js`, `js/diagram.js`, `js/settings/*.js` 등)에서 직접 하면 됩니다. Neutralino가 `resources/`를 로컬 서버로 제공하므로 exe에서도 그대로 동작합니다.

배포본은 `build.ps1`로 생성하며 결과물은 `release/`에 모입니다:

```powershell
.\build.ps1          # 단일 HTML + exe 둘 다
.\build.ps1 -Html    # 단일 HTML만 (release\MDeautify.html) — 폰트·라이브러리까지 인라인된 자립 파일
.\build.ps1 -Exe     # exe만 (release\MDeautify.exe) — Neutralino 빌드
```

- **단일 HTML**: `build/inline.mjs`가 분리된 소스를 하나로 합칩니다(폰트는 base64로 재삽입). 브라우저로 바로 여는 배포용.
- **exe**: `npx @neutralinojs/neu build`로 빌드 후 Windows exe를 복사합니다. (Node.js 필요)

## 라이선스

앱 래퍼는 [Neutralinojs](https://neutralino.js.org/)(MIT) 기반이며, 도구에 번들된 오픈소스 라이브러리(marked, Mermaid, Paged.js, KaTeX 등)는 각자의 라이선스를 따릅니다.
