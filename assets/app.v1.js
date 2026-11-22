/* Family Map: interactive map page (version 1). Classic script, same-origin data only.
   Depends on core.v1.js, logic.v1.js, data/topics.v1.js and data/figures.v1.js. */
(function () {
  "use strict";
  var S = window.STUR, L = window.FM_LOGIC, TOP = window.FM_TOPICS, F = window.FM_FIGURES;
  var h = S.h;
  var $ = function (id) { return document.getElementById(id); };
  if (!$("fm-map")) { return; }
  if (!L || !TOP || !F) {
    var m = $("fm-explore-body") || $("fm-map");
    S.clear(m); m.appendChild(S.state("error", "The map data could not be loaded.", ["A file in assets/ is missing or damaged. The model and register pages still work."]));
    return;
  }
  var T = L.index(TOP.nodes);

  /* ---------- State: household (saved) + session (not saved) ---------- */
  var storageOk = true, saved = null;
  try { var raw = window.localStorage.getItem(L.STORAGE_KEY); if (raw) { saved = L.clean(JSON.parse(raw)); } } catch (e) { storageOk = false; }
  var H = Object.assign({}, L.defaults(), saved || {});
  var X = { focus: null, via: null, beh: [0, 0, 0, 0], visited: {}, deepest: {}, showAll: false, q: "", allRefs: false, figAll: false, confirmReset: false };
  var lastSnap = L.snap(H);
  function persist() {
    if (!storageOk) { return; }
    var j = L.snap(H);
    if (j === lastSnap) { return; }
    lastSnap = j;
    try { if (L.isDefault(H)) { window.localStorage.removeItem(L.STORAGE_KEY); } else { window.localStorage.setItem(L.STORAGE_KEY, j); } }
    catch (e) { storageOk = false; }
  }
  function W() { return L.weights(H.meAge, X.beh); }
  function everyone() { return L.everyone(H); }
  function subject() { var a = everyone(); return (H.who && a.filter(function (m) { return m.id === H.who; })[0]) || a[0]; }
  function stateInfo() { return TOP.states[H.st] || TOP.states.ACT; }

  /* ---------- Rendering with focus kept in place ---------- */
  function fk(el, key) { el.setAttribute("data-fk", key); return el; }
  function update(parts, opts) {
    var o = opts || {};
    var act = document.activeElement, key = act && act.getAttribute && act.getAttribute("data-fk");
    persist();
    (parts || ["controls", "map", "household", "explore", "figures", "branches", "emphasis", "support"]).forEach(function (p) { R[p](); });
    if (o.focus) { var t = $(o.focus); if (t) { t.focus({ preventScroll: !!o.noScroll }); if (!o.noScroll) { t.scrollIntoView({ block: "nearest" }); } } }
    else if (key) { var back = document.querySelector('[data-fk="' + key + '"]'); if (back && back !== document.activeElement) { back.focus({ preventScroll: true }); } }
    if (o.say) { S.announce(o.say); }
  }
  function btn(label, onClick, cls, attrs) {
    var a = Object.assign({ type: "button", class: cls || "btn btn--ghost" }, attrs || {});
    var b = h("button", a, label); b.addEventListener("click", onClick); return b;
  }

  /* ---------- Actions ---------- */
  function go(id, via) {
    var n = T.by[id];
    if (!n) { return; }
    X.visited = Object.assign({}, X.visited); X.visited[id] = (X.visited[id] || 0) + 1;
    X.beh = X.beh.map(function (b, i) { return b + n.weights[i]; });
    var dom = T.dom(id), cur = X.deepest[dom];
    X.deepest = Object.assign({}, X.deepest);
    if (!(cur && T.isAnc(id, cur))) { X.deepest[dom] = id; }
    X.focus = id; X.via = via || null; X.showAll = false; X.allRefs = false;
    if (X.q) { X.q = ""; var qi = $("fm-q"); if (qi) { qi.value = ""; } }
    try { history.replaceState(null, "", location.pathname + "#topic=" + id); } catch (e) { /* ignore */ }
    update(null, { focus: "fm-topic-h", say: "Opened " + n.title });
  }
  function goHome() {
    X.focus = null; X.via = null; X.showAll = false;
    try { history.replaceState(null, "", location.pathname); } catch (e) { /* ignore */ }
    update(["explore", "map", "branches", "support"], { focus: "fm-explore-h", say: "Back to all areas" });
  }
  function shift(d) {
    var c = function (v) { return Math.max(0, Math.min(98, v + 2 * d)); };
    H.meAge = c(H.meAge);
    H.members = H.members.map(function (m) { return Object.assign({}, m, { age: c(m.age) }); });
    X.beh = X.beh.map(function (b) { return b * 0.85; });
    update(null, { say: "Everyone moved " + (d > 0 ? "forward" : "back") + " 2 years. You are now " + L.band(H.meAge) + ", " + L.stageOf(H.meAge, TOP.stages).name + "." });
  }
  function stepAge(id, d) {
    var c = function (v) { return Math.max(0, Math.min(98, v + 2 * d)); };
    if (id === "me") { H.meAge = c(H.meAge); } else { H.members = H.members.map(function (m) { return m.id === id ? Object.assign({}, m, { age: c(m.age) }) : m; }); }
    var p = everyone().filter(function (m) { return m.id === id; })[0];
    update(null, { say: p.label + " is now " + L.band(p.age) + "." });
  }
  function patch(id, obj, parts) { H.members = H.members.map(function (m) { return m.id === id ? Object.assign({}, m, obj) : m; }); update(parts); }
  function remove(id) {
    var p = H.members.filter(function (m) { return m.id === id; })[0];
    H.members = H.members.filter(function (m) { return m.id !== id; });
    if (H.who === id) { H.who = null; }
    update(null, { focus: "fm-household-h", say: (p ? p.label : "Person") + " removed." });
  }
  function add(rel) {
    var m = L.newMember(H, rel);
    H.members = H.members.concat([m]); H.nid += 1;
    update(null, { focus: "fm-label-" + m.id, noScroll: false, say: m.label + " added at " + L.band(m.age) + ". Type to rename them." });
    var inp = $("fm-label-" + m.id); if (inp && inp.select) { inp.select(); }
  }
  function pick(id) { H.who = id; X.showAll = false; update(null, { say: "Paths and figures now centre on " + everyone().filter(function (m) { return m.id === id; })[0].label + "." }); }

  var R = {};

  /* ---------- Controls ---------- */
  R.controls = function () {
    var box = $("fm-controls"); S.clear(box);
    var guided = H.mode === "guided";
    function modeBtn(mode, title, sub) {
      var on = H.mode === mode;
      return fk(btn([h("span", { class: "mode-title" }, title), h("span", { class: "mode-sub" }, sub)], function () { H.mode = mode; X.q = ""; X.showAll = false; update(null, { say: title + " selected." }); }, "mode-btn" + (on ? " is-on" : ""), { "aria-pressed": on ? "true" : "false" }), "mode-" + mode);
    }
    var st = h("select", { id: "fm-state" }, L.STATES.map(function (k) { return h("option", { value: k }, k + " · " + TOP.states[k].n); }));
    st.value = H.st;
    st.addEventListener("change", function () { H.st = st.value; update(["explore", "support", "controls"], { say: "State set to " + TOP.states[H.st].n + "." }); });
    fk(st, "state");
    var stage = L.stageOf(H.meAge, TOP.stages);
    box.appendChild(h("div", { class: "control card" }, h("p", { class: "control-label", id: "mode-label" }, "How do you want to explore?"),
      h("div", { class: "mode-row", role: "group", "aria-labelledby": "mode-label" }, modeBtn("guided", "Guided path", "Start broad, narrow gently"), modeBtn("quick", "Quick path", "Jump straight to specifics")),
      h("p", { class: "hint" }, "Both paths reach the same topics. Switching keeps your place.")));
    box.appendChild(h("div", { class: "control card" }, h("label", { class: "control-label", for: "fm-state" }, "Where you live"), st,
      h("p", { class: "hint" }, H.st === "ACT" ? "ACT is the default and the only one with official links so far." : "Shown for comparison. Only the ACT has official links so far.")));
    box.appendChild(h("div", { class: "control card" }, h("p", { class: "control-label" }, "Let years pass for everyone"),
      h("div", { class: "btn-row" }, fk(btn("− 2 years", function () { shift(-1); }, "btn btn--ghost", { "aria-label": "Move everyone back 2 years" }), "back2"), fk(btn("+ 2 years", function () { shift(1); }, "btn", { "aria-label": "Move everyone forward 2 years" }), "fwd2")),
      h("p", { class: "hint" }, "You: ", h("strong", null, L.band(H.meAge)), " · " + stage.name)));
  };

  /* ---------- Household map ---------- */
  var ROW_LABEL = { gp: "Grandparents", par: "Parents", me: "You", kid: "Children", gk: "Grandchildren" };
  var REL_ROW = { grandparent: "gp", parent: "par", child: "kid", grandchild: "gk" };
  var mapGeom = null;
  R.map = function () {
    var box = $("fm-map"); S.clear(box);
    var w = W(), ovs = L.overlaps(H, T, w), lay = L.lanes(ovs, H), all = everyone();
    var stage = h("div", { class: "map-stage" });
    var svg = S.svg("svg", { class: "map-edges", "aria-hidden": "true", focusable: "false" });
    stage.appendChild(svg);
    function personBtn(m) {
      var sel = (H.who || "me") === m.id;
      var cls = "person person--" + (m.rel === "me" || m.rel === "partner" ? "you" : (m.rel === "parent" || m.rel === "grandparent" ? "elder" : "young")) + (m.id === "me" ? " person--me" : "") + (sel ? " is-selected" : "");
      var b = btn([h("span", { class: "person-name" }, m.label || L.REL_NAME[m.rel]), h("span", { class: "person-band" }, L.band(m.age)), m.home ? h("span", { class: "person-home" }, L.homeShort(m.home)) : null],
        function () { pick(m.id); }, cls, { "aria-pressed": sel ? "true" : "false", "aria-label": (m.label || L.REL_NAME[m.rel]) + ", " + L.REL_NAME[m.rel].toLowerCase() + ", age band " + L.band(m.age) + (m.home ? ", " + L.homeShort(m.home) : "") + ". Centre the paths and figures on this person.", "data-node": "p-" + m.id });
      return fk(b, "person-" + m.id);
    }
    function pill(o) {
      var who = o.others.length ? L.join(o.others.map(function (m) { return m.label; })) : "you";
      var b = btn(o.label, function () { go(o.root, o.solo ? null : o.id); }, "pill pill--" + o.kind + (o.pulse ? " pill--pulse" : "") + (X.via === o.id ? " is-active" : ""),
        { "aria-label": o.label + ". Linked topic for " + who + (o.solo ? "" : " and you") + (o.kind === "hi" ? ". Fits your current emphasis most." : (o.kind === "lo" ? ". Less typical for now." : ".")), "data-node": "o-" + o.id });
      return fk(b, "pill-" + o.id);
    }
    function lane(key) {
      var list = lay.lanes[key] || [];
      if (!list.length) { return null; }
      return h("div", { class: "map-lane", "data-lane": key }, list.map(pill));
    }
    var rowsEl = h("div", { class: "map-rows" });
    lay.rows.forEach(function (r) {
      if (r === "kid" || r === "gk") { var l1 = lane(r); if (l1) { rowsEl.appendChild(l1); } }
      var people = r === "me" ? all.filter(function (m) { return m.rel === "me" || m.rel === "partner"; }) : all.filter(function (m) { return REL_ROW[m.rel] === r; });
      var row = h("div", { class: "map-row map-row--" + r }, h("span", { class: "row-label" }, ROW_LABEL[r]), h("div", { class: "row-people" }, people.map(personBtn), r === "me" ? lane("me") : null));
      rowsEl.appendChild(row);
      if (r === "gp" || r === "par") { var l2 = lane(r); if (l2) { rowsEl.appendChild(l2); } }
    });
    stage.appendChild(rowsEl);
    box.appendChild(stage);
    if (lay.extra.length) {
      box.appendChild(h("div", { class: "map-extra" }, h("p", { class: "small strong" }, "More links, not drawn to keep the map readable"),
        h("div", { class: "chip-row" }, lay.extra.map(function (o) { return fk(btn(o.label + (o.others.length ? " (" + L.join(o.others.map(function (m) { return m.label; })) + ")" : ""), function () { go(o.root, o.solo ? null : o.id); }, "chip"), "extra-" + o.id); }))));
    }
    mapGeom = { stage: stage, svg: svg, drawn: [].concat.apply([], Object.keys(lay.lanes).map(function (k) { return lay.lanes[k]; })) };
    requestAnimationFrame(drawEdges);
  };
  function drawEdges() {
    if (!mapGeom) { return; }
    var st = mapGeom.stage, svg = mapGeom.svg;
    while (svg.firstChild) { svg.removeChild(svg.firstChild); }
    var box = st.getBoundingClientRect();
    if (!box.width) { return; }
    svg.setAttribute("viewBox", "0 0 " + Math.round(box.width) + " " + Math.round(box.height));
    svg.setAttribute("width", String(Math.round(box.width))); svg.setAttribute("height", String(Math.round(box.height)));
    function centre(key) { var el = st.querySelector('[data-node="' + key + '"]'); if (!el) { return null; } var r = el.getBoundingClientRect(); return { x: r.left - box.left + r.width / 2, y: r.top - box.top + r.height / 2 }; }
    mapGeom.drawn.forEach(function (o) {
      var a = centre("o-" + o.id); if (!a) { return; }
      var targets = o.ms.slice(); if (!o.solo && !targets.some(function (m) { return m.id === "me"; })) { targets.push({ id: "me" }); }
      targets.forEach(function (t) {
        var b = centre("p-" + t.id); if (!b) { return; }
        svg.appendChild(S.svg("line", { x1: a.x, y1: a.y, x2: b.x, y2: b.y, class: "edge" + (X.via === o.id ? " edge--active" : "") }));
      });
    });
  }
  if (window.ResizeObserver) { new window.ResizeObserver(S.debounce(drawEdges, 60)).observe($("fm-map")); }
  else { window.addEventListener("resize", S.debounce(drawEdges, 100)); }

  /* ---------- Household editor ---------- */
  R.household = function () {
    var box = $("fm-household-body"); S.clear(box);
    box.appendChild(h("div", { class: "chip-row adders" }, L.RELS.map(function (rel) {
      var n = H.members.filter(function (m) { return m.rel === rel; }).length, cap = L.CAP[rel], dis = n >= cap;
      var b = btn(["+ " + L.REL_NAME[rel], h("span", { class: "count" }, n + " of " + cap)], function () { add(rel); }, "chip chip--add", { disabled: dis, "aria-label": "Add " + L.REL_NAME[rel].toLowerCase() + " (" + n + " of " + cap + ")" });
      return fk(b, "add-" + rel);
    })));
    var isDef = L.isDefault(H);
    var status = h("div", { class: "save-status" + (storageOk ? "" : " save-status--off"), role: "status" },
      h("p", null, h("strong", null, !storageOk ? "Not saved. " : (isDef ? "Example household. " : "Saved in this browser only. ")),
        !storageOk ? "This browser is blocking storage, so the household resets when you reload." : (isDef ? "Change anything and it is kept on this device. Nothing is sent anywhere." : "Kept on this device so it survives a reload. Nothing is sent anywhere."),
        " Use role labels such as Mum or Child 1, not real names."));
    if (!X.confirmReset) {
      status.appendChild(fk(btn("Reset / clear saved household", function () { X.confirmReset = true; update(["household"], { focus: "fm-reset-yes" }); }, "btn btn--ghost btn--small"), "reset"));
    } else {
      status.appendChild(h("div", { class: "confirm", role: "alert" }, h("span", null, "Remove the saved household from this browser?"),
        btn("Yes, clear and reset", function () { try { window.localStorage.removeItem(L.STORAGE_KEY); } catch (e) { /* ignore */ } H = Object.assign({}, L.defaults()); X = Object.assign(X, { focus: null, via: null, beh: [0, 0, 0, 0], visited: {}, deepest: {}, confirmReset: false }); lastSnap = L.snap(H); update(null, { focus: "fm-household-h", say: "Household cleared and reset to the example." }); }, "btn btn--small btn--danger", { id: "fm-reset-yes" }),
        btn("Cancel", function () { X.confirmReset = false; update(["household"], { focus: null, say: "Kept." }); }, "btn btn--ghost btn--small")));
    }
    box.appendChild(status);
    var list = h("ul", { class: "people-list" });
    everyone().forEach(function (m) {
      var isMe = m.id === "me";
      var name;
      if (isMe) { name = h("span", { class: "you-label" }, "You"); }
      else {
        name = h("input", { type: "text", id: "fm-label-" + m.id, maxlength: "14", value: m.label, "aria-label": "Label for this " + L.REL_NAME[m.rel].toLowerCase(), autocomplete: "off", spellcheck: "false" });
        name.addEventListener("input", function () { H.members = H.members.map(function (x) { return x.id === m.id ? Object.assign({}, x, { label: name.value.slice(0, 14) }) : x; }); persist(); R.map(); R.figures(); R.explore(); R.status(); });
        fk(name, "label-" + m.id);
      }
      var home = h("select", { "aria-label": "Where " + (m.label || "this person") + " lives" }, L.HOME.map(function (o) { return h("option", { value: o.v }, o.t); }));
      home.value = m.home || "";
      home.addEventListener("change", function () { if (isMe) { H.meHome = home.value; update(); } else { patch(m.id, { home: home.value }); } });
      fk(home, "home-" + m.id);
      list.appendChild(h("li", { class: "person-row person-row--" + (isMe || m.rel === "partner" ? "you" : (m.rel === "parent" || m.rel === "grandparent" ? "elder" : "young")) },
        h("span", { class: "rel-tag" }, L.REL_NAME[m.rel]), name,
        h("div", { class: "stepper", role: "group", "aria-label": "Age band for " + (m.label || "this person") },
          fk(btn("−", function () { stepAge(m.id, -1); }, "step-btn", { "aria-label": "Make " + (m.label || "this person") + " two years younger", disabled: m.age <= 0 }), "dec-" + m.id),
          h("span", { class: "step-val", "aria-live": "off" }, L.band(m.age)),
          fk(btn("+", function () { stepAge(m.id, 1); }, "step-btn", { "aria-label": "Make " + (m.label || "this person") + " two years older", disabled: m.age >= 98 }), "inc-" + m.id)),
        h("label", { class: "lives" }, h("span", { class: "small muted" }, "Lives"), home),
        isMe ? h("span", { class: "row-spacer" }) : fk(btn("Remove", function () { remove(m.id); }, "btn btn--ghost btn--small btn--quiet", { "aria-label": "Remove " + (m.label || "this person") }), "rm-" + m.id)));
    });
    box.appendChild(list);
  };
  R.status = function () { var s = document.querySelector(".save-status strong"); if (s && storageOk) { s.textContent = L.isDefault(H) ? "Example household. " : "Saved in this browser only. "; } };

  /* ---------- Explore ---------- */
  function topicCard(c, keyPrefix) {
    var b = btn([h("span", { class: "card-title" }, c.title, c.badge ? h("span", { class: "tag" + (c.top ? " tag--top" : "") }, c.badge) : null), h("span", { class: "card-text" }, c.short), c.visited ? h("span", { class: "tag tag--seen" }, "Opened") : null],
      function () { go(c.id, null); }, "topic-card" + (c.top ? " topic-card--top" : ""));
    return fk(b, keyPrefix + c.id);
  }
  function pathOf(id) { return T.chain(id).map(function (i) { return T.by[i].title; }).join(" › "); }
  R.explore = function () {
    var guided = H.mode === "guided", w = W(), subj = subject();
    var layer = !X.focus ? (H.who ? 2 : 1) : Math.min(4, T.depth(X.focus) + 3);
    var meter = $("fm-layer");
    S.clear(meter);
    if (guided) {
      meter.appendChild(h("span", { class: "visually-hidden" }, "Layer " + layer + " of 4"));
      for (var i = 1; i <= 4; i++) { meter.appendChild(h("span", { class: "dot" + (i <= layer ? " is-on" : ""), "aria-hidden": "true" })); }
      meter.appendChild(h("span", { class: "small muted", "aria-hidden": "true" }, " Layer " + layer + " of 4"));
    }
    var searchWrap = $("fm-search");
    searchWrap.hidden = guided && !X.q;
    var swap = $("fm-swap"); S.clear(swap);
    if (guided) { swap.appendChild(h("p", { class: "small" }, "Already know what you need? ", fk(btn("Switch to quick path", function () { H.mode = "quick"; update(null, { focus: "fm-q" }); }, "linkish"), "to-quick"))); }
    var body = $("fm-explore-body"); S.clear(body);
    var q = X.q.trim().toLowerCase();
    if (q) {
      var hits = TOP.nodes.filter(function (n) { return (n.title + " " + n.summary).toLowerCase().indexOf(q) >= 0; });
      body.appendChild(h("p", { class: "result-count", role: "status" }, hits.length ? hits.length + (hits.length === 1 ? " topic matches" : " topics match") : "No topic matches. Try a shorter word, or clear the box to see every topic."));
      body.appendChild(h("div", { class: "result-list" }, hits.map(function (n) {
        return fk(btn([h("span", { class: "card-title" }, S.highlight(n.title, X.q)), h("span", { class: "card-path" }, pathOf(n.id))], function () { go(n.id, null); }, "result"), "res-" + n.id);
      })));
      return;
    }
    if (!X.focus) {
      if (guided && !H.who) {
        body.appendChild(h("h3", { class: "step-h" }, "Whose stage are you thinking about?"));
        body.appendChild(h("p", { class: "muted" }, "Pick one person in the household. You can change this at any time."));
        body.appendChild(h("div", { class: "who-grid" }, everyone().map(function (m) {
          return fk(btn([h("span", { class: "card-title" }, (m.label || L.REL_NAME[m.rel]) + ", " + L.band(m.age)), h("span", { class: "card-text" }, L.stageOf(m.age, TOP.stages).name)], function () { pick(m.id); }, "topic-card"), "who-" + m.id);
        })));
        return;
      }
      if (guided) {
        var stg = L.stageOf(subj.age, TOP.stages);
        body.appendChild(h("div", { class: "stage-card" },
          h("p", { class: "kicker" }, (subj.label || "You") + ", " + L.band(subj.age) + " · " + stg.name),
          h("p", null, h("strong", null, "Family: "), stg.rel),
          h("p", null, h("strong", null, "Money: "), stg.fin),
          fk(btn("Choose someone else", function () { H.who = null; X.showAll = false; update(); }, "linkish"), "clear-who")));
        body.appendChild(h("h3", { class: "step-h" }, "What is on your mind?"));
        var cards = L.rank(T.doms, T, w, subj.age, X.visited);
        body.appendChild(h("div", { class: "card-grid" }, (X.showAll ? cards : cards.slice(0, 3)).map(function (c) { return topicCard(c, "dom-"); })));
        if (cards.length > 3) { body.appendChild(fk(btn(X.showAll ? "Show fewer options" : "Show all " + cards.length + " areas", function () { X.showAll = !X.showAll; update(["explore"]); }, "btn btn--ghost btn--small"), "toggle-all")); }
        return;
      }
      body.appendChild(h("h3", { class: "step-h" }, "All topics, in order of the tree"));
      body.appendChild(topicTree());
      return;
    }
    /* A topic is open */
    var n = T.by[X.focus], st = stateInfo();
    var crumbs = h("nav", { class: "crumbs", "aria-label": "Where you are" }, h("ol", null,
      h("li", null, fk(btn("All areas", goHome, "linkish"), "crumb-home")),
      T.chain(X.focus).map(function (id, i, arr) {
        var last = i === arr.length - 1;
        return h("li", null, last ? h("span", { "aria-current": "location" }, T.by[id].title) : fk(btn(T.by[id].title, function () { go(id, X.via); }, "linkish"), "crumb-" + id));
      })));
    body.appendChild(crumbs);
    body.appendChild(h("h3", { id: "fm-topic-h", class: "topic-h", tabindex: "-1" }, n.title));
    var ov = X.via ? L.overlaps(H, T, w).filter(function (o) { return o.id === X.via; })[0] : null;
    if (ov && ov.root === X.focus && !ov.solo) {
      var names = L.join(ov.others.map(function (m) { return m.label; }));
      body.appendChild(h("div", { class: "via-card" }, h("p", { class: "kicker" }, "Why these lives connect"),
        h("div", { class: "via-cols" }, h("div", null, h("p", { class: "strong" }, "For " + names), h("p", null, ov.aT.split("{n}").join(names))), h("div", null, h("p", { class: "strong" }, "For you"), h("p", null, ov.bT.split("{n}").join(names))))));
    }
    body.appendChild(h("p", { class: "topic-summary" }, n.summary));
    var sn = L.stateNote(n, st);
    if (sn) {
      body.appendChild(h("div", { class: "state-note" }, h("p", { class: "kicker" }, "In " + st.n), h("p", null, sn.text),
        sn.link ? h("p", null, S.extLink(sn.link, sn.linkText)) : null, h("p", { class: "small" }, S.badgeGroup(["check"]), " Confirm against the official source before relying on it.")));
    }
    var dm = T.dom(X.focus), rId = X.deepest[dm];
    if (rId && rId !== X.focus && T.isAnc(X.focus, rId)) {
      body.appendChild(fk(btn([h("span", { class: "card-title" }, "↩ Return to the branch you were on"), h("span", { class: "card-path" }, pathOf(rId))], function () { go(rId, X.via); }, "resume"), "resume"));
    }
    var kids = T.kids[n.id] || [];
    if (kids.length) {
      body.appendChild(h("h4", { class: "step-h" }, "Narrow it down"));
      var kc = L.rank(kids, T, w, subj.age, X.visited);
      body.appendChild(h("div", { class: "card-grid" }, ((guided && !X.showAll) ? kc.slice(0, 3) : kc).map(function (c) { return topicCard(c, "kid-"); })));
      if (guided && kc.length > 3) { body.appendChild(fk(btn(X.showAll ? "Show fewer options" : "Show all " + kc.length + " options", function () { X.showAll = !X.showAll; update(["explore"]); }, "btn btn--ghost btn--small"), "toggle-kids")); }
    } else {
      body.appendChild(h("p", { class: "muted small" }, "This is the narrowest level for this branch. The paths below sit beside it."));
    }
    var cross = n.links || [], sibs = (n.parent ? T.kids[n.parent] : T.doms).filter(function (i) { return i !== n.id; }), adj = [];
    cross.concat(sibs).forEach(function (i) { if (i !== n.id && adj.indexOf(i) < 0 && T.by[i]) { adj.push(i); } });
    adj = adj.map(function (i) { return { id: i, visited: !!X.visited[i], linked: cross.indexOf(i) >= 0 }; }).sort(function (a, b) { return (a.visited ? 1 : 0) - (b.visited ? 1 : 0); }).slice(0, 6);
    if (adj.length) {
      body.appendChild(h("h4", { class: "step-h" }, "Paths next to this one"));
      body.appendChild(h("div", { class: "result-list" }, adj.map(function (a) {
        return fk(btn([h("span", { class: "card-title" }, T.by[a.id].title, h("span", { class: "tag" + (a.visited ? " tag--seen" : (a.linked ? " tag--linked" : "")) }, a.visited ? "Opened" : (a.linked ? "Linked topic" : "Not opened"))), h("span", { class: "card-path" }, pathOf(a.id))], function () { go(a.id, null); }, "result"), "adj-" + a.id);
      })));
    }
    var vItems = (n.verify ? [n.verify] : []).concat(dm !== n.id && T.by[dm].verify ? [T.by[dm].verify] : []);
    body.appendChild(h("div", { class: "verify-box" }, h("p", { class: "kicker" }, "⚠ Needs human verification"),
      vItems.map(function (v) { return h("p", { class: "small" }, h("strong", null, v.source + ": "), v.what); }),
      h("p", { class: "small" }, "General information only. Confirm figures and eligibility with the source before anyone acts on them. ", h("a", { href: "register.html" }, "See the needs-checking register"), ".")));
  };
  function topicTree() {
    function list(ids, depth) {
      return h("ul", { class: "tree tree--" + depth }, ids.map(function (id) {
        var n = T.by[id], kids = T.kids[id] || [];
        return h("li", null, fk(btn([n.title, X.visited[id] ? h("span", { class: "tag tag--seen" }, "Opened") : null], function () { go(id, null); }, "tree-btn" + (depth === 0 ? " tree-btn--top" : "")), "tree-" + id), kids.length ? list(kids, depth + 1) : null);
      }));
    }
    return list(T.doms, 0);
  }

  /* ---------- Figures ---------- */
  R.figures = function () {
    var box = $("fm-figures-body"); S.clear(box);
    var subj = subject(), fig = L.figuresFor(subj.age, F, W(), TOP.stages);
    $("fm-fig-kicker").textContent = "Figures for " + (subj.label || "You") + " · " + fig.stage + (fig.hasPage ? " · " + fig.rowName + " row on coeconomics.com" : "");
    $("fm-fig-h").textContent = "Ages " + L.band(subj.age);
    var link = $("fm-fig-link"); link.setAttribute("href", fig.url); link.textContent = fig.hasPage ? "Open this band on coeconomics.com" : "Open coeconomics.com";
    $("fm-fig-note").textContent = fig.hasPage ? "Considerations, scenarios and figures below are from the matching coeconomics.com band page. Several figures cover a wider age group than the two-year band; the group is named on each line." : "coeconomics.com has no band page for this age. Figures shown are the wider age groups that include it, and the considerations are carried over from the nearest page and marked as drafts.";
    box.appendChild(h("div", { class: "chip-row", role: "group", "aria-label": "Show figures for" }, everyone().map(function (m) {
      var on = subj.id === m.id;
      return fk(btn((m.label || L.REL_NAME[m.rel]) + ", " + L.band(m.age), function () { H.who = m.id; X.figAll = false; update(null, { say: "Figures for " + (m.label || "You") + "." }); }, "chip" + (on ? " is-on" : ""), { "aria-pressed": on ? "true" : "false" }), "figwho-" + m.id);
    })));
    var cols = h("div", { class: "fig-cols" });
    var c1 = h("section", { class: "fig-col", "aria-labelledby": "fc1" }, h("h3", { id: "fc1" }, "What people at this age weigh up"));
    if (fig.cons) { c1.appendChild(h("ol", { class: "cons" }, fig.cons.map(function (c) { return h("li", null, h("strong", null, c.title + ". "), c.text, " ", h("span", { class: "src" }, "(" + (F.sources[c.source] || c.source) + ")")); }))); }
    if (fig.missing) { c1.appendChild(S.state("partial", "Not captured", [fig.missing])); }
    if (fig.draft) { c1.appendChild(h("p", { class: "draft-note" }, S.badgeGroup([{ kind: "check", text: "Draft" }]), " " + fig.draft)); }
    var c2 = h("section", { class: "fig-col", "aria-labelledby": "fc2" }, h("h3", { id: "fc2" }, "Three income scenarios"));
    if (fig.income) {
      c2.appendChild(h("p", { class: "small muted" }, fig.income.group + " who lodged a 2022–23 return. Annual taxable income in 2022–23 dollars. Percentiles are interpolated, and tax-free super payments from 60 are not counted. The highlighted scenario is the one closest to the current emphasis; the planner never asks your income."));
      fig.scenarios.forEach(function (sc) {
        c2.appendChild(h("div", { class: "scenario" + (sc.best ? " scenario--best" : "") },
          h("p", { class: "scenario-head" }, h("strong", null, sc.name), h("span", { class: "muted small" }, " · " + sc.pct), sc.best ? h("span", { class: "tag tag--top" }, "Closest to current emphasis") : null),
          h("p", { class: "scenario-range" }, sc.range),
          sc.focus ? h("p", { class: "small" }, sc.focus) : null,
          h("p", { class: "small" }, h("strong", null, "Who to ask: "), sc.pros.join("; "))));
      });
    } else { c2.appendChild(h("p", { class: "muted" }, "coeconomics.com gives no income scenario for ages under 12. Household income is what shapes most options at this age.")); }
    var c3 = h("section", { class: "fig-col", "aria-labelledby": "fc3" }, h("h3", { id: "fc3" }, "Figures for this age group"));
    if (fig.figures.length) {
      var shown = X.figAll ? fig.figures : fig.figures.slice(0, 12);
      c3.appendChild(h("dl", { class: "figlist" }, shown.map(function (f) {
        return [f.showTopic ? h("dt", null, f.topic) : null, h("dd", null, h("strong", null, f.group + ": "), f.text, h("span", { class: "src" }, f.source))];
      })));
      if (fig.figures.length > 12) { c3.appendChild(fk(btn(X.figAll ? "Show fewer figures" : "Show all " + fig.figures.length + " figures", function () { X.figAll = !X.figAll; update(["figures"]); }, "btn btn--ghost btn--small"), "fig-all")); }
    } else { c3.appendChild(h("p", { class: "muted" }, "coeconomics.com lists no figures for this age group.")); }
    cols.appendChild(c1); cols.appendChild(c2); cols.appendChild(c3);
    box.appendChild(cols);
  };

  /* ---------- Branches, emphasis, support ---------- */
  R.branches = function () {
    var box = $("fm-branches-body"); S.clear(box);
    function countAll(id) { return 1 + (T.kids[id] || []).reduce(function (a, c) { return a + countAll(c); }, 0); }
    function countOpen(id) { return (X.visited[id] ? 1 : 0) + (T.kids[id] || []).reduce(function (a, c) { return a + countOpen(c); }, 0); }
    box.appendChild(h("ul", { class: "branch-list" }, T.doms.map(function (d) {
      var o = countOpen(d), t = countAll(d), r = X.deepest[d];
      return h("li", null, h("div", { class: "branch-head" }, h("span", { class: "strong" }, T.by[d].title), h("span", { class: "small muted" }, o + " of " + t + " opened")),
        h("progress", { max: String(t), value: String(o), "aria-label": T.by[d].title + ": " + o + " of " + t + " topics opened" }),
        r && r !== d ? fk(btn("Resume: " + pathOf(r), function () { go(r, null); }, "linkish small"), "br-res-" + d) : (o === 0 ? fk(btn("Not opened yet. Start here", function () { go(d, null); }, "linkish small"), "br-go-" + d) : null));
    })));
  };
  R.emphasis = function () {
    var box = $("fm-emphasis-body"); S.clear(box);
    var w = W(), opened = Object.keys(X.visited).length;
    box.appendChild(h("p", { class: "small muted" }, "Built from your age band and " + (opened === 0 ? "no opened topics yet" : (opened === 1 ? "1 opened topic" : opened + " opened topics")) + ". Income is never asked. It only changes the order and weight of topics. Nothing is removed, and it fades as time moves on."));
    box.appendChild(h("ul", { class: "bars" }, L.BRANCHES.map(function (b, i) {
      var pct = Math.round(w[i] * 100), hint = w[i] >= 0.35 ? "Leading" : (w[i] >= 0.2 ? "Present" : "Quieter");
      var bar = h("span", { class: "bar-fill" }); bar.style.setProperty("--w", String(pct));
      return h("li", null, h("div", { class: "bar-head" }, h("span", { class: "strong" }, b), h("span", { class: "small muted" }, hint + " · " + pct + "%")),
        h("span", { class: "bar", role: "img", "aria-label": b + " weighting about " + pct + " percent, " + hint.toLowerCase() }, bar),
        fk(btn("Show me more " + L.BRANCH_LOWER[i], function () { X.beh = X.beh.map(function (v, j) { return j === i ? v + 3 : v; }); update(null, { say: "More " + L.BRANCH_LOWER[i] + "." }); }, "linkish small"), "boost-" + i));
    })));
    box.appendChild(fk(btn("Reset to age-band default", function () { X.beh = [0, 0, 0, 0]; update(null, { say: "Emphasis reset to your age band." }); }, "btn btn--ghost btn--small"), "reset-beh"));
  };
  R.support = function () {
    var box = $("fm-support-body"); S.clear(box);
    if (!X.focus) { box.appendChild(h("p", { class: "muted" }, "Open a topic to see support that fits the concern, your state and the current emphasis.")); return; }
    var dm = T.dom(X.focus), st = stateInfo(), list = L.supportFor(dm, W(), TOP.orgs, st);
    box.appendChild(h("p", { class: "small muted" }, "For " + T.by[dm].title.toLowerCase() + " in " + st.n + ". Ordered by fit with the current emphasis; everything relevant stays listed."));
    var shown = X.allRefs ? list : list.slice(0, 4);
    box.appendChild(h("ul", { class: "support-list" }, shown.map(function (r) {
      return h("li", { class: "support" }, h("p", { class: "support-head" }, h("span", { class: "strong" }, r.name), h("span", { class: "tag" }, r.kind)),
        h("p", { class: "small" }, r.note),
        r.phone ? h("p", { class: "small" }, "☎ ", h("span", { class: "strong" }, r.phone)) : null,
        r.url ? h("p", { class: "small" }, S.extLink(r.url, "Official site")) : null,
        h("p", { class: "small muted" }, S.badgeGroup(["check"]), r.url ? " Link added 21 Nov 2026; details not yet verified by a person." : " Not yet verified by a person."));
    })));
    if (list.length > 4) { box.appendChild(fk(btn(X.allRefs ? "Show fewer" : "Show all " + list.length + " support options", function () { X.allRefs = !X.allRefs; update(["support"]); }, "btn btn--ghost btn--small"), "refs-all")); }
  };

  /* ---------- Search box (created once so typing keeps focus) ---------- */
  var qi = $("fm-q");
  qi.addEventListener("input", S.debounce(function () { X.q = qi.value; R.explore(); }, 80));
  qi.addEventListener("keydown", function (e) { if (e.key === "Escape") { qi.value = ""; X.q = ""; R.explore(); } });

  S.boot(function () {
    if (!storageOk) { S.storageNotice(); }
    update();
    var p = location.hash.match(/^#topic=([a-z0-9_]{1,40})$/);
    if (p && T.by[p[1]]) { go(p[1], null); }
  });
})();
