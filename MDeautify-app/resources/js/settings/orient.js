/* 페이지 방향(A4 세로/가로).
   @page 는 선택자로 묶을 수 없어 <style id="pageSizeCss"> 를 직접 갈아끼운다 — style.css 의 @page 두 곳은
   size 를 빼고 margin 만 남겼으므로 여기가 화면·인쇄 페이지 크기의 유일한 출처.
   Paged.js 는 pagedCss()(app.js)가 넘기는 @page 를 따로 읽고, 내보내기는 export-pdf.js 가 직접 싣는다.
   종이 폭·높이는 :root 의 --pg-w/--pg-h 로도 건다 — .paper 폭·이미지 상한·표지 여백이 여백(margin.js)과
   함께 이 값으로 계산된다(style.css 의 --pg-body-h). */
(function(){
  var KEY="md2pdf_page_orient";
  var cb=document.getElementById("tmLandscape");
  function styleEl(){
    var el=document.getElementById("pageSizeCss");
    if(!el){el=document.createElement("style");el.id="pageSizeCss";document.head.appendChild(el);}
    return el;
  }
  function apply(){
    var land=(window.__pageOrient==="landscape");
    document.body.classList.toggle("landscape",land);
    styleEl().textContent="@page{size:A4 "+(land?"landscape":"portrait")+";}";
    document.documentElement.style.setProperty("--pg-w",land?"297mm":"210mm");
    document.documentElement.style.setProperty("--pg-h",land?"210mm":"297mm");
    if(cb)cb.checked=land;
  }
  function load(){
    var v=null;try{v=localStorage.getItem(KEY);}catch(e){}
    window.__pageOrient=(v==="landscape")?"landscape":"portrait";
    apply();
  }
  load();
  document.addEventListener("md2pdf:settings-hydrated",load);
  if(cb)cb.addEventListener("change",function(){
    window.__pageOrient=cb.checked?"landscape":"portrait";
    MD2R.save(KEY,window.__pageOrient);
    apply();
    if(window.__reflowPreview)window.__reflowPreview();   /* 미리보기만 다시 조판(편집기·저장 기준선은 그대로) */
  });
  MD2R.register(function(){if(cb)MD2R.save(KEY,cb.checked?"landscape":"portrait");},[KEY]);
})();
