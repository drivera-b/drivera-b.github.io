const filter = document.querySelector(".work-filter");
const chips = [...document.querySelectorAll(".work-filter .chip")];
const count = document.querySelector("#work-count");
const gallery = document.querySelector("#work-projects");
const rows = gallery.querySelectorAll(":scope > li");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let filterAnimation;

function showTopic(topic) {
  let visible = 0;
  for (const row of rows) {
    row.hidden = Boolean(topic) && !row.dataset.topics.split("|").includes(topic);
    if (!row.hidden) visible += 1;
  }
  for (const chip of chips) {
    chip.setAttribute("aria-pressed", String(chip.dataset.topic === topic));
  }
  count.textContent = `${visible} ${visible === 1 ? "entry" : "entries"}`;
}

const requested = new URL(window.location.href).searchParams.get("topic") ?? "";
showTopic(chips.some(chip => chip.dataset.topic === requested) ? requested : "");
filter.hidden = false;

for (const chip of chips) {
  chip.addEventListener("click", () => {
    const topic = chip.dataset.topic;
    const changed = chip.getAttribute("aria-pressed") !== "true";
    showTopic(topic);
    if (changed && !reducedMotion.matches && typeof gallery.animate === "function") {
      filterAnimation?.cancel();
      filterAnimation = gallery.animate(
        [{ opacity: 0.7, transform: "translateY(3px)" }, { opacity: 1, transform: "none" }],
        { duration: 190, easing: "cubic-bezier(.16, 1, .3, 1)" },
      );
    }
    const url = new URL(window.location.href);
    if (topic) {
      url.searchParams.set("topic", topic);
    } else {
      url.searchParams.delete("topic");
    }
    window.history.replaceState(null, "", url);
  });
}
