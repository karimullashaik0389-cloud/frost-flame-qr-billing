/**
 * Frost & Flame Admin API — Google Apps Script Web App
 * Spreadsheet: Frost & Flame Admin Backend
 * Deploy: Deploy > New deployment > Web app
 *   Execute as: Me
 *   Who has access: Anyone
 * Then paste the /exec URL into js/config.js as FF_API_URL
 */

var SPREADSHEET_ID = '1MJXSMHAB5EqHMkyLoFH26K3fx0gE5ISsXcEaC_u1vsI';
var SESSION_HOURS = 12;

function doGet(e) {
  return json_({ ok: true, service: 'frost-flame-api', hint: 'POST JSON actions' });
}

function doPost(e) {
  try {
    var raw = (e && e.postData && e.postData.contents) ? e.postData.contents : '{}';
    var body = JSON.parse(raw);
    return json_(route_(body || {}));
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function ss_() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function sheet_(name) {
  var sh = ss_().getSheetByName(name);
  if (!sh) throw new Error('Missing sheet: ' + name);
  return sh;
}

function route_(body) {
  var action = String(body.action || '').trim();
  switch (action) {
    case 'menu': return publicMenu_();
    case 'scratch': return publicScratch_(body);
    case 'login': return login_(body);
    case 'logout': return logout_(body);
    case 'me': return requireStaff_(body.token), { ok: true, user: requireStaff_(body.token) };
    case 'menuList': return adminMenuList_(body);
    case 'menuSave': return adminMenuSave_(body);
    case 'menuDelete': return adminMenuDelete_(body);
    case 'scratchStatus': return adminScratchStatus_(body);
    case 'scratchConfigSave': return adminScratchConfigSave_(body);
    case 'scratchRefill': return adminScratchRefill_(body);
    case 'verify': return adminVerify_(body);
    case 'redeem': return adminRedeem_(body);
    case 'winsRecent': return adminWinsRecent_(body);
    case 'staffList': return adminStaffList_(body);
    case 'staffSave': return adminStaffSave_(body);
    case 'staffDelete': return adminStaffDelete_(body);
    case 'changePassword': return adminChangePassword_(body);
    default: return { ok: false, error: 'Unknown action: ' + action };
  }
}

/* ---------- helpers ---------- */

function rowsAsObjects_(sh) {
  var values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values[0].map(function (h) { return String(h).trim(); });
  var out = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    if (row.every(function (c) { return c === '' || c === null; })) continue;
    var obj = { _row: i + 1 };
    headers.forEach(function (h, idx) { obj[h] = row[idx]; });
    out.push(obj);
  }
  return out;
}

function nowIso_() {
  return new Date().toISOString();
}

function sha256_(text) {
  var raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text);
  return raw.map(function (b) {
    var v = (b < 0) ? b + 256 : b;
    return ('0' + v.toString(16)).slice(-2);
  }).join('');
}

function randomToken_() {
  return Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '').slice(0, 16);
}

function randomCode_() {
  var alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  var s = 'FF-';
  for (var i = 0; i < 6; i++) {
    s += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  }
  return s;
}

function truthy_(v) {
  if (v === true || v === 1) return true;
  var s = String(v).trim().toUpperCase();
  return s === 'TRUE' || s === 'YES' || s === '1';
}

/* ---------- public ---------- */

function publicMenu_() {
  var items = rowsAsObjects_(sheet_('Menu'))
    .filter(function (r) { return truthy_(r.visible); })
    .sort(function (a, b) { return Number(a.sort || 0) - Number(b.sort || 0); })
    .map(function (r) {
      return {
        id: String(r.id),
        name: String(r.name || ''),
        note: String(r.note || ''),
        price: Number(r.price) || 0,
        image: String(r.image || ''),
        special: String(r.special || ''),
        sort: Number(r.sort) || 0
      };
    });
  return { ok: true, items: items, source: 'sheet' };
}

