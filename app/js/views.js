/* Screens: Home, Missed, Crew & Scores, Find It Trainer, Numbers to Know, Math Lab, Topics, Question bank,
   Progress, Exam Playbook, Settings. */
(function () {
  "use strict";
  var A = window.FBF, esc = A.esc, icon = A.icon, st = A.st, chip = A.chip, S = function () { return A.S; };

  function statTile(v, k, ic) { return '<div class="stat">' + (ic ? icon(ic) : "") + '<span class="v">' + v + '</span><span class="k">' + k + "</span></div>"; }
  A.statTile = statTile;
  function greeting() { var h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; }
  function ringSVG(pct, size, cls) { var r = 15.9; return '<svg viewBox="0 0 36 36" class="mini-ring ' + (cls || "") + '" width="' + size + '" height="' + size + '" aria-hidden="true"><circle cx="18" cy="18" r="' + r + '" pathLength="100" class="trk"/><circle cx="18" cy="18" r="' + r + '" pathLength="100" class="val" style="stroke-dashoffset:' + (100 - Math.min(100, pct)) + (pct <= 0 ? ";opacity:0" : "") + '"/></svg>'; }

  /* ================================================================ HOME */
  A.V.home = function () {
    var lv = A.levelInfo(), today = A.day(), goal = S().settings.goal, gp = A.pct(today.a, goal), dleft = A.daysUntil(S().settings.examDate);
    var name = S().settings.name || (A.cloud && A.cloud.name) || "";
    var h = [];
    h.push('<section class="hero-card"><div class="hc-grid"><div class="hc-main"><div class="eyebrow light">' + greeting() + (name ? ", " + esc(name.split(" ")[0]) : "") + "</div>" +
      '<h1 class="hc-rank"><span class="lvbadge light">Lv ' + lv.n + "</span>" + esc(lv.name) + "</h1>" +
      '<div class="xpbar xl"><span style="width:' + lv.pct + '%"></span></div><div class="hc-sub">' + lv.xp.toLocaleString() + " XP" + (lv.next ? " · " + (lv.next - lv.xp).toLocaleString() + " XP to " + esc(lv.nextName) : " · top rank") + "</div>" +
      '<div class="hc-chips"><span class="hchip">' + icon("flame") + A.plural(A.streak(), "day") + " streak</span><span class=\"hchip\">" + icon("bolt") + today.xp + " XP today</span>" + (dleft != null ? '<span class="hchip">' + icon("timer") + (dleft > 0 ? A.plural(dleft, "day") + " to exam" : dleft === 0 ? "Exam day!" : "Set new exam date") + "</span>" : '<button class="hchip btnlike" data-act="nav" data-v="settings">' + icon("timer") + "Set exam date</button>") + "</div></div>" +
      '<div class="hc-goal">' + ringSVG(gp, 92, "light") + '<div class="hcg-txt"><b>' + today.a + "</b><span>of " + goal + "</span></div><span class=\"tiny\">daily goal</span></div></div></section>");
    var runs = A.openRuns();
    if (runs.length) h.push('<section class="stack"><h3 class="sec-title">' + icon("play") + "Pick up where you left off</h3>" + runs.map(A.resumeCard).join("") + "</section>");
    var missed = A.missedIds().length, due = A.dueIds().length, daily = S().daily[A.todayKey()];
    h.push('<section class="mode-grid">' +
      '<button class="mode study" data-act="nav" data-v="study"><span class="m-ico">' + icon("study") + '</span><strong>Study</strong><span>One question at a time, answer explained right away</span><span class="m-go">' + icon("arrow") + "</span></button>" +
      '<button class="mode test" data-act="nav" data-v="test"><span class="m-ico">' + icon("test") + '</span><strong>Practice Test</strong><span>Timed, answers hidden until you submit</span><span class="m-go">' + icon("arrow") + "</span></button>" +
      '<button class="mode daily" data-act="startDaily"><span class="m-ico">' + icon("bolt") + "</span><strong>Daily Challenge</strong><span>" + (daily ? "Done today · " + daily.s + "/" + daily.n : "10 questions · same for your whole crew") + '</span><span class="m-go">' + icon("arrow") + "</span></button>" +
      '<button class="mode missed" data-act="nav" data-v="missed"><span class="m-ico">' + icon("missed") + "</span><strong>Missed questions</strong><span>" + (missed ? missed + " to fix, with where to find each answer" : "Nothing to fix right now") + '</span><span class="m-go">' + icon("arrow") + "</span></button>" +
      "</section>");
    var ns = nextStep(due, missed);
    h.push('<section class="card next-step"><div class="ns-ico">' + icon(ns.icon || "arrow") + '</div><div class="stack tight"><div class="eyebrow">Do this next</div><h3>' + esc(ns.title) + '</h3><p class="muted small">' + esc(ns.why) + '</p></div><button class="btn primary" data-act="' + ns.act + '"' + (ns.v ? ' data-v="' + ns.v + '"' : "") + ">" + esc(ns.cta) + icon("arrow") + "</button></section>");
    var R = A.readiness();
    h.push('<section class="card readiness"><div class="rd-top">' + gauge(R.score, R.label) + '<div class="stack tight"><div class="eyebrow">Pass readiness</div><h2>' + R.label + '</h2><p class="small muted">Check all eight and the real exam should feel easy. Tap any item to work on it.</p></div></div><div class="checks">' +
      R.checks.map(function (c) { return '<button class="check' + (c.done ? " done" : "") + '" data-act="nav" data-v="' + c.go + '"><span class="box">' + (c.done ? icon("check") : "") + "</span><span>" + esc(c.label) + '</span><span class="mono small muted">' + esc(c.val) + "</span></button>"; }).join("") + "</div></section>");
    var tl = A.TOPIC_KEYS.map(function (t) { var g = A.groupStats(A.topicIds(t)); return { t: t, g: g, s: g.seen ? g.acc * 0.5 + g.mastery * 0.5 : -1 + g.total / 1000 }; }).sort(function (a, b) { return a.s - b.s; });
    h.push('<section class="card stack"><div class="row between"><h3>Weakest topics</h3><button class="btn sm ghost" data-act="nav" data-v="topics">All topics' + icon("arrow") + "</button></div>" + tl.slice(0, 5).map(topicRow).join("") + "</section>");
    var recent = S().history.slice(-3).reverse();
    if (recent.length) h.push('<section class="card stack"><div class="row between"><h3>Recent results</h3><button class="btn sm ghost" data-act="nav" data-v="progress">History' + icon("arrow") + "</button></div>" + recent.map(A.historyRow).join("") + "</section>");
    return h.join("");
  };
  function gauge(score, label) {
    var r = 54, c = 2 * Math.PI * r, off = c * (1 - score / 100);
    var col = score >= 85 ? "var(--ok)" : score >= 70 ? "var(--primary)" : score >= 40 ? "var(--amber)" : "var(--bad)";
    return '<svg class="gauge" viewBox="0 0 130 130" role="img" aria-label="Readiness ' + score + " of 100, " + esc(label) + '"><circle cx="65" cy="65" r="' + r + '" fill="none" stroke="var(--surface-2)" stroke-width="12"/><circle cx="65" cy="65" r="' + r + '" fill="none" stroke="' + col + '" stroke-width="12" stroke-linecap="round" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '" transform="rotate(-90 65 65)"/><text x="65" y="72" text-anchor="middle" class="g-num">' + score + '</text><text x="65" y="90" text-anchor="middle" class="g-sub">/ 100</text></svg>';
  }
  function nextStep(due, missed) {
    var o = A.overall();
    if (missed >= 15) return { title: "Fix your " + missed + " missed questions", why: "Each one comes with a plain-English explanation and the page where the answer lives. Getting it right again turns it green.", cta: "Fix them", act: "stQuick", v: "missed", icon: "missed" };
    if (due >= 10) return { title: "Clear " + due + " due reviews", why: "Spaced reviews at the right time are what lock answers into long-term memory.", cta: "Start review", act: "stQuick", v: "due", icon: "review" };
    if (o.seen < A.Q.length) return { title: "Learn " + Math.min(20, A.Q.length - o.seen) + " new questions", why: (A.Q.length - o.seen) + " left to see. Use the Lookup Coach to find each answer in your book the first time through. That’s the skill that wins on test day.", cta: "Study new", act: "stQuick", v: "new", icon: "study" };
    if (S().look.n < 25) return { title: "Practice finding answers in your books", why: "The exam is open book. Find It Trainer times you finding real answers in your real books. Aim for under 90 seconds.", cta: "Open trainer", act: "nav", v: "find", icon: "find" };
    if (S().math.best < 10) return { title: "Sharpen the math", why: "Calculation questions are free points once the formulas are automatic. Get 10 in a row.", cta: "Math Lab", act: "nav", v: "math", icon: "math" };
    var ex = A.tests().slice(-3);
    if (ex.length < 3 || ex.some(function (a) { return a.score < A.TARGET; })) return { title: "Take a timed practice test", why: "Score 85%+ on three in a row. That’s a comfortable cushion over the passing score.", cta: "Practice Test", act: "nav", v: "test", icon: "test" };
    return { title: "Stay sharp", why: "You’re hitting every target. Do the Daily Challenge and clear reviews until test day.", cta: "Daily Challenge", act: "startDaily", icon: "bolt" };
  }
  function topicRow(x) {
    var g = x.g || A.groupStats(A.topicIds(x.t)), m = Math.round(g.mastery * 100), a = Math.round(g.acc * 100);
    var cls = !g.seen ? "" : g.acc >= 0.85 ? "ok" : g.acc >= 0.7 ? "" : g.acc >= 0.5 ? "warn" : "bad";
    return '<button class="trow" data-act="nav" data-v="topic" data-p="' + x.t + '"><span class="tname">' + esc(A.TOPICS[x.t].name) + '<span class="tiny muted">' + g.seen + "/" + g.total + " seen · " + m + '% mastered</span></span><span class="bar ' + cls + '"><span style="width:' + (g.seen ? a : 0) + '%"></span></span><span class="mono small">' + (g.seen ? a + "%" : "—") + "</span></button>";
  }
  A.topicRow = topicRow;

  /* ================================================================ MISSED */
  st.missed = st.missed || { tab: "fix", topic: "", sort: "most" };
  A.V.missed = function () {
    var m = st.missed, fixIds = A.missedIds(), fixedIds = A.fixedIds();
    var ids = (m.tab === "fix" ? fixIds : fixedIds).filter(function (id) { return !m.topic || A.QBY[id].topic === m.topic; });
    ids.sort(function (a, b) {
      var ra = A.peek(a), rb = A.peek(b);
      if (m.sort === "recent") return (rb.t || 0) - (ra.t || 0);
      if (m.sort === "book") return A.QBY[a].books[0].localeCompare(A.QBY[b].books[0]) || A.QBY[a].ix - A.QBY[b].ix;
      return (rb.missed || 0) - (ra.missed || 0) || A.QBY[a].ix - A.QBY[b].ix;
    });
    var topicsWith = {}; (m.tab === "fix" ? fixIds : fixedIds).forEach(function (id) { var t = A.QBY[id].topic; topicsWith[t] = (topicsWith[t] || 0) + 1; });
    var h = ['<header class="page-head"><div class="eyebrow">Missed questions</div><h1>Fix what you missed</h1><p>Every question you’ve gotten wrong, explained in plain English, with the book, section and index term so you can find it yourself. Get one right again and it moves to Fixed.</p></header>'];
    h.push('<section class="grid3">' + statTile(fixIds.length, "To fix", "missed") + statTile(fixedIds.length, "Fixed", "check") + statTile(S().counters.fixed, "Fixes all-time", "hard") + "</section>");
    if (fixIds.length) h.push('<div class="row actions-row"><button class="btn primary" data-act="missStudy" data-v="all">' + icon("review") + "Study all " + fixIds.length + '</button><button class="btn" data-act="missStudy" data-v="10">Quick 10</button><button class="btn" data-act="missTest">' + icon("test") + "Test me on them</button></div>");
    h.push('<section class="card stack"><div class="row between"><div class="seg" role="tablist">' +
      '<button data-act="missTab" data-v="fix" aria-pressed="' + (m.tab === "fix") + '">To fix · ' + fixIds.length + '</button><button data-act="missTab" data-v="fixed" aria-pressed="' + (m.tab === "fixed") + '">Fixed · ' + fixedIds.length + "</button></div>" +
      '<select data-change="missSort" aria-label="Sort" style="width:auto"><option value="most"' + (m.sort === "most" ? " selected" : "") + '>Most missed first</option><option value="recent"' + (m.sort === "recent" ? " selected" : "") + '>Most recent</option><option value="book"' + (m.sort === "book" ? " selected" : "") + ">Grouped by book</option></select></div>" +
      (Object.keys(topicsWith).length > 1 ? '<div class="chips">' + chip("missTopic", "", "All topics", !m.topic) + Object.keys(topicsWith).map(function (t) { return chip("missTopic", t, A.TOPICS[t].short, m.topic === t, topicsWith[t]); }).join("") + "</div>" : "") +
      (ids.length ? ids.map(function (id, i) { var r = A.peek(id); var prev = i && m.sort === "book" && A.QBY[ids[i - 1]].books[0] !== A.QBY[id].books[0]; return (m.sort === "book" && (i === 0 || prev) ? '<div class="groupline"><span class="tab ' + A.BOOKS[A.QBY[id].books[0]].color + '">' + esc(A.BOOKS[A.QBY[id].books[0]].name) + "</span></div>" : "") + A.missCard(A.QBY[id], r.lastPick != null ? r.lastPick : null, { ok: m.tab === "fixed", showBlank: false, open: i < 2 }); }).join("") :
        '<div class="empty">' + icon(m.tab === "fix" ? "check" : "missed") + "<p>" + (m.tab === "fix" ? (A.overall().seen ? "Nothing to fix. Every question you’ve missed, you’ve since gotten right." : "Answer some questions in Study or a Practice Test. Anything you miss lands here.") : "Fixed questions show up here once you get a missed one right.") + "</p></div>") + "</section>");
    return h.join("");
  };
  A.ACT.missTab = function (el) { st.missed.tab = el.dataset.v; st.missed.topic = ""; A.rerenderKeep(); };
  A.ACT.missTopic = function (el) { st.missed.topic = el.dataset.v; A.rerenderKeep(); };
  A.CHANGE.missSort = function (el) { st.missed.sort = el.value; A.rerenderKeep(); };
  A.ACT.missStudy = function (el) { var ids = A.shuffle(A.missedIds()); if (el.dataset.v === "10") ids = ids.slice(0, 10); A.newRun({ mode: "study", title: "Fix my misses", ids: ids, from: "missed" }); };
  A.ACT.missTest = function () { var ids = A.shuffle(A.missedIds()).slice(0, 50), s = S().settings; A.newRun({ mode: "test", title: "Missed-questions test", ids: ids, limit: Math.round((s.simMinutes / s.simCount) * ids.length * 60000), from: "missed" }); };

  /* ================================================================ CREW & SCORES */
  st.board = st.board || "xp";
  A.V.crew = function () {
    var lv = A.levelInfo(), s = S(), name = s.settings.name || (A.cloud && A.cloud.name) || "";
    var tests = A.tests(), passed = tests.filter(function (t) { return t.score >= s.settings.passPct / 100; }).length;
    var h = ['<header class="page-head"><div class="eyebrow">Crew &amp; Scores</div><h1>Level up with your crew</h1><p>Earn XP for every right answer, every lookup and every test. Climb from Laborer to Master Builder, collect badges, and send your scores and challenge codes to friends who are studying too.</p></header>'];
    h.push('<section class="profile-card"><div class="pc-avatar">' + (A.cloud && A.cloud.avatar ? '<img src="' + esc(A.cloud.avatar) + '" alt="">' : esc((name || "You").slice(0, 1).toUpperCase())) + '</div><div class="pc-main"><div class="eyebrow light">Level ' + lv.n + "</div><h2>" + esc(lv.name) + '</h2><div class="xpbar xl"><span style="width:' + lv.pct + '%"></span></div><div class="hc-sub">' + lv.xp.toLocaleString() + " XP" + (lv.next ? " · next: " + esc(lv.nextName) + " at " + lv.next.toLocaleString() : "") + '</div></div><div class="pc-stats">' +
      '<span><b>' + A.streak() + "</b>day streak</span><span><b>" + s.bestCombo + "</b>best run</span><span><b>" + A.overall().mastered + "</b>mastered</span><span><b>" + passed + "</b>tests passed</span></div></section>");
    h.push('<section class="card stack"><div class="row between"><h3>Share your progress</h3></div><div class="row tight"><div class="field" style="flex:1;min-width:180px"><label for="crewName">Your name on shared results</label><input type="text" id="crewName" value="' + esc(s.settings.name) + '" placeholder="' + esc((A.cloud && A.cloud.name) || "e.g. Mike R.") + '" data-change="setName" maxlength="40"></div><button class="btn" data-act="shareProgress" style="align-self:flex-end">' + icon("share") + "Send my progress</button></div></section>");
    // daily challenge
    var key = A.todayKey(), d = s.daily[key], days = [];
    for (var i = 6; i >= 0; i--) { var dt = new Date(); dt.setDate(dt.getDate() - i); var k = A.todayKey(dt); days.push({ k: k, d: s.daily[k], lbl: dt.toLocaleDateString(undefined, { weekday: "narrow" }) }); }
    h.push('<section class="card stack"><div class="row between"><div><div class="eyebrow">Daily Challenge #' + A.dailyNumber() + "</div><h3>" + (d ? "You scored " + d.s + "/" + d.n + " in " + A.fmtTime(d.ms) : "Today’s 10 are waiting") + '</h3></div><div class="row tight">' + (d ? '<button class="btn" data-act="shareDaily">' + icon("share") + "Share</button>" : "") + '<button class="btn primary" data-act="startDaily">' + (d ? "Replay" : "Play") + icon("arrow") + "</button></div></div>" +
      '<div class="week">' + days.map(function (x) { return '<div class="wday' + (x.d ? (x.d.s === x.d.n ? " perfect" : " done") : "") + (x.k === key ? " today" : "") + '"><span class="wd-l">' + x.lbl + '</span><span class="wd-v">' + (x.d ? x.d.s : "–") + "</span></div>"; }).join("") + "</div><p class=\"small muted\" style=\"margin:0\">Everyone gets the same 10 questions today, so scores are directly comparable.</p></section>");
    // leaderboard
    h.push(boardHTML());
    // challenges
    h.push('<section class="card stack"><h3>Challenge a friend</h3><p class="small muted" style="margin:0">Start a challenge, finish it, then send the code. Your friend gets the same questions in the same order, plus your score to beat. Got a code? Enter it below.</p><div class="row tight">' + [10, 25, 50].map(function (n) { return '<button class="btn" data-act="newChallenge" data-v="' + n + '">' + icon("plus") + n + " questions</button>"; }).join("") + '</div><div class="row tight"><input type="text" id="codeIn" placeholder="Friend’s code, e.g. 1K9X2Q-25-21" autocomplete="off" style="max-width:280px;text-transform:uppercase"><button class="btn primary" data-act="codeGo">Take challenge</button></div>' +
      (Object.keys(s.challenges).length ? '<div class="stack tight">' + Object.keys(s.challenges).slice(-5).reverse().map(function (c) { var x = s.challenges[c]; return '<div class="row between small"><span class="mono">' + esc(c) + "</span><span>You " + x.s + "/" + x.n + (x.opp != null ? " vs " + x.opp + (x.s > x.opp ? ' <span class="pill ok">won</span>' : x.s === x.opp ? ' <span class="pill">tie</span>' : ' <span class="pill bad">lost</span>') : "") + "</span></div>"; }).join("") + "</div>" : "") + "</section>");
    // badges
    var got = A.BADGES.filter(function (b) { return s.badges[b.id]; }).length;
    h.push('<section class="card stack"><div class="row between"><h3>Badges</h3><span class="mono small muted">' + got + " / " + A.BADGES.length + '</span></div><div class="badge-grid">' + A.BADGES.map(function (b) { var on = !!s.badges[b.id]; return '<div class="bdg' + (on ? " on" : "") + '" title="' + esc(b.desc) + '">' + icon(on ? b.icon : "lock") + "<strong>" + esc(b.name) + "</strong><span>" + esc(b.desc) + "</span></div>"; }).join("") + "</div></section>");
    // ranks
    h.push('<section class="card stack"><h3>Ranks</h3><div class="ranks">' + A.LEVELS.map(function (l, i) { var on = lv.n > i; return '<div class="rank' + (on ? " on" : "") + (lv.n === i + 1 ? " cur" : "") + '"><span class="rk-n">' + (i + 1) + '</span><span class="rk-name">' + esc(l[1]) + '</span><span class="mono tiny">' + l[0].toLocaleString() + " XP</span></div>"; }).join("") + '</div><p class="small muted" style="margin:0">XP: +10 per right answer · +5 when you found it with the Lookup Coach · +5 for fixing a miss · +10 for every 5 in a row · +25 for finishing a test, +50 for passing, +100 for 85%+ · Daily Challenge +15 each.</p></section>');
    return h.join("");
  };
  function boardHTML() {
    var c = A.cloud;
    if (!c || !c.on) {
      return '<section class="card stack"><h3>Crew leaderboard</h3><p class="small muted" style="margin:0">' + (c && c.status === "connecting" ? "Connecting…" : "The live leaderboard works when the app is opened from its shared link and you’re signed in. You can always compete by sharing results and challenge codes, which work everywhere.") + "</p></section>";
    }
    var rows = (c.board || []).slice(), key = A.todayKey(), mode = st.board;
    var val = function (r) { return mode === "xp" ? r.xp || 0 : mode === "daily" ? (r.daily && r.daily[key] ? r.daily[key].s * 100000 - Math.min(99999, Math.round(r.daily[key].ms / 1000)) : -1) : r.bestTest || 0; };
    rows = rows.filter(function (r) { return val(r) >= 0; }).sort(function (a, b) { return val(b) - val(a); });
    var disp = function (r) { return mode === "xp" ? (r.xp || 0).toLocaleString() + " XP" : mode === "daily" ? r.daily[key].s + "/" + r.daily[key].n + " · " + A.fmtTime(r.daily[key].ms) : Math.round((r.bestTest || 0) * 100) + "%"; };
    var names = c.names || {};
    var feed = [];
    (c.board || []).forEach(function (r) { (r.recent || []).forEach(function (x) { feed.push({ uid: r.uid, x: x }); }); });
    feed.sort(function (a, b) { return b.x.at - a.x.at; });
    return '<section class="card stack"><div class="row between"><h3>Crew leaderboard</h3><div class="seg">' + [["xp", "All-time XP"], ["daily", "Today’s challenge"], ["test", "Best test"]].map(function (t) { return '<button data-act="boardTab" data-v="' + t[0] + '" aria-pressed="' + (mode === t[0]) + '">' + t[1] + "</button>"; }).join("") + "</div></div>" +
      (rows.length ? '<ol class="board">' + rows.slice(0, 25).map(function (r, i) { var me = r.uid === c.uid, nm = me ? "You" : (names[r.uid] || "Crew member"); return '<li class="' + (me ? "me" : "") + '"><span class="br-rank">' + (i + 1) + '</span><span class="br-av" style="background:' + esc((c.colors || {})[r.uid] || "var(--primary)") + '">' + esc(nm.slice(0, 1).toUpperCase()) + '</span><span class="br-name">' + esc(nm) + '<span class="tiny muted">Lv ' + (r.level || 1) + " " + esc(r.rank || "") + (r.streak ? " · " + r.streak + "-day streak" : "") + '</span></span><span class="br-val mono">' + disp(r) + "</span></li>"; }).join("") + "</ol>" : '<p class="empty small">' + (mode === "daily" ? "Nobody has played today’s challenge yet. Be first." : "No scores yet. Finish a session to post yours.") + "</p>") +
      (feed.length ? '<div class="feed"><div class="eyebrow">Recent activity</div>' + feed.slice(0, 8).map(function (f) { var nm = f.uid === c.uid ? "You" : names[f.uid] || "Crew member"; return '<div class="fe"><span class="fe-dot"></span><span><b>' + esc(nm) + "</b> " + esc(f.x.txt) + '</span><span class="tiny muted">' + ago(f.x.at) + "</span></div>"; }).join("") + "</div>" : "") +
      '<p class="tiny muted" style="margin:0">Friends see this board when you share the app with them as editors. Each person’s progress is private. Only levels and scores are shared here.</p></section>';
  }
  function ago(t) { var d = Date.now() - t; if (d < 3600000) return Math.max(1, Math.round(d / 60000)) + "m"; if (d < 86400000) return Math.round(d / 3600000) + "h"; return Math.round(d / 86400000) + "d"; }
  A.ACT.boardTab = function (el) { st.board = el.dataset.v; A.rerenderKeep(); };
  A.CHANGE.setName = function (el) { S().settings.name = el.value.trim().slice(0, 40); A.save(); if (A.crewPublish) A.crewPublish(); A.toast("Name saved", "info"); };
  A.ACT.shareDaily = function () { A.share(A.dailyShare(A.todayKey())); };
  A.ACT.shareProgress = function () {
    var lv = A.levelInfo(), o = A.overall(), t = A.tests().slice(-1)[0];
    A.share("FL Business & Finance Prep\n" + (S().settings.name ? S().settings.name + ": " : "") + "Level " + lv.n + " " + lv.name + " · " + lv.xp.toLocaleString() + " XP\n🔥 " + A.plural(A.streak(), "day") + " streak · ✅ " + o.mastered + "/375 mastered\n" + (t ? "Last test: " + Math.round(t.score * 100) + "% (" + t.title + ")\n" : "") + "🏅 " + A.BADGES.filter(function (b) { return S().badges[b.id]; }).length + " badges · Readiness " + A.readiness().score + "/100");
  };
  A.ACT.newChallenge = function (el) { var n = +el.dataset.v, seed = (Math.random() * 2147483647) >>> 0; A.newRun({ mode: "challenge", title: "Challenge " + A.makeCode(seed, n), ids: A.seededSet(seed, n), seed: seed, code: A.makeCode(seed, n), from: "crew" }); };

  /* ================================================================ FIND IT TRAINER (+ tab guide) */
  st.fs = st.fs || null;
  A.V.find = function () {
    var L = S().look, avg = L.n ? L.total / L.n : 0;
    var h = ['<header class="page-head"><div class="eyebrow">Open-book skills</div><h1>Find It Trainer</h1><p>Contractors who pass say the same thing: the test is about <strong>finding</strong> answers fast, not memorizing them. Grab your real books. The trainer gives you a question, you pick the book and section, then find it while the clock runs.</p></header>'];
    h.push('<section class="grid4">' + statTile(L.n, "Lookups done", "find") + statTile(L.n ? A.fmtTime(avg) : "—", "Average find time", "timer") + statTile(L.best ? A.fmtTime(L.best) : "—", "Fastest", "bolt") + statTile(L.n ? A.pct(L.bookRight, L.n) + "%" : "—", "Right book first try", "book") + "</section>");
    h.push(sprintHTML());
    h.push(tabGuide());
    return h.join("");
  };
  function sprintHTML() {
    var f = st.fs;
    if (!f) {
      return '<section class="card stack sprint"><div class="row between"><h3>Lookup sprint</h3><span class="pill">Target: under 1:30</span></div><p class="small muted" style="margin:0">Pick where your questions come from, then start. The clock starts once you’ve picked the book and section.</p><div class="chips">' +
        chip("fsSrc", "all", "Any question", (st.fsSrc || "all") === "all") + chip("fsSrc", "missed", "My missed (" + A.missedIds().length + ")", st.fsSrc === "missed") + A.BOOK_KEYS.map(function (b) { return chip("fsSrc", b, A.BOOKS[b].short, st.fsSrc === b); }).join("") + '</div><div><button class="btn primary lg" data-act="fsStart">' + icon("find") + "Start a lookup</button></div></section>";
    }
    var q = A.QBY[f.id], p = A.lookup(q)[0], opts = A.chapterOptions(p.book);
    var h = '<section class="card stack sprint"><div class="row between"><div class="eyebrow">Lookup sprint · ' + q.id + '</div><span class="clock-inline mono" id="fsClock">' + (f.stage === "hunt" ? A.fmtTime(Date.now() - f.t0) : f.stage === "done" ? A.fmtTime(f.ms) : "0:00") + "</span></div>";
    h += '<p class="q-stem">' + A.stemHTML(q.stem) + "</p>";
    if (f.stage === "book") {
      h += '<div class="label">Step 1 · Which book has the answer?</div><div class="bookpick">' + A.BOOK_KEYS.map(function (b) { var cls = f.wrongBook && f.wrongBook.indexOf(b) >= 0 ? " wrong" : ""; return '<button class="bk ' + A.BOOKS[b].color + cls + '" data-act="fsBook" data-v="' + b + '"' + (cls ? " disabled" : "") + '><span class="bk-spine"></span><strong>' + esc(A.BOOKS[b].short) + "</strong><span>" + esc(A.BOOKS[b].name) + "</span></button>"; }).join("") + "</div>";
    } else if (f.stage === "chap") {
      h += '<div class="label">Step 2 · Which ' + (p.book === "FCM" ? "chapter" : "article") + ' of the <span class="tab ' + p.color + '">' + esc(p.short) + '</span>?</div><div class="chaplist">' + opts.map(function (o) { var w = f.wrongChap && f.wrongChap.indexOf(o.k) >= 0; return '<button class="chap' + (w ? " wrong" : "") + '" data-act="fsChap" data-v="' + o.k + '"' + (w ? " disabled" : "") + ">" + esc(o.label) + "</button>"; }).join("") + "</div>";
    } else if (f.stage === "hunt") {
      h += '<ol class="path"><li><span class="k">Book</span><span class="v"><span class="tab ' + p.color + '">' + esc(p.short) + "</span> " + esc(p.name) + "</span></li>" + (p.chap ? '<li><span class="k">Section</span><span class="v">' + esc(p.chap) + "</span></li>" : "") + (f.showTerm ? '<li><span class="k">Look up</span><span class="v"><mark class="hl">' + esc(q.look) + "</mark></span></li>" : "") + "</ol>" +
        '<div class="hunt"><div class="hunt-clock mono" id="fsBig">' + A.fmtTime(Date.now() - f.t0) + '</div><p class="small muted" style="margin:0">Now find the answer in your book. Tap <b>Found it</b> as soon as you’re looking at it.</p><div class="row tight" style="justify-content:center">' + (f.showTerm ? "" : '<button class="btn" data-act="fsTerm">' + icon("bulb") + "Index term hint</button>") + '<button class="btn primary lg" data-act="fsFound">' + icon("check") + "Found it</button></div></div>";
    } else if (f.stage === "done") {
      var fast = f.ms <= 90000;
      h += '<div class="verdict ' + (fast ? "ok" : "bad") + '">' + icon(fast ? "check" : "timer") + "<span>" + (fast ? "Found in " + A.fmtTime(f.ms) + ". That’s test-day speed." : "Found in " + A.fmtTime(f.ms) + ". Aim for under 1:30. Tab this page.") + '</span><span class="xpgain">+' + f.xp + " XP</span></div>" +
        '<div class="ans-pair"><div class="ap ok"><span class="k">Answer</span><span>' + esc(q.options[A.ansIdx(q)]) + "</span></div></div>" +
        '<div class="plain">' + icon("bulb") + '<div><div class="eyebrow">In plain English</div><p>' + esc(q.plain) + "</p></div></div>" + A.findPanel(q, { noKey: true }) +
        '<div class="row tight"><button class="btn" data-act="fsTab">' + icon("tabs") + 'Mark this page tabbed</button><button class="btn primary" data-act="fsStart">Next lookup' + icon("arrow") + '</button><button class="btn ghost" data-act="fsStop">Done</button></div>';
    }
    return h + "</section>";
  }
  var fsTimer = null;
  function fsTick() { clearInterval(fsTimer); fsTimer = setInterval(function () { var f = st.fs; if (!f || f.stage !== "hunt" || st.view !== "find") { clearInterval(fsTimer); return; } var t = A.fmtTime(Date.now() - f.t0); var a = document.getElementById("fsBig"), b = document.getElementById("fsClock"); if (a) a.textContent = t; if (b) b.textContent = t; }, 500); }
  A.AFTER.find = function () { if (st.fs && st.fs.stage === "hunt") fsTick(); };
  A.ACT.fsSrc = function (el) { st.fsSrc = el.dataset.v; A.rerenderKeep(); };
  A.ACT.fsStart = function () {
    var src = st.fsSrc || "all", ids = A.Q.map(function (q) { return q.id; });
    if (src === "missed") ids = A.missedIds();
    else if (A.BOOKS[src]) ids = A.Q.filter(function (q) { return q.books[0] === src; }).map(function (q) { return q.id; });
    if (!ids.length) { A.toast("No questions there yet.", "info"); return; }
    st.fs = { id: A.pick(ids), stage: "book", tries: 0, wrongBook: [], wrongChap: [] };
    A.rerenderKeep();
  };
  A.ACT.fsBook = function (el) {
    var f = st.fs, q = A.QBY[f.id], b = el.dataset.v;
    if (q.books.indexOf(b) >= 0) { f.bookOk = f.wrongBook.length === 0; f.book = b; var opts = A.lookup(q)[0].chapK && A.chapterOptions(A.lookup(q)[0].book); if (opts) f.stage = "chap"; else { f.stage = "hunt"; f.t0 = Date.now(); } }
    else { f.wrongBook.push(b); A.toast("Not that one. Think about which book covers " + A.TOPICS[q.topic].short.toLowerCase() + ".", "info"); }
    A.rerenderKeep();
  };
  A.ACT.fsChap = function (el) {
    var f = st.fs, p = A.lookup(A.QBY[f.id])[0];
    if (el.dataset.v === p.chapK) { f.chapOk = f.wrongChap.length === 0; f.stage = "hunt"; f.t0 = Date.now(); }
    else { f.wrongChap.push(el.dataset.v); A.toast("Not quite. Try another section.", "info"); }
    A.rerenderKeep();
  };
  A.ACT.fsTerm = function () { st.fs.showTerm = true; A.rerenderKeep(); };
  A.ACT.fsFound = function () {
    var f = st.fs; f.ms = Date.now() - f.t0; f.stage = "done";
    var L = S().look; L.n++; L.total += f.ms; L.best = L.best ? Math.min(L.best, f.ms) : f.ms; if (f.bookOk) L.bookRight++; if (f.chapOk) L.chapRight++;
    if (f.ms <= 90000) S().counters.fastFinds++;
    f.xp = 5 + (f.bookOk ? 3 : 0) + (f.chapOk ? 2 : 0) + (f.ms <= 90000 ? 5 : 0) - (f.showTerm ? 3 : 0);
    A.day().ms += f.ms;
    A.addXP(f.xp, "lookup"); A.save(); A.checkBadges(); A.rerenderKeep();
  };
  A.ACT.fsTab = function () { var q = A.QBY[st.fs.id], ed = S().settings.edition; q.cites.forEach(function (c) { if (!c.eds || c.eds.indexOf(ed) >= 0) S().tabs[ed + "|" + c.book + "|" + c.loc] = 1; }); A.save(); A.checkBadges(); A.toast("Marked tabbed in your Tab guide", "info", "tabs"); };
  A.ACT.fsStop = function () { st.fs = null; A.rerenderKeep(); };

  function tabGuide() {
    var ed = S().settings.edition, items = A.tabItems(), done = items.filter(function (t) { return S().tabs[t.key]; }).length;
    var h = '<section class="card stack"><div class="row between"><div><div class="eyebrow">Tab &amp; highlight guide</div><h3>Every page the answer keys point to</h3></div><div class="row tight"><label class="small muted" for="tabEd">Manual edition</label><select id="tabEd" data-change="edition" style="width:auto">' + ["2025", "2021", "2017"].map(function (e) { return "<option" + (ed === e ? " selected" : "") + ">" + e + "</option>"; }).join("") + '</select></div></div><div class="row between small"><span class="muted">' + done + " of " + items.length + ' tabbed</span><span class="muted">Pages hit by several questions are marked. Tab those first.</span></div><div class="bar ok"><span style="width:' + A.pct(done, items.length) + '%"></span></div>';
    A.BOOK_KEYS.forEach(function (b) {
      var list = items.filter(function (t) { return t.book === b; }).sort(locSort);
      if (!list.length) return;
      var dn = list.filter(function (t) { return S().tabs[t.key]; }).length;
      h += '<details class="bookgroup"' + (st.openBook === b ? " open" : "") + ' data-book="' + b + '"><summary><span class="tab ' + A.BOOKS[b].color + '">' + esc(A.BOOKS[b].short) + '</span><span class="bg-name">' + esc(A.BOOKS[b].name) + '</span><span class="mono small muted">' + dn + "/" + list.length + "</span></summary><p class=\"small muted\">" + esc(A.BOOKS[b].when) + "</p>" +
        list.map(function (t) {
          var on = !!S().tabs[t.key], topics = {};
          t.ids.forEach(function (id) { topics[A.QBY[id].topic] = 1; });
          return '<label class="tabrow' + (on ? " done" : "") + '"><input type="checkbox" data-change="tab" data-k="' + esc(t.key) + '"' + (on ? " checked" : "") + '><span class="loc mono">' + esc(b === "FCM" || b === "BGA" ? "p. " + t.loc : "§" + t.loc) + '</span><span class="what">' + Object.keys(topics).map(function (x) { return esc(A.TOPICS[x].short); }).join(", ") + (t.ids.length > 1 ? ' <span class="pill amber">' + t.ids.length + " questions</span>" : "") + '<span class="qlinks">' + t.ids.map(function (id) { return '<button class="qlink" data-act="openQ" data-id="' + id + '" title="' + esc(A.QBY[id].look) + '">' + id + "</button>"; }).join("") + "</span></span></label>";
        }).join("") + "</details>";
    });
    return h + "</section>";
  }
  function locSort(a, b) { var pa = String(a.loc).split(/[-.]/).map(function (x) { return parseFloat(x) || 0; }), pb = String(b.loc).split(/[-.]/).map(function (x) { return parseFloat(x) || 0; }); for (var i = 0; i < Math.max(pa.length, pb.length); i++) { var d = (pa[i] || 0) - (pb[i] || 0); if (d) return d; } return 0; }
  A.CHANGE.tab = function (el) { if (el.checked) S().tabs[el.dataset.k] = 1; else delete S().tabs[el.dataset.k]; A.save(); A.checkBadges(); var d = el.closest("details"); st.openBook = d && d.dataset.book; A.rerenderKeep(); };

  /* ================================================================ NUMBERS TO KNOW */
  A.V.cards = function () {
    var c = st.cards;
    if (c && c.i < c.list.length) return cardRunner(c);
    var known = A.factKnown();
    var h = ['<header class="page-head"><div class="eyebrow">Flashcards</div><h1>Numbers to Know</h1><p>The deadlines, dollar amounts and counts the exam loves. Flip each card and be honest. The ones you miss come back first. Even with the books open, knowing these cold saves you lookups.</p></header>'];
    if (c && c.list.length) h.push('<section class="card stack"><h3>Deck done: ' + c.right + " of " + c.list.length + ' known</h3><div class="row tight"><button class="btn primary" data-act="cardsStart" data-v="' + esc(c.topic) + '">Go again</button><button class="btn" data-act="cardsReset">Pick another deck</button></div></section>');
    h.push('<section class="card stack"><div class="row between"><h3>Pick a deck</h3><span class="mono small muted">' + known + " / " + A.FACTS.length + ' known</span></div><div class="bar ok"><span style="width:' + A.pct(known, A.FACTS.length) + '%"></span></div><div class="deck-grid">' +
      '<button class="deck feature" data-act="cardsStart" data-v="weak"><strong>Smart deck</strong><span>Unknown and missed first, 20 at a time</span></button><button class="deck" data-act="cardsStart" data-v="all"><strong>Everything</strong><span>All ' + A.FACTS.length + " cards</span></button>" +
      A.TOPIC_KEYS.filter(function (t) { return A.FACTS.some(function (f) { return f.t === t; }); }).map(function (t) { var fs = A.FACTS.filter(function (f) { return f.t === t; }), k = fs.filter(function (f) { var s = S().facts[f.q]; return s && s.last === 1; }).length; return '<button class="deck" data-act="cardsStart" data-v="' + t + '"><strong>' + esc(A.TOPICS[t].short) + "</strong><span>" + k + " / " + fs.length + ' known</span><span class="bar thin ok"><span style="width:' + A.pct(k, fs.length) + '%"></span></span></button>'; }).join("") + "</div></section>");
    h.push('<section class="card stack"><h3>Cheat sheet</h3><div class="scroll-x"><table class="t"><tbody>' + A.FACTS.map(function (f) { return "<tr><td>" + esc(f.q) + '</td><td class="strong">' + esc(f.a) + "</td></tr>"; }).join("") + "</tbody></table></div></section>");
    return h.join("");
  };
  function cardRunner(c) {
    var f = c.list[c.i];
    return '<div class="row between"><div class="eyebrow">Numbers to Know · ' + esc(c.topic === "all" ? "All" : c.topic === "weak" ? "Smart deck" : A.TOPICS[c.topic].short) + '</div><span class="mono small muted">' + (c.i + 1) + " / " + c.list.length + '</span></div><div class="bar thin"><span style="width:' + A.pct(c.i, c.list.length) + '%"></span></div>' +
      '<div class="flash' + (c.flipped ? " flipped" : "") + '" data-act="flip" role="button" tabindex="0" aria-label="Flip card"><div class="flash-inner"><div class="flash-face"><span class="eyebrow">' + esc(A.TOPICS[f.t].short) + '</span><div class="prompt">' + esc(f.q) + '</div><span class="small muted">Tap to flip · <span class="kbd">Space</span></span></div><div class="flash-face back"><span class="eyebrow">Answer</span><div class="big">' + esc(f.a) + '</div><span class="small">' + esc(f.q) + "</span></div></div></div>" +
      '<div class="row center">' + (c.flipped ? '<button class="btn danger lg" data-act="cardMark" data-v="0">' + icon("x") + 'Didn’t know <span class="kbd">1</span></button><button class="btn primary lg" data-act="cardMark" data-v="1">' + icon("check") + 'Knew it <span class="kbd">2</span></button>' : '<button class="btn primary lg" data-act="flip">Show answer</button>') + "</div>" +
      (c.flipped && f.ids && f.ids.length ? '<p class="small muted center">Tested by: ' + f.ids.map(function (id) { return '<button class="qlink" data-act="openQ" data-id="' + id + '">' + id + "</button>"; }).join(" ") + "</p>" : "") + '<div class="row center"><button class="btn sm ghost" data-act="cardsReset">End deck</button></div>';
  }
  A.ACT.cardsStart = function (el) {
    var topic = el.dataset.v || "weak", list;
    if (topic === "weak") list = A.shuffle(A.FACTS.slice().sort(function (a, b) { return fw(b) - fw(a); }).slice(0, 20));
    else if (topic === "all") list = A.shuffle(A.FACTS);
    else list = A.shuffle(A.FACTS.filter(function (f) { return f.t === topic; }));
    st.cards = { topic: topic, list: list, i: 0, flipped: false, right: 0 };
    A.go("cards");
  };
  function fw(f) { var s = S().facts[f.q]; if (!s) return 5 + Math.random(); return (s.last === 0 ? 8 : 0) + (s.k ? 0 : 3) - (s.k || 0) + Math.random(); }
  A.ACT.cardsReset = function () { st.cards = null; A.render(true); };
  A.ACT.flip = function () { if (st.cards) { st.cards.flipped = !st.cards.flipped; A.render(); } };
  A.ACT.cardMark = function (el, ev) {
    if (ev && ev.stopPropagation) ev.stopPropagation();
    var c = st.cards, f = c.list[c.i], k = el.dataset.v === "1", s = S().facts[f.q] || (S().facts[f.q] = { k: 0, m: 0 });
    if (k) { s.k++; c.right++; A.addXP(2, "card"); } else s.m++;
    s.last = k ? 1 : 0; c.i++; c.flipped = false; A.save(); A.checkBadges(); A.render();
  };
  A.KEYS.cards = function (k, ev) { var c = st.cards; if (!c || c.i >= c.list.length) return; if (k === " " || k === "enter") { ev.preventDefault(); A.ACT.flip(); } else if (c.flipped && (k === "1" || k === "2")) A.ACT.cardMark({ dataset: { v: k === "2" ? "1" : "0" } }); };

  /* ================================================================ MATH LAB */
  A.V.math = function () {
    var m = st.math, M = S().math, h = [];
    h.push('<header class="page-head"><div class="eyebrow">Math Lab</div><h1>Calculation practice</h1><p>Fresh numbers every time, using the same formulas the exam uses, with a worked solution for each. The calculator button gives you a basic calculator like the one you’ll bring.</p></header>');
    h.push('<section class="grid4">' + statTile(M.cur, "Current run", "flame") + statTile(M.best, "Best run", "trophy") + statTile(M.done, "Problems done", "math") + statTile(M.done ? A.pct(M.right, M.done) + "%" : "—", "Accuracy", "check") + "</section>");
    h.push('<section class="card stack"><div class="field"><span class="label">Problem type</span><div class="chips">' + chip("mathType", "mix", "Mixed", !m || m.type === "mix") + Object.keys(A.GEN).map(function (t) { return chip("mathType", t, A.GEN[t].name, m && m.type === t); }).join("") + "</div></div></section>");
    if (m && m.p) {
      var p = m.p;
      h.push('<article class="card qcard stack lg"><div class="row between"><span class="pill amber">' + esc(A.GEN[m.cur].name) + '</span><div class="row tight"><button class="icon-btn" data-act="calc" aria-label="Calculator">' + icon("calc") + '</button><span class="small muted">Problem ' + m.n + '</span></div></div><p class="q-stem">' + esc(p.text) + '</p><div class="options">' +
        m.order.map(function (ci, pos) { var cls = "opt", mark = ""; if (m.picked != null) { if (ci === 0) { cls += " correct"; mark = icon("check"); } else if (ci === m.picked) { cls += " wrong"; mark = icon("x"); } else cls += " dim"; } return '<button class="' + cls + '" data-act="mathPick" data-c="' + ci + '"' + (m.picked != null ? " disabled" : "") + '><span class="letter">' + A.L[pos] + '</span><span class="otext">' + esc(p.f(p.choices[ci])) + '</span><span class="mark">' + mark + "</span></button>"; }).join("") + "</div>" +
        (m.picked != null ? '<section class="reveal"><div class="verdict ' + (m.picked === 0 ? "ok" : "bad") + '">' + icon(m.picked === 0 ? "check" : "x") + "<span>" + (m.picked === 0 ? "Correct" : "Answer: " + esc(p.f(p.answer))) + '</span><span class="xpgain">+' + (m.picked === 0 ? 8 : 0) + ' XP</span></div><div class="eyebrow">Worked solution</div><div class="work">' + esc(p.work) + '</div></section><div class="row end"><button class="btn primary" data-act="mathNext">Next problem' + icon("arrow") + "</button></div>" : "") + "</article>");
    } else h.push('<div class="row"><button class="btn primary lg" data-act="mathNext">Start practicing' + icon("arrow") + "</button></div>");
    h.push('<section class="card stack"><h3>Formula sheet</h3><div>' + A.FORMULAS.map(function (f) { return '<div class="formula"><strong>' + esc(f.name) + '</strong><span class="fx mono">' + esc(f.f) + "</span></div>"; }).join("") + "</div></section>");
    return h.join("");
  };
  function nextMath() { var m = st.math || (st.math = { type: "mix", n: 0 }), types = Object.keys(A.GEN), t, p; do { t = m.type === "mix" ? A.pick(types) : m.type; p = A.makeProblem(t); } while (!p); m.cur = t; m.p = p; m.picked = null; m.n++; m.order = A.shuffle([0, 1, 2, 3]); }
  A.ACT.mathType = function (el) { var m = st.math || (st.math = { n: 0 }); m.type = el.dataset.v; nextMath(); A.rerenderKeep(); };
  A.ACT.mathNext = function () { if (!st.math) st.math = { type: "mix", n: 0 }; nextMath(); A.rerenderKeep(); };
  A.ACT.mathPick = function (el) { var m = st.math, M = S().math; if (m.picked != null) return; m.picked = +el.dataset.c; var ok = m.picked === 0; M.done++; if (ok) { M.right++; M.cur++; M.best = Math.max(M.best, M.cur); A.addXP(8, "math"); } else M.cur = 0; A.save(); A.checkBadges(); A.rerenderKeep(); };
  A.KEYS.math = function (k) { var m = st.math; if (!m || !m.p) return; var idx = "1234".indexOf(k) >= 0 ? "1234".indexOf(k) : "abcd".indexOf(k); if (idx >= 0 && k.length === 1 && m.picked == null) A.ACT.mathPick({ dataset: { c: m.order[idx] } }); else if ((k === "enter" || k === "n") && m.picked != null) A.ACT.mathNext(); };

  /* ================================================================ TOPICS */
  A.V.topics = function () {
    var list = A.TOPIC_KEYS.map(function (t) { return { t: t, g: A.groupStats(A.topicIds(t)) }; }).sort(function (a, b) { return b.g.total - a.g.total; });
    return '<header class="page-head"><div class="eyebrow">Topics</div><h1>Study by subject</h1><p>The 375 questions sorted into the subjects the state exam covers. Accuracy uses your latest answer to each question you’ve seen.</p></header><section class="card">' + list.map(topicRow).join("") + "</section>";
  };
  A.V.topic = function () {
    var t = st.param && A.TOPICS[st.param] ? st.param : A.TOPIC_KEYS[0], T = A.TOPICS[t], ids = A.topicIds(t), g = A.groupStats(ids);
    var h = ['<button class="btn sm ghost back" data-act="nav" data-v="topics">' + icon("back") + 'All topics</button><header class="page-head"><div class="eyebrow">Topic</div><h1>' + esc(T.name) + "</h1><p>" + esc(T.summary) + "</p></header>"];
    h.push('<section class="grid4">' + statTile(g.total, "Questions") + statTile(g.seen, "Seen") + statTile(g.seen ? Math.round(g.acc * 100) + "%" : "—", "Accuracy") + statTile(g.mastered, "Mastered") + "</section>");
    h.push('<div class="row actions-row"><button class="btn primary" data-act="topicStudy" data-v="' + t + '" data-f="all">Study all ' + g.total + '</button><button class="btn" data-act="topicStudy" data-v="' + t + '" data-f="new"' + (g.seen < g.total ? "" : " disabled") + ">New only (" + (g.total - g.seen) + ')</button><button class="btn" data-act="topicStudy" data-v="' + t + '" data-f="notm">Not mastered (' + (g.total - g.mastered) + ')</button><button class="btn" data-act="topicTest" data-v="' + t + '">' + icon("test") + "Topic test</button></div>");
    var facts = A.FACTS.filter(function (f) { return f.t === t; });
    if (facts.length) h.push('<section class="card stack"><div class="row between"><h3>Numbers to know</h3><button class="btn sm" data-act="cardsStart" data-v="' + t + '">Flashcards</button></div><div class="scroll-x"><table class="t"><tbody>' + facts.map(function (f) { return "<tr><td>" + esc(f.q) + '</td><td class="strong">' + esc(f.a) + "</td></tr>"; }).join("") + "</tbody></table></div></section>");
    var books = {}; ids.forEach(function (id) { A.QBY[id].books.forEach(function (b) { books[b] = (books[b] || 0) + 1; }); });
    h.push('<section class="card stack"><h3>Where these answers live</h3><div class="row tight">' + Object.keys(books).sort(function (a, b) { return books[b] - books[a]; }).map(function (b) { return '<span class="tab ' + A.BOOKS[b].color + '">' + esc(A.BOOKS[b].short) + " · " + books[b] + "</span>"; }).join("") + "</div></section>");
    h.push('<section class="card stack"><h3>Questions</h3><div class="dotline">' + ids.map(function (id) { return '<span class="dot b' + A.peek(id).box + '" title="' + id + '"></span>'; }).join("") + '</div><p class="tiny muted" style="margin:0">Green = mastered · amber = seen once · red = missed last time · grey = not seen</p>' + ids.map(function (id) { return bankItem(A.QBY[id]); }).join("") + "</section>");
    return h.join("");
  };
  A.ACT.topicStudy = function (el) { var t = el.dataset.v, f = el.dataset.f, ids = A.pool({ topics: [t], filter: f }); A.newRun({ mode: "study", title: A.TOPICS[t].short + (f === "new" ? " · new" : f === "notm" ? " · not mastered" : ""), ids: f === "new" ? ids : A.shuffle(ids), from: "topics" }); };
  A.ACT.topicTest = function (el) { var t = el.dataset.v, ids = A.shuffle(A.topicIds(t)).slice(0, 30), s = S().settings; A.newRun({ mode: "test", title: A.TOPICS[t].short + " test", ids: ids, limit: Math.round((s.simMinutes / s.simCount) * ids.length * 60000), from: "topics" }); };

  /* ================================================================ QUESTION BANK */
  st.bank = st.bank || { q: "", topic: "", exam: "", status: "" };
  A.V.bank = function () {
    var b = st.bank;
    return '<header class="page-head"><div class="eyebrow">Question bank</div><h1>All 375 questions</h1><p>Search every question with its answer, plain-English explanation and where to find it. Good for a final read-through the night before.</p></header>' +
      '<section class="card stack"><div class="field"><label for="bq">Search</label><input type="search" id="bq" data-input="bankQ" value="' + esc(b.q) + '" placeholder="Try: lien, 45 days, depreciation, A201"></div><div class="row tight">' +
      '<select data-change="bankExam" aria-label="Exam" style="flex:1;min-width:120px"><option value="">All exams</option>' + [1, 2, 3].map(function (e) { return '<option value="' + e + '"' + (String(b.exam) === String(e) ? " selected" : "") + ">Exam " + e + "</option>"; }).join("") + "</select>" +
      '<select data-change="bankTopic" aria-label="Topic" style="flex:2;min-width:160px"><option value="">All topics</option>' + A.TOPIC_KEYS.map(function (t) { return '<option value="' + t + '"' + (b.topic === t ? " selected" : "") + ">" + esc(A.TOPICS[t].name) + "</option>"; }).join("") + "</select>" +
      '<select data-change="bankStatus" aria-label="Status" style="flex:1;min-width:140px">' + [["", "Any status"], ["missed", "Missed last time"], ["flag", "Flagged"], ["new", "Not seen"], ["mast", "Mastered"], ["note", "Has my note"]].map(function (s) { return '<option value="' + s[0] + '"' + (b.status === s[0] ? " selected" : "") + ">" + s[1] + "</option>"; }).join("") + '</select></div></section><section class="card" id="bankList">' + bankList() + "</section>";
  };
  function bankList() {
    var b = st.bank, qq = b.q.trim().toLowerCase();
    var list = A.Q.filter(function (q) {
      if (b.exam && String(q.exam) !== String(b.exam)) return false;
      if (b.topic && q.topic !== b.topic) return false;
      var r = A.peek(q.id);
      if (b.status === "missed" && r.last !== 0) return false;
      if (b.status === "flag" && !r.f) return false;
      if (b.status === "new" && r.n) return false;
      if (b.status === "mast" && r.box < A.MASTER_BOX) return false;
      if (b.status === "note" && !r.note) return false;
      if (qq) { var hay = (q.id + " " + q.stem + " " + q.options.join(" ") + " " + q.exp + " " + q.plain + " " + q.look + " " + (q.scenario || "") + " " + q.ref.join(" ") + " " + (r.note || "")).toLowerCase(); if (qq.split(/\s+/).some(function (w) { return hay.indexOf(w) < 0; })) return false; }
      return true;
    });
    if (!list.length) return '<p class="empty">No questions match.</p>';
    return '<p class="small muted">' + A.plural(list.length, "question") + "</p>" + list.map(bankItem).join("");
  }
  function bankItem(q) {
    var ans = A.ansIdx(q), r = A.peek(q.id);
    var stt = r.box >= A.MASTER_BOX ? '<span class="pill ok">mastered</span>' : r.last === 0 ? '<span class="pill bad">missed</span>' : r.n ? '<span class="pill">seen</span>' : "";
    return '<details class="qitem" id="q-' + q.id + '"' + (st.openQ === q.id ? " open" : "") + '><summary><span class="qid mono">' + q.id + "</span><span>" + A.stemHTML(q.stem, false) + " " + stt + (r.f ? ' <span class="pill amber">flagged</span>' : "") + '</span></summary><div class="body">' +
      (q.scenario ? '<div class="q-scenario small">' + esc(q.scenario) + "</div>" : "") +
      '<ul class="optlist">' + q.options.map(function (o, i) { return '<li class="' + (i === ans ? "ans" : "") + '"><b>' + A.L[i] + ".</b> " + esc(o) + "</li>"; }).join("") + "</ul>" +
      '<div class="plain">' + icon("bulb") + '<div><div class="eyebrow">In plain English</div><p>' + esc(q.plain) + "</p></div></div>" + A.findPanel(q, { noKey: true }) +
      '<details class="more"><summary>Full explanation</summary>' + A.md(q.exp) + (q.tip ? '<div class="tipbox"><b>Remember</b><span>' + A.inline(q.tip) + "</span></div>" : "") + "</details>" +
      (r.note ? '<p class="small"><strong>My note:</strong> ' + esc(r.note) + "</p>" : "") +
      '<div class="row tight"><button class="btn sm" data-act="studyOne" data-id="' + q.id + '">Practice this one</button><button class="btn sm ghost" data-act="flagQ" data-id="' + q.id + '">' + icon("flag") + (r.f ? "Unflag" : "Flag") + "</button></div></div></details>";
  }
  function updBank() { var el = document.getElementById("bankList"); if (el) el.innerHTML = bankList(); }
  var bt = null;
  A.CHANGE.bankQ = function (el) { st.bank.q = el.value; clearTimeout(bt); bt = setTimeout(updBank, 150); };
  A.CHANGE.bankExam = function (el) { st.bank.exam = el.value; updBank(); };
  A.CHANGE.bankTopic = function (el) { st.bank.topic = el.value; updBank(); };
  A.CHANGE.bankStatus = function (el) { st.bank.status = el.value; updBank(); };
  A.ACT.openQ = function (el) { var id = el.dataset.id; st.openQ = id; st.bank = { q: "", topic: "", exam: "", status: "" }; A.go("bank"); setTimeout(function () { var d = document.getElementById("q-" + id); if (d) { d.open = true; d.scrollIntoView({ block: "center" }); } }, 40); };

  /* ================================================================ PROGRESS */
  A.V.progress = function () {
    var o = A.overall(), tests = A.tests(), tot = 0, cor = 0;
    Object.keys(S().q).forEach(function (k) { tot += S().q[k].n; cor += S().q[k].c; });
    var h = ['<header class="page-head"><div class="eyebrow">Progress</div><h1>How you’re trending</h1></header>'];
    h.push('<section class="grid4">' + statTile(tot.toLocaleString(), "Answers given", "check") + statTile(tot ? A.pct(cor, tot) + "%" : "—", "All-time accuracy", "chart") + statTile(o.seen, "Questions seen", "study") + statTile(tests.length, "Tests taken", "test") + "</section>");
    h.push('<section class="card stack"><h3>Practice test scores</h3>' + (tests.length ? lineChart(tests.slice(-12)) : '<p class="empty small">Finish a practice test of 20+ questions to see your trend. The dashed lines mark passing and the 85% target.</p>') + "</section>");
    h.push('<section class="card stack"><h3>Last 14 days</h3>' + barChart() + "</section>");
    h.push('<section class="card stack"><h3>By reference book</h3>' + A.BOOK_KEYS.map(function (b) { var g = A.groupStats(A.Q.filter(function (q) { return q.books[0] === b; }).map(function (q) { return q.id; })), a = Math.round(g.acc * 100); return '<div class="trow static"><span class="tname"><span class="tab ' + A.BOOKS[b].color + '">' + esc(A.BOOKS[b].short) + '</span></span><span class="bar"><span style="width:' + (g.seen ? a : 0) + '%"></span></span><span class="mono small">' + (g.seen ? a + "%" : "—") + "</span></div>"; }).join("") + "</section>");
    var hist = S().history.slice().reverse();
    h.push('<section class="card stack"><h3>Session history</h3>' + (hist.length ? hist.slice(0, 30).map(A.historyRow).join("") : '<p class="empty small">No sessions yet.</p>') + "</section>");
    return h.join("");
  };
  function lineChart(list) {
    var W = 560, H = 200, pl = 34, pr = 14, pt = 14, pb = 26, iw = W - pl - pr, ih = H - pt - pb, pass = S().settings.passPct / 100;
    var x = function (i) { return pl + (list.length === 1 ? iw / 2 : (iw * i) / (list.length - 1)); }, y = function (v) { return pt + ih * (1 - v); };
    var s = '<div class="scroll-x"><svg class="chart" viewBox="0 0 ' + W + " " + H + '" style="width:100%;min-width:320px" role="img" aria-label="Practice test score history">';
    [0, 0.25, 0.5, 0.75, 1].forEach(function (v) { s += '<line class="grid" x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y(v) + '" y2="' + y(v) + '"/><text x="' + (pl - 6) + '" y="' + (y(v) + 3) + '" text-anchor="end">' + v * 100 + "</text>"; });
    s += '<line class="passl" x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y(pass) + '" y2="' + y(pass) + '"/><line class="tgtl" x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y(A.TARGET) + '" y2="' + y(A.TARGET) + '"/>';
    var pts = list.map(function (a, i) { return x(i) + "," + y(a.score); });
    if (list.length > 1) s += '<polygon class="area" points="' + x(0) + "," + y(0) + " " + pts.join(" ") + " " + x(list.length - 1) + "," + y(0) + '"/><polyline class="line" points="' + pts.join(" ") + '"/>';
    list.forEach(function (a, i) { s += '<circle class="pt" cx="' + x(i) + '" cy="' + y(a.score) + '" r="' + (i === list.length - 1 ? 5.5 : 3.5) + '"><title>' + esc(a.title) + ": " + Math.round(a.score * 100) + "%</title></circle><text x=\"" + x(i) + '" y="' + (H - 8) + '" text-anchor="middle">' + (new Date(a.at).getMonth() + 1) + "/" + new Date(a.at).getDate() + "</text>"; });
    var last = list[list.length - 1];
    s += '<text class="lbl" x="' + Math.min(x(list.length - 1), W - pr - 4) + '" y="' + (y(last.score) - 10) + '" text-anchor="end">' + Math.round(last.score * 100) + "%</text>";
    return s + "</svg></div>";
  }
  function barChart() {
    var W = 560, H = 160, pl = 30, pb = 22, pt = 10, iw = W - pl - 8, ih = H - pt - pb, days = [], goal = S().settings.goal;
    for (var i = 13; i >= 0; i--) { var d = new Date(); d.setDate(d.getDate() - i); days.push({ d: d, v: (S().days[A.todayKey(d)] || { a: 0 }).a }); }
    var max = Math.max(goal, Math.max.apply(null, days.map(function (x) { return x.v; }))), bw = (iw / 14) * 0.62;
    var s = '<div class="scroll-x"><svg class="chart" viewBox="0 0 ' + W + " " + H + '" style="width:100%;min-width:320px" role="img" aria-label="Questions answered per day">', gy = pt + ih * (1 - goal / max);
    s += '<line class="grid" x1="' + pl + '" x2="' + (W - 8) + '" y1="' + (pt + ih) + '" y2="' + (pt + ih) + '"/><line class="passl" x1="' + pl + '" x2="' + (W - 8) + '" y1="' + gy + '" y2="' + gy + '"/><text x="' + (pl - 4) + '" y="' + (gy + 3) + '" text-anchor="end">' + goal + "</text>";
    days.forEach(function (x, i) { var bh = (ih * x.v) / max, cx = pl + (iw / 14) * i + (iw / 14 - bw) / 2; s += '<rect class="barr' + (x.v >= goal ? " goal" : "") + '" x="' + cx + '" y="' + (pt + ih - bh) + '" width="' + bw + '" height="' + Math.max(bh, x.v ? 2 : 0) + '" rx="3"><title>' + x.d.toLocaleDateString() + ": " + x.v + "</title></rect>"; if (i % 2 === 1 || i === 13) s += '<text x="' + (cx + bw / 2) + '" y="' + (H - 6) + '" text-anchor="middle">' + (x.d.getMonth() + 1) + "/" + x.d.getDate() + "</text>"; });
    return s + "</svg></div>";
  }

  /* ================================================================ PLAYBOOK */
  A.V.playbook = function () {
    var o = A.overall(), ex = A.tests().slice(-3), dleft = A.daysUntil(S().settings.examDate);
    var phase = o.seen < A.Q.length ? 0 : o.mastery < 0.9 || A.factKnown() < A.FACTS.length || S().math.best < 10 || S().look.n < 25 ? 1 : ex.length < 3 || ex.some(function (a) { return a.score < A.TARGET; }) ? 2 : 3;
    var cls = function (i) { return i < phase ? "done" : i === phase ? "now" : ""; };
    var perDay = dleft && dleft > 0 ? Math.max(20, Math.ceil((A.Q.length - o.seen + A.dueIds().length) / Math.max(1, Math.floor(dleft * 0.6)))) : null;
    return '<header class="page-head"><div class="eyebrow">Exam playbook</div><h1>How to pass the first time</h1><p>A plan that uses every tool in this app, plus what to do on test day.</p></header>' +
      '<section class="card stack"><h3>Your plan</h3>' + (perDay ? '<p class="callout">With ' + A.plural(dleft, "day") + " left, do about <strong>" + perDay + " questions a day</strong> until you’ve seen them all, then spend the last stretch on reviews and timed tests.</p>" : '<p class="small muted">Set your exam date in <a href="#settings" data-act="nav" data-v="settings">Settings</a> for a daily target.</p>') +
      '<div class="steps"><div class="' + cls(0) + '"><div><strong>Learn: one pass through all 375</strong><p class="small muted">Use Study with the Lookup Coach on. For each question, find the answer in your book before you pick. ' + o.seen + "/375 seen.</p></div></div>" +
      '<div class="' + cls(1) + '"><div><strong>Lock in: Missed, Smart Review, Find It, flashcards, math</strong><p class="small muted">Fix every missed question. Get your book lookups under 90 seconds. Know every Numbers to Know card. Get 10 math problems in a row. ' + o.mastered + " mastered · " + S().look.n + " lookups · " + A.factKnown() + "/" + A.FACTS.length + " cards.</p></div></div>" +
      '<div class="' + cls(2) + '"><div><strong>Simulate: timed practice tests with your books</strong><p class="small muted">Take the full state exam and the three printed practice exams under the clock. Aim for 85% three times in a row. ' + (ex.length ? "Last: " + ex.map(function (a) { return Math.round(a.score * 100) + "%"; }).join(", ") : "None yet") + ".</p></div></div>" +
      '<div class="' + cls(3) + '"><div><strong>Stay sharp until test day</strong><p class="small muted">Do the Daily Challenge and clear reviews. The night before, skim the Numbers to Know cheat sheet and your flagged questions, then get some sleep.</p></div></div></div></section>' +
      '<section class="card prose"><h3>Why people struggle, and what to do about it</h3><ul class="pain">' +
      "<li><b>Memorizing instead of finding.</b> Practice questions repeat, so it’s easy to memorize letters and then freeze when the real exam words things differently. <em>Fix:</em> answers are shuffled, the Lookup Coach and Find It Trainer build the lookup habit, and every answer shows the book, section and index term.</li>" +
      "<li><b>Running out of time.</b> Slow lookups on a few questions eat the clock. <em>Fix:</em> timed tests with a pace meter, plus lookup sprints to get under 90 seconds.</li>" +
      "<li><b>Trick wording.</b> “All of the following EXCEPT…” catches a lot of people. <em>Fix:</em> trap words are highlighted until spotting them is automatic.</li>" +
      "<li><b>Not knowing which book to grab.</b> Six references, and a lot of overlap. <em>Fix:</em> the Book step in Find It, and Progress by book.</li>" +
      "<li><b>Wrong edition.</b> Page numbers and a couple of answers change between Contractors Manual editions. <em>Fix:</em> set your edition in Settings. Pages and answers follow it.</li>" +
      "<li><b>Math nerves.</b> <em>Fix:</em> Math Lab with unlimited problems, worked solutions and a calculator.</li>" +
      "<li><b>Studying in bits and pieces.</b> <em>Fix:</em> set a time limit, pause anytime, and pick up later. Unfinished questions are saved.</li></ul></section>" +
      '<section class="card prose"><h3>About the exam</h3><p>Florida’s Business and Finance exam is <strong>open book</strong> and multiple choice, and every Division I and II contractor takes it. You bring the approved reference books (highlighting and permanent tabs are allowed under the bulletin rules) and a basic calculator.</p><p>Check your current <strong>Candidate Information Bulletin</strong> for the exact question count, time limit, passing score and reference list. The simulator defaults to 120 questions in 7 hours with 70% to pass, and you can change that in <a href="#settings" data-act="nav" data-v="settings">Settings</a>.</p></section>' +
      '<section class="card prose"><h3>Test-day checklist</h3><ul class="checklist"><li>Photo ID and your admission or confirmation info, as listed in your bulletin</li><li>Every approved reference book, in the edition the bulletin lists, tabbed and highlighted</li><li>An approved basic calculator with fresh batteries</li><li>Get there early. Rushing makes the first hour harder.</li></ul></section>' +
      '<section class="card prose"><h3>During the exam</h3><ol><li><strong>Two passes.</strong> First, answer everything you know cold and flag the rest. Then go back and look up the flagged ones.</li><li><strong>About 3½ minutes per question.</strong> If a lookup passes 4 minutes, make your best guess, flag it, and move on.</li><li><strong>Never leave a blank.</strong> There’s no penalty for guessing.</li><li><strong>Read for NOT and EXCEPT</strong> before you read the choices.</li><li><strong>“All of the above”:</strong> if two choices are definitely true, it’s usually the answer.</li><li><strong>Math:</strong> write the formula first, then plug in the numbers. Check that the answer makes sense.</li><li><strong>Federal vs. Florida:</strong> if the question says federal, give the federal number.</li><li>Only change an answer if you find proof in the book.</li></ol></section>';
  };

  /* ================================================================ SETTINGS */
  A.V.settings = function () {
    var s = S().settings, c = A.cloud;
    var seg = function (key, opts) { return '<div class="seg">' + opts.map(function (o) { return '<button data-act="setSeg" data-k="' + key + '" data-v="' + o[0] + '" aria-pressed="' + (String(s[key]) === String(o[0])) + '">' + (o[2] ? icon(o[2]) : "") + "<span>" + o[1] + "</span></button>"; }).join("") + "</div>"; };
    return '<header class="page-head"><div class="eyebrow">Settings</div><h1>Settings</h1></header>' +
      '<section class="card stack lg"><h3>Look &amp; feel</h3><div class="setrow"><span><strong>Theme</strong><span class="small muted">Light, dark, or match your device</span></span>' + seg("theme", [["system", "Auto", "auto"], ["light", "Light", "sun"], ["dark", "Dark", "moon"]]) + '</div><div class="setrow"><span><strong>Layout</strong><span class="small muted">Phone layout puts navigation at the bottom. Desktop adds a sidebar.</span></span>' + seg("layout", [["auto", "Auto", "auto"], ["phone", "Phone", "phone"], ["desktop", "Desktop", "desktop"]]) + '</div><div class="setrow"><span><strong>Text size</strong><span class="small muted">Bigger text for easier reading</span></span>' + seg("text", [["md", "Normal", ""], ["lg", "Large", ""], ["xl", "Extra large", ""]]) + "</div></section>" +
      '<section class="card stack lg"><h3>Studying</h3><div class="grid2"><div class="field"><label for="sDate">Exam date</label><input type="date" id="sDate" data-change="setVal" data-k="examDate" value="' + esc(s.examDate) + '"></div><div class="field"><label for="sGoal">Daily question goal</label><input type="number" id="sGoal" min="5" max="400" step="5" data-change="setNum" data-k="goal" value="' + s.goal + '"></div><div class="field"><label for="sEd">Contractors Manual edition</label><select id="sEd" data-change="edition">' + ["2025", "2021", "2017"].map(function (e) { return "<option" + (s.edition === e ? " selected" : "") + ">" + e + "</option>"; }).join("") + '</select><span class="tiny muted">Sets the page numbers shown and the answers for the 2 edition-dependent questions.</span></div><div class="field"><label for="sName">Your name (for shared results)</label><input type="text" id="sName" data-change="setName" value="' + esc(s.name) + '" maxlength="40"></div></div>' +
      '<div class="toggles"><label class="toggle"><input type="checkbox" data-change="setBool" data-k="coach"' + (s.coach ? " checked" : "") + '><span><strong>Lookup Coach</strong><span class="small muted">“Where do I look?” button in Study</span></span></label><label class="toggle"><input type="checkbox" data-change="setBool" data-k="traps"' + (s.traps ? " checked" : "") + '><span><strong>Highlight trap words</strong><span class="small muted">NOT, EXCEPT, never, least</span></span></label><label class="toggle"><input type="checkbox" data-change="setBool" data-k="shuffle"' + (s.shuffle ? " checked" : "") + '><span><strong>Shuffle answer choices</strong><span class="small muted">Printed practice exams always keep the original order</span></span></label></div></section>' +
      '<section class="card stack lg"><h3>Exam simulation</h3><p class="small muted" style="margin:0">Match these to your Candidate Information Bulletin.</p><div class="grid3"><div class="field"><label for="sCount">Questions</label><input type="number" id="sCount" min="20" max="300" data-change="setNum" data-k="simCount" value="' + s.simCount + '"></div><div class="field"><label for="sMin">Time limit (minutes)</label><input type="number" id="sMin" min="10" max="900" data-change="setNum" data-k="simMinutes" value="' + s.simMinutes + '"></div><div class="field"><label for="sPass">Passing score (%)</label><input type="number" id="sPass" min="50" max="100" data-change="setNum" data-k="passPct" value="' + s.passPct + '"></div></div></section>' +
      '<section class="card stack"><h3>Your saved progress</h3><p class="small" style="margin:0">' + (c && c.on ? icon("check") + " <strong>Saved to your account.</strong> Your progress follows you to any device where you open this app while signed in. A copy is also kept in this browser." : "<strong>Saved in this browser on this device.</strong> " + (A.storageOK ? "It’s remembered between visits." : "Storage is blocked here, so progress only lasts until you close the page.") + " To move to another device, copy a backup code and restore it there.") + '</p><div class="row tight"><button class="btn" data-act="exportCopy">' + icon("copy") + 'Copy backup code</button><button class="btn" data-act="exportShow">Show backup code</button>' + /*DL*/'<button class="btn" data-act="exportFile">Download backup file</button>' + /*/DL*/'</div><div class="field"><label for="importBox">Restore from a backup code</label><textarea id="importBox" rows="3" placeholder="Paste a backup code here"></textarea></div><div class="row tight"><button class="btn primary" data-act="importPaste">Restore</button><label class="btn">Restore from file<input type="file" accept=".json,application/json" data-change="importFile" hidden></label></div></section>' +
      '<section class="card stack"><h3>Start over</h3><p class="small muted" style="margin:0">Erases every answer, XP, badge, test, flag, note and tab check.</p><div><button class="btn danger" data-act="resetAll">Reset all progress</button></div></section>';
  };
  A.ACT.setSeg = function (el) { S().settings[el.dataset.k] = el.dataset.v; A.save(); A.rerenderKeep(); };
  A.CHANGE.setBool = function (el) { S().settings[el.dataset.k] = el.checked; A.save(); if (A.st.view === "run") A.render(); };
  A.CHANGE.setVal = function (el) { S().settings[el.dataset.k] = el.value; A.save(); A.toast("Saved", "info", "check"); };
  A.CHANGE.setNum = function (el) {
    var k = el.dataset.k, v = +el.value, lim = { goal: [5, 400, 40], simCount: [20, 330, 120], simMinutes: [10, 900, 420], passPct: [50, 100, 70] }[k];
    S().settings[k] = Math.min(lim[1], Math.max(lim[0], v || lim[2])); A.save();
  };
  A.CHANGE.edition = function (el) { S().settings.edition = el.value; A.save(); A.rerenderKeep(); A.toast("Edition set to " + el.value, "info", "book"); };
  function exportCode() { return JSON.stringify({ app: "fbf-study", v: 2, at: Date.now(), data: S() }); }
  A.ACT.exportCopy = function () { A.copy(exportCode(), "Backup code copied. Paste it somewhere safe."); };
  A.ACT.exportShow = function () { A.modal({ title: "Backup code", html: '<textarea class="copybox" id="copybox" readonly>' + esc(exportCode()) + '</textarea><p class="small muted">Select all and copy. Paste it into Settings on another device to restore.</p>', actions: [{ label: "Done", cls: "primary" }], noFocus: true }); setTimeout(function () { var b = document.getElementById("copybox"); if (b) { b.focus(); b.select(); } }, 30); };
  /*DL*/A.ACT.exportFile = function () { try { var blob = new Blob([exportCode()], { type: "application/json" }), a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "fl-bf-progress-" + A.todayKey() + ".json"; document.body.appendChild(a); a.click(); a.remove(); A.toast("Download started", "info"); } catch (e) { A.ACT.exportShow(); } };/*/DL*/
  A.ACT.importPaste = function () { doImport((document.getElementById("importBox") || {}).value || ""); };
  A.CHANGE.importFile = function (el) { var f = el.files && el.files[0]; if (!f) return; var r = new FileReader(); r.onload = function () { doImport(String(r.result)); }; r.readAsText(f); };
  function doImport(text) {
    try {
      var obj = JSON.parse(text.trim()), d = obj.data || obj;
      if (!d || typeof d.q !== "object") throw new Error("bad");
      A.confirm("Restore this backup?", "This replaces the progress here with the backup (" + Object.keys(d.q).length + " questions tracked).", "Restore", function () {
        A.S = d.v === 2 ? A.normalize(d) : (function () { try { localStorage.setItem("fbf-study-v1", JSON.stringify(d)); localStorage.removeItem("fbf-study-v2"); } catch (e) { /* ignore */ } return A.load(); })();
        A.save(); A.toast("Progress restored", "info", "check"); A.go("home");
      });
    } catch (e) { A.toast("That doesn’t look like a backup code. Copy the whole thing and try again.", "info"); }
  }
  A.ACT.resetAll = function () { A.confirm("Reset all progress?", "This erases everything: answers, XP, badges, tests, flags, notes and tabs. It can’t be undone.", "Erase everything", function () { var keep = S().settings; A.S = A.defaults(); A.S.settings = keep; A.save(); st.cards = null; st.math = null; st.fs = null; A.toast("Progress reset", "info"); A.go("home"); }, true); };
})();
