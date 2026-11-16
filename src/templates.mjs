export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function page({ site, title, description, root, current, body, script }) {
  const nav = [
    { id: "home", label: "Home", path: "" },
    { id: "work", label: "Work", path: "work/" },
    { id: "about", label: "About", path: "about/" },
  ];

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="stylesheet" href="${root}assets/site.css">
  ${script ? `<script src="${root}assets/${script}" defer></script>` : ""}
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header">
    <div class="shell header-inner">
      <a class="site-name" href="${root}">${escapeHtml(site.name)}</a>
      <nav aria-label="Main navigation">
        ${nav.map(({ id, label, path }) => `<a href="${root}${path}"${id === current ? ' aria-current="page"' : ""}>${label}</a>`).join("\n        ")}
      </nav>
    </div>
  </header>
  <main class="shell" id="main" tabindex="-1">
    ${body}
  </main>
  <footer class="site-footer">
    <div class="shell footer-inner">
      <span>${escapeHtml(site.name)}</span>
      <nav aria-label="Elsewhere">${site.links.map(externalLink).join(" ")}</nav>
    </div>
  </footer>
</body>
</html>`;
}

function externalLink({ label, url }) {
  if (new URL(url).protocol !== "https:") {
    throw new Error(`Expected an HTTPS URL for ${label}`);
  }
  return `<a href="${escapeHtml(url)}">${escapeHtml(label)}</a>`;
}

function projectRow(project, root, headingTag) {
  return `<li class="project-row" id="project-${project.slug}" data-topics="${escapeHtml(project.topics.join("|"))}">
    <p class="project-period">${escapeHtml(project.period ?? project.year)}</p>
    <div class="project-row-main">
      <${headingTag}><a href="${root}work/${project.slug}/">${escapeHtml(project.title)}</a></${headingTag}>
      <p>${escapeHtml(project.summary)}</p>
      <p class="topics">${project.topics.map(escapeHtml).join(" · ")}</p>
    </div>
  </li>`;
}

export function home(site, featured) {
  return `<div class="page-intro">
    <h1>${escapeHtml(site.name)}</h1>
    <p>${escapeHtml(site.intro)}</p>
  </div>
  <section aria-labelledby="selected-work">
    <div class="section-header">
      <h2 id="selected-work">Selected work</h2>
      <a href="./work/">View all work</a>
    </div>
    <ul class="project-list" role="list">
      ${featured.map(project => projectRow(project, "./", "h3")).join("\n      ")}
    </ul>
  </section>`;
}

export function work(site, projects) {
  const topics = [...new Set(projects.flatMap(project => project.topics))].sort();
  return `<div class="page-intro">
    <h1>Work</h1>
    <p>${escapeHtml(site.workIntro)}</p>
  </div>
  <div class="work-filter" hidden>
    <label for="work-topic">Topic</label>
    <select id="work-topic" aria-controls="work-projects">
      <option value="">All topics</option>
      ${topics.map(topic => `<option>${escapeHtml(topic)}</option>`).join("\n      ")}
    </select>
    <span class="filter-count" id="work-count" role="status"></span>
  </div>
  <ul class="project-list" id="work-projects" role="list">
    ${projects.map(project => projectRow(project, "../", "h2")).join("\n    ")}
  </ul>`;
}

export function about(site) {
  return `<div class="page-intro"><h1>About</h1></div>
  <div class="reading-column">
    ${site.about.map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join("\n    ")}
  </div>`;
}

export function projectPage(project) {
  const links = (project.links ?? []).map(externalLink);

  const figure = project.figure;
  return `<article class="case-study">
    <header class="page-intro">
      <a class="back-link" href="../#project-${project.slug}">Back to work</a>
      <p class="project-period">${escapeHtml(project.period ?? project.year)} · ${project.topics.map(escapeHtml).join(" · ")}</p>
      <h1>${escapeHtml(project.title)}</h1>
      <p>${escapeHtml(project.question)}</p>
      ${links.length ? `<div class="project-links">${links.join(" ")}</div>` : ""}
    </header>
    ${figure ? `<figure>
      <img src="../../assets/${escapeHtml(figure.file)}" width="${figure.width}" height="${figure.height}" alt="${escapeHtml(figure.alt)}">
      <figcaption>${escapeHtml(figure.caption)}</figcaption>
    </figure>` : ""}
    <div class="reading-column">
      ${project.sections.map(section => `<section>
        <h2>${escapeHtml(section.title)}</h2>
        <p>${escapeHtml(section.text)}</p>
      </section>`).join("\n      ")}
    </div>
  </article>`;
}
