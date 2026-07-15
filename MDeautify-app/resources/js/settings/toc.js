/* 목차(TOC) 자동 생성 — 표지 다음에 H1~H3 목차 페이지 삽입.
   window.__tocOn 을 buildSource 가 읽어 목차 DOM(번호 빈칸)을 조판 전에 삽입 → 조판(Paged.js) 후 fillToc()가 페이지번호를 채움.
   닭-달걀 회피: 목차가 빈 번호로 미리 자리를 차지한 채 1회 조판 → 번호는 고정폭 우측칸에 채워 재조판(reflow) 없음.
   번호 체계: 표지·목차 페이지 제외, 내용 페이지 1부터(footer/header 와 동일 계산). */
function fillToc(){
  var pagesEl=document.getElementById("pages"); if(!pagesEl) return;
  var toc=pagesEl.querySelector(".toc"); if(!toc) return;
  /* 각 페이지 → 내용 번호(표지/목차/빈 페이지 = null), footer 와 동일 규칙 */
  var numByPage=new Map(), n=0;
  pagesEl.querySelectorAll(".pagedjs_page").forEach(function(pg){
    var body=pg.querySelector(".pagedjs_page_content");
    var skip=pg.querySelector(".cover")||pg.querySelector(".toc");
    var has=body&&(body.textContent.trim().length>0||body.querySelector("img,svg,table,hr,figure"));
    if(skip||!has){numByPage.set(pg,null);return;}
    n++; numByPage.set(pg,n);
  });
  /* 각 목차 항목: 대상 제목(id) 이 있는 페이지의 내용 번호로 채움 */
  toc.querySelectorAll(".toc-entry").forEach(function(ent){
    var id=ent.getAttribute("data-target");
    var pgSpan=ent.querySelector(".toc-pg"); if(!pgSpan) return;
    var target=null;
    if(id){var all=pagesEl.querySelectorAll("[id]"); for(var i=0;i<all.length;i++){ if(all[i].id===id){target=all[i];break;} }}
    var pg=target&&target.closest?target.closest(".pagedjs_page"):null;
    var v=pg?numByPage.get(pg):null;
    pgSpan.textContent=(v!=null)?String(v):"";
  });
}
(function(){
  var KEY="md2pdf_toc";
  var cb=document.getElementById("tmToc");
  function load(){var v=null;try{v=localStorage.getItem(KEY);}catch(e){}window.__tocOn=(v==="1");if(cb)cb.checked=window.__tocOn;}
  load();
  document.addEventListener("md2pdf:settings-hydrated",load);
  if(cb)cb.addEventListener("change",function(){
    window.__tocOn=cb.checked;
    MD2R.save(KEY,cb.checked?"1":"0");
    if(window.__lastText&&typeof renderMarkdown==="function")renderMarkdown(window.__lastText);
  });
  MD2R.register(function(){if(cb)MD2R.save(KEY,cb.checked?"1":"0");},[KEY]);
})();
