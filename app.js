/* Миллион шаров • Уральск — витрина-конструктор v1.0.0.
   Всё содержимое (название, плитки, тексты, контакты) приходит из Google Таблицы через шлюз — правка кода не нужна. */
(function () {
  'use strict';
  var CFG = { gateway: '', booking: '', wa: '77774784418', site: '' };
  var S = { shop: null, tab: 'home', cat: '', q: '', color: '', favs: [], cart: {}, err: '', rev: null, revErr: '', form: { kind: 'pickup' }, done: null };
  var PH = {}, PHP = {}, QUEUE = [], BUSY = 0;
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
  var ERR = {
    no_gateway: 'Витрина ещё не подключена к таблице: владельцу нужно нажать «ВСЁ В ОДНОМ» в пульте.',
    network: 'Нет связи с интернетом или сервером. Проверьте соединение и попробуйте ещё раз.',
    bad_reply: 'Сервер ответил не так, как ожидалось. Владельцу нужно проверить развёртывание скрипта (доступ «Все») и нажать «ВСЁ В ОДНОМ» в пульте.',
    sheet_error: 'Не удаётся открыть Google Таблицу магазина. Владельцу нужно проверить ссылку на таблицу и доступ к ней (пульт → «ВСЁ В ОДНОМ»).',
    server_error: 'Сервер временно не справился. Попробуйте через минуту или закажите в WhatsApp.',
    busy: 'Сейчас много запросов. Подождите минуту.', too_many: 'Слишком много обращений подряд. Подождите немного или напишите в WhatsApp.',
    bad_name: 'Укажите имя (не короче 2 букв).', bad_phone: 'Телефон указан неверно. Нужен номер вида +7 777 123 45 67.',
    need_address: 'Для доставки укажите адрес.', bad_date: 'Дата указана неверно.', bad_item: 'Одного из товаров уже нет в продаже. Обновите страницу и соберите корзину заново.',
    empty_cart: 'Корзина пуста.', bad_text: 'Напишите текст отзыва (не короче 3 знаков).', bad_rating: 'Поставьте оценку от 1 до 5 звёзд.',
    bad_photo: 'Фото не подошло (нужен JPEG, PNG или WebP).', photo_big: 'Фото слишком большое, выберите другое.', no_photo: 'Фото не найдено.', photo_unavailable: 'Фото сейчас недоступно.'
  };
  function errText(e) { return ERR[e && e.code] || 'Что-то пошло не так. Попробуйте ещё раз или напишите в WhatsApp.'; }
  function api(action, data) {
    if (!CFG.gateway) return Promise.reject({ code: 'no_gateway' });
    return fetch(CFG.gateway, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(Object.assign({ action: action }, data || {})) })
      .then(function (r) { return r.text(); }, function () { throw { code: 'network' }; })
      .then(function (t) { var j; try { j = JSON.parse(t); } catch (e) { throw { code: 'bad_reply' }; } if (!j || !j.ok) throw { code: (j && j.error) || 'server_error' }; return j; });
  }
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
  function cartCount() { var n = 0; for (var k in S.cart) n += S.cart[k]; return n; }
  function save() { ls('favs', S.favs); ls('cart', S.cart); }
  function loadShop() {
    return api('shop').then(function (r) { S.shop = r; S.err = ''; ls('shop', r); }, function (e) {
      var c = ls('shop'); if (c) { S.shop = c; S.err = 'Показана сохранённая версия витрины: ' + errText(e); } else { S.shop = null; S.err = errText(e); }
    });
  }
  function filtered() {
    var q = S.q.trim().toLowerCase();
    return ((S.shop && S.shop.products) || []).filter(function (p) {
      if (S.cat && p.category !== S.cat) return false;
      if (S.color && p.colors.map(function (c) { return c.toLowerCase(); }).indexOf(S.color) < 0) return false;
      if (q && (p.title + ' ' + p.description).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
  }
  /* ---------- ссылки WhatsApp ---------- */
  function waLink(text) { return 'https://wa.me/' + waNum() + '?text=' + encodeURIComponent(text); }
  function waProduct(p) { return waLink('Здравствуйте! Хочу заказать: ' + p.title + ' — ' + price(p) + (CFG.site ? '\n' + CFG.site : '')); }
  /* ---------- отрисовка ---------- */
  function header() {
    var logo = setting('logo'), lid = logo ? logo.split('|')[0] : '';
    var bu = bookUrl();
    return '<div class="hdr"><div class="hrow"><div class="logo"' + (lid ? ' data-fid="' + esc(lid) + '"' : '') + '>' + (lid ? '' : '🎈') + '</div>' +
      '<div class="hname"><h1>' + esc(setting('shop_name') || 'Миллион шаров') + '</h1><small>' + esc(setting('city') || 'г. Уральск') + '</small></div>' +
      (setting('instagram') ? '<a class="ib" href="' + esc(setting('instagram')) + '" target="_blank" rel="noopener" aria-label="Instagram" style="display:flex;align-items:center;justify-content:center;text-decoration:none">📷</a>' : '') +
      '<button class="ib" data-act="theme" aria-label="Тема">🌓</button></div>' +
      (bu ? '<a class="book" href="' + esc(bu) + '" target="_blank" rel="noopener">📅 Забронировать дату в Онлайн-записях<i>VIP Premium</i></a>' : '') + '</div>';
  }
  function card(p) {
    var c = catOf(p), ph = p.photos[0], fav = S.favs.indexOf(p.id) >= 0, bu = bookUrl();
    return '<div class="card" data-id="' + esc(p.id) + '"><div class="ph" data-act="zoom" data-id="' + esc(p.id) + '"' + (ph ? ' data-fid="' + esc(ph.t) + '"' : '') + '>' + (ph ? '' : '🎈') +
      (p.hit ? '<span class="hit">🔥 Хит продаж</span>' : '') + (p.photos.length > 1 ? '<span class="cnt">📷 ' + p.photos.length + '</span>' : '') + '</div>' +
      '<div class="cb"><h3>' + esc(p.title) + '</h3><div class="price">' + price(p) + '</div>' +
      (p.colors.length ? '<div class="dots">' + p.colors.map(function (x) { return '<span>' + esc(x) + '</span>'; }).join('') + '</div>' : '') +
      (p.description ? '<details><summary>Описание / состав</summary><p>' + esc(p.description) + '</p></details>' : '') +
      '<a class="btn wa" href="' + esc(waProduct(p)) + '" target="_blank" rel="noopener">🟢 ЗАКАЗАТЬ В WHATSAPP</a>' +
      '<div class="row"><button class="btn pri" data-act="add" data-id="' + esc(p.id) + '">🛒 В корзину</button><button class="btn fav' + (fav ? ' on' : '') + '" data-act="fav" data-id="' + esc(p.id) + '">' + (fav ? '❤️ В избранном' : '🤍 В избранное') + '</button></div>' +
      (c && c.booking && bu ? '<a class="btn bk" href="' + esc(bu) + '" target="_blank" rel="noopener">📅 Забронировать дату в Онлайн-записях</a>' : '') + '</div></div>';
  }
  function gridHTML(list) {
    if (!list.length) return '<div class="empty">🎈 Ничего не найдено.<br>Измените поиск или фильтр — или напишите нам в WhatsApp, подберём под ваш праздник!</div>';
    return '<div class="grid">' + list.map(card).join('') + '</div>';
  }
  function viewHome() {
    var sh = S.shop, h = '';
    if (!sh) return '<div class="err">' + esc(S.err) + '</div><button class="btn pri" data-act="retry">🔄 Повторить</button>';
    h += (S.err ? '<div class="err">' + esc(S.err) + '</div>' : '');
    h += '<p class="pre" style="color:var(--mut)">' + esc(setting('greeting')) + '</p>';
    h += '<div class="search"><input id="q" type="search" placeholder="🔍 Поиск по названию" value="' + esc(S.q) + '" autocomplete="off"></div>';
    h += '<div class="tiles">' + sh.categories.map(function (c) { return '<button class="tile' + (S.cat === c.id ? ' on' : '') + '" data-act="cat" data-id="' + esc(c.id) + '"><b>' + esc(c.emoji) + '</b>' + esc(c.title) + '</button>'; }).join('') + '</div>';
    if (sh.colors && sh.colors.length) h += '<div class="chips">' + sh.colors.map(function (c) { return '<button class="chip' + (S.color === c ? ' on' : '') + '" data-act="color" data-id="' + esc(c) + '">' + esc(c) + '</button>'; }).join('') + '</div>';
    var cc = sh.categories.filter(function (c) { return c.id === S.cat; })[0];
    h += '<h2>' + (cc ? esc(cc.emoji + ' ' + cc.title) : '🎈 Все товары') + '</h2><div id="grid">' + gridHTML(filtered()) + '</div>';
    return h;
  }
  function viewFav() {
    var l = S.favs.map(prod).filter(Boolean);
    return '<h2>❤️ Избранное</h2>' + (l.length ? gridHTML(l) : '<div class="empty">Здесь будут товары, которые вы отметили ❤️</div>');
  }
  function cartLines() { return Object.keys(S.cart).map(function (id) { return { p: prod(id), q: S.cart[id] }; }).filter(function (x) { return x.p; }); }
  function viewCart() {
    var L = cartLines(), f = S.form, total = 0;
    if (S.done) return '<div class="ok"><b>✅ Заказ ' + esc(S.done.id) + ' отправлен!</b><br>Мы свяжемся с вами по телефону, чтобы подтвердить детали. Сумма: ' + (S.done.total > 0 ? money(S.done.total) + ' ₸' : 'по запросу') + '</div><button class="btn pri" data-act="home">🎈 Вернуться к витрине</button>';
    if (!L.length) return '<h2>🛒 Корзина</h2><div class="empty">Корзина пуста. Добавьте понравившееся с витрины 🎈</div>';
    var h = '<h2>🛒 Корзина</h2><div class="box">';
    L.forEach(function (x) { total += x.p.price * x.q; h += '<div class="ci"><div class="t"><b>' + esc(x.p.title) + '</b>' + esc(price(x.p)) + '</div><div class="qty"><button data-act="dec" data-id="' + esc(x.p.id) + '">−</button><b>' + x.q + '</b><button data-act="inc" data-id="' + esc(x.p.id) + '">+</button></div><button class="btn" style="flex:0 0 40px;padding:8px" data-act="del" data-id="' + esc(x.p.id) + '">✕</button></div>'; });
    h += '<p style="font-size:18px"><b>Итого: ' + (total > 0 ? money(total) + ' ₸' : 'по запросу') + '</b></p></div>';
    h += '<div class="box"><h3>Как получить заказ</h3><div class="seg"><button data-act="kind" data-id="delivery" class="' + (f.kind === 'delivery' ? 'on' : '') + '">🚚 Доставка</button><button data-act="kind" data-id="pickup" class="' + (f.kind === 'pickup' ? 'on' : '') + '">🏪 Самовывоз</button></div>';
    h += '<label>Ваше имя</label><input id="f_name" value="' + esc(f.name || '') + '" autocomplete="name"><label>Телефон</label><input id="f_phone" type="tel" placeholder="+7 777 123 45 67" value="' + esc(f.phone || '') + '" autocomplete="tel">';
    if (f.kind === 'delivery') h += '<label>Адрес доставки</label><input id="f_address" value="' + esc(f.address || '') + '"><div class="row"><div><label>Дата</label><input id="f_date" type="date" value="' + esc(f.date || '') + '"></div><div><label>Время</label><input id="f_time" type="time" value="' + esc(f.time || '') + '"></div></div>';
    h += '<label>Пожелание</label><textarea id="f_wish" placeholder="Цвета, надпись, повод…">' + esc(f.wish || '') + '</textarea>';
    h += '<div id="cerr"></div><button class="btn wa" style="width:100%;margin-top:12px" data-act="sendwa">🟢 Отправить заказ в WhatsApp</button><button class="btn pri" style="width:100%;margin-top:8px" data-act="sendsite">📨 Отправить заказ через сайт</button></div>';
    return h;
  }
  function viewDelivery() { return '<h2>🚚 Доставка и оплата</h2><div class="box pre">' + esc(setting('delivery')) + '</div><a class="btn wa" href="' + esc(waLink('Здравствуйте! Хочу уточнить условия доставки.')) + '" target="_blank" rel="noopener">🟢 Спросить в WhatsApp</a>'; }
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
      '<label>Ваше имя</label><input id="r_name" value="' + esc(S.form.rname || '') + '"><label>Отзыв</label><textarea id="r_text">' + esc(S.form.rtext || '') + '</textarea>' +
      '<label>Фото (по желанию)</label><input id="r_photo" type="file" accept="image/*"><div id="rmsg"></div><button class="btn pri" style="width:100%;margin-top:10px" data-act="sendrev">⭐ Отправить отзыв</button><p style="color:var(--mut);font-size:13px">Отзыв появится на сайте после проверки.</p></div>';
    return h;
  }
  function render() {
    var v = S.tab === 'fav' ? viewFav() : S.tab === 'cart' ? viewCart() : S.tab === 'del' ? viewDelivery() : S.tab === 'rev' ? viewReviews() : viewHome();
    var nav = [['home', '🎈', 'Витрина'], ['fav', '❤️', 'Избранное'], ['cart', '🛒', 'Корзина'], ['del', '🚚', 'Доставка'], ['rev', '💬', 'Отзывы']];
    $('#app').innerHTML = header() + '<main>' + v + '</main><nav class="nav">' + nav.map(function (n) { return '<button data-act="tab" data-id="' + n[0] + '" class="' + (S.tab === n[0] ? 'on' : '') + '"><b>' + n[1] + '</b>' + n[2] + (n[0] === 'cart' && cartCount() ? '<em>' + cartCount() + '</em>' : '') + '</button>'; }).join('') + '</nav>';
    hydrate();
    var qi = $('#q'); if (qi) qi.addEventListener('input', function () { S.q = qi.value; $('#grid').innerHTML = gridHTML(filtered()); hydrate(); });
  }
  function tab(t) {
    S.tab = t; S.done = t === 'cart' ? S.done : null; render(); window.scrollTo(0, 0);
    if (t === 'rev' && !S.rev) api('reviews').then(function (r) { S.rev = r; S.revErr = ''; if (S.tab === 'rev') render(); }, function (e) { S.revErr = errText(e); if (S.tab === 'rev') render(); });
  }
  /* ---------- форма корзины ---------- */
  function readForm() {
    var g = function (id) { var e = $('#' + id); return e ? e.value : undefined; }, f = S.form;
    ['name', 'phone', 'address', 'date', 'time', 'wish'].forEach(function (k) { var v = g('f_' + k); if (v !== undefined) f[k] = v; });
    var rn = g('r_name'), rt = g('r_text'); if (rn !== undefined) f.rname = rn; if (rt !== undefined) f.rtext = rt;
  }
  function cartMsg(kind) {
    var f = S.form, L = cartLines(), t = 'Здравствуйте! Хочу сделать заказ:\n', total = 0;
    L.forEach(function (x) { total += x.p.price * x.q; t += '• ' + x.p.title + ' × ' + x.q + (x.p.price > 0 ? ' = ' + money(x.p.price * x.q) + ' ₸' : ' (цена по запросу)') + '\n'; });
    t += '\nИтого: ' + (total > 0 ? money(total) + ' ₸' : 'по запросу') + '\n' + (f.kind === 'delivery' ? '🚚 Доставка: ' + (f.address || '') + (f.date ? '\n📅 ' + f.date + (f.time ? ' ' + f.time : '') : '') : '🏪 Самовывоз');
    t += '\n👤 ' + (f.name || '') + ', 📞 ' + (f.phone || '') + (f.wish ? '\n💬 ' + f.wish : '');
    return t;
  }
  function checkForm() {
    var f = S.form, m = '';
    if (!cartLines().length) m = ERR.empty_cart;
    else if ((f.name || '').trim().length < 2) m = ERR.bad_name;
    else if (!normPhone(f.phone)) m = ERR.bad_phone;
    else if (f.kind === 'delivery' && (f.address || '').trim().length < 5) m = ERR.need_address;
    var e = $('#cerr'); if (e) e.innerHTML = m ? '<div class="err">' + esc(m) + '</div>' : '';
    return !m;
  }
  function sendSite(btn) {
    var f = S.form; btn.disabled = true; btn.textContent = 'Отправляем…';
    var items = cartLines().map(function (x) { return { id: x.p.id, qty: x.q }; });
    api('order', { name: f.name, phone: f.phone, kind: f.kind, address: f.address || '', date: f.date || '', time: f.time || '', wish: f.wish || '', items: items }).then(function (r) {
      S.done = { id: r.id, total: r.total }; S.cart = {}; S.form = { kind: f.kind, name: f.name, phone: f.phone }; save(); render();
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
    if (!(f.rating >= 1)) return fail(ERR.bad_rating);
    if ((f.rtext || '').trim().length < 3) return fail(ERR.bad_text);
    btn.disabled = true;
    var file = $('#r_photo') && $('#r_photo').files[0];
    (file ? shrink(file) : Promise.resolve('')).then(function (photo) {
      return api('reviewSave', { name: f.rname, rating: f.rating, text: f.rtext, photo: photo });
    }).then(function () {
      S.form.rname = ''; S.form.rtext = ''; S.form.rating = 0; render();
      $('#rmsg').innerHTML = '<div class="ok">✅ Спасибо! Отзыв отправлен и появится после проверки.</div>';
    }, function (e) { fail(errText(e)); });
  }
  /* ---------- просмотр фото на весь экран ---------- */
  function zoom(p) {
    if (!p || !p.photos.length) return;
    var i = 0, el = document.createElement('div'); el.className = 'lb';
    el.innerHTML = '<button class="x" aria-label="Закрыть">✕</button>' + (p.photos.length > 1 ? '<button class="p">‹</button><button class="n">›</button>' : '') + '<div class="c"></div>';
    document.body.appendChild(el);
    function show() {
      var old = el.querySelector('img'); if (old) old.remove();
      el.querySelector('.c').textContent = (i + 1) + ' / ' + p.photos.length + ' · ' + p.title;
      var ph = p.photos[i], id = ph.f || ph.t, shown = PH[ph.t] || PH[id];
      var im = document.createElement('img'); im.alt = ''; if (shown) im.src = shown; el.insertBefore(im, el.firstChild);
      loadPhoto(id).then(function (d) { if (el.parentNode && p.photos[i] === ph) im.src = d; }, function () {});
    }
    var x0 = null;
    el.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    el.addEventListener('touchend', function (e) { if (x0 === null || p.photos.length < 2) return; var dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 50) { i = (i + (dx < 0 ? 1 : p.photos.length - 1)) % p.photos.length; show(); } x0 = null; });
    el.addEventListener('click', function (e) {
      if (e.target.classList.contains('p')) { i = (i + p.photos.length - 1) % p.photos.length; show(); }
      else if (e.target.classList.contains('n')) { i = (i + 1) % p.photos.length; show(); }
      else if (e.target.tagName !== 'IMG') el.remove();
    });
    show();
  }
  /* ---------- события ---------- */
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-act]'); if (!t) return;
    var act = t.getAttribute('data-act'), id = t.getAttribute('data-id');
    if (S.tab === 'cart' || S.tab === 'rev') readForm();
    switch (act) {
      case 'tab': return tab(id);
      case 'home': S.done = null; return tab('home');
      case 'retry': return loadShop().then(render);
      case 'theme': var d = document.documentElement, dark = d.getAttribute('data-theme') === 'dark' || (!d.getAttribute('data-theme') && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches); d.setAttribute('data-theme', dark ? 'light' : 'dark'); ls('theme', dark ? 'light' : 'dark'); return;
      case 'cat': S.cat = S.cat === id ? '' : id; return render();
      case 'color': S.color = S.color === id ? '' : id; return render();
      case 'add': S.cart[id] = Math.min(99, (S.cart[id] || 0) + 1); save(); t.textContent = '✅ Добавлено'; setTimeout(render, 600); return;
      case 'fav': var k = S.favs.indexOf(id); if (k >= 0) S.favs.splice(k, 1); else S.favs.push(id); save(); return render();
      case 'zoom': return zoom(prod(id));
      case 'inc': S.cart[id] = Math.min(99, (S.cart[id] || 0) + 1); save(); return render();
      case 'dec': if ((S.cart[id] || 0) > 1) S.cart[id]--; else delete S.cart[id]; save(); return render();
      case 'del': delete S.cart[id]; save(); return render();
      case 'kind': S.form.kind = id; return render();
      case 'sendwa': if (!checkForm()) return; window.open(waLink(cartMsg()), '_blank'); return;
      case 'sendsite': if (!checkForm()) return; return sendSite(t);
      case 'star': S.form.rating = +id; return render();
      case 'sendrev': return sendReview(t);
      case 'rphoto': t.disabled = true; t.textContent = 'Загружаем…'; return api('reviewPhoto', { id: id }).then(function (r) { var h = document.querySelector('[data-rphoto="' + id + '"]'); if (h) h.innerHTML = '<img alt="" src="' + r.data + '">'; }, function (er) { t.disabled = false; t.textContent = '📷 Показать фото'; alert(errText(er)); });
    }
  });
  /* ---------- запуск ---------- */
  function boot() {
    var th = ls('theme'); if (th) document.documentElement.setAttribute('data-theme', th);
    S.favs = ls('favs') || []; S.cart = ls('cart') || {};
    fetch('config.json', { cache: 'no-store' }).then(function (r) { return r.json(); }).catch(function () { return {}; }).then(function (c) {
      CFG.gateway = c['адресШлюза'] || ''; CFG.booking = c['ссылкаЗаписи'] || ''; CFG.site = c['адресСайта'] || ''; CFG.wa = normPhone(c['ватсапАдмина']) || CFG.wa;
      return loadShop();
    }).then(function () {
      S.favs = S.favs.filter(prod); if (S.shop) { for (var k in S.cart) if (!prod(k)) delete S.cart[k]; }
      render();
      if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) navigator.serviceWorker.register('service-worker.js').catch(function () {});
    });
  }
  boot();
})();
