(function () {
  var KEY = "au-theme";
  var root = document.documentElement;

  function current() {
    return root.getAttribute("data-theme") === "light" ? "light" : "dark";
  }

  function syncMeta() {
    var meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) return;
    meta.setAttribute("content", getComputedStyle(root).getPropertyValue("--bg").trim());
  }

  function syncToggle(theme) {
    document.querySelectorAll("[data-theme-toggle]").forEach(function (btn) {
      btn.setAttribute(
        "aria-label",
        theme === "dark" ? "Switch to light theme" : "Switch to dark theme"
      );
      btn.querySelectorAll("[data-theme-value]").forEach(function (el) {
        el.classList.toggle("is-active", el.getAttribute("data-theme-value") === theme);
      });
    });
  }

  function apply(theme, persist) {
    root.setAttribute("data-theme", theme);
    if (persist) {
      try {
        localStorage.setItem(KEY, theme);
      } catch (e) {}
    }
    syncMeta();
    syncToggle(theme);
    window.dispatchEvent(new CustomEvent("themechange", { detail: { theme: theme } }));
  }

  document.querySelectorAll("[data-theme-toggle]").forEach(function (btn) {
    btn.addEventListener("click", function (event) {
      var choice = event.target.closest("[data-theme-value]");
      var next = choice
        ? choice.getAttribute("data-theme-value")
        : current() === "dark"
          ? "light"
          : "dark";
      apply(next, true);
    });
  });

  apply(current(), false);

  var media = window.matchMedia("(prefers-color-scheme: light)");
  var onChange = function (event) {
    try {
      if (localStorage.getItem(KEY)) return;
    } catch (e) {}
    apply(event.matches ? "light" : "dark", false);
  };
  if (media.addEventListener) media.addEventListener("change", onChange);
  else if (media.addListener) media.addListener(onChange);
})();
