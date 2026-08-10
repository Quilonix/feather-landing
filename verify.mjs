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
}

// 7. The stylesheet must not hardcode colour outside the token block.
const tokenBlockEnd = css.indexOf("}", css.indexOf(":root"));
const afterTokens = css.slice(tokenBlockEnd);
const strayHex = [...afterTokens.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map((m) => m[0]);
strayHex.length
  ? note(fail, `styles.css: hex colours outside :root: ${[...new Set(strayHex)].join(", ")}`)
  : note(ok, "styles.css: no hex colour outside the token block");

// 8. Reduced motion must be honoured, since the page animates a ticker.
/prefers-reduced-motion/.test(css)
  ? note(ok, "styles.css: honours prefers-reduced-motion")
  : note(fail, "styles.css: ticker animates with no reduced-motion guard");

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
