/**
 * Frost & Flame — greeting, theme picker, facts, peace, features, games timer.
 * Hooks into page via window.FFExperience.init({ getMenu, getQty, setQty, renderMenu, renderBill, toast })
 */
(function (global) {
  var STORAGE_THEME = 'ff_theme';
  var STORAGE_ARRIVAL = 'ff_arrival_ts';
  var FACTS = [
    'Stone ice cream is rolled fresh on a frozen plate — that cold slap is why it tastes so creamy.',
    'Masala chai means “spiced tea”. Cardamom, ginger and cloves do the warm work.',
    'Andhra kitchens are famous for proper heat — chilli is a love language.',
    'London’s Hackney Road has fed night owls for decades; you’re in good company.',
    'Lassi cools spice the way a friend cools an argument — quietly, completely.',
    'Gulab means rose; jamun is a fruit. Together they’re syrupy joy.',
    'Chaat comes from “chatna” — to lick — because you chase every last bit.',
    'Pistachios are one of the oldest snack nuts on earth. Fancy and ancient.',
    'A shared dessert at the table raises happiness scores in dining studies. Science says share the scoop.',
    'Frost & Flame sits at 194 Hackney Road, London E2 — Tark Limited’s home of ice and spice.'
  ];

  var state = {
    themeId: null,
    hooks: null,
    gamesShown: false,
    factTimer: null,
    rolePicks: {}
  };

  function $(id) { return document.getElementById(id); }
  function reducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  function timeGreeting() {
    var h = Number(new Date().toLocaleString('en-GB', { timeZone: 'Europe/London', hour: 'numeric', hour12: false }));
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    if (h < 22) return 'Good evening';
    return 'Good evening';
  }
  function params() { return new URLSearchParams(location.search); }
  function isFast() { return params().get('fast') === '1'; }

  function ensureArrival() {
    try {
      if (!sessionStorage.getItem(STORAGE_ARRIVAL)) {
        sessionStorage.setItem(STORAGE_ARRIVAL, String(Date.now()));
      }
    } catch (e) {}
  }
  function arrivalAgeMs() {
    try {
      var t = Number(sessionStorage.getItem(STORAGE_ARRIVAL) || Date.now());
      return Date.now() - t;
    } catch (e) { return 0; }
  }

  function applyThemeVars(theme) {
    var root = document.documentElement;
    Object.keys(theme.vars || {}).forEach(function (k) {
      root.style.setProperty(k, theme.vars[k]);
    });
    root.style.setProperty('--ff-display', theme.fonts.display);
    root.style.setProperty('--ff-body', theme.fonts.body);
    document.body.className = document.body.className
      .split(/\s+/).filter(function (c) { return c && c.indexOf('theme-') !== 0; }).join(' ');
    document.body.classList.add('theme-' + theme.id);
  }

  function burst(kind) {
    var host = $('ffParticles');
    if (!host || reducedMotion()) return;
    host.innerHTML = '';
    var glyphs = {
      flames: ['🔥', '🧊', '😎', '🔥'],
      sparkles: ['✨', '💖', '👑', '🍦'],
      confetti: ['🎉', '🎊', '✨', '🥳'],
      hearts: ['❤️', '💕', '💗', '💞'],
      neon: ['💡', '🌃', '✨', '🟢'],
      petals: ['🌼', '🪔', '✨', '🌺'],
      stars: ['⭐', '🌟', '🎈', '🧒']
    };
    var set = glyphs[kind] || glyphs.confetti;
    for (var i = 0; i < 18; i++) {
      var p = document.createElement('span');
      p.className = 'ff-particle';
      p.textContent = set[i % set.length];
      p.style.left = Math.random() * 100 + '%';
      p.style.animationDuration = (2.2 + Math.random() * 2.2) + 's';
      p.style.animationDelay = (Math.random() * 0.6) + 's';
      p.style.fontSize = (14 + Math.random() * 14) + 'px';
      host.appendChild(p);
    }
    setTimeout(function () { host.innerHTML = ''; }, 4500);
  }

  function showOverlay(show) {
    var o = $('ffOverlay');
    if (!o) return;
    o.classList.toggle('hide', !show);
    o.setAttribute('aria-hidden', show ? 'false' : 'true');
  }

  function renderWhoGrid() {
    var grid = $('ffWhoGrid');
    if (!grid || !global.FFThemes) return;
    grid.innerHTML = '';
    FFThemes.list.forEach(function (id) {
      var t = FFThemes.THEMES[id];
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'ff-who-btn';
      b.setAttribute('data-theme', id);
      b.innerHTML = '<span class="e">' + t.emoji + '</span><b>' + t.label + '</b><span>' + t.sublabel + '</span>';
      b.onclick = function () { selectTheme(id, true); };
      grid.appendChild(b);
    });
  }

  function rotateLines(theme) {
    var box = $('ffLines');
    if (!box) return;
    var lines = (theme.lines || []).slice();
    var i = 0;
    function paint() {
      box.innerHTML = '<span class="tag">For your table</span>' + (lines[i] || '');
      i = (i + 1) % Math.max(lines.length, 1);
    }
    paint();
    if (state.lineTimer) clearInterval(state.lineTimer);
    state.lineTimer = setInterval(paint, 6000);
  }

  function startFacts() {
    var el = $('ffFactText');
    if (!el) return;
    var i = Math.floor(Math.random() * FACTS.length);
    function show() {
      el.classList.add('fade');
      setTimeout(function () {
        el.textContent = FACTS[i];
        el.classList.remove('fade');
        i = (i + 1) % FACTS.length;
      }, reducedMotion() ? 0 : 280);
    }
    show();
    if (state.factTimer) clearInterval(state.factTimer);
    state.factTimer = setInterval(show, 9000);
  }

  function updateScratchHint(theme) {
    var note = $('scratchNote');
    if (note && theme.scratchHint) {
      var prev = note.getAttribute('data-base') || note.textContent || '';
      if (!note.getAttribute('data-base')) note.setAttribute('data-base', prev);
      note.textContent = theme.scratchHint + (prev && prev.indexOf('Offline') !== -1 ? ' · Offline demo card — not redeemable.' : '');
    }
    var sub = $('prizeSub');
    if (sub && theme.scratchHint) sub.setAttribute('data-theme-hint', theme.scratchHint);
  }

  function renderFeature(theme) {
    var host = $('ffFeature');
    if (!host) return;
    host.innerHTML = '';
    host.classList.remove('hidden');
    var h = state.hooks;
    if (theme.feature === 'quick_picks') {
      var picks = theme.quickPicks || [];
      var menu = h.getMenu();
      host.innerHTML = '<div class="card ff-feature-card"><h2>⚡ Quick picks for one</h2><p class="sub" style="margin:0 0 10px">One tap. No scrolling. Boss mode.</p><div class="ff-quick"></div></div>';
      var q = host.querySelector('.ff-quick');
      picks.forEach(function (id) {
        var m = menu[id]; if (!m) return;
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'ff-quick-btn';
        b.innerHTML = '<b>' + m.name + '</b><span>' + '£' + Number(m.price).toFixed(2) + ' · add</span>';
        b.onclick = function () {
          var qty = h.getQty(); qty[id] = (qty[id] || 0) + 1; h.setQty(qty); h.renderMenu(); h.renderBill();
          if (h.toast) h.toast('Added ' + m.name);
        };
        q.appendChild(b);
      });
    } else if (theme.feature === 'treat_set') {
      var s = theme.treatSet;
      host.innerHTML = '<div class="card ff-feature-card"><h2>💕 ' + s.label + '</h2><p class="sub" style="margin:0 0 10px">One main, one sweet bite, one cool drink — just for you.</p><button type="button" class="btn btn-primary" id="ffTreatBtn">Add this set</button></div>';
      $('ffTreatBtn').onclick = function () {
        var qty = h.getQty();
        [s.main, s.bite, s.drink].forEach(function (id) { qty[id] = (qty[id] || 0) + 1; });
        h.setQty(qty); h.renderMenu(); h.renderBill();
        if (h.toast) h.toast('Treat set added. Enjoy every bite.');
      };
    } else if (theme.feature === 'who_pays') {
      host.innerHTML = '<div class="card ff-feature-card"><h2>🎲 Who\'s paying?</h2><p class="sub" style="margin:0 0 10px">Tap to decide. Equal split always works too.</p><div class="ff-pay-row"><button type="button" class="ff-pay" data-p="A">Friend A</button><button type="button" class="ff-pay" data-p="B">Friend B</button><button type="button" class="ff-pay" data-p="S">Split equal</button></div><p class="ff-pay-out" id="ffPayOut"></p></div>';
      host.querySelectorAll('.ff-pay').forEach(function (b) {
        b.onclick = function () {
          var p = b.getAttribute('data-p');
          var out = $('ffPayOut');
          if (p === 'S') out.textContent = 'Fair play — split the bill equal. Friendship saved.';
          else out.textContent = (Math.random() < 0.5 && p === 'A' ? 'Friend A' : p === 'A' ? 'Friend A' : 'Friend B') + ' is buying… unless you scratch to overturn!';
          if (p !== 'S') {
            out.textContent = (Math.random() < 0.5 ? 'Friend A' : 'Friend B') + ' pays this round. Loser gets the next chai.';
          }
        };
      });
    } else if (theme.feature === 'date_pair') {
      var dp = theme.datePair;
      host.innerHTML = '<div class="card ff-feature-card"><h2>💘 ' + dp.label + '</h2><p class="sub" style="margin:0 0 10px">Stone to share + Gulab Bite + two Masala Chais. Complementary, not copies.</p><button type="button" class="btn btn-primary" id="ffPairBtn">Add the pair</button></div>';
      $('ffPairBtn').onclick = function () {
        var qty = h.getQty();
        Object.keys(dp.items).forEach(function (id) { qty[id] = (qty[id] || 0) + dp.items[id]; });
        h.setQty(qty); h.renderMenu(); h.renderBill();
        if (h.toast) h.toast('Date-night pair added. Two spoons ready.');
      };
    } else if (theme.feature === 'roles') {
      host.innerHTML = '<div class="card ff-feature-card"><h2>🎬 Who\'s who in your group?</h2><p class="sub" style="margin:0 0 10px">Pick a role — we add a dish idea to the table.</p><div class="ff-roles" id="ffRoles"></div><div class="ff-table-picks" id="ffTablePicks"><span class="muted">Table picks will show here.</span></div></div>';
      var roles = host.querySelector('#ffRoles');
      (theme.roles || []).forEach(function (r) {
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'ff-role';
        b.innerHTML = '<b>' + r.name + '</b><span>' + r.line + '</span>';
        b.onclick = function () {
          state.rolePicks[r.id] = r;
          b.classList.add('on');
          var qty = h.getQty();
          qty[r.suggest] = (qty[r.suggest] || 0) + 1;
          h.setQty(qty); h.renderMenu(); h.renderBill();
          paintTablePicks();
          if (h.toast) h.toast(r.name + ' added their pick');
        };
        roles.appendChild(b);
      });
      paintTablePicks();
    } else if (theme.feature === 'feast') {
      var fq = FFThemes.feastQuantities(6);
      host.innerHTML = '<div class="card ff-feature-card ff-feast"><h2>🍲 Build your feast</h2><label>How many at the table? <input id="ffHeadcount" type="number" min="4" max="24" value="6" /></label><p id="ffFeastNote">' + fq.note + '</p><button type="button" class="btn btn-primary" id="ffFeastBtn">Fill the table</button></div>';
      function refreshNote() {
        var n = Number($('ffHeadcount').value) || 6;
        var q = FFThemes.feastQuantities(n);
        $('ffFeastNote').textContent = q.note + ' Got enough? Tap fill when ready.';
      }
      $('ffHeadcount').oninput = refreshNote;
      $('ffFeastBtn').onclick = function () {
        var n = Number($('ffHeadcount').value) || 6;
        var q = FFThemes.feastQuantities(n);
        var qty = h.getQty();
        qty.pulav = q.pulav; qty.chaat = q.chaat; qty.stone = q.stone; qty.chai = q.chai;
        h.setQty(qty); h.renderMenu(); h.renderBill();
        if (h.toast) h.toast('Feast loaded for ' + n + '. Nobody leaves hungry.');
      };
    } else if (theme.feature === 'kids_picks') {
      var menu = h.getMenu();
      host.innerHTML =
        '<div class="ff-family-zones">' +
          '<div class="card ff-feature-card ff-zone-kids" id="ffZoneKids">' +
            '<div class="ff-zone-label">🧒 Kids\' zone</div>' +
            '<h2>Colour while you wait</h2>' +
            '<p class="sub" style="margin:0 0 10px">Little hands stay busy here. Tap a colour, then tap the cone.</p>' +
            '<div id="ffKidsColorHost"></div>' +
            '<h3 style="margin:14px 0 8px;font-size:15px">Kids\' picks</h3>' +
            '<div class="ff-quick" id="ffKidsQuick"></div>' +
          '</div>' +
          '<div class="card ff-feature-card ff-zone-adults" id="ffZoneAdults">' +
            '<div class="ff-zone-label">👩‍👦 Adults\' zone</div>' +
            '<h2>Quick facts for grown-ups</h2>' +
            '<p class="sub" style="margin:0 0 10px">Spice, allergens and a calm bite of knowledge while the kids colour.</p>' +
            '<div class="ff-adult-fact" id="ffAdultFact"></div>' +
            '<ul class="ff-adult-tips" id="ffAdultTips"></ul>' +
          '</div>' +
        '</div>';
      var q = host.querySelector('#ffKidsQuick');
      (theme.kidsPicks || []).forEach(function (id) {
        var m = menu[id]; if (!m) return;
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'ff-quick-btn';
        var aller = (theme.allergenNotes && theme.allergenNotes[id]) || 'Kids\' favourite';
        b.innerHTML = '<b>' + m.name + '</b><span>' + aller + ' · £' + Number(m.price).toFixed(2) + '</span>';
        b.onclick = function () {
          var qty = h.getQty(); qty[id] = (qty[id] || 0) + 1; h.setQty(qty); h.renderMenu(); h.renderBill();
          if (h.toast) h.toast('Kids\' pick added: ' + m.name);
        };
        q.appendChild(b);
      });
      if (global.FFGames) FFGames.open(host.querySelector('#ffKidsColorHost'), 'color');
      var tips = host.querySelector('#ffAdultTips');
      var tipLines = [
        'Ask staff to keep spice mild on kids\' plates.',
        'Dairy notes are on each kids\' pick — pistachio has nuts.',
        'Stone ice cream is a safe crowd-pleaser for most ages.',
        'You can change theme anytime with the Change button above.'
      ];
      tips.innerHTML = tipLines.map(function(t){ return '<li>' + t + '</li>'; }).join('');
      var af = host.querySelector('#ffAdultFact');
      var ai = 0;
      function spinAdult() {
        af.textContent = FACTS[ai % FACTS.length];
        ai++;
      }
      spinAdult();
      if (state.adultFactTimer) clearInterval(state.adultFactTimer);
      state.adultFactTimer = setInterval(spinAdult, 8000);
    } else {
      host.classList.add('hidden');
    }
  }

  function paintTablePicks() {
    var el = $('ffTablePicks');
    if (!el) return;
    var keys = Object.keys(state.rolePicks);
    if (!keys.length) { el.innerHTML = '<span class="muted">Table picks will show here.</span>'; return; }
    el.innerHTML = '<b>Table picks</b><ul style="margin:6px 0 0;padding-left:18px">' +
      keys.map(function (k) {
        var r = state.rolePicks[k];
        return '<li>' + r.name + ' → ' + r.suggest + '</li>';
      }).join('') + '</ul>';
  }

  function updateThemeBar(theme) {
    var bar = $('ffThemeBar');
    var chip = $('ffThemeChip');
    if (bar) bar.classList.remove('hidden');
    if (chip) chip.innerHTML = '<span>' + theme.emoji + '</span><b>' + theme.title + '</b>';
  }

  function selectTheme(id, fromPicker) {
    var theme = FFThemes.THEMES[id];
    if (!theme) return;
    state.themeId = id;
    state.rolePicks = {};
    try { sessionStorage.setItem(STORAGE_THEME, id); } catch (e) {}
    applyThemeVars(theme);
    updateThemeBar(theme);
    rotateLines(theme);
    updateScratchHint(theme);
    renderFeature(theme);
    if (fromPicker) burst(theme.surprise);
    showOverlay(false);
    if (state.hooks && state.hooks.renderMenu) state.hooks.renderMenu();
    var greet = $('ffThemeGreet');
    if (greet) greet.textContent = theme.greeting;
  }

  function openPicker(step) {
    var greetCard = $('ffGreetCard');
    var whoCard = $('ffWhoCard');
    showOverlay(true);
    if (step === 'who') {
      if (greetCard) greetCard.classList.add('hidden');
      if (whoCard) whoCard.classList.remove('hidden');
    } else {
      if (greetCard) {
        greetCard.classList.remove('hidden');
        $('ffGreetTitle').textContent = timeGreeting() + ', welcome to Frost & Flame';
        $('ffGreetSub').textContent = '🔥❄️ A little surprise before the menu — who\'s at your table?';
      }
      if (whoCard) whoCard.classList.add('hidden');
      setTimeout(function () {
        if (greetCard) greetCard.classList.add('hidden');
        if (whoCard) whoCard.classList.remove('hidden');
      }, reducedMotion() ? 400 : 1600);
    }
  }

  function scheduleGames() {
    var delay = isFast() ? 8000 : (5 * 60 * 1000 + Math.random() * 5 * 60 * 1000);
    var left = Math.max(500, delay - arrivalAgeMs());
    setTimeout(showGamesDock, left);
  }

  function showGamesDock() {
    if (state.gamesShown || !state.themeId) return;
    state.gamesShown = true;
    var dock = $('ffGamesDock');
    if (!dock || !global.FFGames) return;
    var ids = FFGames.pickForTheme(state.themeId).slice(0, 2);
    var opts = $('ffGamesOpts');
    opts.innerHTML = '';
    ids.forEach(function (id) {
      var meta = FFGames.LABELS[id] || { title: id, emoji: '🎮' };
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'ff-games-opt';
      b.innerHTML = '<span class="e">' + meta.emoji + '</span><span><b>' + meta.title + '</b><br><small style="color:var(--muted)">If you want to try this, check your knowledge.</small></span>';
      b.onclick = function () { openGame(id); };
      opts.appendChild(b);
    });
    dock.classList.add('show');
  }

  function openGame(id) {
    var modal = $('ffGameModal');
    var host = $('ffGameHost');
    if (!modal || !host) return;
    FFGames.open(host, id);
    modal.classList.remove('hidden');
    $('ffGamesDock').classList.remove('show');
  }

  function badgeHtml(theme, key, menu) {
    if (!theme || !FFThemes.isPreferred(key, menu, theme.id)) return '';
    var extra = '';
    if (theme.id === 'couple' && theme.suggestions && theme.suggestions.length) {
      var s = theme.suggestions[Math.floor(Math.random() * theme.suggestions.length)];
      extra = '<span class="ff-suggest">' + s + '</span>';
    }
    if (theme.id === 'family_kids') {
      var spice = theme.spice && theme.spice[key];
      var aller = theme.allergenNotes && theme.allergenNotes[key];
      if (spice) extra += '<span class="ff-badge ff-spice">' + (spice === 'spicy' ? '🌶️ Spicy' : spice === 'mild-heat' ? ' Mild heat' : '✅ Mild') + '</span>';
      if (aller) extra += '<span class="ff-suggest">' + aller + '</span>';
    }
    return '<span class="ff-badge">' + theme.badgeShort + '</span>' + extra;
  }

  function init(hooks) {
    state.hooks = hooks;
    ensureArrival();
    renderWhoGrid();
    startFacts();

    var gTitle = $('ffGreetTitle');
    if (gTitle) gTitle.textContent = timeGreeting() + ', welcome to Frost & Flame';

    $('ffGreetContinue') && ($('ffGreetContinue').onclick = function () {
      $('ffGreetCard').classList.add('hidden');
      $('ffWhoCard').classList.remove('hidden');
    });
    $('ffThemeChange') && ($('ffThemeChange').onclick = function () { openPicker('who'); });
    $('ffGamesClose') && ($('ffGamesClose').onclick = function () { $('ffGamesDock').classList.remove('show'); });
    $('ffGameModalClose') && ($('ffGameModalClose').onclick = function () { $('ffGameModal').classList.add('hidden'); });

    var forced = params().get('group') || params().get('theme');
    var saved = null;
    try { saved = sessionStorage.getItem(STORAGE_THEME); } catch (e) {}
    if (forced && FFThemes.THEMES[forced]) {
      selectTheme(forced, false);
      showOverlay(false);
      if (isFast()) burst(FFThemes.THEMES[forced].surprise);
    } else if (saved && FFThemes.THEMES[saved] && !params().get('fresh')) {
      selectTheme(saved, false);
      showOverlay(false);
    } else {
      openPicker('greet');
    }
    scheduleGames();
    if (isFast()) setTimeout(showGamesDock, 8500);
  }

  global.FFExperience = {
    init: init,
    getThemeId: function () { return state.themeId; },
    getTheme: function () { return state.themeId && FFThemes.THEMES[state.themeId]; },
    badgeHtml: badgeHtml,
    sortKeys: function (keys, menu) {
      return FFThemes.sortKeys(keys, menu, state.themeId || 'solo_m');
    },
    reopenPicker: function () { openPicker('who'); }
  };
})(window);
