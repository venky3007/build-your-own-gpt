/* Step 4: Inside the Brain. An animated walkthrough of one token through a transformer.
   Numbers are illustrative ("Simulated for this demo"); the stages and their order are real. */
(function () {
  'use strict';
  const W = window.WIDGETS = window.WIDGETS || {};
  const V = window.VISUALS = window.VISUALS || {};
  const { $, $$, esc } = window.WUTIL;
  const FAST = () => !!window.__FAST__;
  const TOK = ['The', ' invoice', ' is', ' overdue'];
  const ID = TOK.map((t) => window.WUTIL.hid(t));
  const DIM = 12;
  const vec = (seed, amp) => Array.from({ length: DIM }, (_, i) => Math.sin(seed * 0.37 + i * 1.7) * Math.cos(seed * 0.11 + i * 0.6) * (amp || 1));
  const EMB = vec(ID[3]), POS = Array.from({ length: DIM }, (_, i) => (i % 2 ? Math.cos : Math.sin)(3 / Math.pow(4, Math.floor(i / 2) / 3)) * 0.45);
  const SUM = EMB.map((v, i) => v + POS[i]);
  const ATT = [0.07, 0.58, 0.12, 0.23];
  const GOOD = [['.', 38], [' by', 21], [' and', 12], [',', 9], [' again', 8], [' regards', 3], [' the', 2], [' banana', 0.4]];

  function vbars(v, cls, label) {
    return '<div class="vbars ' + (cls || '') + '" role="img" aria-label="' + esc(label || 'A list of numbers') + '">' + v.map((x, i) => '<span style="--h:' + Math.min(1, Math.abs(x)).toFixed(2) + ';--d:' + i * 30 + 'ms" class="' + (x >= 0 ? 'pos' : 'neg') + '"></span>').join('') + '</div>';
  }
  function chips(hl, withIds) { return '<div class="tokrow">' + TOK.map((t, i) => '<span class="tk' + (i === hl ? ' hl' : '') + '">' + esc(t.trim()) + (withIds ? '<small>ID ' + ID[i] + '</small>' : '') + '</span>').join('') + '</div>'; }

  const STAGES = [
    { k: 'Token', ico: '\ud83d\udd24', hood: 'mask', view: () => chips(3, true) + '<p class="flow">\u201coverdue\u201d \u2192 <b>ID ' + ID[3] + '</b></p>',
      say: 'Your text is chopped into tokens and each one becomes an ID number. We\u2019ll follow the last token, \u201coverdue\u201d, because the last position is where the guess for the next token gets made.' },
    { k: 'Embedding', ico: '\ud83d\udd22', hood: 'params', view: () => '<p class="flow">ID ' + ID[3] + ' \u2192 row ' + ID[3] + ' of a learned table \u2192</p>' + vbars(EMB, 'big', 'Embedding vector for overdue: 12 numbers'),
      say: 'The ID looks up its row in a big learned table: a list of numbers (12 here, thousands in real models). Words used in similar ways get similar numbers, so \u201coverdue\u201d sits near \u201clate\u201d and \u201coutstanding\u201d.' },
    { k: '+ Position', ico: '\ud83d\udccd', hood: 'mask', view: () => '<div class="eq"><div><small>meaning</small>' + vbars(EMB, '', 'Embedding') + '</div><b>+</b><div><small>seat number 4</small>' + vbars(POS, 'alt', 'Position signal') + '</div><b>=</b><div><small>meaning in this seat</small>' + vbars(SUM, '', 'Embedding plus position') + '</div></div>',
      say: 'Attention on its own can\u2019t tell word order. So a position signal is added: same word, different seat, slightly different numbers. That\u2019s how \u201cPriya paid Tom\u201d differs from \u201cTom paid Priya\u201d.' },
    { k: 'Attention', ico: '\ud83d\udc40', hood: 'mask', view: () => {
      const xs = [40, 135, 230, 325];
      let s = '<svg viewBox="0 0 380 158" class="attsvg" role="img" aria-label="Attention from overdue: The 7%, invoice 58%, is 12%, overdue itself 23%">';
      ATT.forEach((a, i) => { if (i === 3) return; const sx = xs[3] - 18 + i * 6, mx = (xs[i] + sx) / 2; s += '<path class="arc" style="--w:' + (1 + a * 14).toFixed(1) + ';--o:' + (0.25 + a).toFixed(2) + '" d="M' + sx + ',106 Q' + mx + ',' + (100 - (3 - i) * 26) + ' ' + xs[i] + ',106"/><text x="' + xs[i] + '" y="98" text-anchor="middle" class="aw">' + Math.round(a * 100) + '%</text>'; });
      TOK.forEach((t, i) => { s += '<rect x="' + (xs[i] - 42) + '" y="108" width="84" height="30" rx="9" class="tkr' + (i === 3 ? ' hl' : '') + '"/><text x="' + xs[i] + '" y="128" text-anchor="middle" class="tkt">' + esc(t.trim()) + '</text>'; });
      return s + '<text x="' + xs[3] + '" y="152" text-anchor="middle" class="aw">self ' + Math.round(ATT[3] * 100) + '%</text></svg>';
    }, say: '\u201coverdue\u201d looks back at the earlier tokens, scores how relevant each one is (\u201cinvoice\u201d wins at 58%) and blends in their information. It can only look backwards, never at future words: that\u2019s causal masking.' },
    { k: 'Feed-forward', ico: '\ud83e\uddee', hood: 'ffn', view: () => '<div class="ffn">' + vbars(SUM, '', 'Input vector, 12 numbers') + '<span class="arr">\u2192</span><div class="neurons" role="img" aria-label="48 hidden units, some lit up">' + Array.from({ length: 48 }, (_, i) => '<i class="' + ((Math.sin(i * 7.3) > 0.35) ? 'on' : '') + '" style="--d:' + (i * 18) + 'ms"></i>').join('') + '</div><span class="arr">\u2192</span>' + vbars(vec(ID[3] + 9), '', 'Output vector, 12 numbers') + '</div><p class="flow"><small>expand 4\u00d7 wider \u2192 keep useful signals \u2192 shrink back</small></p>',
      say: 'Next, each token goes through its own small calculator: widen to 4\u00d7 the size, switch on the useful signals, shrink back. These feed-forward weights hold most of the model\u2019s parameters, and much of what it \u201cknows\u201d, stored as patterns, not as a database.' },
    { k: 'Repeat \u00d7N', ico: '\ud83d\udd01', hood: 'resid', view: () => '<div class="layers12" role="img" aria-label="12 stacked blocks lighting up one after another">' + Array.from({ length: 12 }, (_, i) => '<span style="--d:' + (FAST() ? 0 : (11 - i) * 140) + 'ms">' + (12 - i) + '</span>').join('') + '</div><p class="flow"><b>Layer 1 \u2192 12:</b> attention + feed-forward, again and again</p>',
      say: 'Attention plus feed-forward makes one block. Stack it again and again: 12 here, about 100 in the biggest models. Each block refines the numbers a little, while a shortcut (the \u201cresidual\u201d) carries the original forward so nothing gets lost.' },
    { k: 'Softmax', ico: '\ud83d\udcca', hood: 'params', view: () => '<div class="bars">' + window.WUTIL.probBars(GOOD.slice(0, 5).map((g) => ({ label: g[0].replace(/ /g, '\u2423'), p: g[1] / 100 }))) + '</div>',
      say: 'Finally, the numbers are scored against every token in the vocabulary, and softmax turns those scores into probabilities. One gets picked (that\u2019s Step 1\u2019s temperature), and the whole trip runs again for the next token.' }
  ];
  const HOOD = {
    resid: ['Residual connections', 'Each block adds its result to its input instead of replacing it, like tracked changes on a document. That shortcut keeps deep stacks trainable.'],
    norm: ['Layer norm', 'Before each sub-step the numbers are rescaled to a steady range, so nothing blows up or fades away across 100 layers.'],
    mask: ['Causal masking', 'When reading, a token may only attend to earlier tokens. That\u2019s what makes it a next-token predictor and stops it peeking at the answer.'],
    ffn: ['Parameters live mostly in feed-forward weights', 'Roughly two-thirds of a typical model\u2019s parameters sit in the feed-forward layers; attention takes most of the rest, and the embedding table a small slice.'],
    params: ['What a parameter is', 'One adjustable number. A tiny model has thousands (Step 2 trains about 11,000); frontier models have hundreds of billions, all set by training, none typed in by hand.']
  };

  W[4] = function (el, api) {
    const st = api.state; st.seen = st.seen || {};
    el.innerHTML = '<div class="brain">' +
      '<ol class="stages" role="list" aria-label="Stages of the walkthrough">' + STAGES.map((s, i) => '<li><button class="stage" data-i="' + i + '"><span aria-hidden="true">' + s.ico + '</span>' + esc(s.k) + '</button></li>').join('') + '</ol>' +
      '<div class="stage-view" id="w4view" aria-live="polite"></div>' +
      '<div class="row center"><button class="btn small" id="w4back" aria-label="Previous stage">\u23ee Back</button><button class="btn primary" id="w4play">\u25b6 Play</button><button class="btn small" id="w4next" aria-label="Next stage">Next \u23ed</button><button class="btn ghost small" id="w4restart">\u21ba Restart</button></div>' +
      '<details class="hoodpanel" id="w4hood"><summary>\ud83d\udd27 Under the hood of this stage</summary><dl id="w4dl"></dl></details></div>' +
      '<div class="panel breaker"><h4>Break the brain</h4><div class="row"><label class="switch"><input type="checkbox" id="w4pos"> Remove positional information</label>' +
      '<label class="lbl" for="w4layers">Layers: <b id="w4ln">12</b></label><input type="range" id="w4layers" min="1" max="12" value="12" style="flex:1;min-width:160px"></div>' +
      '<div class="col2"><div><h5>Word-order test</h5><div id="w4order"></div></div><div><h5>\u201cThe invoice is overdue\u201d \u2192 next token</h5><div class="bars" id="w4bars"></div><p class="status" id="w4mood"></p></div></div></div>';
    let cur = 0, timer = 0, playing = false;
    const show = (i) => {
      cur = Math.max(0, Math.min(STAGES.length - 1, i)); const s = STAGES[cur];
      $('#w4view', el).innerHTML = '<div class="stage-card" data-stage="' + cur + '"><div class="sv">' + s.view() + '</div><p class="say"><b>' + (cur + 1) + '/' + STAGES.length + ' ' + esc(s.k) + ':</b> ' + s.say + '</p></div>';
      $$('.stage', el).forEach((b, j) => { b.classList.toggle('done', j < cur); if (j === cur) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); });
      const keys = [s.hood].concat(Object.keys(HOOD).filter((k) => k !== s.hood));
      $('#w4dl', el).innerHTML = keys.map((k, j) => '<div class="' + (j === 0 ? 'hl' : '') + '"><dt>' + HOOD[k][0] + '</dt><dd>' + HOOD[k][1] + '</dd></div>').join('');
      st.stage = cur; api.save();
    };
    const stop = () => { playing = false; clearTimeout(timer); $('#w4play', el).textContent = '\u25b6 Play'; };
    const tick = () => { if (!playing) return; if (cur >= STAGES.length - 1) { stop(); return; } show(cur + 1); timer = setTimeout(tick, FAST() ? 40 : 3200); };
    $('#w4play', el).onclick = () => { if (playing) { stop(); return; } playing = true; $('#w4play', el).textContent = '\u23f8 Pause'; if (cur >= STAGES.length - 1) show(0); timer = setTimeout(tick, FAST() ? 40 : 2600); };
    $('#w4back', el).onclick = () => { stop(); show(cur - 1); };
    $('#w4next', el).onclick = () => { stop(); show(cur + 1); };
    $('#w4restart', el).onclick = () => { stop(); show(0); };
    $$('.stage', el).forEach((b) => b.onclick = () => { stop(); show(+b.dataset.i); });

    const breakDraw = () => {
      const noPos = $('#w4pos', el).checked, n = +$('#w4layers', el).value; $('#w4ln', el).textContent = n;
      if (noPos) st.seen.pos = true; if (n <= 2) st.seen.layers = true; api.save();
      const ord = (a, b) => noPos ? [['Priya', 51], ['Tom', 49]] : [[a, 91], [b, 9]];
      $('#w4order', el).innerHTML = [['Priya paid Tom. Who paid?', 'Priya', 'Tom'], ['Tom paid Priya. Who paid?', 'Tom', 'Priya']].map((q) => '<div class="ordq"><p><code>' + q[0] + '</code></p><div class="bars">' + window.WUTIL.probBars(ord(q[1], q[2]).map((x) => ({ label: x[0], p: x[1] / 100 }))) + '</div></div>').join('') +
        (noPos ? '<p class="note bad">\ud83e\udd2f Same bag of words, same answer for both. Without positions, word order simply doesn\u2019t exist for the model.</p>' : '<p class="note">Positions on: order changes the answer, as it should.</p>');
      const q = Math.pow((n - 1) / 11, 0.9) * (noPos ? 0.55 : 1);
      const mix = GOOD.map((g) => [g[0], q * g[1] / 100 + (1 - q) / GOOD.length]).sort((a, b) => b[1] - a[1]).slice(0, 5);
      $('#w4bars', el).innerHTML = window.WUTIL.probBars(mix.map((m) => ({ label: m[0].replace(/ /g, '\u2423'), p: m[1] })));
      $('#w4mood', el).textContent = q > 0.75 ? 'Confident and sensible.' : q > 0.35 ? 'Hedging. It can sort of tell this is an email.' : 'Mush. Roughly a shrug in probability form. (Yes, \u201cbanana\u201d is now a contender.)';
      if (st.seen.pos && st.seen.layers) api.done('Order lives in the position signal, and understanding builds up across layers. Remove either and the output turns to mush.');
    };
    $('#w4pos', el).onchange = breakDraw; $('#w4layers', el).oninput = breakDraw;
    show(st.stage || 0); breakDraw();
  };

  /* Hood visual: one transformer block, with residuals, layer norm and where parameters live. */
  V[4] = function (el) {
    const box = (x, y, w, t, cls) => '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="30" rx="8" class="hb ' + (cls || '') + '"/><text x="' + (x + w / 2) + '" y="' + (y + 19.5) + '" text-anchor="middle" class="ht">' + t + '</text>';
    let s = '<svg viewBox="0 0 520 430" class="chart hoodsvg" role="img" aria-label="Transformer diagram: token, embedding plus position, then a block repeated N times containing layer norm, masked attention, add, layer norm, feed-forward, add; then a final layer norm, scores and softmax. Bar: feed-forward about 65 percent of parameters, attention about 30 percent, embeddings about 5 percent.">';
    s += box(140, 8, 180, 'Token ID') + box(140, 52, 180, 'Embedding + position');
    s += '<rect x="100" y="98" width="260" height="214" rx="14" class="blk"/><text x="372" y="112" class="ht small">\u00d7 N blocks</text>';
    s += box(150, 112, 160, 'Layer norm', 'soft') + box(150, 150, 160, 'Attention (masked)', 'att') + box(150, 192, 160, 'Layer norm', 'soft') + box(150, 230, 160, 'Feed-forward', 'ffn');
    s += '<path class="res" d="M140,106 H118 V182 H150"/><text x="106" y="148" class="ht small" transform="rotate(-90 106 148)">residual</text><path class="res" d="M140,186 H124 V272 H150"/><text x="168" y="290" class="ht small">\u2295 add the shortcut back in</text>';
    s += box(140, 324, 180, 'Final layer norm') + box(140, 364, 180, 'Scores \u2192 softmax');
    for (const [a, b] of [[38, 52], [82, 98], [142, 150], [180, 192], [222, 230], [312, 324], [354, 364]]) s += '<line x1="230" y1="' + a + '" x2="230" y2="' + b + '" class="hl2"/>';
    s += '<text x="400" y="190" class="ht small">Where the</text><text x="400" y="204" class="ht small">parameters live</text>';
    [[65, 'ffn', 'Feed-forward ~65%'], [30, 'att', 'Attention ~30%'], [5, 'soft', 'Embeddings ~5%']].reduce((y, p) => { s += '<rect x="400" y="' + y + '" width="22" height="' + p[0] * 1.6 + '" class="hb ' + p[1] + '"/><text x="428" y="' + (y + 12) + '" class="ht small">' + p[2] + '</text>'; return y + p[0] * 1.6; }, 214);
    el.innerHTML = s + '</svg><p class="note">Shares are typical for GPT-style models and vary by design. ' + window.App.illus('Illustrative') + '</p>';
  };
})();
