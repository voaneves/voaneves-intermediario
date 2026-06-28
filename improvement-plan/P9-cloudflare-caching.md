# P9 — Real cache headers via Cloudflare (in front of GitHub Pages)

**This is an infrastructure step you run in your own Cloudflare dashboard — it can't be done from the repo.** Below is the exact, safe configuration.

## Honest impact first

- **It does NOT change the Lighthouse lab score.** Caching/CDN are not scored metrics. It improves *real-world* repeat visits, TTFB, and transfer size, and clears the non-scored "Serve static assets with an efficient cache policy" diagnostic.
- **Much of the repeat-visit win is already covered by the service worker** (P5 — stale-while-revalidate). So the *new* things Cloudflare adds are: **Brotli** (~15% smaller than GitHub Pages' gzip), **edge caching / faster TTFB**, **HTTP/3**, and proper `Cache-Control`.

## ⚠️ The gotcha that sets the whole recipe

Your assets are **not content-hashed** (`styles.css`, `playful.min.js`, fonts keep the same filename across deploys). So you must **NOT** set `max-age=31536000, immutable` on them — returning visitors would be stuck on the old file for a year (the same staleness P5 fixed). Two safe choices:

- **Now (no build change):** moderate browser TTL + **purge Cloudflare cache on every deploy**. The SW already keeps clients fresh.
- **Later (pairs with a build step):** add content hashes to filenames (`styles.4f1a.css`) — *then* `immutable, max-age=1yr` is safe. This is the only way to get the "perfect" cache policy.

---

## Path A — Cloudflare proxy in front of GitHub Pages (recommended, no migration)

You keep GitHub Pages; Cloudflare sits in front of `voaneves.com`.

1. **Add the site to Cloudflare (Free plan)** and point your domain's nameservers to Cloudflare (or, if DNS is already on Cloudflare, just proxy the record).
2. **DNS:** the records pointing to GitHub Pages (the four `A` records `185.199.108–111.153`, or the `CNAME` to `voaneves.github.io`) → set to **Proxied (orange cloud)**.
3. **SSL/TLS → Overview:** mode **Full** (GitHub Pages serves valid HTTPS).
4. **Speed → Optimization → Content:** **Brotli = ON** (usually default).
5. **Network:** **HTTP/3 (with QUIC) = ON**, **0-RTT = ON**.
6. **Caching → Cache Rules → Create rule** — *Static assets:*
   - **When:** `URI Path` `starts with` `/assets/`
   - **Then:** *Eligible for cache* = Yes · *Edge TTL* = 1 month (override origin) · *Browser TTL* = **1 day** (keep modest — filenames aren't hashed).
7. **Caching → Cache Rules → Create rule** — *HTML stays fresh:*
   - **When:** `URI Path` `ends with` `/` **or** `.html`
   - **Then:** *Edge TTL* = short (e.g. 2 min, or "Respect origin") · *Browser TTL* = "Respect origin". This makes new deploys visible quickly (the SW is network-first for HTML anyway).
8. **(Optional) `immutable` header** for assets — only do this once filenames are hashed. Rules → **Transform Rules → Modify Response Header → Set static**: header `Cache-Control` = `public, max-age=31536000, immutable`, when `URI Path starts with /assets/`.
9. **Purge on deploy:** after each `git push`/Pages build, **Caching → Configuration → Purge Everything** (or automate via the Cloudflare API token in your deploy flow). This is what makes the modest-TTL approach safe.

**Result:** Brotli + HTTP/3 + edge cache + sane `Cache-Control`, with deploys still showing up fast. No staleness because HTML is network-first (SW) and you purge on deploy.

---

## Path B — Move hosting to Cloudflare Pages (cleaner long-term)

Cloudflare Pages (free) builds from the same repo and **reads a `_headers` file** — so the cache policy lives in version control instead of the dashboard. Connect the repo, set the output dir to the repo root, and add this `_headers` file at the project root:

```
# Cloudflare Pages / Netlify — ignored by GitHub Pages
/assets/*
  Cache-Control: public, max-age=86400, stale-while-revalidate=604800
  # switch to: public, max-age=31536000, immutable  — ONLY after filenames are content-hashed

/*.html
  Cache-Control: public, max-age=0, must-revalidate

/
  Cache-Control: public, max-age=0, must-revalidate

/worker.min.js
  Cache-Control: public, max-age=0, must-revalidate
```

(`worker.min.js` must never be cached long, so SW updates propagate.)

Brotli, HTTP/3 and edge caching are automatic on Pages. This is the tidiest end state, but it's a hosting move — do it when you're ready, not as part of the score push.

---

## Recommendation

Do **Path A steps 1–7 + 9** now (Brotli/HTTP/3/edge cache + purge-on-deploy) — ~10 minutes, zero risk, real-world faster. Skip the `immutable` header (step 8) until you add filename hashing. Don't expect the Lighthouse number to move; this is a real-world/robustness win.
