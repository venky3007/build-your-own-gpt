/* Course app shell (name comes from config.js). No network calls; state lives in localStorage only. */
(function () {
  'use strict';
  const C = window.COURSE, X = window.EXTRAS, F = window.FUN, CFG = window.SITE_CONFIG;
  const KEY = 'ryoba.v2', OLD_KEY = 'ryoba.v1';
  const TOTAL = C.steps.length;
  const CORE = C.steps.filter((s) => !s.optional).map((s) => s.n), OPT = C.steps.filter((s) => s.optional).map((s) => s.n);
  const LAST_CORE = CORE[CORE.length - 1], FIRST_OPT = OPT[0], LAST_OPT = OPT[OPT.length - 1];
  const EXPRESS = [1, 3, 6, LAST_CORE];               // autocomplete, attention, RAG, ship-it + worksheet
  const REAL_MODEL = [1, 2];                          // steps whose Break it! runs a genuinely trained model
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const step = (n) => C.steps[n - 1];

  // ---------- state ----------
  const blank = () => ({ v: 2, name: '', route: '', path: 'build', done: {}, visited: {}, challenge: {}, quiz: {}, hood: {}, w: {}, ws: {}, wsGrad: null, forkSeen: false, express: { on: false, started: false, finished: false }, peelSeen: [] });
  // v1 had 21 steps; v2 inserted core Step 4 ("Inside the Brain"), so old steps 4+ move up by one.
  function migrate(o) {
    const sh = (n) => (+n >= 4 ? +n + 1 : +n);
    ['done', 'visited', 'challenge', 'quiz', 'hood', 'w'].forEach((k) => { const m = {}; Object.keys(o[k] || {}).forEach((n) => { m[sh(n)] = o[k][n]; }); o[k] = m; });
    if (o.w && o.w[2]) delete o.w[2].broke;          // Step 2 is now a real model; old toy state doesn't apply
    if (o.route) o.route = o.route.replace(/^#\/step\/(\d+)/, (m, n) => '#/step/' + sh(n));
    o.v = 2; return o;
  }
  let S;
  try {
    let raw = localStorage.getItem(KEY), o;
    if (raw) o = JSON.parse(raw); else if ((raw = localStorage.getItem(OLD_KEY))) o = migrate(JSON.parse(raw));
    S = Object.assign(blank(), o || {});
    S.express = Object.assign({ on: false, started: false, finished: false }, S.express || {});
  } catch (e) { S = blank(); }
  let storageOK = true;
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { if (storageOK) { storageOK = false; toast('Heads up: your browser is blocking local storage, so progress won\u2019t be saved this time.'); } } }

  // ---------- helpers ----------
  let toastT;
  function toast(msg, ms) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), ms || 3200); }
  function linkSteps(html) { return String(html || '').replace(/\bStep (\d{1,2})\b(?![-\u2013\d])/g, (m, n) => (+n >= 1 && +n <= TOTAL) ? '<a href="#/step/' + n + '">Step ' + n + '</a>' : m); }
  function illus(label) { return '<span class="illus">' + esc(label || 'Simulated for this demo') + '</span>'; }
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
  const OPT_ORDER = []; C.chapters.forEach((ch, i) => { OPT_ORDER.push(...ch.steps); if (i < C.chapters.length - 1) OPT_ORDER.push('c' + ch.n); });
  const expressOn = () => !!(S.express && S.express.on);
  const expressDone = () => EXPRESS.filter((n) => S.done[n]).length;
  function parse(h) {
    const p = (h || '').replace(/^#\/?/, '').split('?');
    const parts = p[0].split('/');
    const q = {}; (p[1] || '').split('&').forEach((kv) => { if (kv) { const [k, v] = kv.split('='); q[k] = decodeURIComponent(v || ''); } });
    return { name: parts[0] || 'welcome', arg: parts[1], q };
  }
  function routeOf(name, arg) { return '#/' + name + (arg != null ? '/' + arg : ''); }
  function isUnlocked(n) { if (n <= FIRST_OPT || S.path === 'read') return true; return !!S.done[n - 1]; }
  function nextPrev(r) {
    const n = +r.arg;
    if (expressOn() && r.name === 'step' && EXPRESS.includes(n)) {
      const i = EXPRESS.indexOf(n);
      return { prev: i === 0 ? '#/welcome' : '#/step/' + EXPRESS[i - 1], next: i === EXPRESS.length - 1 ? '#/worksheet' : '#/step/' + EXPRESS[i + 1], nextLabel: i === EXPRESS.length - 1 ? 'Write my requirement \u2192' : 'Next express stop \ud83d\ude80' };
    }
    if (expressOn() && r.name === 'worksheet') return { prev: '#/step/' + LAST_CORE, next: '#/express', nextLabel: 'Finish the express lane \ud83c\udfc1' };
    switch (r.name) {
      case 'welcome': return { next: '#/step/1', nextLabel: 'Open the kit \u2192' };
      case 'step':
        if (n < LAST_CORE) return { prev: n === 1 ? '#/welcome' : '#/step/' + (n - 1), next: '#/step/' + (n + 1) };
        if (n === LAST_CORE) return { prev: '#/step/' + (n - 1), next: '#/fork', nextLabel: 'Graduate \ud83c\udf93 \u2192' };
        if (S.path === 'read') return { prev: n === FIRST_OPT ? '#/read' : '#/step/' + (n - 1), next: n === LAST_OPT ? '#/upgrade' : '#/step/' + (n + 1), nextLabel: n === LAST_OPT ? 'Back to my worksheet \u2192' : undefined };
        { const i = OPT_ORDER.indexOf(n); const toR = (x) => typeof x === 'string' ? '#/checkpoint/' + x.slice(1) : '#/step/' + x;
          return { prev: i === 0 ? '#/fork' : toR(OPT_ORDER[i - 1]), next: n === LAST_OPT ? '#/upgrade' : toR(OPT_ORDER[i + 1]), nextLabel: n === LAST_OPT ? 'Back to my worksheet \u2192' : undefined }; }
      case 'checkpoint': { const k = +r.arg, a = C.chapters[k - 1].steps, b = C.chapters[k].steps; return { prev: '#/step/' + a[a.length - 1], next: '#/step/' + b[0], nextLabel: pick(F.keepGoing) }; }
      case 'fork': return { prev: '#/step/' + LAST_CORE, next: S.path === 'read' ? '#/read' : '#/step/' + FIRST_OPT, nextLabel: S.path === 'read' ? 'Open the reading list \u2192' : 'Keep building \u2192' };
      case 'worksheet': return { prev: '#/step/' + LAST_CORE, next: S.forkSeen ? (S.path === 'read' ? '#/read' : '#/step/' + FIRST_OPT) : '#/fork', nextLabel: S.forkSeen ? 'Optional steps \u2192' : 'What next? \u2192' };
      case 'read': return { prev: '#/fork', next: '#/step/' + FIRST_OPT, nextLabel: 'Start with Step ' + FIRST_OPT + ' \u2192' };
      case 'summary': return { prev: null, next: '#/upgrade', nextLabel: 'Back to my worksheet \u2192' };
      case 'upgrade': return { prev: '#/step/' + LAST_OPT, next: null };
      case 'express': return { prev: '#/worksheet', next: '#/step/' + firstUndoneCore(), nextLabel: 'Continue the full build \u2192' };
      default: return {};
    }
  }
  function firstUndoneCore() { return CORE.find((n) => !S.done[n]) || LAST_CORE; }
  function whereLabel(r) {
    if (r.name === 'step') { const s = step(+r.arg); return s.optional ? 'Optional step ' + s.n + ' of ' + TOTAL + ' \u00b7 ' + s.name : 'Step ' + s.n + ' of ' + CORE.length + ' \u00b7 ' + s.name; }
    return { welcome: 'Welcome', fork: 'The Fork in the Road', checkpoint: 'Checkpoint ' + r.arg + ' of 3', worksheet: 'Requirement Framing Worksheet', read: 'Reading list (Steps ' + FIRST_OPT + '-' + LAST_OPT + ')', summary: 'Your progress', upgrade: 'Back to the Worksheet', express: 'Express lane: finish line' }[r.name] || '';
  }

  let current = null; let forkShown = false;
  function go(hash) { if (location.hash === hash) render(); else location.hash = hash; }
  function render() {
    hideGloss(); closeModal(true); closeDrawer(true);
    const r = parse(location.hash);
    if (!['welcome', 'step', 'fork', 'checkpoint', 'worksheet', 'read', 'summary', 'upgrade', 'express'].includes(r.name) || (r.name === 'step' && !(+r.arg >= 1 && +r.arg <= TOTAL)) || (r.name === 'checkpoint' && !(+r.arg >= 1 && +r.arg <= 3))) { location.replace('#/welcome'); return; }
    current = r;
    const main = $('#main'); main.innerHTML = '';
    if (r.name !== 'welcome') { S.route = location.hash; }
    if (r.name === 'step') S.visited[r.arg] = true;
    save();
    ({ welcome: renderWelcome, step: renderStep, fork: renderFork, checkpoint: renderCheckpoint, worksheet: renderWorksheet, read: renderRead, summary: renderSummary, upgrade: renderUpgrade, express: renderExpressDone })[r.name](main, r);
    // nav bar
    const np = nextPrev(r);
    const back = $('#backBtn'), next = $('#nextBtn');
    back.disabled = !np.prev; back.dataset.href = np.prev || '';
    next.hidden = !np.next; next.dataset.href = np.next || '';
    next.textContent = np.nextLabel || 'Next \u2192';
    $('#where').textContent = whereLabel(r);
    document.title = whereLabel(r) + ' \u2014 ' + CFG.name;
    updateChrome();
    window.scrollTo(0, 0);
    const h1 = $('h1', main); if (h1) { h1.setAttribute('tabindex', '-1'); h1.focus({ preventScroll: true }); }
  }
  function onNext() {
    const r = current; const href = $('#nextBtn').dataset.href; if (!href) return;
    if (r.name === 'step') { S.done[r.arg] = true; save(); }
    go(href);
  }

  // ---------- chrome: progress, drawer, path ----------
  function updateChrome() {
    const core = CORE.filter((n) => S.done[n]).length;
    const opt = OPT.filter((n) => S.done[n]).length;
    $('#pCore').style.width = (core / CORE.length * 100) + '%';
    $('#pOpt').style.width = (opt / OPT.length * 100) + '%';
    $('#progCore').setAttribute('aria-valuenow', core); $('#progOpt').setAttribute('aria-valuenow', opt);
    $('#progCore').setAttribute('aria-valuemax', CORE.length); $('#progOpt').setAttribute('aria-valuemax', OPT.length);
    const ex = expressDone(), showEx = S.express.started && !(S.express.finished && !expressOn());
    $('#progExp').hidden = !showEx; $('#pExp').style.width = (ex / EXPRESS.length * 100) + '%'; $('#progExp').setAttribute('aria-valuenow', ex);
    $('#progressLabel').textContent = (showEx ? '\ud83d\ude80 Express ' + ex + '/' + EXPRESS.length + ' \u00b7 ' : '') + 'Core ' + core + '/' + CORE.length + ' \u00b7 Optional ' + opt + '/' + OPT.length;
    $$('.path-switch button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.path === S.path)));
    buildDrawer();
    if (window.Layers) { try { window.Layers.update(current); } catch (e) { console.error('layers', e); } }
  }
  function setPath(p, silent) {
    S.path = p; save();
    if (!silent) toast(p === 'read' ? 'Reading mode \ud83d\udcd6: open any optional step, challenges shrink to their key lesson.' : 'Building mode \ud83d\udd27: optional steps play in order with full challenges.');
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
    let h = '<h2>\ud83d\ude80 Express lane (~15 min)</h2><ol>' + EXPRESS.map((n) => li('#/step/' + n, n, step(n).name, { done: S.done[n] })).join('') + li('#/express', '\ud83c\udfc1', 'Express finish line') + '</ol>';
    h += '<h2>The core build</h2><ol>' + li('#/welcome', '\u2302', 'Welcome');
    CORE.forEach((n) => { h += li('#/step/' + n, n, step(n).name, { done: S.done[n] }); });
    h += li('#/worksheet', '\u270e', 'Requirement Framing Worksheet') + li('#/fork', '\u2442', 'The Fork in the Road') + '</ol>';
    C.chapters.forEach((ch) => {
      h += '<h2>Chapter ' + ch.n + ': ' + esc(ch.title) + '</h2><ol>';
      ch.steps.forEach((n) => { h += li('#/step/' + n, n, step(n).name, { done: S.done[n], locked: !isUnlocked(n) }); });
      if (ch.n < C.chapters.length) h += li('#/checkpoint/' + ch.n, '\u23f8', 'Checkpoint ' + ch.n + ' of 3', { locked: S.path !== 'read' && !S.done[ch.steps[ch.steps.length - 1]] });
      h += '</ol>';
    });
    h += '<h2>Wrap-up</h2><ol>' + li('#/upgrade', '\u2605', 'Back to the Worksheet') + li('#/read', '\ud83d\udcd6', 'Reading list (any order)') + li('#/summary', '\u2261', 'My progress') + '</ol>';
    d.innerHTML = h;
  }
  function openDrawer() { const d = $('#drawer'); d.classList.add('open'); d.removeAttribute('aria-hidden'); $('#menuBtn').setAttribute('aria-expanded', 'true'); const s = document.createElement('div'); s.className = 'scrim'; s.id = 'scrim'; s.onclick = () => closeDrawer(); document.body.appendChild(s); const a = $('a[aria-current],a,button', d); if (a) a.focus(); }
  function closeDrawer(silent) { const d = $('#drawer'); if (!d || !d.classList.contains('open')) return; d.classList.remove('open'); d.setAttribute('aria-hidden', 'true'); $('#menuBtn').setAttribute('aria-expanded', 'false'); const s = $('#scrim'); if (s) s.remove(); if (!silent) $('#menuBtn').focus(); }
  function resetAll() {
    if (!confirm('Reset all progress, quiz answers and your worksheet on this device? This can\u2019t be undone. (Your GPT will forget everything. Very on-theme.)')) return;
    try { localStorage.removeItem(KEY); } catch (e) { }
    S = blank(); save(); toast('Fresh start! The engine is back to guessing random letters.'); go('#/welcome');
  }

  function heroArt() {
    const L = ['Chat app', 'Guardrails', 'Agents & tools', 'Retrieval (RAG)', 'Context window', 'Next-token output', 'Transformer blocks \u00d7N', 'Attention + feed-forward', 'Embeddings', 'Tokens'];
    return '<svg viewBox="0 0 260 250" class="hero-svg" aria-hidden="true" focusable="false">' + L.map((l, i) => { const y = 14 + i * 22, w = 230 - i * 10, x = (260 - w) / 2; return '<g class="hl" style="--i:' + i + '"><rect x="' + x + '" y="' + y + '" width="' + w + '" height="18" rx="7" fill="url(#hg' + (i % 2) + ')"/><text x="130" y="' + (y + 12.5) + '" text-anchor="middle">' + l + '</text></g>'; }).join('') + '<defs><linearGradient id="hg0" x1="0" x2="1"><stop offset="0" stop-color="#6d4aff"/><stop offset="1" stop-color="#8b5cf6"/></linearGradient><linearGradient id="hg1" x1="0" x2="1"><stop offset="0" stop-color="#0b7f7c"/><stop offset="1" stop-color="#0e8f8a"/></linearGradient></defs></svg>';
  }
  // ---------- screens ----------
  function renderWelcome(main) {
    const resume = S.route && S.route !== '#/welcome' ? S.route : '';
    const rl = resume ? whereLabel(parse(resume)) : '';
    main.innerHTML =
      '<section class="hero"><div class="hero-art">' + heroArt() + '</div>' +
      '<div><div class="chips"><span class="chip">AI-literacy course</span><span class="chip time">Full core build ~90 min</span><span class="chip express">\ud83d\ude80 Express lane ~15 min</span></div>' +
      '<h1 class="course-title">' + esc(CFG.name) + '</h1><p class="subtitle">' + esc(CFG.subtitle) + '</p>' +
      '<p>Inside, you\u2019ll assemble a GPT part by part, from a letter-guessing engine to a tool-using assistant, break it on purpose at every stage, and turn what you learn into a better AI requirement. <strong>Warning:</strong> side effects may include saying \u201cit depends on the retrieval\u201d in meetings.</p>' +
      '<div class="row">' + (resume ? '<a class="btn primary" href="' + resume + '">Continue: ' + esc(rl) + ' \u2192</a><a class="btn" href="#/step/1">Start from Step 1</a>' : '<a class="btn primary" href="#/step/1">Start the full build \u2192</a>') + '<button class="btn accent" id="expressBtn">\ud83d\ude80 Express lane (~15 min)</button></div></div></section>' +
      '<div class="card express-card"><h2>\ud83d\ude80 Short on time? Take the Express lane</h2><p>Four stops, about 15 minutes, for when your calendar looks like a game of Tetris:</p><ol class="express-stops">' + EXPRESS.map((n) => '<li class="' + (S.done[n] ? 'done' : '') + '"><a href="#/step/' + n + '"><strong>Step ' + n + ':</strong> ' + esc(step(n).name) + '</a> <span class="note">(' + esc(step(n).concept.split(/[:,(]/)[0]) + ')</span>' + (S.done[n] ? ' \u2713' : '') + '</li>').join('') + '<li>Your one-page AI requirement (the worksheet)</li></ol><p class="note">Progress counts towards the full build, so nothing is wasted. At the end we\u2019ll offer the rest of the course; no pressure, the workbench will wait.</p></div>' +
      '<div class="card"><span class="section-label">Live from the workbench</span><p class="noise" id="noise" aria-live="off"></p><p class="note">This is an untrained engine: picking random letters, with total confidence. In Steps 1 and 2 you\u2019ll train a real (tiny) neural network right here in your browser, and watch it go from this to word-like office email. Progress!</p></div>' +
      '<div class="card"><h2>Hello! What should your GPT call you?</h2><div class="field"><label for="nameIn">First name (optional, stays in this browser)</label><input class="input" id="nameIn" autocomplete="given-name" maxlength="40" value="' + esc(S.name) + '" placeholder="e.g. Priya, Tom, Ananya, Sam"></div><p id="nameHi" class="status" aria-live="polite"></p></div>' +
      '<div class="card"><h2>The pitch</h2>' + C.intro.pitch + '</div>' +
      '<div class="card"><h2>Two paths, one kit</h2><div class="path-cards">' +
      '<div><h3>\ud83c\udf7c Core build (Steps 1-' + LAST_CORE + ')</h3><p>Everyone does these. One screen per step, ~10 minutes each, ending with a real AI requirement you write yourself.</p></div>' +
      '<div><h3>\ud83d\udd27 Keep building (Steps ' + FIRST_OPT + '-' + LAST_OPT + ')</h3><p>Optional. Four short chapters with full Break it! challenges, in order. Stop after any step.</p></div>' +
      '<div><h3>\ud83d\udcd6 Just read</h3><p>The same optional topics as plain reading, in any order, with each challenge shrunk to its key lesson.</p></div></div>' +
      '<p class="note">You choose after graduation, and you can switch any time with the <strong>Building / Reading</strong> switch at the top.</p></div>' +
      '<div class="card"><h2>How every step works</h2><ol><li><strong>Hook</strong>: one opening line (often a bad joke).</li><li><strong>What you see</strong>: the model before and after (illustrative).</li><li><strong>What\u2019s really happening</strong>: the real mechanism, in plain words. The metaphor is fun; this part is the truth.</li><li><strong>Break it!</strong>: a hands-on challenge. Breaking things is the fastest way to learn their limits.</li><li><strong>Myth-buster</strong>, <strong>So what for your requirement?</strong> and a one-question <strong>Quick check</strong>.</li><li><strong>Under the hood</strong>: a closed panel with a diagram and technical bullets for the curious.</li></ol><p>Underlined words like <button type="button" class="gloss" data-term="token" aria-expanded="false">token</button> open a one-line definition.</p></div>' +
      '<div class="card"><h2>By the end you\u2019ll be able to\u2026</h2>' + C.intro.outcomes + '</div>' +
      '<div class="card"><h2>What this course does NOT promise (an honest note)</h2>' + C.intro.honest + '</div>' +
      '<details class="card"><summary><strong>Running it with your team (facilitator notes)</strong></summary>' + C.intro.howToRun + '</details>' +
      '<p class="privacy">\ud83d\udd12 <strong>Privacy:</strong> nothing you type is sent anywhere. There is no server, no login and no live AI: the tiny model in Steps 1-2 trains right here in your browser, and every other AI reply is scripted in this page. Progress and your worksheet are saved only in this browser, so switching devices or clearing your browser starts you fresh.</p>' +
      '<div class="row"><button class="btn small" id="resetBtn2">Reset my progress</button></div>';
    const nameIn = $('#nameIn', main);
    const hi = () => { $('#nameHi', main).textContent = S.name ? 'Hi ' + S.name + '! Your GPT says: \u201c' + S.name.toLowerCase().split('').reverse().join('') + '?\u201d It\u2019s working on it.' : ''; };
    nameIn.addEventListener('input', () => { S.name = nameIn.value.trim(); save(); hi(); }); hi();
    $('#resetBtn2', main).onclick = resetAll;
    $('#expressBtn', main).onclick = startExpress;
    // untrained-engine animation
    const out = $('#noise', main); const chars = 'abcdefghijklmnopqrstuvwxyz #@!?'; let i = 0;
    const tick = () => { if (!document.body.contains(out)) return; if (i++ > 60) { out.textContent = ''; i = 0; } out.textContent += chars[Math.floor(Math.random() * chars.length)]; setTimeout(tick, 70); };
    out.setAttribute('aria-label', 'Animated random letters, for example: xq#vplm oo ztr kkaey'); tick();
  }

  function renderStep(main, r) {
    const n = +r.arg, s = step(n);
    if (s.optional && !isUnlocked(n)) {
      let first = FIRST_OPT; while (first < n && S.done[first]) first++;
      main.innerHTML = '<div class="card lockscreen">' + partSVG('lock', 96) + '<h1>Not so fast!</h1><p>In <strong>Building</strong> mode the optional steps unlock in order, like an assembly line: wheels before the turbo. You\u2019re up to <strong>Step ' + first + ': ' + esc(step(first).name) + '</strong>.</p><div class="row" style="justify-content:center"><a class="btn primary" href="#/step/' + first + '">Go to Step ' + first + '</a><button class="btn" id="toRead">Switch to Reading mode</button></div></div>';
      $('#toRead', main).onclick = () => setPath('read');
      return;
    }
    const readMode = s.optional && S.path === 'read';
    const ch = s.optional ? C.chapters.find((c) => c.steps.includes(n)) : null;
    const icon = X.icons[n] || 'spark';
    const done = !!S.challenge[n];
    let h = '<div class="step-head">' + partSVG(icon, 84) + '<div><div class="chips">' +
      (expressOn() && EXPRESS.includes(n) ? '<span class="chip express">\ud83d\ude80 Express stop ' + (EXPRESS.indexOf(n) + 1) + ' of ' + EXPRESS.length + '</span>' : '') + (s.optional ? '<span class="chip opt">Optional step ' + n + ' of ' + TOTAL + '</span><span class="chip">Chapter ' + ch.n + ': ' + esc(ch.title) + '</span>' : '<span class="chip">Step ' + n + ' of ' + CORE.length + ' \u00b7 Core</span>') +
      '<span class="chip time">\u23f1 ~' + esc(readMode ? '5-8 minutes to read' : s.time.replace(/,.*$/, '')) + '</span></div>' +
      '<h1>' + X.emoji[n] + ' ' + esc(s.name) + '</h1><p class="concept">' + esc(s.concept) + '</p>' +
      (s.buildsOn ? '<p class="note">Builds on ' + linkSteps(s.buildsOn.replace(/Steps (\d+) and (\d+)/, 'Step $1 and Step $2').replace(/Steps (\d+), (\d+) and (\d+)/, 'Step $1, Step $2 and Step $3')) + '.</p>' : '') + '</div></div>';
    if (expressOn() && EXPRESS.includes(n)) h += '<div class="card express-tip" role="note"><strong>\ud83d\ude80 Express lane tip:</strong> read the hook and \u201cWhat\u2019s really happening\u201d, play the Break it!, take the quick check. Everything else will still be here when you come back for the full build. (The parts won\u2019t assemble themselves. Probably.)</div>';
    h += '<div class="card hook" id="hook"><span class="section-label">Hook</span><div>' + s.hook + '<span class="quip">' + esc(F.hookQuip[n]) + '</span></div></div>';
    h += '<div class="card"><span class="section-label">What you see</span> ' + illus('Illustrative example') + '<div class="ba" style="margin-top:10px"><div class="before"><h4>' + s.see.head[0] + '</h4><div>' + s.see.before + '</div></div><div class="after"><h4>' + s.see.head[1] + '</h4><div>' + s.see.after + '</div></div></div>' + (s.see.note ? '<p class="note">' + s.see.note + '</p>' : '') + '</div>';
    h += '<div class="card mech" id="mech"><h2>What\u2019s really happening</h2>' + linkSteps(s.mechanism) + '</div>';
    if (s.workplace) h += '<div class="card" id="workplace"><h2>Workplace examples</h2>' + linkSteps(s.workplace) + '</div>';
    h += '<section class="card breakit' + (done ? ' complete' : '') + '" id="breakit" aria-labelledby="bi-h"><h2 id="bi-h">\ud83d\udd28 Break it! \u2014 \u201c' + esc(s.breakName) + '\u201d</h2>' + (REAL_MODEL.includes(n) ? '<p class="honesty real">\ud83e\udde0 <strong>Real model:</strong> a tiny neural network trained live in your browser on fictional office emails. Nothing is scripted and nothing leaves your device.</p>' : '<p class="honesty sim">\ud83c\udfad <strong>Simulated for this demo:</strong> the replies below are scripted to show a real mechanism safely and offline. No live AI is involved.</p>') + '<p class="goal"><strong>Goal:</strong> ' + s.goal + '</p>' +
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
      try { window.WIDGETS[n](wEl, api); } catch (e) { console.error('widget ' + n, e); wEl.innerHTML = '<p>Sorry, this demo hit a snag. The rest of the step still works.</p>'; }
    }
    glossify([$('#hook', main), $('#mech', main), $('#workplace', main), $('#myths', main), $('#sowhat', main)]);
  }

  function renderFork(main) {
    if (window.WS && !OPT.some((n) => S.done[n] || S.visited[n])) { S.wsGrad = JSON.parse(JSON.stringify(S.ws)); }
    S.forkSeen = true; save();
    main.innerHTML = '<div class="card" style="text-align:center">' + partSVG('rocket', 110) + '<h1>\ud83d\ude80 Your GPT is assembled' + (S.name ? ', ' + esc(S.name) : '') + '!</h1><p>' + C.upgrade.graduation + '</p><p class="note">It wanted to give a launch speech. It was 4,000 tokens of \u201cregards\u201d. We cut it.</p>' +
      '<div class="row" style="justify-content:center"><button class="btn primary" id="openFork">What next?</button><a class="btn" href="#/worksheet">Back to my worksheet</a></div></div>' +
      '<div class="card"><h2>The optional build at a glance</h2><div class="table-wrap"><table><thead><tr><th>Chapter</th><th>Steps</th><th>Concepts</th></tr></thead><tbody>' +
      C.chapters.map((c) => '<tr><td>' + c.n + ': ' + esc(c.title) + '</td><td>' + c.steps.join(', ') + '</td><td>' + c.steps.map((n) => esc(step(n).name)).join(' \u00b7 ') + '</td></tr>').join('') + '</tbody></table></div>' +
      '<details style="margin-top:12px"><summary><strong>See the path as a diagram</strong></summary><div class="vis"><img class="diagram" src="assets/diagrams/diagram6.svg" alt="Flow: after Step 9 choose Keep building (Chapters 1 to 4 with checkpoints after each), Just read (any of Steps 10 to 22 in any order), or Done for now (back to the worksheet). Every checkpoint offers keep going, read the rest, or stop." loading="lazy"></div></details></div>';
    main.insertAdjacentHTML('beforeend', window.Layers.explodedHTML());
    $('#openFork', main).onclick = forkModal;
    if (!forkShown) { forkShown = true; setTimeout(() => { if (current && current.name === 'fork') forkModal(); }, 250); }
  }
  function forkModal() {
    openModal('<div style="text-align:center">' + partSVG('rocket', 72) + '</div><h2 id="modalTitle">Your GPT is assembled. \ud83d\ude80 What next?</h2>' +
      '<button class="choice main" data-c="build"><strong>\ud83d\udd27 Keep building: bolt on upgrades.</strong>Thirteen optional steps, in four short chapters. Same format as the core: before-and-after, a Break it! challenge, a myth-buster and a takeaway for your requirement. About 8-10 minutes each.</button>' +
      '<button class="choice" data-c="read"><strong>\ud83d\udcd6 Just read at your own pace.</strong>The same thirteen topics as plain reading, without the challenges. About 5-8 minutes each, in any order.</button>' +
      '<p class="note"><em>You can stop after any step, switch paths at any time, and your worksheet will be waiting for you.</em></p>' +
      '<p style="text-align:center"><button class="btn ghost" data-c="done">I\u2019m done for now (tools down)</button></p>', (m) => {
      $$('[data-c]', m).forEach((b) => b.onclick = () => {
        const c = b.dataset.c;
        if (c === 'done') { closeModal(); toast('Tools down. Your worksheet and progress are saved in this browser.'); return; }
        S.path = c; save(); closeModal(true); go(c === 'build' ? '#/step/' + FIRST_OPT : '#/read');
      });
    });
  }
  function renderCheckpoint(main, r) {
    const k = +r.arg, cp = C.checkpoints[k - 1], ch = C.chapters[k - 1], nxt = C.chapters[k];
    if (S.path !== 'read' && !S.done[ch.steps[ch.steps.length - 1]]) { main.innerHTML = '<div class="card lockscreen"><h1>Checkpoint ' + k + ' is waiting</h1><p>Finish Chapter ' + k + ' first, or switch to Reading mode.</p><a class="btn primary" href="#/step/' + ch.steps[0] + '">Go to Chapter ' + k + '</a></div>'; return; }
    main.innerHTML = '<div class="modal" style="margin:24px auto" role="region" aria-labelledby="cpT">' + '<div style="text-align:center">' + partSVG(X.icons[ch.steps[ch.steps.length - 1]], 80) + '</div><h1 id="cpT">\u23f8\ufe0f Checkpoint ' + k + ' of 3: keep going or read the rest?</h1><p>' + cp.text + '</p>' +
      '<p class="note">Chapter ' + k + ' steps done: ' + ch.steps.filter((n) => S.done[n]).length + ' of ' + ch.steps.length + '. Next: Chapter ' + nxt.n + ', ' + esc(nxt.title) + ' (' + nxt.steps.length + ' steps).</p>' +
      '<button class="choice main" data-c="keep"><strong>\ud83d\udd27 Keep building</strong>On to Step ' + nxt.steps[0] + ': ' + esc(step(nxt.steps[0]).name) + '.</button>' +
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
    main.innerHTML = '<h1>\ud83d\udcd6 Read at your own pace</h1><p class="concept">Steps ' + FIRST_OPT + '-' + LAST_OPT + ' as plain reading, in any order. Each Break it! shrinks to its goal and what you\u2019d discover. About 5-8 minutes each.</p>' +
      '<p class="note">Currently in <strong>' + (S.path === 'read' ? 'Reading' : 'Building') + '</strong> mode. ' + (S.path === 'read' ? '' : '<button class="btn small" id="swRead">Switch to Reading</button>') + '</p>' +
      C.chapters.map((c) => '<div class="card"><h2>Chapter ' + c.n + ': ' + esc(c.title) + '</h2><div class="summary-grid">' + c.steps.map((n) => '<a href="#/step/' + n + '" class="' + (S.done[n] ? 'done' : '') + '"><strong>' + X.emoji[n] + ' Step ' + n + '</strong><br>' + esc(step(n).name) + '<br><small>' + esc(step(n).concept.split(':')[0]) + '</small>' + (S.done[n] ? '<br><small>\u2713 done</small>' : '') + '</a>').join('') + '</div></div>').join('') +
      '<div class="row"><a class="btn primary" href="#/upgrade">Back to my worksheet</a></div>';
    const sw = $('#swRead', main); if (sw) sw.onclick = () => setPath('read');
  }
  function renderSummary(main) {
    const opt = []; C.chapters.forEach((c) => c.steps.forEach((n) => opt.push(n)));
    const d = opt.filter((n) => S.done[n]), left = opt.filter((n) => !S.done[n]);
    main.innerHTML = '<div class="card" style="text-align:center">' + partSVG('flag', 90) + '<h1>Tools down. Here\u2019s where you are.</h1><p>Core steps done: <strong>' + CORE.filter((n) => S.done[n]).length + ' of ' + CORE.length + '</strong>. Optional steps done: <strong>' + d.length + ' of ' + OPT.length + '</strong>.</p><p class="note">Everything is saved in this browser. Come back any time; your GPT will still be here, still 100% confident.</p></div>' +
      '<div class="card"><h2>Steps done</h2>' + (d.length ? '<div class="summary-grid">' + d.map((n) => '<a class="done" href="#/step/' + n + '">\u2713 Step ' + n + '<br>' + esc(step(n).name) + '</a>').join('') + '</div>' : '<p>None yet. That\u2019s fine: every model starts at zero.</p>') + '</div>' +
      '<div class="card"><h2>Steps left</h2>' + (left.length ? '<div class="summary-grid">' + left.map((n) => '<a href="#/step/' + n + '">Step ' + n + '<br>' + esc(step(n).name) + '</a>').join('') + '</div>' : '<p>None! You\u2019ve built the whole thing.</p>') + '</div>' +
      '<div class="row"><a class="btn primary" href="#/upgrade">Back to my worksheet</a><a class="btn" href="#/read">Reading list</a></div>';
  }
  function startExpress() {
    S.express = { on: true, started: true, finished: false }; save();
    const first = EXPRESS.find((n) => !S.done[n]);
    toast('\ud83d\ude80 Express lane: 4 stops, ~15 minutes. Hard hats on.');
    go(first ? '#/step/' + first : '#/worksheet');
  }
  function renderExpressDone(main) {
    const d = expressDone(), all = d === EXPRESS.length;
    if (all) { S.express.finished = true; save(); updateChrome(); }
    const next = firstUndoneCore();
    main.innerHTML = '<div class="card" style="text-align:center">' + partSVG(all ? 'flag' : 'rocket', 100) + '<h1>' + (all ? '\ud83c\udfc1 Express lane complete' + (S.name ? ', ' + esc(S.name) : '') + '!' : '\ud83d\ude80 Express lane: ' + d + ' of ' + EXPRESS.length + ' stops done') + '</h1>' +
      '<p>' + (all ? 'In about 15 minutes you\u2019ve seen how your GPT predicts, pays attention and looks things up, and you\u2019ve framed a real requirement. That\u2019s more than most AI strategy decks manage in 40 slides.' : 'A few stops to go. Here they are:') + '</p>' +
      '<ol class="express-stops" style="text-align:left;max-width:520px;margin:0 auto">' + EXPRESS.map((n) => '<li class="' + (S.done[n] ? 'done' : '') + '"><a href="#/step/' + n + '">Step ' + n + ': ' + esc(step(n).name) + '</a>' + (S.done[n] ? ' \u2713' : '') + '</li>').join('') + '</ol></div>' +
      '<div class="card cta"><h2>Ready for the full build?</h2><p>The express lane skipped ' + CORE.filter((n) => !EXPRESS.includes(n)).map((n) => 'Step ' + n + ' (' + esc(step(n).name) + ')').join(', ') + '. These cover how the model is trained (you\u2019ll train one yourself), what happens inside its brain, why it makes things up, agents and fine-tuning. That\u2019s about 75 more minutes, and the bit where you train your own model.</p>' +
      '<div class="row"><button class="btn primary" id="fullBtn">Continue the full build: Step ' + next + ' \u2192</button><a class="btn" href="#/worksheet">Polish my worksheet</a><button class="btn ghost" id="doneBtn">Done for now (tools down)</button></div></div>';
    main.insertAdjacentHTML('beforeend', window.Layers.explodedHTML());
    $('#fullBtn', main).onclick = () => { S.express.on = false; save(); go('#/step/' + next); };
    $('#doneBtn', main).onclick = () => { S.express.on = false; save(); toast('Tools down. Your progress and worksheet are saved in this browser.'); go('#/summary'); };
  }
  function renderWorksheet(main, r) { window.WS.renderPage(main, { highlight: (r.q.hl || '').split(',').map(Number).filter(Boolean) }); }
  function renderUpgrade(main) { window.WS.renderUpgrade(main); }

  // ---------- expose + boot ----------
  window.App = { S: () => S, save, toast, esc, pick, go, openModal, closeModal, glossify, linkSteps, illus, conf, updateChrome, step, isDone: (n) => !!S.done[n], CORE, OPT, EXPRESS, CFG };
  function boot() {
    $('#brandIcon').innerHTML = partSVG('layers', 30);
    $('#brandName').textContent = CFG.name; $('#brandLink').setAttribute('aria-label', CFG.name + ', home');
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
