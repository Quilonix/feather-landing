// Theme + motion. Small enough to stay one file with no dependencies.
//
// The theme is driven by a data attribute rather than an @media block, for the
// same reason the extension itself does it that way: a media query cannot be
// overridden from script, so an explicit Light/Dark choice would be impossible
// to honour. Auto follows the system, which is what the browser UI follows.
(function () {
  "use strict";

  var KEY = "feather-theme"; // "auto" | "light" | "dark"
  var MODES = ["auto", "light", "dark"];
  var root = document.documentElement;
  var mql = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

  function stored() {
    try {
      var v = localStorage.getItem(KEY);
      return MODES.indexOf(v) > -1 ? v : "auto";
    } catch (e) {
      // Storage can be blocked entirely; following the system is a fine default.
      return "auto";
    }
  }

  function resolve(mode) {
    if (mode === "light" || mode === "dark") return mode;
    return mql && mql.matches ? "dark" : "light";
  }

  function apply(mode) {
    root.setAttribute("data-theme", resolve(mode));
    var btns = document.querySelectorAll("[data-theme-set]");
    for (var i = 0; i < btns.length; i++) {
      var isOn = btns[i].getAttribute("data-theme-set") === mode;
      btns[i].setAttribute("aria-pressed", isOn ? "true" : "false");
    }
  }

  // Applied before DOMContentLoaded so the first paint is already correct.
  // theme-boot.js in <head> handles the very first frame; this keeps the
  // control state in sync once the DOM exists.
  apply(stored());

  if (mql && mql.addEventListener) {
    mql.addEventListener("change", function () {
      if (stored() === "auto") apply("auto");
    });
  }

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  ready(function () {
    apply(stored());

    document.addEventListener("click", function (e) {
      var btn = e.target.closest ? e.target.closest("[data-theme-set]") : null;
      if (!btn) return;
      var mode = btn.getAttribute("data-theme-set");
      try {
        localStorage.setItem(KEY, mode);
      } catch (err) {
        // Not fatal: the choice just will not persist across reloads.
      }
      apply(mode);
    });

    // ---- Scroll reveal --------------------------------------------------
    // Anything marked [data-reveal] fades up once as it enters the viewport.
    // Skipped entirely for reduced-motion users and when IntersectionObserver
    // is missing, in which case the CSS default leaves everything visible.
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var targets = document.querySelectorAll("[data-reveal]");

    if (reduce || !("IntersectionObserver" in window)) {
      for (var j = 0; j < targets.length; j++) targets[j].setAttribute("data-revealed", "");
      return;
    }

    root.setAttribute("data-motion", "on");

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.setAttribute("data-revealed", "");
          io.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.08 }
    );

    for (var k = 0; k < targets.length; k++) io.observe(targets[k]);
  });
})();
