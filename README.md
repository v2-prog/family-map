# Family Map

An interactive Australian family life-stage map for ages 0 to 99. It is a plain static site: three pages, hand-written JavaScript and CSS, no framework, no build step and no network requests. The ACT is the default jurisdiction.

> General information only. Verify current rules on official sites. Not personal advice.

## Pages

| File | What it is |
| --- | --- |
| `index.html` | **Family map.** The household map, the household editor, the Explore panel (guided or quick path), figures for the selected person, emphasis and support lists. |
| `model.html` | **Model and privacy.** How the bands, stages, emphasis weighting and browser-only privacy model work. Pre-rendered, with no scripts. |
| `register.html` | **Needs-checking register.** Every figure, link and helpline number that still needs a person to verify it (C01–C37), with filters by source. |
| `404.html` | Not-found page for Cloudflare Pages. |

Every page has the same top navigation, a skip link and the disclaimer line.

## What the map does

- **Household map.** Generation rows (parents and grandparents, you and a partner, children and grandchildren) with connector lines drawn from the real layout. It reflows from 320 px phones to wide screens instead of using a fixed-size canvas.
- **Linked topics.** Where two lives overlap (aged care and your estate plan, kids' costs and your cash flow and so on), a pill appears between the generations. Solid pills fit your current emphasis most and dashed pills are less typical for now. Each pill opens its topic.
- **Household editor.** Add up to 4 parents, 4 grandparents, 1 partner, 6 children and 6 grandchildren. Each person has a role label (Mum, Child 1 and so on), a two-year age band and a living arrangement. A new person's label is selected so you can type a new one straight away.
- **Time stepper.** "+2 years" and "−2 years" move everyone at once, and linked topics come and go with the age bands.
- **Two paths that keep your place.** The guided path asks whose stage you are thinking about, then narrows step by step (layer 1 of 4 and so on). The quick path has a search box and the full topic tree. Switching between them keeps the open topic.
- **Topics.** Each topic has breadcrumbs, related branches, a state note for the chosen state, a "verify" panel saying what to check and where, and support services ranked by your emphasis. `#topic=<id>` deep links open a topic directly.
- **Figures.** Band figures and income scenarios, copied from coeconomics.com, for whoever is selected. Missing bands and draft bands say so plainly.
- **States.** The ACT is the default and the only jurisdiction with official links (added 21 Nov 2026 and flagged as needing checks). Other states and territories are listed by name only.

## UX and accessibility

- Works with a keyboard alone. Focus is kept when the page updates (adding a person, searching, stepping years), and screen readers hear short status messages through an `aria-live` region.
- On phones the order is controls, map, Explore, then the household editor, so the answer sits right under the map.
- Real buttons, labels and landmarks, visible focus rings, touch targets that meet WCAG 2.2 (main controls are 40 px tall) and `prefers-reduced-motion` respected.
- Colour is never the only signal: pills are also solid or dashed, people also carry their role and age band, and the legend names each colour.
- Palette: forest green `#1E4D38`, paper `#F3EFE4`, ink `#1C2416` and brass `#8A5A22`. Relationship colours are brass for parents and grandparents, green for you and a partner, and slate blue for children and grandchildren. Text and button pairs meet WCAG AA.

## Privacy model

- No backend, no account, no analytics and no third-party requests. The Content Security Policy sets `connect-src 'none'`, so the pages cannot send anything even by mistake.
- The household is stored in `localStorage` under `familymap.au.household.v1`, on this device and browser profile only. It holds role labels, age bands, living arrangements, the chosen state, the path, the selected person and an id counter. The format is unchanged from the earlier version, so saved households carry over.
- Nothing is written while the example household is unchanged, and a household identical to the example is removed rather than saved.
- Stored data is validated on load: unknown states fall back to the ACT, ages are clamped to 0–98, labels are cut to 14 characters, unknown values are dropped and corrupt data falls back to the example.
- If the browser blocks storage, the page says so and works without saving. "Reset / clear saved household" has a confirm step.
- Use role labels, not real names. Anyone using the same browser profile can see the saved household.
- The household tables and isolation rules on `model.html` describe a possible future version. They are not built.

## Project layout

```
index.html  model.html  register.html  404.html
_headers                  security headers and caching (Cloudflare Pages)
assets/
  styles.v1.css           all styles
  core.v1.js              small DOM helpers shared by the pages
  logic.v1.js             pure functions: weights, ranking, overlaps, figures, cleaning stored data
  app.v1.js               the map page
  register.v1.js          register filters
  data/topics.v1.js       topics, states, support services, stages
  data/figures.v1.js      band figures, income scenarios
  data/register.v1.js     needs-checking rows
  fonts/                  self-hosted woff2 files and OFL.txt
  favicon.v1.svg
tools/validate.mjs        data, Content Security Policy and privacy checks
tests/                    unit tests (node --test)
.github/workflows/checks.yml
```

## Deploying on Cloudflare Pages

- Framework preset: **None**
- Build command: *(empty)*
- Build output directory: `/` (repository root)
- Production branch: `main`

`_headers` now sets a strict Content Security Policy (`script-src 'self'; style-src 'self'; connect-src 'none'` and so on), `X-Frame-Options: DENY`, `nosniff`, a referrer policy and a permissions policy. Files under `/assets/` are cached for a year as immutable.

## Updating content

- Topics, state notes and support services are in `assets/data/topics.v1.js`, figures in `assets/data/figures.v1.js` and register rows in `assets/data/register.v1.js`.
- **Because assets are cached for a year, rename a file whenever you change it** (`topics.v1.js` → `topics.v2.js`) and update the `<script>` or `<link>` tag that loads it. The validator rejects asset names without a version.
- Keep the code rules: no inline `<script>` or `style=` attributes, no `eval`, `new Function` or `innerHTML`, no network calls and https links only.
- Run the checks before pushing (below). When you verify an item, update its register row and remove the "needs checking" flag on the topic.

## Checks and testing

Needs Node 20 or later and no installs.

```
node tools/validate.mjs   # data links, stage and income coverage, CSP code rules, name check
node --test               # unit tests for the logic and the data
```

The validator also refuses likely personal names. To add your own private names to that check, list them one per line in `tools/name-deny-list.local.txt`, which is git-ignored. The same checks run on GitHub Actions for every push and pull request.

This rebuild was also tested in headless Chrome with the production headers applied:

- Every page loads at 1280 px and 320 px with no console errors and no CSP violations.
- A household saved by the earlier version (NSW, retirement village, share house) loads correctly.
- Guided path, search, adding and renaming a person, stepping years, reset, corrupt saved data, deep links and register filters all work, and focus stays where it should.

## Verification list (needs a person)

None of these has been verified by a person. The full list is on `register.html` (C01–C37).

1. All figures copied from coeconomics.com: ABS, ASFA/ATO, AIHW, AIFS, RBA, the National Anti-Scam Centre, eSafety and Roy Morgan (C24, C27–C34). ABS Household Income and Wealth 2019–20 is more than 3 years old (C28).
2. The five helpline numbers shown: OPAN 1800 700 600, My Aged Care, 1800 ELDERHelp, National Debt Helpline 1800 007 007 and Carer Gateway 1800 422 737 (C23).
3. ACT links (C35): Legal Aid ACT, Public Trustee and Guardian, ACT Revenue Office, ADACAS, COTA ACT and Access Canberra. These pages loaded on 21 Nov 2026, but names, roles and eligibility haven't been checked.
4. ACT stamp duty note (C36): conveyance duty is being phased down in favour of general rates; the 2026–27 ACT Budget removes duty for all first home buyers (start date and Home Buyer Concession Scheme conditions need confirming); the First Home Owner Grant ceased on 1 July 2019.
5. Family Provision Act 1969 (ACT) link, and the ACT claim time limit, which the app does not state (C37).
6. Every state's legal aid, trustee, revenue office, seniors service, COTA and fair trading names, which have no links yet (C23), and the family provision statutes (C22).
7. Band 64–65 content, which is missing (C25), and the drafts for ages 0–11 and 82–99 (C26).
8. The emphasis weights and age priors, which are design assumptions (C19).

## Fonts and licences

Bricolage Grotesque and Instrument Sans are under the SIL Open Font License 1.1 (see `assets/fonts/OFL.txt`). React and the Claude Design runtime are no longer used.

## Changelog

### 2026-11-22: rebuild for a strict Content Security Policy and better UX

- **No runtime.** Replaced React and `dc-runtime.js` with plain JavaScript, so the strict CSP from the other sites now applies. Wording, figures, states and register rows were extracted from the previous pages unchanged.
- **Map.** A responsive generation-row map with connector lines, replacing the fixed 720 px canvas. Selecting a person centres the paths and figures on them.
- **Explore.** Guided steps with a layer indicator, breadcrumbs, a "Closest to current emphasis" card, a show-all toggle, search with match highlighting, and `#topic=` deep links.
- **Accessibility.** Focus kept across updates, live status messages, skip link, larger touch targets and mobile ordering with Explore under the map.
- **Register.** Source filter chips with a live count.
- **Same saved format.** `familymap.au.household.v1` is read and written exactly as before.
- **Checks.** Added `tools/validate.mjs`, unit tests and a GitHub Actions workflow. Assets now carry version numbers, and a `404.html` was added.
- Removed `assets/react.production.min.js`, `assets/react-dom.production.min.js`, `assets/dc-runtime.js`, the unversioned fonts and `assets/favicon.svg`.

### 2026-11-21: complete web app build

ACT default with official links (flagged as needing checks), forest green rebrand, browser saving with a reset control, page basics (navigation, disclaimer, viewport, favicon, titles), placeholders replaced with "needs checking" wording, and register rows C35–C37.

### 2026-11-20: initial upload (5fdedba)

The self-unpacking Claude Design bundle was unpacked into `index.html`, `model.html` and `register.html`, with local React, the runtime and fonts.
