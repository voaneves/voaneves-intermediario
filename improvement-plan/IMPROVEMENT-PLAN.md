# voaneves.com — Improvement Plan

**Goal:** three things, in priority order —
1. **Performance:** a *real* 100/100 Lighthouse across Performance, Accessibility, Best Practices, SEO (mobile + desktop).
2. **UX/UI:** a site good enough to submit to **AWWWARDS** (and plausibly win Honorable Mention / SOTD).
3. **Content:** drive every piece of copy from one structured source compiled from the CV + LinkedIn.

This plan assumes the current v4 codebase (vanilla HTML/CSS/JS, GitHub Pages, PWA). It is built to layer on top of the existing `to-do.md` and the CSS-refactor `plan.md`, not replace them. Companion files in this folder:
- `portfolio-data.json` — the compiled content source of truth (done).
- `AUDIT-2026-06.md` — source-level findings the actions below reference (P1–P5, A1–A4, B1–B2, S1–S2).

---

## Guiding principle

AWWWARDS and Lighthouse pull in opposite directions: jurors reward *motion, originality, immersion*; Lighthouse punishes *JavaScript, layout shift, blocking work*. The winning move is **"expensive-looking, cheaply-delivered"** — a small number of signature interactions, GPU-composited (transform/opacity only), gated behind `prefers-reduced-motion` and `IntersectionObserver`, with everything heavy lazy-loaded after the hero paints. Every UX decision below is checked against "does this cost LCP/CLS/TBT?".

---

## Execution status & backlog

> **The P-series is Phase 1a = Performance only.** Accessibility / SEO / Best Practices are **Phase 1b** — a separate track, executed later (not P-numbered).

**Phase 1a done (deployed 2026-06-28):** P1 preload LCP image · P2 self-host Fraunces (Google Fonts removed) · P3 remove no-cache metas · P4 cut dead WebGL from `playful.js` (−12.8 KB) · P5 rewrite service worker (network-first HTML, stale-while-revalidate assets, versioned caches).
**Done, awaiting re-audit:** P6 desktop CLS fix (preload the *italic* hero font instead of normal).

**Live audit after deploy (median of repeated runs; lab, CrUX = No Data):**

| | Perf | A11y | BP | SEO | Key CWV |
|---|---|---|---|---|---|
| Mobile | **95** (was 87) | 92 | 96 | 92 | LCP 2.5s (was 3.1) · TBT ~10ms · CLS 0.008 |
| Desktop | **88** (was 87) | 96 | 96 | 92 | LCP 0.4s · TBT ~10–70ms · **CLS 0.227** |

LCP improved on both form factors — P1/P2 worked. Remaining blockers are now specific and small.

### Phase 1a — remaining performance (the P-series)

| # | Item | Unblocks | Effort | Risk |
|---|------|----------|--------|------|
| **P7** | **Mobile LCP < 2.0s.** Responsive hero image — `srcset`/`sizes` with a smaller mobile WebP + AVIF; rebalance the font-vs-image preload budget. | Mobile LCP 2.5 → <2.0 ⇒ **Mobile Perf 95 → ~100** | M | Med |
| **P8** | **Image/asset pipeline.** AVIF + responsive `srcset` for portfolio/timeline images; confirm intrinsic dimensions everywhere; subset/drop unused fonts (`raleway-*.woff2`). | Speed Index, bandwidth, repeat-visit perf | M | Low |
| **P9** | **Real cache headers (CDN).** Cloudflare free in front of GitHub Pages: `immutable` long `max-age` on `/assets/*`, Brotli, HTTP/3. The infra half of P3. | "Efficient cache policy" + real-world repeat visits | M (infra) | Low |
| **P10** | **Critical-path & main-thread tuning.** Idle/defer non-critical JS init, passive listeners, subset the Fraunces woff2 to used glyphs, trim Speed Index (mobile SI ~3.6s). | TBT / SI / INP headroom; smaller fonts | M | Low |

**P6 (done) + P7–P10 close the _Performance_ category to ~100 on both form factors.**

### Phase 1b — Accessibility / SEO / Best Practices (separate track, executed later)

| Item | Unblocks | Effort |
|------|----------|--------|
| **A11y** — `aria-label` on icon-only links; fix the flagged color-contrast pairs; touch targets ≥44px. | A11y 92 → 100 | S–M |
| **SEO** — canonical for the deploy context (self-fixes at root) + `Person` JSON-LD + `sameAs` + `hreflang` from `portfolio-data.json`. | SEO 92 → 100 | S |
| **Best Practices** — tighten CSP (drop `* 'unsafe-inline' 'unsafe-eval'`); strip `console.log`s. | BP 96 → 100 | M |

Phase 2 (UX/AWWWARDS) and Phase 3 (content) remain separate tracks below.

---

## Phase 0 — Baseline & truth (½ day)

Before changing anything, capture reality.

