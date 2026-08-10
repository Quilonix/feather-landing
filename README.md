# feather-landing

Landing page and privacy policy for [Feather](https://github.com/Quilonix/feather),
a Chrome extension that converts documents into Markdown entirely in the
browser.

Two pages, no build step, no dependencies:

| File | Purpose |
|---|---|
| `index.html` | Landing page |
| `privacy.html` | Privacy policy. This is the URL to put in the Chrome Web Store's Privacy Practices tab. |
| `styles.css` | The whole design system, both palettes |
| `theme-boot.js` | Sets the theme attribute before first paint. Classic script in `<head>` on purpose. |
| `theme.js` | Theme switch (Auto / Light / Dark) and the scroll-reveal animation |
| `assets/icon.svg` | The product icon exactly as it ships in the extension |
| `assets/logo.svg` | Monochrome silhouette of the same feather, used for the mark and the drifting feathers |
| `assets/hero-eagle-light.webp` | Hero artwork, light theme |
| `assets/hero-eagle-dark.webp` | Hero artwork, dark theme |
| `assets/favicon.svg` | Favicon |

Distribution note: the extension repository is private, so nothing here links
to it. The Chrome Web Store is the only channel, and until the listing is live
the call to action is an email address.

## Run it

There is nothing to install. Open `index.html` in a browser, or serve the
folder if you want correct relative URLs:

```bash
python -m http.server 8080
# then open http://localhost:8080
```

## Design

The system is **editorial precision**: a serif display face, a grotesque for
body copy, monospace reserved for data and metadata, hairline rules, soft
low elevation, and generous whitespace. The reference point is a well-set
journal or annual report rather than a SaaS template.

The serif is the deliberate point of difference. Surveys of SaaS typography put
sans-serif usage above 90%, so a serif display face is the cheapest way to look
unlike the category while still reading as serious, and it suits a product about
documents.

Two constraints are deliberate and worth keeping:

- **No CSS framework.** The page is smaller than any framework it could use.
- **No web fonts.** A product whose entire pitch is that it does not upload
  your documents should not make a third-party font request on its own
  marketing page. System stacks only, which also means no render blocking and
  no layout shift.

All colour lives in two palette blocks at the top of `styles.css`, one per
theme. No rule hardcodes a colour, including shadows.

## Checks

Two scripts, no dependencies, run them before pushing:

```bash
node verify.mjs          # links, anchors, undefined CSS classes, a11y basics, conventions
node verify-policy.mjs   # privacy.html vs the extension's actual code
```

`verify-policy.mjs` is the important one. The privacy policy is a legal
declaration and it is the URL the Chrome Web Store listing points at, so it
drifting out of sync with the code is a compliance problem rather than a
rendering one. It checks that every analytics event the extension can send is
documented, that no event is documented that the code never sends, that the
event properties match, that the permissions the policy claims are unused are
genuinely absent from the manifest, and that the analytics host named in the
policy is the one the code posts to. It expects the extension repository as a
sibling directory and skips cleanly if it is not there.

## Deploying

Static hosting, anywhere. For GitHub Pages, enable Pages on the `main` branch
at the repository root. `.nojekyll` is present so files are served as-is.

The privacy policy must stay reachable at a stable URL, because the Chrome
Web Store listing points at it. Do not rename `privacy.html` without updating
the store listing.

## Accuracy

Every number and claim on these pages reflects what the extension actually
does, and several are deliberately unflattering (see the footnotes on
token savings and the "what it does not do" section). If the extension
changes, these pages change with it. Specifically:

- the supported site count and the site ticker
- the format table
- the batch and file size limits
- the analytics event table in the privacy policy, which must match
  `src/analytics.js` in the extension repo exactly
