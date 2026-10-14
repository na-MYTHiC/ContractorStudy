/* Core: data access, saved progress ("memory"), grading, XP/levels/badges, lookup paths, challenge codes.
   Everything hangs off window.FBF (A). No build step; files load in order core → ui → runs → views → cloud. */
(function () {
  "use strict";
  var A = (window.FBF = window.FBF || {});

  /* ---------------------------------------------------------------- data */
  A.Q = window.QUESTIONS || [];
  A.QBY = {};
  A.Q.forEach(function (q, i) { q.ix = i; A.QBY[q.id] = q; });
  A.TOPICS = window.TOPICS; A.BOOKS = window.BOOKS; A.FACTS = window.FACTS; A.FORMULAS = window.FORMULAS;
  A.TOPIC_KEYS = Object.keys(A.TOPICS);
  A.BOOK_KEYS = Object.keys(A.BOOKS);
  A.L = "ABCD";
  var DAY = (A.DAY = 86400000);
  A.INTERVALS = [0, 1, 3, 7, 16, 35];
  A.MASTER_BOX = 3;
  A.TARGET = 0.85;

  /* ---------------------------------------------------------------- helpers */
  A.esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  A.inline = function (s) { return A.esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>"); };
  A.md = function (s) { return A.esc(s).split(/\n+/).map(function (p) { return "<p>" + p.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>") + "</p>"; }).join(""); };
  var TRAP = /\b(NOT|EXCEPT|except|never|NEVER|least|LEAST|false|not true|not(?! (?:later|sooner|more|less|to exceed|exceed|separated|yet)))\b/g;
  A.stemHTML = function (s, traps) {
    var h = A.esc(s);
    if (traps !== false && A.S && A.S.settings.traps) h = h.replace(TRAP, '<mark class="trap" title="Trap word: read the choices carefully">$1</mark>');
    return h.replace(/_{3,}/g, '<span class="blank" aria-label="blank"></span>');
  };
  A.pct = function (n, d) { return d ? Math.round((100 * n) / d) : 0; };
  A.shuffle = function (a, r) { r = r || Math.random; a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
  A.rng = function (seed) { var s = seed >>> 0; return function () { s = (s + 0x6d2b79f5) >>> 0; var t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  A.hash = function (str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  A.todayKey = function (d) { d = d || new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
  A.fmtTime = function (ms) { ms = Math.max(0, ms); var s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return (h ? h + ":" + String(m).padStart(2, "0") : m) + ":" + String(x).padStart(2, "0"); };
  A.fmtMin = function (m) { var h = Math.floor(m / 60), x = Math.round(m % 60); return (h ? h + " hr" : "") + (h && x ? " " : "") + (x || !h ? x + " min" : ""); };
  A.money = function (n, dec) { var neg = n < 0; n = Math.abs(n); var s = n.toLocaleString("en-US", { minimumFractionDigits: dec || 0, maximumFractionDigits: dec || 0 }); return (neg ? "−$" : "$") + s; };
  A.plural = function (n, w, p) { return n + " " + (n === 1 ? w : p || w + "s"); };
  A.rnd = function (a, b) { return a + Math.floor(Math.random() * (b - a + 1)); };
  A.pick = function (a) { return a[Math.floor(Math.random() * a.length)]; };
  A.art = function (n) { return /^(8|11|18)/.test(String(n)) ? "an" : "a"; };
  A.daysUntil = function (dateStr) { if (!dateStr) return null; var p = dateStr.split("-"); var d = new Date(+p[0], +p[1] - 1, +p[2]); var t = new Date(); t.setHours(0, 0, 0, 0); return Math.round((d - t) / DAY); };
  A.qLabel = function (q) { return "Exam " + q.exam + " · #" + q.num; };
  A.uid = function () { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); };

  /* ---------------------------------------------------------------- icons */
  var ICON = {
    home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
    study: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 21V5"/><path d="M9 8h6M9 12h4"/>',
    test: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 3v3h6V3"/><path d="M9 11l2 2 4-4"/><path d="M9 17h6"/>',
    exam: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2"/><path d="M9 2h6"/>',
    missed: '<circle cx="12" cy="12" r="9"/><path d="M12 7v6"/><path d="M12 16.5v.5"/>',
    review: '<path d="M4 12a8 8 0 0 1 14-5.3L20 9"/><path d="M20 4v5h-5"/><path d="M20 12a8 8 0 0 1-14 5.3L4 15"/><path d="M4 20v-5h5"/>',
    crew: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0"/><circle cx="17" cy="9" r="2.6"/><path d="M15.5 14.2A5 5 0 0 1 21 19"/>',
    trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4"/><path d="M12 13v4M8 21h8M9 17h6"/>',
    cards: '<rect x="3" y="6" width="14" height="14" rx="2"/><path d="M7 3h12a2 2 0 0 1 2 2v12"/>',
    math: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8"/><path d="M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01"/>',
    topics: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
    find: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/><path d="M8.5 11h5M11 8.5v5"/>',
    tabs: '<path d="M6 3h9l4 4v14H6z"/><path d="M19 9h3v4h-3"/><path d="M19 15h3v4h-3"/><path d="M9 9h6M9 13h6M9 17h4"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>',
    chart: '<path d="M4 20V4"/><path d="M4 20h16"/><path d="M8 16l4-5 3 3 5-7"/>',
    guide: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
    more: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
    flag: '<path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/>',
    check: '<path d="M5 12l5 5L20 7"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4 6.5 6.5 0 0 0 20 14.5z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    pause: '<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>',
    play: '<path d="M7 4l13 8-13 8z"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
    grid: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
    calc: '<rect x="5" y="3" width="14" height="18" rx="2"/><rect x="8" y="6" width="8" height="3" rx=".5"/><path d="M8.5 13h.01M12 13h.01M15.5 13h.01M8.5 17h.01M12 17h.01M15.5 17h.01"/>',
    share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
    flame: '<path d="M12 22c4 0 7-2.7 7-7 0-3.5-2-6-4-8 .2 2.4-1 4-2.4 4.4C13 8 11.5 5 8.5 2.5 9 6.5 5 9 5 15c0 4.3 3 7 7 7z"/>',
    bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
    star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    phone: '<rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M11 18.5h2"/>',
    desktop: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
    auto: '<rect x="2.5" y="5" width="12" height="9" rx="1.5"/><rect x="15.5" y="8" width="6" height="11" rx="1.5"/><path d="M6 18h6"/>',
    book: '<path d="M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4z"/><path d="M20 4h-6a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7z"/>',
    pin: '<path d="M12 21s-6-5.6-6-11a6 6 0 0 1 12 0c0 5.4-6 11-6 11z"/><circle cx="12" cy="10" r="2.2"/>',
    bulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/>',
    timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4"/><path d="M10 2h4"/><path d="M19 6l1.5-1.5"/>',
    text: '<path d="M4 7V5h10v2M9 5v14M7 19h4"/><path d="M14 12v-1h7v1M17.5 11v8M16 19h3"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    hard: '<path d="M2 18h20"/><path d="M4 18a8 8 0 0 1 16 0"/><path d="M12 10V6"/><path d="M9 6h6"/>'
  };
  A.icon = function (n, cls) { return '<svg class="ico' + (cls ? " " + cls : "") + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICON[n] || "") + "</svg>"; };
  A.LOGO = '<svg class="brand-mark" viewBox="0 0 40 40" aria-hidden="true"><rect x="3" y="5" width="26" height="31" rx="4" fill="var(--primary)"/><rect x="29" y="9" width="8" height="7" rx="2" fill="var(--amber)"/><rect x="29" y="18" width="8" height="7" rx="2" fill="var(--tab-bga)"/><rect x="29" y="27" width="8" height="6" rx="2" fill="var(--tab-aia)"/><path d="M9 14h14M9 20h14M9 26h9" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/></svg>';

  /* ---------------------------------------------------------------- storage ("memory") */
  var KEY = "fbf-study-v2", OLD = "fbf-study-v1";
  A.defaults = function () {
    return {
      v: 2, q: {}, runs: [], history: [], tabs: {}, facts: {}, days: {}, badges: {}, daily: {}, challenges: {},
      xp: 0, combo: 0, bestCombo: 0,
      counters: { answers: 0, fixed: 0, finds: 0, fastFinds: 0, sprints: 0, played: 0, longestMs: 0 },
      math: { best: 0, cur: 0, done: 0, right: 0 }, bf: { done: 0, right: 0 }, look: { n: 0, total: 0, best: 0, bookRight: 0, chapRight: 0 },
      last: {}, savedAt: 0,
      settings: { edition: "2025", shuffle: true, goal: 40, examDate: "", theme: "system", layout: "auto", text: "md", traps: true, coach: true, simCount: 120, simMinutes: 420, passPct: 70, name: "" }
    };
  };
  function fill(d) {
    var b = A.defaults(), out = Object.assign(b, d || {});
    ["settings", "math", "bf", "look", "counters"].forEach(function (k) { out[k] = Object.assign(A.defaults()[k], (d || {})[k] || {}); });
    return out;
  }
  A.normalize = fill;
  function migrateV1(o) {
    var s = A.defaults();
    s.q = o.q || {}; s.tabs = o.tabs || {}; s.facts = o.facts || {}; s.days = o.days || {};
    s.math = Object.assign(s.math, o.math || {}); s.bf = Object.assign(s.bf, o.bf || {});
    s.settings = Object.assign(s.settings, o.settings || {});
    s.history = (o.attempts || []).map(function (a) { return { id: A.uid(), mode: "test", title: a.title, at: a.at, n: a.n, answered: a.n, right: a.right, score: a.score, ms: a.ms, byTopic: a.byTopic || {}, items: [] }; });
    var xp = 0; Object.keys(s.q).forEach(function (k) { xp += (s.q[k].c || 0) * 10 + (s.q[k].w || 0) * 2; });
    s.xp = xp; s.counters.answers = Object.keys(s.q).reduce(function (n, k) { return n + (s.q[k].n || 0); }, 0);
    return s;
  }
  A.load = function () {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) return fill(JSON.parse(raw));
      var old = localStorage.getItem(OLD);
      if (old) return migrateV1(JSON.parse(old));
    } catch (e) { /* storage blocked */ }
    return A.defaults();
  };
  A.S = A.load();
  A.storageOK = true;
  A.saveLocal = function () { try { localStorage.setItem(KEY, JSON.stringify(A.S)); A.storageOK = true; } catch (e) { A.storageOK = false; } };
  A.save = function (opts) {
    A.S.savedAt = Date.now();
    A.saveLocal();
    if (A.cloudSave && !(opts && opts.localOnly)) A.cloudSave();
  };

  /* ---------------------------------------------------------------- question model */
  A.rec = function (id) { return A.S.q[id] || (A.S.q[id] = { n: 0, c: 0, w: 0, box: 0, due: 0, last: -1 }); };
  var BLANK = { n: 0, c: 0, w: 0, box: 0, due: 0, last: -1 };
  A.peek = function (id) { return A.S.q[id] || BLANK; };
  A.ansIdx = function (q) { return q.edAns ? q.edAns[A.S.settings.edition] : q.answer; };
  A.isMastered = function (id) { return A.peek(id).box >= A.MASTER_BOX; };
  A.dueIds = function () { var now = Date.now(); return A.Q.filter(function (q) { var r = A.peek(q.id); return r.box > 0 && r.due <= now; }).map(function (q) { return q.id; }); };
  A.missedIds = function () { return A.Q.filter(function (q) { return A.peek(q.id).last === 0; }).map(function (q) { return q.id; }); };
  A.fixedIds = function () { return A.Q.filter(function (q) { var r = A.peek(q.id); return r.missed && r.last === 1; }).map(function (q) { return q.id; }); };
  A.day = function () { var k = A.todayKey(); return A.S.days[k] || (A.S.days[k] = { a: 0, c: 0, xp: 0, ms: 0 }); };

  /** Record an answer. Returns {fixed} so callers can award bonus XP. */
  A.grade = function (id, correct, opts) {
    opts = opts || {};
    var r = A.rec(id), now = Date.now(), wasMissed = r.last === 0;
    r.n++; r.t = now; r.lastPick = opts.pick;
    A.S.counters.answers++;
    var d = A.day(); d.a++;
    var hr = new Date().getHours();
    if (hr >= 22 || hr < 3) A.S.counters.owl = 1;
    if (hr >= 3 && hr < 6) A.S.counters.bird = 1;
    if (correct) { r.c++; d.c++; A.S.combo++; A.S.bestCombo = Math.max(A.S.bestCombo, A.S.combo); } else { r.w++; A.S.combo = 0; r.missed = (r.missed || 0) + 1; }
    if (correct && !opts.guess) {
      if (r.box === 0) r.box = 2;
      else if (r.due <= now + 6 * 3600000) r.box = Math.min(5, r.box + 1); // only advance when the repeat is actually spaced
      r.due = now + A.INTERVALS[r.box] * DAY;
      r.last = 1;
    } else {
      r.box = 1; r.due = now; r.last = correct ? 1 : 0;
    }
    var fixed = correct && wasMissed;
    if (fixed) A.S.counters.fixed++;
    if (correct && opts.hint > 0) A.S.counters.finds++;
    return { fixed: fixed };
  };
  A.optOrder = function (q, on, r) { if (q.lock || !on) return [0, 1, 2, 3]; return A.shuffle([0, 1, 2, 3], r); };

  /* ---------------------------------------------------------------- stats */
  A.topicIds = function (t) { return A.Q.filter(function (q) { return q.topic === t; }).map(function (q) { return q.id; }); };
  A.groupStats = function (ids) {
    var seen = 0, lastRight = 0, mastered = 0;
    ids.forEach(function (id) { var r = A.peek(id); if (r.n) { seen++; if (r.last === 1) lastRight++; } if (r.box >= A.MASTER_BOX) mastered++; });
    return { total: ids.length, seen: seen, lastRight: lastRight, mastered: mastered, acc: seen ? lastRight / seen : 0, mastery: ids.length ? mastered / ids.length : 0 };
  };
  A.overall = function () { return A.groupStats(A.Q.map(function (q) { return q.id; })); };
  A.everRight = function () { return A.Q.filter(function (q) { return A.peek(q.id).c > 0; }).length; };
  A.tests = function () { return A.S.history.filter(function (h) { return h.mode === "test" && h.n >= 20 && !h.partial; }); };
  A.streak = function () {
    var n = 0, d = new Date();
    if (!(A.S.days[A.todayKey(d)] && A.S.days[A.todayKey(d)].a)) d.setDate(d.getDate() - 1);
    while (A.S.days[A.todayKey(d)] && A.S.days[A.todayKey(d)].a > 0) { n++; d.setDate(d.getDate() - 1); }
    return n;
  };
  A.factKnown = function () { return A.FACTS.filter(function (f) { var s = A.S.facts[f.q]; return s && s.last === 1; }).length; };
  A.tabItems = function () {
    var ed = A.S.settings.edition, map = {};
    A.Q.forEach(function (q) {
      q.cites.forEach(function (c) {
        if (c.eds && c.eds.indexOf(ed) < 0) return;
        var k = c.book + "|" + c.loc;
        if (!map[k]) map[k] = { key: ed + "|" + k, book: c.book, loc: c.loc, ids: [], stat: c.stat || null };
        if (map[k].ids.indexOf(q.id) < 0) map[k].ids.push(q.id);
      });
    });
    return Object.keys(map).map(function (k) { return map[k]; });
  };
  A.readiness = function () {
    var o = A.overall(), right = A.everRight(), ex = A.tests().slice(-3);
    var exAvg = ex.length ? ex.reduce(function (s, a) { return s + a.score; }, 0) / 3 : 0;
    var score = Math.round(100 * (0.25 * (right / A.Q.length) + 0.4 * o.mastery + 0.35 * exAvg));
    var topicsOk = A.TOPIC_KEYS.filter(function (t) { var g = A.groupStats(A.topicIds(t)); return g.seen === g.total && g.acc >= 0.8; }).length;
    var tabs = A.tabItems(), tabbed = tabs.filter(function (t) { return A.S.tabs[t.key]; }).length;
    var avgFind = A.S.look.n ? A.S.look.total / A.S.look.n : 0;
    var checks = [
      { done: right === A.Q.length, label: "Get every practice question right at least once", val: right + " / " + A.Q.length, go: "study" },
      { done: o.mastery >= 0.9, label: "Master 90% of questions on spaced repeats", val: o.mastered + " / " + Math.ceil(A.Q.length * 0.9), go: "missed" },
      { done: topicsOk === A.TOPIC_KEYS.length, label: "80%+ on every topic", val: topicsOk + " / " + A.TOPIC_KEYS.length, go: "topics" },
      { done: ex.length === 3 && ex.every(function (a) { return a.score >= A.TARGET; }), label: "Last 3 practice tests at 85%+", val: ex.length ? ex.map(function (a) { return Math.round(a.score * 100) + "%"; }).join(" · ") : "none yet", go: "test" },
      { done: A.S.look.n >= 25 && avgFind <= 90000, label: "Find answers in your books in under 90 sec (25 sprints)", val: A.S.look.n ? A.S.look.n + " · avg " + A.fmtTime(avgFind) : "none yet", go: "find" },
      { done: A.factKnown() === A.FACTS.length, label: "Know every Numbers to Know card", val: A.factKnown() + " / " + A.FACTS.length, go: "cards" },
      { done: A.S.math.best >= 10, label: "10 math problems right in a row", val: "best " + A.S.math.best, go: "math" },
      { done: tabbed === tabs.length, label: "Tab every reference page in your books", val: tabbed + " / " + tabs.length, go: "find" }
    ];
    var label = score >= 85 ? "Exam ready" : score >= 70 ? "Almost there" : score >= 40 ? "Building" : "Getting started";
    return { score: score, label: label, checks: checks };
  };

  /* ---------------------------------------------------------------- lookup paths (the open-book skill) */
  A.FCM_CH = { 1: "Business Organization", 2: "Licensing", 3: "Financial Management", 4: "Insurance & Bonds", 5: "Labor & Employment Law", 6: "Workers’ Compensation", 7: "Safety & OSHA", 8: "Contract Law", 9: "Construction Lien Law", 10: "Project Management & Estimating" };
  A.ART = {
    A201: { 1: "General Provisions", 2: "Owner", 3: "Contractor", 4: "Architect", 5: "Subcontractors", 6: "Construction by Owner or Separate Contractors", 7: "Changes in the Work", 8: "Time", 9: "Payments and Completion", 10: "Protection of Persons and Property", 11: "Insurance and Bonds", 12: "Uncovering and Correction of Work", 13: "Miscellaneous Provisions", 14: "Termination or Suspension", 15: "Claims and Disputes" },
    A401: { 3: "Contractor", 4: "Subcontractor", 7: "Termination, Suspension or Assignment", 11: "Progress Payments" },
    A701: { 1: "Definitions", 2: "Bidder’s Representations", 3: "Bidding Documents", 4: "Bidding Procedures", 5: "Consideration of Bids", 6: "Post-Bid Information", 7: "Performance Bond and Payment Bond", 8: "Enumeration of Proposed Contract Documents" }
  };
  A.chapterOptions = function (book) {
    if (book === "FCM") return Object.keys(A.FCM_CH).map(function (k) { return { k: k, label: "Ch. " + k + " · " + A.FCM_CH[k] }; });
    if (A.ART[book]) {
      var max = book === "A201" ? 15 : book === "A701" ? 8 : 15;
      var out = []; for (var i = 1; i <= max; i++) out.push({ k: String(i), label: "Art. " + i + (A.ART[book][i] ? " · " + A.ART[book][i] : "") }); return out;
    }
    return null;
  };
  /** Where the answer lives: book → chapter/article → index term → page/section, for the chosen edition. */
  A.lookup = function (q) {
    var ed = A.S.settings.edition, out = [];
    q.books.forEach(function (b) {
      var cs = q.cites.filter(function (c) { return c.book === b && (!c.eds || c.eds.indexOf(ed) >= 0); });
      var locs = [], stat = null;
      cs.forEach(function (c) { if (locs.indexOf(c.loc) < 0) locs.push(c.loc); if (c.stat && !stat) stat = c.stat; });
      var chapK = null, chap = null;
      if (b === "FCM" && locs.length) { chapK = String(parseInt(locs[0].split("-")[0], 10)); chap = "Chapter " + chapK + " – " + (A.FCM_CH[chapK] || ""); }
      else if (A.ART[b] && locs.length) { chapK = String(parseInt(locs[0].split(".")[0], 10)); chap = "Article " + chapK + (A.ART[b][chapK] ? " – " + A.ART[b][chapK] : ""); }
      else if (b === "FS455") chap = "Chapter 455 (DBPR general provisions)";
      var where = !locs.length ? "" : b === "FCM" || b === "BGA" ? (locs.length > 1 ? "pages " : "page ") + locs.join(", ") : "§" + locs.join(", §");
      out.push({ book: b, name: A.BOOKS[b].name, short: A.BOOKS[b].short, color: A.BOOKS[b].color, chapK: chapK, chap: chap, where: where, stat: stat });
    });
    return out;
  };
  A.citeChips = function (q) {
    return A.lookup(q).map(function (p) {
      return '<span class="tab ' + p.color + '" title="' + A.esc(p.name) + '">' + A.esc(p.short) + (p.where ? " · " + A.esc(p.where.replace("pages ", "p. ").replace("page ", "p. ")) : "") + "</span>" + (p.stat ? ' <span class="pill">§' + A.esc(p.stat) + "</span>" : "");
    }).join(" ");
  };
  /** The full "Find it" panel shown after answering and in the Missed hub. */
  A.findPanel = function (q, opts) {
    opts = opts || {};
    var paths = A.lookup(q);
    var h = '<div class="find"><div class="find-head">' + A.icon("pin") + "<span>Where the answer is</span></div>";
    paths.forEach(function (p, i) {
      h += '<ol class="path">' +
        '<li><span class="k">Book</span><span class="v"><span class="tab ' + p.color + '">' + A.esc(p.short) + "</span> " + A.esc(p.name) + "</span></li>" +
        (p.chap ? '<li><span class="k">Section</span><span class="v">' + A.esc(p.chap) + "</span></li>" : "") +
        (i === 0 ? '<li><span class="k">Look up</span><span class="v"><mark class="hl">' + A.esc(q.look) + "</mark> in the index</span></li>" : "") +
        (p.where ? '<li><span class="k">Go to</span><span class="v mono">' + A.esc(p.where) + (p.stat ? " · §" + A.esc(p.stat) : "") + "</span></li>" : "") +
        "</ol>";
    });
    if (!opts.noKey) h += '<details class="keyref"><summary>Answer-key reference text</summary><pre>' + A.esc(q.ref.join("\n")) + "</pre></details>";
    return h + "</div>";
  };

  /* ---------------------------------------------------------------- XP, levels, badges */
  A.LEVELS = [
    [0, "Laborer"], [250, "Helper"], [600, "Apprentice"], [1100, "Journeyman"], [1800, "Lead Carpenter"], [2700, "Foreman"],
    [3900, "Superintendent"], [5400, "Project Manager"], [7200, "Senior PM"], [9500, "Qualifier"], [12500, "Licensed Contractor"], [16500, "Master Builder"]
  ];
  A.levelInfo = function (xp) {
    xp = xp == null ? A.S.xp : xp;
    var i = 0; while (i + 1 < A.LEVELS.length && xp >= A.LEVELS[i + 1][0]) i++;
    var cur = A.LEVELS[i][0], next = A.LEVELS[i + 1] ? A.LEVELS[i + 1][0] : null;
    return { n: i + 1, name: A.LEVELS[i][1], xp: xp, into: xp - cur, need: next ? next - cur : 0, next: next, nextName: A.LEVELS[i + 1] ? A.LEVELS[i + 1][1] : null, pct: next ? Math.round((100 * (xp - cur)) / (next - cur)) : 100 };
  };
  A.addXP = function (n, why) {
    if (!n) return 0;
    var before = A.levelInfo().n;
    A.S.xp += n; A.day().xp += n;
    var after = A.levelInfo();
    if (A.onXP) A.onXP(n, why);
    if (after.n > before && A.onLevelUp) A.onLevelUp(after);
    return n;
  };
  function topicDone(t) { return function () { var g = A.groupStats(A.topicIds(t)); return g.mastered === g.total; }; }
  A.BADGES = [
    { id: "first", name: "First Nail", desc: "Get your first question right", icon: "check", test: function (S) { return Object.keys(S.q).some(function (k) { return S.q[k].c > 0; }); } },
    { id: "combo10", name: "Hot Streak", desc: "10 right in a row", icon: "flame", test: function (S) { return S.bestCombo >= 10; } },
    { id: "combo25", name: "On Fire", desc: "25 right in a row", icon: "flame", test: function (S) { return S.bestCombo >= 25; } },
    { id: "combo50", name: "Unstoppable", desc: "50 right in a row", icon: "bolt", test: function (S) { return S.bestCombo >= 50; } },
    { id: "day3", name: "Three-Peat", desc: "Study 3 days in a row", icon: "flame", test: function () { return A.streak() >= 3; } },
    { id: "day7", name: "Week Warrior", desc: "Study 7 days in a row", icon: "flame", test: function () { return A.streak() >= 7; } },
    { id: "day21", name: "Iron Worker", desc: "Study 21 days in a row", icon: "hard", test: function () { return A.streak() >= 21; } },
    { id: "q100", name: "Century", desc: "Answer 100 questions", icon: "star", test: function (S) { return S.counters.answers >= 100; } },
    { id: "q500", name: "Workhorse", desc: "Answer 500 questions", icon: "star", test: function (S) { return S.counters.answers >= 500; } },
    { id: "q1500", name: "Grinder", desc: "Answer 1,500 questions", icon: "star", test: function (S) { return S.counters.answers >= 1500; } },
    { id: "sweep", name: "Clean Sweep", desc: "Get all 375 right at least once", icon: "trophy", test: function () { return A.everRight() === A.Q.length; } },
    { id: "m100", name: "Locked In", desc: "Master 100 questions", icon: "lock", test: function () { return A.overall().mastered >= 100; } },
    { id: "m300", name: "Vault", desc: "Master 300 questions", icon: "lock", test: function () { return A.overall().mastered >= 300; } },
    { id: "test1", name: "Test Pilot", desc: "Finish your first practice test", icon: "test", test: function () { return A.tests().length >= 1; } },
    { id: "pass", name: "Passing Grade", desc: "70%+ on a practice test", icon: "check", test: function () { return A.tests().some(function (t) { return t.score >= 0.7; }); } },
    { id: "ready", name: "Exam Ready", desc: "85%+ on a 100+ question test", icon: "trophy", test: function () { return A.tests().some(function (t) { return t.score >= 0.85 && t.n >= 100; }); } },
    { id: "triple", name: "Triple Crown", desc: "Three tests in a row at 85%+", icon: "trophy", test: function () { var t = A.tests().slice(-3); return t.length === 3 && t.every(function (x) { return x.score >= 0.85; }); } },
    { id: "fix25", name: "Fixer", desc: "Fix 25 missed questions", icon: "hard", test: function (S) { return S.counters.fixed >= 25; } },
    { id: "fix100", name: "Punch List Pro", desc: "Fix 100 missed questions", icon: "hard", test: function (S) { return S.counters.fixed >= 100; } },
    { id: "finder", name: "Open-Book Pro", desc: "Get 25 right using the Lookup Coach", icon: "find", test: function (S) { return S.counters.finds >= 25; } },
    { id: "quick", name: "Quick Draw", desc: "10 book lookups under 90 seconds", icon: "timer", test: function (S) { return S.counters.fastFinds >= 10; } },
    { id: "math10", name: "Number Cruncher", desc: "10 math problems right in a row", icon: "math", test: function (S) { return S.math.best >= 10; } },
    { id: "cards", name: "Card Shark", desc: "Know every Numbers to Know card", icon: "cards", test: function () { return A.factKnown() === A.FACTS.length; } },
    { id: "tabs", name: "Tab Master", desc: "Tab every reference page", icon: "tabs", test: function () { var t = A.tabItems(); return t.length && t.every(function (x) { return A.S.tabs[x.key]; }); } },
    { id: "daily1", name: "Daily Grind", desc: "Finish a Daily Challenge", icon: "bolt", test: function (S) { return Object.keys(S.daily).length >= 1; } },
    { id: "daily7", name: "Regular", desc: "Finish 7 Daily Challenges", icon: "bolt", test: function (S) { return Object.keys(S.daily).length >= 7; } },
    { id: "perfect", name: "Perfect Day", desc: "10/10 on a Daily Challenge", icon: "star", test: function (S) { return Object.keys(S.daily).some(function (k) { return S.daily[k].s === S.daily[k].n; }); } },
    { id: "marathon", name: "Marathon", desc: "One session of 60+ minutes", icon: "timer", test: function (S) { return S.counters.longestMs >= 3600000; } },
    { id: "owl", name: "Night Shift", desc: "Study after 10 PM", icon: "moon", test: function (S) { return !!S.counters.owl; } },
    { id: "bird", name: "Before the Whistle", desc: "Study between 3 and 6 AM", icon: "sun", test: function (S) { return !!S.counters.bird; } },
    { id: "challenger", name: "Challenger", desc: "Play a friend’s challenge code", icon: "crew", test: function (S) { return S.counters.played >= 1; } },
    { id: "lien", name: "Lien Law Boss", desc: "Master every lien law question", icon: "pin", test: topicDone("lien") },
    { id: "osha", name: "Safety First", desc: "Master every OSHA question", icon: "hard", test: topicDone("osha") },
    { id: "aia", name: "Contract Reader", desc: "Master every AIA question", icon: "book", test: topicDone("aia") },
    { id: "lic", name: "By the Book", desc: "Master every licensing question", icon: "book", test: topicDone("lic") }
  ];
  A.checkBadges = function () {
    var fresh = [];
    A.BADGES.forEach(function (b) { if (!A.S.badges[b.id]) { var ok = false; try { ok = b.test(A.S); } catch (e) { ok = false; } if (ok) { A.S.badges[b.id] = Date.now(); fresh.push(b); } } });
    if (fresh.length && A.onBadge) fresh.forEach(function (b) { A.onBadge(b); });
    return fresh;
  };

  /* ---------------------------------------------------------------- seeded sets, daily challenge, challenge codes */
  A.seededSet = function (seed, n, pool) {
    pool = pool || A.Q.map(function (q) { return q.id; });
    var r = A.rng(seed), order = A.shuffle(pool, r), out = [], blocked = {};
    order.forEach(function (id) { if (out.length >= n || blocked[id]) return; out.push(id); (A.QBY[id].dupes || []).forEach(function (d) { blocked[d] = 1; }); });
    return out;
  };
  A.dailyNumber = function (key) { var p = (key || A.todayKey()).split("-"); return Math.round((Date.UTC(+p[0], +p[1] - 1, +p[2]) - Date.UTC(2026, 0, 1)) / DAY) + 1; };
  A.dailySeed = function (key) { return A.hash("fbf-daily-" + (key || A.todayKey())); };
  A.makeCode = function (seed, n, score) { return (seed >>> 0).toString(36).toUpperCase() + "-" + n + (score != null ? "-" + score : ""); };
  A.parseCode = function (code) {
    var m = String(code || "").trim().toUpperCase().replace(/^#?CH-/, "").replace(/^FB-?/, "").match(/^([0-9A-Z]{1,7})-(\d{1,3})(?:-(\d{1,3}))?$/);
    if (!m) return null;
    var n = +m[2]; if (n < 5 || n > 200) return null;
    return { seed: parseInt(m[1], 36) >>> 0, n: n, score: m[3] != null ? +m[3] : null, code: m[1] + "-" + m[2] };
  };

  /* ---------------------------------------------------------------- sharing */
  A.grid = function (items) { return items.map(function (it) { return it[2] ? "🟩" : it[1] == null ? "⬜" : "🟥"; }).join(""); };
  A.shareText = function (h) {
    var lv = A.levelInfo(), lines = [];
    var who = A.S.settings.name ? A.S.settings.name + " · " : "";
    lines.push("FL Business & Finance Prep");
    lines.push(who + h.title);
    var pctS = h.answered ? Math.round((100 * h.right) / (h.mode === "test" ? h.n : h.answered)) : 0;
    lines.push("Score: " + h.right + "/" + (h.mode === "test" ? h.n : h.answered) + " (" + pctS + "%)" + (h.mode === "test" && h.n >= 20 ? (pctS >= A.S.settings.passPct ? " ✅ PASS" : " ❌ not yet") : ""));
    lines.push("⏱ " + A.fmtTime(h.ms) + " · " + lv.name + " (Lv " + lv.n + ") · 🔥 " + A.plural(A.streak(), "day") + " streak");
    if (h.items && h.items.length && h.items.length <= 60) {
      var sq = h.items.map(function (it) { return it[2] ? "🟩" : it[1] == null ? "⬜" : "🟥"; });
      for (var i = 0; i < sq.length; i += 10) lines.push(sq.slice(i, i + 10).join(""));
    }
    if (h.weak) lines.push("Weakest: " + h.weak);
    if (h.code) lines.push("Beat me → enter challenge code " + h.code);
    return lines.join("\n");
  };
})();
