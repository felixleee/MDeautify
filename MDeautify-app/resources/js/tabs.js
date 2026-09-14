/* ===== 탭(멀티 문서) =====
   여러 md를 탭으로 열어 두고 전환. "문서별 상태"를 세션 객체로 관리하되,
   기존 전역변수(__mdPath·__mdDir·__mdName·__fname·__drop·__imgFiles + 편집기 내용 + 저장 기준선)는
   '활성 문서의 라이브 상태'로 그대로 두고 → 탭 전환 때만 스냅샷/복원(기존 로직 64곳 재사용).

   세션: {id, path, dir, name, fname, text, baseline, drop, imgFiles, scroll}
   - baseline = 마지막 저장/로드 시점 내용(변경감지 기준). text!==baseline → dirty.
   - path 있는 문서는 경로로 중복 방지(이미 열렸으면 그 탭 포커스). path 없는 문서(드롭·브라우저)는 항상 새 탭.

   ⚠️ MVP: undo 히스토리는 탭 전환 시 초기화(단일 textarea 재사용), 재시작 시 탭 복원 없음(세션 한정).
      hlMd·renderMarkdown·renderPreview·__renderFileBadge·__getSaved/__setSaved 는 app.js 전역. */
(function(){
  var sessions=[];
  var activeId=null;
  var seq=1;

  var bar=null;
  function ensureBar(){
    if(bar)return bar;
    bar=document.getElementById("tabBar");
    return bar;
  }
  function norm(p){return String(p||"").replace(/[\\/]+/g,"\\").replace(/\\+$/,"").toLowerCase();}
  function byId(id){for(var i=0;i<sessions.length;i++)if(sessions[i].id===id)return sessions[i];return null;}
  function findByPath(p){if(!p)return null;var n=norm(p);for(var i=0;i<sessions.length;i++)if(sessions[i].path&&norm(sessions[i].path)===n)return sessions[i];return null;}
  function isDirty(s){return !!s&&s.text!==s.baseline;}

  function el(tag,cls){var d=document.createElement(tag);if(cls)d.className=cls;return d;}

  /* ---- 렌더 ---- */
  function renderTabs(){
    ensureBar();if(!bar)return;
    if(!sessions.length){bar.hidden=true;bar.innerHTML="";return;}
    bar.hidden=false;
    bar.innerHTML="";
    sessions.forEach(function(s){
      var t=el("div","tab"+(s.id===activeId?" active":"")+(isDirty(s)?" dirty":""));
      t.setAttribute("data-id",s.id);
      t.title=s.path||s.name;
      var nm=el("span","tab-name");nm.textContent=s.name||"문서";
      var dot=el("span","tab-dot");dot.setAttribute("aria-hidden","true");
      var x=el("button","tab-x");x.type="button";x.title="닫기";x.setAttribute("aria-label","닫기");x.innerHTML="&#10005;";
      t.appendChild(nm);t.appendChild(dot);t.appendChild(x);
      t.addEventListener("mousedown",function(e){   /* 가운데 클릭=닫기 */
        if(e.button===1){e.preventDefault();closeTab(s.id);}
      });
      t.addEventListener("click",function(e){
        if(e.target===x||x.contains(e.target)){e.stopPropagation();closeTab(s.id);return;}
        switchTo(s.id);
      });
      bar.appendChild(t);
    });
    var act=bar.querySelector(".tab.active");if(act&&act.scrollIntoView){try{act.scrollIntoView({inline:"nearest",block:"nearest"});}catch(e){}}
  }

  /* ---- 라이브 상태 <-> 세션 ---- */
  function ta(){return document.getElementById("rawInput");}
  function mirror(){return document.getElementById("raw");}

  function snapshotActive(){
    if(activeId==null)return;
    var s=byId(activeId);if(!s)return;
    var t=ta();
    if(t)s.text=t.value;
    if(window.__getSaved)s.baseline=window.__getSaved();
    s.path=window.__mdPath||null;s.dir=window.__mdDir||null;
    s.name=window.__mdName||s.name;s.fname=window.__fname||s.fname;
    s.drop=window.__drop||{};s.imgFiles=window.__imgFiles||[];
    if(t)s.scroll=t.scrollTop;
  }

  /* 세션 → 라이브(전환/복원): baseline 보존(dirty 유지), renderMarkdown 안 씀(그건 baseline 을 clean 으로 리셋) */
  function restore(s){
    window.__mdPath=s.path||null;window.__mdDir=s.dir||null;window.__mdName=s.name||null;window.__fname=s.fname||null;
    window.__drop=s.drop||{};window.__imgFiles=s.imgFiles||[];
    var t=ta(),m=mirror();
    if(t)t.value=s.text;
    if(window.__setSaved)window.__setSaved(s.baseline);
    document.body.classList.add("loaded");if(window.__relayoutPanes)window.__relayoutPanes();
    if(m&&typeof hlMd==="function")m.innerHTML=hlMd(s.text);
    if(typeof renderPreview==="function")renderPreview(s.text,false);
    if(t){t.scrollTop=s.scroll||0;if(m){m.scrollTop=t.scrollTop;m.scrollLeft=t.scrollLeft;}}
    var fh=document.getElementById("findHl");if(fh)fh.innerHTML="";   /* 이전 탭의 찾기 하이라이트 잔상 제거 */
    if(window.__renderFileBadge)window.__renderFileBadge();
  }

  function switchTo(id){
    if(id===activeId)return;
    snapshotActive();
    activeId=id;
    restore(byId(id));
    renderTabs();
  }

  /* 문서 열기/포커스: app.js 의 openMd·drop·loadFile·recover 가 호출 */
  function openDoc(meta){
    meta=meta||{};
    snapshotActive();
    if(meta.path){
      var ex=findByPath(meta.path);
      if(ex){activeId=ex.id;restore(ex);renderTabs();return;}   /* 이미 열림 → 포커스 */
    }
    var s={id:seq++,path:meta.path||null,dir:meta.dir||null,name:meta.name||"document",
           fname:meta.fname||"document",text:meta.text||"",baseline:meta.text||"",
           drop:meta.drop||{},imgFiles:[],scroll:0};
    sessions.push(s);activeId=s.id;
    /* 신규 탭 = 라이브에 실어 renderMarkdown 으로 로드(baseline clean, 미러·프리뷰·이미지 처리 일괄) */
    window.__mdPath=s.path;window.__mdDir=s.dir;window.__mdName=s.name;window.__fname=s.fname;
    window.__drop=s.drop;window.__imgFiles=[];
    document.body.classList.add("loaded");if(window.__relayoutPanes)window.__relayoutPanes();
    if(typeof renderMarkdown==="function")renderMarkdown(s.text);
    if(window.__renderFileBadge)window.__renderFileBadge();
    renderTabs();
  }

  function clearToEmpty(){
    activeId=null;
    document.body.classList.remove("loaded");
    window.__mdPath=null;window.__mdDir=null;window.__mdName=null;window.__fname=null;
    window.__drop={};window.__imgFiles=[];
    var t=ta(),m=mirror();
    if(t)t.value="";
    if(m)m.innerHTML="";
    if(window.__setSaved)window.__setSaved("");
    var pages=document.getElementById("pages");if(pages)pages.innerHTML="";
    var pv=document.querySelector(".pv-head");if(pv)pv.textContent="Total 0 pages";
    var fh=document.getElementById("findHl");if(fh)fh.innerHTML="";
    if(window.__renderFileBadge)window.__renderFileBadge();
  }

  async function closeTab(id){
    var s=byId(id);if(!s)return;
    if(id===activeId)snapshotActive();   /* 활성 탭이면 라이브 → 세션 반영 후 dirty 판정 */
    if(isDirty(s)){
      var choice="discard";
      if(window.__confirmSave3){
        choice=await window.__confirmSave3({
          title:"저장하고 닫기",
          message:"'"+(s.name||"문서")+"'에 저장하지 않은 변경사항이 있어요.\n저장한 뒤 닫을까요?",
          saveText:"저장하고 닫기",discardText:"저장 안 함",cancelText:"취소"
        });
      }
      if(choice==="cancel")return;
      if(choice==="save"){
        if(id!==activeId){activeId=id;restore(s);renderTabs();}   /* 저장은 라이브(활성)에 대해서만 → 먼저 활성화 */
        var hadPath=!!window.__mdPath;
        if(window.__saveMd)await window.__saveMd();
        if(!hadPath&&!window.__mdPath)return;   /* 경로 없던 문서 저장 다이얼로그 취소 → 닫기도 취소(유실 방지) */
        snapshotActive();   /* 저장 후 baseline 갱신 반영 */
      }
    }
    var idx=-1;for(var i=0;i<sessions.length;i++)if(sessions[i].id===id){idx=i;break;}
    if(idx<0)return;
    var wasActive=(id===activeId);
    sessions.splice(idx,1);
    if(!sessions.length){clearToEmpty();renderTabs();return;}
    if(wasActive){
      var next=sessions[idx]||sessions[idx-1]||sessions[0];
      activeId=next.id;restore(next);
    }
    renderTabs();
  }

  /* 편집 중 활성 탭 dirty 점 갱신(입력 핸들러에서 호출) */
  var edTmr=null;
  window.__tabsOnEdit=function(){
    if(activeId==null)return;
    clearTimeout(edTmr);
    edTmr=setTimeout(function(){
      var s=byId(activeId);if(!s)return;
      var t=ta();var curDirty=t?(t.value!==(window.__getSaved?window.__getSaved():s.baseline)):isDirty(s);
      var chip=bar&&bar.querySelector('.tab[data-id="'+activeId+'"]');
      if(chip)chip.classList.toggle("dirty",!!curDirty);
    },120);
  };

  window.__openDoc=openDoc;
  window.__tabsCount=function(){return sessions.length;};
  window.__closeActiveTab=function(){if(activeId!=null)closeTab(activeId);};

  /* ===== Ctrl/Cmd+W: 현재 문서(활성 탭) 닫기 =====
     - 더티(미저장)면 저장/버리기/취소 모달, 마지막 탭이면 빈 화면 → 기존 closeTab 로직 그대로 재사용.
     - "커서가 md뷰어/에디터에 있을 때"만: 모달·팝오버가 떠 있거나 찾기 입력에 포커스면 양보(기본 동작 유지).
     - capture 단계 + preventDefault 로 웹뷰 기본 동작보다 먼저 가로챈다(브라우저 탭에선 막을 수 없어 exe 에서만 유효). */
  function anyOverlayOpen(){
    var ids=["appModal","updModal","notesModal","themeModal","settingsModal"];
    for(var i=0;i<ids.length;i++){var m=document.getElementById(ids[i]);if(m&&!m.hidden)return true;}
    return false;
  }
  document.addEventListener("keydown",function(e){
    if(!((e.ctrlKey||e.metaKey)&&!e.shiftKey&&!e.altKey))return;
    if(e.key!=="w"&&e.key!=="W")return;
    if(e.repeat)return;                                   /* 키 반복으로 여러 탭이 우르르 닫히는 것 방지 */
    if(activeId==null)return;                             /* 열린 문서 없음 → 기본 동작 양보 */
    if(anyOverlayOpen())return;                           /* 저장/확인/설정 등 떠 있음 → 양보 */
    var ae=document.activeElement;
    if(ae&&(ae.id==="fbFind"||ae.id==="fbRepl"))return;   /* 찾기/바꾸기 입력 중 → 양보 */
    e.preventDefault();
    closeTab(activeId);
  },true);

  document.addEventListener("md2pdf:settings-hydrated",function(){ensureBar();renderTabs();});
  ensureBar();
})();
