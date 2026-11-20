// Graphite is the default. Remember the theme the visitor chooses.
const toggle = document.querySelector(".theme-toggle");
const root = document.documentElement;

function darkNow() {
  return root.dataset.theme !== "light";
}

function show() {
  const dark = darkNow();
  toggle.textContent = dark ? "Light" : "Dark";
  toggle.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
}

if (toggle) {
  show();
  toggle.hidden = false;
  toggle.addEventListener("click", () => {
    const next = darkNow() ? "light" : "dark";
    root.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {}
    show();
  });
}
