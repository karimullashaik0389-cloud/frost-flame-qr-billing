/**
 * Unlock a Deal — short riddles on the QR menu.
 * Answers/codes not stored in plaintext (salted SHA-256 + sealed code).
 * Discount % are OWNER PLACEHOLDERS — not wired to payment.
 */
(function(global){
  var DEAL_CONFIG = {
    /* PLACEHOLDER discounts (%) — owner must confirm before staff honour codes */
    discountPctByTier: { easy: 5, medium: 10, hard: 15 },
    honourNote: 'Preview only. Not applied automatically. If the owner enables a code, show it to staff to redeem.',
    storagePrefix: 'ff_qr_deal_v1_'
  };
  var PUZZLES = [{"id":"e1","tier":"easy","title":"Frost count","prompt":"How many letters in FROST?","placeholder":"number","attempts":5,"discountPct":5,"salt":"a2a6213460510d12f0835522571bb4fb","answerHash":"f50fbacdbaf062e0b8efeed3050c9922f8d8a2775bf07a5d562817ed30b2412f","sealedCode":"9jSMb2w8kPo="},{"id":"e2","tier":"easy","title":"Postcode bite","prompt":"Hackney Road district on our menu (letter+number)?","placeholder":"e.g. E2","attempts":5,"discountPct":5,"salt":"ef00ab8e375f070eef4649248f258b65","answerHash":"d5f9033c56cf4ca678ed4d12008a040e6da1ca767fbaf2171ff56cc5fde796ac","sealedCode":"q9C2B2EMd1g="},{"id":"e3","tier":"easy","title":"Cold half","prompt":"One kitchen, two temperatures. Name the cold side (one word).","placeholder":"word","attempts":5,"discountPct":5,"salt":"98a61539f18d7b5ec8e7398898bb1003","answerHash":"de8a9d91a4afc918e793e3b2041eef80ee8d154ec74a32b92a3040f31bb6c40e","sealedCode":"Vf0tL5YkbzvD0Q=="},{"id":"m1","tier":"medium","title":"Stone mix","prompt":"Unscramble: TONES (how we roll ice cream).","placeholder":"word","attempts":5,"discountPct":10,"salt":"f2a8a7a9c5ff22f3254f6ed1c2d954d3","answerHash":"c2fdbaa739d75a1d882e269d06b4b17066f1b276acf1b8248c3eab0791e305e4","sealedCode":"O07tbuWyBNnFDMo="},{"id":"m2","tier":"medium","title":"Flame flip","prompt":"Type FLAME backwards.","placeholder":"letters","attempts":5,"discountPct":10,"salt":"d040788dd2de6fd89caf23208bae2b7f","answerHash":"7e83d7e61f5e9101f87cfc4f3e21a662ca272ec6d23e4862f736cdd9aad7c3e4","sealedCode":"RLFYvJvR3inOAw=="},{"id":"h1","tier":"hard","title":"Shift cipher","prompt":"Each letter back by 1: GSPTU → ? (cold brand half)","placeholder":"word","attempts":4,"discountPct":15,"salt":"c9c7eadae207e7bbeedcabbb233f677d","answerHash":"cadedd868adb01fd7992ebc1e808e52e7808bed28c139f16ce8dd34b9e47f5e8","sealedCode":"Az5HEJUFlnq1QjU="},{"id":"h2","tier":"hard","title":"Table sum","prompt":"Couple (2) + gang of 3 + one solo = how many people?","placeholder":"number","attempts":4,"discountPct":15,"salt":"679691faca2d04f7c3144681289cd1da","answerHash":"e708fea94d6f635235d1f88eace75c9a2effd6c7f4a9a1060128605445231389","sealedCode":"NZAI6XgGCzkK"},{"id":"h3","tier":"hard","title":"Region heat","prompt":"Blank: _____ pulao (South Indian region on our menu).","placeholder":"one word","attempts":4,"discountPct":15,"salt":"c10ab607b09a9356f361d6404155b6ed","answerHash":"2d181683a126c3eb1f719f4b580ecd6285a65bffd37d3ea5cc3b8f25cde796f7","sealedCode":"wuUQbAceoRUej+Ll"}];

  function norm(s){ return String(s||'').trim().toLowerCase().replace(/\s+/g,' '); }
  function hex(buf){ return Array.prototype.map.call(new Uint8Array(buf), function(b){ return ('0'+b.toString(16)).slice(-2); }).join(''); }
  function sha256(str){
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(str)).then(function(buf){ return new Uint8Array(buf); });
  }
  function attKey(id){ return DEAL_CONFIG.storagePrefix+'att_'+id; }
  function okKey(id){ return DEAL_CONFIG.storagePrefix+'ok_'+id; }
  function getAtt(id){ try{ return Number(localStorage.getItem(attKey(id))||0)||0; }catch(e){ return 0; } }
  function setAtt(id,n){ try{ localStorage.setItem(attKey(id), String(n)); }catch(e){} }
  function getOk(id){ try{ return localStorage.getItem(okKey(id)); }catch(e){ return null; } }
  function setOk(id,c){ try{ localStorage.setItem(okKey(id), c); }catch(e){} }

  function tryAnswer(puzzle, guess){
    var a = norm(guess);
    if(!a) return Promise.resolve({ ok:false, reason:'empty' });
    var used = getAtt(puzzle.id);
    if(used >= puzzle.attempts) return Promise.resolve({ ok:false, reason:'locked', used:used, max:puzzle.attempts });
    return sha256(puzzle.salt+'|'+a).then(function(buf){
      var hash = hex(buf);
      if(hash !== puzzle.answerHash){
        var next = used+1; setAtt(puzzle.id, next);
        var left = puzzle.attempts - next;
        return { ok:false, reason: left<=0?'locked':'wrong', used:next, max:puzzle.attempts, left:left };
      }
      return sha256(puzzle.salt+'|key|'+a).then(function(key){
        var sealed = Uint8Array.from(atob(puzzle.sealedCode), function(c){ return c.charCodeAt(0); });
        var out = new Uint8Array(sealed.length);
        for(var i=0;i<sealed.length;i++) out[i] = sealed[i] ^ key[i % key.length];
        var code = new TextDecoder().decode(out);
        setOk(puzzle.id, code);
        return { ok:true, code:code, discountPct: puzzle.discountPct || DEAL_CONFIG.discountPctByTier[puzzle.tier] };
      });
    });
  }

  function el(html){ var d=document.createElement('div'); d.innerHTML=html.trim(); return d.firstChild; }

  function openModal(){
    var modal = document.getElementById('ffDealModal');
    if(!modal) return;
    modal.classList.remove('hidden');
    renderHome();
  }
  function closeModal(){
    var modal = document.getElementById('ffDealModal');
    if(modal) modal.classList.add('hidden');
  }

  function tierLabel(t){
    return ({ easy:'Easy · quick', medium:'Medium · quick', hard:'Tricky · still short' })[t] || t;
  }

  function renderHome(){
    var host = document.getElementById('ffDealHost');
    if(!host) return;
    var pct = DEAL_CONFIG.discountPctByTier;
    var html = '<div class="ff-deal-box"><h3>Unlock a Deal</h3>'+
      '<p class="ff-game-blurb">Short riddles (under a few minutes). Solve one to reveal a code. Wrong answers use attempts on this device.</p>'+
      '<p class="ff-deal-placeholder">Placeholder discounts for owner to confirm: Easy '+pct.easy+'% · Medium '+pct.medium+'% · Hard '+pct.hard+'%. Not wired to payment.</p>'+
      '<div class="ff-deal-list"></div></div>';
    host.innerHTML = html;
    var list = host.querySelector('.ff-deal-list');
    PUZZLES.forEach(function(p){
      var unlocked = getOk(p.id);
      var used = getAtt(p.id);
      var left = Math.max(0, p.attempts - used);
      var b = document.createElement('button');
      b.type='button'; b.className='ff-deal-card';
      var icon = p.tier==='hard'?'🔒':(p.tier==='medium'?'🧩':'🎁');
      var d = p.discountPct || DEAL_CONFIG.discountPctByTier[p.tier];
      b.innerHTML = '<b>'+icon+' '+p.title+'</b><span>'+tierLabel(p.tier)+' · ~'+d+'% placeholder'+(unlocked?' · unlocked':(left?(' · '+left+' tries left'):' · no tries left'))+'</span>';
      b.onclick = function(){ renderPuzzle(p); };
      list.appendChild(b);
    });
  }

  function renderPuzzle(p){
    var host = document.getElementById('ffDealHost');
    if(!host) return;
    var d = p.discountPct || DEAL_CONFIG.discountPctByTier[p.tier];
    var unlocked = getOk(p.id);
    var used = getAtt(p.id);
    host.innerHTML = '<div class="ff-deal-box"><button type="button" class="ff-deal-back" id="ffDealBack">← All deals</button>'+
      '<h3>'+p.title+'</h3><p class="ff-game-blurb">'+tierLabel(p.tier)+' · placeholder ~'+d+'%</p>'+
      '<p class="ff-game-q">'+p.prompt+'</p><div id="ffDealBody"></div></div>';
    document.getElementById('ffDealBack').onclick = renderHome;
    var body = document.getElementById('ffDealBody');
    if(unlocked){
      body.innerHTML = '<div class="ff-deal-code"><strong>Unlocked</strong><p>Your code: <code id="ffDealCode"></code></p><p class="note"></p></div>';
      body.querySelector('#ffDealCode').textContent = unlocked;
      body.querySelector('.note').textContent = DEAL_CONFIG.honourNote;
      return;
    }
    if(used >= p.attempts){
      body.innerHTML = '<p class="ff-deal-fail">No attempts left on this device for this riddle. Try another — or ask staff kindly.</p>';
      return;
    }
    body.innerHTML = '<label class="ff-deal-label" for="ffDealGuess">Your answer</label>'+
      '<input id="ffDealGuess" class="ff-input" maxlength="40" autocomplete="off" placeholder="'+(p.placeholder||'Answer')+'" />'+
      '<p class="note" id="ffDealStatus">Attempts left: '+(p.attempts-used)+'</p>'+
      '<button type="button" class="btn" id="ffDealUnlock">Unlock</button>';
    function go(){
      tryAnswer(p, document.getElementById('ffDealGuess').value).then(function(res){
        if(res.ok){ renderPuzzle(p); return; }
        if(res.reason==='empty'){ document.getElementById('ffDealStatus').textContent='Type an answer first.'; return; }
        if(res.reason==='locked'){ renderPuzzle(p); return; }
        document.getElementById('ffDealStatus').textContent='Not quite — '+res.left+' attempt'+(res.left===1?'':'s')+' left.';
        document.getElementById('ffDealGuess').value='';
        document.getElementById('ffDealGuess').focus();
      });
    }
    document.getElementById('ffDealUnlock').onclick = go;
    document.getElementById('ffDealGuess').addEventListener('keydown', function(e){ if(e.key==='Enter'){ e.preventDefault(); go(); } });
    setTimeout(function(){ document.getElementById('ffDealGuess').focus(); }, 30);
  }

  function boot(){
    var openBtn = document.getElementById('ffDealOpen');
    var closeBtn = document.getElementById('ffDealClose');
    var modal = document.getElementById('ffDealModal');
    if(openBtn) openBtn.addEventListener('click', openModal);
    if(closeBtn) closeBtn.addEventListener('click', closeModal);
    if(modal) modal.addEventListener('click', function(e){ if(e.target===modal) closeModal(); });
    document.addEventListener('keydown', function(e){ if(e.key==='Escape') closeModal(); });
  }

  global.FFDeals = { open: openModal, close: closeModal, PUZZLES: PUZZLES, DEAL_CONFIG: DEAL_CONFIG, tryAnswer: tryAnswer, boot: boot };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})(window);
