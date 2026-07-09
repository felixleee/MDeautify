/* ===== 인-앱 모달 =====
   네이티브 confirm/alert/showMessageBox 대체. 앱 테마(--tm-*)와 일치하고 창 한가운데 뜬다.
   window.__appConfirm({title,message,okText,cancelText,danger}) -> Promise<boolean>
   window.__appAlert(message[,title])                            -> Promise<true>
*/
(function(){
  var overlay=null,titleEl=null,msgEl=null,btnRow=null,keyH=null,prevFocus=null;
  function ensure(){
    if(overlay)return;
    overlay=document.createElement("div");
    overlay.id="appModal";overlay.hidden=true;
    overlay.innerHTML="<div class='am-card' role='dialog' aria-modal='true' aria-labelledby='amTitle'>"+
      "<div class='am-title' id='amTitle'></div>"+
      "<div class='am-msg' id='amMsg'></div>"+
      "<div class='am-btns' id='amBtns'></div></div>";
    document.body.appendChild(overlay);
    titleEl=overlay.querySelector("#amTitle");
    msgEl=overlay.querySelector("#amMsg");
    btnRow=overlay.querySelector("#amBtns");
  }
  function setMsg(el,text){  /* \n 을 줄바꿈으로(안전하게 textNode로) */
    el.textContent="";
    String(text).split("\n").forEach(function(line,i){
      if(i)el.appendChild(document.createElement("br"));
      el.appendChild(document.createTextNode(line));
    });
  }
  function open(opts){
    ensure();
    var title=opts.title||"",okText=opts.okText||"확인",cancelText=opts.cancelText,danger=!!opts.danger;
    titleEl.textContent=title;titleEl.style.display=title?"":"none";
    setMsg(msgEl,opts.message||"");
    btnRow.innerHTML="";
    prevFocus=document.activeElement;
    return new Promise(function(resolve){
      function done(val){
        overlay.hidden=true;
        if(keyH)document.removeEventListener("keydown",keyH,true);
        overlay.onclick=null;
        if(prevFocus&&prevFocus.focus){try{prevFocus.focus();}catch(e){}}
        resolve(val);
      }
      var okBtn=document.createElement("button");
      okBtn.type="button";okBtn.className="am-btn am-ok"+(danger?" am-danger":"");
      okBtn.textContent=okText;
      okBtn.addEventListener("click",function(){done(true);});
      if(cancelText){
        var cBtn=document.createElement("button");
        cBtn.type="button";cBtn.className="am-btn am-cancel";
        cBtn.textContent=cancelText;
        cBtn.addEventListener("click",function(){done(false);});
        btnRow.appendChild(cBtn);
      }
      btnRow.appendChild(okBtn);
      keyH=function(e){
        if(e.key==="Escape"){e.preventDefault();done(cancelText?false:true);}
        else if(e.key==="Enter"){e.preventDefault();done(true);}
      };
      document.addEventListener("keydown",keyH,true);
      overlay.onclick=function(e){if(e.target===overlay)done(cancelText?false:true);};  /* 바깥 클릭 = 취소 */
      overlay.hidden=false;
      setTimeout(function(){try{okBtn.focus();}catch(e){}},0);
    });
  }
  window.__appConfirm=function(opts){opts=opts||{};if(opts.cancelText==null)opts.cancelText="취소";return open(opts);};
  window.__appAlert=function(message,title){return open({message:message,title:title||"",okText:"확인"});};
})();
