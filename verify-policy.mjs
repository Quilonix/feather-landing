// Checks that privacy.html still tells the truth about the extension.
//
// The privacy policy is a legal declaration and it is also what the Chrome Web
// Store listing points at, so it drifting out of sync with the code is the
// worst kind of bug here: silent, and a compliance problem rather than a
// rendering one. This compares the policy against the extension source.
//
// Expects the extension repository as a sibling directory. Skips cleanly if it
// is not there, so this never blocks a copy of the site cloned on its own.
import { readFileSync, existsSync } from "fs";

const EXT = "../feather/";

if (!existsSync(EXT + "src/analytics.js")) {
  console.log(`  skipped: extension repo not found at ${EXT}`);
  console.log("  clone https://github.com/Quilonix/feather as a sibling directory to run this");
  process.exit(0);
}

const src =
  readFileSync(EXT + "src/analytics.js", "utf8") +
  readFileSync(EXT + "src/content.js", "utf8") +
  readFileSync(EXT + "background.js", "utf8");
const manifest = JSON.parse(readFileSync(EXT + "manifest.json", "utf8"));
const doc = readFileSync("privacy.html", "utf8");

const fail = [];
const ok = [];

// 1. Every event the extension can send must appear in the policy's table.
const called = [...src.matchAll(/trackEvent\(\s*["'`]([a-z_]+)["'`]/g)].map((m) => m[1]);
if (/trackDailyActive/.test(src)) called.push("extension_active");
const events = [...new Set(called)].sort();

// Only the first cell of each row is an event name; later cells are properties.
const rows = [...doc.matchAll(/<tr>\s*<td class="mono">([a-z_]+)<\/td>/g)].map((m) => m[1]);

for (const e of events) {
  rows.includes(e)
    ? ok.push(`event documented: ${e}`)
    : fail.push(`event "${e}" is sent by the extension but missing from privacy.html`);
}
for (const r of rows) {
  events.includes(r)
    ? null
    : fail.push(`privacy.html documents event "${r}" which the extension never sends`);
}

// 2. Event properties must match.
for (const prop of ["hostname", "fileExtension", "tokenSavingsPercent", "imagesExtracted"]) {
  const inCode = src.includes(prop);
  const inDoc = doc.includes(prop);
  inCode === inDoc
    ? ok.push(`property in sync: ${prop}`)
    : fail.push(`property "${prop}": in code=${inCode}, in policy=${inDoc}`);
}

// 3. The policy states these permissions are not used. Keep that true.
for (const perm of ["downloads", "scripting", "history", "cookies", "webRequest"]) {
  (manifest.permissions || []).includes(perm)
    ? fail.push(`policy says "${perm}" is unused, but the manifest declares it`)
    : ok.push(`permission absent as claimed: ${perm}`);
}

// 4. The policy names the analytics host and region. Verify against the source.
const host = (src.match(/POSTHOG_HOST\s*=\s*"([^"]+)"/) || [])[1];
if (host) {
  const bare = host.replace("https://", "");
  doc.includes(bare)
    ? ok.push(`analytics host matches: ${bare}`)
    : fail.push(`extension sends to ${bare}, which the policy does not name`);
}

// 5. Supported site count on the landing page must match the manifest.
const matches = (manifest.content_scripts || []).flatMap((cs) => cs.matches || []);
const hosts = new Set(
  matches.map((m) => m.replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, ""))
);
const landing = readFileSync("index.html", "utf8");
const claimed = Number((landing.match(/Supported sites<\/dt><dd>(\d+)/) || [])[1]);
if (claimed) {
  // Several sites have more than one host pattern (chatgpt.com and
  // chat.openai.com, the two Character.AI hosts, the two Kimi hosts), so the
  // host count is expected to exceed the site count. Flag only a claim that
  // exceeds what the manifest could possibly support.
  claimed <= hosts.size
    ? ok.push(`claimed site count (${claimed}) is within the ${hosts.size} host patterns`)
    : fail.push(`landing page claims ${claimed} sites but the manifest has only ${hosts.size} host patterns`);
}

for (const l of ok) console.log("  ok   " + l);
if (fail.length) {
  console.log("");
  for (const l of fail) console.log("  FAIL " + l);
  process.exitCode = 1;
} else {
  console.log(`\n  All ${ok.length} policy accuracy checks passed.`);
}
