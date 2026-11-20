import { createHash } from "node:crypto";
import { access, cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { about, games, home, page, projectPage, work } from "./templates.mjs";

// `node src/build.mjs` builds the publishable site into dist/.
// `node src/build.mjs --candidates` also includes content/candidates/ and
// writes to dist-review/, so entries under review never reach dist/.
const review = process.argv.includes("--candidates");

const base = new URL("../", import.meta.url);
const dist = new URL(review ? "dist-review/" : "dist/", base);
const projectDirectory = new URL("content/projects/", base);
const candidateDirectory = new URL("content/candidates/", base);
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

async function loadJson(file) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    throw new Error(`Could not read ${file.pathname}`, { cause: error });
  }
}

async function checkFigure(figure, source, { captionOptional = false } = {}) {
  const { file, width, height, alt, caption } = figure;
  if (!/^[a-z0-9-]+\.(png|jpg|webp|svg)$/.test(file) || !alt || (!caption && !captionOptional)
      || !Number.isInteger(width) || width < 1 || !Number.isInteger(height) || height < 1) {
    throw new Error(`Invalid figure in ${source}`);
  }
  await access(new URL(`public/assets/${file}`, base));
}

async function loadProject(directory, filename, extra = {}) {
  const slug = filename.slice(0, -5);
  const project = await loadJson(new URL(filename, directory));
  if (!slugPattern.test(slug)) throw new Error(`Invalid project filename ${filename}`);
  if (!project.title || !project.summary || !project.question || !Number.isInteger(project.year)
      || !project.topics?.length || !project.sections?.length) {
    throw new Error(`Missing project content in ${filename}`);
  }
  if (project.figure) await checkFigure(project.figure, filename);
  if (project.demo) {
    if (!project.demo.label || !/^[a-z0-9]+(?:-[a-z0-9]+)*\/$/.test(project.demo.path)) {
      throw new Error(`Invalid demo path in ${filename}`);
    }
    await access(new URL(`public/${project.demo.path}index.html`, base));
  }
  if (project.symbol && !(project.symbol.glyph && project.symbol.name && project.symbol.meaning)) {
    throw new Error(`Symbol in ${filename} needs a glyph, a name, and a meaning`);
  }
  for (const section of project.sections) {
    if (!section.title || !section.text) throw new Error(`Incomplete section in ${filename}`);
    if (section.figure) await checkFigure(section.figure, filename);
    if (section.formula && !section.formula.expression) throw new Error(`Empty formula in ${filename}`);
  }
  if (project.previewImage && ![project.figure, ...project.sections.map(section => section.figure)]
    .some(figure => figure?.file === project.previewImage)) {
    throw new Error(`Preview image in ${filename} must reference one of its figures`);
  }
  return { ...project, ...extra, slug };
}

async function loadProjects(directory, extra) {
  let files;
  try {
    files = await readdir(directory);
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
  return Promise.all(files.filter(file => file.endsWith(".json")).map(file => loadProject(directory, file, extra)));
}

async function writePage(route, options) {
  const folder = new URL(route, dist);
  await mkdir(folder, { recursive: true });
  await writeFile(new URL("index.html", folder), page({ ...options, review, version }));
}

const site = await loadJson(new URL("content/site.json", base));
const projects = await loadProjects(projectDirectory);
if (review) {
  const candidates = await loadProjects(candidateDirectory, { candidate: true });
  for (const candidate of candidates) {
    if (projects.some(project => project.slug === candidate.slug)) {
      throw new Error(`Candidate ${candidate.slug} has the same filename as a published project`);
    }
    projects.push(candidate);
  }
}
projects.sort((a, b) => (a.featuredOrder ?? Number.MAX_SAFE_INTEGER) - (b.featuredOrder ?? Number.MAX_SAFE_INTEGER)
  || b.year - a.year || a.title.localeCompare(b.title));

if (site.hero) {
  await checkFigure(site.hero.image, "content/site.json", { captionOptional: true });
  if (site.hero.project && !projects.some(project => project.slug === site.hero.project)) {
    throw new Error(`Hero links to unknown project ${site.hero.project}`);
  }
}

for (const photo of site.photos ?? []) await checkFigure(photo, "content/site.json");
if (site.now && (!site.now.label || !site.now.paragraphs?.length || (site.now.symbol && !site.now.symbol.glyph))) {
  throw new Error("content/site.json: now needs a label and at least one paragraph");
}

if (site.market) {
  const { title, question, intro, rules, related = [] } = site.market;
  if (!title || !question || !intro || !rules?.length) throw new Error("content/site.json: market needs a title, question, intro, and rules");
  for (const slug of related) {
    if (!projects.some(project => project.slug === slug)) throw new Error(`Market game links to unknown project ${slug}`);
  }
  const { invite, steps = [] } = site.market;
  if (invite && !(invite.question && invite.yes && invite.link)) throw new Error("content/site.json: market.invite needs a question, a yes label, and a link label");
  if (steps.some(step => !step.title || !step.paragraphs?.length)) throw new Error("content/site.json: each market step needs a title and a paragraph");
  if (!site.games?.intro) throw new Error("content/site.json: games needs an intro for the Games page");
}

await rm(dist, { recursive: true, force: true });
await cp(new URL("public/", base), dist, { recursive: true });
await writeFile(new URL(".nojekyll", dist), "");

// Stylesheet and script links carry a short fingerprint of their contents. When any of
// them changes the address changes, so browsers fetch the new file instead of a saved copy.
const fingerprint = createHash("sha256");
for (const file of ["site.css", "theme.js", "home.js", "work.js", "market.js", "poker.js"]) {
  fingerprint.update(await readFile(new URL(`public/assets/${file}`, base)));
}
const version = fingerprint.digest("hex").slice(0, 10);
const marketFile = new URL("assets/market.js", dist);
const marketSource = await readFile(marketFile, "utf8");
if (!marketSource.includes('from "./poker.js";')) throw new Error("market.js no longer imports ./poker.js");
await writeFile(marketFile, marketSource.replace('from "./poker.js";', `from "./poker.js?v=${version}";`));

await writePage("./", {
  site, title: site.name, description: site.homeIntro ?? site.intro, root: "./", current: "home", script: "home.js",
  body: home(site, review ? projects.filter(project => !project.candidate) : projects),
});
await writePage("work/", {
  site, title: `Work | ${site.name}`, description: site.workIntro, root: "../", current: "work",
  body: work(site, projects), script: "work.js",
});
if (site.market) {
  await writePage("games/", {
    site, title: `Games | ${site.name}`, description: site.games.intro, root: "../", current: "games",
    body: games(site, projects), module: "market.js",
  });
}
await writePage("about/", {
  site, title: `About | ${site.name}`, description: site.about[0].paragraphs[0], root: "../", current: "about",
  body: about(site),
});
for (const [index, project] of projects.entries()) {
  await writePage(`work/${project.slug}/`, {
    site, title: `${project.title} | ${site.name}`, description: project.summary, root: "../../",
    body: projectPage(project, projects[(index + 1) % projects.length], Boolean(site.market)),
  });
}

console.log(`Built ${projects.length} project pages and ${site.market ? 4 : 3} other pages in ${review ? "dist-review/" : "dist/"}`);
