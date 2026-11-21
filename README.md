# Family Map

An interactive Australian family life-stage map for ages 0 to 99. It is plain static HTML, built from Doug's Claude Design export. The ACT is the default jurisdiction.

> General information only. Verify current rules on official sites. Not personal advice.

## Pages

| File | What it is |
| --- | --- |
| `index.html` | **Family map**: an interactive household map with a 2-year age stepper, add-person controls, quick and guided paths, a state selector (ACT by default), sourced band figures and support lists. |
| `model.html` | **Model and privacy**: how the bands, stages, emphasis weighting and the browser-only privacy model work. |
| `register.html` | **Needs-checking register**: every figure, link and helpline number that still needs a person to verify it. |

Every page has the same top navigation (Family map, Model and privacy, Needs-checking register) and the disclaimer line.

## Features

- **Household map.** You can add up to 4 parents, 4 grandparents, 1 partner, 6 children and 6 grandchildren, using role labels only (Mum, Dad, Child 1 and so on). Each person has a two-year age band and a living arrangement.
- **Time stepper.** "Forward 2 years" and "Back 2 years" move everyone at once. Linked topics appear and disappear with the age bands.
- **Two paths.** The guided path narrows step by step. The quick path lets you search any topic directly.
- **State notes.** Each state has its own notes, revenue office and support services. The ACT is the default and is the only jurisdiction with official links, added 21 Nov 2026 and flagged as needing checks. Other states and territories are listed for comparison by name only.
- **Figures.** Band figures and income scenarios are copied from coeconomics.com and labelled as not checked against primary sources.
- **Saving.** The household is saved in the browser and survives a reload. A "Reset / clear saved household" control, with a confirm step, removes it.
- **Branding.** The palette is forest green `#1E4D38`, paper `#F3EFE4`, ink `#1C2416` and brass `#8A5A22`. Relationship colours are brass for parents and grandparents, green for you and a partner, and slate blue for children and grandchildren. Text and button colour pairs meet WCAG AA, with body text at 6:1 or better.
- **Self-hosted assets.** Fonts are Bricolage Grotesque and Instrument Sans, there's an SVG favicon, and each page has its own `<title>`, meta description, viewport and theme colour.

## Privacy model

- There's no backend, no account, no analytics and no third-party requests. The pages load only their own files.
- The household is stored in `localStorage` under the key `familymap.au.household.v1`, on this device and browser profile only. It holds the role labels, age bands, living arrangements, chosen state, quick or guided path, selected person and an id counter. Nothing else is stored, and nothing leaves the browser.
- Nothing is written while the example household is unchanged. A household identical to the example is removed from storage rather than saved.
- Stored data is validated when it loads. Unknown states fall back to the ACT, ages are clamped to 0–98, labels are cut to 14 characters, and unknown values are dropped. Corrupt data falls back to the example.
- If the browser blocks storage, the page says so and works without saving.
- Use role labels, not real names. Anyone using the same browser profile can see the saved household.
- The household tables and isolation rules on `model.html` describe a possible future version. They are not built.

## Deploying on Cloudflare Pages

No Pages project is connected to this repo yet.

- Framework preset: **None**
- Build command: *(empty)*
- Build output directory: `/` (repository root)
- Production branch: `main`

`_headers` sets `X-Content-Type-Options: nosniff` and `Referrer-Policy: strict-origin-when-cross-origin`.

### Content Security Policy warning

The pages run on `assets/dc-runtime.js`, which evaluates inline component scripts (`<script type="text/x-dc">`) and uses inline styles. A strict CSP without `'unsafe-eval'` and inline allowances will break the site. Don't apply the strict CSP used on coeconomics.com and the STUR sites until the pages are reworked into pre-compiled JS and CSS. No CSP is set here.

## Verification list (needs a person)

None of these has been verified by a person. The full list is on `register.html` (C01–C37).

1. All figures copied from coeconomics.com: ABS, ASFA/ATO, AIHW, AIFS, RBA, the National Anti-Scam Centre, eSafety and Roy Morgan (C24, C27–C34). ABS Household Income and Wealth 2019–20 is more than 3 years old (C28).
2. The five helpline numbers shown: OPAN 1800 700 600, My Aged Care, 1800 ELDERHelp, National Debt Helpline 1800 007 007 and Carer Gateway 1800 422 737 (C23).
3. **ACT links (new)** (C35):
   - Legal Aid ACT
   - Public Trustee and Guardian
   - ACT Revenue Office
   - ADACAS
   - COTA ACT
   - Access Canberra

   These pages loaded on 21 Nov 2026, but names, roles and eligibility haven't been checked.
4. **ACT stamp duty note (new)** (C36):
   - Conveyance duty is being phased down in favour of general rates.
   - The 2026–27 ACT Budget removes duty for all first home buyers. Its start date and the Home Buyer Concession Scheme conditions need confirming.
   - The First Home Owner Grant ceased on 1 July 2019.
5. **Family Provision Act 1969 (ACT)** link, and the ACT claim time limit (not stated in the app) (C37).
6. Every state's legal aid, trustee, revenue office, seniors service, COTA and fair trading names, which have no links yet (C23), and the family provision statutes (C22).
7. Band 64–65 content, which is missing (C25), and the drafts for ages 0–11 and 82–99 (C26).
8. The emphasis weights and age priors, which are design assumptions (C19).

## Testing

The pages were tested in headless Chrome (`/usr/bin/google-chrome`) using puppeteer-core against `python3 -m http.server`:

- Each page loads at 1280 px and 390 px with no console errors or warnings and no external requests.
- The household persists across a reload after adding a child, stepping forward 2 years, selecting a person, switching to the quick path and changing state.
- Reset clears storage and returns to the example household.
- Corrupt or invalid saved data falls back safely.
- All page links work.
- The register shows no raw placeholders.

## Fonts and licences

Bricolage Grotesque and Instrument Sans are under the SIL Open Font License 1.1 (see `assets/fonts/OFL.txt`). React 18.3.1 is MIT licensed.

## Changelog

### 2026-11-21: complete web app build

Source: Doug's zip export (`Main.dc.html`, `Model.dc.html`, `Checks.dc.html`). It has the same design and content as the first upload; the differences are serialisation only.

- **ACT default.**
  - The ACT is the default state and listed first.
  - ACT support entries now have official links and fuller names.
  - There's an ACT stamp duty note on First home buyers and links to the legislation register on the family provision topics.
  - All of this is flagged as needing checks.
- **Branding.** Rebranded from teal to forest green, paper, ink and brass. Relationship colours were retuned and the legend updated ("Brass" and "Green").
- **Saving.** The household is now saved in the browser (`localStorage`), with a status note and a two-step "Reset / clear saved household" control. The footer and the model page explain the privacy model.
- **Page basics.**
  - Added top navigation and the disclaimer line to every page.
  - Added a viewport tag and mobile spacing.
  - Added an SVG favicon, titles, meta descriptions and a theme colour.
  - The register now links to the model page.
- **Placeholders.** The register's "By [OWNER] On [DATE]" and the support list's "last checked [DATE]" placeholders now read "Unverified — not yet checked" and "Needs checking · not yet verified by a person".
- **Register.** Added rows C35 (ACT links), C36 (ACT stamp duty note) and C37 (ACT family provision link).

### 2026-11-20: initial upload (5fdedba)

The self-unpacking Claude Design bundle was unpacked into `index.html`, `model.html` and `register.html`, with local React, the runtime and fonts.
