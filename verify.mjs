import { readFileSync, existsSync, readdirSync } from "fs";

// 404.html is held to the same structural, accessibility and theme rules as the
// other pages, but it is exempt from the indexing block below: an error page is
// served at whatever address the visitor mistyped, so a canonical tag or a
// JSON-LD url would be a claim about a page that does not exist.
const pages = [
  { file: "index.html", indexable: true },
  { file: "privacy.html", indexable: true },
  { file: "404.html", indexable: false },
];
const css = readFileSync("styles.css", "utf8");
const fail = [];
const ok = [];
const note = (list, msg) => list.push(msg);

// Classes defined anywhere in the stylesheet. Comments and url() values are
// stripped first: prose naming a class does not define one, and a file
// extension inside url("logo.svg") is not a class either.
const definedClasses = new Set();
const selectorText = css
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/url\([^)]*\)/g, "url()");
for (const m of selectorText.matchAll(/\.([a-zA-Z][\w-]*)/g)) definedClasses.add(m[1]);
// Every class any page uses, accumulated across pages so the reverse check
// below can find rules for a design that no longer ships.
const usedClasses = new Set();

for (const { file: page, indexable } of pages) {
  const html = readFileSync(page, "utf8");

  // 1. Writing conventions.
  const dashes = (html.match(/[\u2013\u2014]/g) || []).length;
  const emoji = (html.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu) || []).length;
  dashes || emoji
    ? note(fail, `${page}: ${dashes} dash(es), ${emoji} emoji`)
    : note(ok, `${page}: no em/en dashes, no emoji`);

  // 2. Every class used must exist in the stylesheet.
  const used = new Set();
  for (const m of html.matchAll(/class="([^"]+)"/g)) {
    for (const c of m[1].trim().split(/\s+/)) {
      used.add(c);
      usedClasses.add(c);
    }
  }
  const undefinedClasses = [...used].filter((c) => !definedClasses.has(c));
  undefinedClasses.length
    ? note(fail, `${page}: classes with no CSS rule: ${undefinedClasses.join(", ")}`)
    : note(ok, `${page}: all ${used.size} classes are defined in styles.css`);

  // 3. Internal anchors must exist on the page they point to.
  const ids = new Set([...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]));
  const anchors = [...html.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]);
  const deadAnchors = anchors.filter((a) => !ids.has(a));
  deadAnchors.length
    ? note(fail, `${page}: anchors with no target: ${deadAnchors.join(", ")}`)
    : note(ok, `${page}: all ${anchors.length} in-page anchors resolve`);

  // 4. Relative file links must exist.
  const links = [...html.matchAll(/href="(?!https?:|mailto:|chrome:|#)([^"]+)"/g)].map((m) => m[1]);
  // Links name the file that exists on disk, so the only path that needs
  // resolving is the site root. Extensionless URLs are deliberately not
  // supported here: they depend on a host rewrite, so a link to one is broken
  // on a plain file server and on a local copy of the site.
  const CLEAN = { "/": "index.html", "./": "index.html" };
  const missing = links.filter((l) => {
    const p = l.replace(/[?#].*$/, "");
    if (p === "") return false;
    const target = CLEAN[p] || p.replace(/^\//, "");
    return !existsSync(target);
  });
  missing.length
    ? note(fail, `${page}: links to missing files: ${missing.join(", ")}`)
    : note(ok, `${page}: all ${links.length} relative links exist`);

  // 5. Rough tag balance, which catches an unclosed section.
  for (const tag of ["section", "div", "main", "table", "nav", "ul", "ol"]) {
    const open = (html.match(new RegExp(`<${tag}[\\s>]`, "g")) || []).length;
    const close = (html.match(new RegExp(`</${tag}>`, "g")) || []).length;
    if (open !== close) note(fail, `${page}: <${tag}> ${open} open vs ${close} closed`);
  }

  // 6. Accessibility basics.
  const h1s = (html.match(/<h1[\s>]/g) || []).length;
  h1s === 1 ? note(ok, `${page}: exactly one h1`) : note(fail, `${page}: ${h1s} h1 elements`);
  html.includes('class="skip"') ? note(ok, `${page}: skip link present`) : note(fail, `${page}: no skip link`);
  /<html lang="/.test(html) ? note(ok, `${page}: lang set`) : note(fail, `${page}: no lang attribute`);
  /<meta name="viewport"/.test(html) ? note(ok, `${page}: viewport set`) : note(fail, `${page}: no viewport`);
  /<title>/.test(html) ? note(ok, `${page}: title set`) : note(fail, `${page}: no title`);
  /<meta name="description"/.test(html) ? note(ok, `${page}: description set`) : note(fail, `${page}: no description`);

  // 7. The extension repository is private, so linking to it would 404 for
  // every visitor. Nothing on this site may point at it.
  const privateLinks = [...html.matchAll(/https:\/\/github\.com\/Quilonix\/feather(?!-landing)[^"']*/g)].map((m) => m[0]);
  privateLinks.length
    ? note(fail, `${page}: links to the private extension repo: ${[...new Set(privateLinks)].join(", ")}`)
    : note(ok, `${page}: no links to the private extension repo`);

  // 8. Theme wiring: the boot script must be in <head> and run before the
  // stylesheet, or the page paints in the wrong theme for a frame.
  const bootIdx = html.indexOf("theme-boot.js");
  const headEnd = html.indexOf("</head>");
  bootIdx > -1 && bootIdx < headEnd
    ? note(ok, `${page}: theme boot script is in head`)
    : note(fail, `${page}: theme boot script missing or not in head`);
  html.includes("theme.js") ? note(ok, `${page}: theme script loaded`) : note(fail, `${page}: theme.js not loaded`);
  (html.match(/data-theme-set="(auto|light|dark)"/g) || []).length === 3
    ? note(ok, `${page}: all three theme options present`)
    : note(fail, `${page}: theme switch does not offer exactly three options`);
  /<html lang="en" data-theme="/.test(html)
    ? note(ok, `${page}: theme attribute present before script runs`)
    : note(fail, `${page}: no default data-theme on <html>`);

  // 9. Indexing. A malformed JSON-LD block is worse than having none: Search
  // Console reports it as an error and discards the page's markup. The error
  // page is checked the other way round, since the failure mode there is
  // claiming an address rather than lacking one.
  if (!indexable) {
    /<meta name="robots" content="noindex/.test(html)
      ? note(ok, `${page}: noindex, so it cannot be indexed as a real page`)
      : note(fail, `${page}: an error page must be noindex`);
    /<link rel="canonical"/.test(html)
      ? note(fail, `${page}: an error page must not declare a canonical URL`)
      : note(ok, `${page}: no canonical, which is correct for an error page`);
    /name="theme-color"/.test(html)
      ? note(ok, `${page}: theme-color set`)
      : note(fail, `${page}: no theme-color`);
    continue;
  }

  const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  if (ld.length === 0) {
    note(fail, `${page}: no JSON-LD structured data`);
  } else {
    let bad = 0;
    for (const b of ld) {
      try {
        JSON.parse(b[1]);
      } catch (e) {
        bad++;
        note(fail, `${page}: JSON-LD does not parse: ${e.message}`);
      }
    }
    if (bad === 0) note(ok, `${page}: ${ld.length} JSON-LD block(s) parse`);
  }

  // Crawlers reject a relative og:image, so this must be absolute.
  /og:image" content="https:\/\//.test(html)
    ? note(ok, `${page}: share image is an absolute URL`)
    : note(fail, `${page}: og:image missing or relative`);
  /<link rel="canonical" href="https:\/\/feather\.quilonix\.in/.test(html)
    ? note(ok, `${page}: canonical points at the live domain`)
    : note(fail, `${page}: canonical missing or on the wrong host`);
  /name="theme-color"/.test(html)
    ? note(ok, `${page}: theme-color set`)
    : note(fail, `${page}: no theme-color`);
}

// 10. The reverse of check 2. A class with a rule but no markup is a leftover
// from a design that no longer ships, and it costs every visitor bytes to
// download rules nothing can match.
const deadClasses = [...definedClasses].filter((c) => !usedClasses.has(c));
deadClasses.length
  ? note(fail, `styles.css: rules for classes no page uses: ${deadClasses.sort().join(", ")}`)
  : note(ok, `styles.css: every one of the ${definedClasses.size} classes is used by a page`);

// 11. A fragment link into another page is invisible to check 3, which only
// looks at the page it started on. These are the links most likely to rot,
// because renaming a section id on one page cannot be seen from the other.
const idsOf = new Map();
for (const { file } of pages) {
  const src = readFileSync(file, "utf8");
  idsOf.set(file, new Set([...src.matchAll(/id="([^"]+)"/g)].map((m) => m[1])));
}
let crossChecked = 0;
for (const { file } of pages) {
  const src = readFileSync(file, "utf8");
  for (const m of src.matchAll(/href="(?!https?:|mailto:)([^"#]+)#([^"]+)"/g)) {
    const target = m[1] === "/" || m[1] === "./" ? "index.html" : m[1].replace(/^\//, "");
    const ids = idsOf.get(target);
    if (!ids) {
      note(fail, `${file}: links to #${m[2]} on ${target}, which is not a checked page`);
      continue;
    }
    crossChecked++;
    if (!ids.has(m[2])) note(fail, `${file}: #${m[2]} does not exist on ${target}`);
  }
}
note(ok, `all ${crossChecked} cross-page anchor(s) resolve`);

// 12. The sitemap, the canonical tags and the files on disk have to agree.
// Search Console reports a canonical that is absent from the sitemap as
// "discovered but not submitted", and a sitemap URL that does not resolve as a
// crawl error, and neither shows up until after a deploy.
const sitemap = readFileSync("sitemap.xml", "utf8");
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const asFile = (url) => {
  const p = url.replace(/^https:\/\/feather\.quilonix\.in/, "");
  return p === "" || p === "/" ? "index.html" : p.replace(/^\//, "");
};
const unreachable = locs.filter((l) => !existsSync(asFile(l)));
unreachable.length
  ? note(fail, `sitemap.xml: URLs with no file behind them: ${unreachable.join(", ")}`)
  : note(ok, `sitemap.xml: all ${locs.length} URLs resolve to a file`);

const canonicals = pages
  .filter((p) => p.indexable)
  .map((p) => ({
    file: p.file,
    url: (readFileSync(p.file, "utf8").match(/<link rel="canonical" href="([^"]+)"/) || [])[1],
  }));
for (const c of canonicals) {
  locs.includes(c.url)
    ? note(ok, `${c.file}: canonical is listed in the sitemap`)
    : note(fail, `${c.file}: canonical ${c.url} is not a <loc> in sitemap.xml`);
  // A canonical must name the page it is on, or two URLs claim to be the same
  // page and the crawler picks one.
  asFile(c.url || "") === c.file || (c.file === "index.html" && asFile(c.url || "") === "index.html")
    ? note(ok, `${c.file}: canonical points at itself`)
    : note(fail, `${c.file}: canonical ${c.url} does not resolve to ${c.file}`);
}
const orphanLocs = locs.filter((l) => !canonicals.some((c) => c.url === l));
orphanLocs.length
  ? note(fail, `sitemap.xml: URLs no page claims as its canonical: ${orphanLocs.join(", ")}`)
  : note(ok, "sitemap.xml: every URL is some page's canonical");

// 12b. Search Console verification is a file whose contents name the file
// itself, so renaming or editing it breaks verification in a way no page
// reveals. Google refetches it periodically and verification lapses silently if
// it stops resolving, which is also why robots.txt must not disallow it. Matched
// by shape rather than by a hardcoded token, so re-verifying with a new file
// needs no change here.
const gscFiles = readdirSync(".").filter((f) => /^google[0-9a-f]{8,}\.html$/.test(f));
if (gscFiles.length === 0) {
  note(fail, "no Google Search Console verification file at the site root");
} else {
  const robots = readFileSync("robots.txt", "utf8");
  for (const f of gscFiles) {
    readFileSync(f, "utf8").trim() === `google-site-verification: ${f}`
      ? note(ok, `${f}: verification file names itself, so it is intact`)
      : note(fail, `${f}: contents do not name the file, so Google will reject it`);
    new RegExp(`^\\s*Disallow:\\s*/${f}\\s*$`, "mi").test(robots)
      ? note(fail, `${f}: robots.txt disallows the file Google has to fetch`)
      : note(ok, `${f}: reachable, not disallowed in robots.txt`);
  }
}

// 13. Colour may only be declared inside a palette block (:root or a
// [data-theme] block). Anything else means a rule hardcoded a colour and will
// not flip with the theme. Comments are stripped first, since prose about a
// colour is not a declaration of one.
const cssRules = css.replace(/\/\*[\s\S]*?\*\//g, "");
const paletteBlocks = [...cssRules.matchAll(/(?::root|html\[data-theme="[a-z]+"\])\s*\{([\s\S]*?)\n\}/g)].map((m) => m[1]);
const paletteText = paletteBlocks.join("\n");
const allHex = [...cssRules.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map((m) => m[0]);
const paletteHex = new Set([...paletteText.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map((m) => m[0]));
const strayHex = allHex.filter((h) => !paletteHex.has(h));
strayHex.length
  ? note(fail, `styles.css: hex colours outside a palette block: ${[...new Set(strayHex)].join(", ")}`)
  : note(ok, `styles.css: all ${paletteHex.size} colours live in palette blocks`);

// Both palettes must define the same token names, or a token silently falls
// back to the light value in dark mode.
if (paletteBlocks.length >= 2) {
  const names = paletteBlocks.map(
    (b) => new Set([...b.matchAll(/(--[a-z-]+)\s*:/g)].map((m) => m[1]))
  );
  const lightOnly = [...names[0]].filter((n) => !names[1].has(n));
  const darkOnly = [...names[1]].filter((n) => !names[0].has(n));
  // Tokens that are intentionally light-only: geometry and typography do not
  // change between themes, only colour does.
  const colourish = (n) =>
    !/(--border-w|--offset|--gutter|--measure|--head-h|--mono|--sans|--serif|--radius|--r-)/.test(n);
  const missingInDark = lightOnly.filter(colourish);
  missingInDark.length
    ? note(fail, `styles.css: colour tokens missing from the dark palette: ${missingInDark.join(", ")}`)
    : note(ok, "styles.css: every colour token is defined in both palettes");
  darkOnly.length
    ? note(fail, `styles.css: tokens only in the dark palette: ${darkOnly.join(", ")}`)
    : note(ok, "styles.css: dark palette introduces no orphan tokens");
} else {
  note(fail, "styles.css: expected a light and a dark palette block");
}

// A page with a moving ticker and reveal animations must honour reduced motion.
/prefers-reduced-motion/.test(css)
  ? note(ok, "styles.css: honours prefers-reduced-motion")
  : note(fail, "styles.css: animates with no reduced-motion guard");

// 9. Braces balanced.
(css.match(/\{/g) || []).length === (css.match(/\}/g) || []).length
  ? note(ok, "styles.css: braces balanced")
  : note(fail, "styles.css: unbalanced braces");

for (const l of ok) console.log("  ok   " + l);
if (fail.length) {
  console.log("");
  for (const l of fail) console.log("  FAIL " + l);
  process.exitCode = 1;
} else {
  console.log(`\n  All ${ok.length} checks passed.`);
}
