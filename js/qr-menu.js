// Frost & Flame QR menu: website-style menu loaded from the admin API, plus table bill, weekend special, scratch card and themes.
(function () {
  var CATS = window.FF_CATS || [];
  var EXTRAS = window.FF_EXTRAS || {};
  var DIET = { V: 'Veg', VG: 'Vegan', NV: 'Non-veg', S: 'Spicy', SS: 'Extra spicy', N: 'Nuts' };
  // Old QR dish ids used by the table themes -> website dishes
  var ALIAS = { pulav: 'mutton-pulao', stone: 'signature-stone-regular-180ml', pistachio: 'desi-stone-regular-180ml',
    mango: 'chilli-mango-stone', chaat: 'samosa-chaat', chai: 'masala-chai', lassi: 'mango-lassi', gulab: 'warm-gulab-jamun' };
  var MENU = {};      // id -> {name, note, price, image, special, sort, tags}
  var ORDER = [];     // ids in sort order
  var qty = {};
  var filter = 'all';
  var weekendId = null;
  var params = new URLSearchParams(location.search);
  var table = params.get('table') || '4';
  var bill = params.get('bill') || ('FF-' + String(1000 + Number(table)).slice(-4));
  function $(id) { return document.getElementById(id); }
  $('tableNo').textContent = 'Table ' + table; $('billNo').textContent = bill;
  $('heroTable').textContent = table; $('heroBill').textContent = bill;

  function money(n) { return '£' + Number(n).toFixed(2); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function catFor(sort) { var n = Math.floor(Number(sort || 0) / 100); for (var i = 0; i < CATS.length; i++) if (CATS[i].n === n) return CATS[i]; return null; }
  function splitName(name) { var i = name.indexOf(' · '); return i > 0 ? { base: name.slice(0, i), size: name.slice(i + 3) } : { base: name, size: '' }; }
  function isVeg(ex) { var d = (ex && ex.diet) || []; return d.indexOf('V') >= 0 || d.indexOf('VG') >= 0; }

  // ---------- Frost / Flame look (same as website) ----------
  function applyMode(m) {
    document.documentElement.setAttribute('data-mode', m);
    try { localStorage.setItem('ff-mode', m); } catch (e) {}
    document.querySelectorAll('.mode-toggle [data-mode]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-mode') === m ? 'true' : 'false'); });
    var menu = $('menu'); if (menu) menu.setAttribute('data-tone', m);
  }
  document.querySelectorAll('.mode-toggle [data-mode]').forEach(function (b) { b.onclick = function () { applyMode(b.getAttribute('data-mode')); }; });
  applyMode(document.documentElement.getAttribute('data-mode') || 'frost');

  // ---------- menu ----------
  function setMenu(items) {
    MENU = {}; ORDER = []; weekendId = null;
    items.slice().sort(function (a, b) { return Number(a.sort || 0) - Number(b.sort || 0); }).forEach(function (it) {
      if (!it || !it.id) return;
      MENU[it.id] = { name: String(it.name || ''), note: String(it.note || ''), price: Number(it.price) || 0, image: String(it.image || ''),
        special: String(it.special || ''), sort: Number(it.sort) || 0, qtyId: 'q-' + it.id,
        tags: it.tags || (window.FFThemes && FFThemes.DEFAULT_TAGS[it.id]) || [] };
      ORDER.push(it.id);
      if (it.special === 'weekend' && !weekendId) weekendId = it.id;
      if (typeof qty[it.id] !== 'number') qty[it.id] = 0;
    });
    Object.keys(qty).forEach(function (k) { if (!MENU[k]) delete qty[k]; });
    renderWeekend(); renderAll();
  }

  function groups() {
    // section -> list of cards; a card groups sizes that share a base name (e.g. "Signature Stone · Regular 180ml")
    var out = [], byCat = {};
    ORDER.forEach(function (id) {
      if (id === weekendId) return;
      var m = MENU[id], cat = catFor(m.sort);
      var key = cat ? cat.id : '_specials';
      if (!byCat[key]) { byCat[key] = { cat: cat || { id: '_specials', name: 'Specials', heading: "Today's specials", tone: 'both', n: 0 }, cards: [], index: {} }; out.push(byCat[key]); }
      var g = byCat[key], sp = splitName(m.name), card = sp.size ? g.index[sp.base] : null;
      if (!card) { card = { base: sp.base, ids: [], first: id }; g.cards.push(card); if (sp.size) g.index[sp.base] = card; }
      card.ids.push(id);
    });
    return out.sort(function (a, b) { return a.cat.n - b.cat.n; });
  }

  function mediaHTML(card, tone) {
    var img = ''; card.ids.forEach(function (id) { if (!img && MENU[id].image) img = MENU[id].image; });
    if (img) return '<img src="' + esc(img) + '" alt="' + esc(card.base) + '" loading="lazy" width="640" height="640">';
    return '<div class="ph ph-' + tone + '" aria-hidden="true"><span class="ph-name" style="font-size:0.95rem">' + esc(card.base) + '</span></div>';
  }
  function control(id) {
    var q = qty[id] || 0;
    if (!q) return '<button class="btn btn-add" type="button" data-add="' + esc(id) + '">Add</button>';
    return '<div class="qty"><button type="button" data-sub="' + esc(id) + '" aria-label="Remove one">−</button><span id="q-' + esc(id) + '">' + q + '</span><button type="button" data-add="' + esc(id) + '" aria-label="Add one">+</button></div>';
  }
  function cardHTML(card, cat) {
    var first = MENU[card.first], ex = EXTRAS[card.first] || {};
    var tone = ex.tone === 'flame' ? 'flame' : ex.tone === 'both' ? 'both' : (cat.tone === 'flame' ? 'flame' : cat.tone === 'both' ? 'both' : 'frost');
    var diet = ex.diet || [];
    var tags = diet.length ? (isVeg(ex) ? diet.filter(function (d) { return d !== 'NV'; }) : ['NV'].concat(diet.filter(function (d) { return d !== 'NV'; }))) : [];
    var chips = tags.map(function (d) { return '<span class="chip chip-' + String(d).toLowerCase() + '">' + esc(DIET[d] || d) + '</span>'; }).join('');
    var theme = window.FFExperience && FFExperience.getTheme && FFExperience.getTheme();
    var badge = '';
    if (theme) { var alias = null; Object.keys(ALIAS).forEach(function (k) { if (card.ids.indexOf(ALIAS[k]) >= 0) alias = k; }); if (alias) badge = FFExperience.badgeHtml(theme, alias, aliasMenu()); }
    var foot;
    if (card.ids.length > 1 || splitName(first.name).size) {
      foot = '<div class="sizes">' + card.ids.map(function (id) {
        return '<div class="size-row"><span class="sz">' + esc(splitName(MENU[id].name).size) + '</span><span class="price">' + money(MENU[id].price) + '</span><div class="add-slot">' + control(id) + '</div></div>';
      }).join('') + '</div>';
    } else {
      foot = '<div class="dish-foot"><span class="price">' + money(first.price) + (ex.separately ? '<span class="was">' + money(ex.separately) + ' separately</span>' : '') + '</span><div class="add-slot">' + control(card.first) + '</div></div>';
    }
    return '<article class="dish" id="dish-' + esc(card.first) + '"><div class="media">' + mediaHTML(card, tone) + '</div><div class="dish-body">' +
      '<h3>' + esc(card.base) + '</h3>' + (first.note ? '<p>' + esc(first.note) + '</p>' : '') + badge +
      (chips ? '<div class="meta-row">' + chips + '</div>' : '') +
      (ex.choices ? ex.choices.map(function (c) { return '<p class="choices">' + esc(c) + '</p>'; }).join('') : '') +
      (ex.allergens && ex.allergens.length ? '<p class="allergens">Contains ' + esc(ex.allergens.join(', ')) + '</p>' : '') +
      (ex.note ? '<p class="note">' + esc(ex.note) + '</p>' : '') + foot + '</div></article>';
  }
  function renderTabs(gs) {
    var tabs = [{ id: 'all', name: 'All' }].concat(gs.map(function (g) { return g.cat; }));
    if (filter !== 'all' && !gs.some(function (g) { return g.cat.id === filter; })) filter = 'all';
    $('menu-tabs').innerHTML = tabs.map(function (c) {
      return '<button class="tab" type="button" role="tab" aria-selected="' + (filter === c.id ? 'true' : 'false') + '" data-filter="' + esc(c.id) + '">' + esc(c.name) + '</button>';
    }).join('');
  }
  function renderAll() {
    var gs = groups();
    renderTabs(gs);
    if (!gs.length) { $('menu-grid').innerHTML = '<p class="menu-empty">The menu is being updated. Please ask staff.</p>'; renderBill(); return; }
    $('menu-grid').innerHTML = gs.filter(function (g) { return filter === 'all' || g.cat.id === filter; }).map(function (g) {
      var cat = g.cat, cards = g.cards, body;
      if (cat.split) {
        var nv = cards.filter(function (c) { return !isVeg(EXTRAS[c.first]); }), vg = cards.filter(function (c) { return isVeg(EXTRAS[c.first]); });
        var blk = function (t, cls, l) { return l.length ? '<div class="diet-block"><h4 class="diet-split ' + cls + '">' + t + '</h4><div class="menu-cards">' + l.map(function (c) { return cardHTML(c, cat); }).join('') + '</div></div>' : ''; };
        body = blk('Non-veg', 'nonveg', nv) + blk('Veg', 'veg', vg);
      } else body = '<div class="menu-cards">' + cards.map(function (c) { return cardHTML(c, cat); }).join('') + '</div>';
      return '<section class="menu-group" id="group-' + esc(cat.id) + '"><header class="menu-group-head"><h3>' + esc(cat.heading || cat.name) + '</h3>' +
        (cat.note ? '<p class="menu-group-note">' + esc(cat.note) + '</p>' : '') + '</header>' + body + '</section>';
    }).join('');
    renderBill();
  }
  $('menu-tabs').addEventListener('click', function (e) {
    var t = e.target.closest('[data-filter]'); if (!t) return;
    filter = t.getAttribute('data-filter'); renderAll();
    var sel = $('menu-tabs').querySelector('[aria-selected="true"]'); if (sel && sel.scrollIntoView) sel.scrollIntoView({ inline: 'center', block: 'nearest' });
  });

  // ---------- bill ----------
  function lines() {
    return ORDER.filter(function (k) { return (qty[k] || 0) > 0; }).map(function (k) {
      var m = MENU[k]; return { key: k, name: m.name, note: m.note, qty: qty[k], price: m.price, line: m.price * qty[k] };
    });
  }
  function renderBill() {
    var body = $('billBody'), ls = lines();
    var sum = ls.reduce(function (a, b) { return a + b.line; }, 0), count = ls.reduce(function (a, b) { return a + b.qty; }, 0);
    body.innerHTML = ls.length ? ls.map(function (l) {
      return '<tr><td><span class="item-name">' + esc(l.name) + '</span></td><td>' + l.qty + '</td><td>' + money(l.line) + '</td></tr>';
    }).join('') : '<tr><td colspan="3" style="color:var(--muted);border:0;padding:12px 0">No items yet — add from Menu.</td></tr>';
    $('subtotal').textContent = money(sum); $('total').textContent = money(sum);
    $('headCount').textContent = String(count); $('headCount').classList.toggle('is-on', count > 0);
    $('orderBar').classList.toggle('is-empty', !count);
    $('barText').textContent = count ? 'View bill · ' + count + (count === 1 ? ' item' : ' items') : 'Your bill is empty';
    $('barTotal').textContent = money(sum);
  }
  function bump(k, d) {
    if (!MENU[k]) return;
    qty[k] = Math.max(0, (qty[k] || 0) + d);
    if (k === weekendId) { var q = $('q-weekend'); if (q) q.textContent = String(qty[k]); }
    renderAll();
  }
  document.addEventListener('click', function (e) {
    var add = e.target.closest('[data-add]'), sub = e.target.closest('[data-sub]');
    if (!add && !sub) return;
    var b = add || sub; if (b.disabled) return;
    var k = b.getAttribute(add ? 'data-add' : 'data-sub'); if (k === 'weekend') k = weekendId;
    bump(k, add ? 1 : -1);
  });

  function showTab(which) {
    var menu = which === 'menu';
    $('tabMenu').classList.toggle('active', menu); $('tabBill').classList.toggle('active', !menu);
    $('panelMenu').classList.toggle('active', menu); $('panelBill').classList.toggle('active', !menu);
    $('orderBar').style.display = menu ? '' : 'none';
    if (!menu) { renderBill(); window.scrollTo({ top: $('tabMenu').getBoundingClientRect().top + window.scrollY - 80 }); }
  }
  $('tabMenu').onclick = function () { showTab('menu'); };
  $('tabBill').onclick = function () { showTab('bill'); };
  $('toBillBtn').onclick = $('barBill').onclick = $('headBill').onclick = function () { showTab('bill'); };

  // ---------- weekend special (any dish tagged "Weekend special" in the admin) ----------
  function renderWeekend() {
    var wc = $('weekendCard'); if (!wc) return;
    if (!weekendId) { wc.classList.add('hidden'); return; }
    var w = MENU[weekendId]; wc.classList.remove('hidden');
    var img = wc.querySelector('img'); if (w.image) { img.src = w.image; img.classList.remove('hidden'); } else img.classList.add('hidden');
    wc.querySelector('h2').textContent = w.name;
    if (w.note) $('weekendDesc').textContent = w.note;
    $('weekendPrice').textContent = money(w.price);
    $('q-weekend').textContent = String(qty[weekendId] || 0);
  }
  function updateWeekend() {
    if (!weekendId) return;
    var now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/London' }));
    var day = now.getDay(), active = (day === 5 || day === 6 || day === 0), target;
    var wc = $('weekendCard');
    if (active) {
      $('weekendBadge').textContent = 'Live now · weekend only';
      target = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (7 - day) % 7, 23, 59, 59);
      $('weekendNote').textContent = 'Order before the timer hits zero — special ends Sunday night.';
      wc.querySelectorAll('[data-add],[data-sub]').forEach(function (b) { b.disabled = false; }); wc.classList.remove('off');
    } else {
      $('weekendBadge').textContent = 'Opens Friday';
      target = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (5 - day + 7) % 7, 0, 0, 0);
      $('weekendNote').textContent = 'Weekend special is locked until Friday. Countdown to open.';
      if (qty[weekendId]) { qty[weekendId] = 0; renderWeekend(); renderBill(); }
      wc.querySelectorAll('[data-add],[data-sub]').forEach(function (b) { b.disabled = true; }); wc.classList.add('off');
    }
    var s = Math.floor(Math.max(0, target - now) / 1000);
    $('cdD').textContent = String(Math.floor(s / 86400)); $('cdH').textContent = String(Math.floor((s % 86400) / 3600));
    $('cdM').textContent = String(Math.floor((s % 3600) / 60)); $('cdS').textContent = String(s % 60);
  }
  setInterval(updateWeekend, 1000);

  // ---------- scratch card (server pool when the API is live; local demo otherwise) ----------
  var fallbackPrizes = [
    { t: '10% off drinks', s: 'Valid on this table today' }, { t: 'Free Masala Chai', s: 'One cup with any stone dessert' },
    { t: '£2 off bill', s: 'Show staff before paying' }, { t: 'Free topping', s: 'On any stone ice cream' },
    { t: 'Buy 1 get 1 chai', s: 'Same size · same visit' }, { t: 'Mystery scoop', s: 'Staff picks a surprise flavour' }
  ];
  var canvas = $('scratchCanvas'), ctx = canvas.getContext('2d'), serverScratch = false;
  function sizeCanvas() { var wrap = $('scratchWrap'), w = wrap.clientWidth, h = wrap.clientHeight; canvas.width = w * 2; canvas.height = h * 2; canvas.style.width = w + 'px'; canvas.style.height = h + 'px'; ctx.setTransform(2, 0, 0, 2, 0, 0); }
  function paintFoil() {
    sizeCanvas();
    var g = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    g.addColorStop(0, '#b8c0c8'); g.addColorStop(.5, '#e8eef4'); g.addColorStop(1, '#9aa7b3');
    ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(30,30,40,.55)'; ctx.font = '600 16px Outfit, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('Scratch here for your offer', canvas.width / 4, canvas.height / 4);
  }
  function showPrize(title, sub, code) {
    $('prizeText').textContent = title; $('prizeSub').textContent = sub;
    var c = $('prizeCode'); c.textContent = code ? 'Code ' + code : ''; if (code) c.style.display = 'block';
  }
  function pickFallbackPrize() {
    var p = fallbackPrizes[Math.floor(Math.random() * fallbackPrizes.length)];
    showPrize(p.t, p.s, ''); $('scratchNote').textContent = 'Offline demo card — not redeemable.'; $('resetScratch').classList.remove('hidden');
  }
  function scratch(x, y) { ctx.globalCompositeOperation = 'destination-out'; ctx.beginPath(); ctx.arc(x, y, 22, 0, Math.PI * 2); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; }
  var drawing = false;
  function pos(e) { var r = canvas.getBoundingClientRect(), t = (e.touches && e.touches[0]) || e; return { x: t.clientX - r.left, y: t.clientY - r.top }; }
  canvas.addEventListener('mousedown', function (e) { drawing = true; var p = pos(e); scratch(p.x, p.y); });
  canvas.addEventListener('mousemove', function (e) { if (!drawing) return; var p = pos(e); scratch(p.x, p.y); });
  window.addEventListener('mouseup', function () { drawing = false; });
  canvas.addEventListener('touchstart', function (e) { e.preventDefault(); drawing = true; var p = pos(e); scratch(p.x, p.y); }, { passive: false });
  canvas.addEventListener('touchmove', function (e) { e.preventDefault(); if (!drawing) return; var p = pos(e); scratch(p.x, p.y); }, { passive: false });
  canvas.addEventListener('touchend', function () { drawing = false; });
  $('resetScratch').onclick = function () { if (serverScratch) return; pickFallbackPrize(); paintFoil(); };
  (function initScratch() {
    if (!window.FFApi || !FFApi.ready()) { pickFallbackPrize(); paintFoil(); return; }
    FFApi.call({ action: 'scratch', billId: bill, table: table }).then(function (r) {
      serverScratch = true; var p = r.prize || {};
      showPrize(p.title || '…', p.subtitle || 'Show staff', p.code || '');
      $('scratchNote').textContent = r.already ? 'Already drawn for this bill — show the code to staff.' : 'One card for this bill. Staff can verify the code before discount.';
      $('resetScratch').classList.add('hidden'); paintFoil();
    }).catch(function () { pickFallbackPrize(); paintFoil(); });
  })();
  window.addEventListener('resize', paintFoil);

  function toast(msg) { var el = $('toast'); el.textContent = msg; el.classList.add('show'); setTimeout(function () { el.classList.remove('show'); }, 4200); }

  // ---------- order + pay (demo) ----------
  $('orderBtn').onclick = function () {
    var ls = lines(); if (!ls.length) { toast('Add dishes on the Menu tab first.'); return; }
    var total = ls.reduce(function (a, b) { return a + b.line; }, 0);
    var msg = 'Frost & Flame · Table ' + table + ' · ' + ls.map(function (l) { return l.qty + '× ' + l.name; }).join(', ') + ' · Total ' + money(total);
    fetch('https://ntfy.sh/frost-flame-table-demo', { method: 'POST', body: msg, headers: { 'Title': 'New table order (demo)', 'Priority': 'high', 'Tags': 'ice_cream,bell' } })
      .then(function () { toast('Demo staff ping sent. On a staff phone, open ntfy and follow topic: frost-flame-table-demo'); })
      .catch(function () { toast('Order ready on screen (offline demo). Staff topic would be: frost-flame-table-demo'); });
    if (window.Notification && Notification.permission === 'granted') new Notification('Frost & Flame order', { body: msg });
    else if (window.Notification && Notification.permission !== 'denied') Notification.requestPermission();
  };
  $('payBtn').onclick = function () { this.disabled = true; this.textContent = 'Paid (demo)'; toast('Prototype only — no card details taken, nothing saved.'); };

  // ---------- table themes (who are you with) ----------
  function aliasMenu() { var m = {}; Object.keys(MENU).forEach(function (k) { m[k] = MENU[k]; }); Object.keys(ALIAS).forEach(function (a) { if (MENU[ALIAS[a]]) m[a] = MENU[ALIAS[a]]; }); return m; }
  function normalizeQty(q) { Object.keys(q).forEach(function (k) { if (ALIAS[k]) { var t = ALIAS[k]; if (MENU[t]) q[t] = (q[t] || 0) + (q[k] || 0); delete q[k]; } }); return q; }
  if (window.FFExperience) {
    var greetEl = $('ffThemeGreet');
    FFExperience.init({
      getMenu: aliasMenu,
      getQty: function () { return qty; },
      setQty: function (q) { qty = normalizeQty(q); renderWeekend(); },
      renderMenu: function () {
        renderAll();
        if (greetEl) { var th = FFExperience.getTheme(); if (th) { greetEl.textContent = th.greeting; greetEl.classList.remove('hidden'); } }
      },
      renderBill: renderBill,
      toast: toast
    });
  }

  // ---------- load the menu from the admin (Google Sheet) ----------
  window.FFQr = { setMenu: setMenu, qty: function () { return qty; } };
  if (window.FFApi && FFApi.ready()) {
    FFApi.call({ action: 'menu' }).then(function (r) { setMenu((r && r.items) || []); })
      .catch(function () { $('menu-grid').innerHTML = '<p class="menu-empty">Could not load the menu. Check your connection and refresh, or ask staff.</p>'; });
  } else { $('menu-grid').innerHTML = '<p class="menu-empty">Menu not connected yet. Please ask staff.</p>'; }
  if (/bill\.html$/.test(location.pathname)) showTab('bill');
  renderBill();
})();
