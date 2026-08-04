/* ===== md 편집기 찾기/바꾸기 (Ctrl+F / Ctrl+H, VSCode 유사) =====
   - #findHl: #raw 뒤(z0) 하이라이트 레이어. 같은 box/폰트/wrap 을 공유하므로 textarea 와 글자 정합.
     전체 매치는 mark.fh, 현재 매치는 mark.fh.cur 배경으로 표시(글자는 투명, 배경만).
   - 편집은 execCommand("insertText") 로 → 네이티브 Ctrl+Z 스택 보존 + 'input' 이벤트로 미러/미리보기 자동 갱신.
   - 대소문자 구분 토글. 정규식/단어단위는 미지원(MVP). */
(function(){
  var ta=document.getElementById("rawInput"),findHl=document.getElementById("findHl"),bar=document.getElementById("findBar");
  if(!ta||!findHl||!bar)return;
  var fbFind=document.getElementById("fbFind"),fbRepl=document.getElementById("fbRepl"),
      fbCount=document.getElementById("fbCount"),fbCase=document.getElementById("fbCase"),
      fbPrev=document.getElementById("fbPrev"),fbNext=document.getElementById("fbNext"),
      fbClose=document.getElementById("fbClose"),fbReplOne=document.getElementById("fbReplOne"),
      fbReplAll=document.getElementById("fbReplAll"),fbToggle=document.getElementById("fbToggle");

  var term="",cs=false,matches=[],cur=-1,barOpen=false,openCaret=0;

  function esc(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}

  function syncScroll(){findHl.scrollTop=ta.scrollTop;findHl.scrollLeft=ta.scrollLeft;}

  function computeMatches(){
    matches=[]; term=fbFind.value;
    if(!term)return;
    var hay=cs?ta.value:ta.value.toLowerCase(), ndl=cs?term:term.toLowerCase();
    var i=0,L=ndl.length; if(!L)return;
    while(i<=hay.length){var idx=hay.indexOf(ndl,i); if(idx<0)break; matches.push([idx,idx+L]); i=idx+L;}
  }

  function renderHl(){
    if(!term||!matches.length){findHl.innerHTML="";return;}
    var text=ta.value,html="",pos=0;
    for(var k=0;k<matches.length;k++){var s=matches[k][0],e=matches[k][1];
      html+=esc(text.slice(pos,s))+'<mark class="fh'+(k===cur?" cur":"")+'">'+esc(text.slice(s,e))+"</mark>";pos=e;}
    html+=esc(text.slice(pos));
    findHl.innerHTML=html; syncScroll();
  }

  function updateUi(){
    fbCount.textContent=matches.length?((cur>=0?cur+1:0)+"/"+matches.length):(term?"결과 없음":"0/0");
    var none=!matches.length;
    fbPrev.disabled=none; fbNext.disabled=none; fbReplOne.disabled=(cur<0); fbReplAll.disabled=none;
  }

  function firstAtOrAfter(pos){for(var k=0;k<matches.length;k++)if(matches[k][0]>=pos)return k;return 0;}

  /* 현재 매치의 실제 픽셀 위치로 스크롤 — #findHl 의 mark.fh.cur 는 textarea 와 동일 레이아웃이라
     offsetTop 이 곧 textarea 상의 픽셀 위치. 줄바꿈(word-wrap) 있어도 정확. */
  function scrollIntoView(){
    var cm=findHl.querySelector("mark.fh.cur"); if(!cm)return;
    var y=cm.offsetTop, hh=cm.offsetHeight, top=ta.scrollTop, h=ta.clientHeight;
    if(y<top+30)ta.scrollTop=Math.max(0,y-40);
    else if(y+hh>top+h-30)ta.scrollTop=y+hh-h+40;
    syncScroll();
  }

  function select(idx){
    cur=idx; var m=matches[cur]; renderHl(); updateUi(); if(!m)return;
    ta.setSelectionRange(m[0],m[1]); scrollIntoView();
  }

  /* 재계산: preferPos 이후 첫 매치를 현재로. doSelect 면 그 매치로 이동/스크롤. */
  function recompute(preferPos,doSelect){
    computeMatches();
    cur=matches.length?firstAtOrAfter(preferPos):-1;
    renderHl(); updateUi();
    if(doSelect&&cur>=0)select(cur);
  }

  function next(){if(!matches.length)return; select((cur+1)%matches.length);}
  function prev(){if(!matches.length)return; select((cur-1+matches.length)%matches.length);}

  function insertViaCmd(text){
    ta.focus(); var ok=false;
    try{ok=document.execCommand("insertText",false,text);}catch(e){}
    if(!ok){var s=ta.selectionStart,e=ta.selectionEnd,v=ta.value;
      ta.value=v.slice(0,s)+text+v.slice(e); ta.selectionStart=ta.selectionEnd=s+text.length;
      ta.dispatchEvent(new Event("input",{bubbles:true}));}
  }

  function replaceOne(){
    if(cur<0||!matches[cur])return;
    var m=matches[cur],repl=fbRepl.value;
    ta.setSelectionRange(m[0],m[1]);
    insertViaCmd(repl);                       /* 'input' → 미러/미리보기 + ta input 리스너 recompute */
    recompute(m[0]+repl.length,true);         /* 치환 지점 다음 매치로 이동 */
  }

  function replaceAll(){
    if(!matches.length)return;
    var text=ta.value,out="",pos=0,cnt=matches.length;
    for(var k=0;k<matches.length;k++){out+=text.slice(pos,matches[k][0])+fbRepl.value;pos=matches[k][1];}
    out+=text.slice(pos);
    ta.setSelectionRange(0,text.length);
    insertViaCmd(out);
    recompute(0,false);
    fbCount.textContent=cnt+"개 변경됨";
  }

  function loop(){if(!barOpen)return; if(findHl.scrollTop!==ta.scrollTop||findHl.scrollLeft!==ta.scrollLeft)syncScroll(); requestAnimationFrame(loop);}

  function setReplace(on){bar.classList.toggle("replace-open",on); fbToggle.setAttribute("aria-expanded",on?"true":"false");}

  function open(focusRepl){
    if(!document.body.classList.contains("loaded"))return;
    if(document.body.classList.contains("editor-collapsed"))return;   /* 원본 접힘 상태면 무시 */
    bar.hidden=false; barOpen=true; requestAnimationFrame(loop);
    setReplace(!!focusRepl);                                          /* Ctrl+F=찾기만 · Ctrl+H=바꾸기 펼침 */
    openCaret=ta.selectionStart;
    var sel=ta.value.substring(ta.selectionStart,ta.selectionEnd);
    if(sel&&sel.indexOf("\n")<0)fbFind.value=sel;                     /* 선택어 있으면 채움 */
    var f=focusRepl?fbRepl:fbFind; f.focus(); if(f.select)f.select();
    recompute(openCaret,true);
  }
  function close(){bar.hidden=true; barOpen=false; findHl.innerHTML=""; ta.focus();}

  /* 단축키: Ctrl/Cmd+F(찾기) · Ctrl/Cmd+H(바꾸기) · Esc(닫기) */
  document.addEventListener("keydown",function(e){
    var mod=(e.ctrlKey||e.metaKey)&&!e.altKey&&!e.shiftKey;
    if(mod&&(e.key==="f"||e.key==="F")){if(!document.body.classList.contains("loaded"))return; e.preventDefault(); open(false);}
    else if(mod&&(e.key==="h"||e.key==="H")){if(!document.body.classList.contains("loaded"))return; e.preventDefault(); open(true);}
    else if(e.key==="Escape"&&barOpen){e.preventDefault(); close();}
  },true);

  fbFind.addEventListener("input",function(){recompute(openCaret,true);});
  fbFind.addEventListener("keydown",function(e){if(e.key==="Enter"){e.preventDefault(); e.shiftKey?prev():next();}});
  fbRepl.addEventListener("keydown",function(e){if(e.key==="Enter"){e.preventDefault(); replaceOne();}
    else if(e.key==="Escape"){e.preventDefault(); close();}});
  fbCase.addEventListener("click",function(){cs=!cs; fbCase.classList.toggle("active",cs); fbCase.setAttribute("aria-pressed",cs?"true":"false"); recompute(openCaret,true); fbFind.focus();});
  fbPrev.addEventListener("click",function(){prev(); fbFind.focus();});
  fbNext.addEventListener("click",function(){next(); fbFind.focus();});
  fbToggle.addEventListener("click",function(){var on=!bar.classList.contains("replace-open"); setReplace(on); (on?fbRepl:fbFind).focus();});
  fbClose.addEventListener("click",close);
  fbReplOne.addEventListener("click",function(){replaceOne(); fbRepl.focus();});
  fbReplAll.addEventListener("click",function(){replaceAll(); fbRepl.focus();});

  /* 사용자가 원본을 직접 편집하면 하이라이트 갱신(이동은 안 함) */
  ta.addEventListener("input",function(){if(barOpen)recompute(ta.selectionStart,false);});
})();
