/* Family Map: register page filters (version 1). The full table is in the HTML; this adds source filters. */
(function () {
  "use strict";
  var S = window.STUR, REG = window.FM_REGISTER;
  var box = document.getElementById("reg-filters"), count = document.getElementById("reg-count");
  if (!S || !REG || !box) { return; }
  var rows = Array.prototype.slice.call(document.querySelectorAll(".reg-table tbody tr"));
  var current = "All";
  function apply(src) {
    current = src;
    var n = 0;
    rows.forEach(function (r) { var show = src === "All" || r.getAttribute("data-source") === src; if (show) { r.removeAttribute("hidden"); n++; } else { r.setAttribute("hidden", ""); } });
    count.textContent = n + (n === 1 ? " item" : " items") + (src === "All" ? " across all sources" : " from " + src);
    S.$all("button", box).forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-src") === src ? "true" : "false"); });
  }
  var group = S.h("div", { class: "chip-row", role: "group", "aria-label": "Filter by source" });
  ["All"].concat(REG.sources).forEach(function (src) {
    var n = src === "All" ? rows.length : rows.filter(function (r) { return r.getAttribute("data-source") === src; }).length;
    if (!n) { return; }
    var b = S.h("button", { type: "button", class: "chip", "data-src": src, "aria-pressed": src === current ? "true" : "false" }, src + " ", S.h("span", { class: "count" }, String(n)));
    b.addEventListener("click", function () { apply(src); });
    group.appendChild(b);
  });
  box.appendChild(group);
})();
