// The site opens light. This adds an optional dark theme and remembers the choice.
const toggle = document.querySelector(".theme-toggle");
const root = document.documentElement;

function show() {
  const dark = root.dataset.theme === "dark";
  toggle.textContent = dark ? "Light" : "Dark";
  toggle.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
}

if (toggle) {
  show();
  toggle.hidden = false;
  toggle.addEventListener("click", () => {
    const dark = root.dataset.theme !== "dark";
    if (dark) {
      root.dataset.theme = "dark";
    } else {
      delete root.dataset.theme;
    }
    try {
      localStorage.setItem("theme", dark ? "dark" : "light");
    } catch {}
    show();
  });
}
