/* Миллион шаров • Уральск — витрина-конструктор v1.2.4.
   Всё содержимое приходит из Google Таблицы через шлюз; в памяти телефона хранятся избранное, корзина, черновик заказа, тема и кэш каталога. */
(function () {
  'use strict';
  var VER = 'v1.2.4';
  var CFG = { gateway: '', booking: 'https://zko-onlayn-zapis.github.io/zapisi/', wa: '77774784418', site: '', apk: '' };
  var PROJECTS = [
    { icon: '📖', title: 'Картотека ЗКО', text: 'Главный справочник области', url: 'https://zko-spravochnik.github.io/cartoteka/' },
    { icon: '✂️', title: 'ЗКО Онлайн-записи', text: 'Запись к мастерам и специалистам', url: 'https://zko-onlayn-zapis.github.io/zapisi/' }
  ];
  var S = {
    shop: null, tab: 'home', sub: '', cat: '', sub2: '', view: 'reels', hdr: false, q: '', color: '', budget: 'all', favs: [], cart: {}, addons: {}, singles: {}, err: '', rev: null, revErr: '', gal: null, galErr: '',
    form: { kind: 'pickup', gift: {} }, done: null, hl: '', promo: null, promoText: ''
  };
  var PH = {}, PHP = {}, QUEUE = [], BUSY = 0, DEFERRED = null, TQ = [], TT = null, SEEN = {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  function esc(s) { return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function ls(k, v) { try { if (v === undefined) { var x = localStorage.getItem('shar:' + k); return x ? JSON.parse(x) : null; } localStorage.setItem('shar:' + k, JSON.stringify(v)); } catch (e) { return null; } }
  function money(n) { return String(Math.round(+n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }
  function price(p) { return p.price > 0 ? money(p.price) + ' ₸' : 'цена по запросу'; }
  function normPhone(raw) {
    var d = String(raw || '').replace(/\D/g, '');
    if (d.length === 11 && d.charAt(0) === '8') d = '7' + d.slice(1);
    if (d.length === 10) d = '7' + d;
    return (d.length === 11 && d.charAt(0) === '7') ? d : '';
  }
  function localDay() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  var ERR = {
    no_gateway: 'Витрина ещё не подключена к таблице: владельцу нужно нажать «ВСЁ В ОДНОМ» в пульте.',
    network: 'Нет связи с интернетом или сервером. Проверьте соединение и попробуйте ещё раз.',
    bad_reply: 'Сервер ответил не так, как ожидалось. Владельцу нужно проверить развёртывание скрипта (доступ «Все») и нажать «ВСЁ В ОДНОМ» в пульте.',
    sheet_error: 'Не удаётся открыть Google Таблицу магазина. Владельцу нужно проверить ссылку на таблицу и доступ к ней (пульт → «ВСЁ В ОДНОМ»).',
    server_error: 'Сервер временно не справился. Попробуйте через минуту или закажите в WhatsApp.',
    busy: 'Сейчас много запросов. Подождите минуту.', too_many: 'Слишком много обращений подряд. Подождите немного или напишите в WhatsApp.',
    bad_name: 'Укажите имя (не короче 2 букв).', bad_phone: 'Телефон указан неверно. Нужен номер вида +7 777 123 45 67.',
    need_address: 'Для доставки укажите адрес.', bad_date: 'Дата указана неверно.', bad_item: 'Одной из позиций уже нет в продаже. Обновите страницу и соберите корзину заново.',
    empty_cart: 'Корзина пуста.', bad_text: 'Напишите текст отзыва (не короче 3 знаков).', bad_rating: 'Поставьте оценку от 1 до 5 звёзд.',
    bad_photo: 'Фото не подошло (нужен JPEG, PNG или WebP).', photo_big: 'Фото слишком большое, выберите другое.', no_photo: 'Фото не найдено.', photo_unavailable: 'Фото сейчас недоступно.',
    bad_master: 'Неверный пароль.', promo_bad: 'Такого промокода нет или он уже не действует.', promo_empty: 'Введите промокод.', bad_gift_name: 'Укажите имя получателя подарка.', bad_gift_phone: 'Телефон получателя указан неверно.'
  };
  function errText(e) { return ERR[e && e.code] || 'Что-то пошло не так. Попробуйте ещё раз или напишите в WhatsApp.'; }
  function api(action, data, keep) {
    if (!CFG.gateway) return Promise.reject({ code: 'no_gateway' });
    return fetch(CFG.gateway, { method: 'POST', keepalive: !!keep, headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(Object.assign({ action: action }, data || {})) })
      .then(function (r) { return r.text(); }, function () { throw { code: 'network' }; })
      .then(function (t) { var j; try { j = JSON.parse(t); } catch (e) { throw { code: 'bad_reply' }; } if (!j || !j.ok) throw { code: (j && j.error) || 'server_error' }; return j; });
  }
  /* ---------- тихая статистика ---------- */
  function track(k, p) { TQ.push(p ? { k: k, p: p } : { k: k }); clearTimeout(TT); TT = setTimeout(flush, 8000); }
  function flush() {
    if (!TQ.length || !CFG.gateway) return;
    var ev = TQ.splice(0, 30); api('track', { events: ev }, true).then(function () {}, function () {});
  }
  function seen(id) { if (SEEN[id]) return; SEEN[id] = 1; track('view', id); }
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') flush(); });
  window.addEventListener('pagehide', flush);
  /* ---------- фото: ленивая загрузка с очередью ---------- */
  function loadPhoto(id) {
    if (PH[id]) return Promise.resolve(PH[id]);
    if (PHP[id]) return PHP[id];
    PHP[id] = new Promise(function (res, rej) { QUEUE.push({ id: id, res: res, rej: rej }); pump(); });
    return PHP[id];
  }
  function pump() {
    while (BUSY < 3 && QUEUE.length) {
      (function (j) {
        BUSY++;
        api('photo', { id: j.id }).then(function (r) { PH[j.id] = r.data; j.res(r.data); }, function (e) { delete PHP[j.id]; j.rej(e); }).then(function () { BUSY--; pump(); });
      })(QUEUE.shift());
    }
  }
  var IO = null;
  function hydrate() {
    var els = document.querySelectorAll('[data-fid]:not([data-done])');
    if (!els.length) return;
    function go(el) { el.setAttribute('data-done', '1'); loadPhoto(el.getAttribute('data-fid')).then(function (d) { var im = document.createElement('img'); im.alt = ''; im.src = d; el.appendChild(im); }, function () {}); }
    if (!('IntersectionObserver' in window)) { els.forEach(go); return; }
    if (!IO) IO = new IntersectionObserver(function (en) { en.forEach(function (x) { if (x.isIntersecting) { IO.unobserve(x.target); go(x.target); } }); }, { rootMargin: '200px' });
    els.forEach(function (el) { IO.observe(el); });
  }
  /* ---------- данные ---------- */
  function setting(k) { return (S.shop && S.shop.settings && S.shop.settings[k]) || ''; }
  function waNum() { return normPhone(setting('whatsapp')) || CFG.wa; }
  function bookUrl() { return setting('booking_url') || CFG.booking || ''; }
  function prod(id) { return ((S.shop && S.shop.products) || []).filter(function (p) { return p.id === id; })[0]; }
  function catOf(p) { return ((S.shop && S.shop.categories) || []).filter(function (c) { return c.id === p.category; })[0]; }
  function cartCount() { var n = 0, k; for (k in S.cart) n += S.cart[k]; for (k in S.singles) n += S.singles[k]; return n; }
  function save() { ls('favs', S.favs); ls('cart', S.cart); ls('addons', S.addons); ls('singles', S.singles); }
  function saveDraft() { var f = S.form; ls('draft', { name: f.name, phone: f.phone, address: f.address, kind: f.kind, wish: f.wish, rname: f.rname, rphone: f.rphone, gift: f.gift }); }
  function loadShop() {
    return api('shop').then(function (r) { S.shop = r; S.err = ''; ls('shop', r); }, function (e) {
      if (S.shop) { S.err = 'Показана сохранённая версия витрины: ' + errText(e); } else { S.shop = null; S.err = errText(e); }
    });
  }
  function budgetOk(p) {
    var b = S.budget; if (b === 'all') return true;
    if (!(p.price > 0)) return false;
    return b === 'lt5' ? p.price < 5000 : b === 'mid' ? (p.price >= 5000 && p.price < 10000) : p.price >= 10000;
  }
  function cats() { return (S.shop && S.shop.categories) || []; }
  function catById(id) { return cats().filter(function (c) { return c.id === id; })[0]; }
  function subsOf(id) { return cats().filter(function (c) { return c.parent === id; }); }
  function topCats() { return cats().filter(function (c) { return !c.parent; }); }
  function countIn(id) { var ids = [id].concat(subsOf(id).map(function (c) { return c.id; })); return ((S.shop && S.shop.products) || []).filter(function (p) { return ids.indexOf(p.category) >= 0; }).length; }
  function filt(list) { return list.filter(function (p) { if (S.color && p.colors.map(function (c) { return c.toLowerCase(); }).indexOf(S.color) < 0) return false; return budgetOk(p); }); }
  function searchList() {
    var q = S.q.trim().toLowerCase(), d = q.replace(/[\s₸тг.]/g, ''), num = /^\d{3,7}$/.test(d) ? +d : 0;
    var res = filt(((S.shop && S.shop.products) || []).filter(function (p) {
      var c = catOf(p), pa = c && c.parent ? catById(c.parent) : null;
      var hay = (p.title + ' ' + p.description + ' ' + (c ? c.title : '') + ' ' + (pa ? pa.title : '') + ' ' + p.colors.join(' ')).toLowerCase();
      if (hay.indexOf(q) >= 0) return true;
      return num > 0 && p.price > 0 && (p.price <= num * 1.15 || String(p.price).indexOf(d) >= 0);
    }));
    if (num) res.sort(function (a, b) { return Math.abs(a.price - num) - Math.abs(b.price - num); });
    return res;
  }
  function floorProducts() {
    var all = (S.shop && S.shop.products) || [];
    return filt(all.filter(function (p) { return S.sub2 ? p.category === S.sub2 : p.category === S.cat; }));
  }

  /* ---------- добавки ---------- */
  function ad(id) { return S.addons[id] || (S.addons[id] = {}); }
  function adPrice(k) { return +setting('addon_' + k) || 0; }
  function adList(id) {
    var a = S.addons[id] || {}, L = [];
    if (a.digit) L.push('Фольгированная цифра: ' + (a.digitVal || 'уточнить'));
    if (a.text) L.push('Надпись на шаре: ' + (a.textVal || 'уточнить'));
    if (a.card) L.push('Открытка с пожеланием');
    if (a.bag) L.push('Транспортировочный пакет');
    return L;
  }
  function adCost(id) { var a = S.addons[id] || {}; return (a.digit ? adPrice('digit') : 0) + (a.text ? adPrice('text') : 0) + (a.card ? adPrice('card') : 0) + (a.bag ? adPrice('bag') : 0); }
  function adHTML(id) {
    var a = S.addons[id] || {}, pr = function (k) { return adPrice(k) > 0 ? ' <small>(+' + money(adPrice(k)) + ' ₸)</small>' : ''; };
    return '<label class="chk"><input type="checkbox" data-ad="digit" data-id="' + esc(id) + '"' + (a.digit ? ' checked' : '') + '> Фольгированная цифра' + pr('digit') + '</label>' +
      (a.digit ? '<input class="adin" data-adv="digitVal" data-id="' + esc(id) + '" placeholder="Какая цифра?" maxlength="10" value="' + esc(a.digitVal || '') + '">' : '') +
      '<label class="chk"><input type="checkbox" data-ad="text" data-id="' + esc(id) + '"' + (a.text ? ' checked' : '') + '> Индивидуальная надпись на шаре' + pr('text') + '</label>' +
      (a.text ? '<input class="adin" data-adv="textVal" data-id="' + esc(id) + '" placeholder="Текст надписи" maxlength="60" value="' + esc(a.textVal || '') + '">' : '') +
      '<label class="chk"><input type="checkbox" data-ad="card" data-id="' + esc(id) + '"' + (a.card ? ' checked' : '') + '> Открытка с пожеланием' + pr('card') + '</label>' +
      '<label class="chk"><input type="checkbox" data-ad="bag" data-id="' + esc(id) + '"' + (a.bag ? ' checked' : '') + '> Транспортировочный пакет' + pr('bag') + '</label>';
  }
  /* ---------- ссылки WhatsApp ---------- */
  function waLink(text) { return 'https://wa.me/' + waNum() + '?text=' + encodeURIComponent(text); }
  function waProduct(p) {
    var t = 'Здравствуйте! Хочу заказать: ' + p.title + ' — ' + price(p), L = adList(p.id);
    if (L.length) t += '\nДобавки:\n• ' + L.join('\n• ');
    return waLink(t + (CFG.site ? '\n' + CFG.site : ''));
  }
  /* ---------- отрисовка ---------- */
  function busyStrip() {
    var b = setting('busy'); if (!b) return '';
    var d = b === 'today' ? 'сегодня' : b === 'tomorrow' ? 'завтра' : 'сегодня и завтра';
    return '<div class="strip">⚠️ Высокая загруженность на ' + d + ': срочные заказы — только по согласованию. Напишите нам в WhatsApp.</div>';
  }
  function header() {
    var logo = setting('logo'), lid = logo ? logo.split('|')[0] : '', bu = bookUrl(), col = S.hdr;
    return busyStrip() + '<div class="hdr' + (col ? ' col' : '') + '"><div class="hrow"><div class="logo' + (col ? ' sm' : '') + '"' + (lid ? ' data-fid="' + esc(lid) + '"' : '') + '>' + (lid ? '' : '<img src="icons/icon-192.png" alt="">') + '</div>' +
      '<div class="hname"><h1>' + esc(setting('shop_name') || 'Миллион шаров') + '</h1><small>' + esc(setting('city') || 'г. Уральск') + '</small></div>' +
      '<button class="ib" data-act="theme" aria-label="Тема">🌓</button><button class="ib hb' + (col ? '' : ' pulse') + '" data-act="hdr" aria-label="' + (col ? 'Развернуть шапку' : 'Свернуть шапку') + '">' + (col ? '▼' : '▲') + '</button></div>' +
      (col ? '' : '<p class="hgreet">' + esc(setting('greeting')) + '</p>' + (bu ? '<a class="book" href="' + esc(bu) + '" target="_blank" rel="noopener">📅 Забронировать дату в Онлайн-записях<i>VIP Premium</i></a>' : '')) + '</div>';
  }
  function priceBlock(p) {
    if (p.old_price > p.price && p.price > 0) return '<div class="price"><span class="old">' + money(p.old_price) + ' ₸</span> ' + money(p.price) + ' ₸</div>';
    return '<div class="price">' + price(p) + '</div>';
  }
  function saleOf(p) { return p.old_price > p.price && p.price > 0 ? Math.round((1 - p.price / p.old_price) * 100) : 0; }
  function card(p) {
    var c = catOf(p), ph = p.photos[0], fav = S.favs.indexOf(p.id) >= 0, bu = bookUrl(), sale = saleOf(p);
    return '<div class="card' + (S.hl === p.id ? ' hl' : '') + '" data-card="' + esc(p.id) + '"><div class="ph" data-act="zoom" data-id="' + esc(p.id) + '"' + (ph ? ' data-fid="' + esc(ph.t) + '"' : '') + '>' + (ph ? '' : '🎈') +
      (p.hit ? '<span class="hit">🔥 Хит продаж</span>' : '') + (sale ? '<span class="sale">-' + sale + '%</span>' : '') + (p.photos.length > 1 ? '<span class="cnt">📷 ' + p.photos.length + '</span>' : '') + '</div>' +
      '<div class="cb"><h3>' + esc(p.title) + '</h3>' + priceBlock(p) +
      (p.colors.length ? '<div class="dots">' + p.colors.map(function (x) { return '<span>' + esc(x) + '</span>'; }).join('') + '</div>' : '') +
      (p.description ? '<details data-seen="' + esc(p.id) + '"><summary>Описание / состав</summary><p>' + esc(p.description) + '</p></details>' : '') +
      '<details data-seen="' + esc(p.id) + '"><summary>➕ Добавки к заказу</summary><div class="adbox" data-adbox="' + esc(p.id) + '">' + adHTML(p.id) + '</div></details>' +
      '<a class="btn wa" data-act="wa" data-id="' + esc(p.id) + '" href="' + esc(waProduct(p)) + '" target="_blank" rel="noopener">🟢 ЗАКАЗАТЬ В WHATSAPP</a>' +
      '<div class="row"><button class="btn pri" data-act="add" data-id="' + esc(p.id) + '">🛒 В корзину</button><button class="btn fav' + (fav ? ' on' : '') + '" data-act="fav" data-id="' + esc(p.id) + '">' + (fav ? '❤️ В избранном' : '🤍 В избранное') + '</button></div>' +
      (c && c.booking && bu ? '<a class="btn bk" href="' + esc(bu) + '" target="_blank" rel="noopener">📅 Забронировать дату в Онлайн-записях</a>' : '') + '</div></div>';
  }
  function gridHTML(list) {
    if (!list.length) return '<div class="empty">🎈 Ничего не найдено.<br>Измените поиск или фильтр — или напишите нам в WhatsApp, подберём под ваш праздник!</div>';
    return '<div class="grid">' + list.map(card).join('') + '</div>';
  }
  function topHTML() {
    var t = (S.shop.top || []).map(function (x, i) { return { p: prod(x.id), i: i }; }).filter(function (x) { return x.p; });
    if (!t.length) return '';
    return '<h2>🏆 ТОП-5 популярных наборов</h2><div class="topr">' + t.map(function (x) {
      var ph = x.p.photos[0];
      return '<button class="topc" data-act="top" data-id="' + esc(x.p.id) + '"><span class="gold">🏆 ТОП-' + (x.i + 1) + '</span><span class="tph"' + (ph ? ' data-fid="' + esc(ph.t) + '"' : '') + '>' + (ph ? '' : '🎈') + '</span><b>' + esc(x.p.title) + '</b><i>' + esc(price(x.p)) + '</i></button>';
    }).join('') + '</div>';
  }
  function tileHTML(c, act) {
    return '<button class="tile" data-act="' + act + '" data-id="' + esc(c.id) + '"><span class="tp"' + (c.cover ? ' data-fid="' + esc(c.cover) + '"' : '') + '>' + (c.cover ? '' : '<b>' + esc(c.emoji) + '</b>') + '</span><span class="tn"><i>' + esc(c.title) + '</i><em>' + countIn(c.id) + '</em></span></button>';
  }
  function chipsHTML() {
    var sh = S.shop, h = '<div class="chips">' + [['all', 'Все'], ['lt5', 'До 5 000 ₸'], ['mid', '5 000 – 10 000 ₸'], ['gt', 'От 10 000 ₸']].map(function (b) { return '<button class="chip bud' + (S.budget === b[0] ? ' on' : '') + '" data-act="budget" data-id="' + b[0] + '">' + b[1] + '</button>'; }).join('') + '</div>';
    if (sh.colors && sh.colors.length) h += '<div class="chips">' + sh.colors.map(function (c) { return '<button class="chip' + (S.color === c ? ' on' : '') + '" data-act="color" data-id="' + esc(c) + '">' + esc(c) + '</button>'; }).join('') + '</div>';
    return h;
  }
  function resultsHTML() { var l = searchList(); return '<h2>🔎 Найдено: ' + l.length + '</h2>' + gridHTML(l); }
  function floorBar(cur) {
    return '<div class="fbar"><button class="btn back" data-act="back">← Назад</button><h2>' + esc(cur.emoji + ' ' + cur.title) + '</h2></div>';
  }
  function viewFloor() {
    var c = catById(S.cat); if (!c) { S.cat = ''; S.sub2 = ''; return viewHome(); }
    var cur = S.sub2 ? (catById(S.sub2) || c) : c, subs = subsOf(c.id), h = floorBar(cur);
    if (subs.length && !S.sub2) {
      h += '<div class="tiles">' + subs.map(function (x) { return tileHTML(x, 'subcat'); }).join('') + '</div>';
      var own = floorProducts(); if (own.length) h += '<h2>Ещё в этой категории</h2>' + gridHTML(own);
      return h;
    }
    return h + '<div class="modes"><button class="chip" data-act="mode">🎞 По одному на весь экран</button></div>' + chipsHTML() + gridHTML(floorProducts());
  }
  function reelsOn() {
    if (S.tab !== 'home' || !S.cat || S.view !== 'reels' || !S.shop) return false;
    if (subsOf(S.cat).length && !S.sub2) return false;
    return floorProducts().length > 0;
  }
  function slide(p) {
    var fav = S.favs.indexOf(p.id) >= 0, sale = saleOf(p), ph = p.photos;
    return '<section class="slide" data-slide="' + esc(p.id) + '"><div class="rph"><div class="rtrack">' + (ph.length ? ph.map(function (x, i) { return '<div class="rs" data-fid="' + esc(x.t) + '" data-full="' + esc(x.f) + '" data-act="zoom" data-id="' + esc(p.id) + '" data-i="' + i + '"></div>'; }).join('') : '<div class="rs">🎈</div>') + '</div>' +
      (p.hit ? '<span class="hit">🔥 Хит продаж</span>' : '') + (sale ? '<span class="sale">-' + sale + '%</span>' : '') + (ph.length > 1 ? '<span class="rcnt">1 / ' + ph.length + '</span>' : '') + '</div>' +
      '<div class="rinfo"><h3>' + esc(p.title) + '</h3>' + priceBlock(p) +
      '<div class="rbtn"><button class="btn blue" data-act="zoom" data-id="' + esc(p.id) + '">🔍 Увеличить</button><button class="btn" data-act="comp" data-id="' + esc(p.id) + '">📋 Состав</button><button class="btn rb fav' + (fav ? ' on' : '') + '" data-act="fav" data-id="' + esc(p.id) + '">' + (fav ? '❤️' : '🤍') + '</button><button class="btn pri rb" data-act="add" data-id="' + esc(p.id) + '">🛒 В корзину</button></div>' +
      '<a class="btn wa" data-act="wa" data-id="' + esc(p.id) + '" href="' + esc(waProduct(p)) + '" target="_blank" rel="noopener">🟢 ЗАКАЗАТЬ В WHATSAPP</a></div>' +
      '<div class="sheet"><button class="btn" data-act="comp" data-id="' + esc(p.id) + '">✕ Закрыть</button><h3>' + esc(p.title) + '</h3><p class="pre">' + esc(p.description || 'Состав уточняйте в WhatsApp.') + '</p>' + (p.colors.length ? '<div class="dots">' + p.colors.map(function (x) { return '<span>' + esc(x) + '</span>'; }).join('') + '</div>' : '') + '<h3 style="margin-top:12px">➕ Добавки к заказу</h3><div class="adbox" data-adbox="' + esc(p.id) + '">' + adHTML(p.id) + '</div></div></section>';
  }
  function reelsHTML() {
    var cur = S.sub2 ? (catById(S.sub2) || catById(S.cat)) : catById(S.cat), list = floorProducts();
    return '<div class="reelsw"><div class="rbar"><button class="btn back" data-act="back">←</button><b>' + esc(cur.emoji + ' ' + cur.title) + '</b><span class="rn">' + list.length + '</span><button class="chip" data-act="mode">📋 Списком</button></div><div class="rscroll" id="rscroll">' + list.map(slide).join('') + '</div></div>';
  }
  function viewHome() {
    var sh = S.shop, h = '';
    if (!sh) return '<div class="err">' + esc(S.err) + '</div><button class="btn pri" data-act="retry">🔄 Повторить</button>';
    if (S.cat) return viewFloor();
    h += (S.err ? '<div class="err">' + esc(S.err) + '</div>' : '');
    h += topHTML();
    h += '<div class="search"><input id="q" type="search" placeholder="🔍 Поиск: название, состав, цена" value="' + esc(S.q) + '" autocomplete="off"><button class="clr' + (S.q ? '' : ' hid') + '" id="qclr" data-act="clearq">✕ Очистить</button></div>';
    h += chipsHTML();
    h += '<div id="tilesbox" class="' + (S.q.trim() ? 'hid' : '') + '"><div class="tiles">' + topCats().map(function (c) { return tileHTML(c, 'cat'); }).join('') + '</div></div><div id="sres">' + (S.q.trim() ? resultsHTML() : '') + '</div>';
    return h;
  }
  function viewFav() {
    var l = S.favs.map(prod).filter(Boolean);
    return '<h2>❤️ Избранное</h2>' + (l.length ? gridHTML(l) : '<div class="empty">Здесь будут товары, которые вы отметили ❤️</div>');
  }
  function cartLines() { return Object.keys(S.cart).map(function (id) { return { p: prod(id), q: S.cart[id] }; }).filter(function (x) { return x.p; }); }
  function singleLines() { return ((S.shop && S.shop.singles) || []).map(function (x) { return { s: x, q: S.singles[x.id] || 0 }; }); }
  function cartTotal() {
    var t = 0; cartLines().forEach(function (x) { t += x.p.price * x.q + adCost(x.p.id); });
    singleLines().forEach(function (x) { t += x.s.price * x.q; }); return t;
  }
  function cartDisc() {   // скидка по применённому промокоду (окончательно её всё равно считает сервер при заказе)
    var t = cartTotal(); if (!S.promo || t <= 0) return 0;
    var d = S.promo.mode === 'pct' ? Math.round(t * S.promo.value / 100) : S.promo.value;
    return Math.max(0, Math.min(d, t));
  }
  function viewCart() {
    var L = cartLines(), SG = singleLines(), f = S.form, g = f.gift || {}, h = '';
    if (S.done) return '<div class="ok"><b>✅ Заказ ' + esc(S.done.id) + ' отправлен!</b><br>Мы свяжемся с вами по телефону, чтобы подтвердить детали. Сумма: ' + (S.done.total > 0 ? money(S.done.total) + ' ₸' : 'по запросу') + '</div><button class="btn pri" data-act="home">🎈 Вернуться к витрине</button>';
    h = '<h2>🛒 Корзина</h2>';
    if (SG.length) {
      h += '<div class="box"><h3>🎈 Быстрый прайс: шары поштучно</h3>' + SG.map(function (x) {
        return '<div class="ci"><div class="t"><b>' + esc(x.s.title) + '</b>' + money(x.s.price) + ' ₸ за 1 шт.</div><div class="qty"><button data-act="sdec" data-id="' + esc(x.s.id) + '">−</button><b>' + x.q + '</b><button data-act="sinc" data-id="' + esc(x.s.id) + '">+</button></div></div>';
      }).join('') + '</div>';
    }
    var anySingle = SG.some(function (x) { return x.q > 0; });
    if (!L.length && !anySingle) return h + '<div class="empty">Корзина пуста. Добавьте понравившееся с витрины 🎈</div>' + (SG.length ? '<div class="muted">…или выберите шары поштучно выше.</div>' : '');
    if (L.length) {
      h += '<div class="box">';
      L.forEach(function (x) {
        h += '<div class="ci wrap"><div class="t"><b>' + esc(x.p.title) + '</b>' + esc(price(x.p)) + (adList(x.p.id).length ? '<br><small>+ ' + esc(adList(x.p.id).join('; ')) + '</small>' : '') + '</div><div class="qty"><button data-act="dec" data-id="' + esc(x.p.id) + '">−</button><b>' + x.q + '</b><button data-act="inc" data-id="' + esc(x.p.id) + '">+</button></div><button class="btn" style="flex:0 0 40px;padding:8px" data-act="del" data-id="' + esc(x.p.id) + '">✕</button>' +
          '<details class="full"><summary>➕ Добавки</summary><div class="adbox" data-adbox="' + esc(x.p.id) + '">' + adHTML(x.p.id) + '</div></details></div>';
      });
      h += '</div>';
    }
    var tot = cartTotal();
    var dsc = cartDisc();
    h += '<div class="box"><h3>🎟 Промокод</h3>' + (S.promo ? '<div class="ok">Промокод <b>' + esc(S.promo.code) + '</b> применён: −' + (S.promo.mode === 'pct' ? S.promo.value + '%' : money(S.promo.value) + ' ₸') + ' <button class="btn" data-act="promox" style="padding:4px 10px">✕ Убрать</button></div>' : '<div class="row"><div><input id="f_promo" placeholder="Например, ВЕСНА10" value="' + esc(S.promoText || '') + '" autocapitalize="characters" autocomplete="off"></div><div style="flex:0 0 auto"><button class="btn" data-act="promo">Применить</button></div></div><div id="perr"></div>') + '</div>';
    h += '<div class="box"><p style="font-size:18px;margin:0">' + (dsc ? '<small>Сумма: ' + money(tot) + ' ₸ · скидка −' + money(dsc) + ' ₸</small><br>' : '') + '<b>Итого: ' + (tot > 0 ? money(tot - dsc) + ' ₸' : 'по запросу') + '</b></p></div>';
    h += '<div class="box"><h3>Как получить заказ</h3><div class="seg"><button data-act="kind" data-id="delivery" class="' + (f.kind === 'delivery' ? 'on' : '') + '">🚚 Доставка</button><button data-act="kind" data-id="pickup" class="' + (f.kind === 'pickup' ? 'on' : '') + '">🏪 Самовывоз</button></div>';
    h += '<label>Ваше имя</label><input id="f_name" value="' + esc(f.name || '') + '" autocomplete="name"><label>Телефон</label><input id="f_phone" type="tel" placeholder="+7 777 123 45 67" value="' + esc(f.phone || '') + '" autocomplete="tel">';
    if (f.kind === 'delivery') h += '<label>Адрес доставки</label><input id="f_address" value="' + esc(f.address || '') + '"><div class="row"><div><label>Дата</label><input id="f_date" type="date" value="' + esc(f.date || '') + '"></div><div><label>Время</label><input id="f_time" type="time" value="' + esc(f.time || '') + '"></div></div>';
    h += '<label class="chk" style="margin-top:12px"><input type="checkbox" data-act="gift"' + (g.on ? ' checked' : '') + '> 🎁 Это подарок (доставка другому человеку)</label>';
    if (g.on) h += '<label>Имя получателя</label><input id="g_name" value="' + esc(g.name || '') + '"><label>Телефон получателя</label><input id="g_phone" type="tel" value="' + esc(g.phone || '') + '"><label class="chk"><input type="checkbox" id="g_photo"' + (g.photo ? ' checked' : '') + '> 📸 Прислать мне фотоотчёт вручения в WhatsApp</label>';
    h += '<label>Пожелание</label><textarea id="f_wish" placeholder="Цвета, надпись, повод…">' + esc(f.wish || '') + '</textarea>';
    h += '<div id="cerr"></div><button class="btn wa" style="width:100%;margin-top:12px" data-act="sendwa">🟢 Отправить заказ в WhatsApp</button><button class="btn pri" style="width:100%;margin-top:8px" data-act="sendsite">📨 Отправить заказ через сайт</button></div>';
    return h;
  }
  /* ----- вкладка «Ещё» ----- */
  var MORE = [['gallery', '📸', 'Наши оформления', 'Расчёт по фото'], ['delivery', '🚚', 'Доставка и оплата', ''], ['reviews', '💬', 'Отзывы покупателей', ''], ['faq', '❓', 'Частые вопросы', 'FAQ'], ['care', '💡', 'Памятка по уходу за шарами', ''], ['projects', '🌐', 'Другие проекты ГИНЦ ЗКО', ''], ['install', '📲', 'Установить приложение', ''], ['stats', '📊', 'Статистика магазина', 'по паролю'], ['whatsnew', '✨', 'Что нового (' + VER + ')', '']];
  function backBtn() { return '<button class="btn back" data-act="more">← Назад в «Ещё»</button>'; }
  function viewMore() {
    var bu = bookUrl();
    return '<h2>☰ Ещё</h2><div class="verbar">Версия приложения: <b>' + VER + '</b></div><div class="more"><button class="mi" data-act="refreshapp"><b>🔄</b><span>Обновить приложение и каталог<small>свежие файлы и данные</small></span><i>›</i></button>' + MORE.map(function (m) { return '<button class="mi" data-act="sub" data-id="' + m[0] + '"><b>' + m[1] + '</b><span>' + m[2] + (m[3] ? '<small>' + m[3] + '</small>' : '') + '</span><i>›</i></button>'; }).join('') +
      (bu ? '<a class="mi" href="' + esc(bu) + '" target="_blank" rel="noopener"><b>📅</b><span>Забронировать дату в Онлайн-записях<small>профиль в «ЗКО Онлайн-записи» · VIP Premium</small></span><i>↗</i></a>' : '') +
      (setting('instagram') ? '<a class="mi" href="' + esc(setting('instagram')) + '" target="_blank" rel="noopener"><b>📷</b><span>Мы в Instagram</span><i>↗</i></a>' : '') + '</div>';
  }
  function viewGallery() {
    var h = backBtn() + '<h2>📸 Наши оформления</h2><p class="muted">Сложные фотозоны и арки считаем по фото: нажмите «Хочу так же» — расскажем цену в WhatsApp.</p>';
    if (S.galErr) h += '<div class="err">' + esc(S.galErr) + '</div>';
    if (!S.gal) return h + (S.galErr ? '' : '<div class="empty">Загружаем фото…</div>');
    if (!S.gal.length) return h + '<div class="empty">Фото оформлений скоро появятся 🎈</div>';
    return h + '<div class="grid">' + S.gal.map(function (g) {
      var t = 'Здравствуйте! Хочу так же' + (g.caption ? ': ' + g.caption : '') + '. Фото: ' + (CFG.site || location.origin + location.pathname) + '#g=' + g.id;
      return '<div class="card' + (S.hl === g.id ? ' hl' : '') + '" data-gal="' + esc(g.id) + '"><div class="ph" data-act="gzoom" data-id="' + esc(g.id) + '" data-fid="' + esc(g.photo.t) + '"></div><div class="cb">' + (g.caption ? '<h3>' + esc(g.caption) + '</h3>' : '') +
        '<a class="btn wa" href="' + esc(waLink(t)) + '" target="_blank" rel="noopener">💬 Хочу так же — узнать цену в WhatsApp</a></div></div>';
    }).join('') + '</div>';
  }
  function viewInstall() {
    var standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone;
    var ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var h = backBtn() + '<h2>📲 Установить приложение</h2>';
    if (standalone) return h + '<div class="ok">✅ Приложение уже установлено и открыто без строки браузера.</div>';
    if (ios) h += '<div class="box"><h3>iPhone / iPad</h3><ol class="steps"><li>Откройте этот сайт в <b>Safari</b>.</li><li>Нажмите кнопку <b>«Поделиться» ⬆️</b> внизу экрана.</li><li>Выберите <b>«На экран “Домой”»</b> ➡️ <b>«Добавить»</b>.</li></ol><p class="muted">Значок «Миллион шаров» появится на экране телефона, сайт откроется как приложение — без строки браузера.</p></div>';
    else {
      h += '<div class="box"><h3>Android</h3>';
      if (DEFERRED) h += '<button class="btn pri" data-act="install">📲 Установить приложение</button>';
      else h += '<ol class="steps"><li>Откройте сайт в <b>Chrome</b>.</li><li>Нажмите меню <b>⋮</b> справа вверху.</li><li>Выберите <b>«Установить приложение»</b> (или «Добавить на главный экран»).</li></ol>';
      if (CFG.apk) h += '<a class="btn bk" href="' + esc(CFG.apk) + '" download>⬇️ Скачать APK-файл (Android)</a>';
      h += '</div><div class="box"><h3>iPhone</h3><p class="muted">В Safari: «Поделиться» ⬆️ ➡️ «На экран “Домой”».</p></div>';
    }
    return h;
  }
  function viewSub() {
    switch (S.sub) {
      case 'gallery': return viewGallery();
      case 'delivery': return backBtn() + '<h2>🚚 Доставка и оплата</h2><div class="box pre">' + esc(setting('delivery')) + '</div><a class="btn wa" href="' + esc(waLink('Здравствуйте! Хочу уточнить условия доставки.')) + '" target="_blank" rel="noopener">🟢 Спросить в WhatsApp</a>';
      case 'faq': return backBtn() + '<h2>❓ Частые вопросы</h2><div class="box pre tail">' + esc(setting('faq')) + '</div>';
      case 'care': return backBtn() + '<h2>💡 Памятка по уходу за шарами</h2><div class="box pre tail">' + esc(setting('care')) + '</div>';
      case 'projects': return backBtn() + '<h2>🌐 Другие проекты ГИНЦ ЗКО</h2>' + PROJECTS.map(function (p) { return '<a class="box proj" href="' + esc(p.url) + '" target="_blank" rel="noopener"><b>' + p.icon + '</b><span><strong>' + esc(p.title) + '</strong><br>' + esc(p.text) + '</span><i>↗</i></a>'; }).join('');
      case 'install': return viewInstall();
      case 'stats': return backBtn() + viewStats();
      case 'whatsnew': return backBtn() + whatsNewHTML();
      case 'reviews': return backBtn() + viewReviews();
    }
    return viewMore();
  }
  var NEWS = ['🎟 Промокоды: введите код в корзине — скидка посчитается сама.',
    '🎈 Высокие фото-плитки категорий и подкатегорий — каталог стал нагляднее.',
    '🎞 Режим «по одному набору на весь экран»: листайте вверх-вниз, ракурсы — влево-вправо.',
    '🔍 Фото увеличивается щипком до 300%, можно двигать пальцем и дважды касаться.',
    '🔎 Умный поиск: по названию, составу, категории и сумме (введите «5000»).',
    '🏆 ТОП-5 популярных наборов и быстрые фильтры по бюджету.',
    '🎁 Режим «Это подарок», добавки к заказу и быстрый прайс штучных шаров.',
    '▲ Шапку можно свернуть, чтобы увидеть больше товаров.',
    '🔄 Кнопка «Обновить приложение и каталог» в разделе «Ещё».'];
  function whatsNewHTML() {
    return '<h2>✨ Что нового в ' + VER + '</h2><div class="box"><ul class="news">' + NEWS.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>';
  }
  function showNews() {
    var el = document.createElement('div'); el.className = 'lb news-lb';
    el.innerHTML = '<div class="nbox"><h2>✨ Что нового в ' + VER + '</h2><ul class="news">' + NEWS.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul><button class="btn pri" data-act="newsok">Понятно, спасибо!</button></div>';
    document.body.appendChild(el);
  }
  function viewStats() {
    var st = S.st || (S.st = { per: 'today', data: null, err: '', pw: '' }), h = '<h2>📊 Статистика магазина</h2>';
    if (!st.data) {
      return h + '<div class="box"><p class="muted">Живые цифры из таблицы магазина. Для просмотра нужен пароль владельца.</p>' + (st.err ? '<div class="err">' + esc(st.err) + '</div>' : '') +
        '<label>Пароль</label><input id="st_pw" type="password" autocomplete="current-password" value="' + esc(st.pw) + '"><button class="btn pri" data-act="stload" style="width:100%">📊 Показать статистику</button></div>';
    }
    var d = st.data.periods[st.per], names = st.data.names;
    h += '<div class="chips">' + Object.keys(names).map(function (k) { return '<button class="chip' + (st.per === k ? ' on' : '') + '" data-act="stper" data-id="' + k + '">' + esc(names[k]) + '</button>'; }).join('') + '</div>';
    h += '<div class="box stg"><div><b>' + d.visitors + '</b>👥 посетителей</div><div><b>' + d.views + '</b>👁 просмотров</div><div><b>' + d.wa + '</b>🟢 клики WhatsApp</div><div><b>' + d.orders + '</b>🧾 заказов</div></div>';
    h += '<div class="box"><b>Сумма заказов: ' + money(d.sum) + ' ₸</b><br><span class="muted">❤️ В избранное добавлено: ' + d.favs + '</span></div>';
    h += '<div class="box"><h3>🏆 ТОП-5 наборов</h3>' + (d.top.length ? d.top.map(function (t, i) { return '<div class="ci"><div class="t"><b>' + (i + 1) + '. ' + esc(t.title) + '</b>' + t.score + ' б. · кликов: ' + t.clicks + '</div></div>'; }).join('') : '<span class="muted">Пока нет данных.</span>') + '</div>';
    return h + '<button class="btn" data-act="stload">🔄 Обновить цифры</button><button class="btn" data-act="stexit">🔒 Закрыть статистику</button>';
  }
  function loadStats() {
    var st = S.st, pw = ($('#st_pw') && $('#st_pw').value) || st.pw; st.pw = pw;
    if (!pw) { st.err = 'Введите пароль.'; return render(); }
    api('stats', { master: pw }).then(function (r) { st.data = r; st.err = ''; render(); }, function (e) { st.err = errText(e); st.data = null; render(); });
  }
  function refreshApp() {
    var go = function () { try { ['shop', 'gallery', 'cfg'].forEach(function (k) { localStorage.removeItem('shar:' + k); }); } catch (e) {} location.reload(); };
    var jobs = [];
    if (window.caches && caches.keys) jobs.push(caches.keys().then(function (ks) { return Promise.all(ks.map(function (k) { return caches.delete(k); })); }));
    if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) jobs.push(navigator.serviceWorker.getRegistrations().then(function (rs) { return Promise.all(rs.map(function (r) { return r.unregister(); })); }));
    Promise.all(jobs).then(go, go);
  }
  function viewReviews() {
    var r = S.rev, h = '<h2>💬 Отзывы покупателей</h2>';
    if (S.revErr) h += '<div class="err">' + esc(S.revErr) + '</div>';
    if (r) {
      h += '<div class="box"><b style="font-size:20px">' + (r.count ? '⭐ ' + r.avg + ' · ' + r.count + ' отзыв(ов)' : 'Пока нет отзывов — будьте первым!') + '</b>';
      r.reviews.forEach(function (x) { h += '<div class="rv"><b>' + esc(x.name) + '</b> · <span style="color:var(--gold)">' + '★'.repeat(x.rating) + '</span> <small style="color:var(--mut)">' + esc(x.date) + '</small><div class="pre">' + esc(x.text) + '</div>' + (x.hasPhoto ? '<div data-rphoto="' + esc(x.id) + '"><button class="btn" data-act="rphoto" data-id="' + esc(x.id) + '">📷 Показать фото</button></div>' : '') + '</div>'; });
      h += '</div>';
    } else if (!S.revErr) h += '<div class="empty">Загружаем отзывы…</div>';
    var rt = S.form.rating || 0;
    h += '<div class="box"><h3>Оставить отзыв</h3><div class="stars">' + [1, 2, 3, 4, 5].map(function (i) { return '<button data-act="star" data-id="' + i + '" class="' + (i <= rt ? 'on' : '') + '">★</button>'; }).join('') + '</div>' +
      '<label>Ваше имя</label><input id="r_name" value="' + esc(S.form.rname || '') + '"><label>Телефон (на сайте не показывается — его видит только хозяйка при проверке)</label><input id="r_phone" type="tel" placeholder="+7 777 123 45 67" value="' + esc(S.form.rphone || '') + '"><label>Отзыв</label><textarea id="r_text">' + esc(S.form.rtext || '') + '</textarea>' +
      '<label>Фото (по желанию)</label><input id="r_photo" type="file" accept="image/*"><div id="rmsg"></div><button class="btn pri" style="width:100%;margin-top:10px" data-act="sendrev">⭐ Отправить отзыв</button><p class="muted">Отзыв появится на сайте после проверки.</p></div>';
    return h;
  }
  function navHTML() {
    var nav = [['home', '🎈', 'Каталог'], ['fav', '❤️', 'Избранное'], ['cart', '🛒', 'Корзина'], ['more', '☰', 'Ещё']];
    return nav.map(function (n) { return '<button data-act="tab" data-id="' + n[0] + '" class="' + (S.tab === n[0] ? 'on' : '') + '"><b>' + n[1] + '</b>' + n[2] + (n[0] === 'cart' && cartCount() ? '<em>' + cartCount() + '</em>' : '') + (n[0] === 'fav' && S.favs.length ? '<em>' + S.favs.length + '</em>' : '') + '</button>'; }).join('');
  }
  function updNav() { var n = $('.nav'); if (n) n.innerHTML = navHTML(); }
  var RIO = null;
  function reelsInit() {
    var sc = $('#rscroll'); if (!sc) return;
    if (RIO) RIO.disconnect();
    RIO = ('IntersectionObserver' in window) ? new IntersectionObserver(function (en) {
      en.forEach(function (x) {
        if (!x.isIntersecting) return; var el = x.target; seen(el.getAttribute('data-slide'));
        el.querySelectorAll('.rs[data-full]').forEach(function (r) { if (r.getAttribute('data-up')) return; r.setAttribute('data-up', '1'); loadPhoto(r.getAttribute('data-full')).then(function (d) { var im = r.querySelector('img'); if (im) im.src = d; }, function () {}); });
      });
    }, { root: sc, threshold: 0.6 }) : null;
    sc.querySelectorAll('.slide').forEach(function (el) { if (RIO) RIO.observe(el); });
  }
  function render() {
    var reels = reelsOn(), v = '';
    document.body.classList.toggle('noscroll', reels);
    if (reels) { $('#app').innerHTML = reelsHTML() + '<nav class="nav">' + navHTML() + '</nav>'; hydrate(); reelsInit(); return; }
    v = S.tab === 'fav' ? viewFav() : S.tab === 'cart' ? viewCart() : S.tab === 'more' ? viewSub() : viewHome();
    $('#app').innerHTML = header() + '<main>' + v + '</main><nav class="nav">' + navHTML() + '</nav>';
    hydrate();
    var qi = $('#q');
    if (qi) qi.addEventListener('input', function () {
      S.q = qi.value; var has = !!S.q.trim(); $('#tilesbox').classList.toggle('hid', has); $('#qclr').classList.toggle('hid', !S.q); $('#sres').innerHTML = has ? resultsHTML() : ''; hydrate();
    });
  }
  function tab(t) {
    S.tab = t; S.sub = t === 'more' ? S.sub : ''; if (t !== 'cart') S.done = null; render(); window.scrollTo(0, 0);
  }
  function openSub(sub) {
    S.tab = 'more'; S.sub = sub; render(); window.scrollTo(0, 0);
    if (sub === 'reviews' && !S.rev) api('reviews').then(function (r) { S.rev = r; S.revErr = ''; if (S.sub === 'reviews') render(); }, function (e) { S.revErr = errText(e); if (S.sub === 'reviews') render(); });
    if (sub === 'gallery') loadGallery();
  }
  function loadGallery() {
    var c = ls('gallery'); if (c && !S.gal) { S.gal = c; }
    api('gallery').then(function (r) { S.gal = r.items; S.galErr = ''; ls('gallery', r.items); }, function (e) { if (!S.gal) S.galErr = errText(e); }).then(function () {
      if (S.sub === 'gallery') { render(); if (S.hl) { var el = document.querySelector('[data-gal="' + S.hl + '"]'); if (el) el.scrollIntoView({ block: 'center' }); } }
    });
  }
  /* ---------- форма корзины ---------- */
  function readForm() {
    var g = function (id) { var e = $('#' + id); return e ? e.value : undefined; }, f = S.form;
    ['name', 'phone', 'address', 'date', 'time', 'wish'].forEach(function (k) { var v = g('f_' + k); if (v !== undefined) f[k] = v; });
    var pt = g('f_promo'); if (pt !== undefined) S.promoText = pt;
    f.gift = f.gift || {}; var gn = g('g_name'), gp = g('g_phone'); if (gn !== undefined) f.gift.name = gn; if (gp !== undefined) f.gift.phone = gp; if ($('#g_photo')) f.gift.photo = $('#g_photo').checked;
    ['name', 'phone', 'text'].forEach(function (k) { var v = g('r_' + k); if (v !== undefined) f['r' + k] = v; });
    saveDraft();
  }
  function itemsPayload() { return cartLines().map(function (x) { var a = S.addons[x.p.id] || {}; return { id: x.p.id, qty: x.q, addons: { digit: a.digit ? (a.digitVal || '*') : '', text: a.text ? (a.textVal || '*') : '', card: a.card ? 1 : 0, bag: a.bag ? 1 : 0 } }; }); }
  function singlesPayload() { return singleLines().filter(function (x) { return x.q > 0; }).map(function (x) { return { id: x.s.id, qty: x.q }; }); }
  function cartMsg() {
    var f = S.form, g = f.gift || {}, t = 'Здравствуйте! Хочу сделать заказ:\n';
    cartLines().forEach(function (x) {
      t += '• ' + x.p.title + ' × ' + x.q + (x.p.price > 0 ? ' = ' + money(x.p.price * x.q) + ' ₸' : ' (цена по запросу)') + '\n';
      adList(x.p.id).forEach(function (l) { t += '   + ' + l + '\n'; });
    });
    singleLines().forEach(function (x) { if (x.q > 0) t += '🎈 ' + x.s.title + ' × ' + x.q + ' = ' + money(x.s.price * x.q) + ' ₸\n'; });
    var tot = cartTotal();
    var dsc = cartDisc(); if (dsc) t += '\n🎟 Промокод ' + S.promo.code + ': −' + money(dsc) + ' ₸';
    t += '\nИтого: ' + (tot > 0 ? money(tot - dsc) + ' ₸' : 'по запросу') + '\n' + (f.kind === 'delivery' ? '🚚 Доставка: ' + (f.address || '') + (f.date ? '\n📅 ' + f.date + (f.time ? ' ' + f.time : '') : '') : '🏪 Самовывоз');
    t += '\n👤 ' + (f.name || '') + ', 📞 ' + (f.phone || '');
    if (g.on) t += '\n🎁 Подарок для: ' + (g.name || '') + ', ' + (g.phone || '') + (g.photo ? '\n📸 Прошу прислать фотоотчёт вручения' : '');
    if (f.wish) t += '\n💬 ' + f.wish;
    return t;
  }
  function checkForm() {
    var f = S.form, g = f.gift || {}, m = '';
    if (!cartLines().length && !singlesPayload().length) m = ERR.empty_cart;
    else if ((f.name || '').trim().length < 2) m = ERR.bad_name;
    else if (!normPhone(f.phone)) m = ERR.bad_phone;
    else if (f.kind === 'delivery' && (f.address || '').trim().length < 5) m = ERR.need_address;
    else if (g.on && (g.name || '').trim().length < 2) m = ERR.bad_gift_name;
    else if (g.on && !normPhone(g.phone)) m = ERR.bad_gift_phone;
    var e = $('#cerr'); if (e) e.innerHTML = m ? '<div class="err">' + esc(m) + '</div>' : '';
    return !m;
  }
  function sendSite(btn) {
    var f = S.form, g = f.gift || {}; btn.disabled = true; btn.textContent = 'Отправляем…';
    api('order', { name: f.name, phone: f.phone, kind: f.kind, address: f.address || '', date: f.date || '', time: f.time || '', wish: f.wish || '', items: itemsPayload(), singles: singlesPayload(), promo: S.promo ? S.promo.code : '', gift: { on: !!g.on, name: g.name || '', phone: g.phone || '', photo: !!g.photo } }).then(function (r) {
      S.done = { id: r.id, total: r.total }; S.promo = null; S.promoText = ''; S.cart = {}; S.singles = {}; S.addons = {}; S.form = { kind: f.kind, name: f.name, phone: f.phone, address: f.address, gift: {} }; save(); saveDraft(); render();
    }, function (e) {
      btn.disabled = false; btn.textContent = '📨 Отправить заказ через сайт';
      var c = $('#cerr'); if (c) c.innerHTML = '<div class="err">' + esc(errText(e)) + ' Можно отправить заказ в WhatsApp — кнопка выше.</div>';
    });
  }
  /* ---------- отзыв: сжатие фото ---------- */
  function shrink(file) {
    return new Promise(function (res, rej) {
      var fr = new FileReader();
      fr.onerror = function () { rej({ code: 'bad_photo' }); };
      fr.onload = function () {
        var im = new Image();
        im.onerror = function () { rej({ code: 'bad_photo' }); };
        im.onload = function () {
          var side = 720, q = 0.7, out = '';
          for (var i = 0; i < 8; i++) {
            var k = Math.min(1, side / Math.max(im.width, im.height)), c = document.createElement('canvas');
            c.width = Math.max(1, Math.round(im.width * k)); c.height = Math.max(1, Math.round(im.height * k));
            c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
            out = c.toDataURL('image/jpeg', q);
            if (out.length <= 44000) return res(out);
            side = Math.round(side * 0.8); q = Math.max(0.4, q - 0.05);
          }
          rej({ code: 'photo_big' });
        };
        im.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }
  function sendReview(btn) {
    readForm();
    var f = S.form, msg = $('#rmsg'), fail = function (m) { msg.innerHTML = '<div class="err">' + esc(m) + '</div>'; btn.disabled = false; };
    if ((f.rname || '').trim().length < 2) return fail(ERR.bad_name);
    if (!normPhone(f.rphone)) return fail(ERR.bad_phone);
    if (!(f.rating >= 1)) return fail(ERR.bad_rating);
    if ((f.rtext || '').trim().length < 3) return fail(ERR.bad_text);
    btn.disabled = true;
    var file = $('#r_photo') && $('#r_photo').files[0];
    (file ? shrink(file) : Promise.resolve('')).then(function (photo) {
      return api('reviewSave', { name: f.rname, phone: f.rphone, rating: f.rating, text: f.rtext, photo: photo });
    }).then(function () {
      S.form.rtext = ''; S.form.rating = 0; saveDraft(); render();
      $('#rmsg').innerHTML = '<div class="ok">✅ Спасибо! Отзыв отправлен и появится после проверки.</div>';
    }, function (e) { fail(errText(e)); });
  }
  /* ---------- просмотр фото на весь экран ---------- */
  function zoom(p, start) {
    if (!p || !p.photos.length) return;
    var i = start || 0, el = document.createElement('div'), sc = 1, tx = 0, ty = 0, im = null;
    el.className = 'lb';
    el.innerHTML = '<button class="x" aria-label="Закрыть">✕</button>' + (p.photos.length > 1 ? '<button class="p">‹</button><button class="n">›</button>' : '') + '<div class="c"></div>';
    document.body.appendChild(el);
    function apply() { if (im) im.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + sc + ')'; }
    function clamp() { sc = Math.max(1, Math.min(3, sc)); if (!im) return; var mx = (sc - 1) * im.clientWidth / 2, my = (sc - 1) * im.clientHeight / 2; tx = Math.max(-mx, Math.min(mx, tx)); ty = Math.max(-my, Math.min(my, ty)); if (sc === 1) { tx = 0; ty = 0; } }
    function show() {
      if (im) im.remove(); sc = 1; tx = 0; ty = 0;
      el.querySelector('.c').textContent = (i + 1) + ' / ' + p.photos.length + (p.title ? ' · ' + p.title : '') + ' · щипок — до 300%';
      var ph = p.photos[i], id = ph.f || ph.t, cur = PH[ph.t] || PH[id];
      im = document.createElement('img'); im.alt = ''; im.draggable = false; if (cur) im.src = cur; el.insertBefore(im, el.firstChild);
      var mine = im; loadPhoto(id).then(function (d) { if (el.parentNode && im === mine) im.src = d; }, function () {});
    }
    function go(d) { i = (i + d + p.photos.length) % p.photos.length; show(); }
    var d0 = 0, s0 = 1, lx = 0, ly = 0, sx = 0, sy = 0, moved = false, lastTap = 0;
    function dist(a, b) { return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); }
    el.addEventListener('touchstart', function (e) {
      if (e.target.tagName === 'BUTTON') return; moved = false;
      if (e.touches.length === 2) { d0 = dist(e.touches[0], e.touches[1]); s0 = sc; }
      else { lx = sx = e.touches[0].clientX; ly = sy = e.touches[0].clientY; }
    }, { passive: true });
    el.addEventListener('touchmove', function (e) {
      if (e.target.tagName === 'BUTTON') return; e.preventDefault(); moved = true;
      if (e.touches.length === 2 && d0) { sc = s0 * dist(e.touches[0], e.touches[1]) / d0; clamp(); apply(); }
      else if (e.touches.length === 1 && sc > 1) { tx += e.touches[0].clientX - lx; ty += e.touches[0].clientY - ly; lx = e.touches[0].clientX; ly = e.touches[0].clientY; clamp(); apply(); }
    }, { passive: false });
    el.addEventListener('touchend', function (e) {
      if (e.touches.length) return; d0 = 0;
      var c = e.changedTouches[0], dx = c.clientX - sx, dy = c.clientY - sy;
      if (sc === 1 && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) && p.photos.length > 1) return go(dx < 0 ? 1 : -1);
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8 && e.target.tagName === 'IMG') {   // двойное касание: 100% ↔ 250%
        var now = Date.now(); if (now - lastTap < 320) { sc = sc > 1 ? 1 : 2.5; clamp(); apply(); lastTap = 0; } else lastTap = now;
      }
    });
    el.addEventListener('wheel', function (e) { e.preventDefault(); sc *= Math.exp(-e.deltaY * 0.002); clamp(); apply(); }, { passive: false });
    el.addEventListener('click', function (e) {
      if (e.target.classList.contains('p')) go(-1); else if (e.target.classList.contains('n')) go(1);
      else if (e.target.classList.contains('x') || e.target === el) el.remove();
    });
    show();
  }
  /* счётчик «1 / 3» при горизонтальном свайпе ракурсов */
  document.addEventListener('scroll', function (e) {
    var t = e.target; if (!t || !t.classList || !t.classList.contains('rtrack')) return;
    var n = t.children.length, i = Math.round(t.scrollLeft / Math.max(1, t.clientWidth)), c = t.parentNode.querySelector('.rcnt'); if (c) c.textContent = (Math.min(n - 1, i) + 1) + ' / ' + n;
  }, true);
  /* ---------- события ---------- */
  function refreshAd(id) {
    var boxes = document.querySelectorAll('[data-adbox="' + id + '"]'), p = prod(id);
    boxes.forEach(function (b) { b.innerHTML = adHTML(id); });
    var a = document.querySelector('[data-card="' + id + '"] a[data-act=wa]'); if (a && p) a.setAttribute('href', waProduct(p));
  }
  document.addEventListener('change', function (e) {
    var t = e.target, k = t.getAttribute && t.getAttribute('data-ad');
    if (k) { var id = t.getAttribute('data-id'), a = ad(id); a[k] = t.checked; save(); refreshAd(id); if (S.tab === 'cart') render(); return; }
    if (t.getAttribute && t.getAttribute('data-act') === 'gift') { readForm(); S.form.gift.on = t.checked; saveDraft(); render(); }
    if (t.id === 'g_photo') readForm();
  });
  document.addEventListener('input', function (e) {
    var t = e.target, k = t.getAttribute && t.getAttribute('data-adv');
    if (k) { var id = t.getAttribute('data-id'); ad(id)[k] = t.value; save(); var p = prod(id), a = document.querySelector('[data-card="' + id + '"] a[data-act=wa]'); if (a && p) a.setAttribute('href', waProduct(p)); return; }
    if (/^(f_|g_|r_)/.test(t.id || '')) readForm();
  });
  document.addEventListener('toggle', function (e) { var d = e.target; if (d && d.open && d.getAttribute && d.getAttribute('data-seen')) seen(d.getAttribute('data-seen')); }, true);
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); DEFERRED = e; });
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-act]'); if (!t) return;
    var act = t.getAttribute('data-act'), id = t.getAttribute('data-id');
    if (act === 'gift') return;
    if (S.tab === 'cart' || S.sub === 'reviews') readForm();
    switch (act) {
      case 'tab': return tab(id);
      case 'home': S.done = null; return tab('home');
      case 'more': S.sub = ''; return render();
      case 'sub': return openSub(id);
      case 'refreshapp': t.textContent = 'Обновляем…'; return refreshApp();
      case 'stload': return loadStats();
      case 'stper': S.st.per = id; return render();
      case 'stexit': S.st = null; return render();
      case 'newsok': var nb = t.closest('.news-lb'); if (nb) nb.remove(); return;
      case 'upd': if (S.waiting) { S.waiting.postMessage('SKIP_WAITING'); t.textContent = 'Обновляем…'; } else location.reload(); return;
      case 'retry': return loadShop().then(render);
      case 'theme': var d = document.documentElement, dark = d.getAttribute('data-theme') === 'dark' || (!d.getAttribute('data-theme') && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches); d.setAttribute('data-theme', dark ? 'light' : 'dark'); ls('theme', dark ? 'light' : 'dark'); return;
      case 'cat': S.cat = id; S.sub2 = ''; S.q = ''; render(); return window.scrollTo(0, 0);
      case 'subcat': S.sub2 = id; render(); return window.scrollTo(0, 0);
      case 'back': if (S.sub2) S.sub2 = ''; else S.cat = ''; render(); return window.scrollTo(0, 0);
      case 'mode': S.view = S.view === 'reels' ? 'list' : 'reels'; ls('view', S.view); render(); return window.scrollTo(0, 0);
      case 'hdr': S.hdr = !S.hdr; ls('hdr', S.hdr ? 1 : 0); return render();
      case 'clearq': S.q = ''; return render();
      case 'comp': var sl = t.closest('.slide'); if (sl) sl.classList.toggle('open'); return;
      case 'color': S.color = S.color === id ? '' : id; return render();
      case 'budget': S.budget = id; return render();
      case 'top': var tp = prod(id), tc = tp && catOf(tp); S.q = ''; S.color = ''; S.budget = 'all'; S.hl = id; seen(id);
        if (tc) { S.cat = tc.parent || tc.id; S.sub2 = tc.parent ? tc.id : ''; } else { S.cat = ''; S.q = tp ? tp.title : ''; }
        render(); var sc2 = $('#rscroll'), sl2 = sc2 && sc2.querySelector('[data-slide="' + id + '"]'); if (sl2) sc2.scrollTop = sl2.offsetTop; else { var c = document.querySelector('[data-card="' + id + '"]'); if (c) c.scrollIntoView({ block: 'center' }); }
        setTimeout(function () { S.hl = ''; var cc = document.querySelector('[data-card="' + id + '"]'); if (cc) cc.classList.remove('hl'); }, 2500); return;
      case 'wa': track('wa', id); return;
      case 'add': S.cart[id] = Math.min(99, (S.cart[id] || 0) + 1); save(); updNav(); var ot = t.textContent; t.textContent = '✅ Добавлено'; setTimeout(function () { t.textContent = ot; }, 1000); return;
      case 'fav': var k = S.favs.indexOf(id); if (k >= 0) S.favs.splice(k, 1); else { S.favs.push(id); track('fav', id); } save(); updNav();
        if (S.tab === 'fav') return render();
        document.querySelectorAll('[data-act=fav][data-id="' + id + '"]').forEach(function (b) { var on = S.favs.indexOf(id) >= 0; b.classList.toggle('on', on); b.textContent = b.classList.contains('rb') ? (on ? '❤️' : '🤍') : (on ? '❤️ В избранном' : '🤍 В избранное'); }); return;
      case 'zoom': seen(id); return zoom(prod(id), +t.getAttribute('data-i') || 0);
      case 'gzoom': var gi = (S.gal || []).filter(function (x) { return x.id === id; })[0]; return gi && zoom({ photos: [gi.photo], title: gi.caption });
      case 'inc': S.cart[id] = Math.min(99, (S.cart[id] || 0) + 1); save(); return render();
      case 'dec': if ((S.cart[id] || 0) > 1) S.cart[id]--; else delete S.cart[id]; save(); return render();
      case 'del': delete S.cart[id]; save(); return render();
      case 'sinc': S.singles[id] = Math.min(500, (S.singles[id] || 0) + 1); save(); return render();
      case 'sdec': if ((S.singles[id] || 0) > 1) S.singles[id]--; else delete S.singles[id]; save(); return render();
      case 'promo':
        var pc = (S.promoText || '').trim(), pe = $('#perr');
        if (!pc) { if (pe) pe.innerHTML = '<div class="err">' + esc(ERR.promo_empty) + '</div>'; return; }
        t.disabled = true; t.textContent = 'Проверяем…';
        return api('promo', { code: pc }).then(function (r) { S.promo = { code: r.code, mode: r.mode, value: +r.value || 0 }; S.promoText = ''; render(); }, function (e) { t.disabled = false; t.textContent = 'Применить'; var pe2 = $('#perr'); if (pe2) pe2.innerHTML = '<div class="err">' + esc(errText(e)) + '</div>'; });
      case 'promox': S.promo = null; return render();
      case 'kind': S.form.kind = id; saveDraft(); return render();
      case 'sendwa': if (!checkForm()) return; cartLines().forEach(function (x) { track('wa', x.p.id); }); window.open(waLink(cartMsg()), '_blank'); return;
      case 'sendsite': if (!checkForm()) return; return sendSite(t);
      case 'star': S.form.rating = +id; return render();
      case 'sendrev': return sendReview(t);
      case 'install': if (DEFERRED) { DEFERRED.prompt(); DEFERRED = null; } return;
      case 'rphoto': t.disabled = true; t.textContent = 'Загружаем…'; return api('reviewPhoto', { id: id }).then(function (r) { var h = document.querySelector('[data-rphoto="' + id + '"]'); if (h) h.innerHTML = '<img alt="" src="' + r.data + '">'; }, function (er) { t.disabled = false; t.textContent = '📷 Показать фото'; alert(errText(er)); });
    }
  });
  /* ---------- запуск: сначала кэш (мгновенно), потом свежие данные ---------- */
  function applyConfig(c) {
    if (!c) return;
    CFG.gateway = c['адресШлюза'] || CFG.gateway; CFG.booking = c['ссылкаЗаписи'] || CFG.booking; CFG.site = c['адресСайта'] || CFG.site; CFG.wa = normPhone(c['ватсапАдмина']) || CFG.wa; CFG.apk = c['apkUrl'] || CFG.apk;
  }
  function showUpd(w) {
    S.waiting = w; if ($('.upd')) return;
    var b = document.createElement('button'); b.className = 'upd'; b.setAttribute('data-act', 'upd'); b.textContent = '🆕 Доступно обновление — Нажмите, чтобы обновить'; document.body.appendChild(b);
  }
  function watchSW() {
    if (!('serviceWorker' in navigator) || location.protocol.indexOf('http') !== 0) return;
    var reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', function () { if (reloaded || !S.waiting) return; reloaded = true; location.reload(); });
    navigator.serviceWorker.register('sw.js').then(function (reg) {
      if (reg.waiting && navigator.serviceWorker.controller) showUpd(reg.waiting);
      reg.addEventListener('updatefound', function () {
        var w = reg.installing; if (!w) return;
        w.addEventListener('statechange', function () { if (w.state === 'installed' && navigator.serviceWorker.controller) showUpd(w); });
      });
      var chk = function () { try { reg.update().catch(function () {}); } catch (e) {} };
      setInterval(chk, 30 * 60 * 1000);
      document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') chk(); });
    }).catch(function () {});
  }
  function boot() {
    var th = ls('theme'); if (th) document.documentElement.setAttribute('data-theme', th);
    S.view = ls('view') === 'list' ? 'list' : 'reels'; S.hdr = ls('hdr') === 1;
    S.favs = ls('favs') || []; S.cart = ls('cart') || {}; S.addons = ls('addons') || {}; S.singles = ls('singles') || {};
    var dr = ls('draft'); if (dr) { S.form = Object.assign({ kind: 'pickup' }, dr); S.form.gift = S.form.gift || {}; }
    applyConfig(ls('cfg'));
    var cached = ls('shop'); if (cached) S.shop = cached;
    if (/^#g=/.test(location.hash)) { S.hl = location.hash.slice(3); S.tab = 'more'; S.sub = 'gallery'; }
    if (S.shop || S.hl) render(); else $('#app').innerHTML = '<div class="boot">🎈 Загружаем витрину…</div>';
    if (S.sub === 'gallery') { var cg = ls('gallery'); if (cg) S.gal = cg; }
    fetch('config.json', { cache: 'no-store' }).then(function (r) { return r.json(); }).catch(function () { return null; }).then(function (c) {
      if (c) { applyConfig(c); ls('cfg', c); }
      var day = localDay(); if (ls('visit') !== day && CFG.gateway) { ls('visit', day); track('visit'); }
      return loadShop();
    }).then(function () {
      S.favs = S.favs.filter(prod); if (S.shop) { for (var k in S.cart) if (!prod(k)) delete S.cart[k]; }
      var ae = document.activeElement; if (!(ae && /INPUT|TEXTAREA/.test(ae.tagName))) render();
      if (S.sub === 'gallery') loadGallery();
      watchSW();
      var seenV = ls('seenVer'); if (seenV !== VER) { ls('seenVer', VER); if (seenV) showNews(); }
    });
  }
  boot();
})();
