// Sets the theme attribute before first paint, and does nothing else.
//
// Loaded synchronously from <head> because a deferred script paints the wrong
// theme for a frame first. Kept separate from theme.js so that file can stay at
// the end of the body where it belongs.
(function () {
  try {
    var v = localStorage.getItem("feather-theme");
    var dark =
      v === "dark" ||
      ((v === "auto" || v === null) &&
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  } catch (e) {
    document.documentElement.setAttribute("data-theme", "light");
  }
})();
