/* ===== 연결 끊김 자동 복구 (EXE 전용) =====
   절전/재개 등으로 Neutralino WebSocket 이 끊기면(serverOffline) 네이티브 호출(파일열기·저장 등)이 멈춘다.
   클라이언트가 재연결을 못 하므로: 편집 내용을 임시 저장 → 창 새로고침(새 토큰으로 재연결) → 부팅 시 복원.
   스태시 키는 md2pdf_ 접두어가 아니라 settings.json 에 실리지 않음(용량·순수 세션용). */
(function(){
  var KEY="mdeautify_recover";

  /* --- 1) 부팅 시 복원: 스태시가 있으면 에디터에 되살리고 토스트 --- */
  (function restore(){
    var raw=null; try{raw=localStorage.getItem(KEY);}catch(e){}
    if(!raw)return;
    try{localStorage.removeItem(KEY);}catch(e){}
    var d=null; try{d=JSON.parse(raw);}catch(e){}
    if(!d||typeof d.text!=="string")return;
    (function apply(){
      if(typeof window.renderMarkdown!=="function"){setTimeout(apply,60);return;}   /* app.js 준비 대기 */
      try{
        if(d.drop&&typeof d.drop==="object")window.__drop=d.drop;
        if(d.path){window.__mdPath=d.path;window.__mdDir=d.dir||null;window.__mdName=d.name||null;window.__fname=d.fname||null;}
        window.renderMarkdown(d.text);
        if(typeof window.__renderFileBadge==="function")window.__renderFileBadge();
      }catch(e){}
      var editor=document.getElementById("editor");
      if(editor){var t=document.getElementById("fbToast");if(!t){t=document.createElement("div");t.id="fbToast";editor.appendChild(t);}
        t.textContent="재연결 후 편집 내용을 복원했어요";t.classList.remove("show");void t.offsetWidth;t.classList.add("show");
        clearTimeout(t.__tmr);t.__tmr=setTimeout(function(){t.classList.remove("show");},2800);}
    })();
  })();

  /* --- 2) 연결 끊김 감지 → 내용 저장 후 새로고침 (EXE 에서만) --- */
  if(typeof window.NL_PORT==="undefined"||typeof window.Neutralino==="undefined")return;
  var handled=false;
  function onOffline(){
    if(handled)return; handled=true;
    try{
      var ta=document.getElementById("rawInput");
      var payload={text:ta?ta.value:(window.__lastText||""),path:window.__mdPath||null,dir:window.__mdDir||null,name:window.__mdName||null,fname:window.__fname||null};
      try{payload.drop=window.__drop||null;localStorage.setItem(KEY,JSON.stringify(payload));}   /* 이미지 풀 포함 시도 */
      catch(e){try{delete payload.drop;localStorage.setItem(KEY,JSON.stringify(payload));}catch(_){}}  /* 용량 초과 → 텍스트만 */
    }catch(e){}
    try{var m=document.getElementById("updModal"),t=document.getElementById("updMsg");if(t)t.textContent="백그라운드 연결이 끊겨 다시 연결하는 중…";if(m)m.hidden=false;}catch(e){}
    setTimeout(function(){try{window.location.reload();}catch(e){}},700);
  }
  try{Neutralino.events.on("serverOffline",onOffline);}catch(e){}
})();
