# Daniel Rivera’s portfolio

A static website with a home page, filterable Work index, About page, and six project pages. The first-pass styles are for reviewing content and layout.

## Preview

From this folder, run the build with Node 22 or newer, then serve the generated files locally.

```sh
node src/build.mjs
python3 -m http.server 4173 --bind 127.0.0.1 --directory dist
```

Open [the local preview](http://127.0.0.1:4173/). Rerun `node src/build.mjs` after editing source files, then refresh. The build replaces `dist/` on each run. Work entries and navigation are available with JavaScript disabled. JavaScript enables topic filtering.

## Edit the site

- `content/site.json` contains the home and About copy and the profile links.
- `content/projects/` contains one JSON file per project. The filename becomes its URL. Copy an entry to add a project. Use `year` for sorting, `period` for an optional display date, `topics` for filters, and `featuredOrder` for homepage placement and priority in the Work index. Figures and external links are optional.
- `src/templates.mjs` contains the shared HTML and page templates. `public/assets/site.css` contains the base styles. `public/assets/work.js` adds topic filtering to the Work page. Preserve its selectors if you keep that script.
- `public/assets/` holds the project figures. Everything under `public/` is copied into the site build.

## Publish on GitHub Pages

When the design and copy are ready, put this folder’s source at the root of a separate `drivera-b.github.io` repository. On GitHub Free use a public repository. In **Settings → Pages**, choose **GitHub Actions** as the source. In **Actions → Publish portfolio**, run the workflow on the default branch. It builds and deploys `dist/`. Run it again when you want to publish edits. [GitHub Pages setup](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
