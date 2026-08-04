# Columbia Bid Opportunities — prototype

A throwaway prototype of a state government bid-opportunity website, built to
demonstrate information architecture and plain-language writing.

**The State of Columbia is not a real state. Every opportunity on this site is
fabricated. Do not submit a bid.**

## Running it

`fetch()` will not work over `file://`, so the directory has to be served:

```
python3 -m http.server
```

Then open <http://localhost:8000/>.

## What's here

| Path | What it is |
|---|---|
| `index.html` | List page: search, filter, sort |
| `detail.html` | Detail page, addressed as `detail.html?id=COL-2026-0142` |
| `404.html` | Server-level 404 for bad paths |
| `css/custom.css` | The few things USWDS doesn't supply |
| `js/` | `format.js`, `tooltip.js`, `data.js`, `list.js`, `detail.js` |
| `data/solicitations.json` | All site data — 22 opportunities, 10 agencies, 10 categories |
| `documents/` | Three placeholder PDFs |
| `uswds/` | Vendored USWDS 3.13.0 dist |

No build step, no package manager, no framework, no test suite. Vanilla JS in
plain `<script>` tags sharing a single `RFP` global.

`js/tooltip.js` is a fifth file beyond the four listed in `SPEC.md` §2.1, and
adds a fifth namespace property, `RFP.tooltip`. It exists because §8.6's
prescribed approach does not work against the vendored bundle; see below.

## Deploying to GitHub Pages

Push to a repository and turn on Pages (Settings → Pages → deploy from branch).
No build step and no Actions workflow are needed — the files are served as-is.

`.nojekyll` is present and must stay. Without it, Pages runs the files through
Jekyll, which skips directories beginning with an underscore. USWDS ships those
inside `uswds/`, so removing `.nojekyll` would break the stylesheet.

Everything works from a project-site subpath (`https://<user>.github.io/<repo>/`)
because every internal path is relative. This has been verified by serving the
site from a subdirectory: all pages, the JSON fetch, fonts, PDFs, and every
internal link resolve correctly, with no console errors.

Note that the detail page's not-found view returns HTTP 200, as described below.

## Known limitations

These are deliberate, and follow from this being a prototype.

**Dates go stale.** Deadlines in `data/solicitations.json` are literal dates,
authored against **August 4, 2026**. Opened long enough after that, every record
will show as closed and the default "Open only" view will be empty. Fixing this
with computed offsets was explicitly out of scope. To refresh the demo, edit the
dates in the JSON.

**The not-found view returns HTTP 200.** `detail.html?id=nonsense` renders a
"we couldn't find that opportunity" view client-side, but the server still
returns 200, because a static host cannot know the id was bad. `404.html`
handles genuinely bad *paths* and is served by GitHub Pages with a real 404.

**No amendments, accounts, or bid submission.** The site lists opportunities and
nothing more. There is no backend.

## Notes for anyone picking this up

**All paths are relative.** GitHub Pages project sites serve from `/<repo>/`, so
a leading `/` in any `src`, `href`, or `fetch` breaks the site.

**Chrome is duplicated on purpose.** Header, banner, and footer are copy-pasted
into all three HTML files. Three copies is correct here; there is no include
mechanism and shouldn't be.

**Markup lives in HTML.** Repeated structures are `<template>` elements, cloned
and populated with `textContent` and `replaceChildren()`. No `innerHTML`, no
template literals building markup.

### Two places this diverges from `SPEC.md`

Both were decided deliberately; `SPEC.md` and `DATA-SCHEMA.md` were left as
written rather than edited to match.

1. **Contact emails use `example.gov`**, not `example.columbia.gov`.
   `DATA-SCHEMA.md` §2.3 says `example.gov`; validation rule §6.9 and the §7
   worked example say `example.columbia.gov`. `example.gov` is IANA-reserved and
   guaranteed unresolvable, so the data cannot reach a real person. This means
   **the data intentionally violates rule §6.9 as written.**

2. **Tooltips are bound by `js/tooltip.js`, not by USWDS.** `SPEC.md` §8.6 says
   to call the tooltip component's `on()` against each newly rendered subtree.
   That is not possible with the vendored bundle — `uswds.min.js` is a
   Browserify UMD bundle exposing only `window.uswdsPresent`, keeping its
   component registry private.

   USWDS also binds its own tooltip handlers to `document.body` at
   `DOMContentLoaded`, which does not cover markup inserted after the fetch
   resolves. Everything on this site is inserted after the fetch resolves —
   including the filter options, which are built from the taxonomies in the
   JSON.

   So tooltip triggers in `<template>` elements are authored in USWDS's
   already-initialized shape (wrapper, trigger, body), and `RFP.tooltip.bind()`
   attaches focus/blur/hover/Escape handlers after each render, using the same
   `is-set`/`is-visible` classes and `aria-hidden` flips USWDS itself uses.
   This satisfies the actual requirement behind §8.6 — tooltips that work by
   keyboard in dynamically rendered rows — by a different mechanism.


## Verifying

There is no test suite. Serve the directory and walk `SPEC.md` §10 by hand.

The two checks that are easiest to skip and matter most:

- Operate every control with the keyboard only.
- Confirm tooltips inside dynamically rendered list rows respond to keyboard
  focus, not just hover.
