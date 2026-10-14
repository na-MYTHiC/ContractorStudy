// Sanity checks for the data files and the Math Lab generators. Run: node tools/check.js
const fs = require("fs"), vm = require("vm"), path = require("path");
const root = path.join(__dirname, "..", "app");
const store = {};
const ctx = { console, setTimeout, clearTimeout, Promise, Date, Math, JSON,
  location: { hash: "" }, history: { replaceState() {} }, navigator: {},
  localStorage: { getItem: k => store[k] || null, setItem: (k, v) => { store[k] = v; }, removeItem: k => { delete store[k]; } },
  document: { readyState: "loading", addEventListener() {}, documentElement: { setAttribute() {}, removeAttribute() {}, classList: { toggle() {} } } },
  addEventListener() {}, matchMedia: () => ({ matches: false, addEventListener() {} }), innerWidth: 1200 };
ctx.window = ctx; ctx.self = ctx; ctx.top = ctx;
vm.createContext(ctx);
for (const f of ["data/questions.js", "data/meta.js", "js/core.js", "js/ui.js", "js/runs.js", "js/math.js", "js/views.js", "js/cloud.js"]) vm.runInContext(fs.readFileSync(path.join(root, f), "utf8"), ctx, { filename: f });
const A = ctx.FBF, Q = A.Q;
let fail = 0; const bad = m => { fail++; console.log("FAIL", m); };
if (Q.length !== 375) bad("question count " + Q.length);
const ids = new Set(Q.map(q => q.id));
for (const q of Q) {
  if (q.options.length !== 4 || q.options.some(o => !o)) bad(q.id + " options");
  if (!(q.answer >= 0 && q.answer < 4)) bad(q.id + " answer");
  if (!A.TOPICS[q.topic]) bad(q.id + " topic");
  if (!q.exp || q.exp.length < 30) bad(q.id + " explanation");
  if (!q.plain || q.plain.length < 20) bad(q.id + " plain-English explanation");
  if (!q.look) bad(q.id + " lookup term");
  if (!q.books.length || q.books.some(b => !A.BOOKS[b])) bad(q.id + " books");
  if (!q.cites.length) bad(q.id + " cites");
  const lk = A.lookup(q);
  if (!lk.length || (lk[0].book === "FCM" && !lk[0].chap)) bad(q.id + " lookup path " + JSON.stringify(lk[0]));
  (q.dupes || []).forEach(d => { if (!ids.has(d)) bad(q.id + " dupe " + d); });
}
for (const f of A.FACTS) for (const id of f.ids) if (!ids.has(id)) bad("fact ref " + id + " in: " + f.q);
// views render without throwing on a fresh profile
for (const v of ["home", "study", "test", "missed", "crew", "find", "cards", "math", "topics", "bank", "progress", "playbook", "settings"]) {
  try { const h = A.V[v](); if (typeof h !== "string" || h.length < 100) bad("view " + v + " empty"); } catch (e) { bad("view " + v + " threw " + e.stack); }
}
// challenge codes round-trip and seeded sets are deterministic
const code = A.makeCode(123456789, 25, 20), pc = A.parseCode(code);
if (!pc || pc.seed !== 123456789 || pc.n !== 25 || pc.score !== 20) bad("challenge code round trip " + code);
if (A.seededSet(42, 25).join() !== A.seededSet(42, 25).join()) bad("seeded set not deterministic");
if (new Set(A.seededSet(42, 120)).size !== 120) bad("seeded set duplicates");
// math generators
for (const k of Object.keys(A.GEN)) {
  for (let i = 0; i < 400; i++) {
    const p = A.makeProblem(k);
    if (!p) { bad(k + " could not produce 4 distinct choices"); break; }
    if (p.choices[0] !== p.answer || !isFinite(p.answer)) { bad(k + " answer"); break; }
  }
}
// XP + levels sanity
if (A.levelInfo(0).n !== 1 || A.levelInfo(1e6).n !== A.LEVELS.length) bad("levels");
console.log(fail ? fail + " problem(s)" : "All checks passed: " + Q.length + " questions, " + A.FACTS.length + " flashcards, " + Object.keys(A.GEN).length + " math generators, " + A.BADGES.length + " badges");
process.exit(fail ? 1 : 0);
