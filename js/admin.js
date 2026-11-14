/* Frost & Flame staff admin v2 – UI only. Every permission is checked again on the server (Code.gs). */
(function () {
  'use strict';
  var TK = 'ffa2_token', UK = 'ffa2_user';
  var token = localStorage.getItem(TK) || '';
  var me = null;
  try { me = JSON.parse(localStorage.getItem(UK) || 'null'); } catch (e) {}
  var lastLoginPassword = '';          // kept in memory only, so a first-login change needs no retyping
  var menuItems = [], people = [], pendingRedeem = null;
  var IMAGES = ['img/weekend.jpg', 'img/mutton_pulav.jpg', 'img/stone.jpg', 'img/pistachio.jpg', 'img/chilli_mango.jpg',
    'img/chaat.jpg', 'img/chai.jpg', 'img/lassi.jpg', 'img/gulab.jpg', 'img/logo.png'];
  var TABS = [
    { id: 'menu', label: 'Menu', perm: 'menu.view' },
    { id: 'codes', label: 'Codes', perm: 'codes.redeem' },
    { id: 'scratch', label: 'Scratch', perm: 'scratch.view' },
    { id: 'people', label: 'People', perm: 'people.manage' },
    { id: 'activity', label: 'Activity', perm: 'activity.view' },
    { id: 'me', label: 'Me', perm: null }
  ];
  var PERM_TEXT = {
    'menu.availability': 'mark dishes available / out of stock', 'menu.edit': 'edit dish details and photos',
    'menu.price': 'change prices', 'menu.add': 'add dishes', 'menu.delete': 'delete dishes',
    'codes.redeem': 'check and use scratch codes', 'scratch.view': 'see the scratch pool',
    'scratch.settings': 'change scratch odds', 'activity.view': 'read the activity log', 'people.manage': 'manage people'
  };

  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function money(n) { return '£' + Number(n || 0).toFixed(2); }
  function can(p) { return !!(me && me.perms && me.perms[p]); }
  function shrinkPhoto(file, done, fail) {
    if (!file) return;
    if (!file.type || file.type.indexOf('image/') !== 0) { fail('Please choose a photo'); return; }
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () {
      var w = img.naturalWidth || img.width, h = img.naturalHeight || img.height, max = 1200;
      if (w > max || h > max) {
        if (w >= h) { h = Math.round(h * max / w); w = max; }
        else { w = Math.round(w * max / h); h = max; }
      }
      var canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      var dataUrl;
      try { dataUrl = canvas.toDataURL('image/jpeg', 0.8); }
      catch (e) { fail('That photo could not be read'); return; }
      var raw = dataUrl.replace(/^data:[^;]+;base64,/, '');
      if (Math.floor(raw.length * 3 / 4) > 5 * 1024 * 1024) { fail('Photo must be under 5 MB'); return; }
      done(dataUrl, raw);
    };
    img.onerror = function () { URL.revokeObjectURL(url); fail('That photo could not be read'); };
    img.src = url;
  }
  function show(id, on) { $(id).classList.toggle('hidden', !on); }
  var toastTimer;
  function toast(msg, err) {
    var el = $('toast'); el.textContent = msg; el.classList.toggle('err', !!err); el.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { el.classList.remove('show'); }, 3400);
  }
  function api(payload) {
    payload = payload || {};
    if (token) payload.token = token;
    return FFApi.call(payload).catch(function (e) {
      if (e.code === 'auth') { dropSession(); showLogin(e.message); }
      else if (e.code === 'must_change_password') showChange(false);
      throw e;
    });
  }
  function busy(btn, on) { if (btn) { btn.disabled = on; } }

  /* ---------- sheet (bottom dialog) ---------- */
  function openSheet(html) { $('sheet').innerHTML = html; show('sheetBg', true); var f = $('sheet').querySelector('input,select'); if (f && f.focus) setTimeout(function(){ try { f.focus(); } catch (e) {} }, 50); }
  function closeSheet() { show('sheetBg', false); $('sheet').innerHTML = ''; }
  $('sheetBg').addEventListener('click', function (e) { if (e.target === $('sheetBg') && !$('sheet').querySelector('[data-sticky]')) closeSheet(); });
  function confirmSheet(title, text, okLabel, danger) {
    return new Promise(function (resolve) {
      openSheet('<h2>' + esc(title) + '</h2><p class="hint" style="font-size:14px">' + text + '</p>' +
        '<div class="row2"><button class="btn btn-ghost" id="cfNo" type="button">Cancel</button>' +
        '<button class="btn ' + (danger ? 'btn-danger' : 'btn-primary') + '" id="cfYes" type="button">' + esc(okLabel) + '</button></div>');
      $('cfNo').onclick = function () { closeSheet(); resolve(false); };
      $('cfYes').onclick = function () { closeSheet(); resolve(true); };
    });
  }
  function secretSheet(title, who, username, pw) {
    openSheet('<div data-sticky></div><h2>' + esc(title) + '</h2>' +
      '<div class="kv"><b>Name</b><span>' + esc(who) + '</span><b>Username</b><span data-test="new-username">' + esc(username) + '</span></div>' +
      '<label>First password</label><div class="secret" data-test="temp-password">' + esc(pw) + '</div>' +
      '<p class="hint" style="font-size:13px">This is shown <b>once</b>. Give it to them in person (not in a group chat). ' +
      'They must choose their own password the first time they log in.</p>' +
      '<button class="btn btn-ghost" id="spCopy" type="button">Copy password</button>' +
      '<button class="btn btn-primary" id="spDone" type="button">I have given it to them</button>');
    $('spCopy').onclick = function () {
      if (navigator.clipboard) navigator.clipboard.writeText(pw).then(function () { toast('Copied'); }, function () { toast('Copy did not work – write it down', true); });
    };
    $('spDone').onclick = closeSheet;
  }

  /* ---------- show / hide views ---------- */
  if (!FFApi.ready()) show('setupWarn', true);
  if (window.FF_STAGING) show('stagingBadge', true);
  function dropSession() { token = ''; me = null; localStorage.removeItem(TK); localStorage.removeItem(UK); }
  function showLogin(msg) {
    closeSheet(); show('appView', false); show('changeView', false); show('loginView', true);
    $('loginMsg').textContent = msg || ''; $('loginMsg').className = 'msg';
    $('loginPass').value = '';
  }
  function showChange(knowOld) {
    closeSheet(); show('appView', false); show('loginView', false); show('changeView', true);
    show('cvOldWrap', !(knowOld && lastLoginPassword));
    $('cvMsg').textContent = '';
  }
  function showApp() {
    show('loginView', false); show('changeView', false); show('appView', true);
    $('whoLine').textContent = me.displayName + ' · ' + (me.role === 'owner' ? 'Owner' : 'Employee');
    var nav = $('tabs');
    nav.innerHTML = TABS.filter(function (t) { return !t.perm || can(t.perm); }).map(function (t) {
      return '<button class="tab" data-tab="' + t.id + '" type="button">' + t.label + '</button>';
    }).join('');
    nav.querySelectorAll('.tab').forEach(function (b) { b.onclick = function () { openTab(b.getAttribute('data-tab')); }; });
    show('addDishBtn', can('menu.add'));
    show('oddsCard', can('scratch.settings'));
    $('meLine').innerHTML = '<b>' + esc(me.displayName) + '</b> · @' + esc(me.username) + ' · ' + (me.role === 'owner' ? 'Owner' : 'Employee');
    var allowed = Object.keys(PERM_TEXT).filter(function (k) { return can(k); }).map(function (k) { return PERM_TEXT[k]; });
    $('mePerms').textContent = me.role === 'owner' ? 'As an owner you can do everything.' : 'You can: view the menu' + (allowed.length ? ', ' + allowed.join(', ') : '') + '.';
    openTab(can('menu.view') ? 'menu' : (can('codes.redeem') ? 'codes' : 'me'));
  }
  function openTab(id) {
    document.querySelectorAll('.tab').forEach(function (x) { x.classList.toggle('on', x.getAttribute('data-tab') === id); });
    document.querySelectorAll('.panel').forEach(function (x) { x.classList.toggle('on', x.id === 'panel-' + id); });
    if (id === 'menu') loadMenu();
    if (id === 'codes') loadWins();
    if (id === 'scratch') loadScratch();
    if (id === 'people') loadPeople();
    if (id === 'activity') loadActivity();
  }
  document.querySelectorAll('[data-eye]').forEach(function (b) {
    b.onclick = function () { var i = $(b.getAttribute('data-eye')); var t = i.type === 'password'; i.type = t ? 'text' : 'password'; b.textContent = t ? 'Hide' : 'Show'; };
  });

  /* ---------- log in / out / passwords ---------- */
  $('loginForm').onsubmit = function (ev) {
    ev.preventDefault();
    if (!FFApi.ready()) { $('loginMsg').textContent = 'Not connected to a backend yet.'; return; }
    var pw = $('loginPass').value, btn = $('loginBtn');
    busy(btn, true); $('loginMsg').textContent = '';
    FFApi.call({ action: 'login', username: $('loginUser').value, password: pw }).then(function (r) {
      token = r.token; me = r.user; lastLoginPassword = pw;
      localStorage.setItem(TK, token); localStorage.setItem(UK, JSON.stringify(me));
      $('loginPass').value = '';
      if (r.mustChangePassword) showChange(true); else { lastLoginPassword = ''; showApp(); toast('Welcome, ' + me.displayName); }
    }).catch(function (e) {
      var m = e.message || 'Login failed';
      if (e.data && e.data.remaining) m += ' (' + e.data.remaining + ' tries left before a 15-minute lock)';
      $('loginMsg').textContent = m;
    }).then(function () { busy(btn, false); });
  };
  $('changeForm').onsubmit = function (ev) {
    ev.preventDefault();
    var oldPw = $('cvOldWrap').classList.contains('hidden') ? lastLoginPassword : $('cvOld').value;
    var a = $('cvNew').value, b = $('cvNew2').value;
    if (a !== b) { $('cvMsg').textContent = 'The two new passwords are not the same'; return; }
    busy($('cvBtn'), true);
    api({ action: 'changePassword', oldPassword: oldPw, newPassword: a }).then(function () {
      lastLoginPassword = ''; ['cvOld', 'cvNew', 'cvNew2'].forEach(function (i) { $(i).value = ''; });
      return api({ action: 'me' });
    }).then(function (r) {
      me = r.user; localStorage.setItem(UK, JSON.stringify(me)); showApp(); toast('Password saved. Welcome, ' + me.displayName);
    }).catch(function (e) { $('cvMsg').textContent = e.message; if (e.code === 'bad_password') show('cvOldWrap', true); })
      .then(function () { busy($('cvBtn'), false); });
  };
  function logout() { var t = token; dropSession(); if (t) FFApi.call({ action: 'logout', token: t }).catch(function () {}); showLogin('You are logged out.'); $('loginMsg').className = 'msg ok'; }
  $('logoutBtn').onclick = logout; $('cvLogout').onclick = logout;
  $('meForm').onsubmit = function (ev) {
    ev.preventDefault();
    var a = $('meNew').value, b = $('meNew2').value;
    $('meMsg').className = 'msg';
    if (a !== b) { $('meMsg').textContent = 'The two new passwords are not the same'; return; }
    busy($('meBtn'), true);
    api({ action: 'changePassword', oldPassword: $('meOld').value, newPassword: a }).then(function () {
      ['meOld', 'meNew', 'meNew2'].forEach(function (i) { $(i).value = ''; });
      $('meMsg').className = 'msg ok'; $('meMsg').textContent = 'Password updated. Other phones are logged out.';
    }).catch(function (e) { $('meMsg').textContent = e.message; }).then(function () { busy($('meBtn'), false); });
  };

  /* ---------- menu ---------- */
  function loadMenu() {
    return api({ action: 'menuList' }).then(function (r) { menuItems = r.items || []; renderMenu(); }).catch(function (e) { toast(e.message, true); });
  }
  function renderMenu() {
    var q = $('menuSearch').value.trim().toLowerCase();
    var list = menuItems.filter(function (it) { return !q || (it.name + ' ' + it.note).toLowerCase().indexOf(q) >= 0; });
    var canEdit = can('menu.edit') || can('menu.price');
    var hints = [];
    if (canEdit) hints.push('Tap Edit to change a dish' + (can('menu.price') ? ' or its price' : '') + '.');
    if (can('menu.availability')) hints.push('"Out of stock" hides a dish from customers; "Available" brings it back.');
    if (canEdit && me.role !== 'owner') hints.push('Every change is saved with your name.');
    $('menuHint').textContent = hints.join(' ');
    $('menuList').innerHTML = list.map(function (it) {
      return '<div class="dish' + (it.visible ? '' : ' off') + '" data-dish="' + esc(it.id) + '">' +
        (it.image ? '<img src="' + esc(it.image) + '" alt="" loading="lazy" />' : '<div class="thumb-ph"></div>') +
        '<div><div class="nm">' + esc(it.name) + (it.special === 'weekend' ? ' <span class="badge frost">Weekend</span>' : '') + '</div>' +
        '<div class="nt">' + esc(it.note || '') + '</div>' +
        '<div><span class="price">' + money(it.price) + '</span> ' + (it.visible ? '<span class="badge ok">Available</span>' : '<span class="badge bad">Out of stock</span>') + '</div></div>' +
        '<div class="acts">' +
        (can('menu.availability') ? '<button class="btn ' + (it.visible ? 'btn-ghost' : 'btn-frost') + ' sm" data-avail="' + esc(it.id) + '" type="button">' + (it.visible ? 'Out of stock' : 'Available') + '</button>' : '') +
        (canEdit ? '<button class="btn btn-ghost sm" data-edit="' + esc(it.id) + '" type="button">Edit</button>' : '') +
        '</div></div>';
    }).join('') || '<p class="muted">' + (q ? 'No dish matches.' : 'No dishes yet.') + '</p>';
    $('menuList').querySelectorAll('[data-edit]').forEach(function (b) { b.onclick = function () { openDish(findDish(b.getAttribute('data-edit'))); }; });
    $('menuList').querySelectorAll('[data-avail]').forEach(function (b) {
      b.onclick = function () {
        var it = findDish(b.getAttribute('data-avail')); busy(b, true);
        api({ action: 'menuSetAvailable', id: it.id, visible: !it.visible }).then(function (r) {
          toast(r.item.visible ? it.name + ' is available' : it.name + ' marked out of stock'); return loadMenu();
        }).catch(function (e) { toast(e.message, true); busy(b, false); });
      };
    });
  }
  $('menuSearch').oninput = renderMenu;
  function findDish(id) { return menuItems.filter(function (x) { return x.id === id; })[0]; }
  $('addDishBtn').onclick = function () { openDish(null); };
  function openDish(it) {
    var isNew = !it;
    it = it || { id: '', name: '', note: '', price: '', image: '', sort: menuItems.length + 1, special: '', visible: true };
    var dE = isNew ? '' : (can('menu.edit') ? '' : ' disabled'), dP = isNew || can('menu.price') ? '' : ' disabled';
    var dA = isNew || can('menu.availability') ? '' : ' disabled';
    openSheet('<h2>' + (isNew ? 'Add a dish' : 'Edit dish') + '</h2>' +
      (it.updatedBy ? '<p class="hint">Last changed by ' + esc(it.updatedBy) + ' · ' + esc(it.updatedAt) + '</p>' : '') +
      '<label for="dName">Name</label><input id="dName" maxlength="60" value="' + esc(it.name) + '"' + dE + ' />' +
      '<label for="dNote">Short description</label><input id="dNote" maxlength="140" value="' + esc(it.note) + '"' + dE + ' />' +
      '<div class="row2"><div><label for="dPrice">Price (£)</label><input id="dPrice" type="number" inputmode="decimal" step="0.01" min="0" max="500" value="' + esc(it.price) + '"' + dP + ' /></div>' +
      '<div><label for="dSort">Order on menu</label><input id="dSort" type="number" inputmode="numeric" step="1" min="0" value="' + esc(it.sort) + '"' + dE + ' /></div></div>' +
      (dE ? '' : '<button type="button" class="btn btn-ghost sm" id="dPick">Choose photo</button><input id="dFile" type="file" accept="image/*" class="hidden" />') +
      '<div class="preview"><img id="dPrev" alt="" /><span class="hint" id="dPrevTxt"></span></div>' +
      '<label for="dImage">or paste a link</label><input id="dImage" value="' + esc(it.image) + '" placeholder="https://… or img/chai.jpg"' + dE + ' />' +
      (dE ? '' : '<div class="chips" id="dChips">' + IMAGES.map(function (src) { return '<button type="button" class="chip" data-img="' + src + '"><img src="' + src + '" alt="" /></button>'; }).join('') + '</div>') +
      '<div class="row2"><div><label for="dSpecial">Tag</label><select id="dSpecial"' + dE + '><option value="">None</option><option value="weekend">Weekend special</option></select></div>' +
      '<div><label for="dVisible">On the menu</label><select id="dVisible"' + dA + '><option value="true">Available</option><option value="false">Out of stock (hidden)</option></select></div></div>' +
      (!isNew && !can('menu.price') ? '<p class="hint">Your account cannot change prices.</p>' : '') +
      '<p class="msg" id="dMsg"></p>' +
      '<div class="row2"><button class="btn btn-ghost" id="dCancel" type="button">Cancel</button><button class="btn btn-primary" id="dSave" type="button">' + (isNew ? 'Add dish' : 'Save') + '</button></div>' +
      (!isNew && can('menu.delete') ? '<button class="btn btn-danger" id="dDelete" type="button">Delete this dish</button>' : ''));
    $('dSpecial').value = it.special || ''; $('dVisible').value = it.visible === false ? 'false' : 'true';
    function prev() {
      var v = $('dImage').value.trim();
      $('dPrev').src = v || 'img/logo.png'; $('dPrevTxt').textContent = v ? '' : 'No photo – the logo is shown';
      document.querySelectorAll('#dChips .chip').forEach(function (c) { c.classList.toggle('on', c.getAttribute('data-img') === v); });
    }
    $('dImage').oninput = prev; prev();
    document.querySelectorAll('#dChips .chip').forEach(function (c) { c.onclick = function () { $('dImage').value = c.getAttribute('data-img'); prev(); }; });
    if ($('dPick')) {
      $('dPick').onclick = function () { $('dFile').click(); };
      $('dFile').onchange = function () {
        var file = $('dFile').files && $('dFile').files[0];
        $('dFile').value = '';
        if (!file) return;
        var btn = $('dPick');
        busy(btn, true);
        $('dPrevTxt').textContent = 'Preparing photo…';
        shrinkPhoto(file, function (dataUrl, raw) {
          $('dPrev').src = dataUrl;
          $('dPrevTxt').textContent = 'Uploading…';
          api({ action: 'imageUpload', data: raw, mimeType: 'image/jpeg', filename: (file.name || 'dish') + '.jpg' }).then(function (r) {
            $('dImage').value = r.url; prev(); $('dPrevTxt').textContent = 'Photo ready – tap Save to keep it';
            busy(btn, false);
          }).catch(function (e) {
            $('dPrevTxt').textContent = e.message || 'Upload failed';
            busy(btn, false);
          });
        }, function (msg) {
          $('dPrevTxt').textContent = msg;
          busy(btn, false);
        });
      };
    }
    $('dCancel').onclick = closeSheet;
    $('dSave').onclick = function () {
      var item = { id: it.id };
      if (isNew || can('menu.edit')) { item.name = $('dName').value; item.note = $('dNote').value; item.image = $('dImage').value; item.sort = $('dSort').value; item.special = $('dSpecial').value; }
      if (isNew || can('menu.price')) item.price = $('dPrice').value;
      if (isNew || can('menu.availability')) item.visible = $('dVisible').value === 'true';
      if (('price' in item) && (item.price === '' || isNaN(Number(item.price)))) { $('dMsg').textContent = 'Type a price, e.g. 4.50'; return; }
      if (('name' in item) && !String(item.name).trim()) { $('dMsg').textContent = 'Type the dish name'; return; }
      busy($('dSave'), true);
      api({ action: 'menuSave', item: item }).then(function (r) {
        closeSheet(); toast(r.unchanged ? 'Nothing changed' : (isNew ? 'Dish added' : 'Saved')); loadMenu();
      }).catch(function (e) { $('dMsg').textContent = e.message; busy($('dSave'), false); });
    };
    if ($('dDelete')) $('dDelete').onclick = function () {
      confirmSheet('Delete ' + it.name + '?', 'It disappears from the customer menu straight away. The activity log keeps a copy of its details.', 'Delete', true).then(function (ok) {
        if (!ok) return;
        api({ action: 'menuDelete', id: it.id }).then(function () { toast('Deleted ' + it.name); loadMenu(); }).catch(function (e) { toast(e.message, true); });
      });
    };
  }

  /* ---------- codes ---------- */
  $('verifyBtn').onclick = function () {
    var code = $('redeemCode').value.trim();
    api({ action: 'verify', code: code }).then(function (r) {
      var box = $('redeemResult'); pendingRedeem = null;
      if (!r.found) { box.innerHTML = '<span class="badge warn">Not found</span> No matching code.'; show('redeemBtn', false); return; }
      var w = r.win; pendingRedeem = w;
      box.innerHTML = '<b>' + esc(w.title) + '</b> <span class="muted">' + esc(w.subtitle) + '</span><br>Code <b>' + esc(w.code) + '</b> · Table ' + esc(w.table || '—') + '<br>' +
        (w.status === 'redeemed' ? '<span class="badge warn">Already used</span> by ' + esc(w.redeemedBy) + ' · ' + esc(w.redeemedAt)
          : (w.prizeId === 'pnothing' ? '<span class="badge">No prize</span>' : '<span class="badge ok">Valid – not used yet</span>'));
      show('redeemBtn', w.status !== 'redeemed' && w.prizeId !== 'pnothing');
    }).catch(function (e) { toast(e.message, true); });
  };
  $('redeemBtn').onclick = function () {
    if (!pendingRedeem) return;
    api({ action: 'redeem', code: pendingRedeem.code }).then(function () { toast('Marked as used'); show('redeemBtn', false); loadWins(); $('verifyBtn').click(); })
      .catch(function (e) { toast(e.message, true); });
  };
  function loadWins() {
    api({ action: 'winsRecent' }).then(function (r) {
      $('winsList').innerHTML = (r.wins || []).map(function (w) {
        return '<div class="win"><b>' + esc(w.code) + '</b> ' + esc(w.title) + ' <span class="badge ' + (w.status === 'redeemed' ? 'warn' : 'ok') + '">' + esc(w.status) + '</span>' +
          '<div class="muted">Table ' + esc(w.table || '—') + ' · ' + esc(w.drawnAt || '') + '</div></div>';
      }).join('') || 'No codes yet';
    }).catch(function () {});
  }

  /* ---------- scratch ---------- */
  function renderPrizeEditor(prizes) {
    $('prizeEditor').innerHTML = (prizes || []).map(function (p) {
      return '<div class="entry pz"><div class="row2"><div><label>Prize id</label><input data-f="id" value="' + esc(p.id) + '" /></div>' +
        '<div><label>Count in pool</label><input data-f="count" type="number" min="0" inputmode="numeric" value="' + (p.count || 0) + '" /></div></div>' +
        '<label>Title</label><input data-f="title" value="' + esc(p.title) + '" /><label>Subtitle</label><input data-f="subtitle" value="' + esc(p.subtitle) + '" /></div>';
    }).join('');
  }
  function readPrizeEditor() {
    return Array.prototype.map.call(document.querySelectorAll('#prizeEditor .pz'), function (el) {
      var v = function (f) { return el.querySelector('[data-f=' + f + ']').value.trim(); };
      return { id: v('id'), title: v('title'), subtitle: v('subtitle'), count: parseInt(v('count') || '0', 10) };
    });
  }
  function loadScratch() {
    api({ action: 'scratchStatus' }).then(function (r) {
      $('scratchSummary').textContent = 'Pool ' + r.poolSize + ' · available ' + r.available + ' · drawn ' + r.drawn + ' · next #' + r.nextCardIndex + (r.active ? '' : ' · OFF');
      $('prizeStats').innerHTML = Object.keys(r.byPrize || {}).map(function (id) {
        var p = r.byPrize[id];
        return '<div class="entry"><b>' + esc(p.title) + '</b><div class="det">planned ' + p.planned + ' · left ' + p.remaining + ' · drawn ' + p.drawn + '</div></div>';
      }).join('');
      $('poolSize').value = r.poolSize; $('scratchActive').value = r.active ? 'true' : 'false';
      renderPrizeEditor(r.prizes || []);
    }).catch(function (e) { toast(e.message, true); });
  }
  $('addPrizeBtn').onclick = function () { var l = readPrizeEditor(); l.push({ id: 'p' + Date.now().toString(36), title: 'New prize', subtitle: '', count: 0 }); renderPrizeEditor(l); };
  $('saveOddsBtn').onclick = function () {
    api({ action: 'scratchConfigSave', poolSize: parseInt($('poolSize').value || '0', 10), active: $('scratchActive').value === 'true', prizes: readPrizeEditor() })
      .then(function (r) { toast(r.note || 'Odds saved'); loadScratch(); }).catch(function (e) { toast(e.message, true); });
  };
  $('refillBtn').onclick = function () {
    confirmSheet('Refill the pool?', 'All unused cards are replaced by a new shuffled pool from these odds.', 'Refill', true).then(function (ok) {
      if (!ok) return;
      api({ action: 'scratchRefill' }).then(function (r) { toast('Refilled ' + r.poolSize + ' cards'); loadScratch(); }).catch(function (e) { toast(e.message, true); });
    });
  };

  /* ---------- people (owners) ---------- */
  function status(p) {
    if (!p.active) return '<span class="badge bad">Off</span>';
    if (p.locked) return '<span class="badge warn">Locked</span>';
    if (p.mustChange) return '<span class="badge warn">First login due</span>';
    return '<span class="badge ok">Active</span>';
  }
  function loadPeople() {
    return api({ action: 'usersList' }).then(function (r) {
      people = r.users || [];
      people.sort(function (a, b) { return (a.role === b.role ? 0 : a.role === 'owner' ? -1 : 1) || a.displayName.localeCompare(b.displayName); });
      $('peopleList').innerHTML = people.map(function (p) {
        return '<div class="person" data-person="' + esc(p.username) + '" role="button" tabindex="0"><div><b>' + esc(p.displayName) + '</b>' +
          (p.username === me.username ? ' <span class="muted">(you)</span>' : '') +
          '<div class="muted">@' + esc(p.username) + ' · ' + (p.role === 'owner' ? 'Owner' : 'Employee') + (p.lastLogin ? ' · last in ' + esc(p.lastLogin.slice(0, 16)) : ' · never logged in') + '</div></div>' +
          '<div>' + status(p) + '</div></div>';
      }).join('') || '<p class="muted">Nobody yet</p>';
      $('peopleList').querySelectorAll('[data-person]').forEach(function (el) { el.onclick = function () { openPerson(el.getAttribute('data-person')); }; });
    }).catch(function (e) { toast(e.message, true); });
  }
  $('addPersonBtn').onclick = function () {
    openSheet('<h2>Add employee</h2><p class="hint">Type their name. A username and a first password are made for you.</p>' +
      '<label for="npName">Name</label><input id="npName" maxlength="40" autocomplete="off" placeholder="e.g. Priya Sharma" />' +
      '<label for="npRole">Role</label><select id="npRole"><option value="staff">Employee – limited</option><option value="owner">Owner – can do everything</option></select>' +
      '<p class="msg" id="npMsg"></p><div class="row2"><button class="btn btn-ghost" id="npCancel" type="button">Cancel</button>' +
      '<button class="btn btn-primary" id="npSave" type="button">Create login</button></div>');
    $('npCancel').onclick = closeSheet;
    $('npSave').onclick = function () {
      var name = $('npName').value.trim();
      if (!name) { $('npMsg').textContent = 'Type their name'; return; }
      busy($('npSave'), true);
      api({ action: 'userAdd', user: { displayName: name, role: $('npRole').value } }).then(function (r) {
        secretSheet('Login created', r.displayName, r.username, r.tempPassword); loadPeople();
      }).catch(function (e) { $('npMsg').textContent = e.message; busy($('npSave'), false); });
    };
  };
  function openPerson(u) {
    var p = people.filter(function (x) { return x.username === u; })[0]; if (!p) return;
    var self = p.username === me.username;
    openSheet('<h2>' + esc(p.displayName) + '</h2>' +
      '<div class="kv"><b>Username</b><span>' + esc(p.username) + '</span><b>Role</b><span>' + (p.role === 'owner' ? 'Owner' : 'Employee') + '</span>' +
      '<b>Status</b><span>' + status(p) + '</span><b>Last log in</b><span>' + esc(p.lastLogin || 'never') + '</span>' +
      '<b>Added</b><span>' + esc(p.createdAt || '—') + (p.createdBy ? ' by ' + esc(p.createdBy) : '') + '</span></div>' +
      (self ? '<p class="hint">This is you. Change your own password on the Me tab.</p>' :
        '<button class="btn btn-primary" id="pReset" type="button">Reset password</button>' +
        '<button class="btn btn-ghost" id="pRole" type="button">' + (p.role === 'owner' ? 'Make employee' : 'Make owner') + '</button>' +
        '<button class="btn btn-ghost" id="pActive" type="button">' + (p.active ? 'Switch off (cannot log in)' : 'Switch back on') + '</button>' +
        '<button class="btn btn-danger" id="pRemove" type="button">Remove login</button>') +
      '<p class="msg" id="pMsg"></p><button class="btn btn-ghost" id="pClose" type="button">Close</button>');
    $('pClose').onclick = closeSheet;
    if (self) return;
    var fail = function (e) { if ($('pMsg')) $('pMsg').textContent = e.message; else toast(e.message, true); };
    $('pReset').onclick = function () {
      confirmSheet('Reset ' + p.displayName + '\'s password?', 'They are logged out everywhere and get a new first password (also unlocks a locked account).', 'Reset').then(function (ok) {
        if (!ok) return;
        api({ action: 'userResetPassword', username: p.username }).then(function (r) { secretSheet('New first password', p.displayName, r.username, r.tempPassword); loadPeople(); }).catch(fail);
      });
    };
    $('pRole').onclick = function () {
      var to = p.role === 'owner' ? 'staff' : 'owner';
      api({ action: 'userUpdate', username: p.username, changes: { role: to } }).then(function () { closeSheet(); toast(p.displayName + ' is now ' + (to === 'owner' ? 'an owner' : 'an employee')); loadPeople(); }).catch(fail);
    };
    $('pActive').onclick = function () {
      api({ action: 'userUpdate', username: p.username, changes: { active: !p.active } }).then(function () { closeSheet(); toast(p.displayName + (p.active ? ' switched off' : ' switched on')); loadPeople(); }).catch(fail);
    };
    $('pRemove').onclick = function () {
      confirmSheet('Remove ' + p.displayName + '?', 'Their login is deleted. Tip: "Switch off" instead keeps their name in the history.', 'Remove', true).then(function (ok) {
        if (!ok) return;
        api({ action: 'userRemove', username: p.username }).then(function () { toast('Removed ' + p.displayName); loadPeople(); }).catch(function (e) { toast(e.message, true); });
      });
    };
  }

  /* ---------- activity ---------- */
  function loadActivity() {
    var who = $('actWho').value;
    api({ action: 'activity', user: who, limit: 150 }).then(function (r) {
      var seen = {};
      (r.entries || []).forEach(function (x) { seen[x.who] = 1; });
      if (!who) {
        var opts = '<option value="">Everyone</option>' + Object.keys(seen).sort().map(function (u) { return '<option value="' + esc(u) + '">' + esc(u) + '</option>'; }).join('');
        $('actWho').innerHTML = opts;
      }
      $('actList').innerHTML = (r.entries || []).map(function (x) {
        return '<div class="entry"><div class="top"><b>' + esc(x.action) + '</b><span class="muted">' + esc(x.when) + '</span></div>' +
          '<div class="det">' + esc(x.who) + (x.item ? ' · ' + esc(x.item) : '') + '</div>' + (x.details ? '<div class="det">' + esc(x.details) + '</div>' : '') + '</div>';
      }).join('') || '<p class="muted">Nothing yet</p>';
    }).catch(function (e) { toast(e.message, true); });
  }
  $('actWho').onchange = loadActivity;

  /* ---------- start ---------- */
  if (token && me) {
    api({ action: 'me' }).then(function (r) {
      me = r.user; localStorage.setItem(UK, JSON.stringify(me));
      if (me.mustChangePassword) showChange(false); else showApp();
    }).catch(function (e) { if (e.code !== 'auth') showLogin(e.message); });
  } else {
    showLogin();
  }
})();
