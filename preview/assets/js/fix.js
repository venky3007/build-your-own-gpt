/* "Fix the broken bot" Build track (preview slice: Level 0, Level 1 stub, Level 2, Prompt X-ray, Shift Board).
   Rule-based and offline: every answer comes from build-content.js and the learner's fixes. No network. */
(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const C = () => window.BUILD_CONTENT;
  const FAST = () => !!window.__FAST__ || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const App = () => window.App;
  function FX() {
    const S = App().S(); if (!S.fx || typeof S.fx !== 'object') S.fx = {};
    const f = S.fx; f.lvl = f.lvl || {}; f.fixes = f.fixes || {}; f.tried = f.tried || {}; f.job = f.job || 'hr'; if (f.name == null) f.name = ''; return f;
  }
  const save = () => App().save();
  const J = () => C().jobs.hr;
  const level = (f, opt) => { opt = opt || {}; if (opt.as != null) return opt.as; return f.fixes.drive ? 2 : f.fixes.l1 ? 1 : 0; };
  function answer(item, f, opt) {
    const L = level(f, opt), ok = L >= item.flip;
    let text = ok && item.good ? item.good : (item['a' + Math.min(L, 2)] || item.a0);
    if (!ok && opt && opt.big && L === 1 && /^I don\u2019t know\.$/.test(text)) text = 'I\u2019m afraid I don\u2019t have that information, and I\u2019d hate to guess. Do let me know if there\u2019s anything else at all I can help with today.';
    return { text, ok, cite: L >= 2 && item.cite ? item.cite : null, note: L >= 2 && !ok ? item.note2 : null };
  }
  const okCount = (f, opt) => J().board.filter((it) => answer(it, f, opt).ok).length;
  function cost(f) { const k = C().cost; const c = f.tried.bigOn ? k.big : f.fixes.drive ? k.drive : k.base; return { usd: c[0], sec: c[1] }; }
  function risk(f) {
    const why = []; if (!f.fixes.l1) why.push('makes things up'); why.push('can approve and pay'); why.push('no no-go list');
    return { light: why.length >= 3 ? 'red' : why.length ? 'red' : 'green', why };
  }
  function term(t) { const d = C().terms[t]; return d ? '<button type="button" class="gt-term" data-def="' + esc(d) + '" aria-label="' + esc(t) + ': ' + esc(d) + '">' + esc(t) + '</button>' : esc(t); }
  const withTerms = (s) => esc(s).replace(/\{([^}]+)\}/g, (m, t) => term(t));

  /* ---------- Shift Board strip ---------- */
  function boardHTML(f, flipped) {
    const n = okCount(f), items = J().board;
    return '<div class="fx-board" id="fxBoard"><div class="fx-bhead"><b>\ud83e\uddfe Shift Board</b> <span class="fx-count" id="fxCount">\u2705 ' + n + ' / ' + items.length + '</span>' +
      '<span class="fx-dots">' + items.map((it) => { const a = answer(it, f); return '<button type="button" class="fx-dot ' + (a.ok ? 'ok' : 'bad') + (flipped && flipped.includes(it.id) ? ' flip' : '') + '" data-id="' + it.id + '" aria-label="' + it.id + ': ' + (a.ok ? 'correct' : 'wrong') + '. Show in X-ray">' + it.id + '</button>'; }).join('') + '</span>' +
      '<button type="button" class="btn small fx-bt" id="fxBoardToggle" aria-expanded="' + (!!f.boardOpen) + '" aria-controls="fxList">' + (f.boardOpen ? 'Hide list' : 'Show list') + '</button></div>' +
      '<ol class="fx-list" id="fxList"' + (f.boardOpen ? '' : ' hidden') + '>' + items.map((it) => { const a = answer(it, f); return '<li class="' + (a.ok ? 'ok' : 'bad') + (flipped && flipped.includes(it.id) ? ' flip' : '') + '" data-id="' + it.id + '"><span class="st" aria-hidden="true">' + (a.ok ? '\u2705' : '\u274c') + '</span><span><b>' + it.id + (it.trap ? ' (trap)' : '') + '</b> ' + esc(it.q) + ' <small>\u2014 ' + esc(it.who) + '</small><br><i>Bot: \u201c' + esc(a.text) + '\u201d' + (a.cite ? ' [' + esc(a.cite) + ']' : '') + '</i><span class="sr-only">' + (a.ok ? ' Correct.' : ' Wrong.') + '</span></span></li>'; }).join('') + '</ol>' +
      '<p class="fx-meter">\ud83d\udcb5 <b>$' + cost(f).usd + '</b> per 1,000 chats \u00b7 \u23f1 ~' + cost(f).sec.toFixed(1) + ' s per answer \u00b7 Risk: <span class="light ' + risk(f).light + '" role="img" aria-label="Risk ' + risk(f).light + '"></span> ' + esc(risk(f).why.join(', ')) + ' <small>(illustrative)</small></p></div>';
  }
  /* ---------- Prompt X-ray ---------- */
  const CTX = 8000;
  function xrayHTML(f, id, opt) {
    opt = opt || {}; const it = J().board.find((x) => x.id === id) || J().board[1], L = level(f, opt), a = answer(it, f, opt);
    const name = f.name || 'Your bot';
    const instr = ['You are ' + name + ', the HR helper for our staff. Answer staff questions.'];
    if (L >= 1) instr.push('If the answer isn\u2019t in the documents below, say you don\u2019t know.');
    let chunks, tokens = 40 + instr.join(' ').split(/\s+/).length * 1.3 + it.q.split(/\s+/).length * 1.3;
    if (L < 2) chunks = '<p class="xr-none">(none: it has never seen your files)</p>';
    else if (!it.chunk) chunks = '<p class="xr-none">(searched the HR drive: nothing relevant found)</p>';
    else if (it.chunk.none) chunks = '<p class="xr-none">' + esc(it.chunk.none) + '</p>';
    else { const c = it.chunk; chunks = '<div class="xr-chunk' + (c.retired ? ' old' : '') + (c.huge ? ' huge' : '') + '"><b>' + esc(c.src) + ' <span class="yr">' + c.year + '</span></b>' + (c.retired ? ' <span class="tagold">retired copy</span>' : '') + ' <small>' + esc(c.sec) + '</small><br>\u201c' + esc(c.text) + '\u201d</div>'; tokens += c.huge ? 9000 : c.text.split(/\s+/).length * 1.3 + 20; }
    const chat = it.id === 'G7' ? '40 earlier messages (the oldest, including \u201calways cite and point to the HR portal\u201d, got cut)' : '(new chat)';
    if (it.id === 'G7') tokens += 7400;
    const tool = it.tool ? '<div class="xr-chunk tool">' + esc(it.tool) + '</div>' : '<p class="xr-none">(none)</p>';
    if (it.tool) tokens += 30;
    tokens = Math.round(tokens); const pct = Math.round(tokens / CTX * 100);
    const blk = (k, label, inner, cls) => '<div class="xr-b ' + (cls || '') + '" data-b="' + k + '"><span class="xr-l">' + label + '</span>' + inner + '</div>';
    return '<div class="xray" id="xray" data-q="' + it.id + '" data-level="' + L + '"><h3>\ud83e\ude7b Prompt X-ray <small>what the model actually receives</small></h3>' +
      '<p class="xr-hint">The model only knows what\u2019s in this box. Tap a Shift Board item to inspect it.</p>' +
      (opt.compare ? '<div class="xr-tabs" role="tablist"><button role="tab" data-x="before" aria-selected="' + (opt.as === 1) + '">Before fix</button><button role="tab" data-x="after" aria-selected="' + (opt.as !== 1) + '">After fix</button></div>' : '') +
      blk('instr', '\ud83d\udccc Standing instructions', '<ul>' + instr.map((x, i) => '<li' + (i > 0 ? ' class="new"' : '') + '>' + esc(x) + '</li>').join('') + '</ul>') +
      blk('chunks', '\ud83d\udcc4 Retrieved chunks (source + year)', chunks + (L >= 2 ? '<p class="xr-lib">Library: ' + J().drive.map((d) => esc(d[0]) + (d[1] ? ' <span class="tagold">' + d[1] + '</span>' : '')).join(' \u00b7 ') + '</p>' : '')) +
      blk('chat', '\ud83d\udcac Chat so far', '<p class="xr-none">' + esc(chat) + '</p>') +
      blk('tools', '\ud83e\uddf0 Tool results', tool) +
      blk('q', '\u2753 Question', '<p>' + esc(it.q) + '</p>') +
      '<div class="xr-arrow" aria-hidden="true">\u2193 model \u2193</div>' +
      blk('ans', (a.ok ? '\u2705' : '\u274c') + ' Answer', '<p>' + esc(a.text) + (a.cite ? ' <span class="cite">[' + esc(a.cite) + ']</span>' : '') + '</p>' + (a.note ? '<p class="xr-none">' + esc(a.note) + '</p>' : ''), a.ok ? 'good' : 'badans') +
      '<div class="xr-fill"><span>Context window: ' + tokens.toLocaleString('en-US') + ' / ' + CTX.toLocaleString('en-US') + ' tokens</span><span class="bar"><i class="' + (pct > 100 ? 'over' : pct > 80 ? 'warn' : '') + '" style="width:' + Math.min(100, pct) + '%"></i></span>' + (pct > 100 ? '<small class="over">' + pct + '%: the oldest text gets cut</small>' : '') + '</div>' +
      '<p class="note">\ud83c\udfad Simulated from your fixes. No AI service is called.</p></div>';
  }
  /* ---------- level pieces ---------- */
  const stars = (n) => '<span class="fx-stars" aria-label="' + n + ' of 3 stars">' + '\u2605'.repeat(n) + '<span class="dim">' + '\u2605'.repeat(3 - n) + '</span></span>';
  function ruleHTML(i) { return '<section class="card fx-rule" id="fxRule"><b>\ud83d\udccc Monday rule</b><p>' + esc(C().RULES[i]) + '</p><small>Added to your \u201cMy AI habits\u201d card.</small></section>'; }
  function head(n, L) { return '<div class="step-head"><div><div class="chips"><span class="chip build">Fix the broken bot \u00b7 Level ' + n + ' of ' + C().total + '</span><span class="chip time">\u23f1 ' + esc(L.time) + '</span><span class="chip">\ud83e\uddea Preview</span></div><h1>' + esc(L.title) + '</h1></div></div>'; }
  function shell(main, f, n, inner, xid, xopt) {
    main.innerHTML = '<div class="fx" data-level="' + n + '">' + boardHTML(f, xopt && xopt.flipped) + '<div class="fx-wrap"><div class="fx-main">' + inner + '</div><aside class="fx-side" id="fxSide"><details class="xr-wrap" open><summary>\ud83e\ude7b Prompt X-ray</summary>' + xrayHTML(f, xid || f.focus || 'G2', xopt) + '</details></aside></div><div class="sr-only" aria-live="polite" id="fxLive"></div></div>';
    wireCommon(main, f, n);
  }
  let xOpt = {};
  function wireCommon(main, f, n) {
    const tg = $('#fxBoardToggle', main); if (tg) tg.onclick = () => { f.boardOpen = !f.boardOpen; save(); const l = $('#fxList', main); l.hidden = !f.boardOpen; tg.setAttribute('aria-expanded', String(f.boardOpen)); tg.textContent = f.boardOpen ? 'Hide list' : 'Show list'; };
    $$('.fx-dot, .fx-list li', main).forEach((d) => d.onclick = () => { f.focus = d.dataset.id; save(); redrawX(main, f); });
    wireX(main, f);
    main.onclick = (e) => { const t = e.target.closest('.gt-term'); if (t) App().toast(t.textContent + ': ' + t.dataset.def, 6000); };
  }
  function redrawX(main, f) { const s = $('#fxSide details', main); s.innerHTML = '<summary>\ud83e\ude7b Prompt X-ray</summary>' + xrayHTML(f, f.focus || 'G2', xOpt); wireX(main, f); }
  function wireX(main, f) { $$('.xr-tabs [data-x]', main).forEach((b) => b.onclick = () => { xOpt = Object.assign({}, xOpt, { as: b.dataset.x === 'before' ? 1 : undefined }); redrawX(main, f); }); }
  function redrawBoard(main, f, flipped) { const b = $('#fxBoard', main); b.outerHTML = boardHTML(f, flipped); wireCommon(main, f); }
  function announce(main, msg) { const l = $('#fxLive', main); l.textContent = ''; setTimeout(() => { l.textContent = msg; }, 30); }
  function celebrate(main) { if (FAST()) return; const c = document.createElement('div'); c.className = 'fx-confetti'; c.setAttribute('aria-hidden', 'true'); c.textContent = '\ud83c\udf89 \u2705 \ud83c\udf8a \u2705 \ud83c\udf89'; main.appendChild(c); setTimeout(() => c.remove(), 1600); }
  async function retest(main, f, ids, before) {
    const out = $('#fxRetest', main); const items = J().board.filter((it) => ids.includes(it.id));
    out.innerHTML = '<h3>\u2705 Re-test</h3><ul class="fx-rt">' + items.map((it) => '<li data-id="' + it.id + '"><span class="st">\u23f3</span> <b>' + it.id + '</b> ' + esc(it.q) + '</li>').join('') + '</ul>';
    const flipped = [];
    for (const it of items) {
      await new Promise((r) => setTimeout(r, FAST() ? 5 : 650));
      const a = answer(it, f, xOpt), was = before[it.id];
      const li = $('li[data-id="' + it.id + '"]', out); li.className = a.ok ? 'ok' + (!was ? ' flip' : '') : 'bad';
      li.querySelector('.st').textContent = a.ok ? '\u2705' : '\u274c'; li.insertAdjacentHTML('beforeend', '<br><i>\u201c' + esc(a.text) + '\u201d' + (a.cite ? ' [' + esc(a.cite) + ']' : '') + '</i>');
      if (a.ok && !was) flipped.push(it.id);
    }
    redrawBoard(main, f, flipped);
    const n = okCount(f, xOpt);
    if (flipped.length) { celebrate(main); announce(main, 'Re-test: ' + flipped.map((id) => id + ' now correct').join(', ') + '. ' + n + ' of 10 green.'); }
    else announce(main, 'Re-test: nothing changed. Still ' + n + ' of 10 green.');
    return flipped;
  }
  const snapshot = (f) => Object.fromEntries(J().board.map((it) => [it.id, answer(it, f).ok]));

  /* ---------- Level 0 ---------- */
  function level0(main, f) {
    const L = J().levels[0], d = f.lvl[0] || {};
    const jobs = [['hr', '\ud83e\uddd1\u200d\ud83d\udcbc HR helper', 'Leave, travel and benefits questions.'], ['it', '\ud83d\udcbb IT helpdesk', 'Coming in the full build.'], ['sales', '\ud83d\udcc8 Sales assistant', 'Coming in the full build.'], ['fin', '\ud83e\uddfe Finance checker', 'Coming in the full build.']];
    shell(main, f, 0, head(0, L) + '<section class="card fx-beat"><p class="fx-idea">' + L.idea.map(esc).join('<br>') + '</p>' +
      '<div class="field"><label for="fxName"><b>Name your bot</b> <small>(the only typing; please don\u2019t use real names or company data)</small></label><input class="input" id="fxName" maxlength="24" placeholder="e.g. Policy Pal" value="' + esc(f.name) + '"></div>' +
      '<p><b>Pick its one job</b></p><div class="bgrid">' + jobs.map((j) => '<button type="button" class="bcard' + (j[0] === 'hr' ? ' on' : '') + '" data-job="' + j[0] + '"' + (j[0] === 'hr' ? ' aria-pressed="true"' : ' disabled aria-disabled="true"') + '><strong>' + j[1] + '</strong><span>' + j[2] + '</span></button>').join('') + '</div>' +
      window.App.safe('Everything here is simulated in your browser. Nothing connects anywhere.') +
      '<div class="row"><button class="btn primary" id="fxHire">' + (d.done ? '\u2705 Hired' : '\ud83e\udd1d Hire it and see its first shift') + '</button></div></section>' +
      '<section class="card fx-beat" id="fxAfter"' + (d.done ? '' : ' hidden') + '><p class="fx-ticket">\ud83e\udd16 <b>' + esc(f.name || 'Your bot') + '</b> has been live since 9 am. The Shift Board above shows how it\u2019s doing: <b>0 of 10 right</b>. Model confidence: 100%. \ud83d\ude2c</p><p>' + stars(3) + ' Level 0 done.</p></section>' +
      (d.done ? ruleHTML(L.rule) : '<div id="fxRuleSlot"></div>'), f.focus || 'G2');
    const nm = $('#fxName', main); nm.oninput = () => { f.name = nm.value.trim().slice(0, 24); save(); redrawX(main, f); };
    $('#fxHire', main).onclick = () => { f.name = f.name || 'Policy Pal'; f.lvl[0] = { done: true, stars: 3 }; save(); App().go('#/fix/0'); };
  }
  /* ---------- Level 1 (preview stub) ---------- */
  function level1(main, f) {
    const L = J().levels[1], d = f.lvl[1] || {};
    shell(main, f, 1, head(1, L) + '<section class="card fx-beat"><p><b>\ud83d\udea7 This level isn\u2019t built in the preview yet.</b> In the full version you\u2019ll find out why it invented a pet-insurance benefit, and fix it.</p><p>For now, we\u2019ll apply Level 1\u2019s fix for you: <b>\u201cAllow \u2018I don\u2019t know\u2019, and answer only from what it\u2019s given.\u201d</b></p>' +
      '<div class="row"><button class="btn primary" id="fxL1"' + (d.done ? ' disabled' : '') + '>' + (d.done ? '\u2705 Applied' : 'Apply Level 1\u2019s fix for me') + '</button></div><div id="fxRetest" aria-live="off"></div></section>' + (d.done ? ruleHTML(L.rule) : ''), 'G1');
    const b = $('#fxL1', main); if (b && !d.done) b.onclick = async () => { const before = snapshot(f); f.fixes.l1 = true; f.lvl[1] = { done: true, stars: 0, preview: true }; f.focus = 'G1'; save(); b.disabled = true; redrawX(main, f); await retest(main, f, J().board.map((x) => x.id), before); $('#fxRetest', main).insertAdjacentHTML('afterend', ruleHTML(L.rule)); App().updateChrome(); };
  }
  /* ---------- Level 2 ---------- */
  function level2(main, f) {
    const L = J().levels[2]; const d = f.lvl[2] = f.lvl[2] || { tries: [], wrong: [] };
    if (!f.fixes.l1) { main.innerHTML = '<div class="card lockscreen"><h1>Level 1 first</h1><p>Your bot still makes things up. Apply Level 1\u2019s fix first.</p><a class="btn primary" href="#/fix/1">Go to Level 1</a></div>'; return; }
    xOpt = d.done ? { compare: true } : {};
    const pr = L.predict, picked = d.tries || [];
    const predHTML = '<div class="fx-opts" role="group" aria-label="' + esc(pr.q) + '">' + pr.opts.map((o, i) => '<button type="button" class="btn fx-opt' + (picked.includes(i) ? (o.ok ? ' ok' : ' no') : '') + '" data-i="' + i + '">' + esc(o.t) + '</button>').join('') + '</div><p class="fx-fb" id="fxFb" aria-live="polite">' + (picked.length ? esc(pr.opts[picked[picked.length - 1]].fb) : '') + '</p>';
    const fixHTML = '<div class="bgrid fx-fixes">' + L.fixes.map((x) => '<button type="button" class="bcard' + (d.wrong.includes(x.id) ? ' tried' : '') + (d.done && x.right ? ' on' : '') + '" data-fix="' + x.id + '"><strong>' + esc(x.t) + '</strong><span>' + esc(x.sub) + '</span></button>').join('') + '</div><div id="fxFail" aria-live="polite"></div>';
    shell(main, f, 2, head(2, L) +
      '<section class="card fx-beat"><h2>\ud83c\udfab Ticket</h2><p class="fx-ticket"><b>' + esc(L.ticket.who) + ':</b> \u201c' + esc(L.ticket.text) + '\u201d</p><div class="bubble bot bad">' + esc(f.name || 'Bot') + ': \u201c' + esc(L.ticket.bad) + '\u201d</div></section>' +
      '<section class="card fx-beat" id="fxPredict"><h2>\ud83e\udd14 Predict: ' + esc(pr.q) + '</h2>' + predHTML + '</section>' +
      '<section class="card fx-beat" id="fxIdea"' + (picked.length ? '' : ' hidden') + '><h2>\ud83d\udca1 The idea</h2><p class="fx-idea">' + L.idea.map(withTerms).join('<br>') + '</p></section>' +
      '<section class="card fx-beat" id="fxFix"' + (picked.length ? '' : ' hidden') + '><h2>\ud83d\udd27 Fix it</h2>' + fixHTML + '<div id="fxRetest"></div></section>' +
      '<div id="fxEnd">' + (d.done ? endHTML(f, d, L) : '') + '</div>', L.focus, xOpt);
    $$('.fx-opt', main).forEach((b) => b.onclick = () => {
      const i = +b.dataset.i; if (!d.tries.includes(i)) d.tries.push(i); save();
      const o = pr.opts[i]; b.classList.add(o.ok ? 'ok' : 'no'); $('#fxFb', main).textContent = (o.ok ? '\u2705 ' : '\ud83e\udd14 ') + o.fb;
      $('#fxIdea', main).hidden = false; $('#fxFix', main).hidden = false;
    });
    $$('[data-fix]', main).forEach((b) => b.onclick = async () => {
      if (d.done) return; const x = L.fixes.find((y) => y.id === b.dataset.fix);
      f.focus = 'G2'; const before = snapshot(f);
      if (!x.right) {
        if (!d.wrong.includes(x.id)) d.wrong.push(x.id); b.classList.add('tried');
        if (x.id === 'big') { f.tried.bigOn = true; xOpt = { big: true }; }
        save(); redrawX(main, f);
        $('#fxFail', main).innerHTML = '<div class="fx-failed"><b>\u274c Didn\u2019t work.</b> ' + esc(x.fail) + '</div>';
        await retest(main, f, L.flips, before);
        if (x.id === 'big') { f.tried.bigOn = false; save(); }
        if (!d.done) $('#fxFail', main).insertAdjacentHTML('beforeend', '<p class="note">Try another fix.' + (x.id === 'big' ? ' (We\u2019ve switched back to the normal brain.)' : '') + '</p>');
        return;
      }
      $('#fxFail', main).innerHTML = ''; b.classList.add('on'); f.fixes.drive = true; xOpt = { compare: true };
      const firstPredictOK = pr.opts[d.tries[0]] && pr.opts[d.tries[0]].ok;
      d.done = true; d.stars = Math.max(1, 3 - (firstPredictOK ? 0 : 1) - (d.wrong.length ? 1 : 0)); save();
      redrawX(main, f);
      await retest(main, f, L.flips.concat(['G4']), before);
      $('#fxEnd', main).innerHTML = endHTML(f, d, L); App().updateChrome();
      const e = $('#fxEnd', main); if (e.scrollIntoView && !FAST()) e.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }
  function endHTML(f, d, L) {
    return '<section class="card fx-beat fx-done"><p>' + stars(d.stars || 1) + ' <b>Level 2 fixed.</b> ' + (d.stars === 3 ? 'First try, no hints.' : 'Fixed with a nudge.') + '</p><p class="note">Plot twist: G4 now quotes a <b>2019</b> hotel cap. Connecting the whole drive brought the retired copies along. That\u2019s Level 3.</p></section>' + ruleHTML(L.rule) +
      '<p class="note">Go deeper (optional): <a href="#/step/' + L.learn + '">Learn Step ' + L.learn + '</a> \u00b7 <a href="#/step/5">Step 5</a>. Levels 3\u20138 and the exam are coming in the full build.</p>';
  }
  function render(main, n) {
    const f = FX(); n = +n;
    if (n > 0 && !(f.lvl[0] && f.lvl[0].done)) { App().go('#/fix/0'); return; }
    xOpt = {};
    if (n === 0) return level0(main, f); if (n === 1) return level1(main, f); return level2(main, f);
  }
  const LEVELS = [0, 1, 2];
  const done = () => { const f = FX(); return LEVELS.filter((n) => f.lvl[n] && f.lvl[n].done).length; };
  window.Fix = { render, FX, answer, okCount, LEVELS, done, title: (n) => C().jobs.hr.levels[n].title, canNext: (n) => { const f = FX(); return !!(f.lvl[n] && f.lvl[n].done); } };
})();
