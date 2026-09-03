# State of Columbia Procurement Portal — Prototype Specification

## 1. What this is

A throwaway prototype of a public website that lists government bid
opportunities (RFPs). It exists to demonstrate information architecture and
plain-language writing, not to be deployed, maintained, or extended.

**State of Columbia** is a fictional state. All data is fabricated.

### 1.1 Audience

The site is written for businesses that have never sold to a government before.
Every wording decision resolves in favor of that reader. A procurement officer
reading the site should find it obvious but not wrong; a first-time bidder
should find it comprehensible without outside help. But the site must be
tolerable to power users, so if detail starts to become excessive, it should be
hidden behind a tooltip or accordion.

### 1.2 Explicit non-goals

These are out of scope. Do not build them, and do not add scaffolding in
anticipation of them.

- Any content management, authoring, or data-entry workflow.
- Any build step, bundler, package manager, transpiler, or test suite.
- Amendments or addenda to solicitations.
- Vendor accounts, registration, login, bid submission, or notifications.
- A backend, API, or database.
- Pagination or lazy loading.
- Multiple categories per RFP.
- Future maintainability, extensibility, or i18n. This code will be thrown
  away. Prefer the simple version over the general one, every time.

## 2. Technical constraints

| Constraint | Decision |
|---|---|
| Hosting | Static files on GitHub Pages. No server-side anything. |
| Frontend framework | None. No React, Vue, or Svelte. |
| JavaScript | Vanilla ES2020+, loaded via plain `<script>` tags. **No ES modules, no `import`/`export`, no bundler.** |
| Design system | U.S. Web Design System (USWDS), **vendored into the repository**. No CDN links. |
| Additional design systems | New Jersey's "Grove" (`@newjersey/njwds`, MIT) and Maryland's MDWDS (`cdn.maryland.gov/mdwds`, 0.50.2), both USWDS builds with state themes, **also vendored**. Selectable at runtime; see §3.3. |
| CSS | Stock themes, unmodified. Custom CSS only where the design system provides nothing; keep it in one small `css/custom.css`. It must not hardcode color literals — see §3.4. |
| Data | A single JSON file, `data/solicitations.json`, fetched at runtime. |
| Accessibility | WCAG 2.2 Level AA, to the greatest plausible extent. See §8. |
| Browser support | Current evergreen browsers. No polyfills, no transpilation. |

### 2.1 Repository layout

```
/
├── index.html            List page
├── detail.html           Detail page
├── 404.html              Server-level 404 (bad paths)
├── css/
│   └── custom.css        Minimal overrides only
├── js/
│   ├── data.js           Fetch + cache + lookup
│   ├── format.js         Date, currency, and label formatting helpers
│   ├── list.js           List page controller
│   ├── detail.js         Detail page controller
│   └── theme.js          Design-system switcher (loads in <head>; see §3.3)
├── data/
│   └── solicitations.json         All data (see DATA-SCHEMA.md)
├── documents/            Placeholder PDFs
│   ├── sample-rfp.pdf
│   ├── sample-attachment-a.pdf
│   └── sample-pricing-worksheet.pdf
├── uswds/                Vendored USWDS dist (css/, js/, img/, fonts/)
├── njwds/                Vendored Grove theme (css/, img/, fonts/ — no js/)
├── mdwds/                Vendored Maryland theme (css/, img/, fonts/ — no js/)
├── SPEC.md
├── DATA-SCHEMA.md
├── CLAUDE.md
└── README.md
```

### 2.2 Script loading and the global namespace

Because there are no ES modules, all JS files share the global scope. To avoid
collisions:

- Every file wraps its contents in an IIFE.
- Each file attaches exactly one property to a single global object, `RFP`,
  created defensively at the top of each file:
  `window.RFP = window.RFP || {};`
- `data.js` → `RFP.data`; `format.js` → `RFP.format`;
  `list.js` → `RFP.list`; `detail.js` → `RFP.detail`.
- Nothing else is written to `window`.

Load order is fixed and must be respected in the HTML:

```html
<!-- index.html -->
<script src="js/format.js"></script>
<script src="js/data.js"></script>
<script src="js/list.js"></script>

<!-- detail.html -->
<script src="js/format.js"></script>
<script src="js/data.js"></script>
<script src="js/detail.js"></script>
```

Scripts go at the end of `<body>`. Controllers initialize on `DOMContentLoaded`.

