/* MiniLM: a tiny character-level TRANSFORMER trained live in the browser.
   Architecture (1 block):
     tokens → embedding + positional embedding
     → LayerNorm → causal multi-head self-attention → residual
     → LayerNorm → feed-forward (ReLU) → residual
     → LayerNorm → vocab scores → softmax
   Trained with backpropagation + Adam on the bundled fictional corpus.
   No libraries, no network. Smaller than a real GPT by many millions of times,
   but it has the same kind of attention Step 4 walks through. */
(function (root) {
  'use strict';
  const CTX = +(root.__BLM_CTX || 18);
  const D = +(root.__BLM_D || 32);
  const H = +(root.__BLM_H || 2);
  const L = +(root.__BLM_L || 1);
  const FF = +(root.__BLM_FF || 96);
  const DH = D / H;
  const PAD = '\n';
  if (D % H !== 0) throw new Error('d_model must divide n_heads');

  function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function gauss(r) { let u = 0, v = 0; while (u === 0) u = r(); v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

  function Vocab(text) {
    const chars = Array.from(new Set((PAD + text).split(''))).sort();
    const idx = {}; chars.forEach((c, i) => { idx[c] = i; });
    return { chars, idx, size: chars.length };
  }

  function encode(vocab, text) {
    const ids = [], unknown = [];
    for (const ch0 of Array.from(text)) {
      let ch = ch0;
      if (ch === '\u2019' || ch === '\u2018') ch = "'";
      if (vocab.idx[ch] == null && vocab.idx[ch.toLowerCase()] != null) ch = ch.toLowerCase();
      if (vocab.idx[ch] == null && vocab.idx[ch.toUpperCase()] != null) ch = ch.toUpperCase();
      if (vocab.idx[ch] == null) { if (!/\s/.test(ch0)) unknown.push(ch0); ch = ' '; }
      ids.push(vocab.idx[ch]);
    }
    return { ids, unknown: Array.from(new Set(unknown)) };
  }

  function layerNorm(x, g, b, T) {
    const y = new Float32Array(T * D), mean = new Float32Array(T), rstd = new Float32Array(T);
    for (let t = 0; t < T; t++) {
      let m = 0; for (let d = 0; d < D; d++) m += x[t * D + d]; m /= D; mean[t] = m;
      let v = 0; for (let d = 0; d < D; d++) { const z = x[t * D + d] - m; v += z * z; }
      const rs = 1 / Math.sqrt(v / D + 1e-5); rstd[t] = rs;
      for (let d = 0; d < D; d++) y[t * D + d] = (x[t * D + d] - m) * rs * g[d] + b[d];
    }
    return { y, mean, rstd };
  }
  function dLayerNorm(dy, x, g, mean, rstd, dg, db, T) {
    const dx = new Float32Array(T * D);
    for (let t = 0; t < T; t++) {
      const rs = rstd[t], m = mean[t];
      const dnorm = new Float32Array(D);
      let dMean = 0, dMeanDot = 0;
      for (let d = 0; d < D; d++) {
        const n = (x[t * D + d] - m) * rs;
        dg[d] += dy[t * D + d] * n; db[d] += dy[t * D + d];
        dnorm[d] = dy[t * D + d] * g[d]; dMean += dnorm[d]; dMeanDot += dnorm[d] * n;
      }
      dMean /= D; dMeanDot /= D;
      for (let d = 0; d < D; d++) {
        const n = (x[t * D + d] - m) * rs;
        dx[t * D + d] = rs * (dnorm[d] - dMean - n * dMeanDot);
      }
    }
    return dx;
  }

  function Model(vocab, seed) {
    const V = vocab.size, r = rng(seed || 7);
    const P = {
      E: new Float32Array(V * D), Pos: new Float32Array(CTX * D),
      Wq: [], Wk: [], Wv: [], Wo: [], W1: [], b1: [], W2: [], b2: [],
      ln1g: [], ln1b: [], ln2g: [], ln2b: [],
      LNg: new Float32Array(D).fill(1), LNb: new Float32Array(D),
      Wh: new Float32Array(D * V), bh: new Float32Array(V)
    };
    for (let i = 0; i < P.E.length; i++) P.E[i] = gauss(r) * 0.02;
    for (let i = 0; i < P.Pos.length; i++) P.Pos[i] = gauss(r) * 0.01;
    for (let l = 0; l < L; l++) {
      P.Wq[l] = new Float32Array(D * D); P.Wk[l] = new Float32Array(D * D);
      P.Wv[l] = new Float32Array(D * D); P.Wo[l] = new Float32Array(D * D);
      P.W1[l] = new Float32Array(D * FF); P.b1[l] = new Float32Array(FF);
      P.W2[l] = new Float32Array(FF * D); P.b2[l] = new Float32Array(D);
      P.ln1g[l] = new Float32Array(D).fill(1); P.ln1b[l] = new Float32Array(D);
      P.ln2g[l] = new Float32Array(D).fill(1); P.ln2b[l] = new Float32Array(D);
      for (const k of ['Wq', 'Wk', 'Wv', 'Wo']) for (let i = 0; i < D * D; i++) P[k][l][i] = gauss(r) / Math.sqrt(D);
      for (let i = 0; i < D * FF; i++) P.W1[l][i] = gauss(r) / Math.sqrt(D);
      for (let i = 0; i < FF * D; i++) P.W2[l][i] = gauss(r) / Math.sqrt(FF);
    }
    for (let i = 0; i < P.Wh.length; i++) P.Wh[i] = gauss(r) * 0.02;

    const flat = [];
    const add = (a) => { if (Array.isArray(a)) a.forEach(add); else flat.push(a); };
    add(Object.values(P));
    const G = flat.map((p) => new Float32Array(p.length));
    const M = flat.map((p) => new Float32Array(p.length));
    const S2 = flat.map((p) => new Float32Array(p.length));
    const ix = new Map(); flat.forEach((p, i) => ix.set(p, i));
    const gOf = (p) => G[ix.get(p)];
    let tAdam = 0;
    const nParams = flat.reduce((a, p) => a + p.length, 0);
    let lastAttn = new Float32Array(CTX); // avg over heads, from last position
    let lastAttnHeads = Array.from({ length: H }, () => new Float32Array(CTX));

    function matVecRows(W, x, out, bias) {
      // W is in×out stored as W[i*out + j]; x length in; out length out
    }

    /* Forward over a length-T token id array. Returns logits for every position (T*V).
       If wantAttn, fills lastAttn from the final position of the last layer. */
    function forwardAll(tok, wantAttn) {
      const T = tok.length;
      let x = new Float32Array(T * D);
      for (let t = 0; t < T; t++) {
        const e = tok[t] * D, p = Math.min(t, CTX - 1) * D;
        for (let d = 0; d < D; d++) x[t * D + d] = P.E[e + d] + P.Pos[p + d];
      }
      const cache = [];
      for (let l = 0; l < L; l++) {
        const ln1 = layerNorm(x, P.ln1g[l], P.ln1b[l], T);
        const Q = new Float32Array(T * D), K = new Float32Array(T * D), Vv = new Float32Array(T * D);
        for (let t = 0; t < T; t++) {
          for (let j = 0; j < D; j++) {
            let qs = 0, ks = 0, vs = 0;
            for (let i = 0; i < D; i++) {
              const xi = ln1.y[t * D + i];
              qs += xi * P.Wq[l][i * D + j]; ks += xi * P.Wk[l][i * D + j]; vs += xi * P.Wv[l][i * D + j];
            }
            Q[t * D + j] = qs; K[t * D + j] = ks; Vv[t * D + j] = vs;
          }
        }
        const att = new Float32Array(H * T * T);
        const yAtt = new Float32Array(T * D);
        const scale = 1 / Math.sqrt(DH);
        for (let h = 0; h < H; h++) {
          for (let t = 0; t < T; t++) {
            let mx = -1e9;
            for (let s = 0; s <= t; s++) {
              let dot = 0; for (let d = 0; d < DH; d++) dot += Q[t * D + h * DH + d] * K[s * D + h * DH + d];
              const sc = dot * scale; att[h * T * T + t * T + s] = sc; if (sc > mx) mx = sc;
            }
            let sum = 0;
            for (let s = 0; s <= t; s++) { const e = Math.exp(att[h * T * T + t * T + s] - mx); att[h * T * T + t * T + s] = e; sum += e; }
            for (let s = 0; s <= t; s++) att[h * T * T + t * T + s] /= sum;
            for (let d = 0; d < DH; d++) {
              let v = 0; for (let s = 0; s <= t; s++) v += att[h * T * T + t * T + s] * Vv[s * D + h * DH + d];
              yAtt[t * D + h * DH + d] = v;
            }
          }
        }
        if (wantAttn && l === L - 1) {
          const t = T - 1;
          lastAttn = new Float32Array(T);
          for (let h = 0; h < H; h++) {
            lastAttnHeads[h] = new Float32Array(T);
            for (let s = 0; s <= t; s++) {
              const a = att[h * T * T + t * T + s];
              lastAttnHeads[h][s] = a; lastAttn[s] += a / H;
            }
          }
        }
        const attnOut = new Float32Array(T * D);
        for (let t = 0; t < T; t++) for (let j = 0; j < D; j++) {
          let s = 0; for (let i = 0; i < D; i++) s += yAtt[t * D + i] * P.Wo[l][i * D + j];
          attnOut[t * D + j] = s;
        }
        const x1 = new Float32Array(T * D); for (let i = 0; i < x1.length; i++) x1[i] = x[i] + attnOut[i];
        const ln2 = layerNorm(x1, P.ln2g[l], P.ln2b[l], T);
        const hid = new Float32Array(T * FF);
        for (let t = 0; t < T; t++) for (let j = 0; j < FF; j++) {
          let s = P.b1[l][j]; for (let i = 0; i < D; i++) s += ln2.y[t * D + i] * P.W1[l][i * FF + j];
          hid[t * FF + j] = s > 0 ? s : 0;
        }
        const ffn = new Float32Array(T * D);
        for (let t = 0; t < T; t++) for (let j = 0; j < D; j++) {
          let s = P.b2[l][j]; for (let i = 0; i < FF; i++) s += hid[t * FF + i] * P.W2[l][i * D + j];
          ffn[t * D + j] = s;
        }
        const x2 = new Float32Array(T * D); for (let i = 0; i < x2.length; i++) x2[i] = x1[i] + ffn[i];
        cache.push({ x, ln1, Q, K, Vv, att, yAtt, attnOut, x1, ln2, hid, ffn, T });
        x = x2;
      }
      const lnF = layerNorm(x, P.LNg, P.LNb, T);
      const logits = new Float32Array(T * V);
      for (let t = 0; t < T; t++) for (let k = 0; k < V; k++) {
        let s = P.bh[k]; for (let d = 0; d < D; d++) s += lnF.y[t * D + d] * P.Wh[d * V + k];
        logits[t * V + k] = s;
      }
      return { logits, lnF, x, cache, T };
    }

    function lossAndBackward(tok, targets) {
      const T = tok.length, V = vocab.size;
      const fw = forwardAll(tok, false);
      const { logits, lnF, x, cache } = fw;
      let loss = 0;
      const dlogits = new Float32Array(T * V);
      for (let t = 0; t < T; t++) {
        let mx = -1e9; for (let k = 0; k < V; k++) if (logits[t * V + k] > mx) mx = logits[t * V + k];
        let sum = 0; const p = new Float32Array(V);
        for (let k = 0; k < V; k++) { p[k] = Math.exp(logits[t * V + k] - mx); sum += p[k]; }
        for (let k = 0; k < V; k++) p[k] /= sum;
        loss -= Math.log(Math.max(p[targets[t]], 1e-9));
        for (let k = 0; k < V; k++) dlogits[t * V + k] = p[k];
        dlogits[t * V + targets[t]] -= 1;
      }
      loss /= T;

      const gWh = gOf(P.Wh), gbh = gOf(P.bh), gLNg = gOf(P.LNg), gLNb = gOf(P.LNb);
      const dLnFy = new Float32Array(T * D);
      for (let t = 0; t < T; t++) for (let k = 0; k < V; k++) {
        const g = dlogits[t * V + k]; gbh[k] += g;
        for (let d = 0; d < D; d++) { gWh[d * V + k] += lnF.y[t * D + d] * g; dLnFy[t * D + d] += P.Wh[d * V + k] * g; }
      }
      let dx = dLayerNorm(dLnFy, x, P.LNg, lnF.mean, lnF.rstd, gLNg, gLNb, T);

      for (let l = L - 1; l >= 0; l--) {
        const c = cache[l];
        const gW1 = gOf(P.W1[l]), gb1 = gOf(P.b1[l]), gW2 = gOf(P.W2[l]), gb2 = gOf(P.b2[l]);
        const gWq = gOf(P.Wq[l]), gWk = gOf(P.Wk[l]), gWv = gOf(P.Wv[l]), gWo = gOf(P.Wo[l]);
        const gln1g = gOf(P.ln1g[l]), gln1b = gOf(P.ln1b[l]), gln2g = gOf(P.ln2g[l]), gln2b = gOf(P.ln2b[l]);

        const dffn = dx;
        const dx1 = new Float32Array(dx);
        const dh = new Float32Array(T * FF);
        for (let t = 0; t < T; t++) {
          for (let j = 0; j < D; j++) {
            const g = dffn[t * D + j]; gb2[j] += g;
            for (let i = 0; i < FF; i++) { gW2[i * D + j] += c.hid[t * FF + i] * g; dh[t * FF + i] += P.W2[l][i * D + j] * g; }
          }
          for (let i = 0; i < FF; i++) if (c.hid[t * FF + i] <= 0) dh[t * FF + i] = 0;
        }
        const dLn2y = new Float32Array(T * D);
        for (let t = 0; t < T; t++) for (let j = 0; j < FF; j++) {
          const g = dh[t * FF + j]; gb1[j] += g;
          for (let i = 0; i < D; i++) { gW1[i * FF + j] += c.ln2.y[t * D + i] * g; dLn2y[t * D + i] += P.W1[l][i * FF + j] * g; }
        }
        const dx1b = dLayerNorm(dLn2y, c.x1, P.ln2g[l], c.ln2.mean, c.ln2.rstd, gln2g, gln2b, T);
        for (let i = 0; i < dx1.length; i++) dx1[i] += dx1b[i];

        const dAttnOut = dx1;
        const dxResid = new Float32Array(dx1);
        const dyAtt = new Float32Array(T * D);
        for (let t = 0; t < T; t++) for (let j = 0; j < D; j++) {
          const g = dAttnOut[t * D + j];
          for (let i = 0; i < D; i++) { gWo[i * D + j] += c.yAtt[t * D + i] * g; dyAtt[t * D + i] += P.Wo[l][i * D + j] * g; }
        }
        const dQ = new Float32Array(T * D), dK = new Float32Array(T * D), dV = new Float32Array(T * D);
        const scale = 1 / Math.sqrt(DH);
        for (let h = 0; h < H; h++) {
          for (let t = 0; t < T; t++) {
            for (let s = 0; s <= t; s++) for (let d = 0; d < DH; d++) dV[s * D + h * DH + d] += c.att[h * T * T + t * T + s] * dyAtt[t * D + h * DH + d];
            const dAttRow = new Float32Array(t + 1);
            for (let s = 0; s <= t; s++) {
              let g = 0; for (let d = 0; d < DH; d++) g += dyAtt[t * D + h * DH + d] * c.Vv[s * D + h * DH + d];
              dAttRow[s] = g;
            }
            let sum = 0; for (let s = 0; s <= t; s++) sum += dAttRow[s] * c.att[h * T * T + t * T + s];
            for (let s = 0; s <= t; s++) {
              const da = (dAttRow[s] - sum) * c.att[h * T * T + t * T + s] * scale;
              for (let d = 0; d < DH; d++) {
                dQ[t * D + h * DH + d] += da * c.K[s * D + h * DH + d];
                dK[s * D + h * DH + d] += da * c.Q[t * D + h * DH + d];
              }
            }
          }
        }
        const dLn1y = new Float32Array(T * D);
        for (let t = 0; t < T; t++) for (let j = 0; j < D; j++) {
          for (let i = 0; i < D; i++) {
            gWq[i * D + j] += c.ln1.y[t * D + i] * dQ[t * D + j];
            gWk[i * D + j] += c.ln1.y[t * D + i] * dK[t * D + j];
            gWv[i * D + j] += c.ln1.y[t * D + i] * dV[t * D + j];
            dLn1y[t * D + i] += P.Wq[l][i * D + j] * dQ[t * D + j] + P.Wk[l][i * D + j] * dK[t * D + j] + P.Wv[l][i * D + j] * dV[t * D + j];
          }
        }
        const dxIn = dLayerNorm(dLn1y, c.x, P.ln1g[l], c.ln1.mean, c.ln1.rstd, gln1g, gln1b, T);
        for (let i = 0; i < dx.length; i++) dx[i] = dxResid[i] + dxIn[i];
      }
      const gE = gOf(P.E), gPos = gOf(P.Pos);
      for (let t = 0; t < T; t++) {
        const e = tok[t] * D, p = Math.min(t, CTX - 1) * D;
        for (let d = 0; d < D; d++) { gE[e + d] += dx[t * D + d]; gPos[p + d] += dx[t * D + d]; }
      }
      return loss;
    }

    function adam(lr, n) {
      tAdam++;
      const b1 = 0.9, b2 = 0.999, eps = 1e-8, c1 = 1 - Math.pow(b1, tAdam), c2 = 1 - Math.pow(b2, tAdam);
      for (let pi = 0; pi < flat.length; pi++) {
        const w = flat[pi], g = G[pi], m = M[pi], v = S2[pi];
        for (let i = 0; i < w.length; i++) {
          const gi = g[i] / n;
          m[i] = b1 * m[i] + (1 - b1) * gi;
          v[i] = b2 * v[i] + (1 - b2) * gi * gi;
          w[i] -= lr * (m[i] / c1) / (Math.sqrt(v[i] / c2) + eps);
          g[i] = 0;
        }
      }
    }

    function zeroGrads() { for (const g of G) g.fill(0); }

    function forwardLast(tok) {
      const fw = forwardAll(tok, true);
      const t = fw.T - 1, V = vocab.size;
      const logits = new Float32Array(V);
      for (let k = 0; k < V; k++) logits[k] = fw.logits[t * V + k];
      return logits;
    }

    return {
      vocab, P, nParams, kind: 'transformer', CTX, D, H, L, FF,
      get lastAttn() { return lastAttn; },
      get lastAttnHeads() { return lastAttnHeads; },
      forwardLast, lossAndBackward, adam, zeroGrads, get steps() { return tAdam; }
    };
  }

  function Trainer(text, opts) {
    opts = opts || {};
    const vocab = opts.vocab || Vocab(text);
    const ids = encode(vocab, text).ids;
    const N = ids.length;
    const r = rng(opts.seed || 42);
    const model = opts.model || Model(vocab, opts.seed || 7);
    const pos = [], val = [];
    for (let i = 0; i + CTX + 1 < N; i++) ((Math.floor(i / 97) % 10) === 3 ? val : pos).push(i);
    const valSample = val.filter((_, i) => i % Math.max(1, Math.floor(val.length / 200)) === 0);
    const BATCH = opts.batch || 24;
    let iter = 0;

    function windowAt(i) {
      const tok = new Int32Array(CTX), tgt = new Int32Array(CTX);
      for (let t = 0; t < CTX; t++) { tok[t] = ids[i + t]; tgt[t] = ids[i + t + 1]; }
      return { tok, tgt };
    }
    function lossOn(list) {
      let s = 0;
      for (const i of list) {
        const { tok, tgt } = windowAt(i);
        // forward only for val: reuse lossAndBackward without applying adam — but it accumulates grads.
        // Use a side channel: temporary zero then discard by zeroing after.
        model.zeroGrads();
        s += model.lossAndBackward(tok, tgt);
        model.zeroGrads();
      }
      return s / list.length;
    }
    function step() {
      model.zeroGrads();
      let Lsum = 0;
      for (let b = 0; b < BATCH; b++) {
        const i = pos[Math.floor(r() * pos.length)];
        const { tok, tgt } = windowAt(i);
        Lsum += model.lossAndBackward(tok, tgt);
      }
      const lr = (opts.lr || 0.0035) * (iter < 40 ? 1 : Math.max(0.3, 1 - iter / (opts.total || 1000) * 0.7));
      model.adam(lr, BATCH * CTX);
      iter++;
      return Lsum / BATCH;
    }
    return { model, vocab, step, valLoss: () => lossOn(valSample), get iter() { return iter; }, chars: N };
  }

  function ctxIds(model, text) {
    const v = model.vocab; const enc = encode(v, text).ids;
    const tok = new Int32Array(CTX);
    for (let k = 0; k < CTX; k++) {
      const j = enc.length - CTX + k;
      tok[k] = j < 0 ? v.idx[PAD] : enc[j];
    }
    return tok;
  }

  function nextDist(model, text, T) {
    const logits = model.forwardLast(ctxIds(model, text));
    const V = model.vocab.size;
    let mx = -Infinity; for (let k = 0; k < V; k++) if (logits[k] > mx) mx = logits[k];
    const temp = Math.max(T, 0.05);
    let s = 0; const p = new Float32Array(V);
    if (T <= 0.01) {
      const out = new Float32Array(V); let best = 0;
      for (let k = 1; k < V; k++) if (logits[k] > logits[best]) best = k;
      out[best] = 1; return Array.from(out);
    }
    for (let k = 0; k < V; k++) { p[k] = Math.exp((logits[k] - mx) / temp); s += p[k]; }
    for (let k = 0; k < V; k++) p[k] /= s;
    return Array.from(p);
  }

  function sampleFrom(p, r) { const u = (r || Math.random)(); let a = 0; for (let i = 0; i < p.length; i++) { a += p[i]; if (u <= a) return i; } return p.length - 1; }

  function generate(model, prompt, n, T, r, stopAt) {
    let out = '';
    for (let i = 0; i < n; i++) {
      const p = nextDist(model, prompt + out, T);
      const ch = model.vocab.chars[sampleFrom(p, r)];
      if (ch === PAD) { if (stopAt) break; out += ' '; continue; }
      out += ch;
      if (stopAt && stopAt.test(ch) && out.length > 8) break;
    }
    return out;
  }

  function nextWords(model, text, k) {
    const v = model.vocab; const endRe = /[\s.,!?:\n]/;
    if (/[A-Za-z0-9']$/.test(text)) text += ' ';
    let beams = [{ s: '', p: 1 }]; const done = [];
    for (let depth = 0; depth < 14 && beams.length; depth++) {
      const next = [];
      for (const b of beams) {
        const p = nextDist(model, text + b.s, 1);
        p.forEach((pi, i) => {
          if (pi < 0.002) return;
          const ch = v.chars[i], np = b.p * pi;
          if (endRe.test(ch)) {
            if (b.s.length) done.push({ w: b.s, end: ch, p: np });
            else next.push({ s: ch === ' ' || ch === PAD ? '' : ch, p: np, punct: ch });
          } else next.push({ s: b.s + ch, p: np });
        });
      }
      beams = next.filter((b) => !b.punct || b.punct === ' ').sort((a, b) => b.p - a.p).slice(0, 10);
      next.filter((b) => b.punct && b.punct !== ' ' && b.punct !== PAD).forEach((b) => done.push({ w: b.punct, end: '', p: b.p }));
    }
    const merged = {}; done.forEach((d) => { merged[d.w] = (merged[d.w] || 0) + d.p; });
    return Object.entries(merged).sort((a, b) => b[1] - a[1]).slice(0, k || 5).map(([w, p]) => ({ w, p }));
  }

  /* ---------- Browser helpers ---------- */
  const PROMPT = 'Our travel policy says';
  const MILESTONES = [0, 40, 120, 240, 360, 480, 560];
  let VOCAB = null;
  function corpus() { return (root.GPT_CORPUS || {}); }
  function sharedVocab() { if (!VOCAB) VOCAB = Vocab(Object.values(corpus()).join('') + "0123456789'-"); return VOCAB; }
  function corpusWords() {
    const set = new Set();
    (corpus().clean || '').toLowerCase().replace(/[^a-z' ]+/g, ' ').split(/\s+/).forEach((w) => w && set.add(w));
    return set;
  }
  const jobs = {};
  /* Prefer completions whose 5-char snippets actually appear in the training emails. */
  function fluencyScore(text) {
    const clean = (corpus().clean || '') + '\n';
    if (!text || text.length < 5) return 0;
    let hits = 0, n = 0;
    for (let i = 0; i <= text.length - 5; i++) {
      n++;
      if (clean.indexOf(text.slice(i, i + 5)) >= 0) hits++;
    }
    const words = text.trim().split(/\s+/).filter(Boolean);
    const known = corpusWords();
    let wh = 0;
    for (const w of words) {
      const k = w.toLowerCase().replace(/[^a-z']/g, '');
      if (k && known.has(k)) wh++;
    }
    const wordRatio = words.length ? wh / words.length : 0;
    return (n ? hits / n : 0) * 0.75 + wordRatio * 0.25;
  }
  /* Near-greedy first, then a few low-temp samples; keep highest corpus-overlap score. */
  function bestGenerate(model, prompt, nChars, T, r, tries) {
    tries = tries || 8; T = T == null ? 0.3 : T;
    let best = '', score = -1;
    const temps = [0.05, 0.15, T];
    while (temps.length < tries) temps.push(T);
    for (let i = 0; i < tries; i++) {
      const g = generate(model, prompt, nChars, temps[i], r);
      const sc = fluencyScore(g);
      if (sc > score) { score = sc; best = g; }
    }
    return { text: best, score };
  }

  function Job(diet, opts) {
    opts = opts || {};
    const total = opts.total || 560, key = diet.slice().sort().join('+');
    let text = diet.map((k) => corpus()[k]).join('\n');
    /* Oversample travel-policy / closing lines so common Step 1 starters learn sharp peaks. */
    if (diet.includes('clean')) {
      /* Drill lines already dominate corpus; one extra pass keeps peaks sharp without blowing train time. */
      const boost = text.split('\n').filter((l) => /POLICY DRILL|travel policy says hotels|Please find attached the|Kind regards,/i.test(l)).join('\n');
      if (boost) text = text + '\n' + boost;
    }
    const tr = Trainer(text, { vocab: sharedVocab(), total, seed: opts.seed || 42, batch: opts.batch || 24, lr: opts.lr || 0.0045 });
    const sr = rng(7);
    const job = {
      key, diet: diet.slice(), total, tr, model: tr.model, iter: 0, running: false, done: false,
      ema: null, trainHist: [], valHist: [], samples: [], elapsed: 0, listeners: new Set(),
      chars: tr.chars, params: tr.model.nParams,
      arch: { kind: 'transformer', CTX, D, H, L, FF }
    };
    const v0 = tr.valLoss(); job.trainHist.push([0, v0]); job.valHist.push([0, v0]);
    job.samples.push({ iter: 0, text: bestGenerate(tr.model, PROMPT, 56, 0.25, sr, 4).text });
    const emit = () => job.listeners.forEach((f) => { try { f(job); } catch (e) { console.error(e); } });
    function slice() {
      if (!job.running) return;
      const t0 = (root.performance || Date).now();
      while (job.iter < total && (root.performance || Date).now() - t0 < 18) {
        const l = tr.step(); job.iter++;
        job.ema = job.ema == null ? l : job.ema * 0.96 + l * 0.04;
        if (job.iter % 20 === 0) job.trainHist.push([job.iter, job.ema]);
        if (job.iter % 100 === 0) job.valHist.push([job.iter, tr.valLoss()]);
        if (MILESTONES.includes(job.iter)) job.samples.push({ iter: job.iter, text: bestGenerate(tr.model, PROMPT, 56, 0.25, sr, 4).text });
      }
      job.elapsed += ((root.performance || Date).now() - t0) / 1000;
      if (job.iter >= total) {
        job.running = false; job.done = true;
        if (job.valHist[job.valHist.length - 1][0] !== total) job.valHist.push([total, tr.valLoss()]);
        if (!job.samples.some((s) => s.iter === total)) job.samples.push({ iter: total, text: bestGenerate(tr.model, PROMPT, 70, 0.2, sr, 8).text });
      }
      emit();
      if (job.running) setTimeout(slice, 0);
    }
    job.start = () => { if (job.done || job.running) return; job.running = true; emit(); setTimeout(slice, 0); };
    job.pause = () => { job.running = false; emit(); };
    job.on = (f) => { job.listeners.add(f); return () => job.listeners.delete(f); };
    return job;
  }
  function getJob(diet, fresh) {
    const key = diet.slice().sort().join('+');
    if (fresh || !jobs[key]) { if (jobs[key]) jobs[key].pause(); jobs[key] = Job(diet); }
    return jobs[key];
  }


  const api = {
    CTX, D, EMB: D, H, L, FF, HID: FF, kind: 'transformer', PROMPT,
    Vocab, encode, Model, Trainer, nextDist, generate, bestGenerate, fluencyScore, nextWords, rng, sampleFrom,
    sharedVocab, corpusWords, Job, getJob, jobs
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.MiniLM = api;
})(typeof window !== 'undefined' ? window : globalThis);
