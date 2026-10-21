/* ===== 연결 끊김 자동 복구 (EXE 전용) =====
   절전/재개 등으로 Neutralino WebSocket 이 끊기면(serverOffline) 네이티브 호출(파일열기·저장 등)이 멈춘다.
   클라이언트가 재연결을 못 하므로: 열린 문서를 임시 저장 → 창 새로고침(새 토큰으로 재연결) → 부팅 시 복원.
   예전엔 활성 문서 하나만 저장해(탭 도입 전 코드) 배경 탭의 미저장 편집이 사라지고, 되살린 문서도 '저장됨'으로 보였다 →
   모든 탭을 저장하고 저장 기준선(●)과 활성 탭까지 되살린다(MDhwpxify v1.2.1 과 같은 방식·같은 tabs API).
   ⚠️ AI 대화는 복원하지 않는다(말풍선 DOM·응답 중 상태). 스태시 키는 md2pdf_ 접두어가 아니라 settings.json 에 실리지 않음(용량·순수 세션용). */
(function(){
  var KEY="mdeautify_recover";

  /* 열린 문서 수집: 탭 있으면 전부(+활성 순번), 없으면 편집기 하나. 빈 화면이면 docs=[] */
  function collect(){
    if(window.__tabsExport){var x=window.__tabsExport();if(x&&x.docs&&x.docs.length)return x;}
    if(!document.body.classList.contains("loaded"))return {active:-1,docs:[]};
    var ta=document.getElementById("rawInput");
    return {active:0,docs:[{path:window.__mdPath||null,dir:window.__mdDir||null,name:window.__mdName||null,fname:window.__fname||null,
      text:ta?ta.value:(window.__lastText||""),baseline:window.__getSaved?window.__getSaved():null,drop:window.__drop||{}}]};
  }
  window.__recoverCollect=collect;   /* 진단·검증용(부작용 없음) */

  /* --- 1) 부팅 시 복원: 스태시가 있으면 문서들을 탭으로 되살리고 활성 탭 복귀 → 토스트 --- */
  (function restore(){
    var raw=null;try{raw=localStorage.getItem(KEY);}catch(e){}
    if(!raw)return;
    try{localStorage.removeItem(KEY);}catch(e){}
    var d=null;try{d=JSON.parse(raw);}catch(e){}
    if(d&&typeof d.text==="string"&&!d.docs)d={active:0,docs:[d]};   /* 이전 버전(문서 하나) 스태시 */
    if(!d||!Array.isArray(d.docs)||!d.docs.length)return;
    (function apply(){
      if(typeof window.__openDoc!=="function"&&typeof window.renderMarkdown!=="function"){setTimeout(apply,60);return;}   /* app.js·tabs.js 준비 대기 */
      var n=0;
      d.docs.forEach(function(x){
        if(!x||typeof x.text!=="string")return;
        try{
          var drop=(x.drop&&typeof x.drop==="object")?x.drop:{};
          var base=(typeof x.baseline==="string")?x.baseline:undefined;
          if(window.__openDoc){   /* 복원 문서도 탭으로(기준선을 넘겨 미저장이면 ● 그대로) */
            window.__openDoc({path:x.path||null,dir:x.dir||null,name:x.name||null,fname:x.fname||null,text:x.text,baseline:base,drop:drop});
          }else{   /* 탭 모듈 없음(폴백): 편집기 하나라 마지막 문서가 남는다 */
            window.__drop=drop;
            if(x.path){window.__mdPath=x.path;window.__mdDir=x.dir||null;window.__mdName=x.name||null;window.__fname=x.fname||null;}
            window.renderMarkdown(x.text);
            if(base!==undefined&&window.__setSaved)window.__setSaved(base);
            if(typeof window.__renderFileBadge==="function")window.__renderFileBadge();
          }
          n++;
        }catch(e){}
      });
      if(d.active>=0&&window.__tabsActivate){try{window.__tabsActivate(d.active);}catch(e){}}
      if(!n)return;
      var msg="재연결 후 열려 있던 문서 "+n+"개를 복원했어요"+(d.lite?" (용량 문제로 이미지는 빠졌어요)":"");
      (function toastWhenBooted(tries){   /* 부팅 스플래시가 걷힌 뒤 보여야 눈에 띈다 */
        if(document.body.classList.contains("booted")||tries>40){if(window.__toast)window.__toast(msg,3200);return;}
        setTimeout(function(){toastWhenBooted(tries+1);},150);
      })(0);
    })();
  })();

  /* --- 2) 연결 끊김 감지 → 열린 문서 저장 후 새로고침 (EXE 에서만) --- */
  if(typeof window.NL_PORT==="undefined"||typeof window.Neutralino==="undefined")return;
  var handled=false;
  function onOffline(){
    if(handled)return; handled=true;
    try{
      var payload=collect();
      if(payload.docs.length){
        try{localStorage.setItem(KEY,JSON.stringify(payload));}
        catch(e){   /* 용량 초과 → 이미지 풀(data URI)을 빼고 글만이라도 */
          try{payload.docs.forEach(function(x){delete x.drop;});payload.lite=true;localStorage.setItem(KEY,JSON.stringify(payload));}catch(_){}
        }
      }
    }catch(e){}
    try{var m=document.getElementById("updModal"),t=document.getElementById("updMsg");if(t)t.textContent="백그라운드 연결이 끊겨 다시 연결하는 중…";if(m)m.hidden=false;}catch(e){}
    setTimeout(function(){try{window.location.reload();}catch(e){}},700);
  }
  try{Neutralino.events.on("serverOffline",onOffline);}catch(e){}
})();