`js/theme.js` is the one exception: it loads in `<head>`, before the USWDS
init script, because it must set the stylesheet `href` before first paint or a
stored theme choice shows as a flash of the wrong design system. It still
follows every other rule here — one IIFE, one property (`RFP.theme`).

USWDS's own JS (`uswds/js/uswds.min.js`) loads before the application scripts.
Note that USWDS initializes its components against the DOM present at load, so
any USWDS component rendered dynamically (tooltips inside list rows) must be
initialized manually after render — see §8.6.

### 2.3 Markup lives in HTML

Do not build markup with template literals in JavaScript. Every repeated
structure is a `<template>` element in the HTML file, cloned and populated by
JS. This applies to:

- The list row (`#template-rfp-row` in `index.html`)
- The empty-results message (`#template-no-results`)
- The attachment list item (`#template-attachment` in `detail.html`)
- The detail-page not-found view (`#template-not-found`)

JS may set text content, attributes, and `hidden`. It may not author HTML
strings. `innerHTML` is forbidden except for the one-time clearing of a
container (prefer `replaceChildren()`).

## 3. Site structure

Two functional pages plus a static 404.

| Page | File | URL | Purpose |
|---|---|---|---|
| List | `index.html` | `/` | Search, filter, and sort bid opportunities |
| Detail | `detail.html` | `/detail.html?id=COL-2026-0142` | Everything about one opportunity |
| Not found | `404.html` | any unmatched path | GitHub Pages custom 404 |

### 3.1 URL state

- **Detail pages are linkable**: `detail.html?id=<solicitationNumber>`. The
  `id` parameter is the record's `solicitationNumber`.
- **List state is not in the URL.** Search text, filters, and sort live in
  memory only. Reloading `index.html` returns to defaults. Do not use
  `history.pushState`/`replaceState` on the list page.

### 3.2 Shared chrome

Header, banner, and footer markup is **duplicated verbatim** in `index.html`,
`detail.html`, and `404.html`. Do not inject it with JavaScript. Do not build a
shared-include mechanism. Three copies is correct here.

Chrome consists of:

- **Banner** — the USWDS government banner component, with wording adapted for
  a state. See §7.1 for exact text.
- **Header** — USWDS basic header. Site title "Columbia Bid Opportunities",
  linking to `/`. No navigation links (there is nowhere else to go).
- **Footer** — USWDS slim footer. Contains a plain-text disclaimer that this is
  a demonstration site with fabricated data. See §7.1.

### 3.3 Design-system switcher

A demonstration control, duplicated into all three pages along with the rest of
the chrome. It swaps the `href` of a single themed `<link id="theme-stylesheet">`
between the vendored design systems and does nothing else.

- It changes **CSS only.** Markup does not change. Grove ships its own
  `nj-banner` component with a state seal; this prototype does not use it. The
  demonstration is "these pages, restyled," not "these pages rebuilt in New
  Jersey's system."
- All vendored stylesheets are USWDS builds carrying the same `usa-*` class
  names (USWDS 513, Grove 516, Maryland 515), which is what makes the swap a
  one-line change.
- **No theme ships JS here, for two different reasons.** Grove's
  `dist/js/uswds.min.js` and `uswds-init.min.js` are byte-identical to the ones
  in `uswds/js/`, so a second copy would be redundant — re-check that if Grove
  is updated. Maryland's `mdwds-core.js` is *not* a USWDS bundle: it is an ES
  module driving the 434 `.maryland-*` components, which this prototype does
  not use, and ES modules are forbidden here anyway (§2). In both cases
  `uswds/js/` drives the `usa-*` components under every theme.
- **A theme can be USWDS-derived and still look nearly identical to stock.**
  Maryland keeps USWDS's primary ramp and its Source Sans Pro / Merriweather
  typography, re-theming only secondary and accent-warm — which reach this
  prototype through one surface, the urgency tag. Its distinctive flag colors
  (`#002868`, `#9d2235`) live only on `.maryland-*` components. Do not "fix"
  this by inventing colors Maryland does not use.
- The choice persists in `localStorage` under `rfp-theme`, so it survives
  navigation between the list and detail pages.
- The bar sits **after** the skip link in DOM order and before the banner. It
  renders above the banner, but the skip link stays the first tab stop (§8.1).
- Only these two named themes are accepted; a stored value that is not one of
  them falls back to USWDS rather than reaching a stylesheet `href`.

