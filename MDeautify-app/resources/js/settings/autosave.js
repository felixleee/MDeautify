/* 자동 저장 토글: 켜면 편집을 멈춘 뒤 미리보기가 갱신되는 시점(app.js EDIT_DELAY)에 원본 .md 도 함께 저장.
   실제 저장은 window.__autoSaveMd() 가 담당하며 EXE + 파일 경로(__mdPath) 있을 때만 동작(경로 없으면 조용히 스킵).
   pagebreak.js 와 동일한 설정 지속 패턴(MD2R + md2pdf:settings-hydrated). */
(function(){
  var KEY="md2pdf_autosave";
  var cb=document.getElementById("tmAutoSave");
  function load(){var v=null;try{v=localStorage.getItem(KEY);}catch(e){}window.__autoSave=(v==="1");if(cb)cb.checked=window.__autoSave;}
  load();
  document.addEventListener("md2pdf:settings-hydrated",load);
  if(cb)cb.addEventListener("change",function(){
    window.__autoSave=cb.checked;
    MD2R.save(KEY,cb.checked?"1":"0");
  });
  MD2R.register(function(){if(cb)MD2R.save(KEY,cb.checked?"1":"0");},[KEY]);
})();
