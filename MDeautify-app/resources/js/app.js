
function esc(s){return String(s).replace(/[&<>]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c];});}
function hlMd(t){var e=esc(t);
/* 각 줄을 .ln[data-ln] 로 감싸 스크롤 동기화(방식 B)에서 줄별 Y좌표를 측정 가능하게 함.
   인라인 span이라 오버레이(투명 textarea) 정합에는 영향 없음. */
return e.split("\n").map(function(line,i){var l=line;
if(/^\s{0,3}#{1,6}\s/.test(line))l='<span class="mh">'+l+'</span>';
else if(/^\s{0,3}&gt;/.test(l))l='<span class="mq">'+l+'</span>';
else{
l=l.replace(/^(\s*)([-*+]|\d+\.)(\s)/,'$1<span class="ml">$2</span>$3');
l=l.replace(/(`[^`]+`)/g,'<span class="mc">$1</span>');
l=l.replace(/(\*\*[^*]+\*\*)/g,'<span class="mb">$1</span>');
l=l.replace(/(\[[^\]]+\]\([^)]+\))/g,'<span class="mlk">$1</span>');
}
return '<span class="ln" data-ln="'+i+'">'+l+'</span>';}).join("\n");}
function fixLooseLists(t){var lines=t.split("\n"),out=[];var isItem=function(s){return /^\s*([-*+]|\d+\.)\s+/.test(s);};
for(var i=0;i<lines.length;i++){if(isItem(lines[i])){var p=out.length?out[out.length-1]:"";if(p.trim()&&!isItem(p))out.push("");}out.push(lines[i]);}return out.join("\n");}
/* fixLooseLists 와 동일하되, 결과 각 줄이 원본(body) 몇 번째 줄에서 왔는지 map 을 함께 반환.
   삽입된 빈 줄은 -1. 스크롤 동기화(방식 B)에서 토큰 줄번호→원본 줄번호 역변환에 사용. */
function fixLooseListsM(t){var lines=t.split("\n"),out=[],map=[];var isItem=function(s){return /^\s*([-*+]|\d+\.)\s+/.test(s);};
for(var i=0;i<lines.length;i++){if(isItem(lines[i])){var p=out.length?out[out.length-1]:"";if(p.trim()&&!isItem(p)){out.push("");map.push(-1);}}out.push(lines[i]);map.push(i);}return {text:out.join("\n"),map:map};}
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
var fm=parseFrontmatter(text),meta=fm.meta;
var F=text.slice(0,text.length-fm.body.length).split("\n").length-1;   /* frontmatter 줄 수 = 본문 첫 줄의 전체문서 줄 index */
var fll=fixLooseListsM(fm.body);var srcmd=fll.text;var dedup=0;         /* fll.map: srcmd(느슨목록 보정본) 줄 → body 줄 */
/* 표지 제목과 '동일한' 본문 첫 H1만 중복으로 보고 제거(내용이 다른 H1은 그대로 살림) */
var title=meta.title||meta["제목"]||"";if(title)srcmd=srcmd.replace(/^\s*#\s+(.*)\r?\n/,function(m,h){if(h.trim()===title.trim()){dedup=1;return "";}return m;});
marked.setOptions({gfm:true,breaks:false});
/* 삭선은 겹물결(~~)일 때만. 홑물결(~)은 범위표기(예:166~169)로 보고 그대로 둠 */
if(!marked.__delFix){marked.__delFix=1;marked.use({tokenizer:{del(src){var m=/^~~(?=\S)([\s\S]*?\S)~~/.exec(src);if(m){return {type:"del",raw:m[0],text:m[1],tokens:this.lexer.inlineTokens(m[1])};}if(src.charCodeAt(0)===126){return {type:"text",raw:"~",text:"~"};}return false;}}});}
/* 아래 이미지 전처리는 코드블록(``` / ~~~, 백틱 개수 무관)·인라인 코드 '밖'에서만 수행
   → 안내서의 '문법 예시'가 실제로 변환돼 버리는 것 방지. 줄 수는 그대로 유지. */
function outsideCode(text,fn){
  var lines=text.split("\n"),out=[],fence=null;
  for(var li=0;li<lines.length;li++){var ln=lines[li],fm=ln.match(/^\s*(`{3,}|~{3,})/);
    if(fence){out.push(ln);if(fm&&fm[1].charAt(0)===fence.ch&&fm[1].length>=fence.len&&/^\s*(`{3,}|~{3,})\s*$/.test(ln))fence=null;continue;}
    if(fm){fence={ch:fm[1].charAt(0),len:fm[1].length};out.push(ln);continue;}
    out.push(ln.split(/(`+[^`]*`+)/g).map(function(seg,i){return i%2?seg:fn(seg);}).join(""));  /* 인라인 코드 밖만 */
  }
  return out.join("\n");
}
srcmd=outsideCode(srcmd,function(s){
  /* 이미지 크기 단축 문법(marked 미지원): ![alt](src =300x200)·=300x·=x200·=50%·=300 → <img>. */
  s=s.replace(/!\[([^\]]*)\]\(\s*([^()]*(?:\([^)]*\)[^()]*)*?)\s+=\s*(\d+x\d+|\d+x|x\d+|\d+%|\d+)\s*\)/g,function(m,alt,dest,sz){
    var d=dest.replace(/^<|>$/g,"").trim();if(!d||/["']/.test(d))return m;
    var a;
    if(/^\d+x\d+$/.test(sz)){var p=sz.split("x");a=' width="'+p[0]+'" height="'+p[1]+'"';}
    else if(/^\d+x$/.test(sz))a=' width="'+sz.slice(0,-1)+'"';
    else if(/^x\d+$/.test(sz))a=' height="'+sz.slice(1)+'"';
    else if(/^\d+%$/.test(sz))a=' style="width:'+sz.slice(0,-1)+'%"';
    else a=' width="'+sz+'"';
    function ea(x){return String(x).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}
    return '<img src="'+ea(d)+'" alt="'+ea(alt)+'"'+a+'>';
  });
  /* 공백 포함 경로(예: 미디어 (3).jpg)는 marked가 인식하도록 <>로 감쌈(줄 수 유지). */
  s=s.replace(/!\[([^\]]*)\]\(\s*([^()]*(?:\([^)]*\)[^()]*)*)\s*\)/g,function(m,alt,dest){if(!dest||dest.charAt(0)==="<")return m;if(/["']/.test(dest))return m;if(!/\s/.test(dest))return m;return "!["+alt+"](<"+dest.trim()+">)";});
  return s;
});
var src=document.getElementById("src");
src.innerHTML=buildCover(meta)+"<div class='content'>"+marked.parse(srcmd)+"</div>";
/* 링크는 새 탭/새 창으로 열기 */
src.querySelectorAll(".content a[href]").forEach(function(a){a.setAttribute("target","_blank");a.setAttribute("rel","noopener noreferrer");});
src.querySelectorAll(".content h1, .content h2, .content h3").forEach(function(h){var m=h.innerHTML.match(/^([A-Z])[.)·]?\s+([\s\S]*)$/);if(m)h.innerHTML="<span class='sn'>"+m[1]+"</span>"+m[2];});
src.querySelectorAll("code.language-mermaid").forEach(function(c){var pre=c.closest("pre")||c;var kind=window.DIAG?DIAG.detectKind(c.textContent):null;var fig=document.createElement("figure");if(kind){fig.innerHTML=DIAG.render(kind,c.textContent);}else{var type=(c.textContent.trim().split(/\s+/)[0]||"diagram");var box=document.createElement("div");box.className="diag-unsupported";var ti=document.createElement("div");ti.className="du-title";ti.textContent="지원하지 않는 다이어그램: "+type+" (지원: flowchart · erDiagram · sequenceDiagram)";var pp=document.createElement("pre");pp.textContent=c.textContent;box.appendChild(ti);box.appendChild(pp);fig.appendChild(box);}pre.replaceWith(fig);});
/* 언어 지정 코드블록만 구문 강조(언어 없는 블록=예시는 단색 유지 → 예시/실제 구별됨). mermaid는 위에서 이미 처리됨 */
src.querySelectorAll("pre code[class*='language-']").forEach(function(c){var mm=(c.className||"").match(/language-([\w#+.-]+)/);c.innerHTML=hlCode(c.textContent,mm?mm[1]:"");});
var fixed={"상태":"6%","id":"7%","tier":"6%","심각도":"9%","담당":"8%"};
src.querySelectorAll(".content table").forEach(function(t){var ths=t.querySelectorAll("tr th");if(!ths.length)return;var cg=document.createElement("colgroup");ths.forEach(function(th){var h=th.textContent.trim().toLowerCase().replace(/\s+/g,"");var col=document.createElement("col");var w=null;if(h.indexOf("화면")>-1||h.indexOf("파일")>-1)w="26%";else if(fixed[h])w=fixed[h];if(w){col.style.width=w;th.style.width=w;}cg.appendChild(col);});t.insertBefore(cg,t.firstChild);});
/* 큰 표(>=6행)는 제목과 함께 다음 페이지에서 시작 → 페이지 하단에서 잘려 시작하는 것 방지 */
document.title=title||(window.__fname||"document");
/* 스크롤 동기화(방식 B): 최상위 블록마다 원본 줄번호를 data-sl 로 태깅.
   marked 토큰의 누적 줄수로 각 블록의 srcmd 줄을 구하고 → dedup/fll.map/F 로 전체문서 줄로 역변환.
   렌더 미출력 토큰(space/def)은 DOM 자식과 1:1 대응에서 제외. */
try{
  var toks=marked.lexer(srcmd);
  var nl=function(s){return (s.match(/\n/g)||[]).length;};
  /* srcmd(최종) 줄 → 전체문서 줄 역변환(dedup/fll.map/F) */
  var toEd=function(fl){var a=fl+dedup,bl=fll.map[a],j=a;while((bl==null||bl<0)&&j<fll.map.length-1){j++;bl=fll.map[j];}return F+((bl==null||bl<0)?0:bl);};
  var info=[],cum=0;
  for(var ti=0;ti<toks.length;ti++){var tk=toks[ti];if(tk.type!=="space"&&tk.type!=="def")info.push({tok:tk,fl:cum});cum+=nl(tk.raw);}
  var blks=src.querySelectorAll(".content > *");
  for(var bi=0;bi<blks.length&&bi<info.length;bi++){
    var el=blks[bi],tk=info[bi].tok,fl=info[bi].fl;
    el.setAttribute("data-sl",toEd(fl));
    /* 세부 앵커(#2): 큰 블록 내부 드리프트 감소 — 목록 항목/표 행에도 원본 줄 태깅.
       동기화 로직은 그대로(어떤 [data-sl] 든 앵커로 사용), 태깅만 세분화. */
    if(tk.type==="list"&&tk.items){
      var lis=el.children,lc=fl,li=0;
      for(var ii=0;ii<tk.items.length;ii++){
        while(li<lis.length&&lis[li].tagName!=="LI")li++;
        if(li<lis.length){lis[li].setAttribute("data-sl",toEd(lc));li++;}
        lc+=nl(tk.items[ii].raw);
      }
    }else if(tk.type==="table"){
      var trs=el.querySelectorAll("tr");   /* 0=머리행(fl), 데이터행 r=fl+1(구분선)+r */
      for(var ri=0;ri<trs.length;ri++)trs[ri].setAttribute("data-sl",toEd(fl+(ri===0?0:ri+1)));
    }
  }
}catch(e){}
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
function runPaged(src,keepScroll){
  var pages=document.getElementById("pages");
  var viewer=document.getElementById("viewer");
  var vMax=viewer.scrollHeight-viewer.clientHeight;
  var ratio=(keepScroll&&vMax>0)?viewer.scrollTop/vMax:0;
  function restore(){var m=viewer.scrollHeight-viewer.clientHeight;viewer.scrollTop=keepScroll?ratio*m:0;}
  pages.innerHTML="";
  if(!window.PagedModule||!window.PagedModule.Previewer){fallbackRender(src);restore();return;}
  var blobUrl=null;try{blobUrl=URL.createObjectURL(new Blob([PAGED_CSS],{type:"text/css"}));}catch(e){}
  try{
    var prev=new window.PagedModule.Previewer();
    prev.preview("<style>"+PAGED_CSS+"</style>"+src.innerHTML, blobUrl?[blobUrl]:[], pages).then(function(flow){
      repeatTableHeaders(pages);
      if(typeof applyFooter==="function")applyFooter();
      var n=pages.querySelectorAll(".pagedjs_page").length||((flow&&flow.total)||0);
      setHead("Total "+n+" page"+(n>1?"s":""));
      restore();
    }).catch(function(err){console.error(err);fallbackRender(src);restore();});
  }catch(e){console.error(e);fallbackRender(src);restore();}
}
/* 미리보기만 재생성(에디터 내용은 건드리지 않음). keepScroll=true면 뷰어 스크롤 위치 유지(편집 중 튐 방지) */
async function renderPreview(text,keepScroll){
window.__lastText=text;
var src=buildSource(text);
document.body.classList.add("loaded");
setHead("페이지 분할 중...");
/* EXE(Neutralino)에서 로컬 이미지 경로(![](example.png))를 .md 폴더 기준으로 읽어 data URI로 치환. 브라우저에선 훅 없음. */
if(typeof window.__resolveLocalImages==="function"){try{await window.__resolveLocalImages(src);}catch(e){}}
runPaged(src,keepScroll);
}
/* 파일 로드 등: 에디터(textarea+미러)에 내용을 채우고 미리보기도 처음부터 생성 */
function renderMarkdown(text){
var ta=document.getElementById("rawInput");if(ta){ta.value=text;ta.scrollTop=0;}
var mirror=document.getElementById("raw");if(mirror){mirror.innerHTML=hlMd(text);mirror.scrollTop=0;}
renderPreview(text,false);
}
function loadFile(file){window.__lastFile=file;window.__mdDir=null;window.__mdName=file.name||"document";window.__fname=(file.name||"document").replace(/\.(md|markdown|txt)$/i,"");
var r=new FileReader();r.onload=function(e){renderMarkdown(e.target.result);};r.readAsText(file,"utf-8");}
/* 이미 문서를 불러온 상태에서 '다른 MD'로 교체하기 전 확인(편집분 유실 경고). 문서가 없으면 바로 진행. */
window.__confirmReplaceDoc=async function(){
  if(!document.body.classList.contains("loaded"))return true;
  var msg="이미 불러온 MD가 있어요.\n편집한 내용은 저장되지 않을 수 있습니다.\n다른 파일을 여시겠어요?";
  if(window.__appConfirm){
    return await window.__appConfirm({title:"다른 파일 열기",message:msg,okText:"열기",cancelText:"취소"});
  }
  try{return window.confirm(msg);}catch(e){return true;}
};
document.getElementById("fileInput").addEventListener("change",function(e){if(e.target.files&&e.target.files.length){if(window.__ingestFiles)window.__ingestFiles(e.target.files);else loadFile(e.target.files[0]);}e.target.value="";});
document.getElementById("btnOpen").addEventListener("click",function(){if(window.__nativeOpen){window.__nativeOpen();return;}document.getElementById("fileInput").click();});
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
  /* 초기 로드: 저장된 테마를 화면에 적용 (settings-store 하이드레이션 후 재적용 대응) */
  function loadFromStore(){
    var rememberSaved=null;try{rememberSaved=localStorage.getItem("md2pdf_remember");}catch(e){}
    remember=rememberSaved===null?true:rememberSaved==="1";  /* 기본 ON */
    if(rememberInput)rememberInput.checked=remember;
    var st=null,sc=null;if(remember){try{st=localStorage.getItem("md2pdf_theme");sc=localStorage.getItem("md2pdf_custom");}catch(e){}}
    if(remember&&st==="custom"&&sc)committed={mode:"custom",i:0,hex:sc};
    else if(remember&&st!==null&&THEMES[+st])committed={mode:"preset",i:+st,hex:null};
    else committed={mode:"preset",i:0,hex:null};  /* 저장 없음 또는 기억 OFF → 네이비 */
    applyState(committed);mark();
  }
  loadFromStore();
  document.addEventListener("md2pdf:settings-hydrated",loadFromStore);
  if(rememberInput)rememberInput.addEventListener("change",function(){
    remember=rememberInput.checked;
    try{localStorage.setItem("md2pdf_remember",remember?"1":"0");}catch(e){}
    MD2R.setOn(remember);                                   /* 폰트/크기/푸터: ON=일괄 저장, OFF=삭제 */
    if(remember){persist(committed);}                       /* 켜면 현재 테마 저장 */
    else{try{localStorage.removeItem("md2pdf_theme");localStorage.removeItem("md2pdf_custom");}catch(e){}} /* 끄면 저장 삭제 → 다음엔 네이비 */
  });
})();

document.getElementById("btnPrint").addEventListener("click",function(){if(!document.body.classList.contains("loaded")){if(window.__appAlert)window.__appAlert("먼저 MD 파일을 불러오세요.","변환할 내용이 없어요");else alert("변환된 내용이 없습니다. 먼저 MD 파일을 불러오세요.");return;}window.print();});
/* 상단 'MD 파일 열기' — 파일 선택 창을 열어 다른 MD 파일 불러오기 */
var _btnOpenTop=document.getElementById("btnOpenTop");if(_btnOpenTop)_btnOpenTop.addEventListener("click",function(){if(window.__nativeOpen){window.__nativeOpen();return;}var fi=document.getElementById("fileInput");if(fi){fi.value="";fi.click();}});
/* MD 원본/미리보기 리사이즈 핸들 + 가운데 접기/펼치기 */
(function(){var main=document.getElementById("main"),editor=document.getElementById("editor"),sp=document.getElementById("splitter"),fb=document.getElementById("foldBtn");if(!main||!editor||!sp||!fb)return;var ico=fb.querySelector(".fold-ico"),lastBasis="42%",dragging=false;
function setIco(){ico.textContent=document.body.classList.contains("editor-collapsed")?"›":"‹";}
fb.addEventListener("mousedown",function(e){e.stopPropagation();});
fb.addEventListener("click",function(e){e.stopPropagation();var c=document.body.classList.toggle("editor-collapsed");if(!c)editor.style.flex="0 0 "+lastBasis;setIco();});
sp.addEventListener("mousedown",function(e){if(e.target===fb||fb.contains(e.target))return;dragging=true;document.body.style.userSelect="none";document.body.style.cursor="col-resize";if(document.body.classList.contains("editor-collapsed")){document.body.classList.remove("editor-collapsed");setIco();}e.preventDefault();});
window.addEventListener("mousemove",function(e){if(!dragging)return;var r=main.getBoundingClientRect();var w=e.clientX-r.left;w=Math.max(180,Math.min(r.width-260,w));editor.style.flex="0 0 "+w+"px";lastBasis=w+"px";});
window.addEventListener("mouseup",function(){if(dragging){dragging=false;document.body.style.userSelect="";document.body.style.cursor="";}});
setIco();})();
/* MD 원본 ↔ 미리보기 비율 스크롤 동기화. 한쪽의 스크롤 비율을 반대쪽에 반영.
   lockUntil: 프로그램적 스크롤이 되돌려 트리거하는 피드백 루프 차단(짧은 시간 창 동안 상호 이벤트 무시).
   페인트 스케줄(rAF)에 의존하지 않아 어떤 환경에서도 lock이 걸린 채 남지 않음.
   원본이 접혀 있으면(editor-collapsed) 동기화하지 않음. */
(function(){
  var rawInput=document.getElementById("rawInput"),mirror=document.getElementById("raw"),viewer=document.getElementById("viewer");
  if(!rawInput||!mirror||!viewer)return;
  var clock=(window.performance&&performance.now)?function(){return performance.now();}:function(){return +new Date();};
  var lockUntil=0,cache=null,ckey="";
  /* 앵커 = 렌더 블록마다 {ed:에디터 내 그 원본줄의 Y, vw:미리보기 내 그 블록의 Y}. 양 끝점(0,0)/(max,max) 추가.
     레이아웃이 바뀔 때만(페이지수·scrollHeight·폭 변화) 재계산해 캐시. */
  function build(){
    /* ed 는 미러 자신의 scrollTop 기준 콘텐츠 Y(스크롤 무관하게 안정) — rawInput 과 동일 레이아웃이라 ta.scrollTop 과 같은 좌표계 */
    var seen={},A=[],mr=mirror.getBoundingClientRect(),vr=viewer.getBoundingClientRect(),vs=viewer.scrollTop,rs=mirror.scrollTop;
    var bl=viewer.querySelectorAll("#pages [data-sl]");
    for(var i=0;i<bl.length;i++){var sl=+bl[i].getAttribute("data-sl");if(seen[sl])continue;
      var ln=mirror.querySelector('.ln[data-ln="'+sl+'"]');if(!ln)continue;
      var r=ln.getClientRects();if(!r.length)continue;
      seen[sl]=1;
      A.push({ed:r[0].top-mr.top+rs, vw:bl[i].getBoundingClientRect().top-vr.top+vs});
    }
    A.sort(function(a,b){return a.ed-b.ed;});
    var edMax=rawInput.scrollHeight-rawInput.clientHeight,vwMax=viewer.scrollHeight-viewer.clientHeight;
    A.unshift({ed:0,vw:0});
    A.push({ed:edMax,vw:vwMax});
    /* 스크롤 가능 범위로 클램프 + vw 단조 증가 강제(마지막 블록의 Y가 vwMax를 넘어 역전되는 끝자락 버그 방지) */
    for(var k=0;k<A.length;k++){A[k].ed=Math.max(0,Math.min(edMax,A[k].ed));A[k].vw=Math.max(0,Math.min(vwMax,A[k].vw));}
    for(var m=1;m<A.length;m++){if(A[m].vw<A[m-1].vw)A[m].vw=A[m-1].vw;}
    return A;
  }
  function anchors(){var k=viewer.querySelectorAll("#pages [data-sl]").length+"|"+rawInput.scrollHeight+"|"+viewer.scrollHeight+"|"+rawInput.clientWidth+"|"+viewer.clientHeight;if(k!==ckey){cache=build();ckey=k;}return cache;}
  function interp(A,fk,tk,v){for(var i=0;i<A.length-1;i++){var a=A[i],b=A[i+1];if(v>=a[fk]&&v<=b[fk]){var s=b[fk]-a[fk];return a[tk]+(s>0?(v-a[fk])/s:0)*(b[tk]-a[tk]);}}return v<=A[0][fk]?A[0][tk]:A[A.length-1][tk];}
  var pvHead=document.querySelector(".pv-head");
  function headH(){return pvHead?pvHead.offsetHeight:0;}  /* 뷰어 상단 스티키 헤더 높이 — 동기 대상이 이 밑에 가리지 않게 보정 */
  function linkFn(from,to,fk,tk){from.addEventListener("scroll",function(){if(clock()<lockUntil)return;if(document.body.classList.contains("editor-collapsed"))return;var A=anchors();if(!A||A.length<2)return;
    var h=headH();
    var q=(from===viewer)?from.scrollTop+h:from.scrollTop;   /* 뷰어가 소스면: 헤더에 가린 만큼 아래가 실제 보이는 상단 */
    var y=interp(A,fk,tk,q);if(y==null)return;
    if(to===viewer)y=y-h;                                    /* 뷰어가 대상이면: 헤더 바로 아래로 내려 가림 방지 */
    lockUntil=clock()+80;to.scrollTop=Math.max(0,y);
  });}
  linkFn(rawInput,viewer,"ed","vw");
  linkFn(viewer,rawInput,"vw","ed");
})();
/* 원본 직접 편집: 입력 시 색상 미러 갱신 + 적응형 디바운스로 미리보기 재생성(뷰어 위치 보존).
   textarea 스크롤 시 뒤의 색상 미러를 같은 위치로 이동시켜 글자 정합 유지. */
(function(){var ta=document.getElementById("rawInput"),mirror=document.getElementById("raw");if(!ta||!mirror)return;var t=null;
/* 편집 중엔 왼쪽 미러(색상 강조)만 즉시 갱신하고, 무거운 미리보기 재생성은 입력을 멈춘 뒤 3초 후 1회만 실행
   → 타이핑 중 오른쪽 미리보기가 자주 재분할되며 깜빡이던 문제 방지. */
var EDIT_DELAY=2000;
ta.addEventListener("input",function(){mirror.innerHTML=hlMd(ta.value);clearTimeout(t);t=setTimeout(function(){renderPreview(ta.value,true);},EDIT_DELAY);});
ta.addEventListener("scroll",function(){mirror.scrollTop=ta.scrollTop;mirror.scrollLeft=ta.scrollLeft;});})();
/* 이미지 붙여넣기/드롭 → data URI 로 임베드(방향①). 큰 이미지는 긴 변 기준 자동 다운스케일.
   100% 오프라인·경로 불필요·PDF에 그대로 embed. 편집기 커서 위치에 ![alt](data:...) 삽입. */
(function(){
  var ta=document.getElementById("rawInput"),editor=document.getElementById("editor");if(!ta||!editor)return;
  var MAXDIM=1280,QUAL=0.85;  /* 긴 변 최대 px(초과 시 축소) + WebP 품질 */
  function isImg(f){return !!(f&&f.type&&f.type.indexOf("image/")===0);}
  function altOf(f){var n=(f.name||"image").replace(/\.[a-z0-9]+$/i,"");return n||"image";}
  function insertText(txt){ta.focus();var ok=false;try{ok=document.execCommand("insertText",false,txt);}catch(e){}
    if(!ok){var s=ta.selectionStart,e=ta.selectionEnd,v=ta.value;ta.value=v.slice(0,s)+txt+v.slice(e);ta.selectionStart=ta.selectionEnd=s+txt.length;ta.dispatchEvent(new Event("input",{bubbles:true}));}}
  /* dataUrl → 다운스케일+WebP 재인코딩(투명도 지원, PNG/JPEG보다 작아 md/PDF 비대화 방지). SVG는 벡터 유지. Promise<dataUrl>. */
  function encode(dataUrl,mime){return new Promise(function(res){
    if(/^image\/svg/i.test(mime||"")){res(dataUrl);return;}
    var img=new Image();
    img.onload=function(){
      var w=img.naturalWidth||img.width,h=img.naturalHeight||img.height,scale=Math.min(1,MAXDIM/w,MAXDIM/h);
      var cw=Math.max(1,Math.round(w*scale)),ch=Math.max(1,Math.round(h*scale));
      var c=document.createElement("canvas");c.width=cw;c.height=ch;c.getContext("2d").drawImage(img,0,0,cw,ch);
      var out;try{out=c.toDataURL("image/webp",QUAL);if(out.indexOf("data:image/webp")!==0)out=null;}catch(e){out=null;}
      if(!out)out=c.toDataURL("image/jpeg",QUAL);  /* WebP 미지원 폴백 */
      if(scale===1&&out.length>=dataUrl.length)out=dataUrl;  /* 축소 안 했고 재인코딩이 더 크면 원본 유지 */
      res(out);};
    img.onerror=function(){res(dataUrl);};  /* 디코드 실패 시 원본 유지 */
    img.src=dataUrl;});}
  function embed(file){var reader=new FileReader();reader.onload=function(){encode(reader.result,file.type).then(function(out){insertText("!["+altOf(file)+"]("+out+")");});};reader.readAsDataURL(file);}
  window.__img={encode:encode,insert:insertText};  /* EXE 네이티브 경로에서 재사용 */
  /* 이미지 삽입 = 붙여넣기(클립보드 이미지)만. 드래그드롭은 제거됨. */
  ta.addEventListener("paste",function(e){var items=(e.clipboardData&&e.clipboardData.items)||[];
    for(var i=0;i<items.length;i++){if(items[i].type&&items[i].type.indexOf("image/")===0){var f=items[i].getAsFile();if(f){e.preventDefault();embed(f);return;}}}});
})();
/* ===== EXE(Neutralino) 네이티브 파일 처리 =====
   로컬 이미지 경로(![](socket.png))는 .md의 실제 경로를 알 때만 해석 가능. 경로 확보 경로:
   - "MD 파일 열기" 버튼(os.showOpenDialog)
   - 실행 인자(NL_ARGS): .md를 exe/바로가기에 드롭 · 더블클릭 · "연결 프로그램으로 열기"
   창-안 HTML5 드롭은 경로가 없어(WebView2 한계) 문서 로드만 됨 → 그 경우 이미지는 붙여넣기로 임베드.
   브라우저(NL_PORT 없음)에선 전부 비활성. */
(function(){
  if(typeof window.NL_PORT==="undefined"||typeof window.Neutralino==="undefined")return;  /* EXE에서만 */
  try{Neutralino.init();}catch(e){}
  function log(m){try{Neutralino.debug.log(String(m));}catch(e){}}
  function dirOf(p){var i=Math.max(p.lastIndexOf("\\"),p.lastIndexOf("/"));return i<0?"":p.slice(0,i);}
  function baseOf(p){var i=Math.max(p.lastIndexOf("\\"),p.lastIndexOf("/"));return i<0?p:p.slice(i+1);}
  function isAbs(p){return /^[a-zA-Z]:[\\\/]/.test(p)||/^[\\\/]/.test(p);}
  function joinP(dir,rel){rel=rel.replace(/^\.[\\\/]/,"").replace(/\//g,"\\");return dir.replace(/[\\\/]+$/,"")+"\\"+rel;}
  function mimeOf(p){var e=(p.split(".").pop()||"").toLowerCase();return ({png:"image/png",jpg:"image/jpeg",jpeg:"image/jpeg",gif:"image/gif",webp:"image/webp",bmp:"image/bmp",svg:"image/svg+xml"})[e]||"application/octet-stream";}
  function isMdPath(p){return /\.(md|markdown|txt)$/i.test(p);}
  function blobToDataUrl(b){return new Promise(function(r){var fr=new FileReader();fr.onload=function(){r(fr.result);};fr.readAsDataURL(b);});}
  async function readAsDataUrl(path){var arr=await Neutralino.filesystem.readBinaryFile(path);return blobToDataUrl(new Blob([new Uint8Array(arr)],{type:mimeOf(path)}));}
  /* 네이티브 이미지 해석기(버튼/더블클릭으로 연 경우=__mdDir 있음): 경로 1건을 .md 폴더 기준으로 읽어 WebP data URI 반환. 통합 해석기가 호출. */
  window.__nativeResolve=async function(s){
    if(!window.__mdDir)return null;
    var abs=isAbs(s)?s.replace(/\//g,"\\"):joinP(window.__mdDir,s);
    try{var du=await readAsDataUrl(abs);return await window.__img.encode(du,mimeOf(abs));}catch(err){log("[img] resolve fail: "+abs);return null;}
  };
  async function openMd(path){if(window.__confirmReplaceDoc&&!(await window.__confirmReplaceDoc()))return;   /* 다른 MD 교체 전 확인 */
    try{var text=await Neutralino.filesystem.readFile(path);window.__mdPath=path;window.__mdDir=dirOf(path);  /* __drop(불러온 이미지 목록)은 문서 전환에도 유지 */window.__mdName=baseOf(path);window.__fname=baseOf(path).replace(/\.(md|markdown|txt)$/i,"");renderMarkdown(text);}catch(err){log("[md] open fail: "+path);}}
  function isImgPath(p){return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(p);}
  /* "파일 열기" 버튼 → 네이티브 파일창(.md·이미지). MD=문서 열기(기존 그대로) / 이미지=드래그&드랍처럼 풀에 추가 */
  async function nativeOpen(){try{
    var ps=await Neutralino.os.showOpenDialog("파일 열기",{filters:[
      {name:"마크다운·이미지",extensions:["md","markdown","txt","png","jpg","jpeg","gif","webp","bmp","svg"]},
      {name:"마크다운",extensions:["md","markdown","txt"]},
      {name:"이미지",extensions:["png","jpg","jpeg","gif","webp","bmp","svg"]},
      {name:"모든 파일",extensions:["*"]}
    ],multiSelections:true});
    if(!ps||!ps.length)return;
    var mdPath=null,imgPaths=[];
    for(var i=0;i<ps.length;i++){if(!mdPath&&isMdPath(ps[i]))mdPath=ps[i];else if(isImgPath(ps[i]))imgPaths.push(ps[i]);}
    if(mdPath){openMd(mdPath);return;}   /* MD 열기 = 기존 그대로 */
    if(imgPaths.length&&document.body.classList.contains("loaded")){  /* 이미지 = 드래그&드랍처럼 풀에 추가 후 재렌더 */
      window.__drop=window.__drop||{};
      var nAdded=0;for(var k=0;k<imgPaths.length;k++){var pth=imgPaths[k];try{var du=await readAsDataUrl(pth);window.__drop[baseOf(pth)]=await window.__img.encode(du,mimeOf(pth));nAdded++;}catch(e){log("[open img] "+pth);}}
      var cur=document.getElementById("rawInput");
      renderPreview(cur?cur.value:(window.__lastText||""),true);
      if(nAdded&&window.__flashBadge)window.__flashBadge(nAdded);
    }
  }catch(e){log("[open] "+e);}}
  window.__nativeOpen=nativeOpen;
  /* 실행 인자로 넘어온 .md 자동 열기(더블클릭/연결앱/아이콘에 드롭 시 경로와 함께 실행됨) */
  try{var a=window.NL_ARGS||[];for(var i=1;i<a.length;i++){if(isMdPath(a[i])&&isAbs(a[i])){openMd(a[i]);break;}}}catch(e){}
})();
/* ===== 통합 로컬 이미지 해석기 (브라우저·EXE 공통) =====
   각 <img> 로컬 경로를 (1) 드롭된 파일 맵(window.__drop) → (2) EXE 네이티브 FS(window.__nativeResolve) 순으로 해석. */
window.__resolveLocalImages=async function(src){
  var imgs=src.querySelectorAll("img"),list=[],seen={},ref={};
  for(var i=0;i<imgs.length;i++){var el=imgs[i],raw0=el.getAttribute("src")||"";
    if(/^(https?:|data:|blob:)/i.test(raw0))continue;
    var s=raw0;try{s=decodeURIComponent(raw0);}catch(e){}   /* marked가 공백·한글을 %인코딩하므로 복원해 파일명과 매칭 */
    var base=s.split(/[\\/]/).pop(),norm=s.replace(/^\.\//,"").replace(/\\/g,"/"),d=null;
    if(window.__drop)d=window.__drop[norm]||window.__drop[base]||null;
    if(!d&&typeof window.__nativeResolve==="function"){try{d=await window.__nativeResolve(s);}catch(e){}}
    if(d){window.__drop=window.__drop||{};if(!window.__drop[base])window.__drop[base]=d;}   /* 해석된 이미지를 풀에 보관 → 목록에 삭제 버튼 표시 + 문서 전환에도 유지 */
    if(d)el.setAttribute("src",d);
    ref[base]=1;ref[norm]=1;
    if(!seen[base]){seen[base]=1;list.push({name:base,status:d?"ok":"missing"});}
  }
  /* 드롭했지만 문서에서 참조하지 않은 이미지 표시 */
  if(window.__drop){for(var k in window.__drop){if(window.__drop.hasOwnProperty(k)&&!ref[k]&&!seen[k]){seen[k]=1;list.push({name:k,status:"unused"});}}}
  window.__imgFiles=list;
  if(typeof window.__renderFileBadge==="function")window.__renderFileBadge();
};
/* ===== 드롭: .md(+이미지들) 또는 폴더째 =====
   드롭 payload의 이미지 바이트로 ![](name.png) 해석(경로 불필요, 브라우저·EXE 공통).
   .md만 드롭 → 문서만 로드. 이미지만 드롭(문서 열린 상태) → 커서에 임베드. */
(function(){
  function readText(f){return new Promise(function(r){var fr=new FileReader();fr.onload=function(){r(fr.result);};fr.readAsText(f,"utf-8");});}
  function readDataUrl(f){return new Promise(function(r){var fr=new FileReader();fr.onload=function(){r(fr.result);};fr.readAsDataURL(f);});}
  function mimeByName(n){var e=(n.split(".").pop()||"").toLowerCase();return ({png:"image/png",jpg:"image/jpeg",jpeg:"image/jpeg",gif:"image/gif",webp:"image/webp",bmp:"image/bmp",svg:"image/svg+xml"})[e]||"";}
  function isImgName(n){return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(n);}
  function isMdName(n){return /\.(md|markdown|txt)$/i.test(n);}
  function walk(entry,out){return new Promise(function(res){
    if(entry.isFile){entry.file(function(f){out.push(f);res();},function(){res();});}
    else if(entry.isDirectory){var rd=entry.createReader(),acc=[];(function rd2(){rd.readEntries(function(es){if(!es.length){(async function(){for(var c=0;c<acc.length;c++)await walk(acc[c],out);res();})();}else{acc=acc.concat(es);rd2();}},function(){res();});})();}
    else res();
  });}
  async function handle(entries,flat,insAt){
    var files=[];
    if(entries&&entries.length){for(var i=0;i<entries.length;i++)await walk(entries[i],files);}
    else files=flat||[];
    var md=null,imgs=[];
    for(var j=0;j<files.length;j++){var f=files[j];if(!md&&isMdName(f.name))md=f;else if(isImgName(f.name))imgs.push(f);}
    if(md){
      if(window.__confirmReplaceDoc&&!(await window.__confirmReplaceDoc()))return;   /* 다른 MD 교체 전 확인 */
      /* 함께 온 이미지는 기존 풀에 '병합'(문서 전환에도 이전 이미지 목록 유지) */
      window.__drop=window.__drop||{};
      for(var k=0;k<imgs.length;k++){var im=imgs[k];try{var du=await readDataUrl(im);window.__drop[im.name]=await window.__img.encode(du,im.type||mimeByName(im.name));}catch(e){}}
      window.__mdDir=null;
      var text=await readText(md);
      window.__mdName=md.name;window.__fname=md.name.replace(/\.(md|markdown|txt)$/i,"");
      renderMarkdown(text);
    }else if(imgs.length&&document.body.classList.contains("loaded")){
      /* 이미지만 드롭 → 파일 풀(window.__drop)에 추가.
         에디터(textarea) 위에 드롭했으면(insAt!=null) 그 위치에 ![](이름) 참조까지 삽입,
         그 밖의 위치면 풀에만 추가(팝오버에서 삽입 가능). */
      window.__drop=window.__drop||{};
      var added=[];
      for(var m=0;m<imgs.length;m++){var ig=imgs[m];try{var du2=await readDataUrl(ig);window.__drop[ig.name]=await window.__img.encode(du2,ig.type||mimeByName(ig.name));added.push(ig.name);}catch(e){}}
      var ta=document.getElementById("rawInput");
      if(insAt!=null&&ta&&added.length){
        var refs=added.map(function(n){var alt=n.replace(/\.[a-z0-9]+$/i,"");var dest=/\s/.test(n)?"<"+n+">":n;return "!["+alt+"]("+dest+")";}).join("\n");
        var pos=Math.min(Math.max(0,insAt|0),ta.value.length),before=ta.value.slice(0,pos),after=ta.value.slice(pos);
        var block=(before&&!/\n$/.test(before)?"\n":"")+refs+(after&&!/^\n/.test(after)?"\n":"");
        var nt=before+block+after;ta.value=nt;
        var mirror=document.getElementById("raw");if(mirror&&typeof hlMd==="function")mirror.innerHTML=hlMd(nt);
        try{ta.selectionStart=ta.selectionEnd=(before+block).length;}catch(e){}
        renderPreview(nt,true);
      }else{
        renderPreview(ta?ta.value:(window.__lastText||""),true);
      }
      if(added.length&&window.__flashBadge)window.__flashBadge(added.length);
    }
  }
  /* 파일 선택창(브라우저)에서 고른 File 목록도 드롭과 동일 처리(.md=문서 열기 / 이미지=풀에 추가) */
  window.__ingestFiles=function(fileList){handle(null,Array.prototype.slice.call(fileList||[]));};
  function hasFiles(dt){return dt&&dt.types&&Array.prototype.indexOf.call(dt.types,"Files")>=0;}
  document.addEventListener("dragover",function(e){e.preventDefault();if(hasFiles(e.dataTransfer))document.body.classList.add("drag");});
  document.addEventListener("dragleave",function(e){if(e.relatedTarget===null||(e.clientX<=0&&e.clientY<=0))document.body.classList.remove("drag");});
  /* 에디터(textarea) 위에 드롭했으면 그 지점의 글자 위치(offset)를 구함 → 이미지 참조를 그 자리에 삽입 */
  function dropCaret(x,y){var ta=document.getElementById("rawInput");if(!ta||!document.body.classList.contains("loaded"))return null;
    try{var cp=document.caretPositionFromPoint&&document.caretPositionFromPoint(x,y);if(cp&&cp.offsetNode===ta)return cp.offset;}catch(e){}
    try{var r=ta.getBoundingClientRect();if(x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom)return ta.value.length;}catch(e){}  /* 정확한 위치 못 구하면 에디터 영역 안일 때 끝에 삽입 */
    return null;}
  document.addEventListener("drop",function(e){e.preventDefault();document.body.classList.remove("drag");var dt=e.dataTransfer;if(!dt)return;
    var insAt=dropCaret(e.clientX,e.clientY);
    var entries=[],items=dt.items;
    if(items&&items.length&&items[0].webkitGetAsEntry){for(var i=0;i<items.length;i++){var en=items[i].webkitGetAsEntry&&items[i].webkitGetAsEntry();if(en)entries.push(en);}}
    var flat=[];if(dt.files){for(var k=0;k<dt.files.length;k++)flat.push(dt.files[k]);}
    handle(entries,flat,insAt);
  });
})();
/* ===== ZIP 저장: 현재 MD + 풀(window.__drop)의 이미지들을 무압축(store) zip으로 묶어 저장 ===== */
(function(){
  var crcTable=null;
  function crc32(buf){if(!crcTable){crcTable=[];for(var n=0;n<256;n++){var c=n;for(var k=0;k<8;k++)c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1);crcTable[n]=c>>>0;}}var crc=0xFFFFFFFF;for(var i=0;i<buf.length;i++)crc=(crcTable[(crc^buf[i])&0xFF]^(crc>>>8))>>>0;return (crc^0xFFFFFFFF)>>>0;}
  function u16(v){return [v&0xFF,(v>>>8)&0xFF];}
  function u32(v){return [v&0xFF,(v>>>8)&0xFF,(v>>>16)&0xFF,(v>>>24)&0xFF];}
  function zipStore(files){
    var enc=new TextEncoder(),local=[],central=[],offset=0;
    for(var i=0;i<files.length;i++){
      var nameB=enc.encode(files[i].name),data=files[i].data,crc=crc32(data),sz=data.length;
      var lh=[].concat(u32(0x04034b50),u16(20),u16(0x0800),u16(0),u16(0),u16(0),u32(crc),u32(sz),u32(sz),u16(nameB.length),u16(0));
      local.push(new Uint8Array(lh),nameB,data);
      var ch=[].concat(u32(0x02014b50),u16(20),u16(20),u16(0x0800),u16(0),u16(0),u16(0),u32(crc),u32(sz),u32(sz),u16(nameB.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(offset));
      central.push(new Uint8Array(ch),nameB);
      offset+=lh.length+nameB.length+data.length;
    }
    var cSize=0;for(var c1=0;c1<central.length;c1++)cSize+=central[c1].length;
    var eocd=new Uint8Array([].concat(u32(0x06054b50),u16(0),u16(0),u16(files.length),u16(files.length),u32(cSize),u32(offset),u16(0)));
    var parts=local.concat(central).concat([eocd]),total=0,p;
    for(p=0;p<parts.length;p++)total+=parts[p].length;
    var out=new Uint8Array(total),pos=0;for(p=0;p<parts.length;p++){out.set(parts[p],pos);pos+=parts[p].length;}
    return out;
  }
  function dataUriToBytes(du){var i=String(du).indexOf(",");if(i<0)return null;try{var bin=atob(du.slice(i+1)),u=new Uint8Array(bin.length),k;for(k=0;k<bin.length;k++)u[k]=bin.charCodeAt(k);return u;}catch(e){return null;}}
  window.__exportZip=async function(){
    try{
      var ta=document.getElementById("rawInput");
      var mdText=(ta?ta.value:window.__lastText)||"";
      var mdName=window.__mdName||((window.__fname||"document")+".md");
      var baseName=(window.__fname||mdName.replace(/\.(md|markdown|txt)$/i,"")||"document");
      var files=[{name:mdName,data:new TextEncoder().encode(mdText)}];
      if(window.__drop){for(var k in window.__drop){if(Object.prototype.hasOwnProperty.call(window.__drop,k)){var b=dataUriToBytes(window.__drop[k]);if(b)files.push({name:k,data:b});}}}
      var zip=zipStore(files),zipName=baseName+".zip";
      if(typeof window.NL_PORT!=="undefined"&&window.Neutralino){   /* EXE: 네이티브 저장 다이얼로그 */
        var path=await Neutralino.os.showSaveDialog("ZIP 저장",{defaultPath:zipName,filters:[{name:"ZIP",extensions:["zip"]}]});
        if(!path)return;if(!/\.zip$/i.test(path))path+=".zip";
        await Neutralino.filesystem.writeBinaryFile(path,zip.buffer.slice(zip.byteOffset,zip.byteOffset+zip.byteLength));
      }else{                                                        /* 브라우저: 앵커 다운로드 */
        var blob=new Blob([zip],{type:"application/zip"}),a=document.createElement("a");
        a.href=URL.createObjectURL(blob);a.download=zipName;document.body.appendChild(a);a.click();
        setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},1500);
      }
    }catch(e){try{Neutralino.debug.log("[zip] "+e);}catch(_){}if(window.__appAlert)window.__appAlert("ZIP 저장 중 문제가 발생했습니다.","오류");else alert("ZIP 저장 중 문제가 발생했습니다.");}
  };
})();
/* ===== 불러온 파일 뱃지 + 팝오버 (문서 + 참조 이미지 상태 + 미참조 드롭 이미지) ===== */
(function(){
  function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];});}
  /* '식별안됨' 이미지 = MD에 ![](이름) 참조가 있으나 못 찾음 → 그 참조를 본문에서 삭제(파일명/경로 basename 일치). */
  function removeRefFromMd(name){
    var ta=document.getElementById("rawInput");if(!ta)return;
    var re=/!\[[^\]]*\]\(\s*(<[^>]*>|[^()]*(?:\([^)]*\)[^()]*)*)\s*\)/g,changed=false;
    var out=ta.value.replace(re,function(m,dest){
      var d=dest.replace(/^<|>$/g,"").replace(/\s+["'][^"']*["']\s*$/,"").trim();  /* <> 벗기고 제목 제거 */
      try{d=decodeURIComponent(d);}catch(e){}
      var base=d.split(/[\\/]/).pop();
      if(d===name||base===name){changed=true;return "";}
      return m;
    });
    if(!changed)return;
    out=out.replace(/\n{3,}/g,"\n\n");  /* 참조만 있던 줄이 비면서 생긴 과한 빈 줄 정리 */
    ta.value=out;
    var mirror=document.getElementById("raw");if(mirror&&typeof hlMd==="function")mirror.innerHTML=hlMd(out);
    if(typeof renderPreview==="function")renderPreview(out,true);
  }
  var badge=document.getElementById("fileBadge"),num=document.getElementById("fileBadgeN"),pop=document.getElementById("filePop");
  function build(){
    var md=window.__mdName||(window.__fname?window.__fname+".md":null),imgs=window.__imgFiles||[];
    if(num)num.textContent=String((md?1:0)+imgs.length);
    var anyMissing=false;for(var mi=0;mi<imgs.length;mi++){if(imgs[mi].status==="missing"){anyMissing=true;break;}}
    if(badge)badge.classList.toggle("has-missing",anyMissing);
    if(!pop)return;
    var h="<button type='button' class='fp-close' title='닫기' aria-label='닫기'>✕</button><div class='fp-h fp-h-top'><span>불러온 파일</span><button type='button' class='fp-zip-btn' title='MD와 이미지를 ZIP으로 묶어 저장'>ZIP 저장</button></div>";
    if(md)h+="<div class='fp-row'><span class='fp-ico'>📄</span><span class='fp-name' title='"+esc(md)+"'>"+esc(md)+"</span></div>";
    if(imgs.length){
      h+="<div class='fp-sec'><div class='fp-h'>이미지 ("+imgs.length+")</div>";
      for(var i=0;i<imgs.length;i++){var f=imgs[i],
        st=f.status==="ok"?["st-ok","✓ 사용중"]:f.status==="missing"?["st-bad","✗ 식별안됨"]:["st-ok","● 사용가능"],
        inPool=window.__drop&&Object.prototype.hasOwnProperty.call(window.__drop,f.name),
        act=f.status==="missing"?"<button class='fp-rm-btn' type='button' data-rm='"+esc(f.name)+"' title='MD에서 이 이미지 참조를 삭제: "+esc(f.name)+"'>참조 삭제</button>":"<button class='fp-ins-btn' type='button' data-ins='"+esc(f.name)+"' title='커서 위치에 삽입: "+esc(f.name)+"'>삽입</button>";
        h+="<div class='fp-row' title='"+esc(f.name)+"'><span class='fp-ico'>🖼️</span><span class='fp-name'>"+esc(f.name)+"</span><span class='fp-st "+st[0]+"'>"+st[1]+"</span>"+act+(inPool?"<button class='fp-del-btn' type='button' data-del='"+esc(f.name)+"' title='목록에서 제거: "+esc(f.name)+"' aria-label='삭제'>✕</button>":"<span class='fp-del-ph'></span>")+"</div>";}
      h+="</div>";
    }else h+="<div class='fp-sec'><div class='fp-empty'>참조된 이미지 없음</div></div>";
    if(anyMissing)h+="<div class='fp-hint'>식별 안 된 이미지가 있어요. <b>‘파일 열기’</b>로 이미지를 넣거나, <b>이미지</b>(또는 폴더째) 끌어다 놓으면 표시됩니다.</div>";
    pop.innerHTML=h;
  }
  window.__renderFileBadge=build;
  function close(){if(pop)pop.hidden=true;if(badge)badge.classList.remove("on");}
  /* 배지 클릭 = 토글(열려 있으면 닫기, 닫혀 있으면 내용 갱신 후 열기). */
  if(badge)badge.addEventListener("click",function(e){e.stopPropagation();if(pop.hidden){build();pop.hidden=false;badge.classList.add("on");}else{close();}});
  /* 이미지 추가 알림: 배지 초록 깜빡 + 옆에 잠깐 뜨는 툴팁 */
  window.__flashBadge=function(n){
    if(!badge)return;
    badge.classList.remove("flash-added");void badge.offsetWidth;badge.classList.add("flash-added");
    setTimeout(function(){badge.classList.remove("flash-added");},3600);
    var editor=document.getElementById("editor");if(!editor)return;
    var t=document.getElementById("fbToast");
    if(!t){t=document.createElement("div");t.id="fbToast";editor.appendChild(t);}
    t.textContent=(n>1?("이미지 "+n+"개가 추가되었습니다"):"이미지가 추가되었습니다");
    t.classList.remove("show");void t.offsetWidth;t.classList.add("show");
    clearTimeout(t.__tmr);t.__tmr=setTimeout(function(){t.classList.remove("show");},1900);
  };
  /* 팝오버 클릭: X = 닫기 / '삽입' = 참조 삽입(닫지 않음 → 여러 번 연속 삽입 가능) */
  if(pop)pop.addEventListener("click",function(e){
    if(e.target.closest&&e.target.closest(".fp-close")){close();return;}
    if(e.target.closest&&e.target.closest(".fp-zip-btn")){if(window.__exportZip)window.__exportZip();return;}
    var del=e.target.closest&&e.target.closest(".fp-del-btn");
    if(del){var dn=del.getAttribute("data-del");if(dn&&window.__drop)delete window.__drop[dn];  /* 풀에서 제거 → 재렌더로 목록/상태 갱신(팝오버는 열린 채) */
      var cur=document.getElementById("rawInput");if(typeof renderPreview==="function")renderPreview(cur?cur.value:(window.__lastText||""),true);else if(window.__renderFileBadge)window.__renderFileBadge();return;}
    var rm=e.target.closest&&e.target.closest(".fp-rm-btn");
    if(rm){var rn=rm.getAttribute("data-rm");if(rn)removeRefFromMd(rn);return;}
    var btn=e.target.closest&&e.target.closest(".fp-ins-btn");if(!btn)return;var name=btn.getAttribute("data-ins");if(!name)return;
    var alt=name.replace(/\.[a-z0-9]+$/i,"");var dest=/\s/.test(name)?"<"+name+">":name;  /* 공백 포함 파일명은 <>로 감싸야 마크다운이 인식 */
    if(window.__img&&window.__img.insert)window.__img.insert("!["+alt+"]("+dest+")");});
})();
