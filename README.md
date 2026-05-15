[voaneves.com](https://voaneves.com)
=================

[![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-green.svg)](https://github.com/voaneves/voaneves.github.io/graphs/commit-activity) [![made-with-python](https://img.shields.io/badge/Made%20with-HTML-Blue)](https://voaneves.com/) [![MIT license](https://img.shields.io/badge/License-MIT-blue.svg)](https://lbesson.mit-license.org/) [![Ask Me Anything !](https://img.shields.io/badge/Ask%20me-anything-1abc9c.svg)](https://GitHub.com/voaneves/ama)

<p align="center">
    <img src = "img/website.gif"/>
</p>

Portfolio website for Victor Neves. It was based on [this tutorial](https://www.youtube.com/watch?v=xV7S8BhIeBo&t=11521s), but heavily optimized for SEO, lighthouse score ([100/100](https://googlechrome.github.io/lighthouse/viewer/?psiurl=https%3A%2F%2Fvoaneves.com%2F&strategy=mobile&category=performance&category=accessibility&category=best-practices&category=seo&category=pwa&utm_source=lh-chrome-ext)) and accessibility (it's also a PWA). It's an online portfolio to showcase my web presence, CV, timeline for showing skills, profficiency and also to be hired. [Have a look! SITE URL: voaneves.com](https://voaneves.com)

Table of Contents
=================

* [1. Getting Started](#getting_started)
    * [1.1. Technology used](#tech)
    * [1.2. Progressive Web App](#pwa)
    * [1.3. Site optmization](#opt)
    * [1.4. Dark and White themes](#themes)
    * [1.5. English version](#en)
* [2. CSS Architecture](#css-architecture)
    * [2.1. Partial structure](#partials)
    * [2.2. BEM convention](#bem)
    * [2.3. Design tokens](#tokens)
    * [2.4. Theme system](#theme-system)
    * [2.5. Build commands](#build)
    * [2.6. Adding a new section](#new-section)
    * [2.7. Adding a new token](#new-token)
* [3. Contributing](#contributing)
* [4. License](#license)
* [5. Acknowledgments](#acknowledgments)

## 1. Getting Started<a name="getting-started"></a>

This repository contains the assets required to build [voaneves.com](https://voaneves.com) website and documentation. I'm glad that you are here! Want to contribute? Send me a pull request or an issue.

### 1.1. Technology Used<a name="tech"></a>

This website is built using:

HTML | CSS | JavaScript | SASS

### 1.2. Progressive Web App<a name="pwa"></a>

It's alson a PWA, fully functional to be installable to be used offline. Progressive Web Apps (PWA) are built and enhanced with modern APIs to deliver enhanced capabilities, reliability, and installability while reaching anyone, anywhere, on any device with a single codebase.

### 1.3. Site optmization<a name="opt"></a>

This website was fully optimized with SEO in mind, also for the accessibility. Have a look in the lighthouse score ([100/100](https://googlechrome.github.io/lighthouse/viewer/?psiurl=https%3A%2F%2Fvoaneves.com%2F&strategy=mobile&category=performance&category=accessibility&category=best-practices&category=seo&category=pwa&utm_source=lh-chrome-ext)). You can also look to others site auditors and send a PR.

Google Analytics was purposefully removed due to the performance hit.

### 1.4. Dark and white themes<a name="themes"></a>

This website features Dark and a White Theme, on PC, tablet or mobile.

<p align="center">
    <img src = "img/themes.gif"/>
</p>

### 1.5. English version<a name="en"></a>

This website also features a fully translated English version.

<p align="center">
    <img src = "img/lang.gif"/>
</p>

## 2. CSS Architecture <a name="css-architecture"></a>

The stylesheet pipeline was unified in a six-phase migration: the old setup loaded two CSS files in series (`styles.css` + `playful.css`, ~136 KB ungzipped) with two parallel naming conventions colliding in the cascade. Now it compiles a single `styles.css` (~81 KB ungzipped, ~15 KB gzipped) from 32 SCSS partials. Sass modules use the modern `@use` / `@forward` syntax — `@import` is fully eliminated.

### 2.1. Partial structure <a name="partials"></a>

Partials in `assets/styles/` are grouped by role. Load order (defined in `styles.scss`) is significant — it controls cascade precedence:

```
Foundation
  _include.scss         mixins, fluid() function, $breakpoints map
  _tokens.scss          design tokens (--ink, --cream, --signal, --pad-*, legacy --color-*)
  _theme.scss           three-tier theme resolution (defaults / system / user toggle)

Shared utilities (legacy)
  _header.scss          universal * reset + fluid type scale (--text-*) + base body/section/a
  _sidebar.scss
  _cursor.scss          legacy #cursor + v4 .pf-cur/.pf-ring system
  _independent-components.scss
  _scrollbar.scss
  _scroll-icon.scss
  _social-icons.scss    icomoon font binding
  _toast.scss
  _dropdown.scss
  _animations.scss      @keyframes + gravity/spring entrance + party-mode
  _selection.scss       ::selection + ::-moz-selection

Legacy inline blocks (transitional)
  _legacy-inline.scss   what remained from styles.scss inline body after cleanup

v4 design (extracted from playful.css during Fase 2)
  _reset.scss           .v4 body resets + section min-height + skip-link
  _ripple.scss          .pf-ripple / .pf-word / .pf-scroll-bar utilities
  _nav.scss             top navigation + utility buttons + CTA
  _drawer.scss          mobile slide-in drawer
  _hero.scss            hero section (largest partial — name + photo + aurora + chips)
  _intro.scss           editorial statement section
  _stats.scss           number cards with data-hue color variants
  _expertise.scss       stacked marquees
  _timeline.scss        horizontal drag-scroll cards
  _portfolio.scss       project list with cursor image preview
  _services.scss        bento grid + accordion
  _contact.scss         massive statement on red bg + glitch email + icons
  _footer.scss          row + outline-text multilingual marquee
  _legacy.scss          visual easter eggs (.mesh-rings) — kept until next audit
  _theme-overrides.scss section conversions + per-mode hardening — loaded LAST
```

### 2.2. BEM convention <a name="bem"></a>

Class names follow loose BEM:

- `.block` — a self-contained component (e.g. `.hero`, `.timeline`, `.cta`)
- `.block__element` — a part of the block (e.g. `.hero__photo`, `.timeline__card-meta`)
- `.block--modifier` — a variant (e.g. `.cta--pill`, `.hero__line--right`, `.hero__aurora-blob--orange`)

There is no `v4-` or version prefix anywhere — that was the cleanup in Fase 3. Section names describe what the element is (`.hero`, not `.v4-hero` or `.header-content`).

JavaScript state flags use `is-*` and are added/removed dynamically — they are NOT renamed by the BEM convention: `is-active`, `is-hover`, `is-on-photo`, `is-revealed`, `is-open`, `is-toggling`, `is-dragging`.

### 2.3. Design tokens <a name="tokens"></a>

All tokens live in `_tokens.scss`. Two token families coexist:

```scss
/* v4 — consumed by every modern partial */
--ink          /* primary text / dark surface          */
--ink-soft     /* raised dark surface                  */
--cream        /* primary bg / light text on dark      */
--cream-soft   /* secondary bg                         */
--signal       /* brand red (CTA, accents)             */
--signal-2     /* hot accent (hover, indicators)       */
--hue-orange   /* decorative — stats, hero aurora      */
--hue-pink
--hue-blue
--hue-yellow
--maroon
--line         /* hairlines on light surfaces          */
--line-on-dark
--pad-x        /* clamp(20px, 4vw, 64px) section gutter */
--pad-y        /* clamp(60px, 10vh, 140px) vertical pad */

/* Legacy — for the parts that haven't been migrated yet */
--color-primary    /* legacy background  — follows --cream  */
--color-secondary  /* aliased to var(--signal)              */
--color-white      /* legacy text color                     */
--color-white-2 / --color-black / --color-grey-{0..6} / --color-opposite / --color-yellow
```

Theme overrides for both families live in `_theme.scss` and `_tokens.scss`.

### 2.4. Theme system <a name="theme-system"></a>

A three-tier resolution decides which palette wins:

1. **`:root` defaults** (`_tokens.scss`) — tuned for a light environment / no system preference.
2. **`@media (prefers-color-scheme: dark) :root`** (`_theme.scss`) — automatic when the OS is in dark mode.
3. **`.light-mode` / `.dark-mode`** on `<body>` (`_theme.scss`) — explicit user override via the toggle button. Beats the system preference by specificity.

Section-level routing is data-attribute driven: `<section class="hero" data-section-bg="ink">` flags this section as dark-surface. Theme rules in `_theme-overrides.scss` consume that attribute to convert surfaces between themes (e.g., a `cream` section becomes `ink-soft` when system is dark, then stays `cream` when the user toggles light).

Rules inside `@media (prefers-color-scheme: dark)` use `.v4:not(.light-mode)` qualifier so that an explicit light toggle on a dark OS correctly suppresses the system-dark rules. Mirror logic with `:root:not(.dark-mode)` covers the inverse.

### 2.5. Build commands <a name="build"></a>

Compile the production stylesheet:

```bash
npx sass assets/styles/styles.scss assets/styles/styles.css \
  --style=compressed --source-map --no-charset
```

Flags rationale:
- `--style=compressed` — minified output.
- `--source-map` — for debugging in DevTools.
- `--no-charset` — prevents Sass from prepending a BOM when non-ASCII chars (em-dashes in comments) trigger its UTF-8 detection.

For an ongoing dev session use `--watch` instead of one-shot compilation:

```bash
npx sass assets/styles/styles.scss assets/styles/styles.css --watch --no-charset
```

The pipeline produces zero deprecation warnings against Dart Sass 1.69+. `darken()` / `lighten()` migrated to `color.scale()`, `/` arithmetic migrated to `math.div()`, and `map-*` helpers migrated to the namespaced `map.*` module (with a few stragglers still pending in `respond-from` / `respond-between`).

### 2.6. Adding a new section <a name="new-section"></a>

1. Create the partial: `assets/styles/_my-section.scss`.
2. If the partial uses mixins/functions from `_include.scss`, declare the dependency at the top: `@use "include" as *;`. CSS-only partials need no `@use`.
3. Wire it into `styles.scss` near the other section partials, AFTER `_legacy-inline.scss` so the new BEM rules win the cascade where they overlap with legacy: `@use "my-section";`.
4. In `index.html` add the markup: `<section class="my-section" id="my-section" data-section-bg="cream">…</section>`. Choose the surface (`ink`, `cream`, or `red`) via `data-section-bg`.
5. Inside the partial set `display: flex; flex-direction: column; justify-content: center` if you want the immersive 100vh-centered content feel (see existing sections for reference).
6. Theme-specific overrides (light / dark / system) go in `_theme-overrides.scss`, not in the section partial itself. That keeps the section file focused on layout + base color.

### 2.7. Adding a new token <a name="new-token"></a>

1. Add the token to the `:root { … }` block in `_tokens.scss`. Comment its purpose and the AA/AAA contrast budget if relevant.
2. If the token is theme-dependent, add the swap in `_theme.scss`:
   - `@media (prefers-color-scheme: dark) :root { --my-token: …; }` for system dark.
   - `.light-mode { --my-token: …; }` and `.dark-mode { --my-token: …; }` for explicit user toggle.
3. Reference it via `var(--my-token)` from any partial — no `@use` needed for custom properties, they cascade through the document.

## 3. Contributing <a name="contributing"></a>

Please read [CONTRIBUTING.md](https://gist.github.com/PurpleBooth/b24679402957c63ec426) for details on this repo's code of conduct, and the process for submitting pull requests.

## 4. License <a name="license"></a>

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 5. Acknowledgments <a name="acknowledgments"></a>

* @Maclinz - for his [JS_CSS_PortfolioProject](https://github.com/Maclinz/JS_CSS_PortfolioProject). thanks for the tutorial :D

* [web.dev](https://web.dev) - for the awesome tutorials and guidance when needed.
