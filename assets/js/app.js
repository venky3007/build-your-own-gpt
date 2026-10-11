/* Course app shell (name comes from config.js). No network calls; state lives in localStorage only. */
(function () {
  'use strict';
  const C = window.COURSE, X = window.EXTRAS, F = window.FUN, CFG = window.SITE_CONFIG;
  const KEY = 'ryoba.v2', OLD_KEY = 'ryoba.v1';
  C.steps = C.steps.filter((s) => !s.optional);       // core steps only; former optional topics live inside the Build sprint
  const TOTAL = C.steps.length;
  const CORE = C.steps.map((s) => s.n);
  const LAST_CORE = CORE[CORE.length - 1];
  const SP = () => window.Sprint; const NB = 13;      // build sprint screens
  // Honest per-step minutes: words (hook..quiz, excl. optional Under-the-hood) at 200 wpm + ~2 min Break it!/quiz (+0.5 min training in Steps 1-2), rounded.
  const MIN = { 1: 5, 2: 5, 3: 4, 4: 6, 5: 5, 6: 5, 7: 5, 8: 5, 9: 4 };
  const LEARN_MIN = 45, BUILD_MIN = '20-30', LEARN = 'Learn: How a GPT works';
  C.steps.forEach((s) => { s.time = MIN[s.n] + ' min'; });
  const REAL_MODEL = [1, 2];                          // steps whose Break it! runs a genuinely trained model
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const step = (n) => C.steps[n - 1];

  // ---------- state ----------
  const blank = () => ({ v: 2, name: '', route: '', path: 'build', done: {}, visited: {}, challenge: {}, quiz: {}, hood: {}, w: {}, bdone: {}, b: null, buildAtt: [], peelSeen: [] });
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
    ['ws', 'wsGrad', 'forkSeen', 'express', 'path'].forEach((k) => delete S[k]);
    if (S.route && !/^#\/(welcome|step\/[1-9]$|build\/([1-9]|1[0-3])$|chat)/.test(S.route)) S.route = '#/build/1';
  } catch (e) { S = blank(); }
  let storageOK = true;
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { if (storageOK) { storageOK = false; toast('Heads up: your browser is blocking local storage, so progress won\u2019t be saved this time.'); } } }

  // ---------- helpers ----------
  let toastT;
  function toast(msg, ms) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), ms || 3200); }
  function linkSteps(html) { return String(html || '').replace(/\bStep (\d{1,2})\b(?![-\u2013\d])/g, (m, n) => (+n >= 1 && +n <= TOTAL) ? '<a href="#/step/' + n + '">Step ' + n + '</a>' : m); }
  function safe(t) { return '<span class="safe">' + t + ' <button type="button" class="safe-more">Security details</button></span>'; }
  const FICT = 'All documents, companies, people, policies, invoices and data in this course are fictional.';
  const SECURITY = '<ul class="secl"><li><strong>Static files only:</strong> plain HTML, JavaScript and CSS served over HTTPS from GitHub Pages. No server-side code.</li><li><strong>No login, no accounts.</strong> The site sets no cookies and includes no analytics or trackers.</li><li><strong>No AI service or API is called.</strong> Chat answers are scripted from your picks; the tiny model in Steps 1\u20132 trains on your device.</li><li><strong>Outgoing connections are blocked</strong> by this Content-Security-Policy (set in the page): <code>default-src \'self\'; img-src \'self\' data:; style-src \'self\' \'unsafe-inline\'; font-src \'self\'; script-src \'self\'; connect-src \'none\'; object-src \'none\'; base-uri \'self\'; form-action \'none\'</code></li><li><strong>No camera, microphone or file access.</strong> The \u201cscreenshot\u201d and \u201cvoice\u201d demos use built-in samples.</li><li><strong>Storage:</strong> progress and picks are saved only in this browser\u2019s localStorage. Remove them any time with <em>Clear my data</em>.</li><li><strong>Please don\u2019t type real company or personal data</strong> into the bot name or chat box. It stays on your device, but the course isn\u2019t designed for real data.</li><li><strong>All documents, companies, people, policies, invoices and data in this course are fictional.</strong></li><li><strong>Source code is public</strong> for review: <a href="https://github.com/venky3007/build-your-own-gpt" rel="noopener noreferrer" target="_blank">github.com/venky3007/build-your-own-gpt</a>.</li></ul>';
  function securityModal() { openModal('<h2 id="modalTitle">\ud83d\udd12 Security &amp; privacy: the facts</h2>' + SECURITY + '<div class="row"><button class="btn" id="secClear">Clear my data</button><button class="btn primary" id="secClose">Close</button></div>', (m) => { $('#secClose', m).onclick = () => closeModal(); $('#secClear', m).onclick = () => { closeModal(true); resetAll(); }; }); }
  document.addEventListener('click', (e) => { if (e.target.closest('.safe-more')) { e.preventDefault(); securityModal(); } });
  const SAFE_STEP = {
    1: 'This model trains on your device. Nothing you type is uploaded.',
    2: 'Training happens in this tab on fictional emails. No data leaves your device.',
    3: 'ChatGPT/Claude are just examples here. Nothing connects to them.',
    4: 'Everything you see is computed in your browser.',
    5: 'Scripted demo. No AI service is called.',
    6: 'The documents here are fictional, not your company\u2019s. Nothing connects to your files.',
    7: 'Tools and emails here are pretend. Nothing is sent, booked or connected.',
    8: 'Hosted vs in-house is just an idea here. No model or API is contacted.',
    9: 'Just practice cards. Nothing is submitted anywhere.'
  };
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
  function parse(h) {
    const p = (h || '').replace(/^#\/?/, '').split('?');
    const parts = p[0].split('/');
    return { name: parts[0] || 'welcome', arg: parts[1], q: {} };
  }
  function nextPrev(r) {
    const n = +r.arg;
    switch (r.name) {
      case 'welcome': return { next: '#/step/1', nextLabel: 'Open the kit \u2192' };
      case 'step':
        if (n < LAST_CORE) return { prev: n === 1 ? '#/welcome' : '#/step/' + (n - 1), next: '#/step/' + (n + 1) };
        return { prev: '#/step/' + (n - 1), next: '#/build/1', nextLabel: 'Build your GPT \ud83d\udd27 \u2192' };
      case 'build': {
        const b = SP().B();
        if (n === 2 && !b.job) return { prev: '#/build/1' };
        if (n === NB) return { prev: '#/build/' + (n - 1), next: b.built ? '#/chat' : null, nextLabel: 'Chat with ' + (b.name || 'my bot') + ' \ud83d\udcac' };
        return { prev: n === 1 ? '#/step/' + LAST_CORE : '#/build/' + (n - 1), next: '#/build/' + (n + 1), nextLabel: n === NB - 1 ? 'To the workbench \ud83d\udd27 \u2192' : 'Next \u2192' };
      }
      case 'chat': return { prev: '#/build/' + NB, next: null };
      default: return {};
    }
  }
  function whereLabel(r) {
    if (r.name === 'step') { const s = step(+r.arg); return 'Step ' + s.n + ' of ' + CORE.length + ' \u00b7 ' + s.name; }
    if (r.name === 'build') return 'Build your GPT ' + r.arg + ' of ' + NB + ' \u00b7 ' + SP().SCREENS[+r.arg - 1].t;
    if (r.name === 'chat') return 'Chat with ' + (SP().B().name || 'your bot');
    return 'Welcome';
  }

  let current = null;
  function go(hash) { if (location.hash === hash) render(); else location.hash = hash; }
  function render() {
    hideGloss(); closeModal(true); closeDrawer(true);
    const r = parse(location.hash);
    if (!['welcome', 'step', 'build', 'chat'].includes(r.name) || (r.name === 'step' && !(+r.arg >= 1 && +r.arg <= TOTAL)) || (r.name === 'build' && !(+r.arg >= 1 && +r.arg <= NB))) { location.replace('#/welcome'); return; }
    current = r;
    document.body.classList.toggle('on-build', r.name === 'build');
    const main = $('#main'); main.innerHTML = '';
    if (r.name !== 'welcome') { S.route = location.hash; }
    if (r.name === 'step') S.visited[r.arg] = true;
    save();
    ({ welcome: renderWelcome, step: renderStep, build: (m, x) => SP().render(m, +x.arg), chat: (m) => SP().renderChat(m) })[r.name](main, r);
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
    if (r.name === 'build') { S.bdone[r.arg] = true; save(); }
    go(href);
  }

  // ---------- chrome: progress, drawer ----------
  function buildCount() { if (!SP()) return 0; const b = SP().B(); let k = 0; for (let i = 1; i < NB; i++) if (S.bdone[i]) k++; return k + (b.built ? 1 : 0); }
  function updateChrome() {
    const core = CORE.filter((n) => S.done[n]).length, bc = buildCount();
    $('#pCore').style.width = (core / CORE.length * 100) + '%';
    $('#pBuild').style.width = (bc / NB * 100) + '%';
    $('#progCore').setAttribute('aria-valuenow', core); $('#progBuild').setAttribute('aria-valuenow', bc);
    $('#progressLabel').textContent = 'Learn ' + core + '/' + CORE.length + ' \u00b7 Build ' + bc + '/' + NB;
    drawTracks(core, bc);
    buildDrawer();
    if (window.Layers) { try { window.Layers.update(current); } catch (e) { console.error('layers', e); } }
  }
  function buildDrawer() {
    const d = $('#drawerList'); if (!d) return;
    const cur = location.hash;
    const li = (href, num, label, opts) => {
      opts = opts || {};
      return '<li class="' + (opts.done ? 'done' : '') + '"><a href="' + href + '"' + (cur === href ? ' aria-current="page"' : '') + '><span class="num" aria-hidden="true">' + (opts.done ? '\u2713' : num) + '</span>' + esc(label) + (opts.done ? '<span class="sr-only"> (done)</span>' : '') + '</a></li>';
    };
    let h = '<ol>' + li('#/welcome', '\u2302', 'Welcome') + '</ol><h2 class="trk-learn">\ud83d\udcd8 ' + LEARN + ' (9 steps \u00b7 ~' + LEARN_MIN + ' min)</h2><ol>';
    CORE.forEach((n) => { h += li('#/step/' + n, n, step(n).name + ' \u00b7 ' + MIN[n] + ' min', { done: S.done[n] }); });
    h += '</ol><h2 class="trk-build">\ud83d\udd27 Build your GPT (~' + BUILD_MIN + ' min)</h2><ol>';
    SP().SCREENS.forEach((sc, i) => { h += li('#/build/' + (i + 1), i + 1, sc.t, { done: i + 1 === NB ? SP().B().built : S.bdone[i + 1] }); });
    h += li('#/chat', '\ud83d\udcac', 'Chat with your bot') + '</ol>';
    d.innerHTML = h;
  }
  function openDrawer() { const d = $('#drawer'); d.classList.add('open'); d.removeAttribute('aria-hidden'); $('#menuBtn').setAttribute('aria-expanded', 'true'); const s = document.createElement('div'); s.className = 'scrim'; s.id = 'scrim'; s.onclick = () => closeDrawer(); document.body.appendChild(s); const a = $('a[aria-current],a,button', d); if (a) a.focus(); }
  function closeDrawer(silent) { const d = $('#drawer'); if (!d || !d.classList.contains('open')) return; d.classList.remove('open'); d.setAttribute('aria-hidden', 'true'); $('#menuBtn').setAttribute('aria-expanded', 'false'); const s = $('#scrim'); if (s) s.remove(); if (!silent) $('#menuBtn').focus(); }
  function resetAll() {
    if (!confirm('Clear my data: delete all progress, quiz answers and bot picks stored in this browser? This can\u2019t be undone. (Your GPT will forget everything. Very on-theme.)')) return;
    try { localStorage.removeItem(KEY); localStorage.removeItem(OLD_KEY); } catch (e) { }
    S = blank(); if (SP()) SP().resetSession(); save(); toast('Fresh start! The engine is back to guessing random letters.'); go('#/welcome');
  }

  function trackCards(core, bc, compact) {
    const r = current || {}; const onL = r.name === 'step', onB = r.name === 'build' || r.name === 'chat';
    const nextStep = CORE.find((n) => !S.done[n]) || 1; const nextB = Math.min(NB, bc + 1);
    const learn = '<a class="track learn' + (onL ? ' on' : '') + '" href="#/step/' + (onL ? r.arg : nextStep) + '"' + (onL ? ' aria-current="true"' : '') + '><b>\ud83d\udcd8 ' + LEARN + '</b><small>9 steps \u00b7 ~' + LEARN_MIN + ' min \u00b7 ' + core + '/9 done</small><span class="tbar"><i style="width:' + (core / 9 * 100) + '%"></i></span>' + (compact ? '' : '<span class="tdesc">Peel a GPT layer by layer: train a tiny model, break it, see why it works.</span>') + '</a>';
    const build = '<a class="track build' + (onB ? ' on' : '') + '" href="#/build/' + (onB && r.name === 'build' ? r.arg : nextB) + '"' + (onB ? ' aria-current="true"' : '') + '><b>\ud83d\udd27 Build your GPT</b><small>' + NB + ' screens \u00b7 ~' + BUILD_MIN + ' min \u00b7 ' + bc + '/' + NB + ' done</small><span class="tbar"><i style="width:' + (bc / 9 * 100) + '%"></i></span>' + (compact ? '' : '<span class="tdesc">Learn by building: click together a work bot, watch it change live, break it, chat with it. No tech background needed; start here.</span>') + '</a>';
    return learn + build;
  }
  function tracksHTML() { return '<section class="tracks big" aria-label="Choose a track">' + trackCards(CORE.filter((n) => S.done[n]).length, buildCount(), false) + '</section>'; }
  function drawTracks(core, bc) { const t = $('#trackNav'); if (t) t.innerHTML = trackCards(core, bc, true); }
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
      '<div><div class="chips"><span class="chip">AI-literacy course</span><span class="chip learn">\ud83d\udcd8 ' + LEARN + ' (9 steps) ~' + LEARN_MIN + ' min</span><span class="chip build">\ud83d\udd27 Build your GPT ~' + BUILD_MIN + ' min</span></div>' +
      '<h1 class="course-title">' + esc(CFG.name) + '</h1><p class="subtitle">' + esc(CFG.subtitle) + '</p>' + safe('Runs 100% in your browser. No logins, no AI services, no data leaves your device. All company docs are fictional.') + '<p class="fict"><strong>' + FICT + '</strong></p>' +
      '<p>Inside, you\u2019ll assemble a GPT part by part, from a letter-guessing engine to a tool-using assistant, break it on purpose at every stage, then click together your own work bot and chat with it. <strong>Warning:</strong> side effects may include saying \u201cit depends on the retrieval\u201d in meetings.</p>' +
      '<div class="row">' + (resume ? '<a class="btn primary" href="' + resume + '">Continue: ' + esc(rl) + ' \u2192</a><a class="btn" href="#/step/1">Start from Step 1</a>' : '<a class="btn primary" href="#/step/1">Start learning \u2192</a>') + '</div></div></section>' + tracksHTML() +
      '<div class="card"><span class="section-label">Live from the workbench</span><p class="noise" id="noise" aria-live="off"></p><p class="note">This is an untrained engine: picking random letters, with total confidence. In Steps 1 and 2 you\u2019ll train a real (tiny) neural network right here in your browser, and watch it go from this to word-like office email. Progress!</p></div>' +
      '<div class="card"><h2>Hello! What should your GPT call you?</h2><div class="field"><label for="nameIn">First name (optional, stays in this browser)</label><input class="input" id="nameIn" autocomplete="given-name" maxlength="40" value="' + esc(S.name) + '" placeholder="e.g. Priya, Tom, Ananya, Sam"></div><p id="nameHi" class="status" aria-live="polite"></p></div>' +
      '<div class="card"><h2>The pitch</h2>' + C.intro.pitch + '</div>' +
      '<div class="card"><h2>How every step works</h2><ol><li><strong>Hook</strong>: one opening line (often a bad joke).</li><li><strong>What you see</strong>: the model before and after (illustrative).</li><li><strong>What\u2019s really happening</strong>: the real mechanism, in plain words. The metaphor is fun; this part is the truth.</li><li><strong>Break it!</strong>: a hands-on challenge. Breaking things is the fastest way to learn their limits.</li><li><strong>Myth-buster</strong>, <strong>So what for your requirement?</strong> and a one-question <strong>Quick check</strong>.</li><li><strong>Under the hood</strong>: a closed panel with a diagram and technical bullets for the curious.</li></ol><p>Underlined words like <button type="button" class="gloss" data-term="token" aria-expanded="false">token</button> open a one-line definition.</p></div>' +
      '<details class="card" id="security"><summary><strong>\ud83d\udd12 Security &amp; privacy (for InfoSec teams)</strong></summary>' + SECURITY + '<p class="note">Full summary: SECURITY-SUMMARY in the repo.</p></details>' +
      '<div class="card"><h2>By the end you\u2019ll be able to\u2026</h2>' + C.intro.outcomes + '</div>' +
      '<div class="card"><h2>What this course does NOT promise (an honest note)</h2>' + C.intro.honest + '</div>' +
      '<details class="card"><summary><strong>Running it with your team (facilitator notes)</strong></summary>' + C.intro.howToRun + '</details>' +
      '<p class="privacy">\ud83d\udd12 <strong>Privacy:</strong> nothing you type is sent anywhere. There is no server, no login and no live AI: the tiny model in Steps 1-2 trains right here in your browser, and every other AI reply is scripted in this page. Progress and your bot\u2019s picks are saved only in this browser, so switching devices or clearing your browser starts you fresh.</p>' +
      '<div class="row"><button class="btn small" id="resetBtn2">Clear my data</button></div>';
    const nameIn = $('#nameIn', main);
    const hi = () => { $('#nameHi', main).textContent = S.name ? 'Hi ' + S.name + '! Your GPT says: \u201c' + S.name.toLowerCase().split('').reverse().join('') + '?\u201d It\u2019s working on it.' : ''; };
    nameIn.addEventListener('input', () => { S.name = nameIn.value.trim(); save(); hi(); }); hi();
    $('#resetBtn2', main).onclick = resetAll;
    // untrained-engine animation
    const out = $('#noise', main); const chars = 'abcdefghijklmnopqrstuvwxyz #@!?'; let i = 0;
    const tick = () => { if (!document.body.contains(out)) return; if (i++ > 60) { out.textContent = ''; i = 0; } out.textContent += chars[Math.floor(Math.random() * chars.length)]; setTimeout(tick, 70); };
    out.setAttribute('aria-label', 'Animated random letters, for example: xq#vplm oo ztr kkaey'); tick();
  }

  function renderStep(main, r) {
    const n = +r.arg, s = step(n);
    const icon = X.icons[n] || 'spark';
    const done = !!S.challenge[n];
    let h = '<div class="step-head">' + partSVG(icon, 84) + '<div><div class="chips">' +
      '<span class="chip learn">\ud83d\udcd8 Learn \u00b7 Step ' + n + ' of ' + CORE.length + '</span>' +
      '<span class="chip time">\u23f1 ~' + esc(s.time.replace(/,.*$/, '')) + '</span></div>' +
      '<h1>' + X.emoji[n] + ' ' + esc(s.name) + '</h1><p class="concept">' + esc(s.concept) + '</p>' +
      (s.buildsOn ? '<p class="note">Builds on ' + linkSteps(s.buildsOn.replace(/Steps (\d+) and (\d+)/, 'Step $1 and Step $2').replace(/Steps (\d+), (\d+) and (\d+)/, 'Step $1, Step $2 and Step $3')) + '.</p>' : '') + '</div></div>';
    h += '<div class="card hook" id="hook"><span class="section-label">Hook</span><div>' + s.hook + '<span class="quip">' + esc(F.hookQuip[n]) + '</span></div></div>';
    h += '<div class="card"><span class="section-label">What you see</span> ' + illus('Illustrative example') + '<div class="ba" style="margin-top:10px"><div class="before"><h4>' + s.see.head[0] + '</h4><div>' + s.see.before + '</div></div><div class="after"><h4>' + s.see.head[1] + '</h4><div>' + s.see.after + '</div></div></div>' + (s.see.note ? '<p class="note">' + s.see.note + '</p>' : '') + '</div>';
    h += '<div class="card mech" id="mech"><h2>What\u2019s really happening</h2>' + linkSteps(s.mechanism) + '</div>';
    if (s.workplace) h += '<div class="card" id="workplace"><h2>Workplace examples</h2>' + linkSteps(s.workplace) + '</div>';
    h += '<section class="card breakit' + (done ? ' complete' : '') + '" id="breakit" aria-labelledby="bi-h"><h2 id="bi-h">\ud83d\udd28 Break it! \u2014 \u201c' + esc(s.breakName) + '\u201d</h2>' + (REAL_MODEL.includes(n) ? '<p class="honesty real">\ud83e\udde0 <strong>Real model:</strong> a tiny transformer with real causal self-attention, trained live in your browser on fictional office emails (~10-20 s). Nothing is scripted and nothing leaves your device.</p>' : '<p class="honesty sim">\ud83c\udfad <strong>Simulated for this demo:</strong> the replies below are scripted to show a real mechanism safely and offline. No live AI is involved.</p>') + (SAFE_STEP[n] ? safe(SAFE_STEP[n]) : '') + '<p class="goal"><strong>Goal:</strong> ' + s.goal + '</p>' +
      ('<div class="widget" id="widget"></div>' + (s.discover ? '<details style="margin-top:12px"><summary><strong>Spoiler: what you discover</strong></summary><p class="discover">' + s.discover + '</p></details>' : '') +
        '<div class="done-banner" role="status" aria-live="polite" id="doneBanner">\u2705 Challenge complete! ' + (S.w[n] && S.w[n]._msg ? esc(S.w[n]._msg) : 'You broke it, and you know why.') + '</div>') + '</section>';
    h += '<div class="card" id="myths"><h2>\ud83d\udeab Myth-buster</h2>' + s.myths.map((m) => '<div class="myth"><span class="badge bm">MYTH</span><span class="m">' + m.myth + '</span><span class="badge br">REALITY</span><span>' + linkSteps(m.reality) + '</span></div>').join('') + '<p class="punch">' + esc(F.mythPunch[n]) + '</p></div>';
    h += '<div class="card sowhat" id="sowhat"><h2>\ud83d\udccc So what for your requirement?</h2><ul>' + s.sowhat.map((x) => '<li>' + linkSteps(x) + '</li>').join('') + '</ul>' +
      '</div>';
    h += '<section class="card quiz" id="quiz"><h2>\u2753 Quick check</h2><fieldset><legend>' + s.quiz.q + '</legend>' + s.quiz.options.map((o, i) => '<button type="button" class="opt" data-i="' + i + '">(' + 'abc'[i] + ') ' + esc(o) + '</button>').join('') + '</fieldset><p class="fb" role="status" aria-live="polite"></p><p class="note">Nothing is scored or stored anywhere except this browser.</p></section>';
    h += '<details class="hood" id="hood"' + (S.hood[n] ? ' open' : '') + '><summary>\ud83d\udd27 Under the hood: ' + esc(s.hoodTitle) + '</summary><div class="hood-body"><div class="vis" id="vis"></div><p class="caption">' + s.hoodCaption + '</p><ul>' + s.hoodBullets.map((b) => '<li>' + b + '</li>').join('') + '</ul></div></details>';
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
    {
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

  // ---------- expose + boot ----------
  function mountLearn(el, n) {
    S.w[n] = S.w[n] || {};
    const api = { n, state: S.w[n], save, toast, esc, pick, F, illus, conf, get complete() { return !!S.challenge[n]; },
      done(msg) { if (S.challenge[n]) return; S.challenge[n] = true; save(); toast('\ud83c\udf89 Challenge complete! ' + (msg || ''), 4200); }, loading() { return pick(F.loading); }, go };
    try { window.WIDGETS[n](el, api); glossify([el]); } catch (e) { console.error('widget ' + n, e); el.innerHTML = '<p>Sorry, this demo hit a snag.</p>'; }
  }
  window.App = { S: () => S, mountLearn, safe, FICT, securityModal, save, toast, esc, pick, go, openModal, closeModal, glossify, linkSteps, illus, conf, updateChrome, step, isDone: (n) => !!S.done[n], CORE, CFG };
  function boot() {
    $('#brandIcon').innerHTML = partSVG('layers', 30);
    $('#brandName').textContent = CFG.name; $('#brandLink').setAttribute('aria-label', CFG.name + ', home');
    $('#menuBtn').onclick = () => ($('#drawer').classList.contains('open') ? closeDrawer() : openDrawer());
    $('#closeDrawer').onclick = () => closeDrawer();
    $('#resetBtn').onclick = resetAll;
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
