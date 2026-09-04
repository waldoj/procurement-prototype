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
| `index.html` | List page: search, filter, sort, subscribe |
| `detail.html` | Detail page, addressed as `detail.html?id=COL-2026-0142` |
| `404.html` | Server-level 404 for bad paths |
| `rss.xml` | Stub RSS feed — four fixed sample items, never regenerated |
| `css/custom.css` | The few things USWDS doesn't supply |
| `js/` | `format.js`, `tooltip.js`, `theme.js`, `data.js`, `list.js`, `detail.js` |
| `data/solicitations.json` | All site data — 22 opportunities, 10 agencies, 10 categories |
| `documents/` | Three placeholder PDFs |
| `uswds/` | Vendored USWDS 3.13.0 dist |
| `njwds/` | Vendored New Jersey "Grove" 2.9.2 theme (MIT) |
| `mdwds/` | Vendored Maryland Web Design System 0.50.2 |

No build step, no package manager, no framework, no test suite. Vanilla JS in
plain `<script>` tags sharing a single `RFP` global.

`js/tooltip.js` is a fifth file beyond the four listed in `SPEC.md` §2.1, and
adds a fifth namespace property, `RFP.tooltip`. It exists because §8.6's
prescribed approach does not work against the vendored bundle; see below.

## Switching design systems

The slate bar above the government banner swaps the stylesheet between the U.S.
Web Design System, New Jersey's **Grove**, and **Maryland's MDWDS** — both
state systems built on USWDS. The point is that the information architecture and
the writing are the same either way; only the skin changes. The choice is
remembered in `localStorage` and carries across pages.

**It swaps CSS, not markup.** Grove has its own banner component with a state
seal; this prototype does not use it. So what you are seeing is these pages
restyled, not these pages rebuilt in New Jersey's system.

### What actually changes, and what doesn't

Grove re-themes the **primary ramp** (buttons go `#005ea2` → `#0076d6`), the
**accent-warm ramp** (USWDS's orange becomes a cream), `base-lightest`,
`base-light`, and `base-darkest`. Most visibly, the government banner flips from
light grey `#f0f0f0` to near-black `#1c1d1f` with white text.

It leaves alone `base-dark`, `base-lighter`, and the info/warning/error/success
colors — and, deliberately, **link color**: `.usa-link` is `#005ea2` in both.
Grove brightens buttons but keeps links at the darker blue. Links not changing
is Grove's decision, not a gap in this prototype, and it has not been overridden
here.

Because of that overlap, custom CSS that hardcodes a hex can easily pin itself
to the shared part of the palette and never move. `css/custom.css` avoids this
with its own token layer — see `SPEC.md` §3.4 before adding a color there.

Every US state's design system was checked by fetching its actual shipped CSS
and counting USWDS class names. Only three states have a USWDS-derived system
with a usable distribution:

| System | `usa-*` classes | Included? |
|---|---|---|
| **New Jersey "Grove"** | 516 | Yes — MIT, npm and versioned CDN |
| **Maryland MDWDS** | 515 | Yes — versioned CDN, but pre-1.0 (0.50.2) and no stated license |
| Virginia | 512 | No — served from site assets with no versioned distribution |

Ruled out by the same test, all with **zero** `usa-` classes: Pennsylvania
(Keystone), Louisiana (Pelican, Bootstrap-derived), Massachusetts (Mayflower),
Georgia (Orchard), Delaware (Lighthouse), New York, Michigan, Utah, Alaska,
Montana, Missouri, and Rhode Island. Colorado and Kansas publish guidance only.

Adding another theme is: vendor its CSS and the assets that CSS references, add
one line to `SHEETS` in `js/theme.js`, add one `<option>` to the bar in each of
the three HTML files, and add one token block in `css/custom.css`.

Grove is vendored under the MIT license (`njwds/LICENSE`); Maryland publishes no
license with MDWDS. Neither has a `js/` directory — see `SPEC.md` §3.3 for why.

**The federal banner only appears under USWDS.** The "official website of the
State of ..." bar is federal chrome and does not belong under a state's own
design system, so it is hidden for Grove and Maryland. Its content panel is
hidden with it — the header holds the only control that closes the panel, so
otherwise expanding the banner and then switching themes would strand it open.

**Maryland needs a compensation layer.** Its banner CSS is written for its own
`.maryland-banner` markup, and against the USWDS banner markup used here it
collapsed: the flag and the text column both computed to zero width, the
sentence wrapped one character per line, and the banner rendered **904px tall**.
It also ships no `.usa-header`/`.usa-logo`/`.usa-nav-container`, so the site
title fell back to an unstyled italic link flush against the window edge. Both
are corrected by rules scoped to `[data-theme="mdwds"]` in `css/custom.css`; the
vendored stylesheet is untouched. See `SPEC.md` §3.5.

**Two things about Maryland worth knowing.** It keeps USWDS's primary ramp and
typography, re-theming only secondary and accent-warm, so on these pages it is
indistinguishable from stock USWDS except for the urgency tag. Its flag colors
live on `.maryland-*` components this prototype does not use. And its stylesheet
references three absolute URLs (two Material Symbols icons, one Maryland icon
CDN) plus one asset, `img/diamond-pattern-right.svg`, that 403s on Maryland's
own CDN — all four belong to `.maryland-*` components, so nothing here requests
them. The vendored CSS is left byte-for-byte as shipped rather than patched.

## Deploying to GitHub Pages

Push to a repository and turn on Pages (Settings → Pages → deploy from branch).
No build step and no Actions workflow are needed — the files are served as-is.

Every page carries `<meta name="robots" content="noindex, nofollow">` so the
fabricated opportunities never reach search results. If you deploy this
somewhere that serves a `robots.txt`, add a matching `Disallow: /` there too —
the meta tag only helps once a crawler has already fetched the page.

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

**Subscribing does nothing.** The "Get updates about these opportunities" block
at the bottom of the filter sidebar is a mock-up of a real feature. The email
form is `preventDefault`ed and swaps itself for a confirmation that says so
outright — no address is sent or stored anywhere.

**The RSS feed is a stub.** `rss.xml` is a hand-generated file holding four
sample opportunities. It is never regenerated, so it drifts out of step with
`data/solicitations.json` as soon as that changes, and it ignores the filter
parameters the page puts in its address — check any boxes you like, the same
four items come back. The address carries them anyway, because a feed that
follows your filters is the thing being demonstrated. The stub says all of this
on its face, in an XML comment at the top.

What the block does demonstrate is the summary sentence, which names the
filters you have actually checked and rewrites itself as you change them. See
`SPEC.md` §4.7.

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
   That is not possible with the vendored bundle—`uswds.min.js` is a
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
   This satisfies the actual requirement behind §8.6—tooltips that work by
   keyboard in dynamically rendered rows—by a different mechanism.

## Verifying

There is no test suite. Serve the directory and walk `SPEC.md` §10 by hand.

The two checks that are easiest to skip and matter most:

- Operate every control with the keyboard only.
- Confirm tooltips inside dynamically rendered list rows respond to keyboard
  focus, not just hover.
- Do both of those under_ *both* design systems, and check the browser's
  network panel under Grove for any font or image that 404s.
- Confirm switching to Grove changes *color*, not just the typeface—banner,
  buttons, filter panel, and urgency tag should all move. Switching to Maryland
  should change only the urgency tag; that is correct, not a bug.