- **0.1 Run a real Lighthouse** (mobile + desktop) per `AUDIT-2026-06.md`. Record the four scores and the LCP / CLS / TBT / INP values. This is the scoreboard for everything else.
- **0.2 Fix the data-consistency issues** (`AUDIT` "Data-consistency"): reconcile the IBM/Damásio timeline against the CV, confirm the real phone number, pick one canonical email, confirm French. Update `portfolio-data.json`.
- **0.3 Wire the page to `portfolio-data.json`** — at minimum a build step that injects the JSON, or `fetch()` + template hydration for the timeline/projects/services/stats. One source of truth kills the drift that caused 0.2.

**Acceptance:** baseline scores recorded; site content matches the CV; no hard-coded copy that also lives in the JSON.

---

## Phase 1 — Performance: close 87 → 100 (1–2 days)

> **Live audit 2026-06-27 of the NEW version (`voaneves.com/voaneves-intermediario/`): Mobile 87 / 92 / 96 / 92, Desktop 87 / 96 / 96 / 92.** The old `voaneves.com` scores 100×4 — so the migration currently *regresses*. Goal #1 is to bring the new version back to 100.
>
> **Key finding that reshapes the plan:** the Performance loss is **LCP (mobile 3.1 s)**, and **TBT is 0 ms**. The animation/JS is *not* the bottleneck — load is. You can keep an ambitious animated hero and still hit 100, as long as LCP and the small a11y/SEO items are fixed. Targets: **LCP < 2.5 s mobile (aim < 2.0), CLS < 0.01, TBT < 150 ms (already 0).**

Highest-impact first (these directly clear the failing audits):

1. **P1 — Preload the LCP image.** `<link rel="preload" as="image" href="assets/img/main_1.webp" fetchpriority="high">` in `<head>`. The single biggest LCP win — the hero image is the LCP element and currently waits for HTML parse.
2. **P2 — Self-host Fraunces.** One variable axis, woff2, `font-display:swap`, `<link rel=preload as=font crossorigin>`. Remove the Google-Fonts request + both `preconnect`s. Kills the render-blocking font on the critical path (the other half of the 3.1 s LCP) and removes a CLS risk.
3. **Reduce unused CSS/JS** (both flagged). The 75 KB stylesheet and `playful.min.js` (33 KB) ship more than the first view needs — split critical vs deferred, tree-shake dead motion code.
4. **P3 — Caching.** Remove the `no-cache` http-equiv metas; serve hashed filenames with long `max-age` (consider Cloudflare in front of GitHub Pages for real cache-control + Brotli).
5. **P5 — Service worker.** Precache core route + hashed CSS/JS/LCP image; bump cache version per deploy.
6. **Keep the hero image eager**, everything below the fold lazy. Re-run Lighthouse after each change to attribute deltas.

### Phase 1b — the cheap a11y + SEO points (½ day, gets you most of the way to 100×4)

These are small, specific, and currently the reason A11y/SEO sit at 92:

- **SEO — the canonical "failure" is a staging artifact, not a bug.** `index.html` has `<link href="https://voaneves.com" rel=canonical>` / `og:url=https://voaneves.com`. Since the new version will **replace the root** `voaneves.com`, that canonical is *correct for the final state* — it only flags now because the page is being served from the `/voaneves-intermediario/` subpath. **It self-resolves the moment this deploys to root.** No change needed for production; if you want a clean 100 on the staging URL, run Lighthouse against the future root URL or temporarily set the canonical to the subpath on staging only.
- **A11y — discernible link names.** The icon-only links (socials, the Cloudflare `email-protection` links) have no accessible name. Add `aria-label` to each.
- **A11y — contrast.** One or more text/background pairs fail AA (likely text over the aurora/hero or red-on-dark). Measure and darken.
- **A11y — touch targets ≥ 44 px** (the theme/translate nav buttons at ~38 px).
- **Best Practices — tighten CSP** (`default-src * 'unsafe-inline' 'unsafe-eval'`) and strip `console.log`s for the last best-practices points.

**Acceptance:** new version at 100/100/100/100 on both form factors (or a written list of any remaining audit + why), canonical pointing at the right URL.

---

## Phase 2 — UX/UI for AWWWARDS (3–5 days)

AWWWARDS scores on **Design (40%), Usability/UX (30%), Creativity (20%), Content (10%)**. The current site already has the bones (bold Fraunces display type, ink/cream/signal palette, marquees, custom cursor). The work is *editing down to a signature*, not adding more.

### UX-1 — Consolidate the visual identity
- **Palette: 3 + 1.** Lock to `ink #0a0a0a`, `cream #f4ead4`, `signal red`, plus one accent — and use them with discipline. Kill the orange/pink/blue/yellow/maroon scatter currently on the stat slabs (`to-do` 3.1).
- **Two typefaces, total.** Fraunces for display; one mono stack for UI labels. Remove the Helvetica-Condensed / mixed-mono inconsistency (`to-do` 3.4).
- **Spacing & rhythm.** One spacing scale, generous hero whitespace (`to-do` 3.3). Density is the enemy of "premium".

### UX-2 — Pick a signature interaction, cut the rest
Inventory today: marquees, glitch, drag-scroll, fluid WebGL hero, parallax, ripple, magnetic, scramble, drop-bounce, word-reveal, expanding chips, scroll-progress, letter-reveal, water displacement = **14 paradigms**. Jurors read that as noise. **Keep ≤5** that compound into one feeling:
- scroll-progress + section-tag choreography
- magnetic CTAs
- one marquee (not three)
- ripple/scramble on a single deliberate moment
- **one** hero showpiece (see UX-3)
Everything else goes (`to-do` 3.2). This *also* serves Phase 1.

