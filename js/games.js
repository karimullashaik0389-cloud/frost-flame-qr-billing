/**
 * Frost & Flame — wait-time games (quiz, puzzle, colour-a-picture).
 * Lightweight, one-handed, no external deps.
 */
(function (global) {
  var QUIZZES = {
    quiz_spice: {
      title: 'Spice check',
      blurb: 'If you want to try this, check your knowledge.',
      q: [
        { q: 'Which spice gives chai its warmth?', a: ['Cardamom', 'Saffron', 'Vanilla'], ok: 0 },
        { q: 'Andhra food is famous for being…', a: ['Very mild', 'Properly spicy', 'Only sweet'], ok: 1 },
        { q: 'Stone ice cream is rolled on…', a: ['A hot stone', 'A frozen stone / cold plate', 'A wooden board'], ok: 1 }
      ]
    },
    quiz_sweet: {
      title: 'Sweet tooth quiz',
      blurb: 'If you want to try this, check your knowledge.',
      q: [
        { q: 'Gulab jamun soaks in…', a: ['Salt water', 'Sugar syrup', 'Coffee'], ok: 1 },
        { q: 'Pistachio is a…', a: ['Berry', 'Nut (well, almost!)', 'Root'], ok: 1 },
        { q: 'Lassi is traditionally made with…', a: ['Yoghurt', 'Coconut milk', 'Almond milk'], ok: 0 }
      ]
    },
    quiz_street: {
      title: 'Street food smarts',
      blurb: 'If you want to try this, check your knowledge.',
      q: [
        { q: 'Chaat usually tastes…', a: ['Only sweet', 'Tangy, spicy, crunchy', 'Bitter'], ok: 1 },
        { q: 'Masala chai means chai with…', a: ['Ice', 'Spices', 'Chocolate'], ok: 1 },
        { q: 'Hackney is in which city?', a: ['Manchester', 'London', 'Birmingham'], ok: 1 }
      ]
    },
    quiz_love: {
      title: 'Couple bites',
      blurb: 'If you want to try this, check your knowledge.',
      q: [
        { q: 'Best way to share a sundae?', a: ['Two spoons', 'Argue forever', 'Flip a coin'], ok: 0 },
        { q: 'Affogato traditionally pours coffee over…', a: ['Cake', 'Ice cream', 'Toast'], ok: 1 },
        { q: '“Masala to my chai” means…', a: ['You complete me', 'Pass the salt', 'Too spicy'], ok: 0 }
      ]
    },
    quiz_kids: {
      title: 'Kids knowledge bites',
      blurb: 'If you want to try this, check your knowledge.',
      q: [
        { q: 'Ice cream melts when it gets…', a: ['Colder', 'Warmer', 'Louder'], ok: 1 },
        { q: 'Which colour is a ripe mango often?', a: ['Blue', 'Yellow / orange', 'Purple'], ok: 1 },
        { q: 'How many spoons for two friends sharing?', a: ['Zero', 'One', 'Two (or more!)'], ok: 2 }
      ]
    }
  };

  function el(html) {
    var d = document.createElement('div');
    d.innerHTML = html.trim();
    return d.firstChild;
  }

  function renderQuiz(host, key) {
    var pack = QUIZZES[key] || QUIZZES.quiz_street;
    var i = 0, score = 0;
    host.innerHTML = '';
    var box = el('<div class="ff-game-box"><h3></h3><p class="ff-game-blurb"></p><div class="ff-game-body"></div></div>');
    box.querySelector('h3').textContent = pack.title;
    box.querySelector('.ff-game-blurb').textContent = pack.blurb;
    host.appendChild(box);
    var body = box.querySelector('.ff-game-body');

    function show() {
      if (i >= pack.q.length) {
        body.innerHTML = '<p class="ff-game-done">Nice one — ' + score + ' / ' + pack.q.length + ' correct. Food will taste even better now 😊</p>';
        return;
      }
      var item = pack.q[i];
      body.innerHTML = '<p class="ff-game-q">' + item.q + '</p><div class="ff-game-opts"></div>';
      var opts = body.querySelector('.ff-game-opts');
      item.a.forEach(function (label, idx) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'ff-game-opt';
        b.textContent = label;
        b.onclick = function () {
          var ok = idx === item.ok;
          if (ok) score++;
          b.classList.add(ok ? 'ok' : 'no');
          Array.prototype.forEach.call(opts.children, function (c) { c.disabled = true; });
          setTimeout(function () { i++; show(); }, 650);
        };
        opts.appendChild(b);
      });
    }
    show();
  }

  function renderPuzzle(host) {
    var tiles = [1, 2, 3, 4, 5, 6, 7, 8, 0];
    function shuffle() {
      for (var n = 0; n < 40; n++) {
        var z = tiles.indexOf(0);
        var moves = [];
        if (z % 3 > 0) moves.push(z - 1);
        if (z % 3 < 2) moves.push(z + 1);
        if (z >= 3) moves.push(z - 3);
        if (z < 6) moves.push(z + 3);
        var m = moves[Math.floor(Math.random() * moves.length)];
        tiles[z] = tiles[m]; tiles[m] = 0;
      }
    }
    shuffle();
    host.innerHTML = '';
    var box = el('<div class="ff-game-box"><h3>Ice-cube slide</h3><p class="ff-game-blurb">If you want to try this, check your knowledge — slide the numbers into order.</p><div class="ff-puzzle"></div><p class="ff-game-done hidden" id="puzzleWon">You did it! 🧊</p></div>');
    host.appendChild(box);
    var grid = box.querySelector('.ff-puzzle');

    function draw() {
      grid.innerHTML = '';
      tiles.forEach(function (v, idx) {
        var c = document.createElement('button');
        c.type = 'button';
        c.className = 'ff-puzzle-tile' + (v === 0 ? ' empty' : '');
        c.textContent = v === 0 ? '' : String(v);
        c.onclick = function () {
          var z = tiles.indexOf(0);
          var sameRow = Math.floor(z / 3) === Math.floor(idx / 3);
          var adj = Math.abs(z - idx) === 1 && sameRow || Math.abs(z - idx) === 3;
          if (!adj) return;
          tiles[z] = v; tiles[idx] = 0;
          draw();
          if (tiles.join('') === '123456780') {
            box.querySelector('#puzzleWon').classList.remove('hidden');
          }
        };
        grid.appendChild(c);
      });
    }
    draw();
  }

  function renderColor(host) {
    host.innerHTML = '';
    var box = el(
      '<div class="ff-game-box">' +
      '<h3>Colour the cone</h3>' +
      '<p class="ff-game-blurb">If you want to try this — tap a colour, then tap a part of the picture.</p>' +
      '<div class="ff-palette" role="list"></div>' +
      '<svg class="ff-color-svg" viewBox="0 0 200 240" aria-label="Colouring picture">' +
      '<path data-part="bg" d="M0 0h200v240H0z" fill="#1a1020"/>' +
      '<ellipse data-part="scoop1" cx="100" cy="78" rx="48" ry="40" fill="#eee"/>' +
      '<ellipse data-part="scoop2" cx="78" cy="58" rx="32" ry="28" fill="#ddd"/>' +
      '<ellipse data-part="scoop3" cx="122" cy="58" rx="32" ry="28" fill="#ccc"/>' +
      '<path data-part="cone" d="M60 100 L100 220 L140 100 Z" fill="#e8c090"/>' +
      '<path data-part="cone" d="M70 120 L100 200 L130 120" fill="none" stroke="#c09060" stroke-width="2"/>' +
      '<circle data-part="cherry" cx="100" cy="42" r="10" fill="#e85d04"/>' +
      '<path data-part="heart" d="M160 30 c0-8 12-8 12 0 c0 10-12 18-12 18 s-12-8-12-18 c0-8 12-8 12 0" fill="#f4a0b0"/>' +
      '</svg>' +
      '<p class="note" style="text-align:left;margin-top:8px">Tip: try pink scoops + golden cone 👑</p>' +
      '</div>'
    );
    host.appendChild(box);
    var colors = ['#e891b0', '#7dd3fc', '#ffe566', '#e85d04', '#86efac', '#c4a1e0', '#fff7f0', '#2d6a4f'];
    var palette = box.querySelector('.ff-palette');
    var chosen = colors[0];
    colors.forEach(function (c, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'ff-swatch' + (i === 0 ? ' on' : '');
      b.style.background = c;
      b.setAttribute('aria-label', 'Colour ' + c);
      b.onclick = function () {
        chosen = c;
        Array.prototype.forEach.call(palette.children, function (x) { x.classList.remove('on'); });
        b.classList.add('on');
      };
      palette.appendChild(b);
    });
    box.querySelectorAll('[data-part]').forEach(function (p) {
      if (p.getAttribute('data-part') === 'bg') return;
      p.style.cursor = 'pointer';
      p.addEventListener('click', function () {
        p.setAttribute('fill', chosen);
      });
    });
  }

  var RENDERERS = {
    quiz_spice: function (h) { renderQuiz(h, 'quiz_spice'); },
    quiz_sweet: function (h) { renderQuiz(h, 'quiz_sweet'); },
    quiz_street: function (h) { renderQuiz(h, 'quiz_street'); },
    quiz_love: function (h) { renderQuiz(h, 'quiz_love'); },
    quiz_kids: function (h) { renderQuiz(h, 'quiz_kids'); },
    puzzle: renderPuzzle,
    color: renderColor
  };

  var LABELS = {
    quiz_spice: { title: 'Spice check', emoji: '🌶️' },
    quiz_sweet: { title: 'Sweet tooth quiz', emoji: '🍮' },
    quiz_street: { title: 'Street food smarts', emoji: '🌮' },
    quiz_love: { title: 'Couple bites', emoji: '💕' },
    quiz_kids: { title: 'Kids knowledge bites', emoji: '🧒' },
    puzzle: { title: 'Ice-cube slide', emoji: '🧊' },
    color: { title: 'Colour the cone', emoji: '🎨' }
  };

  global.FFGames = {
    LABELS: LABELS,
    open: function (host, gameId) {
      var fn = RENDERERS[gameId];
      if (fn) fn(host);
    },
    pickForTheme: function (themeId) {
      var t = global.FFThemes && FFThemes.THEMES[themeId];
      var ids = (t && t.games) || ['quiz_street', 'puzzle'];
      return ids.slice(0, 2);
    }
  };
})(window);
