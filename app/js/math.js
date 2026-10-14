/* Math Lab problem generators: fresh numbers every time, each with a worked solution.
   Each make() returns {text, answer, choices (choices[0] is the answer), f (formatter), work}. */
(function () {
  "use strict";
  var A = window.FBF, rnd = A.rnd, pick = A.pick, money = A.money, art = A.art;
  function money0(v) { return money(Math.round(v)); }
  function pctf(v) { return (Math.round(v * 100) / 100).toFixed(2) + "%"; }
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
  A.GEN = GEN;
  /** Regenerate until the four choices are distinct once formatted. */
  A.makeProblem = function (t) {
    for (var guard = 0; guard < 40; guard++) {
      var p = GEN[t].make(), seen = {}, ok = true;
      p.choices.forEach(function (c) { var k = p.f(c); if (seen[k] || !isFinite(c)) ok = false; seen[k] = 1; });
      if (ok && p.choices.length === 4) return p;
    }
    return null;
  };
})();
