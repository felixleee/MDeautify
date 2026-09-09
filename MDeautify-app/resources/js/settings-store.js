/* ===== 설정 영속 저장소 + 부팅 스플래시 (EXE 전용) =====
   포트를 자동(config port=0)으로 잡으면 매 실행 origin이 바뀌어 localStorage 설정이 초기화된다.
   그래서 설정을 %APPDATA%\MDeautify\settings.json 파일에 저장/복원한다(포트와 무관).
   - 부팅 시 파일 → localStorage 로 주입한 뒤 'md2pdf:settings-hydrated' 이벤트로 각 모듈이 재적용.
   - localStorage.setItem/removeItem 을 래핑해 md2pdf_* 변경을 파일로 디바운스 저장.
   - 테마 확정 전 라이트→다크 깜빡임을 감추려고 부팅 스플래시(.boot-splash)를 덮었다가, 하이드레이션
     완료(또는 타임아웃)에 body.booted 를 붙여 걷어낸다. 라이트/다크 모두 안전.
   - 브라우저(NL_PORT 없음)에선 설정은 localStorage 그대로, 스플래시는 즉시 제거(동기 적용이라 깜빡임 없음). */
(function(){
  /* 부팅 스플래시(단일 창 방식): 창을 처음엔 작게+테두리 없이 띄워(config) 스플래시 오버레이를
     보여주고, 준비되면(최소 BOOT_MIN 경과) 창을 전체 크기+정상 테두리+최대화로 '변신'시킨 뒤
     오버레이를 걷어낸다. 프로세스가 하나라 멀티창 같은 생명주기 레이스가 없다. */
  var BOOT_MIN=2000, t0=Date.now(), APP_W=1280, APP_H=840;
  var MINW=800, MINH=500;   /* 본 화면 최소 폭/높이(런타임 제약). config min 은 스플래시(330×450) 때문에 작게 둠 */
  var isExe=!(typeof window.NL_PORT==="undefined"||typeof window.Neutralino==="undefined");
  function markBooted(){try{document.body.classList.add("booted");}catch(e){}}
  function reveal(){
    var wait=Math.max(0,BOOT_MIN-(Date.now()-t0));
    setTimeout(async function(){ if(isExe){await morphToApp();} markBooted(); }, wait);
  }

  /* 브라우저 모드: 파일 저장 불필요, 인-앱 오버레이 스플래시만 최소시간 후 제거 */
  if(!isExe){reveal();return;}

  try{Neutralino.init();}catch(e){}                     /* 멱등: app.js에서도 호출됨 */
  var PREFIX="md2pdf_";
  var sep=(window.NL_OS==="Windows")?"\\":"/";
  var dir=null,file=null,dirReady=false,ready=false,timer=null;

  /* 작은 테두리 없는 스플래시 창 → 전체 앱 창으로 변신 (같은 창, 같은 프로세스).
     Neutralino 기본 useSavedState 는 껐으므로(스플래시가 작게 시작해야 함), 창 크기·위치·
     최대화 상태를 직접 md2pdf_winstate 에 저장/복원한다(설정과 함께 settings.json 에 영속). */
  var WKEY="md2pdf_winstate";
  function readWin(){try{return JSON.parse(localStorage.getItem(WKEY)||"null");}catch(e){return null;}}
  /* 스플래시는 config center 로 주 모니터 중앙에 뜬다(멀티모니터 추종은 보류 — [[mdeautify-multimonitor-splash-idea]]). */
  var morphed=false;
  async function morphToApp(){
    if(morphed)return;morphed=true;
    var st=readWin();
    try{await Neutralino.window.setBorderless(false);}catch(e){}   /* 정상 테두리(최소화/최대화/닫기) 복원 */
    if(st&&!st.max&&st.w>300&&st.h>200){                            /* 이전에 창모드로 줄였으면 그 크기·위치 복원 */
      try{await Neutralino.window.setSize({width:Math.max(st.w,MINW),height:Math.max(st.h,MINH),minWidth:MINW,minHeight:MINH});}catch(e){}
      try{
        if(typeof st.x==="number"&&typeof st.y==="number")await Neutralino.window.move(st.x,st.y);
        else await Neutralino.window.center();
      }catch(e){}
    }else{
      if(st&&st.max&&typeof st.mx==="number"&&typeof st.my==="number"){
        try{await Neutralino.window.move(st.mx,st.my);}catch(e){}   /* 이전에 최대화했던 그 모니터로 먼저 이동 */
      }
      try{await Neutralino.window.setSize({width:APP_W,height:APP_H,minWidth:MINW,minHeight:MINH});}catch(e){}  /* 최소 제약 */
      try{await Neutralino.window.maximize();}catch(e){}            /* 그 모니터에서 최대화(기본·이전 최대화) */
    }
    try{await Neutralino.window.focus();}catch(e){}
    startWinTracking();
  }

  /* 변신 후: 창 크기/위치/최대화 변화를 저장(디바운스). 스플래시(작은 창) 크기는 저장하지 않도록 변신 후에만 시작. */
  var winTimer=null,tracking=false;
  async function saveWin(){
    try{
      var mx=false;try{mx=await Neutralino.window.isMaximized();}catch(e){}
      var s=null,p=null;
      try{s=await Neutralino.window.getSize();}catch(e){}
      try{p=await Neutralino.window.getPosition();}catch(e){}
      var o={max:!!mx};
      if(!mx){
        if(s){o.w=s.width;o.h=s.height;}
        if(p){o.x=p.x;o.y=p.y;}
      }else{
        var prev=readWin();if(prev){o.w=prev.w;o.h=prev.h;o.x=prev.x;o.y=prev.y;}   /* 최대화 해제 시 되돌릴 창모드 크기 보존 */
        if(p){o.mx=p.x;o.my=p.y;}                                                     /* 최대화된 창 위치 = 그 모니터 기준점(복원 시 그 모니터에서 최대화) */
      }
      if(o.max||(o.w>300&&o.h>200))localStorage.setItem(WKEY,JSON.stringify(o));
    }catch(e){}
  }
  function scheduleWinSave(){clearTimeout(winTimer);winTimer=setTimeout(saveWin,400);}
  function startWinTracking(){
    if(tracking)return;tracking=true;
    try{window.addEventListener("resize",scheduleWinSave);}catch(e){}
    try{window.addEventListener("blur",saveWin);}catch(e){}
    setInterval(saveWin,4000);   /* 이동(move)은 웹뷰 이벤트가 없어 주기 저장으로 보완 */
  }

  /* 닫힐 때(X·Alt+F4) 창 상태를 마지막으로 저장하고 종료 (config exitProcessOnClose:false 라 직접 종료).
     이동은 실시간 이벤트가 없어 이 시점 저장으로 '옮기고 바로 닫기'까지 반영. 무엇이 막혀도 800ms 내 강제 종료. */
  try{
    Neutralino.events.on("windowClose",async function(){
      var killer=setTimeout(function(){try{Neutralino.app.exit();}catch(e){}},800);
      try{ if(morphed){ await saveWin(); await doSave(); } }catch(e){}   /* 변신 후에만 저장(스플래시 크기는 저장 안 함) */
      clearTimeout(killer);
      try{await Neutralino.app.exit();}catch(e){}
    });
  }catch(e){}

  /* 스플래시가 영원히 남지 않도록 안전 타임아웃(네이티브 연결 실패 대비) */
  var revealTimer=setTimeout(reveal,1500);
  function done(){clearTimeout(revealTimer);reveal();}

  /* localStorage 안의 md2pdf_* 전체 스냅샷 */
  function snapshot(){var o={};try{for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(k&&k.indexOf(PREFIX)===0)o[k]=localStorage.getItem(k);}}catch(e){}return o;}
  async function doSave(){
    if(!file)return;
    try{if(!dirReady){try{await Neutralino.filesystem.createDirectory(dir);}catch(e){}dirReady=true;}}catch(e){}
    try{await Neutralino.filesystem.writeFile(file,JSON.stringify(snapshot()));}catch(e){}
  }
  function scheduleSave(){if(!ready)return;clearTimeout(timer);timer=setTimeout(doSave,300);}

  /* 쓰기 래핑: md2pdf_* 가 바뀌면 파일에 반영 (읽기 전엔 ready=false 로 저장 억제) */
  var _set=localStorage.setItem.bind(localStorage),_rem=localStorage.removeItem.bind(localStorage);
  localStorage.setItem=function(k,v){_set(k,v);if(String(k).indexOf(PREFIX)===0)scheduleSave();};
  localStorage.removeItem=function(k){_rem(k);if(String(k).indexOf(PREFIX)===0)scheduleSave();};

  /* 부팅: 파일 → localStorage 하이드레이션 (읽기 완료 뒤 스플래시 제거) */
  (async function(){
    try{
      var base="";
      try{base=await Neutralino.os.getEnv("APPDATA");}catch(e){}
      if(!base){try{base=await Neutralino.os.getPath("data");}catch(e){}}
      if(base){
        dir=base.replace(/[\\\/]+$/,"")+sep+"MDeautify";
        file=dir+sep+"settings.json";
        var txt=null;try{txt=await Neutralino.filesystem.readFile(file);}catch(e){}   /* 없으면 첫 저장 때 폴더 생성 */
        if(txt){
          var data=null;try{data=JSON.parse(txt);}catch(e){}
          if(data&&typeof data==="object"){
            var changed=false;
            for(var k in data){if(data.hasOwnProperty(k)&&k.indexOf(PREFIX)===0){var v=data[k];if(v!=null&&localStorage.getItem(k)!==String(v)){_set(k,String(v));changed=true;}}}
            if(changed)document.dispatchEvent(new Event("md2pdf:settings-hydrated"));  /* 각 모듈 재적용(스플래시 뒤에서) */
          }
        }
      }
    }catch(e){}
    ready=true;   /* 이제부터 사용자의 설정 변경이 파일로 저장됨 */
    try{document.dispatchEvent(new Event("md2pdf:settings-ready"));}catch(e){}  /* 하이드레이션 완료(파일 유무 무관) 신호 — seen 버전 판정 등에서 사용 */
    done();       /* 테마 확정 완료 → 스플래시 제거 */
  })();
})();
