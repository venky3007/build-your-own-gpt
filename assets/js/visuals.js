/* "Under the hood" visuals, one per step. Pure SVG/HTML, no libraries. */
(function () {
  'use strict';
  const V = window.VISUALS = {};
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const bars = (rows) => '<div class="bars">' + rows.map((r) => '<div class="bar"><span class="tok">' + esc(r[0]) + '</span><span class="track"><span class="fill" style="width:' + r[1] + '%"></span></span><span>' + r[1] + '%</span></div>').join('') + '</div>';

  V[1] = (el) => { el.innerHTML = '<p><strong>\u201cThe invoice is overdue\u201d</strong> as the model sees it:</p>' + window.WUTIL.tokenChunks('The invoice is overdue') + '<p style="margin-top:10px">\u2192 Next-token probabilities (illustrative):</p>' + bars([['.', 38], ['\u2423by', 21], ['\u2423and', 12], [',', 9], ['other', 20]]); };

  V[2] = (el) => {
    const tr = [], va = []; for (let i = 0; i <= 50; i++) { const x = 40 + i * 6.4, y = 30 + 150 * (1 - Math.exp(-i / 9)); tr.push(x + ',' + (210 - y + 30).toFixed(1)); const yv = i < 38 ? y - 8 : y - 8 - (i - 38) * 3.2; va.push(x + ',' + (210 - yv + 30).toFixed(1)); }
    el.innerHTML = '<svg viewBox="0 0 400 260" role="img" aria-label="Loss chart: training loss drops steeply then flattens. Loss on unseen emails tracks it, then creeps up at the end, labelled memorising, not learning." style="width:100%;max-width:560px"><line x1="40" y1="20" x2="40" y2="230" stroke="#888"/><line x1="40" y1="230" x2="370" y2="230" stroke="#888"/><text x="6" y="30" font-size="11">loss</text><text x="300" y="250" font-size="11">training steps \u2192 500</text><polyline points="' + tr.join(' ') + '" fill="none" stroke="#5A3FD1" stroke-width="3"/><polyline points="' + va.join(' ') + '" fill="none" stroke="#B0341D" stroke-width="2.5" stroke-dasharray="6 4"/>' +
      '<circle cx="40" cy="60" r="5" fill="#5A3FD1"/><text x="48" y="56" font-size="11" font-family="monospace">step 0: \u201cqlz ffft\u201d</text><circle cx="104" cy="152" r="5" fill="#5A3FD1"/><text x="112" y="148" font-size="11" font-family="monospace">step 100: \u201cinvo the plea\u201d</text><circle cx="360" cy="212" r="5" fill="#5A3FD1"/><text x="200" y="205" font-size="11" font-family="monospace">step 500: \u201cPlease find attached\u2026\u201d</text><text x="250" y="170" font-size="11" fill="#B0341D">\u2191 unseen emails: memorising, not learning</text></svg><p class="note">Solid: loss on training emails. Dashed: loss on emails it has never seen.</p>';
  };

  V[3] = (el) => {
    const T = ['Priya', 'sent', 'the', 'report', 'to', 'Tom', 'because', 'she', 'was', 'going', 'on', 'leave'];
    const heads = {
      names: (r, c) => { if (c > r) return 0; if (r === 7) return [.55, .03, .01, .08, .02, .25, .03, .03][c] || 0; if (T[c] === 'Priya' || T[c] === 'Tom') return .35; return c === r ? .3 : .05; },
      prev: (r, c) => c > r ? 0 : (c === r - 1 ? .7 : c === r ? .2 : .03)
    };
    el.innerHTML = '<div class="row"><label class="lbl" for="hm-head">Attention head:</label><select id="hm-head" class="input" style="max-width:240px"><option value="names">Head A: tracks names</option><option value="prev">Head B: looks at the previous word</option></select></div><div id="hm-read" class="status" aria-live="polite">Hover or focus a cell. Try the row for \u201cshe\u201d.</div><div style="overflow-x:auto"><table id="hm" style="border-collapse:separate;border-spacing:2px;width:auto;font-size:.75rem"></table></div><p class="note">Rows = the word doing the looking; columns = the word being looked at. Darker = more attention. Blank cells: a word can\u2019t look at future words (causal masking). Colour-blind-safe single-hue scale.</p>';
    const draw = () => {
      const h = heads[el.querySelector('#hm-head').value];
      let s = '<tr><th></th>' + T.map((t) => '<th scope="col" style="writing-mode:vertical-rl;transform:rotate(180deg);padding:2px;border:0;background:none">' + t + '</th>').join('') + '</tr>';
      T.forEach((rt, r) => { s += '<tr><th scope="row" style="text-align:right;border:0;background:none;padding:2px 4px;' + (r === 7 ? 'color:#5A3FD1' : '') + '">' + rt + '</th>'; T.forEach((ct, c) => { const v = h(r, c); const a = Math.min(1, v * 1.6); s += '<td tabindex="0" data-v="' + rt + ' \u2192 ' + ct + ': ' + Math.round(v * 100) + '%" style="width:26px;height:24px;padding:0;border:' + (r === 7 ? '2px solid #5A3FD1' : '1px solid #eee') + ';background:' + (c > r ? '#fafafa' : 'rgba(68,41,181,' + a.toFixed(2) + ')') + '" aria-label="' + rt + ' attends to ' + ct + ': ' + Math.round(v * 100) + ' percent"></td>'; }); s += '</tr>'; });
      const tb = el.querySelector('#hm'); tb.innerHTML = s;
      tb.querySelectorAll('td').forEach((td) => { const f = () => { el.querySelector('#hm-read').textContent = td.dataset.v; }; td.addEventListener('mouseenter', f); td.addEventListener('focus', f); });
    };
    el.querySelector('#hm-head').onchange = draw; draw();
  };

  V[5] = (el) => {
    const grid = (n, sz) => { let s = ''; for (let i = 0; i < n; i++) s += '<circle cx="' + (6 + (i % sz) * 8) + '" cy="' + (6 + Math.floor(i / sz) * 8) + '" r="2.5" fill="#5A3FD1"/>'; return s; };
    el.innerHTML = '<div class="col3">' + [['Tiny', 16, 4, '\u201cQ3 sales the results regards regards\u201d'], ['Medium', 64, 8, '\u201cQ3 sales were. Results good maybe.\u201d'], ['Huge', 196, 14, '\u201cI don\u2019t have access to your Q3 data. If you paste it, I can summarise\u2026\u201d']].map((b) => '<div style="text-align:center"><svg viewBox="0 0 ' + (b[2] * 8 + 4) + ' ' + (b[2] * 8 + 4) + '" style="width:' + (40 + b[2] * 7) + 'px;max-width:100%" role="img" aria-label="' + b[0] + ' brain"><g>' + grid(b[1], b[2]) + '</g></svg><p><strong>' + b[0] + ' brain</strong><br><span class="out">' + esc(b[3]) + '</span></p></div>').join('') + '</div>' +
      '<svg viewBox="0 0 400 70" style="width:100%" role="img" aria-label="Timeline of training data ending at a red knowledge cut-off line; your company\u2019s private docs sit locked outside it."><rect x="10" y="20" width="250" height="22" rx="6" fill="#C9BDFB"/><text x="20" y="36" font-size="11">training data (public text, books, code)</text><line x1="262" y1="10" x2="262" y2="55" stroke="#B0341D" stroke-width="3"/><text x="226" y="66" font-size="10" fill="#B0341D">knowledge cut-off</text><rect x="290" y="14" width="100" height="34" rx="6" fill="#FFF3CF" stroke="#8A6300" stroke-dasharray="4 3"/><text x="298" y="30" font-size="10">\ud83d\udd12 your company\u2019s</text><text x="298" y="42" font-size="10">private docs</text></svg>';
  };

  V[6] = (el) => { el.innerHTML = '<p class="note">Read the flow top to bottom: preparation happens ahead of time; the search happens on every question.</p>'; };
  V[7] = (el) => { el.innerHTML = '<div class="row"><span class="lbl">Fuel gauge (context + cost) per lap:</span>' + [1, 2, 3, 4, 5].map((i) => '<span class="tag ' + (i > 3 ? 'bad' : 'warn') + '">Lap ' + i + ': ' + '\ud83e\ude99'.repeat(i) + '</span>').join('') + '</div><p class="note">Each lap re-sends the growing context, so cost climbs faster than the number of laps.</p>'; };
  V[8] = (el) => { el.innerHTML = '<div class="row"><span class="tag">1 Pretraining: knowledge + fluency</span>\u2192<span class="tag">2 Instruction tuning: follows instructions</span>\u2192<span class="tag">3 Preference training: manners</span><span class="tag good">Beside the belt: your documents via RAG</span></div>'; };

  V[9] = (el) => {
    const box = [['Sources & freshness (3, 4)', 'Search index + refresh schedule'], ['Users & channel (6)', 'Interface + login'], ['Behaviour (6, 9)', 'System instructions'], ['Actions (6)', 'Tool permissions'], ['Evals (8)', 'Test set + dashboard'], ['Privacy (10)', 'Hosting + data retention'], ['Cost / latency (11)', 'Model size + number of steps']];
    el.innerHTML = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px">' + box.map((b) => '<div class="panel"><span class="tag warn">' + esc(b[0]) + '</span><p style="margin:.4em 0 0"><strong>\u2192 ' + esc(b[1]) + '</strong></p></div>').join('') + '</div><p class="note">Each worksheet section (numbers in brackets) decides one part of the system.</p>';
  };

  V[10] = (el) => { el.innerHTML = '<div class="col2"><div class="panel"><h4>Day 1</h4><div class="bubble user">I\u2019m in the US office.</div><p>\u2193 saved to <strong>Memory store</strong></p><div class="sticky-note">Location: USA</div></div><div class="panel"><h4>Day 2 (new chat)</h4><div class="promptbox">[Context window]\n\ud83d\udcdd Note: Location: USA\nUser: Which holidays apply to me?</div><p>\ud83e\udde0\ud83d\udd12 <strong>Model parameters unchanged.</strong></p></div></div>'; };

  V[11] = (el) => {
    const pts = [['holiday', 70, 70, 0], ['vacation', 85, 60, 0], ['PTO', 60, 90, 0], ['annual leave', 95, 85, 0], ['2026 policy', 110, 100, 0], ['2019 policy', 116, 106, 0], ['receipts', 260, 70, 1], ['mileage', 285, 90, 1], ['per diem', 250, 100, 1], ['laptop', 170, 200, 2], ['password', 195, 220, 2], ['VPN', 150, 225, 2]];
    const col = ['#5A3FD1', '#B0341D', '#11714F'];
    let s = '<svg viewBox="0 0 340 260" style="width:100%;max-width:520px" role="img" aria-label="Meaning map: leave words cluster together, expenses words cluster, IT words cluster. The question lands in the leave cluster; the 2019 policy dot sits right next to the 2026 policy dot.">';
    [[90, 85], [102, 94], [72, 72]].forEach((t) => { s += '<line x1="100" y1="78" x2="' + t[0] + '" y2="' + t[1] + '" stroke="#1E2140" stroke-dasharray="3 2"/>'; });
    pts.forEach((p) => { s += '<circle cx="' + p[1] + '" cy="' + p[2] + '" r="5" fill="' + col[p[3]] + '"/><text x="' + (p[1] + 7) + '" y="' + (p[2] + 4) + '" font-size="10">' + p[0] + (p[0] === '2019 policy' ? ' \u26a0\ufe0f' : '') + '</text>'; });
    el.innerHTML = s + '<text x="100" y="82" font-size="16" text-anchor="middle">\u2b50</text><text x="10" y="250" font-size="10">\u2b50 = \u201cCan I carry over unused holidays?\u201d (lands in the leave cluster)</text></svg>';
  };

  V[12] = (el) => {
    const seg = [['instructions', 6, '#A9C8F0'], ['examples', 8, '#A8E0C4'], ['retrieved docs', 40, '#FFC48A'], ['chat history', 22, '#CFCFD8'], ['question', 6, '#C9BDFB'], ['answer space', 18, '#FFFFFF']];
    let x = 10; let s = '<svg viewBox="0 0 400 170" style="width:100%" role="img" aria-label="Context window bar: instructions, examples, retrieved documents, chat history, question, answer space. Below it, a recall curve high at the start, dipping in the middle, rising at the end.">';
    seg.forEach((g) => { const w = g[1] * 3.8; s += '<rect x="' + x + '" y="10" width="' + w + '" height="34" fill="' + g[2] + '" stroke="#1E2140"/><text x="' + (x + 3) + '" y="31" font-size="9">' + g[0] + '</text>'; x += w; });
    s += '<path d="M10,70 C80,72 120,140 200,140 S320,72 390,70" fill="none" stroke="#B0341D" stroke-width="3"/><text x="150" y="160" font-size="10">recall (illustrative pattern; varies by model)</text><text x="12" y="64" font-size="10">start: good</text><text x="170" y="132" font-size="10">middle: dips</text><text x="330" y="64" font-size="10">end: good</text></svg>';
    el.innerHTML = s;
  };

  V[13] = (el) => {
    let g = ''; for (let i = 0; i < 24; i++) g += '<rect x="' + (10 + (i % 6) * 22) + '" y="' + (10 + Math.floor(i / 6) * 22) + '" width="20" height="20" fill="#FFF3CF" stroke="#8A6300"/>';
    el.innerHTML = '<svg viewBox="0 0 400 110" style="width:100%" role="img" aria-label="An invoice image cut into a grid of patches that become tokens joining text tokens, then a table where Total 4,8OO is flagged red."><text x="10" y="106" font-size="10">invoice image \u2192 patches</text>' + g + '<text x="150" y="55" font-size="20">\u2192</text>' + [0, 1, 2, 3, 4].map((i) => '<rect x="' + (175 + i * 22) + '" y="40" width="20" height="20" rx="4" fill="' + (i < 3 ? '#FFF3CF' : '#C9BDFB') + '" stroke="#1E2140"/>').join('') + '<text x="175" y="78" font-size="9">image tokens + \u201cExtract the total\u201d</text><text x="290" y="55" font-size="20">\u2192</text><rect x="310" y="25" width="85" height="50" fill="#fff" stroke="#999"/><text x="315" y="42" font-size="10">Supplier \u2714</text><text x="315" y="58" font-size="10">Date \u2714</text><text x="315" y="72" font-size="10" fill="#B0341D" font-weight="700">Total 4,8OO \u2718</text></svg>';
  };

  V[14] = (el) => { el.innerHTML = '<svg viewBox="0 0 400 120" style="width:100%" role="img" aria-label="Standard model: short output, about 2 seconds, wrong total, 1 coin. Reasoning model: long grey thinking bar then short answer, later, correct total, about 6 coins."><text x="5" y="20" font-size="11">Standard</text><rect x="80" y="8" width="30" height="18" fill="#C9BDFB"/><text x="116" y="22" font-size="10">~2 s \u2192 3,375 \u2718 \ud83e\ude99</text><text x="5" y="70" font-size="11">Reasoning</text><rect x="80" y="58" width="220" height="18" fill="#CFCFD8"/><text x="150" y="71" font-size="10">thinking tokens\u2026</text><rect x="300" y="58" width="30" height="18" fill="#C9BDFB"/><text x="80" y="98" font-size="10">~25 s \u2192 3,750 \u2714 \ud83e\ude99\ud83e\ude99\ud83e\ude99\ud83e\ude99\ud83e\ude99\ud83e\ude99 (illustrative)</text></svg>'; };
  V[15] = (el) => { el.innerHTML = '<div class="row"><span class="tag good">\ud83d\udfe2 read</span><span class="tag warn">\ud83d\udfe0 draft for approval</span><span class="tag bad">\ud83d\udd34 write</span><span class="tag">\ud83e\uddd1 same permissions as the person using it</span></div>'; };

  V[16] = (el) => {
    const L = ['Scope', 'Retrieval & citations', 'Instructions', 'Output checks', 'Permissions', 'Human approval', 'Monitoring'];
    let s = '<svg viewBox="0 0 400 210" style="width:100%" role="img" aria-label="Seven Swiss cheese slices; a red arrow passes through holes in the first four and is stopped at Permissions.">';
    L.forEach((l, i) => { const x = 20 + i * 52; s += '<rect x="' + x + '" y="30" width="34" height="140" rx="6" fill="#FFE58A" stroke="#C9A227"/><circle cx="' + (x + 17) + '" cy="' + (60 + (i * 37) % 90) + '" r="7" fill="#fff"/><circle cx="' + (x + 17) + '" cy="100" r="6" fill="' + (i < 4 ? '#fff' : '#FFE58A') + '"/><text x="' + (x + 17) + '" y="190" font-size="8.5" text-anchor="middle">' + l.split(' ')[0] + '</text>'; });
    s += '<line x1="0" y1="100" x2="228" y2="100" stroke="#B0341D" stroke-width="4" marker-end="url(#ah)"/><defs><marker id="ah" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#B0341D"/></marker></defs><text x="150" y="20" font-size="11" fill="#B0341D">No single layer is perfect.</text></svg>';
    el.innerHTML = s;
  };

  V[17] = (el) => {
    let cells = ''; for (let i = 0; i < 60; i++) { const ok = window.WUTIL.hid('v' + i) % 10 > 2; cells += '<span class="' + (ok ? 'g' : 'r') + '"></span>'; }
    el.innerHTML = '<div class="col2"><div><p class="lbl">Rows = questions, colour = pass/fail</p><div class="grid-eval" role="img" aria-label="Grid of pass and fail results">' + cells + '</div></div><div><svg viewBox="0 0 200 110" style="width:100%" role="img" aria-label="Scores across versions v1, v2, v3 with a dip at v3: new model version, refusals got worse."><polyline points="20,40 100,30 180,80" fill="none" stroke="#B0341D" stroke-width="3"/><text x="10" y="100" font-size="10">v1</text><text x="92" y="100" font-size="10">v2</text><text x="172" y="100" font-size="10">v3</text><text x="70" y="75" font-size="9" fill="#B0341D">v3: refusals got worse</text></svg><p class="note">AI judge vs humans: 80% agreement on a sample.</p></div></div>';
  };

  V[18] = (el) => { const q = [['RLHF', 'human \u2714/\u2718 \u2192 reward model \u2192 RL loop'], ['DPO', 'human \u2714/\u2718 \u2192 model updated directly'], ['Constitutional AI', 'written principles \u2192 model critiques itself \u2192 AI \u2714/\u2718 \u2192 training'], ['RLVR', 'answer \u2192 automatic checker (tests pass \u2714) \u2192 reward']]; el.innerHTML = '<div class="col2">' + q.map((x) => '<div class="panel"><h4>' + x[0] + '</h4><p style="margin:0">' + esc(x[1]) + '</p></div>').join('') + '</div>'; };

  V[19] = (el) => { el.innerHTML = '<div class="row" style="justify-content:center;text-align:center"><div class="panel"><strong>Real examples</strong><br>\ud83e\udea8\ud83d\udd38\u2b1f\ud83d\udd3a<br><small>small, messy, varied</small></div><div class="panel"><strong>Synthetic examples</strong><br>\u25fc\u25fc\u25fc\u25fc\u25fc\u25fc\u25fc\u25fc<br><small>large, neat, similar</small></div><span style="font-size:1.6rem">\u2192</span><div class="panel"><strong>Mixing bowl</strong><br>\ud83e\udd63 + \ud83d\udd75\ufe0f inspector<br><small>training / eval set</small></div><span style="font-size:1.6rem">\u2192</span><div class="panel"><strong>Real-world test score</strong><br>\ud83c\udf21\ufe0f<br><small>the final judge</small></div></div>'; };

  V[20] = (el) => { el.innerHTML = '<div class="col3"><div class="panel"><h4>1. Distillation</h4><p>\ud83e\uddd1\u200d\ud83c\udfeb big teacher \u2192 answer cards \u2192 \ud83e\uddd2 small student</p></div><div class="panel"><h4>2. Quantization</h4><p><code>0.123456789</code> (16-bit)<br>\u2193<br><code>0.12</code> (4-bit)</p><div class="meter"><span class="track"><span class="fill" style="width:100%"></span></span></div><div class="meter"><span class="track"><span class="fill good" style="width:25%"></span></span></div><p class="note">Memory: about a quarter (illustrative)</p></div><div class="panel"><h4>3. Deployment</h4><p>\u2601\ufe0f Hosted API: data \u2192 leaves the building<br>\ud83c\udfe2 Self-hosted: data stays in</p></div></div>'; };

  V[21] = (el) => {
    const row = (w, top) => '<div class="panel"><p><strong>Token: \u201c' + w + '\u201d</strong></p><div class="experts">' + [0, 1, 2, 3, 4, 5, 6, 7].map((i) => '<div class="' + (top.includes(i) ? 'on' : '') + '">E' + (i + 1) + '</div>').join('') + '</div></div>';
    el.innerHTML = '<div class="col2">' + row('invoice', [2, 6]) + row('overdue', [5, 3]) + '</div><p><strong>Total parameters: huge \u00b7 Active per token: small</strong></p>';
  };

  V[22] = (el) => {
    el.innerHTML = '<div class="field"><label for="v21r">Requests per day: <span id="v21rv"></span></label><input type="range" id="v21r" min="100" max="10000" step="100" value="1000"></div><div class="field"><label for="v21t">Price tier</label><select id="v21t" class="input" style="max-width:180px"><option value="1">Low</option><option value="4" selected>Medium</option><option value="15">High</option></select></div><label class="switch"><input type="checkbox" id="v21a"> Agent mode (\u00d78 calls)</label><div class="meter" style="margin-top:8px">Monthly cost <span class="track"><span class="fill" id="v21c"></span></span><span id="v21cv"></span></div><div class="meter">Wait <span class="track"><span class="fill" id="v21w"></span></span><span id="v21wv"></span></div><p class="note">Cost \u2248 requests \u00d7 calls per request \u00d7 tokens \u00d7 price (illustrative units).</p>';
    const u = () => { const r = +el.querySelector('#v21r').value, t = +el.querySelector('#v21t').value, a = el.querySelector('#v21a').checked ? 8 : 1; const c = r * 30 * a * t * 2 / 1000; el.querySelector('#v21rv').textContent = r.toLocaleString('en-US'); el.querySelector('#v21c').style.width = Math.min(100, c / 50) + '%'; el.querySelector('#v21cv').textContent = Math.round(c).toLocaleString('en-US') + ' units'; const w = a * (t > 10 ? 4 : 2); el.querySelector('#v21w').style.width = Math.min(100, w * 4) + '%'; el.querySelector('#v21wv').textContent = w + ' s'; };
    el.querySelectorAll('input,select').forEach((x) => x.addEventListener('input', u)); el.querySelector('#v21a').addEventListener('change', u); u();
  };
})();
