/* 페이지 여백(mm) — 위·오른쪽·아래·왼쪽.
   값의 유일한 출처는 window.__pageMargin={t,r,b,l}. 세 군데가 이 값을 따라간다:
   ① Paged.js 조판 — pagedCss()(app.js)가 @page margin 에 숫자로 박아 넘긴다
   ② CSS — :root 의 --pg-mt/--pg-mr/--pg-mb/--pg-ml (종이 안쪽 여백·이미지 상한·표지 위 여백이 style.css 공식으로 따라감)
   ③ JS 계산 — pageM()(app.js): H2 새 페이지 판정·조판 전 페이지 수 추정
   PDF 내보내기는 :root 인라인 스타일과 Paged.js 페이지 상자를 그대로 옮기므로(export-pdf.js) 따로 손댈 것 없다.
   저장은 값 하나("위,오른쪽,아래,왼쪽")만 — 프리셋 강조는 값에서 거꾸로 판정한다. */
(function(){
  var KEY="md2pdf_page_margin",MINV=10,MAXV=40;   /* 10mm 밑은 머리말·꼬리말(9pt 글자+구분선 ≈ 6mm)이 비좁다 */
  var PRESETS={narrow:{t:12,r:10,b:12,l:10},normal:{t:18,r:15,b:18,l:15},wide:{t:25,r:25,b:25,l:25}};
  var SIDES=["t","r","b","l"];
  var root=document.documentElement;
  var seg=document.getElementById("tmMarginPreset"),stateEl=document.getElementById("tmMarginState"),mini=document.getElementById("tmMarginBody");
  var inp={t:document.getElementById("tmMarginT"),r:document.getElementById("tmMarginR"),b:document.getElementById("tmMarginB"),l:document.getElementById("tmMarginL")};
  function copy(m){return {t:m.t,r:m.r,b:m.b,l:m.l};}
  function same(a,b){return !!a&&!!b&&a.t===b.t&&a.r===b.r&&a.b===b.b&&a.l===b.l;}
  function clamp(v){return Math.max(MINV,Math.min(MAXV,Math.round(v)));}
  function parse(s){
    var a=String(s==null?"":s).split(",");if(a.length!==4)return null;
    var m={};
    for(var i=0;i<4;i++){var v=parseFloat(a[i]);if(!isFinite(v))return null;m[SIDES[i]]=clamp(v);}
    return m;
  }
  function presetOf(m){for(var k in PRESETS){if(same(PRESETS[k],m))return k;}return "custom";}
  /* 입력칸 값 — 비었거나 숫자가 아니면 지금 값 유지, 범위 밖이면 10~40 으로 */
  function fromInputs(){
    var cur=window.__pageMargin||PRESETS.normal,m={};
    SIDES.forEach(function(s){var v=inp[s]?parseFloat(inp[s].value):NaN;m[s]=isFinite(v)?clamp(v):cur[s];});
    return m;
  }
  /* 설정창 도식: 본문 상자를 종이 대비 비율로. 종이 가로세로 뒤집기는 CSS(body.landscape)가 한다 */
  function drawMini(m){
    if(!mini)return;
    var land=(window.__pageOrient==="landscape"),W=land?297:210,H=land?210:297;
    mini.style.top=(m.t/H*100)+"%";mini.style.bottom=(m.b/H*100)+"%";
    mini.style.left=(m.l/W*100)+"%";mini.style.right=(m.r/W*100)+"%";
  }
  function syncUi(m){
    var p=presetOf(m);
    if(seg)[].forEach.call(seg.querySelectorAll("button[data-preset]"),function(b){b.setAttribute("aria-pressed",b.getAttribute("data-preset")===p?"true":"false");});
    if(stateEl)stateEl.textContent=(p==="custom")?"사용자 지정 · mm":"단위 mm";
    drawMini(m);
  }
  function apply(m){
    window.__pageMargin=copy(m);
    SIDES.forEach(function(s){root.style.setProperty("--pg-m"+s,m[s]+"mm");if(inp[s])inp[s].value=m[s];});
    syncUi(m);
  }
  var rt=null;   /* 화살표키로 연달아 바꿀 때 조판이 매번 돌지 않게 짧게 모은다 */
  function commit(m){
    var changed=!same(window.__pageMargin,m);
    apply(m);   /* 안 바뀌어도 입력칸 표시는 정리(범위 밖·빈칸 → 확정값) */
    if(!changed)return;
    MD2R.save(KEY,[m.t,m.r,m.b,m.l].join(","));
    clearTimeout(rt);
    rt=setTimeout(function(){if(window.__lastText&&typeof renderMarkdown==="function")renderMarkdown(window.__lastText);},250);
  }
  function load(){var v=null;try{v=localStorage.getItem(KEY);}catch(e){}apply(parse(v)||PRESETS.normal);}
  load();
  document.addEventListener("md2pdf:settings-hydrated",load);
  if(seg)seg.addEventListener("click",function(e){
    var b=e.target.closest("button[data-preset]");if(!b)return;
    var p=PRESETS[b.getAttribute("data-preset")];if(p)commit(copy(p));
  });
  SIDES.forEach(function(s){
    var el=inp[s];if(!el)return;
    el.addEventListener("input",function(){syncUi(fromInputs());});    /* 치는 동안엔 도식·강조만 */
    el.addEventListener("change",function(){commit(fromInputs());});   /* Enter·포커스 이탈 때 확정 */
  });
  /* 가로/세로 전환 — orient.js 의 change 가 먼저 돌아 __pageOrient 를 바꿔 둔다(스크립트 순서) */
  var land=document.getElementById("tmLandscape");
  if(land)land.addEventListener("change",function(){drawMini(window.__pageMargin||PRESETS.normal);});
  MD2R.register(function(){var m=window.__pageMargin;if(m)MD2R.save(KEY,[m.t,m.r,m.b,m.l].join(","));},[KEY]);
})();
