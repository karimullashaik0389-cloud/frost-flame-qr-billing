/**
 * Frost & Flame — seven guest themes + menu tag ordering.
 * See docs/RESEARCH.md for audience research and chosen features.
 */
(function (global) {
  var THEMES = {
    solo_m: {
      id: 'solo_m',
      label: 'Just me',
      sublabel: 'For him',
      emoji: '🧔',
      title: 'Just you, boss',
      greeting: 'Table for one? Treat yourself today.',
      badge: 'Perfect for one. No sharing needed.',
      badgeShort: 'Perfect for one',
      preferTags: ['solo'],
      feature: 'quick_picks',
      quickPicks: ['pulav', 'chaat', 'stone'],
      lines: [
        'Diet starts Monday. Today is chaat day.',
        'Our chef asked what you want. We told him: everything.'
      ],
      scratchHint: 'Your hand is not lucky today, boss. Give it to your friend.',
      surprise: 'flames',
      games: ['quiz_spice', 'puzzle'],
      fonts: {
        display: '"Bangers", "Comic Sans MS", system-ui, sans-serif',
        body: '"Outfit", system-ui, sans-serif'
      },
      vars: {
        '--bg': '#121212', '--card': '#1c1c1c', '--ink': '#fff8f0', '--muted': '#c9b8a8',
        '--line': '#3d2a1f', '--flame': '#ff6a00', '--frost': '#ffe566', '--gold': '#ffcc33',
        '--accent': '#ff6a00', '--accent2': '#ffe566',
        '--theme-grad': 'linear-gradient(135deg,#2a2a2a,#1a120c 60%,#2a1808)'
      }
    },
    solo_f: {
      id: 'solo_f',
      label: 'Just me',
      sublabel: 'For her',
      emoji: '💁‍♀️',
      title: 'Just for you',
      greeting: 'Table for one? You deserve every bite.',
      badge: 'Just for you, every last bite.',
      badgeShort: 'Just for you',
      preferTags: ['solo'],
      feature: 'treat_set',
      treatSet: { main: 'mango', bite: 'gulab', drink: 'lassi', label: 'Treat-yourself set' },
      lines: [
        'Calories don\'t count when it\'s this cute.',
        'Spice level? Same as my mood. Medium to hot.'
      ],
      scratchHint: 'Scratch gently, you just did your nails!',
      surprise: 'sparkles',
      games: ['color', 'quiz_sweet'],
      fonts: {
        display: '"Pacifico", "Segoe Script", cursive',
        body: '"Outfit", system-ui, sans-serif'
      },
      vars: {
        '--bg': '#2a1824', '--card': '#3a2434', '--ink': '#fff7fb', '--muted': '#e8c9d8',
        '--line': '#5a3a4c', '--flame': '#e891b0', '--frost': '#c4a1e0', '--gold': '#e8c87a',
        '--accent': '#e891b0', '--accent2': '#c4a1e0',
        '--theme-grad': 'linear-gradient(135deg,#3a2434,#2a1824 55%,#3a2840)'
      }
    },
    friends: {
      id: 'friends',
      label: 'Two friends',
      sublabel: 'Exactly two',
      emoji: '👯',
      title: 'Friends night',
      greeting: 'Squad of two? Let\'s eat.',
      badge: 'Great to share',
      badgeShort: 'Great to share',
      preferTags: ['share', 'group'],
      feature: 'who_pays',
      lines: [
        'Friends who chaat together, stay together.',
        'Who\'s paying? Scratch to decide.'
      ],
      scratchHint: 'Not you again! Pass the phone to the lucky one.',
      surprise: 'confetti',
      games: ['quiz_street', 'puzzle'],
      fonts: {
        display: '"Fredoka", "Outfit", system-ui, sans-serif',
        body: '"Outfit", system-ui, sans-serif'
      },
      vars: {
        '--bg': '#0f2a2e', '--card': '#16383c', '--ink': '#f7fffb', '--muted': '#b7e0d6',
        '--line': '#2a5558', '--flame': '#ff7a59', '--frost': '#2ec4b6', '--gold': '#ffe566',
        '--accent': '#ffe566', '--accent2': '#2ec4b6',
        '--theme-grad': 'linear-gradient(135deg,#16383c,#0f2a2e 50%,#1a4048)'
      }
    },
    couple: {
      id: 'couple',
      label: 'Couple',
      sublabel: 'Date night',
      emoji: '💑',
      title: 'For two hearts',
      greeting: 'Two spoons, one table. Welcome.',
      badge: 'Couple dish ❤',
      badgeShort: 'Couple dish ❤',
      preferTags: ['couple', 'share'],
      feature: 'date_pair',
      datePair: { items: { stone: 1, chai: 2, gulab: 1 }, label: 'Date-night pair' },
      lines: [
        'One ice cream, two spoons, zero sharing problems.',
        'You\'re the masala to my chai.'
      ],
      suggestions: [
        'Try this one together',
        'Try this one, it\'s perfect for a couple'
      ],
      scratchHint: 'Whatever you win, it\'s sweeter with them.',
      surprise: 'hearts',
      games: ['quiz_love', 'color'],
      fonts: {
        display: '"Cormorant Garamond", Georgia, serif',
        body: '"Outfit", system-ui, sans-serif'
      },
      vars: {
        '--bg': '#1a080c', '--card': '#2a1018', '--ink': '#fff5f7', '--muted': '#e8b8c4',
        '--line': '#4a2030', '--flame': '#c41e3a', '--frost': '#f4a0b0', '--gold': '#e8c87a',
        '--accent': '#c41e3a', '--accent2': '#e8c87a',
        '--theme-grad': 'linear-gradient(135deg,#2a1018,#1a080c 55%,#2a1420)'
      }
    },
    gang: {
      id: 'gang',
      label: 'Three of us',
      sublabel: 'Gang\'s Night Out',
      emoji: '🌃',
      title: 'The Gang\'s Night Out',
      greeting: 'Squad\'s here! Let\'s eat.',
      badge: 'Group favourite',
      badgeShort: 'Group favourite',
      preferTags: ['group', 'share', 'platter'],
      feature: 'roles',
      lines: [
        'Every group has one friend who says \'just a bite\'. Order extra for them.',
        'Group rule: what\'s ordered at this table, gets shared at this table.'
      ],
      roles: [
        { id: 'foodie', name: 'The Foodie', suggest: 'pulav', line: 'You decide the feast — start with Mutton Pulav.' },
        { id: 'dodger', name: 'The Bill Dodger', suggest: 'chaat', line: 'Keep it light… or pretend to. Flame Chaat is calling.' },
        { id: 'selfie', name: 'The Selfie Taker', suggest: 'stone', line: 'Needs a hero shot — Stone Ice Cream is your backdrop.' }
      ],
      scratchHint: 'Pass it round the circle. Whoever wins buys the next round of chai.',
      surprise: 'neon',
      games: ['quiz_street', 'puzzle'],
      fonts: {
        display: '"Orbitron", "Outfit", system-ui, sans-serif',
        body: '"Special Elite", "Courier New", monospace'
      },
      vars: {
        '--bg': '#060b18', '--card': '#0e1630', '--ink': '#e8fff8', '--muted': '#8ec8c0',
        '--line': '#1e3a50', '--flame': '#ffb347', '--frost': '#2de2c5', '--gold': '#39ff14',
        '--accent': '#2de2c5', '--accent2': '#ffb347',
        '--theme-grad': 'linear-gradient(135deg,#0e1630,#060b18 50%,#0a1a28)'
      }
    },
    family: {
      id: 'family',
      label: 'Four or more',
      sublabel: 'Big Family Feast',
      emoji: '🪔',
      title: 'The Big Family Feast',
      greeting: 'The whole crew is here — nobody leaves hungry.',
      badge: 'Feeds the whole gang',
      badgeShort: 'Feeds the whole gang',
      preferTags: ['platter', 'group', 'share'],
      feature: 'feast',
      feastHelper: true,
      lines: [
        'In our family, nobody leaves hungry. Same rule here.',
        'There\'s always one uncle who orders for everyone. Be that uncle.'
      ],
      scratchHint: 'Pass it to the eldest, they\'ve had the most practice blessing things!',
      surprise: 'petals',
      games: ['color', 'quiz_kids'],
      fonts: {
        display: '"Cinzel", "Cormorant Garamond", serif',
        body: '"Outfit", system-ui, sans-serif'
      },
      vars: {
        '--bg': '#1a1208', '--card': '#2a1e10', '--ink': '#fff8e8', '--muted': '#d4c090',
        '--line': '#4a3820', '--flame': '#e8a020', '--frost': '#2d6a4f', '--gold': '#d4a017',
        '--accent': '#e8a020', '--accent2': '#2d6a4f',
        '--theme-grad': 'linear-gradient(135deg,#2a1e10,#1a1208 55%,#241808)'
      }
    },
    family_kids: {
      id: 'family_kids',
      label: 'Family with kids',
      sublabel: 'Parents + little ones',
      emoji: '👨‍👩‍👧‍👦',
      title: 'Family table',
      greeting: 'Welcome, grown-ups and little legends!',
      badge: 'Kids\' pick · mild & fun',
      badgeShort: 'Kids\' pick',
      preferTags: ['kids', 'solo', 'share'],
      feature: 'kids_picks',
      kidsPicks: ['stone', 'mango', 'lassi', 'gulab'],
      allergenNotes: {
        stone: 'Contains dairy',
        pistachio: 'Contains nuts · dairy',
        mango: 'Mild spice optional',
        chaat: 'Can be spicy',
        chai: 'Contains dairy · warm',
        lassi: 'Contains dairy · mild',
        gulab: 'Contains dairy · sweet',
        pulav: 'Contains meat · ask for mild',
        weekend: 'Contains dairy · caffeine'
      },
      spice: {
        chaat: 'spicy', mango: 'mild-heat', pulav: 'medium',
        stone: 'mild', pistachio: 'mild', lassi: 'mild', gulab: 'mild', chai: 'warm', weekend: 'mild'
      },
      lines: [
        'Little hands, big flavours — start with the kids\' picks.',
        'Parents: order the spicy stuff. Kids: colour the cone while you wait.'
      ],
      scratchHint: 'Grown-up scratches, kid cheers. Pass it if you dare!',
      surprise: 'stars',
      games: ['color', 'quiz_kids'],
      fonts: {
        display: '"Fredoka", "Outfit", system-ui, sans-serif',
        body: '"Outfit", system-ui, sans-serif'
      },
      vars: {
        '--bg': '#0c2744', '--card': '#143556', '--ink': '#f5fbff', '--muted': '#a8d4f0',
        '--line': '#2a5578', '--flame': '#ff8a65', '--frost': '#7dd3fc', '--gold': '#ffe566',
        '--accent': '#5ad67d', '--accent2': '#ff8a65',
        '--theme-grad': 'linear-gradient(135deg,#143556,#0c2744 50%,#1a3a28)'
      }
    }
  };

  var DEFAULT_TAGS = {
    weekend: ['couple', 'share', 'solo', 'kids'],
    pulav: ['solo', 'share', 'group', 'platter'],
    stone: ['solo', 'couple', 'share', 'kids'],
    pistachio: ['solo', 'couple'],
    mango: ['solo', 'couple', 'kids'],
    chaat: ['solo', 'share', 'group', 'friends'],
    chai: ['solo', 'couple', 'group'],
    lassi: ['solo', 'couple', 'kids'],
    gulab: ['couple', 'share', 'kids']
  };

  function scoreItem(tags, preferTags) {
    tags = tags || [];
    var score = 0;
    preferTags.forEach(function (t, i) {
      if (tags.indexOf(t) !== -1) score += (preferTags.length - i) * 10;
    });
    return score;
  }

  function sortKeys(keys, menuMap, themeId) {
    var theme = THEMES[themeId];
    if (!theme) return keys.slice();
    return keys.slice().sort(function (a, b) {
      var ta = (menuMap[a] && menuMap[a].tags) || DEFAULT_TAGS[a] || [];
      var tb = (menuMap[b] && menuMap[b].tags) || DEFAULT_TAGS[b] || [];
      var sa = scoreItem(ta, theme.preferTags);
      var sb = scoreItem(tb, theme.preferTags);
      if (sb !== sa) return sb - sa;
      return keys.indexOf(a) - keys.indexOf(b);
    });
  }

  function isPreferred(key, menuMap, themeId) {
    var theme = THEMES[themeId];
    if (!theme) return false;
    var tags = (menuMap[key] && menuMap[key].tags) || DEFAULT_TAGS[key] || [];
    return scoreItem(tags, theme.preferTags) >= 10;
  }

  function feastQuantities(headcount) {
    var n = Math.max(4, Number(headcount) || 4);
    return {
      pulav: Math.ceil(n / 2),
      chaat: Math.ceil(n / 2),
      stone: Math.ceil(n / 3),
      chai: n,
      note: 'For about ' + n + ' people: ~' + Math.ceil(n / 2) + ' mains to share, ' + Math.ceil(n / 3) + ' desserts, chai for everyone.'
    };
  }

  global.FFThemes = {
    THEMES: THEMES,
    DEFAULT_TAGS: DEFAULT_TAGS,
    sortKeys: sortKeys,
    isPreferred: isPreferred,
    feastQuantities: feastQuantities,
    list: ['solo_m', 'solo_f', 'friends', 'couple', 'gang', 'family', 'family_kids']
  };
})(window);
