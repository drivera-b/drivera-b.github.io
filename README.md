# Daniel Rivera’s portfolio

A static website with a compact homepage, a filterable Projects index, About and Games pages, and six project pages. Project writing and figures live separately from the templates and styles.

## Preview

On macOS, double-click `Preview.command` to build the site and open it in your browser. The preview runs on an available local port. Close its Terminal window when finished.

From this folder, run the build with Node 22 or newer, then serve the generated files locally.

```sh
node src/build.mjs
python3 -m http.server 4173 --bind 127.0.0.1 --directory dist
```

Open [the local preview](http://127.0.0.1:4173/). Rerun `node src/build.mjs` after editing source files, then refresh. The build replaces `dist/` on each run. Project entries and navigation are available with JavaScript disabled. Stylesheet and script links carry a fingerprint of their contents, so a refresh picks up the latest build. JavaScript enables filters, theme switching, and the game on the Games page.

To preview entries that are still under review, put them in `content/candidates/` and build with `node src/build.mjs --candidates`. That writes a separate `dist-review/` folder with those entries marked Candidate. Serve it the same way on another port. The normal build and the publish workflow leave candidates out.

## Edit the site

- `content/site.json` contains the home and About copy and the profile links. `hero.image` is the About portrait. `homePhoto` names one of `photos` for the personal section on the homepage. `market` contains the game rules and the optional walkthrough. `games` is the Games page intro. `now` is the “Currently exploring” note. `outside`, `photos`, and `honors` fill the rest of About. Every photo needs `file`, `width`, `height`, `alt`, and `caption`.
- `content/projects/` contains one JSON file per project. The filename becomes its URL. Copy an entry to add a project. Use `year` for sorting, `period` for an optional display date, `topics` for filters, and `featuredOrder` for homepage placement and priority in the Projects index. An optional `demo` with a `label` and HTTPS `url` adds a link to the live project.
- A project can have a `symbol` with a `glyph`, a `name`, and a `meaning`. The glyph serves as the thumbnail when the project has no figure. Figures link to their full-size images for closer inspection.
- Each section can have its own `figure`, and a `formula` with an `expression` and an optional `note`. Figures link to the full-size image.
- `src/templates.mjs` contains the shared HTML and page templates. `public/assets/site.css` contains the styles and the project thumbnail transitions. `public/assets/work.js` handles topic filtering, and `public/assets/theme.js` runs the theme button. `public/assets/market.js` runs the game, and `public/assets/poker.js` holds its hand ranking, exact equity, simulation, and trader rules. Run `npm test` after changing the game.
- `public/assets/` holds the project figures and the self-hosted fonts. Everything under `public/` is copied into the site build.
- `public/orbit-loom/` contains the standalone Twin Comets viewer at `/orbit-loom/`. Its scene also supplies the animated thumbnail on the homepage. The Orbit Loom project’s `demo` field points to the full hosted editor.

## Publish on GitHub Pages

When the design and copy are ready, put this folder’s source at the root of a separate `drivera-b.github.io` repository. On GitHub Free use a public repository. In **Settings → Pages**, choose **GitHub Actions** as the source. In **Actions → Publish portfolio**, run the workflow on the default branch. It builds and deploys `dist/`. Run it again when you want to publish edits. [GitHub Pages setup](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
