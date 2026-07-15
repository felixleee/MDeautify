/* 쪽 머리말(Header) 설정 — footer.js 와 대칭. 상단 여백 박스(@top-center)에 주입, 구분선은 아래쪽.
   변수: {pageNumber} {totalPages} {title}. 기본 off(문서 제목을 넣고 싶을 때 켜서 사용). */
var HEAD_S={on:false,text:"{title}",align:"center",border:true};
function loadHeaderS(){try{var o=localStorage.getItem("md2pdf_header_on");if(o!==null)HEAD_S.on=(o==="1");var t=localStorage.getItem("md2pdf_header_text");if(t!==null)HEAD_S.text=t;var a=localStorage.getItem("md2pdf_header_align");if(a)HEAD_S.align=a;var b=localStorage.getItem("md2pdf_header_border");if(b!==null)HEAD_S.border=(b==="1");}catch(e){}}
function saveHeaderS(){MD2R.save("md2pdf_header_on",HEAD_S.on?"1":"0");MD2R.save("md2pdf_header_text",HEAD_S.text);MD2R.save("md2pdf_header_align",HEAD_S.align);MD2R.save("md2pdf_header_border",HEAD_S.border?"1":"0");}
function applyHeader(){
  var pages=document.querySelectorAll("#pages .pagedjs_page");var content=[];
  pages.forEach(function(pg){
    var mc=pg.querySelector(".pagedjs_margin-top-center .pagedjs_margin-content");
    if(mc){mc.textContent="";mc.style.borderBottom="";mc.style.paddingBottom="";}
    if(!mc||pg.querySelector(".cover")||pg.querySelector(".toc"))return;   /* 표지·목차엔 머리말 없음 */
    var body=pg.querySelector(".pagedjs_page_content");
    var has=body&&(body.textContent.trim().length>0||body.querySelector("img,svg,table,hr,figure"));
    if(!has)return;   /* 빈 페이지 제외 */
    content.push(mc);
  });
  if(!HEAD_S.on)return;
  var total=content.length,title=(document.title||"");
  content.forEach(function(mc,i){
    mc.textContent=String(HEAD_S.text).replace(/\{pageNumber\}/g,i+1).replace(/\{totalPages\}/g,total).replace(/\{title\}/g,title);
    mc.style.justifyContent=(HEAD_S.align==="left"?"flex-start":(HEAD_S.align==="right"?"flex-end":"center"));
    if(HEAD_S.border){mc.style.borderBottom="1px solid #cbd5e1";mc.style.paddingBottom="5px";}
  });
}
(function(){
  loadHeaderS();
  MD2R.register(saveHeaderS,["md2pdf_header_on","md2pdf_header_text","md2pdf_header_align","md2pdf_header_border"]);
  var on=document.getElementById("tmHeader"),txt=document.getElementById("tmHeaderText"),al=document.getElementById("tmHeaderAlign"),bd=document.getElementById("tmHeaderBorder"),body=document.getElementById("tmHeaderBody");
  function sync(){if(on)on.checked=HEAD_S.on;if(txt)txt.value=HEAD_S.text;if(al)al.value=HEAD_S.align;if(bd)bd.checked=HEAD_S.border;if(body)body.classList.toggle("off",!HEAD_S.on);}
  function changed(){if(on)HEAD_S.on=on.checked;if(txt)HEAD_S.text=txt.value;if(al)HEAD_S.align=al.value;if(bd)HEAD_S.border=bd.checked;if(body)body.classList.toggle("off",!HEAD_S.on);saveHeaderS();applyHeader();}
  sync();
  [on,al,bd].forEach(function(el){if(el)el.addEventListener("change",changed);});
  if(txt)txt.addEventListener("input",changed);
  document.addEventListener("md2pdf:settings-hydrated",function(){loadHeaderS();sync();applyHeader();});
})();
