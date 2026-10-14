/* Optional cloud features when the app runs as a hosted Claude artifact:
   - progress saved to the signed-in person's private storage (follows them across devices)
   - a crew leaderboard where each person posts their own level and scores.
   Anywhere else (local file, GitHub Pages) window.claude is absent and this quietly does nothing. */
(function () {
  "use strict";
  var A = window.FBF;
  var C = (A.cloud = { on: false, status: "off", board: [], names: {}, colors: {}, uid: null, readOnly: false });

  function capOK() { return window.claude && typeof window.claude.use === "function"; }

  A.cloudInit = function () {
    if (!capOK()) return;
    C.status = "connecting";
    Promise.all([window.claude.use("user"), window.claude.use("db")]).then(function (res) {
      var user = res[0], db = res[1];
      if (!user || !db) { C.status = "off"; return; }
      return user.id().then(function (uid) {
        if (!uid) { C.status = "off"; return; }
        C.uid = uid; C.db = db; C.user = user;
        return user.me().then(function (me) {
          C.name = me.name || ""; C.avatar = me.avatarUrl || "";
          return db.doc("data/users/" + uid + "/progress").get();
        }).then(function (snap) {
          if (snap && snap.exists) {
            var d = snap.data();
            try {
              var remote = d && d.state ? JSON.parse(d.state) : null;
              if (remote && (remote.savedAt || 0) > (A.S.savedAt || 0) + 1000) {
                // keep an in-progress session from this device if the account copy is older about it
                A.S = A.normalize(remote); A.saveLocal();
                A.toast("Progress loaded from your account", "info", "check");
              }
            } catch (e) { /* ignore a malformed copy */ }
          }
          C.on = true; C.status = "on";
          subscribeBoard();
          A.cloudSave(true); A.crewPublish();
          if (A.st.view !== "run") A.rerenderKeep();
        });
      });
    }).catch(function () { C.status = "off"; });
  };

  /* ---------------- private progress */
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
    C.db.doc("data/users/" + C.uid + "/progress").set({ state: snapshotState(), savedAt: A.S.savedAt || Date.now() }).then(done, function (e) {
      if (e && e.code === "invalid_argument") C.readOnly = true;
      done();
    });
    function done() { inFlight = false; if (again) { again = false; A.cloudSave(); } }
  }
  window.addEventListener("pagehide", function () { if (C.on && !C.readOnly) { clearTimeout(saveTimer); flush(); } });

  /* ---------------- crew leaderboard */
  var pubTimer = null, pubBusy = false, pubAgain = false;
  A.crewPublish = function () {
    if (!C.on || C.crewRO) return;
    clearTimeout(pubTimer);
    pubTimer = setTimeout(publish, 2500);
  };
  function crewDoc() {
    var S = A.S, lv = A.levelInfo(), o = A.overall(), tests = A.tests(), daily = {};
    Object.keys(S.daily).sort().slice(-14).forEach(function (k) { daily[k] = { s: S.daily[k].s, n: S.daily[k].n, ms: S.daily[k].ms }; });
    var recent = S.history.slice(-8).map(function (h) {
      var p = h.n ? Math.round((100 * h.right) / h.n) : 0;
      var txt = h.kind === "daily" ? "scored " + h.right + "/" + h.n + " on " + h.title : h.mode === "test" ? (h.partial ? "graded " + h.n + " questions of " + h.title + " (" + p + "%)" : "scored " + p + "% on " + h.title) : "studied " + h.answered + " questions (" + p + "% right)";
      return { txt: txt, at: h.at };
    });
    return { xp: S.xp, level: lv.n, rank: lv.name, streak: A.streak(), mastered: o.mastered, seen: o.seen, bestTest: tests.reduce(function (m, t) { return Math.max(m, t.score); }, 0), tests: tests.length, daily: daily, recent: recent, badges: Object.keys(S.badges).length, updatedAt: Date.now() };
  }
  function publish() {
    if (pubBusy) { pubAgain = true; return; }
    pubBusy = true;
    C.db.doc("crew/" + C.uid).set(crewDoc()).then(fin, function (e) { if (e && e.code === "invalid_argument") C.crewRO = true; fin(); });
    function fin() { pubBusy = false; if (pubAgain) { pubAgain = false; A.crewPublish(); } }
  }
  function subscribeBoard() {
    if (C.unsub) return;
    C.unsub = C.db.collection("crew").limit(200).onSnapshot(function (qs) {
      C.board = qs.docs.map(function (d) { return Object.assign({ uid: d.id }, d.data()); });
      resolveNames().then(function () { if (A.st.view === "crew") A.rerenderKeep(); });
    }, function () { C.unsub = null; });
  }
  function resolveNames() {
    var ids = C.board.map(function (r) { return r.uid; });
    if (!ids.length || !C.user) return Promise.resolve();
    return C.user.profiles(ids).then(function (ps) {
      ids.forEach(function (id) { var p = ps[id]; if (p) { C.names[id] = p.name || ""; C.colors[id] = p.color; } });
    }).catch(function () { /* names stay generic */ });
  }
  A.AFTER.crew = function () { if (C.on) resolveNames().then(function () { /* names are read on next render */ }); };
})();