### UX-3 — Fix the hero showpiece (it's the award shot)
The buggy WebGL fluid has failed across 5 attempts (`to-do` 2.2). Jurors see the hero first; it cannot be glitchy. Choose **one reliable, beautiful** treatment and perfect it:
- grayscale→color reveal on the portrait with subtle parallax, **or**
- a clean canvas/SVG displacement that is GPU-cheap and never janks.
Reliability beats ambition here. Ship the version that is flawless on Safari iOS, Chrome Android, and desktop.

### UX-4 — Mobile is non-negotiable
- **A1/A2/A3 from the audit:** ≥44 px touch targets, accordion as real disclosure, keyboard-operable timeline.
- **Mobile reflow audit** at 375 / 414 / 768 (`to-do` 2.1): hero name type-scale, stat-slab rotate overflow, bento stack height, hero-photo crop. No horizontal scroll, anywhere.
- A jury *will* open it on a phone. Mobile polish is ~half the score.

### UX-5 — Content & conversion (the "Content" 10% + UX credibility)
- **CTA hierarchy:** one primary (Schedule — filled red, large), secondary (WhatsApp/email — outlined), tertiary (socials — discreet icons). Today everything is the same red weight (`to-do` 4.1).
- **Add 2–3 short testimonials** and a **4-question FAQ** before contact (`to-do` 4.3/4.4) — proof + objection-handling.
- **Trim service copy** to one line + price + button (`to-do` 4.5); trim PT-BR copy ~30% (`to-do` X.1).
- **Curate the timeline** to 5–6 highlights with "show all" (`to-do` X.2) — 11 cards dilutes the strongest roles.
- Consider **per-project case-study pages** (`to-do` X.4) — this is what separates "nice portfolio" from "SOTD". Even 2–3 real case studies (problem → approach → result, using the quantified metrics already in `portfolio-data.json`) would carry the submission.

### UX-6 — The award details
- Custom **404**, a tasteful **loading/intro** state, **OG image** that looks designed, **favicon** crispness, **scroll-restoration** correctness, **reduced-motion** parity. Jurors notice these.
- **Sound off by default**, but a single optional audio cue can be a differentiator if done tastefully.

**Acceptance:** palette ≤4, type ≤2, motion ≤5, flawless hero on 3 browsers, zero mobile overflow, clear CTA hierarchy, ≥2 case studies — then do an internal AWWWARDS self-score against the four criteria before submitting.

---

## Phase 3 — Content sourcing from CV + LinkedIn (½–1 day, can run in parallel)

The CV is already mined into `portfolio-data.json` (12 roles, 14 certs, 5 awards, 7 projects, 8 services, quantified impact metrics, languages, volunteering, interests). To finish:

- **3.1 LinkedIn top-up.** The public profile sits behind a login wall and couldn't be auto-fetched. Paste your LinkedIn **About** section, any **recommendations/testimonials**, **featured** items, and any roles/skills not on the CV — I'll merge them into the JSON (recommendations → UX-5 testimonials; About → a sharper hero/bio).
- **3.2 Reconcile** CV vs site (Phase 0.2) so the JSON is authoritative.
- **3.3 Extend JSON-LD** (`S1`) to include `Person` schema + `sameAs` (LinkedIn/GitHub/YouTube), generated from the JSON.
- **3.4 i18n.** The JSON already carries `pt`/`en` for display copy. Replace the Google-Translate links with real EN/ES builds rendered from the JSON, and add `hreflang` (`S2`). Real localized pages read far more premium than auto-translate.

**Acceptance:** every visible string traces back to `portfolio-data.json`; LinkedIn extras merged; JSON-LD includes Person; at least EN built from the same source.

---

## Suggested order of attack (highest leverage first)

1. **Phase 0** — baseline + data fixes + wire the JSON.
2. **Phase 1 #1–#3** — preload LCP, self-host font, cut JS (fastest path off the current score).
3. **UX-3 + UX-4** — fix the hero, fix mobile (the two things a jury sees first).
4. **UX-1 + UX-2** — consolidate palette/type/motion.
5. **UX-5 + Phase 3** — content, CTAs, testimonials, case studies.
6. **Phase 1 #4–#5 + Phase 2 polish (UX-6)** — caching, SW, award details.
7. **Final Lighthouse + AWWWARDS self-score**, then submit.

## Definition of done
- Real Lighthouse: 100/100 ×4, mobile + desktop, screenshotted.
- Mobile: no overflow at 375/414/768; all targets ≥44 px; keyboard-complete.
- Identity: ≤4 colors, ≤2 typefaces, ≤5 motion systems, hero flawless on Safari iOS / Chrome Android / desktop.
- Content: single source of truth (`portfolio-data.json`), LinkedIn merged, ≥2 case studies, clear CTA hierarchy.
- Submitted to AWWWARDS with the self-score sheet.
