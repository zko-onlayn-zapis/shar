/* Миллион шаров • Уральск — «Режим администратора» v2.0.1 (модуль admin.js).
   Визуальный редактор витрины по этажам, наборы, фото в чат бота, черновик и публикация, «Книга учёта».
   Сессия 12 часов хранится в localStorage (переживает перезапуск iPhone-приложения). Пароль хозяйки здесь НЕ хранится: он проверяется только на сервере (шлюз). Вход открывается долгим удержанием на плашке версии. */
(function () {
  'use strict';
  var H = window.SHAR; if (!H) return;
  var esc = H.esc, S = H.S, root = null, A = null, LOCAL = {}, TT = null;
  function $(s, r) { return (r || root).querySelector(s); }
  var SESS_MS = 12 * 3600 * 1000;
  function sload() { var v = H.ls('adm_sess'); if (v && v.t && v.exp > Date.now()) return v; if (v) H.ls('adm_sess', null); return null; }
  function ssave(t, exp) { H.ls('adm_sess', { t: t, exp: +exp > Date.now() ? +exp : Date.now() + SESS_MS }); H.ls('is_admin_device', 1); }   // с этого устройства статистика больше не считается
  function rnd() {
    var cs = 'abcdefghijklmnopqrstuvwxyz0123456789', a = '', i, u;
    try { u = new Uint8Array(12); window.crypto.getRandomValues(u); for (i = 0; i < 12; i++) a += cs.charAt(u[i] % 36); } catch (e) { a = ''; for (i = 0; i < 12; i++) a += cs.charAt(Math.floor(Math.random() * 36)); }
    return a;
  }
  function pwField(id, ph) { return '<div class="pwrow"><input id="' + id + '" type="password" autocomplete="off" autocapitalize="off" placeholder="' + esc(ph || 'Пароль') + '"><button type="button" class="eye" data-a="eye" data-for="' + id + '" aria-label="Показать пароль">👁️</button></div>'; }
  function lock(b, txt) { if (b) { b.disabled = true; b.setAttribute('data-t', b.textContent); b.textContent = txt || '⏳ Сохраняем...'; } }
  function unlock(b) { if (b && b.isConnected) { b.disabled = false; if (b.getAttribute('data-t')) b.textContent = b.getAttribute('data-t'); } }
  function call(action, data) {
    return H.api(action, Object.assign({ t: A && A.t }, data || {})).catch(function (e) {
      if (e && e.code === 'adm_auth') { drop(); toast('Сессия закончилась — войдите снова.'); setTimeout(open, 400); }
      throw e;
    });
  }
  function msg(e) {
    if (e && e.code === 'adm_bad') return 'Пароль не подошёл. Осталось попыток: ' + (e.left !== undefined ? e.left : '—') + '.';
    if (e && e.code === 'adm_locked') return 'Вход заблокирован на ' + (e.wait || 15) + ' мин. после неверных паролей. Подождите или попросите автора сбросить блокировку.';
    if (e && e.code === 'not_empty') return 'В плитке есть вложенные плитки (' + (e.kids || 0) + ') или наборы (' + (e.sets || 0) + ') — сначала перенесите или удалите их.';
    if (e && e.code === 'photo_tg') return 'Телеграм не принял фото' + (e.detail ? ': ' + e.detail : '') + '.';
    return H.errText(e);
  }
  function toast(t, ms) {
    if (!root) return; var el = $('.adm-toast'); el.textContent = t; el.className = 'adm-toast on'; clearTimeout(TT); TT = setTimeout(function () { el.className = 'adm-toast'; }, ms || 3200);
  }
  function drop() { S.admT = ''; H.ls('adm_sess', null); A = null; if (root) { root.remove(); root = null; document.body.style.overflow = ''; } }

  /* ---------- оболочка ---------- */
  function shell() {
    if (root) return;
    root = document.createElement('div'); root.id = 'adm';
    root.innerHTML = '<div class="adm-in"><div class="adm-top"></div><div class="adm-ban"></div><div class="adm-main"></div></div><div class="adm-modal"></div><div class="adm-toast"></div>';
    document.body.appendChild(root); document.body.style.overflow = 'hidden';
    root.addEventListener('click', onClick); root.addEventListener('input', onInput); root.addEventListener('change', onChange);
  }
  function modal(html) { var m = $('.adm-modal'); m.innerHTML = '<div class="adm-sheet">' + html + '</div>'; m.className = 'adm-modal on'; m.scrollTop = 0; H.hydrate(); }
  function closeModal() { var m = $('.adm-modal'); m.className = 'adm-modal'; m.innerHTML = ''; }

  /* ---------- вход ---------- */
  function open() {
    shell();
    var sv = sload(), tk = sv && sv.t;
    if (tk) { A = { t: tk, path: [], view: 'floors', q: '', flt: 'all', hide: false, stock: null }; S.admT = tk; return refresh().catch(loginUI); }
    loginUI();
  }
  function loginUI() {
    shell(); $('.adm-top').innerHTML = ''; $('.adm-ban').innerHTML = ''; $('.adm-main').innerHTML = '';
    modal('<h2>🔐 Вход для хозяйки</h2>' + pwField('adm-pw') + '<div id="adm-err" class="adm-err"></div><button class="btn pri" data-a="login">Войти</button><button class="btn" data-a="exit">Закрыть</button>');
    var i = $('#adm-pw'); if (i) { i.focus(); i.addEventListener('keydown', function (e) { if (e.key === 'Enter') doLogin(); }); }
  }
  function doLogin() {
    var pw = $('#adm-pw').value, er = $('#adm-err'), b = $('[data-a=login]');
    if (!pw) { er.textContent = 'Введите пароль.'; return; }
    b.disabled = true; er.textContent = '';
    H.api('adm_login', { pw: pw }).then(function (r) {
      S.admT = r.token; ssave(r.token, r.expiresAt); A = { t: r.token, path: [], view: 'floors', q: '', flt: 'all', hide: false, stock: null };
      closeModal(); return refresh();
    }).catch(function (e) { b.disabled = false; er.textContent = msg(e); var i = $('#adm-pw'); if (i) { i.value = ''; } });
  }
  function refresh() {
    return call('adm_state').then(function (r) {
      A.shop = r.shop; A.dirty = r.dirty; A.deficit = r.deficit || []; A.nextSet = r.next_set; A.nextPhoto = r.next_photo; A.stockN = r.stock_n; A.pubAt = r.pub_at;
      if (!A.shown) { A.shown = true; A.hide = false; }
      draw();
    });
  }

  /* ---------- данные ---------- */
  function cats() { return A.shop.categories; }
  function cat(id) { return cats().filter(function (c) { return c.id === id; })[0]; }
  function kids(id) { return cats().filter(function (c) { return (c.parent || '') === (id || ''); }); }
  function setsIn(id) { return A.shop.products.filter(function (p) { return p.category === id; }); }
  function cur() { return A.path.length ? A.path[A.path.length - 1] : ''; }
  function deepCount(id) { var n = setsIn(id).length; kids(id).forEach(function (c) { n += deepCount(c.id); }); return n; }
  function photoBox(fid, emoji, cls) { return '<span class="' + (cls || 'tp') + '"' + (fid ? ' data-fid="' + esc(fid) + '"' : '') + '>' + (fid ? '' : '<b>' + esc(emoji || '🎈') + '</b>') + '</span>'; }

  /* ---------- отрисовка ---------- */
  function draw() {
    if (!root || !A || !A.shop) return;
    var dirty = A.dirty > 0;
    $('.adm-top').innerHTML = '<div class="adm-h"><h2>🛠️ Режим администратора</h2><button class="chip" data-a="exit">✕ Закрыть</button></div>' +
      '<div class="adm-note">' + (dirty ? '✏️ Есть неопубликованные правки (' + A.dirty + '). Посетители пока видят прежнюю версию.' : '✅ Всё опубликовано — посетители видят актуальную витрину.') + '</div>' +
      '<div class="adm-bar"><button class="btn pri' + (dirty ? '' : ' soft') + '" data-a="publish">✅ Опубликовать изменения</button>' +
      '<button class="btn" data-a="stock">📒 Книга учёта</button>' + (A.view !== 'floors' ? '<button class="btn" data-a="floors">🏠 К витрине</button>' : '') +
      '<button class="btn" data-a="astats">📊 Статистика</button><button class="btn" data-a="agame">🎁 Настройка игры</button>' +
      '<button class="btn" data-a="discard"' + (dirty ? '' : ' disabled') + '>↩️ Сбросить черновик</button><button class="btn" data-a="logout">🚪 Выйти</button><button class="btn danger" data-a="reset" style="grid-column:1/-1">🧹 Очистить тестовые наборы и фото</button></div>';
    drawBanner();
    if (A.view === 'stock') drawStock(); else if (A.view === 'astats') drawAStats(); else if (A.view === 'agame') drawAGame(); else drawFloors();
    H.hydrate();
  }
  function drawBanner() {
    var el = $('.adm-ban'), d = A.deficit || [];
    if (!d.length || A.hide) { el.className = 'adm-ban'; el.innerHTML = ''; return; }
    var sets = {}; d.forEach(function (x) { x.sets.forEach(function (s) { sets[s.id] = s.title; }); });
    el.innerHTML = '<b>⚠️ Не хватает позиций на складе (0 шт):</b><div>' + d.slice(0, 12).map(function (x) { return '• ' + esc(x.title); }).join('<br>') + (d.length > 12 ? '<br>… и ещё ' + (d.length - 12) : '') + '</div>' +
      '<b>🙈 Из-за этого скрыты наборы:</b><div>' + Object.keys(sets).slice(0, 15).map(function (k) { return esc(sets[k]); }).join(', ') + '</div>' +
      '<div class="adm-row"><button class="btn pri" data-a="tostock">📒 Перейти в Книгу учёта</button><button class="btn" data-a="hideban">✖️ Скрыть это сообщение</button></div>';
    el.className = 'adm-ban on';
  }
  function drawFloors() {
    var id = cur(), c = id && cat(id), h = '';
    h += '<div class="adm-crumbs"><button class="chip" data-a="goto" data-i="-1">🏠 1-й этаж</button>' + A.path.map(function (p, i) { var x = cat(p); return '<button class="chip" data-a="goto" data-i="' + i + '">' + (i + 2) + '-й: ' + esc(x ? x.title : '?') + '</button>'; }).join('') + '</div>';
    h += '<h2>' + (c ? esc(c.emoji + ' ' + c.title) : '🎈 Суперплитки (1-й этаж)') + '</h2><p class="muted">Нажмите на плитку: измените фото и название, затем войдёте на этаж ниже.</p>';
    var ks = kids(id);
    h += '<div class="tiles adm-tiles">' + ks.map(function (k) {
      return '<button class="tile adm-tile' + (k.hidden ? ' off' : '') + '" data-a="tile" data-id="' + esc(k.id) + '">' + photoBox(k.cover, k.emoji) + '<span class="tn"><i>' + esc(k.title) + '</i><em>' + deepCount(k.id) + '</em></span>' + (k.hidden ? '<span class="adm-mark">Скрыта</span>' : '') + '</button>';
    }).join('') + '</div>';
    if (ks.length > 1) h += '<p class="adm-note">↕️ Чтобы поменять порядок, удерживайте плитку полсекунды и перетащите на нужное место.</p>';
    h += '<button class="btn pri" data-a="newtile">' + (id ? '➕ Создать подкатегорию' : '➕ Создать суперплитку') + '</button>';
    if (id) {
      var ps = setsIn(id);
      h += '<h2>Наборы здесь (' + ps.length + ')</h2><div class="adm-grid">' + ps.map(setCard).join('') + '</div><button class="btn pri" data-a="newset">➕ Создать набор</button>';
    }
    $('.adm-main').innerHTML = h; dragInit();
  }
  function setCard(p) {
    var ph = p.photos[0], off = p.hidden || (p.auto && p.auto.length), mark = p.hidden ? 'Скрыт' : (p.auto && p.auto.length ? 'Скрыт: нет на складе' : '');
    return '<div class="adm-card' + (off ? ' off' : '') + '" data-id="' + esc(p.id) + '"><button class="adm-ph" data-a="set" data-id="' + esc(p.id) + '">' + photoBox(ph && ph.t, '🎈', 'adm-pic') + (mark ? '<span class="adm-mark">' + esc(mark) + '</span>' : '') + '</button>' +
      '<div class="adm-ci"><b>' + esc(p.title) + '</b><span>' + (p.price > 0 ? H.money(p.price) + ' ₸' : 'цена по запросу') + (p.discount ? ' <i>−' + p.discount + '%</i>' : '') + '</span>' +
      (p.auto && p.auto.length ? '<small class="red">Нет на складе: ' + esc(p.auto.join(', ')) + '</small>' : '') +
      '<div class="adm-row"><button class="chip" data-a="set" data-id="' + esc(p.id) + '">✏️ Править</button><button class="chip" data-a="settoggle" data-id="' + esc(p.id) + '">' + (p.hidden ? '👁️ Показать на сайте' : '🙈 Скрыть с сайта') + '</button></div></div></div>';
  }

  /* ---------- фото: сжатие и отправка в чат бота ---------- */
  function compress(file) {
    return new Promise(function (res, rej) {
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function () {
        var k = Math.min(1, 1280 / Math.max(img.naturalWidth, img.naturalHeight)), c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.naturalWidth * k)); c.height = Math.max(1, Math.round(img.naturalHeight * k));
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
        var q = 0.85, d = c.toDataURL('image/jpeg', q); while (d.length > 1400000 && q > 0.4) { q -= 0.1; d = c.toDataURL('image/jpeg', q); }
        res(d);
      };
      img.onerror = function () { URL.revokeObjectURL(url); rej({ code: 'bad_photo' }); };
      img.src = url;
    });
  }
  function uploadFile(file, label) {
    var idHint = A.nextPhoto; A.nextPhoto++;
    toast('⏳ Фото №' + idHint + ': сжимаю и загружаю…', 8000);
    return compress(file).then(function (d) { return call('adm_photoUp', { data: d, label: label || '' }).then(function (r) { LOCAL[r.t] = d; LOCAL[r.f] = d; if (+r.pid >= A.nextPhoto) A.nextPhoto = +r.pid + 1; toast('✅ Фото №' + r.pid + ' загружено', 1800); return { t: r.t, f: r.f, pid: r.pid }; }); });
  }
  function thumb(x, cls) { var d = LOCAL[x.t]; return d ? '<img class="' + (cls || '') + '" src="' + d + '" alt="">' : '<span class="adm-th"' + ' data-fid="' + esc(x.t) + '"></span>'; }

  /* ---------- редактор плитки ---------- */
  function tileEditor(id, isNew) {
    var k = id ? cat(id) : null, parent = isNew ? cur() : (k && k.parent) || '';
    A.ed = { kind: 'tile', nid: rnd(), id: id || '', parent: parent, cover: k ? (k.coverRaw || '') : '', hidden: k ? !!k.hidden : false, isNew: !!isNew };
    var e = A.ed, sib = kids(parent), idx = sib.map(function (x) { return x.id; }).indexOf(e.id);
    modal('<h2>' + (isNew ? (parent ? '➕ Новая подкатегория' : '➕ Новая суперплитка') : '✏️ Плитка') + '</h2>' +
      '<div class="adm-tp" id="adm-tpv">' + tilePrev() + '</div><label class="btn" for="adm-file">📷 ' + (e.cover ? 'Заменить фото' : 'Добавить фото') + '</label><input id="adm-file" type="file" accept="image/*" hidden>' +
      (e.cover ? '<button class="btn" data-a="tphx">🗑 Убрать фото</button>' : '') +
      '<label>Название</label><input id="ed-title" maxlength="50" value="' + esc(k ? k.title : '') + '" placeholder="Например: Для девочек">' +
      '<label>Эмодзи (если нет фото)</label><input id="ed-emoji" maxlength="4" value="' + esc(k ? k.emoji : '🎈') + '">' +
      (isNew ? '' : '<div class="adm-row"><button class="chip" data-a="tvis">' + (e.hidden ? '👁️ Показать на сайте' : '🙈 Скрыть с сайта') + '</button>' + '<button class="chip" data-a="tmove" data-d="-1"' + (idx > 0 ? '' : ' disabled') + '>⬅️ Раньше</button><button class="chip" data-a="tmove" data-d="1"' + (idx >= 0 && idx < sib.length - 1 ? '' : ' disabled') + '>➡️ Позже</button></div>') +
      '<div id="ed-err" class="adm-err"></div><button class="btn pri" data-a="tsave">💾 ' + (isNew ? 'Создать и войти' : 'Сохранить и войти на этаж') + '</button>' +
      (isNew ? '' : '<button class="btn" data-a="tenter">Войти без изменений</button><button class="btn danger" data-a="tdel">🗑 Удалить плитку</button>') + '<button class="btn" data-a="mclose">Отмена</button>');
  }
  function tilePrev() { var c = A.ed.cover, f = c.split('|')[0], t = ($('#ed-emoji') || {}).value || '🎈'; return f ? (LOCAL[f] ? '<img src="' + LOCAL[f] + '" alt="">' : '<span data-fid="' + esc(f) + '"></span>') : '<b>' + esc(t) + '</b>'; }
  function tileSave(enter) {
    var e = A.ed, er = $('#ed-err'), title = $('#ed-title').value.trim();
    if (title.length < 2) { er.textContent = 'Введите название (минимум 2 знака).'; return; }
    er.textContent = ''; var sb = $('[data-a=tsave]'); if (e.busy) return; e.busy = 1; lock(sb);
    call('adm_catSave', { nid: e.nid, id: e.id || undefined, parent: e.parent, title: title, emoji: $('#ed-emoji').value.trim(), cover: e.cover, hidden: e.hidden }).then(function (r) {
      closeModal(); return refresh().then(function () { A.path = pathTo(r.id); draw(); toast('Сохранено в черновик'); window.scrollTo(0, 0); });
    }).catch(function (x) { e.busy = 0; unlock(sb); er.textContent = msg(x); });
  }
  function pathTo(id) { var p = [], c = cat(id), g = 0; while (c && g++ < 12) { p.unshift(c.id); c = c.parent ? cat(c.parent) : null; } return p; }

  /* ---------- редактор набора ---------- */
  function ensureStock() { return A.stock ? Promise.resolve() : call('adm_stock').then(function (r) { A.stock = r.items; }); }
  function setEditor(id, isNew) {
    var p = id ? A.shop.products.filter(function (x) { return x.id === id; })[0] : null;
    A.ed = { kind: 'set', nid: rnd(), id: id || '', category: p ? p.category : cur(), photos: p ? p.photos.map(function (x) { return { t: x.t, f: x.f, pid: x.pid || '' }; }) : [], colors: p ? p.colors.slice() : [], parts: p ? p.parts.slice() : [], hidden: p ? !!p.hidden : false, hit: p ? !!p.hit : false, p: p, up: 0 };
    ensureStock().then(function () { setForm(); }, function (e) { toast(msg(e)); });
  }
  function qtyOf(id) { var r = (A.stock || []).filter(function (x) { return x[0] === id; })[0]; return r ? r : null; }
  function setForm() {
    var e = A.ed, p = e.p;
    modal('<h2>' + (p ? '✏️ ' + esc(p.title) : '➕ Новый набор') + '</h2>' + (p ? '' : '<p class="muted">Название присвоится само: «Набор №' + A.nextSet + '». Номера идут только вперёд.</p>') +
      '<label>Фото (с телефона)</label><div id="ed-photos"></div><label class="btn" for="adm-file">📷 Добавить фото</label><input id="adm-file" type="file" accept="image/*" multiple hidden>' +
      '<label>Описание</label><textarea id="ed-desc" placeholder="Коротко: повод, размер, что получит покупатель">' + esc(p ? p.description : '') + '</textarea>' +
      '<label>Состав (каждая позиция с новой строки)</label><textarea id="ed-comp" placeholder="Шары латексные — 30 шт.\nФольгированная цифра — 1 шт.\nГелий, доставка и монтаж">' + esc(p ? p.compound || '' : '') + '</textarea>' +
      '<div class="adm-two"><div><label>Цена, ₸</label><input id="ed-base" type="number" inputmode="numeric" min="0" value="' + (p ? p.base : '') + '"></div><div><label>Скидка, %</label><input id="ed-disc" type="number" inputmode="numeric" min="0" max="90" value="' + (p ? p.discount : 0) + '"></div></div><div id="ed-final" class="muted"></div>' +
      '<label>Цвет / фильтры</label><div id="ed-colors" class="chips wrap"></div><div class="adm-row"><input id="ed-newcol" placeholder="Новый цвет" maxlength="30"><button class="chip" data-a="addcol">＋</button></div>' +
      '<label>🔗 Штучные позиции из Книги учёта</label><div id="ed-parts" class="chips wrap"></div><input id="ed-pq" type="search" placeholder="Поиск позиции по первым буквам" autocomplete="off"><div id="ed-pres"></div>' +
      '<div class="adm-row"><button class="chip" data-a="svis" id="ed-vis"></button><button class="chip" data-a="shit" id="ed-hit"></button></div>' +
      '<div id="ed-err" class="adm-err"></div><button class="btn pri" data-a="ssave" id="ed-save">💾 Сохранить</button>' + (p ? '<button class="btn danger" data-a="sdel">🗑 Удалить набор</button>' : '') + '<button class="btn" data-a="mclose">Закрыть</button>');
    setPhotosDraw(); setColorsDraw(); setPartsDraw(); setVisDraw(); setFinalDraw();
  }
  function setPhotosDraw() {
    var e = A.ed, el = $('#ed-photos'); if (!el) return;
    el.innerHTML = e.photos.length ? '<div class="adm-pg">' + e.photos.map(function (x, i) { return '<div class="adm-pt">' + thumb(x, 'adm-img') + '<small>' + (x.pid ? 'Фото №' + esc(x.pid) : 'Фото') + (i === 0 ? ' · главное' : '') + '</small><div class="adm-row">' + (i > 0 ? '<button class="chip" data-a="pmv" data-i="' + i + '">⬅️</button>' : '') + '<button class="chip" data-a="pdel" data-i="' + i + '">✕</button></div></div>'; }).join('') + '</div>' : '<p class="muted">Фото пока нет. Нажмите «Добавить фото»: номер присвоится сам.</p>';
    if (e.up) el.innerHTML += '<p class="muted">⏳ Загружается фото: ' + e.up + '…</p>';
    H.hydrate();
  }
  function setColorsDraw() {
    var e = A.ed, el = $('#ed-colors'); if (!el) return; var all = (A.shop.colors || []).slice(); e.colors.forEach(function (c) { if (all.indexOf(c) < 0) all.push(c); });
    el.innerHTML = all.map(function (c) { return '<button class="chip' + (e.colors.indexOf(c) >= 0 ? ' on' : '') + '" data-a="col" data-c="' + esc(c) + '">' + esc(c) + '</button>'; }).join('');
  }
  function setPartsDraw() {
    var e = A.ed, el = $('#ed-parts'); if (!el) return;
    el.innerHTML = e.parts.length ? e.parts.map(function (id) { var r = qtyOf(id); return '<button class="chip on' + (r && r[2] === 0 ? ' zero' : '') + '" data-a="pxdel" data-id="' + esc(id) + '">' + esc(r ? r[1] : id) + ' · ' + (r ? r[2] : '?') + ' шт ✕</button>'; }).join('') : '<span class="muted">Ничего не привязано — набор не зависит от склада.</span>';
  }
  function setVisDraw() { var e = A.ed; $('#ed-vis').textContent = e.hidden ? '👁️ Показать на сайте' : '🙈 Скрыть с сайта'; $('#ed-vis').classList.toggle('on', e.hidden); $('#ed-hit').textContent = e.hit ? '🔥 Хит продаж: да' : '🔥 Хит продаж: нет'; }
  function setFinalDraw() {
    var b = +($('#ed-base') || {}).value || 0, d = Math.max(0, Math.min(90, +($('#ed-disc') || {}).value || 0)), el = $('#ed-final'); if (!el) return;
    el.textContent = b ? (d ? 'Итоговая цена: ' + H.money(Math.round(b * (100 - d) / 100)) + ' ₸ (вместо ' + H.money(b) + ' ₸)' : 'Итоговая цена: ' + H.money(b) + ' ₸') : 'Цена не указана — на сайте будет «цена по запросу».';
  }
  function partsSearch() {
    var q = norm($('#ed-pq').value), el = $('#ed-pres'); if (!q) { el.innerHTML = ''; return; }
    var res = findStock(q).filter(function (r) { return A.ed.parts.indexOf(r[0]) < 0; }).slice(0, 8);
    el.innerHTML = res.length ? res.map(function (r) { return '<button class="adm-pr" data-a="padd" data-id="' + esc(r[0]) + '"><span>' + esc(r[1]) + '</span><b class="' + (r[2] === 0 ? 'red' : '') + '">' + r[2] + ' шт</b></button>'; }).join('') : '<p class="muted">Не найдено в Книге учёта.</p>';
  }
  function setPayload(over) {
    var e = A.ed, f = { id: e.id || undefined, category: e.category, base: +$('#ed-base').value || 0, discount: +$('#ed-disc').value || 0, nid: e.nid, description: $('#ed-desc').value, compound: $('#ed-comp').value, colors: e.colors, parts: e.parts, photos: e.photos, hidden: e.hidden, hit: e.hit };
    return Object.assign(f, over || {});
  }
  function setSave() {
    var e = A.ed, er = $('#ed-err');
    if (e.up) { er.textContent = 'Дождитесь окончания загрузки фото.'; return; }
    var b = $('#ed-save'); if (e.busy) return; e.busy = 1; lock(b); er.textContent = '';
    call('adm_prodSave', setPayload()).then(function (r) {
      return refresh().then(function () {
        modal('<h2>✅ Сохранено</h2><p>«' + esc(r.title) + '» записан в черновик.' + (e.hidden ? ' Набор скрыт с сайта.' : '') + '</p><p class="muted">Чтобы покупатели увидели изменения, нажмите «✅ Опубликовать изменения».</p>' +
          '<button class="btn pri" data-a="newset">➕ Создать ещё один набор</button><button class="btn" data-a="mclose">Закрыть</button>');
      });
    }).catch(function (x) { e.busy = 0; unlock(b); er.textContent = msg(x); });
  }

  /* ---------- Книга учёта ---------- */
  function norm(s) { return String(s || '').toLowerCase().replace(/ё/g, 'е').trim(); }
  function findStock(q, flt) {
    var out = (A.stock || []).filter(function (r) {
      if (flt === 'low' && !(r[2] >= 1 && r[2] <= 2)) return false;
      if (flt === 'zero' && r[2] !== 0) return false;
      if (!q) return true;
      var t = norm(r[1]); if (t.indexOf(q) === 0) return true;
      return t.split(/[\s,.\-/()]+/).some(function (w) { return w.indexOf(q) === 0; });
    });
    if (q && !out.length) out = (A.stock || []).filter(function (r) { return norm(r[1]).indexOf(q) >= 0 && (!flt || flt === 'all' || (flt === 'low' ? (r[2] >= 1 && r[2] <= 2) : r[2] === 0)); });
    return out.sort(function (a, b) { return norm(a[1]) < norm(b[1]) ? -1 : 1; });
  }
  function drawStock() {
    var h = '<h2>📒 Книга учёта</h2><p class="muted">Штучные фольгированные шары и комплектующие. Склад видите только вы. Если позиция закончилась (0), наборы с ней скрываются сами; после «+1» они возвращаются.</p>' +
      '<input id="st-q" type="search" placeholder="🔍 Поиск по первым буквам" autocomplete="off" value="' + esc(A.q) + '"><div class="chips" id="st-chips"></div><div id="st-list"></div>' +
      '<div class="adm-row"><button class="btn pri" data-a="stnew">➕ Добавить позицию</button><button class="btn" data-a="stimp">📥 Загрузить список</button></div>';
    $('.adm-main').innerHTML = h;
    if (!A.stock) { $('#st-list').innerHTML = '<p class="muted">⏳ Загружаю…</p>'; ensureStock().then(function () { if (A && A.view === 'stock') stockList(); }, function (e) { toast(msg(e)); }); return; }
    stockList();
  }
  function stockList() {
    var q = norm(A.q), all = A.stock, z = 0, lo = 0; all.forEach(function (r) { if (r[2] === 0) z++; else if (r[2] <= 2) lo++; });
    var ch = $('#st-chips'); if (!ch) return;
    ch.innerHTML = [['all', 'Все (' + all.length + ')'], ['low', 'Мало (1–2 шт) · ' + lo], ['zero', 'Закончились (0 шт) · ' + z]].map(function (f) { return '<button class="chip' + (A.flt === f[0] ? ' on' : '') + '" data-a="flt" data-f="' + f[0] + '">' + f[1] + '</button>'; }).join('');
    var list = findStock(q, A.flt), shown = list.slice(0, 150);
    $('#st-list').innerHTML = (shown.length ? shown.map(function (r) {
      return '<div class="adm-st' + (r[2] === 0 ? ' zero' : r[2] <= 2 ? ' low' : '') + '" data-id="' + esc(r[0]) + '"><button class="adm-sn" data-a="stedit" data-id="' + esc(r[0]) + '">' + esc(r[1]) + '</button><button class="adm-b" data-a="adj" data-d="-1" data-id="' + esc(r[0]) + '">−1</button><button class="adm-q" data-a="stqty" data-id="' + esc(r[0]) + '">' + r[2] + '</button><button class="adm-b" data-a="adj" data-d="1" data-id="' + esc(r[0]) + '">+1</button></div>';
    }).join('') : '<p class="muted">Ничего не найдено.</p>') + (list.length > 150 ? '<p class="muted">Показано 150 из ' + list.length + ' — уточните поиск.</p>' : '');
  }
  function stockAdj(id, d) {
    var r = qtyOf(id); if (!r) return; var prev = r[2]; r[2] = Math.max(0, prev + d); stockList();
    call('adm_stockAdj', { id: id, d: d }).then(function (a) {
      r[2] = a.qty; A.deficit = a.deficit; if (A.view === 'stock') stockList(); drawBanner(); stockNote(r, prev, a);
      if (a.changed) refresh();
    }).catch(function (e) { r[2] = prev; stockList(); toast(msg(e)); });
  }
  function stockNote(r, prev, a) {
    var names = a.sets.map(function (s) { return s.title; }).join(', ');
    if (r[2] === 0 && prev > 0 && a.sets.length) toast('⚠️ «' + r[1] + '» закончился. Скрыты наборы: ' + names, 5000);
    else if (prev === 0 && r[2] > 0 && a.sets.length) toast('👁️ Позиция снова есть. Наборы вернутся на витрину, если не хватает нечего другого: ' + names, 5000);
  }
  function ask(title, fields, onOk, extra) {
    modal('<h2>' + title + '</h2>' + fields.map(function (f) { return (f.label ? '<label>' + f.label + '</label>' : '') + (f.area ? '<textarea id="' + f.id + '" placeholder="' + esc(f.ph || '') + '" style="min-height:160px">' + esc(f.v || '') + '</textarea>' : '<input id="' + f.id + '" ' + (f.num ? 'type="number" inputmode="numeric" min="0"' : '') + ' value="' + esc(f.v === undefined ? '' : f.v) + '" placeholder="' + esc(f.ph || '') + '">'); }).join('') +
      '<div id="ed-err" class="adm-err"></div><button class="btn pri" data-a="askok">Сохранить</button>' + (extra || '') + '<button class="btn" data-a="mclose">Отмена</button>');
    A.askOk = onOk;
  }

    /* ---------- сортировка плиток: долгое нажатие ~0,5 сек, затем перетаскивание ---------- */
  var DR = null, NOCLICK = 0;
  function dragInit() {
    var box = $('.adm-tiles'); if (!box || box.children.length < 2) return;
    var tm = null, sx = 0, sy = 0, auto = null;
    function mark(over) { box.querySelectorAll('.dropt').forEach(function (x) { x.classList.remove('dropt'); }); if (over) over.classList.add('dropt'); }
    function pick(x, y) {
      var u = document.elementFromPoint(x, y), t2 = u && u.closest && u.closest('.adm-tile');
      DR.over = t2 && t2 !== DR.el && box.contains(t2) ? t2 : null; mark(DR.over);
    }
    function move(e) {
      if (DR) { DR.x = e.clientX; DR.y = e.clientY; }
      if (!DR) { if (Math.abs(e.clientX - sx) + Math.abs(e.clientY - sy) > 10) clearTimeout(tm); return; }
      pick(e.clientX, e.clientY);
    }
    function fin() {
      clearTimeout(tm); clearInterval(auto); document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', fin); document.removeEventListener('pointercancel', fin);
      if (!DR) return; var d = DR; DR = null; NOCLICK = Date.now(); d.el.classList.remove('dragging'); box.classList.remove('sorting'); mark(null);
      if (!d.over) return;
      var kids2 = Array.prototype.slice.call(box.children), a = kids2.indexOf(d.el), b = kids2.indexOf(d.over);
      box.insertBefore(d.el, b > a ? d.over.nextSibling : d.over);
      var ids = Array.prototype.slice.call(box.children).map(function (x) { return x.getAttribute('data-id'); });
      call('adm_catOrder', { ids: ids }).then(function () { toast('Порядок сохранён в черновик', 1800); return refresh(); }).catch(function (x) { toast(msg(x)); refresh(); });
    }
    box.addEventListener('pointerdown', function (e) {
      var tl = e.target.closest('.adm-tile'); if (!tl) return; sx = e.clientX; sy = e.clientY; clearTimeout(tm);
      document.addEventListener('pointermove', move); document.addEventListener('pointerup', fin); document.addEventListener('pointercancel', fin);
      tm = setTimeout(function () {
        DR = { el: tl, over: null, x: sx, y: sy }; tl.classList.add('dragging'); box.classList.add('sorting');
        auto = setInterval(function () {   // у края экрана страница сама прокручивается
          if (!DR || !root) return; var h = window.innerHeight, dy = DR.y > h - 80 ? 14 : DR.y < 80 ? -14 : 0;
          if (dy) { root.scrollTop += dy; pick(DR.x, DR.y); }
        }, 30);
        try { tl.releasePointerCapture(e.pointerId); } catch (x) {} try { if (navigator.vibrate) navigator.vibrate(20); } catch (x2) {}
      }, 500);
    });
    box.addEventListener('touchmove', function (e) { if (DR) e.preventDefault(); }, { passive: false });
    box.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    box.addEventListener('click', function (e) { if (Date.now() - NOCLICK < 450) { e.stopPropagation(); e.preventDefault(); } }, true);
  }

  /* ---------- админская статистика ---------- */
  function drawAStats() {
    $('.adm-main').innerHTML = '<h2>📊 Статистика для хозяйки</h2><div id="as-body"><p class="muted">⏳ Загружаю…</p></div>';
    call('adm_stats').then(function (r) { A.st = r; A.stPer = A.stPer || 'today'; stBody(); }).catch(function (x) { var el = $('#as-body'); if (el) el.innerHTML = '<div class="err">' + esc(msg(x)) + '</div>'; });
  }
  function stBody() {
    var r = A.st, el = $('#as-body'); if (!r || !el) return; var d = r.periods[A.stPer] || r.periods.today;
    el.innerHTML = '<div class="chips">' + Object.keys(r.names).map(function (k) { return '<button class="chip' + (A.stPer === k ? ' on' : '') + '" data-a="asper" data-p="' + k + '">' + esc(r.names[k]) + '</button>'; }).join('') + '</div>' +
      '<div class="box stg"><div><b>' + d.visitors + '</b>👥 уникальных устройств</div><div><b>' + d.views + '</b>👁 просмотров</div><div><b>' + d.wa + '</b>🟢 клики WhatsApp</div><div><b>' + d.orders + '</b>🧾 заказов</div></div>' +
      '<div class="box"><b>Сумма заказов: ' + H.money(d.sum) + ' ₸</b><br><span class="muted">❤️ В избранное добавлено: ' + d.favs + '</span><br><span class="muted">📲 Установок приложения на телефон: ' + d.installs + '</span></div>' +
      '<div class="box"><h3>🏆 ТОП-5 наборов</h3>' + (d.top.length ? d.top.map(function (t, i) { return '<div class="adm-st"><span class="adm-sn">' + (i + 1) + '. ' + esc(t.title) + '</span><b>' + t.score + ' б. · кликов: ' + t.clicks + '</b></div>'; }).join('') : '<span class="muted">Пока нет данных.</span>') + '</div>' +
      '<p class="muted">' + (r.start ? 'Отсчёт ведётся с ' + esc(r.start) + '.' : 'Отсчёт ведётся с самого начала.') + ' Ваши устройства (где вы входили в режим администратора) в статистику не попадают.</p>' +
      '<button class="btn danger" data-a="asreset">🔄 Начать новый период отсчёта</button>';
  }
  /* ---------- настройка игры ---------- */
  var TIERN = { 1: 'Лёгкий (70%)', 2: 'Средний (25%)', 3: 'Джекпот (5%)' };
  function drawAGame() {
    $('.adm-main').innerHTML = '<h2>🎁 Настройка игры «Счастливые карточки»</h2><div id="ag-body"><p class="muted">⏳ Загружаю…</p></div>';
    call('adm_game').then(function (r) {
      var el = $('#ag-body'); if (!el) return;
      el.innerHTML = '<label class="chk"><input type="checkbox" id="ag-on"' + (r.on ? ' checked' : '') + '> 🎮 Игра включена (плавающая кнопка и пункт в «Ещё»)</label><p class="muted">Призы: у посетителя 3 попытки в день, выигрыш один на девять карточек. Купон действует 24 часа.</p>' +
        r.prizes.map(function (z) { return '<div class="box"><label class="chk"><input type="checkbox" data-pz="' + esc(z.id) + '"' + (z.on ? ' checked' : '') + '> ' + TIERN[z.tier] + '</label><input data-pt="' + esc(z.id) + '" maxlength="60" value="' + esc(z.text) + '"></div>'; }).join('') +
        '<div id="ag-err" class="adm-err"></div><button class="btn pri" data-a="agsave">💾 Сохранить настройки игры</button>';
    }).catch(function (x) { var el = $('#ag-body'); if (el) el.innerHTML = '<div class="err">' + esc(msg(x)) + '</div>'; });
  }
  function gameSave(b) {
    var er = $('#ag-err'), pr = [];
    root.querySelectorAll('[data-pz]').forEach(function (c) { var id = c.getAttribute('data-pz'), t = root.querySelector('[data-pt="' + id + '"]'); pr.push({ id: id, on: c.checked, text: t ? t.value : '' }); });
    lock(b); er.textContent = '';
    call('adm_gameSave', { on: $('#ag-on').checked, prizes: pr }).then(function (r) {
      unlock(b); if (S.shop && S.shop.settings) S.shop.settings.game = !!r.on; H.render(); toast(r.on ? '✅ Игра включена' : '⏸ Игра выключена');
    }).catch(function (x) { unlock(b); er.textContent = msg(x); });
  }
  /* ---------- очистка тестовых данных ---------- */
  function resetAsk() {
    modal('<h2>🧹 Очистить тестовые наборы и фото</h2><p>Будут удалены все наборы и подкатегории, останутся 7 чистых суперплиток. Нумерация начнётся заново: «Фото #1» и «Набор №1». <b>Книга учёта (склад) и статистика не затрагиваются.</b> Витрина сразу опубликуется пустой.</p><label>Пароль хозяйки для подтверждения</label>' + pwField('rs-pw') + '<div id="ed-err" class="adm-err"></div><button class="btn danger" data-a="resetok">🧹 Да, очистить</button><button class="btn" data-a="mclose">Отмена</button>');
  }
  function resetGo(b) {
    var pw = $('#rs-pw').value, er = $('#ed-err'); if (!pw) { er.textContent = 'Введите пароль.'; return; }
    lock(b, '⏳ Очищаем...'); er.textContent = '';
    call('adm_reset', { pw: pw }).then(function () { closeModal(); A.path = []; A.view = 'floors'; return refresh(); }).then(function () { return H.loadShop().then(function () { H.render(); }); }).then(function () { toast('🧹 Готово: тестовые данные удалены'); }).catch(function (x) { unlock(b); er.textContent = msg(x); });
  }

  /* ---------- события ---------- */
  function onInput(e) {
    var t = e.target;
    if (t.id === 'st-q') { A.q = t.value; stockList(); }
    else if (t.id === 'ed-pq') partsSearch();
    else if (t.id === 'ed-base' || t.id === 'ed-disc') setFinalDraw();
    else if (t.id === 'ed-emoji' && A.ed && A.ed.kind === 'tile' && !A.ed.cover) { var v = $('#adm-tpv'); if (v) v.innerHTML = tilePrev(); }
  }
  function onChange(e) {
    var t = e.target; if (t.id !== 'adm-file' || !t.files || !t.files.length || !A.ed) return;
    var files = Array.prototype.slice.call(t.files); t.value = '';
    if (A.ed.kind === 'tile') {
      uploadFile(files[0], ($('#ed-title').value || '').trim() || 'плитка').then(function (x) { A.ed.cover = x.t + '|' + x.f + '|' + x.pid; var v = $('#adm-tpv'); if (v) v.innerHTML = tilePrev(); }).catch(function (er) { toast(msg(er)); });
      return;
    }
    var ed = A.ed; files = files.slice(0, Math.max(0, 8 - ed.photos.length));
    ed.up += files.length; setPhotosDraw();
    files.reduce(function (pr, f) { return pr.then(function () { return uploadFile(f, ed.p ? ed.p.title : 'Набор №' + A.nextSet).then(function (x) { ed.photos.push(x); }).catch(function (er) { toast(msg(er), 5000); }).then(function () { ed.up--; if (A.ed === ed) setPhotosDraw(); }); }); }, Promise.resolve());
  }
  function onClick(e) {
    var t = e.target.closest('[data-a]'); if (!t || !root.contains(t)) return;
    var a = t.getAttribute('data-a'), id = t.getAttribute('data-id'), ed = A && A.ed;
    switch (a) {
      case 'login': return doLogin();
      case 'exit': return drop();
      case 'mclose': A && (A.ed = null); return closeModal();
      case 'logout': call('adm_logout').catch(function () {}).then(function () { toast('Вы вышли.'); drop(); }); return;
      case 'floors': A.view = 'floors'; return draw();
      case 'stock': A.view = 'stock'; return draw();
      case 'tostock': A.view = 'stock'; A.flt = 'zero'; A.q = ''; return draw();
      case 'hideban': A.hide = true; return drawBanner();
      case 'goto': var i = +t.getAttribute('data-i'); A.path = i < 0 ? [] : A.path.slice(0, i + 1); return drawFloors();
      case 'tile': return tileEditor(id, false);
      case 'newtile': return tileEditor('', true);
      case 'tenter': A.path.push(ed.id); A.ed = null; closeModal(); drawFloors(); return window.scrollTo(0, 0);
      case 'tphx': ed.cover = ''; return tileEditor2();
      case 'tvis': ed.hidden = !ed.hidden; t.textContent = ed.hidden ? '👁️ Показать на сайте' : '🙈 Скрыть с сайта'; return;
      case 'tmove': call('adm_catMove', { id: ed.id, dir: +t.getAttribute('data-d') }).then(function () { return refresh(); }).then(function () { tileEditor(ed.id, false); }).catch(function (x) { toast(msg(x)); }); return;
      case 'tsave': return tileSave();
      case 'tdel': if (!confirm('Удалить плитку «' + ($('#ed-title').value) + '»? Это попадёт в черновик.')) return;
        call('adm_catDel', { id: ed.id }).then(function () { closeModal(); return refresh(); }).then(function () { A.path = A.path.filter(function (x) { return x !== ed.id; }); draw(); toast('Плитка удалена (в черновике)'); }).catch(function (x) { $('#ed-err').textContent = msg(x); }); return;
      case 'newset': A.ed = null; return setEditor('', true);
      case 'set': return setEditor(id, false);
      case 'settoggle': var p = A.shop.products.filter(function (x) { return x.id === id; })[0]; if (!p) return;
        call('adm_prodSave', { id: p.id, category: p.category, base: p.base, discount: p.discount, description: p.description, compound: p.compound || '', colors: p.colors, parts: p.parts, photos: p.photos, hit: p.hit, hidden: !p.hidden }).then(function () { return refresh(); }).then(function () { toast(p.hidden ? '👁️ Набор показан на сайте (в черновике)' : '🙈 Набор скрыт с сайта (в черновике)'); }).catch(function (x) { toast(msg(x)); }); return;
      case 'pmv': var k = +t.getAttribute('data-i'), ph = ed.photos; ph.splice(k - 1, 0, ph.splice(k, 1)[0]); return setPhotosDraw();
      case 'pdel': ed.photos.splice(+t.getAttribute('data-i'), 1); return setPhotosDraw();
      case 'col': var c = t.getAttribute('data-c'), ix = ed.colors.indexOf(c); if (ix >= 0) ed.colors.splice(ix, 1); else ed.colors.push(c); return setColorsDraw();
      case 'addcol': var nc = $('#ed-newcol').value.trim(); if (!nc) return; if (ed.colors.indexOf(nc) < 0) ed.colors.push(nc);
        if ((A.shop.colors || []).indexOf(nc) < 0) { A.shop.colors = (A.shop.colors || []).concat([nc]); call('adm_colors', { list: A.shop.colors }).catch(function () {}); }
        $('#ed-newcol').value = ''; return setColorsDraw();
      case 'padd': if (ed.parts.indexOf(id) < 0) ed.parts.push(id); $('#ed-pq').value = ''; $('#ed-pres').innerHTML = ''; return setPartsDraw();
      case 'pxdel': ed.parts = ed.parts.filter(function (x) { return x !== id; }); return setPartsDraw();
      case 'svis': ed.hidden = !ed.hidden; return setVisDraw();
      case 'shit': ed.hit = !ed.hit; return setVisDraw();
      case 'ssave': return setSave();
      case 'sdel': if (!confirm('Удалить «' + ed.p.title + '»? Номер набора больше не используется повторно.')) return;
        call('adm_prodDel', { id: ed.id }).then(function () { closeModal(); return refresh(); }).then(function () { toast('Набор удалён (в черновике)'); }).catch(function (x) { toast(msg(x)); }); return;
      case 'publish':
        if (!confirm('Опубликовать изменения? Покупатели сразу увидят новую витрину.')) return; t.disabled = true;
        call('adm_publish').then(function () { toast('✅ Опубликовано — покупатели видят новую витрину'); return refresh(); }).then(function () { return H.loadShop().then(function () { H.render(); }); }).catch(function (x) { toast(msg(x)); }).then(function () { t.disabled = false; }); return;
      case 'discard':
        if (!confirm('Сбросить все неопубликованные правки и вернуть опубликованную версию?')) return;
        call('adm_discard').then(function () { A.path = []; return refresh(); }).then(function () { toast('↩️ Черновик сброшен'); }).catch(function (x) { toast(msg(x)); }); return;
      case 'flt': A.flt = t.getAttribute('data-f'); return stockList();
      case 'adj': return stockAdj(id, +t.getAttribute('data-d'));
      case 'stqty': var r1 = qtyOf(id); return ask('Остаток: ' + esc(r1[1]), [{ id: 'ed-n', num: 1, v: r1[2], label: 'Сколько штук на складе' }], function () {
        var n = parseInt($('#ed-n').value, 10); if (isNaN(n) || n < 0) { $('#ed-err').textContent = 'Введите число от 0.'; return; }
        var prev = r1[2]; call('adm_stockAdj', { id: id, qty: n }).then(function (x) { r1[2] = x.qty; A.deficit = x.deficit; closeModal(); stockList(); drawBanner(); stockNote(r1, prev, x); if (x.changed) refresh(); }).catch(function (er) { $('#ed-err').textContent = msg(er); });
      });
      case 'stedit': var r2 = qtyOf(id); return ask('Позиция', [{ id: 'ed-t', v: r2[1], label: 'Название' }], function () {
        call('adm_stockSave', { id: id, title: $('#ed-t').value }).then(function () { r2[1] = $('#ed-t').value.trim(); closeModal(); stockList(); }).catch(function (er) { $('#ed-err').textContent = msg(er); });
      }, '<button class="btn danger" data-a="stdel" data-id="' + esc(id) + '">🗑 Удалить позицию</button>');
      case 'stdel': if (!confirm('Удалить позицию из Книги учёта? Она отвяжется от наборов.')) return;
        call('adm_stockDel', { id: id }).then(function (x) { A.stock = A.stock.filter(function (r) { return r[0] !== id; }); A.deficit = x.deficit; closeModal(); stockList(); drawBanner(); refresh(); }).catch(function (er) { toast(msg(er)); }); return;
      case 'stnew': A.snid = rnd(); return ask('Новая позиция', [{ id: 'ed-t', label: 'Название', ph: 'Например: Шар-сердце красный 45 см' }, { id: 'ed-n', num: 1, label: 'Сколько штук', v: 0 }], function () {
        call('adm_stockSave', { nid: A.snid, title: $('#ed-t').value, qty: $('#ed-n').value }).then(function (x) { A.stock.push([x.id, $('#ed-t').value.trim(), Math.max(0, parseInt($('#ed-n').value, 10) || 0)]); A.deficit = x.deficit; closeModal(); stockList(); }).catch(function (er) { $('#ed-err').textContent = msg(er); });
      });
      case 'stimp': return ask('Загрузить список', [{ id: 'ed-l', area: 1, label: 'Каждая позиция с новой строки: «Название; количество»', ph: 'Шар-сердце красный; 12\nЗвезда золото; 5' }], function () {
        call('adm_stockImport', { text: $('#ed-l').value }).then(function (x) { A.stock = null; return ensureStock().then(function () { closeModal(); stockList(); toast('Добавлено: ' + x.added + (x.skipped ? ', пропущено (дубли/пустые): ' + x.skipped : '')); refresh(); }); }).catch(function (er) { $('#ed-err').textContent = msg(er); });
      });
      case 'askok': if (!A.askOk) return; lock(t); A.askOk();
        [700, 2500, 7000].forEach(function (ms) { setTimeout(function () { if (!root || !t.isConnected) return; var er = $('#ed-err'); if (er && er.textContent) unlock(t); }, ms); }); return;
      case 'eye': var pi = $('#' + t.getAttribute('data-for')); if (pi) { var sh = pi.type === 'password'; pi.type = sh ? 'text' : 'password'; t.textContent = sh ? '🙈' : '👁️'; t.setAttribute('aria-label', sh ? 'Скрыть пароль' : 'Показать пароль'); } return;
      case 'astats': A.view = 'astats'; return draw();
      case 'agame': A.view = 'agame'; return draw();
      case 'asper': A.stPer = t.getAttribute('data-p'); return stBody();
      case 'asreset': if (!confirm('Начать новый период отсчёта? Цифры станут нулевыми, а вся история в таблице сохранится.')) return; lock(t);
        call('adm_statsReset').then(function () { toast('🔄 Новый период начат'); drawAStats(); }).catch(function (x) { unlock(t); toast(msg(x)); }); return;
      case 'agsave': return gameSave(t);
      case 'reset': return resetAsk();
      case 'resetok': return resetGo(t);
    }
  }
  function tileEditor2() { var e = A.ed, ti = $('#ed-title').value, em = $('#ed-emoji').value; tileEditor(e.id, e.isNew); $('#ed-title').value = ti; $('#ed-emoji').value = em; A.ed.cover = ''; $('#adm-tpv').innerHTML = tilePrev(); }

  window.SHARADM = { open: open };
})();
