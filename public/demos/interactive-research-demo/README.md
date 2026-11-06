# Mock interactive note

A static page that practices the shape of a Distill-style research note: title band, summary, three-part teaser, setup drawers, and figures you can switch, play, and drag.

The numbers and pictures are invented. The page does not report an experiment.

## Preview

From the site repository:

```bash
npx serve public
```

Open `http://localhost:3000/blog/interactive-research-demo/`.

`npm run dev` in `kerem-z.github.io` serves the same file from `public/`, at the same path, as long as no App Router page owns that URL.

## GitHub Pages

The site is a Next.js static export. `next build` copies `public/` into `out/`, and Pages publishes `out/`. This note is published at

`https://kerem-z.github.io/blog/interactive-research-demo/`

No base path is configured. Asset URLs in the page are relative.

## Files

- `index.html` — the note
- `css/style.css` — column, type, teaser, figures
- `js/teaser.js` — scrolling numbers and the growing bar
- `js/patterns.js` — Ring / Steps / Cross
- `js/scene.js` — puck paths
- `js/budget.js` — slider, chart, table
- `js/page.js` — expand, hover grid, citation
- `data/wall.json`, `data/budget.json` — the invented lists
