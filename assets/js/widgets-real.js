/* Steps 1 and 2: a REAL tiny neural language model (minigpt.js), trained live in the browser on the bundled
   fictional corpus (corpus.js). Nothing here is scripted except the "how a big LLM would split this" tokenizer view. */
(function () {
  'use strict';
  const W = window.WIDGETS = window.WIDGETS || {};
  const { $, $$, esc, wait } = window.WUTIL;
  const L = () => window.MiniLM;
  const fmt = (n) => Number(n).toLocaleString('en-US');
  const showCh = (c) => c === ' ' ? '\u2423' : c === '\n' ? '\u23ce' : c;
  const pct = (p) => (p * 100 >= 10 ? (p * 100).toFixed(0) : (p * 100).toFixed(1)) + '%';

  function bars(list) { // [{label, p}]
    const mx = Math.max(0.0001, ...list.map((x) => x.p));
    return list.map((x, i) => '<div class="bar' + (i === 0 ? ' top' : '') + '"><span class="tok">' + esc(x.label) + '</span><span class="track"><span class="fill" style="width:' + Math.max(2, x.p / mx * 100).toFixed(0) + '%"></span></span><span class="pv">' + pct(x.p) + '</span></div>').join('');
  }
  window.WUTIL.probBars = bars;

  /* ---------- live loss chart (SVG) ---------- */
  function lossChart(job) {
    const w = 520, h = 250, pl = 46, pr = 14, pt = 16, pb = 38, iw = w - pl - pr, ih = h - pt - pb;
    const ymax = Math.max(4.5, Math.ceil((job.trainHist[0] || [0, 4.5])[1] * 2) / 2), x = (i) => pl + i / job.total * iw, y = (v) => pt + ih - Math.min(v, ymax) / ymax * ih;
    const tp = job.trainHist.map((p) => x(p[0]).toFixed(1) + ',' + y(p[1]).toFixed(1)), vp = job.valHist.map((p) => x(p[0]).toFixed(1) + ',' + y(p[1]).toFixed(1));
    let g = '<defs><linearGradient id="lossFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity=".32"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>';
    for (let v = 0; v <= ymax; v += 1) g += '<line class="grid" x1="' + pl + '" x2="' + (w - pr) + '" y1="' + y(v) + '" y2="' + y(v) + '"/><text class="ax" x="' + (pl - 8) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + v + '</text>';
    for (let i = 0; i <= job.total; i += job.total / 4) g += '<text class="ax" x="' + x(i) + '" y="' + (h - pb + 18) + '" text-anchor="middle">' + fmt(i) + '</text>';
    g += '<text class="ax lbl" x="' + (pl + iw / 2) + '" y="' + (h - 4) + '" text-anchor="middle">training rounds (32 snippets each)</text><text class="ax lbl" transform="rotate(-90)" x="' + -(pt + ih / 2) + '" y="13" text-anchor="middle">loss (lower = better guesses)</text>';
    if (tp.length > 1) g += '<path class="area" d="M' + tp[0] + ' L' + tp.join(' L') + ' L' + x(job.trainHist[job.trainHist.length - 1][0]).toFixed(1) + ',' + (pt + ih) + ' L' + pl + ',' + (pt + ih) + 'Z" fill="url(#lossFill)"/>';
    g += '<polyline class="ln train" points="' + tp.join(' ') + '"/><polyline class="ln val" points="' + vp.join(' ') + '"/>';
    job.valHist.forEach((p) => { g += '<circle class="dot val" cx="' + x(p[0]).toFixed(1) + '" cy="' + y(p[1]).toFixed(1) + '" r="3"/>'; });
    const last = job.trainHist[job.trainHist.length - 1];
    if (last) g += '<circle class="dot head' + (job.running ? ' live' : '') + '" cx="' + x(last[0]).toFixed(1) + '" cy="' + y(last[1]).toFixed(1) + '" r="5"/>';
    g += '<g class="legend" transform="translate(' + (w - pr - 190) + ',' + (pt + 6) + ')"><rect width="190" height="40" rx="8"/><line class="ln train" x1="10" x2="30" y1="14" y2="14"/><text x="36" y="18">training loss (smoothed)</text><line class="ln val" x1="10" x2="30" y1="30" y2="30"/><text x="36" y="34">validation loss (unseen text)</text></g>';
    const tv = last ? last[1].toFixed(2) : '-', vv = job.valHist[job.valHist.length - 1][1].toFixed(2);
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" class="chart loss-chart" role="img" aria-label="Loss chart. Round ' + job.iter + ' of ' + job.total + '. Training loss ' + tv + ', validation loss ' + vv + '. Started at ' + job.valHist[0][1].toFixed(2) + '.">' + g + '</svg>';
  }
  window.WUTIL.lossChart = lossChart;

  function engineLine(job) {
    const a = job.arch || {};
    const arch = (a.kind === 'transformer')
      ? ('tiny transformer: ' + (a.L || 1) + ' block, ' + (a.H || 2) + ' attention heads, context ' + (a.CTX || 12) + ' chars')
      : 'tiny neural net';
    if (job.done) return '<span class="dot-ok" aria-hidden="true"></span> <strong>Real mini-transformer ready:</strong> ' + fmt(job.params) + ' parameters (' + arch + '), trained for ' + fmt(job.total) + ' rounds on ' + fmt(job.chars) + ' characters of fictional office email, in ' + job.elapsed.toFixed(1) + ' s on your device.';
    const p = Math.round(job.iter / job.total * 100);
    return '<span class="spin" aria-hidden="true"></span> <strong>Training a tiny transformer with attention:</strong> ' + p + '% <span class="mini-prog" aria-hidden="true"><span style="width:' + p + '%"></span></span> <small>~10\u201320 s on a laptop; predictions below improve live</small>';
  }
  function attnHeat(model, text) {
    if (!model || !model.lastAttn || !model.lastAttn.length) return '';
    const a = Array.from(model.lastAttn);
    const ctx = text.slice(-a.length);
    const chars = Array.from(ctx.padStart(a.length, '\u00b7'));
    const mx = Math.max(0.001, ...a);
    return '<div class="attn-live" role="img" aria-label="Real attention from the latest position over the last ' + a.length + ' characters">' +
      '<div class="attn-h">Real attention (last position \u2192 earlier chars)</div>' +
      '<div class="attn-row">' + a.map((w, i) => {
        const ch = chars[i] === ' ' ? '\u2423' : (chars[i] === '\n' ? '\u23ce' : chars[i]);
        return '<span class="ac" style="--w:' + (w / mx).toFixed(3) + '" title="' + (w * 100).toFixed(1) + '%"><i></i><b>' + esc(ch) + '</b></span>';
      }).join('') + '</div>' +
      '<p class="note">These weights come from the transformer you just trained \u2014 not a drawing. Brighter = more attention.</p></div>';
  }

  /* ---------------- Step 1: The Autocomplete Engine (real) ---------------- */
  W[1] = function (el, api) {
    const M = L(); const job = M.getJob(['clean']); const words = M.corpusWords(); const vocab = M.sharedVocab();
    const starters = ['Our travel policy says', 'Please find attached the', 'The invoice is overdue', 'Our company\u2019s founder was born in', 'Kind regards'];
    el.innerHTML = '<p class="engine" id="w1eng" role="status" aria-live="polite"></p>' +
      '<div class="field"><label for="w1start">Sentence starter (pick one, or type anything in the box below)</label><select class="input" id="w1start">' + starters.map((s) => '<option>' + esc(s) + '</option>').join('') + '</select></div>' +
      '<div class="field"><label for="w1text">The text so far (type whatever you like)</label><textarea class="input" id="w1text" rows="2" spellcheck="false"></textarea></div>' +
      '<div class="row"><button class="btn primary" id="w1pred">Predict next token</button><button class="btn" id="w1gen">Write 40 more</button><button class="btn" id="w1fin">Finish the sentence</button><button class="btn danger" id="w1false">That\u2019s not true!</button><button class="btn ghost small" id="w1reset">Reset text</button></div>' +
      '<div class="field"><label for="w1temp">Temperature: <span id="w1tv">0.5</span> <small>(0 = always the top pick, 1.5 = adventurous)</small></label><input type="range" id="w1temp" min="0" max="1.5" step="0.1" value="0.5"></div>' +
      '<div id="w1unk" class="unk" aria-live="polite"></div>' +
      '<div id="w1attn" class="attn-wrap"></div>' +
      '<div class="col2"><div class="panel"><h4>Next token: top 5 <small>(this engine\u2019s tokens are single characters)</small></h4><div class="bars" id="w1chars"></div></div>' +
      '<div class="panel"><h4>Next whole word: top 5 <small>(spelled out by the model, letter by letter)</small></h4><div class="bars" id="w1words"></div></div></div>' +
      '<div class="panel"><h4>Model output ' + api.conf() + '</h4><p id="w1out" class="out" style="display:block;min-height:3em"></p><p class="status" id="w1msg" role="status"></p></div>' +
      '<details class="mini"><summary>How a big LLM would split this into tokens ' + api.illus('Simulated tokenizer') + '</summary><div id="w1tok"></div><p class="note">Big models use chunks of words (\u201csub-word tokens\u201d) with ID numbers, roughly 100,000 of them. This mini engine uses single characters: ' + vocab.size + ' tokens in total. Same idea, smaller alphabet.</p></details>';
    const st = $('#w1start', el), tx = $('#w1text', el), temp = $('#w1temp', el);
    let gen = 0, base = st.value, busy = false, wTimer = 0;
    const r = M.rng(Date.now() % 100000);
    const unknownNote = (text) => {
      const enc = M.encode(vocab, text);
      const unkW = Array.from(new Set((text.toLowerCase().replace(/[\u2019]/g, "'").match(/[a-z']+/g) || []).filter((w) => w.replace(/'/g, '').length > 2 && !words.has(w) && !words.has(w.replace(/'s$/, ''))))).slice(0, 3);
      let h = '';
      if (enc.unknown.length) h += '<p>\ud83d\udd23 I don\u2019t have keys for <strong>' + esc(enc.unknown.slice(0, 6).join(' ')) + '</strong>. My whole alphabet is ' + vocab.size + ' characters, so I swapped ' + (enc.unknown.length > 1 ? 'them' : 'it') + ' for a space and carried on, unbothered.</p>';
      if (unkW.length) h += '<p>\ud83e\udd37 <strong>' + unkW.map((w) => '\u201c' + esc(w) + '\u201d').join(', ') + '</strong> never appeared in my ' + fmt(job.chars) + ' characters of office email. I\u2019m guessing from spelling alone, like reading a menu in a language you don\u2019t speak. Fluency may vary; confidence will not.</p>';
      $('#w1unk', el).innerHTML = h;
    };
    const refresh = () => {
      const T = +temp.value; $('#w1tv', el).textContent = T.toFixed(1);
      const text = tx.value;
      const p = M.nextDist(job.model, text, Math.max(T, 0.05));
      const top = p.map((pi, i) => ({ label: showCh(vocab.chars[i]), p: pi })).sort((a, b) => b.p - a.p).slice(0, 5);
      $('#w1chars', el).innerHTML = bars(top);
      $('#w1out', el).textContent = text;
      $('#w1tok', el).innerHTML = window.WUTIL.tokenChunks(text || ' ');
      $('#w1attn', el).innerHTML = attnHeat(job.model, text);
      unknownNote(text);
      clearTimeout(wTimer); wTimer = setTimeout(() => { const nw = M.nextWords(job.model, tx.value, 5); $('#w1words', el).innerHTML = nw.length ? bars(nw.map((x) => ({ label: x.w, p: x.p }))) : '<p class="note">No confident word yet.</p>'; }, 60);
    };
    const one = () => { const p = M.nextDist(job.model, tx.value, +temp.value); const ch = vocab.chars[M.sampleFrom(p, r)]; tx.value += ch === '\n' ? ' ' : ch; gen++; };
    const run = async (n, stop) => { if (busy) return; busy = true; for (let i = 0; i < n; i++) { one(); if (i % 2 === 0) { refresh(); await wait(22); } if (stop && /[.!?]$/.test(tx.value) && i > 3) break; } refresh(); busy = false; };
    const reset = () => { base = st.value; tx.value = base; gen = 0; $('#w1msg', el).textContent = ''; refresh(); };
    st.onchange = reset; tx.oninput = () => { base = tx.value; gen = 0; refresh(); };
    temp.oninput = refresh;
    $('#w1pred', el).onclick = () => { one(); refresh(); };
    $('#w1gen', el).onclick = () => run(40);
    $('#w1fin', el).onclick = () => run(140, true);
    $('#w1reset', el).onclick = reset;
    $('#w1false', el).onclick = () => {
      const m = $('#w1msg', el);
      if (gen < 12) { m.textContent = 'Let it write a bit first (try \u201cWrite 40 more\u201d). It hasn\u2019t had a chance to be wrong yet, and it\u2019s very talented at that.'; return; }
      const tail = base.trim().split(/\s+/).slice(-3).join(' ');
      m.innerHTML = '\u2705 Correct. ' + (/founder/i.test(base) ? 'Its training emails never mention our founder. ' : '') + 'It has no idea whether that\u2019s true: it picked letters that often follow \u201c' + esc(tail) + '\u201d in ' + fmt(job.chars) + ' characters of office email. Fluent \u2260 true.';
      api.done('Fluent, confident and made up: that\u2019s next-token prediction without a source.');
    };
    const unsub = job.on(() => { if (!el.isConnected) { unsub(); return; } $('#w1eng', el).innerHTML = engineLine(job); if (job.iter % 200 < 40 || job.done) refresh(); });
    $('#w1eng', el).innerHTML = engineLine(job);
    reset();
    job.start();
  };

  /* ---------------- Step 2: Fuel: Training Data (real training) ---------------- */
  W[2] = function (el, api) {
    const M = L(); const C = window.GPT_CORPUS;
    const bowls = [['clean', '\ud83e\uddfe', 'Clean policy emails'], ['rants', '\ud83c\udf36\ufe0f', 'Angry customer rants'], ['old', '\ud83d\udce0', 'Outdated 2015 travel policy']];
    const diet = new Set(api.state.diet || ['clean']);
    el.innerHTML = '<p>Pick the fuel, then press <strong>Train</strong>. A real tiny transformer (with causal self-attention) starts from random numbers and learns from scratch, right here, in about 10\u201320 seconds. Then it completes <em>\u201c' + esc(M.PROMPT) + '\u2026\u201d</em></p>' +
      '<div class="lbl" id="w2bl">Fuel tanks (training data)</div><div class="row bowls" role="group" aria-labelledby="w2bl">' + bowls.map((b) => '<button class="btn bowl" aria-pressed="false" data-t="' + b[0] + '"><span aria-hidden="true">' + b[1] + '</span> ' + b[2] + ' <small>' + fmt(C[b[0]].length) + ' chars</small></button>').join('') + '</div>' +
      '<div class="row"><button class="btn primary" id="w2train">\u25b6 Train</button><button class="btn" id="w2pause" disabled>\u23f8 Pause</button><button class="btn ghost" id="w2reset">\u21ba Reset weights</button><span class="status" id="w2stat" role="status"></span></div>' +
      '<div class="stats" id="w2stats" aria-live="off"></div>' +
      '<div class="panel chart-panel"><h4>Live loss curve <small>(how wrong its guesses are; real numbers)</small></h4><div id="w2chart"></div></div>' +
      '<div class="col2"><div class="panel"><h4>Live sample</h4><div class="field"><label for="w2temp">Temperature: <span id="w2tv">0.6</span></label><input type="range" id="w2temp" min="0.1" max="1.5" step="0.1" value="0.6"></div><p class="out" id="w2out" style="display:block;min-height:4.5em"></p><div id="w2attn" class="attn-wrap"></div><p class="note" id="w2meter"></p></div>' +
      '<div class="panel"><h4>Progress log: gibberish to words</h4><ol class="timeline" id="w2log"></ol></div></div>' +
      '<p class="note" id="w2note" aria-live="polite"></p>';
    let job = null, unsub = null, ticks = 0;
    const r = M.rng(11);
    const key = () => ['clean', 'old', 'rants'].filter((k) => diet.has(k));
    const meter = (text) => { const letters = text.replace(/[^A-Za-z]/g, ''); const caps = letters.replace(/[^A-Z]/g, '').length; return { caps: letters.length ? caps / letters.length : 0, bangs: (text.match(/!/g) || []).length, fax: /fax/i.test(text) }; };
    const sample = () => { if (!job) return; const T = +$('#w2temp', el).value; $('#w2tv', el).textContent = T.toFixed(1); const s = M.PROMPT + M.generate(job.model, M.PROMPT, 90, T, r); $('#w2out', el).textContent = s; $('#w2attn', el).innerHTML = attnHeat(job.model, s); };
    const drawStats = () => {
      const tv = job.trainHist[job.trainHist.length - 1][1], vv = job.valHist[job.valHist.length - 1][1];
      $('#w2stats', el).innerHTML = '<span><b>' + fmt(job.iter) + '</b> / ' + fmt(job.total) + ' rounds</span><span>training loss <b>' + tv.toFixed(2) + '</b></span><span>validation loss <b>' + vv.toFixed(2) + '</b></span><span><b>' + fmt(job.params) + '</b> parameters</span><span><b>' + fmt(job.chars) + '</b> chars of fuel</span><span><b>' + job.elapsed.toFixed(1) + '</b> s</span>';
      $('#w2chart', el).innerHTML = lossChart(job);
      $('#w2log', el).innerHTML = job.samples.map((s) => '<li><span class="it">round ' + fmt(s.iter) + '</span><span class="tx">' + esc(M.PROMPT) + '<mark>' + esc(s.text) + '</mark></span></li>').join('');
      $('#w2train', el).disabled = job.running || job.done; $('#w2pause', el).disabled = !job.running;
      $('#w2train', el).textContent = job.iter > 0 && !job.done ? '\u25b6 Resume' : '\u25b6 Train';
    };
    const finished = () => {
      const k = key().join('+');
      const vh = job.valHist.map((p) => p[1]), minV = Math.min(...vh), last = vh[vh.length - 1];
      let samp = ''; for (let i = 0; i < 4; i++) samp += M.generate(job.model, M.PROMPT, 90, 0.8, r) + ' ';
      const m = meter(samp);
      $('#w2meter', el).innerHTML = '\ud83d\udce3 Shout-o-meter: <b>' + Math.round(m.caps * 100) + '%</b> capital letters, <b>' + m.bangs + '</b> exclamation marks' + (m.fax ? ', and it mentioned <b>fax</b>' : '') + ' (measured on 4 fresh samples).';
      let msg = 'Loss fell from ' + job.valHist[0][1].toFixed(2) + ' to ' + last.toFixed(2) + '. This is a real (tiny) transformer with causal self-attention \u2014 the same family of architecture as GPT, just millions of times smaller. Nobody taught it spelling, spaces or \u201cKind regards\u201d: it picked them up from the fuel, and the attention heatmap above shows which earlier characters it is actually looking at. ';
      if (last > minV + 0.03) msg += 'Spot the validation line creeping back up at the end? That\u2019s memorising, not learning. Real teams stop training there. ';
      if (diet.has('rants')) msg += 'Rants were ' + Math.round(C.rants.length / job.chars * 100) + '% of the fuel. Look for CAPITALS and !!! leaking into the samples: it didn\u2019t learn that shouting is bad, it learned what the data looks like. ';
      if (diet.has('old')) msg += 'The 2015 policy (with its fax machine) went in too, so expect fax-era phrases. It can\u2019t tell old from new; it only sees text. ';
      if (!diet.has('clean')) msg += 'With so little fuel, it mostly memorised the few lines it saw. ';
      msg += 'Low loss means it learned the data well, not that the data was good.';
      $('#w2note', el).textContent = msg;
      if (diet.has('rants') || diet.has('old')) { api.state.broke = true; api.save(); $('#w2stat', el).textContent = 'Broken on purpose! Now fix it: select only the clean tank, reset and retrain.'; }
      else if (k === 'clean' && api.state.broke) { $('#w2stat', el).textContent = 'Clean fuel, clean output.'; api.done('You fouled the model with bad data, then fixed it by fixing the data. No prompt could have done that.'); }
      else $('#w2stat', el).textContent = 'Training done. Now try mixing in the rants or the 2015 policy.';
    };
    const attach = (fresh) => {
      if (unsub) unsub(); if (job && job.running && fresh !== 'keep') job.pause();
      job = M.getJob(key(), fresh === true);
      let wasDone = job.done;
      unsub = job.on(() => { if (!el.isConnected) { unsub(); return; } ticks++; drawStats(); if (ticks % 6 === 0 || !job.running) sample(); if (job.done && !wasDone) { wasDone = true; finished(); } });
      drawStats(); sample(); $('#w2note', el).textContent = ''; $('#w2meter', el).textContent = '';
      if (job.done) { finished(); if (!(key().join('+') === 'clean' && api.state.broke)) $('#w2stat', el).textContent = 'This fuel mix is already trained (weights kept). Press Reset to train again from scratch.'; }
    };
    const drawBowls = () => $$('[data-t]', el).forEach((b) => b.setAttribute('aria-pressed', String(diet.has(b.dataset.t))));
    $$('[data-t]', el).forEach((b) => b.onclick = () => {
      diet.has(b.dataset.t) ? diet.delete(b.dataset.t) : diet.add(b.dataset.t);
      api.state.diet = key(); api.save(); drawBowls();
      if (!diet.size) { $('#w2stat', el).textContent = 'No fuel, no learning. Pick at least one tank.'; return; }
      attach(); $('#w2stat', el).textContent = 'New fuel mix, new model: it starts from random weights.';
    });
    $('#w2train', el).onclick = () => { if (!diet.size) { $('#w2stat', el).textContent = 'No fuel, no learning. Pick at least one tank.'; return; } $('#w2stat', el).textContent = api.loading(); job.start(); };
    $('#w2pause', el).onclick = () => { job.pause(); $('#w2stat', el).textContent = 'Paused at round ' + fmt(job.iter) + '. Same weights, frozen mid-thought.'; };
    $('#w2reset', el).onclick = () => { if (!diet.size) return; attach(true); $('#w2stat', el).textContent = 'Weights reset to random numbers. Back to gibberish.'; };
    $('#w2temp', el).oninput = sample;
    drawBowls(); if (diet.size) attach('keep');
  };
})();
