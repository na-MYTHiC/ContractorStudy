/* Study sessions (question by question) and Practice Tests (answers at the end): setup, run engine with time
   allotments, pause/resume, end early with results, leftovers saved for a new session, daily challenge,
   challenge codes, and the results screen. */
(function () {
  "use strict";
  var A = window.FBF, esc = A.esc, icon = A.icon, L = A.L, st = A.st, S = function () { return A.S; };

  /* ---------------------------------------------------------------- run lifecycle */
  A.getRun = function (id) { id = id || st.runId; return S().runs.filter(function (r) { return r.id === id; })[0] || null; };
  A.openRuns = function (kind) { return S().runs.filter(function (r) { return !kind || (kind === "study" ? r.mode === "study" : r.mode !== "study"); }); };

  A.newRun = function (o) {
    if (!o.ids || !o.ids.length) { A.toast("No questions match that. Try a different filter.", "info"); return; }
    var r = o.seed != null ? A.rng(o.seed ^ 0x9e3779b9) : null, order = {};
    o.ids.forEach(function (id) { order[id] = A.optOrder(A.QBY[id], o.shuffle == null ? S().settings.shuffle : o.shuffle, r); });
    var run = {
      id: A.uid(), mode: o.mode, title: o.title, ids: o.ids.slice(), order: order, picks: {}, flags: {}, hints: {}, guess: {}, qms: {}, xpQ: {},
      i: 0, limit: o.limit || 0, elapsed: 0, status: "active", created: Date.now(), from: o.from || (o.mode === "study" ? "study" : "test"),
      seed: o.seed == null ? null : o.seed, code: o.code || null, opp: o.opp == null ? null : o.opp, dailyKey: o.dailyKey || null,
      tag: o.tag || null, coach: o.coach == null ? S().settings.coach : o.coach, combo: 0, bestCombo: 0, xp: 0, showGrid: false, practice: !!o.practice
    };
    S().runs.push(run);
    // keep at most 6 unfinished sessions
    while (S().runs.length > 6) S().runs.shift();
    A.save();
    st.runId = run.id; st.runFrom = run.from; st.qStart = Date.now();
    A.go("run");
  };
  A.resumeRun = function (id) {
    var r = A.getRun(id); if (!r) return;
    r.status = "active"; st.runId = id; st.runFrom = r.from; st.qStart = Date.now();
    A.save(); A.go("run");
  };
  function pauseRun(r) {
    r.status = "paused"; r.pausedAt = Date.now(); A.save();
    A.toast("Saved. Pick it up from Home anytime.", "info", "pause");
    A.go(r.from);
  }
  function removeRun(r) { S().runs = S().runs.filter(function (x) { return x !== r; }); }

  /** Finish a run: grade (tests), award XP, write history, optionally save unanswered questions as a new session. */
  function endRun(r, how) {
    // how: "submit" (test complete; blanks count wrong), "early" (grade what's done), "timeup"
    stopTimer();
    var isStudy = r.mode === "study";
    var answered = r.ids.filter(function (id) { return r.picks[id] != null; });
    var leftover = r.ids.filter(function (id) { return r.picks[id] == null; });
    var complete = how === "submit" || (how === "timeup" && !isStudy) || !leftover.length;
    var right = 0, byTopic = {}, items = [], xp = 0, badgeT = Date.now();
    var scored = complete && !isStudy ? r.ids : answered;
    scored.forEach(function (id) {
      var q = A.QBY[id], p = r.picks[id], ok = p != null && p === A.ansIdx(q);
      if (ok) right++;
      var t = byTopic[q.topic] || (byTopic[q.topic] = { n: 0, c: 0 }); t.n++; if (ok) t.c++;
      items.push([id, p == null ? null : p, ok ? 1 : 0]);
      if (!isStudy) {
        var g = A.grade(id, ok, { pick: p, hint: 0 });
        if (r.mode === "daily") xp += ok ? (r.practice ? 2 : 15) : 0;
        else xp += ok ? 10 : 0;
        if (g.fixed) xp += 5;
      }
    });
    var n = scored.length, score = n ? right / n : 0;
    if (!isStudy) {
      if (complete && n >= 20) { xp += 25; if (score >= S().settings.passPct / 100) xp += 50; if (score >= A.TARGET) xp += 100; }
      if (r.mode === "daily" && !r.practice && !S().daily[r.dailyKey]) { if (right === n) xp += 50; }
      if (r.mode === "challenge" && r.opp != null && right > r.opp) xp += 30;
      A.addXP(xp, "test");
    }
    var weakest = Object.keys(byTopic).filter(function (t) { return byTopic[t].n >= 2; }).sort(function (a, b) { return byTopic[a].c / byTopic[a].n - byTopic[b].c / byTopic[b].n; })[0];
    var h = {
      id: A.uid(), mode: isStudy ? "study" : "test", kind: r.tag || r.mode, title: r.title, at: Date.now(), n: n, total: r.ids.length, answered: answered.length, right: right, score: score,
      ms: r.elapsed, byTopic: byTopic, items: items, xp: isStudy ? r.xp : xp, partial: !complete && !isStudy, bestCombo: r.bestCombo,
      code: r.seed != null && complete ? A.makeCode(r.seed, r.ids.length, right) : r.mode === "daily" ? null : null, seed: r.seed, opp: r.opp, dailyKey: r.dailyKey,
      weak: weakest && byTopic[weakest].c < byTopic[weakest].n ? A.TOPICS[weakest].short + " (" + byTopic[weakest].c + "/" + byTopic[weakest].n + ")" : null,
      badgeFrom: r.created, leftover: null, practice: r.practice
    };
    if (r.mode === "daily" && complete && !r.practice && !S().daily[r.dailyKey]) {
      S().daily[r.dailyKey] = { s: right, n: n, ms: r.elapsed, grid: items.map(function (x) { return x[2]; }), at: Date.now() };
    }
    if (r.mode === "challenge") { S().counters.played++; S().challenges[r.code] = { s: right, n: n, opp: r.opp, at: Date.now() }; }
    S().counters.longestMs = Math.max(S().counters.longestMs, r.elapsed);
    removeRun(r);
    // leftovers become a new session to pick up later
    if (!complete && leftover.length && how !== "discard") {
      var per = r.limit ? r.limit / r.ids.length : 0;
      var nr = {
        id: A.uid(), mode: r.mode, title: r.title.replace(/ \(continued\)$/, "") + " (continued)", ids: leftover, order: pickKeys(r.order, leftover), picks: {}, flags: pickKeys(r.flags, leftover), hints: {}, guess: {}, qms: {}, xpQ: {},
        i: 0, limit: r.limit ? Math.max(60000, Math.round(r.limit - r.elapsed)) : 0, elapsed: 0, status: "paused", created: Date.now(), pausedAt: Date.now(), from: r.from,
        seed: null, code: null, opp: null, dailyKey: null, tag: null, coach: r.coach, combo: 0, bestCombo: 0, xp: 0, showGrid: false
      };
      if (per && nr.limit < 60000) nr.limit = Math.round(per * leftover.length);
      S().runs.push(nr); h.leftover = nr.id;
    }
    S().history.push(h);
    if (S().history.length > 80) S().history = S().history.slice(-80);
    A.save();
    A.checkBadges();
    if (A.crewPublish) A.crewPublish();
    st.resultId = h.id; st.runFrom = r.from; st.resFilter = "missed";
    if ((!isStudy && complete && n >= 20 && score >= A.TARGET) || (r.mode === "daily" && right === n)) A.celebrate();
    A.go("results");
  }
  function pickKeys(o, keys) { var out = {}; keys.forEach(function (k) { if (o[k] != null) out[k] = o[k]; }); return out; }

  /* ---------------------------------------------------------------- timer */
  var timer = null;
  function startTimer() {
    stopTimer();
    var last = Date.now();
    timer = setInterval(function () {
      var r = A.getRun();
      if (!r || st.view !== "run" || r.status !== "active" || st.modal) { last = Date.now(); return; }
      var now = Date.now(); r.elapsed += now - last; last = now;
      paintClock(r);
      if (r.elapsed % 20000 < 1000) A.save({ localOnly: true });
      if (r.limit && r.elapsed >= r.limit) { A.toast("Time’s up. Here are your results.", "info", "timer"); endRun(r, "timeup"); }
    }, 1000);
  }
  function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }
  function paintClock(r) {
    var t = document.getElementById("clock"); if (!t) return;
    var left = r.limit ? r.limit - r.elapsed : r.elapsed;
    t.textContent = A.fmtTime(left);
    t.classList.toggle("low", !!r.limit && left < Math.min(5 * 60000, r.limit * 0.1));
    var ring = document.getElementById("clockRing");
    if (ring && r.limit) ring.style.strokeDashoffset = String(100 - Math.min(100, (100 * r.elapsed) / r.limit));
    var p = document.getElementById("pace"); if (p) p.textContent = paceText(r);
  }
  function paceText(r) {
    var done = Object.keys(r.picks).length;
    if (!r.limit) return done + " of " + r.ids.length + " answered";
    var perQ = r.limit / r.ids.length, expected = Math.min(r.ids.length, Math.floor(r.elapsed / perQ));
    var diff = done - expected;
    return (diff >= 0 ? (diff ? diff + " ahead of pace" : "On pace") : -diff + " behind pace") + " · " + (Math.round((perQ / 60000) * 10) / 10) + " min per question";
  }
  A.AFTER.run = function () { var r = A.getRun(); if (r && r.status === "active") startTimer(); st.qStart = st.qStart || Date.now(); };
  A.LEAVE.run = function () { stopTimer(); var r = A.getRun(); if (r && r.status === "active") { r.status = "paused"; r.pausedAt = Date.now(); A.save(); } };

  /* ---------------------------------------------------------------- picking answers */
  function choose(r, orig) {
    var q = A.QBY[r.ids[r.i]];
    if (r.mode === "study") {
      if (r.picks[q.id] != null) return;
      r.picks[q.id] = orig;
      r.qms[q.id] = Date.now() - (st.qStart || Date.now());
      var ok = orig === A.ansIdx(q), hint = r.hints[q.id] || 0;
      var g = A.grade(q.id, ok, { pick: orig, hint: hint });
      var xp = 0;
      if (ok) { xp = 10 + (hint ? 5 : 0) + (g.fixed ? 5 : 0); r.combo++; r.bestCombo = Math.max(r.bestCombo, r.combo); if (r.combo % 5 === 0) { xp += 10; A.toast(r.combo + " in a row!", "xp", "flame"); } }
      else { xp = 2; r.combo = 0; }
      r.xpQ[q.id] = xp; r.xp += xp;
      A.addXP(xp, "answer");
      A.save();
      A.checkBadges();
      A.render();
    } else {
      r.picks[q.id] = orig;
      if (r.qms[q.id] == null) r.qms[q.id] = Date.now() - (st.qStart || Date.now());
      A.save({ localOnly: true });
      A.render();
    }
  }
  function move(r, d) {
    var ni = r.i + d;
    if (ni < 0) return;
    if (ni >= r.ids.length) {
      if (r.mode === "study") return endRun(r, "submit");
      r.showGrid = true; A.save({ localOnly: true }); A.render(true); A.toast("That’s the last one. Check blanks and flags, then Submit.", "info", "grid"); return;
    }
    r.i = ni; st.qStart = Date.now(); A.save({ localOnly: true }); A.render(true);
  }

  /* ---------------------------------------------------------------- run view */
  A.V.run = function () {
    var r = A.getRun();
    if (!r) { setTimeout(function () { A.go("home"); }, 0); return ""; }
    var q = A.QBY[r.ids[r.i]], isStudy = r.mode === "study", picked = r.picks[q.id], reveal = isStudy && picked != null;
    var answered = Object.keys(r.picks).length, right = Object.keys(r.picks).filter(function (id) { return r.picks[id] === A.ansIdx(A.QBY[id]); }).length;
    var h = [];
    // run bar
    var clock = '<div class="clock' + (r.limit ? " countdown" : "") + '">' + (r.limit ? '<svg viewBox="0 0 36 36" class="clock-ring" aria-hidden="true"><circle cx="18" cy="18" r="15.9" pathLength="100" class="trk"/><circle id="clockRing" cx="18" cy="18" r="15.9" pathLength="100" class="val" style="stroke-dashoffset:' + (100 - Math.min(100, (100 * r.elapsed) / r.limit)) + '"/></svg>' : icon("timer")) + '<span id="clock" class="mono">' + A.fmtTime(r.limit ? r.limit - r.elapsed : r.elapsed) + "</span></div>";
    h.push('<div class="runbar"><div class="rb-main"><div class="rb-title">' + esc(r.title) + '</div><div class="rb-sub" id="pace">' + paceText(r) + "</div></div>" + clock +
      '<div class="rb-actions"><button class="icon-btn" data-act="calc" title="Calculator" aria-label="Calculator">' + icon("calc") + "</button>" +
      (!isStudy ? '<button class="icon-btn' + (r.showGrid ? " on" : "") + '" data-act="runGrid" title="All questions" aria-label="Show all questions">' + icon("grid") + "</button>" : "") +
      '<button class="icon-btn" data-act="runPause" title="Pause and save" aria-label="Pause and save">' + icon("pause") + '</button><button class="btn sm ' + (isStudy ? "" : "amber") + '" data-act="runEnd">' + (isStudy ? "End" : "Submit") + "</button></div></div>");
    if (isStudy) h.push('<div class="studystats"><span>' + icon("check") + right + " right</span><span>" + icon("x") + (answered - right) + " missed</span><span>" + icon("flame") + r.combo + " in a row</span><span>" + icon("bolt") + "+" + r.xp + " XP</span></div>");
    if (!isStudy && r.showGrid) {
      var nflag = Object.keys(r.flags).filter(function (k) { return r.flags[k]; }).length;
      h.push('<section class="card stack"><div class="row between"><span class="small muted">' + answered + " answered · " + (r.ids.length - answered) + " blank · " + nflag + ' flagged</span><div class="row"><button class="btn sm ghost" data-act="runFirst" data-v="blank">First blank</button><button class="btn sm ghost" data-act="runFirst" data-v="flag">First flagged</button></div></div><div class="qgrid">' +
        r.ids.map(function (id, i) { return '<button data-act="runJump" data-i="' + i + '" class="' + (r.picks[id] != null ? "answered " : "") + (r.flags[id] ? "flagged " : "") + (i === r.i ? "current" : "") + '">' + (i + 1) + "</button>"; }).join("") + "</div></section>");
    }
    // question card
    h.push('<article class="card qcard stack lg">');
    h.push('<div class="q-meta"><div class="row tight"><span class="pill blue">' + A.qLabel(q) + '</span><span class="pill">' + esc(A.TOPICS[q.topic].short) + "</span>" + (q.calc ? '<span class="pill amber">Math</span>' : "") + (q.dupes ? '<span class="pill" title="Asked on more than one practice test">Repeat</span>' : "") + (A.peek(q.id).last === 0 ? '<span class="pill bad">Missed before</span>' : "") + '</div><span class="q-progress mono">' + (r.i + 1) + " / " + r.ids.length + "</span></div>");
    h.push('<div class="bar thin"><span style="width:' + A.pct(r.i + (reveal ? 1 : 0), r.ids.length) + '%"></span></div>');
    if (q.scenario) h.push('<div class="q-scenario"><div class="eyebrow">Scenario</div>' + esc(q.scenario) + "</div>");
    h.push('<p class="q-stem">' + A.stemHTML(q.stem) + "</p>");
    h.push('<div class="options" role="group" aria-label="Answer choices">');
    var ans = A.ansIdx(q);
    r.order[q.id].forEach(function (orig, pos) {
      var cls = "opt", mark = "";
      if (reveal) { if (orig === ans) { cls += " correct"; mark = icon("check"); } else if (orig === picked) { cls += " wrong"; mark = icon("x"); } else cls += " dim"; }
      else if (orig === picked) cls += " selected";
      h.push('<button class="' + cls + '" data-act="runChoose" data-o="' + orig + '"' + (reveal ? " disabled" : "") + '><span class="letter">' + L[pos] + '</span><span class="otext">' + esc(q.options[orig]) + '</span><span class="mark">' + mark + "</span></button>");
    });
    h.push("</div>");
    if (isStudy && !reveal && r.coach) h.push(coach(q, r.hints[q.id] || 0));
    if (reveal) h.push(studyReveal(q, picked, r));
    // actions
    var fl = r.flags[q.id] || A.peek(q.id).f;
    h.push('<div class="q-actions"><div class="row tight"><button class="btn sm ' + (fl ? "flag-on" : "ghost") + '" data-act="runFlag">' + icon("flag") + (fl ? "Flagged" : "Flag") + "</button>" +
      (reveal && picked === ans && !r.guess[q.id] ? '<button class="btn sm ghost" data-act="runGuess" title="Counts as not known yet so it comes back in review">I guessed</button>' : "") +
      (r.guess[q.id] ? '<span class="pill amber">Marked as a guess</span>' : "") + "</div>" +
      '<div class="row tight">' + (!isStudy ? '<button class="btn" data-act="runMove" data-d="-1"' + (r.i === 0 ? " disabled" : "") + ">" + icon("back") + "<span class=\"hide-xs\">Prev</span></button>" : "") +
      (isStudy ? (reveal ? '<button class="btn primary" data-act="runMove" data-d="1">' + (r.i + 1 < r.ids.length ? "Next" : "Finish") + icon("arrow") + "</button>" : '<span class="small muted hide-xs">Tap an answer or press <span class="kbd">1</span>–<span class="kbd">4</span></span>') :
        '<button class="btn primary" data-act="runMove" data-d="1">' + (r.i + 1 < r.ids.length ? "Next" : "Review") + icon("arrow") + "</button>") + "</div></div>");
    h.push("</article>");
    return h.join("");
  };

  function coach(q, lvl) {
    var p = A.lookup(q)[0];
    var steps = [
      { k: "Book", v: '<span class="tab ' + p.color + '">' + esc(p.short) + "</span> " + esc(p.name) },
      { k: "Section", v: esc(p.chap || "Use the index") },
      { k: "Look up", v: '<mark class="hl">' + esc(q.look) + "</mark>" + (p.where ? ' <span class="mono small">(' + esc(p.where) + ")</span>" : "") }
    ];
    var h = '<div class="coach"><div class="coach-head">' + A.icon("find") + "<div><strong>Lookup Coach</strong><span class=\"small muted\">The exam is open book. Practice finding it before you answer.</span></div></div>";
    if (lvl) h += '<ol class="path">' + steps.slice(0, lvl).map(function (s) { return '<li><span class="k">' + s.k + '</span><span class="v">' + s.v + "</span></li>"; }).join("") + "</ol>";
    if (lvl < 3) h += '<button class="btn sm" data-act="runHint">' + A.icon("find") + (lvl === 0 ? "Which book?" : lvl === 1 ? "Which section?" : "What do I look up?") + "</button>";
    else h += '<p class="small muted" style="margin:0">Find it in your book, then pick your answer. A right answer after a lookup earns +5 bonus XP.</p>';
    return h + "</div>";
  }
  function studyReveal(q, picked, r) {
    var ans = A.ansIdx(q), right = picked === ans, pos = r.order[q.id].indexOf(ans), xp = r.xpQ[q.id] || 0;
    var h = '<section class="reveal">';
    h += '<div class="verdict ' + (right ? "ok" : "bad") + '">' + icon(right ? "check" : "x") + "<span>" + (right ? A.pick(["Nailed it", "Correct", "That’s right", "Good call"]) : "Not quite. It’s " + L[pos] + ".") + '</span><span class="xpgain">+' + xp + " XP</span></div>";
    h += '<div class="plain">' + icon("bulb") + '<div><div class="eyebrow">In plain English</div><p>' + esc(q.plain) + "</p></div></div>";
    if (q.tip) h += '<div class="tipbox"><b>Remember</b><span>' + A.inline(q.tip) + "</span></div>";
    h += A.findPanel(q);
    h += '<details class="more"><summary>Full explanation</summary>' + A.md(q.exp) + "</details>";
    if (q.edAns) h += editionNote(q, r.order[q.id]);
    if (q.dupes) h += '<p class="small muted">Also asked as ' + q.dupes.map(function (d) { return "Exam " + d.split("-")[0] + " #" + d.split("-")[1]; }).join(", ") + ". Repeat questions are high-yield.</p>";
    var rec = A.peek(q.id);
    h += '<div class="field"><label for="note-' + q.id + '">My note</label><textarea id="note-' + q.id + '" data-note="' + q.id + '" rows="2" placeholder="Your own memory trick, or the page in your book">' + esc(rec.note || "") + "</textarea></div>";
    return h + "</section>";
  }
  function editionNote(q, order) {
    order = order || [0, 1, 2, 3];
    return '<div class="edition-note">This answer depends on your Contractors Manual edition. You’re set to <strong>' + esc(S().settings.edition) + "</strong>. Keyed answers: 2025 → " + L[order.indexOf(q.edAns["2025"])] + ", 2021 → " + L[order.indexOf(q.edAns["2021"])] + ", 2017 → " + L[order.indexOf(q.edAns["2017"])] + '. <a href="#settings" data-act="nav" data-v="settings">Change edition</a></div>';
  }
  A.editionNote = editionNote;

  /* run actions */
  A.ACT.runChoose = function (el) { var r = A.getRun(); if (r) choose(r, +el.dataset.o); };
  A.ACT.runMove = function (el) { var r = A.getRun(); if (r) move(r, +el.dataset.d); };
  A.ACT.runJump = function (el) { var r = A.getRun(); r.i = +el.dataset.i; st.qStart = Date.now(); A.save({ localOnly: true }); A.render(true); };
  A.ACT.runFirst = function (el) { var r = A.getRun(); var i = r.ids.findIndex(function (id) { return el.dataset.v === "blank" ? r.picks[id] == null : r.flags[id]; }); if (i >= 0) { r.i = i; A.render(true); } else A.toast(el.dataset.v === "blank" ? "No blanks left." : "Nothing flagged.", "info"); };
  A.ACT.runGrid = function () { var r = A.getRun(); r.showGrid = !r.showGrid; A.render(); };
  A.ACT.runHint = function () { var r = A.getRun(), id = r.ids[r.i]; r.hints[id] = Math.min(3, (r.hints[id] || 0) + 1); A.render(); };
  A.ACT.runFlag = function () { var r = A.getRun(), id = r.ids[r.i]; var on = !(r.flags[id] || A.peek(id).f); r.flags[id] = on; A.rec(id).f = on; A.save(); A.render(); };
  A.ACT.runGuess = function () { var r = A.getRun(), id = r.ids[r.i]; r.guess[id] = true; var rc = A.rec(id); rc.box = 1; rc.due = Date.now(); A.save(); A.toast("Marked as a guess. It’ll come back in review.", "info"); A.render(); };
  A.ACT.runPause = function () { var r = A.getRun(); if (r) pauseRun(r); };
  A.ACT.runEnd = function () {
    var r = A.getRun(); if (!r) return;
    var answered = Object.keys(r.picks).length, left = r.ids.length - answered, isStudy = r.mode === "study";
    var acts = [];
    if (isStudy) {
      acts.push({ label: "Keep going" });
      acts.push({ label: "Pause & save", icon: "pause", fn: function () { pauseRun(r); } });
      if (answered) acts.push({ label: left ? "See results · save " + left + " for later" : "See results", cls: "primary", fn: function () { endRun(r, "early"); } });
      A.modal({ title: "End this session?", html: "<p>" + answered + " answered" + (left ? ", " + left + " to go" : "") + ". Get your results now" + (left ? ", and the questions you didn’t reach are saved as a new session you can pick up later." : ".") + "</p>", actions: acts });
    } else {
      acts.push({ label: "Keep working" });
      acts.push({ label: "Pause & save", icon: "pause", fn: function () { pauseRun(r); } });
      if (left && answered) acts.push({ label: "Grade the " + answered + " I did · save the rest", fn: function () { endRun(r, "early"); } });
      acts.push({ label: "Submit test", cls: "primary", fn: function () { endRun(r, "submit"); } });
      A.modal({ title: left ? "Submit with " + A.plural(left, "blank") + "?" : "Submit your test?", html: "<p>" + (left ? "Blanks count as wrong when you submit. You can also grade just what you’ve answered and save the rest for a new session." : "Every question is answered. Ready to see how you did?") + "</p>", actions: acts });
    }
  };

  A.KEYS.run = function (k, ev) {
    var r = A.getRun(); if (!r) return;
    var q = A.QBY[r.ids[r.i]], idx = "1234".indexOf(k) >= 0 ? "1234".indexOf(k) : "abcd".indexOf(k);
    var locked = r.mode === "study" && r.picks[q.id] != null;
    if (idx >= 0 && k.length === 1 && !locked) { ev.preventDefault(); choose(r, r.order[q.id][idx]); }
    else if (k === "enter" || k === "arrowright" || k === "n") { if (r.mode !== "study" || locked) { ev.preventDefault(); move(r, 1); } }
    else if ((k === "arrowleft" || k === "p") && r.mode !== "study") { ev.preventDefault(); move(r, -1); }
    else if (k === "f") A.ACT.runFlag();
    else if (k === "h" && r.mode === "study" && !locked && r.coach) A.ACT.runHint();
  };

  /* ---------------------------------------------------------------- setup: shared filter builder */
  function pool(cfg) {
    return A.Q.filter(function (q) {
      if (cfg.exams && cfg.exams.length && cfg.exams.indexOf(q.exam) < 0) return false;
      if (cfg.topics && cfg.topics.length && cfg.topics.indexOf(q.topic) < 0) return false;
      if (cfg.books && cfg.books.length && !q.books.some(function (b) { return cfg.books.indexOf(b) >= 0; })) return false;
      var r = A.peek(q.id);
      switch (cfg.filter) {
        case "new": return r.n === 0;
        case "missed": return r.last === 0;
        case "due": return r.box > 0 && r.due <= Date.now();
        case "notm": return r.box < A.MASTER_BOX;
        case "flag": return !!r.f;
        case "calc": return !!q.calc;
        case "repeat": return !!q.dupes;
      }
      return true;
    }).map(function (q) { return q.id; });
  }
  A.pool = pool;
  function chip(act, v, label, on, count) { return '<button class="chip" data-act="' + act + '" data-v="' + v + '" aria-pressed="' + (on ? "true" : "false") + '">' + esc(label) + (count != null ? ' <span class="cnt">' + count + "</span>" : "") + "</button>"; }
  A.chip = chip;
  function filtersHTML(cfg, prefix) {
    var counts = {};
    ["all", "new", "missed", "due", "notm", "flag", "calc", "repeat"].forEach(function (f) { counts[f] = pool({ exams: cfg.exams, topics: cfg.topics, books: cfg.books, filter: f }).length; });
    return '<div class="field"><span class="label">Practice tests</span><div class="chips">' + chip(prefix + "Exam", 0, "All three", !cfg.exams.length) + [1, 2, 3].map(function (e) { return chip(prefix + "Exam", e, "Exam " + e, cfg.exams.indexOf(e) >= 0); }).join("") + "</div></div>" +
      '<div class="field"><span class="label">Questions</span><div class="chips">' +
      [["all", "Everything"], ["new", "Haven’t seen"], ["missed", "Missed last time"], ["due", "Due for review"], ["notm", "Not mastered"], ["flag", "Flagged"], ["calc", "Math"], ["repeat", "Repeats"]].map(function (f) { return chip(prefix + "Filter", f[0], f[1], cfg.filter === f[0], counts[f[0]]); }).join("") + "</div></div>" +
      '<details class="field more-filters"' + (cfg.topics.length || cfg.books.length ? " open" : "") + '><summary class="label">Topics &amp; books' + (cfg.topics.length + cfg.books.length ? " · " + (cfg.topics.length + cfg.books.length) + " selected" : "") + "</summary>" +
      '<div class="chips" style="margin-top:8px">' + A.TOPIC_KEYS.map(function (t) { return chip(prefix + "Topic", t, A.TOPICS[t].short, cfg.topics.indexOf(t) >= 0); }).join("") + "</div>" +
      '<div class="chips" style="margin-top:10px">' + A.BOOK_KEYS.map(function (b) { return chip(prefix + "Book", b, A.BOOKS[b].short, cfg.books.indexOf(b) >= 0); }).join("") + "</div></details>";
  }
  function bindFilterActs(prefix, cfgGet) {
    A.ACT[prefix + "Exam"] = function (el) { var c = cfgGet(), v = +el.dataset.v; if (!v) c.exams = []; else { var i = c.exams.indexOf(v); if (i >= 0) c.exams.splice(i, 1); else c.exams.push(v); if (c.exams.length === 3) c.exams = []; } A.rerenderKeep(); };
    A.ACT[prefix + "Filter"] = function (el) { cfgGet().filter = el.dataset.v; A.rerenderKeep(); };
    A.ACT[prefix + "Topic"] = function (el) { toggle(cfgGet().topics, el.dataset.v); A.rerenderKeep(); };
    A.ACT[prefix + "Book"] = function (el) { toggle(cfgGet().books, el.dataset.v); A.rerenderKeep(); };
  }
  function toggle(a, v) { var i = a.indexOf(v); if (i >= 0) a.splice(i, 1); else a.push(v); }
  function resumeCards(kind) {
    var runs = A.openRuns(kind);
    if (!runs.length) return "";
    return '<section class="stack"><h3 class="sec-title">' + icon("play") + "Pick up where you left off</h3>" + runs.map(resumeCard).join("") + "</section>";
  }
  function resumeCard(r) {
    var a = Object.keys(r.picks).length;
    return '<div class="card resume"><div class="resume-main"><div class="eyebrow">' + (r.mode === "study" ? "Study session" : r.mode === "daily" ? "Daily challenge" : r.mode === "challenge" ? "Friend challenge" : "Practice test") + '</div><strong>' + esc(r.title) + '</strong><span class="small muted">' + a + " of " + r.ids.length + " done" + (r.limit ? " · " + A.fmtTime(r.limit - r.elapsed) + " left" : r.elapsed ? " · " + A.fmtTime(r.elapsed) + " so far" : "") + '</span><div class="bar thin"><span style="width:' + A.pct(a, r.ids.length) + '%"></span></div></div><div class="row tight"><button class="btn primary" data-act="resume" data-id="' + r.id + '">' + icon("play") + 'Continue</button><button class="icon-btn" data-act="discardRun" data-id="' + r.id + '" aria-label="Discard session" title="Discard">' + icon("x") + "</button></div></div>";
  }
  A.resumeCard = resumeCard;
  A.ACT.resume = function (el) { A.resumeRun(el.dataset.id); };
  A.ACT.discardRun = function (el) { A.confirm("Discard this session?", "Answers you already gave still count toward your progress. The unfinished questions are just dropped.", "Discard", function () { S().runs = S().runs.filter(function (r) { return r.id !== el.dataset.id; }); A.save(); A.rerenderKeep(); }, true); };

  var TIMES = [0, 10, 15, 20, 30, 45, 60, 90];

  /* ---------------------------------------------------------------- STUDY setup */
  function studyCfg() { return (S().last.study = S().last.study || { exams: [], filter: "all", topics: [], books: [], count: 20, minutes: 0 }); }
  bindFilterActs("st", studyCfg);
  A.V.study = function () {
    var c = studyCfg(), ids = pool(c), n = c.count ? Math.min(c.count, ids.length) : ids.length;
    var due = A.dueIds().length, missed = A.missedIds().length, unseen = A.Q.length - A.overall().seen;
    var h = ['<header class="page-head"><div class="eyebrow">Study mode</div><h1>Study</h1><p>One question at a time. You see the answer right away, explained in plain English, with the exact page to find it in your book. Set a time limit if you’re squeezing it in between jobs. When time’s up you get your results, and anything you didn’t reach is saved for next time.</p></header>'];
    h.push(resumeCards("study"));
    h.push('<section class="quick-grid">' +
      quick("stQuick", "new", "Learn new ones", A.plural(Math.min(20, unseen), "question") + " you haven’t seen", "study", !unseen) +
      quick("stQuick", "missed", "Fix my misses", A.plural(missed, "question") + " to fix", "missed", !missed) +
      quick("stQuick", "due", "Smart review", A.plural(due, "question") + " due today", "review", !due) +
      quick("stQuick", "sprint", "15-minute sprint", "As many as you can in 15 min", "timer", false) + "</section>");
    h.push('<section class="card stack lg"><h3>Build your own session</h3>' + filtersHTML(c, "st"));
    h.push('<div class="grid2"><div class="field"><span class="label">How many</span><div class="chips">' + [10, 20, 30, 50, 0].map(function (k) { return chip("stCount", k, k ? String(k) : "All", c.count === k); }).join("") + '</div></div><div class="field"><span class="label">Time limit</span><div class="chips">' + TIMES.map(function (m) { return chip("stTime", m, m ? m + " min" : "None", c.minutes === m); }).join("") + "</div></div></div>");
    h.push('<div class="toggles"><label class="toggle"><input type="checkbox" data-change="setBool" data-k="coach"' + (S().settings.coach ? " checked" : "") + '><span><strong>Lookup Coach</strong><span class="small muted">A “Where do I look?” button on every question</span></span></label><label class="toggle"><input type="checkbox" data-change="setBool" data-k="shuffle"' + (S().settings.shuffle ? " checked" : "") + '><span><strong>Shuffle answer choices</strong><span class="small muted">So you learn answers, not letter positions</span></span></label><label class="toggle"><input type="checkbox" data-change="setBool" data-k="traps"' + (S().settings.traps ? " checked" : "") + '><span><strong>Highlight trap words</strong><span class="small muted">NOT, EXCEPT, never and least get marked</span></span></label></div>');
    h.push('<div class="startbar"><span class="muted">' + A.plural(ids.length, "question") + " match" + (ids.length === 1 ? "es" : "") + (c.minutes ? " · " + c.minutes + " min" : "") + '</span><button class="btn primary lg" data-act="stStart"' + (ids.length ? "" : " disabled") + ">Start studying " + n + icon("arrow") + "</button></div></section>");
    return h.join("");
  };
  function quick(act, v, title, sub, ic, disabled) { return '<button class="quick" data-act="' + act + '" data-v="' + v + '"' + (disabled ? " disabled" : "") + '><span class="q-ico">' + icon(ic) + '</span><span class="q-txt"><strong>' + esc(title) + '</strong><span>' + esc(sub) + "</span></span></button>"; }
  A.quickTile = quick;
  A.ACT.stCount = function (el) { studyCfg().count = +el.dataset.v; A.save({ localOnly: true }); A.rerenderKeep(); };
  A.ACT.stTime = function (el) { studyCfg().minutes = +el.dataset.v; A.save({ localOnly: true }); A.rerenderKeep(); };
  A.ACT.stStart = function () {
    var c = studyCfg(), ids = A.shuffle(pool(c));
    if (c.filter === "new") ids = pool(c); // keep printed order for first pass
    if (c.count) ids = ids.slice(0, c.count);
    A.newRun({ mode: "study", title: studyTitle(c), ids: ids, limit: c.minutes * 60000 });
  };
  function studyTitle(c) {
    var t = { all: "Study", new: "New questions", missed: "Fix my misses", due: "Smart review", notm: "Not mastered", flag: "Flagged", calc: "Math questions", repeat: "Repeat questions" }[c.filter] || "Study";
    if (c.topics.length === 1) t += " · " + A.TOPICS[c.topics[0]].short;
    if (c.exams.length === 1) t += " · Exam " + c.exams[0];
    return t;
  }
  A.ACT.stQuick = function (el) {
    var v = el.dataset.v;
    if (v === "new") return A.newRun({ mode: "study", title: "New questions", ids: pool({ filter: "new" }).slice(0, 20) });
    if (v === "missed") return A.newRun({ mode: "study", title: "Fix my misses", ids: A.shuffle(A.missedIds()).slice(0, 30), from: "missed" });
    if (v === "due") return A.newRun({ mode: "study", title: "Smart review", ids: A.shuffle(A.dueIds()).slice(0, 40) });
    if (v === "sprint") { var ids = A.shuffle(pool({ filter: "notm" })); if (ids.length < 10) ids = A.shuffle(A.Q.map(function (q) { return q.id; })); return A.newRun({ mode: "study", title: "15-minute sprint", ids: ids.slice(0, 60), limit: 15 * 60000 }); }
  };
  A.startStudy = function (ids, title, from) { A.newRun({ mode: "study", title: title, ids: ids, from: from }); };

  /* ---------------------------------------------------------------- PRACTICE TEST setup */
  function testCfg() { return (S().last.test = S().last.test || { exams: [], filter: "all", topics: [], books: [], count: 50, minutes: 175, untimed: false }); }
  bindFilterActs("tc", testCfg);
  A.V.test = function () {
    var s = S().settings, per = s.simMinutes / s.simCount, c = testCfg();
    var h = ['<header class="page-head"><div class="eyebrow">Test mode</div><h1>Practice Test</h1><p>Like test day: answers stay hidden until you submit. Use your tabbed books while you take it. Need to stop? Pause and come back later, or grade what you’ve done and save the rest.</p></header>'];
    h.push(resumeCards("test"));
    var daily = S().daily[A.todayKey()];
    h.push('<button class="daily-banner" data-act="startDaily"><span class="db-ico">' + icon("bolt") + '</span><span class="db-txt"><span class="eyebrow">Daily Challenge #' + A.dailyNumber() + "</span><strong>" + (daily ? "Done today: " + daily.s + "/" + daily.n + " in " + A.fmtTime(daily.ms) : "10 questions, same for everyone today") + "</strong><span>" + (daily ? "Replay for practice, or share your score" : "Compare scores with your crew. 15 XP per right answer.") + "</span></span>" + icon("arrow") + "</button>");
    h.push('<section class="preset-grid">' +
      preset("sim", "Full state exam", s.simCount + " questions · " + A.fmtMin(s.simMinutes), "The real deal: mixed from all three tests, timed.", true) +
      preset("half", "Half exam", Math.round(s.simCount / 2) + " questions · " + A.fmtMin(Math.round((s.simMinutes / 2))), "Same pace, half the length.") +
      preset("quick", "Quick test", "25 questions · " + A.fmtMin(Math.round(per * 25)), "Fits in a lunch break.") +
      preset("weak", "Weak-spot test", "50 questions · " + A.fmtMin(Math.round(per * 50)), "Weighted to what you miss most.") +
      [1, 2, 3].map(function (e) { var best = S().history.filter(function (x) { return x.kind === "full" + e && !x.partial; }).reduce(function (m, x) { return Math.max(m, x.score); }, -1); return preset("full" + e, "Practice Exam " + e, "125 questions · " + A.fmtMin(Math.round(per * 125)), best >= 0 ? "Best: " + Math.round(best * 100) + "%" : "All of Exam " + e + ", in printed order."); }).join("") + "</section>");
    var ids = pool(c), n = Math.min(c.count || ids.length, ids.length);
    h.push('<section class="card stack lg"><h3>Custom test</h3>' + filtersHTML(c, "tc") +
      '<div class="grid2"><div class="field"><span class="label">Questions</span><div class="chips">' + [10, 25, 50, 75, 100, 0].map(function (k) { return chip("tcCount", k, k ? String(k) : "All", c.count === k); }).join("") + '</div></div><div class="field"><label class="label" for="tcMin">Time limit (minutes)</label><div class="row tight"><input type="number" id="tcMin" min="5" max="600" value="' + (c.untimed ? "" : c.minutes) + '" data-change="tcMin" style="max-width:120px"' + (c.untimed ? " disabled" : "") + '><label class="toggle compact"><input type="checkbox" data-change="tcUntimed"' + (c.untimed ? " checked" : "") + '>Untimed</label><button class="btn sm ghost" data-act="tcPace">Use exam pace (' + Math.round(per * 10) / 10 + " min/q)</button></div></div></div>" +
      '<div class="startbar"><span class="muted">' + A.plural(ids.length, "question") + " match" + (ids.length === 1 ? "es" : "") + '</span><button class="btn primary lg" data-act="tcStart"' + (ids.length ? "" : " disabled") + ">Start " + n + "-question test" + icon("arrow") + "</button></div></section>");
    h.push('<section class="card stack"><h3>Got a challenge code?</h3><p class="small muted" style="margin:0">A friend finished a test and sent you a code. Enter it to take the exact same questions and see who scores higher.</p><div class="row tight"><input type="text" id="codeIn" placeholder="e.g. 1K9X2Q-50-42" autocomplete="off" style="max-width:260px;text-transform:uppercase"><button class="btn primary" data-act="codeGo">Take challenge</button></div></section>');
    var past = S().history.filter(function (x) { return x.mode === "test"; }).slice(-6).reverse();
    if (past.length) h.push('<section class="card stack"><h3>Recent tests</h3>' + past.map(historyRow).join("") + "</section>");
    return h.join("");
  };
  function preset(v, title, meta, sub, feature) { return '<button class="preset' + (feature ? " feature" : "") + '" data-act="tcPreset" data-v="' + v + '"><span class="eyebrow">' + esc(meta) + "</span><strong>" + esc(title) + "</strong><span>" + esc(sub) + "</span></button>"; }
  function historyRow(x) {
    var p = Math.round(x.score * 100), pass = p >= S().settings.passPct;
    return '<button class="hrow" data-act="openResult" data-id="' + x.id + '"><span class="hr-score ' + (x.mode === "test" && !x.partial ? (pass ? "ok" : "bad") : "") + '">' + p + '%</span><span class="hr-main"><strong>' + esc(x.title) + '</strong><span class="small muted">' + new Date(x.at).toLocaleDateString(undefined, { month: "short", day: "numeric" }) + " · " + x.right + "/" + x.n + (x.partial ? " answered (ended early)" : "") + " · " + A.fmtTime(x.ms) + "</span></span>" + icon("arrow") + "</button>";
  }
  A.historyRow = historyRow;
  A.ACT.tcCount = function (el) { testCfg().count = +el.dataset.v; A.save({ localOnly: true }); A.rerenderKeep(); };
  A.CHANGE.tcMin = function (el) { testCfg().minutes = Math.max(5, +el.value || 60); A.save({ localOnly: true }); };
  A.CHANGE.tcUntimed = function (el) { testCfg().untimed = el.checked; A.save({ localOnly: true }); A.rerenderKeep(); };
  A.ACT.tcPace = function () { var c = testCfg(), s = S().settings, ids = pool(c), n = Math.min(c.count || ids.length, ids.length); c.untimed = false; c.minutes = Math.max(5, Math.round((s.simMinutes / s.simCount) * n)); A.rerenderKeep(); };
  A.ACT.tcStart = function () {
    var c = testCfg(), ids = pool(c), seeded = !c.exams.length && c.filter === "all" && !c.topics.length && !c.books.length;
    var n = Math.min(c.count || ids.length, ids.length), seed = seeded ? (Math.random() * 2147483647) >>> 0 : null;
    var picked = seeded ? A.seededSet(seed, n) : A.shuffle(ids).slice(0, n);
    A.newRun({ mode: "test", title: "Custom test · " + n + " questions", ids: picked, limit: c.untimed ? 0 : c.minutes * 60000, seed: seed });
  };
  A.ACT.tcPreset = function (el) {
    var v = el.dataset.v, s = S().settings, per = (s.simMinutes / s.simCount) * 60000, seed = (Math.random() * 2147483647) >>> 0;
    if (v === "sim") return A.newRun({ mode: "test", tag: "sim", title: "Full state exam", ids: A.seededSet(seed, Math.min(s.simCount, 330)), limit: s.simMinutes * 60000, seed: seed });
    if (v === "half") { var n = Math.round(s.simCount / 2); return A.newRun({ mode: "test", title: "Half exam", ids: A.seededSet(seed, n), limit: Math.round(per * n), seed: seed }); }
    if (v === "quick") return A.newRun({ mode: "test", title: "Quick test", ids: A.seededSet(seed, 25), limit: Math.round(per * 25), seed: seed });
    if (v === "weak") return A.newRun({ mode: "test", title: "Weak-spot test", ids: weakIds(50), limit: Math.round(per * 50) });
    var e = +v.replace("full", "");
    var run = A.newRun({ mode: "test", tag: "full" + e, title: "Practice Exam " + e, ids: A.Q.filter(function (q) { return q.exam === e; }).map(function (q) { return q.id; }), limit: Math.round(per * 125), shuffle: false });
    return run;
  };
  function weakIds(n) {
    var scored = A.Q.map(function (q) { var r = A.peek(q.id); return { id: q.id, w: (r.box < A.MASTER_BOX ? 2 : 0) + (r.last === 0 ? 3 : 0) + (r.missed || 0) + (r.n === 0 ? 1 : 0) + Math.random() * 1.5 }; }).sort(function (a, b) { return b.w - a.w; });
    var out = [], blocked = {};
    scored.forEach(function (x) { if (out.length < n && !blocked[x.id]) { out.push(x.id); (A.QBY[x.id].dupes || []).forEach(function (d) { blocked[d] = 1; }); } });
    return A.shuffle(out);
  }

  /* ---------------------------------------------------------------- daily challenge & challenge codes */
  A.ACT.startDaily = function () {
    var key = A.todayKey(), done = S().daily[key];
    var existing = S().runs.filter(function (r) { return r.mode === "daily" && r.dailyKey === key; })[0];
    if (existing) return A.resumeRun(existing.id);
    var go = function (practice) { A.newRun({ mode: "daily", title: "Daily Challenge #" + A.dailyNumber(key) + (practice ? " (replay)" : ""), ids: A.seededSet(A.dailySeed(key), 10), seed: A.dailySeed(key), dailyKey: key, from: "test", practice: practice }); };
    if (done) A.modal({ title: "You already played today", html: "<p>You scored <strong>" + done.s + "/" + done.n + "</strong> in " + A.fmtTime(done.ms) + ". A replay is just for practice and doesn’t change your score.</p>", actions: [{ label: "Share my score", icon: "share", fn: function () { A.share(dailyShare(key)); } }, { label: "Replay", cls: "primary", fn: function () { go(true); } }] });
    else go(false);
  };
  function dailyShare(key) {
    var d = S().daily[key];
    var sq = (d.grid || []).map(function (x) { return x ? "🟩" : "🟥"; }).join("");
    return "FL Business & Finance Prep\nDaily Challenge #" + A.dailyNumber(key) + ": " + d.s + "/" + d.n + " ⏱ " + A.fmtTime(d.ms) + "\n" + sq + "\n" + A.levelInfo().name + " · 🔥 " + A.plural(A.streak(), "day") + " streak";
  }
  A.dailyShare = dailyShare;
  A.ACT.codeGo = function () { var v = (document.getElementById("codeIn") || {}).value; A.openChallenge(v); };
  A.openChallenge = function (raw) {
    var c = A.parseCode(raw);
    if (!c) { A.toast("That code doesn’t look right. It should look like 1K9X2Q-50-42.", "info"); return; }
    var mins = Math.round((S().settings.simMinutes / S().settings.simCount) * c.n);
    A.modal({ title: "Challenge " + c.code, html: "<p>" + c.n + " questions" + (c.score != null ? ". Your friend scored <strong>" + c.score + "/" + c.n + "</strong>. Beat it for +30 XP." : ".") + "</p><p class=\"small muted\">Everyone with this code gets the same questions in the same order.</p>",
      actions: [{ label: "Cancel" }, { label: "Untimed", fn: function () { start(0); } }, { label: "Timed (" + A.fmtMin(mins) + ")", cls: "primary", fn: function () { start(mins * 60000); } }] });
    function start(limit) { A.newRun({ mode: "challenge", title: "Challenge " + c.code, ids: A.seededSet(c.seed, c.n), seed: c.seed, code: c.code, opp: c.score, limit: limit, from: "crew" }); }
  };

  /* ---------------------------------------------------------------- RESULTS */
  A.ACT.openResult = function (el) { st.resultId = el.dataset.id; st.resFilter = "missed"; A.go("results"); };
  A.V.results = function () {
    var h0 = S().history.filter(function (x) { return x.id === st.resultId; })[0];
    if (!h0) { setTimeout(function () { A.go("home"); }, 0); return ""; }
    var x = h0, p = x.n ? Math.round((100 * x.right) / x.n) : 0, isTest = x.mode === "test", passPct = S().settings.passPct;
    var pass = p >= passPct, out = [];
    var badges = A.BADGES.filter(function (b) { return S().badges[b.id] && S().badges[b.id] >= (x.badgeFrom || x.at) - 1000 && S().badges[b.id] <= x.at + 1000; });
    var ring = function (v) { var c = 2 * Math.PI * 52; return '<svg viewBox="0 0 120 120" class="score-ring" aria-hidden="true"><circle cx="60" cy="60" r="52" class="trk"/><circle cx="60" cy="60" r="52" class="val ' + (isTest ? (pass ? "ok" : "bad") : "") + '" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + (c * (1 - v / 100)).toFixed(1) + '" transform="rotate(-90 60 60)"/></svg>'; };
    out.push('<section class="result-hero"><div class="rh-ring">' + ring(p) + '<div class="rh-num"><span class="big">' + p + '%</span><span class="small">' + x.right + "/" + x.n + "</span></div></div>" +
      '<div class="rh-txt"><div class="eyebrow">' + esc(x.title) + "</div><h1>" + verdictLine(x, p) + "</h1>" +
      '<div class="row tight">' + (isTest && !x.partial && x.n >= 20 ? '<span class="pill ' + (pass ? "ok" : "bad") + '">' + (pass ? "Passing" : "Below " + passPct + "%") + "</span>" : "") + (x.partial ? '<span class="pill amber">Ended early</span>' : "") + '<span class="pill">' + icon("timer") + A.fmtTime(x.ms) + '</span><span class="pill amber">' + icon("bolt") + "+" + (x.xp || 0) + " XP</span>" + (x.bestCombo >= 3 ? '<span class="pill">' + icon("flame") + "Best run " + x.bestCombo + "</span>" : "") + "</div>" +
      (x.kind === "challenge" && x.opp != null ? '<p class="vs">You <b>' + x.right + "</b> vs friend <b>" + x.opp + "</b>: " + (x.right > x.opp ? "you win!" : x.right === x.opp ? "a tie." : "they got you this time.") + "</p>" : "") + "</div></section>");
    if (badges.length) out.push('<section class="card stack"><h3>New badges</h3><div class="badge-row">' + badges.map(function (b) { return '<div class="bdg on">' + icon(b.icon) + "<strong>" + esc(b.name) + "</strong><span>" + esc(b.desc) + "</span></div>"; }).join("") + "</div></section>");
    // actions
    var acts = ['<button class="btn primary" data-act="shareResult" data-id="' + x.id + '">' + icon("share") + "Share results</button>"];
    if (x.code) acts.push('<button class="btn" data-act="challengeFriend" data-id="' + x.id + '">' + icon("crew") + "Challenge a friend</button>");
    if (x.leftover && A.getRun(x.leftover)) acts.push('<button class="btn amber" data-act="resume" data-id="' + x.leftover + '">' + icon("play") + "Continue the " + A.getRun(x.leftover).ids.length + " saved</button>");
    var miss = x.items.filter(function (it) { return !it[2]; }).map(function (it) { return it[0]; });
    if (miss.length) acts.push('<button class="btn" data-act="retryMiss" data-id="' + x.id + '">' + icon("review") + "Study the " + miss.length + " missed</button>");
    acts.push('<button class="btn ghost" data-act="nav" data-v="' + (st.runFrom || (isTest ? "test" : "study")) + '">Done</button>');
    out.push('<div class="row actions-row">' + acts.join("") + "</div>");
    if (x.leftover && A.getRun(x.leftover)) out.push('<p class="small muted">The questions you didn’t get to are saved as a new session. Find it under “Pick up where you left off” on Home, Study or Practice Test.</p>');
    // topics
    var rows = Object.keys(x.byTopic).map(function (t) { return { t: t, n: x.byTopic[t].n, c: x.byTopic[t].c }; }).sort(function (a, b) { return a.c / a.n - b.c / b.n; });
    if (rows.length > 1) out.push('<section class="card stack"><h3>By topic</h3>' + rows.map(function (r) { var q = A.pct(r.c, r.n), cls = q >= 85 ? "ok" : q >= 70 ? "" : q >= 50 ? "warn" : "bad"; return '<button class="trow" data-act="nav" data-v="topic" data-p="' + r.t + '"><span class="tname">' + esc(A.TOPICS[r.t].name) + '</span><span class="bar ' + cls + '"><span style="width:' + q + '%"></span></span><span class="mono small">' + r.c + "/" + r.n + "</span></button>"; }).join("") + "</section>");
    // review list
    var f = st.resFilter || "missed";
    var list = x.items.filter(function (it) { return f === "all" || (f === "missed" && !it[2]); });
    out.push('<section class="card stack"><div class="row between"><h3>Review answers</h3><div class="chips">' + chip("resFilter", "missed", "Missed (" + miss.length + ")", f === "missed") + chip("resFilter", "all", "All (" + x.items.length + ")", f === "all") + "</div></div>" +
      '<div class="qgrid">' + x.items.map(function (it, i) { return '<button class="' + (it[2] ? "right" : "miss") + '" data-act="resJump" data-id="' + it[0] + '" title="' + (it[2] ? "Right" : it[1] == null ? "Blank" : "Missed") + '">' + (i + 1) + "</button>"; }).join("") + "</div>" +
      (list.length ? list.map(function (it) { return A.missCard(A.QBY[it[0]], it[1], { open: f === "missed" && list.length <= 3, ok: it[2] }); }).join("") : '<p class="empty">' + (f === "missed" ? "Nothing missed. Clean sheet!" : "Nothing here.") + "</p>") + "</section>");
    return out.join("");
  };
  function verdictLine(x, p) {
    if (x.kind === "daily") return x.right === x.n ? "Perfect day!" : x.right >= 8 ? "Strong showing" : x.right >= 6 ? "Solid. Keep at it." : "Tomorrow’s another day";
    if (x.mode === "study") return p >= 85 ? "Great session" : p >= 70 ? "Good work" : "Every miss is a lesson";
    if (x.partial) return "Graded so far";
    return p >= 85 ? "Exam-ready score" : p >= S().settings.passPct ? "That’s a pass" : "Not there yet, but closer";
  }
  A.ACT.resFilter = function (el) { st.resFilter = el.dataset.v; A.rerenderKeep(); };
  A.ACT.resJump = function (el) { if (st.resFilter !== "all") { st.resFilter = "all"; A.render(); } var d = document.getElementById("mc-" + el.dataset.id); if (d) { d.open = true; d.scrollIntoView({ block: "center", behavior: "smooth" }); } };
  A.ACT.shareResult = function (el) { var x = S().history.filter(function (h) { return h.id === el.dataset.id; })[0]; if (!x) return; A.share(x.kind === "daily" && S().daily[x.dailyKey] ? dailyShare(x.dailyKey) : A.shareText(x)); };
  A.ACT.challengeFriend = function (el) {
    var x = S().history.filter(function (h) { return h.id === el.dataset.id; })[0];
    var txt = "I scored " + x.right + "/" + x.n + " on FL Business & Finance Prep. Think you can beat me?\nOpen the app → Practice Test → enter challenge code: " + x.code;
    A.modal({ title: "Challenge a friend", html: '<p>Send this code. They get the exact same ' + x.n + ' questions and see your score to beat.</p><div class="codebig mono">' + esc(x.code) + "</div>", actions: [{ label: "Close" }, { label: "Copy message", cls: "primary", icon: "copy", fn: function () { A.copy(txt, "Challenge copied. Send it to a friend."); } }] });
  };
  A.ACT.retryMiss = function (el) { var x = S().history.filter(function (h) { return h.id === el.dataset.id; })[0]; A.newRun({ mode: "study", title: "Missed from " + x.title.replace(/ \(continued\)$/, ""), ids: x.items.filter(function (it) { return !it[2]; }).map(function (it) { return it[0]; }), from: "missed" }); };

  /** A reviewed question: your answer, the right one, plain English, where to find it. Used by results and Missed. */
  A.missCard = function (q, picked, o) {
    o = o || {};
    var ans = A.ansIdx(q), r = A.peek(q.id);
    return '<details class="miss" id="mc-' + q.id + '"' + (o.open ? " open" : "") + '><summary><span class="mi-dot ' + (o.ok ? "ok" : "bad") + '"></span><span class="mi-stem">' + A.stemHTML(q.stem, false) + '</span><span class="mi-meta mono">' + q.id + (r.missed > 1 ? " · missed " + r.missed + "×" : "") + "</span></summary><div class=\"mi-body\">" +
      (q.scenario ? '<div class="q-scenario small">' + esc(q.scenario) + "</div>" : "") +
      '<div class="ans-pair">' + (picked != null && picked !== ans ? '<div class="ap bad"><span class="k">Your answer</span><span>' + esc(q.options[picked]) + "</span></div>" : picked == null && !o.ok && o.showBlank !== false ? '<div class="ap bad"><span class="k">Your answer</span><span>Left blank</span></div>' : "") + '<div class="ap ok"><span class="k">Correct answer</span><span>' + esc(q.options[ans]) + "</span></div></div>" +
      '<div class="plain">' + icon("bulb") + '<div><div class="eyebrow">In plain English</div><p>' + esc(q.plain) + "</p></div></div>" +
      (q.tip ? '<div class="tipbox"><b>Remember</b><span>' + A.inline(q.tip) + "</span></div>" : "") +
      A.findPanel(q) +
      '<details class="more"><summary>Full explanation</summary>' + A.md(q.exp) + "</details>" +
      (q.edAns ? A.editionNote(q) : "") +
      '<div class="row tight"><button class="btn sm" data-act="studyOne" data-id="' + q.id + '">' + icon("review") + 'Try it again</button><button class="btn sm ghost" data-act="flagQ" data-id="' + q.id + '">' + icon("flag") + (r.f ? "Unflag" : "Flag") + "</button></div></div></details>";
  };
  A.ACT.studyOne = function (el) { A.newRun({ mode: "study", title: "Single question", ids: [el.dataset.id], from: st.view === "missed" ? "missed" : "study" }); };
  A.ACT.flagQ = function (el) { var r = A.rec(el.dataset.id); r.f = !r.f; A.save(); A.rerenderKeep(); };
})();
