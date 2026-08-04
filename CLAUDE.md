# CLAUDE.md

## What this project is

A throwaway prototype of a state government bid-opportunity website, built to
demonstrate information architecture and plain-language writing. Never
deployed to production. Never maintained.

Read **`SPEC.md`** first, then **`DATA-SCHEMA.md`**. They are the contract; this
file only routes you and flags the traps.

## Things that will go wrong if you work from instinct

These are the places where a competent default is the wrong answer here.

**No frameworks, no build step, no ES modules.** Vanilla JS in plain `<script>`
tags sharing a single `solicitations` global. No `import`/`export`, no `npm install`, no
bundler, no test runner, no linter config. If you find yourself writing a
`package.json`, stop.

**USWDS is vendored, not CDN-linked.** Download the USWDS dist into `uswds/`
and reference it with relative paths.

**Markup lives in HTML, not in JavaScript.** Repeated structures are
`<template>` elements, cloned and populated. Do not build HTML with template
literals. `innerHTML` is forbidden; use `replaceChildren()` and `textContent`.

**All paths are relative.** GitHub Pages project sites serve from `/<repo>/`.
A leading `/` in any `src`, `href`, or `fetch` breaks the site.

**Duplicate the chrome.** Header, banner, and footer are copy-pasted into all
three HTML files. Do not build an include mechanism. Three copies is correct.

**Labels are specified, not invented.** `SPEC.md` §7.2 and §7.3 give the exact
display strings and tooltip text. Use them verbatim. They were written to be
edited before implementation; if you think one is wrong, say so rather than
silently improving it.

**Don't generalize.** No config objects for things with one value, no
abstractions for the second case that will never come, no error handling for
conditions that cannot occur in a static prototype. Write the specific version.

## Quick reference

| Thing | Where |
|---|---|
| Pages, layout, behavior | `SPEC.md` §3–5 |
| Wireframes | `SPEC.md` §4.1, §5.2 |
| Exact UI text and labels | `SPEC.md` §7 |
| Accessibility requirements | `SPEC.md` §8 |
| Done checklist | `SPEC.md` §10 |
| JSON shape | `DATA-SCHEMA.md` §1–3 |
| Worked example record | `DATA-SCHEMA.md` §7 |
| Mock data requirements | `DATA-SCHEMA.md` §8 |

## Verifying

There is no test suite. Serve the directory (`python3 -m http.server`) and walk
`SPEC.md` §10 by hand. `file://` will not work — `fetch()` of `data/solicitations.json`
fails under that scheme.

Two checks that are easy to skip and matter most: operate every control with
the keyboard only, and confirm tooltips inside dynamically rendered list rows
respond to keyboard focus, not just hover (`SPEC.md` §8.6).