- **The state name follows the theme.** `js/statename.js` rewrites `Columbia`
  in the rendered text to `Maryland` or `New Jersey` when those systems are
  selected, so the demonstration reads as one site restyled rather than as
  stock USWDS wearing a state palette. It is a `TreeWalker` over text nodes
  plus two attributes (the banner's `aria-label`, the logo link's `title`) and
  `document.title` — no `innerHTML`, and the JSON is never mutated. Each pass
  rewrites *any* of the three names to the current one, so it is idempotent and
  switching state-to-state needs no memory of the original text. The
  `.rfp-demo-bar` subtree is skipped: the switcher's own option labels are two
  of these state names, and rewriting them would collapse the control into
  three identical choices. It is deliberately not comprehensive — solicitation
  numbers keep their `COL-` prefix, and the fabricated ZIP codes and "Capitol
  City" do not move. Renderers call `RFP.stateName.apply()` after they write to
  the DOM, since their text arrives from the JSON after the chrome's first pass.

Wording is in §7.1, where the footer disclaimer must not name a state for this
reason. Accessibility obligations are in §8.2 (the select carries a real visible
label) and §8.7 (what this control is not).

### 3.4 Color tokens in `css/custom.css`

USWDS 3 compiles its Sass to literal hex and exposes no custom properties, so
custom CSS that hardcodes a color silently pins itself to one theme.

`custom.css` therefore declares its own tokens twice — once on `:root` (USWDS)
and once under `[data-theme="njwds"]` (Grove) — and every custom rule uses
`var(--rfp-*)`. `js/theme.js` sets `data-theme` on `<html>` in the same call
that swaps the stylesheet, before first paint. The `:root` values are USWDS, so
the page is still correct if the script never runs.

**Take each value from that design system's own `.bg-<token>` utility class.**
Do not eyeball it and do not invent one.

Two rules that follow from this:

- **Not every token differs.** The two systems share `base-dark`,
  `base-lighter`, and the info/warning/error/success colors, and differ on the
  primary and accent-warm ramps, `base-lightest`, `base-light`, and
  `base-darkest`. A custom surface built on a shared token will not change when
  the theme does. If a surface is *meant* to carry the theme's identity, build
  it on the primary ramp.
- **Contrast is per theme, and pairs can invert.** USWDS `accent-warm-dark` is
  a dark orange that takes white text; Grove's is a pale cream where white
  fails at 1.66:1. Where that happens, tokenize the foreground alongside the
  background and check both themes.

The demo bar (§3.3) is the deliberate exception: it is fixed, because it is the
one element that should hold still while the rest of the page changes.

### 3.5 Theme compensation

A vendored theme can restyle a USWDS component for *its own* markup and break
against the markup here. That is not a vendoring error and it is not fixed by
editing the vendored file, which stays byte-for-byte as shipped. It is fixed
with a rule in `css/custom.css` scoped to `[data-theme="<name>"]`.

Maryland needs three such compensations, all in the banner and header:

- It restyles the banner as one inline run (flag `float:none`, header text
  `display:inline`), which assumes markup without USWDS's grid columns. Against
  the banner markup here, the flag loses its float and stays an inline replaced
  element, `img{max-width:100%}` then resolves against a parent whose width
  depends on the flag itself, and both settle at zero. The text column collapses
  the same way to its 1px `min-width` and wraps one character per line — a 904px
  tall banner. Fixed by letting the columns grow, giving the flag column an
  explicit width, and freeing the flag from the percentage max-width.
- It ships no `.usa-header`, `.usa-navbar`, `.usa-logo` or `.usa-logo__text`,
  having its own `.maryland-header`, so the site title fell back to an unstyled
  italic link. Fixed by restoring the USWDS treatment — Maryland expresses no
  opinion about this component, so there is nothing of its own to honor.
- It ships no base `.usa-nav-container` rule, so the header sat flush against
  the viewport edge. Fixed with Maryland's own `.grid-container` values.

**Verify compensations in a browser, not by reading CSS.** Every one of these
was found by measuring in headless Chrome; none is visible in the stylesheet
diff, and the first fix that looked obvious (restoring `display:block` on the
header text) measured as a no-op. `SPEC.md` §10 lists what to check.

## 4. The list page (`index.html`)

### 4.1 Layout, top to bottom

