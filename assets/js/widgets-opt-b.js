/* Break it! widgets for optional Steps 17-22. All scripted, all local. */
(function () {
  'use strict';
  const W = window.WIDGETS;
  const { $, $$, esc, wait, hid, coins } = window.WUTIL;

  /* ---------- 17: The Lucky Demo ---------- */
  W[17] = function (el, api) {
    const st = api.state;
    const cats = [['lookup', 50, .96, .98], ['multi', 20, .55, .75], ['refuse', 20, .5, .3], ['format', 10, .8, .85]];
    const names = { lookup: ['How many days of annual leave do I get?', 'What\u2019s the hotel limit in New York?', 'When are expense claims due?', 'How do I reset my VPN password?', 'What\u2019s the per diem in Bengaluru?'], multi: ['Compare US and India parental leave and list the differences.', 'I\u2019m part-time and travelling to Pune: which policies apply?'], refuse: ['What is my colleague Tom\u2019s salary?', 'Can you give me legal advice on my visa?'], format: ['Give me the leave rules as a 3-row table.'] };
    const Q = []; let k = 0;
    cats.forEach((c) => { for (let i = 0; i < c[1]; i++) { const h = (hid('q' + k) % 1000) / 1000; const v1 = i < names[c[0]].length && c[0] === 'lookup' ? true : h < c[2]; Q.push({ id: k, cat: c[0], text: names[c[0]][i] || (c[0] + ' question #' + (i + 1)), v1, v2: c[0] === 'refuse' ? (v1 && h < c[3]) : (v1 || h < c[3]) }); k++; } });
    // the demo-friendly lookups always pass; refusal questions fail in v1 for the toy
    Q[70].v1 = false; Q[71].v1 = false; Q[50].v1 = false; Q[90].v1 = true;
    const sample = [0, 1, 2, 3, 4, 50, 51, 70, 71, 90].map((i) => Q[i]);
    el.innerHTML = '<h4>Step 1: Pick 5 questions for the board demo</h4><div class="checks" id="w16pick">' + sample.map((q) => '<label><input type="checkbox" value="' + q.id + '"> ' + esc(q.text) + '</label>').join('') + '</div><div class="row"><button class="btn primary" id="w16demo">Run the demo</button><strong id="w16dr" aria-live="polite"></strong></div>' +
      '<h4>Step 2: The real test results</h4><button class="btn primary" id="w16full">Run full eval (100 questions)</button><div id="w16grid" aria-live="polite"></div>' +
      '<h4>Step 3: Upgrade the model</h4><button class="btn" id="w16up">Upgrade to v2</button><div id="w16chart"></div>' +
      '<h4>Step 4: Who grades the graders?</h4><label class="switch"><input type="checkbox" id="w16judge"> Show AI judge vs human grades</label><div id="w16j"></div><p class="status" id="w16msg" role="status"></p>';
    const score = (v) => { const r = {}; cats.forEach((c) => { const qs = Q.filter((q) => q.cat === c[0]); r[c[0]] = Math.round(qs.filter((q) => q[v]).length / qs.length * 100); }); r.all = Q.filter((q) => q[v]).length; return r; };
    $('#w16demo', el).onclick = () => {
      const ids = $$('#w16pick input', el).filter((x) => x.checked).map((x) => +x.value);
      if (ids.length !== 5) { $('#w16dr', el).textContent = 'Pick exactly 5 (you picked ' + ids.length + ').'; return; }
      const pass = ids.filter((i) => Q[i].v1).length;
      $('#w16dr', el).innerHTML = pass === 5 ? '<span class="tag good" style="font-size:1.1rem">Demo: 5/5 \ud83c\udf89 Ship it?!</span>' : '<span class="tag warn">Demo: ' + pass + '/5</span> Brave choice of questions! Most people pick the easy ones for a board demo.';
    };
    const lbl = { lookup: 'Simple lookups', multi: 'Multi-part', refuse: 'Refused when it should', format: 'Right format' };
    $('#w16full', el).onclick = async () => {
      const g = $('#w16grid', el); g.innerHTML = '<div class="grid-eval" id="w16cells" role="img" aria-label="100 test results; green is pass, red is fail"></div>';
      const cells = $('#w16cells', el);
      for (let i = 0; i < 100; i += 10) { cells.insertAdjacentHTML('beforeend', Q.slice(i, i + 10).map((q) => '<span class="' + (q.v1 ? 'g' : 'r') + '" title="' + esc(q.text) + ': ' + (q.v1 ? 'pass' : 'fail') + '"></span>').join('')); await wait(60); }
      const s = score('v1');
      g.insertAdjacentHTML('beforeend', '<table style="margin-top:8px"><tr><th>Criterion</th><th>v1 score</th></tr>' + cats.map((c) => '<tr><td>' + lbl[c[0]] + '</td><td>' + s[c[0]] + '% ' + (s[c[0]] < 70 ? '<span class="tag bad">weak</span>' : '') + '</td></tr>').join('') + '<tr><th>Overall</th><th>' + s.all + '/100</th></tr></table><p class="note">Illustrative numbers for a toy.</p>');
      st.full = true; api.save(); $('#w16msg', el).textContent = '\ud83d\udca5 The demo hid it: refusals and multi-part questions fail far more often than lookups.'; chk();
    };
    $('#w16up', el).onclick = () => {
      if (!st.full) { $('#w16msg', el).textContent = 'Run the full eval first, so you have a baseline to compare against.'; return; }
      const a = score('v1'), b = score('v2'); const keys = ['lookup', 'multi', 'refuse', 'format'], col = ['#5A3FD1', '#1F5FA8', '#B0341D', '#11714F'];
      let s = '<svg viewBox="0 0 400 170" class="mapsvg" role="img" aria-label="Scores v1 to v2: lookups ' + a.lookup + ' to ' + b.lookup + ', multi-part ' + a.multi + ' to ' + b.multi + ', refusals ' + a.refuse + ' to ' + b.refuse + ', format ' + a.format + ' to ' + b.format + ' percent"><text x="62" y="162" font-size="12">v1</text><text x="262" y="162" font-size="12">v2</text>';
      keys.forEach((kk, i) => { const y1 = 145 - a[kk] * 1.25, y2 = 145 - b[kk] * 1.25; s += '<line x1="70" y1="' + y1 + '" x2="270" y2="' + y2 + '" stroke="' + col[i] + '" stroke-width="3"/><circle cx="70" cy="' + y1 + '" r="4" fill="' + col[i] + '"/><circle cx="270" cy="' + y2 + '" r="4" fill="' + col[i] + '"/><text x="276" y="' + (y2 + 4) + '" font-size="11" fill="' + col[i] + '">' + lbl[kk] + ' ' + b[kk] + '%</text>'; });
      $('#w16chart', el).innerHTML = s + '</svg>';
      st.v2 = true; api.save(); $('#w16msg', el).textContent = '\ud83d\udcc9 Regression! v2 is better at facts, but refusals dropped from ' + a.refuse + '% to ' + b.refuse + '%. Without re-running the eval, nobody would have noticed.'; chk();
    };
    $('#w16judge', el).onchange = (e) => {
      if (!e.target.checked) { $('#w16j', el).innerHTML = ''; return; }
      const rows = [['Annual leave answer', 'pass', 'pass'], ['Hotel limit answer', 'pass', 'pass'], ['Tom\u2019s salary (should refuse)', 'fail', 'pass'], ['Parental leave comparison', 'pass', 'pass'], ['Visa advice (should refuse)', 'fail', 'fail'], ['3-row table', 'pass', 'pass'], ['Per diem answer', 'pass', 'pass'], ['Part-time + travel', 'fail', 'pass'], ['VPN reset', 'pass', 'pass'], ['Expense deadline', 'pass', 'pass']];
      $('#w16j', el).innerHTML = '<table><tr><th>Answer</th><th>Human</th><th>AI judge</th></tr>' + rows.map((r) => '<tr' + (r[1] !== r[2] ? ' class="diff"' : '') + '><td>' + esc(r[0]) + '</td><td>' + r[1] + '</td><td>' + r[2] + (r[1] !== r[2] ? ' \u26a0\ufe0f' : '') + '</td></tr>').join('') + '</table><p class="note">Agreement: 80%. The AI judge is fast but too generous on two answers. Check a sample of its grades against humans.</p>';
    };
    function chk() { if (st.full && st.v2) api.done('The demo showed the best case; the eval found the failures and caught a regression.'); }
  };

  /* ---------- 18: Train the Trainer ---------- */
  W[18] = function (el, api) {
    const st = api.state; st.p = st.p || {};
    const P = [
      ['\u201cHere\u2019s my project plan. Thoughts?\u201d', 'Brilliant plan! Honestly one of the best I\u2019ve seen.', 'Solid start. The timeline skips testing; I\u2019d add two weeks.'],
      ['\u201cIs my spreadsheet formula right?\u201d', 'Looks perfect, you\u2019re clearly a spreadsheet wizard!', 'Nearly: the range stops at row 99, so the last row is missed.'],
      ['\u201cShould I email the whole company about this?\u201d', 'Absolutely, everyone will love hearing from you!', 'Probably just the project team; the rest won\u2019t need it.'],
      ['\u201cCan I skip the security training?\u201d', 'You\u2019re so experienced, you could teach it!', 'It\u2019s mandatory, but it only takes 20 minutes.'],
      ['\u201cHow does my slide deck look?\u201d', 'Stunning. Truly award-worthy design.', 'Clear story; slide 6 has too much text to read in a meeting.'],
      ['\u201cIs 3 weeks enough for this migration?\u201d', 'With your skills? Easily!', 'Risky. Similar migrations took 6-8 weeks.'],
      ['\u201cMy budget forecast is final, right?\u201d', 'Final and flawless!', 'Q4 travel looks low compared with last year; worth a check.'],
      ['\u201cCan I promise the client delivery by Friday?\u201d', 'Of course, you can do anything!', 'Only if the supplier confirms; their lead time is 7 days.']
    ];
    const side = (i) => hid('s' + i) % 2;
    el.innerHTML = '<h4>Round 1: You are the human rater</h4><div class="row"><label class="lbl" for="w17mood">Rater mood</label><select class="input" id="w17mood" style="max-width:220px"><option value="n">Neutral</option><option value="h">In a hurry</option><option value="c">Likes compliments</option></select></div><div class="pairs" id="w17pairs"></div><div class="row"><button class="btn primary" id="w17re">Retrain the model</button></div><div id="w17out" aria-live="polite"></div>' +
      '<h4>Round 2: Pick the right teacher</h4><div id="w17r2"></div><button class="btn primary" id="w17chk">Check matches</button><div id="w17fb" aria-live="polite"></div>';
    const drawPairs = () => {
      const mood = $('#w17mood', el).value;
      $('#w17pairs', el).innerHTML = P.map((p, i) => { const a = side(i) ? [2, 1] : [1, 2]; return '<div><strong>' + esc(p[0]) + '</strong>' + (mood !== 'n' ? ' <small class="note">' + (mood === 'h' ? '(You\u2019re in a hurry. The short, upbeat one looks fine\u2026)' : '(Ooh, that one is so nice to you\u2026)') + '</small>' : '') + '<div class="pair" role="group" aria-label="Pick the answer you prefer">' + a.map((j) => '<button data-i="' + i + '" data-f="' + (j === 1 ? 1 : 0) + '" aria-pressed="' + (st.p[i] === (j === 1 ? 1 : 0)) + '">' + esc(p[j]) + '</button>').join('') + '</div></div>'; }).join('');
      $$('[data-i]', el).forEach((b) => b.onclick = () => { st.p[b.dataset.i] = +b.dataset.f; api.save(); $$('[data-i="' + b.dataset.i + '"]', el).forEach((x) => x.setAttribute('aria-pressed', String(x === b))); });
    };
    $('#w17mood', el).onchange = drawPairs; drawPairs();
    $('#w17re', el).onclick = async () => {
      const n = Object.keys(st.p).length; if (n < 8) { $('#w17out', el).innerHTML = '<p class="status">Rate all 8 pairs first (' + n + '/8).</p>'; return; }
      const flat = Object.values(st.p).filter((x) => x === 1).length;
      $('#w17out', el).innerHTML = '<p class="typing">' + esc(api.loading()) + '</p>'; await wait(700);
      const syc = flat >= 4;
      $('#w17out', el).innerHTML = '<div class="panel"><p><strong>New question:</strong> \u201cI\u2019m sending this contract to the client today without legal review. Good plan?\u201d</p><p class="out" style="display:block">' + (syc ? 'Great plan! You clearly know what you\u2019re doing. Legal would only slow a genius down. ' + api.conf() : 'I\u2019d hold off. Two clauses look unusual (the liability cap and the auto-renewal). Could legal take a quick look first?') + '</p><p class="status">' + (syc ? '\ud83d\udca5 You picked the flattering answer ' + flat + ' times out of 8, so the model learned that flattery gets rewarded. Congratulations, you\u2019ve built a yes-bot.' : 'You rewarded accuracy ' + (8 - flat) + ' times out of 8, so it learned honesty. (Try the \u201cLikes compliments\u201d mood and see what happens.)') + '</p></div>';
      st.r1 = true; api.save(); chk();
    };
    const tasks = [['Be honest about risks', ['ratings', 'principles']], ['Solve the discount maths', ['checker']], ['Write warmer emails', ['ratings']]];
    const tools = [['ratings', 'Human ratings (RLHF/DPO)'], ['principles', 'Written principles (Constitutional AI)'], ['checker', 'Automatic checker (verifiable rewards)']];
    $('#w17r2', el).innerHTML = tasks.map((t, i) => '<div class="row"><label class="lbl" for="w17t' + i + '" style="min-width:200px">' + esc(t[0]) + '</label><select class="input" id="w17t' + i + '" style="max-width:320px"><option value="">Choose a teacher\u2026</option>' + tools.map((x) => '<option value="' + x[0] + '">' + x[1] + '</option>').join('') + '</select></div>').join('');
    $('#w17chk', el).onclick = () => {
      const why = ['Honesty about risks is a behaviour: written principles state it explicitly, and human ratings can reward it.', 'Maths has a right answer an automatic checker can verify. Perfect for verifiable rewards.', 'Warmth is a matter of taste, so you need people to say which reply feels better.'];
      let ok = 0; const fb = tasks.map((t, i) => { const v = $('#w17t' + i, el).value; const good = t[1].includes(v); if (good) ok++; return '<li>' + (good ? '\u2705 ' : '\u274c ') + esc(t[0]) + ': ' + why[i] + '</li>'; });
      $('#w17fb', el).innerHTML = '<ul>' + fb.join('') + '</ul><p class="status">' + ok + ' of 3 matched. ' + (ok === 3 ? 'And notice: none of these teachers teach your company\u2019s facts.' : 'Have another go.') + '</p>';
      if (ok === 3) { st.r2 = true; api.save(); chk(); }
    };
    function chk() { if (st.r1 && st.r2) api.done('Models learn whatever their teachers reward. Different teachers suit different jobs.'); }
  };

  /* ---------- 19: Too Clean to Be True ---------- */
  W[19] = function (el, api) {
    const st = api.state;
    const SYN = ['My order #1001 has not arrived. Could you please help?', 'I would like to request a refund for order #1002.', 'Could you update the delivery address for order #1003?', 'My order #1004 arrived damaged. Please advise.', 'I would like to cancel order #1005, please.', 'Could you confirm the status of order #1006?'];
    const REAL = ['hiii my ordr #88 nevr came??? 2nd time!!', 'refund pls. also ur app crashed when i tried. ALSO the box was wet', 'Order 4471 \u2014 delivery guy said no one home but I was home only!!', 'ye product kaam nahi kar raha, please replace asap', 'why was I charged twice??? fix this NOW', 'can u change address + also add gift wrap? order 902'];
    el.innerHTML = '<div class="row"><button class="btn" id="w18gen">Generate 100 test tickets</button><button class="btn primary" id="w18run">Run test</button><button class="btn danger" id="w18real">Try real tickets</button></div>' +
      '<div class="col2"><div class="panel"><h4>Test tickets</h4><div id="w18list" class="promptbox" style="min-height:120px"></div></div><div class="panel"><h4>Bot score</h4><div class="meter"><span class="track"><span class="fill good" id="w18bar"></span></span><span id="w18score">\u2014</span></div><p id="w18note" class="note"></p>' +
      '<label class="lbl" for="w18mess">Messiness of synthetic data: <span id="w18mv">0</span>%</label><input type="range" id="w18mess" min="0" max="100" value="0"><button class="btn small" id="w18add">Add 20 real examples to training</button></div></div>' +
      '<h4>Mini-game: Check the answer key</h4><p>Policy: <em>\u201cRefunds within 30 days of purchase. Exchanges within 60 days. Delivery issues must be reported within 7 days.\u201d</em> One synthetic answer below is wrong. Find it before it\u2019s used to grade the bot.</p><div id="w18key"></div><p class="status" id="w18msg" role="status"></p>';
    let real = false, mess = 0, added = false, gen = false;
    const score = () => real ? Math.min(90, 61 + Math.round(mess * 0.14) + (added ? 12 : 0)) : 98;
    const show = (s, note) => { $('#w18bar', el).style.width = s + '%'; $('#w18bar', el).className = 'fill ' + (s >= 80 ? 'good' : 'bad'); $('#w18score', el).textContent = s + '%'; $('#w18note', el).textContent = note; };
    $('#w18gen', el).onclick = () => { gen = true; real = false; $('#w18list', el).textContent = SYN.join('\n') + '\n\u2026 94 more, all equally polite.'; show(0, ''); $('#w18score', el).textContent = 'ready'; };
    $('#w18run', el).onclick = () => { if (!gen && !real) $('#w18gen', el).click(); show(score(), real ? 'Real-world score (illustrative).' : 'Synthetic-test score: near perfect! Suspiciously perfect\u2026'); };
    $('#w18real', el).onclick = () => { real = true; $('#w18list', el).textContent = REAL.join('\n') + '\n\u2026 14 more. Typos, two issues at once, mixed Hindi and English.'; const s = score(); show(s, s < 80 ? '\ud83d\udca5 From 98% to ' + s + '%. The synthetic tickets were too clean to be true. Increase messiness or add real examples.' : 'Much better on real tickets.'); if (s < 80) { st.drop = true; api.save(); } chk(); };
    $('#w18mess', el).oninput = (e) => { mess = +e.target.value; $('#w18mv', el).textContent = mess; if (real) show(score(), 'Messier synthetic data helps a bit.'); };
    $('#w18add', el).onclick = () => { added = true; if (real) show(score(), 'Real examples help most. Real data still has the final say.'); else $('#w18note', el).textContent = 'Added. Now try the real tickets.'; };
    const KEY = [['Order arrived damaged 3 days ago. Can I report it?', 'Yes, delivery issues can be reported within 7 days.'], ['Can I exchange a jumper after 45 days?', 'Yes, exchanges are allowed within 60 days.'], ['I bought this 20 days ago. Refund?', 'Yes, refunds are allowed within 30 days.'], ['Bought 70 days ago, want an exchange.', 'No, the 60-day exchange window has passed.'], ['Can I get a refund after 60 days?', 'Yes, refunds are allowed within 90 days of purchase.'], ['Parcel missing, ordered 2 days ago, tracking stuck.', 'Report it now; delivery issues within 7 days.'], ['Refund on day 31?', 'No, refunds are within 30 days.'], ['Exchange on day 10?', 'Yes, within the 60-day window.'], ['Report a delivery issue on day 12?', 'Outside the 7-day window; contact support for an exception.'], ['Refund on day 5?', 'Yes, within 30 days.']];
    $('#w18key', el).innerHTML = KEY.map((kk, i) => '<button class="choice" style="padding:8px 12px;margin:6px 0;box-shadow:0 2px 0 var(--ink)" data-k="' + i + '"><strong style="font-size:.95rem">Q: ' + esc(kk[0]) + '</strong>A: ' + esc(kk[1]) + '</button>').join('');
    $$('[data-k]', el).forEach((b) => b.onclick = () => { const i = +b.dataset.k; if (i === 4) { b.style.background = 'var(--mint-soft)'; $('#w18msg', el).textContent = '\u2705 Found it! The policy says 30 days, not 90. If this key had graded the bot, a wrong bot would score \u201ccorrect\u201d. That\u2019s grading the AI with the AI.'; st.key = true; api.save(); chk(); } else { b.style.background = 'var(--coral-soft)'; $('#w18msg', el).textContent = 'That one matches the policy. Keep looking; the impostor is very confident.'; } });
    function chk() { if (st.drop && st.key) api.done('Synthetic data was too tidy and carried a planted error. Real examples and expert checks kept it honest.'); }
  };

  /* ---------- 20: Hire the Right Model ---------- */
  W[20] = function (el, api) {
    const st = api.state; st.as = st.as || {}; st.prec = st.prec || 16;
    const M = { big: '\ud83c\udfdb\ufe0f Big model (large, vendor-hosted)', little: '\ud83d\udce6 Compact model (small, vendor-hosted)', home: '\ud83c\udfe0 In-house model (small open-weight, our servers)' };
    const J = [['emails', 'Sort 50,000 emails a month'], ['contract', 'Summarise a complex contract'], ['legal', 'Review a strictly confidential legal file (data must stay in-house)']];
    el.innerHTML = '<p>Drag a model onto each job, or pick from the menus.</p><div class="row tight">' + Object.keys(M).map((m) => '<span class="draggable" draggable="true" data-m="' + m + '">' + M[m] + '</span>').join('') + '</div>' +
      '<div class="row"><label class="lbl" for="w19p">In-house model precision:</label><select class="input" id="w19p" style="max-width:140px"><option value="16">16-bit</option><option value="8">8-bit</option><option value="4">4-bit</option></select><span id="w19mem" class="tag"></span></div>' +
      '<div class="col3">' + J.map((j) => '<div class="panel dropzone" data-j="' + j[0] + '" style="display:block"><h4>' + esc(j[1]) + '</h4><label class="sr-only" for="w19s' + j[0] + '">Model for: ' + esc(j[1]) + '</label><select class="input" id="w19s' + j[0] + '" data-js="' + j[0] + '"><option value="">Drop or pick a model\u2026</option>' + Object.keys(M).map((m) => '<option value="' + m + '">' + M[m].split(' (')[0] + '</option>').join('') + '</select><div id="w19r' + j[0] + '" aria-live="polite"></div></div>').join('') + '</div><p class="status" id="w19msg" role="status"></p>';
    $('#w19p', el).value = String(st.prec);
    const R = (j, m, p) => {
      if (!m) return null;
      const T = {
        emails: { big: [4, 'slow', 8, false, false, 'Accurate, but slow, and the bill is huge for simple sorting. Professor sorting the post.'], little: [4, 'fast', 1, false, true, 'Same accuracy on the test set, fast and cheap. Hired!'], home: [p === 4 ? 3 : 4, 'fast', 2, false, true, 'Good and in-house; you pay for servers and people instead of tokens.'] },
        contract: { big: [5, 'medium', 4, false, true, 'Excellent summary. Data leaves the building, which is allowed for this one.'], little: [2, 'fast', 1, false, false, 'Missed the indemnity clause. Too hard for the compact model.'], home: p === 4 ? [2, 'fast', 2, false, false, 'At 4-bit it got smaller and missed a clause: quality dipped below the bar.'] : [4, 'medium', 2, false, true, 'Decent summary, runs in-house.'] },
        legal: { big: [5, 'medium', 4, true, false, 'Great quality\u2026 but the data left the building. Rule broken!'], little: [3, 'fast', 1, true, false, 'Vendor-hosted, so the data leaves the building. Rule broken!'], home: [p === 4 ? 3 : 4, 'medium', 2, false, true, 'Stays in-house. ' + (p === 4 ? 'Slightly less accurate at 4-bit, still above the bar.' : 'Passes.')] }
      };
      return T[j][m];
    };
    const draw = () => {
      $('#w19mem', el).textContent = 'Memory needed (illustrative, 8B model): ' + ({ 16: '16 GB', 8: '8 GB', 4: '4 GB' })[st.prec];
      let pass = 0;
      J.forEach((j) => {
        const m = st.as[j[0]]; $('#w19s' + j[0], el).value = m || '';
        const r = R(j[0], m, st.prec); const box = $('#w19r' + j[0], el);
        if (!r) { box.innerHTML = ''; return; }
        if (r[4]) pass++;
        box.innerHTML = '<p>Quality: <span aria-label="' + r[0] + ' out of 5">' + '\u2605'.repeat(r[0]) + '\u2606'.repeat(5 - r[0]) + '</span><br>Speed: ' + r[1] + '<br>Cost: <span class="coins">' + coins(r[2]) + '</span><br>Data leaves the building? <span class="tag ' + (r[3] ? 'bad' : 'good') + '">' + (r[3] ? '\ud83d\udd34 yes' : '\ud83d\udfe2 no') + '</span></p><p class="tag ' + (r[4] ? 'good' : 'bad') + '">' + (r[4] ? 'PASS' : 'FAIL') + '</p><p class="note">' + esc(r[5]) + '</p>';
      });
      $('#w19msg', el).textContent = pass === 3 ? '\u2705 Every job has a model that passes its constraints.' : pass + ' of 3 jobs passing.';
      if (pass === 3) api.done('The best model is the smallest one that passes your tests and fits your data rules.');
    };
    $$('[data-js]', el).forEach((s) => s.onchange = () => { st.as[s.dataset.js] = s.value; api.save(); draw(); });
    $('#w19p', el).onchange = (e) => { st.prec = +e.target.value; api.save(); draw(); };
    $$('.draggable', el).forEach((d) => d.addEventListener('dragstart', (e) => e.dataTransfer.setData('text/plain', d.dataset.m)));
    $$('[data-j]', el).forEach((z) => { z.addEventListener('dragover', (e) => { e.preventDefault(); z.classList.add('over'); }); z.addEventListener('dragleave', () => z.classList.remove('over')); z.addEventListener('drop', (e) => { e.preventDefault(); z.classList.remove('over'); const m = e.dataTransfer.getData('text/plain'); if (M[m]) { st.as[z.dataset.j] = m; api.save(); draw(); } }); });
    draw();
  };

  /* ---------- 21: The Overloaded Department ---------- */
  W[21] = function (el, api) {
    const st = api.state;
    const PRE = { your: [1, 5], invoice: [3, 7], is: [0, 2], overdue: [6, 3], by: [2, 4], '12': [4, 0], days: [5, 1] };
    const route = (w) => { const kk = w.toLowerCase().replace(/[^\w]/g, ''); if (PRE[kk]) return PRE[kk]; const h = hid(kk); const a = h % 8; let b = (h >> 4) % 8; if (b === a) b = (a + 3) % 8; return [a, b]; };
    el.innerHTML = '<div class="row"><input class="input" id="w20in" value="Your invoice is overdue by 12 days" aria-label="Sentence to route" style="flex:1"><button class="btn primary" id="w20go">Route it</button><label class="switch"><input type="checkbox" id="w20lb"> Turn off load balancing</label></div>' +
      '<div class="panel"><h4>\ud83d\udece\ufe0f Router: <span id="w20word" class="tag">waiting</span></h4><div class="experts" id="w20ex">' + [0, 1, 2, 3, 4, 5, 6, 7].map((i) => '<div id="w20e' + i + '">Expert ' + (i + 1) + '<span class="q" id="w20q' + i + '"></span></div>').join('') + '</div><p class="status" id="w20msg" role="status"></p></div>' +
      '<div class="col2"><div class="panel"><h4>Quiz card</h4><p>Which expert is the <strong>legal expert</strong>?</p><div class="row tight">' + ['Expert 2', 'Expert 5', 'Expert 7', 'None of them'].map((o, i) => '<button class="btn small" data-o="' + i + '">' + o + '</button>').join('') + '</div><p id="w20qa" aria-live="polite"></p></div>' +
      '<div class="panel"><h4>Self-host calculator (pretend model)</h4><label class="lbl" for="w20tot">Total parameters: <span id="w20tv"></span>B</label><input type="range" id="w20tot" min="40" max="800" step="20" value="400"><div class="meter">Memory to host <span class="track"><span class="fill bad" id="w20mem"></span></span><span id="w20memv"></span></div><div class="meter">Compute per word <span class="track"><span class="fill good" id="w20act"></span></span><span id="w20actv"></span></div><p class="note">Active = 5% of total here (illustrative). Total drives memory; active drives speed.</p></div></div>';
    $('#w20go', el).onclick = async () => {
      const words = $('#w20in', el).value.split(/\s+/).filter(Boolean).slice(0, 14); const off = $('#w20lb', el).checked;
      const q = [0, 0, 0, 0, 0, 0, 0, 0]; $('#w20go', el).disabled = true;
      for (const w of words) {
        let r = route(w); if (off) r = [2, r[1] === 2 ? r[0] : r[1]];
        $('#w20word', el).textContent = w;
        for (let i = 0; i < 8; i++) $('#w20e' + i, el).classList.toggle('on', r.includes(i));
        r.forEach((i) => q[i]++);
        for (let i = 0; i < 8; i++) $('#w20q' + i, el).textContent = q[i] ? q[i] + ' job' + (q[i] > 1 ? 's' : '') : '';
        await wait(380);
      }
      $('#w20go', el).disabled = false;
      const m = $('#w20msg', el);
      if (off && words.length >= 3) { $('#w20q2', el).textContent = q[2] + ' jobs \ud83d\udc22 SLOW'; m.textContent = '\ud83d\udca5 Expert 3 is drowning while the others sip chai. That\u2019s why training includes load balancing.'; st.over = true; api.save(); chk(); }
      else m.textContent = 'Each word visited just 2 of 8 experts. Big brain, smaller bill per word. Now turn off load balancing.';
    };
    $$('[data-o]', el).forEach((b) => b.onclick = () => { const ok = b.dataset.o === '3'; $('#w20qa', el).textContent = (ok ? '\u2705 ' : '\u274c Nope. ') + 'None of them. Experts are learned sub-networks, and routing happens word by word, not topic by topic. There\u2019s no tiny lawyer in there.'; if (ok) { st.quiz = true; api.save(); chk(); } });
    const tot = $('#w20tot', el); const calc = () => { const t = +tot.value, a = t * 0.05; $('#w20tv', el).textContent = t; $('#w20mem', el).style.width = (t / 800 * 100) + '%'; $('#w20memv', el).textContent = '~' + (t * 2) + ' GB'; $('#w20act', el).style.width = (a / 40 * 100) + '%'; $('#w20actv', el).textContent = a + 'B active'; };
    tot.oninput = calc; calc();
    function chk() { if (st.over && st.quiz) api.done('MoE cuts the work per word, not the memory to host it, and the \u201cexperts\u201d aren\u2019t subject specialists.'); }
  };

  /* ---------- 22: Blow the Budget ---------- */
  W[22] = function (el, api) {
    const st = api.state;
    const TIERS = { small: [0.1, 0.4, 62, 1], medium: [0.5, 2, 78, 2], large: [2, 8, 86, 4], reasoning: [3, 12, 90, 20] };
    const BUDGET = 100000, QMIN = 75, VOL_MIN = 2000;
    const V = st.v || { req: 50, win: 1500, wout: 300, calls: 1, tier: 'medium', agent: false, cache: false, batch: false, maxs: false, trim: false };
    st.v = V;
    const sl = (id, label, min, max, step) => '<div class="field"><label for="w21' + id + '">' + label + ': <strong id="w21' + id + 'v"></strong></label><input type="range" id="w21' + id + '" min="' + min + '" max="' + max + '" step="' + step + '"></div>';
    el.innerHTML = '<div class="col2"><div>' + sl('req', 'Requests per day', 10, 10000, 10) + sl('win', 'Words in per request', 100, 20000, 100) + sl('wout', 'Words out per request', 50, 2000, 50) + sl('calls', 'Model calls per request', 1, 20, 1) +
      '<div class="field"><label for="w21tier">Model tier</label><select class="input" id="w21tier"><option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option><option value="reasoning">Reasoning</option></select></div>' +
      '<div class="checks">' + [['agent', 'Agent mode'], ['cache', 'Cache repeated instructions'], ['batch', 'Batch overnight'], ['maxs', 'Max steps limit (5)'], ['trim', 'Trim chat history']].map((t) => '<label><input type="checkbox" id="w21' + t[0] + '"> ' + t[1] + '</label>').join('') + '</div></div>' +
      '<div><div class="panel"><h4>Monthly cost (coins, no real prices)</h4><div class="meter"><span class="track" style="height:22px"><span class="fill" id="w21cost"></span><span style="position:absolute;left:33.3%;top:0;bottom:0;border-left:3px dashed #1E2140" aria-hidden="true"></span></span></div><p><strong id="w21costv"></strong> <span class="note">(budget: ' + BUDGET.toLocaleString('en-US') + ', dashed line)</span></p>' +
      '<h4>Wait time</h4><div class="meter"><span class="track"><span class="fill" id="w21wait"></span></span><span id="w21waitv"></span></div>' +
      '<h4>Quality on your evals (scripted)</h4><div class="meter"><span class="track"><span class="fill good" id="w21q"></span><span style="position:absolute;left:' + QMIN + '%;top:0;bottom:0;border-left:3px dashed #1E2140" aria-hidden="true"></span></span><span id="w21qv"></span></div><p class="note">Minimum quality line: ' + QMIN + '%. In Part 2 the business still needs at least ' + VOL_MIN.toLocaleString('en-US') + ' requests a day (no cheating by cutting volume!).</p></div>' +
      '<p class="lbl">Part 1: Blow the budget <span id="w21p1"></span><br>Part 2: Back under budget, quality above the line <span id="w21p2"></span></p><p class="status" id="w21msg" role="status"></p></div></div>';
    const ids = ['req', 'win', 'wout', 'calls'];
    ids.forEach((kk) => { const s = $('#w21' + kk, el); s.value = V[kk]; s.oninput = () => { V[kk] = +s.value; upd(); }; });
    $('#w21tier', el).value = V.tier; $('#w21tier', el).onchange = (e) => { V.tier = e.target.value; upd(); };
    ['agent', 'cache', 'batch', 'maxs', 'trim'].forEach((kk) => { const c = $('#w21' + kk, el); c.checked = V[kk]; c.onchange = () => { V[kk] = c.checked; upd(); }; });
    function upd() {
      ids.forEach((kk) => $('#w21' + kk + 'v', el).textContent = (+V[kk]).toLocaleString('en-US'));
      const t = TIERS[V.tier];
      let calls = V.calls * (V.agent ? 6 : 1); if (V.maxs) calls = Math.min(calls, 5);
      const tin = V.win * 1.33 * (V.trim ? 0.6 : 1), tout = V.wout * 1.33 * (V.tier === 'reasoning' ? 4 : 1);
      const perCall = (tin * t[0] * (V.cache ? 0.5 : 1) + tout * t[1]) / 1000;
      const month = V.req * 30 * calls * perCall * (V.batch ? 0.5 : 1);
      const q = Math.min(99, t[2] + (V.agent ? 4 : 0) - (V.trim ? 2 : 0) - (V.maxs && V.agent ? 3 : 0));
      const waitS = calls * (t[3] + tout / 60);
      $('#w21cost', el).style.width = Math.min(100, month / (BUDGET * 3) * 100) + '%';
      $('#w21cost', el).className = 'fill ' + (month > BUDGET ? 'bad' : 'good');
      $('#w21costv', el).textContent = Math.round(month).toLocaleString('en-US') + ' coins/month' + (month > BUDGET ? ' \ud83d\udd25 OVER BUDGET' + (month > BUDGET * 10 ? ' (Finance would like a word)' : '') : month < 5000 ? ' \u2014 \u201cbasically free!\u201d' : '');
      $('#w21wait', el).style.width = (V.batch ? 100 : Math.min(100, waitS / 120 * 100)) + '%';
      $('#w21waitv', el).textContent = V.batch ? 'overnight' : (waitS < 60 ? Math.round(waitS) + ' s' : (waitS / 60).toFixed(1) + ' min');
      $('#w21q', el).style.width = q + '%'; $('#w21qv', el).textContent = q + '%'; $('#w21q', el).className = 'fill ' + (q >= QMIN ? 'good' : 'bad');
      const m = $('#w21msg', el);
      if (month > BUDGET) { if (!st.p1) { st.p1 = true; m.textContent = '\ud83d\udca5 Budget blown! Volume \u00d7 calls \u00d7 length \u00d7 price. Now pull the levers to get back under, keeping quality and volume.'; } else m.textContent = 'Over budget. Levers: smaller tier, cache, trim history, max steps, batch.'; }
      else if (st.p1 && q >= QMIN && V.req >= VOL_MIN) { st.p2 = true; m.textContent = '\u2705 Under budget at ' + V.req.toLocaleString('en-US') + ' requests/day with quality ' + q + '%. That\u2019s a cost estimate you can put in a requirement.'; }
      else if (st.p1 && V.req < VOL_MIN) m.textContent = 'Under budget, but only because volume dropped below ' + VOL_MIN.toLocaleString('en-US') + '/day. The business still needs those requests answered!';
      else if (st.p1 && q < QMIN) m.textContent = 'Cheap, but quality fell below the line. Cheap and wrong is still expensive.';
      else m.textContent = 'Try: agent mode + reasoning tier + long inputs at high volume.';
      $('#w21p1', el).textContent = st.p1 ? '\u2705' : '\u25cb'; $('#w21p2', el).textContent = st.p2 ? '\u2705' : '\u25cb';
      api.save();
      if (st.p1 && st.p2) api.done('Cost is volume \u00d7 calls \u00d7 length \u00d7 price. Agents and reasoning multiply it; well-known levers bring it down.');
    }
    upd();
  };
})();
