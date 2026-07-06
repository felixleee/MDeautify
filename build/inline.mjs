// 멀티파일 resources/ -> 단일 자립형 HTML 로 인라인
// 사용: node build/inline.mjs <resourcesDir> <outFile>
import fs from "node:fs";
import path from "node:path";

const resDir = process.argv[2];
const outFile = process.argv[3];
if (!resDir || !outFile) {
  console.error("사용법: node build/inline.mjs <resourcesDir> <outFile>");
  process.exit(1);
}

let html = fs.readFileSync(path.join(resDir, "index.html"), "utf8");

// 1) <link rel=stylesheet href="css/..."> -> <style> ... </style>  (폰트 base64 재삽입)
html = html.replace(/<link\s+rel=["']stylesheet["']\s+href=["']([^"']+)["']\s*\/?>/gi, (m, href) => {
  const cssPath = path.join(resDir, href);
  let css = fs.readFileSync(cssPath, "utf8");
  const cssDir = path.dirname(cssPath);
  // url(../fonts/x.woff2) -> data URI
  css = css.replace(/url\(\s*(['"]?)([^'")]+\.woff2)\1\s*\)/gi, (mm, q, rel) => {
    const fontPath = path.resolve(cssDir, rel);
    const b64 = fs.readFileSync(fontPath).toString("base64");
    return "url(data:font/woff2;base64," + b64 + ")";
  });
  return "<style>" + css + "</style>";
});

// 2) <script src="..."></script> -> <script> ...파일내용... </script>
html = html.replace(/<script\s+src=["']([^"']+)["']\s*>\s*<\/script>/gi, (m, src) => {
  const js = fs.readFileSync(path.join(resDir, src), "utf8");
  return "<script>" + js + "</script>";
});

// 남은 외부 참조 검사 (neutralino.js 등 로컬-서버 전용 참조가 남으면 경고)
const leftLink = html.match(/<link[^>]+href=["'](?!data:)[^"']+["']/i);
const leftScript = html.match(/<script[^>]+src=/i);
if (leftLink) console.warn("경고: 인라인되지 않은 <link> 남음:", leftLink[0]);
if (leftScript) console.warn("경고: 인라인되지 않은 <script src> 남음:", leftScript[0]);

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, html);
console.log("[HTML] " + outFile + " 생성 (" + html.length + " bytes)");
