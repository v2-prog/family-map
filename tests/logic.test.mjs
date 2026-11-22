/* Unit tests for assets/logic.v1.js. Run from the repository root: node --test */
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { load } from "../tools/validate.mjs";

const w = load(resolve(dirname(fileURLToPath(import.meta.url)), ".."));
const L = w.FM_LOGIC, TOP = w.FM_TOPICS, F = w.FM_FIGURES;
const T = L.index(TOP.nodes);
const ids = (arr) => [...arr].map((x) => x.id);

test("emphasis weights sum to 1, respect the floor and follow behaviour", () => {
  const a = L.weights(40, [0, 0, 0, 0]);
  assert.ok(Math.abs(a.reduce((x, y) => x + y, 0) - 1) < 1e-9);
  assert.ok(a.every((x) => x >= 0.05));
  const b = L.weights(40, [30, 0, 0, 0]);
  assert.ok(b[0] > a[0], "opening safety-net topics raises that weight");
  assert.ok(b[0] < 0.85, "the behavioural share is capped");
});

test("stored data is cleaned exactly as before", () => {
  assert.equal(L.clean(null), null);
  assert.equal(L.clean({ v: 2 }), null);
  const c = L.clean({ v: 1, mode: "x", st: "ZZ", meAge: 200, meHome: "moon", members: [
    { id: "m1", rel: "parent", label: "A very long label indeed", age: -5, home: "care" },
    { id: "m1", rel: "parent", label: "dup", age: 50 },
    { id: "bad", rel: "parent", label: "x", age: 50 },
    { id: "m2", rel: "partner", label: "P", age: 40 }, { id: "m3", rel: "partner", label: "P2", age: 41 }
  ], nid: 1, who: "m9" });
  assert.equal(c.mode, "guided"); assert.equal(c.st, "ACT"); assert.equal(c.meAge, 98); assert.equal(c.meHome, "");
  assert.deepEqual(ids(c.members), ["m1", "m2"], "duplicates, bad ids and over-cap partners are dropped");
  assert.equal(c.members[0].label.length, 14); assert.equal(c.members[0].age, 0);
  assert.equal(c.nid, 3); assert.equal(c.who, null);
});

test("new members get the original default labels and ages", () => {
  const s = L.defaults();
  assert.equal(L.newMember(s, "parent").label, "Parent 3");
  assert.equal(L.newMember(s, "grandparent").label, "Nan");
  assert.equal(L.newMember(s, "child").label, "Child 2");
  assert.equal(L.newMember(s, "partner").age, 40);
  assert.equal(L.newMember(s, "grandchild").age, 0);
});

test("linked topics for the example household", () => {
  const s = L.defaults();
  const ov = L.overlaps(s, T, L.weights(s.meAge, [0, 0, 0, 0]));
  const got = ids(ov).sort();
  assert.deepEqual(got, ["bequest", "care", "kids", "pension", "selfme"].sort());
  const lay = L.lanes(ov, s);
  assert.deepEqual([...lay.rows], ["par", "me", "kid"]);
  assert.ok(lay.lanes.par.length <= 4 && lay.lanes.me.length <= 2);
});

test("living arrangements create linked topics", () => {
  const s = L.defaults(); s.members = s.members.concat([{ id: "m9", rel: "grandparent", label: "Nan", age: 88, home: "care" }]);
  assert.ok(ids(L.overlaps(s, T, [0.25, 0.25, 0.25, 0.25])).includes("resid"));
});

test("figures for a person", () => {
  const W = L.weights(40, [0, 0, 0, 0]);
  const f40 = L.figuresFor(40, F, W, TOP.stages);
  assert.equal(f40.cons.length, 5); assert.equal(f40.scenarios.length, 3); assert.equal(f40.scenarios.filter((x) => x.best).length, 1);
  assert.equal(f40.url, "https://coeconomics.com/age-40-41.html");
  const f64 = L.figuresFor(64, F, W, TOP.stages); assert.equal(f64.cons, null); assert.match(f64.missing, /64/);
  const f4 = L.figuresFor(4, F, W, TOP.stages); assert.match(f4.draft, /draft/i); assert.equal(f4.income, null);
  const f90 = L.figuresFor(90, F, W, TOP.stages); assert.match(f90.draft, /80/);
});

test("support lists use the chosen state's names and only ACT links", () => {
  const W = L.weights(40, [0, 0, 0, 0]);
  const act = L.supportFor("d_est", W, TOP.orgs, TOP.states.ACT);
  assert.ok(act.some((r) => r.url && r.url.startsWith("https://")));
  const nsw = L.supportFor("d_est", W, TOP.orgs, TOP.states.NSW);
  assert.ok(nsw.some((r) => r.name === "Legal Aid NSW"));
  assert.ok(nsw.every((r) => !r.url));
});

test("ranking marks one 'most relevant' card", () => {
  const r = L.rank(T.doms, T, L.weights(70, [0, 0, 0, 0]), 70, {});
  assert.equal(r.filter((c) => c.top).length, 1);
  assert.equal(r.length, 8);
});

test("state notes", () => {
  const n = L.stateNote(T.by.p_home, TOP.states.ACT);
  assert.match(n.link, /home-buyer-concession-scheme/);
  assert.equal(L.stateNote(T.by.e_will, TOP.states.ACT), null);
});
