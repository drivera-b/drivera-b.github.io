import { access, cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { about, home, page, projectPage, work } from "./templates.mjs";

const base = new URL("../", import.meta.url);
const dist = new URL("dist/", base);
const projectDirectory = new URL("content/projects/", base);
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

async function loadJson(file) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    throw new Error(`Could not read ${file.pathname}`, { cause: error });
  }
}

async function loadProject(filename) {
  const slug = filename.slice(0, -5);
  const project = await loadJson(new URL(filename, projectDirectory));
  if (!slugPattern.test(slug)) throw new Error(`Invalid project filename ${filename}`);
  if (!project.title || !project.summary || !project.question || !Number.isInteger(project.year)
      || !project.topics?.length || !project.sections?.length) {
    throw new Error(`Missing project content in ${filename}`);
  }
  if (project.figure) {
    const { file, width, height, alt, caption } = project.figure;
    if (!/^[a-z0-9-]+\.(png|jpg|webp|svg)$/.test(file) || !alt || !caption
        || !Number.isInteger(width) || width < 1 || !Number.isInteger(height) || height < 1) {
      throw new Error(`Invalid figure in ${filename}`);
    }
    await access(new URL(`public/assets/${file}`, base));
  }
  return { ...project, slug };
}

async function writePage(route, options) {
  const folder = new URL(route, dist);
  await mkdir(folder, { recursive: true });
  await writeFile(new URL("index.html", folder), page(options));
}

const site = await loadJson(new URL("content/site.json", base));
const files = await readdir(projectDirectory);
const projects = await Promise.all(files.filter(file => file.endsWith(".json")).map(loadProject));
projects.sort((a, b) => (a.featuredOrder ?? Number.MAX_SAFE_INTEGER) - (b.featuredOrder ?? Number.MAX_SAFE_INTEGER)
  || b.year - a.year || a.title.localeCompare(b.title));
const featured = projects.filter(project => project.featuredOrder);

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
  site, title: `About | ${site.name}`, description: site.about[0], root: "../", current: "about",
  body: about(site),
});
for (const project of projects) {
  await writePage(`work/${project.slug}/`, {
    site, title: `${project.title} | ${site.name}`, description: project.summary, root: "../../",
    body: projectPage(project),
  });
}

console.log(`Built ${projects.length} project pages and 3 index pages in dist/`);
