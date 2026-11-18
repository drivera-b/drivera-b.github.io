# Daniel Rivera’s portfolio

A static website with a home page, filterable Work index, About page, and six project pages. The first-pass styles are for reviewing content and layout.

## Preview

From this folder, run the build with Node 22 or newer, then serve the generated files locally.

```sh
node src/build.mjs
python3 -m http.server 4173 --bind 127.0.0.1 --directory dist
```

Open [the local preview](http://127.0.0.1:4173/). Rerun `node src/build.mjs` after editing source files, then refresh. The build replaces `dist/` on each run. Work entries and navigation are available with JavaScript disabled. JavaScript enables topic filtering, the optional dark theme, and the “Make a market” game, which opens from the invitation on the home page and has its full layout on the Games page.

To preview entries that are still under review, put them in `content/candidates/` and build with `node src/build.mjs --candidates`. That writes a separate `dist-review/` folder with those entries marked Candidate. Serve it the same way on another port. The normal build and the publish workflow leave candidates out.

## Edit the site

- `content/site.json` contains the home and About copy and the profile links. `hero.image` is the homepage photo, `mark` is the Greek letter beside your name, and `market` is the copy for the “Make a market” game (`invite` and `steps` are the home page invitation and its walkthrough), `games` is the Games page intro, `now` is the “Currently exploring” note on Home and About, and `outside`, `photos`, and `honors` fill the rest of the About page. Every photo needs `file`, `width`, `height`, and `alt`; About photos also need a `caption`.
- `content/projects/` contains one JSON file per project. The filename becomes its URL. Copy an entry to add a project. Use `year` for sorting, `period` for an optional display date, `topics` for filters, and `featuredOrder` for homepage placement and priority in the Work index. Figures and external links are optional.
- A project can have a `symbol` with a `glyph`, a `name`, and a `meaning`. The letter appears beside the project in lists, and the meaning appears on its page.
- Each section can have its own `figure`, and a `formula` with an `expression` and an optional `note`. Figures are numbered in order on the page.
- `src/templates.mjs` contains the shared HTML and page templates. `public/assets/site.css` contains the styles, with the colors and typefaces defined at the top. `public/assets/work.js` adds topic filtering to the Work page and `public/assets/theme.js` runs the theme button. `public/assets/market.js` runs the game on both pages, and `public/assets/poker.js` holds its hand ranking, exact equity, simulation, and trader rules. Run `npm test` after changing either: the tests check the hand ranking against every five-card hand and against a second, simpler ranker.
- `public/assets/` holds the project figures and the self-hosted fonts. Everything under `public/` is copied into the site build.

## Publish on GitHub Pages

When the design and copy are ready, put this folder’s source at the root of a separate `drivera-b.github.io` repository. On GitHub Free use a public repository. In **Settings → Pages**, choose **GitHub Actions** as the source. In **Actions → Publish portfolio**, run the workflow on the default branch. It builds and deploys `dist/`. Run it again when you want to publish edits. [GitHub Pages setup](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