function publicScratch_(body) {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var billId = String(body.billId || '').trim();
    var table = String(body.table || '').trim();
    if (!billId) return { ok: false, error: 'billId required' };

    // One scratch per bill
    var wins = rowsAsObjects_(sheet_('Wins'));
    for (var i = 0; i < wins.length; i++) {
      if (String(wins[i].billId) === billId) {
        return {
          ok: true,
          already: true,
          prize: {
            code: String(wins[i].code),
            title: String(wins[i].title),
            subtitle: String(wins[i].subtitle),
            prizeId: String(wins[i].prizeId),
            status: String(wins[i].status || 'drawn')
          }
        };
      }
    }

    var cfg = readScratchConfig_();
    if (!cfg.active) return { ok: false, error: 'Scratch card is turned off' };

    var poolSh = sheet_('ScratchPool');
    var pool = rowsAsObjects_(poolSh);
    var nextIdx = cfg.nextCardIndex; // 1-based cardNo
    var card = null;
    var cardRow = -1;
    for (var p = 0; p < pool.length; p++) {
      if (Number(pool[p].cardNo) === nextIdx && String(pool[p].status) === 'available') {
        card = pool[p];
        cardRow = pool[p]._row;
        break;
      }
    }
    // If exact index missing, take first available
    if (!card) {
      for (var q = 0; q < pool.length; q++) {
        if (String(pool[q].status) === 'available') {
          card = pool[q];
          cardRow = pool[q]._row;
          nextIdx = Number(pool[q].cardNo);
          break;
        }
      }
    }
    if (!card) return { ok: false, error: 'Scratch pool empty — ask staff to refill' };

    var drawnAt = nowIso_();
    poolSh.getRange(cardRow, 6, 1, 3).setValues([['drawn', drawnAt, billId]]); // status, drawnAt, billId

    // Advance nextCardIndex
    setConfigValue_('nextCardIndex', String(nextIdx + 1));

    var isWin = String(card.prizeId) !== 'pnothing';
    sheet_('Wins').appendRow([
      card.code, card.cardNo, card.prizeId, card.title, card.subtitle,
      drawnAt, billId, table, 'drawn', '', ''
    ]);

    return {
      ok: true,
      already: false,
      prize: {
        code: String(card.code),
        title: String(card.title),
        subtitle: String(card.subtitle),
        prizeId: String(card.prizeId),
        status: 'drawn',
        isWin: isWin
      },
      remaining: Math.max(0, cfg.poolSize - nextIdx)
    };
  } finally {
    lock.releaseLock();
  }
}

/* ---------- auth ---------- */

function login_(body) {
  var username = String(body.username || '').trim().toLowerCase();
  var password = String(body.password || '');
  if (!username || !password) return { ok: false, error: 'Username and password required' };

  var staff = rowsAsObjects_(sheet_('Staff'));
  var user = null;
  for (var i = 0; i < staff.length; i++) {
    if (String(staff[i].username).toLowerCase() === username) { user = staff[i]; break; }
  }
  if (!user || !truthy_(user.active)) return { ok: false, error: 'Invalid login' };

  var hash = sha256_(String(user.salt) + password);
  if (hash !== String(user.hash)) return { ok: false, error: 'Invalid login' };

  var token = randomToken_();
  var created = new Date();
  var expires = new Date(created.getTime() + SESSION_HOURS * 3600 * 1000);
  sheet_('Sessions').appendRow([
    token, String(user.username), String(user.role || 'staff'),
    created.toISOString(), expires.toISOString()
  ]);

  return {
    ok: true,
    token: token,
    user: {
      username: String(user.username),
      role: String(user.role || 'staff'),
      displayName: String(user.displayName || user.username)
    },
    expiresAt: expires.toISOString()
  };
}

function logout_(body) {
  var token = String(body.token || '');
  if (!token) return { ok: true };
  var sh = sheet_('Sessions');
  var rows = rowsAsObjects_(sh);
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].token) === token) {
      sh.deleteRow(rows[i]._row);
      break;
    }
  }
  return { ok: true };
}

function requireStaff_(token) {
  token = String(token || '');
  if (!token) throw new Error('Not logged in');
  var rows = rowsAsObjects_(sheet_('Sessions'));
  var now = new Date();
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].token) === token) {
      var exp = new Date(rows[i].expiresAt);
      if (isNaN(exp.getTime()) || exp < now) throw new Error('Session expired — log in again');
      return {
        username: String(rows[i].username),
        role: String(rows[i].role || 'staff')
      };
    }
  }
  throw new Error('Not logged in');
}

function requireOwner_(token) {
  var u = requireStaff_(token);
  if (u.role !== 'owner') throw new Error('Owner only');
  return u;
}

/* ---------- admin menu ---------- */

