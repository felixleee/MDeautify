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
| `MDeautify_Season3.5.html` | 핵심 도구. 브라우저에서 바로 열어 사용하는 단일 HTML 파일 |
| `MDeautify.exe` | Neutralino로 감싼 Windows 실행 파일 |
| `MDeautify-app/` | Neutralino 앱 소스(리소스·설정). `bin/`·`dist/`는 빌드 산출물이라 저장소에서 제외 |
| `MDeautify_사용안내서.md` / `.pdf` | 사용 안내서(마크다운 원본 + 이 도구로 생성한 PDF 예시) |
| `MDeautify 실행.bat` | 실행 도우미 배치 파일 |

## 사용법

### 1) HTML로 바로 쓰기
`MDeautify_Season3.5.html`을 브라우저에서 열고, 왼쪽 영역에 `.md` 파일을 끌어다 놓거나 내용을 붙여넣습니다. `PDF 저장/인쇄` 버튼 → 대상을 **PDF로 저장** 선택.

### 2) 실행 파일로 쓰기
`MDeautify.exe`를 실행합니다.

자세한 내용은 [사용 안내서](MDeautify_사용안내서.pdf)를 참고하세요.

## 라이선스

앱 래퍼는 [Neutralinojs](https://neutralino.js.org/)(MIT) 기반이며, 도구에 번들된 오픈소스 라이브러리(marked, Mermaid, Paged.js, KaTeX 등)는 각자의 라이선스를 따릅니다.
