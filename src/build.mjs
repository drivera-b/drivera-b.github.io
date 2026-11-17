import { access, cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { about, home, page, projectPage, work } from "./templates.mjs";

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
  if (project.symbol && !(project.symbol.glyph && project.symbol.name && project.symbol.meaning)) {
    throw new Error(`Symbol in ${filename} needs a glyph, a name, and a meaning`);
  }
  for (const section of project.sections) {
    if (!section.title || !section.text) throw new Error(`Incomplete section in ${filename}`);
    if (section.figure) await checkFigure(section.figure, filename);
    if (section.formula && !section.formula.expression) throw new Error(`Empty formula in ${filename}`);
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
  await writeFile(new URL("index.html", folder), page({ ...options, review }));
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
const featured = projects.filter(project => project.featuredOrder);

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

await rm(dist, { recursive: true, force: true });
await cp(new URL("public/", base), dist, { recursive: true });
await writeFile(new URL(".nojekyll", dist), "");

await writePage("./", {
  site, title: site.name, description: site.intro, root: "./", current: "home",
  body: home(site, featured),
});
await writePage("work/", {
  site, title: `Work | ${site.name}`, description: site.workIntro, root: "../", current: "work",
  body: work(site, projects), script: "work.js",
});
await writePage("about/", {
  site, title: `About | ${site.name}`, description: site.about[0].paragraphs[0], root: "../", current: "about",
  body: about(site),
});
for (const [index, project] of projects.entries()) {
  await writePage(`work/${project.slug}/`, {
    site, title: `${project.title} | ${site.name}`, description: project.summary, root: "../../",
    body: projectPage(project, projects[(index + 1) % projects.length]),
  });
}

console.log(`Built ${projects.length} project pages and 3 index pages in ${review ? "dist-review/" : "dist/"}`);
