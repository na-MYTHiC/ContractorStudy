/* Leaderboard + saved progress across devices.
   Three ways the crew board can work, picked automatically:
   1. "artifact": the app is opened from its claude.ai link. Progress is saved to the person's account and
      the board lives in the artifact's shared database.
   2. "server": a free Supabase project is configured in config.js (see LEADERBOARD.md). Usernames and
      scores are shared live between everyone who opens the GitHub Pages link.
   3. "cards": no server. Friends swap score-card codes and the board is built on each device.
   Rows are normalized to {id, name, me, xp, level, rank, streak, mastered, bestTest, tests, daily, recent}. */
(function () {
  "use strict";
  var A = window.FBF;
  var B = (A.board = { mode: "cards", status: "off", rows: [], error: "" });
  var C = (A.cloud = { on: false, uid: null, names: {}, colors: {} }); // artifact-only details

  /* ---------------------------------------------------------------- shared helpers */
  function myRow() {
    var S = A.S, lv = A.levelInfo(), o = A.overall(), tests = A.tests(), daily = {};
    Object.keys(S.daily).sort().slice(-14).forEach(function (k) { daily[k] = { s: S.daily[k].s, n: S.daily[k].n, ms: S.daily[k].ms }; });
    var recent = S.history.slice(-8).map(function (h) {
      var p = h.n ? Math.round((100 * h.right) / h.n) : 0;
      var txt = h.kind === "daily" ? "scored " + h.right + "/" + h.n + " on " + h.title : h.mode === "test" ? (h.partial ? "graded " + h.n + " questions of " + h.title + " (" + p + "%)" : "scored " + p + "% on " + h.title) : "studied " + h.answered + " questions (" + p + "% right)";
      return { txt: txt, at: h.at };
    });
    return { username: S.settings.name || "", xp: S.xp, level: lv.n, rank: lv.name, streak: A.streak(), mastered: o.mastered, seen: o.seen, bestTest: tests.reduce(function (m, t) { return Math.max(m, t.score); }, 0), tests: tests.length, daily: daily, recent: recent, badges: Object.keys(S.badges).length, updatedAt: Date.now() };
  }
  A.myRow = myRow;
  function rerenderBoard() { if (A.st.view === "crew") A.rerenderKeep(); }

  /* ---------------------------------------------------------------- 3. score cards (works everywhere) */
  function b64e(s) { return btoa(unescape(encodeURIComponent(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
  function b64d(s) { s = s.replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "="; return decodeURIComponent(escape(atob(s))); }
  A.myCard = function () {
    var r = myRow(), k = A.todayKey(), d = A.S.daily[k];
    var o = { u: r.username || "Me", x: r.xp, l: r.level, s: r.streak, m: r.mastered, b: Math.round(r.bestTest * 100), t: r.tests, at: Date.now() };
    if (d) o.d = [k, d.s, d.n, d.ms];
    return "FBF1." + b64e(JSON.stringify(o));
  };
  A.addCards = function (text) {
    var found = String(text || "").match(/FBF1\.[A-Za-z0-9_-]+/g) || [], added = 0;
    A.S.friends = A.S.friends || {};
    found.forEach(function (code) {
      try {
        var o = JSON.parse(b64d(code.slice(5)));
        if (!o || typeof o.u !== "string" || typeof o.x !== "number") return;
        var key = o.u.trim().toLowerCase().slice(0, 24);
        if (key === (A.S.settings.name || "").toLowerCase()) return;
        var prev = A.S.friends[key];
        if (!prev || (prev.at || 0) <= (o.at || 0)) { A.S.friends[key] = o; added++; }
      } catch (e) { /* skip bad code */ }
    });
    A.save();
    return { found: found.length, added: added };
  };
  function cardRows() {
    var rows = [], me = myRow(), fr = A.S.friends || {};
    rows.push(Object.assign({ id: "me", name: me.username || "You", me: true }, me));
    Object.keys(fr).forEach(function (k) {
      var o = fr[k], daily = {};
      if (o.d) daily[o.d[0]] = { s: o.d[1], n: o.d[2], ms: o.d[3] };
      rows.push({ id: "card-" + k, name: o.u, me: false, xp: o.x, level: o.l, rank: (A.LEVELS[(o.l || 1) - 1] || [0, ""])[1], streak: o.s, mastered: o.m, bestTest: (o.b || 0) / 100, tests: o.t, daily: daily, recent: [], updatedAt: o.at, card: true });
    });
    return rows;
  }

  /* ---------------------------------------------------------------- 2. Supabase server (GitHub Pages link) */
  var CFG = window.FBF_LEADERBOARD || null;
  function serverOn() { return !!(CFG && CFG.url && CFG.key && /^https:\/\//.test(CFG.url)); }
  function player() {
    var p = A.S.player;
    if (!p || !p.id) {
      var hex = function (n) { var a = new Uint8Array(n); (window.crypto || {}).getRandomValues ? window.crypto.getRandomValues(a) : a.forEach(function (_, i) { a[i] = Math.random() * 256; }); return Array.from(a).map(function (b) { return ("0" + b.toString(16)).slice(-2); }).join(""); };
      var h = hex(16);
      p = A.S.player = { id: h.slice(0, 8) + "-" + h.slice(8, 12) + "-4" + h.slice(13, 16) + "-a" + h.slice(17, 20) + "-" + h.slice(20, 32), secret: hex(24) };
      A.saveLocal();
    }
    return p;
  }
  function api(path, opts) {
    opts = opts || {};
    return fetch(CFG.url.replace(/\/$/, "") + "/rest/v1/" + path, {
      method: opts.method || "GET",
      headers: Object.assign({ apikey: CFG.key, "Content-Type": "application/json", Accept: "application/json" }, /^eyJ/.test(CFG.key) ? { Authorization: "Bearer " + CFG.key } : {}),
      body: opts.body ? JSON.stringify(opts.body) : undefined
    }).then(function (r) {
      return r.text().then(function (t) {
        var j = null; try { j = t ? JSON.parse(t) : null; } catch (e) { j = null; }
        if (!r.ok) { var err = new Error((j && (j.message || j.hint)) || "HTTP " + r.status); err.status = r.status; err.body = j; throw err; }
        return j;
      });
    });
  }
  var pollT = null, pubT = null, pubBusy = false, pubAgain = false;
  function serverFetch() {
    if (!serverOn()) return Promise.resolve();
    B.status = B.rows.length ? "on" : "connecting";
    return api("leaderboard?select=*&order=xp.desc&limit=300").then(function (rows) {
      var me = player().id;
      B.rows = (rows || []).map(function (r) { return { id: r.id, name: r.username, me: r.id === me, xp: r.xp, level: r.level, rank: r.rank, streak: r.streak, mastered: r.mastered, bestTest: r.best_test, tests: r.tests, daily: r.daily || {}, recent: r.recent || [], updatedAt: Date.parse(r.updated_at) || 0 }; });
      B.status = "on"; B.error = "";
      rerenderBoard();
    }).catch(function (e) { B.status = "error"; B.error = "Couldn’t reach the leaderboard (" + e.message + ")."; rerenderBoard(); });
  }
  function serverPublish() {
    if (!serverOn() || !A.S.settings.name) return;
    if (pubBusy) { pubAgain = true; return; }
    pubBusy = true;
    var p = player(), row = myRow();
    api("rpc/upsert_player", { method: "POST", body: { p_id: p.id, p_secret: p.secret, p_username: A.S.settings.name, p_data: row } }).then(function () {
      A.S.player.posted = A.S.settings.name; A.saveLocal(); B.taken = false; done(); serverFetch();
    }, function (e) {
      var msg = (e.body && e.body.message) || e.message || "";
      if (/username_taken/.test(msg)) { B.taken = true; A.toast("That username is taken on the leaderboard. Pick another in Crew.", "info", "crew"); rerenderBoard(); }
      else if (/not_owner/.test(msg)) { B.error = "This device’s leaderboard key doesn’t match. Restore your backup code to keep your spot."; }
      done();
    });
    function done() { pubBusy = false; if (pubAgain) { pubAgain = false; A.crewPublish(); } }
  }

  /* ---------------------------------------------------------------- 1. claude.ai artifact (account storage + shared db) */
  function capOK() { return window.claude && typeof window.claude.use === "function"; }
  function artifactInit() {
    B.status = "connecting";
    Promise.all([window.claude.use("user"), window.claude.use("db")]).then(function (res) {
      var user = res[0], db = res[1];
      if (!user || !db) return fallback();
      return user.id().then(function (uid) {
        if (!uid) return fallback();
        C.uid = uid; C.db = db; C.user = user;
        return user.me().then(function (me) {
          C.name = me.name || ""; C.avatar = me.avatarUrl || "";
          return db.doc("data/users/" + uid + "/progress").get();
        }).then(function (snap) {
          if (snap && snap.exists) {
            try {
              var d = snap.data(), remote = d && d.state ? JSON.parse(d.state) : null;
              if (remote && (remote.savedAt || 0) > (A.S.savedAt || 0) + 1000) { A.S = A.normalize(remote); A.saveLocal(); A.toast("Progress loaded from your account", "info", "check"); }
            } catch (e) { /* ignore a malformed copy */ }
          }
          C.on = true; B.mode = "artifact"; B.status = "on";
          C.unsub = db.collection("crew").limit(300).onSnapshot(function (qs) {
            var docs = qs.docs.map(function (d) { return Object.assign({ uid: d.id }, d.data()); });
            resolveNames(docs).then(function () {
              B.rows = docs.map(function (r) { return { id: r.uid, name: r.username || C.names[r.uid] || "Crew member", color: C.colors[r.uid], me: r.uid === C.uid, xp: r.xp, level: r.level, rank: r.rank, streak: r.streak, mastered: r.mastered, bestTest: r.bestTest, tests: r.tests, daily: r.daily || {}, recent: r.recent || [], updatedAt: r.updatedAt }; });
              rerenderBoard();
            });
          }, function () { C.unsub = null; });
          A.cloudSave(true); A.crewPublish();
          if (A.st.view !== "run") A.rerenderKeep();
        });
      });
    }).catch(fallback);
    function fallback() { B.mode = serverOn() ? "server" : "cards"; B.status = serverOn() ? "connecting" : "off"; if (serverOn()) serverFetch(); }
  }
  function resolveNames(docs) {
    var ids = docs.map(function (r) { return r.uid; });
    if (!ids.length || !C.user) return Promise.resolve();
    return C.user.profiles(ids).then(function (ps) { ids.forEach(function (id) { var p = ps[id]; if (p) { C.names[id] = p.name || ""; C.colors[id] = p.color; } }); }).catch(function () { /* generic names */ });
  }
  var saveTimer = null, inFlight = false, again = false;
  A.cloudSave = function (now) {
    if (!C.on || C.readOnly) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flush, now ? 50 : 4000);
  };
  function snapshotState() {
    var json = JSON.stringify(A.S);
    if (json.length > 230000) {
      var copy = JSON.parse(json);
      copy.history = copy.history.slice(-40).map(function (h, i, arr) { if (i < arr.length - 10) h.items = []; return h; });
      json = JSON.stringify(copy);
    }
    return json;
  }
  function flush() {
    if (inFlight) { again = true; return; }
    inFlight = true;
    C.db.doc("data/users/" + C.uid + "/progress").set({ state: snapshotState(), savedAt: A.S.savedAt || Date.now() }).then(done, function (e) { if (e && e.code === "invalid_argument") C.readOnly = true; done(); });
    function done() { inFlight = false; if (again) { again = false; A.cloudSave(); } }
  }
  function artifactPublish() {
    if (pubBusy) { pubAgain = true; return; }
    pubBusy = true;
    C.db.doc("crew/" + C.uid).set(myRow()).then(fin, function (e) { if (e && e.code === "invalid_argument") C.crewRO = true; fin(); });
    function fin() { pubBusy = false; if (pubAgain) { pubAgain = false; A.crewPublish(); } }
  }
  window.addEventListener("pagehide", function () { if (C.on && !C.readOnly) { clearTimeout(saveTimer); flush(); } });

  /* ---------------------------------------------------------------- public API */
  A.crewPublish = function () {
    clearTimeout(pubT);
    pubT = setTimeout(function () {
      if (B.mode === "artifact" && C.on && !C.crewRO) artifactPublish();
      else if (B.mode === "server") serverPublish();
    }, 2000);
  };
  A.boardRows = function () { return B.mode === "cards" ? cardRows() : B.rows; };
  A.boardRefresh = function () { if (B.mode === "server") serverFetch(); };
  A.cloudInit = function () {
    if (capOK()) { artifactInit(); return; }
    if (serverOn()) {
      B.mode = "server"; B.status = "connecting";
      serverFetch(); A.crewPublish();
      clearInterval(pollT);
      pollT = setInterval(function () { if (!document.hidden && (A.st.view === "crew" || A.st.view === "home")) serverFetch(); }, 60000);
    }
  };
  A.AFTER.crew = function () { if (B.mode === "server" && Date.now() - (B.fetchedAt || 0) > 15000) { B.fetchedAt = Date.now(); serverFetch(); } };
})();
