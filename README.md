# Family Map

An interactive Australian family life-stage map (ages 0 to 99), exported from Claude Design and published as a plain static site.

> General information only. Verify current rules on official sites. Not personal advice.

## Pages

| File | What it is |
| --- | --- |
| `index.html` | **Family Life-Stage Map**: the interactive household map with a 2-year age stepper, add-person controls and band figures. |
| `model.html` | **Backbone and Privacy Model**: how the bands, weighting and browser-only privacy model work. |
| `register.html` | **Needs-Checking Register**: the figures, links and helpline numbers that still need verification against official sources. |

The pages link to each other (map, model, register).

## Deployment

Cloudflare Pages, static, no build step.

- Framework preset: **None**
- Build command: *(empty)*
- Build output directory: `/` (repository root)

Everything the pages need is in this repo: `assets/dc-runtime.js`, React 18.3.1 (`assets/react.production.min.js`, `assets/react-dom.production.min.js`) and the WOFF2 fonts in `assets/fonts/`. No CDN requests are required. `_headers` only sets `X-Content-Type-Options` and `Referrer-Policy`.

## Where it came from

This is a Claude Design export. The original was a self-unpacking bundle; it was unpacked into normal files, with asset ids replaced by relative paths and the original page links (`Main.dc.html`, `Model.dc.html`, `Checks.dc.html`) mapped to `index.html`, `model.html` and `register.html`. Content, design and behaviour are unchanged. The only addition is two script tags loading the local React files before `dc-runtime.js`, so the runtime does not fetch React from a CDN.

## Content Security Policy warning

The pages use `dc-runtime`, which evaluates the inline component scripts (`<script type="text/x-dc">`) in the browser. A strict Content Security Policy without `'unsafe-eval'` and inline script/style allowance will break them. Do not apply the strict CSP used on coeconomics.com and the other STUR sites to this project without first reworking the pages into pre-compiled JS and CSS files. No CSP is set here.

## Known follow-ups

- Default state is **NSW**; it should become **ACT** (ACT is the default jurisdiction, other states are comparisons only).
- The palette is not yet the house forest green, gold and cream.
- No persistence: the household resets when the page reloads (browser-only storage, ages only, no names, is the intended model).
- Figures and the five helpline numbers are **unverified**, as listed in the Needs-Checking Register (`register.html`). Every figure needs a direct official link, source and year before it is relied on.

## Fonts and licences

Bricolage Grotesque and Instrument Sans are under the SIL Open Font License 1.1 (see `assets/fonts/OFL.txt`). React is MIT licensed.
