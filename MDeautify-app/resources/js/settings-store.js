/* ===== 설정 영속 저장소 + 부팅 스플래시 (EXE 전용) =====
   포트를 자동(config port=0)으로 잡으면 매 실행 origin이 바뀌어 localStorage 설정이 초기화된다.
   그래서 설정을 %APPDATA%\MDeautify\settings.json 파일에 저장/복원한다(포트와 무관).
   - 부팅 시 파일 → localStorage 로 주입한 뒤 'md2pdf:settings-hydrated' 이벤트로 각 모듈이 재적용.
   - localStorage.setItem/removeItem 을 래핑해 md2pdf_* 변경을 파일로 디바운스 저장.
   - 테마 확정 전 라이트→다크 깜빡임을 감추려고 부팅 스플래시(.boot-splash)를 덮었다가, 하이드레이션
     완료(또는 타임아웃)에 body.booted 를 붙여 걷어낸다. 라이트/다크 모두 안전.
   - 브라우저(NL_PORT 없음)에선 설정은 localStorage 그대로, 스플래시는 즉시 제거(동기 적용이라 깜빡임 없음). */
(function(){
  function reveal(){try{document.body.classList.add("booted");}catch(e){}}

  /* 브라우저 모드: 파일 저장 불필요, 스플래시 즉시 제거 */
  if(typeof window.NL_PORT==="undefined"||typeof window.Neutralino==="undefined"){reveal();return;}

  try{Neutralino.init();}catch(e){}                     /* 멱등: app.js에서도 호출됨 */
  var PREFIX="md2pdf_";
  var sep=(window.NL_OS==="Windows")?"\\":"/";
  var dir=null,file=null,dirReady=false,ready=false,timer=null;

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
    done();       /* 테마 확정 완료 → 스플래시 제거 */
  })();
})();
