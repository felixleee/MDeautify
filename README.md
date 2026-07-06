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
| `MDeautify-app/` | Neutralino 앱 소스. **도구 본체는 `resources/index.html`에 있으며 여기서 exe를 빌드**합니다. `bin/`·`dist/`는 빌드 산출물이라 저장소에서 제외 |
| `MDeautify_사용안내서.md` / `.pdf` | 사용 안내서(마크다운 원본 + 이 도구로 생성한 PDF 예시) |

## 사용법

`MDeautify.exe`를 실행하고, 왼쪽 영역에 `.md` 파일을 끌어다 놓거나 내용을 붙여넣습니다. `PDF 저장/인쇄` 버튼 → 대상을 **PDF로 저장** 선택.

> 브라우저만으로 쓰려면 `MDeautify-app/resources/index.html`을 열어도 동일하게 동작합니다.

자세한 내용은 [사용 안내서](MDeautify_사용안내서.pdf)를 참고하세요.

## 라이선스

앱 래퍼는 [Neutralinojs](https://neutralino.js.org/)(MIT) 기반이며, 도구에 번들된 오픈소스 라이브러리(marked, Mermaid, Paged.js, KaTeX 등)는 각자의 라이선스를 따릅니다.
