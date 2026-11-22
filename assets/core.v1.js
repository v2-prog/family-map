/* STUR shared core, version 1. Classic script, no modules, no network.
   Loaded in <head> so it can mark the page as JS-enabled before render.
   Any change to this file's content means a new file name (core.v2.js). */
(function (root) {
  "use strict";

  var doc = typeof document !== "undefined" ? document : null;
  if (doc && doc.documentElement) { doc.documentElement.classList.add("js"); }

  var STUR = {};
  STUR.version = "1";

  /* ---------- Time (overridable in tests) ---------- */
  STUR._now = null;
  STUR.now = function () { return STUR._now ? new Date(STUR._now.getTime()) : new Date(); };

  /* ---------- DOM builder (no innerHTML, no inline style) ---------- */
  function h(tag, attrs) {
    var el = doc.createElement(tag);
    var a = attrs || {};
    Object.keys(a).forEach(function (k) {
      var v = a[k];
      if (v === null || v === undefined || v === false) { return; }
      if (k === "class") { el.className = v; }
      else if (k === "text") { el.textContent = String(v); }
      else if (k === "on") { Object.keys(v).forEach(function (ev) { el.addEventListener(ev, v[ev]); }); }
      else if (k === "style") { throw new Error("Inline style is not allowed (CSP)."); }
      else if (k === "props") { Object.keys(v).forEach(function (p) { el[p] = v[p]; }); }
      else if (k.indexOf("on") === 0 && k.length > 2 && k !== "only") { throw new Error("Inline handlers are not allowed (CSP)."); }
      else if (v === true) { el.setAttribute(k, ""); }
      else { el.setAttribute(k, String(v)); }
    });
    for (var i = 2; i < arguments.length; i++) { append(el, arguments[i]); }
    return el;
  }
  function append(el, child) {
    if (child === null || child === undefined || child === false) { return el; }
    if (Array.isArray(child)) { child.forEach(function (c) { append(el, c); }); return el; }
    if (typeof child === "string" || typeof child === "number") { el.appendChild(doc.createTextNode(String(child))); return el; }
    el.appendChild(child);
    return el;
  }
  function svg(tag, attrs) {
    var el = doc.createElementNS("http://www.w3.org/2000/svg", tag);
    var a = attrs || {};
    Object.keys(a).forEach(function (k) {
      var v = a[k];
      if (v === null || v === undefined || v === false) { return; }
      if (k === "text") { el.textContent = String(v); }
      else if (k === "class") { el.setAttribute("class", v); }
      else if (k === "on") { Object.keys(v).forEach(function (ev) { el.addEventListener(ev, v[ev]); }); }
      else if (k === "style") { throw new Error("Inline style is not allowed (CSP)."); }
      else { el.setAttribute(k, String(v)); }
    });
    for (var i = 2; i < arguments.length; i++) { append(el, arguments[i]); }
    return el;
  }
  function clear(el) { while (el && el.firstChild) { el.removeChild(el.firstChild); } return el; }
  function $(sel, ctx) { return (ctx || doc).querySelector(sel); }
  function $all(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }
  STUR.h = h; STUR.svg = svg; STUR.append = append; STUR.clear = clear; STUR.$ = $; STUR.$all = $all;

  /* ---------- Formatting ---------- */
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  function parseISO(iso) {
    if (!iso || typeof iso !== "string") { return null; }
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    if (!m) { return null; }
    var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    if (d.getUTCMonth() !== +m[2] - 1) { return null; }
    return d;
  }
  STUR.parseISO = parseISO;
  STUR.fmtDate = function (iso) {
    var d = parseISO(iso);
    if (!d) { return iso ? String(iso) : "not recorded"; }
    return d.getUTCDate() + " " + MONTHS[d.getUTCMonth()] + " " + d.getUTCFullYear();
  };
  STUR.todayISO = function () {
    var n = STUR.now();
    return n.getFullYear() + "-" + String(n.getMonth() + 1).padStart(2, "0") + "-" + String(n.getDate()).padStart(2, "0");
  };
  STUR.fmtMoney = function (n, opts) {
    if (n === null || n === undefined || n === "" || isNaN(Number(n))) { return "Not captured"; }
    var v = Number(n);
    var cents = (opts && opts.cents) || Math.round(v * 100) % 100 !== 0;
    var neg = v < 0;
    var s = Math.abs(v).toLocaleString("en-AU", { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 });
    return (neg ? "-$" : "$") + s;
  };
  STUR.fmtNum = function (n, dp) {
    if (n === null || n === undefined || isNaN(Number(n))) { return "Not captured"; }
    return Number(n).toLocaleString("en-AU", { minimumFractionDigits: dp || 0, maximumFractionDigits: dp === undefined ? 2 : dp });
  };
  STUR.fmtPct = function (n) {
    if (n === null || n === undefined || isNaN(Number(n))) { return "Not captured"; }
    var v = Number(n);
    return (Math.round(v * 1000) / 1000).toLocaleString("en-AU", { maximumFractionDigits: 3 }) + "%";
  };
  /** Format a figure value with its unit. Structured objects are handled by the caller. */
  STUR.fmtValue = function (value, unit) {
    if (value === null || value === undefined) { return "Not captured yet"; }
    if (typeof value === "string") { return value; }
    if (typeof value === "number") {
      switch (unit) {
        case "AUD": return STUR.fmtMoney(value);
        case "AUD/fortnight": return STUR.fmtMoney(value) + " a fortnight";
        case "AUD/year": return STUR.fmtMoney(value) + " a year";
        case "AUD/week": return STUR.fmtMoney(value) + " a week";
        case "percent": return STUR.fmtPct(value);
        case "percent/year": return STUR.fmtPct(value) + " a year";
        case "years": return value + (value === 1 ? " year" : " years");
        case "age": return "age " + value;
        case "days": return value + " days";
        case "months": return value + " months";
        case "kWh": return value + " kWh";
        case "count": return STUR.fmtNum(value, 0);
        default: return STUR.fmtNum(value) + (unit ? " " + unit : "");
      }
    }
    return String(value);
  };

  /* ---------- Freshness ---------- */
  /* Older than 3 years: the item's reference date is before (today minus 3 years).
     Reference date = reference_date if given, else 1 July of source_year (the middle of
     a calendar year; a conservative reading of "a source year before"). Also older if
     last_verified is more than 3 years ago, or older_than_3_years is set true. */
  function threeYearsAgo() { var n = STUR.now(); return new Date(Date.UTC(n.getFullYear() - 3, n.getMonth(), n.getDate())); }
  STUR.referenceDate = function (item) {
    if (!item) { return null; }
    var d = parseISO(item.reference_date);
    if (d) { return d; }
    var y = parseInt(item.source_year, 10);
    if (!isNaN(y)) { return new Date(Date.UTC(y, 6, 1)); }
    return null;
  };
  STUR.isOlderThan3Years = function (item) {
    if (!item) { return false; }
    if (item.older_than_3_years === true) { return true; }
    var cut = threeYearsAgo();
    var ref = STUR.referenceDate(item);
    if (ref && ref < cut) { return true; }
    var lv = parseISO(item.last_verified);
    if (lv && lv < cut) { return true; }
    return false;
  };
  /* Possibly stale: past next_review and not re-verified since, or flagged stale. */
  STUR.isStale = function (item) {
    if (!item) { return false; }
    if (item.confidence === "stale" || item.stale === true || (item.stale_reason && String(item.stale_reason).length > 0)) { return true; }
    var nr = parseISO(item.next_review);
    if (!nr) { return false; }
    var today = parseISO(STUR.todayISO());
    var lv = parseISO(item.last_verified);
    return today > nr && (!lv || lv < nr);
  };
  STUR.freshnessCounts = function (items) {
    var c = { total: 0, needs_checking: 0, older: 0, stale: 0, not_captured: 0 };
    (items || []).forEach(function (it) {
      c.total++;
      if (it.needs_checking) { c.needs_checking++; }
      if (STUR.isOlderThan3Years(it)) { c.older++; }
      if (STUR.isStale(it)) { c.stale++; }
      if (Object.prototype.hasOwnProperty.call(it, "value") && (it.value === null || it.value === undefined)) { c.not_captured++; }
    });
    return c;
  };

  /* ---------- Badges ---------- */
  var BADGE = {
    law: { icon: "✓", text: "Law", tip: "Law: in force or legislated. Still check the official page." },
    announced: { icon: "○", text: "Announced", tip: "Announced: the government has said it will do this. Not law yet." },
    proposed: { icon: "?", text: "Proposed", tip: "Proposed: a bill or idea that may change or never pass. Not law." },
    superseded: { icon: "×", text: "Superseded", tip: "Superseded: replaced by a newer rule. Kept for history." },
    reference: { icon: "#", text: "Statistic", tip: "Statistic or benchmark: a published number that describes people. It is not a rule." },
    check: { icon: "!", text: "Needs checking", tip: "Needs checking: read from an official page but not yet click-checked by a person." },
    old: { icon: "⌛", text: "Older than 3 years", tip: "Older than 3 years: the source or its last check is more than 3 years old." },
    stale: { icon: "↻", text: "Possibly stale", tip: "Possibly stale: past its review date, or carried forward from an earlier year." },
    act: { icon: "◆", text: "ACT", tip: "ACT: applies in the Australian Capital Territory." },
    au: { icon: "◆", text: "Australia-wide", tip: "Australia-wide: a federal rule." },
    state: { icon: "↔", text: "State comparison", tip: "State comparison: shown for comparison only. ACT is the default." },
    illustrative: { icon: "≈", text: "Illustrative", tip: "Illustrative: maths on example inputs. Not a forecast. Not advice." },
    sample: { icon: "!", text: "Sample data", tip: "Sample data: placeholder content to be replaced with the shared file." },
    descriptive: { icon: "•", text: "Descriptive, no source", tip: "Descriptive: a general pattern in plain words, with no figure attached." },
    local: { icon: "+", text: "Proposed for shared file", tip: "Proposed for shared file: a new trigger this app suggests adding to the shared trigger file." }
  };
  STUR.BADGE = BADGE;
  STUR.badge = function (kind, text) {
    var b = BADGE[kind] || { icon: "•", text: kind };
    return h("span", { class: "badge badge--" + kind, "data-icon": b.icon }, text || b.text);
  };
  /** A focusable group of badges whose combined explanation shows on hover, focus and tap. */
  STUR.badgeGroup = function (kinds) {
    var tips = [];
    var labels = [];
    var kids = kinds.filter(Boolean).map(function (k) {
      var kind = typeof k === "string" ? k : k.kind;
      var text = typeof k === "string" ? null : k.text;
      var def = BADGE[kind];
      var label = text || (def ? def.text : kind);
      labels.push(label);
      if (def && def.tip) { tips.push(kind === "verified" ? label : def.tip); }
      return STUR.badge(kind, text);
    });
    var tipText = tips.join("\n");
    return h("span", { class: "badges", role: "group", "aria-label": "Labels: " + labels.join(", "), tabindex: tipText ? "0" : null, "data-tip": tipText || null },
      kids, tipText ? h("span", { class: "visually-hidden" }, " " + tips.join(" ")) : null);
  };
  STUR.statusKind = function (status) {
    return ({ law: "law", announced: "announced", proposed: "proposed", superseded: "superseded", reference: "reference" })[status] || "check";
  };
  STUR.itemBadgeKinds = function (item, extra) {
    var k = [];
    if (item.status) { k.push(STUR.statusKind(item.status)); }
    if (item.needs_checking) { k.push("check"); }
    if (STUR.isOlderThan3Years(item)) { k.push("old"); }
    if (STUR.isStale(item)) { k.push("stale"); }
    var j = item.jurisdiction || "";
    if (j === "ACT") { k.push("act"); }
    else if (j === "AU") { k.push("au"); }
    else if (/comparison/i.test(j)) { k.push("state"); }
    if (item.last_verified) { k.push({ kind: "verified", text: "Last verified " + STUR.fmtDate(item.last_verified) }); }
    (extra || []).forEach(function (e) { k.push(e); });
    return k;
  };
  STUR.itemBadges = function (item, extra) { return STUR.badgeGroup(STUR.itemBadgeKinds(item, extra)); };

  /* ---------- Links and sources ---------- */
  STUR.isHttps = function (u) { return typeof u === "string" && /^https:\/\/[^\s]+$/.test(u); };
  STUR.extLink = function (url, text) {
    if (!STUR.isHttps(url)) { return h("span", { class: "not-captured" }, "Link not captured yet"); }
    return h("a", { href: url, rel: "noopener noreferrer" }, text || url);
  };
  /** "Source: ATO (2026). Last verified 17 November 2026." */
  STUR.sourceLine = function (item) {
    var name = item.source_name || item.source || "Official source";
    var bits = [h("span", null, "Source: "), STUR.extLink(item.source_url, name)];
    if (item.source_year) { bits.push(" (" + item.source_year + ")"); }
    bits.push(". ");
    if (item.verified_basis) { bits.push("Basis: " + item.verified_basis + ". "); }
    return h("p", { class: "source" }, bits);
  };
  STUR.notCaptured = function (url, label) {
    return h("p", { class: "not-captured" }, "Not captured yet. Check the official page", url ? [": ", STUR.extLink(url, label || "official page")] : null, ".");
  };
  STUR.prompts = function (whatToCheck, whoToAsk, headingLevel) {
    var hl = headingLevel || "h4";
    var w = (whatToCheck || []).filter(Boolean);
    var a = Array.isArray(whoToAsk) ? whoToAsk.filter(Boolean) : (whoToAsk ? [whoToAsk] : []);
    if (!w.length && !a.length) { return null; }
    return h("div", { class: "prompts" },
      w.length ? h("div", null, h(hl, null, "What to check"), h("ul", null, w.map(function (t) { return h("li", null, t); }))) : null,
      a.length ? h("div", null, h(hl, null, "Who to ask"), h("ul", null, a.map(function (t) { return h("li", null, t); }))) : null);
  };
  STUR.illustrativeNote = function (assumptions) {
    return h("div", { class: "illustrative-note", role: "note" },
      h("p", null, h("strong", null, "Illustrative only. Not a forecast. Not advice.")),
      assumptions && assumptions.length ? h("div", null, h("p", null, "Assumptions used:"), h("ul", null, assumptions.map(function (a) { return h("li", null, a); }))) : null);
  };

  /* ---------- Cross-link convention v1 ---------- */
  var HASH_KEYS = ["band", "age", "cat", "trigger", "fy", "table", "scenario", "view", "row", "term"];
  var VALUE_RE = /^[a-z0-9._-]{1,80}$/;
  STUR.HASH_KEYS = HASH_KEYS;
  /** Parse "#key=value&..." keeping only allowlisted keys and valid values. Returns {params, rejected}. */
  STUR.parseHash = function (hash) {
    var out = {}; var rejected = [];
    var s = String(hash || "").replace(/^#/, "");
    if (!s) { return { params: out, rejected: rejected }; }
    s.split("&").forEach(function (pair) {
      if (!pair) { return; }
      var i = pair.indexOf("=");
      var k = i === -1 ? pair : pair.slice(0, i);
      var v = i === -1 ? "" : pair.slice(i + 1);
      try { k = decodeURIComponent(k); v = decodeURIComponent(v); } catch (e) { rejected.push(pair); return; }
      if (HASH_KEYS.indexOf(k) === -1) { return; } /* unknown keys are ignored silently */
      if (k === "age") {
        if (!/^\d{1,3}$/.test(v) || +v > 110) { rejected.push(k); return; }
        out.age = parseInt(v, 10); return;
      }
      if (!VALUE_RE.test(v)) { rejected.push(k); return; }
      out[k] = v;
    });
    return { params: out, rejected: rejected };
  };
  STUR.buildHash = function (params) {
    var parts = [];
    HASH_KEYS.forEach(function (k) {
      if (!params || params[k] === undefined || params[k] === null || params[k] === "") { return; }
      var v = String(params[k]);
      if (k === "age" ? !/^\d{1,3}$/.test(v) || +v > 110 : !VALUE_RE.test(v)) { return; }
      parts.push(k + "=" + v);
    });
    return parts.length ? "#" + parts.join("&") : "";
  };
  STUR.setHash = function (params, replace) {
    var hstr = STUR.buildHash(params);
    var url = root.location.pathname + root.location.search + hstr;
    try { root.history[replace ? "replaceState" : "pushState"](null, "", url); } catch (e) { root.location.hash = hstr; }
  };
  STUR.hostUrl = function (app) {
    var hosts = root.STUR_HOSTS || {};
    return hosts[app] || null;
  };
  STUR.appLink = function (app, params, page) {
    var base = STUR.hostUrl(app);
    if (!base) { return null; }
    if (app === "cc") { return base + "/"; } /* cc deep-link format unconfirmed: root only */
    return base + "/" + (page || "") + STUR.buildHash(params || {});
  };
  /** Fill href on a[data-stur] from the hosts file. data-stur-hash="band=44-45", data-stur-page="tables.html". */
  STUR.fillSturLinks = function (ctx) {
    $all("a[data-stur]", ctx).forEach(function (a) {
      var app = a.getAttribute("data-stur");
      var params = STUR.parseHash(a.getAttribute("data-stur-hash") || "").params;
      var url = STUR.appLink(app, params, a.getAttribute("data-stur-page") || "");
      if (url) { a.setAttribute("href", url); }
    });
  };
  STUR.sturLink = function (app, params, text, page) {
    var url = STUR.appLink(app, params, page);
    /* Host names live only in assets/hosts.v1.js; if it failed to load, link to this page's sources list. */
    return h("a", { href: url || "sources.html", "data-stur": app }, text);
  };
  STUR.APP_NAMES = { wt: "Wealth tables", ec: "Economic band", fn: "Family wealth", ev: "Eco-village scenarios", cc: "Concentric Circles planner", hub: "STUR hub" };

  /* ---------- Bands ---------- */
  STUR.bandIdForAge = function (age) {
    var a = parseInt(age, 10);
    if (isNaN(a) || a < 0) { return null; }
    if (a < 12) { return "child-0-11"; }
    if (a >= 86) { return "86-plus"; }
    var lo = a % 2 === 0 ? a : a - 1;
    return lo + "-" + (lo + 1);
  };
  STUR.bandRange = function (bandId) {
    if (bandId === "child-0-11") { return { from: 0, to: 11 }; }
    if (bandId === "86-plus") { return { from: 86, to: null }; }
    var m = /^(\d{1,2})-(\d{1,2})$/.exec(bandId || "");
    if (!m) { return null; }
    var f = +m[1], t = +m[2];
    if (t !== f + 1 || f % 2 !== 0 || f < 12 || f > 84) { return null; }
    return { from: f, to: t };
  };
  STUR.bandLabel = function (bandId) {
    if (bandId === "child-0-11") { return "Child, 0 to 11"; }
    if (bandId === "86-plus") { return "86 and over"; }
    var r = STUR.bandRange(bandId);
    return r ? "Ages " + r.from + " to " + r.to : String(bandId);
  };
  /** All canonical band ids, optionally limited to an age range (inclusive). */
  STUR.allBands = function (min, max) {
    var out = [];
    var lo = min === undefined ? 0 : min;
    var hi = max === undefined ? 200 : max;
    if (lo <= 11) { out.push("child-0-11"); }
    for (var a = 12; a <= 84; a += 2) { if (a + 1 >= lo && a <= hi) { out.push(a + "-" + (a + 1)); } }
    if (hi >= 86) { out.push("86-plus"); }
    return out;
  };
  STUR.bandsForRange = function (from, to) {
    var f = from === null || from === undefined ? 0 : from;
    var t = to === null || to === undefined ? 200 : to;
    return STUR.allBands(0, 200).filter(function (b) {
      var r = STUR.bandRange(b);
      var bt = r.to === null ? 200 : r.to;
      return r.from <= t && bt >= f;
    });
  };

  /* ---------- Triggers (shared file, contract vilo-triggers.v2) ---------- */
  var TRIGGER_CATEGORIES = ["super", "tax", "health", "property", "housing", "first-home", "energy", "childcare", "cost-of-living", "disability", "retirement-income", "aged-care", "estate", "car", "family"];
  STUR.TRIGGER_CATEGORIES = TRIGGER_CATEGORIES;
  STUR.CATEGORY_LABELS = { super: "Super", tax: "Tax", health: "Health", property: "Property", housing: "Housing", "first-home": "First home", energy: "Energy", childcare: "Childcare", "cost-of-living": "Cost of living", disability: "Disability", "retirement-income": "Retirement income", "aged-care": "Aged care", estate: "Estate", car: "Car", family: "Family" };
  STUR.validateTrigger = function (t) {
    var errs = [];
    if (!t || typeof t !== "object") { return ["not an object"]; }
    if (typeof t.trigger_id !== "string" || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(t.trigger_id)) { errs.push("trigger_id must be kebab-case"); }
    if (typeof t.title !== "string" || !t.title) { errs.push("title missing"); }
    if (t.status && ["law", "announced", "proposed", "superseded"].indexOf(t.status) === -1) { errs.push("bad status"); }
    if (t.age_from !== null && t.age_from !== undefined && typeof t.age_from !== "number") { errs.push("age_from must be a number or null"); }
    if (t.age_to !== null && t.age_to !== undefined && typeof t.age_to !== "number") { errs.push("age_to must be a number or null"); }
    return errs;
  };
  /** Read window.VILO_TRIGGERS safely and merge optional local proposed triggers. */
  STUR.loadTriggers = function (localProposed) {
    var src = root.VILO_TRIGGERS;
    var res = { ok: false, sample: false, meta: null, triggers: [], invalid: [], error: null, byId: {} };
    if (!src || typeof src !== "object") { res.error = "The shared trigger file (assets/triggers.v2.js) is missing or did not load."; }
    else if (!Array.isArray(src.triggers)) { res.error = "The shared trigger file is malformed: it has no triggers list."; }
    else {
      res.meta = src.meta || {};
      if (res.meta.schema && res.meta.schema !== "vilo-triggers.v2") { res.error = "The shared trigger file uses schema '" + res.meta.schema + "', expected 'vilo-triggers.v2'."; }
      res.sample = res.meta.sample === true;
      src.triggers.forEach(function (t) {
        var e = STUR.validateTrigger(t);
        if (e.length) { res.invalid.push({ id: t && t.trigger_id, errors: e }); return; }
        if (!t.bands || !t.bands.length) { t.bands = STUR.bandsForRange(t.age_from, t.age_to); }
        res.triggers.push(t); res.byId[t.trigger_id] = t;
      });
      res.ok = !res.error;
    }
    (localProposed || []).forEach(function (t) {
      if (STUR.validateTrigger(t).length || res.byId[t.trigger_id]) { return; }
      t._local = true;
      if (!t.bands || !t.bands.length) { t.bands = STUR.bandsForRange(t.age_from, t.age_to); }
      res.triggers.push(t); res.byId[t.trigger_id] = t;
    });
    return res;
  };
  STUR.triggerAppliesToAge = function (t, age) {
    var f = t.age_from === null || t.age_from === undefined ? 0 : t.age_from;
    var to = t.age_to === null || t.age_to === undefined ? Infinity : t.age_to;
    return age >= f && age <= to;
  };
  STUR.triggerAgeText = function (t) {
    var who = t.age_basis === "child" ? "Child aged " : "Age ";
    var f = t.age_from, to = t.age_to;
    if ((f === null || f === undefined || f === 0) && (to === null || to === undefined)) { return "Any age"; }
    if (to === null || to === undefined) { return who + f + " and over"; }
    if (f === null || f === undefined || f === 0) { return who + "up to " + to; }
    if (f === to) { return who + f; }
    return who + f + " to " + to;
  };
  STUR.triggerBadgeKinds = function (t) {
    var extra = [];
    if (t._local) { extra.push("local"); }
    var item = { status: t.status, needs_checking: t.needs_checking, source_year: t.source_year, last_verified: t.last_verified, next_review: t.next_review, confidence: t.confidence, jurisdiction: t.jurisdiction };
    return STUR.itemBadgeKinds(item, extra);
  };
  /** A full trigger card. opts.crosslinks: array of DOM nodes. */
  STUR.triggerCard = function (t, opts) {
    var o = opts || {};
    var hl = o.headingLevel || "h3";
    return h("article", { class: "card trigger-card", id: "trigger-" + t.trigger_id, "data-trigger": t.trigger_id },
      h("p", { class: "kicker" }, (STUR.CATEGORY_LABELS[t.category] || t.category || "Rule") + " · " + STUR.triggerAgeText(t)),
      h(hl, null, t.title),
      STUR.badgeGroup(STUR.triggerBadgeKinds(t)),
      t.summary ? h("p", null, t.summary) : null,
      t.value_or_threshold ? h("p", null, h("span", { class: "label" }, "Value or threshold"), h("span", { class: "value" }, t.value_or_threshold), t.financial_year_or_date ? h("span", { class: "muted" }, " (" + t.financial_year_or_date + ")") : null) : h("p", { class: "not-captured" }, "Value not captured yet. Check the official page."),
      STUR.sourceLine({ source_name: t.source, source_url: t.source_url, source_year: t.source_year, verified_basis: t.verified_basis }),
      t.last_verified ? h("p", { class: "source" }, "Last verified " + STUR.fmtDate(t.last_verified) + (t.next_review ? ". Next review " + STUR.fmtDate(t.next_review) + "." : ".")) : null,
      STUR.prompts(t.what_to_check, (t.ask_a_professional && t.ask_a_professional.length ? t.ask_a_professional : (t.ask_who ? [t.ask_who] : [])), "h4"),
      o.crosslinks && o.crosslinks.length ? h("p", { class: "crosslinks" }, "See also: ", o.crosslinks.reduce(function (acc, n, i) { if (i) { acc.push(" · "); } acc.push(n); return acc; }, [])) : null);
  };
  STUR.renderSampleBanner = function (triggers) {
    var slot = $("#sample-banner");
    if (!slot) { return; }
    clear(slot);
    if (triggers && triggers.sample) {
      slot.appendChild(h("div", { class: "wrap" }, h("div", { class: "notice notice--sample", role: "note" },
        h("p", null, h("strong", null, "SAMPLE DATA: replace assets/triggers.v2.js with the shared file."),
          " The rules list on this site is a small sample (" + triggers.triggers.filter(function (t) { return !t._local; }).length + " shared entries) until the shared trigger file is copied in."))));
    }
    if (triggers && triggers.error) {
      slot.appendChild(h("div", { class: "wrap" }, h("div", { class: "notice notice--error", role: "alert" },
        h("p", null, h("strong", null, "Rules data problem. "), triggers.error, " Tables and figures on this site still work. Please report this to the site owner."))));
    }
  };

  /* ---------- Storage (browser only, one key, allowlisted fields) ---------- */
  STUR.createStore = function (key, schemaVersion, sanitize) {
    var memory = {};
    var available = true;
    try {
      var probe = "__stur_probe__";
      root.localStorage.setItem(probe, "1"); root.localStorage.removeItem(probe);
    } catch (e) { available = false; }
    function read() {
      if (!available) { return memory; }
      try {
        var raw = root.localStorage.getItem(key);
        if (!raw) { return {}; }
        var obj = JSON.parse(raw);
        if (!obj || obj.schema !== schemaVersion || typeof obj.data !== "object") { return {}; }
        return sanitize(obj.data) || {};
      } catch (e) { return {}; }
    }
    var state = read();
    return {
      available: available,
      get: function (k) { return state[k]; },
      all: function () { return JSON.parse(JSON.stringify(state)); },
      set: function (k, v) {
        var next = JSON.parse(JSON.stringify(state)); next[k] = v;
        state = sanitize(next) || {};
        if (available) { try { root.localStorage.setItem(key, JSON.stringify({ schema: schemaVersion, data: state })); } catch (e) { available = false; memory = state; STUR.storageNotice(); } }
        else { memory = state; }
      },
      clear: function () {
        state = {}; memory = {};
        if (available) { try { root.localStorage.removeItem(key); } catch (e) { /* ignore */ } }
      }
    };
  };
  STUR.sanitizers = {
    int: function (v, min, max) { var n = parseInt(v, 10); return (typeof v === "number" || (typeof v === "string" && /^\d+$/.test(v))) && !isNaN(n) && n >= min && n <= max ? n : undefined; },
    num: function (v, min, max) { return typeof v === "number" && isFinite(v) && v >= min && v <= max ? v : undefined; },
    enumOf: function (v, list) { return list.indexOf(v) !== -1 ? v : undefined; },
    idList: function (v, max) { return Array.isArray(v) ? v.filter(function (x) { return typeof x === "string" && VALUE_RE.test(x); }).slice(0, max || 500) : undefined; },
    bool: function (v) { return typeof v === "boolean" ? v : undefined; }
  };
  STUR.storageNotice = function () {
    var slot = $("#notices");
    if (!slot || $("#storage-notice")) { return; }
    slot.appendChild(h("div", { class: "wrap" }, h("div", { class: "notice notice--info", id: "storage-notice", role: "status" },
      h("p", null, "This browser is blocking storage, so your choices will be kept only until you close or reload this page. Everything else works."))));
  };
  STUR.wireClearStorage = function (store, after) {
    $all("[data-action='clear-storage']").forEach(function (btn) {
      btn.addEventListener("click", function () {
        store.clear();
        STUR.announce("Saved choices cleared on this device.");
        var msg = btn.parentNode && btn.parentNode.querySelector(".clear-msg");
        if (msg) { msg.textContent = "Cleared."; }
        if (after) { after(); }
      });
    });
  };

  /* ---------- Live announcements, copy, download ---------- */
  STUR.announce = function (msg) {
    var live = $("#live");
    if (!live) { return; }
    live.textContent = "";
    setTimeout(function () { live.textContent = msg; }, 60);
  };
  STUR.flash = function (el) {
    if (!el) { return; }
    el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash");
  };
  function fallbackCopy(text) {
    try {
      var ta = h("textarea", { class: "visually-hidden", readonly: true, "aria-hidden": "true" });
      ta.value = text; doc.body.appendChild(ta); ta.select();
      var ok = doc.execCommand && doc.execCommand("copy");
      doc.body.removeChild(ta);
      return !!ok;
    } catch (e) { return false; }
  }
  STUR.copyText = function (text, btn) {
    function done(ok) {
      if (btn) {
        var orig = btn.getAttribute("data-label") || btn.textContent;
        btn.setAttribute("data-label", orig);
        btn.textContent = ok ? "Copied" : "Copy failed: select and copy manually";
        setTimeout(function () { btn.textContent = orig; }, 1800);
      }
      STUR.announce(ok ? "Copied to clipboard." : "Copy was blocked by the browser.");
    }
    if (root.navigator && root.navigator.clipboard && root.navigator.clipboard.writeText) {
      root.navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(fallbackCopy(text)); });
    } else { done(fallbackCopy(text)); }
  };
  STUR.copyButton = function (label, getText) {
    var b = h("button", { type: "button", class: "btn btn--ghost btn--small" }, label);
    b.addEventListener("click", function () { STUR.copyText(typeof getText === "function" ? getText() : getText, b); });
    return b;
  };
  STUR.toCSV = function (rows) {
    return rows.map(function (r) {
      return r.map(function (c) {
        var s = c === null || c === undefined ? "" : String(c);
        /* Guard against spreadsheet formula injection */
        if (/^[=+\-@]/.test(s) && !/^-?\d/.test(s)) { s = "'" + s; }
        return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
      }).join(",");
    }).join("\r\n");
  };
  STUR.downloadText = function (filename, text, mime, btn) {
    try {
      var blob = new Blob([text], { type: mime || "text/csv;charset=utf-8" });
      var url = URL.createObjectURL(blob);
      var a = h("a", { href: url, download: filename, class: "visually-hidden" }, "download");
      doc.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1000);
      STUR.announce("Download started: " + filename);
    } catch (e) {
      STUR.copyText(text, btn);
    }
  };

  /* ---------- Generic UI helpers ---------- */
  STUR.state = function (kind, title, body, actions) {
    var role = kind === "error" ? "alert" : "status";
    return h("div", { class: "state state--" + kind, role: role },
      h("h3", null, title),
      body ? (Array.isArray(body) ? body.map(function (p) { return typeof p === "string" ? h("p", null, p) : p; }) : h("p", null, body)) : null,
      actions && actions.length ? h("div", { class: "btn-row" }, actions) : null);
  };
  STUR.tableWrap = function (table, label) {
    return h("div", { class: "table-outer" },
      h("p", { class: "scroll-hint no-print", "aria-hidden": "true", hidden: true }, "Wide table: scroll sideways to see all columns."),
      h("div", { class: "table-wrap", tabindex: "0", role: "region", "aria-label": label || "Table" }, table));
  };
  /** Show the scroll hint only for tables that are actually wider than their box. */
  STUR.updateScrollHints = function () {
    $all(".table-outer").forEach(function (o) {
      var w = o.querySelector(".table-wrap"); var hint = o.querySelector(".scroll-hint");
      if (!w || !hint) { return; }
      if (w.scrollWidth > w.clientWidth + 2) { hint.removeAttribute("hidden"); } else { hint.setAttribute("hidden", ""); }
    });
  };
  /** Wire native radio groups styled as .segmented so the checked label is highlighted. */
  STUR.syncSegmented = function (ctx) {
    var sets = $all(".segmented", ctx);
    if (ctx && ctx.classList && ctx.classList.contains("segmented")) { sets.unshift(ctx); }
    sets.forEach(function (fs) {
      $all("label", fs).forEach(function (l) { var i = l.querySelector("input"); l.classList.toggle("is-checked", !!(i && i.checked)); });
    });
  };
  STUR.segmented = function (name, legend, options, value, onChange) {
    var fs = h("fieldset", { class: "segmented" }, h("legend", { class: "label" }, legend));
    options.forEach(function (o) {
      var id = name + "-" + String(o.value).replace(/[^a-z0-9-]/gi, "");
      var input = h("input", { type: "radio", name: name, id: id, value: o.value });
      input.checked = String(o.value) === String(value);
      input.addEventListener("change", function () { if (input.checked) { STUR.syncSegmented(fs); onChange(o.value); } });
      fs.appendChild(h("label", { for: id }, input, o.label, o.note ? h("span", { class: "seg-note" }, o.note) : null));
    });
    STUR.syncSegmented(fs);
    return fs;
  };
  /** ARIA tabs with roving tabindex and arrow-key support. */
  STUR.tabs = function (container, items, selectedId, onSelect) {
    var list = h("div", { class: "tablist", role: "tablist", "aria-label": container.getAttribute("data-tabs-label") || "Views" });
    var panels = [];
    var buttons = items.map(function (it) {
      var b = h("button", { type: "button", class: "tab", role: "tab", id: "tab-" + it.id, "aria-controls": "panel-" + it.id, "aria-selected": "false", tabindex: "-1" }, it.label);
      b.addEventListener("click", function () { select(it.id, true); });
      b.addEventListener("keydown", function (e) {
        var i = buttons.indexOf(b); var n = null;
        if (e.key === "ArrowRight") { n = (i + 1) % buttons.length; }
        else if (e.key === "ArrowLeft") { n = (i - 1 + buttons.length) % buttons.length; }
        else if (e.key === "Home") { n = 0; } else if (e.key === "End") { n = buttons.length - 1; }
        if (n !== null) { e.preventDefault(); buttons[n].focus(); select(items[n].id, true); }
      });
      list.appendChild(b);
      var p = h("div", { class: "tabpanel", role: "tabpanel", id: "panel-" + it.id, "aria-labelledby": "tab-" + it.id, tabindex: "0", hidden: true });
      panels.push(p);
      return b;
    });
    function select(id, user) {
      items.forEach(function (it, i) {
        var on = it.id === id;
        buttons[i].setAttribute("aria-selected", on ? "true" : "false");
        buttons[i].setAttribute("tabindex", on ? "0" : "-1");
        if (on) { panels[i].removeAttribute("hidden"); } else { panels[i].setAttribute("hidden", ""); }
      });
      if (onSelect) { onSelect(id, panels[items.map(function (x) { return x.id; }).indexOf(id)], user); }
    }
    clear(container); container.appendChild(list); panels.forEach(function (p) { container.appendChild(p); });
    select(items.some(function (i) { return i.id === selectedId; }) ? selectedId : items[0].id, false);
    return { select: select, panels: panels };
  };
  /** Roving tabindex over a list of focusable elements (timelines, chip grids). */
  STUR.roving = function (els, opts) {
    var o = opts || {};
    els.forEach(function (el, i) {
      el.setAttribute("tabindex", i === (o.start || 0) ? "0" : "-1");
      el.addEventListener("keydown", function (e) {
        var n = null; var cols = o.columns || 0;
        if (e.key === "ArrowRight" || (!cols && e.key === "ArrowDown")) { n = Math.min(els.length - 1, i + 1); }
        else if (e.key === "ArrowLeft" || (!cols && e.key === "ArrowUp")) { n = Math.max(0, i - 1); }
        else if (cols && e.key === "ArrowDown") { n = Math.min(els.length - 1, i + cols); }
        else if (cols && e.key === "ArrowUp") { n = Math.max(0, i - cols); }
        else if (e.key === "Home") { n = 0; } else if (e.key === "End") { n = els.length - 1; }
        if (n !== null && n !== i) {
          e.preventDefault();
          els.forEach(function (x) { x.setAttribute("tabindex", "-1"); });
          els[n].setAttribute("tabindex", "0"); els[n].focus();
          if (o.onMove) { o.onMove(n, els[n]); }
        }
      });
      el.addEventListener("focus", function () { els.forEach(function (x) { x.setAttribute("tabindex", "-1"); }); el.setAttribute("tabindex", "0"); });
    });
  };
  /** Simple text search helpers */
  STUR.norm = function (s) { return String(s || "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, ""); };
  STUR.highlight = function (text, query) {
    var t = String(text || ""); var q = STUR.norm(query).trim();
    if (!q) { return [t]; }
    var nt = STUR.norm(t); var out = []; var i = 0; var j;
    while ((j = nt.indexOf(q, i)) !== -1 && q.length) {
      if (j > i) { out.push(t.slice(i, j)); }
      out.push(h("mark", null, t.slice(j, j + q.length)));
      i = j + q.length;
    }
    if (i < t.length) { out.push(t.slice(i)); }
    return out;
  };
  STUR.debounce = function (fn, ms) { var t; return function () { var a = arguments, s = this; clearTimeout(t); t = setTimeout(function () { fn.apply(s, a); }, ms); }; };

  /** Validate an integer input field. Returns {ok, value, message}. Empty is allowed ("not entered"). */
  STUR.readInt = function (input, min, max, label) {
    var raw = String(input.value || "").trim().replace(/[,\s$]/g, "");
    if (raw === "") { input.removeAttribute("aria-invalid"); return { ok: true, value: null }; }
    if (!/^\d+$/.test(raw)) { input.setAttribute("aria-invalid", "true"); return { ok: false, value: null, message: (label || "This field") + " must be a whole number." }; }
    var n = parseInt(raw, 10);
    if (n < min || n > max) { input.setAttribute("aria-invalid", "true"); return { ok: false, value: null, message: (label || "This field") + " must be between " + min.toLocaleString("en-AU") + " and " + max.toLocaleString("en-AU") + "." }; }
    input.removeAttribute("aria-invalid");
    return { ok: true, value: n };
  };
  STUR.readNum = function (input, min, max, label) {
    var raw = String(input.value || "").trim().replace(/[,\s$%]/g, "");
    if (raw === "") { input.removeAttribute("aria-invalid"); return { ok: true, value: null }; }
    if (!/^-?\d+(\.\d+)?$/.test(raw)) { input.setAttribute("aria-invalid", "true"); return { ok: false, value: null, message: (label || "This field") + " must be a number." }; }
    var n = parseFloat(raw);
    if (n < min || n > max) { input.setAttribute("aria-invalid", "true"); return { ok: false, value: null, message: (label || "This field") + " must be between " + min.toLocaleString("en-AU") + " and " + max.toLocaleString("en-AU") + "." }; }
    input.removeAttribute("aria-invalid");
    return { ok: true, value: n };
  };
  STUR.field = function (id, label, input, hint) {
    input.id = id;
    var hintEl = hint ? h("p", { class: "hint", id: id + "-hint" }, hint) : null;
    var err = h("p", { class: "field-error", id: id + "-err", "aria-live": "polite" });
    input.setAttribute("aria-describedby", (hint ? id + "-hint " : "") + id + "-err");
    return h("div", { class: "field" }, h("label", { for: id }, label), hintEl, input, err);
  };
  STUR.setFieldError = function (id, msg) { var e = doc.getElementById(id + "-err"); if (e) { e.textContent = msg || ""; } };

  /* ---------- Page boot ---------- */
  STUR.boot = function (fn) {
    function run() {
      STUR.fillSturLinks(doc);
      /* open all panels for printing, restore afterwards */
      var reopened = [];
      root.addEventListener("beforeprint", function () { $all("details:not([open])").forEach(function (d) { d.setAttribute("open", ""); reopened.push(d); }); });
      root.addEventListener("afterprint", function () { reopened.forEach(function (d) { d.removeAttribute("open"); }); reopened = []; });
      var hints = STUR.debounce(STUR.updateScrollHints, 120);
      if (root.MutationObserver) { new root.MutationObserver(hints).observe(doc.body, { childList: true, subtree: true }); }
      root.addEventListener("resize", hints);
      try { fn(); }
      catch (e) {
        var mount = $("#app");
        if (mount) {
          clear(mount);
          mount.appendChild(STUR.state("error", "Something went wrong while starting this page.",
            ["The page text, disclaimer and links above still work. Try reloading. If it keeps happening, please report it to the site owner with the page address.",
              h("code", null, String(e && e.message ? e.message : e))]));
        }
        if (root.console) { root.console.error(e); }
      }
    }
    if (doc.readyState === "loading") { doc.addEventListener("DOMContentLoaded", run); } else { run(); }
  };

  root.STUR = STUR;
})(typeof window !== "undefined" ? window : globalThis);
