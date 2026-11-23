import { twinComets } from "../public/orbit-loom/scene.js";

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function page({ site, title, description, root, current, body, script, module, review, version }) {
  const v = version ? `?v=${version}` : "";
  const hasFigures = current === "case" || current === "about";
  const nav = [
    { id: "home", label: "Home", path: "" },
    { id: "work", label: "Projects", path: "work/" },
    ...(site.market ? [{ id: "games", label: "Games", path: "games/" }] : []),
    { id: "about", label: "About", path: "about/" },
  ];
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="dark light">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <script>try { const theme = localStorage.getItem("theme"); if (theme === "light" || theme === "dark") document.documentElement.dataset.theme = theme; } catch {}</script>
  <link rel="icon" href="${root}assets/favicon.svg${v}" type="image/svg+xml">
  <link rel="preload" href="${root}assets/fonts/instrument-sans-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="${root}assets/site.css${v}">
  <script src="${root}assets/theme.js${v}" defer></script>
  ${hasFigures ? `<script src="${root}assets/image-viewer.js${v}" defer></script>` : ""}
  ${script ? `<script src="${root}assets/${script}${v}" defer></script>` : ""}${module ? `<script type="module" src="${root}assets/${module}${v}"></script>` : ""}
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  ${review ? `<p class="review-banner">Review build. Candidate entries are under review.</p>` : ""}
  <div class="site-shell${current ? ` site-shell--${current}` : ""}">
    <header class="site-header">
      <a class="home-link" href="${root}" aria-label="${escapeHtml(site.name)}, home"${current === "home" ? ' aria-current="page"' : ""}>${escapeHtml(site.wordmark ?? site.name)}</a>
      <div class="header-links">
        ${current === "home" ? "" : `<nav aria-label="Main navigation">
          ${nav.filter(({ id }) => id !== "home").map(({ id, label, path }) => `<a href="${root}${path}"${id === current ? ' aria-current="page"' : ""}>${label}</a>`).join(" ")}
        </nav>`}
        <button type="button" class="theme-toggle" hidden>Dark</button>
      </div>
    </header>
    <main id="main" tabindex="-1" class="page-content">
      ${body}
    </main>
    ${current === "home" ? "" : `<footer class="site-footer">
      <nav aria-label="Footer navigation">
        ${nav.map(({ id, label, path }) => `<a href="${root}${path}"${id === current ? ' aria-current="page"' : ""}>${label}</a>`).join(" ")}
      </nav>
      <nav aria-label="Elsewhere">${site.links.map(externalLink).join(" ")}</nav>
    </footer>`}
  </div>
  ${hasFigures ? `<dialog class="image-viewer" aria-label="Full-size image">
    <div class="image-viewer-inner">
      <form method="dialog"><button autofocus>Close</button></form>
      <figure><figcaption hidden></figcaption></figure>
    </div>
  </dialog>` : ""}
</body>
</html>`;
}

function externalLink({ label, url, editor = false }) {
  if (new URL(url).protocol !== "https:") {
    throw new Error(`Expected an HTTPS URL for ${label}`);
  }
  return `<a href="${escapeHtml(url)}"${editor ? ' class="editor-link"' : ""}>${escapeHtml(label)}</a>`;
}

function image(figure, root, { alt = figure.alt, eager = false } = {}) {
  return `<img src="${root}assets/${escapeHtml(figure.file)}" width="${figure.width}" height="${figure.height}" alt="${escapeHtml(alt)}"${eager ? "" : ' loading="lazy"'} decoding="async">`;
}

function figureBlock(figure, root, { className = "figure", eager = false } = {}) {
  return `<figure class="${className}">
      <a class="figure-link" href="${root}assets/${escapeHtml(figure.file)}" aria-label="Open full-size image: ${escapeHtml(figure.alt)}">${image(figure, root, { eager })}</a>
      <figcaption>${escapeHtml(figure.caption)}</figcaption>
    </figure>`;
}

function period(project) {
  return escapeHtml(project.period ?? project.year);
}

function candidateTag(project) {
  return project.candidate ? ' <span class="candidate-tag">Candidate</span>' : "";
}

function previewFigures(project) {
  const figures = [project.figure, ...project.sections.map(section => section.figure)].filter(Boolean);
  const primary = figures.find(item => item.file === project.previewImage) ?? figures[0];
  return [primary, figures.find(item => item !== primary)];
}

function orbitArt() {
  const paths = twinComets(150).map(({ geometry, color, start, duration, width }) =>
    `<path d="${geometry}" stroke="${color}" stroke-width="${width * 1.65}" pathLength="1" style="--stroke-delay:${start * 16}ms;--stroke-time:${duration * 16}ms"></path>`);
  return `<svg viewBox="-355 -225 710 450" fill="none" stroke-linecap="round" aria-hidden="true">${paths.join("")}</svg>`;
}

function thumb(project, root) {
  const [primary, alternate] = previewFigures(project);
  if (!primary) {
    return `<span class="thumb thumb--symbol" aria-hidden="true">${escapeHtml(project.symbol?.glyph ?? project.title.charAt(0))}</span>`;
  }
  const preview = (figure, extra = "") => `<img class="thumb-image${/\.(jpg|webp)$/.test(figure.file) && figure.width / figure.height < 2 ? " thumb-image--photo" : ""}${extra}" alt="" src="${root}assets/${escapeHtml(figure.file)}" width="${figure.width}" height="${figure.height}"${root === "./" && !extra ? "" : ' loading="lazy"'} decoding="async">`;
  return `<span class="thumb${alternate ? " thumb--pair" : ""}" aria-hidden="true">${preview(primary)}${alternate ? preview(alternate, " thumb-image--alternate") : ""}</span>`;
}

function featuredEntry(project) {
  const [figure] = previewFigures(project);
  const art = project.slug === "orbit-loom"
    ? `<span class="feature-art feature-art--orbit">${orbitArt()}</span>`
    : figure ? `<span class="feature-art">${image(figure, "./", { alt: "", eager: true })}</span>` : "";
  return `<li class="home-feature" id="project-${project.slug}">
    ${art}
    <div class="feature-copy">
      <h3><a href="./work/${project.slug}/">${escapeHtml(project.title)}</a></h3>
      <p>${escapeHtml(project.question)}</p>
      <div class="feature-actions">
        ${project.demo ? externalLink({ ...project.demo, label: "Live editor", editor: true }) : ""}
        ${project.slug === "orbit-loom" ? '<button class="feature-replay" type="button" aria-label="Replay the Twin Comets drawing" hidden>Replay</button>' : ""}
      </div>
    </div>
  </li>`;
}

function listEntry(project, root) {
  return `<li class="index-row${project.candidate ? " is-candidate" : ""}" id="project-${project.slug}" data-topics="${escapeHtml(project.topics.join("|"))}">
      <a class="entry" href="${root}work/${project.slug}/">
        ${thumb(project, root)}
        <span class="entry-main">
          <span class="entry-title">${escapeHtml(project.title)}</span>
          <span class="entry-summary">${escapeHtml(project.summary)}</span>
        </span>
        <span class="entry-date">${period(project)}${candidateTag(project)}<span class="entry-arrow" aria-hidden="true">→</span></span>
      </a>
    </li>`;
}


// The full game on the Games page. Without JavaScript only the description and rules show.
function marketSection(market, projects, root) {
  const related = (market.related ?? []).map(slug => projects.find(project => project.slug === slug)).filter(Boolean);
  return `
  <section class="market" id="market" aria-labelledby="market-heading">
    <div class="market-body">
      <div class="market-text">
        <h2 id="market-heading">${escapeHtml(market.title)}</h2>
        <p class="deck">${escapeHtml(market.question)}</p>
        <p>${escapeHtml(market.intro)}</p>
        ${market.steps?.length ? '<button class="mt-link tutorial-button" id="market-tutorial" type="button" hidden>Walk me through it</button>' : ""}
        <details class="market-rules">
          <summary>${escapeHtml(market.rulesLabel ?? "How it works")}</summary>
          <div class="market-rules-body">
            ${market.rules.map(rule => `<p>${escapeHtml(rule)}</p>`).join("\n            ")}
            ${market.formula ? formulaBlock(market.formula) : ""}
            ${market.note ? `<p class="market-note">${escapeHtml(market.note)}</p>` : ""}
          </div>
        </details>
        ${related.length ? `<p class="market-related">Related work: ${related.map(project => `<a href="${root}work/${project.slug}/">${escapeHtml(project.title)}</a>`).join(", ")}</p>` : ""}
        <noscript><p class="market-note">The game needs JavaScript to deal the hands.</p></noscript>
      </div>
      <div class="plate market-table" id="market-table" hidden></div>
      <div id="market-steps" hidden>
        ${(market.steps ?? []).map(step => `<div data-step>
          <h3>${escapeHtml(step.title)}</h3>
          ${step.paragraphs.map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join("\n          ")}
        </div>`).join("\n        ")}
      </div>
    </div>
  </section>`;
}

export function home(site, projects) {
  const personalPhoto = site.photos?.find(figure => figure.file === site.homePhoto);
  const [featured, ...remaining] = projects;
  return `<div class="intro">
    <h1 class="visually-hidden">${escapeHtml(site.name)}</h1>
    <p class="intro-bio">${escapeHtml(site.homeIntro ?? site.intro)}</p>
    <nav class="intro-links" aria-label="Profile and games">${site.links.map(externalLink).join(" ")}${site.market ? ' <a class="intro-games" href="./games/">Games</a>' : ""}</nav>
  </div>
  <section class="group" aria-labelledby="projects">
    <div class="group-header">
      <h2 class="group-heading" id="projects">Selected work</h2>
      <a class="all-work" href="./work/">Browse by topic</a>
    </div>
    <ul class="entries home-projects" role="list">
      ${featured ? featuredEntry(featured) : ""}
      ${remaining.map(project => listEntry(project, "./")).join("\n      ")}
    </ul>
  </section>
  ${site.homeOutside ? `<a class="personal-note" href="./about/">
    ${personalPhoto ? image(personalPhoto, "./", { alt: "" }) : ""}
    <span>
      <span class="personal-title">About me</span>
      <span class="personal-description">${escapeHtml(site.homeOutside)}</span>
    </span>
    <span class="entry-arrow" aria-hidden="true">→</span>
  </a>` : ""}`;
}

export function work(site, projects) {
  const topics = [...new Set(projects.flatMap(project => project.topics))].sort();
  return `<section class="group" aria-labelledby="projects">
    <h1 id="projects">Projects</h1>
    <p class="page-intro">${escapeHtml(site.workIntro)}</p>
    <div class="work-filter meta" hidden>
      <div class="filter-chips" role="group" aria-label="Filter work by topic">
        <button type="button" class="chip" data-topic="" aria-pressed="true">All</button>
        ${topics.map(topic => `<button type="button" class="chip" data-topic="${escapeHtml(topic)}" aria-pressed="false">${escapeHtml(topic)}</button>`).join("\n        ")}
      </div>
      <p class="filter-count" id="work-count" role="status"></p>
    </div>
    <ul class="entries work-gallery" id="work-projects">
      ${projects.map(project => listEntry(project, "../")).join("\n      ")}
    </ul>
  </section>`;
}

export function games(site, projects) {
  const market = site.market;
  return `<article class="story">
    <h1>Games</h1>
    <p class="deck">${escapeHtml(site.games.intro)}</p>
    ${marketSection(market, projects, "../")}
    ${site.games.outlook ? `<p class="games-outlook">${escapeHtml(site.games.outlook)}</p>` : ""}
  </article>`;
}

export function about(site) {
  const [intro, ...background] = site.about;
  const rows = background.map(block => `<section class="nb-row">
      <h2 class="nb-label">${escapeHtml(block.label)}</h2>
      <div class="nb-body">
        ${block.paragraphs.map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join("\n        ")}
      </div>
    </section>`);
  if (site.now) {
    rows.push(`<section class="nb-row">
      <h2 class="nb-label">${escapeHtml(site.now.label)}</h2>
      <div class="nb-body">
        ${site.now.paragraphs.map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join("\n        ")}
      </div>
    </section>`);
  }
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
        ${site.photos.map(figure => figureBlock(figure, "../", { className: "photo" })).join("\n        ")}
      </div>` : ""}
    </section>`);
  }
  if (site.honors?.length) {
    rows.push(`<section class="nb-row">
      <h2 class="nb-label">Recognition</h2>
      <ul class="plain-list nb-body">
        ${site.honors.map(honor => `<li>${escapeHtml(honor)}</li>`).join("\n        ")}
      </ul>
    </section>`);
  }
  return `<article class="story">
    <div class="about-header">
      <div class="about-intro">
        <h1>About</h1>
        ${intro.paragraphs.map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join("\n        ")}
        <p class="project-links">${site.links.map(externalLink).join(" ")}</p>
      </div>
      ${site.hero ? `<figure class="about-portrait">${image(site.hero.image, "../", { eager: true })}</figure>` : ""}
    </div>
    <div class="notebook">
      ${rows.join("\n      ")}
    </div>
  </article>`;
}

function formulaBlock(formula) {
  return `<div class="formula">
          <p class="formula-expression">${escapeHtml(formula.expression)}</p>
          ${formula.note ? `<p class="formula-note">${escapeHtml(formula.note)}</p>` : ""}
        </div>`;
}

export function projectPage(project, next, hasMarket) {
  const links = (project.links ?? []).map(externalLink);
  const root = "../../";
  if (project.demo) links.unshift(externalLink({ ...project.demo, editor: true }));
  if (hasMarket && project.relatedGame) links.push(`<a href="${root}games/#market">Play the related game</a>`);
  const cover = project.figure
    ? figureBlock(project.figure, root, { className: "cover", eager: true })
    : "";
  return `<article class="story case-study">
    <a class="back-link" href="../#project-${project.slug}">Back to projects</a>
    <div class="case-header${cover ? " case-header--with-cover" : ""}">
      <div class="case-intro">
        <p class="byline"><span class="meta-date">${period(project)}</span><span>${project.topics.map(escapeHtml).join(", ")}</span>${candidateTag(project)}</p>
        <h1>${escapeHtml(project.title)}</h1>
        <p class="deck">${escapeHtml(project.deck ?? project.question)}</p>
        ${links.length ? `<p class="project-links">${links.join(" ")}</p>` : ""}
      </div>
      ${cover}
    </div>
    <div class="case-notes">
    ${project.sections.map(section => `<section>
        <h2>${escapeHtml(section.title)}</h2>
        <p>${escapeHtml(section.text)}</p>
        ${section.formula ? formulaBlock(section.formula) : ""}
        ${section.figure ? figureBlock(section.figure, root) : ""}
      </section>`).join("\n      ")}
    ${next ? `<p class="next-line">Next project <a href="../${next.slug}/">${escapeHtml(next.title)}</a></p>` : ""}
    </div>
  </article>`;
}