function adminMenuList_(body) {
  requireStaff_(body.token);
  var items = rowsAsObjects_(sheet_('Menu')).map(function (r) {
    return {
      id: String(r.id),
      name: String(r.name || ''),
      note: String(r.note || ''),
      price: Number(r.price) || 0,
      image: String(r.image || ''),
      visible: truthy_(r.visible),
      sort: Number(r.sort) || 0,
      special: String(r.special || '')
    };
  }).sort(function (a, b) { return a.sort - b.sort; });
  return { ok: true, items: items };
}

function adminMenuSave_(body) {
  requireStaff_(body.token);
  var item = body.item || {};
  var id = String(item.id || '').trim();
  if (!id) {
    id = String(item.name || 'item').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 24);
    if (!id) id = 'item_' + Date.now();
  }
  var sh = sheet_('Menu');
  var rows = rowsAsObjects_(sh);
  var found = null;
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].id) === id) { found = rows[i]; break; }
  }
  var values = [
    id,
    String(item.name || ''),
    String(item.note || ''),
    Number(item.price) || 0,
    String(item.image || ''),
    item.visible === false ? false : true,
    Number(item.sort) || (found ? found.sort : rows.length + 1),
    String(item.special || '')
  ];
  if (found) {
    sh.getRange(found._row, 1, 1, 8).setValues([values]);
  } else {
    sh.appendRow(values);
  }
  return { ok: true, id: id };
}

function adminMenuDelete_(body) {
  requireStaff_(body.token);
  var id = String(body.id || '').trim();
  var sh = sheet_('Menu');
  var rows = rowsAsObjects_(sh);
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].id) === id) {
      sh.deleteRow(rows[i]._row);
      return { ok: true };
    }
  }
  return { ok: false, error: 'Item not found' };
}

/* ---------- scratch admin ---------- */

function readScratchConfig_() {
  var sh = sheet_('ScratchConfig');
  var values = sh.getDataRange().getValues();
  var cfg = { poolSize: 1000, active: true, nextCardIndex: 1, prizes: [] };
  var inPrizes = false;
  for (var i = 0; i < values.length; i++) {
    var a = values[i][0], b = values[i][1], c = values[i][2], d = values[i][3];
    if (String(a) === 'prizeId') { inPrizes = true; continue; }
    if (!inPrizes) {
      var key = String(a);
      if (key === 'poolSize') cfg.poolSize = Number(b) || 1000;
      if (key === 'active') cfg.active = truthy_(b);
      if (key === 'nextCardIndex') cfg.nextCardIndex = Number(b) || 1;
    } else if (a) {
      cfg.prizes.push({
        id: String(a),
        title: String(b || ''),
        subtitle: String(c || ''),
        count: Number(d) || 0
      });
    }
  }
  return cfg;
}

function setConfigValue_(key, value) {
  var sh = sheet_('ScratchConfig');
  var values = sh.getDataRange().getValues();
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0]) === key) {
      sh.getRange(i + 1, 2).setValue(value);
      return;
    }
  }
  // insert near top if missing
  sh.insertRowAfter(1);
  sh.getRange(2, 1, 1, 2).setValues([[key, value]]);
}

function adminScratchStatus_(body) {
  requireStaff_(body.token);
  var cfg = readScratchConfig_();
  var pool = rowsAsObjects_(sheet_('ScratchPool'));
  var available = pool.filter(function (r) { return String(r.status) === 'available'; }).length;
  var drawn = pool.filter(function (r) { return String(r.status) === 'drawn' || String(r.status) === 'redeemed'; }).length;
  var byPrize = {};
  cfg.prizes.forEach(function (p) { byPrize[p.id] = { title: p.title, planned: p.count, remaining: 0, drawn: 0 }; });
  pool.forEach(function (r) {
    var id = String(r.prizeId);
    if (!byPrize[id]) byPrize[id] = { title: String(r.title), planned: 0, remaining: 0, drawn: 0 };
    if (String(r.status) === 'available') byPrize[id].remaining++;
    else byPrize[id].drawn++;
  });
  return {
    ok: true,
    poolSize: cfg.poolSize,
    active: cfg.active,
    nextCardIndex: cfg.nextCardIndex,
    available: available,
    drawn: drawn,
    prizes: cfg.prizes,
    byPrize: byPrize
  };
}

