/* 원클릭 PDF 내보내기
   - 화면에 렌더된 Paged.js DOM(#pages)을 "그대로" 자립 HTML로 직렬화한 뒤,
     헤드리스 Edge(없으면 Chrome)의 --print-to-pdf 로 인쇄 → 미리보기와 100% 동일.
   - 앱 자체 웹뷰(WebView2)와 같은 Chromium 엔진 + 같은 PC 폰트라 출력이 일치.
   - Neutralino(EXE)에서만 동작. 브라우저 모드거나 Edge/Chrome 미발견/실패 시 기존 window.print() 로 폴백.

   실행은 앱의 검증된 업데이트 패턴을 따른다: .ps1 을 TEMP 에 쓰고 `powershell -File <상대명>`(+cwd)로 실행.
   → cmd 의 중첩 따옴표 훼손을 회피하고, PowerShell call 연산자가 한글/공백 경로를 Unicode 로 안전 전달.
   ⚠️ 직렬화 HTML 에 스크립트는 절대 포함하지 않는다(paged.polyfill 재실행 시 재조판되어 결과가 달라짐). */
(function(){
  var btn=document.getElementById("btnPrint");
  if(!btn)return;

  function isExe(){return typeof window.NL_PORT!=="undefined"&&typeof window.Neutralino!=="undefined";}

  /* Edge 우선, Chrome 폴백. Win11에서 Edge는 사실상 항상 존재. */
  var CANDIDATES=[
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
  ];
  async function findBrowser(){
    for(var i=0;i<CANDIDATES.length;i++){
      try{await Neutralino.filesystem.getStats(CANDIDATES[i]);return CANDIDATES[i];}catch(e){}
    }
    return null;
  }

  /* 현재 문서의 모든 스타일시트 규칙을 텍스트로 수집.
     style.css(=@media print, @page 포함) + Paged.js가 head에 삽입한 페이지 박스 스타일까지 전부 포함됨.
     모두 동일 출처(로컬 서버)라 cssRules 접근 가능. */
  function collectCss(){
    var out=[];
    for(var i=0;i<document.styleSheets.length;i++){
      var sheet=document.styleSheets[i],rules=null;
      try{rules=sheet.cssRules;}catch(e){rules=null;}
      if(!rules)continue;
      for(var j=0;j<rules.length;j++){try{out.push(rules[j].cssText);}catch(e){}}
    }
    return out.join("\n");
  }

  function abToB64(buf){var bytes=new Uint8Array(buf),bin="",ch=0x8000;for(var i=0;i<bytes.length;i+=ch){bin+=String.fromCharCode.apply(null,bytes.subarray(i,i+ch));}return btoa(bin);}

  /* 번들 폰트(@font-face 의 ../fonts/*.woff2)를 data URI 로 인라인.
     앱은 Pretendard·Noto Sans KR 을 resources/fonts/ 에 번들해 @font-face 로 임베드한다(이식성 목적).
     임시 HTML 은 TEMP 에 있어 상대경로 ../fonts/ 가 깨지고, 단일 exe 라 디스크에 폰트 파일도 없다.
     → data URI 로 자립화해야 폰트 없는 PC 에서도 미리보기와 동일 폰트로 출력됨. */
  async function inlineFonts(css){
    var re=/url\(\s*(['"]?)[^)'"]*?fonts\/([A-Za-z0-9._-]+\.woff2)\1\s*\)/g;
    var files={},m;
    while((m=re.exec(css))){files[m[2]]=null;}
    var names=Object.keys(files);
    for(var i=0;i<names.length;i++){
      try{var buf=await fetch("fonts/"+names[i]).then(function(r){return r.arrayBuffer();});files[names[i]]="data:font/woff2;base64,"+abToB64(buf);}catch(e){files[names[i]]=null;}
    }
    return css.replace(re,function(whole,q,file){var d=files[file];return d?("url("+d+")"):whole;});
  }

  /* 렌더 완료된 #pages + 스타일을 자립 HTML로. 스크립트 없음.
     - :root 인라인 스타일(--doc-font/--doc-size/테마색) 그대로 전달
     - #main>#viewer>#pages 구조 유지 → @media print 선택자가 화면과 동일하게 매칭
     - 헤드리스 print-to-pdf 는 print 미디어로 렌더되므로 @media print 가 적용됨(미리보기와 동일)
     - 번들 폰트는 data URI 로 인라인(inlineFonts) → 폰트 이식성 보존 */
  async function buildStandaloneHtml(){
    var pages=document.getElementById("pages");
    var rootStyle=(document.documentElement.getAttribute("style")||"").replace(/"/g,"&quot;");
    var css=await inlineFonts(collectCss());
    return "<!doctype html><html lang='ko' style=\""+rootStyle+"\"><head><meta charset='utf-8'>"+
      "<style>"+css+"</style>"+
      /* 안전장치: 규칙 누락 대비 물리 여백 0 + 배경색 인쇄 강제 */
      "<style>@page{size:A4;margin:0!important;}html,body{margin:0!important;padding:0!important;background:#fff!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}</style>"+
      "</head><body class='loaded'><div id='main'><section id='viewer'><div id='pages'>"+
      pages.innerHTML+
      "</div></section></div></body></html>";
  }

  /* PowerShell 단일 인용 리터럴 */
  function psq(s){return "'"+String(s).replace(/'/g,"''")+"'";}

  /* 저장 중 전체화면 오버레이 — 업데이트 다운로드와 동일한 #updModal 재사용(동일 스피너/딤). */
  function showBusy(msg){var m=document.getElementById("updModal"),t=document.getElementById("updMsg");if(t)t.textContent=msg;if(m)m.hidden=false;}
  function hideBusy(){var m=document.getElementById("updModal");if(m)m.hidden=true;}

  async function exportPdf(){
    if(!document.body.classList.contains("loaded")){
      if(window.__appAlert)window.__appAlert("먼저 MD 파일을 불러오세요.","변환할 내용이 없어요");
      else alert("변환된 내용이 없습니다. 먼저 MD 파일을 불러오세요.");
      return;
    }
    if(!isExe()){window.print();return;}   /* 브라우저 모드: 기존 인쇄 대화상자 */

    var browser=await findBrowser();
    if(!browser){window.print();return;}   /* Edge/Chrome 없음 → 인쇄 대화상자 폴백 */

    var defName=(window.__fname||"document")+".pdf";
    var defPath=window.__mdDir?(window.__mdDir+"\\"+defName):defName;
    var outPath;
    try{
      outPath=await Neutralino.os.showSaveDialog("PDF로 내보내기",{defaultPath:defPath,filters:[{name:"PDF",extensions:["pdf"]},{name:"모든 파일",extensions:["*"]}]});
    }catch(e){window.print();return;}
    if(!outPath)return;                     /* 취소 */
    if(!/\.pdf$/i.test(outPath))outPath+=".pdf";

    var origLabel=btn.textContent;btn.disabled=true;btn.textContent="PDF 생성 중…";
    showBusy("PDF 저장 중…");
    var tmpHtml=null,tmpPs1=null;
    try{
      var tmp=await Neutralino.os.getEnv("TEMP");
      tmpHtml=tmp+"\\mdeautify_export.html";
      tmpPs1=tmp+"\\mdeautify_export.ps1";
      var udd=tmp+"\\mdeautify_edge_profile";   /* 사용자 프로필 미접촉 + 실행 중 Edge 와의 프로필 잠금 충돌 회피(안정성 핵심) */
      var fileUrl="file:///"+tmpHtml.replace(/\\/g,"/");

      await Neutralino.filesystem.writeFile(tmpHtml,await buildStandaloneHtml());

      /* .ps1: call 연산자로 Edge 실행 → 한글/공백 경로를 Unicode 로 안전 전달.
         --virtual-time-budget 은 --headless=new 에서 인쇄 실패를 유발해 제외(이미 렌더된 DOM+data URI라 비동기 대기 불필요).
         맨 앞 ﻿(UTF-8 BOM): Windows PowerShell 5.1 이 한글 경로 리터럴을 UTF-8 로 읽도록 강제. */
      var ps1=String.fromCharCode(0xFEFF)+   /* UTF-8 BOM 바이트(EF BB BF) 유도 — 에디터가 BOM 문자를 삼켜도 안전 */
        "$ErrorActionPreference='SilentlyContinue'\r\n"+
        "$b="+psq(browser)+"\r\n"+
        "$u="+psq(udd)+"\r\n"+
        "$o="+psq(outPath)+"\r\n"+
        "$f="+psq(fileUrl)+"\r\n"+
        "& $b --headless=new --disable-gpu --no-pdf-header-footer \"--user-data-dir=$u\" \"--print-to-pdf=$o\" \"$f\"\r\n";
      await Neutralino.filesystem.writeFile(tmpPs1,ps1);

      /* 상대 파일명 + cwd 로 실행(경로 공백/인용부호 회피) — 업데이트 흐름과 동일 패턴. background 아님 → 완료까지 대기. */
      await Neutralino.os.execCommand("powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File mdeautify_export.ps1",{cwd:tmp});

      var ok=false;
      try{var st=await Neutralino.filesystem.getStats(outPath);ok=st&&st.size>0;}catch(e){ok=false;}
      if(ok){
        try{await Neutralino.os.open(outPath);}catch(e){}   /* 만든 PDF 열기 */
      }else{
        if(window.__appAlert)window.__appAlert("PDF 생성에 실패했습니다. 인쇄 대화상자로 진행합니다.","오류");
        window.print();
      }
    }catch(e){
      try{Neutralino.debug.log("[exportPdf] "+e);}catch(_){}
      if(window.__appAlert)window.__appAlert("PDF 내보내기 중 문제가 발생했습니다. 인쇄 대화상자로 진행합니다.","오류");
      else alert("PDF 내보내기 중 문제가 발생했습니다.");
      try{window.print();}catch(_){}
    }finally{
      hideBusy();
      btn.disabled=false;btn.textContent=origLabel;
      if(tmpHtml){try{await Neutralino.filesystem.remove(tmpHtml);}catch(e){}}
      if(tmpPs1){try{await Neutralino.filesystem.remove(tmpPs1);}catch(e){}}
    }
  }

  window.__exportPdf=exportPdf;
})();
