/* Raise Your Own Baby AI — app shell. No network calls; state lives in localStorage only. */
(function () {
  'use strict';
  const C = window.COURSE, X = window.EXTRAS, F = window.FUN;
  const KEY = 'ryoba.v1';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const step = (n) => C.steps[n - 1];

  // ---------- state ----------
  const blank = () => ({ v: 1, name: '', route: '', path: 'build', done: {}, visited: {}, challenge: {}, quiz: {}, hood: {}, w: {}, ws: {}, wsGrad: null, forkSeen: false });
  let S;
  try { S = Object.assign(blank(), JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { S = blank(); }
  let storageOK = true;
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { if (storageOK) { storageOK = false; toast('Heads up: your browser is blocking local storage, so progress won\u2019t be saved this time.'); } } }

  // ---------- helpers ----------
  let toastT;
  function toast(msg, ms) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), ms || 3200); }
  function linkSteps(html) { return String(html || '').replace(/\bStep (\d{1,2})\b(?![-\u2013\d])/g, (m, n) => (+n >= 1 && +n <= 21) ? '<a href="#/step/' + n + '">Step ' + n + '</a>' : m); }
  function illus() { return '<span class="illus">Illustrative output</span>'; }
  function conf() { return '<span class="conf" tabindex="0" title="' + esc(F.confidenceTip) + '" aria-label="' + esc(F.confidence + '. ' + F.confidenceTip) + '">' + F.confidence + '</span>'; }

  // ---------- modal ----------
  let lastFocus = null;
  function openModal(html, onMount) {
    closeModal(true);
    lastFocus = document.activeElement;
    const back = document.createElement('div');
    back.className = 'modal-back'; back.id = 'modalBack';
    back.innerHTML = '<div class="modal pop" role="dialog" aria-modal="true" aria-labelledby="modalTitle">' + html + '</div>';
    document.body.appendChild(back);
    const m = back.firstChild;
    back.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
      if (e.key === 'Tab') { const f = $$('button,a[href],input,select,textarea', m).filter((x) => !x.disabled); if (!f.length) return; const a = f[0], z = f[f.length - 1]; if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); } }
    });
    back.addEventListener('click', (e) => { if (e.target === back) closeModal(); });
    if (onMount) onMount(m);
    const first = $('button,a[href]', m); if (first) first.focus();
  }
  function closeModal(silent) { const b = $('#modalBack'); if (b) { b.remove(); if (!silent && lastFocus && lastFocus.focus) lastFocus.focus(); } }

  // ---------- glossary ----------
  const terms = Object.keys(X.glossary).sort((a, b) => b.length - a.length);
  const caseSensitive = /^(RAG|MCP|DPO|RLHF)$/;
  function glossify(roots) {
    const used = new Set();
    roots.forEach((root) => {
      if (!root) return;
      terms.forEach((term) => {
        if (used.has(term)) return;
        const re = new RegExp('\\b(' + term.replace(/[-]/g, '\\-') + ')(s|es)?\\b', caseSensitive.test(term) ? '' : 'i');
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: (n) => n.parentElement.closest('button,a,code,h1,h2,h3,h4,.gloss,summary,label,select,textarea') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
        let node;
        while ((node = walker.nextNode())) {
          const m = re.exec(node.nodeValue);
          if (!m) continue;
          const after = node.splitText(m.index); after.splitText(m[0].length);
          const b = document.createElement('button'); b.type = 'button'; b.className = 'gloss'; b.dataset.term = term; b.setAttribute('aria-expanded', 'false'); b.textContent = after.nodeValue;
          b.setAttribute('aria-label', after.nodeValue + ' (glossary)');
          after.parentNode.replaceChild(b, after); used.add(term); break;
        }
      });
    });
  }
  function showGloss(btn) {
    hideGloss();
    const pop = document.createElement('div'); pop.className = 'gloss-pop pop'; pop.id = 'glossPop'; pop.setAttribute('role', 'tooltip');
    pop.innerHTML = '<b>' + esc(btn.dataset.term) + '</b>: ' + esc(X.glossary[btn.dataset.term]);
    document.body.appendChild(pop);
    const r = btn.getBoundingClientRect();
    pop.style.top = (window.scrollY + r.bottom + 8) + 'px';
    pop.style.left = Math.max(8, Math.min(window.scrollX + r.left, window.scrollX + document.documentElement.clientWidth - pop.offsetWidth - 8)) + 'px';
    btn.setAttribute('aria-expanded', 'true'); btn.setAttribute('aria-describedby', 'glossPop');
  }
  function hideGloss() { const p = $('#glossPop'); if (p) p.remove(); $$('.gloss[aria-expanded="true"]').forEach((b) => { b.setAttribute('aria-expanded', 'false'); b.removeAttribute('aria-describedby'); }); }
  document.addEventListener('click', (e) => { const g = e.target.closest('.gloss'); if (g) { e.preventDefault(); if (g.getAttribute('aria-expanded') === 'true') hideGloss(); else showGloss(g); } else if (!e.target.closest('#glossPop')) hideGloss(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { hideGloss(); closeDrawer(); } });

  // ---------- routing ----------
  const OPT_ORDER = [9, 10, 11, 12, 'c1', 13, 14, 15, 'c2', 16, 17, 18, 'c3', 19, 20, 21];
  function parse(h) {
    const p = (h || '').replace(/^#\/?/, '').split('?');
    const parts = p[0].split('/');
    const q = {}; (p[1] || '').split('&').forEach((kv) => { if (kv) { const [k, v] = kv.split('='); q[k] = decodeURIComponent(v || ''); } });
    return { name: parts[0] || 'welcome', arg: parts[1], q };
  }
  function routeOf(name, arg) { return '#/' + name + (arg != null ? '/' + arg : ''); }
  function isUnlocked(n) { if (n <= 9 || S.path === 'read') return true; return !!S.done[n - 1]; }
  function nextPrev(r) {
    const n = +r.arg;
    switch (r.name) {
      case 'welcome': return { next: '#/step/1', nextLabel: 'Let\u2019s raise a baby \u2192' };
      case 'step':
        if (n < 8) return { prev: n === 1 ? '#/welcome' : '#/step/' + (n - 1), next: '#/step/' + (n + 1) };
        if (n === 8) return { prev: '#/step/7', next: '#/fork', nextLabel: 'Graduate \ud83c\udf93 \u2192' };
        if (S.path === 'read') return { prev: n === 9 ? '#/read' : '#/step/' + (n - 1), next: n === 21 ? '#/upgrade' : '#/step/' + (n + 1), nextLabel: n === 21 ? 'Back to my worksheet \u2192' : undefined };
        { const i = OPT_ORDER.indexOf(n); const toR = (x) => typeof x === 'string' ? '#/checkpoint/' + x.slice(1) : '#/step/' + x;
          return { prev: i === 0 ? '#/fork' : toR(OPT_ORDER[i - 1]), next: n === 21 ? '#/upgrade' : toR(OPT_ORDER[i + 1]), nextLabel: n === 21 ? 'Back to my worksheet \u2192' : undefined }; }
      case 'checkpoint': { const k = +r.arg; return { prev: '#/step/' + [12, 15, 18][k - 1], next: '#/step/' + [13, 16, 19][k - 1], nextLabel: pick(F.keepGoing) }; }
      case 'fork': return { prev: '#/step/8', next: S.path === 'read' ? '#/read' : '#/step/9', nextLabel: S.path === 'read' ? 'Open the reading list \u2192' : 'Keep building \u2192' };
      case 'worksheet': return { prev: '#/step/8', next: S.forkSeen ? (S.path === 'read' ? '#/read' : '#/step/9') : '#/fork', nextLabel: S.forkSeen ? 'Optional steps \u2192' : 'What next? \u2192' };
      case 'read': return { prev: '#/fork', next: '#/step/9', nextLabel: 'Start with Step 9 \u2192' };
      case 'summary': return { prev: null, next: '#/upgrade', nextLabel: 'Back to my worksheet \u2192' };
      case 'upgrade': return { prev: '#/step/21', next: null };
      default: return {};
    }
  }
  function whereLabel(r) {
    if (r.name === 'step') { const s = step(+r.arg); return s.optional ? 'Optional step ' + s.n + ' of 21 \u00b7 ' + s.name : 'Step ' + s.n + ' of 8 \u00b7 ' + s.name; }
    return { welcome: 'Welcome', fork: 'The Fork in the Road', checkpoint: 'Checkpoint ' + r.arg + ' of 3', worksheet: 'Requirement Framing Worksheet', read: 'Reading list (Steps 9-21)', summary: 'Your progress', upgrade: 'Back to the Worksheet' }[r.name] || '';
  }

  let current = null; let forkShown = false;
  function go(hash) { if (location.hash === hash) render(); else location.hash = hash; }
  function render() {
    hideGloss(); closeModal(true); closeDrawer(true);
    const r = parse(location.hash);
    if (!['welcome', 'step', 'fork', 'checkpoint', 'worksheet', 'read', 'summary', 'upgrade'].includes(r.name) || (r.name === 'step' && !(+r.arg >= 1 && +r.arg <= 21)) || (r.name === 'checkpoint' && !(+r.arg >= 1 && +r.arg <= 3))) { location.replace('#/welcome'); return; }
    current = r;
    const main = $('#main'); main.innerHTML = '';
    if (r.name !== 'welcome') { S.route = location.hash; }
    if (r.name === 'step') S.visited[r.arg] = true;
    save();
    ({ welcome: renderWelcome, step: renderStep, fork: renderFork, checkpoint: renderCheckpoint, worksheet: renderWorksheet, read: renderRead, summary: renderSummary, upgrade: renderUpgrade })[r.name](main, r);
    // nav bar
    const np = nextPrev(r);
    const back = $('#backBtn'), next = $('#nextBtn');
    back.disabled = !np.prev; back.dataset.href = np.prev || '';
    next.hidden = !np.next; next.dataset.href = np.next || '';
    next.textContent = np.nextLabel || 'Next \u2192';
    $('#where').textContent = whereLabel(r);
    document.title = whereLabel(r) + ' \u2014 Raise Your Own Baby AI';
    updateChrome();
    window.scrollTo(0, 0);
    const h1 = $('h1', main); if (h1) { h1.setAttribute('tabindex', '-1'); h1.focus({ preventScroll: true }); }
  }
  function onNext() {
    const r = current; const href = $('#nextBtn').dataset.href; if (!href) return;
    if (r.name === 'step') { S.done[r.arg] = true; save(); }
    if (r.name === 'step' && +r.arg === 12 || r.name === 'step' && +r.arg === 15 || r.name === 'step' && +r.arg === 18) { /* checkpoints follow in build mode */ }
    go(href);
  }

  // ---------- chrome: progress, drawer, path ----------
  function updateChrome() {
    const core = [1, 2, 3, 4, 5, 6, 7, 8].filter((n) => S.done[n]).length;
    const opt = OPT_ORDER.filter((x) => typeof x === 'number' && S.done[x]).length;
    $('#pCore').style.width = (core / 8 * 100) + '%';
    $('#pOpt').style.width = (opt / 13 * 100) + '%';
    $('#progCore').setAttribute('aria-valuenow', core); $('#progOpt').setAttribute('aria-valuenow', opt);
    $('#progressLabel').textContent = 'Core ' + core + '/8 \u00b7 Optional ' + opt + '/13';
    $$('.path-switch button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.path === S.path)));
    buildDrawer();
  }
  function setPath(p, silent) {
    S.path = p; save();
    if (!silent) toast(p === 'read' ? 'Reading mode \ud83d\udcd6: open any optional step, challenges shrink to their key lesson.' : 'Building mode \ud83e\uddf8: optional steps play in order with full challenges.');
    if (current) render();
  }
  function buildDrawer() {
    const d = $('#drawerList'); if (!d) return;
    const cur = location.hash;
    const li = (href, num, label, opts) => {
      opts = opts || {};
      const cls = opts.done ? 'done' : '';
      if (opts.locked) return '<li class="' + cls + '"><span class="locked" title="Finish the previous step first, or switch to Reading mode"><span class="num" aria-hidden="true">\ud83d\udd12</span>' + esc(label) + '<span class="sr-only"> (locked: finish the previous step or switch to Reading)</span></span></li>';
      return '<li class="' + cls + '"><a href="' + href + '"' + (cur === href ? ' aria-current="page"' : '') + '><span class="num" aria-hidden="true">' + (opts.done ? '\u2713' : num) + '</span>' + esc(label) + (opts.done ? '<span class="sr-only"> (done)</span>' : '') + '</a></li>';
    };
    let h = '<h2>The core build</h2><ol>' + li('#/welcome', '\u2302', 'Welcome');
    for (let n = 1; n <= 8; n++) h += li('#/step/' + n, n, step(n).name, { done: S.done[n] });
    h += li('#/worksheet', '\u270e', 'Requirement Framing Worksheet') + li('#/fork', '\u2442', 'The Fork in the Road') + '</ol>';
    C.chapters.forEach((ch) => {
      h += '<h2>Chapter ' + ch.n + ': ' + esc(ch.title) + '</h2><ol>';
      ch.steps.forEach((n) => { h += li('#/step/' + n, n, step(n).name, { done: S.done[n], locked: !isUnlocked(n) }); });
      if (ch.n < 4) h += li('#/checkpoint/' + ch.n, '\u23f8', 'Checkpoint ' + ch.n + ' of 3', { locked: S.path !== 'read' && !S.done[ch.steps[ch.steps.length - 1]] });
      h += '</ol>';
    });
    h += '<h2>Wrap-up</h2><ol>' + li('#/upgrade', '\u2605', 'Back to the Worksheet') + li('#/read', '\ud83d\udcd6', 'Reading list (any order)') + li('#/summary', '\u2261', 'My progress') + '</ol>';
    d.innerHTML = h;
  }
  function openDrawer() { const d = $('#drawer'); d.classList.add('open'); d.removeAttribute('aria-hidden'); $('#menuBtn').setAttribute('aria-expanded', 'true'); const s = document.createElement('div'); s.className = 'scrim'; s.id = 'scrim'; s.onclick = () => closeDrawer(); document.body.appendChild(s); const a = $('a[aria-current],a,button', d); if (a) a.focus(); }
  function closeDrawer(silent) { const d = $('#drawer'); if (!d || !d.classList.contains('open')) return; d.classList.remove('open'); d.setAttribute('aria-hidden', 'true'); $('#menuBtn').setAttribute('aria-expanded', 'false'); const s = $('#scrim'); if (s) s.remove(); if (!silent) $('#menuBtn').focus(); }
  function resetAll() {
    if (!confirm('Reset all progress, quiz answers and your worksheet on this device? This can\u2019t be undone. (The baby will forget everything. Very on-theme.)')) return;
    try { localStorage.removeItem(KEY); } catch (e) { }
    S = blank(); save(); toast('Fresh start! The baby is babbling again.'); go('#/welcome');
  }

  // ---------- screens ----------
  function renderWelcome(main) {
    const resume = S.route && S.route !== '#/welcome' ? S.route : '';
    const rl = resume ? whereLabel(parse(resume)) : '';
    main.innerHTML =
      '<section class="hero">' + babySVG(['pacifier'], 140) +
      '<div><div class="chips"><span class="chip">Internal AI-literacy course</span><span class="chip time">Core build ~75-90 min</span></div>' +
      '<h1>Raise Your Own Baby AI</h1><p class="concept">An interactive course for office teams on how LLMs really work, so we can ask for AI that actually delivers.</p>' +
      '<p><strong>Warning:</strong> side effects may include saying \u201cit depends on the retrieval\u201d in meetings.</p>' +
      '<div class="row">' + (resume ? '<a class="btn primary" href="' + resume + '">Continue: ' + esc(rl) + ' \u2192</a><a class="btn" href="#/step/1">Start from Step 1</a>' : '<a class="btn primary" href="#/step/1">Meet your baby AI \u2192</a>') + '</div></div></section>' +
      '<div class="card"><span class="section-label">Live from the nursery</span><p class="babble" id="babble" aria-live="off"></p><p class="note">This is the baby on day one: picking random letters. By Step 1\u2019s end it will be picking random <em>words</em>. Progress!</p></div>' +
      '<div class="card"><h2>Hello! What should the baby call you?</h2><div class="field"><label for="nameIn">First name (optional, stays in this browser)</label><input class="input" id="nameIn" autocomplete="given-name" maxlength="40" value="' + esc(S.name) + '" placeholder="e.g. Priya, Tom, Ananya, Sam"></div><p id="nameHi" class="status" aria-live="polite"></p></div>' +
      '<div class="card"><h2>The pitch</h2>' + C.intro.pitch + '</div>' +
      '<div class="card"><h2>Two paths, one baby</h2><div class="path-cards">' +
      '<div><h3>\ud83c\udf7c Core build (Steps 1-8)</h3><p>Everyone does these. One screen per step, ~10 minutes each, ending with a real AI requirement you write yourself.</p></div>' +
      '<div><h3>\ud83e\uddf8 Keep building (Steps 9-21)</h3><p>Optional. Four short chapters with full Break it! challenges, in order. Stop after any step.</p></div>' +
      '<div><h3>\ud83d\udcd6 Just read</h3><p>The same optional topics as plain reading, in any order, with each challenge shrunk to its key lesson.</p></div></div>' +
      '<p class="note">You choose after graduation, and you can switch any time with the <strong>Building / Reading</strong> switch at the top.</p></div>' +
      '<div class="card"><h2>How every step works</h2><ol><li><strong>Hook</strong>: one opening line (often a bad joke).</li><li><strong>What you see</strong>: the baby before and after (illustrative).</li><li><strong>What\u2019s really happening</strong>: the real mechanism, in plain words. The metaphor is fun; this part is the truth.</li><li><strong>Break it!</strong>: a hands-on challenge. Breaking things is the fastest way to learn their limits.</li><li><strong>Myth-buster</strong>, <strong>So what for your requirement?</strong> and a one-question <strong>Quick check</strong>.</li><li><strong>Under the hood</strong>: a closed panel with a diagram and technical bullets for the curious.</li></ol><p>Underlined words like <button type="button" class="gloss" data-term="token" aria-expanded="false">token</button> open a one-line definition.</p></div>' +
      '<div class="card"><h2>By the end you\u2019ll be able to\u2026</h2>' + C.intro.outcomes + '</div>' +
      '<div class="card"><h2>What this course does NOT promise (an honest note)</h2>' + C.intro.honest + '</div>' +
      '<details class="card"><summary><strong>Running it with your team (facilitator notes)</strong></summary>' + C.intro.howToRun + '</details>' +
      '<p class="privacy">\ud83d\udd12 <strong>Privacy:</strong> nothing you type is sent anywhere. There is no server, no login and no live AI: every baby-AI reply is scripted in this page. Progress and your worksheet are saved only in this browser, so switching devices or clearing your browser starts you fresh.</p>' +
      '<div class="row"><button class="btn small" id="resetBtn2">Reset my progress</button></div>';
    const nameIn = $('#nameIn', main);
    const hi = () => { $('#nameHi', main).textContent = S.name ? 'Hi ' + S.name + '! The baby says: \u201c' + S.name.toLowerCase().split('').reverse().join('') + '?\u201d It\u2019s working on it.' : ''; };
    nameIn.addEventListener('input', () => { S.name = nameIn.value.trim(); save(); hi(); }); hi();
    $('#resetBtn2', main).onclick = resetAll;
    // babbler animation
    const out = $('#babble', main); const chars = 'abcdefghijklmnopqrstuvwxyz #@!?'; let i = 0;
    const tick = () => { if (!document.body.contains(out)) return; if (i++ > 60) { out.textContent = ''; i = 0; } out.textContent += chars[Math.floor(Math.random() * chars.length)]; setTimeout(tick, 70); };
    out.setAttribute('aria-label', 'Animated random letters, for example: xq#vplm oo ztr kkaey'); tick();
  }

  function renderStep(main, r) {
    const n = +r.arg, s = step(n);
    if (s.optional && !isUnlocked(n)) {
      let first = 9; while (first < n && S.done[first]) first++;
      main.innerHTML = '<div class="card lockscreen">' + babySVG(['cap'], 110, 'oops') + '<h1>Not so fast!</h1><p>In <strong>Building</strong> mode the optional steps unlock in order, like a baby learning to walk before it runs. You\u2019re up to <strong>Step ' + first + ': ' + esc(step(first).name) + '</strong>.</p><div class="row" style="justify-content:center"><a class="btn primary" href="#/step/' + first + '">Go to Step ' + first + '</a><button class="btn" id="toRead">Switch to Reading mode</button></div></div>';
      $('#toRead', main).onclick = () => setPath('read');
      return;
    }
    const readMode = s.optional && S.path === 'read';
    const ch = s.optional ? C.chapters.find((c) => c.steps.includes(n)) : null;
    const acc = X.accessories[n] || [];
    const done = !!S.challenge[n];
    let h = '<div class="step-head">' + babySVG(acc, 92) + '<div><div class="chips">' +
      (s.optional ? '<span class="chip opt">Optional step ' + n + ' of 21</span><span class="chip">Chapter ' + ch.n + ': ' + esc(ch.title) + '</span>' : '<span class="chip">Step ' + n + ' of 8 \u00b7 Core</span>') +
      '<span class="chip time">\u23f1 ~' + esc(readMode ? '5-8 minutes to read' : s.time.replace(/,.*$/, '')) + '</span></div>' +
      '<h1>' + X.emoji[n] + ' ' + esc(s.name) + '</h1><p class="concept">' + esc(s.concept) + '</p>' +
      (s.buildsOn ? '<p class="note">Builds on ' + linkSteps(s.buildsOn.replace(/Steps (\d+) and (\d+)/, 'Step $1 and Step $2').replace(/Steps (\d+), (\d+) and (\d+)/, 'Step $1, Step $2 and Step $3')) + '.</p>' : '') + '</div></div>';
    h += '<div class="card hook" id="hook"><span class="section-label">Hook</span><div>' + s.hook + '<span class="quip">' + esc(F.hookQuip[n]) + '</span></div></div>';
    h += '<div class="card"><span class="section-label">What you see</span> ' + illus() + '<div class="ba" style="margin-top:10px"><div class="before"><h4>' + s.see.head[0] + '</h4><div>' + s.see.before + '</div></div><div class="after"><h4>' + s.see.head[1] + '</h4><div>' + s.see.after + '</div></div></div>' + (s.see.note ? '<p class="note">' + s.see.note + '</p>' : '') + '</div>';
    h += '<div class="card mech" id="mech"><h2>What\u2019s really happening</h2>' + linkSteps(s.mechanism) + '</div>';
    if (s.workplace) h += '<div class="card" id="workplace"><h2>Workplace examples</h2>' + linkSteps(s.workplace) + '</div>';
    h += '<section class="card breakit' + (done ? ' complete' : '') + '" id="breakit" aria-labelledby="bi-h"><h2 id="bi-h">\ud83d\udd28 Break it! \u2014 \u201c' + esc(s.breakName) + '\u201d</h2><p class="goal"><strong>Goal:</strong> ' + s.goal + '</p>' +
      (readMode ? '<p class="discover"><strong>What you\u2019d discover:</strong> ' + s.discover + '</p><p class="note">You\u2019re in Reading mode, so the interactive challenge is hidden. <button class="btn small" id="toBuild">Switch to Building to play it</button></p>'
        : '<div class="widget" id="widget"></div>' + (s.discover ? '<details style="margin-top:12px"><summary><strong>Spoiler: what you discover</strong></summary><p class="discover">' + s.discover + '</p></details>' : '') +
        '<div class="done-banner" role="status" aria-live="polite" id="doneBanner">\u2705 Challenge complete! ' + (S.w[n] && S.w[n]._msg ? esc(S.w[n]._msg) : 'You broke it, and you know why.') + '</div>') + '</section>';
    h += '<div class="card" id="myths"><h2>\ud83d\udeab Myth-buster</h2>' + s.myths.map((m) => '<div class="myth"><span class="badge bm">MYTH</span><span class="m">' + m.myth + '</span><span class="badge br">REALITY</span><span>' + linkSteps(m.reality) + '</span></div>').join('') + '<p class="punch">' + esc(F.mythPunch[n]) + '</p></div>';
    h += '<div class="card sowhat" id="sowhat"><h2>\ud83d\udccc So what for your requirement?</h2><ul>' + s.sowhat.map((x) => '<li>' + linkSteps(x) + '</li>').join('') + '</ul>' +
      (s.worksheetUpdate ? '<p class="ws-update">\ud83d\udcdd <strong>Update your worksheet:</strong> ' + s.worksheetUpdate + ' <a href="#/worksheet?hl=' + (s.worksheetUpdate.match(/\d+/g) || []).filter((x) => +x <= 13).join(',') + '">Open those sections</a></p>' : '') + '</div>';
    h += '<section class="card quiz" id="quiz"><h2>\u2753 Quick check</h2><fieldset><legend>' + s.quiz.q + '</legend>' + s.quiz.options.map((o, i) => '<button type="button" class="opt" data-i="' + i + '">(' + 'abc'[i] + ') ' + esc(o) + '</button>').join('') + '</fieldset><p class="fb" role="status" aria-live="polite"></p><p class="note">Nothing is scored or stored anywhere except this browser.</p></section>';
    h += '<details class="hood" id="hood"' + (S.hood[n] ? ' open' : '') + '><summary>\ud83d\udd27 Under the hood: ' + esc(s.hoodTitle) + '</summary><div class="hood-body"><div class="vis" id="vis"></div><p class="caption">' + s.hoodCaption + '</p><ul>' + s.hoodBullets.map((b) => '<li>' + b + '</li>').join('') + '</ul></div></details>';
    if (s.optional) h += '<div class="row" style="justify-content:space-between"><a class="btn" href="#/summary">\u23f8 ' + esc(pick(F.stopHere)) + '</a>' + (S.path === 'read' ? '<a class="btn ghost" href="#/read">Back to the reading list</a>' : '') + '</div>';
    main.innerHTML = h;

    // quiz
    const qs = $('#quiz', main);
    const showQuiz = (i, fresh) => {
      $$('.opt', qs).forEach((b) => { b.classList.remove('correct', 'wrong'); b.setAttribute('aria-pressed', 'false'); });
      const b = $$('.opt', qs)[i]; b.setAttribute('aria-pressed', 'true');
      const ok = i === s.quiz.correct;
      b.classList.add(ok ? 'correct' : 'wrong');
      $('.fb', qs).innerHTML = (ok ? '\u2705 ' + esc(fresh ? pick(F.right) : 'Correct.') + ' ' : '\ud83e\udd14 ' + esc(fresh ? pick(F.wrong) : 'Not quite.') + ' Try another option. ') + (ok ? esc(X.quizWhy[n]) : '');
      if (ok) { S.done[n] = true; save(); updateChrome(); }
    };
    $$('.opt', qs).forEach((b) => b.addEventListener('click', () => { S.quiz[n] = +b.dataset.i; save(); showQuiz(+b.dataset.i, true); }));
    if (S.quiz[n] != null) showQuiz(S.quiz[n], false);
    // hood
    const hood = $('#hood', main); let visDone = false;
    const mountVis = () => { if (visDone) return; visDone = true; const v = $('#vis', main); try { (window.VISUALS[n] || (() => { }))(v, s); } catch (e) { console.error(e); } if (s.diagram) v.insertAdjacentHTML('beforeend', '<img class="diagram" src="assets/diagrams/diagram' + s.diagram + '.svg" alt="Flow diagram. ' + esc(s.hoodVisualDesc.slice(0, 300)) + '" loading="lazy">'); glossify([]); };
    hood.addEventListener('toggle', () => { S.hood[n] = hood.open; save(); if (hood.open) mountVis(); });
    if (hood.open) mountVis();
    // widget
    if (readMode) { $('#toBuild', main).onclick = () => setPath('build'); }
    else {
      const wEl = $('#widget', main);
      S.w[n] = S.w[n] || {};
      const api = {
        n, state: S.w[n], save, toast, esc, pick, F, illus, conf,
        get complete() { return !!S.challenge[n]; },
        done(msg) {
          if (S.challenge[n]) return; S.challenge[n] = true; if (msg) S.w[n]._msg = msg; save();
          const bi = $('#breakit', main); bi.classList.add('complete'); $('#doneBanner', main).textContent = '\u2705 Challenge complete! ' + (msg || 'You broke it, and you know why.');
          toast('\ud83c\udf89 Challenge complete! ' + (msg || ''), 4200);
        },
        loading() { return pick(F.loading); },
        go
      };
      try { window.WIDGETS[n](wEl, api); } catch (e) { console.error('widget ' + n, e); wEl.innerHTML = '<p>Sorry, this toy hit a snag. The rest of the step still works.</p>'; }
    }
    glossify([$('#hook', main), $('#mech', main), $('#workplace', main), $('#myths', main), $('#sowhat', main)]);
  }

  function renderFork(main) {
    if (window.WS && ![9,10,11,12,13,14,15,16,17,18,19,20,21].some((n) => S.done[n] || S.visited[n])) { S.wsGrad = JSON.parse(JSON.stringify(S.ws)); }
    S.forkSeen = true; save();
    main.innerHTML = '<div class="card" style="text-align:center">' + babySVG(['cap'], 140, 'wow') + '<h1>\ud83c\udf93 Your baby AI has graduated' + (S.name ? ', ' + esc(S.name) : '') + '!</h1><p>' + C.upgrade.graduation + '</p><p class="note">The baby wanted to give a speech. It was 4,000 tokens of \u201cregards\u201d. We cut it.</p>' +
      '<div class="row" style="justify-content:center"><button class="btn primary" id="openFork">What next?</button><a class="btn" href="#/worksheet">Back to my worksheet</a></div></div>' +
      '<div class="card"><h2>The optional build at a glance</h2><div class="table-wrap"><table><thead><tr><th>Chapter</th><th>Steps</th><th>Concepts</th></tr></thead><tbody>' +
      C.chapters.map((c) => '<tr><td>' + c.n + ': ' + esc(c.title) + '</td><td>' + c.steps.join(', ') + '</td><td>' + c.steps.map((n) => esc(step(n).name)).join(' \u00b7 ') + '</td></tr>').join('') + '</tbody></table></div>' +
      '<details style="margin-top:12px"><summary><strong>See the path as a diagram</strong></summary><div class="vis"><img class="diagram" src="assets/diagrams/diagram6.svg" alt="Flow: after Step 8 choose Keep building (Chapters 1 to 4 with checkpoints after each), Just read (any of Steps 9 to 21 in any order), or Done for now (back to the worksheet). Every checkpoint offers keep going, read the rest, or stop." loading="lazy"></div></details></div>';
    $('#openFork', main).onclick = forkModal;
    if (!forkShown) { forkShown = true; setTimeout(() => { if (current && current.name === 'fork') forkModal(); }, 250); }
  }
  function forkModal() {
    openModal('<div style="text-align:center">' + babySVG(['cap'], 80, 'wow') + '</div><h2 id="modalTitle">Your baby AI has graduated. \ud83c\udf93 What next?</h2>' +
      '<button class="choice main" data-c="build"><strong>\ud83e\uddf8 Keep building: teach your baby AI new tricks.</strong>Thirteen optional steps, in four short chapters. Same format as the core: before-and-after, a Break it! challenge, a myth-buster and a takeaway for your requirement. About 8-10 minutes each.</button>' +
      '<button class="choice" data-c="read"><strong>\ud83d\udcd6 Just read at your own pace.</strong>The same thirteen topics as plain reading, without the challenges. About 5-8 minutes each, in any order.</button>' +
      '<p class="note"><em>You can stop after any step, switch paths at any time, and your worksheet will be waiting for you.</em></p>' +
      '<p style="text-align:center"><button class="btn ghost" data-c="done">I\u2019m done for now (the baby needs a nap)</button></p>', (m) => {
      $$('[data-c]', m).forEach((b) => b.onclick = () => {
        const c = b.dataset.c;
        if (c === 'done') { closeModal(); toast('Nap time. Your worksheet and progress are saved in this browser.'); return; }
        S.path = c; save(); closeModal(true); go(c === 'build' ? '#/step/9' : '#/read');
      });
    });
  }
  function renderCheckpoint(main, r) {
    const k = +r.arg, cp = C.checkpoints[k - 1], ch = C.chapters[k - 1], nxt = C.chapters[k];
    if (S.path !== 'read' && !S.done[ch.steps[ch.steps.length - 1]]) { main.innerHTML = '<div class="card lockscreen"><h1>Checkpoint ' + k + ' is waiting</h1><p>Finish Chapter ' + k + ' first, or switch to Reading mode.</p><a class="btn primary" href="#/step/' + ch.steps[0] + '">Go to Chapter ' + k + '</a></div>'; return; }
    main.innerHTML = '<div class="modal" style="margin:24px auto" role="region" aria-labelledby="cpT">' + '<div style="text-align:center">' + babySVG(X.accessories[ch.steps[ch.steps.length - 1]], 90) + '</div><h1 id="cpT">\u23f8\ufe0f Checkpoint ' + k + ' of 3: keep going or read the rest?</h1><p>' + cp.text + '</p>' +
      '<p class="note">Chapter ' + k + ' steps done: ' + ch.steps.filter((n) => S.done[n]).length + ' of ' + ch.steps.length + '. Next: Chapter ' + nxt.n + ', ' + esc(nxt.title) + ' (' + nxt.steps.length + ' steps).</p>' +
      '<button class="choice main" data-c="keep"><strong>\ud83e\uddf8 Keep building</strong>On to Step ' + nxt.steps[0] + ': ' + esc(step(nxt.steps[0]).name) + '.</button>' +
      '<button class="choice" data-c="read"><strong>\ud83d\udcd6 Read the rest instead</strong>Switch to Reading mode from Step ' + nxt.steps[0] + ' onward. No challenges, any order.</button>' +
      '<button class="choice" data-c="stop"><strong>\u270b Stop here and update my worksheet</strong>Opens your worksheet with Sections ' + cp.highlight.join(', ') + ' highlighted (the ones this chapter touched).</button></div>';
    $$('[data-c]', main).forEach((b) => b.onclick = () => {
      const c = b.dataset.c;
      if (c === 'keep') { S.path = 'build'; save(); go('#/step/' + nxt.steps[0]); }
      else if (c === 'read') { S.path = 'read'; save(); go('#/step/' + nxt.steps[0]); }
      else go('#/worksheet?hl=' + cp.highlight.join(','));
    });
  }
  function renderRead(main) {
    main.innerHTML = '<h1>\ud83d\udcd6 Read at your own pace</h1><p class="concept">Steps 9-21 as plain reading, in any order. Each Break it! shrinks to its goal and what you\u2019d discover. About 5-8 minutes each.</p>' +
      '<p class="note">Currently in <strong>' + (S.path === 'read' ? 'Reading' : 'Building') + '</strong> mode. ' + (S.path === 'read' ? '' : '<button class="btn small" id="swRead">Switch to Reading</button>') + '</p>' +
      C.chapters.map((c) => '<div class="card"><h2>Chapter ' + c.n + ': ' + esc(c.title) + '</h2><div class="summary-grid">' + c.steps.map((n) => '<a href="#/step/' + n + '" class="' + (S.done[n] ? 'done' : '') + '"><strong>' + X.emoji[n] + ' Step ' + n + '</strong><br>' + esc(step(n).name) + '<br><small>' + esc(step(n).concept.split(':')[0]) + '</small>' + (S.done[n] ? '<br><small>\u2713 done</small>' : '') + '</a>').join('') + '</div></div>').join('') +
      '<div class="row"><a class="btn primary" href="#/upgrade">Back to my worksheet</a></div>';
    const sw = $('#swRead', main); if (sw) sw.onclick = () => setPath('read');
  }
  function renderSummary(main) {
    const opt = []; C.chapters.forEach((c) => c.steps.forEach((n) => opt.push(n)));
    const d = opt.filter((n) => S.done[n]), left = opt.filter((n) => !S.done[n]);
    main.innerHTML = '<div class="card" style="text-align:center">' + babySVG(['cap'], 100) + '<h1>Nap time. Here\u2019s where you are.</h1><p>Core steps done: <strong>' + [1, 2, 3, 4, 5, 6, 7, 8].filter((n) => S.done[n]).length + ' of 8</strong>. Optional steps done: <strong>' + d.length + ' of 13</strong>.</p><p class="note">Everything is saved in this browser. Come back any time; the baby will still be here, still 100% confident.</p></div>' +
      '<div class="card"><h2>Steps done</h2>' + (d.length ? '<div class="summary-grid">' + d.map((n) => '<a class="done" href="#/step/' + n + '">\u2713 Step ' + n + '<br>' + esc(step(n).name) + '</a>').join('') + '</div>' : '<p>None yet. That\u2019s fine: even the baby started at zero.</p>') + '</div>' +
      '<div class="card"><h2>Steps left</h2>' + (left.length ? '<div class="summary-grid">' + left.map((n) => '<a href="#/step/' + n + '">Step ' + n + '<br>' + esc(step(n).name) + '</a>').join('') + '</div>' : '<p>None! You\u2019ve raised the whole baby.</p>') + '</div>' +
      '<div class="row"><a class="btn primary" href="#/upgrade">Back to my worksheet</a><a class="btn" href="#/read">Reading list</a></div>';
  }
  function renderWorksheet(main, r) { window.WS.renderPage(main, { highlight: (r.q.hl || '').split(',').map(Number).filter(Boolean) }); }
  function renderUpgrade(main) { window.WS.renderUpgrade(main); }

  // ---------- expose + boot ----------
  window.App = { S: () => S, save, toast, esc, pick, go, openModal, closeModal, glossify, linkSteps, illus, conf, updateChrome, step, isDone: (n) => !!S.done[n] };
  function boot() {
    $('#brandBaby').innerHTML = babySVG(['pacifier'], 34);
    $('#menuBtn').onclick = () => ($('#drawer').classList.contains('open') ? closeDrawer() : openDrawer());
    $('#closeDrawer').onclick = () => closeDrawer();
    $('#resetBtn').onclick = resetAll;
    $$('.path-switch button').forEach((b) => b.onclick = () => setPath(b.dataset.path));
    $('#backBtn').onclick = () => { const h = $('#backBtn').dataset.href; if (h) go(h); };
    $('#nextBtn').onclick = onNext;
    $('#drawer').addEventListener('click', (e) => { if (e.target.closest('a')) closeDrawer(true); });
    window.addEventListener('hashchange', render);
    if (!location.hash || location.hash === '#' || location.hash === '#/') {
      const target = (S.route && S.route !== '#/welcome') ? S.route : '#/welcome';
      if (target !== '#/welcome') setTimeout(() => toast('Welcome back' + (S.name ? ', ' + S.name : '') + '! Picking up where you left off.'), 300);
      history.replaceState(null, '', target);
    }
    render();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
