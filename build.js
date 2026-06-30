/**
 * voaneves.com — one-shot build.
 * Run via `build.bat` (double-click) or `npm run build`.
 *
 * Steps (all idempotent — safe to re-run any number of times):
 *   1. Minify the hand-written JS  -> *.min.js  (terser)
 *   2. Compile SCSS -> assets/styles/styles.css (sass, compressed)
 *      ⚠️  styles.css is GENERATED. Edit the .scss partials, never styles.css.
 *   3. Reset index.html's critical block to a clean state
 *   4. Extract above-the-fold critical CSS (desktop + mobile), inline it in
 *      <head>, and switch styles.css to async loading        (critical)
 *   5. Bump the service-worker cache version so deploys never serve stale assets
 *
 * After it finishes: `git diff` to review, then commit + push.
 */
"use strict";

const fs = require("fs");
const { execSync } = require("child_process");

const JS_FILES = ["app", "console", "cursor", "playful", "toast"];
const INDEX = "index.html";
const CSS = "assets/styles/styles.css";
const SCSS = "assets/styles/styles.scss";
const STYLES_LINK_RE = /<link href=assets\/styles\/styles\.css [^>]*>/;          // head link, any state
const ASYNC_LINK =
  "<link href=assets/styles/styles.css rel=preload as=style " +
  "onload='this.onload=null,this.rel=\"stylesheet\"'>";

const sh = (cmd) => execSync(cmd, { stdio: "inherit", shell: true });

(async () => {
  // ── 1. Minify JS ─────────────────────────────────────────────
  console.log("\n[1/5] Minifying JS…");
  for (const f of JS_FILES) {
    const src = `assets/js/${f}.js`;
    if (fs.existsSync(src)) {
      sh(`npx terser "${src}" -c -m -o "assets/js/${f}.min.js"`);
      console.log(`      ✓ ${f}.min.js`);
    }
  }

  // ── 2. Compile SCSS → styles.css ─────────────────────────────
  console.log("\n[2/5] Compiling SCSS  (styles.css is generated — edit the .scss)…");
  if (fs.existsSync(SCSS)) {
    sh(`npx sass "${SCSS}" "${CSS}" --style=compressed --no-source-map`);
    console.log("      ✓ styles.css");
  } else {
    console.log("      - no styles.scss found, skipping");
  }

  // ── 3. Reset index.html to the pre-critical state ────────────
  console.log("\n[3/5] Resetting critical block…");
  let html = fs.readFileSync(INDEX, "utf8");
  html = html.replace(/<style id=critical>[\s\S]*?<\/style>/g, "");          // drop old inlined critical
  html = html.replace(STYLES_LINK_RE, "<link href=assets/styles/styles.css rel=stylesheet>"); // render-block so critical sees a styled page
  fs.writeFileSync(INDEX, html, "utf8");

  // ── 4. Extract + inline critical CSS, switch styles.css to async ──
  console.log("\n[4/5] Generating critical CSS (headless Chromium — a few seconds)…");
  const { generate } = await import("critical"); // critical v8 is ESM-only
  const { css: rawCritical } = await generate({
    base: ".",
    src: INDEX,
    inline: false,
    css: [CSS],
    dimensions: [
      { width: 1366, height: 768 }, // desktop
      { width: 390, height: 844 },  // mobile
    ],
  });
  // critical v8 returns unminified CSS — minify it ourselves
  const css = rawCritical
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([{}:;,>])\s*/g, "$1")
    .replace(/;}/g, "}")
    .trim();
  html = fs.readFileSync(INDEX, "utf8");
  const block = `<style id=critical>${css}</style>${ASYNC_LINK}`;
  html = html.replace(/<link href=assets\/styles\/styles\.css rel=stylesheet>/, block); // first (head) link only
  fs.writeFileSync(INDEX, html, "utf8");
  console.log(`      ✓ critical inlined (${Math.round(css.length / 1024)} KB), styles.css → async`);

  // ── 5. Bump service-worker cache version ─────────────────────
  console.log("\n[5/5] Bumping service-worker version…");
  const stamp =
    "v-" + new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
  for (const sw of ["worker.js", "worker.min.js"]) {
    if (!fs.existsSync(sw)) continue;
    const before = fs.readFileSync(sw, "utf8");
    const after = before.replace(/(VERSION\s*=\s*")[^"]*(")/, `$1${stamp}$2`);
    if (after !== before) {
      fs.writeFileSync(sw, after, "utf8");
      console.log(`      ✓ ${sw} → ${stamp}`);
    }
  }

  console.log("\n✅ Build complete. Review with `git diff`, then commit + push.\n");
})().catch((err) => {
  console.error("\n❌ Build failed:\n", err);
  process.exit(1);
});