```
┌────────────────────────────────────────────────────────────────┐
│ [banner: An official website of the State of Columbia      ▾] │
├────────────────────────────────────────────────────────────────┤
│ Columbia Bid Opportunities                                     │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Find work with the State of Columbia                     (h1) │
│  Browse open opportunities to sell goods and services to       │
│  state agencies. Anyone can bid.                               │
│                                                                │
│  ┌──────────────────────────────────┐ ┌────────┐               │
│  │ Search opportunities             │ │ Search │               │
│  └──────────────────────────────────┘ └────────┘               │
│                                                                │
│  ┌─ Filters ──────────┐  ┌─ Results ───────────────────────┐   │
│  │                    │  │ Showing 12 open opportunities   │   │
│  │ Which agency       │  │                                 │   │
│  │ [ ] Transportation │  │ Sort by [Closing soonest    ▾]  │   │
│  │ [ ] Health         │  │ ─────────────────────────────── │   │
│  │ [ ] …              │  │                                 │   │
│  │                    │  │  Managed Network Services  (h2) │   │
│  │ What's being       │  │  for Rural Health Clinics       │   │
│  │ bought             │  │  ┌─────────────┐                │   │
│  │ [ ] Construction   │  │  │ Closes in 5 │  ← tag if ≤7d  │   │
│  │ [ ] IT & software  │  │  └─────────────┘     days       │   │
│  │ [ ] …              │  │  The Department of Health wants │   │
│  │                    │  │  a vendor to run the computer   │   │
│  │ Status             │  │  networks at 14 rural clinics.  │   │
│  │ (•) Open only      │  │                                 │   │
│  │ ( ) Open + closed  │  │  Agency  Department of Health   │   │
│  │                    │  │  Bids due  Mar 14, 2026, 2 PM   │   │
│  │ [ Clear filters ]  │  │            Central time         │   │
│  └────────────────────┘  │  Type of work  IT and software  │   │
│                          │  ─────────────────────────────  │   │
│                          │  Opportunity #COL-2026-0142  ·  │   │
│                          │  Posted Feb 2, 2026             │   │
│                          │ ─────────────────────────────── │   │
│                          │  [next opportunity…]            │   │
│                          └─────────────────────────────────┘   │
├────────────────────────────────────────────────────────────────┤
│ [footer + demo-data disclaimer]                                │
└────────────────────────────────────────────────────────────────┘
```

Use the USWDS grid: filters in a left sidebar (`desktop:grid-col-4`), results
in the main column (`desktop:grid-col-8`). On mobile the filters stack above
the results inside a USWDS accordion, collapsed by default.

### 4.2 Search

- Single text input plus a submit button, using the USWDS search component
  (`usa-search`).
- Filters as the user types (`input` event), debounced 200ms. The button
  submits too, for keyboard and screen-reader users who expect it. Pressing
  Enter must not reload the page (`preventDefault` on submit).
- Case-insensitive substring match across: `title`, `summary`, `description`,
  `solicitationNumber`, and the agency's display `name`.
- No fuzzy matching, stemming, or ranking. Simple `includes()` on a
  lowercased, whitespace-normalized haystack.

### 4.3 Filters

Three filter groups, all rendered from the taxonomies in `solicitations.json`
(see DATA-SCHEMA.md §3), never derived from the records.

| Group | Control | Behavior |
|---|---|---|
| Agency | Checkbox list | Multi-select. None checked = all agencies. Multiple checked = OR. |
| Category | Checkbox list | Multi-select. None checked = all categories. Multiple checked = OR. |
| Status | Radio pair | Single-select. **Default: "Open only."** Alternative: "Open and closed." |

Groups combine with AND. Search combines with AND over the filtered set.

Each agency and category option label is followed by a USWDS tooltip trigger
(a small button with an info icon, `aria-label` "What is this?") whose content
is the taxonomy entry's `description`. Tooltips are the mechanism for
explanation throughout the site — see §7.3.

A **"Clear filters"** button resets all three groups to defaults (status back
to "Open only") and clears the search box, then re-renders and moves focus to
the results heading.

### 4.4 Sort

A `<select>` labeled "Sort by", above the results.

| Option value | Label | Ordering |
|---|---|---|
| `deadline` *(default)* | Closing soonest | `deadline` ascending |
| `posted` | Recently posted | `postedDate` descending |
| `title` | Title (A–Z) | `title` ascending, `localeCompare`, case-insensitive |

**Status is always the primary sort key.** Open records sort before closed
records regardless of the selected option; the selected option orders within
each status group. Ties break on `solicitationNumber` ascending so ordering is
stable.

