
function esc(s){return String(s).replace(/[&<>]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c];});}
function hlMd(t){var e=esc(t);
return e.split("\n").map(function(line){var l=line;
if(/^\s{0,3}#{1,6}\s/.test(line))return '<span class="mh">'+l+'</span>';
if(/^\s{0,3}&gt;/.test(l))return '<span class="mq">'+l+'</span>';
l=l.replace(/^(\s*)([-*+]|\d+\.)(\s)/,'$1<span class="ml">$2</span>$3');
l=l.replace(/(`[^`]+`)/g,'<span class="mc">$1</span>');
l=l.replace(/(\*\*[^*]+\*\*)/g,'<span class="mb">$1</span>');
l=l.replace(/(\[[^\]]+\]\([^)]+\))/g,'<span class="mlk">$1</span>');
return l;}).join("\n");}
function fixLooseLists(t){var lines=t.split("\n"),out=[];var isItem=function(s){return /^\s*([-*+]|\d+\.)\s+/.test(s);};
for(var i=0;i<lines.length;i++){if(isItem(lines[i])){var p=out.length?out[out.length-1]:"";if(p.trim()&&!isItem(p))out.push("");}out.push(lines[i]);}return out.join("\n");}
function parseFrontmatter(t){var m=t.match(/^---\s*\n([\s\S]*?)\n---\s*\n/),meta={};if(!m)return{meta:meta,body:t};
m[1].split("\n").forEach(function(line){var i=line.indexOf(":");if(i>0)meta[line.slice(0,i).trim()]=line.slice(i+1).trim().replace(/^["']|["']$/g,"");});
return{meta:meta,body:t.slice(m[0].length)};}
function buildCover(meta){var title=meta.title||meta["제목"]||"",subtitle=meta.subtitle||meta["부제"]||"",kicker=meta["사업명"]||meta.kicker||"";
var special={"title":1,"subtitle":1,"제목":1,"부제":1,"사업명":1,"kicker":1};var rows="";
Object.keys(meta).forEach(function(k){if(special[k])return;rows+="<tr><td class='k'>"+esc(k)+"</td><td>"+esc(meta[k])+"</td></tr>";});
if(!title&&!subtitle&&!rows)return"";
return "<div class='cover'>"+(kicker?"<div class='kicker'>"+esc(kicker)+"</div>":"")+"<h1>"+esc(title)+"</h1><div class='st'>"+esc(subtitle)+"</div><div class='bar'></div>"+(rows?"<table>"+rows+"</table>":"")+"</div>";}

var PAGED_CSS="@page{size:A4;margin:18mm 15mm;@bottom-center{content:counter(page);font-family:'Noto Sans KR','Malgun Gothic',sans-serif;font-size:9pt;color:#94a3b8;}}.content h1,.content h2,.content h3,.content h4{break-after:avoid-page;-webkit-column-break-after:avoid;}.content tr,.content img,.content svg,.content figure,.content pre,.content blockquote{break-inside:avoid;}.content table,.content ul,.content ol{break-inside:auto;}.content thead{break-after:avoid;}.pb-before{break-before:page;}.cover{break-after:page;}.content p,.content li{orphans:2;widows:2;}";

/* 경량 구문 강조기: 주석/문자열/숫자/키워드/함수명 토큰만 span으로 감쌈(정식 파서 아님, 다국어 공통) */
/* 경량 다국어 구문 강조기(정식 파서 아님). 언어 지정(```lang) 블록에만 적용. 지원: js,ts,c,cpp,cs,php,python,bash,powershell,sql,json / html,css,scss,markdown */
function hlCode(src, lang){
  function E(s){return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}
  function W(cls,txt){return '<span class="thl-'+cls+'">'+E(txt)+'</span>';}
  function scan(str,RE,map){
    var out="",last=0,m;
    while((m=RE.exec(str))!==null){
      if(m.index===RE.lastIndex){RE.lastIndex++;continue;}
      out+=E(str.slice(last,m.index))+W(map(m),m[0]);
      last=RE.lastIndex;
    }
    return out+E(str.slice(last));
  }
  lang=(lang||"").toLowerCase().trim();
  var AL={javascript:"js",jsx:"js",mjs:"js",node:"js",typescript:"ts",tsx:"ts","c++":"cpp",cxx:"cpp",cc:"cpp",hpp:"cpp","c#":"cs",csharp:"cs",py:"python",python3:"python",sh:"bash",shell:"bash",zsh:"bash",ps:"powershell",ps1:"powershell",pwsh:"powershell",xml:"html",htm:"html",markdown:"md",mkd:"md"};
  var L=AL[lang]||lang;

  if(L==="html"){
    return scan(src,/(<!--[\s\S]*?-->)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(<\/?[a-zA-Z][\w:-]*|\/?>)|([a-zA-Z_:][\w:.-]*)(?=\s*=)/g,
      function(m){return m[1]!==undefined?"com":m[2]!==undefined?"str":m[3]!==undefined?"kw":"fn";});
  }
  if(L==="css"||L==="scss"){
    var cRE=L==="scss"?"\\/\\*[\\s\\S]*?\\*\\/|\\/\\/[^\\n]*":"\\/\\*[\\s\\S]*?\\*\\/";
    var RE=new RegExp("("+cRE+")|(\"(?:\\\\.|[^\"\\\\])*\"|'(?:\\\\.|[^'\\\\])*')|(#[0-9a-fA-F]{3,8}\\b|\\b\\d[\\d.]*(?:px|em|rem|%|vh|vw|vmin|vmax|pt|s|ms|deg|fr|ch|ex)?\\b)|(@[\\w-]+|\\$[\\w-]+|--[\\w-]+|![a-z]+)|([a-zA-Z-][\\w-]*)(?=\\s*:)","g");
    return scan(src,RE,function(m){return m[1]!==undefined?"com":m[2]!==undefined?"str":m[3]!==undefined?"num":m[4]!==undefined?"kw":"fn";});
  }
  if(L==="md"){
    var lines=src.split("\n"),o=[];
    var inl=function(t){return scan(t,/(`[^`]+`)|(\*\*[^*]+\*\*|__[^_]+__)|(\*[^*\n]+\*|_[^_\n]+_)|(\[[^\]]+\]\([^)]+\))/g,
      function(m){return m[1]!==undefined?"str":m[2]!==undefined?"kw":m[3]!==undefined?"lit":"fn";});};
    for(var i=0;i<lines.length;i++){var ln=lines[i];
      if(/^\s{0,3}#{1,6}\s/.test(ln)){o.push(W("kw",ln));}
      else if(/^\s{0,3}>/.test(ln)){o.push(W("com",ln));}
      else if(/^\s{0,3}(```|~~~)/.test(ln)){o.push(W("kw",ln));}
      else{var mm=ln.match(/^(\s{0,3})([-*+]|\d+\.)(\s.*)$/);
        if(mm){o.push(E(mm[1])+W("kw",mm[2])+inl(mm[3]));}else{o.push(inl(ln));}}
    }
    return o.join("\n");
  }

  var K={
    js:"abstract async await break case catch class const continue debugger default delete do else export extends finally for from function get if implements import in instanceof interface let new of package private protected public return set static super switch this throw try typeof var void while with yield",
    ts:"abstract as async await break case catch class const continue declare default delete do else enum export extends finally for from function get if implements import in infer instanceof interface keyof let namespace new of private protected public readonly return set static super switch this throw try type typeof var void while yield",
    c:"auto break case char const continue default do double else enum extern float for goto if inline int long register return short signed sizeof static struct switch typedef union unsigned void volatile while include define ifdef ifndef endif pragma undef",
    cpp:"auto bool break case catch char class const constexpr continue default delete do double else enum explicit extern float for friend goto if inline int long namespace new nullptr operator override private protected public register return short signed sizeof static struct switch template this throw try typedef typename union unsigned using virtual void volatile while include define",
    cs:"abstract as base bool break byte case catch char checked class const continue decimal default delegate do double else enum event explicit extern finally fixed float for foreach get goto if implicit in int interface internal is lock long namespace new object operator out override params private protected public readonly ref return sbyte sealed set short sizeof static string struct switch this throw try typeof uint ulong unchecked unsafe ushort using var virtual void volatile while async await yield",
    php:"abstract and array as break callable case catch class clone const continue declare default do echo else elseif empty endif extends final finally fn for foreach function global goto if implements include include_once instanceof insteadof interface isset list namespace new or print private protected public require require_once return static switch throw trait try unset use var while xor yield",
    python:"and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield match case",
    bash:"if then else elif fi case esac for while until do done in function select time echo cd export local return read source alias unset shift eval exec set",
    powershell:"if elseif else switch foreach for while do until break continue function return param begin process end try catch finally throw class enum filter in trap exit",
    sql:"select from where insert into values update set delete create table drop alter add column index view join inner left right outer full on group by order having limit offset union all as distinct and or not null is in like between exists case when then else end primary key foreign references default constraint unique",
    json:""
  };
  var LN={js:["//"],ts:["//"],c:["//"],cpp:["//"],cs:["//"],php:["//","#"],python:["#"],bash:["#"],powershell:["#"],sql:["--"],json:[]};
  var BL={js:1,ts:1,c:1,cpp:1,cs:1,php:1,sql:1},TPL={js:1,ts:1},TRIPLE={python:1};
  if(!(L in K))L="js";
  function q(s){return s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");}
  var g=[],com=[];
  if(BL[L])com.push("\\/\\*[\\s\\S]*?\\*\\/");
  if(L==="powershell")com.push("<#[\\s\\S]*?#>");
  (LN[L]||[]).forEach(function(x){com.push(q(x)+"[^\\n]*");});
  g.push(com.length?com.join("|"):"(?!)");
  var st=[];
  if(TRIPLE[L]){st.push('"""[\\s\\S]*?"""',"'''[\\s\\S]*?'''");}
  st.push('"(?:\\\\.|[^"\\\\])*"',"'(?:\\\\.|[^'\\\\])*'");
  if(TPL[L])st.push("`(?:\\\\.|[^`\\\\])*`");
  g.push(st.join("|"));
  g.push("0[xX][\\da-fA-F]+|\\b\\d[\\d_]*(?:\\.\\d+)?(?:[eE][+-]?\\d+)?\\b");
  var kw=(K[L]||"").trim();
  g.push(kw?"\\b(?:"+kw.split(/\s+/).map(q).join("|")+")\\b":"(?!)");
  g.push("\\b(?:true|false|null|undefined|None|True|False|nil|NaN|NULL)\\b");
  g.push("[A-Za-z_$][\\w$]*(?=\\s*\\()");
  var RE2=new RegExp(g.map(function(x){return "("+x+")";}).join("|"),"g"+(L==="sql"?"i":""));
  return scan(src,RE2,function(m){return m[1]!==undefined?"com":m[2]!==undefined?"str":m[3]!==undefined?"num":m[4]!==undefined?"kw":m[5]!==undefined?"lit":"fn";});
}
function buildSource(text){
var fm=parseFrontmatter(text),meta=fm.meta;var srcmd=fixLooseLists(fm.body);
var title=meta.title||meta["제목"]||"";if(title)srcmd=srcmd.replace(/^\s*#\s+.*\n/,"");
marked.setOptions({gfm:true,breaks:false});
/* 삭선은 겹물결(~~)일 때만. 홑물결(~)은 범위표기(예:166~169)로 보고 그대로 둠 */
if(!marked.__delFix){marked.__delFix=1;marked.use({tokenizer:{del(src){var m=/^~~(?=\S)([\s\S]*?\S)~~/.exec(src);if(m){return {type:"del",raw:m[0],text:m[1],tokens:this.lexer.inlineTokens(m[1])};}if(src.charCodeAt(0)===126){return {type:"text",raw:"~",text:"~"};}return false;}}});}
var src=document.getElementById("src");
src.innerHTML=buildCover(meta)+"<div class='content'>"+marked.parse(srcmd)+"</div>";
src.querySelectorAll(".content h2, .content h3").forEach(function(h){var m=h.innerHTML.match(/^([A-Z])[.)·]?\s+([\s\S]*)$/);if(m)h.innerHTML="<span class='sn'>"+m[1]+"</span>"+m[2];});
src.querySelectorAll("code.language-mermaid").forEach(function(c){var pre=c.closest("pre")||c;var kind=window.DIAG?DIAG.detectKind(c.textContent):null;var fig=document.createElement("figure");if(kind){fig.innerHTML=DIAG.render(kind,c.textContent);}else{var type=(c.textContent.trim().split(/\s+/)[0]||"diagram");var box=document.createElement("div");box.className="diag-unsupported";var ti=document.createElement("div");ti.className="du-title";ti.textContent="지원하지 않는 다이어그램: "+type+" (지원: flowchart · erDiagram · sequenceDiagram)";var pp=document.createElement("pre");pp.textContent=c.textContent;box.appendChild(ti);box.appendChild(pp);fig.appendChild(box);}pre.replaceWith(fig);});
/* 언어 지정 코드블록만 구문 강조(언어 없는 블록=예시는 단색 유지 → 예시/실제 구별됨). mermaid는 위에서 이미 처리됨 */
src.querySelectorAll("pre code[class*='language-']").forEach(function(c){var mm=(c.className||"").match(/language-([\w#+.-]+)/);c.innerHTML=hlCode(c.textContent,mm?mm[1]:"");});
var fixed={"상태":"6%","id":"7%","tier":"6%","심각도":"9%","담당":"8%"};
src.querySelectorAll(".content table").forEach(function(t){var ths=t.querySelectorAll("tr th");if(!ths.length)return;var cg=document.createElement("colgroup");ths.forEach(function(th){var h=th.textContent.trim().toLowerCase().replace(/\s+/g,"");var col=document.createElement("col");var w=null;if(h.indexOf("화면")>-1||h.indexOf("파일")>-1)w="26%";else if(fixed[h])w=fixed[h];if(w){col.style.width=w;th.style.width=w;}cg.appendChild(col);});t.insertBefore(cg,t.firstChild);});
/* 큰 표(>=6행)는 제목과 함께 다음 페이지에서 시작 → 페이지 하단에서 잘려 시작하는 것 방지 */
document.title=title||(window.__fname||"document");
return src;
}
function setHead(txt){var h=document.getElementById("pvHead");if(h)h.textContent=txt;}
function fallbackRender(src){var pages=document.getElementById("pages");pages.innerHTML="";
var d=document.createElement("div");d.className="fallback-doc";d.innerHTML=src.innerHTML;pages.appendChild(d);
setHead("연속 보기 (페이지 분할 미리보기를 사용할 수 없습니다)");}
function repeatTableHeaders(container){
  var last=null;
  container.querySelectorAll(".pagedjs_page table").forEach(function(t){
    var thead=t.querySelector(":scope > thead");
    var colg=t.querySelector(":scope > colgroup");
    if(thead){last={thead:thead,colg:colg};return;}
    if(last){
      if(last.colg && !colg){t.insertBefore(last.colg.cloneNode(true),t.firstChild);}
      var tb=t.querySelector(":scope > tbody");
      var h=last.thead.cloneNode(true);
      if(tb){t.insertBefore(h,tb);}else{t.appendChild(h);}
    }
  });
}
function applyWidowHeadingBreaks(src){
  var pages=document.getElementById("pages");
  var rh=pages.querySelectorAll(".pagedjs_page_content h2,.pagedjs_page_content h3,.pagedjs_page_content h4");
  var sh=src.querySelectorAll(".content h2,.content h3,.content h4");
  var changed=false;
  for(var i=0;i<rh.length && i<sh.length;i++){
    var h=rh[i];
    var box=h.closest(".pagedjs_pagebox")||h.closest(".pagedjs_page");
    if(!box)continue;
    var br=box.getBoundingClientRect(),hr=h.getBoundingClientRect();
    if(br.height<=0)continue;
    var contentBottom=br.bottom - br.height*(18/297);   // page bottom margin (18mm/297mm)
    var contentH=br.height*(261/297);                    // content area height
    var remaining=contentBottom - hr.top;                // space from heading top to content bottom
    if(remaining>0 && remaining < contentH*0.35){
      if(sh[i] && !sh[i].classList.contains("pb-before")){sh[i].classList.add("pb-before");changed=true;}
    }
  }
  return changed;
}
function paginate(src){
var pages=document.getElementById("pages");pages.innerHTML="";
var paper=document.createElement("div");paper.className="paper";paper.innerHTML=src.innerHTML;pages.appendChild(paper);
var head=document.getElementById("pvHead");
try{var r=document.createElement("div");r.style.cssText="position:absolute;left:-9999px;width:100mm;height:10mm;";document.body.appendChild(r);var pxmm=r.offsetWidth/100;document.body.removeChild(r);var pc=(297-36)*pxmm;var n=(pc>0&&paper.scrollHeight>0)?Math.max(1,Math.ceil(paper.scrollHeight/pc)):0;if(head)head.textContent=n?("미리보기 · 약 "+n+"페이지 (저장/인쇄 시 자동 페이지 분할)"):"미리보기 (저장/인쇄 시 자동 페이지 분할)";}catch(e){if(head)head.textContent="미리보기";}
document.getElementById("viewer").scrollTop=0;
}
function runPaged(src,pass){
  var pages=document.getElementById("pages");pages.innerHTML="";
  if(!window.PagedModule||!window.PagedModule.Previewer){fallbackRender(src);return;}
  var blobUrl=null;try{blobUrl=URL.createObjectURL(new Blob([PAGED_CSS],{type:"text/css"}));}catch(e){}
  try{
    var prev=new window.PagedModule.Previewer();
    prev.preview("<style>"+PAGED_CSS+"</style>"+src.innerHTML, blobUrl?[blobUrl]:[], pages).then(function(flow){
      repeatTableHeaders(pages);
      if(typeof applyFooter==="function")applyFooter();
      var n=pages.querySelectorAll(".pagedjs_page").length||((flow&&flow.total)||0);
      setHead("Total "+n+" page"+(n>1?"s":""));
      document.getElementById("viewer").scrollTop=0;
      
    }).catch(function(err){console.error(err);fallbackRender(src);});
  }catch(e){console.error(e);fallbackRender(src);}
}
function renderMarkdown(text){
window.__lastText=text;
document.getElementById("raw").innerHTML=hlMd(text);
var src=buildSource(text);
document.body.classList.add("loaded");
document.getElementById("editor").scrollTop=0;
setHead("페이지 분할 중...");
runPaged(src);
}
function loadFile(file){window.__lastFile=file;window.__fname=(file.name||"document").replace(/\.(md|markdown|txt)$/i,"");
var r=new FileReader();r.onload=function(e){renderMarkdown(e.target.result);};r.readAsText(file,"utf-8");}
document.getElementById("fileInput").addEventListener("change",function(e){if(e.target.files[0])loadFile(e.target.files[0]);});
document.getElementById("btnOpen").addEventListener("click",function(){document.getElementById("fileInput").click();});
/* ---- 색상 테마 팔레트 (UI + 문서 + PDF 산출물 공통, CSS 변수로 라이브 반영) ---- */
var THEMES=[
  {n:"로열 퍼플",b:"#4c1d95",a:"#7c3aed"},
  {n:"오션 틸",b:"#0f4c5c",a:"#0891b2"},
  {n:"포레스트",b:"#14532d",a:"#16a34a"},
  {n:"버건디",b:"#7f1d1d",a:"#dc2626"},
  {n:"네이비",b:"#1e3a5f",a:"#2563eb"},
  {n:"차콜 오렌지",b:"#1f2937",a:"#ea580c"},
  {n:"인디고 로즈",b:"#312e81",a:"#e11d48"},
  {n:"브론즈 골드",b:"#713f12",a:"#d97706"}
];
/* 설정 저장 게이트: '선택한 설정 기억하기'(md2pdf_remember)에 따라 저장/삭제 중앙 관리. 다크모드(md2pdf_ui_mode)는 미등록=항상 저장(독립) */
window.MD2R=(function(){var K="md2pdf_remember",regs=[];function on(){try{var v=localStorage.getItem(K);return v===null?true:v==="1";}catch(e){return true;}}return{on:on,save:function(k,v){if(on()){try{localStorage.setItem(k,v);}catch(e){}}},register:function(resave,keys){regs.push({resave:resave,keys:keys});},setOn:function(v){try{localStorage.setItem(K,v?"1":"0");}catch(e){}if(v){regs.forEach(function(r){try{r.resave();}catch(e){}});}else{regs.forEach(function(r){r.keys.forEach(function(k){try{localStorage.removeItem(k);}catch(e){}});});}}};})();
(function(){
  var trigger=document.getElementById("btnTheme"),modal=document.getElementById("themeModal"),grid=document.getElementById("tm-grid");
  if(!trigger||!modal||!grid)return;
  var customRow=document.getElementById("tmCustom"),colorInput=document.getElementById("tmColor"),hexOut=document.getElementById("tmHex"),applyBtn=document.getElementById("tmApply"),tmSw=document.getElementById("tmSw"),rememberInput=document.getElementById("tmRemember");
  var R=document.documentElement.style;
  var committed={mode:"preset",i:0,hex:null};  /* 현재 화면에 적용된 테마 */
  var pendingHex=null;                          /* 피커에서 고른, 아직 미적용 색 */
  var remember=true;                            /* 테마 기억(localStorage) 사용 여부 */
  function hexToRgb(h){h=(h||"").replace("#","");if(h.length===3)h=h.split("").map(function(c){return c+c;}).join("");return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];}
  function toHex(r,g,b){return "#"+[r,g,b].map(function(x){return ("0"+Math.max(0,Math.min(255,Math.round(x))).toString(16)).slice(-2);}).join("");}
  function relLum(r,g,b){var a=[r,g,b].map(function(v){v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);});return 0.2126*a[0]+0.7152*a[1]+0.0722*a[2];}
  function setVars(brand,accent){R.setProperty("--brand",brand);R.setProperty("--accent",accent);var a=hexToRgb(accent);R.setProperty("--on-accent",relLum(a[0],a[1],a[2])>0.6?"#1f2937":"#ffffff");}
  function darkOf(hex){var c=hexToRgb(hex);return toHex(c[0]*0.45,c[1]*0.45,c[2]*0.45);}
  function updateSw(){if(!tmSw||!colorInput)return;var a=colorInput.value;tmSw.style.background="linear-gradient(135deg,"+darkOf(a)+" 0 50%,"+a+" 50%)";} /* 진한색 절반 + 강조색 절반 미리보기 */
  function mark(){
    Array.prototype.forEach.call(grid.children,function(c,j){c.classList.toggle("active",committed.mode==="preset"&&j===committed.i);});
    if(customRow)customRow.classList.toggle("active",committed.mode==="custom");
  }
  function applyState(s){ /* 실제 화면(문서/PDF)에 반영 */
    if(s.mode==="custom"&&/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(s.hex||"")){
      var c=hexToRgb(s.hex);
      setVars(toHex(c[0]*0.45,c[1]*0.45,c[2]*0.45),s.hex); /* 강조색을 어둡게 파생 → 진한색(흰 글씨 안전) */
    }else{
      var t=THEMES[s.i]||THEMES[0];setVars(t.b,t.a);
    }
  }
  function persist(s){if(!remember)return;try{if(s.mode==="custom"){localStorage.setItem("md2pdf_theme","custom");localStorage.setItem("md2pdf_custom",s.hex);}else{localStorage.setItem("md2pdf_theme",String(s.i));localStorage.removeItem("md2pdf_custom");}}catch(e){}}
  function commit(s){committed=s;applyState(s);persist(s);mark();}  /* 화면 반영 + 저장 */
  function syncPicker(){ /* 모달 열 때: 피커/라벨만 현재 확정색으로 동기화(화면 미변경) */
    var hex=committed.mode==="custom"?committed.hex:((THEMES[committed.i]||THEMES[0]).a);
    pendingHex=committed.mode==="custom"?committed.hex:null;
    if(colorInput)colorInput.value=hex;
    if(hexOut)hexOut.textContent=hex.toUpperCase();
    updateSw();
  }
  function openModal(){syncPicker();mark();modal.hidden=false;var r=trigger.getBoundingClientRect();var w=modal.offsetWidth||300;var left=Math.max(8,Math.min(r.left,window.innerWidth-w-8));modal.style.top=(r.bottom+6)+"px";modal.style.left=left+"px";}
  function closeModal(){modal.hidden=true;}
  /* 프리셋: 클릭 즉시 적용+저장+닫기 */
  THEMES.forEach(function(t,i){
    var btn=document.createElement("button");btn.type="button";
    btn.innerHTML="<span class='sw' style=\"background:linear-gradient(135deg,"+t.b+" 0 50%,"+t.a+" 50%)\"></span><span>"+t.n+"</span>";
    btn.addEventListener("click",function(){commit({mode:"preset",i:i,hex:null});});
    grid.appendChild(btn);
  });
  /* 커스텀: 색 선택은 라벨/스와치만 갱신(화면 미적용). [적용]을 눌러야 그때 화면 반영+닫기 */
  if(colorInput){
    var onPick=function(){pendingHex=colorInput.value;if(hexOut)hexOut.textContent=colorInput.value.toUpperCase();updateSw();};
    colorInput.addEventListener("input",onPick);
    colorInput.addEventListener("change",onPick);
  }
  if(applyBtn)applyBtn.addEventListener("click",function(){
    var hex=pendingHex||(colorInput?colorInput.value:null);
    if(!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex||""))return;
    commit({mode:"custom",i:committed.i,hex:hex});
  });
  trigger.addEventListener("click",function(e){e.stopPropagation();modal.hidden?openModal():closeModal();});
  document.addEventListener("click",function(e){if(!modal.hidden&&!modal.contains(e.target)&&e.target!==trigger&&!trigger.contains(e.target))closeModal();});
  var tmClose=document.getElementById("tmClose");if(tmClose)tmClose.addEventListener("click",closeModal);
  document.addEventListener("keydown",function(e){if(e.key==="Escape"&&!modal.hidden)closeModal();});
  /* 초기 로드: 저장된 테마를 화면에 적용 */
  var rememberSaved=null;try{rememberSaved=localStorage.getItem("md2pdf_remember");}catch(e){}
  remember=rememberSaved===null?true:rememberSaved==="1";  /* 기본 ON */
  if(rememberInput)rememberInput.checked=remember;
  var st=null,sc=null;if(remember){try{st=localStorage.getItem("md2pdf_theme");sc=localStorage.getItem("md2pdf_custom");}catch(e){}}
  if(remember&&st==="custom"&&sc)committed={mode:"custom",i:0,hex:sc};
  else if(remember&&st!==null&&THEMES[+st])committed={mode:"preset",i:+st,hex:null};
  else committed={mode:"preset",i:0,hex:null};  /* 저장 없음 또는 기억 OFF → 네이비 */
  applyState(committed);mark();
  if(rememberInput)rememberInput.addEventListener("change",function(){
    remember=rememberInput.checked;
    try{localStorage.setItem("md2pdf_remember",remember?"1":"0");}catch(e){}
    MD2R.setOn(remember);                                   /* 폰트/크기/푸터: ON=일괄 저장, OFF=삭제 */
    if(remember){persist(committed);}                       /* 켜면 현재 테마 저장 */
    else{try{localStorage.removeItem("md2pdf_theme");localStorage.removeItem("md2pdf_custom");}catch(e){}} /* 끄면 저장 삭제 → 다음엔 네이비 */
  });
})();

document.getElementById("btnPrint").addEventListener("click",function(){if(!document.body.classList.contains("loaded")){alert("변환된 내용이 없습니다. 먼저 MD 파일을 불러오세요.");return;}window.print();});
document.getElementById("btnReset").addEventListener("click",function(){document.body.classList.remove("loaded");var el;if(el=document.getElementById("pages"))el.innerHTML="";if(el=document.getElementById("raw"))el.innerHTML="";if(el=document.getElementById("src"))el.innerHTML="";if(el=document.getElementById("pvHead"))el.textContent="Total 0 pages";if(el=document.getElementById("fileInput"))el.value="";window.__lastText="";if(el=document.getElementById("viewer"))el.scrollTop=0;});
/* MD 원본/미리보기 리사이즈 핸들 + 가운데 접기/펼치기 */
(function(){var main=document.getElementById("main"),editor=document.getElementById("editor"),sp=document.getElementById("splitter"),fb=document.getElementById("foldBtn");if(!main||!editor||!sp||!fb)return;var ico=fb.querySelector(".fold-ico"),lastBasis="42%",dragging=false;
function setIco(){ico.textContent=document.body.classList.contains("editor-collapsed")?"›":"‹";}
fb.addEventListener("mousedown",function(e){e.stopPropagation();});
fb.addEventListener("click",function(e){e.stopPropagation();var c=document.body.classList.toggle("editor-collapsed");if(!c)editor.style.flex="0 0 "+lastBasis;setIco();});
sp.addEventListener("mousedown",function(e){if(e.target===fb||fb.contains(e.target))return;dragging=true;document.body.style.userSelect="none";document.body.style.cursor="col-resize";if(document.body.classList.contains("editor-collapsed")){document.body.classList.remove("editor-collapsed");setIco();}e.preventDefault();});
window.addEventListener("mousemove",function(e){if(!dragging)return;var r=main.getBoundingClientRect();var w=e.clientX-r.left;w=Math.max(180,Math.min(r.width-260,w));editor.style.flex="0 0 "+w+"px";lastBasis=w+"px";});
window.addEventListener("mouseup",function(){if(dragging){dragging=false;document.body.style.userSelect="";document.body.style.cursor="";}});
setIco();})();
/* 브라우저 기본 파일열기 차단(전역). 실제 로드는 점선 박스 안에서만 유효 */
["dragover","drop"].forEach(function(ev){document.addEventListener(ev,function(e){e.preventDefault();});});
(function(){var box=document.querySelector(".drop-box");if(!box)return;
["dragenter","dragover"].forEach(function(ev){box.addEventListener(ev,function(e){e.preventDefault();e.stopPropagation();document.body.classList.add("drag");});});
box.addEventListener("dragleave",function(e){if(!box.contains(e.relatedTarget))document.body.classList.remove("drag");});
box.addEventListener("drop",function(e){e.preventDefault();e.stopPropagation();document.body.classList.remove("drag");var f=e.dataTransfer.files[0];if(f)loadFile(f);});
})();
