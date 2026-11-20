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
  const nav = [
    { id: "home", label: "Home", path: "" },
    { id: "work", label: "Work", path: "work/" },
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
  <link rel="icon" href="${root}assets/favicon.svg" type="image/svg+xml">
  <link rel="preload" href="${root}assets/fonts/inter-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="${root}assets/site.css${v}">
  <script src="${root}assets/theme.js${v}" defer></script>
  ${script ? `<script src="${root}assets/${script}${v}" defer></script>` : ""}${module ? `<script type="module" src="${root}assets/${module}${v}"></script>` : ""}
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  ${review ? `<p class="review-banner">Review build. Candidate entries are under review.</p>` : ""}
  <div class="site-shell${current === "home" ? " site-shell--home" : ""}">
    <header class="site-header">
      <a class="home-link" href="${root}" aria-label="Home"${current === "home" ? ' aria-current="page"' : ""}><span class="site-mark" aria-hidden="true">${escapeHtml(site.mark ?? "D")}</span></a>
      <div class="header-links">
        <nav aria-label="Main navigation">
          ${nav.filter(({ id }) => id !== "home").map(({ id, label, path }) => `<a href="${root}${path}"${id === current ? ' aria-current="page"' : ""}>${label}</a>`).join(" ")}
        </nav>
        <button type="button" class="theme-toggle" hidden>Dark</button>
      </div>
    </header>
    <main id="main" tabindex="-1" class="page-content">
      ${body}
    </main>
    <footer class="site-footer">
      <nav aria-label="Footer navigation">
        ${nav.map(({ id, label, path }) => `<a href="${root}${path}"${id === current ? ' aria-current="page"' : ""}>${label}</a>`).join(" ")}
      </nav>
      <nav aria-label="Elsewhere">${site.links.map(externalLink).join(" ")}</nav>
    </footer>
  </div>
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

function figureBlock(figure, root) {
  return `<figure class="figure">
      <a class="figure-link" href="${root}assets/${escapeHtml(figure.file)}" aria-label="Open full-size image: ${escapeHtml(figure.alt)}">${image(figure, root)}</a>
      <figcaption>${escapeHtml(figure.caption)}</figcaption>
    </figure>`;
}

// A personal photo with a short caption, used on the About page.
function photo(figure, root) {
  return `<figure class="photo">
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

function previewFigures(project) {
  const figures = [project.figure, ...project.sections.map(section => section.figure)].filter(Boolean);
  const primary = figures.find(item => item.file === project.previewImage) ?? figures[0];
  return [primary, figures.find(item => item !== primary)];
}

function thumb(project, root, eager) {
  const [primary, alternate] = previewFigures(project);
  if (!primary) {
    return `<span class="thumb thumb--symbol" aria-hidden="true">${escapeHtml(project.symbol?.glyph ?? project.title.charAt(0))}</span>`;
  }
  const preview = (figure, extra = "") => `<img class="thumb-image${/\.(jpg|webp)$/.test(figure.file) && figure.width / figure.height < 2 ? " thumb-image--photo" : ""}${extra}" alt="" src="${root}assets/${escapeHtml(figure.file)}" width="${figure.width}" height="${figure.height}"${eager && !extra ? "" : ' loading="lazy"'} decoding="async">`;
  return `<span class="thumb${alternate ? " thumb--pair" : ""}" aria-hidden="true">${preview(primary)}${alternate ? preview(alternate, " thumb-image--alternate") : ""}</span>`;
}

function listEntry(project, root, { eager = false } = {}) {
  return `<li class="index-row${project.candidate ? " is-candidate" : ""}" id="project-${project.slug}" data-topics="${escapeHtml(project.topics.join("|"))}">
      <a class="entry" href="${root}work/${project.slug}/">
        ${thumb(project, root, eager)}
        <span class="entry-main">
          <span class="entry-title">${escapeHtml(project.title)}</span>
          <span class="entry-summary">${escapeHtml(project.summary)}</span>
        </span>
        <span class="entry-date">${period(project)}${candidateTag(project)}</span>
      </a>
    </li>`;
}

function homeProjectIndex(projects) {
  const first = projects[0];
  return `<div class="project-index">
      <ul class="entries home-projects" role="list">
        ${projects.map(project => listEntry(project, "./", { eager: true })).join("\n        ")}
      </ul>
      <div class="project-previews" aria-hidden="true">
        ${projects.map(project => {
          const [figure] = previewFigures(project);
          const art = figure
            ? `<div class="preview-image${figure.file.endsWith(".jpg") && figure.width / figure.height < 2 ? " preview-image--photo" : ""}">${image(figure, "./", { alt: "", eager: project === first })}</div>`
            : `<div class="preview-image preview-image--symbol">${escapeHtml(project.symbol?.glyph ?? project.title[0])}</div>`;
          return `<figure id="preview-${project.slug}"${project === first ? ' data-current-preview' : ' hidden'}>
            ${art}
            <figcaption><span>${escapeHtml(project.title)}</span>${escapeHtml(project.question)}</figcaption>
          </figure>`;
        }).join("\n        ")}
      </div>
    </div>`;
}


// The full game on the Games page. Without JavaScript only the description and rules show.
function marketSection(market, projects, root) {
  const related = (market.related ?? []).map(slug => projects.find(project => project.slug === slug)).filter(Boolean);
  return `
  <section class="market" id="market" aria-labelledby="market-heading">
    <h2 id="market-heading">${escapeHtml(market.title)}</h2>
    <div class="market-body">
      <div class="market-text">
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
  return `<div class="intro">
    <h1>${escapeHtml(site.name)}</h1>
    ${site.tagline ? `<p class="intro-tagline">${escapeHtml(site.tagline)}</p>` : ""}
    <p class="intro-bio">${escapeHtml(site.homeIntro ?? site.intro)}</p>
    <p class="intro-links">${site.links.map(externalLink).join(" ")} <a href="./about/">About me</a></p>
  </div>
  <section class="group" aria-labelledby="projects">
    <div class="group-header">
      <h2 class="group-heading" id="projects">Projects</h2>
      <a class="all-work" href="./work/">Browse by topic</a>
    </div>
    ${homeProjectIndex(projects)}
  </section>
  <div class="home-notes">
  ${site.now ? `<section class="group now" aria-labelledby="now-heading">
    <h2 class="group-heading" id="now-heading">${escapeHtml(site.now.label)}</h2>
    <p>${escapeHtml(site.now.paragraphs[0])}</p>
  </section>` : ""}
  ${site.introMore?.length ? `<section class="group now" aria-labelledby="outside-heading">
    <h2 class="group-heading" id="outside-heading">Away from the laptop</h2>
    <p>${escapeHtml(site.introMore.at(-1).replace(/^Away from the laptop, I /, "I "))}</p>
  </section>` : ""}
  </div>`;
}

export function work(site, projects) {
  const topics = [...new Set(projects.flatMap(project => project.topics))].sort();
  return `<section class="group" aria-labelledby="projects">
    <h1 id="projects">Work</h1>\n    <p class="page-intro">${escapeHtml(site.workIntro)}</p>
    <div class="work-filter meta" hidden>
      <div class="filter-chips" role="group" aria-label="Filter work by topic">
        <button type="button" class="chip" data-topic="" aria-pressed="true">All</button>
        ${topics.map(topic => `<button type="button" class="chip" data-topic="${escapeHtml(topic)}" aria-pressed="false">${escapeHtml(topic)}</button>`).join("\n        ")}
      </div>
      <p class="filter-count" id="work-count" role="status"></p>
    </div>
    <ul class="entries" id="work-projects">
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
  </article>`;
}

export function about(site) {
  const rows = site.about.map(block => `<section class="nb-row">
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
    </section>`);
  }
  rows.push(`<section class="nb-row">
      <h2 class="nb-label">Elsewhere</h2>
      <p class="project-links">${site.links.map(externalLink).join(" ")}</p>
    </section>`);
  return `<article class="story">
    <div class="about-header">
      <h1>About</h1>
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
  if (project.demo) links.unshift(`<a href="${root}${project.demo.path}">${escapeHtml(project.demo.label)}</a>`);
  if (hasMarket && project.relatedGame) links.push(`<a href="${root}games/#market">Play the related game</a>`);
  const cover = project.figure
    ? `<figure class="cover"><a class="figure-link" href="${root}assets/${escapeHtml(project.figure.file)}" aria-label="Open full-size image: ${escapeHtml(project.figure.alt)}">${image(project.figure, root, { eager: true })}</a><figcaption>${escapeHtml(project.figure.caption)}</figcaption></figure>`
    : "";
  return `<article class="story">
    <a class="back-link" href="../#project-${project.slug}">Back to work</a>
    <p class="byline"><span class="meta-date">${period(project)}</span><span>${project.topics.map(escapeHtml).join(", ")}</span>${candidateTag(project)}</p>
    <h1>${escapeHtml(project.title)}</h1>
    <p class="deck">${escapeHtml(project.question)}</p>
    ${links.length ? `<p class="project-links">${links.join(" ")}</p>` : ""}
    ${cover}
    ${project.sections.map(section => `<section>
        <h2>${escapeHtml(section.title)}</h2>
        <p>${escapeHtml(section.text)}</p>
        ${section.formula ? formulaBlock(section.formula) : ""}
        ${section.figure ? figureBlock(section.figure, root) : ""}
      </section>`).join("\n      ")}
    ${next ? `<p class="next-line">Next project <a href="../${next.slug}/">${escapeHtml(next.title)}</a></p>` : ""}
  </article>`;
}