A record is **closed** when its `deadline` is in the past relative to page
load, or its `status` field is `"closed"` or `"awarded"`. Compute this once at
load into a derived boolean; do not recompute per render.

### 4.5 The result row

One row per record, rendered from `#template-rfp-row`. Wrapped in a `<ul>` with
`class="usa-list usa-list--unstyled"`; each row is an `<li>` separated by a
top border.

Visual hierarchy, in order:

1. **Title** — `<h2>`, containing the only link in the row, to
   `detail.html?id=…`. The entire row is *not* clickable; only the title.
2. **Status tag** — a USWDS tag. Rendered **only when the record is not open**
   ("Closed", "Awarded") or when it closes within 7 days
   ("Closes in 5 days", `usa-tag--big` in a warning color). An open record with
   a distant deadline gets no tag. Never render a tag reading "Open."
3. **Summary** — the record's `summary`, one or two plain sentences.
4. **Prominent metadata** — a definition list (`<dl>`) with three pairs:
   agency name, deadline, category. Deadline shows the full formatted datetime
   with time zone, and the relative countdown when applicable.
5. **Quiet metadata** — a final line in smaller, muted text:
   `Opportunity #COL-2026-0142 · Posted February 2, 2026`.

Exact display labels are in §7.2. Do not invent alternatives.

### 4.6 Result count and empty state

Above the sort control, a live count: `Showing 12 open opportunities`. Wording
varies with the status filter:

- Open only: "Showing 12 open opportunities"
- Open and closed: "Showing 31 opportunities"
- Exactly one: "Showing 1 opportunity"
- With an active search: "Showing 3 opportunities matching "network""

The count element is an `aria-live="polite"` region so filter changes are
announced. See §8.4.

When nothing matches, hide the list and render `#template-no-results`:

> **No opportunities match what you're looking for.**
> Try removing a filter or searching for a different word. If you selected
> "Open only," there may be closed opportunities that match.
>
> [ Clear filters and start over ]

## 5. The detail page (`detail.html`)

### 5.1 Loading and identification

1. Read `id` from `location.search`.
2. Fetch and cache `data/solicitations.json` via `RFP.data`.
3. Find the record whose `solicitationNumber` equals `id` (exact,
   case-sensitive).
4. If `id` is missing, empty, or matches nothing → render the not-found view
   (§5.4). Otherwise render the record.

While loading, show a USWDS loading state or simply nothing; do not flash the
not-found view before the fetch resolves.

Set `document.title` to `` `${record.title} — Columbia Bid Opportunities` ``
once the record resolves, or `Opportunity not found — Columbia Bid
Opportunities` on failure.

### 5.2 Layout, top to bottom

```
┌────────────────────────────────────────────────────────────────┐
│ [banner] [header]                                              │
├────────────────────────────────────────────────────────────────┤
│  ‹ Back to all opportunities                                   │
│                                                                │
│  ┌──────────────┐                                              │
│  │ Closes in 5  │  ← status/urgency tag, same rules as list    │
│  └──────────────┘                                              │
│  Managed Network Services for Rural Health Clinics        (h1) │
│  Opportunity #COL-2026-0142                                    │
│                                                                │
│  ┌─ Key facts ──────────────────────────────────────────────┐  │
│  │ Bids due          March 14, 2026, 2:00 PM Central time   │  │
│  │                   (in 5 days)                            │  │
│  │ Questions due     February 28, 2026, 5:00 PM Central (?) │  │
│  │ Posted            February 2, 2026                       │  │
│  │ Agency            Department of Health                   │  │
│  │ Type of work      IT and software                    (?) │  │
│  │ Estimated value   $400,000 to $600,000 over 3 years  (?) │  │
│  │ Contract length   3 years, with two 1-year renewals  (?) │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
│  What this opportunity is about                           (h2) │
│  [plain-language summary paragraph]                            │
│                                                                │
│  What the agency needs                                    (h2) │
│  [full description, multiple paragraphs]                       │
│                                                                │
│  Who can bid                                              (h2) │
│  [eligibility text]                    ← omit section if empty │
│                                                                │
│  Meeting before you bid                                   (h2) │
│  [date, time, location, whether required]  ← omit if none      │
│                                                                │
│  How to submit your bid                                   (h2) │
│  [submission method and address]                               │
│                                                                │
│  Documents to download                                    (h2) │
│  • Request for Proposals (PDF)                                 │
│  • Attachment A: Clinic locations (PDF)                        │
│  • Pricing worksheet (PDF)                                     │
│                                                                │
│  Who to contact with questions                            (h2) │
│  Dana Whitfield, Contracting Officer                           │
│  dana.whitfield@example.gov                                    │
│  (555) 010-4412                                                │
│                                                                │
├────────────────────────────────────────────────────────────────┤
│ [footer]                                                       │
└────────────────────────────────────────────────────────────────┘
```

