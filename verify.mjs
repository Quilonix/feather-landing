import { readFileSync, existsSync } from "fs";

const pages = ["index.html", "privacy.html"];
const css = readFileSync("styles.css", "utf8");
const fail = [];
const ok = [];
const note = (list, msg) => list.push(msg);

// Classes defined anywhere in the stylesheet.
const definedClasses = new Set();
for (const m of css.matchAll(/\.([a-zA-Z][\w-]*)/g)) definedClasses.add(m[1]);

for (const page of pages) {
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
    for (const c of m[1].trim().split(/\s+/)) used.add(c);
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
  const links = [...html.matchAll(/href="(?!https?:|mailto:|#)([^"]+)"/g)].map((m) => m[1]);
  const missing = links.filter((l) => l !== "./" && !existsSync(l.replace(/[?#].*$/, "")));
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
}

// 7. Colour may only be declared inside a palette block (:root or a
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
  // Tokens that are intentionally light-only: geometry and fonts do not change
  // between themes, only colour does.
  const colourish = (n) => !/(--border-w|--offset|--gutter|--measure|--mono|--sans|--r-)/.test(n);
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
