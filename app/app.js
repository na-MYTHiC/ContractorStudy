/* Florida Business & Finance study app. Plain JS, no build step, no network needed.
   Data: window.QUESTIONS (data/questions.js), TOPICS/BOOKS/FACTS/FORMULAS (data/meta.js).
   Progress is saved in localStorage on this device; Settings has backup/restore. */
(function () {
  "use strict";

  var Q = window.QUESTIONS || [];
  var QBY = {};
  Q.forEach(function (q) { QBY[q.id] = q; });
  var TOPICS = window.TOPICS, BOOKS = window.BOOKS, FACTS = window.FACTS, FORMULAS = window.FORMULAS;
  var TOPIC_KEYS = Object.keys(TOPICS);
  var BOOK_KEYS = Object.keys(BOOKS);
  var L = "ABCD";
  var DAY = 86400000;
  var INTERVALS = [0, 1, 3, 7, 16, 35]; // days until next review, by box
  var MASTER_BOX = 3;
  var PASS = 0.70, TARGET = 0.85;

  /* ------------------------------------------------------------------ storage */
  var KEY = "fbf-study-v1";
  function defaults() {
    return {
      v: 1, q: {}, attempts: [], exam: null, tabs: {}, facts: {}, days: {},
      math: { best: 0, cur: 0, done: 0, right: 0 }, bf: { done: 0, right: 0 },
      settings: { edition: "2025", shuffle: true, goal: 40, examDate: "", theme: "system", simCount: 120, simMinutes: 420, passPct: 70 }
    };
  }
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var d = JSON.parse(raw), base = defaults();
        var out = Object.assign(base, d);
        out.settings = Object.assign(defaults().settings, d.settings || {});
        out.math = Object.assign(defaults().math, d.math || {});
        out.bf = Object.assign(defaults().bf, d.bf || {});
        return out;
      }
    } catch (e) { /* storage unavailable */ }
    return defaults();
  }
  var S = load();
  var storageOK = true;
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); storageOK = true; } catch (e) { storageOK = false; }
  }

  /* ------------------------------------------------------------------ helpers */
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function md(s) {
    return esc(s).split(/\n+/).map(function (p) { return "<p>" + p.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>") + "</p>"; }).join("");
  }
  function inline(s) { return esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>"); }
  function stemHTML(s) { return esc(s).replace(/_{3,}/g, '<span class="blank" aria-label="blank"></span>'); }
  function pct(n, d) { return d ? Math.round((100 * n) / d) : 0; }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function todayKey(d) { d = d || new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function fmtTime(ms) {
    ms = Math.max(0, ms); var s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
    return (h ? h + ":" + String(m).padStart(2, "0") : m) + ":" + String(x).padStart(2, "0");
  }
  function money(n, dec) {
    var neg = n < 0; n = Math.abs(n);
    var s = n.toLocaleString("en-US", { minimumFractionDigits: dec || 0, maximumFractionDigits: dec || 0 });
    return (neg ? "−$" : "$") + s;
  }
  function plural(n, w) { return n + " " + w + (n === 1 ? "" : "s"); }
  function qLabel(q) { return "Exam " + q.exam + " · #" + q.num; }
  function daysUntil(dateStr) {
    if (!dateStr) return null;
    var p = dateStr.split("-"); var d = new Date(+p[0], +p[1] - 1, +p[2]);
    var t = new Date(); t.setHours(0, 0, 0, 0);
    return Math.round((d - t) / DAY);
  }
  function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function art(n) { return /^(8|11|18)/.test(String(n)) ? "an" : "a"; }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

  /* ------------------------------------------------------------------ icons */
  var ICON = {
    home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
    practice: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13 7l4 4"/>',
    exam: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2"/><path d="M9 2h6"/>',
    review: '<path d="M4 12a8 8 0 0 1 14-5.3L20 9"/><path d="M20 4v5h-5"/><path d="M20 12a8 8 0 0 1-14 5.3L4 15"/><path d="M4 20v-5h5"/>',
    cards: '<rect x="3" y="6" width="14" height="14" rx="2"/><path d="M7 3h12a2 2 0 0 1 2 2v12"/>',
    math: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8"/><path d="M8 12h1M12 12h1M16 12h0"/><path d="M8 16h1M12 16h1M16 16h0"/>',
    topics: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
    tabs: '<path d="M6 3h9l4 4v14H6z"/><path d="M19 9h3v4h-3"/><path d="M19 15h3v4h-3"/><path d="M9 9h6M9 13h6M9 17h4"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>',
    chart: '<path d="M4 20V4"/><path d="M4 20h16"/><path d="M8 16l4-5 3 3 5-7"/>',
    guide: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    more: '<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
    flag: '<path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/>',
    check: '<path d="M5 12l5 5L20 7"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4 6.5 6.5 0 0 0 20 14.5z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    book: '<path d="M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4z"/><path d="M20 4h-6a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7z"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    back: '<path d="M19 12H5M11 6l-6 6 6 6"/>'
  };
  function icon(n) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICON[n] + "</svg>"; }
  var LOGO = '<svg class="brand-mark" viewBox="0 0 40 40" aria-hidden="true"><rect x="3" y="5" width="26" height="31" rx="3" fill="var(--blue)"/><rect x="29" y="9" width="8" height="7" rx="1.5" fill="var(--hi)"/><rect x="29" y="18" width="8" height="7" rx="1.5" fill="var(--tab-bga)"/><rect x="29" y="27" width="8" height="6" rx="1.5" fill="var(--tab-aia)"/><path d="M9 14h14M9 20h14M9 26h9" stroke="var(--surface)" stroke-width="2.4" stroke-linecap="round"/></svg>';

  /* ------------------------------------------------------------------ question model */
  function rec(id) { return S.q[id] || (S.q[id] = { n: 0, c: 0, w: 0, box: 0, due: 0, last: -1 }); }
  function peek(id) { return S.q[id] || { n: 0, c: 0, w: 0, box: 0, due: 0, last: -1 }; }
  function ansIdx(q) { return q.edAns ? q.edAns[S.settings.edition] : q.answer; }
  function isMastered(id) { return peek(id).box >= MASTER_BOX; }
  function isDue(id, now) { var r = peek(id); return r.box > 0 && r.due <= (now || Date.now()); }
  function dueIds() { var now = Date.now(); return Q.filter(function (q) { return isDue(q.id, now); }).map(function (q) { return q.id; }); }

  function grade(id, correct, opts) {
    opts = opts || {};
    var r = rec(id), now = Date.now();
    r.n++; r.t = now;
    var day = S.days[todayKey()] || (S.days[todayKey()] = { a: 0, c: 0 });
    day.a++;
    if (correct && !opts.guess) {
      r.c++; day.c++;
      if (r.box === 0) r.box = 2;
      else if (r.due <= now + 6 * 3600000) r.box = Math.min(5, r.box + 1); // only advance when spaced
      r.due = now + INTERVALS[r.box] * DAY;
      r.last = 1;
    } else {
      if (correct) { r.c++; day.c++; } else r.w++;
      r.box = 1; r.due = now; r.last = correct ? 1 : 0;
      if (!correct) r.missed = (r.missed || 0) + 1;
    }
    save();
  }
  function markGuess(id) {
    var r = rec(id); r.box = 1; r.due = Date.now(); save();
  }

  function optOrder(q, shuffleOn) {
    if (q.lock || !shuffleOn) return [0, 1, 2, 3];
    return shuffle([0, 1, 2, 3]);
  }

  function citeChips(q) {
    var ed = S.settings.edition, html = [];
    q.books.forEach(function (b) {
      var cs = q.cites.filter(function (c) { return c.book === b && (!c.eds || c.eds.indexOf(ed) >= 0); });
      var locs = [], stat = null;
      cs.forEach(function (c) { if (locs.indexOf(c.loc) < 0) locs.push(c.loc); if (c.stat) stat = c.stat; });
      var cls = BOOKS[b].color;
      var where = locs.length ? (b === "FS455" ? "§" + locs.join(", §") : (b.charAt(0) === "A" ? "§" + locs.join(", §") : "p. " + locs.join(", "))) : "";
      html.push('<span class="tab ' + cls + '" title="' + esc(BOOKS[b].name) + '">' + esc(BOOKS[b].short) + (where ? " · " + esc(where) : "") + "</span>" + (stat ? ' <span class="pill">§' + esc(stat) + "</span>" : ""));
    });
    return html.join(" ");
  }

  /* ------------------------------------------------------------------ stats */
  function topicIds(t) { return Q.filter(function (q) { return q.topic === t; }).map(function (q) { return q.id; }); }
  function groupStats(ids) {
    var seen = 0, lastRight = 0, mastered = 0, correct = 0, tries = 0;
    ids.forEach(function (id) {
      var r = peek(id);
      if (r.n) { seen++; tries += r.n; correct += r.c; if (r.last === 1) lastRight++; }
      if (r.box >= MASTER_BOX) mastered++;
    });
    return { total: ids.length, seen: seen, lastRight: lastRight, mastered: mastered, acc: seen ? lastRight / seen : 0, mastery: ids.length ? mastered / ids.length : 0 };
  }
  function overall() { return groupStats(Q.map(function (q) { return q.id; })); }
  function everRight() { return Q.filter(function (q) { return peek(q.id).c > 0; }).length; }
  function examScores() { return S.attempts.filter(function (a) { return a.kind === "sim" || a.kind === "full"; }); }
  function streak() {
    var n = 0, d = new Date();
    if (!S.days[todayKey(d)]) d.setDate(d.getDate() - 1);
    while (S.days[todayKey(d)] && S.days[todayKey(d)].a > 0) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }
  function factKnown() { return FACTS.filter(function (f) { var s = S.facts[f.q]; return s && s.k > 0 && s.last === 1; }).length; }
  function tabItems() {
    var ed = S.settings.edition, map = {};
    Q.forEach(function (q) {
      q.cites.forEach(function (c) {
        if (c.eds && c.eds.indexOf(ed) < 0) return;
        var k = c.book + "|" + c.loc;
        if (!map[k]) map[k] = { key: ed + "|" + k, book: c.book, loc: c.loc, ids: [], stat: c.stat || null };
        if (map[k].ids.indexOf(q.id) < 0) map[k].ids.push(q.id);
        if (c.stat && !map[k].stat) map[k].stat = c.stat;
      });
    });
    return Object.keys(map).map(function (k) { return map[k]; });
  }
  function readiness() {
    var o = overall(), right = everRight();
    var ex = examScores().slice(-3);
    var exAvg = ex.length ? ex.reduce(function (s, a) { return s + a.score; }, 0) / 3 : 0; // missing exams count as 0
    var score = Math.round(100 * (0.25 * (right / Q.length) + 0.40 * o.mastery + 0.35 * exAvg));
    var topicsOk = TOPIC_KEYS.filter(function (t) { var g = groupStats(topicIds(t)); return g.seen === g.total && g.acc >= 0.8; }).length;
    var tabs = tabItems(), tabbed = tabs.filter(function (t) { return S.tabs[t.key]; }).length;
    var last3 = examScores().slice(-3);
    var checks = [
      { done: right === Q.length, label: "Answer every practice question correctly at least once", val: right + " / " + Q.length },
      { done: o.mastery >= 0.9, label: "Master 90% of questions (correct on spaced repeats)", val: o.mastered + " / " + Math.ceil(Q.length * 0.9) },
      { done: topicsOk === TOPIC_KEYS.length, label: "80%+ on every topic", val: topicsOk + " / " + TOPIC_KEYS.length },
      { done: last3.length === 3 && last3.every(function (a) { return a.score >= TARGET; }), label: "Last 3 timed exams at 85% or higher", val: last3.length ? last3.map(function (a) { return Math.round(a.score * 100) + "%"; }).join(" · ") : "none yet" },
      { done: factKnown() === FACTS.length, label: "Know every \"Numbers to Know\" card", val: factKnown() + " / " + FACTS.length },
      { done: S.math.best >= 10, label: "10 math problems right in a row", val: "best " + S.math.best },
      { done: tabbed === tabs.length, label: "Tab every reference page in your books", val: tabbed + " / " + tabs.length }
    ];
    var label = score >= 85 ? "Exam ready" : score >= 70 ? "Almost there" : score >= 40 ? "Building" : "Getting started";
    return { score: score, label: label, checks: checks };
  }

  /* ------------------------------------------------------------------ app state */
  var state = { view: "home", param: null, session: null, examView: null, cards: null, math: null, bf: null, browse: { q: "", topic: "", exam: "", status: "" }, menu: false, modal: null };
  var main, timerHandle = null;

  var NAV = [
    { id: "home", label: "Home", icon: "home" },
    { id: "practice", label: "Practice", icon: "practice" },
    { id: "exam", label: "Exam Simulator", short: "Exam", icon: "exam" },
    { id: "review", label: "Smart Review", short: "Review", icon: "review", badge: function () { return dueIds().length; } },
    { group: "Drills" },
    { id: "cards", label: "Numbers to Know", icon: "cards" },
    { id: "math", label: "Math Lab", icon: "math" },
    { id: "books", label: "Book Tabs & Finder", icon: "tabs" },
    { group: "Library" },
    { id: "topics", label: "Topics", icon: "topics" },
    { id: "browse", label: "All 375 Questions", icon: "list" },
    { id: "stats", label: "Progress", icon: "chart" },
    { id: "guide", label: "Test-Day Playbook", icon: "guide" },
    { id: "settings", label: "Settings", icon: "gear" }
  ];
  var BOTTOM = ["home", "practice", "exam", "review"];

  function go(view, param) {
    if (state.view === "exam" && view !== "exam") stopTimer();
    state.view = view; state.param = param == null ? null : param; state.menu = false;
    try { if (location.hash !== "#" + view) history.replaceState(null, "", "#" + view); } catch (e) { /* ignore */ }
    render(true);
  }

  function renderNav() {
    var side = ['<a class="brand" href="#home" data-act="nav" data-v="home">' + LOGO + '<div><div class="brand-name">FL Business &amp; Finance</div><div class="brand-sub">Contractor exam study</div></div></a><nav>'];
    NAV.forEach(function (n) {
      if (n.group) { side.push('<div class="navgroup eyebrow">' + n.group + "</div>"); return; }
      var b = n.badge ? n.badge() : 0;
      side.push('<button class="navlink" data-act="nav" data-v="' + n.id + '"' + (isCurrent(n.id) ? ' aria-current="page"' : "") + ">" + icon(n.icon) + "<span>" + n.label + "</span>" + (b ? '<span class="badge">' + b + "</span>" : "") + "</button>");
    });
    side.push("</nav>");
    side.push('<div style="margin-top:auto;padding:16px 4px 0"><button class="navlink" data-act="theme">' + icon(effectiveDark() ? "sun" : "moon") + "<span>" + (effectiveDark() ? "Light mode" : "Dark mode") + "</span></button></div>");
    document.getElementById("sidebar").innerHTML = side.join("");
    var bn = BOTTOM.map(function (id) {
      var n = NAV.filter(function (x) { return x.id === id; })[0], b = n.badge ? n.badge() : 0;
      return '<button data-act="nav" data-v="' + id + '"' + (isCurrent(id) ? ' aria-current="page"' : "") + ">" + icon(n.icon) + (b ? '<span class="badge">' + b + "</span>" : "") + "<span>" + (n.short || n.label) + "</span></button>";
    });
    var inMore = BOTTOM.indexOf(state.view) < 0 && state.view !== "session";
    bn.push('<button data-act="menu"' + (inMore ? ' aria-current="page"' : "") + ">" + icon("more") + "<span>More</span></button>");
    document.getElementById("bottomnav").innerHTML = bn.join("");
    document.getElementById("topbar").innerHTML = '<a class="brand" href="#home" data-act="nav" data-v="home">' + LOGO + '<div><div class="brand-name">FL Business &amp; Finance</div><div class="brand-sub">Contractor exam study</div></div></a><span class="spacer"></span><button class="icon-btn" data-act="theme" aria-label="' + (effectiveDark() ? "Switch to light mode" : "Switch to dark mode") + '">' + icon(effectiveDark() ? "sun" : "moon") + "</button>";
  }
  function isCurrent(id) {
    if (state.view === id) return true;
    if (state.view === "session" && state.session) return state.session.from === id;
    if (state.view === "topic") return id === "topics";
    return false;
  }

  function render(scrollTop) {
    applyTheme();
    renderNav();
    var fn = VIEWS[state.view] || VIEWS.home;
    main.innerHTML = fn();
    if (AFTER[state.view]) AFTER[state.view]();
    renderOverlay();
    if (scrollTop) window.scrollTo(0, 0);
  }

  function renderOverlay() {
    var el = document.getElementById("overlay");
    if (state.menu) {
      el.innerHTML = '<div class="modal-back" data-act="closeMenu"><div class="modal" role="dialog" aria-label="More" data-stop="1"><h3>More</h3><div class="sheet-list">' +
        NAV.filter(function (n) { return n.id && BOTTOM.indexOf(n.id) < 0; }).map(function (n) { return '<button data-act="nav" data-v="' + n.id + '">' + icon(n.icon) + "<span>" + n.label + "</span></button>"; }).join("") +
        '</div><button class="btn" data-act="closeMenu">Close</button></div></div>';
    } else if (state.modal) {
      var m = state.modal;
      el.innerHTML = '<div class="modal-back"><div class="modal" role="dialog" aria-label="' + esc(m.title) + '"><h3>' + esc(m.title) + "</h3>" + (m.html || "<p>" + esc(m.body) + "</p>") +
        '<div class="row" style="justify-content:flex-end"><button class="btn" data-act="modalCancel">' + esc(m.cancel || "Cancel") + '</button><button class="btn ' + (m.danger ? "danger" : "primary") + '" data-act="modalOk">' + esc(m.ok || "OK") + "</button></div></div></div>";
    } else el.innerHTML = "";
  }
  function confirmBox(opts, onOk) { state.modal = Object.assign({}, opts, { onOk: onOk }); renderOverlay(); }

  function toast(msg) {
    var t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); t.textContent = msg;
    document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2200);
  }

  function applyTheme() {
    var th = S.settings.theme;
    if (th === "light" || th === "dark") document.documentElement.setAttribute("data-theme", th);
    else document.documentElement.removeAttribute("data-theme");
  }
  function effectiveDark() {
    var th = S.settings.theme;
    if (th === "dark") return true; if (th === "light") return false;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  }

  /* ------------------------------------------------------------------ sessions (practice / review / drill) */
  function startSession(ids, opts) {
    opts = opts || {};
    if (!ids.length) { toast("No questions match that selection."); return; }
    var order = {};
    ids.forEach(function (id) { order[id] = optOrder(QBY[id], opts.shuffle == null ? S.settings.shuffle : opts.shuffle); });
    state.session = { title: opts.title || "Practice", from: opts.from || "practice", ids: ids, i: 0, order: order, picks: {}, guess: {}, started: Date.now(), done: false };
    go("session");
  }

  function questionCard(q, ctx) {
    // ctx: {order, pick (orig idx|undefined), reveal, progress, total, mode:'practice'|'exam'|'review', flagged}
    var order = ctx.order, ans = ansIdx(q), picked = ctx.pick;
    var h = ['<article class="card stack lg" aria-live="polite">'];
    h.push('<div class="q-meta"><div class="row"><span class="pill blue">' + qLabel(q) + '</span><span class="pill">' + esc(TOPICS[q.topic].short) + "</span>" + (q.calc ? '<span class="pill hi">Calculation</span>' : "") +
      (q.dupes ? '<span class="pill" title="This question appears on more than one practice test">Repeat</span>' : "") + '</div><span class="q-progress">' + ctx.progress + " / " + ctx.total + "</span></div>");
    h.push('<div class="bar"><span style="width:' + pct(ctx.progress, ctx.total) + '%"></span></div>');
    if (q.scenario) h.push('<div class="q-scenario"><div class="label">Scenario</div>' + esc(q.scenario) + "</div>");
    h.push('<p class="q-stem">' + stemHTML(q.stem) + "</p>");
    h.push('<div class="options" role="group" aria-label="Answer choices">');
    order.forEach(function (orig, pos) {
      var cls = "opt", mark = "";
      if (ctx.reveal) {
        if (orig === ans) { cls += " correct"; mark = icon("check"); }
        else if (orig === picked) { cls += " wrong"; mark = icon("x"); }
      } else if (orig === picked) cls += " selected";
      h.push('<button class="' + cls + '" data-act="choose" data-o="' + orig + '"' + (ctx.reveal ? " disabled" : "") + '><span class="letter">' + L[pos] + "</span><span>" + esc(q.options[orig]) + '</span><span class="mark">' + mark + "</span></button>");
    });
    h.push("</div>");
    if (ctx.reveal) h.push(explainBlock(q, picked, order, ctx));
    h.push(ctx.actions || "");
    h.push("</article>");
    return h.join("");
  }

  function explainBlock(q, picked, order, ctx) {
    var ans = ansIdx(q), right = picked === ans, pos = order.indexOf(ans);
    var h = ['<section class="explain">'];
    if (picked != null) h.push('<div class="verdict ' + (right ? "ok" : "bad") + '">' + icon(right ? "check" : "x") + (right ? "Correct" : "Not quite. The answer is " + L[pos] + ".") + "</div>");
    else h.push('<div class="verdict bad">Unanswered. The answer is ' + L[pos] + ".</div>");
    h.push(md(q.exp));
    if (q.tip) h.push('<div class="tipbox"><b>Remember</b><span>' + inline(q.tip) + "</span></div>");
    if (q.edAns) {
      h.push('<div class="edition-note">This answer depends on your Contractors Manual edition. You\'re set to <strong>' + esc(S.settings.edition) + '</strong>. The keyed answers are 2025: ' + L[order.indexOf(q.edAns["2025"])] + ", 2021: " + L[order.indexOf(q.edAns["2021"])] + ", 2017: " + L[order.indexOf(q.edAns["2017"])] + '. Change the edition in <a href="#settings" data-act="nav" data-v="settings">Settings</a>.</div>');
    }
    h.push('<div class="where"><div class="label">Find it in your books</div><div class="cites">' + citeChips(q) + '</div><details class="keyref"><summary>Answer-key reference text</summary><pre>' + esc(q.ref.join("\n")) + "</pre></details></div>");
    if (q.dupes) h.push('<p class="small muted">This question also appears as ' + q.dupes.map(function (d) { return "Exam " + d.split("-")[0] + " #" + d.split("-")[1]; }).join(", ") + ". Questions that repeat across practice tests are high-yield.</p>");
    var r = peek(q.id);
    h.push('<div class="field"><label for="note-' + q.id + '">My note</label><textarea id="note-' + q.id + '" data-note="' + q.id + '" placeholder="Add your own memory trick or the page where you found it">' + esc(r.note || "") + "</textarea></div>");
    h.push("</section>");
    return h.join("");
  }

  /* ------------------------------------------------------------------ views */
  var VIEWS = {}, AFTER = {};

  VIEWS.home = function () {
    var R = readiness(), o = overall(), due = dueIds().length, st = streak();
    var today = S.days[todayKey()] || { a: 0, c: 0 }, goal = S.settings.goal;
    var dleft = daysUntil(S.settings.examDate);
    var h = [];
    h.push('<div class="page-head"><div class="eyebrow">Florida Business &amp; Finance · Contractor License</div><h1>' + greeting() + "</h1>" +
      (dleft != null ? '<p class="countdown">' + (dleft > 0 ? plural(dleft, "day") + " until your exam" : dleft === 0 ? "Exam day. You've got this." : "Exam date passed. Update it in Settings.") + "</p>" : '<p>Set your exam date in <a href="#settings" data-act="nav" data-v="settings">Settings</a> to get a countdown and a daily target.</p>') + "</div>");

    // readiness
    h.push('<section class="card"><div class="hero">' + gauge(R.score, R.label) + '<div class="stack"><div><div class="eyebrow">Pass readiness</div><h2>' + R.label + '</h2></div><p class="muted small" style="margin:0">Built from what you\'ve gotten right, what you\'ve mastered on spaced repeats, and your last three timed exams. Check off all seven items below and the real exam should feel easy.</p></div></div>');
    h.push('<div style="margin-top:12px">' + R.checks.map(function (c) {
      return '<div class="check' + (c.done ? " done" : "") + '"><span class="box">' + (c.done ? icon("check") : "") + '</span><span>' + esc(c.label) + '</span><span class="mono small muted">' + esc(c.val) + "</span></div>";
    }).join("") + "</div></section>");

    // next step
    var ns = nextStep();
    h.push('<section class="card next-step stack"><div class="eyebrow">Do this next</div><h3>' + esc(ns.title) + '</h3><p class="muted" style="margin:0">' + esc(ns.why) + '</p><div class="row"><button class="btn primary" data-act="' + ns.act + '"' + (ns.v ? ' data-v="' + ns.v + '"' : "") + ">" + esc(ns.cta) + " " + icon("arrow") + "</button></div></section>");

    // stats
    h.push('<section class="grid4">' +
      statTile(today.a + '<span class="muted" style="font-size:1rem"> / ' + goal + "</span>", "Answered today") +
      statTile(due, "Reviews due") +
      statTile(o.mastered, "Mastered of 375") +
      statTile(st, st === 1 ? "Day streak" : "Day streak") + "</section>");
    var goalPct = Math.min(100, pct(today.a, goal));
    h.push('<div class="bar ' + (goalPct >= 100 ? "ok" : "") + '" aria-label="Daily goal progress"><span style="width:' + goalPct + '%"></span></div>');

    // quick start
    h.push('<section class="stack"><h3>Quick start</h3><div class="grid3">' +
      quick("quick10", "10 random questions", "A fast mixed set with instant explanations.") +
      quick("quickMissed", "Retry my misses", plural(Q.filter(function (q) { return peek(q.id).last === 0; }).length, "question") + " you last got wrong.") +
      quick("quickCalc", "Calculation questions", "All " + Q.filter(function (q) { return q.calc; }).length + " math questions from the tests.") +
      quick("quickNew", "Next 20 new", (Q.length - o.seen) + " questions you haven't seen yet.") +
      '<button class="card tight stack" style="text-align:left;cursor:pointer" data-act="nav" data-v="cards"><strong>Numbers to Know</strong><span class="small muted">' + FACTS.length + " flashcards of deadlines and dollar amounts.</span></button>" +
      '<button class="card tight stack" style="text-align:left;cursor:pointer" data-act="nav" data-v="exam"><strong>Timed exam</strong><span class="small muted">Simulate test day with a clock.</span></button>' +
      "</div></section>");

    // weakest topics
    var tl = TOPIC_KEYS.map(function (t) { var g = groupStats(topicIds(t)); return { t: t, g: g, score: g.seen ? g.acc * 0.5 + g.mastery * 0.5 : -1 + g.total / 1000 }; });
    tl.sort(function (a, b) { return a.score - b.score; });
    h.push('<section class="card stack"><div class="row between"><h3>Weakest topics</h3><button class="btn sm ghost" data-act="nav" data-v="topics">All topics ' + icon("arrow") + "</button></div><div>" +
      tl.slice(0, 5).map(topicRow).join("") + "</div></section>");
    return h.join("");
  };
  function greeting() {
    var hr = new Date().getHours();
    return hr < 12 ? "Good morning" : hr < 17 ? "Good afternoon" : "Good evening";
  }
  function statTile(v, k) { return '<div class="stat"><span class="v">' + v + '</span><span class="k">' + k + "</span></div>"; }
  function quick(act, title, sub) { return '<button class="card tight stack" style="text-align:left;cursor:pointer" data-act="' + act + '"><strong>' + esc(title) + '</strong><span class="small muted">' + esc(sub) + "</span></button>"; }
  function gauge(score, label) {
    var r = 60, c = 2 * Math.PI * r, off = c * (1 - score / 100);
    var col = score >= 85 ? "var(--ok)" : score >= 70 ? "var(--blue)" : score >= 40 ? "var(--warn)" : "var(--bad)";
    return '<svg class="gauge" viewBox="0 0 150 150" role="img" aria-label="Readiness ' + score + ' percent, ' + esc(label) + '"><circle cx="75" cy="75" r="' + r + '" fill="none" stroke="var(--surface-2)" stroke-width="14"/><circle cx="75" cy="75" r="' + r + '" fill="none" stroke="' + col + '" stroke-width="14" stroke-linecap="round" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '" transform="rotate(-90 75 75)"/><text x="75" y="80" text-anchor="middle" font-size="40" font-weight="700">' + score + '</text><text x="75" y="100" text-anchor="middle" class="sub">out of 100</text></svg>';
  }
  function nextStep() {
    if (S.exam && !S.exam.submitted) return { title: "Finish your exam in progress", why: S.exam.title + ": " + Object.keys(S.exam.picks).length + " of " + S.exam.ids.length + " answered.", cta: "Resume exam", act: "nav", v: "exam" };
    var due = dueIds().length, o = overall();
    if (due >= 10) return { title: "Clear your " + due + " due reviews", why: "These are questions you missed or are due for a spaced repeat. Reviews at the right time are what lock answers into long-term memory.", cta: "Start review", act: "startReview" };
    if (o.seen < Q.length) {
      var tl = TOPIC_KEYS.map(function (t) { var g = groupStats(topicIds(t)); return { t: t, left: g.total - g.seen, g: g }; }).filter(function (x) { return x.left > 0; });
      tl.sort(function (a, b) { return (a.g.seen / a.g.total) - (b.g.seen / b.g.total); });
      var t = tl[0];
      return { title: "Learn " + TOPICS[t.t].name, why: t.left + " questions in this topic you haven't seen. Read every explanation, and look up the page in your book the first time through.", cta: "Study this topic", act: "drillTopicNew", v: t.t };
    }
    if (due > 0) return { title: "Clear your " + due + " due reviews", why: "Keep the spaced repeats on schedule.", cta: "Start review", act: "startReview" };
    if (S.math.best < 10) return { title: "Sharpen the math", why: "Calculation questions are free points once the formulas are automatic. Aim for 10 in a row.", cta: "Open Math Lab", act: "nav", v: "math" };
    if (factKnown() < FACTS.length) return { title: "Drill the Numbers to Know", why: (FACTS.length - factKnown()) + " deadline and dollar-amount cards left to lock in.", cta: "Open flashcards", act: "nav", v: "cards" };
    var ex = examScores().slice(-3);
    if (ex.length < 3 || ex.some(function (a) { return a.score < TARGET; })) return { title: "Take a timed exam", why: "Score 85%+ on three timed exams in a row. That's a comfortable cushion over the 70% needed to pass.", cta: "Go to Exam Simulator", act: "nav", v: "exam" };
    return { title: "Stay sharp", why: "You're hitting every target. Keep up daily reviews until test day and do one more timed exam the week before.", cta: "Start review", act: "startReview" };
  }
  function topicRow(x) {
    var g = x.g || groupStats(topicIds(x.t)), m = Math.round(g.mastery * 100), a = Math.round(g.acc * 100);
    var cls = !g.seen ? "" : g.acc >= 0.85 ? "ok" : g.acc >= 0.7 ? "" : g.acc >= 0.5 ? "warn" : "bad";
    return '<button class="topic-row" data-act="nav" data-v="topic" data-p="' + x.t + '"><span><span class="tname">' + esc(TOPICS[x.t].name) + '</span><br><span class="tiny muted">' + g.seen + "/" + g.total + " seen · " + m + '% mastered</span></span><span class="bar ' + cls + '"><span style="width:' + (g.seen ? a : 0) + '%"></span></span><span class="num">' + (g.seen ? a + "%" : "—") + "</span></button>";
  }

  /* ---- practice setup ---- */
  var pset = { exams: [1, 2, 3], topics: [], books: [], filter: "all", count: 25, order: "random" };
  VIEWS.practice = function () {
    var ids = practicePool();
    var h = ['<div class="page-head"><div class="eyebrow">Practice</div><h1>Build a practice set</h1><p>Get instant feedback, a plain-English explanation, and the exact page to look up for every question. Missed questions go into Smart Review automatically.</p></div>'];
    h.push('<section class="card stack lg">');
    h.push('<div class="field"><span class="label">Practice tests</span><div class="chips">' + [1, 2, 3].map(function (e) { return chip("pexam", e, "Exam " + e, pset.exams.indexOf(e) >= 0); }).join("") + "</div></div>");
    h.push('<div class="field"><span class="label">Show me</span><div class="chips">' +
      [["all", "All"], ["new", "Not seen yet"], ["missed", "Last answer wrong"], ["notm", "Not mastered"], ["flag", "Flagged"], ["calc", "Calculations"], ["repeat", "Repeats across tests"]].map(function (f) { return chip("pfilter", f[0], f[1], pset.filter === f[0]); }).join("") + "</div></div>");
    h.push('<div class="field"><span class="label">Topics <span class="muted" style="text-transform:none;letter-spacing:0">(none selected = all)</span></span><div class="chips">' + TOPIC_KEYS.map(function (t) { return chip("ptopic", t, TOPICS[t].short, pset.topics.indexOf(t) >= 0); }).join("") + "</div></div>");
    h.push('<div class="field"><span class="label">Reference book</span><div class="chips">' + BOOK_KEYS.map(function (b) { return chip("pbook", b, BOOKS[b].short, pset.books.indexOf(b) >= 0); }).join("") + "</div></div>");
    h.push('<div class="row"><div class="field" style="flex:1;min-width:140px"><label for="pcount">How many</label><select id="pcount" data-change="pcount">' + [10, 25, 50, 100, 0].map(function (n) { return '<option value="' + n + '"' + (pset.count === n ? " selected" : "") + ">" + (n ? n : "All matching") + "</option>"; }).join("") + '</select></div><div class="field" style="flex:1;min-width:140px"><label for="porder">Order</label><select id="porder" data-change="porder"><option value="random"' + (pset.order === "random" ? " selected" : "") + '>Random</option><option value="seq"' + (pset.order === "seq" ? " selected" : "") + ">As printed</option></select></div></div>");
    h.push('<label class="toggle"><input type="checkbox" id="pshuffle" data-change="shuffle"' + (S.settings.shuffle ? " checked" : "") + "> Shuffle answer choices (so you learn answers, not letter positions)</label>");
    h.push('<div class="row between"><span class="muted">' + plural(ids.length, "question") + " match</span><button class=\"btn primary\" data-act=\"startPractice\"" + (ids.length ? "" : " disabled") + ">Start " + (pset.count && pset.count < ids.length ? pset.count : ids.length) + " " + icon("arrow") + "</button></div>");
    h.push("</section>");
    return h.join("");
  };
  function chip(act, v, label, on) { return '<button class="chip" data-act="' + act + '" data-v="' + v + '" aria-pressed="' + (on ? "true" : "false") + '">' + esc(label) + "</button>"; }
  function practicePool() {
    return Q.filter(function (q) {
      if (pset.exams.indexOf(q.exam) < 0) return false;
      if (pset.topics.length && pset.topics.indexOf(q.topic) < 0) return false;
      if (pset.books.length && !q.books.some(function (b) { return pset.books.indexOf(b) >= 0; })) return false;
      var r = peek(q.id);
      switch (pset.filter) {
        case "new": return r.n === 0;
        case "missed": return r.last === 0;
        case "notm": return r.box < MASTER_BOX;
        case "flag": return !!r.f;
        case "calc": return !!q.calc;
        case "repeat": return !!q.dupes;
      }
      return true;
    }).map(function (q) { return q.id; });
  }

  /* ---- session runner ---- */
  VIEWS.session = function () {
    var s = state.session;
    if (!s) return VIEWS.practice();
    if (s.done) return sessionSummary(s);
    var q = QBY[s.ids[s.i]], picked = s.picks[q.id], reveal = picked != null, r = peek(q.id);
    var actions = '<div class="q-actions"><div class="row"><button class="btn sm ' + (r.f ? "flag-on" : "") + '" data-act="flag" data-id="' + q.id + '">' + icon("flag") + (r.f ? "Flagged" : "Flag") + "</button>" +
      (reveal && picked === ansIdx(q) && !s.guess[q.id] ? '<button class="btn sm ghost" data-act="guess" data-id="' + q.id + '" title="Counts it as not known yet so it comes back in review">I guessed</button>' : "") +
      (s.guess[q.id] ? '<span class="pill hi">Marked as a guess</span>' : "") + "</div>" +
      '<div class="row"><button class="btn sm ghost" data-act="endSession">End</button>' + (reveal ? '<button class="btn primary" data-act="next">' + (s.i + 1 < s.ids.length ? "Next" : "Finish") + " " + icon("arrow") + "</button>" : '<span class="small muted">Pick an answer <span class="kbd">1</span>–<span class="kbd">4</span></span>') + "</div></div>";
    return '<div class="row between"><div><div class="eyebrow">' + esc(s.title) + '</div></div><span class="small muted mono">' + Object.keys(s.picks).filter(function (id) { return s.picks[id] === ansIdx(QBY[id]); }).length + " right · " + Object.keys(s.picks).filter(function (id) { return s.picks[id] !== ansIdx(QBY[id]); }).length + " wrong</span></div>" +
      questionCard(q, { order: s.order[q.id], pick: picked, reveal: reveal, progress: s.i + 1, total: s.ids.length, actions: actions });
  };
  function sessionSummary(s) {
    var answered = Object.keys(s.picks), right = answered.filter(function (id) { return s.picks[id] === ansIdx(QBY[id]); });
    var missed = answered.filter(function (id) { return s.picks[id] !== ansIdx(QBY[id]); });
    var sc = pct(right.length, answered.length);
    var h = ['<div class="page-head"><div class="eyebrow">' + esc(s.title) + ' · done</div><h1>' + right.length + " of " + answered.length + " correct</h1><p>" + (sc >= 85 ? "Strong work. These move toward mastered with each spaced repeat." : sc >= 70 ? "Passing pace. Review the misses below while they're fresh." : "Misses are where the learning happens. Read each explanation and find the page in your book.") + "</p></div>"];
    h.push('<div class="bar ' + (sc >= 85 ? "ok" : sc >= 70 ? "" : "warn") + '"><span style="width:' + sc + '%"></span></div>');
    h.push('<div class="row">' + (missed.length ? '<button class="btn primary" data-act="retryMissed">Retry the ' + missed.length + " missed</button>" : "") + '<button class="btn" data-act="nav" data-v="practice">New practice set</button><button class="btn ghost" data-act="nav" data-v="home">Home</button></div>');
    if (missed.length) {
      h.push('<section class="card stack"><h3>Missed this round</h3>' + missed.map(function (id) { return reviewItem(QBY[id], s.picks[id]); }).join("") + "</section>");
    }
    return h.join("");
  }
  function reviewItem(q, picked) {
    var ans = ansIdx(q);
    return '<details class="qitem"><summary><span class="qid">' + q.exam + "-" + q.num + '</span><span>' + stemHTML(q.stem) + "</span></summary><div class=\"body\">" +
      (q.scenario ? '<div class="q-scenario small">' + esc(q.scenario) + "</div>" : "") +
      '<ul class="optlist">' + q.options.map(function (o, i) { return '<li class="' + (i === ans ? "ans" : "") + '">' + L[i] + ". " + esc(o) + (i === picked && i !== ans ? ' <span class="pill bad">your answer</span>' : "") + (i === ans ? ' <span class="pill ok">answer</span>' : "") + "</li>"; }).join("") + "</ul>" +
      md(q.exp) + (q.tip ? '<div class="tipbox"><b>Remember</b><span>' + inline(q.tip) + "</span></div>" : "") + '<div class="cites">' + citeChips(q) + "</div></div></details>";
  }

  /* ---- review ---- */
  VIEWS.review = function () {
    var due = dueIds(), boxes = [0, 0, 0, 0, 0, 0];
    Q.forEach(function (q) { boxes[peek(q.id).box]++; });
    var next = Q.map(function (q) { return peek(q.id); }).filter(function (r) { return r.box > 0 && r.due > Date.now(); }).sort(function (a, b) { return a.due - b.due; })[0];
    var h = ['<div class="page-head"><div class="eyebrow">Smart Review</div><h1>Spaced repetition</h1><p>Every question you answer gets scheduled. Miss it and it comes back today. Get it right and it waits 3 days, then 7, 16 and 35. A question is <strong>mastered</strong> once you\'ve gotten it right on a spaced repeat.</p></div>'];
    h.push('<section class="card stack"><div class="row between"><div><div class="result-big">' + due.length + '</div><div class="muted">due now</div></div><div class="row">' +
      (due.length ? '<button class="btn primary" data-act="startReview">Review ' + Math.min(due.length, 50) + " " + icon("arrow") + "</button>" : '<span class="muted">' + (next ? "Next review " + relTime(next.due) : "Answer some questions to start filling your review queue.") + "</span>") + "</div></div></section>");
    var labels = ["Not seen", "Learning (missed)", "Seen once", "Mastered · 7d", "Mastered · 16d", "Mastered · 35d"];
    var max = Math.max.apply(null, boxes) || 1;
    h.push('<section class="card stack"><h3>Where your 375 questions stand</h3>' + boxes.map(function (n, i) {
      var cls = i === 0 ? "" : i === 1 ? "bad" : i === 2 ? "warn" : "ok";
      return '<div class="row nowrap" style="gap:12px"><span class="small" style="width:150px;flex:none">' + labels[i] + '</span><span class="bar ' + cls + '" style="flex:1"><span style="width:' + pct(n, max) + '%"></span></span><span class="mono small" style="width:36px;text-align:right">' + n + "</span></div>";
    }).join("") + "</section>");
    var missedEver = Q.filter(function (q) { return peek(q.id).missed; });
    h.push('<section class="card stack"><h3>Extra drills</h3><div class="row"><button class="btn" data-act="reviewHardest"' + (missedEver.length ? "" : " disabled") + ">Most-missed questions (" + missedEver.length + ")</button><button class=\"btn\" data-act=\"reviewFlagged\">Flagged (" + Q.filter(function (q) { return peek(q.id).f; }).length + ')</button><button class="btn" data-act="reviewAhead">Review ahead (not yet due)</button></div></section>');
    return h.join("");
  };
  function relTime(t) {
    var d = t - Date.now();
    if (d < 3600000) return "in " + Math.max(1, Math.round(d / 60000)) + " min";
    if (d < DAY) return "in " + Math.round(d / 3600000) + " hr";
    return "in " + Math.round(d / DAY) + " days";
  }

  /* ---- exam simulator ---- */
  VIEWS.exam = function () {
    var ex = S.exam;
    if (ex && !ex.submitted) return examRunner(ex);
    if (ex && ex.submitted && state.examView === "results") return examResults(ex);
    var h = ['<div class="page-head"><div class="eyebrow">Exam Simulator</div><h1>Timed practice exams</h1><p>No feedback until you submit, just like test day. Use your books while you take it, because the real exam is open book. Practicing your lookups under a clock is the point.</p></div>'];
    var sc = S.settings.simCount, sm = S.settings.simMinutes;
    h.push('<section class="grid2">');
    h.push('<div class="card stack"><div class="eyebrow">Recommended</div><h3>State exam simulation</h3><p class="muted small" style="margin:0">' + sc + " questions drawn from all three tests (repeats removed) with a " + fmtMin(sm) + ' limit. Change the size and time in Settings to match your Candidate Information Bulletin.</p><button class="btn primary" data-act="startSim">Start simulation</button></div>');
    [1, 2, 3].map(function (e) {
      var best = S.attempts.filter(function (a) { return a.kind === "full" && a.exam === e; }).reduce(function (m, a) { return Math.max(m, a.score); }, -1);
      h.push('<div class="card stack"><div class="eyebrow">Practice test ' + e + '</div><h3>Full Exam ' + e + '</h3><p class="muted small" style="margin:0">All 125 questions in printed order, ' + fmtMin(Math.round(sm * 125 / sc)) + " at the same pace." + (best >= 0 ? " Best: <strong>" + Math.round(best * 100) + "%</strong>" : "") + '</p><button class="btn" data-act="startFull" data-v="' + e + '">Start Exam ' + e + "</button></div>");
    });
    h.push('<div class="card stack"><div class="eyebrow">Targeted</div><h3>Weak-spot exam</h3><p class="muted small" style="margin:0">50 questions weighted toward what you miss most and haven\'t mastered, with a ' + fmtMin(Math.round(sm * 50 / sc)) + ' limit.</p><button class="btn" data-act="startWeak">Start weak-spot exam</button></div>');
    h.push("</section>");
    var past = S.attempts.slice().reverse().slice(0, 8);
    if (past.length) {
      h.push('<section class="card stack"><div class="row between"><h3>Recent attempts</h3>' + (ex && ex.submitted ? '<button class="btn sm" data-act="showResults">Last results</button>' : "") + '</div><div class="scroll-x"><table class="t"><thead><tr><th>Date</th><th>Exam</th><th>Score</th><th>Time</th></tr></thead><tbody>' +
        past.map(function (a) { return "<tr><td>" + new Date(a.at).toLocaleDateString() + "</td><td>" + esc(a.title) + '</td><td class="num">' + Math.round(a.score * 100) + "% " + (a.score >= PASS ? '<span class="pill ok">pass</span>' : '<span class="pill bad">fail</span>') + '</td><td class="num">' + fmtTime(a.ms) + "</td></tr>"; }).join("") + "</tbody></table></div></section>");
    }
    return h.join("");
  };
  function fmtMin(m) { var h = Math.floor(m / 60), x = m % 60; return (h ? h + " hr" : "") + (h && x ? " " : "") + (x ? x + " min" : ""); }

  function newExam(kind, title, ids, minutes, extra) {
    var order = {};
    ids.forEach(function (id) { order[id] = optOrder(QBY[id], S.settings.shuffle && kind !== "full"); });
    S.exam = Object.assign({ kind: kind, title: title, ids: ids, order: order, picks: {}, flags: {}, i: 0, started: Date.now(), elapsed: 0, limit: minutes * 60000, submitted: false, showGrid: false }, extra || {});
    save();
    state.examView = null;
    go("exam");
  }
  function simIds(n) {
    // pick n questions, never both copies of a repeated question
    var pool = shuffle(Q.map(function (q) { return q.id; })), chosen = [], blocked = {};
    pool.forEach(function (id) {
      if (chosen.length >= n || blocked[id]) return;
      chosen.push(id);
      (QBY[id].dupes || []).forEach(function (d) { blocked[d] = 1; });
    });
    return chosen;
  }
  function weakIds(n) {
    var scored = Q.map(function (q) {
      var r = peek(q.id);
      var w = (r.box < MASTER_BOX ? 2 : 0) + (r.last === 0 ? 3 : 0) + (r.missed || 0) + (r.n === 0 ? 1 : 0) + Math.random() * 1.5;
      return { id: q.id, w: w };
    }).sort(function (a, b) { return b.w - a.w; });
    var out = [], blocked = {};
    scored.forEach(function (x) { if (out.length < n && !blocked[x.id]) { out.push(x.id); (QBY[x.id].dupes || []).forEach(function (d) { blocked[d] = 1; }); } });
    return shuffle(out);
  }

  function examRunner(ex) {
    var q = QBY[ex.ids[ex.i]], picked = ex.picks[q.id];
    var answered = Object.keys(ex.picks).length;
    var bar = '<div class="exam-bar"><div><div class="small" style="font-weight:600">' + esc(ex.title) + '</div><div class="pace muted" id="pace">' + paceText(ex) + '</div></div><div class="row"><span class="timer" id="timer">' + fmtTime(ex.limit - ex.elapsed) + '</span><button class="btn sm" data-act="examGrid">' + (ex.showGrid ? "Hide" : "All questions") + '</button><button class="btn sm hi" data-act="examSubmit">Submit</button><button class="btn sm ghost" data-act="examQuit" title="Discard this exam">Quit</button></div></div>';
    var grid = "";
    if (ex.showGrid) {
      grid = '<section class="card stack"><div class="row between"><span class="small muted">' + answered + " answered · " + (ex.ids.length - answered) + " blank · " + Object.keys(ex.flags).filter(function (k) { return ex.flags[k]; }).length + ' flagged</span><button class="btn sm ghost" data-act="examFirstBlank">Jump to first blank</button></div><div class="qgrid">' +
        ex.ids.map(function (id, i) { return '<button data-act="examGo" data-i="' + i + '" class="' + (ex.picks[id] != null ? "answered " : "") + (ex.flags[id] ? "flagged " : "") + (i === ex.i ? "current" : "") + '">' + (i + 1) + "</button>"; }).join("") + "</div></section>";
    }
    var actions = '<div class="q-actions"><button class="btn sm ' + (ex.flags[q.id] ? "flag-on" : "") + '" data-act="examFlag">' + icon("flag") + (ex.flags[q.id] ? "Flagged" : "Flag for review") + '</button><div class="row"><button class="btn" data-act="examPrev"' + (ex.i === 0 ? " disabled" : "") + ">" + icon("back") + 'Prev</button><button class="btn primary" data-act="examNext">' + (ex.i + 1 < ex.ids.length ? "Next " + icon("arrow") : "Review & submit") + "</button></div></div>";
    return bar + grid + questionCard(q, { order: ex.order[q.id], pick: picked, reveal: false, progress: ex.i + 1, total: ex.ids.length, actions: actions });
  }
  function paceText(ex) {
    var perQ = ex.limit / ex.ids.length, expected = Math.min(ex.ids.length, Math.floor(ex.elapsed / perQ) + 1), done = Object.keys(ex.picks).length;
    var diff = done - expected;
    return "Pace: " + (diff >= 0 ? (diff ? diff + " ahead" : "on track") : -diff + " behind") + " · " + Math.round(perQ / 60000 * 10) / 10 + " min/question budget";
  }
  function startTimer() {
    stopTimer();
    var last = Date.now();
    timerHandle = setInterval(function () {
      var ex = S.exam; if (!ex || ex.submitted || state.view !== "exam") { stopTimer(); return; }
      var now = Date.now(); ex.elapsed += now - last; last = now;
      var t = document.getElementById("timer");
      if (t) { var left = ex.limit - ex.elapsed; t.textContent = fmtTime(left); t.classList.toggle("low", left < 10 * 60000); }
      var p = document.getElementById("pace"); if (p) p.textContent = paceText(ex);
      if (ex.elapsed % 15000 < 1000) save();
      if (ex.elapsed >= ex.limit) { toast("Time's up. Your exam was submitted."); submitExam(); }
    }, 1000);
  }
  function stopTimer() { if (timerHandle) { clearInterval(timerHandle); timerHandle = null; } if (S.exam && !S.exam.submitted) save(); }
  AFTER.exam = function () { if (S.exam && !S.exam.submitted) startTimer(); };

  function submitExam() {
    var ex = S.exam; if (!ex || ex.submitted) return;
    stopTimer();
    ex.submitted = true;
    var right = 0, byTopic = {};
    ex.ids.forEach(function (id) {
      var q = QBY[id], p = ex.picks[id], ok = p === ansIdx(q);
      if (ok) right++;
      var t = byTopic[q.topic] || (byTopic[q.topic] = { n: 0, c: 0 }); t.n++; if (ok) t.c++;
      if (p != null) grade(id, ok); else grade(id, false);
    });
    ex.score = right / ex.ids.length; ex.right = right;
    S.attempts.push({ at: Date.now(), kind: ex.kind, exam: ex.exam || null, title: ex.title, n: ex.ids.length, right: right, score: ex.score, ms: ex.elapsed, byTopic: byTopic });
    save();
    state.examView = "results"; state.examFilter = "missed";
    render(true);
  }
  function examResults(ex) {
    var passPct = (S.settings.passPct || 70) / 100;
    var pass = ex.score >= passPct, a = S.attempts[S.attempts.length - 1] || {};
    var h = ['<div class="page-head"><div class="eyebrow">' + esc(ex.title) + ' · results</div></div>'];
    h.push('<section class="card stack lg"><div class="row" style="gap:20px"><div class="result-big">' + Math.round(ex.score * 100) + '%</div><div class="stack" style="gap:6px"><span class="passfail ' + (pass ? "pass" : "fail") + '">' + (pass ? "Pass" : "Below passing") + '</span><span class="muted small">' + ex.right + " of " + ex.ids.length + " correct · " + fmtTime(ex.elapsed) + " used · passing is " + Math.round(passPct * 100) + "%</span></div></div>" +
      '<p style="margin:0">' + (ex.score >= TARGET ? "That's the cushion you want. Get three of these in a row and you're ready." : pass ? "Passing, but aim for 85% so a bad day still passes. Drill the weakest topics below." : "Not there yet, and that's what practice exams are for. Every miss is now in Smart Review.") + "</p></section>");
    var bt = a.byTopic || {};
    var rows = Object.keys(bt).map(function (t) { return { t: t, n: bt[t].n, c: bt[t].c }; }).sort(function (x, y) { return x.c / x.n - y.c / y.n; });
    h.push('<section class="card stack"><h3>By topic</h3>' + rows.map(function (r) {
      var p = pct(r.c, r.n), cls = p >= 85 ? "ok" : p >= 70 ? "" : p >= 50 ? "warn" : "bad";
      return '<div class="row nowrap" style="gap:12px"><button class="btn ghost sm" style="flex:1;justify-content:flex-start;text-align:left;min-width:0" data-act="nav" data-v="topic" data-p="' + r.t + '">' + esc(TOPICS[r.t].name) + '</button><span class="bar ' + cls + '" style="width:90px;flex:none"><span style="width:' + p + '%"></span></span><span class="mono small" style="width:64px;text-align:right">' + r.c + "/" + r.n + "</span></div>";
    }).join("") + "</section>");
    var f = state.examFilter || "missed";
    var list = ex.ids.filter(function (id) { var ok = ex.picks[id] === ansIdx(QBY[id]); return f === "all" || (f === "missed" && !ok) || (f === "flagged" && ex.flags[id]); });
    h.push('<section class="card stack"><div class="row between"><h3>Review answers</h3><div class="chips">' + [["missed", "Missed"], ["flagged", "Flagged"], ["all", "All"]].map(function (x) { return chip("examFilter", x[0], x[1], f === x[0]); }).join("") + "</div></div>" +
      '<div class="qgrid">' + ex.ids.map(function (id, i) { var ok = ex.picks[id] === ansIdx(QBY[id]); return '<button class="' + (ok ? "right" : "miss") + (ex.flags[id] ? " flagged" : "") + '" data-act="jumpResult" data-id="' + id + '" title="' + (ok ? "Correct" : "Missed") + '">' + (i + 1) + "</button>"; }).join("") + "</div>" +
      (list.length ? list.map(function (id) { return '<div id="res-' + id + '">' + reviewItem(QBY[id], ex.picks[id]) + "</div>"; }).join("") : '<p class="empty">Nothing here.</p>') + "</section>");
    var missed = ex.ids.filter(function (id) { return ex.picks[id] !== ansIdx(QBY[id]); });
    h.push('<div class="row">' + (missed.length ? '<button class="btn primary" data-act="practiceExamMisses">Practice the ' + missed.length + " missed</button>" : "") + '<button class="btn" data-act="closeResults">Back to Exam Simulator</button></div>');
    return h.join("");
  }

  /* ---- flashcards ---- */
  VIEWS.cards = function () {
    var c = state.cards;
    if (c && c.list.length && c.i < c.list.length) return cardRunner(c);
    var h = ['<div class="page-head"><div class="eyebrow">Flashcards</div><h1>Numbers to Know</h1><p>The deadlines, dollar amounts and counts the exam loves to ask. Flip each card, be honest about whether you knew it, and cards you miss come back first.</p></div>'];
    if (c && c.i >= c.list.length && c.list.length) {
      h.push('<section class="card stack"><h3>Deck done</h3><p style="margin:0">' + c.right + " of " + c.list.length + ' known. Cards you missed are first in line next time.</p><div class="row"><button class="btn primary" data-act="cardsStart" data-v="' + esc(c.topic) + '">Go again</button><button class="btn" data-act="cardsReset">Choose another deck</button></div></section>');
    }
    var known = factKnown();
    h.push('<section class="card stack"><div class="row between"><h3>Pick a deck</h3><span class="muted small mono">' + known + " / " + FACTS.length + ' known</span></div><div class="bar ok"><span style="width:' + pct(known, FACTS.length) + '%"></span></div>');
    h.push('<div class="grid3"><button class="card tight stack" style="text-align:left;cursor:pointer" data-act="cardsStart" data-v="weak"><strong>Smart deck</strong><span class="small muted">Unknown and missed cards first, 20 at a time.</span></button><button class="card tight stack" style="text-align:left;cursor:pointer" data-act="cardsStart" data-v="all"><strong>Everything</strong><span class="small muted">All ' + FACTS.length + " cards, shuffled.</span></button>" +
      TOPIC_KEYS.filter(function (t) { return FACTS.some(function (f) { return f.t === t; }); }).map(function (t) {
        var fs = FACTS.filter(function (f) { return f.t === t; }), k = fs.filter(function (f) { var s = S.facts[f.q]; return s && s.last === 1; }).length;
        return '<button class="card tight stack" style="text-align:left;cursor:pointer" data-act="cardsStart" data-v="' + t + '"><strong>' + esc(TOPICS[t].short) + '</strong><span class="small muted">' + k + " / " + fs.length + " known</span></button>";
      }).join("") + "</div></section>");
    h.push('<section class="card stack"><div class="row between"><h3>Cheat sheet</h3><span class="small muted">Everything on one page</span></div><div class="scroll-x"><table class="t"><tbody>' +
      FACTS.map(function (f) { return "<tr><td>" + esc(f.q) + '</td><td style="font-weight:700;min-width:140px">' + esc(f.a) + "</td></tr>"; }).join("") + "</tbody></table></div></section>");
    return h.join("");
  };
  function cardRunner(c) {
    var f = c.list[c.i];
    return '<div class="row between"><div class="eyebrow">Numbers to Know · ' + esc(c.topic === "all" ? "All" : c.topic === "weak" ? "Smart deck" : TOPICS[c.topic].short) + '</div><span class="mono small muted">' + (c.i + 1) + " / " + c.list.length + "</span></div>" +
      '<div class="flash' + (c.flipped ? " flipped" : "") + '" data-act="flip"><div class="flash-inner"><div class="flash-face"><span class="eyebrow">' + esc(TOPICS[f.t].short) + '</span><div class="prompt">' + esc(f.q) + '</div><span class="small muted">Tap to flip · <span class="kbd">Space</span></span></div><div class="flash-face back"><span class="eyebrow" style="color:inherit">Answer</span><div class="big">' + esc(f.a) + '</div><span class="small">' + esc(f.q) + "</span></div></div></div>" +
      '<div class="row" style="justify-content:center">' + (c.flipped ? '<button class="btn danger" data-act="cardMark" data-v="0">' + icon("x") + 'Didn\'t know <span class="kbd">1</span></button><button class="btn primary" data-act="cardMark" data-v="1">' + icon("check") + 'Knew it <span class="kbd">2</span></button>' : '<button class="btn primary" data-act="flip">Show answer</button>') + "</div>" +
      (c.flipped && f.ids && f.ids.length ? '<p class="small muted" style="text-align:center">Tested by: ' + f.ids.map(function (id) { return '<button class="qlink" data-act="openQ" data-id="' + id + '">' + id + "</button>"; }).join(" ") + "</p>" : "") +
      '<div class="row" style="justify-content:center"><button class="btn sm ghost" data-act="cardsReset">End deck</button></div>';
  }
  function startCards(topic) {
    var list;
    if (topic === "weak") {
      list = FACTS.slice().sort(function (a, b) { return factWeight(b) - factWeight(a); }).slice(0, 20);
      list = shuffle(list);
    } else if (topic === "all") list = shuffle(FACTS);
    else list = shuffle(FACTS.filter(function (f) { return f.t === topic; }));
    state.cards = { topic: topic, list: list, i: 0, flipped: false, right: 0 };
  }
  function factWeight(f) { var s = S.facts[f.q]; if (!s) return 5 + Math.random(); return (s.last === 0 ? 8 : 0) + (s.k ? 0 : 3) - (s.k || 0) + Math.random(); }

  /* ---- math lab ---- */
  var GEN = {
    sl_annual: { name: "Straight-line depreciation", make: function () {
      var cost = rnd(12, 300) * 1000, salv = Math.round(cost * rnd(5, 20) / 100 / 500) * 500, life = pick([5, 6, 7, 8, 10, 12, 15]);
      var a = (cost - salv) / life;
      return { text: "A piece of equipment costs " + money(cost) + ", has a salvage value of " + money(salv) + " and a useful life of " + life + " years. What is the annual straight-line depreciation?", answer: a, choices: [a, cost / life, (cost + salv) / life, (cost - salv) / (life - 1)], f: money0, work: "(Cost − Salvage) ÷ Life\n(" + money(cost) + " − " + money(salv) + ") ÷ " + life + " = " + money0(a) };
    } },
    sl_total: { name: "Accumulated depreciation", make: function () {
      var cost = rnd(30, 250) * 1000, salv = rnd(2, 30) * 1000, life = pick([8, 10, 12, 15]), yrs = rnd(2, life - 1);
      var a = (cost - salv) / life * yrs;
      return { text: "A tractor bought for " + money(cost) + " has a " + life + "-year life and " + money(salv) + " salvage value. Using straight line, what is total depreciation after " + yrs + " years?", answer: a, choices: [a, cost / life * yrs, (cost - salv) / life, (cost - salv) / life * (yrs + 1)], f: money0, work: "Annual = (" + money(cost) + " − " + money(salv) + ") ÷ " + life + " = " + money0((cost - salv) / life) + "\nTotal = " + money0((cost - salv) / life) + " × " + yrs + " = " + money0(a) };
    } },
    gainloss: { name: "Gain or loss on sale", make: function () {
      var cost = rnd(10, 80) * 1000 + rnd(0, 9) * 100, acc = Math.round(cost * rnd(15, 70) / 100 / 100) * 100, book = cost - acc;
      var sale = Math.round(book * (rnd(70, 130) / 100) / 100) * 100; if (sale === book) sale += 500;
      var g = sale - book;
      var lbl = function (v) { return (v >= 0 ? "Gain of " : "Loss of ") + money(Math.abs(v)); };
      return { text: "A truck was purchased for " + money(cost) + ". Accumulated depreciation on the books is " + money(acc) + ". It sells for " + money(sale) + ". What is the gain or loss?", answer: g, choices: [g, sale - cost, -g, sale - acc], f: lbl, work: "Book value = " + money(cost) + " − " + money(acc) + " = " + money(book) + "\nSale − Book = " + money(sale) + " − " + money(book) + " = " + lbl(g) };
    } },
    poc: { name: "Percentage of completion", make: function () {
      var ctd = rnd(50, 400) * 1000, ctc = rnd(30, 300) * 1000, total = ctd + ctc, price = Math.round(total * (1 + rnd(8, 25) / 100) / 1000) * 1000;
      var billed = Math.round(price * rnd(30, 80) / 100 / 1000) * 1000, p = ctd / total, earned = p * price;
      var kind = pick(["pct", "earned", "over"]);
      if (kind === "pct") return { text: "Cost of work completed is " + money(ctd) + ". Estimated cost to complete is " + money(ctc) + ". What percentage of the job is complete?", answer: p * 100, choices: [p * 100, ctd / price * 100, ctc / total * 100, ctd / ctc * 100 > 100 ? 100 - p * 100 : ctd / ctc * 100], f: pctf, work: "Cost to date ÷ Total estimated cost\n" + money(ctd) + " ÷ (" + money(ctd) + " + " + money(ctc) + ") = " + money(ctd) + " ÷ " + money(total) + " = " + pctf(p * 100) };
      if (kind === "earned") return { text: "Contract price " + money(price) + ". Cost to date " + money(ctd) + ", estimated cost to complete " + money(ctc) + ". Using percentage of completion, how much revenue has been earned?", answer: earned, choices: [earned, ctd, price - ctc, p * total], f: money0, work: "% complete = " + money(ctd) + " ÷ " + money(total) + " = " + pctf(p * 100) + "\nEarned = " + pctf(p * 100) + " × " + money(price) + " = " + money0(earned) };
      var d = billed - earned;
      var lbl = function (v) { return Math.abs(v) < 1 ? "Billed exactly what was earned" : v > 0 ? "Overbilled by " + money0(v) : "Underbilled by " + money0(-v); };
      return { text: "Contract price " + money(price) + ". Cost to date " + money(ctd) + ", estimated cost to complete " + money(ctc) + ". You have billed " + money(billed) + ". Are you over- or underbilled, and by how much?", answer: d, choices: [d, -d, billed - ctd, billed - price * 0.5], f: lbl, work: "Earned = (" + money(ctd) + " ÷ " + money(total) + ") × " + money(price) + " = " + money0(earned) + "\nBilled − Earned = " + money(billed) + " − " + money0(earned) + " → " + lbl(d) + "\n(Overbilled = unearned income, a liability. Underbilled = earned more than paid, an asset.)" };
    } },
    markup: { name: "Contract price with profit", make: function () {
      var a = rnd(20, 200) * 1000, b = rnd(20, 200) * 1000, p = pick([8, 10, 12, 15, 18, 20, 25]), tot = a + b, ans = tot * (1 + p / 100);
      return { text: "Cost to date is " + money(a) + " and estimated cost to complete is " + money(b) + ". For " + art(p) + " " + p + "% profit (on cost), what should the contract price be?", answer: ans, choices: [ans, tot, b * (1 + p / 100) + a, tot / (1 - p / 100)], f: money0, work: "Total cost = " + money(a) + " + " + money(b) + " = " + money(tot) + "\nPrice = " + money(tot) + " × " + (1 + p / 100).toFixed(2) + " = " + money0(ans) };
    } },
    interest: { name: "Simple interest", make: function () {
      var P = rnd(2, 40) * 10000, r = pick([5, 6, 7, 7.5, 8, 9, 10, 12]), m = pick([3, 4, 6, 8, 9, 18]), i = P * r / 100 * m / 12;
      return { text: "A " + money(P) + " loan at " + r + "% annual interest is repaid after " + m + " months. How much interest is paid?", answer: i, choices: [i, P * r / 100, P * r / 100 * m, P * r / 100 * 12 / m], f: money0, work: "Principal × Rate × (Months ÷ 12)\n" + money(P) + " × " + (r / 100) + " × " + m + "/12 = " + money0(i) };
    } },
    current: { name: "Current ratio", make: function () {
      var cl = rnd(40, 400) * 1000, ca = Math.round(cl * rnd(80, 350) / 100 / 1000) * 1000, r = ca / cl;
      var f = function (v) { return v.toFixed(2) + " to 1"; };
      return { text: "Current assets are " + money(ca) + " and current liabilities are " + money(cl) + ". What is the current ratio?", answer: r, choices: [r, cl / ca, (ca - cl) / cl, ca / (ca + cl)], f: f, work: "Current assets ÷ Current liabilities\n" + money(ca) + " ÷ " + money(cl) + " = " + f(r) };
    } },
    margin: { name: "Sales needed for a profit margin", make: function () {
      var ni = rnd(10, 300) * 10000, m = pick([5, 8, 10, 12, 15, 20, 25, 30, 37]), s = ni / (m / 100);
      return { text: "A company expects net income of " + money(ni) + ". To achieve " + art(m) + " " + m + "% profit margin, what must sales be?", answer: s, choices: [s, ni * (1 + m / 100), ni / (1 - m / 100), ni * m / 10], f: money0, work: "Margin = Net income ÷ Sales  →  Sales = Net income ÷ Margin\n" + money(ni) + " ÷ " + (m / 100) + " = " + money0(s) };
    } },
    breakeven: { name: "Breakeven sales", make: function () {
      var fo = rnd(10, 90) * 10000, gm = pick([15, 18, 20, 22, 25, 30]), be = fo / (gm / 100);
      return { text: "Annual fixed overhead is " + money(fo) + " and gross profit is " + gm + "% of sales. What sales volume is needed to break even?", answer: be, choices: [be, fo * (1 + gm / 100), fo / (1 - gm / 100), fo * gm / 10], f: money0, work: "Breakeven sales = Fixed overhead ÷ Gross profit %\n" + money(fo) + " ÷ " + (gm / 100) + " = " + money0(be) };
    } },
    daypay: { name: "Day-rate pay & overtime", make: function () {
      var rate = pick([35, 45, 60, 80, 120, 160]), days = pick([5, 6]), hrs = pick(days === 5 ? [9, 9.5, 10] : [8, 8.5, 9, 10]), H = days * hrs, total = rate * days;
      var rr = total / H, ot = Math.max(0, H - 40), ans, work;
      if (rr < 7.25) { ans = 40 * 7.25 + ot * 7.25 * 1.5; work = "Regular rate = " + money(total) + " ÷ " + H + " hrs = " + money(rr, 2) + "/hr, below the $7.25 minimum, so use $7.25\n40 × $7.25 = $290.00\nOT: " + ot + " × $7.25 × 1.5 = " + money(ot * 10.875, 2) + "\nTotal = " + money(ans, 2); }
      else { ans = total + ot * rr * 0.5; work = "Day-rate pay = " + rate + " × " + days + " = " + money(total) + " (covers straight time for all hours)\nRegular rate = " + money(total) + " ÷ " + H + " = " + money(rr, 2) + "/hr\nOT premium = " + ot + " hrs × " + money(rr, 2) + " × 0.5 = " + money(ot * rr * 0.5, 2) + "\nTotal = " + money(ans, 2); }
      return { text: "A laborer is paid a day rate of " + money(rate) + " and works " + days + " days at " + hrs + " hours a day in one workweek. What is the minimum gross pay under the FLSA?", answer: ans, choices: [ans, total, total + ot * rr * 1.5, H * 7.25], f: function (v) { return money(v, 2); }, work: work };
    } },
    salestax: { name: "Sales tax journal entry", make: function () {
      var price = rnd(2, 90) * 50, r = pick([6, 6.5, 7, 7.5]), tax = price * r / 100;
      var kind = pick(["tax", "debit"]);
      if (kind === "tax") return { text: "You sell an item for " + money(price) + " to a non-exempt customer. Sales tax is " + r + "%. What is the credit to Sales Tax Payable?", answer: tax, choices: [tax, price + tax, price * r, 0], f: function (v) { return money(v, 2); }, work: "Dr Accounts Receivable " + money(price + tax, 2) + "\n   Cr Sales " + money(price, 2) + "\n   Cr Sales Tax Payable " + money(tax, 2) + "  (" + money(price) + " × " + r + "%)" };
      return { text: "You sell an item for " + money(price) + " on account. Sales tax is " + r + "%. What is the debit to Accounts Receivable?", answer: price + tax, choices: [price + tax, price, tax, price - tax], f: function (v) { return money(v, 2); }, work: "Dr Accounts Receivable " + money(price + tax, 2) + "\n   Cr Sales " + money(price, 2) + "\n   Cr Sales Tax Payable " + money(tax, 2) };
    } },
    deadlines: { name: "Deadline dates", make: function () {
      var base = new Date(new Date().getFullYear(), rnd(0, 11), rnd(1, 28));
      var fmt = function (d) { return d.toLocaleDateString("en-US", { month: "long", day: "numeric" }); };
      var add = function (d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; };
      var kind = pick(["claim", "nto", "lien", "concealed"]);
      if (kind === "claim") {
        var disc = add(base, rnd(1, 9)), due = add(disc, 21);
        return { text: "Under A201, a condition giving rise to a claim occurs on " + fmt(base) + " and the contractor discovers it on " + fmt(disc) + ". By when must the claim be initiated?", answer: due.getTime(), choices: [due.getTime(), add(base, 21).getTime(), add(disc, 14).getTime(), add(disc, 30).getTime()], f: function (v) { return fmt(new Date(v)); }, work: "21 days from the later of the event or discovery\n" + fmt(disc) + " + 21 days = " + fmt(due) };
      }
      if (kind === "concealed") {
        var d2 = add(base, 14);
        return { text: "A contractor first observes a concealed subsurface condition on " + fmt(base) + ". Under A201, notice must be given no later than…", answer: d2.getTime(), choices: [d2.getTime(), add(base, 10).getTime(), add(base, 21).getTime(), add(base, 7).getTime()], f: function (v) { return fmt(new Date(v)); }, work: "Concealed conditions: notice to Owner and Architect within 14 days of first observing\n" + fmt(base) + " + 14 = " + fmt(d2) };
      }
      if (kind === "nto") {
        var d3 = add(base, 45);
        return { text: "A supplier with no direct contract with the owner first delivers materials on " + fmt(base) + ". What's the last day to serve the Notice to Owner?", answer: d3.getTime(), choices: [d3.getTime(), add(base, 40).getTime(), add(base, 90).getTime(), add(base, 30).getTime()], f: function (v) { return fmt(new Date(v)); }, work: "Notice to Owner: within 45 days of first furnishing\n" + fmt(base) + " + 45 = " + fmt(d3) };
      }
      var d4 = add(base, 90);
      return { text: "A subcontractor's final furnishing of labor was " + fmt(base) + ". What is the last day to record a claim of lien?", answer: d4.getTime(), choices: [d4.getTime(), add(base, 45).getTime(), add(base, 60).getTime(), add(base, 365).getTime()], f: function (v) { return fmt(new Date(v)); }, work: "Claim of lien: within 90 days after final furnishing\n" + fmt(base) + " + 90 = " + fmt(d4) };
    } },
    level: { name: "Equipment leveling", make: function () {
      var have = pick([10, 12, 15, 20, 24, 30]), months = 3, need = [];
      var total = have * months;
      var a = rnd(Math.round(total * 0.45), Math.round(total * 0.7)), b = Math.floor((total - a) / 2), c = total - a - b; need = [a, b, c];
      return { text: "An equipment schedule calls for " + need[0] + " trucks in month 1, " + need[1] + " in month 2 and " + need[2] + " in month 3. If the schedule is leveled across the 3 months, how many trucks are needed each month?", answer: have, choices: [have, need[0], Math.round(need[0] / 2), Math.max.apply(null, need) - Math.min.apply(null, need)], f: function (v) { return v + " trucks"; }, work: "(" + need.join(" + ") + ") ÷ 3 = " + total + " ÷ 3 = " + have + " trucks per month" };
    } }
  };
  window.FBF_INTERNALS = { GEN: GEN, makeProblem: function (t) { return makeProblem(t); } }; // used by tools/check.js
  function money0(v) { return money(Math.round(v)); }
  function pctf(v) { return (Math.round(v * 100) / 100).toFixed(2) + "%"; }

  VIEWS.math = function () {
    var m = state.math, h = [];
    h.push('<div class="page-head"><div class="eyebrow">Math Lab</div><h1>Calculation practice</h1><p>Unlimited fresh problems built on the same formulas the exam uses, each with a worked solution. Bring a basic calculator to practice with, the same way you will on test day.</p></div>');
    h.push('<section class="grid4">' + statTile(S.math.cur, "Current streak") + statTile(S.math.best, "Best streak") + statTile(S.math.done, "Problems done") + statTile(S.math.done ? pct(S.math.right, S.math.done) + "%" : "—", "Accuracy") + "</section>");
    var types = Object.keys(GEN);
    h.push('<section class="card stack"><div class="field"><span class="label">Problem types</span><div class="chips">' + chip("mathType", "mix", "Mixed", !m || m.type === "mix") + types.map(function (t) { return chip("mathType", t, GEN[t].name, m && m.type === t); }).join("") + "</div></div></section>");
    if (m && m.p) {
      var p = m.p;
      h.push('<article class="card stack lg"><div class="row between"><span class="pill hi">' + esc(GEN[m.cur].name) + '</span><span class="small muted">Problem ' + m.n + '</span></div><p class="q-stem">' + esc(p.text) + '</p><div class="options">' +
        m.order.map(function (ci, pos) {
          var cls = "opt", mark = "";
          if (m.picked != null) { if (ci === 0) { cls += " correct"; mark = icon("check"); } else if (ci === m.picked) { cls += " wrong"; mark = icon("x"); } }
          return '<button class="' + cls + '" data-act="mathPick" data-c="' + ci + '"' + (m.picked != null ? " disabled" : "") + '><span class="letter">' + L[pos] + "</span><span>" + esc(p.f(p.choices[ci])) + '</span><span class="mark">' + mark + "</span></button>";
        }).join("") + "</div>" +
        (m.picked != null ? '<section class="explain"><div class="verdict ' + (m.picked === 0 ? "ok" : "bad") + '">' + icon(m.picked === 0 ? "check" : "x") + (m.picked === 0 ? "Correct" : "Answer: " + esc(p.f(p.answer))) + '</div><div class="label">Worked solution</div><div class="work">' + esc(p.work) + '</div></section><div class="row" style="justify-content:flex-end"><button class="btn primary" data-act="mathNext">Next problem ' + icon("arrow") + "</button></div>" : "") + "</article>");
    } else {
      h.push('<div class="row"><button class="btn primary" data-act="mathNext">Start practicing ' + icon("arrow") + "</button></div>");
    }
    h.push('<section class="card stack"><h3>Formula sheet</h3><div>' + FORMULAS.map(function (f) { return '<div class="formula"><strong>' + esc(f.name) + '</strong><span class="fx">' + esc(f.f) + "</span></div>"; }).join("") + "</div></section>");
    return h.join("");
  };
  function makeProblem(t) {
    // regenerate until the four choices are distinct once formatted
    for (var guard = 0; guard < 40; guard++) {
      var p = GEN[t].make(), seen = {}, ok = true;
      p.choices.forEach(function (c) { var k = p.f(c); if (seen[k] || !isFinite(c)) ok = false; seen[k] = 1; });
      if (ok && p.choices.length === 4) return p;
    }
    return null;
  }
  function nextMath() {
    var m = state.math || (state.math = { type: "mix", n: 0 });
    var types = Object.keys(GEN), t, p;
    do { t = m.type === "mix" ? pick(types) : m.type; p = makeProblem(t); } while (!p);
    m.cur = t; m.p = p; m.picked = null; m.n++; m.order = shuffle([0, 1, 2, 3]);
  }

  /* ---- books: tab guide + book finder ---- */
  VIEWS.books = function () {
    var ed = S.settings.edition, items = tabItems();
    var h = ['<div class="page-head"><div class="eyebrow">Open-book exam prep</div><h1>Book tabs &amp; finder</h1><p>The state exam is open book, so speed finding answers is a skill. This page lists every page and section the 375 answer keys point to, so you know exactly what to tab and highlight. Check each one off as you tab it.</p></div>'];
    h.push('<section class="card stack"><div class="row between"><div><div class="eyebrow">Book Finder drill</div><h3>Which book would you grab?</h3></div><span class="mono small muted">' + S.bf.right + "/" + S.bf.done + " right</span></div>" + bookFinder() + "</section>");
    h.push('<section class="card stack"><div class="row between"><h3>Tab guide</h3><div class="row"><label class="small muted" for="tabEd">Contractors Manual edition</label><select id="tabEd" data-change="edition" style="width:auto">' + ["2025", "2021", "2017"].map(function (e) { return "<option" + (ed === e ? " selected" : "") + ">" + e + "</option>"; }).join("") + "</select></div></div>");
    BOOK_KEYS.forEach(function (b) {
      var list = items.filter(function (t) { return t.book === b; }).sort(locSort);
      if (!list.length) return;
      var done = list.filter(function (t) { return S.tabs[t.key]; }).length, qcount = {};
      list.forEach(function (t) { t.ids.forEach(function (id) { qcount[id] = 1; }); });
      h.push('<details class="card flat stack"' + (state.openBook === b ? " open" : "") + ' data-book="' + b + '"><summary class="row between" style="cursor:pointer"><span class="row"><span class="tab ' + BOOKS[b].color + '">' + esc(BOOKS[b].short) + '</span><strong>' + esc(BOOKS[b].name) + '</strong></span><span class="mono small muted">' + done + " / " + list.length + " tabbed · " + Object.keys(qcount).length + ' questions</span></summary><p class="small muted" style="margin:8px 0 0">' + esc(BOOKS[b].when) + '</p><div class="bar ok" style="margin:10px 0"><span style="width:' + pct(done, list.length) + '%"></span></div><div>' +
        list.map(function (t) {
          var on = !!S.tabs[t.key], topics = {};
          t.ids.forEach(function (id) { topics[QBY[id].topic] = 1; });
          var label = b === "FCM" || b === "BGA" ? "p. " + t.loc : "§" + t.loc;
          return '<label class="tabrow' + (on ? " done" : "") + '"><input type="checkbox" data-change="tab" data-k="' + esc(t.key) + '"' + (on ? " checked" : "") + '><span class="loc">' + esc(label) + '</span><span class="what">' + Object.keys(topics).map(function (x) { return esc(TOPICS[x].short); }).join(", ") + (t.stat ? ' <span class="pill">§' + esc(t.stat) + "</span>" : "") + (t.ids.length > 1 ? ' <span class="pill hi">' + t.ids.length + " questions</span>" : "") + '<span class="qlinks">' + t.ids.map(function (id) { return '<button class="qlink" data-act="openQ" data-id="' + id + '" title="' + esc(QBY[id].stem.slice(0, 120)) + '">' + id + "</button>"; }).join("") + "</span></span></label>";
        }).join("") + "</div></details>");
    });
    h.push('<p class="small muted">Page numbers come from the answer keys. Pages without an edition label apply to every edition. If a page doesn\'t match your copy, use the index term shown in the answer-key reference on the question.</p></section>');
    return h.join("");
  };
  function locSort(a, b) {
    var pa = String(a.loc).split(/[-.]/).map(function (x) { return parseFloat(x) || 0; }), pb = String(b.loc).split(/[-.]/).map(function (x) { return parseFloat(x) || 0; });
    for (var i = 0; i < Math.max(pa.length, pb.length); i++) { var d = (pa[i] || 0) - (pb[i] || 0); if (d) return d; }
    return 0;
  }
  function bookFinder() {
    var bf = state.bf;
    if (!bf) { bf = state.bf = { id: pick(Q).id, picked: null }; }
    var q = QBY[bf.id];
    var h = '<p class="q-stem" style="font-size:1.05rem">' + stemHTML(q.stem) + '</p><div class="chips">' + BOOK_KEYS.map(function (b) {
      var st = "";
      if (bf.picked) { if (q.books.indexOf(b) >= 0) st = "background:var(--ok-soft);border-color:var(--ok);color:var(--ok);font-weight:700"; else if (bf.picked === b) st = "background:var(--bad-soft);border-color:var(--bad);color:var(--bad)"; }
      return '<button class="chip" data-act="bfPick" data-v="' + b + '"' + (bf.picked ? " disabled" : "") + (st ? ' style="' + st + '"' : "") + ">" + esc(BOOKS[b].short) + "</button>";
    }).join("") + "</div>";
    if (bf.picked) h += '<div class="where"><div class="label">' + (q.books.indexOf(bf.picked) >= 0 ? "Right book" : "It's in") + '</div><div class="cites">' + citeChips(q) + '</div><p class="small" style="margin:0"><strong>Answer:</strong> ' + esc(q.options[ansIdx(q)]) + '</p></div><div class="row" style="justify-content:flex-end"><button class="btn primary sm" data-act="bfNext">Next ' + icon("arrow") + "</button></div>";
    return h;
  }

  /* ---- topics ---- */
  VIEWS.topics = function () {
    var h = ['<div class="page-head"><div class="eyebrow">Topics</div><h1>Study by subject</h1><p>The 375 questions sorted into the subjects the state exam covers. Accuracy is based on your latest answer to each question you\'ve seen.</p></div>'];
    var list = TOPIC_KEYS.map(function (t) { return { t: t, g: groupStats(topicIds(t)) }; }).sort(function (a, b) { return b.g.total - a.g.total; });
    h.push('<section class="card"><div>' + list.map(topicRow).join("") + "</div></section>");
    return h.join("");
  };
  VIEWS.topic = function () {
    var t = state.param && TOPICS[state.param] ? state.param : TOPIC_KEYS[0], T = TOPICS[t], ids = topicIds(t), g = groupStats(ids);
    var h = ['<button class="btn sm ghost" style="align-self:flex-start" data-act="nav" data-v="topics">' + icon("back") + 'All topics</button><div class="page-head"><div class="eyebrow">Topic</div><h1>' + esc(T.name) + "</h1><p>" + esc(T.summary) + "</p></div>"];
    h.push('<section class="grid4">' + statTile(g.total, "Questions") + statTile(g.seen, "Seen") + statTile(g.seen ? Math.round(g.acc * 100) + "%" : "—", "Accuracy") + statTile(g.mastered, "Mastered") + "</section>");
    h.push('<div class="row"><button class="btn primary" data-act="drillTopic" data-v="' + t + '">Drill all ' + g.total + '</button><button class="btn" data-act="drillTopicNew" data-v="' + t + '"' + (g.seen < g.total ? "" : " disabled") + ">New only (" + (g.total - g.seen) + ')</button><button class="btn" data-act="drillTopicWeak" data-v="' + t + '">Not mastered (' + (g.total - g.mastered) + ")</button></div>");
    var facts = FACTS.filter(function (f) { return f.t === t; });
    if (facts.length) h.push('<section class="card stack"><div class="row between"><h3>Numbers to know</h3><button class="btn sm" data-act="cardsStart" data-v="' + t + '">Flashcards</button></div><div class="scroll-x"><table class="t"><tbody>' + facts.map(function (f) { return "<tr><td>" + esc(f.q) + '</td><td style="font-weight:700">' + esc(f.a) + "</td></tr>"; }).join("") + "</tbody></table></div></section>");
    var books = {};
    ids.forEach(function (id) { QBY[id].books.forEach(function (b) { books[b] = (books[b] || 0) + 1; }); });
    h.push('<section class="card stack"><h3>Where these answers live</h3><div class="row">' + Object.keys(books).sort(function (a, b) { return books[b] - books[a]; }).map(function (b) { return '<span class="tab ' + BOOKS[b].color + '">' + esc(BOOKS[b].short) + " · " + books[b] + "</span>"; }).join("") + "</div></section>");
    h.push('<section class="card stack"><h3>Questions</h3><div class="dotline" aria-label="Status of each question">' + ids.map(function (id) { var r = peek(id); return '<span class="dot b' + r.box + '" title="' + id + '"></span>'; }).join("") + '</div><p class="tiny muted" style="margin:0">Green = mastered · yellow = seen once · red = missed last time · grey = not seen</p>' +
      ids.map(function (id) { return browseItem(QBY[id]); }).join("") + "</section>");
    return h.join("");
  };

  /* ---- browse ---- */
  VIEWS.browse = function () {
    var b = state.browse;
    var h = ['<div class="page-head"><div class="eyebrow">Question bank</div><h1>All 375 questions</h1><p>Search and read every question with its answer, explanation and reference. Good for a final read-through the night before.</p></div>'];
    h.push('<section class="card stack"><div class="field"><label for="bq">Search</label><input type="search" id="bq" data-input="bq" value="' + esc(b.q) + '" placeholder="Try: lien, 45 days, depreciation, A201"></div><div class="row">' +
      '<select id="bexam" data-change="bexam" style="flex:1;min-width:120px"><option value="">All exams</option>' + [1, 2, 3].map(function (e) { return '<option value="' + e + '"' + (String(b.exam) === String(e) ? " selected" : "") + ">Exam " + e + "</option>"; }).join("") + "</select>" +
      '<select id="btopic" data-change="btopic" style="flex:2;min-width:160px"><option value="">All topics</option>' + TOPIC_KEYS.map(function (t) { return '<option value="' + t + '"' + (b.topic === t ? " selected" : "") + ">" + esc(TOPICS[t].name) + "</option>"; }).join("") + "</select>" +
      '<select id="bstatus" data-change="bstatus" style="flex:1;min-width:140px">' + [["", "Any status"], ["missed", "Missed last time"], ["flag", "Flagged"], ["new", "Not seen"], ["mast", "Mastered"], ["note", "Has my note"]].map(function (s) { return '<option value="' + s[0] + '"' + (b.status === s[0] ? " selected" : "") + ">" + s[1] + "</option>"; }).join("") + "</select></div></section>");
    h.push('<section class="card" id="browseList">' + browseList() + "</section>");
    return h.join("");
  };
  function browseList() {
    var b = state.browse, qq = b.q.trim().toLowerCase();
    var list = Q.filter(function (q) {
      if (b.exam && String(q.exam) !== String(b.exam)) return false;
      if (b.topic && q.topic !== b.topic) return false;
      var r = peek(q.id);
      if (b.status === "missed" && r.last !== 0) return false;
      if (b.status === "flag" && !r.f) return false;
      if (b.status === "new" && r.n) return false;
      if (b.status === "mast" && r.box < MASTER_BOX) return false;
      if (b.status === "note" && !r.note) return false;
      if (qq) {
        var hay = (q.stem + " " + q.options.join(" ") + " " + q.exp + " " + (q.scenario || "") + " " + q.ref.join(" ") + " " + (r.note || "")).toLowerCase();
        if (qq.split(/\s+/).some(function (w) { return hay.indexOf(w) < 0; })) return false;
      }
      return true;
    });
    if (!list.length) return '<p class="empty">No questions match.</p>';
    return '<p class="small muted" style="margin:0 0 4px">' + plural(list.length, "question") + "</p>" + list.slice(0, 400).map(browseItem).join("");
  }
  function browseItem(q) {
    var ans = ansIdx(q), r = peek(q.id);
    var st = r.box >= MASTER_BOX ? '<span class="pill ok">mastered</span>' : r.last === 0 ? '<span class="pill bad">missed</span>' : r.n ? '<span class="pill">seen</span>' : "";
    return '<details class="qitem" id="q-' + q.id + '"' + (state.openQ === q.id ? " open" : "") + '><summary><span class="qid">' + q.id + '</span><span>' + stemHTML(q.stem) + " " + st + (r.f ? ' <span class="pill hi">flagged</span>' : "") + '</span></summary><div class="body">' +
      (q.scenario ? '<div class="q-scenario small">' + esc(q.scenario) + "</div>" : "") +
      '<ul class="optlist">' + q.options.map(function (o, i) { return '<li class="' + (i === ans ? "ans" : "") + '">' + L[i] + ". " + esc(o) + "</li>"; }).join("") + "</ul>" + md(q.exp) +
      (q.tip ? '<div class="tipbox"><b>Remember</b><span>' + inline(q.tip) + "</span></div>" : "") +
      '<div class="cites">' + citeChips(q) + '</div>' + (r.note ? '<p class="small"><strong>My note:</strong> ' + esc(r.note) + "</p>" : "") +
      '<div class="row"><button class="btn sm" data-act="practiceOne" data-id="' + q.id + '">Practice this one</button><button class="btn sm ' + (r.f ? "flag-on" : "") + '" data-act="flagBrowse" data-id="' + q.id + '">' + icon("flag") + (r.f ? "Flagged" : "Flag") + "</button></div></div></details>";
  }

  /* ---- progress ---- */
  VIEWS.stats = function () {
    var o = overall(), ex = examScores();
    var h = ['<div class="page-head"><div class="eyebrow">Progress</div><h1>How you\'re trending</h1></div>'];
    var tot = 0, cor = 0; Object.keys(S.q).forEach(function (k) { tot += S.q[k].n; cor += S.q[k].c; });
    h.push('<section class="grid4">' + statTile(tot, "Answers given") + statTile(tot ? pct(cor, tot) + "%" : "—", "All-time accuracy") + statTile(o.seen, "Questions seen") + statTile(S.attempts.length, "Exams taken") + "</section>");
    h.push('<section class="card stack"><h3>Timed exam scores</h3>' + (ex.length ? lineChart(ex.slice(-12)) : '<p class="empty">Take a timed exam to see your trend. The dashed lines mark 70% (pass) and 85% (target).</p>') + "</section>");
    h.push('<section class="card stack"><h3>Last 14 days</h3>' + barChart() + "</section>");
    var rows = TOPIC_KEYS.map(function (t) { return { t: t, g: groupStats(topicIds(t)) }; });
    h.push('<section class="card stack"><h3>Topics</h3><div class="scroll-x"><table class="t"><thead><tr><th>Topic</th><th>Seen</th><th>Accuracy</th><th>Mastered</th></tr></thead><tbody>' + rows.map(function (r) {
      return '<tr><td><button class="btn ghost sm" style="padding:0;min-height:0;text-align:left" data-act="nav" data-v="topic" data-p="' + r.t + '">' + esc(TOPICS[r.t].name) + '</button></td><td class="num">' + r.g.seen + "/" + r.g.total + '</td><td class="num">' + (r.g.seen ? Math.round(r.g.acc * 100) + "%" : "—") + '</td><td class="num">' + Math.round(r.g.mastery * 100) + "%</td></tr>";
    }).join("") + "</tbody></table></div></section>");
    var books = BOOK_KEYS.map(function (b) { return { b: b, g: groupStats(Q.filter(function (q) { return q.books[0] === b; }).map(function (q) { return q.id; })) }; });
    h.push('<section class="card stack"><h3>By reference book</h3>' + books.map(function (x) {
      var a = Math.round(x.g.acc * 100);
      return '<div class="row nowrap" style="gap:12px"><span class="tab ' + BOOKS[x.b].color + '" style="width:150px;flex:none">' + esc(BOOKS[x.b].short) + '</span><span class="bar" style="flex:1"><span style="width:' + (x.g.seen ? a : 0) + '%"></span></span><span class="mono small" style="width:60px;text-align:right">' + (x.g.seen ? a + "%" : "—") + "</span></div>";
    }).join("") + "</section>");
    return h.join("");
  };
  function lineChart(list) {
    var W = 560, H = 200, pl = 34, pr = 12, pt = 12, pb = 26, iw = W - pl - pr, ih = H - pt - pb;
    var x = function (i) { return pl + (list.length === 1 ? iw / 2 : (iw * i) / (list.length - 1)); };
    var y = function (v) { return pt + ih * (1 - v); };
    var s = '<div class="scroll-x"><svg class="chart" viewBox="0 0 ' + W + " " + H + '" style="width:100%;min-width:320px" role="img" aria-label="Exam score history">';
    [0, 0.25, 0.5, 0.75, 1].forEach(function (v) { s += '<line class="grid" x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y(v) + '" y2="' + y(v) + '"/><text x="' + (pl - 6) + '" y="' + (y(v) + 3) + '" text-anchor="end">' + v * 100 + "</text>"; });
    s += '<line class="pass" x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y(PASS) + '" y2="' + y(PASS) + '"/><line class="pass" style="stroke:var(--blue);opacity:.5" x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y(TARGET) + '" y2="' + y(TARGET) + '"/>';
    var pts = list.map(function (a, i) { return x(i) + "," + y(a.score); });
    if (list.length > 1) s += '<polygon class="area" points="' + x(0) + "," + y(0) + " " + pts.join(" ") + " " + x(list.length - 1) + "," + y(0) + '" opacity=".6"/><polyline class="line" points="' + pts.join(" ") + '"/>';
    list.forEach(function (a, i) { s += '<circle class="pt" cx="' + x(i) + '" cy="' + y(a.score) + '" r="' + (i === list.length - 1 ? 5.5 : 3.5) + '"><title>' + esc(a.title) + ": " + Math.round(a.score * 100) + "%</title></circle>"; s += '<text x="' + x(i) + '" y="' + (H - 8) + '" text-anchor="middle">' + (new Date(a.at).getMonth() + 1) + "/" + new Date(a.at).getDate() + "</text>"; });
    var last = list[list.length - 1];
    s += '<text x="' + Math.min(x(list.length - 1), W - pr - 4) + '" y="' + (y(last.score) - 10) + '" text-anchor="end" style="fill:var(--ink);font-weight:700">' + Math.round(last.score * 100) + "%</text>";
    return s + "</svg></div>";
  }
  function barChart() {
    var W = 560, H = 160, pl = 30, pb = 22, pt = 10, iw = W - pl - 8, ih = H - pt - pb, days = [];
    for (var i = 13; i >= 0; i--) { var d = new Date(); d.setDate(d.getDate() - i); days.push({ d: d, v: (S.days[todayKey(d)] || { a: 0 }).a }); }
    var max = Math.max(S.settings.goal, Math.max.apply(null, days.map(function (x) { return x.v; })));
    var bw = iw / 14 * 0.66, s = '<div class="scroll-x"><svg class="chart" viewBox="0 0 ' + W + " " + H + '" style="width:100%;min-width:320px" role="img" aria-label="Questions answered per day">';
    var gy = pt + ih * (1 - S.settings.goal / max);
    s += '<line class="grid" x1="' + pl + '" x2="' + (W - 8) + '" y1="' + (pt + ih) + '" y2="' + (pt + ih) + '"/><line class="pass" x1="' + pl + '" x2="' + (W - 8) + '" y1="' + gy + '" y2="' + gy + '"/><text x="' + (pl - 4) + '" y="' + (gy + 3) + '" text-anchor="end">' + S.settings.goal + "</text>";
    days.forEach(function (x, i) {
      var bh = ih * x.v / max, cx = pl + (iw / 14) * i + (iw / 14 - bw) / 2;
      s += '<rect class="barr' + (x.v >= S.settings.goal ? " goal" : "") + '" x="' + cx + '" y="' + (pt + ih - bh) + '" width="' + bw + '" height="' + Math.max(bh, x.v ? 2 : 0) + '" rx="2"><title>' + x.d.toLocaleDateString() + ": " + x.v + "</title></rect>";
      if (i % 2 === 1 || i === 13) s += '<text x="' + (cx + bw / 2) + '" y="' + (H - 6) + '" text-anchor="middle">' + (x.d.getMonth() + 1) + "/" + x.d.getDate() + "</text>";
    });
    return s + "</svg></div>";
  }

  /* ---- guide ---- */
  VIEWS.guide = function () {
    var o = overall(), ex = examScores().slice(-3);
    var phase = o.seen < Q.length ? 0 : (o.mastery < 0.9 || factKnown() < FACTS.length || S.math.best < 10) ? 1 : (ex.length < 3 || ex.some(function (a) { return a.score < TARGET; })) ? 2 : 3;
    var cls = function (i) { return i < phase ? "done" : i === phase ? "now" : ""; };
    var dleft = daysUntil(S.settings.examDate);
    var unseen = Q.length - o.seen;
    var perDay = dleft && dleft > 0 ? Math.ceil((unseen + dueIds().length) / Math.max(1, Math.floor(dleft * 0.6))) : null;
    return '<div class="page-head"><div class="eyebrow">Playbook</div><h1>How to pass on the first try</h1><p>A study plan that uses every tool in this app, plus tactics for test day.</p></div>' +
      '<section class="card stack"><h3>Your study plan</h3>' + (perDay ? '<p class="hl" style="margin:0">With ' + plural(dleft, "day") + " left, aim for about <strong>" + Math.max(perDay, 20) + " questions a day</strong> until you've seen them all, then spend the final stretch on reviews and timed exams.</p>" : "") +
      '<div class="steps">' +
      '<div class="' + cls(0) + '"><div><strong>Learn: one pass through all 375 questions</strong><p class="small muted" style="margin:4px 0 0">Practice by topic. On every miss, read the explanation, then open your book to the page shown and highlight the sentence that answers it. ' + o.seen + "/375 seen.</p></div></div>" +
      '<div class="' + cls(1) + '"><div><strong>Lock in: Smart Review, flashcards, Math Lab</strong><p class="small muted" style="margin:4px 0 0">Clear your due reviews daily. Drill Numbers to Know until every card is known, and get 10 math problems right in a row. ' + o.mastered + " mastered · " + factKnown() + "/" + FACTS.length + " cards · math best " + S.math.best + ".</p></div></div>" +
      '<div class="' + cls(2) + '"><div><strong>Simulate: timed exams with your books</strong><p class="small muted" style="margin:4px 0 0">Take the state simulation and full practice tests under the clock, using your tabbed books. Target three in a row at 85%+. ' + (ex.length ? "Last: " + ex.map(function (a) { return Math.round(a.score * 100) + "%"; }).join(", ") : "None yet") + ".</p></div></div>" +
      '<div class="' + cls(3) + '"><div><strong>Maintain until test day</strong><p class="small muted" style="margin:4px 0 0">Keep up daily reviews. The night before, skim the Numbers to Know cheat sheet and your flagged questions, then sleep.</p></div></div></div></section>' +
      '<section class="card prose"><h3>About the exam</h3><p>The Florida Business and Finance exam is <strong>open book</strong> and multiple choice, and it\'s required for every Division I and II contractor license. You bring the approved reference books (unmarked except for highlighting and permanent tabs, per the bulletin rules) and a basic calculator.</p><p>Check your current <strong>Candidate Information Bulletin</strong> for the exact question count, time limit, passing score and reference list. The simulator defaults to 120 questions in 7 hours with 70% to pass, and you can match the bulletin in <a href="#settings" data-act="nav" data-v="settings">Settings</a>.</p><p>These practice tests reference the <strong>Florida Contractors Manual</strong>, <strong>Builder\'s Guide to Accounting</strong>, <strong>AIA A201, A401 and A701</strong>, and <strong>Florida Statutes Chapter 455</strong>. Make sure the editions you bring match the bulletin. Two questions (Exam 2 #116 and Exam 3 #25) have different answers depending on your Contractors Manual edition.</p></section>' +
      '<section class="card prose"><h3>Tabbing and highlighting</h3><ul><li>Use the <a href="#books" data-act="nav" data-v="books">Tab guide</a>: it lists every page the answer keys cite, grouped by book. The pages that several questions cite are the highest priority.</li><li>Highlight only the sentence with the number or rule, not whole paragraphs. On test day you want your eye to land on the answer.</li><li>Tab by subject in the Contractors Manual (Lien Law, OSHA, Workers\' Comp, Licensing, Reemployment Tax) and by section in the AIA documents (A201 Art. 7 changes, Art. 9 payments, Art. 15 claims).</li><li>Practice the <strong>Book Finder</strong> drill until picking the right book is instant.</li></ul></section>' +
      '<section class="card prose"><h3>On test day</h3><ol><li><strong>Two passes.</strong> First pass: answer everything you know cold without opening a book, and flag the rest. Second pass: look up the flagged ones.</li><li><strong>Budget about 3 minutes a question.</strong> If a lookup goes past 4 minutes, pick your best guess, flag it, and move on.</li><li><strong>Never leave a blank.</strong> There\'s no penalty for guessing.</li><li><strong>Read for NOT and EXCEPT.</strong> Many questions ask which choice is <em>false</em>. Circle the word in your head before you read the choices.</li><li><strong>"All of the above"</strong>: if two choices are definitely true, it\'s usually the answer.</li><li><strong>Math:</strong> write the formula first, then plug in the numbers. Check that your answer is in the right range (a percentage under 100, depreciation smaller than cost).</li><li><strong>Federal vs. Florida.</strong> If the question says "federal," give the federal number (minimum wage $7.25).</li><li>Don\'t change an answer unless you find proof in the book.</li></ol></section>' +
      '<section class="card prose"><h3>How the app decides you\'re ready</h3><p>Readiness weighs three things: questions you\'ve answered correctly at least once (25%), questions mastered on spaced repeats (40%), and your last three timed exam scores (35%). Memorizing letter positions doesn\'t count. Answer choices are shuffled, and mastery requires getting a question right again days later.</p></section>';
  };

  /* ---- settings ---- */
  VIEWS.settings = function () {
    var s = S.settings;
    return '<div class="page-head"><div class="eyebrow">Settings</div><h1>Settings &amp; backup</h1></div>' +
      '<section class="card stack lg"><div class="grid2">' +
      '<div class="field"><label for="sDate">Exam date</label><input type="date" id="sDate" data-change="examDate" value="' + esc(s.examDate) + '"></div>' +
      '<div class="field"><label for="sGoal">Daily question goal</label><input type="number" id="sGoal" min="5" max="400" step="5" data-change="goal" value="' + s.goal + '"></div>' +
      '<div class="field"><label for="sEd">Contractors Manual edition</label><select id="sEd" data-change="edition">' + ["2025", "2021", "2017"].map(function (e) { return "<option" + (s.edition === e ? " selected" : "") + ">" + e + "</option>"; }).join("") + '</select><span class="tiny muted">Sets the page numbers shown and the answers for the 2 edition-dependent questions.</span></div>' +
      '<div class="field"><label for="sTheme">Appearance</label><select id="sTheme" data-change="theme">' + [["system", "Match my device"], ["light", "Light"], ["dark", "Dark"]].map(function (t) { return '<option value="' + t[0] + '"' + (s.theme === t[0] ? " selected" : "") + ">" + t[1] + "</option>"; }).join("") + "</select></div>" +
      '<div class="field"><label for="sCount">Simulation questions</label><input type="number" id="sCount" min="20" max="300" data-change="simCount" value="' + s.simCount + '"></div>' +
      '<div class="field"><label for="sMin">Simulation time (minutes)</label><input type="number" id="sMin" min="10" max="900" data-change="simMinutes" value="' + s.simMinutes + '"></div>' +
      '<div class="field"><label for="sPass">Passing score (%)</label><input type="number" id="sPass" min="50" max="100" data-change="passPct" value="' + s.passPct + '"></div>' +
      '</div><label class="toggle"><input type="checkbox" id="sShuffle" data-change="shuffle"' + (s.shuffle ? " checked" : "") + "> Shuffle answer choices in practice and simulations (full practice tests always keep the printed order)</label></section>" +
      '<section class="card stack"><h3>Backup &amp; restore</h3><p class="small muted" style="margin:0">Your progress is saved in this browser on this device' + (storageOK ? "" : " (storage is blocked here, so progress only lasts until you close the page)") + '. To move it to another device, copy the backup code and paste it in on the other device.</p><div class="row"><button class="btn" data-act="exportCopy">Copy backup code</button><button class="btn" data-act="exportShow">Show backup code</button>' + /*DL*/'<button class="btn" data-act="exportFile">Download backup file</button>' + /*/DL*/'</div>' +
      '<div class="field"><label for="importBox">Restore from a backup code</label><textarea id="importBox" placeholder="Paste a backup code here"></textarea></div><div class="row"><button class="btn primary" data-act="importPaste">Restore</button><label class="btn">Restore from file<input type="file" id="importFile" accept=".json,application/json" data-change="importFile" hidden></label></div>' +
      '<div id="exportOut"></div></section>' +
      '<section class="card stack"><h3>Start over</h3><p class="small muted" style="margin:0">Erases every answer, exam, flag, note and tab check on this device.</p><div class="row"><button class="btn danger" data-act="resetAll">Reset all progress</button></div></section>';
  };

  /* ------------------------------------------------------------------ actions */
  var ACT = {
    nav: function (el) { var v = el.dataset.v; if (v === "topic") return go("topic", el.dataset.p); if (v === "exam" && S.exam && S.exam.submitted) state.examView = null; go(v); },
    theme: function () { S.settings.theme = effectiveDark() ? "light" : "dark"; save(); render(); },
    menu: function () { state.menu = true; renderOverlay(); },
    closeMenu: function (el, ev) { if (ev.target.closest("[data-stop]") && !ev.target.closest(".btn")) return; state.menu = false; renderOverlay(); },
    modalCancel: function () { state.modal = null; renderOverlay(); },
    modalOk: function () { var m = state.modal; state.modal = null; renderOverlay(); if (m && m.onOk) m.onOk(); },

    quick10: function () { startSession(shuffle(Q.map(function (q) { return q.id; })).slice(0, 10), { title: "Quick 10" }); },
    quickMissed: function () { startSession(shuffle(Q.filter(function (q) { return peek(q.id).last === 0; }).map(function (q) { return q.id; })), { title: "Retry misses" }); },
    quickCalc: function () { startSession(shuffle(Q.filter(function (q) { return q.calc; }).map(function (q) { return q.id; })), { title: "Calculation questions" }); },
    quickNew: function () { startSession(Q.filter(function (q) { return !peek(q.id).n; }).map(function (q) { return q.id; }).slice(0, 20), { title: "New questions" }); },

    pexam: function (el) { toggleIn(pset.exams, +el.dataset.v); if (!pset.exams.length) pset.exams = [1, 2, 3]; render(); },
    ptopic: function (el) { toggleIn(pset.topics, el.dataset.v); render(); },
    pbook: function (el) { toggleIn(pset.books, el.dataset.v); render(); },
    pfilter: function (el) { pset.filter = el.dataset.v; render(); },
    startPractice: function () {
      var ids = practicePool();
      if (pset.order === "random") ids = shuffle(ids);
      if (pset.count) ids = ids.slice(0, pset.count);
      startSession(ids, { title: "Practice" });
    },
    choose: function (el) {
      var s = state.session, o = +el.dataset.o;
      if (state.view === "exam" && S.exam && !S.exam.submitted) {
        var ex = S.exam, id = ex.ids[ex.i];
        ex.picks[id] = o; save(); render(); return;
      }
      if (!s || s.done) return;
      var qid = s.ids[s.i];
      if (s.picks[qid] != null) return;
      s.picks[qid] = o;
      grade(qid, o === ansIdx(QBY[qid]));
      render();
    },
    next: function () { var s = state.session; if (!s) return; if (s.i + 1 < s.ids.length) { s.i++; render(true); } else { s.done = true; render(true); } },
    endSession: function () { var s = state.session; if (!s) return; if (!Object.keys(s.picks).length) { state.session = null; go(s.from || "practice"); return; } s.done = true; render(true); },
    retryMissed: function () { var s = state.session; var m = Object.keys(s.picks).filter(function (id) { return s.picks[id] !== ansIdx(QBY[id]); }); startSession(shuffle(m), { title: "Retry missed", from: s.from }); },
    guess: function (el) { var s = state.session; s.guess[el.dataset.id] = true; markGuess(el.dataset.id); toast("Marked as a guess. It'll come back in review."); render(); },
    flag: function (el) { var r = rec(el.dataset.id); r.f = !r.f; save(); render(); },
    flagBrowse: function (el) { var r = rec(el.dataset.id); r.f = !r.f; save(); state.openQ = el.dataset.id; rerenderKeep(); },

    startReview: function () { var d = shuffle(dueIds()).slice(0, 50); if (!d.length) { go("review"); return; } startSession(d, { title: "Smart Review", from: "review" }); },
    reviewHardest: function () { var l = Q.filter(function (q) { return peek(q.id).missed; }).sort(function (a, b) { return peek(b.id).missed - peek(a.id).missed; }).slice(0, 30).map(function (q) { return q.id; }); startSession(l, { title: "Most-missed", from: "review" }); },
    reviewFlagged: function () { startSession(Q.filter(function (q) { return peek(q.id).f; }).map(function (q) { return q.id; }), { title: "Flagged", from: "review" }); },
    reviewAhead: function () { var l = Q.filter(function (q) { var r = peek(q.id); return r.box > 0; }).sort(function (a, b) { return peek(a.id).due - peek(b.id).due; }).slice(0, 25).map(function (q) { return q.id; }); startSession(l, { title: "Review ahead", from: "review" }); },

    drillTopic: function (el) { startSession(shuffle(topicIds(el.dataset.v)), { title: TOPICS[el.dataset.v].short, from: "topics" }); },
    drillTopicNew: function (el) { startSession(topicIds(el.dataset.v).filter(function (id) { return !peek(id).n; }), { title: TOPICS[el.dataset.v].short + " · new", from: "topics" }); },
    drillTopicWeak: function (el) { startSession(shuffle(topicIds(el.dataset.v).filter(function (id) { return peek(id).box < MASTER_BOX; })), { title: TOPICS[el.dataset.v].short + " · not mastered", from: "topics" }); },
    practiceOne: function (el) { startSession([el.dataset.id], { title: "Single question", from: "browse" }); },
    openQ: function (el) { state.openQ = el.dataset.id; state.browse = { q: "", topic: "", exam: "", status: "" }; go("browse"); setTimeout(function () { var d = document.getElementById("q-" + el.dataset.id); if (d) { d.open = true; d.scrollIntoView({ block: "center" }); } }, 30); },

    startSim: function () { if (examGuard()) return; newExam("sim", "State exam simulation", simIds(Math.min(S.settings.simCount, 330)), S.settings.simMinutes); },
    startFull: function (el) { if (examGuard()) return; var e = +el.dataset.v; newExam("full", "Practice Exam " + e, Q.filter(function (q) { return q.exam === e; }).map(function (q) { return q.id; }), Math.round(S.settings.simMinutes * 125 / S.settings.simCount), { exam: e }); },
    startWeak: function () { if (examGuard()) return; newExam("weak", "Weak-spot exam", weakIds(50), Math.round(S.settings.simMinutes * 50 / S.settings.simCount)); },
    examPrev: function () { var ex = S.exam; if (ex.i > 0) { ex.i--; save(); render(true); } },
    examNext: function () { var ex = S.exam; if (ex.i + 1 < ex.ids.length) { ex.i++; save(); render(true); } else { ex.showGrid = true; save(); render(true); toast("Check for blanks and flags, then Submit."); } },
    examGo: function (el) { S.exam.i = +el.dataset.i; save(); render(true); },
    examGrid: function () { S.exam.showGrid = !S.exam.showGrid; save(); render(); },
    examFlag: function () { var ex = S.exam, id = ex.ids[ex.i]; ex.flags[id] = !ex.flags[id]; save(); render(); },
    examFirstBlank: function () { var ex = S.exam; var i = ex.ids.findIndex(function (id) { return ex.picks[id] == null; }); if (i >= 0) { ex.i = i; save(); render(true); } else toast("No blanks. Every question is answered."); },
    examSubmit: function () {
      var ex = S.exam, blank = ex.ids.length - Object.keys(ex.picks).length;
      confirmBox({ title: "Submit exam?", body: blank ? blank + " question" + (blank === 1 ? " is" : "s are") + " still blank. Blanks count as wrong, so guess first if you can." : "All questions are answered. Ready to see your score?", ok: "Submit", cancel: "Keep working" }, submitExam);
    },
    examQuit: function () { confirmBox({ title: "Discard this exam?", body: "Your answers on this exam won't be saved.", ok: "Discard", danger: true }, function () { S.exam = null; save(); render(); }); },
    examFilter: function (el) { state.examFilter = el.dataset.v; render(); },
    jumpResult: function (el) { var id = el.dataset.id; if (state.examFilter !== "all") { state.examFilter = "all"; render(); } var d = document.getElementById("res-" + id); if (d) { d.querySelector("details").open = true; d.scrollIntoView({ block: "center" }); } },
    showResults: function () { state.examView = "results"; state.examFilter = "missed"; render(true); },
    closeResults: function () { state.examView = null; render(true); },
    practiceExamMisses: function () { var ex = S.exam; startSession(ex.ids.filter(function (id) { return ex.picks[id] !== ansIdx(QBY[id]); }), { title: "Exam misses", from: "exam" }); },

    cardsStart: function (el) { startCards(el.dataset.v || "weak"); go("cards"); },
    cardsReset: function () { state.cards = null; render(true); },
    flip: function () { if (state.cards) { state.cards.flipped = !state.cards.flipped; render(); } },
    cardMark: function (el, ev) {
      ev.stopPropagation();
      var c = state.cards, f = c.list[c.i], k = el.dataset.v === "1";
      var s = S.facts[f.q] || (S.facts[f.q] = { k: 0, m: 0 });
      if (k) { s.k++; c.right++; } else s.m++;
      s.last = k ? 1 : 0; save();
      c.i++; c.flipped = false; render();
    },

    mathType: function (el) { var m = state.math || (state.math = { n: 0 }); m.type = el.dataset.v; nextMath(); render(); },
    mathNext: function () { if (!state.math) state.math = { type: "mix", n: 0 }; nextMath(); render(); },
    mathPick: function (el) {
      var m = state.math; if (m.picked != null) return;
      m.picked = +el.dataset.c; var ok = m.picked === 0;
      S.math.done++; if (ok) { S.math.right++; S.math.cur++; S.math.best = Math.max(S.math.best, S.math.cur); } else S.math.cur = 0;
      save(); render();
    },

    bfPick: function (el) { var bf = state.bf; if (bf.picked) return; bf.picked = el.dataset.v; S.bf.done++; if (QBY[bf.id].books.indexOf(bf.picked) >= 0) S.bf.right++; save(); render(); },
    bfNext: function () { state.bf = { id: pick(Q).id, picked: null }; render(); },

    exportCopy: function () {
      var code = exportCode();
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code).then(function () { toast("Backup code copied."); }, function () { showExport(code); });
      else showExport(code);
    },
    exportShow: function () { showExport(exportCode()); },
    /*DL*/    exportFile: function () {
      try {
        var blob = new Blob([exportCode()], { type: "application/json" }), a = document.createElement("a");
        a.href = URL.createObjectURL(blob); a.download = "fl-business-finance-progress-" + todayKey() + ".json"; document.body.appendChild(a); a.click(); a.remove();
        toast("Download started. If nothing downloaded, use Copy backup code instead.");
      } catch (e) { showExport(exportCode()); }
    },/*/DL*/
    importPaste: function () { doImport(document.getElementById("importBox").value); },
    resetAll: function () { confirmBox({ title: "Reset all progress?", body: "This erases every answer, exam, flag, note and tab check on this device. It can't be undone.", ok: "Erase everything", danger: true }, function () { var keep = S.settings; S = defaults(); S.settings = keep; save(); state.session = null; state.cards = null; toast("Progress reset."); go("home"); }); }
  };
  function examGuard() {
    if (S.exam && !S.exam.submitted) { confirmBox({ title: "Replace exam in progress?", body: "You have an unfinished exam (" + S.exam.title + "). Starting a new one discards it.", ok: "Discard and continue", danger: true }, function () { S.exam = null; save(); toast("Old exam discarded. Choose your exam again."); render(); }); return true; }
    return false;
  }
  function toggleIn(arr, v) { var i = arr.indexOf(v); if (i >= 0) arr.splice(i, 1); else arr.push(v); }
  function exportCode() { return JSON.stringify({ app: "fbf-study", v: 1, at: Date.now(), data: S }); }
  function showExport(code) { var o = document.getElementById("exportOut"); if (o) { o.innerHTML = '<div class="field"><label for="exportBox">Backup code (select all and copy)</label><textarea id="exportBox" readonly style="min-height:120px;font-family:var(--font-mono);font-size:.75rem">' + esc(code) + "</textarea></div>"; var t = document.getElementById("exportBox"); t.focus(); t.select(); } }
  function doImport(text) {
    try {
      var obj = JSON.parse(text.trim()), d = obj.data || obj;
      if (!d || typeof d.q !== "object") throw new Error("bad");
      confirmBox({ title: "Restore this backup?", body: "This replaces the progress on this device with the backup (" + Object.keys(d.q).length + " questions tracked, " + (d.attempts || []).length + " exams).", ok: "Restore" }, function () {
        var base = defaults(); S = Object.assign(base, d); S.settings = Object.assign(defaults().settings, d.settings || {}); S.math = Object.assign(defaults().math, d.math || {}); S.bf = Object.assign(defaults().bf, d.bf || {});
        save(); toast("Progress restored."); go("home");
      });
    } catch (e) { toast("That doesn't look like a backup code. Copy the whole code and try again."); }
  }
  function rerenderKeep() { var y = window.scrollY; render(); window.scrollTo(0, y); }

  var CHANGE = {
    pcount: function (el) { pset.count = +el.value; render(); },
    porder: function (el) { pset.order = el.value; },
    shuffle: function (el) { S.settings.shuffle = el.checked; save(); },
    edition: function (el) { S.settings.edition = el.value; save(); rerenderKeep(); toast("Edition set to " + el.value + "."); },
    tab: function (el) { if (el.checked) S.tabs[el.dataset.k] = 1; else delete S.tabs[el.dataset.k]; save(); var d = el.closest("details"); state.openBook = d && d.dataset.book; rerenderKeep(); },
    examDate: function (el) { S.settings.examDate = el.value; save(); toast("Exam date saved."); },
    goal: function (el) { S.settings.goal = Math.max(5, +el.value || 40); save(); },
    theme: function (el) { S.settings.theme = el.value; save(); applyTheme(); },
    simCount: function (el) { S.settings.simCount = Math.min(330, Math.max(20, +el.value || 120)); save(); },
    simMinutes: function (el) { S.settings.simMinutes = Math.max(10, +el.value || 420); save(); },
    passPct: function (el) { S.settings.passPct = Math.min(100, Math.max(50, +el.value || 70)); save(); },
    bexam: function (el) { state.browse.exam = el.value; updateBrowse(); },
    btopic: function (el) { state.browse.topic = el.value; updateBrowse(); },
    bstatus: function (el) { state.browse.status = el.value; updateBrowse(); },
    importFile: function (el) { var f = el.files && el.files[0]; if (!f) return; var r = new FileReader(); r.onload = function () { doImport(String(r.result)); }; r.readAsText(f); }
  };
  function updateBrowse() { var el = document.getElementById("browseList"); if (el) el.innerHTML = browseList(); }

  /* ------------------------------------------------------------------ events */
  function bind() {
    document.addEventListener("click", function (ev) {
      var el = ev.target.closest("[data-act]");
      if (!el) return;
      var a = el.dataset.act;
      if (el.tagName === "A") ev.preventDefault();
      if (ACT[a]) ACT[a](el, ev);
    });
    document.addEventListener("change", function (ev) { var el = ev.target; if (el.dataset && el.dataset.change && CHANGE[el.dataset.change]) CHANGE[el.dataset.change](el, ev); });
    var tmr = null;
    document.addEventListener("input", function (ev) {
      var el = ev.target;
      if (el.dataset && el.dataset.note) { var r = rec(el.dataset.note); r.note = el.value; clearTimeout(tmr); tmr = setTimeout(save, 400); }
      if (el.dataset && el.dataset.input === "bq") { state.browse.q = el.value; clearTimeout(tmr); tmr = setTimeout(updateBrowse, 150); }
    });
    document.addEventListener("keydown", function (ev) {
      var tag = (ev.target.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select" || ev.metaKey || ev.ctrlKey || ev.altKey) return;
      if (state.modal || state.menu) { if (ev.key === "Escape") { state.modal = null; state.menu = false; renderOverlay(); } return; }
      var k = ev.key.toLowerCase(), idx = "1234".indexOf(k) >= 0 ? "1234".indexOf(k) : "abcd".indexOf(k);
      if (state.view === "session" && state.session && !state.session.done) {
        var s = state.session, q = QBY[s.ids[s.i]];
        if (idx >= 0 && s.picks[q.id] == null) { ev.preventDefault(); ACT.choose({ dataset: { o: s.order[q.id][idx] } }); }
        else if ((k === "enter" || k === "arrowright" || k === "n") && s.picks[q.id] != null) { ev.preventDefault(); ACT.next(); }
        else if (k === "f") ACT.flag({ dataset: { id: q.id } });
      } else if (state.view === "exam" && S.exam && !S.exam.submitted) {
        var ex = S.exam, eq = QBY[ex.ids[ex.i]];
        if (idx >= 0) { ev.preventDefault(); ACT.choose({ dataset: { o: ex.order[eq.id][idx] } }); }
        else if (k === "arrowright" || k === "enter" || k === "n") { ev.preventDefault(); ACT.examNext(); }
        else if (k === "arrowleft" || k === "p") { ev.preventDefault(); ACT.examPrev(); }
        else if (k === "f") ACT.examFlag();
      } else if (state.view === "cards" && state.cards && state.cards.i < state.cards.list.length) {
        if (k === " " || k === "enter") { ev.preventDefault(); ACT.flip(); }
        else if (state.cards.flipped && (k === "1" || k === "2")) ACT.cardMark({ dataset: { v: k === "2" ? "1" : "0" } }, { stopPropagation: function () {} });
      } else if (state.view === "math" && state.math && state.math.p) {
        if (idx >= 0 && state.math.picked == null) ACT.mathPick({ dataset: { c: state.math.order[idx] } });
        else if ((k === "enter" || k === "n") && state.math.picked != null) ACT.mathNext();
      }
    });
    window.addEventListener("hashchange", function () { var v = location.hash.replace("#", ""); if (v && v !== state.view && (VIEWS[v])) go(v); });
    if (window.matchMedia) { try { window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () { render(); }); } catch (e) { /* old browsers */ } }
  }

  function boot() {
    main = document.getElementById("main");
    bind();
    var v = (location.hash || "").replace("#", "");
    if (v && VIEWS[v] && v !== "session" && v !== "topic") state.view = v;
    render(true);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