`(?)` marks a USWDS tooltip trigger. Content is in §7.3.

Use `desktop:grid-col-8` for readable measure; do not run body text full width.

### 5.3 Section rules

- Every section is an `<h2>` followed by its content. Headings are the exact
  strings in §7.2.
- **Sections with no data are omitted entirely** — heading and all. Never
  render "None" or "N/A". Sections that may be absent: eligibility, pre-bid
  meeting, questions deadline, documents.
- "Key facts" is a `<dl>` inside a USWDS summary box (`usa-summary-box`).
- Documents render from `#template-attachment` as a `<ul class="usa-list">`.
  Each item is a link to the file in `documents/`, with the label as link text
  and the format appended as plain text in parentheses: `Pricing worksheet
  (PDF)`. File size is **not** shown.
- Contact renders as three lines: name and title, a `mailto:` link, and a
  `tel:` link.
- The back link at the top reads "Back to all opportunities" and points to `/`.

### 5.4 Not-found view

When the `id` is missing or unmatched, replace the entire main content with
`#template-not-found`. Do not redirect.

> # We couldn't find that opportunity
>
> The link may be out of date, or the opportunity may have been removed.
>
> [ See all opportunities ]

This is a client-side rendering; the HTTP status is still 200. That is
acceptable for a prototype and should be noted in `README.md`.

`404.html` handles genuinely bad *paths* (GitHub Pages serves it
automatically). It carries the same chrome and the same message, with no
JavaScript.

## 6. Data handling

See `DATA-SCHEMA.md` for the full schema. Behavioral requirements:

- `data/solicitations.json` is fetched once per page load with `fetch()`.
  `solicitations.data` caches the parsed result in a module-level variable
  and returns the same promise to repeat callers.
- On fetch or parse failure, render a USWDS error alert in the main content
  area: "We're having trouble loading opportunities right now. Please refresh
  the page to try again." Log the underlying error to the console. Do not
  retry automatically.
- Records are **not** mutated. Derived values (closed status, parsed `Date`
  objects, lowercased search haystack) are computed once at load into a
  parallel structure or non-enumerable properties, not written back into the
  record shape.
- Dates in the JSON are ISO 8601 with an explicit offset. All formatting is
  done at render time with `Intl.DateTimeFormat` — see `format.js`.

## 7. Language

### 7.1 Chrome text

**Banner (adapted for a state):**

- Collapsed: `An official website of the State of Columbia`
- Expand button: `Here's how you know`
- Expanded, two columns:
  - **Official websites use .example.gov** — A **.example.gov** website
    belongs to an official government organization in the State of Columbia.
  - **Secure .example.gov websites use HTTPS** — A **lock** or **https://**
    means you've safely connected to the .example.gov website. Share
    sensitive information only on official, secure websites.

**Design-system switcher (demo bar, above the banner):**

- Label: `Design system`
- Options, in order: `U.S. Web Design System` (default), `New Jersey — Grove`,
  `Maryland — MDWDS`

**Footer disclaimer (required, plain and unmissable):**

> This is a demonstration site. It is not affiliated with any real government,
> and every opportunity listed here is fictional. Do not submit a bid.

The disclaimer must not name a state. The switcher rewrites the state name
(3.3), so a sentence asserting that a named state is not real becomes false the
moment the page is themed as Maryland or New Jersey — which is exactly when an
unmissable disclaimer matters most.

### 7.2 Field labels

These are the exact display labels. Do not paraphrase them. JSON keys are in
`DATA-SCHEMA.md`; only display strings appear here.

| Field | Label (list page) | Label (detail page) |
|---|---|---|
| `title` | *(heading, no label)* | *(heading, no label)* |
| `solicitationNumber` | `Opportunity #` | `Opportunity #` |
| `summary` | *(no label)* | `What this opportunity is about` (h2) |
| `description` | — | `What the agency needs` (h2) |
| `agency` | `Agency` | `Agency` |
| `category` | `Type of work` | `Type of work` |
| `postedDate` | `Posted` | `Posted` |
| `deadline` | `Bids due` | `Bids due` |
| `questionsDeadline` | — | `Questions due` |
| `estimatedValue` | — | `Estimated value` |
| `contractTerm` | — | `Contract length` |
| `eligibility` | — | `Who can bid` (h2) |
| `preBidMeeting` | — | `Meeting before you bid` (h2) |
| `submission` | — | `How to submit your bid` (h2) |
| `attachments` | — | `Documents to download` (h2) |
| `contact` | — | `Who to contact with questions` (h2) |

