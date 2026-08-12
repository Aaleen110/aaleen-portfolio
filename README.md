# Aaleen Mirza — Developer Portfolio

A single-page portfolio built as plain HTML/CSS/JS with a WebGL layer
(Three.js, loaded from a CDN) for the two animated 3D "system topology"
node fields — one behind the hero name, a quieter one behind the skills
section. No build step, no framework, no backend.

## Design concept

The visual language is a technical blueprint / drafting sheet: a navy
grid background, cyan linework, amber "signal" accents, and sections
labelled like drawing sheets (`Sheet 00 — Profile`, `Sheet 01 — Stack`…).
It's a deliberate nod to the fact that a lot of the real work — RAG
routing, event pipelines, architecture docs — is about how systems are
wired together, so the hero canvas renders that literally: nodes, edges,
and small pulses travelling along them like requests in flight.

## File structure

```
index.html         all markup and content
css/style.css       design tokens + all styling
js/scene.js          Three.js node-field scene (hero + skills canvases)
js/main.js           nav, scroll reveals, 3D tilt cards, contact form
```

## Running it locally

No build tooling needed. From this folder, run any static file server, e.g.:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Opening `index.html` directly via `file://` also mostly works, but some
browsers block ES module imports (`type="module"`) over `file://` — a
local server avoids that.

## Deploying

This is a static site — drop the folder as-is onto:
- **Netlify / Vercel**: drag-and-drop the folder, or connect the repo. No build command needed.
- **GitHub Pages**: push to a repo, enable Pages on the branch/folder.
- **Cloudflare Pages**: given the résumé's stack, this is a natural fit — connect the repo with no build command and a root output directory.

## Customizing

- **Colors / type** — every design token lives at the top of `css/style.css` under `:root`. Change `--amber`, `--line-cyan`, etc. and the whole site follows.
- **Content** — all copy lives directly in `index.html`; there's no CMS or data file layer. Search for the section by its `id` (`#stack`, `#projects`, `#experience`, `#writing`, `#contact`).
- **Projects** — each is a `.tilt-card` inside `#projectGrid`. Copy an existing `<article class="tilt-card" data-tilt>` block to add another.
- **3D node fields** — tunable via the `opts` object passed to `createNodeField()` in `js/main.js` (node count, palette, pulse count, rotation speed). See the JSDoc comment at the top of `js/scene.js`.
- **Contact form** — currently has no backend; it opens the visitor's mail client via a `mailto:` link pre-filled from the form (see `initContactForm` in `js/main.js`). To collect submissions properly, swap that handler for a POST to a form service (Formspree, Resend, a Cloudflare Worker) or your own endpoint.

## Performance & accessibility notes

- Both WebGL scenes pause their render loop when scrolled out of view (`IntersectionObserver`) or when the tab is hidden, and are skipped entirely if the visitor has `prefers-reduced-motion` set or the device has no WebGL — the page's layout doesn't depend on them.
- Pixel ratio is capped at 1.5 and node/edge counts are kept low (≈35–50) to stay light on mid-range mobile GPUs.
- All interactive elements are keyboard-reachable with a visible focus ring; there's a skip-to-content link; icon-only links have `aria-label`s; headings follow a single h1 → h2 → h3 hierarchy.
- `prefers-reduced-motion` disables the 3D tilt, scroll-reveals, and canvases sitewide via one CSS media block plus matching JS guards.

## One assumption worth checking

The contact block lists **Pune, India** as the current location, taken
directly from the résumé's availability section. Swap it (and the
`title-block__row` for Location in `index.html`) if that's changed.
