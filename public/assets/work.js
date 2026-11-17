const filter = document.querySelector(".work-filter");
const chips = [...document.querySelectorAll(".work-filter .chip")];
const count = document.querySelector("#work-count");
const rows = document.querySelectorAll("#work-projects > .index-row");

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
    showTopic(topic);
    const url = new URL(window.location.href);
    if (topic) {
      url.searchParams.set("topic", topic);
    } else {
      url.searchParams.delete("topic");
    }
    window.history.replaceState(null, "", url);
  });
}
