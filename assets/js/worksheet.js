/* Requirement Framing Worksheet: fillable, autosaved in localStorage, printable, copyable, downloadable. */
(function () {
  'use strict';
  const C = window.COURSE;
  const A = () => window.App;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const T = (k, l, ph) => ({ k, t: 'text', l, ph }), TA = (k, l, ph) => ({ k, t: 'ta', l, ph }), R = (k, l, o) => ({ k, t: 'radio', l, o }), CH = (k, l, o) => ({ k, t: 'checks', l, o });
  const SECTIONS = [
    { n: 1, title: 'The problem (in one paragraph)', f: [TA('s1_request', 'The request as received (optional)', 'e.g. \u201cWe want an AI that knows all our HR stuff\u201d'), TA('s1_task', 'What task are people doing today?'), TA('s1_pain', 'What\u2019s painful about it? (time, errors, waiting, volume)'), TA('s1_better', 'What would \u201cbetter\u201d look like?'), T('s1_owner', 'Who owns this use case? (one named person)', 'e.g. Head of HR Operations')] },
    { n: 2, title: 'What the system must know', f: [TA('s2_know', 'Knowledge needed: topics/questions it must handle'), TA('s2_out', 'Out of scope: what it must not try to answer'), R('s2_type', 'General knowledge (the model may know it) or company knowledge (it can\u2019t know unless supplied)?', ['General', 'Company', 'Both'])] },
    { n: 3, title: 'Where that knowledge lives', table: true, f: [0, 1, 2].map((i) => ({ k: 's3_r' + i, t: 'row' })) },
    { n: 4, title: 'How fresh it must be', f: [R('s4_change', 'How often does this information change?', ['Rarely', 'Monthly', 'Weekly', 'Daily', 'Real-time']), T('s4_speed', 'How quickly must changes show up in answers?'), T('s4_retire', 'Who retires old versions?')] },
    { n: 5, title: 'What a wrong answer costs', note: 'Rule of thumb: the higher the cost and the harder it is to spot, the more you need citations, human review, narrow scope and strong evals.', f: [TA('s5_example', 'Example of a wrong answer'), CH('s5_impact', 'Impact', ['Mild annoyance', 'Wasted time', 'Money lost', 'Legal / compliance exposure', 'Safety or wellbeing']), R('s5_catch', 'Who catches it?', ['The user can easily spot it', 'An expert reviewer', 'Nobody, until later'])] },
    { n: 6, title: 'Who uses it and how', f: [T('s6_users', 'Users (role, number, tech comfort)'), CH('s6_where', 'Where', ['Chat in Teams/Slack', 'Inside an existing system', 'Email', 'Web page', 'Other']), T('s6_input', 'Typical input (a question, a document upload, a form)'), T('s6_output', 'Expected output (an answer with source, a filled table, a draft email)'), TA('s6_actions', 'Actions it may take, each marked Read only / Draft for human approval / Automatic', 'e.g. Look up leave balance: Read only. Draft leave request: Draft for approval.')] },
    { n: 7, title: 'Which approach fits', approach: true, f: [CH('s7_approach', 'Chosen approach', ['Plain prompt', 'RAG', 'Agent / agentic RAG', 'Fine-tune (in addition)']), TA('s7_why', 'Why')] },
    { n: 8, title: 'How success will be measured (evals)', f: [T('s8_testset', 'Test set: how many real example questions/tasks, and who writes the correct answers?'), T('s8_correct', 'What counts as correct? (right fact, right source, right format, refuses when it should)'), T('s8_target', 'Target before launch (agree a number with the owner; there\u2019s no universal standard)'), CH('s8_judge', 'Who judges?', ['Subject-matter experts', 'Automated checks', 'AI judge checked by humans']), T('s8_after', 'After launch: how will you collect feedback and re-test after changes?')] },
    { n: 9, title: 'Risks and guardrails', f: [CH('s9_risks', 'Risks that apply', ['Hallucination \u2192 citations, \u201cI don\u2019t know\u201d behaviour', 'Prompt injection \u2192 limit tools, human approval', 'Sensitive topics', 'Over-reliance (users stop checking)', 'Fallback when it\u2019s down or unsure']), T('s9_sensitive', 'Sensitive topics: what must it refuse or escalate?'), T('s9_fallback', 'Fallback: what happens when it\u2019s down or unsure?')] },
    { n: 10, title: 'Data and privacy constraints', f: [CH('s10_data', 'Data involved', ['Public', 'Internal', 'Confidential', 'Personal data', 'Special category (health, etc.)']), R('s10_leave', 'Can it leave our environment?', ['Yes, approved vendor', 'Only to specific regions', 'No, must stay on-prem/private']), T('s10_who', 'Who may see which answers? (must match existing document permissions)'), T('s10_retention', 'Retention: how long are prompts and answers logged, and who can read the logs?')] },
    { n: 11, title: 'Rough cost and latency expectations', note: 'Remember: agents and reasoning models cost more and take longer per task than plain RAG (optional Steps 14 and 22).', f: [T('s11_volume', 'Volume: about how many requests per day/week?'), R('s11_wait', 'Acceptable wait', ['Instant (a few seconds)', 'Under a minute', 'Minutes are fine (background job)']), T('s11_value', 'Value per task: roughly how much time or money does one good answer save?'), R('s11_budget', 'Budget appetite', ['Pilot only', 'Small ongoing', 'Significant'])] },
    { n: 12, title: 'Open questions', f: [T('s12_q1', 'Open question 1'), T('s12_q2', 'Open question 2'), T('s12_q3', 'Open question 3')] },
    { n: 13, title: 'Upgrade notes (fill in after the optional steps)', f: [T('s13_u1', 'What I changed, and why (1)'), T('s13_u2', 'What I changed, and why (2)'), T('s13_u3', 'What I changed, and why (3)')] }
  ];
  const COLS = [['src', 'Source'], ['fmt', 'Format'], ['own', 'Owner'], ['q', 'Quality'], ['acc', 'Access restrictions']];
  const FMT = ['', 'PDF', 'Wiki', 'Database', 'Spreadsheet', 'Scanned', 'Other'], QUAL = ['', 'Current', 'Some outdated', 'Messy'];
  const ws = () => A().S().ws;
  const val = (k) => ws()[k];
  const filled = (v) => Array.isArray(v) ? v.length > 0 : (v != null && String(v).trim() !== '');
  function fieldKeys(sec) { if (sec.table) { const ks = []; [0, 1, 2].forEach((i) => COLS.forEach((c) => ks.push('s3_r' + i + '_' + c[0]))); return ks; } return sec.f.map((f) => f.k); }
  function secDone(sec, data) { data = data || ws(); const ks = fieldKeys(sec); const n = ks.filter((k) => filled(data[k])).length; return n >= Math.min(2, sec.table ? 2 : ks.length); }
  function doneCount(data) { return SECTIONS.filter((s) => secDone(s, data)).length; }

  function fieldHTML(f) {
    const v = val(f.k), id = 'f_' + f.k;
    if (f.t === 'text') return '<div class="field"><label for="' + id + '">' + esc(f.l) + '</label><input class="input" id="' + id + '" data-k="' + f.k + '" value="' + esc(v || '') + '" placeholder="' + esc(f.ph || '') + '"></div>';
    if (f.t === 'ta') return '<div class="field"><label for="' + id + '">' + esc(f.l) + '</label><textarea class="input" id="' + id + '" data-k="' + f.k + '" placeholder="' + esc(f.ph || '') + '">' + esc(v || '') + '</textarea></div>';
    if (f.t === 'radio' || f.t === 'checks') {
      const type = f.t === 'radio' ? 'radio' : 'checkbox';
      return '<fieldset class="field" style="border:0;padding:0"><legend class="lbl">' + esc(f.l) + '</legend><div class="checks">' + f.o.map((o) => { const on = type === 'radio' ? v === o : Array.isArray(v) && v.includes(o); return '<label><input type="' + type + '" name="' + id + '" data-k="' + f.k + '" value="' + esc(o) + '"' + (on ? ' checked' : '') + '> ' + esc(o) + '</label>'; }).join('') + '</div></fieldset>';
    }
    return '';
  }
  function tableHTML() {
    const opt = (arr, v) => arr.map((o) => '<option' + (o === v ? ' selected' : '') + ' value="' + esc(o) + '">' + (o || '\u2014') + '</option>').join('');
    return '<div class="table-wrap"><table class="src-table"><thead><tr>' + COLS.map((c) => '<th scope="col">' + c[1] + '</th>').join('') + '</tr></thead><tbody>' + [0, 1, 2].map((i) => '<tr>' + COLS.map((c) => { const k = 's3_r' + i + '_' + c[0], v = val(k) || '', lab = c[1] + ', row ' + (i + 1); return '<td>' + (c[0] === 'fmt' ? '<select data-k="' + k + '" aria-label="' + lab + '">' + opt(FMT, v) + '</select>' : c[0] === 'q' ? '<select data-k="' + k + '" aria-label="' + lab + '">' + opt(QUAL, v) + '</select>' : '<input data-k="' + k + '" aria-label="' + lab + '" value="' + esc(v) + '">') + '</td>'; }).join('') + '</tr>').join('') + '</tbody></table></div><p class="note">Tip from Step 11: add metadata in \u201cAccess\u201d or \u201cOwner\u201d, like date, status and country.</p>';
  }
  function approachHTML() {
    return '<div class="approach-q" id="apq" aria-live="polite"></div><details style="margin-top:8px"><summary>See the full decision flow</summary><div class="vis"><img class="diagram" src="assets/diagrams/diagram5.svg" alt="Decision flow: if the task needs company-specific or recent information and it is in searchable documents, use RAG, or an agent if it needs several steps or actions; if not searchable, get the knowledge written down first; if not company-specific, use a plain prompt. If still inconsistent in format for a narrow high-volume task, consider fine-tuning for behaviour, not facts." loading="lazy"></div></details>';
  }
  const FLOW = {
    q1: { q: 'Does it need company-specific or recent information?', a: [['Yes', 'q2'], ['No', 'P']] },
    q2: { q: 'Is the information in documents or data we can search?', a: [['Yes', 'q3'], ['No', 'FIX']] },
    q3: { q: 'Does it need several steps, multiple systems, or to take actions?', a: [['Yes', 'AG'], ['No', 'RAG']] },
    q4: { q: 'Still inconsistent in format or style after good prompting?', a: [['Yes, and it\u2019s a narrow, high-volume task', 'FT'], ['No', 'DONE']] }
  };
  const RES = { P: ['Plain prompt', 'Plain prompt with good instructions (and maybe examples).'], RAG: ['RAG', 'RAG: search, paste sources, answer with citations.'], AG: ['Agent / agentic RAG', 'Agent / agentic RAG with scoped tools and human approval for actions.'], FIX: [null, 'Stop: get the knowledge written down or the data connected first. (Honestly the most useful answer a worksheet can give.)'] };
  function runApproach(root) {
    const box = root.querySelector('#apq'); if (!box) return;
    let base = null;
    const show = (node) => {
      if (FLOW[node]) { const f = FLOW[node]; box.innerHTML = '<p class="lbl">\ud83e\udded Approach finder</p><p><strong>' + esc(f.q) + '</strong></p><div class="row">' + f.a.map((a, i) => '<button class="btn small" data-go="' + a[1] + '">' + esc(a[0]) + '</button>').join('') + '</div>'; }
      else if (node === 'FT' || node === 'DONE') {
        const r = RES[base]; box.innerHTML = '<p class="lbl">\ud83e\udded Recommendation</p><p><strong>' + esc(r[1]) + '</strong>' + (node === 'FT' ? ' <strong>Plus:</strong> consider fine-tuning for behaviour/format (not facts).' : ' Keep it simple.') + '</p><div class="row"><button class="btn small primary" id="apUse">Use this in my worksheet</button><button class="btn small" data-go="q1">Start again</button></div>';
        box.querySelector('#apUse').onclick = () => { const v = [r[0]]; if (node === 'FT') v.push('Fine-tune (in addition)'); set('s7_approach', v); root.querySelectorAll('[data-k="s7_approach"]').forEach((c) => c.checked = v.includes(c.value)); A().toast('Approach saved to Section 7.'); };
      } else if (node === 'FIX') { box.innerHTML = '<p class="lbl">\ud83e\udded Recommendation</p><p><strong>' + esc(RES.FIX[1]) + '</strong></p><button class="btn small" data-go="q1">Start again</button>'; }
      else { base = node; show('q4'); return; }
      box.querySelectorAll('[data-go]').forEach((b) => b.onclick = () => show(b.dataset.go));
    };
    show('q1');
  }
  function set(k, v) {
    const S = A().S(); S.ws[k] = v; A().save();
    if (S.w[9] && S.w[9].rewrite && !S.challenge[9] && filled(v)) { S.challenge[9] = true; A().save(); A().toast('\ud83c\udf89 Fantasy Detector complete: you turned a fantasy into a real worksheet. Step 9\u2019s challenge is done.', 4500); }
  }
  function bind(root, onChange) {
    root.querySelectorAll('[data-k]').forEach((inp) => {
      const k = inp.dataset.k;
      const h = () => {
        if (inp.type === 'checkbox') { const v = Array.from(root.querySelectorAll('[data-k="' + k + '"]')).filter((x) => x.checked).map((x) => x.value); set(k, v); }
        else if (inp.type === 'radio') { if (inp.checked) set(k, inp.value); }
        else set(k, inp.value);
        if (onChange) onChange(k);
      };
      inp.addEventListener(inp.tagName === 'SELECT' || inp.type === 'checkbox' || inp.type === 'radio' ? 'change' : 'input', h);
    });
  }
  function ring(n) { const p = n / 13, r = 34, c = 2 * Math.PI * r; return '<svg class="ring" viewBox="0 0 84 84" role="img" aria-label="' + n + ' of 13 sections done"><circle cx="42" cy="42" r="' + r + '" fill="none" stroke="#EDE6DA" stroke-width="10"/><circle cx="42" cy="42" r="' + r + '" fill="none" stroke="#5A3FD1" stroke-width="10" stroke-linecap="round" stroke-dasharray="' + (c * p) + ' ' + c + '" transform="rotate(-90 42 42)"/><text x="42" y="47" text-anchor="middle" font-size="16" font-weight="800" fill="#1E2140">' + n + '/13</text></svg>'; }
  function formHTML(hl) {
    return SECTIONS.map((s) => '<section class="card ws-sec' + (hl.includes(s.n) ? ' hl' : '') + '" id="ws' + s.n + '" aria-labelledby="wsh' + s.n + '"><h3 id="wsh' + s.n + '">Section ' + s.n + ': ' + esc(s.title) + ' <span class="ok tag ' + (secDone(s) ? 'good' : '') + '" id="wsok' + s.n + '">' + (secDone(s) ? '\u2713 done' : 'to do') + '</span></h3>' + (s.n === 13 ? '<p class="note">Come back here after Steps 10-22. Note what you changed and why.</p>' : '') + (s.table ? tableHTML() : '') + (s.approach ? approachHTML() : '') + s.f.filter((f) => f.t !== 'row').map(fieldHTML).join('') + (s.note ? '<p class="note">' + esc(s.note) + '</p>' : '') + '</section>').join('');
  }
  function refreshStatus(root) {
    SECTIONS.forEach((s) => { const el = root.querySelector('#wsok' + s.n); if (el) { const d = secDone(s); el.textContent = d ? '\u2713 done' : 'to do'; el.className = 'ok tag ' + (d ? 'good' : ''); } });
    const r = root.querySelector('#wsRing'); if (r) r.innerHTML = ring(doneCount());
    const sv = root.querySelector('#wsSaved'); if (sv) { sv.textContent = '\u2713 Saved in this browser ' + new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); }
  }
  // ---- export
  function displayVal(k, data) { const v = data[k]; return Array.isArray(v) ? v.join('; ') : (v || ''); }
  function asText(data) {
    data = data || ws(); const L = ['REQUIREMENT FRAMING WORKSHEET', window.SITE_CONFIG.name, 'Exported ' + new Date().toLocaleString(), ''];
    SECTIONS.forEach((s) => {
      L.push('SECTION ' + s.n + ': ' + s.title.toUpperCase());
      if (s.table) { [0, 1, 2].forEach((i) => { const row = COLS.map((c) => c[1] + ': ' + (data['s3_r' + i + '_' + c[0]] || '\u2014')).join(' | '); if (COLS.some((c) => data['s3_r' + i + '_' + c[0]])) L.push('- ' + row); }); }
      s.f.filter((f) => f.t !== 'row').forEach((f) => L.push('- ' + f.l + ': ' + (displayVal(f.k, data) || '\u2014')));
      L.push('');
    });
    L.push('Nothing in this worksheet was sent anywhere. It was saved only in your browser.');
    return L.join('\n');
  }
  function copyText() {
    const t = asText();
    const fallback = () => { const ta = document.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); A().toast('Copied! Paste it into a ticket or email.'); } catch (e) { A().toast('Copy failed. Use Download instead.'); } ta.remove(); };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(t).then(() => A().toast('Copied! Paste it into a ticket or email.'), fallback); else fallback();
  }
  function download() {
    const blob = new Blob([asText()], { type: 'text/plain;charset=utf-8' }); const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'requirement-worksheet.txt'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    A().toast('Downloaded requirement-worksheet.txt');
  }
  function printIt() {
    const d = ws(); const pa = document.getElementById('printArea');
    pa.innerHTML = '<h1>Requirement Framing Worksheet</h1><p>' + esc(window.SITE_CONFIG.name) + ' \u00b7 printed ' + esc(new Date().toLocaleDateString()) + '</p>' + SECTIONS.map((s) => '<h2>' + s.n + '. ' + esc(s.title) + '</h2>' + (s.table ? [0, 1, 2].filter((i) => COLS.some((c) => d['s3_r' + i + '_' + c[0]])).map((i) => '<div class="pa-row">\u2022 ' + COLS.map((c) => '<span class="pa-k">' + c[1] + ':</span> ' + esc(d['s3_r' + i + '_' + c[0]] || '\u2014')).join(' \u00b7 ') + '</div>').join('') : '') + s.f.filter((f) => f.t !== 'row').map((f) => '<div class="pa-row"><span class="pa-k">' + esc(f.l) + ':</span> ' + esc(displayVal(f.k, d) || '\u2014') + '</div>').join('')).join('');
    window.print();
  }
  function actionsHTML() { return '<div class="row"><button class="btn primary" data-act="print">\ud83d\udda8\ufe0f Print / Save as PDF</button><button class="btn" data-act="copy">\ud83d\udccb Copy as text</button><button class="btn" data-act="dl">\u2b07\ufe0f Download as text file</button><span class="saved" id="wsSaved" aria-live="polite"></span></div>'; }
  function bindActions(root) { root.querySelectorAll('[data-act]').forEach((b) => b.onclick = () => ({ print: printIt, copy: copyText, dl: download })[b.dataset.act]()); }

  function renderPage(main, opts) {
    const hl = (opts && opts.highlight) || [];
    main.innerHTML = '<div class="ws-top"><div id="wsRing">' + ring(doneCount()) + '</div><div><h1>\ud83d\udcdd Requirement Framing Worksheet</h1><p class="concept">Fill in one worksheet per use case. If a section feels hard, write down the open question; that\u2019s still progress.</p></div></div>' +
      '<p class="privacy">\ud83d\udd12 Answers save automatically in this browser only. Nothing is sent anywhere, because there is no server. It will be waiting for you after the optional steps.</p>' + actionsHTML() +
      (hl.length ? '<p class="ws-update">\u2728 Highlighted for you: Sections ' + hl.join(', ') + '.</p>' : '') +
      '<details class="card"><summary><strong>\ud83d\udc40 Peek at a worked example: HR Policy Assistant</strong></summary>' + C.workedExample + '</details>' +
      '<details class="card"><summary><strong>\ud83e\udd84 Fantasy vs realistic: a rewrite</strong></summary>' + C.fantasyRewrite + '</details>' +
      formHTML(hl) + actionsHTML() + '<p class="note">Your GPT has reviewed your worksheet and says: \u201cregards\u201d. We\u2019ll take that as approval.</p>';
    bind(main, () => refreshStatus(main)); bindActions(main); runApproach(main);
    if (hl.length) setTimeout(() => { const el = main.querySelector('#ws' + hl[0]); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 120);
  }

  function renderUpgrade(main) {
    const U = C.upgrade, S = A().S();
    const doneStep = (n) => !!(S.done[n] || S.visited[n]);
    main.innerHTML = '<div class="step-head">' + window.partSVG('bench', 84) + '<div><div class="chips"><span class="chip opt">After Step 22 \u00b7 also reachable any time</span><span class="chip time">\u23f1 ~10-20 minutes</span></div><h1>\u2b50 Back to the Worksheet: revisit and upgrade</h1></div></div>' +
      '<div class="card hook"><span class="section-label">Hook</span><div>' + U.hook + '<span class="quip">Your requirement is about to have its own growth spurt. Fewer \u201cregards\u201d, more evals.</span></div></div>' +
      '<div class="card"><span class="section-label">What you see</span> ' + A().illus() + '<div class="ba" style="margin-top:10px"><div class="before"><h4>' + U.see.head[0] + '</h4><div>' + U.see.before + '</div></div><div class="after"><h4>' + U.see.head[1] + '</h4><div>' + A().linkSteps(U.see.after) + '</div></div></div></div>' +
      actionsHTML() + '<div class="row"><label class="switch"><input type="checkbox" id="cmpT"> Compare with my graduation version</label></div><div id="cmpBox"></div>' +
      '<div class="split"><div id="upForm">' + formHTML([]) + '</div><aside class="sticky card" aria-labelledby="clH"><h2 id="clH">Upgrade checklist</h2><p class="note">Steps you\u2019ve done are active; tap one to jump to its worksheet sections. Skipped steps are greyed out.</p><ol class="checklist" style="padding-left:0;list-style:none">' +
      C.checklist.map((c) => '<li class="' + (doneStep(c.step) ? '' : 'skipped') + '"><button type="button" data-sec="' + c.sections.join(',') + '"' + (doneStep(c.step) ? '' : ' aria-disabled="true"') + '><strong>' + c.step + ' ' + esc(c.label) + '</strong><br>' + c.ask + '<br><small>Sections ' + c.sections.join(', ') + '</small></button>' + (doneStep(c.step) ? '' : ' <a href="#/step/' + c.step + '">Do this step</a>') + '</li>').join('') + '</ol></aside></div>' +
      '<div class="card sowhat"><h2>\ud83d\udccc So what for your requirement?</h2><ul>' + U.sowhat.map((x) => '<li>' + x + '</li>').join('') + '</ul></div>' +
      '<div class="card" style="text-align:center">' + window.partSVG('flag', 96) + '<p style="font-size:1.15rem">' + U.finale + '</p><p class="note">Final words from your GPT: \u201cKind regards.\u201d (Just the one this time. That\u2019s fine-tuning.)</p><div class="row" style="justify-content:center"><a class="btn" href="#/summary">See my progress</a><a class="btn" href="#/welcome">Back to the start</a></div></div>';
    const form = main.querySelector('#upForm');
    bind(form, () => { refreshStatus(main); if (main.querySelector('#cmpT').checked) cmp(); }); bindActions(main); runApproach(form);
    main.querySelectorAll('[data-sec]').forEach((b) => b.onclick = () => {
      if (b.getAttribute('aria-disabled') === 'true') { A().toast('Do that step first (or read it) and it\u2019ll unlock here.'); return; }
      const secs = b.dataset.sec.split(',').map(Number); form.querySelectorAll('.ws-sec').forEach((s) => s.classList.remove('hl'));
      secs.forEach((n) => { const s = form.querySelector('#ws' + n); if (s) s.classList.add('hl'); });
      const first = form.querySelector('#ws' + secs[0]); if (first) { first.scrollIntoView({ behavior: 'smooth', block: 'start' }); const f = first.querySelector('input,textarea,select'); if (f) setTimeout(() => f.focus({ preventScroll: true }), 400); }
    });
    const cmp = () => {
      const box = main.querySelector('#cmpBox'), g = S.wsGrad, cur = S.ws;
      if (!g) { box.innerHTML = '<p class="note">Your graduation version is saved automatically when you reach the Fork after Step 9. Visit it once and come back.</p>'; return; }
      let rows = '';
      SECTIONS.forEach((s) => fieldKeys(s).forEach((k) => {
        const f = s.f.find((x) => x.k === k); const label = f ? f.l : 'Sources table (' + k.replace('s3_', '') + ')';
        const a = displayVal(k, g), b = displayVal(k, cur); if (!a && !b) return;
        rows += '<div class="' + (a !== b ? 'diff' : '') + '" style="grid-column:1/-1;font-weight:700;background:none;border:0;padding:4px 0 0">' + s.n + '. ' + esc(label) + (a !== b ? ' \u270f\ufe0f changed' : '') + '</div><div' + (a !== b ? ' class="diff"' : '') + '>' + esc(a || '\u2014') + '</div><div' + (a !== b ? ' class="diff"' : '') + '>' + esc(b || '\u2014') + '</div>';
      }));
      box.innerHTML = '<div class="card"><h3>Graduation version vs now</h3><div class="cmp"><div style="font-weight:800;background:none;border:0">At graduation</div><div style="font-weight:800;background:none;border:0">Now</div>' + (rows || '<div>Nothing filled in yet.</div>') + '</div></div>';
    };
    main.querySelector('#cmpT').onchange = (e) => { if (e.target.checked) cmp(); else main.querySelector('#cmpBox').innerHTML = ''; };
  }

  window.WS = {
    renderPage, renderUpgrade, asText,
    prefill(text) { const S = A().S(); if (!S.ws.s1_request || confirm('Replace the request in Section 1 with this one?')) { S.ws.s1_request = text; A().save(); } },
    progressText() { const n = doneCount(); return n ? n + ' of 13 sections done. Nice. Your GPT is impressed (it\u2019s easily impressed).' : 'Not started yet. It saves automatically in this browser as you type.'; }
  };
})();
