// Banner für In-App-Browser (Instagram, Facebook, TikTok, Line, WeChat, ...):
// Diese eingebetteten WebViews blockieren Drittanbieter-Cookies noch strikter
// als normales Safari/Chrome, wodurch das TARIFCHECK24-Vergleichs-Widget auf
// /stuff_i_use/find_bank/ und /stuff_i_use/credit_cards/ oft leer bleibt oder
// nicht lädt. Ein eigenes Cookie-Consent-Banner kann das NICHT beheben - das
// ist eine Browser-Richtlinie, keine Consent-Frage. Frühere Versionen haben
// versucht, per intent:// (Android) bzw. x-safari-https:// (iOS) automatisch
// in den echten Browser umzuleiten - beides sind inoffizielle Tricks, die
// Instagram & Co. gezielt blockieren, weshalb der Button oft einfach nichts
// tat. Verlässlich funktioniert nur, was der In-App-Browser selbst anbietet:
// das ⋯-Menü "Im Browser öffnen" - plus Link kopieren als Fallback.
(function(){
  function ua(){ return navigator.userAgent || ''; }
  function isInAppBrowser(){
    return /Instagram|FBAN|FBAV|FB_IAB|FBIOS|Line\/|MicroMessenger|TikTok|BytedanceWebview|Snapchat/i.test(ua());
  }
  function copyLink(btn, doneLabel){
    var url = location.href;
    function onDone(){
      var original = btn.textContent;
      btn.textContent = doneLabel;
      btn.disabled = true;
      setTimeout(function(){ btn.textContent = original; btn.disabled = false; }, 2000);
    }
    function fallbackCopy(){
      var ta = document.createElement('textarea');
      ta.value = url;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try{ document.execCommand('copy'); }catch(e){}
      document.body.removeChild(ta);
      onDone();
    }
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(url).then(onDone).catch(fallbackCopy);
    } else {
      fallbackCopy();
    }
  }

  function init(){
    if(!isInAppBrowser()) return;
    if(sessionStorage.getItem('mwr_inapp_notice_dismissed')) return;
    if(!window.Site) return;

    var banner = document.createElement('div');
    banner.className = 'inapp-browser-banner';
    banner.innerHTML =
      '<div class="inapp-browser-banner-inner">' +
        '<div class="inapp-browser-text">' +
          '<strong class="inapp-browser-title" data-i18n="inappTitle"></strong>' +
          '<span class="inapp-browser-desc" data-i18n="inappDesc"></span>' +
          '<ol class="inapp-browser-steps">' +
            '<li data-i18n="inappStep1"></li>' +
            '<li data-i18n="inappStep2"></li>' +
          '</ol>' +
        '</div>' +
        '<div class="inapp-browser-actions">' +
          '<button type="button" class="inapp-browser-btn" data-i18n="inappCopyLink"></button>' +
        '</div>' +
        '<button type="button" class="inapp-browser-close" aria-label="Close">&times;</button>' +
      '</div>';

    document.body.insertBefore(banner, document.body.firstChild);
    document.body.classList.add('has-inapp-banner');
    window.Site.applyStatic();

    banner.querySelector('.inapp-browser-close').addEventListener('click', function(){
      banner.remove();
      document.body.classList.remove('has-inapp-banner');
      sessionStorage.setItem('mwr_inapp_notice_dismissed', '1');
    });

    var copyBtn = banner.querySelector('.inapp-browser-btn');
    if(copyBtn){
      copyBtn.addEventListener('click', function(){
        copyLink(copyBtn, window.Site.t('inappCopied'));
      });
    }
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
