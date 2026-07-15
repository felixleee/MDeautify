/* 페이지 옵션: 제목(H2)마다 새 페이지에서 시작.
   window.__h2NewPage 플래그를 buildSource 가 읽어 H2에 .pb-before 부여. 토글 시 재렌더(size.js 와 동일 방식). */
(function(){
  var KEY="md2pdf_h2break";
  var cb=document.getElementById("tmH2Break");
  function load(){var v=null;try{v=localStorage.getItem(KEY);}catch(e){}window.__h2NewPage=(v==="1");if(cb)cb.checked=window.__h2NewPage;}
  load();
  document.addEventListener("md2pdf:settings-hydrated",load);
  if(cb)cb.addEventListener("change",function(){
    window.__h2NewPage=cb.checked;
    MD2R.save(KEY,cb.checked?"1":"0");
    if(window.__lastText&&typeof renderMarkdown==="function")renderMarkdown(window.__lastText);
  });
  MD2R.register(function(){if(cb)MD2R.save(KEY,cb.checked?"1":"0");},[KEY]);
})();
