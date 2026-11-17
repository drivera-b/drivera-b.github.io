export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function page({ site, title, description, root, current, body, script, review }) {
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
  <script>try { if (localStorage.getItem("theme") === "dark") document.documentElement.dataset.theme = "dark"; } catch {}</script>
  <link rel="icon" href="${root}assets/favicon.svg" type="image/svg+xml">
  <link rel="preload" href="${root}assets/fonts/newsreader-latin-opsz-normal.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="${root}assets/fonts/bodoni-moda-latin-opsz-normal.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="${root}assets/site.css">
  <script src="${root}assets/theme.js" defer></script>
  ${script ? `<script src="${root}assets/${script}" defer></script>` : ""}
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  ${review ? `<p class="review-banner">Review build. Entries marked Candidate are not part of the published site.</p>` : ""}
  <header class="site-header">
    <div class="shell header-inner">
      <a class="brand" href="${root}">
        ${site.mark ? `<span class="symbol symbol-small" aria-hidden="true">${escapeHtml(site.mark)}</span>` : ""}
        <span class="brand-text">
          <span class="site-name">${escapeHtml(site.name)}</span>
          ${site.tagline ? `<span class="tagline">${escapeHtml(site.tagline)}</span>` : ""}
        </span>
      </a>
      <nav aria-label="Main navigation">
        ${nav.map(({ id, label, path }) => `<a href="${root}${path}"${id === current ? ' aria-current="page"' : ""}>${label}</a>`).join("\n        ")}
        <button type="button" class="theme-toggle" hidden>Dark</button>
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

function image(figure, root, { alt = figure.alt, eager = false } = {}) {
  return `<img src="${root}assets/${escapeHtml(figure.file)}" width="${figure.width}" height="${figure.height}" alt="${escapeHtml(alt)}"${eager ? "" : ' loading="lazy"'} decoding="async">`;
}

// Each project can carry one Greek letter that means something in that project.
function symbolTile(project) {
  return project.symbol ? `<span class="symbol" aria-hidden="true">${escapeHtml(project.symbol.glyph)}</span>` : "";
}

// A numbered figure on its own plate, the way a plot is pasted into a notebook.
// Wide charts span the page. Squarer plots and photos stay in the text column
// so they do not tower over the writing.
function figureBlock(figure, root, number, options) {
  const ratio = figure.width / figure.height;
  const shape = ratio >= 2.2 ? "figure-wide" : ratio >= 1.5 ? "figure-medium" : "figure-compact";
  // On phones a wide chart keeps a readable size and pans sideways inside its plate.
  const pans = shape !== "figure-compact";
  return `<figure class="figure ${shape}">
        <div class="plate"${pans ? ` tabindex="0" role="group" aria-label="Figure ${number}. Scrolls sideways on small screens."` : ""}>${image(figure, root, options)}</div>
        <figcaption><span class="fig-number">Fig. ${number}</span> ${escapeHtml(figure.caption)}</figcaption>
      </figure>`;
}

// A personal photo with a short caption, used on the About page.
function photo(figure, root, className = "photo") {
  return `<figure class="${className}">
          <div class="plate">${image(figure, root)}</div>
          <figcaption>${escapeHtml(figure.caption)}</figcaption>
        </figure>`;
}

function period(project) {
  return escapeHtml(project.period ?? project.year);
}

function candidateTag(project) {
  return project.candidate ? ' <span class="candidate-tag">Candidate</span>' : "";
}

function featuredEntry(project, root) {
  const href = `${root}work/${project.slug}/`;
  return `<li class="entry">
        <div class="entry-text">
          <p class="meta">${symbolTile(project)}<span class="meta-date">${period(project)}</span><span>${project.topics.map(escapeHtml).join(", ")}</span></p>
          <h3><a href="${href}">${escapeHtml(project.title)}</a></h3>
          <p class="entry-question">${escapeHtml(project.question)}</p>
          <p class="entry-summary">${escapeHtml(project.summary)}</p>
        </div>
        ${project.figure ? `<a class="plate entry-figure" href="${href}" tabindex="-1" aria-hidden="true">${image(project.figure, root, { alt: "" })}</a>` : ""}
      </li>`;
}

export function home(site, featured) {
  const hero = site.hero;
  const heroLink = hero?.project
    ? ` <a href="./work/${escapeHtml(hero.project)}/">${escapeHtml(hero.linkLabel ?? "Read more")}</a>`
    : "";
  return `<section class="hero${hero ? "" : " hero-plain"}" aria-labelledby="hero-name">
    <div class="hero-text">
      <h1 id="hero-name">${escapeHtml(site.greeting ?? site.name)}</h1>
      <p class="lede">${escapeHtml(site.intro)}</p>
      ${(site.introMore ?? []).map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join("\n      ")}
      <p class="hero-links"><a href="./about/">More about me</a> ${site.links.map(externalLink).join(" ")}</p>
    </div>
    ${hero ? `<figure class="hero-figure">
      <div class="plate">${image(hero.image, "./", { eager: true })}</div>
      ${hero.image.caption || heroLink ? `<figcaption>${escapeHtml(hero.image.caption ?? "")}${heroLink}</figcaption>` : ""}
    </figure>` : ""}
  </section>
  <section class="selected" aria-labelledby="selected-work">
    <div class="section-header">
      <h2 id="selected-work">Selected work</h2>
      <a href="./work/">View all work</a>
    </div>
    <ul class="entries" role="list">
      ${featured.map(project => featuredEntry(project, "./")).join("\n      ")}
    </ul>
  </section>`;
}

function indexRow(project, root) {
  return `<li class="index-row${project.candidate ? " is-candidate" : ""}" id="project-${project.slug}" data-topics="${escapeHtml(project.topics.join("|"))}">
      ${symbolTile(project)}
      <div class="index-main">
        <h2><a href="${root}work/${project.slug}/">${escapeHtml(project.title)}</a></h2>
        <p>${escapeHtml(project.summary)}</p>
      </div>
      <p class="index-meta"><span class="index-date">${period(project)}</span> <span class="index-topics">${project.topics.map(escapeHtml).join(", ")}</span>${candidateTag(project)}</p>
    </li>`;
}

export function work(site, projects) {
  const topics = [...new Set(projects.flatMap(project => project.topics))].sort();
  return `<div class="page-intro">
    <h1>Work</h1>
    <p class="lede">${escapeHtml(site.workIntro)}</p>
  </div>
  <div class="work-filter" hidden>
    <div class="filter-chips" role="group" aria-label="Filter work by topic">
      <button type="button" class="chip" data-topic="" aria-pressed="true">All</button>
      ${topics.map(topic => `<button type="button" class="chip" data-topic="${escapeHtml(topic)}" aria-pressed="false">${escapeHtml(topic)}</button>`).join("\n      ")}
    </div>
    <p class="filter-count" id="work-count" role="status"></p>
  </div>
  <ul class="index" id="work-projects" role="list">
    ${projects.map(project => indexRow(project, "../")).join("\n    ")}
  </ul>`;
}

export function about(site) {
  const rows = site.about.map(block => `<section class="nb-row">
      <h2 class="nb-label">${escapeHtml(block.label)}</h2>
      <div class="nb-body">
        ${block.paragraphs.map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join("\n        ")}
      </div>
    </section>`);
  if (site.outside?.length) {
    rows.push(`<section class="nb-row">
      <h2 class="nb-label">Outside the work</h2>
      <div class="notes">
        ${site.outside.map(note => `<div class="note">
          <h3>${escapeHtml(note.title)}</h3>
          <p>${escapeHtml(note.text)}</p>
        </div>`).join("\n        ")}
      </div>
      ${site.photos?.length ? `<div class="photo-strip">
        ${site.photos.map(figure => photo(figure, "../")).join("\n        ")}
      </div>` : ""}
    </section>`);
  }
  if (site.honors?.length) {
    rows.push(`<section class="nb-row">
      <h2 class="nb-label">Recognition</h2>
      <ul class="plain-list nb-body">
        ${site.honors.map(honor => `<li>${escapeHtml(honor)}</li>`).join("\n        ")}
      </ul>
      ${site.honorsFigure ? photo(site.honorsFigure, "../", "photo photo-wide") : ""}
    </section>`);
  }
  rows.push(`<section class="nb-row">
      <h2 class="nb-label">Elsewhere</h2>
      <p class="project-links">${site.links.map(externalLink).join(" ")}</p>
    </section>`);
  return `<div class="page-intro"><h1>About</h1></div>
  <div class="notebook">
    ${rows.join("\n    ")}
  </div>`;
}

function formulaBlock(formula) {
  return `<div class="formula">
          <p class="formula-expression">${escapeHtml(formula.expression)}</p>
          ${formula.note ? `<p class="formula-note">${escapeHtml(formula.note)}</p>` : ""}
        </div>`;
}

export function projectPage(project, next) {
  const links = (project.links ?? []).map(externalLink);
  const root = "../../";
  let figures = 0;

  return `<article class="case-study">
    <header class="page-intro case-header">
      <a class="back-link" href="../#project-${project.slug}">Back to work</a>
      <div class="case-title${project.symbol ? "" : " case-title-plain"}">
        <div>
          <p class="meta"><span class="meta-date">${period(project)}</span><span>${project.topics.map(escapeHtml).join(", ")}</span>${candidateTag(project)}</p>
          <h1>${escapeHtml(project.title)}</h1>
          <p class="lede">${escapeHtml(project.summary)}</p>
        </div>
        ${project.symbol ? `<p class="case-symbol">${symbolTile(project)}<span class="symbol-caption"><strong>${escapeHtml(project.symbol.name)}</strong>, ${escapeHtml(project.symbol.meaning)}</span></p>` : ""}
      </div>
      ${links.length ? `<p class="project-links">${links.join(" ")}</p>` : ""}
    </header>
    <div class="notebook">
      <section class="nb-row nb-question" aria-labelledby="question">
        <h2 class="nb-label" id="question">Question</h2>
        <p class="question">${escapeHtml(project.question)}</p>
      </section>
      ${project.figure ? figureBlock(project.figure, root, ++figures, { eager: true }) : ""}
      ${project.sections.map(section => `<section class="nb-row">
        <h2 class="nb-label">${escapeHtml(section.title)}</h2>
        <div class="nb-body">
          <p>${escapeHtml(section.text)}</p>
          ${section.formula ? formulaBlock(section.formula) : ""}
        </div>
        ${section.figure ? figureBlock(section.figure, root, ++figures) : ""}
      </section>`).join("\n      ")}
    </div>
    <nav class="case-nav" aria-label="More work">
      <a class="back-link" href="../#project-${project.slug}">Back to work</a>
      ${next ? `<a class="next-link" href="../${next.slug}/"><span>Next</span> ${escapeHtml(next.title)}</a>` : ""}
    </nav>
  </article>`;
}
