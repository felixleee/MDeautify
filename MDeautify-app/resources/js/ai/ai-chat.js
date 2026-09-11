/* ===== AI 작성 도우미 채팅 패널 =====
   미리보기 오른쪽 접이식 패널. 대화형(multi-turn) 으로 마크다운 작성/편집을 요청하고 응답을 에디터에 삽입/복사.
   백엔드는 window.__aiProviders (어댑터). EXE=Claude Code CLI(로그인 재사용·키 불필요), 브라우저(개발)=모의 응답.
   상태 지속: md2pdf_ai_open / md2pdf_ai_model / md2pdf_ai_w (settings-store가 settings.json 미러). */
(function(){
  var isExe=(typeof window.NL_PORT!=="undefined"&&typeof window.Neutralino!=="undefined");
  var $=function(id){return document.getElementById(id);};

  /* 개발(브라우저)용 모의 provider — 스트리밍/삽입 UX 확인용 */
  var MOCK={
    label:"모의 응답 (개발 모드)",
    models:[{id:"mock",label:"Mock"}],
    defaultModel:"mock",
    sendChat:function(opts){
      var last=(opts.messages[opts.messages.length-1]||{}).content||"";
      var reply="**개발 모드 모의 응답**\n\n요청을 받았어요:\n\n> "+last+"\n\n실제 응답은 설치형(EXE)에서 Claude Code CLI로 옵니다.\n\n| 항목 | 값 |\n|---|---|\n| 상태 | OK |";
      var i=0,cancelled=false;
      var t=setInterval(function(){
        if(cancelled){clearInterval(t);return;}
        opts.onDelta(reply.slice(i,i+6));i+=6;
        if(i>=reply.length){clearInterval(t);opts.onDone();}
      },25);
      if(opts.setCanceller)opts.setCanceller(function(){cancelled=true;clearInterval(t);opts.onDone();});
    }
  };

  var provider=isExe&&window.__aiProviders&&window.__aiProviders.cli?window.__aiProviders.cli:MOCK;

  var panel,logEl,inputEl,sendBtn,stopBtn,ctxEl,modelEl,mockHint,setupCard,inputWrap;
  var INSTALL_URL="https://code.claude.com/docs/en/setup";
  var msgs=[],busy=false,canceller=null;

  function scrollBottom(){if(logEl)logEl.scrollTop=logEl.scrollHeight;}

  function addBubble(role){
    var wrap=document.createElement("div");wrap.className="ai-msg "+role;
    var body=document.createElement("div");body.className="ai-bubble";
    wrap.appendChild(body);logEl.appendChild(wrap);scrollBottom();
    return {wrap:wrap,body:body};
  }
  function addActions(bubbleWrap,getText){
    var row=document.createElement("div");row.className="ai-actions";
    var ins=document.createElement("button");ins.type="button";ins.className="ai-act";ins.textContent="에디터에 삽입";
    ins.addEventListener("click",function(){var t=getText();if(window.__img&&window.__img.insert)window.__img.insert(t);if(window.__toast)window.__toast("삽입됨");});
    var cp=document.createElement("button");cp.type="button";cp.className="ai-act";cp.textContent="복사";
    cp.addEventListener("click",function(){copyText(getText());});
    row.appendChild(ins);row.appendChild(cp);
    bubbleWrap.appendChild(row);
  }
  function copyText(t){
    try{if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(function(){if(window.__toast)window.__toast("복사됨");},function(){fallbackCopy(t);});return;}}catch(e){}
    fallbackCopy(t);
  }
  function fallbackCopy(t){try{var ta=document.createElement("textarea");ta.value=t;document.body.appendChild(ta);ta.select();document.execCommand("copy");ta.remove();if(window.__toast)window.__toast("복사됨");}catch(e){}}

  function setBusy(b){busy=b;if(sendBtn)sendBtn.disabled=b;if(inputEl)inputEl.disabled=b;}
  /* 중단 버튼 표시 = 요청 보낸 뒤 답변이 나오기 전까지만. 표시 중엔 전송 버튼 숨김(자리 공유). */
  function showStop(v){if(stopBtn)stopBtn.hidden=!v;if(sendBtn)sendBtn.hidden=v;}
  /* textarea: 기본 높이에서 내용 따라 최대치(CSS max-height)까지 유동 확장 */
  function autoGrow(){if(!inputEl)return;inputEl.style.height="auto";inputEl.style.height=Math.min(inputEl.scrollHeight,140)+"px";}

  /* 문서 컨텍스트(토글 ON 이면 편집 중인 md 전체, 아니면 빈 문자열) */
  function currentContext(){
    if(ctxEl&&ctxEl.checked){var ta=document.getElementById("rawInput");var md=ta?ta.value:"";if(md.trim())return md;}
    return "";
  }

  function send(){
    if(busy)return;
    var text=(inputEl.value||"").trim();
    if(!text)return;
    inputEl.value="";autoGrow();
    msgs.push({role:"user",content:text});
    var u=addBubble("user");u.body.textContent=text;
    var a=addBubble("assistant");a.wrap.classList.add("streaming");
    a.body.textContent="작성 중…";
    var acc="",started=false;
    setBusy(true);showStop(true);canceller=null;
    provider.sendChat({
      messages:msgs.slice(),
      model:(modelEl&&modelEl.value)||provider.defaultModel,
      system:currentContext(),
      onDelta:function(t){if(!started){started=true;a.body.textContent="";showStop(false);}acc+=t;a.body.textContent=acc;scrollBottom();},
      onDone:function(){
        a.wrap.classList.remove("streaming");
        setBusy(false);showStop(false);
        if(acc.trim()){msgs.push({role:"assistant",content:acc});addActions(a.wrap,function(){return acc;});}
        else{a.body.textContent="(빈 응답)";}
        scrollBottom();
      },
      onError:function(e){
        a.wrap.classList.remove("streaming");a.wrap.classList.add("error");
        a.body.textContent="⚠ "+(e||"오류가 발생했습니다.");
        msgs.pop();   /* 실패한 user 턴 제거(다음 요청 오염 방지) */
        setBusy(false);showStop(false);scrollBottom();
      },
      onNeedLogin:function(){
        a.wrap.classList.remove("streaming");a.wrap.classList.add("error");
        a.body.textContent="⚠ Claude에 로그인이 필요합니다. 아래 버튼을 누르면 터미널이 열려요 — 브라우저 안내에 따라 1회 로그인하면 됩니다.";
        if(provider.openLoginTerminal){
          var row=document.createElement("div");row.className="ai-actions";
          var b=document.createElement("button");b.type="button";b.className="ai-act";b.textContent="로그인 창 열기";
          b.addEventListener("click",doLogin);
          row.appendChild(b);a.wrap.appendChild(row);
        }
        msgs.pop();setBusy(false);showStop(false);scrollBottom();
      },
      setCanceller:function(fn){canceller=fn;}
    });
  }

  function stop(){if(canceller){try{canceller();}catch(e){}}setBusy(false);showStop(false);}
  function clearChat(){msgs=[];if(logEl)logEl.innerHTML="";}

  function refreshState(){if(mockHint)mockHint.hidden=(provider!==MOCK);}
  /* CLI 설치 감지 → 없으면 설치 안내 카드, 채팅 영역 숨김 */
  function showSetup(show){if(setupCard)setupCard.hidden=!show;if(logEl)logEl.hidden=show;if(inputWrap)inputWrap.hidden=show;}
  async function checkAvail(force){
    if(!provider.detect){showSetup(false);return;}   /* 모의 provider 등 감지 없음 → 정상 */
    try{var r=await provider.detect(force);if(r&&r.installed){showSetup(false);}else{resetSetup();showSetup(true);}}catch(e){showSetup(false);}
  }
  function openInstall(){var u=INSTALL_URL;try{if(window.Neutralino&&Neutralino.os&&Neutralino.os.open){Neutralino.os.open(u);return;}}catch(e){}try{window.open(u,"_blank");}catch(e){}}

  /* ---- 설치 카드 상태 전환 (미설치 → 설치중 → 설치완료·로그인 → 채팅) ---- */
  var setupTitle,setupTxt,installBtn,loginBtn,startBtn,recheckBtn,installLog;
  function resetSetup(){   /* 미설치 초기 상태 */
    if(setupTitle)setupTitle.textContent="AI 도우미 준비하기";
    if(setupTxt)setupTxt.innerHTML="이 기능은 <b>Claude Code</b>를 사용합니다(별도 API 키 불필요). 아래 <b>자동 설치</b> 버튼을 누르면 <b>npm·Node 없이</b> 공식 프로그램을 바로 설치해요. 설치 후 Claude 계정으로 1회 로그인만 하면 됩니다.";
    if(installBtn){installBtn.hidden=false;installBtn.disabled=false;}
    if(loginBtn)loginBtn.hidden=true;
    if(startBtn)startBtn.hidden=true;
    if(recheckBtn)recheckBtn.disabled=false;
    if(installLog){installLog.hidden=true;installLog.textContent="";}
  }
  function toInstalledState(){   /* 설치완료 → 로그인 안내 */
    if(setupTitle)setupTitle.textContent="설치 완료 — 로그인만 하면 됩니다";
    if(setupTxt)setupTxt.innerHTML="Claude 계정(Pro/Max 등)으로 <b>1회 로그인</b>이 필요합니다. <b>로그인 창 열기</b>를 누르면 터미널이 열리고 브라우저 안내에 따라 로그인할 수 있어요. 로그인 후 <b>채팅 시작</b>을 누르세요.";
    if(installBtn)installBtn.hidden=true;
    if(loginBtn)loginBtn.hidden=false;
    if(startBtn)startBtn.hidden=false;
    if(installLog)installLog.hidden=true;
  }
  function doInstall(){
    if(!provider.install)return;
    if(installBtn)installBtn.disabled=true;
    if(recheckBtn)recheckBtn.disabled=true;
    if(loginBtn)loginBtn.hidden=true;
    if(startBtn)startBtn.hidden=true;
    if(setupTitle)setupTitle.textContent="설치 중…";
    if(setupTxt)setupTxt.textContent="공식 Claude Code를 다운로드해 설치하고 있어요. 30초 정도 걸릴 수 있어요.";
    if(installLog){installLog.hidden=false;installLog.textContent="";}
    provider.install({
      onLog:function(s){if(installLog){installLog.textContent=(installLog.textContent+s).slice(-4000);installLog.scrollTop=installLog.scrollHeight;}},
      onDone:async function(){
        var ok=false;try{var r=await provider.detect(true);ok=!!(r&&r.installed);}catch(e){}
        if(installBtn)installBtn.disabled=false;if(recheckBtn)recheckBtn.disabled=false;
        if(ok){toInstalledState();if(window.__toast)window.__toast("설치 완료");}
        else{
          if(setupTitle)setupTitle.textContent="설치가 확인되지 않았습니다";
          if(setupTxt)setupTxt.textContent="설치 로그를 확인하거나 아래 '직접 설치할래요'를 이용해 주세요. 완료했다면 [다시 확인]을 누르세요.";
          if(installBtn)installBtn.hidden=false;
        }
      },
      onError:function(e){
        if(installBtn){installBtn.disabled=false;installBtn.hidden=false;}
        if(recheckBtn)recheckBtn.disabled=false;
        if(setupTitle)setupTitle.textContent="설치 실패";
        if(setupTxt)setupTxt.textContent="⚠ "+(e||"오류가 발생했습니다.")+" 아래 '직접 설치할래요'를 이용해 주세요.";
      }
    });
  }
  /* ---- 로그인 가이드 모달(슬라이드): 콘솔 창과 함께 앱 안에서 단계별 안내 ---- */
  var LG_STEPS=[
    {art:"<svg viewBox='0 0 140 96' fill='none' xmlns='http://www.w3.org/2000/svg'><rect x='8' y='12' width='124' height='76' rx='8' stroke='currentColor' stroke-width='2.5'/><path d='M8 28 H132' stroke='currentColor' stroke-width='2.5'/><circle cx='18' cy='20' r='2.6' fill='var(--ui-brand-accent)'/><circle cx='27' cy='20' r='2.6' fill='currentColor' opacity='.35'/><circle cx='36' cy='20' r='2.6' fill='currentColor' opacity='.35'/><path d='M20 52 l5 5 l-5 5' stroke='currentColor' stroke-opacity='.55' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'/><text x='33' y='61' font-family='ui-monospace, Consolas, monospace' font-size='13' font-weight='700' fill='var(--ui-brand-accent)'>/login</text></svg>",img:"assets/claude/step1.png",title:"창에 /login 입력",desc:"로그인 창이 열리면 /login 을 입력하고 Enter를 누르세요.",reopen:true},
    {art:"<svg viewBox='0 0 140 96' fill='none' xmlns='http://www.w3.org/2000/svg'><rect x='8' y='10' width='124' height='76' rx='8' stroke='currentColor' stroke-width='2.5'/><rect x='20' y='26' width='100' height='15' rx='4' fill='var(--ui-brand-accent)' fill-opacity='.16' stroke='var(--ui-brand-accent)' stroke-width='2'/><path d='M27 30 l4 3.5 l-4 3.5' stroke='var(--ui-brand-accent)' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'/><rect x='38' y='31' width='58' height='5' rx='2.5' fill='var(--ui-brand-accent)'/><rect x='20' y='50' width='100' height='10' rx='3' fill='currentColor' fill-opacity='.2'/><rect x='20' y='66' width='72' height='10' rx='3' fill='currentColor' fill-opacity='.2'/></svg>",img:"assets/claude/step2.png",title:"로그인 방법 선택",desc:"‘1. Claude account with subscription’ 이 선택된 상태에서 Enter를 누르세요."},
    {art:"<svg viewBox='0 0 140 96' fill='none' xmlns='http://www.w3.org/2000/svg'><rect x='8' y='12' width='124' height='76' rx='8' stroke='currentColor' stroke-width='2.5'/><path d='M8 28 H132' stroke='currentColor' stroke-width='2.5'/><circle cx='18' cy='20' r='2.6' fill='var(--ui-brand-accent)'/><circle cx='27' cy='20' r='2.6' fill='currentColor' opacity='.35'/><circle cx='36' cy='20' r='2.6' fill='currentColor' opacity='.35'/><rect x='20' y='42' width='92' height='5' rx='2.5' fill='var(--ui-brand-accent)'/><rect x='20' y='52' width='104' height='5' rx='2.5' fill='var(--ui-brand-accent)' fill-opacity='.55'/><rect x='20' y='62' width='58' height='5' rx='2.5' fill='var(--ui-brand-accent)' fill-opacity='.55'/><rect x='98' y='60' width='15' height='13' rx='3' stroke='currentColor' stroke-width='2'/><rect x='102' y='56' width='15' height='13' rx='3' fill='var(--tm-card)' stroke='var(--ui-brand-accent)' stroke-width='2'/></svg>",img:"assets/claude/stepurl.png",title:"브라우저가 열려요",desc:"보통은 브라우저가 자동으로 열립니다. 안 열리면 창에 표시된 주소를 ‘c’로 복사해 브라우저 주소창에 붙여넣으세요."},
    {art:"<svg viewBox='0 0 140 96' fill='none' xmlns='http://www.w3.org/2000/svg'><rect x='8' y='12' width='124' height='72' rx='8' stroke='currentColor' stroke-width='2.5'/><path d='M8 30 H132' stroke='currentColor' stroke-width='2.5'/><rect x='20' y='18' width='78' height='6' rx='3' fill='currentColor' fill-opacity='.28'/><circle cx='115' cy='21' r='3' fill='currentColor' fill-opacity='.28'/><rect x='45' y='46' width='50' height='21' rx='6' fill='var(--ui-brand-accent)'/><path d='M58 56.5 l5 5 l11 -12' stroke='#fff' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'/></svg>",img:"assets/claude/step3.png",title:"브라우저에서 승인",desc:"브라우저에서 Claude 계정으로 로그인하고 ‘승인’을 누르세요."},
    {art:"<svg viewBox='0 0 140 96' fill='none' xmlns='http://www.w3.org/2000/svg'><rect x='16' y='18' width='58' height='24' rx='6' fill='var(--ui-brand-accent)' fill-opacity='.14' stroke='var(--ui-brand-accent)' stroke-width='2'/><rect x='24' y='27' width='30' height='4' rx='2' fill='var(--ui-brand-accent)'/><rect x='24' y='34' width='20' height='3' rx='1.5' fill='var(--ui-brand-accent)' fill-opacity='.6'/><path d='M80 30 h22 m-6 -5 l6 5 l-6 5' stroke='currentColor' stroke-opacity='.6' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'/><rect x='16' y='56' width='108' height='24' rx='6' stroke='currentColor' stroke-width='2'/><path d='M24 63 l4 5 l-4 5' stroke='currentColor' stroke-opacity='.6' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'/><rect x='34' y='66' width='62' height='5' rx='2.5' fill='var(--ui-brand-accent)'/></svg>",img:"assets/claude/step4.png",title:"인증 코드 붙여넣기",desc:"승인 후 나오는 인증 코드를 복사해, 콘솔의 ‘Paste code here’에 붙여넣고 Enter. (자동으로 로그인되면 이 단계는 없어요.)"},
    {art:"<svg viewBox='0 0 140 96' fill='none' xmlns='http://www.w3.org/2000/svg'><circle cx='70' cy='50' r='30' fill='var(--ui-brand-accent)' fill-opacity='.14' stroke='var(--ui-brand-accent)' stroke-width='2.5'/><path d='M56 50 l10 10 l20 -22' stroke='var(--ui-brand-accent)' stroke-width='4.2' stroke-linecap='round' stroke-linejoin='round'/><path d='M112 20 l2 6.5 l6.5 2 l-6.5 2 l-2 6.5 l-2 -6.5 l-6.5 -2 l6.5 -2 z' fill='var(--ui-brand-accent)'/></svg>",img:"assets/claude/step5.png",title:"다 됐어요",desc:"‘Login successful’이 뜨면 Enter를 누르세요. 창은 닫아도 되고, 이제 전송하면 AI가 동작합니다."}
  ];
  var lgOverlay=null,lgIdx=0,lgKeyH=null,lgPrevFocus=null;
  function lgEnsure(){
    if(lgOverlay)return;
    lgOverlay=document.createElement("div");lgOverlay.id="loginGuide";lgOverlay.hidden=true;
    lgOverlay.innerHTML="<div class='lg-card' role='dialog' aria-modal='true' aria-label='로그인 안내'>"+
      "<button type='button' class='lg-x' aria-label='닫기'>✕</button>"+
      "<div class='lg-scroll'>"+
      "<div class='lg-stage'><div class='lg-art'></div><div class='lg-step'></div><div class='lg-title'></div><div class='lg-desc'></div>"+
      "<button type='button' class='lg-reopen' hidden>로그인 창 다시 열기</button></div>"+
      "<div class='lg-dots'></div>"+
      "</div>"+
      "<div class='lg-nav'><button type='button' class='lg-prev'>이전</button><button type='button' class='lg-next'>다음</button></div></div>";
    document.body.appendChild(lgOverlay);
    lgOverlay.querySelector(".lg-x").addEventListener("click",lgClose);
    lgOverlay.querySelector(".lg-prev").addEventListener("click",function(){lgGo(lgIdx-1);});
    lgOverlay.querySelector(".lg-next").addEventListener("click",function(){if(lgIdx>=LG_STEPS.length-1)lgClose();else lgGo(lgIdx+1);});
    lgOverlay.querySelector(".lg-reopen").addEventListener("click",function(){if(provider.openLoginTerminal){provider.openLoginTerminal();if(window.__toast)window.__toast("로그인 창을 다시 열었습니다");}});
    lgOverlay.addEventListener("click",function(e){if(e.target===lgOverlay)lgClose();});
  }
  function lgGo(i){lgIdx=Math.max(0,Math.min(LG_STEPS.length-1,i));lgRender();}
  function lgRender(){
    var s=LG_STEPS[lgIdx];
    var art=lgOverlay.querySelector(".lg-art");
    if(s.img){   /* 실제 캡처가 있으면 표시, 로드 실패 시 SVG 로 폴백 */
      art.innerHTML="";art.classList.add("has-shot");
      var im=document.createElement("img");im.className="lg-shot";im.src=s.img;im.alt="";
      im.onerror=function(){art.classList.remove("has-shot");art.innerHTML=s.art;};
      art.appendChild(im);
    }else{art.classList.remove("has-shot");art.innerHTML=s.art;}
    lgOverlay.querySelector(".lg-step").textContent=(lgIdx+1)+" / "+LG_STEPS.length;
    lgOverlay.querySelector(".lg-title").textContent=s.title;
    lgOverlay.querySelector(".lg-desc").textContent=s.desc;
    lgOverlay.querySelector(".lg-reopen").hidden=!s.reopen;
    var sc=lgOverlay.querySelector(".lg-scroll");if(sc)sc.scrollTop=0;
    lgOverlay.querySelector(".lg-prev").disabled=(lgIdx===0);
    lgOverlay.querySelector(".lg-next").textContent=(lgIdx>=LG_STEPS.length-1)?"완료":"다음";
    var dots=lgOverlay.querySelector(".lg-dots");dots.innerHTML="";
    LG_STEPS.forEach(function(_,i){var d=document.createElement("button");d.type="button";d.className="lg-dot"+(i===lgIdx?" on":"");d.addEventListener("click",function(){lgGo(i);});dots.appendChild(d);});
  }
  function lgClose(){if(!lgOverlay)return;lgOverlay.hidden=true;if(lgKeyH){document.removeEventListener("keydown",lgKeyH,true);lgKeyH=null;}if(lgPrevFocus&&lgPrevFocus.focus){try{lgPrevFocus.focus();}catch(e){}}}
  function showLoginGuide(){
    lgEnsure();lgIdx=0;lgPrevFocus=document.activeElement;lgRender();lgOverlay.hidden=false;
    lgKeyH=function(e){if(e.key==="Escape"){e.preventDefault();lgClose();}else if(e.key==="ArrowRight"){lgGo(lgIdx+1);}else if(e.key==="ArrowLeft"){lgGo(lgIdx-1);}};
    document.addEventListener("keydown",lgKeyH,true);
    setTimeout(function(){try{lgOverlay.querySelector(".lg-next").focus();}catch(e){}},0);
  }
  /* 로그인 시작: 앱 안 가이드 모달을 띄우고, 콘솔 창(claude /login)도 실행 */
  async function doLogin(){
    if(!provider.openLoginTerminal)return;
    showLoginGuide();
    var ok=await provider.openLoginTerminal();
    if(!ok&&window.__toast)window.__toast("로그인 창을 열지 못했습니다 — 터미널에서 claude 실행");
  }

  /* ---- 열기/닫기 + 너비 ---- */
  function setOpen(open){
    if(!panel)return;
    panel.hidden=!open;
    var rez=$("aiResizer");if(rez)rez.hidden=!open;
    var btn=$("btnAI");if(btn)btn.classList.toggle("on",open);
    try{localStorage.setItem("md2pdf_ai_open",open?"1":"0");}catch(e){}
    if(open){refreshState();checkAvail();setTimeout(function(){try{inputEl.focus();}catch(e){}},0);}
  }
  function toggleOpen(){setOpen(panel&&panel.hidden);}
  function applyWidth(){var w=null;try{w=parseInt(localStorage.getItem("md2pdf_ai_w"),10);}catch(e){}if(w&&w>=240&&w<=640)panel.style.flex="0 0 "+w+"px";}
  function applyOpenDefault(){var s=null;try{s=localStorage.getItem("md2pdf_ai_open");}catch(e){}setOpen(s==="1");}
  function applyModel(){
    if(!modelEl)return;
    modelEl.innerHTML="";
    provider.models.forEach(function(m){var o=document.createElement("option");o.value=m.id;o.textContent=m.label;modelEl.appendChild(o);});
    var saved=null;try{saved=localStorage.getItem("md2pdf_ai_model");}catch(e){}
    if(saved&&provider.models.some(function(m){return m.id===saved;}))modelEl.value=saved;
    else modelEl.value=provider.defaultModel;
  }

  function initResizer(){
    var rez=$("aiResizer"),main=$("main");if(!rez||!main)return;
    var dragging=false,lastW=340;
    rez.addEventListener("mousedown",function(e){dragging=true;rez.classList.add("drag");document.body.style.userSelect="none";document.body.style.cursor="col-resize";e.preventDefault();});
    window.addEventListener("mousemove",function(e){if(!dragging)return;var r=main.getBoundingClientRect();var w=r.right-e.clientX;w=Math.max(240,Math.min(640,w));if(w>r.width-260)w=Math.max(240,r.width-260);panel.style.flex="0 0 "+w+"px";lastW=w;});
    window.addEventListener("mouseup",function(){if(!dragging)return;dragging=false;rez.classList.remove("drag");document.body.style.userSelect="";document.body.style.cursor="";try{localStorage.setItem("md2pdf_ai_w",String(Math.round(lastW)));}catch(e){}});
    rez.addEventListener("dblclick",function(){panel.style.flex="0 0 340px";try{localStorage.removeItem("md2pdf_ai_w");}catch(e){}});
  }

  function init(){
    panel=$("aiPanel");if(!panel)return;
    logEl=$("aiLog");inputEl=$("aiInput");sendBtn=$("aiSend");stopBtn=$("aiStop");
    ctxEl=$("aiCtx");modelEl=$("aiModel");mockHint=$("aiMockHint");
    setupCard=$("aiSetup");inputWrap=document.querySelector(".ai-input-wrap");
    setupTitle=$("aiSetupTitle");setupTxt=$("aiSetupTxt");installLog=$("aiInstallLog");
    installBtn=$("aiInstall");loginBtn=$("aiLogin");startBtn=$("aiStartChat");recheckBtn=$("aiRecheck");
    if(installBtn)installBtn.addEventListener("click",doInstall);
    if(loginBtn)loginBtn.addEventListener("click",doLogin);
    if(startBtn)startBtn.addEventListener("click",function(){showSetup(false);setTimeout(function(){try{inputEl.focus();}catch(e){}},0);});
    var setupOpen=$("aiSetupOpen");if(setupOpen)setupOpen.addEventListener("click",openInstall);
    if(recheckBtn)recheckBtn.addEventListener("click",function(){checkAvail(true);});
    var btn=$("btnAI");if(btn)btn.addEventListener("click",function(e){e.stopPropagation();toggleOpen();});
    var closeBtn=$("aiClose");if(closeBtn)closeBtn.addEventListener("click",function(){setOpen(false);});
    var clr=$("aiClear");if(clr)clr.addEventListener("click",clearChat);
    if(sendBtn)sendBtn.addEventListener("click",send);
    if(stopBtn)stopBtn.addEventListener("click",stop);
    if(inputEl)inputEl.addEventListener("keydown",function(e){if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}});
    if(inputEl)inputEl.addEventListener("input",autoGrow);
    autoGrow();
    if(modelEl)modelEl.addEventListener("change",function(){try{localStorage.setItem("md2pdf_ai_model",modelEl.value);}catch(e){}});
    document.addEventListener("keydown",function(e){if((e.ctrlKey||e.metaKey)&&e.shiftKey&&(e.key==="a"||e.key==="A")){e.preventDefault();toggleOpen();}});
    applyModel();initResizer();applyWidth();applyOpenDefault();
  }

  document.addEventListener("md2pdf:settings-hydrated",function(){applyModel();applyWidth();applyOpenDefault();});

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);
  else init();
})();
