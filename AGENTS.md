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

## Design constraints

- **No CSS framework and no web fonts.** Both are deliberate. A privacy-first
  product should not make third-party requests on its own marketing page.
- **No colour beyond ink and paper**, plus the two greys already defined as
  custom properties. Adding a third colour turns a two-colour design into a
  muddy one.
- All colour lives in the custom properties at the top of `styles.css`. No
  rule may hardcode a hex value.
- Square corners, hard offset blocks for depth, no border radius, no blur, no
  gradients on surfaces.
- Respect `prefers-reduced-motion`. The ticker must stop for anyone who asks
  for reduced motion.

## Accessibility

- Keep the skip link first in the document.
- Keep visible focus styles. Do not remove the `:focus-visible` outline.
- Every section heading stays in document order: one `h1`, then `h2`, then
  `h3`. Do not pick a heading level for its size.
- Decorative text such as the site ticker's duplicate group stays
  `aria-hidden`.

## Before pushing

- Run `node verify.mjs` and `node verify-policy.mjs`. Both must pass.
- Open both pages and check them at a narrow width, not just a desktop one.
- Confirm every internal link and anchor resolves.
- The privacy policy URL is referenced by the Chrome Web Store listing. Do not
  rename or move `privacy.html`.
