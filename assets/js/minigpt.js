/* MiniGPT engine: a genuinely trained, tiny character-level neural language model in plain JS.
   Architecture (Bengio et al. 2003 style MLP):
     last CTX characters -> embedding vectors (EMB numbers each) -> concatenated
     -> hidden layer (HID tanh units) -> scores for every character -> softmax probabilities.
   Trained with backpropagation + Adam on the bundled fictional corpus. No libraries, no network. */
(function (root) {
  'use strict';
  const CTX = +(root.__BLM_CTX || 8), EMB = +(root.__BLM_EMB || 10), HID = +(root.__BLM_HID || 64), PAD = '\n';

  function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function gauss(r) { let u = 0, v = 0; while (u === 0) u = r(); v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

  function Vocab(text) {
    const chars = Array.from(new Set((PAD + text).split(''))).sort();
    const idx = {}; chars.forEach((c, i) => { idx[c] = i; });
    return { chars, idx, size: chars.length };
  }

  /* Map arbitrary user text onto the model's alphabet. Returns { ids, unknown:[chars] } */
  function encode(vocab, text) {
    const ids = [], unknown = [];
    for (const ch0 of Array.from(text)) {
      let ch = ch0;
      if (ch === '\u2019' || ch === '\u2018') ch = "'";
      if (vocab.idx[ch] == null && vocab.idx[ch.toLowerCase()] != null) ch = ch.toLowerCase();
      if (vocab.idx[ch] == null && vocab.idx[ch.toUpperCase()] != null) ch = ch.toUpperCase();
      if (vocab.idx[ch] == null) { if (!/\s/.test(ch0)) unknown.push(ch0); ch = /\s/.test(ch0) ? ' ' : ' '; }
      ids.push(vocab.idx[ch]);
    }
    return { ids, unknown: Array.from(new Set(unknown)) };
  }

  function Model(vocab, seed) {
    const V = vocab.size, IN = CTX * EMB, r = rng(seed || 7);
    const P = {
      E: new Float32Array(V * EMB), W1: new Float32Array(IN * HID), b1: new Float32Array(HID),
      W2: new Float32Array(HID * V), b2: new Float32Array(V)
    };
    for (let i = 0; i < P.E.length; i++) P.E[i] = gauss(r) * 0.6;
    for (let i = 0; i < P.W1.length; i++) P.W1[i] = gauss(r) / Math.sqrt(IN);
    for (let i = 0; i < P.W2.length; i++) P.W2[i] = gauss(r) * 0.05;
    const G = {}, M = {}, S2 = {};
    for (const k in P) { G[k] = new Float32Array(P[k].length); M[k] = new Float32Array(P[k].length); S2[k] = new Float32Array(P[k].length); }
    const x = new Float32Array(IN), h = new Float32Array(HID), logits = new Float32Array(V), p = new Float32Array(V), dh = new Float32Array(HID), dx = new Float32Array(IN);
    let t = 0;
    const nParams = Object.values(P).reduce((a, b) => a + b.length, 0);

    function forward(ctx) { // ctx: array of CTX ids
      for (let c = 0; c < CTX; c++) { const e = ctx[c] * EMB, o = c * EMB; for (let d = 0; d < EMB; d++) x[o + d] = P.E[e + d]; }
      for (let j = 0; j < HID; j++) h[j] = P.b1[j];
      for (let i = 0; i < IN; i++) { const xi = x[i]; if (xi === 0) continue; const row = i * HID; for (let j = 0; j < HID; j++) h[j] += xi * P.W1[row + j]; }
      for (let j = 0; j < HID; j++) h[j] = Math.tanh(h[j]);
      for (let k = 0; k < V; k++) logits[k] = P.b2[k];
      for (let j = 0; j < HID; j++) { const hj = h[j], row = j * V; for (let k = 0; k < V; k++) logits[k] += hj * P.W2[row + k]; }
      return logits;
    }
    function softmax(T) {
      let mx = -Infinity; for (let k = 0; k < V; k++) if (logits[k] > mx) mx = logits[k];
      let s = 0; for (let k = 0; k < V; k++) { p[k] = Math.exp((logits[k] - mx) / T); s += p[k]; }
      for (let k = 0; k < V; k++) p[k] /= s; return p;
    }
    function backward(ctx, target) { // assumes forward+softmax(1) just ran; accumulates grads
      p[target] -= 1;
      for (let k = 0; k < V; k++) G.b2[k] += p[k];
      for (let j = 0; j < HID; j++) { const hj = h[j], row = j * V; let s = 0; for (let k = 0; k < V; k++) { G.W2[row + k] += hj * p[k]; s += P.W2[row + k] * p[k]; } dh[j] = s * (1 - hj * hj); }
      for (let j = 0; j < HID; j++) G.b1[j] += dh[j];
      for (let i = 0; i < IN; i++) { const xi = x[i], row = i * HID; let s = 0; for (let j = 0; j < HID; j++) { G.W1[row + j] += xi * dh[j]; s += P.W1[row + j] * dh[j]; } dx[i] = s; }
      for (let c = 0; c < CTX; c++) { const e = ctx[c] * EMB, o = c * EMB; for (let d = 0; d < EMB; d++) G.E[e + d] += dx[o + d]; }
    }
    function adam(lr, n) {
      t++; const b1 = 0.9, b2 = 0.999, eps = 1e-8, c1 = 1 - Math.pow(b1, t), c2 = 1 - Math.pow(b2, t);
      for (const k in P) { const w = P[k], g = G[k], m = M[k], v = S2[k]; for (let i = 0; i < w.length; i++) { const gi = g[i] / n; m[i] = b1 * m[i] + (1 - b1) * gi; v[i] = b2 * v[i] + (1 - b2) * gi * gi; w[i] -= lr * (m[i] / c1) / (Math.sqrt(v[i] / c2) + eps); g[i] = 0; } }
    }
    return { vocab, P, forward, softmax, backward, adam, nParams, get steps() { return t; } };
  }

  /* A trainer that runs in small time slices so the page stays responsive. */
  function Trainer(text, opts) {
    opts = opts || {};
    const vocab = opts.vocab || Vocab(text);
    const ids = encode(vocab, text).ids;
    const N = ids.length; const r = rng(opts.seed || 42);
    const ctxAt = (i) => { const c = new Array(CTX); for (let k = 0; k < CTX; k++) { const j = i - CTX + k; c[k] = j < 0 ? vocab.idx[PAD] : ids[j]; } return c; };
    // hold out every 10th line-ish chunk for validation
    const pos = [], val = [];
    for (let i = 0; i < N; i++) ((Math.floor(i / 97) % 10) === 3 ? val : pos).push(i);
    const valSample = val.filter((_, i) => i % Math.max(1, Math.floor(val.length / 400)) === 0);
    const model = opts.model || Model(vocab, opts.seed || 7);
    const BATCH = opts.batch || 32;
    let iter = 0;
    function lossOn(list) { let L = 0; for (const i of list) { model.forward(ctxAt(i)); const p = model.softmax(1); L -= Math.log(Math.max(p[ids[i]], 1e-9)); } return L / list.length; }
    function step() {
      let L = 0;
      for (let b = 0; b < BATCH; b++) { const i = pos[Math.floor(r() * pos.length)]; const c = ctxAt(i); model.forward(c); const p = model.softmax(1); L -= Math.log(Math.max(p[ids[i]], 1e-9)); model.backward(c, ids[i]); }
      const lr = (opts.lr || 0.01) * (iter < 100 ? 1 : Math.max(0.3, 1 - iter / (opts.total || 1500) * 0.7));
      model.adam(lr, BATCH); iter++;
      return L / BATCH;
    }
    return { model, vocab, step, valLoss: () => lossOn(valSample), trainLossSample: () => lossOn(pos.filter((_, i) => i % Math.max(1, Math.floor(pos.length / 400)) === 0)), get iter() { return iter; }, chars: N };
  }

  /* Next-character distribution for a context string at temperature T. */
  function nextDist(model, text, T) {
    const v = model.vocab; const enc = encode(v, text).ids;
    const ctx = []; for (let k = 0; k < CTX; k++) { const j = enc.length - CTX + k; ctx.push(j < 0 ? v.idx[PAD] : enc[j]); }
    model.forward(ctx);
    if (T <= 0.01) { const p = Array.from(model.softmax(1)); const mx = p.indexOf(Math.max(...p)); return p.map((_, i) => (i === mx ? 1 : 0)); }
    return Array.from(model.softmax(T));
  }
  function sampleFrom(p, r) { const u = (r || Math.random)(); let a = 0; for (let i = 0; i < p.length; i++) { a += p[i]; if (u <= a) return i; } return p.length - 1; }
  function generate(model, prompt, n, T, r, stopAt) {
    let out = '';
    for (let i = 0; i < n; i++) { const p = nextDist(model, prompt + out, T); const ch = model.vocab.chars[sampleFrom(p, r)]; if (ch === PAD) { if (stopAt) break; out += ' '; continue; } out += ch; if (stopAt && stopAt.test(ch) && out.length > 8) break; }
    return out;
  }
  /* Most likely next WORDS: beam search over characters until a space/punctuation. */
  function nextWords(model, text, k) {
    const v = model.vocab; const endRe = /[\s.,!?:\n]/;
    if (/[A-Za-z0-9']$/.test(text)) text += ' ';   // treat the last word as finished
    let beams = [{ s: '', p: 1 }]; const done = [];
    const partial = '';
    for (let depth = 0; depth < 14 && beams.length; depth++) {
      const next = [];
      for (const b of beams) {
        const p = nextDist(model, text + b.s, 1);
        p.forEach((pi, i) => { if (pi < 0.002) return; const ch = v.chars[i]; const np = b.p * pi; if (endRe.test(ch)) { if (b.s.length || partial) done.push({ w: partial + b.s, end: ch, p: np }); else next.push({ s: ch === ' ' || ch === PAD ? '' : ch, p: np, punct: ch }); } else next.push({ s: b.s + ch, p: np }); });
      }
      // a leading space just means "a new word starts": strip and keep going
      beams = next.filter((b) => !b.punct || b.punct === ' ').sort((a, b) => b.p - a.p).slice(0, 10);
      next.filter((b) => b.punct && b.punct !== ' ' && b.punct !== PAD).forEach((b) => done.push({ w: b.punct, end: '', p: b.p }));
    }
    const merged = {}; done.forEach((d) => { merged[d.w] = (merged[d.w] || 0) + d.p; });
    return Object.entries(merged).sort((a, b) => b[1] - a[1]).slice(0, k || 5).map(([w, p]) => ({ w, p }));
  }

  /* ---------- Browser helpers: shared vocabulary, time-sliced training jobs, cache ---------- */
  const PROMPT = 'Our travel policy says';
  const MILESTONES = [0, 60, 200, 500, 1000, 1500, 2000];
  let VOCAB = null;
  function corpus() { return (root.GPT_CORPUS || {}); }
  function sharedVocab() { if (!VOCAB) VOCAB = Vocab(Object.values(corpus()).join('') + "0123456789'-"); return VOCAB; }
  function corpusWords() { const set = new Set(); (corpus().clean || '').toLowerCase().replace(/[^a-z' ]+/g, ' ').split(/\s+/).forEach((w) => w && set.add(w)); return set; }
  const jobs = {};
  /* diet: array of corpus keys, e.g. ['clean'] or ['clean','rants'] */
  function Job(diet, opts) {
    opts = opts || {};
    const total = opts.total || 2000, key = diet.slice().sort().join('+');
    const text = diet.map((k) => corpus()[k]).join('\n');
    const tr = Trainer(text, { vocab: sharedVocab(), total, seed: opts.seed || 42 });
    const sr = rng(7);
    const job = { key, diet: diet.slice(), total, tr, model: tr.model, iter: 0, running: false, done: false, ema: null, trainHist: [], valHist: [], samples: [], startedAt: 0, elapsed: 0, listeners: new Set(), chars: tr.chars, params: tr.model.nParams };
    const v0 = tr.valLoss(); job.trainHist.push([0, v0]); job.valHist.push([0, v0]);
    job.samples.push({ iter: 0, text: generate(tr.model, PROMPT, 56, 0.6, sr) });
    const emit = () => job.listeners.forEach((f) => { try { f(job); } catch (e) { console.error(e); } });
    function slice() {
      if (!job.running) return;
      const t0 = (root.performance || Date).now();
      while (job.iter < total && (root.performance || Date).now() - t0 < 16) {
        const l = tr.step(); job.iter++;
        job.ema = job.ema == null ? l : job.ema * 0.96 + l * 0.04;
        if (job.iter % 25 === 0) job.trainHist.push([job.iter, job.ema]);
        if (job.iter % 100 === 0) job.valHist.push([job.iter, tr.valLoss()]);
        if (MILESTONES.includes(job.iter)) job.samples.push({ iter: job.iter, text: generate(tr.model, PROMPT, 56, 0.6, sr) });
      }
      job.elapsed += ((root.performance || Date).now() - t0) / 1000;
      if (job.iter >= total) { job.running = false; job.done = true; if (job.valHist[job.valHist.length - 1][0] !== total) job.valHist.push([total, tr.valLoss()]); }
      emit();
      if (job.running) setTimeout(slice, 0);
    }
    job.start = () => { if (job.done || job.running) return; job.running = true; emit(); setTimeout(slice, 0); };
    job.pause = () => { job.running = false; emit(); };
    job.on = (f) => { job.listeners.add(f); return () => job.listeners.delete(f); };
    return job;
  }
  /* Get (or create) the job for a diet. fresh=true discards the old weights. */
  function getJob(diet, fresh) { const key = diet.slice().sort().join('+'); if (fresh || !jobs[key]) { if (jobs[key]) jobs[key].pause(); jobs[key] = Job(diet); } return jobs[key]; }

  const api = { CTX, EMB, HID, PROMPT, Vocab, encode, Model, Trainer, nextDist, generate, nextWords, rng, sampleFrom, sharedVocab, corpusWords, Job, getJob, jobs };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.MiniLM = api;
})(typeof window !== 'undefined' ? window : globalThis);
