# Working rules for this repository

This is the marketing site for the Feather extension. The extension's own
rules live in its repository; these are the ones that apply here.

## Writing style

- **No em dashes or en dashes.** Use a spaced ASCII hyphen for a clause break
  (`like this - then this`) and a plain hyphen for ranges (`0-15%`). Applies to
  page copy, comments, and commit messages.
- **No emoji.** Anywhere.
- **No decorative Unicode** where ASCII does the job.
- Comments explain **why**, not what.

## Claims must be true

This page exists for a product that deliberately publishes two honest
token-savings numbers instead of one flattering one. Keep that standard:

- Do not state a savings percentage as a guarantee. Label estimates as
  estimates.
- Do not claim a Chrome Web Store listing is live before it is.
- Do not list a supported site that is not in the extension's manifest.
- The analytics event table in `privacy.html` must match `src/analytics.js` in
  the extension repository exactly. If an event or property is added there,
  add it here in the same change.
- Keep the "what it does not do" section. Removing a known limitation from the
  page does not remove it from the product.

## Distribution

**The extension repository is private.** Nothing on this site may link to it,
because every such link would 404 for visitors. `verify.mjs` fails the build if
one appears.

The Chrome Web Store is the only distribution channel. Until the listing is
live, the call to action is an email address, not a download. Do not add a
manual-install path, a zip link, or a "build from source" section.

## Logo

`assets/icon.svg` is the product icon exactly as it ships in the extension,
kept unmodified so the store listing and this site cannot drift apart. It uses
a violet-to-cyan gradient.

`assets/logo.svg` and the inline marks in the pages are a **monochrome
silhouette of the same feather**, set to `currentColor` so one asset serves both
themes. Keep the geometry identical to the product icon. If the extension's icon
changes shape, change both.

The interior spine line from the product icon is intentionally omitted from the
silhouette: it is white-on-white in the original and would either vanish or
muddy the shape at 17px.

## Design constraints

The system is **editorial precision**: a serif display face, a grotesque for
body copy, monospace reserved for data and metadata, hairline rules, and
whitespace doing the work that borders and boxes usually do. The reference point
is a well-set journal, not a SaaS template.

- **Serif for display, sans for body, mono for data.** The serif is the point of
  difference: surveys put sans-serif usage in SaaS above 90%, so a serif display
  face is the cheapest way to look unlike the category while still reading as
  serious. Do not "simplify" headings to the sans stack.
- **No CSS framework and no web fonts.** Both are deliberate. A privacy-first
  product should not make third-party requests on its own marketing page, and
  system stacks mean no render blocking and no layout shift.
- **Two palettes, warm neutral only.** Every colour token must be defined in
  both the `:root` and the `html[data-theme="dark"]` block, or it silently keeps
  its light value in dark mode. `verify.mjs` checks this.
- No rule may hardcode a colour. All colour lives in the palette blocks. That
  includes shadows, which are tokens (`--lift-1` through `--lift-3`).
- **Depth is almost subliminal.** Soft two-layer elevation and hairlines only.
  No hard offset blocks, no 2px slab borders, no high-contrast square panels.
  Anything heavier turns editorial into corporate.
- Paper is a warm off-white and ink is off-black, on purpose. Pure white behind a
  large serif glares, and true black on warm white vibrates.
- Dark mode is keyed off `[data-theme]`, **not** an `@media` query, because a
  media query cannot be overridden from script and the explicit Light and Dark
  choices have to win. `theme-boot.js` sets the attribute before first paint so
  there is no flash; keep it a classic script in `<head>`.
- Respect `prefers-reduced-motion`. The ticker must stop and the reveal
  animation must not run. The reveal's hidden state is applied only from script,
  so a visitor without JavaScript sees everything.

## Accessibility

- Keep the skip link first in the document.
- Keep visible focus styles. Do not remove the `:focus-visible` outline.
- Every section heading stays in document order: one `h1`, then `h2`, then
  `h3`. Do not pick a heading level for its size.
- Decorative text such as the site ticker's duplicate group stays
  `aria-hidden`.
- Tap targets stay at least 44px on coarse pointers.

## Before pushing

- Run `node verify.mjs` and `node verify-policy.mjs`. Both must pass.
- Open both pages and check them at a narrow width, not just a desktop one.
- Confirm every internal link and anchor resolves.
- The privacy policy URL is referenced by the Chrome Web Store listing. Do not
  rename or move `privacy.html`.