function adminScratchConfigSave_(body) {
  requireOwner_(body.token);
  var prizes = body.prizes || [];
  var poolSize = Number(body.poolSize) || 0;
  var sum = 0;
  prizes.forEach(function (p) { sum += Number(p.count) || 0; });
  if (!prizes.length) return { ok: false, error: 'Add at least one prize' };
  if (poolSize && sum !== poolSize) {
    return { ok: false, error: 'Prize counts (' + sum + ') must equal pool size (' + poolSize + ')' };
  }
  if (!poolSize) poolSize = sum;

  var sh = sheet_('ScratchConfig');
  sh.clear();
  var rows = [
    ['key', 'value'],
    ['poolSize', poolSize],
    ['active', body.active === false ? 'FALSE' : 'TRUE'],
    ['nextCardIndex', String(body.nextCardIndex || 1)],
    ['note', 'Odds are fixed counts in Prizes block below'],
    ['', ''],
    ['prizeId', 'title', 'subtitle', 'count']
  ];
  prizes.forEach(function (p) {
    rows.push([String(p.id || ''), String(p.title || ''), String(p.subtitle || ''), Number(p.count) || 0]);
  });
  sh.getRange(1, 1, rows.length, 4).setValues(rows.map(function (r) {
    while (r.length < 4) r.push('');
    return r.slice(0, 4);
  }));
  return { ok: true, poolSize: poolSize, sum: sum, note: 'Saved. Click Refill pool to apply new odds.' };
}

function adminScratchRefill_(body) {
  requireOwner_(body.token);
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var cfg = readScratchConfig_();
    var sum = 0;
    cfg.prizes.forEach(function (p) { sum += Number(p.count) || 0; });
    if (sum !== cfg.poolSize) {
      return { ok: false, error: 'Prize counts (' + sum + ') must equal pool size (' + cfg.poolSize + ')' };
    }
    var cards = [];
    cfg.prizes.forEach(function (p) {
      for (var i = 0; i < p.count; i++) {
        cards.push({ prizeId: p.id, title: p.title, subtitle: p.subtitle });
      }
    });
    // Fisher-Yates
    for (var i = cards.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = cards[i]; cards[i] = cards[j]; cards[j] = tmp;
    }

    var sh = sheet_('ScratchPool');
    sh.clear();
    var header = [['cardNo', 'code', 'prizeId', 'title', 'subtitle', 'status', 'drawnAt', 'billId', 'redeemedAt', 'redeemedBy']];
    sh.getRange(1, 1, 1, 10).setValues(header);

    var batch = [];
    for (var n = 0; n < cards.length; n++) {
      batch.push([
        n + 1, randomCode_(), cards[n].prizeId, cards[n].title, cards[n].subtitle,
        'available', '', '', '', ''
      ]);
      if (batch.length === 200 || n === cards.length - 1) {
        sh.getRange(sh.getLastRow() + 1, 1, batch.length, 10).setValues(batch);
        batch = [];
      }
    }
    setConfigValue_('nextCardIndex', '1');
    return { ok: true, poolSize: cards.length };
  } finally {
    lock.releaseLock();
  }
}

function adminVerify_(body) {
  requireStaff_(body.token);
  var code = String(body.code || '').trim().toUpperCase();
  if (!code) return { ok: false, error: 'Enter a code' };
  var wins = rowsAsObjects_(sheet_('Wins'));
  for (var i = 0; i < wins.length; i++) {
    if (String(wins[i].code).toUpperCase() === code) {
      return {
        ok: true,
        found: true,
        win: {
          code: String(wins[i].code),
          title: String(wins[i].title),
          subtitle: String(wins[i].subtitle),
          prizeId: String(wins[i].prizeId),
          status: String(wins[i].status || 'drawn'),
          drawnAt: String(wins[i].drawnAt || ''),
          billId: String(wins[i].billId || ''),
          table: String(wins[i].table || ''),
          redeemedAt: String(wins[i].redeemedAt || ''),
          redeemedBy: String(wins[i].redeemedBy || '')
        }
      };
    }
  }
  return { ok: true, found: false };
}

