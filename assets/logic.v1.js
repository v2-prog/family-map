/* Family Map: pure logic (version 1). No DOM, no network. Ported from the original
   Claude Design component so behaviour is unchanged; unit-tested in tests/logic.test.mjs. */
(function (root) {
  "use strict";
  var L = {};
  L.STORAGE_KEY = "familymap.au.household.v1";
  L.STATES = ["ACT", "NSW", "VIC", "QLD", "WA", "SA", "TAS", "NT"];
  L.RELS = ["parent", "grandparent", "partner", "child", "grandchild"];
  L.CAP = { parent: 4, grandparent: 4, partner: 1, child: 6, grandchild: 6 };
  L.REL_NAME = { me: "You", parent: "Parent", grandparent: "Grandparent", partner: "Partner", child: "Child", grandchild: "Grandchild" };
  L.HOME = [{ v: "", t: "Not set", short: "" }, { v: "with-you", t: "With you", short: "with you" }, { v: "own", t: "Own home", short: "own home" }, { v: "alone", t: "Living alone", short: "alone" }, { v: "renting", t: "Renting", short: "renting" }, { v: "share", t: "Share house", short: "share house" }, { v: "village", t: "Retirement village", short: "village" }, { v: "care", t: "Aged care home", short: "care home" }];
  L.HOMES = L.HOME.map(function (h) { return h.v; });
  L.BRANCHES = ["Safety net", "Building", "Established", "Structuring"];
  L.BRANCH_LOWER = ["safety-net topics", "building topics", "established topics", "structuring topics"];

  function clampAge(a) { a = Math.round(Number(a)); return isFinite(a) ? Math.max(0, Math.min(98, a)) : null; }
  L.clampAge = clampAge;
  L.band = function (a) { return a + "–" + (a + 1); };
  L.homeShort = function (h) { var x = L.HOME.filter(function (o) { return o.v === h; })[0]; return x ? x.short : ""; };

  /* ---------- Household state ---------- */
  L.defaults = function () {
    return { mode: "guided", st: "ACT", meAge: 40, meHome: "", members: [{ id: "m1", rel: "parent", label: "Mum", age: 68, home: "" }, { id: "m2", rel: "parent", label: "Dad", age: 70, home: "" }, { id: "m3", rel: "child", label: "Child 1", age: 12, home: "with-you" }], nid: 4, who: null };
  };
  L.snap = function (s) { return JSON.stringify({ v: 1, mode: s.mode, st: s.st, meAge: s.meAge, meHome: s.meHome, members: s.members, nid: s.nid, who: s.who }); };
  L.isDefault = function (s) { return L.snap(s) === L.snap(L.defaults()); };
  /** Validate stored data (same rules as the original). Returns a clean household or null. */
  L.clean = function (o) {
    if (!o || typeof o !== "object" || o.v !== 1) { return null; }
    var seen = {}, count = {}, maxId = 0;
    var members = (Array.isArray(o.members) ? o.members : []).filter(function (m) {
      if (!m || typeof m.id !== "string" || !/^m[0-9]{1,6}$/.test(m.id) || seen[m.id]) { return false; }
      if (L.RELS.indexOf(m.rel) < 0 || clampAge(m.age) === null) { return false; }
      count[m.rel] = (count[m.rel] || 0) + 1; if (count[m.rel] > L.CAP[m.rel]) { return false; }
      seen[m.id] = 1; maxId = Math.max(maxId, parseInt(m.id.slice(1), 10)); return true;
    }).map(function (m) { return { id: m.id, rel: m.rel, label: String(m.label === null || m.label === undefined ? "" : m.label).slice(0, 14), age: clampAge(m.age), home: L.HOMES.indexOf(m.home) >= 0 ? m.home : "" }; });
    var me = clampAge(o.meAge);
    return {
      mode: o.mode === "quick" ? "quick" : "guided", st: L.STATES.indexOf(o.st) >= 0 ? o.st : "ACT", meAge: me === null ? 40 : me,
      meHome: L.HOMES.indexOf(o.meHome) >= 0 ? o.meHome : "", members: members,
      nid: Math.max(maxId + 1, Number.isInteger(o.nid) ? o.nid : 0, 1),
      who: (o.who === "me" || seen[o.who]) ? o.who : null
    };
  };
  L.everyone = function (s) { return [{ id: "me", rel: "me", label: "You", age: s.meAge, home: s.meHome }].concat(s.members); };
  L.newMember = function (s, rel) {
    var A = s.meAge; var ev = function (v) { return Math.max(0, Math.min(98, v - (v % 2))); };
    var same = s.members.filter(function (m) { return m.rel === rel; });
    var defs = { parent: ["Mum", "Dad", "Parent 3", "Parent 4"], grandparent: ["Nan", "Pop", "Grandparent 3", "Grandparent 4"] };
    var label;
    if (defs[rel]) { label = defs[rel].filter(function (x) { return !same.some(function (m) { return m.label === x; }); })[0] || ("Parent " + (same.length + 1)); }
    else if (rel === "partner") { label = "Partner"; }
    else if (rel === "child") { label = "Child " + (same.length + 1); }
    else { label = "Grandchild " + (same.length + 1); }
    var ages = { parent: ev(A + 28), grandparent: ev(A + 56), partner: ev(A), child: ev(A - 28), grandchild: ev(A - 56) };
    return { id: "m" + s.nid, rel: rel, label: label, age: ages[rel], home: "" };
  };

  /* ---------- Topic tree ---------- */
  L.index = function (nodes) {
    var by = {}, kids = {};
    nodes.forEach(function (n) { by[n.id] = n; });
    nodes.forEach(function (n) { if (n.parent) { (kids[n.parent] = kids[n.parent] || []).push(n.id); } });
    var depth = function (id) { var d = 0, n = by[id]; while (n && n.parent) { d++; n = by[n.parent]; } return d; };
    var dom = function (id) { var n = by[id]; while (n.parent) { n = by[n.parent]; } return n.id; };
    var isAnc = function (a, b) { var n = by[b]; while (n && n.parent) { if (n.parent === a) { return true; } n = by[n.parent]; } return false; };
    var chain = function (id) { var out = [], n = by[id]; while (n) { out.unshift(n.id); n = n.parent ? by[n.parent] : null; } return out; };
    var doms = nodes.filter(function (n) { return !n.parent; }).map(function (n) { return n.id; });
    var flat = []; var walk = function (id) { flat.push(id); (kids[id] || []).forEach(walk); }; doms.forEach(walk);
    return { by: by, kids: kids, depth: depth, dom: dom, isAnc: isAnc, chain: chain, doms: doms, flat: flat };
  };

  /* ---------- Emphasis ---------- */
  L.prior = function (a) { if (a < 22) { return [0.55, 0.33, 0.09, 0.03]; } if (a < 30) { return [0.25, 0.5, 0.2, 0.05]; } if (a < 45) { return [0.1, 0.35, 0.4, 0.15]; } if (a < 60) { return [0.08, 0.25, 0.37, 0.3]; } if (a < 75) { return [0.25, 0.2, 0.28, 0.27]; } return [0.35, 0.2, 0.22, 0.23]; };
  /** Emphasis weights from your age prior and opened-topic behaviour (capped, floored, normalised). */
  L.weights = function (meAge, beh) {
    var pr = L.prior(meAge);
    var tot = beh.reduce(function (a, b) { return a + b; }, 0);
    var lam = tot / (tot + 4) * 0.75;
    var W = pr.map(function (p, i) { return (1 - lam) * p + lam * (tot > 0 ? beh[i] / tot : 0); });
    W = W.map(function (w) { return Math.max(w, 0.06); });
    var sum = W.reduce(function (a, b) { return a + b; }, 0);
    return W.map(function (w) { return w / sum; });
  };
  L.dot = function (tg, W) { return tg.reduce(function (a, t, i) { return a + t * W[i]; }, 0); };
  L.rel = function (d, a) {
    if (d === "d_income") { return a < 25 ? 1 : (a < 60 ? 0.5 : 0.9); }
    if (d === "d_super") { return a < 16 ? 0.2 : (a < 24 ? 0.6 : 0.9); }
    if (d === "d_est") { return a < 28 ? 0.1 : (a < 40 ? 0.5 : 0.9); }
    if (d === "d_agedcare") { return a >= 62 ? 1 : (a >= 44 ? 0.55 : 0.1); }
    if (d === "d_property") { return a < 22 ? 0.1 : (a < 58 ? 0.9 : 0.45); }
    if (d === "d_family") { return a < 18 ? 0.2 : (a < 56 ? 0.9 : 0.5); }
    if (d === "d_early") { return a < 12 ? 1 : (a < 18 ? 0.5 : (a < 45 ? 0.35 : 0.15)); }
    if (d === "d_living") { return a < 20 ? 0.5 : (a < 30 ? 0.8 : (a < 60 ? 0.5 : 0.9)); }
    return 0.5;
  };
  /** Rank topic ids for a person: 60% emphasis fit, 40% age relevance of the area. */
  L.rank = function (ids, T, W, age, visited) {
    var arr = ids.map(function (id) {
      var n = T.by[id];
      return { id: id, title: n.title, short: L.firstSentence(n.summary), score: 0.6 * L.dot(n.weights, W) + 0.4 * L.rel(T.dom(id), age), match: L.dot(n.weights, W), visited: !!(visited && visited[id]) };
    }).sort(function (a, b) { return b.score - a.score; });
    arr.forEach(function (c, i) { c.badge = (i === 0 && arr.length > 1) ? "Most relevant now" : (c.match < 0.2 ? "Less typical for now, still here" : ""); c.top = i === 0 && arr.length > 1; });
    return arr;
  };
  L.firstSentence = function (t) { var i = t.indexOf(". "); return i > 0 ? t.slice(0, i + 1) : t; };
  L.stageOf = function (a, stages) { return stages.filter(function (x) { return a >= x.from && a <= x.to; })[0] || stages[stages.length - 1]; };
  L.join = function (names) { return names.length < 2 ? names.join("") : names.slice(0, -1).join(", ") + " and " + names[names.length - 1]; };

  /* ---------- Linked topics where lives overlap ---------- */
  var ROW = { grandparent: "gp", parent: "par", child: "kid", grandchild: "gk", partner: "me", me: "me" };
  L.overlaps = function (s, T, W) {
    var A = s.meAge, all = L.everyone(s), me = all[0];
    var by = function (r) { return s.members.filter(function (m) { return m.rel === r; }); };
    var gp = by("grandparent"), par = by("parent"), kid = by("child"), gk = by("grandchild"), pt = by("partner");
    var elders = gp.concat(par), adult = A >= 25, ovs = [];
    function mk(id, label, root, tg, ms, aT, bT, solo) {
      if (!ms.length) { return; }
      var others = ms.filter(function (m) { return m.id !== "me"; });
      var first = others[0] || ms[0];
      ovs.push({ id: id, label: label, root: root, tg: tg, ms: ms, others: others, aT: aT || "", bT: bT || "", solo: !!solo || others.length === 0, row: ROW[first.rel], age: Math.max.apply(null, ms.map(function (m) { return m.age; })) });
    }
    mk("care", "Aged care ↔ your estate plan", "a_estate", [0.5, 0.5, 0.8, 0.7], adult ? elders.filter(function (m) { return m.age >= 62; }) : [], "Assessment through My Aged Care, then means-tested fees and an accommodation payment. How these are paid shapes what remains in the estate.", "Your own will, powers of attorney and who manages money for {n} should be planned together, so one decision does not undercut the other.");
    mk("bequest", "Super death benefit ↔ your bequest", "s_death", [0.2, 0.4, 0.9, 0.9], adult ? elders.filter(function (m) { return m.age >= 54; }) : [], "Super is usually paid under the fund rules and any nomination on file, not under a will.", "Part of a benefit paid to an adult child can be taxed. Your own super choices today decide what you could pass on later.");
    mk("pension", "Age Pension and gifting", "i_gift", [0.8, 0.5, 0.4, 0.3], adult ? elders.filter(function (m) { return m.age >= 58; }) : [], "Age Pension income and assets tests apply, and gifts and care fees can change the result.", "Helping you early can trigger gifting rules, so timing matters for their payments and for your own plans.");
    mk("carer", "Caring for family ↔ your work", "f_carer", [0.8, 0.6, 0.3, 0.1], (adult && A < 72) ? elders.filter(function (m) { return m.age >= 72; }) : [], "Care needs usually rise with age and health, and respite and carer supports exist.", "Caring can cut paid work and super, so plan for both. Talk early with {n} and the rest of the family.");
    mk("living", "Living together ↔ money and housing", "l_family", [0.6, 0.6, 0.7, 0.7], all.filter(function (m) { return m.home === "with-you" && m.id !== "me" && m.rel !== "partner" && (m.rel === "parent" || m.rel === "grandparent" || m.age >= 18); }), "Living in a family home can change pension, tax and who owns what. A written agreement protects everyone.", "Settle shared costs, any payment for a room or granny flat, and what happens if the arrangement ends.");
    mk("alone", "Living alone ↔ support at home", "l_alone", [0.7, 0.6, 0.6, 0.5], all.filter(function (m) { return m.home === "alone"; }), "Living alone raises the value of home support, safety checks and a plan if health changes.", "Staying in touch and knowing who holds authority to act helps when {n} needs support.");
    mk("village", "Retirement village ↔ contracts and pension", "l_down", [0.4, 0.5, 0.8, 0.8], all.filter(function (m) { return m.home === "village"; }), "Village contracts can carry exit fees and affect the Age Pension. Get independent advice first.", "Family often helps review contracts and should know where the documents are.");
    mk("resid", "Residential care ↔ family finances", "a_cost", [0.6, 0.6, 0.7, 0.8], all.filter(function (m) { return m.home === "care"; }), "Residential care fees are means-tested, with a choice of accommodation payment.", "How the fees are paid affects the estate and any help you give.");
    mk("rent", "Renting ↔ support and costs", "l_rent", [1, 0.6, 0.1, 0], all.filter(function (m) { return m.home === "renting"; }), "Rent takes a large share of income, and Rent Assistance or concessions may help.", "If you help with rent, note the gifting rules and your own cash flow.");
    mk("share", "Share house ↔ costs of leaving home", "l_share", [0.8, 0.7, 0.1, 0], all.filter(function (m) { return m.home === "share"; }), "Bond, upfront costs and shared bills arrive together. Know your tenancy rights.", "If you help with the bond or rent, agree what is a gift and what is a loan.");
    mk("pfam", A >= 16 ? "Youth payments ↔ family income" : "Family costs ↔ your household", A >= 16 ? "i_youth" : (A >= 12 ? "f_kids" : "y_school"), [0.8, 0.6, 0.3, 0.1], A < 25 ? par : [], "Parents income can count for youth and student payments until independence tests are met.", "Your own earnings and savings start here: a tax file number, a first account and pocket money.");
    mk("teen", "Youth payments ↔ your income", "i_youth", [0.6, 0.5, 0.4, 0.2], kid.filter(function (m) { return m.age >= 16 && m.age <= 24; }), "Youth Allowance and similar payments can depend on parents income until independence tests are met.", "Your income and cash flow decide what support the household can reach, and what to set aside.");
    mk("kids", "Costs of kids ↔ your cash flow", "f_kids", [0.6, 0.6, 0.4, 0.2], kid.filter(function (m) { return m.age >= 6 && m.age <= 15; }), "School, devices and activities cost more each year, and costs rise again in the teens.", "Family payments and subsidies depend on household income and hours worked.");
    mk("early", "Child care and early years ↔ your work", "y_care", [0.6, 0.6, 0.4, 0.2], kid.filter(function (m) { return m.age < 6; }), "Early years bring child care costs, leave and a first savings account.", "The Child Care Subsidy and parental leave interact with your work hours.");
    mk("firstjob", "First job, tax file number and super", "s_low", [0.8, 0.7, 0.1, 0], kid.filter(function (m) { return m.age >= 15; }), "", "", true);
    mk("grand", "Gifts and help for grandchildren", "i_gift", [0.5, 0.5, 0.6, 0.5], A >= 40 ? gk : [], "Gifts for school, savings or a first car are common.", "Large gifts can count under pension rules, and money in a child name can be taxed differently.");
    mk("couple", "Couple finances: super and wills", "s_couple", [0.3, 0.6, 0.8, 0.7], pt, "Their super, will and powers of attorney matter as much as yours.", "Keep both sets of documents in step: wills, nominations and who decides if one of you cannot.");
    mk("selfme", A < 12 ? "Pocket money and first savings" : (A < 24 ? "Your first jobs, tax and super" : (A < 60 ? "Your super and tax position" : (A < 75 ? "Your retirement income" : "Your own aged care options"))), A < 12 ? "y_save" : (A < 24 ? "s_low" : (A < 60 ? "s_grow" : (A < 75 ? "s_ret" : "a_start"))), [0.5, 0.6, 0.7, 0.6], [me], "", "", true);
    ovs.forEach(function (o) { o.score = 0.6 * L.dot(o.tg, W) + 0.4 * L.rel(T.dom(o.root), o.age); });
    return ovs;
  };
  /** Assign overlaps to lanes beside each generation row; cap per lane, overflow to "more". */
  L.lanes = function (ovs, s) {
    var has = function (r) { return s.members.some(function (m) { return m.rel === r; }); };
    var rows = []; if (has("grandparent")) { rows.push("gp"); } if (has("parent")) { rows.push("par"); } rows.push("me"); if (has("child")) { rows.push("kid"); } if (has("grandchild")) { rows.push("gk"); }
    var lanes = {}, extra = [];
    ovs.forEach(function (o) { var key = o.row === "me" ? "me" : o.row; (lanes[key] = lanes[key] || []).push(o); });
    var drawn = [];
    Object.keys(lanes).forEach(function (k) {
      var list = lanes[k].slice().sort(function (a, b) { return b.score - a.score; });
      var cap = k === "me" ? 2 : 4;
      lanes[k] = list.slice(0, cap);
      list.slice(cap).forEach(function (o) { extra.push(o); });
      drawn = drawn.concat(lanes[k]);
    });
    var order = drawn.slice().sort(function (a, b) { return b.score - a.score; });
    drawn.forEach(function (o) { var r = order.indexOf(o); o.kind = r < 2 ? "hi" : (r < 4 ? "mid" : "lo"); o.pulse = r === 0; });
    return { rows: rows, lanes: lanes, extra: extra };
  };

  /* ---------- Figures for a person ---------- */
  L.figuresFor = function (a0, F, W, stages) {
    var hasPage = a0 >= 12 && a0 <= 80;
    var out = { age: a0, hasPage: hasPage, stage: L.stageOf(a0, stages).name };
    out.rowName = hasPage ? ["Mountain View", "Bronze", "Khaki", "Stormy Weather", "Dusty Cedar", "Ocean Depths", "Silver Birch"][Math.floor((a0 - 12) / 10)] : "";
    out.url = hasPage ? "https://coeconomics.com/age-" + a0 + "-" + (a0 + 1) + ".html" : "https://coeconomics.com/";
    var bd = F.bands[String(a0)];
    out.cons = null; out.draft = ""; out.missing = "";
    if (bd && bd.considerations) { out.cons = bd.considerations; }
    else if (a0 === 64) { out.missing = "The coeconomics.com page for ages 64–65 could not be read on 28 October 2026, so its five considerations are missing here. Figures and income scenarios below still apply."; }
    else if (a0 < 6) { out.cons = F.drafts.early; out.draft = "Planner draft, adapted from the 12–13 page. Not on coeconomics.com. Verify before use."; }
    else if (a0 < 12) { out.cons = F.drafts.school; out.draft = "Planner draft, adapted from the 12–13 page. Not on coeconomics.com. Verify before use."; }
    else { out.cons = F.bands["80"].considerations; out.draft = "Carried forward from the 80–81 page. coeconomics.com has no page above 81. Verify before use."; }
    var inc = F.income.filter(function (r) { return a0 + 1 >= r.from && a0 + 1 <= r.to; })[0] || null;
    out.income = inc;
    var proKey = a0 < 18 ? "teen" : (a0 < 30 ? "young" : (a0 < 45 ? "fam" : (a0 < 60 ? "mid" : (a0 < 75 ? "ret" : "old"))));
    var fit = [W[0] + 0.5 * W[1], 0.5 * W[1] + 0.5 * W[2], 0.5 * W[2] + W[3]];
    var best = fit.indexOf(Math.max.apply(null, fit));
    var names = [["Lower income", "bottom 10%"], ["Middle income", "40th to 60th percentile"], ["Higher income", "top 10%"]];
    out.scenarios = inc ? [0, 1, 2].map(function (i) {
      return { name: names[i][0], pct: names[i][1], range: [inc.lower, inc.middle, inc.higher][i], focus: bd && bd.focus ? bd.focus[i] : "", pros: F.professionals[proKey][i], best: i === best };
    }) : [];
    var lab = function (lo, hi) { return lo === 0 ? "Under " + (hi + 1) : "Ages " + lo + "–" + hi; };
    var hit = F.figures.filter(function (f) { return f.from <= a0 + 1 && f.to >= a0; }).sort(function (x, y) { return (F.topics.order.indexOf(x.topic) - F.topics.order.indexOf(y.topic)) || (x.from - y.from); });
    out.figures = hit.map(function (f, i) { return { topic: F.topics.title[f.topic], showTopic: i === 0 || hit[i - 1].topic !== f.topic, group: f.group || lab(f.from, f.to), text: f.text, source: f.source }; });
    return out;
  };

  /* ---------- Support for an area ---------- */
  L.supportFor = function (dom, W, orgs, state) {
    return orgs.filter(function (o) { return o.areas.indexOf("*") >= 0 || o.areas.indexOf(dom) >= 0; })
      .map(function (o) { return { o: o, score: L.dot(o.weights, W) }; })
      .sort(function (a, b) { return b.score - a.score; })
      .map(function (x) {
        var o = x.o; var url = o.stateKey ? (state[o.stateKey + "Url"] || "") : "";
        return { id: o.id, name: o.stateKey ? state[o.stateKey] : o.name, kind: o.kind, note: o.note, phone: o.phone, url: url };
      });
  };

  /* ---------- State note for a topic ---------- */
  L.stateNote = function (n, S) {
    if (n.stateNote === "fp") { return { text: S.fp + " Claim time limits and which assets count are state-specific.", link: S.fpUrl || "", linkText: "Read the Act on the official legislation register" }; }
    if (n.stateNote === "tt") { return { text: "Family provision: " + S.fp + " Ask " + S.revenue + " how land tax treats trust-held property, and note that how long a trust can last differs by state.", link: S.fpUrl || "", linkText: "Read the Act on the official legislation register" }; }
    if (n.stateNote === "rev") {
      var x = n.id === "p_home" && S.revX;
      return { text: "Check current thresholds and concessions with " + S.revenue + "." + (x ? " " + S.revX : ""), link: (n.id === "p_home" && S.revXUrl) || S.revenueUrl || "", linkText: "Open " + S.revenue + (n.id === "p_home" && S.revXUrl ? ": Home Buyer Concession Scheme" : "") };
    }
    return null;
  };

  root.FM_LOGIC = L;
})(typeof window !== "undefined" ? window : globalThis);
