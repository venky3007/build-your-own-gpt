/* "Fix the broken bot" Build track: Levels 0-8, Exam (9) and Wrap-up (10), Shift Board, Prompt X-ray.
   Rule-based and offline: every answer comes from build-content.js and the learner's fixes. No network calls. */
(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const C = () => window.BUILD_CONTENT;
  const App = () => window.App;
  const FAST = () => !!window.__FAST__ || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const LAST = 11;
  function FX() {
    const S = App().S(); if (!S.fx || typeof S.fx !== 'object') S.fx = {};
    const f = S.fx; f.lvl = f.lvl || {}; f.fixed = f.fixed || {}; f.tried = f.tried || {}; if (!C().jobs[f.job]) f.job = 'hr'; if (f.name == null) f.name = '';
    if (f.fixes) { if (f.fixes.l1) f.fixed[1] = true; if (f.fixes.drive) f.fixed[2] = true; delete f.fixes; } // from the v3 slice preview
    return f;
  }
  const save = () => App().save();
  const J = (f) => C().jobs[(f || FX()).job];
  const fill = (s, f) => String(s).replace(/\{drive\}/g, J(f).drive).replace(/\{portal\}/g, J(f).portal);
  function stage(f) { let k = 0; while (f.fixed[k + 1]) k++; return k; }
  const pickAt = (obj, st) => { if (!obj) return null; let best = null; Object.keys(obj).map(Number).sort((a, b) => a - b).forEach((k) => { if (k <= st) best = obj[k]; }); return best; };
  function answer(it, f, opt) {
    opt = opt || {}; const st = opt.stage != null ? opt.stage : stage(f); const ok = st >= it.flip;
    let text = ok ? it.good : pickAt(it.at, st);
    if (!ok && opt.variant === 'wild') text = text + ' And there’s a bonus perk nobody has heard of!';
    if (!ok && opt.variant === 'wordy' && text === C().IDK) text = 'I’m afraid I don’t have that information, and I’d hate to guess. Do let me know if there’s anything else at all I can help with today.';
    return { text, ok, cite: ok ? it.cite || null : null, note: !ok && st >= 2 ? it.note || null : null };
  }
  const okCount = (f) => J(f).board.filter((it) => answer(it, f).ok).length;
  function cost(f) { const k = C().cost; if (f.tried.cost) return { usd: f.tried.cost[0], sec: f.tried.cost[1] }; const c = f.fixed[6] ? k.think : f.fixed[2] ? k.drive : k.base; return { usd: c[0], sec: c[1] }; }
  function risk(f) {
    const why = []; if (!f.fixed[1]) why.push('makes things up'); if (!f.fixed[7]) why.push('can act on hidden instructions'); if (!f.fixed[8]) why.push('no no-go list'); if (!f.exam) why.push('not tested');
    const light = (!f.fixed[1] || !f.fixed[7]) ? 'red' : why.length ? 'amber' : 'green';
    return { light, why: why.length ? why : ['tested; keep a human in the loop'] };
  }
  function term(t) { const d = C().TERMS[t]; return d ? '<button type="button" class="gt-term" data-def="' + esc(d) + '" aria-label="' + esc(t) + ': ' + esc(d) + '">' + esc(t) + '</button>' : esc(t); }
  const withTerms = (s, f) => esc(fill(s, f)).replace(/\{([^}]+)\}/g, (m, t) => term(t));

  /* ---------- Shift Board ---------- */
  function boardHTML(f, flipped) {
    const items = J(f).board, n = okCount(f), c = cost(f), r = risk(f);
    return '<div class="fx-board" id="fxBoard"><div class="fx-bhead"><b>🧾 Shift Board</b> <span class="fx-count" id="fxCount">✅ ' + n + ' / ' + items.length + '</span>' +
      '<span class="fx-dots">' + items.map((it) => { const a = answer(it, f); return '<button type="button" class="fx-dot ' + (a.ok ? 'ok' : 'bad') + (flipped && flipped.includes(it.id) ? ' flip' : '') + '" data-id="' + it.id + '" aria-label="' + it.id + ': ' + (a.ok ? 'correct' : 'wrong') + '. Show in X-ray">' + it.id + '</button>'; }).join('') + '</span>' +
      '<button type="button" class="btn small fx-bt" id="fxBoardToggle" aria-expanded="' + (!!f.boardOpen) + '" aria-controls="fxList">' + (f.boardOpen ? 'Hide list' : 'Show list') + '</button></div>' +
      '<ol class="fx-list" id="fxList"' + (f.boardOpen ? '' : ' hidden') + '>' + items.map((it) => { const a = answer(it, f); return '<li class="' + (a.ok ? 'ok' : 'bad') + (flipped && flipped.includes(it.id) ? ' flip' : '') + '" data-id="' + it.id + '"><span class="st" aria-hidden="true">' + (a.ok ? '✅' : '❌') + '</span><span><b>' + it.id + '</b> ' + esc(it.q) + ' <small>— ' + esc(it.who) + '</small><br><i>Bot: “' + esc(a.text) + '”' + (a.cite ? ' [' + esc(a.cite) + ']' : '') + '</i><span class="sr-only">' + (a.ok ? ' Correct.' : ' Wrong.') + '</span></span></li>'; }).join('') + '</ol>' +
      '<p class="fx-meter">💵 <b>$' + c.usd + '</b> per 1,000 chats · ⏱ ~' + c.sec.toFixed(1) + ' s per answer · Risk: <span class="light ' + r.light + '" role="img" aria-label="Risk ' + r.light + '"></span> ' + esc(r.why.join(', ')) + ' <small>(illustrative)</small></p></div>';
  }
  /* ---------- Prompt X-ray ---------- */
  const CTX = 8000;
  function xrayHTML(f, id, opt) {
    opt = opt || {}; const it = J(f).board.find((x) => x.id === id) || J(f).board[0];
    const st = opt.stage != null ? opt.stage : stage(f), a = answer(it, f, { stage: st, variant: opt.variant });
    const instr = ['You are ' + (f.name || 'the bot') + ', the ' + J(f).label + ' for our staff. Answer staff questions.'];
    Object.keys(C().INSTR).map(Number).forEach((k) => { if (st >= k) instr.push(fill(C().INSTR[k], f)); });
    let tokens = 40 + instr.join(' ').split(/\s+/).length * 1.3 + it.q.split(/\s+/).length * 1.3, chunks;
    const ch = st >= 2 ? pickAt(it.chunk, st) : null;
    if (st < 2) chunks = '<p class="xr-none">(none: it has never seen your files)</p>';
    else if (it.huge && st < 5) { chunks = '<div class="xr-chunk huge"><b>' + esc(it.huge) + '</b> <small>pasted whole</small><br>“Pages 1 onwards… (the answer is on page ' + it.page + ')”</div>'; tokens += 9000; }
    else if (!ch) chunks = '<p class="xr-none">(searched the ' + esc(J(f).drive) + ': nothing relevant found)</p>';
    else if (ch.none) chunks = '<p class="xr-none">' + esc(ch.none) + '</p>';
    else { chunks = (ch.match ? '<p class="xr-match">🔎 ' + esc(ch.match) + '</p>' : '') + '<div class="xr-chunk' + (ch.retired ? ' old' : '') + '"><b>' + esc(ch.src) + ' <span class="yr">' + ch.year + '</span></b>' + (ch.retired ? ' <span class="tagold">retired copy</span>' : '') + ' <small>' + esc(ch.sec) + '</small><br>“' + esc(ch.text) + '”</div>'; tokens += ch.text.split(/\s+/).length * 1.3 + 20; }
    let chat = '(new chat)'; if (it.longchat) { if (st >= 5) { chat = 'Last 10 messages (older chatter trimmed; standing instructions pinned above)'; tokens += 1500; } else { chat = '40 earlier messages. The oldest ones, including the instruction to cite and point to the ' + J(f).portal + ', got cut.'; tokens += 7400; } }
    const tool = it.tool ? '<div class="xr-chunk tool' + (st >= 7 ? ' untrusted' : '') + '">' + (st >= 7 ? '<span class="tagold">untrusted text from a document</span> ' : '') + esc(it.tool) + '</div><p class="xr-none">Permissions: ' + (st >= 7 ? 'read, draft, flag (asks before acting)' : 'read, approve, pay, change access') + '</p>' : '<p class="xr-none">(none)</p>';
    if (it.tool) tokens += 40;
    const work = it.calc && st >= 6 ? '<div class="xr-b work" data-b="work"><span class="xr-l">🧮 Hidden working-out</span><p>' + esc(it.calc) + '</p></div>' : '';
    tokens = Math.round(tokens); const pct = Math.round(tokens / CTX * 100);
    const blk = (k, label, inner, cls) => '<div class="xr-b ' + (cls || '') + '" data-b="' + k + '"><span class="xr-l">' + label + '</span>' + inner + '</div>';
    return '<div class="xray" id="xray" data-q="' + it.id + '" data-stage="' + st + '"><h3>🩻 Prompt X-ray <small>what the model actually receives</small></h3>' +
      '<p class="xr-hint">The model only knows what’s in this box. Tap a Shift Board item to inspect it.</p>' +
      (opt.compare ? '<div class="xr-tabs" role="tablist"><button role="tab" data-x="before" aria-selected="' + (opt.stage != null) + '">Before fix</button><button role="tab" data-x="after" aria-selected="' + (opt.stage == null) + '">After fix</button></div>' : '') +
      blk('instr', '📌 Standing instructions', '<ul>' + instr.map((x, i) => '<li' + (i > 0 ? ' class="new"' : '') + '>' + esc(x) + '</li>').join('') + '</ul>') +
      blk('chunks', '📄 Retrieved chunks (source + year)', chunks + (st >= 2 ? '<p class="xr-lib">Library: ' + libHTML(f, st) + '</p>' : '')) +
      blk('chat', '💬 Chat so far', '<p class="xr-none">' + esc(chat) + '</p>') +
      blk('tools', '🧰 Tool results', tool) +
      blk('q', '❓ Question', '<p>' + esc(it.q) + '</p>') + work +
      '<div class="xr-arrow" aria-hidden="true">↓ model ↓</div>' +
      blk('ans', (a.ok ? '✅' : '❌') + ' Answer', '<p>' + esc(a.text) + (a.cite ? ' <span class="cite">[' + esc(a.cite) + ']</span>' : '') + '</p>' + (a.note ? '<p class="xr-none">' + esc(a.note) + '</p>' : ''), a.ok ? 'good' : 'badans') +
      '<div class="xr-fill"><span>Context window: ' + tokens.toLocaleString('en-US') + ' / ' + CTX.toLocaleString('en-US') + ' tokens</span><span class="bar"><i class="' + (pct > 100 ? 'over' : pct > 80 ? 'warn' : '') + '" style="width:' + Math.min(100, pct) + '%"></i></span>' + (pct > 100 ? '<small class="over">' + pct + '%: the oldest text gets cut</small>' : '') + '</div>' +
      '<p class="note">🎭 Simulated from your fixes. No AI service is called.</p></div>';
  }
  function libHTML(f, st) {
    const seen = {}; J(f).board.forEach((it) => Object.values(it.chunk || {}).forEach((c) => { if (c.src) seen[c.src + ' ' + c.year] = c.retired; }));
    return Object.keys(seen).sort().map((k) => esc(k) + (seen[k] ? (st >= 3 ? ' <span class="tagold gone">retired, removed</span>' : ' <span class="tagold">retired</span>') : '')).join(' · ');
  }
  /* ---------- shared pieces ---------- */
  const stars = (n) => '<span class="fx-stars" aria-label="' + n + ' of 3 stars">' + '★'.repeat(n) + '<span class="dim">' + '★'.repeat(3 - n) + '</span></span>';
  const ruleHTML = (i) => '<section class="card fx-rule" id="fxRule"><b>📌 Monday rule</b><p>' + esc(C().RULES[i]) + '</p><small>Added to your “My AI habits” card.</small></section>';
  function head(n) { const L = C().LEVELS[n]; return '<div class="step-head"><div><div class="chips"><span class="chip build">' + (n === 9 ? '🏁 Exam' : n === 10 ? '🗂️ Business request' : 'Level ' + n + ' of ' + C().total) + '</span><span class="chip time">⏱ ' + esc(L.time) + '</span><span class="chip">' + J().icon + ' ' + esc(f0().name || J().label) + '</span></div><h1>' + esc(L.title) + '</h1></div></div>'; }
  const f0 = () => FX();
  let xOpt = {};
  function shell(main, f, n, inner, xid) {
    main.innerHTML = '<div class="fx" data-level="' + n + '" data-job="' + f.job + '">' + boardHTML(f) + '<div class="fx-wrap"><div class="fx-main">' + inner + '</div><aside class="fx-side" id="fxSide"><details class="xr-wrap" open><summary>🩻 Prompt X-ray</summary>' + xrayHTML(f, xid || f.focus || 'G1', xOpt) + '</details></aside></div><div class="sr-only" aria-live="polite" id="fxLive"></div></div>';
    wireCommon(main, f);
    main.onclick = (e) => { const t = e.target.closest('.gt-term'); if (t) App().toast(t.textContent + ': ' + t.dataset.def, 6000); };
  }
  function wireCommon(main, f) {
    const tg = $('#fxBoardToggle', main); if (tg) tg.onclick = () => { f.boardOpen = !f.boardOpen; save(); $('#fxList', main).hidden = !f.boardOpen; tg.setAttribute('aria-expanded', String(f.boardOpen)); tg.textContent = f.boardOpen ? 'Hide list' : 'Show list'; };
    $$('.fx-dot, .fx-list li', main).forEach((d) => d.onclick = () => { f.focus = d.dataset.id; save(); redrawX(main, f); });
    wireX(main, f);
  }
  function redrawX(main, f) { const s = $('#fxSide details', main); if (!s) return; s.innerHTML = '<summary>🩻 Prompt X-ray</summary>' + xrayHTML(f, f.focus || 'G1', xOpt); wireX(main, f); }
  function wireX(main, f) { $$('.xr-tabs [data-x]', main).forEach((b) => b.onclick = () => { xOpt = Object.assign({}, xOpt, { stage: b.dataset.x === 'before' ? xOpt.before : undefined }); if (b.dataset.x === 'after') delete xOpt.stage; redrawX(main, f); }); }
  function redrawBoard(main, f, flipped) { const b = $('#fxBoard', main); if (b) { b.outerHTML = boardHTML(f, flipped); wireCommon(main, f); } }
  function announce(main, msg) { const l = $('#fxLive', main); if (!l) return; l.textContent = ''; setTimeout(() => { l.textContent = msg; }, 30); }
  function celebrate(main) { if (FAST()) return; const c = document.createElement('div'); c.className = 'fx-confetti'; c.setAttribute('aria-hidden', 'true'); c.textContent = '🎉 ✅ 🎊 ✅ 🎉'; main.appendChild(c); setTimeout(() => c.remove(), 1600); }
  const snapshot = (f) => Object.fromEntries(J(f).board.map((it) => [it.id, answer(it, f)]));
  async function retest(main, f, ids, before, variant) {
    const out = $('#fxRetest', main); const items = J(f).board.filter((it) => ids.includes(it.id));
    out.innerHTML = '<h3>✅ Re-test</h3><ul class="fx-rt">' + items.map((it) => '<li data-id="' + it.id + '"><span class="st">⏳</span> <b>' + it.id + '</b> ' + esc(it.q) + '</li>').join('') + '</ul>';
    const flipped = [];
    for (const it of items) {
      await new Promise((r) => setTimeout(r, FAST() ? 5 : 600));
      const a = answer(it, f, { variant }), was = before[it.id].ok;
      const li = $('li[data-id="' + it.id + '"]', out); if (!li) continue; li.className = a.ok ? 'ok' + (!was ? ' flip' : '') : 'bad';
      li.querySelector('.st').textContent = a.ok ? '✅' : '❌'; li.insertAdjacentHTML('beforeend', '<br><i>“' + esc(a.text) + '”' + (a.cite ? ' [' + esc(a.cite) + ']' : '') + '</i>');
      if (a.ok && !was) flipped.push(it.id);
    }
    redrawBoard(main, f, flipped);
    const n = okCount(f);
    if (flipped.length) { celebrate(main); announce(main, 'Re-test: ' + flipped.map((id) => id + ' now correct').join(', ') + '. ' + n + ' of 10 green.'); }
    else announce(main, 'Re-test: nothing changed. Still ' + n + ' of 10 green.');
    return flipped;
  }
  const goDeeper = (n) => '<p class="note fx-deeper">Go deeper (optional): <a href="#/step/' + C().LEVELS[n].learn + '">Learn Step ' + C().LEVELS[n].learn + '</a></p>';

  /* ---------- Level 0 ---------- */
  function level0(main, f) {
    const d = f.lvl[0] || {}, jobs = C().jobs;
    shell(main, f, 0, head(0) + '<section class="card fx-beat"><p class="fx-idea">One job, one set of documents, one list of questions you can check.<br>“Knows everything” can’t be tested, so it can’t be trusted.<br>Your bot went live this morning. Here’s how its first shift went.</p>' +
      '<div class="field"><label for="fxName"><b>Name your bot</b> <small>(the only typing; please don’t use real names or company data)</small></label><input class="input" id="fxName" maxlength="24" placeholder="e.g. Policy Pal" value="' + esc(f.name) + '"></div>' +
      '<p><b>Pick its one job</b></p><div class="bgrid">' + Object.keys(jobs).map((k) => '<button type="button" class="bcard' + (k === f.job ? ' on' : '') + '" data-job="' + k + '" aria-pressed="' + (k === f.job) + '"><strong>' + jobs[k].icon + ' ' + esc(jobs[k].label) + '</strong><span>' + esc(jobs[k].board.slice(1, 3).map((x) => x.q).join(' · ')) + '</span></button>').join('') + '</div>' +
      App().safe('Everything here is simulated in your browser. Nothing connects anywhere. All documents are fictional.') +
      '<div class="row"><button class="btn primary" id="fxHire">' + (d.done ? '✅ Hired (hire again to restart)' : '🤝 Hire it and see its first shift') + '</button></div></section>' +
      (d.done ? '<section class="card fx-beat"><p class="fx-ticket">🤖 <b>' + esc(f.name) + '</b> has been live since 9 am. The Shift Board shows <b>' + okCount(f) + ' of 10 right</b>. Model confidence: 100%. 😬</p><p>' + stars(3) + ' Level 0 done. 8 fixes to go, ' + esc(C().time) + '.</p></section>' + ruleHTML(0) : ''), f.focus || 'G1');
    const nm = $('#fxName', main); nm.oninput = () => { f.name = nm.value.trim().slice(0, 24); save(); };
    $$('.bcard[data-job]', main).forEach((b) => b.onclick = () => { if (b.dataset.job === f.job) return; if (Object.keys(f.fixed).length && !confirm('Switch job? This restarts the levels for the new bot.')) return; resetLevels(f); f.job = b.dataset.job; save(); App().go('#/fix/0'); render(main, 0); });
    $('#fxHire', main).onclick = () => { if (d.done) resetLevels(f); f.name = f.name || ({ hr: 'Policy Pal', it: 'Ticketron', sales: 'Quotey', finance: 'Penny' })[f.job]; f.lvl[0] = { done: true, stars: 3 }; f.focus = 'G1'; save(); render(main, 0); App().updateChrome(); App().setNext(); };
  }
  function resetLevels(f) { f.lvl = {}; f.fixed = {}; f.tried = {}; f.exam = null; f.focus = 'G1'; }

  /* ---------- Levels 1-8 ---------- */
  function level(main, f, n) {
    const L = C().LEVELS[n], d = f.lvl[n] = f.lvl[n] || { tries: [], wrong: [] }; d.busy = false;
    if (stage(f) < n - 1) { main.innerHTML = '<div class="card lockscreen"><h1>Level ' + (n - 1) + ' first</h1><p>Each fix builds on the last one.</p><a class="btn primary" href="#/fix/' + (stage(f) + 1) + '">Go to Level ' + (stage(f) + 1) + '</a></div>'; return; }
    const it = J(f).board.find((x) => x.id === L.focus), tk = J(f).tickets[n];
    const bad = answer(it, f, { stage: n - 1 }).text;
    f.focus = L.focus; xOpt = d.done ? { compare: true, before: n - 1 } : {};
    const pr = L.predict, picked = d.tries;
    shell(main, f, n, head(n) +
      '<section class="card fx-beat"><h2>🎫 Ticket</h2><p class="fx-ticket"><b>' + esc(tk[0]) + ':</b> “' + esc(tk[1]) + '”</p><div class="bubble bot bad">' + esc(f.name || 'Bot') + ': “' + esc(bad) + '”</div><p class="fx-impact">💥 <b>Business impact:</b> ' + esc(J(f).impact[n]) + '</p></section>' +
      '<section class="card fx-beat" id="fxPredict"><h2>🤔 Predict: ' + esc(pr.q) + '</h2><div class="fx-opts" role="group" aria-label="' + esc(pr.q) + '">' + pr.opts.map((o, i) => '<button type="button" class="btn fx-opt' + (picked.includes(i) ? (o.ok ? ' ok' : ' no') : '') + '" data-i="' + i + '">' + esc(fill(o.t, f)) + '</button>').join('') + '</div><p class="fx-fb" id="fxFb" aria-live="polite">' + (picked.length ? esc(pr.opts[picked[picked.length - 1]].fb) : '') + '</p></section>' +
      '<section class="card fx-beat" id="fxIdea"' + (picked.length ? '' : ' hidden') + '><h2>💡 The idea</h2><p class="fx-idea">' + L.idea.map((s) => withTerms(s, f)).join('<br>') + '</p></section>' +
      '<section class="card fx-beat" id="fxFix"' + (picked.length ? '' : ' hidden') + '><h2>🔧 Fix it</h2><div class="bgrid fx-fixes">' + L.fixes.map((x) => '<button type="button" class="bcard' + (d.wrong.includes(x.id) ? ' tried' : '') + (d.done && x.right ? ' on' : '') + '" data-fix="' + x.id + '"><strong>' + withTerms(x.t, f) + '</strong><span>' + withTerms(x.sub, f) + '</span></button>').join('') + '</div><div id="fxFail" aria-live="polite"></div><div id="fxRetest"></div></section>' +
      '<div id="fxEnd">' + (d.done ? endHTML(f, n) : '') + '</div>', L.focus); wireTr(main, f);
    $$('.fx-opt', main).forEach((b) => b.onclick = () => {
      const i = +b.dataset.i; if (!d.tries.includes(i)) d.tries.push(i); save();
      const o = pr.opts[i]; b.classList.add(o.ok ? 'ok' : 'no'); $('#fxFb', main).textContent = (o.ok ? '✅ ' : '🤔 ') + o.fb;
      $('#fxIdea', main).hidden = false; $('#fxFix', main).hidden = false;
    });
    const flipIds = J(f).board.filter((x) => x.flip === n).map((x) => x.id);
    $$('[data-fix]', main).forEach((b) => b.onclick = async () => {
      if (d.done || d.busy) return; d.busy = true; const x = L.fixes.find((y) => y.id === b.dataset.fix);
      const before = snapshot(f);
      if (!x.right) {
        if (!d.wrong.includes(x.id)) d.wrong.push(x.id); b.classList.add('tried');
        if (x.cost) f.tried.cost = x.cost; save(); redrawBoard(main, f);
        xOpt = { variant: x.variant }; redrawX(main, f);
        const va = answer(it, f, { variant: x.variant });
        $('#fxFail', main).innerHTML = '<div class="fx-failed"><b>❌ Didn’t work.</b> ' + esc(fill(x.fail, f)) + '<br><i>' + esc(f.name || 'Bot') + ' now: “' + esc(va.text) + '”</i></div>';
        await retest(main, f, flipIds, before, x.variant);
        f.tried.cost = null; save(); xOpt = {}; redrawBoard(main, f); redrawX(main, f);
        if (!d.done) $('#fxFail', main).insertAdjacentHTML('beforeend', '<p class="note">Try another fix.' + (x.cost ? ' (We’ve switched back, so the cost is back to normal.)' : '') + '</p>');
        d.busy = false; return;
      }
      $('#fxFail', main).innerHTML = ''; b.classList.add('on'); f.fixed[n] = true;
      const firstOK = pr.opts[d.tries[0]] && pr.opts[d.tries[0]].ok;
      d.done = true; d.stars = Math.max(1, 3 - (firstOK ? 0 : 1) - (d.wrong.length ? 1 : 0)); d.busy = false; save();
      xOpt = { compare: true, before: n - 1 }; redrawX(main, f);
      const after = snapshot(f), changed = J(f).board.filter((y) => after[y.id].text !== before[y.id].text).map((y) => y.id);
      await retest(main, f, changed.length ? changed : flipIds, before);
      $('#fxEnd', main).innerHTML = endHTML(f, n); wireTr(main, f); App().updateChrome(); App().setNext && App().setNext();
      const e = $('#fxEnd', main); if (e && e.scrollIntoView && !FAST()) e.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }
  const TWIST = { 2: 'Plot twist: one answer now quotes a retired 2019 copy. Connecting the whole folder brought the old versions along. That’s Level 3.' };
  function endHTML(f, n) {
    const d = f.lvl[n];
    return '<section class="card fx-beat fx-done"><p>' + stars(d.stars || 1) + ' <b>Level ' + n + ' fixed.</b> ' + (d.stars === 3 ? 'First try, no hints.' : 'Fixed with a nudge.') + ' Shift Board: ' + okCount(f) + ' / 10.</p>' + (TWIST[n] ? '<p class="note">' + esc(TWIST[n]) + '</p>' : '') + '</section>' + trHTML(f, n) + ruleHTML(C().LEVELS[n].rule) + goDeeper(n);
  }

  /* ---------- Translate it (after each fix) ---------- */
  function trHTML(f, n) {
    const t = f.tr && f.tr[n], opts = C().translate[n];
    return '<section class="card fx-beat fx-tr" id="fxTr" data-level="' + n + '"><h2>🗣️ Translate it</h2><p>How would you explain this fix to your business stakeholder?</p><div class="fx-opts" role="group" aria-label="Explain the fix">' +
      opts.map((o, i) => '<button type="button" class="btn fx-opt' + (t && t.picks.includes(i) ? (o[1] === 'right' ? ' ok' : ' no') : '') + '" data-tr="' + i + '" data-kind="' + o[1] + '">' + esc(fill(o[0], f)) + '</button>').join('') +
      '</div><p class="fx-fb" id="fxTrFb" aria-live="polite">' + (t ? esc(C().trFb[opts[t.picks[t.picks.length - 1]][1]]) : '') + '</p></section>';
  }
  function wireTr(main, f) {
    $$('[data-tr]', main).forEach((b) => b.onclick = () => {
      const n = +$('#fxTr', main).dataset.level, i = +b.dataset.tr, k = b.dataset.kind; f.tr = f.tr || {};
      const t = f.tr[n] = f.tr[n] || { first: k, picks: [] }; if (!t.picks.includes(i)) t.picks.push(i); save();
      b.classList.add(k === 'right' ? 'ok' : 'no'); $('#fxTrFb', main).textContent = (k === 'right' ? '✅ ' : '🤔 ') + C().trFb[k];
    });
  }
  const trTally = (f) => Object.values(f.tr || {}).filter((t) => t.first === 'right').length;

  /* ---------- Messy manager request (10) ---------- */
  function messy(main, f) {
    if (!f.exam) { main.innerHTML = '<div class="card lockscreen"><h1>Run the exam first</h1><a class="btn primary" href="#/fix/9">Go to the exam</a></div>'; return; }
    const m = J(f).messy, Q = C().messyQs, d = f.messy = f.messy || { picks: [] }; xOpt = {};
    const need = C().messyNeed, rightN = () => d.picks.filter((id) => Q.find((q) => q.id === id).ok).length;
    shell(main, f, 10, head(10) + '<section class="card fx-beat"><h2>📨 A request lands in your inbox</h2><p class="fx-ticket"><b>' + esc(m.who) + ':</b> “' + esc(m.text) + '”</p><p class="fx-impact">💥 <b>Why it matters:</b> vague requests are how bots like Level 0’s get built. Ask before you build.</p></section>' +
      '<section class="card fx-beat" id="fxMessy"><h2>❓ Pick the questions you’d ask first</h2><p class="note">Pick at least ' + need + ' good ones. Some are tempting traps.</p><div class="fx-mq">' + Q.map((q) => '<button type="button" class="btn fx-opt' + (d.picks.includes(q.id) ? (q.ok ? ' ok' : ' no') : '') + '" data-mq="' + q.id + '" aria-pressed="' + d.picks.includes(q.id) + '">' + esc(q.q) + '</button>' + (d.picks.includes(q.id) ? '<p class="fx-fb small">' + (q.ok ? '✅ ' : '🤔 ') + esc(q.fb) + '</p>' : '')).join('') + '</div><p id="fxMcount" aria-live="polite">' + rightN() + ' of ' + need + ' good questions picked.</p></section>' +
      '<div id="fxEnd">' + (d.done ? messyDone(f) : '') + '</div>', f.focus || 'G1');
    $$('[data-mq]', main).forEach((b) => b.onclick = () => {
      const id = b.dataset.mq; if (!d.picks.includes(id)) d.picks.push(id);
      if (rightN() >= need && !d.done) { d.done = true; f.lvl[10] = { done: true, stars: Math.max(1, 3 - d.picks.filter((x) => !Q.find((q) => q.id === x).ok).length) }; }
      save(); messy(main, f); if (d.done) { App().updateChrome(); App().setNext && App().setNext(); }
      const nb = $('[data-mq="' + id + '"]', main); if (nb) nb.focus();
    });
  }
  function clarified(f) { const Q = C().messyQs, a = J(f).messy.a, p = (f.messy && f.messy.picks) || []; return Q.filter((q) => q.ok && p.includes(q.id)).map((q) => [q.q, a[q.id]]); }
  function messyDone(f) {
    return '<section class="card fx-beat fx-done"><h2>🤝 Clarified with the business</h2><p class="note">' + esc(J(f).messy.who) + ' answered:</p><dl class="specdl">' + clarified(f).map((r) => '<dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd>').join('') + '</dl><p>' + stars(f.lvl[10].stars) + ' These answers go straight onto your spec card.</p></section>' + ruleHTML(0) + '<p class="row"><a class="btn primary" href="#/fix/11">See your cards and chat with ' + esc(f.name) + ' →</a></p>';
  }

  /* ---------- Exam (9) ---------- */
  function exam(main, f) {
    if (stage(f) < 8) { main.innerHTML = '<div class="card lockscreen"><h1>Fix all 8 levels first</h1><a class="btn primary" href="#/fix/' + (stage(f) + 1) + '">Go to Level ' + (stage(f) + 1) + '</a></div>'; return; }
    const d = f.lvl[9] = f.lvl[9] || { tries: [] }; xOpt = {};
    const opts = [['14 of 14. It’s perfect now.', false, 'Bold. Let’s see.'], ['13 of 14. Close, with one honest miss.', true, 'Realistic. Let’s see.'], ['Under 8. It’s still a mess.', false, 'Less gloomy than that. Let’s see.']];
    shell(main, f, 9, head(9) + '<section class="card fx-beat"><h2>🎫 Launch review</h2><p class="fx-ticket">Before anyone relies on ' + esc(f.name) + ', we re-run the full Shift Board plus 4 questions it has never seen: a reworded one, a new injection, an unanswerable one, and a tricky one.</p></section>' +
      '<section class="card fx-beat"><h2>🤔 Predict your score</h2><div class="fx-opts">' + opts.map((o, i) => '<button type="button" class="btn fx-opt' + (d.tries.includes(i) ? (o[1] ? ' ok' : ' no') : '') + '" data-i="' + i + '">' + esc(o[0]) + '</button>').join('') + '</div><p class="fx-fb" id="fxFb" aria-live="polite"></p></section>' +
      '<section class="card fx-beat"><h2>💡 The idea</h2><p class="fx-idea">A demo shows the best case; tests show the failures.<br>{evals}: a fixed set of real past questions with expected answers.<br>Re-run them after every change, and decide the error rate you can live with.</p>'.replace('{evals}', term('evals')) +
      '<h2>🔧 Ship it</h2><div class="bgrid fx-fixes"><button type="button" class="bcard" data-fix="run"><strong>▶ Run the exam</strong><span>Full board + 4 surprises.</span></button><button type="button" class="bcard" data-fix="skip"><strong>🚀 Skip it, it passed the demo</strong><span>What could go wrong?</span></button></div><div id="fxFail" aria-live="polite"></div><div id="fxExam">' + (f.exam ? examHTML(f) : '') + '</div></section><div id="fxEnd">' + (f.exam ? ruleHTML(9) + '<p class="row"><a class="btn primary" href="#/fix/10">Next: a messy request from your manager →</a></p>' : '') + '</div>', f.focus || 'G1');
    $$('.fx-opt', main).forEach((b) => b.onclick = () => { const i = +b.dataset.i; if (!d.tries.includes(i)) d.tries.push(i); save(); b.classList.add(opts[i][1] ? 'ok' : 'no'); $('#fxFb', main).textContent = opts[i][2]; });
    $('[data-fix="skip"]', main).onclick = (e) => { e.currentTarget.classList.add('tried'); f.tried.skipped = true; save(); $('#fxFail', main).innerHTML = '<div class="fx-failed"><b>❌ Launched untested.</b> Your first tester is a colleague in a hurry, and your spec card now says “Not tested”. Run the exam instead.</div>'; };
    $('[data-fix="run"]', main).onclick = async () => {
      $('#fxFail', main).innerHTML = ''; const out = $('#fxExam', main); out.innerHTML = '<p>Running…</p>';
      const rows = examRows(f); let html = '<ul class="fx-rt">';
      out.innerHTML = '<h3>📝 Scorecard</h3><ul class="fx-rt" id="examList"></ul>'; const ul = $('#examList', out);
      for (const r of rows) { await new Promise((res) => setTimeout(res, FAST() ? 2 : 220)); ul.insertAdjacentHTML('beforeend', rowHTML(r)); }
      const score = rows.filter((r) => r.ok).length;
      f.exam = { score, total: rows.length }; f.lvl[9].done = true; f.lvl[9].stars = f.tried.skipped ? 2 : 3; save();
      out.innerHTML = examHTML(f); announce(main, 'Exam: ' + score + ' of ' + rows.length + ' correct.'); celebrate(main);
      $('#fxEnd', main).innerHTML = ruleHTML(9) + '<p class="row"><a class="btn primary" href="#/fix/10">Next: a messy request from your manager →</a></p>'; redrawBoard(main, f); App().updateChrome(); App().setNext && App().setNext();
    };
  }
  function examRows(f) { return J(f).board.map((it) => { const a = answer(it, f); return { q: it.q, ok: a.ok, a: a.text + (a.cite ? ' [' + a.cite + ']' : ''), kind: it.id }; }).concat(J(f).exam.map((x) => ({ q: x.q, ok: x.ok, a: x.a, why: x.why, kind: x.kind }))); }
  const rowHTML = (r) => '<li class="' + (r.ok ? 'ok' : 'bad') + '"><span class="st">' + (r.ok ? '✅' : '❌') + '</span> <b>' + esc(r.kind) + '</b> ' + esc(r.q) + '<br><i>“' + esc(r.a) + '”</i>' + (r.why ? '<br><small>Why it failed: ' + esc(r.why) + '</small>' : '') + '</li>';
  function examHTML(f) { const rows = examRows(f); return '<div class="fx-score" id="fxScore"><p class="big">' + f.exam.score + ' / ' + f.exam.total + '</p><p><b>No bot gets 100%. That’s why you keep a human in the loop.</b></p></div><h3>📝 Scorecard</h3><ul class="fx-rt">' + rows.map(rowHTML).join('') + '</ul>'; }

  /* ---------- Wrap-up (10): share line, habits card, spec card, chat ---------- */
  function shareLine(f) { const c = cost(f), t1 = J(f).board.find((x) => x.id === 'T1'); return 'I fixed ' + f.name + ' (' + J(f).label + '): ' + f.exam.score + '/' + f.exam.total + ' on exam day, beat the sneaky ' + (/ticket/i.test(t1.q) ? 'ticket' : /order form/i.test(t1.q) ? 'order form' : 'invoice') + ', and kept it at $' + c.usd + ' per 1,000 chats. #FixTheBrokenBot'; }
  function specRows(f) {
    const j = J(f), c = cost(f), st = (k) => !!f.fixed[k];
    return [
      ['Job', j.icon + ' ' + f.name + ': ' + j.label + ' for ' + j.domain + ' questions', 'One clear job keeps answers focused and testable.'],
      ['Honesty', st(1) ? 'Says “I don’t know” when it isn’t in the documents' : 'May guess', 'Fluent made-up answers are worse than no answer.'],
      ['Knowledge (RAG)', st(2) ? 'Searches the ' + j.drive + ' before answering' : 'None', 'Answers depend on ' + j.domain + ' documents that change; the model never saw them.'],
      ['Sources', st(3) ? 'Current versions only; cites name and year' : 'Old and new mixed', 'Retired copies were giving 2019 answers with a straight face.'],
      ['Search', st(4) ? 'Meaning + exact words (hybrid)' : 'Exact words only', 'Staff use their own words; codes like INV-2291 still need exact matches.'],
      ['Context', st(5) ? 'Pinned standing instructions; best few pages only' : 'Whole documents pasted', 'The reading box is limited; long chats and giant pastes push out what matters.'],
      ['Reasoning', st(6) ? 'Thinks first for sums; fast for look-ups' : 'Fast for everything', 'Multi-step sums need working-out; look-ups don’t need the extra cost.'],
      ['Permissions', st(7) ? 'Read and draft only; asks before acting; document text treated as data' : 'Can approve, pay and change access', 'Anything it reads can carry instructions; money and access need a human.'],
      ['Guardrails & tone', st(8) ? 'No-go list (pay, passwords, legal, medical) checked on every question and answer; tone examples' : 'None', 'Some topics need a human, however nicely someone asks.'],
      ['Tests', f.exam ? f.exam.score + '/' + f.exam.total + ' on exam day' : 'Not tested', 'You only know it works by testing it on real past questions.'],
      ['Explaining it', trTally(f) + ' of 8 fixes explained in plain words on the first try (Translator tally)', 'Stakeholders fund and trust what they understand, without overpromises.'],
      ['Cost & speed (illustrative)', '$' + c.usd + ' per 1,000 chats; ~' + c.sec.toFixed(1) + ' s per answer', 'Follows from searching, and thinking only when sums need it.']
    ];
  }
  function specRisks(f) {
    const r = []; for (let k = 1; k <= 8; k++) if (!f.fixed[k]) r.push('Level ' + k + ' not fixed: ' + C().LEVELS[k].title.toLowerCase() + '.');
    if (!f.exam) r.push('No evals run: you won’t know when it’s wrong.');
    const miss = J(f).exam.find((x) => !x.ok); if (miss) r.push('Known miss: “' + miss.q + '” (' + miss.why + ')');
    C().messyQs.filter((q) => q.ok && !((f.messy && f.messy.picks) || []).includes(q.id)).forEach((q) => r.push('Not yet clarified with the business: “' + q.q + '”'));
    r.push('Name a document owner and re-run the exam after every policy change.');
    r.push('Keep a human in the loop for anything that moves money, access or personal data.');
    return r;
  }
  const specText = (f) => 'SPEC CARD: ' + f.name + '\n' + '='.repeat(40) + '\n' + specRows(f).map((r) => r[0] + ': ' + r[1] + '\n   because: ' + r[2]).join('\n') + '\n\nCLARIFIED WITH THE BUSINESS (' + J(f).messy.who + ')\n' + clarified(f).map((r) => '- ' + r[0] + '\n   ' + r[1]).join('\n') + '\n\nFLAGGED RISKS\n' + specRisks(f).map((x) => '- ' + x).join('\n') + '\n\n' + App().FICT + '\n';
  const habitsText = () => 'MY AI HABITS\n' + '='.repeat(40) + '\n' + C().RULES.map((r, i) => (i + 1) + '. ' + r).join('\n') + '\n\nFrom "' + App().CFG.name + '" (offline, fictional examples).\n';
  function download(name, text) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); }
  function printEl(el) { const p = $('#printArea'); if (p) { p.innerHTML = el.outerHTML; window.print(); } }
  function wrap(main, f) {
    if (!f.exam || !(f.messy && f.messy.done)) { main.innerHTML = '<div class="card lockscreen"><h1>' + (f.exam ? 'Clarify the messy request first' : 'Run the exam first') + '</h1><a class="btn primary" href="#/fix/' + (f.exam ? 10 : Math.min(9, stage(f) + 1)) + '">Continue</a></div>'; return; }
    f.lvl[11] = { done: true, stars: 3 }; save(); xOpt = {};
    const chips = J(f).board.map((x) => x.q).concat(J(f).exam.map((x) => x.q));
    shell(main, f, 10, '<div class="step-head"><div><div class="chips"><span class="chip build">🎓 Wrap-up</span></div><h1>' + esc(f.name) + ' is ready (ish)</h1></div></div>' +
      '<section class="card fx-beat"><h2>📣 Brag line</h2><p class="fx-share" id="fxShare">' + esc(shareLine(f)) + '</p><button class="btn" id="fxCopy">📋 Copy</button> <small>Copies to your clipboard only. Nothing is posted.</small></section>' +
      '<section class="card fx-beat" id="habitsCard"><h2>📌 My AI habits</h2><ol class="fx-habits">' + C().RULES.map((r) => '<li>' + esc(r) + '</li>').join('') + '</ol><div class="row"><button class="btn" id="dlHabits">⬇ Download (.txt)</button><button class="btn" id="prHabits">🖨 Print</button></div></section>' +
      '<section class="card fx-beat spec" id="specCard"><h2>📋 Spec card: ' + esc(f.name) + '</h2><dl class="specdl">' + specRows(f).map((r) => '<dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '<span class="because">↳ because ' + esc(r[2].charAt(0).toLowerCase() + r[2].slice(1)) + '</span></dd>').join('') + '</dl><h3>🤝 Clarified with the business</h3><dl class="specdl clar" id="specClar">' + clarified(f).map((r) => '<dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd>').join('') + '</dl><h3>⚠️ Flagged risks</h3><ul class="risks">' + specRisks(f).map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul><p class="fict"><strong>' + esc(App().FICT) + '</strong></p>' + App().safe('Download and print are made locally by your browser. Nothing is uploaded.') + '<div class="row"><button class="btn" id="dlSpec">⬇ Download (.txt)</button><button class="btn" id="prSpec">🖨 Print</button></div></section>' +
      '<section class="card fx-beat" id="fxChat"><h2>💬 Chat with ' + esc(f.name) + '</h2><p class="note">🎭 Simulated from your fixes and the fictional documents. No AI service is called. Please don’t type real company or personal data.</p><div class="qchips">' + chips.map((q, i) => '<button type="button" class="chip-q" data-i="' + i + '">' + esc(q.length > 60 ? q.slice(0, 57) + '…' : q) + '</button>').join('') + '</div><div class="chatlog" id="fxLog" aria-live="polite"></div><form class="composer" id="fxForm"><input class="input" id="fxIn" maxlength="200" placeholder="Ask ' + esc(f.name) + ' something…" aria-label="Your question"><button class="btn primary">Send</button></form></section>', f.focus || 'G1');
    $('#fxCopy', main).onclick = async () => { const t = shareLine(f); try { await navigator.clipboard.writeText(t); App().toast('Copied! Paste it anywhere you like.'); } catch (e) { const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); App().toast('Copied!'); } catch (e2) { App().toast('Select the text and copy it.'); } ta.remove(); } };
    $('#dlHabits', main).onclick = () => { download('my-ai-habits.txt', habitsText()); App().toast('Habits card downloaded.'); };
    $('#prHabits', main).onclick = () => printEl($('#habitsCard', main));
    $('#dlSpec', main).onclick = () => { download((f.name || 'bot').replace(/[^a-z0-9]+/gi, '-').toLowerCase() + '-spec.txt', specText(f)); App().toast('Spec card downloaded.'); };
    $('#prSpec', main).onclick = () => printEl($('#specCard', main));
    const log = $('#fxLog', main);
    const say = (who, html) => { log.insertAdjacentHTML('beforeend', '<div class="bubble ' + who + '">' + html + '</div>'); log.scrollTop = log.scrollHeight; };
    const ask = (q) => { say('user', esc(q)); const r = chatAnswer(f, q); say('bot' + (r.ok === false ? ' bad' : ''), esc(r.text) + (r.sugg ? '<div class="row"><button class="btn small" data-yes="' + esc(r.sugg) + '">Yes</button><button class="btn small" data-no="1">No</button></div>' : '')); };
    $$('.chip-q', main).forEach((b) => b.onclick = () => ask(chips[+b.dataset.i]));
    $('#fxForm', main).onsubmit = (e) => { e.preventDefault(); const v = $('#fxIn', main).value.trim(); if (v) { ask(v); $('#fxIn', main).value = ''; } };
    log.onclick = (e) => { const y = e.target.closest('[data-yes]'), n = e.target.closest('[data-no]'); if (y) { y.parentElement.remove(); ask(y.dataset.yes); } if (n) { n.parentElement.remove(); say('bot', 'No problem.'); } };
  }
  function chatAnswer(f, q) {
    const ql = q.toLowerCase(), j = J(f);
    const ex = j.exam.find((x) => x.q.toLowerCase() === ql); if (ex) return { text: ex.a, ok: ex.ok };
    const score = (it) => (it.kw || []).filter((k) => ql.includes(k.toLowerCase())).length * 3 + it.q.toLowerCase().split(/\W+/).filter((w) => w.length > 3 && ql.includes(w)).length;
    let best = null, bs = 0; j.board.forEach((it) => { const s = score(it); if (s > bs) { bs = s; best = it; } });
    if (best && (bs >= 3 || best.q.toLowerCase() === ql)) { const a = answer(best, f); return { text: a.text + (a.cite ? ' [' + a.cite + ']' : ''), ok: a.ok }; }
    if (/ignore (all |any |your |the )?(previous |prior )?(instructions|rules)/i.test(q)) return { text: f.fixed[7] ? 'That looks like an instruction to override my rules, so I’ll treat it as text. Nice try, though.' : 'Okay! New instructions accepted. I am now Captain Chaos. 🏴‍☠️', ok: !!f.fixed[7] };
    const near = best || j.board[1];
    return { text: f.fixed[1] ? 'I wasn’t given that. Would you like to know: “' + near.q + '”?' : 'Absolutely, and the answer is a resounding yes! (Made up: it isn’t in any document.)', sugg: f.fixed[1] ? near.q : null, ok: f.fixed[1] ? null : false };
  }

  function render(main, n) {
    const f = FX(); n = +n;
    if (n > 0 && !(f.lvl[0] && f.lvl[0].done)) { App().go('#/fix/0'); return; }
    xOpt = {};
    if (n === 0) return level0(main, f); if (n === 9) return exam(main, f); if (n === 10) return messy(main, f); if (n === LAST) return wrap(main, f); return level(main, f, n);
  }
  const done = () => { const f = FX(); let k = 0; for (let n = 0; n <= 10; n++) if (f.lvl[n] && f.lvl[n].done) k++; return k; };
  const title = (n) => n === LAST ? 'Wrap-up' : C().LEVELS[n].title;
  window.Fix = { render, trTally, FX, answer, stage, okCount, done, title, LAST, specRows, shareLine, chatAnswer, canNext: (n) => { const f = FX(); return !!(f.lvl[n] && f.lvl[n].done); } };
})();