function adminRedeem_(body) {
  var user = requireStaff_(body.token);
  var code = String(body.code || '').trim().toUpperCase();
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sh = sheet_('Wins');
    var wins = rowsAsObjects_(sh);
    for (var i = 0; i < wins.length; i++) {
      if (String(wins[i].code).toUpperCase() === code) {
        if (String(wins[i].status) === 'redeemed') {
          return { ok: false, error: 'Already redeemed', win: wins[i] };
        }
        if (String(wins[i].prizeId) === 'pnothing') {
          return { ok: false, error: 'This code is not a prize' };
        }
        var at = nowIso_();
        sh.getRange(wins[i]._row, 9, 1, 3).setValues([['redeemed', at, user.username]]);
        // also mark pool
        var poolSh = sheet_('ScratchPool');
        var pool = rowsAsObjects_(poolSh);
        for (var p = 0; p < pool.length; p++) {
          if (String(pool[p].code).toUpperCase() === code) {
            poolSh.getRange(pool[p]._row, 6).setValue('redeemed');
            poolSh.getRange(pool[p]._row, 9, 1, 2).setValues([[at, user.username]]);
            break;
          }
        }
        return { ok: true, redeemedAt: at, redeemedBy: user.username };
      }
    }
    return { ok: false, error: 'Code not found' };
  } finally {
    lock.releaseLock();
  }
}

function adminWinsRecent_(body) {
  requireStaff_(body.token);
  var wins = rowsAsObjects_(sheet_('Wins')).slice().reverse().slice(0, 50).map(function (w) {
    return {
      code: String(w.code),
      title: String(w.title),
      status: String(w.status),
      drawnAt: String(w.drawnAt || ''),
      billId: String(w.billId || ''),
      table: String(w.table || ''),
      redeemedAt: String(w.redeemedAt || ''),
      redeemedBy: String(w.redeemedBy || '')
    };
  });
  return { ok: true, wins: wins };
}

/* ---------- staff mgmt ---------- */

function adminStaffList_(body) {
  requireOwner_(body.token);
  var staff = rowsAsObjects_(sheet_('Staff')).map(function (s) {
    return {
      username: String(s.username),
      role: String(s.role || 'staff'),
      active: truthy_(s.active),
      displayName: String(s.displayName || s.username)
    };
  });
  return { ok: true, staff: staff };
}

function adminStaffSave_(body) {
  requireOwner_(body.token);
  var u = body.user || {};
  var username = String(u.username || '').trim().toLowerCase();
  if (!username) return { ok: false, error: 'Username required' };
  var role = (String(u.role || 'staff') === 'owner') ? 'owner' : 'staff';
  var active = u.active === false ? false : true;
  var displayName = String(u.displayName || username);
  var password = String(u.password || '');

  var sh = sheet_('Staff');
  var rows = rowsAsObjects_(sh);
  var found = null;
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].username).toLowerCase() === username) { found = rows[i]; break; }
  }

  if (found) {
    var salt = String(found.salt);
    var hash = String(found.hash);
    if (password) {
      salt = Utilities.getUuid().replace(/-/g, '').slice(0, 16);
      hash = sha256_(salt + password);
    }
    sh.getRange(found._row, 1, 1, 6).setValues([[username, salt, hash, role, active, displayName]]);
  } else {
    if (!password || password.length < 6) return { ok: false, error: 'Password min 6 characters' };
    var salt2 = Utilities.getUuid().replace(/-/g, '').slice(0, 16);
    var hash2 = sha256_(salt2 + password);
    sh.appendRow([username, salt2, hash2, role, active, displayName]);
  }
  return { ok: true, username: username };
}

function adminStaffDelete_(body) {
  var me = requireOwner_(body.token);
  var username = String(body.username || '').trim().toLowerCase();
  if (username === me.username) return { ok: false, error: 'Cannot delete yourself' };
  if (username === 'owner') return { ok: false, error: 'Cannot delete the owner account' };
  var sh = sheet_('Staff');
  var rows = rowsAsObjects_(sh);
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].username).toLowerCase() === username) {
      sh.deleteRow(rows[i]._row);
      return { ok: true };
    }
  }
  return { ok: false, error: 'Not found' };
}

function adminChangePassword_(body) {
  var me = requireStaff_(body.token);
  var password = String(body.password || '');
  if (password.length < 6) return { ok: false, error: 'Password min 6 characters' };
  var sh = sheet_('Staff');
  var rows = rowsAsObjects_(sh);
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].username).toLowerCase() === me.username.toLowerCase()) {
      var salt = Utilities.getUuid().replace(/-/g, '').slice(0, 16);
      var hash = sha256_(salt + password);
      sh.getRange(rows[i]._row, 2, 1, 2).setValues([[salt, hash]]);
      return { ok: true };
    }
  }
  return { ok: false, error: 'Account missing' };
}
