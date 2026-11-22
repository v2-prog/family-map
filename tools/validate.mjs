#!/usr/bin/env node
/* Zero-dependency checks for Family Map data and code. Usage: node tools/validate.mjs */
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const NAMES = ["John", "Jane", "Mary", "Michael", "Sarah", "David", "Emma", "Olivia", "James", "Liam", "Noah", "Charlotte", "Oliver", "Amelia", "Isla", "Mia", "Jack", "Sophie", "Chloe", "Daniel", "Matthew", "Emily", "Jessica", "Thomas", "Joshua", "Lucy", "Grace"];
function files(dir, out = []) { if (!existsSync(dir)) { return out; } for (const n of readdirSync(dir)) { const p = join(dir, n); if (statSync(p).isDirectory()) { if (!n.startsWith(".") && n !== "node_modules") { files(p, out); } } else { out.push(p); } } return out; }

export function load(root) {
  const ctx = vm.createContext({ window: {}, Math, JSON, Object, Array, Number, String, isFinite, parseInt, console });
  for (const f of ["assets/logic.v1.js", "assets/data/topics.v1.js", "assets/data/figures.v1.js", "assets/data/register.v1.js"]) { vm.runInContext(readFileSync(join(root, f), "utf8"), ctx, { filename: f }); }
  return ctx.window;
}

export function validate(root) {
  const E = [];
  const w = load(root), TOP = w.FM_TOPICS, F = w.FM_FIGURES, REG = w.FM_REGISTER, L = w.FM_LOGIC;
  const ids = new Set();
  const weightsOk = (tg) => Array.isArray(tg) && tg.length === 4 && tg.every((x) => typeof x === "number" && x >= 0 && x <= 1);
  TOP.nodes.forEach((n) => { if (ids.has(n.id)) { E.push("duplicate topic id " + n.id); } ids.add(n.id); });
  TOP.nodes.forEach((n) => {
    if (!/^[a-z0-9_]{2,40}$/.test(n.id)) { E.push("bad topic id " + n.id); }
    if (n.parent && !ids.has(n.parent)) { E.push(n.id + ": parent " + n.parent + " missing"); }
    (n.links || []).forEach((x) => { if (!ids.has(x)) { E.push(n.id + ": link " + x + " missing"); } });
    if (!weightsOk(n.weights)) { E.push(n.id + ": weights must be four numbers from 0 to 1"); }
    if (n.stateNote && ["fp", "tt", "rev"].indexOf(n.stateNote) === -1) { E.push(n.id + ": bad stateNote"); }
    if (n.verify && (!n.verify.source || !n.verify.what)) { E.push(n.id + ": verify needs source and what"); }
    if (!n.title || !n.summary) { E.push(n.id + ": missing title or summary"); }
  });
  const doms = TOP.nodes.filter((n) => !n.parent).map((n) => n.id);
  const stateKeys = ["legal", "trustee", "revenue", "seniors", "cota", "fair", "fp"];
  L.STATES.forEach((k) => {
    const s = TOP.states[k];
    if (!s) { E.push("state " + k + " missing"); return; }
    stateKeys.forEach((key) => { if (!s[key]) { E.push(k + ": missing " + key); } });
    Object.keys(s).filter((x) => /Url$/.test(x)).forEach((x) => { if (!/^https:\/\//.test(s[x])) { E.push(k + "." + x + " must be https"); } });
  });
  TOP.orgs.forEach((o) => {
    (o.areas || []).forEach((a) => { if (a !== "*" && doms.indexOf(a) === -1) { E.push("org " + o.id + ": unknown area " + a); } });
    if (o.stateKey && stateKeys.indexOf(o.stateKey) === -1) { E.push("org " + o.id + ": unknown stateKey"); }
    if (!o.stateKey && !o.name) { E.push("org " + o.id + ": needs a name or stateKey"); }
    if (!weightsOk(o.weights)) { E.push("org " + o.id + ": bad weights"); }
  });
  let next = 0;
  TOP.stages.forEach((s) => { if (s.from !== next) { E.push("stages must be contiguous at age " + next); } next = s.to + 1; });
  if (next !== 100) { E.push("stages must end at 99"); }
  F.figures.forEach((f, i) => {
    if (F.topics.order.indexOf(f.topic) === -1) { E.push("figure " + i + ": unknown topic " + f.topic); }
    if (!(f.from <= f.to)) { E.push("figure " + i + ": from after to"); }
    if (!f.text || !f.source) { E.push("figure " + i + ": missing text or source"); }
  });
  for (let a = 12; a <= 80; a += 2) { if (!F.bands[String(a)]) { E.push("band " + a + " missing"); } }
  let inc = 12; F.income.forEach((r) => { if (r.from !== inc) { E.push("income scenarios must be contiguous at " + inc); } inc = r.to + 1; });
  const rids = new Set();
  REG.rows.forEach((r) => { if (rids.has(r.id)) { E.push("duplicate register id " + r.id); } rids.add(r.id); if (REG.sources.indexOf(r.source) === -1) { E.push(r.id + ": unknown source " + r.source); } });
  /* Code rules (strict Content Security Policy) and privacy */
  const local = join(root, "tools", "name-deny-list.local.txt");
  const extra = existsSync(local) ? readFileSync(local, "utf8").split(/\r?\n/).map((x) => x.trim()).filter((x) => /^[A-Za-z'-]{2,40}$/.test(x)) : [];
  const NAME_RE = new RegExp("\\b(" + NAMES.concat(extra).join("|") + ")\\b");
  for (const f of files(root)) {
    const rel = f.slice(root.length + 1);
    if (rel.startsWith("tools/") || rel.startsWith("tests/") || /\.(woff2|txt)$/.test(rel)) { continue; }
    const t = readFileSync(f, "utf8");
    const m = t.match(NAME_RE); if (m) { E.push(rel + ": likely personal name '" + m[1] + "'"); }
    if (/\bhttp:\/\/(?!www\.w3\.org\/)/.test(t)) { E.push(rel + ": http:// link (https only)"); }
    if (rel.endsWith(".html")) {
      if (/<script(?![^>]*\bsrc=)[^>]*>/i.test(t)) { E.push(rel + ": inline <script>"); }
      if (/<style[\s>]/i.test(t) || /\sstyle\s*=/i.test(t)) { E.push(rel + ": inline style"); }
      if (/\son[a-z]+\s*=/i.test(t)) { E.push(rel + ": inline event handler"); }
      if (/src=["']https?:/i.test(t)) { E.push(rel + ": remote script or image"); }
    }
    if (rel.endsWith(".js")) {
      if (/\b(fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon)\s*\(/.test(t)) { E.push(rel + ": network call"); }
      if (/\beval\s*\(|new Function\s*\(|\.innerHTML\s*=/.test(t)) { E.push(rel + ": eval, new Function or innerHTML"); }
    }
    if (rel.startsWith("assets/") && !/\.v\d+\.[a-z0-9]+$/.test(rel) && !rel.endsWith("OFL.txt")) { E.push(rel + ": asset names must carry a version (name.v1.ext)"); }
  }
  return { errors: E, stats: { topics: TOP.nodes.length, orgs: TOP.orgs.length, figures: F.figures.length, register: REG.rows.length } };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const { errors, stats } = validate(root);
  console.log("Checked " + stats.topics + " topics, " + stats.orgs + " support services, " + stats.figures + " figures, " + stats.register + " register rows.");
  errors.forEach((e) => console.log("ERROR: " + e));
  if (errors.length) { process.exit(1); }
  console.log("OK: no errors.");
}
