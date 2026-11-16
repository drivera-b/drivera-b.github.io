const filter = document.querySelector(".work-filter");
const topic = document.querySelector("#work-topic");
const count = document.querySelector("#work-count");
const rows = document.querySelectorAll("#work-projects > .project-row");

function updateProjects() {
  let visible = 0;
  for (const row of rows) {
    const topics = row.dataset.topics.split("|");
    row.hidden = Boolean(topic.value) && !topics.includes(topic.value);
    if (!row.hidden) visible += 1;
  }
  count.textContent = `${visible} ${visible === 1 ? "project" : "projects"}`;
}

const url = new URL(window.location.href);
const initialTopic = url.searchParams.get("topic");
if ([...topic.options].some(option => option.value === initialTopic)) {
  topic.value = initialTopic;
}
updateProjects();
filter.hidden = false;

topic.addEventListener("change", () => {
  updateProjects();
  const currentUrl = new URL(window.location.href);
  if (topic.value) {
    currentUrl.searchParams.set("topic", topic.value);
  } else {
    currentUrl.searchParams.delete("topic");
  }
  window.history.replaceState(null, "", currentUrl);
});
