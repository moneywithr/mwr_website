// Wiederverwendbares "Ergebnis speichern"-Panel für die Rechner-Seiten.
// Speichert eine Momentaufnahme der Eingabefelder rein clientseitig in
// einem Cookie (keine Anmeldung, kein Server) und erlaubt, zwischen
// gespeicherten Ständen umzuschalten. Wird pro Seite mit einer eigenen
// Feldliste initialisiert, siehe initSavedResults() am Ende von
// investment-calculator.js / fund-comparison-calculator.js /
// financial-freedom-calculator.js.
window.SavedResults = (function(){
  const MAX_ITEMS = 15;
  const COOKIE_DAYS = 365;

  function getCookie(name){
    const escaped = name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1');
    const match = document.cookie.match(new RegExp('(?:^|; )' + escaped + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : null;
  }
  function setCookie(name, value){
    const maxAge = COOKIE_DAYS * 24 * 60 * 60;
    document.cookie = name + '=' + encodeURIComponent(value) + '; max-age=' + maxAge + '; path=/; samesite=lax';
  }
  function loadItems(cookieKey){
    try{
      const raw = getCookie(cookieKey);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    }catch(e){ return []; }
  }
  function persistItems(cookieKey, items){
    setCookie(cookieKey, JSON.stringify(items.slice(0, MAX_ITEMS)));
  }

  function fmtDate(d){
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const lang = (window.Site && window.Site.state.lang) || 'ar';
    // Deutsch und Arabisch teilen sich dasselbe Punkt-Format (DD.MM.YYYY),
    // Englisch bekommt das gewohnte Schrägstrich-Format (MM/DD/YYYY).
    return lang === 'en' ? (mm + '/' + dd + '/' + yyyy) : (dd + '.' + mm + '.' + yyyy);
  }

  function captureSnapshot(fields){
    const snap = {};
    fields.forEach(f => {
      const el = document.getElementById(f.id);
      if(!el) return;
      if(f.type === 'switch'){
        snap[f.id] = el.classList.contains('on');
      } else if(f.type === 'customselect'){
        const active = el.querySelector('.custom-select-menu li.active');
        snap[f.id] = active ? active.getAttribute('data-value') : null;
      } else {
        snap[f.id] = el.value;
      }
    });
    return snap;
  }

  function applySnapshot(fields, snap){
    // Schalter/Dropdowns zuerst (steuern Sichtbarkeit von Folgefeldern),
    // Werte danach — Reihenfolge ist funktional nicht zwingend nötig (alle
    // Felder bleiben im DOM, nur per CSS versteckt), macht es aber klarer.
    fields.filter(f => f.type === 'switch').forEach(f => {
      const el = document.getElementById(f.id);
      if(!el || !(f.id in snap)) return;
      const isOn = el.classList.contains('on');
      if(isOn !== !!snap[f.id]) el.click();
    });
    fields.filter(f => f.type === 'customselect').forEach(f => {
      const el = document.getElementById(f.id);
      if(!el || snap[f.id] == null) return;
      el.dispatchEvent(new CustomEvent('customselect:change', { detail: { value: snap[f.id] }, bubbles: true }));
    });
    fields.filter(f => f.type !== 'switch' && f.type !== 'customselect').forEach(f => {
      const el = document.getElementById(f.id);
      if(!el || !(f.id in snap)) return;
      el.value = snap[f.id];
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }

  function svgIcon(){
    return '<svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'
      + '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"></path>'
      + '<path d="M17 21v-8H7v8"></path><path d="M7 3v5h8"></path></svg>';
  }

  function init(config){
    const insertAfter = config.insertAfter;
    if(!insertAfter) return;
    const t = window.Site.t;
    const cookieKey = 'mwr_saved_' + config.cookieKey;

    let items = loadItems(cookieKey);

    const panel = document.createElement('div');
    panel.className = 'saved-results-panel';
    insertAfter.parentNode.insertBefore(panel, insertAfter.nextSibling);

    function renderPanel(){
      const openNameInput = document.getElementById('sr-name-input');
      const pendingName = openNameInput ? openNameInput.value : null;

      panel.innerHTML =
        '<div class="saved-results-head">'
        + '<h2>' + svgIcon() + ' ' + t('savedResultsTitle') + '</h2>'
        + '<button type="button" class="save-result-btn" id="sr-save-btn">＋ ' + t('savedResultsSave') + '</button>'
        + '</div>'
        + '<div id="sr-form-slot"></div>'
        + '<div class="saved-results-list" id="sr-list"></div>';

      document.getElementById('sr-save-btn').addEventListener('click', showForm);
      renderList();

      if(pendingName !== null){
        showForm();
        document.getElementById('sr-name-input').value = pendingName;
      }
    }

    function showForm(){
      const slot = document.getElementById('sr-form-slot');
      if(slot.querySelector('.save-result-form')) return;
      slot.innerHTML =
        '<div class="save-result-form">'
        + '<input type="text" id="sr-name-input" placeholder="' + t('savedResultsNamePlaceholder') + '">'
        + '<button type="button" class="save-result-confirm" id="sr-confirm-btn">' + t('savedResultsConfirm') + '</button>'
        + '<button type="button" class="save-result-cancel" id="sr-cancel-btn">' + t('savedResultsCancel') + '</button>'
        + '</div>';
      const nameInput = document.getElementById('sr-name-input');
      nameInput.focus();
      nameInput.addEventListener('keydown', e => { if(e.key === 'Enter') confirmSave(); });
      document.getElementById('sr-cancel-btn').addEventListener('click', () => { slot.innerHTML = ''; });
      document.getElementById('sr-confirm-btn').addEventListener('click', confirmSave);

      function confirmSave(){
        const name = nameInput.value.trim() || t('savedResultsUnnamed');
        items.forEach(it => it.active = false);
        items.unshift({
          id: Date.now(),
          name: name,
          active: true,
          values: captureSnapshot(config.fields),
        });
        persistItems(cookieKey, items);
        slot.innerHTML = '';
        renderList();
      }
    }

    function renderList(){
      const list = document.getElementById('sr-list');
      if(items.length === 0){
        list.innerHTML = '<div class="saved-results-empty">' + t('savedResultsEmpty') + '</div>';
        return;
      }
      list.innerHTML = items.map(it =>
        '<div class="saved-result-item' + (it.active ? ' active' : '') + '" data-id="' + it.id + '">'
        + '<div class="saved-result-main"><span class="saved-result-dot"></span>'
        + '<span class="saved-result-name">' + escapeHtml(it.name) + '</span></div>'
        + '<div style="display:flex;align-items:center;gap:8px;">'
        + '<span class="saved-result-date">' + fmtDate(new Date(it.id)) + '</span>'
        + '<button type="button" class="saved-result-remove" data-remove="' + it.id + '">×</button>'
        + '</div></div>'
      ).join('');

      list.querySelectorAll('.saved-result-item').forEach(el => {
        el.addEventListener('click', e => {
          if(e.target.closest('.saved-result-remove')) return;
          const id = Number(el.dataset.id);
          const item = items.find(it => it.id === id);
          if(!item) return;
          items.forEach(it => it.active = (it.id === id));
          persistItems(cookieKey, items);
          applySnapshot(config.fields, item.values);
          renderList();
        });
      });
      list.querySelectorAll('[data-remove]').forEach(btn => {
        btn.addEventListener('click', e => {
          e.stopPropagation();
          const id = Number(btn.dataset.remove);
          items = items.filter(it => it.id !== id);
          persistItems(cookieKey, items);
          renderList();
        });
      });
    }

    function escapeHtml(str){
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }

    renderPanel();
    const activeItem = items.find(it => it.active);
    if(activeItem) applySnapshot(config.fields, activeItem.values);
    document.addEventListener('mwr:langchange', renderPanel);
  }

  return { init: init };
})();
