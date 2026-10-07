/* Peel-the-layers diagram: a persistent picture of "your GPT", outside (what users see) to inside (tokens).
   Every layer starts covered by the assembled product. Completing a step peels its layer. */
(function () {
  'use strict';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const LAYERS = [
    { id: 'ui', name: 'Chat app', icon: 'flag', steps: [1], c: '#6d4aff', sees: 'A friendly chat box and a confident answer.', inside: 'A loop that sends your text to a model and streams back its guesses, one token at a time.' },
    { id: 'guard', name: 'Guardrails & alignment', icon: 'shield', steps: [8], c: '#e2468f', sees: 'Polite answers \u2014 and the odd \u201cI can\u2019t help with that.\u201d', inside: 'Fine-tuning and preference training shape the style; filters and checks sit around it.' },
    { id: 'agents', name: 'Agents & tools', icon: 'tools', steps: [7], c: '#e8590c', sees: '\u201cI\u2019ve booked the meeting.\u201d', inside: 'The model writes a tool request; ordinary software runs it, within the permissions you gave it.' },
    { id: 'rag', name: 'Retrieval (RAG)', icon: 'books', steps: [6], c: '#b7791f', sees: 'Answers that quote your own policies.', inside: 'A search step finds relevant passages and pastes them into the prompt before the model answers.' },
    { id: 'context', name: 'Context window & prompt', icon: 'layers', steps: [3], c: '#2f9e44', sees: 'It remembers the conversation \u2014 until the window fills.', inside: 'Everything it sees (instructions, history, documents) is re-sent each time and must fit a fixed token budget.' },
    { id: 'output', name: 'Next-token output & sampling', icon: 'spark', steps: [1], c: '#0c8599', sees: 'Fluent sentences, typed out one token at a time.', inside: 'A probability for every possible next token; one is sampled (temperature), appended, and the loop repeats.' },
    { id: 'blocks', name: 'Transformer blocks \u00d7N', icon: 'scale', steps: [5], c: '#1c7ed6', sees: 'It seems to \u201cunderstand\u201d.', inside: 'The same attention + feed-forward block stacked dozens of times; bigger models stack more, wider blocks.' },
    { id: 'ffn', name: 'Feed-forward layers', icon: 'chip', steps: [4], c: '#4c6ef5', sees: 'It \u201cknows\u201d facts.', inside: 'Per-token calculators holding most of the parameters: patterns learned in training, not a database.' },
    { id: 'attn', name: 'Attention', icon: 'eye', steps: [3], c: '#7048e8', sees: 'It knows \u201cshe\u201d means Priya.', inside: 'Each token scores the earlier tokens and blends in the ones that matter.' },
    { id: 'pos', name: 'Positional encoding', icon: 'map', steps: [4], c: '#ae3ec9', sees: 'Word order matters.', inside: 'A position signal is added to each token, so \u201cPriya paid Tom\u201d isn\u2019t \u201cTom paid Priya\u201d.' },
    { id: 'emb', name: 'Embeddings', icon: 'compass', steps: [4], c: '#d6336c', sees: 'It links related words (leave \u2248 holiday).', inside: 'Each token ID looks up a learned list of numbers; words used alike get similar numbers.' },
    { id: 'tok', name: 'Tokens (+ training data)', icon: 'fuel', steps: [2], c: '#5c677d', sees: 'Words.', inside: 'Text chopped into ID numbers. The weights that process them were learned from training data.' }
  ];
  const ATTACH = { 10: ['context', 'Memory module'], 11: ['rag', 'Vector index'], 12: ['context', 'Context packing'], 13: ['tok', 'Image & audio inputs'], 14: ['output', 'Thinking tokens'], 15: ['agents', 'Connectors (MCP)'], 16: ['guard', 'Defence in depth'], 17: ['ui', 'Test bench'], 18: ['guard', 'Values training'], 19: ['tok', 'Synthetic data'], 20: ['blocks', 'Compact blocks'], 21: ['ffn', 'Mixture of experts'], 22: ['ui', 'Cost meter'] };
  const FINAL = 9;
  let open = null, expanded = false, lastKey = '';

  const S = () => window.App.S();
  const peeledIds = () => { const d = S().done || {}; return LAYERS.filter((l) => l.steps.some((n) => d[n])).map((l) => l.id); };
  const icon = (k, sz) => window.partSVG ? window.partSVG(k, sz || 26) : '';
  const stepLink = (n) => '<a href="#/step/' + n + '">Step ' + n + '</a>';

  function currentSet(route) {
    if (!route || route.name !== 'step') return new Set();
    const n = +route.arg; const set = new Set(LAYERS.filter((l) => l.steps.includes(n)).map((l) => l.id));
    if (ATTACH[n]) set.add(ATTACH[n][0]);
    return set;
  }
  function chatCover() {
    return '<span class="chatmock" aria-hidden="true"><span class="cm-bar"><i></i><i></i><i></i></span><span class="cm-q">How many leave days do I get?</span><span class="cm-a">You get 25 days! \u2728 <em>Model confidence: 100%</em></span><span class="cm-in">Ask anything\u2026</span></span>';
  }

  function panelHTML(route) {
    const st = S(); const peeled = peeledIds(); const cur = currentSet(route); const d = st.done || {};
    const exploded = !!d[FINAL];
    const seen = new Set(st.peelSeen || []);
    const atts = {}; Object.keys(ATTACH).forEach((n) => { if (d[n]) (atts[ATTACH[n][0]] = atts[ATTACH[n][0]] || []).push([+n, ATTACH[n][1]]); });
    const items = LAYERS.map((l, i) => {
      const p = peeled.includes(l.id), fresh = p && !seen.has(l.id);
      const cls = ['layer', p ? 'peeled' : 'covered', fresh ? 'peeling' : '', cur.has(l.id) ? 'current' : '', open === l.id ? 'open' : ''].filter(Boolean).join(' ');
      const face = '<span class="face">' + icon(l.icon, 24) + '<span class="nm">' + esc(l.name) + '</span>' + (p ? '<span class="tick" aria-hidden="true">\u2713</span>' : '<span class="st">Step ' + l.steps[0] + '</span>') + '<span class="sr-only">' + (p ? ' (peeled)' : ' (still covered)') + (cur.has(l.id) ? ' (current step)' : '') + '</span></span>';
      const cover = (l.id === 'ui')
        ? '<span class="cover cover-ui" aria-hidden="true">' + chatCover() + '</span>'
        : '<span class="cover" title="' + esc(l.sees).replace(/"/g, '&quot;') + '"><span class="lock" aria-hidden="true">\ud83d\udd12</span><span class="seal">' + esc(l.sees) + '</span></span>';
      return '<li class="' + cls + '" data-id="' + l.id + '" style="--c:' + l.c + ';--i:' + i + '">' +
        '<button class="slab" type="button" aria-expanded="' + (open === l.id) + '" aria-controls="cap-' + l.id + '">' +
          (p && !fresh ? face : (fresh ? face + cover + '<span class="peel-flag" aria-hidden="true">Peeled!</span>' : cover)) +
        '</button>' +
        (atts[l.id] ? '<div class="atts">' + atts[l.id].map((a) => '<a class="att" href="#/step/' + a[0] + '" title="Optional step ' + a[0] + '">+ ' + esc(a[1]) + '</a>').join('') + '</div>' : '') +
        '<div class="cap" id="cap-' + l.id + '"' + (open === l.id ? '' : ' hidden') + '><p><b>User sees:</b> ' + esc(l.sees) + '</p><p><b>Inside:</b> ' + (p ? esc(l.inside) : '<span class="muted">still covered. Peel it in ' + stepLink(l.steps[0]) + '.</span>') + '</p>' + (p ? '<p class="more">Explained in ' + l.steps.map(stepLink).join(', ') + '</p>' : '') + '</div></li>';
    }).join('');
    const n = peeled.length;
    return '<button class="lp-toggle" type="button" aria-expanded="' + expanded + '" aria-controls="lpBody"><span aria-hidden="true">\ud83e\uddc5</span> Layers peeled <b>' + n + '/' + LAYERS.length + '</b><span class="lp-mini" aria-hidden="true">' + LAYERS.map((l) => '<i class="' + (peeled.includes(l.id) ? 'on' : '') + '" style="--c:' + l.c + '"></i>').join('') + '</span><span class="chev" aria-hidden="true">\u25be</span></button>' +
      '<div class="lp-body" id="lpBody"><div class="lp-head"><h2 id="lpTitle">Your GPT, layer by layer</h2><p class="lp-sub">' + (n === 0 ? 'Fully assembled: this is all a user ever sees. Finish a step to peel a layer.' : exploded ? 'Exploded view: every part on the bench.' : n + ' of ' + LAYERS.length + ' layers peeled. Tap a layer for \u201cuser sees vs inside\u201d.') + '</p><div class="lp-meter" aria-hidden="true"><span style="width:' + (n / LAYERS.length * 100) + '%"></span></div></div>' +
      '<ol class="stack' + (exploded ? ' exploded' : '') + '" aria-label="Layers from outside (chat app) to inside (tokens)">' + items + '</ol><p class="lp-foot"><span>Outside</span><span aria-hidden="true">\u2192</span><span>Inside</span></p></div>';
  }

  function update(route) {
    const el = document.getElementById('layerPanel'); if (!el || !window.App) return;
    const st = S();
    el.innerHTML = panelHTML(route);
    el.classList.toggle('expanded', expanded);
    el.querySelector('.lp-toggle').onclick = () => { expanded = !expanded; update(route); };
    el.querySelectorAll('.slab').forEach((b) => b.onclick = () => { const id = b.parentElement.dataset.id; open = open === id ? null : id; update(route); });
    // record freshly peeled layers after their animation plays
    const fresh = Array.from(el.querySelectorAll('.layer.peeling')).map((x) => x.dataset.id);
    if (fresh.length) {
      const names = fresh.map((id) => LAYERS.find((l) => l.id === id).name);
      const key = fresh.join(',');
      if (key !== lastKey && window.App.toast) { lastKey = key; setTimeout(() => window.App.toast('\ud83e\uddc5 Layer peeled: ' + names.join(' + ')), 400); }
      st.peelSeen = Array.from(new Set((st.peelSeen || []).concat(fresh))); window.App.save();
      setTimeout(() => { el.querySelectorAll('.layer.peeling').forEach((x) => { x.classList.remove('peeling'); const c = x.querySelector('.cover'); if (c) c.remove(); const f = x.querySelector('.peel-flag'); if (f) f.remove(); }); }, window.__FAST__ ? 30 : 2200);
    }
    const c = el.querySelector('.layer.current'); if (c && window.matchMedia('(min-width: 1200px)').matches) { const b = el.querySelector('.lp-body'); if (b && (c.offsetTop < b.scrollTop || c.offsetTop > b.scrollTop + b.clientHeight - 60)) b.scrollTop = c.offsetTop - 80; }
  }

  function explodedHTML() {
    const d = S().done || {}; const peeled = peeledIds();
    return '<section class="card exploded-view" aria-labelledby="exH"><span class="section-label">The fully exploded view</span><h2 id="exH">Every part of your GPT, on the bench</h2><p>Outside to inside. Each row: what a user sees, and what is actually happening.</p><ol class="xstack">' +
      LAYERS.map((l, i) => {
        const p = peeled.includes(l.id); const att = Object.keys(ATTACH).filter((n) => ATTACH[n][0] === l.id);
        return '<li class="xl' + (p ? '' : ' unseen') + '" style="--c:' + l.c + ';--i:' + i + '"><div class="xslab">' + icon(l.icon, 30) + '<b>' + esc(l.name) + '</b></div><div class="xtext"><p><b>User sees:</b> ' + esc(l.sees) + '</p><p><b>Inside:</b> ' + esc(l.inside) + '</p><p class="xmeta">' + (p ? '\u2713 Peeled in ' : '\u25cb Not explored yet: ') + l.steps.map(stepLink).join(', ') + (att.length ? ' \u00b7 Upgrades: ' + att.map((n) => '<a href="#/step/' + n + '" class="att' + (d[n] ? ' on' : '') + '">' + esc(ATTACH[n][1]) + '</a>').join(' ') : '') + '</p></div></li>';
      }).join('') + '</ol></section>';
  }

  window.Layers = { LAYERS, ATTACH, update, explodedHTML, peeledIds };
})();
