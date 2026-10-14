// Sanity checks for the data files and the Math Lab generators. Run: node tools/check.js
const fs = require("fs"), vm = require("vm"), path = require("path");
const root = path.join(__dirname, "..", "app");
const ctx = { window: {}, document: { readyState: "loading", addEventListener() {} }, console, location: { hash: "" }, localStorage: { getItem() { return null; }, setItem() {} } };
ctx.window.document = ctx.document; ctx.window.localStorage = ctx.localStorage;
vm.createContext(ctx);
for (const f of ["data/questions.js", "data/meta.js", "app.js"]) vm.runInContext(fs.readFileSync(path.join(root, f), "utf8"), ctx, { filename: f });
const W = ctx.window, Q = W.QUESTIONS;
let fail = 0; const bad = m => { fail++; console.log("FAIL", m); };
if (Q.length !== 375) bad("question count " + Q.length);
const ids = new Set(Q.map(q => q.id));
for (const q of Q) {
  if (q.options.length !== 4 || q.options.some(o => !o)) bad(q.id + " options");
  if (!(q.answer >= 0 && q.answer < 4)) bad(q.id + " answer");
  if (!W.TOPICS[q.topic]) bad(q.id + " topic");
  if (!q.exp || q.exp.length < 30) bad(q.id + " explanation");
  if (!q.books.length || q.books.some(b => !W.BOOKS[b])) bad(q.id + " books");
  if (!q.cites.length) bad(q.id + " cites");
  (q.dupes || []).forEach(d => { if (!ids.has(d)) bad(q.id + " dupe " + d); });
  // explanation should mention the keyed answer's key term when it is a number
  const ans = q.options[q.answer];
  const num = (ans.match(/\$?[\d,.]+/) || [])[0];
  if (num && /^[\d$,.\s%;-]+(years?|days?|hours?)?$/i.test(ans) && !q.edAns && !q.exp.includes(num.replace(/^\$/, "")) && !q.exp.includes(num)) console.log("  note: " + q.id + " explanation doesn't repeat '" + ans + "'");
}
for (const f of W.FACTS) for (const id of f.ids) if (!ids.has(id)) bad("fact ref " + id + " in: " + f.q);
// math generators
const G = W.FBF_INTERNALS.GEN;
for (const k of Object.keys(G)) {
  for (let i = 0; i < 400; i++) {
    const p = W.FBF_INTERNALS.makeProblem(k);
    if (!p) { bad(k + " could not produce 4 distinct choices"); break; }
    if (!isFinite(p.answer)) { bad(k + " non-finite answer"); break; }
    if (p.choices[0] !== p.answer) { bad(k + " choice 0 must be the answer"); break; }
    const labels = p.choices.map(p.f);
    if (p.choices.some(c => !isFinite(c))) { bad(k + " non-finite choice"); break; }
    if (labels.filter(l => l === labels[0]).length > 1) { bad(k + " distractor equals answer: " + labels.join(" | ") + " :: " + p.text); break; }
  }
}
console.log(fail ? fail + " problem(s)" : "All checks passed: " + Q.length + " questions, " + W.FACTS.length + " flashcards, " + Object.keys(G).length + " math generators");
process.exit(fail ? 1 : 0);