Other UI strings:

| Element | Text |
|---|---|
| Page h1 (list) | `Find work with the State of Columbia` |
| Intro paragraph | `Browse open opportunities to sell goods and services to state agencies. Anyone can bid.` |
| Search input label | `Search opportunities` |
| Search placeholder | *(none — placeholders are not labels)* |
| Agency filter legend | `Which agency` |
| Category filter legend | `What's being bought` |
| Status filter legend | `Status` |
| Status option 1 | `Open only` |
| Status option 2 | `Open and closed` |
| Clear button | `Clear filters` |
| Sort label | `Sort by` |
| Back link | `Back to all opportunities` |
| Mobile filter accordion | `Filter opportunities` |

### 7.3 Tooltip content

Tooltips carry the explanations a first-time bidder needs and an experienced
one does not. Use the USWDS tooltip component. Every trigger is a `<button
type="button">` with an `aria-label` of `What does "<label>" mean?`, so the
control is reachable by keyboard and announced sensibly.

| Attached to | Tooltip text |
|---|---|
| `Opportunity #` | The state's tracking number for this opportunity. Include it on everything you send. |
| `Bids due` | Your complete bid must arrive by this exact time. Late bids are rejected, even by a minute. |
| `Questions due` | The last day to ask the agency about this opportunity. Answers are shared with everyone who is bidding. |
| `Estimated value` | The agency's rough guess at what this will cost. It is not a promise, and the final amount may differ. |
| `Contract length` | How long the work is expected to last, including any renewals the agency may choose to exercise. |
| `Type of work` | The general category this opportunity falls into. Agencies use these to help vendors find relevant work. |
| Each agency filter option | *(the taxonomy entry's `description`)* |
| Each category filter option | *(the taxonomy entry's `description`)* |

Where an explanation runs longer than a sentence or two — currently only the
"Who can bid" section when eligibility rules are involved — use a USWDS
accordion (collapsed by default) rather than a tooltip.

### 7.4 Writing rules

Apply these to all UI text and all mock data.

- Prefer the second person when instructions are for the bidder. "Your
  bid must arrive by…" not "Bids must be received by…" But do not use the
  second person when describing the work to be done, because it is not the
  bidder who will be performing the work required by the solicitation.
- Prefer verbs to nominalizations. "Submit your bid" not "Bid submission."
- Ban these words in user-facing text unless immediately defined:
  *solicitation, procurement, vendor, respondent, offeror, RFP, RFQ, IFB,
  addendum, set-aside, commodity code, NIGP, encumbrance, award vehicle.*
  Where a banned term is unavoidable in mock data (an agency really would
  title a document "Request for Proposals"), it may appear in the data but
  must not appear in the UI chrome.
- Say "opportunity," not "solicitation." Say "the agency," not "the issuing
  entity." Say "you," not "the vendor."
- Spell out dates: `March 14, 2026`, not `03/14/2026`. Always name the time
  zone in words: `2:00 PM Central time`.
- Sentence case for headings and labels, not Title Case.

## 8. Accessibility (WCAG 2.2 AA)

USWDS supplies most of this. The parts it cannot supply are below, and they
are requirements, not suggestions.

### 8.1 Structure

- One `<h1>` per page. Heading levels descend without gaps.
- Landmarks: `<header>`, `<nav>` (only if navigation exists), `<main
  id="main-content">`, `<footer>`. A USWDS skip link targets `#main-content`.
- `<html lang="en">`.

### 8.2 Forms

- Every input has a visible, programmatically associated `<label>`.
- Each filter group is a `<fieldset>` with a `<legend>` (the legend text in
  §7.2).
- Placeholders are never used as labels.

### 8.3 Links and buttons

- Links navigate; buttons act. "Clear filters" is a `<button>`.
- No "click here" or bare "Read more." Every link makes sense out of context —
  the title link works because it is the title.
- Focus is never trapped or removed. Do not set `outline: none` anywhere.

### 8.4 Dynamic updates

- The result-count element is `aria-live="polite"` `aria-atomic="true"`. It is
  the single announcement channel for filter, search, and sort changes; do not
  add a second live region.
- Debounce announcements with the search debounce so typing does not produce a
  stream of interruptions.
- After "Clear filters," move focus to the results heading (give it
  `tabindex="-1"`).
- The result list itself is not a live region.

### 8.5 WCAG 2.2 specifics

- **2.4.11 Focus Not Obscured (Minimum)** — the mobile filter accordion must
  not overlay a focused control. Avoid sticky positioning entirely.
- **2.5.8 Target Size (Minimum)** — every interactive target is at least
  24×24 CSS pixels, including the tooltip info triggers. USWDS defaults
  satisfy this; custom triggers must be checked.
- **3.2.6 Consistent Help** — the contact information sits in the same place
  (last section) on every detail page.
- **3.3.2 Labels or Instructions** — the intro paragraph explains what the
  page is for before the controls appear.

### 8.6 Dynamic USWDS components

USWDS initializes components at load. Tooltips inside dynamically rendered
list rows will not work unless re-initialized. After each list render, call the
tooltip component's `on()` against the newly inserted subtree. Verify this by
keyboard, not by eye — a tooltip that only responds to hover is a failure.

### 8.7 Non-goals

Do not add an accessibility widget, a font-size switcher, or a contrast
toggle. The browser does these better.

The design-system switcher (§3.3) is not an exception to this. It is a
demonstration control for showing the same information architecture under a
different state's theme, not an affordance offered to users of the site — which
is why it sits outside the site chrome rather than within it. It must not grow
into a preferences panel.

## 9. Placeholder documents

Generate three small PDFs in `documents/`. Every record's attachments point at
some subset of these three files; do not create a unique file per record.

| File | Label used in data | Content |
|---|---|---|
| `sample-rfp.pdf` | *(varies — e.g. "Request for Proposals")* | One page. Heading, a paragraph stating this is a fabricated sample for a demonstration site, and nothing else. |
| `sample-attachment-a.pdf` | *(varies — e.g. "Attachment A: Clinic locations")* | One page, same treatment. |
| `sample-pricing-worksheet.pdf` | *(varies — e.g. "Pricing worksheet")* | One page, same treatment. |

Each PDF must state plainly on its face that it is placeholder content from a
demonstration site and contains no real solicitation. Keep each under ~50 KB.

## 10. Definition of done

- [ ] `index.html` lists all open records by default, sorted closing-soonest.
- [ ] Search, three filter groups, and sort all work and compose correctly.
- [ ] Closed records are hidden until "Open and closed" is selected, and then
      sort after all open records under every sort option.
- [ ] Empty state appears with a working "clear filters and start over."
- [ ] Result count is accurate and announced to screen readers.
- [ ] Every list row links to a working detail page.
- [ ] Detail pages render every populated section and omit every empty one.
- [ ] `detail.html` with a missing or bogus `id` renders the not-found view.
- [ ] `404.html` exists and carries site chrome.
- [ ] All three placeholder PDFs download.
- [ ] Tooltips work by keyboard on both pages, including in dynamic rows,
      **under both design systems**.
- [ ] The design-system switcher changes the theme on all three pages, persists
      across navigation, and shows no flash of the previous theme on reload.
- [ ] Under Grove and Maryland, no vendored font or image 404s.
- [ ] Under every theme, on all three pages, at desktop/tablet/mobile widths:
      the banner is one or two lines tall, the flag is visible and does not
      overlap the text, the site title is styled, and the page does not scroll
      horizontally.
- [ ] The banner's "Here's how you know" accordion still opens under every
      theme — the shared `uswds/js/` must drive all of them.
- [ ] Switching the theme changes color, not just typeface: the banner, the
      buttons, the filter panel, and the urgency tag all move.
- [ ] `css/custom.css` contains no color literal outside the token blocks and
      the demo bar.
- [ ] Text contrast checked under **both** themes, not just the default.
- [ ] Every label matches §7.2 verbatim.
- [ ] No banned jargon (§7.4) appears in UI chrome.
- [ ] Keyboard-only pass: reach and operate every control, skip link works.
- [ ] Zero console errors. Zero framework dependencies. No build step.
- [ ] Site works when served from a subdirectory (GitHub Pages project sites
      are served at `/<repo>/`), so **all internal paths are relative** — never
      begin a `src`, `href`, or `fetch` path with `/`.
