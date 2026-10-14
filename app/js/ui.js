/* UI shell: router, navigation chrome, layout/theme/text-size prefs, modals, toasts, calculator, confetti, events. */
(function () {
  "use strict";
  var A = window.FBF, esc = A.esc, icon = A.icon;
  A.V = {}; A.AFTER = {}; A.ACT = {}; A.CHANGE = {}; A.KEYS = {}; A.LEAVE = {};
  var st = (A.st = { view: "home", param: null, menu: false, modal: null, calc: null });
  var main;

  A.NAV = [
    { id: "home", label: "Home", icon: "home" },
    { id: "study", label: "Study", icon: "study", sub: "Question by question" },
    { id: "test", label: "Practice Test", short: "Test", icon: "test", sub: "Answers at the end" },
    { id: "missed", label: "Missed", icon: "missed", badge: function () { return A.missedIds().length; } },
    { id: "crew", label: "Crew & Scores", short: "Crew", icon: "trophy" },
    { group: "Open-book skills" },
    { id: "find", label: "Find It Trainer", icon: "find" },
    { id: "cards", label: "Numbers to Know", icon: "cards" },
    { id: "math", label: "Math Lab", icon: "math" },
    { group: "Library" },
    { id: "topics", label: "Topics", icon: "topics" },
    { id: "bank", label: "All 375 Questions", icon: "list" },
    { id: "progress", label: "Progress", icon: "chart" },
    { id: "playbook", label: "Exam Playbook", icon: "guide" },
    { id: "settings", label: "Settings", icon: "gear" }
  ];
  var BOTTOM = ["home", "study", "test", "missed"];
  A.navItem = function (id) { return A.NAV.filter(function (n) { return n.id === id; })[0]; };

  /* ---------------------------------------------------------------- prefs */
  A.isDark = function () { var t = A.S.settings.theme; if (t === "dark") return true; if (t === "light") return false; return !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches); };
  A.isWide = function () { var l = A.S.settings.layout; return l === "desktop" || (l !== "phone" && window.innerWidth >= 960); };
  A.applyPrefs = function () {
    var r = document.documentElement, t = A.S.settings.theme;
    if (t === "light" || t === "dark") r.setAttribute("data-theme", t); else r.removeAttribute("data-theme");
    r.classList.toggle("wide", A.isWide());
    r.classList.toggle("phone-frame", A.S.settings.layout === "phone" && window.innerWidth >= 700);
    r.setAttribute("data-text", A.S.settings.text || "md");
  };

  /* ---------------------------------------------------------------- routing */
  A.go = function (view, param, opts) {
    opts = opts || {};
    if (A.LEAVE[st.view] && st.view !== view) A.LEAVE[st.view]();
    var same = st.view === view && st.param === (param == null ? null : param);
    st.view = view; st.param = param == null ? null : param; st.menu = false; st.modal = null;
    A.S.last.view = view; A.save({ localOnly: true });
    if (!opts.fromPop && !same) {
      try { if (opts.replace || view === "results") history.replaceState({ v: view, p: st.param }, "", "#" + view); else history.pushState({ v: view, p: st.param }, "", "#" + view); } catch (e) { /* sandboxed */ }
    }
    A.render(true);
  };
  A.render = function (scrollTop) {
    A.applyPrefs();
    document.documentElement.classList.toggle("onboard", st.view === "welcome");
    A.renderChrome();
    var fn = A.V[st.view] || A.V.home;
    main.innerHTML = fn();
    if (A.AFTER[st.view]) A.AFTER[st.view]();
    A.renderOverlay();
    if (scrollTop) window.scrollTo(0, 0);
  };
  A.rerenderKeep = function () { var y = window.scrollY; A.render(); window.scrollTo(0, y); };
  function isCurrent(id) {
    if (st.view === id) return true;
    if (st.view === "run" || st.view === "results") { var from = st.runFrom || "study"; return id === from; }
    if (st.view === "topic") return id === "topics";
    return false;
  }

  /* ---------------------------------------------------------------- chrome */
  function levelChip() {
    var lv = A.levelInfo();
    return '<button class="lvchip" data-act="nav" data-v="crew" aria-label="Level ' + lv.n + " " + esc(lv.name) + ", " + lv.xp + ' XP"><span class="lvnum">' + lv.n + '</span><span class="lvtxt"><span class="lvname">' + esc(lv.name) + '</span><span class="xpbar"><span style="width:' + lv.pct + '%"></span></span></span></button>';
  }
  function streakChip() { var s = A.streak(); return '<span class="streak' + (s ? " on" : "") + '" title="' + A.plural(s, "day") + ' in a row">' + icon("flame") + "<b>" + s + "</b></span>"; }
  A.renderChrome = function () {
    var lv = A.levelInfo();
    var side = ['<a class="brand" href="#home" data-act="nav" data-v="home">' + A.LOGO + '<span><span class="brand-name">FL Business &amp; Finance</span><span class="brand-sub">Contractor exam prep</span></span></a>'];
    side.push('<button class="side-level" data-act="nav" data-v="crew"><span class="row between"><span class="lvbadge">Lv ' + lv.n + '</span>' + streakChip() + '</span><span class="lvname-big">' + esc(lv.name) + '</span><span class="xpbar lg"><span style="width:' + lv.pct + '%"></span></span><span class="tiny">' + lv.xp.toLocaleString() + " XP" + (lv.next ? " · " + (lv.next - lv.xp).toLocaleString() + " to " + esc(lv.nextName) : "") + "</span></button>");
    side.push("<nav>");
    A.NAV.forEach(function (n) {
      if (n.group) { side.push('<div class="navgroup">' + n.group + "</div>"); return; }
      var b = n.badge ? n.badge() : 0;
      side.push('<button class="navlink" data-act="nav" data-v="' + n.id + '"' + (isCurrent(n.id) ? ' aria-current="page"' : "") + ">" + icon(n.icon) + "<span>" + n.label + "</span>" + (b ? '<span class="badge">' + b + "</span>" : "") + "</button>");
    });
    side.push("</nav>");
    side.push('<div class="side-foot">' + prefToggles() + "</div>");
    document.getElementById("sidebar").innerHTML = side.join("");

    document.getElementById("topbar").innerHTML = '<a class="brand" href="#home" data-act="nav" data-v="home">' + A.LOGO + '<span class="brand-name sm">FL B&amp;F Prep</span></a><span class="spacer"></span>' + streakChip() + levelChip() +
      '<button class="icon-btn" data-act="theme" aria-label="' + (A.isDark() ? "Switch to light mode" : "Switch to dark mode") + '">' + icon(A.isDark() ? "sun" : "moon") + "</button>";

    var bn = BOTTOM.map(function (id) {
      var n = A.navItem(id), b = n.badge ? n.badge() : 0;
      return '<button data-act="nav" data-v="' + id + '"' + (isCurrent(id) ? ' aria-current="page"' : "") + '><span class="bn-ico">' + icon(n.icon) + (b ? '<span class="badge">' + b + "</span>" : "") + "</span><span>" + (n.short || n.label) + "</span></button>";
    });
    var inMore = BOTTOM.indexOf(st.view) < 0 && !(st.view === "run" || st.view === "results") && st.view !== "home";
    bn.push('<button data-act="menu"' + (inMore ? ' aria-current="page"' : "") + '><span class="bn-ico">' + icon("more") + "</span><span>More</span></button>");
    document.getElementById("bottomnav").innerHTML = bn.join("");
  };
  function prefToggles() {
    var s = A.S.settings;
    return '<div class="seg" role="group" aria-label="Theme">' +
      [["light", "sun", "Light"], ["dark", "moon", "Dark"]].map(function (t) { var on = t[0] === "dark" ? A.isDark() : !A.isDark(); return '<button data-act="setTheme" data-v="' + t[0] + '" aria-pressed="' + on + '">' + icon(t[1]) + "<span>" + t[2] + "</span></button>"; }).join("") + "</div>" +
      '<div class="seg" role="group" aria-label="Layout">' +
      [["auto", "auto", "Auto"], ["phone", "phone", "Phone"], ["desktop", "desktop", "Desktop"]].map(function (t) { return '<button data-act="setLayout" data-v="' + t[0] + '" aria-pressed="' + (s.layout === t[0]) + '" title="' + t[2] + ' layout">' + icon(t[1]) + "<span>" + t[2] + "</span></button>"; }).join("") + "</div>";
  }
  A.prefToggles = prefToggles;

  /* ---------------------------------------------------------------- overlay: menu, modal, calculator */
  A.renderOverlay = function () {
    var el = document.getElementById("overlay");
    if (st.menu) {
      el.innerHTML = '<div class="scrim" data-act="closeMenu"></div><div class="sheet" role="dialog" aria-label="More"><div class="sheet-grip"></div>' +
        '<div class="sheet-grid">' + A.NAV.filter(function (n) { return n.id && BOTTOM.indexOf(n.id) < 0; }).map(function (n) { return '<button data-act="nav" data-v="' + n.id + '"' + (isCurrent(n.id) ? ' aria-current="page"' : "") + "><span class=\"sg-ico\">" + icon(n.icon) + "</span><span>" + n.label + "</span></button>"; }).join("") + "</div>" +
        '<div class="sheet-prefs">' + prefToggles() + "</div></div>";
    } else if (st.modal) {
      var m = st.modal;
      el.innerHTML = '<div class="scrim" data-act="' + (m.sticky ? "noop" : "modalClose") + '"></div><div class="modal" role="dialog" aria-modal="true" aria-label="' + esc(m.title) + '"><h3>' + esc(m.title) + "</h3>" + (m.html || "<p>" + esc(m.body || "") + "</p>") +
        '<div class="modal-actions">' + (m.actions || [{ label: "OK" }]).map(function (a, i) { return '<button class="btn ' + (a.cls || "") + '" data-act="mbtn" data-i="' + i + '">' + (a.icon ? icon(a.icon) : "") + esc(a.label) + "</button>"; }).join("") + "</div></div>";
      var f = el.querySelector(".modal .btn.primary, .modal .btn"); if (f && !m.noFocus) setTimeout(function () { try { f.focus(); } catch (e) { /* ignore */ } }, 20);
    } else el.innerHTML = "";
    renderCalc();
  };
  A.modal = function (m) { st.modal = m; A.renderOverlay(); };
  A.closeModal = function () { st.modal = null; A.renderOverlay(); };
  A.confirm = function (title, body, okLabel, fn, danger) { A.modal({ title: title, body: body, actions: [{ label: "Cancel" }, { label: okLabel || "OK", cls: danger ? "danger" : "primary", fn: fn }] }); };

  /* ---------------------------------------------------------------- toasts & celebration */
  A.toast = function (msg, kind, ic) {
    var box = document.getElementById("toasts");
    var t = document.createElement("div");
    t.className = "toast " + (kind || "");
    t.setAttribute("role", "status");
    t.innerHTML = (ic ? icon(ic) : "") + "<span>" + msg + "</span>";
    box.appendChild(t);
    while (box.children.length > 3) box.removeChild(box.firstChild);
    setTimeout(function () { t.classList.add("out"); }, kind === "tbadge" || kind === "level" ? 3400 : 1900);
    setTimeout(function () { t.remove(); }, kind === "tbadge" || kind === "level" ? 3800 : 2300);
  };
  var xpBuf = 0, xpTimer = null;
  A.onXP = function (n) {
    xpBuf += n; clearTimeout(xpTimer);
    xpTimer = setTimeout(function () { if (xpBuf) A.toast("+" + xpBuf + " XP", "xp", "bolt"); xpBuf = 0; }, 350);
  };
  A.onLevelUp = function (lv) { A.toast("Level " + lv.n + ": <b>" + esc(lv.name) + "</b>", "level", "star"); A.celebrate(); };
  A.onBadge = function (b) { A.toast("Badge earned: <b>" + esc(b.name) + "</b>", "tbadge", b.icon); };
  A.celebrate = function () {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var c = document.createElement("canvas"); c.className = "confetti"; document.body.appendChild(c);
    var W = (c.width = window.innerWidth), H = (c.height = window.innerHeight), ctx = c.getContext("2d");
    var cs = getComputedStyle(document.documentElement), cols = ["--amber", "--primary", "--ok", "--tab-aia", "--tab-fs"].map(function (v) { return cs.getPropertyValue(v).trim() || "#f5b700"; });
    var P = []; for (var i = 0; i < 140; i++) P.push({ x: W / 2 + (Math.random() - 0.5) * W * 0.3, y: H * 0.35, vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 14 - 4, r: Math.random() * 6 + 3, c: cols[i % cols.length], a: Math.random() * 6, s: (Math.random() - 0.5) * 0.3 });
    var t0 = performance.now();
    (function frame(t) {
      var dt = t - t0; ctx.clearRect(0, 0, W, H);
      P.forEach(function (p) { p.vy += 0.42; p.x += p.vx; p.y += p.vy; p.a += p.s; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c; ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); ctx.restore(); });
      if (dt < 2200) requestAnimationFrame(frame); else c.remove();
    })(t0);
  };

  /* ---------------------------------------------------------------- copy & share */
  A.copy = function (text, okMsg) {
    var fallback = function () { A.modal({ title: "Copy this", html: '<textarea class="copybox" id="copybox" readonly>' + esc(text) + '</textarea><p class="small muted">Select all and copy, then paste it into a text, email or group chat.</p>', actions: [{ label: "Done", cls: "primary" }], noFocus: true }); setTimeout(function () { var b = document.getElementById("copybox"); if (b) { b.focus(); b.select(); } }, 30); };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { A.toast(okMsg || "Copied. Paste it anywhere.", "info", "copy"); }, fallback);
      else fallback();
    } catch (e) { fallback(); }
  };
  A.share = function (text) {
    if (navigator.share && !A.inFrame) {
      navigator.share({ text: text }).catch(function (e) { if (!e || e.name !== "AbortError") A.copy(text, "Results copied. Paste them to your crew."); });
    } else A.copy(text, "Results copied. Paste them to your crew.");
  };
  try { A.inFrame = window.self !== window.top; } catch (e) { A.inFrame = true; }

  /* ---------------------------------------------------------------- calculator */
  function renderCalc() {
    var el = document.getElementById("calc");
    var c = st.calc;
    if (!c) { el.innerHTML = ""; return; }
    var keys = [["C", "clr"], ["←", "bk"], ["%", "pct"], ["÷", "/"], ["7"], ["8"], ["9"], ["×", "*"], ["4"], ["5"], ["6"], ["−", "-"], ["1"], ["2"], ["3"], ["+", "+"], ["±", "neg"], ["0"], ["."], ["=", "eq"]];
    el.innerHTML = '<div class="calc" role="dialog" aria-label="Calculator"><div class="calc-head"><span class="eyebrow">Calculator</span><button class="icon-btn sm" data-act="calcClose" aria-label="Close calculator">' + icon("x") + '</button></div><div class="calc-disp mono" aria-live="polite"><span class="calc-acc">' + esc(c.acc != null && c.op ? fmtN(c.acc) + " " + ({ "/": "÷", "*": "×", "-": "−", "+": "+" })[c.op] : "") + "</span>" + esc(c.cur) + '</div><div class="calc-keys">' +
      keys.map(function (k) { var v = k[1] || k[0]; var cls = /[\/*\-+]|eq/.test(v) && v.length <= 2 ? "op" : v === "clr" || v === "bk" || v === "pct" || v === "neg" ? "fn" : ""; return '<button class="' + cls + (v === "eq" ? " eq" : "") + '" data-act="calcKey" data-k="' + esc(v) + '">' + k[0] + "</button>"; }).join("") + "</div></div>";
  }
  function fmtN(n) { if (!isFinite(n)) return "Error"; var s = Math.round(n * 1e10) / 1e10; return String(s); }
  function calcKey(k) {
    var c = st.calc; if (!c) return;
    var cur = parseFloat(c.cur);
    var apply = function (a, b, op) { return op === "+" ? a + b : op === "-" ? a - b : op === "*" ? a * b : op === "/" ? a / b : b; };
    if (/^[0-9]$/.test(k)) { c.cur = c.fresh || c.cur === "0" ? k : c.cur.length < 14 ? c.cur + k : c.cur; c.fresh = false; }
    else if (k === ".") { if (c.fresh) { c.cur = "0."; c.fresh = false; } else if (c.cur.indexOf(".") < 0) c.cur += "."; }
    else if (k === "clr") { c.cur = "0"; c.acc = null; c.op = null; c.fresh = true; }
    else if (k === "bk") { c.cur = c.cur.length > 1 ? c.cur.slice(0, -1) : "0"; }
    else if (k === "neg") { c.cur = fmtN(-cur); }
    else if (k === "pct") { c.cur = fmtN(c.acc != null && (c.op === "+" || c.op === "-") ? (c.acc * cur) / 100 : cur / 100); c.fresh = true; }
    else if ("+-*/".indexOf(k) >= 0) { if (c.op && !c.fresh) c.acc = apply(c.acc, cur, c.op); else if (c.acc == null || !c.op) c.acc = cur; c.op = k; c.cur = fmtN(c.acc); c.fresh = true; }
    else if (k === "eq") { if (c.op != null && c.acc != null) { c.cur = fmtN(apply(c.acc, cur, c.op)); c.acc = null; c.op = null; c.fresh = true; } }
    renderCalc();
  }
  A.ACT.calc = function () { st.calc = st.calc ? null : { cur: "0", acc: null, op: null, fresh: true }; renderCalc(); };
  A.ACT.calcClose = function () { st.calc = null; renderCalc(); };
  A.ACT.calcKey = function (el) { calcKey(el.dataset.k); };

  /* ---------------------------------------------------------------- shared actions */
  A.ACT.noop = function () {};
  A.ACT.nav = function (el) { var v = el.dataset.v; if (v === "topic") return A.go("topic", el.dataset.p); A.go(v); };
  A.ACT.menu = function () { st.menu = true; A.renderOverlay(); };
  A.ACT.closeMenu = function () { st.menu = false; A.renderOverlay(); };
  A.ACT.modalClose = A.closeModal;
  A.ACT.mbtn = function (el) { var m = st.modal, a = m && m.actions && m.actions[+el.dataset.i]; st.modal = null; A.renderOverlay(); if (a && a.fn) a.fn(); };
  A.ACT.theme = function () { A.S.settings.theme = A.isDark() ? "light" : "dark"; A.save(); A.rerenderKeep(); };
  A.ACT.setTheme = function (el) { A.S.settings.theme = el.dataset.v; A.save(); A.rerenderKeep(); };
  A.ACT.setLayout = function (el) { A.S.settings.layout = el.dataset.v; A.save(); A.rerenderKeep(); A.toast(el.dataset.v === "auto" ? "Layout follows your screen size" : el.dataset.v === "phone" ? "Phone layout" : "Desktop layout", "info", el.dataset.v); };
  A.ACT.goCheck = function (el) { A.go(el.dataset.v); };

  /* ---------------------------------------------------------------- events */
  function bind() {
    document.addEventListener("click", function (ev) {
      var el = ev.target.closest("[data-act]");
      if (!el || el.disabled) return;
      if (el.tagName === "A") ev.preventDefault();
      var fn = A.ACT[el.dataset.act];
      if (fn) fn(el, ev);
    });
    document.addEventListener("change", function (ev) { var el = ev.target; if (el.dataset && el.dataset.change && A.CHANGE[el.dataset.change]) A.CHANGE[el.dataset.change](el, ev); });
    var tmr = null;
    document.addEventListener("input", function (ev) {
      var el = ev.target;
      if (el.dataset && el.dataset.note) { var r = A.rec(el.dataset.note); r.note = el.value; clearTimeout(tmr); tmr = setTimeout(A.save, 600); }
      if (el.dataset && el.dataset.input && A.CHANGE[el.dataset.input]) A.CHANGE[el.dataset.input](el, ev);
    });
    document.addEventListener("keydown", function (ev) {
      var tag = (ev.target.tagName || "").toLowerCase();
      if (ev.key === "Escape") { if (st.modal) { A.closeModal(); return; } if (st.menu) { st.menu = false; A.renderOverlay(); return; } if (st.calc) { st.calc = null; renderCalc(); return; } }
      if (tag === "input" || tag === "textarea" || tag === "select" || ev.metaKey || ev.ctrlKey || ev.altKey || st.modal || st.menu) return;
      if (st.calc && /^[0-9.+\-*/=]$|^Enter$|^Backspace$/.test(ev.key)) { ev.preventDefault(); calcKey(ev.key === "Enter" || ev.key === "=" ? "eq" : ev.key === "Backspace" ? "bk" : ev.key); return; }
      var h = A.KEYS[st.view]; if (h) h(ev.key.toLowerCase(), ev);
    });
    window.addEventListener("popstate", function (ev) {
      var v = (location.hash || "").replace("#", "") || "home", p = ev.state && ev.state.v === v ? ev.state.p : null;
      if (A.V[v] && v !== "welcome") A.go(v, p, { fromPop: true });
    });
    window.addEventListener("hashchange", function () {
      var v = location.hash.replace("#", "");
      if (/^ch-/i.test(v) && A.openChallenge) { A.openChallenge(v); return; }
      if (v && v !== st.view && A.V[v] && v !== "run" && v !== "results") A.go(v);
    });
    var rz = null;
    window.addEventListener("resize", function () { clearTimeout(rz); rz = setTimeout(function () { var w = A.isWide(); if (w !== document.documentElement.classList.contains("wide")) A.rerenderKeep(); else A.applyPrefs(); }, 120); });
    if (window.matchMedia) { try { window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () { A.rerenderKeep(); }); } catch (e) { /* old browser */ } }
    document.addEventListener("visibilitychange", function () { if (document.hidden) A.save(); });
  }

  A.boot = function () {
    main = document.getElementById("main");
    bind();
    var v = (location.hash || "").replace("#", "");
    if (!A.S.settings.welcomed && !A.S.settings.name && !/^ch-/i.test(v)) { st.view = "welcome"; A.render(true); if (A.cloudInit) A.cloudInit(); return; }
    if (/^ch-/i.test(v)) { st.view = "crew"; setTimeout(function () { A.openChallenge && A.openChallenge(v); }, 50); }
    else if (v && A.V[v] && v !== "run" && v !== "results" && v !== "topic") st.view = v;
    A.render(true);
    A.checkBadges();
    if (A.cloudInit) A.cloudInit();
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { A.boot(); }); else setTimeout(function () { A.boot(); }, 0);
})();
