/* ===== 미리보기 HTML 정화 — 세 앱(MDeautify·MDocify·MDhwpxify) 공통 파일, 그대로 복사해서 쓴다 =====
   vendor/purify.min.js = DOMPurify 3.4.17 (Cure53, Apache-2.0/MPL-2.0 — 라이선스 문구는 파일 머리에).
   마크다운 안의 HTML 은 미리보기에서 진짜 HTML 로 그려진다. 거르지 않으면 남이 준 .md 의 <img src=x onerror=…> 같은 코드가
   앱 권한(Neutralino os·filesystem — 명령 실행·파일 쓰기)으로 돈다 → marked 출력·릴리스 노트는 여기서 거른 뒤 화면에 넣는다.
   - 남기는 것: 글자 서식·표(colspan·colgroup)·그림(상대/절대 경로·윈도 드라이브 D:…·UNC·data:image)·링크(http·mailto·file·#)·
                할 일 체크박스·<details>·align·style 속성(크기·색)·SVG·KaTeX 수식(MathML 포함)
   - 빼는 것: <script>·이벤트 속성(on…)·javascript:/vbscript: 주소·iframe/object/embed·<style>(앱 화면 전체 모양을 바꿈)·
              <form>·<button> 등 폼(앱 창을 다른 주소로 보낼 수 있음)·<map>/<area>(링크 처리 밖에서 창 이동)
   정화기를 못 불러온 경우엔 HTML 을 글자 그대로 보여 준다(실행되는 쪽보다 안전). */
(function () {
  'use strict';
  /* DOMPurify 기본 허용 + file: 링크 + 윈도 드라이브 경로. 기본값은 'D:' 를 모르는 주소 형식으로 보고 지운다.
     드라이브는 'D:' 뒤에 무엇이 와도 남긴다 — marked 가 역슬래시를 %5C 로 바꾸거나 떼어 내서(D:%5C…, D:폴더…) 'D:/' 만 허용하면
     전에 보이던 주소가 지워진다. 한 글자 주소 형식으로 실행되는 것은 없다(javascript·vbscript·data 는 여러 글자라 그대로 걸린다). */
  var URI_OK = /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|matrix|file):|[a-z]:|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i;
  var CFG = {
    ALLOWED_URI_REGEXP: URI_OK,
    SANITIZE_NAMED_PROPS: true,   /* 글 속 HTML 의 id·name 앞에 'user-content-' — 앱 요소 id(appModal·pages·editor 등)와 겹쳐 앱이 엉뚱한 요소를 잡지 않게.
                                     그 id 로 가는 [링크](#x) 는 각 앱이 문서를 만들 때 #user-content-x 로 맞춰 준다 */
    ADD_TAGS: ['semantics', 'annotation'], ADD_ATTR: ['encoding'],   /* KaTeX 의 MathML(화면 낭독용) 구조 — 기본값은 이 둘을 지운다 */
    FORBID_TAGS: ['style', 'form', 'button', 'textarea', 'select', 'option', 'optgroup', 'datalist', 'map', 'area'],
    FORBID_ATTR: ['action', 'formaction']
  };
  function asText(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  window.__sanitize = function (html) {
    var P = window.DOMPurify;
    if (!P || typeof P.sanitize !== 'function' || P.isSupported === false) return asText(html);
    return P.sanitize(String(html == null ? '' : html), CFG);
  };
})();
