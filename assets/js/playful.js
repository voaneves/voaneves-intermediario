/* playful.js v4 — interaction layer for cinematic v4 layout
 * Vanilla, no deps. Defer-loaded. Skips on reduced-motion / touch.
 *
 * Subsystems:
 *  1.  Cursor (dot + ring + label + image preview)
 *  2.  Magnetic targets
 *  3.  Hero letter-by-letter reveal
 *  4.  Section bg-mode watcher (drives nav color)
 *  5.  Active nav link via IntersectionObserver
 *  6.  Stat counters on view
 *  7.  Word reveal for paragraphs
 *  8.  Velocity marquee
 *  9.  Scramble text on tags
 * 10.  Horizontal drag-scroll for timeline track
 * 11.  Click ripple
 * 12.  Scroll progress bar
 * 13.  Smooth in-page nav
 * 14.  Easter egg (Konami)
 */
(function () {
  "use strict";

  var prefersReduced =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canHover =
    window.matchMedia &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  // "Touch device" = has touch AND no fine pointer. Hybrid laptops (touchscreen
  // + mouse) report maxTouchPoints>0 but DO have a fine pointer, so they must NOT
  // count as touch-only — otherwise the cursor / brush / magnetic effects get
  // disabled for mouse users on touch-capable machines.
  var isTouch =
    ("ontouchstart" in window || navigator.maxTouchPoints > 0) && !canHover;

  // ============================================================
  // 1. CURSOR — dot + ring + label + image preview
  // ============================================================
  function initCursor() {
    if (prefersReduced || !canHover || isTouch) return;
    var oldCur = document.getElementById("cursor");
    var oldBd = document.getElementById("cursor-border");
    if (oldCur) oldCur.style.display = "none";
    if (oldBd) oldBd.style.display = "none";

    var dot = el("div", "pf-cur");
    var ring = el("div", "pf-ring");
    var label = el("div", "pf-label");
    label.setAttribute("aria-hidden", "true");
    var preview = el("div", "pf-img-preview");
    preview.setAttribute("aria-hidden", "true");
    var previewImg = document.createElement("img");
    previewImg.alt = "";
    preview.appendChild(previewImg);

    document.body.appendChild(ring);
    document.body.appendChild(dot);
    document.body.appendChild(label);
    document.body.appendChild(preview);

    var mx = window.innerWidth/2, my = window.innerHeight/2;
    var rx = mx, ry = my, lx = mx, ly = my, px = mx, py = my;
    var labelOn = false, previewOn = false;
    var currentImgSrc = "";

    document.addEventListener("pointermove", function (e) {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = "translate3d("+mx+"px,"+my+"px,0)";
    }, { passive: true });
    document.addEventListener("pointerdown", function () {
      dot.classList.add("is-press"); ring.classList.add("is-press");
    });
    document.addEventListener("pointerup", function () {
      dot.classList.remove("is-press"); ring.classList.remove("is-press");
    });
    document.addEventListener("pointerleave", function () {
      dot.style.opacity = "0"; ring.style.opacity = "0";
      label.classList.remove("is-on"); preview.classList.remove("is-on");
    });
    document.addEventListener("pointerenter", function () {
      dot.style.opacity = ""; ring.style.opacity = "";
    });

    var hovers = document.querySelectorAll(
      "a, button, [data-cursor], .control, .cta, .timeline__card, .project, " +
      ".bento__item, .utility-btn, .contact__email-btn, " +
      ".portfolio-card, .companies .card, .icon"
    );
    hovers.forEach(function (h) {
      h.addEventListener("pointerenter", function () {
        dot.classList.add("is-hover"); ring.classList.add("is-hover");
        var txt = h.getAttribute("data-cursor-label") || "";
        if (!txt && h.classList.contains("timeline__card")) {
          var c = h.querySelector(".timeline__card-co");
          var r = h.querySelector(".timeline__card-role");
          if (c && r) txt = (c.textContent + " — " + r.textContent).toUpperCase();
        }
        if (!txt && h.classList.contains("project")) {
          var n = h.querySelector(".project__name");
          if (n) txt = n.textContent.toUpperCase();
        }
        if (txt && txt.length < 80) {
          label.textContent = txt;
          labelOn = true;
          label.classList.add("is-on");
        }
        // Image preview for portfolio
        var img = h.getAttribute("data-img");
        if (img && h.matches("[data-img]")) {
          if (currentImgSrc !== img) {
            previewImg.src = img;
            currentImgSrc = img;
          }
          previewOn = true;
          preview.classList.add("is-on");
        }
      });
      h.addEventListener("pointerleave", function () {
        dot.classList.remove("is-hover"); ring.classList.remove("is-hover");
        labelOn = false; label.classList.remove("is-on");
        previewOn = false; preview.classList.remove("is-on");
      });
    });

    // ---- Cursor lens over the hero photo: dot fades, ring grows ----
    // ---- Plus: rotating circular badge follows the cursor while over photo
    var heroPhoto = document.querySelector(".hero__photo");
    var heroBadge = document.querySelector(".badge");
    if (heroPhoto) {
      heroPhoto.addEventListener("pointerenter", function () {
        dot.classList.add("is-on-photo");
        ring.classList.add("is-on-photo");
        if (heroBadge) heroBadge.classList.add("is-visible");
      });
      heroPhoto.addEventListener("pointerleave", function () {
        dot.classList.remove("is-on-photo");
        ring.classList.remove("is-on-photo");
        if (heroBadge) heroBadge.classList.remove("is-visible");
      });
      // Update badge X/Y on every mousemove so its center sticks to the
      // cursor tip exactly (no easing, no lag). The CSS uses --badge-x
      // and --badge-y inside the transform.
      if (heroBadge) {
        heroPhoto.addEventListener("pointermove", function (e) {
          heroBadge.style.setProperty("--badge-x", e.clientX + "px");
          heroBadge.style.setProperty("--badge-y", e.clientY + "px");
        }, { passive: true });
      }
    }
    // Scale-only loop: badge shrinks when not engaged, grows when over photo.
    // Position is set instantly above; only the scale is eased here.
    if (heroBadge) {
      var bS = .5, bST = .5;
      function badgeLoop() {
        bST = heroBadge.classList.contains("is-visible") ? 1 : .5;
        bS += (bST - bS) * 0.12;
        heroBadge.style.setProperty("--badge-s", bS.toFixed(3));
        requestAnimationFrame(badgeLoop);
      }
      requestAnimationFrame(badgeLoop);
    }

    function loop() {
      rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
      ring.style.transform = "translate3d("+rx+"px,"+ry+"px,0)";
      lx += (mx - lx) * 0.22; ly += (my - ly) * 0.22;
      label.style.transform =
        "translate3d("+(lx+22)+"px,"+(ly+28)+"px,0)" +
        (labelOn ? " scale(1)" : " scale(.6)");
      px += (mx - px) * 0.12; py += (my - py) * 0.12;
      preview.style.transform =
        "translate3d("+(px-160)+"px,"+(py-260)+"px,0)" +
        (previewOn ? " scale(1)" : " scale(.7)");
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }

  // ============================================================
  // 2. MAGNETIC TARGETS
  // ============================================================
  function initMagnetic() {
    if (prefersReduced || isTouch || !canHover) return;
    var sel = [".cta", ".utility-btn", ".contact__email-btn .glitch", ".icon"];
    var STR = 0.28, RANGE = 70;
    document.querySelectorAll(sel.join(",")).forEach(function (el) {
      var rect=null, raf=null;
      var cur={x:0,y:0}, tgt={x:0,y:0};
      function loop() {
        cur.x += (tgt.x-cur.x)*0.18; cur.y += (tgt.y-cur.y)*0.18;
        el.style.transform = "translate3d("+cur.x.toFixed(2)+"px,"+cur.y.toFixed(2)+"px,0)";
        if (Math.abs(tgt.x-cur.x)>0.1 || Math.abs(tgt.y-cur.y)>0.1)
          raf = requestAnimationFrame(loop);
        else raf = null;
      }
      function move(e) {
        if (!rect) rect = el.getBoundingClientRect();
        var dx = e.clientX - (rect.left+rect.width/2);
        var dy = e.clientY - (rect.top+rect.height/2);
        var d = Math.sqrt(dx*dx + dy*dy);
        if (d > RANGE + Math.max(rect.width,rect.height)/2) { tgt.x=0; tgt.y=0; }
        else { tgt.x = dx*STR; tgt.y = dy*STR; }
        if (!raf) raf = requestAnimationFrame(loop);
      }
      function reset() { tgt.x=0; tgt.y=0; if (!raf) raf = requestAnimationFrame(loop); rect = null; }
      el.addEventListener("pointerenter", function(){ rect = el.getBoundingClientRect(); });
      el.addEventListener("pointermove", move, { passive: true });
      el.addEventListener("pointerleave", reset);
      window.addEventListener("scroll", function(){ rect = null; }, { passive: true });
    });
  }

  // ============================================================
  // 4. SECTION BG-MODE WATCHER (nav adapts)
  // ============================================================
  function initSectionMode() {
    var nav = document.querySelector(".nav");
    if (!nav) return;
    var sections = document.querySelectorAll("section[data-section-bg]");
    if (!sections.length) return;
    // Cache the nav height — it's fixed; reading it on every scroll frame
    // forced a layout. Recompute only on resize.
    var navH = nav.getBoundingClientRect().height;
    function update() {
      var probeY = navH + 4;
      var current = null;
      sections.forEach(function (s) {
        var r = s.getBoundingClientRect();
        if (r.top <= probeY && r.bottom > probeY) current = s;
      });
      if (current) {
        nav.setAttribute("data-mode", current.getAttribute("data-section-bg"));
      }
    }
    var ticking = false;
    window.addEventListener("scroll", function () {
      if (!ticking) { requestAnimationFrame(function(){ update(); ticking=false; }); ticking = true; }
    }, { passive: true });
    window.addEventListener("resize", function () {
      navH = nav.getBoundingClientRect().height;
    }, { passive: true });
    update();
  }

  // ============================================================
  // 5. ACTIVE NAV LINK
  // ============================================================
  function initActiveNav() {
    if (!("IntersectionObserver" in window)) return;
    var nav = document.querySelector(".nav__links");
    if (!nav) return;
    var links = nav.querySelectorAll("a[href^='#']");
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var id = entry.target.id;
          links.forEach(function (a) {
            a.classList.toggle("active-btn", a.getAttribute("href") === "#" + id);
          });
        }
      });
    }, { rootMargin: "-40% 0px -55% 0px" });
    document.querySelectorAll("section[id]").forEach(function (s) { io.observe(s); });
  }

  // ============================================================
  // 6. STAT COUNTERS ON VIEW
  // ============================================================
  function initCounters() {
    if (!("IntersectionObserver" in window)) return;
    var nodes = document.querySelectorAll("[data-count]");
    if (!nodes.length) return;
    function animate(node) {
      var target = parseInt(node.getAttribute("data-count"), 10);
      if (isNaN(target)) return;
      if (prefersReduced) { node.textContent = target; return; }
      var dur = 1100, t0 = null;
      function frame(t) {
        if (!t0) t0 = t;
        var p = Math.min((t - t0) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        node.textContent = Math.round(target * eased);
        if (p < 1) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && !entry.target.dataset.counted) {
          entry.target.dataset.counted = "1";
          animate(entry.target);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.6 });
    nodes.forEach(function (n) { io.observe(n); });
  }

  // ============================================================
  // 7. WORD REVEAL — paragraphs
  // ============================================================
  function initWordReveal() {
    if (prefersReduced || !("IntersectionObserver" in window)) return;
    var ps = document.querySelectorAll(
      ".intro__side > p, .bento__item p, .portfolio__sub"
    );
    if (!ps.length) return;
    ps.forEach(function (p) {
      if (p.dataset.wordwrap) return;
      p.dataset.wordwrap = "1";
      function wrap(node) {
        Array.prototype.slice.call(node.childNodes).forEach(function (child) {
          if (child.nodeType === 3) {
            var words = child.textContent.split(/(\s+)/);
            var frag = document.createDocumentFragment();
            words.forEach(function (w) {
              if (/^\s+$/.test(w)) frag.appendChild(document.createTextNode(w));
              else if (w.length) {
                var s = document.createElement("span");
                s.className = "pf-word"; s.textContent = w;
                frag.appendChild(s);
              }
            });
            node.replaceChild(frag, child);
          } else if (child.nodeType === 1) {
            wrap(child);
          }
        });
      }
      wrap(p);
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.querySelectorAll(".pf-word").forEach(function (w, i) {
            w.style.transitionDelay = Math.min(i*16, 600) + "ms";
            w.classList.add("pf-word-in");
          });
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });
    ps.forEach(function (p) { io.observe(p); });
  }

  // [P14] Velocity-marquee removed: it rewrote animationDuration on every
  // scroll frame, which de-composited the (otherwise GPU-only transform)
  // marquee. The marquee now runs purely on the compositor at constant speed.

  // ============================================================
  // 9. SCRAMBLE TEXT on view (section tags)
  // ============================================================
  function initScramble() {
    if (prefersReduced) return;
    var CHARS = "!<>-_\\/[]{}=+*^?#________";
    function scramble(el, finalText, duration) {
      var t0=null, raf;
      function frame(t) {
        if (!t0) t0 = t;
        var p = Math.min((t-t0)/duration, 1);
        var revealed = Math.floor(p*finalText.length);
        var out = "";
        for (var i=0; i<finalText.length; i++) {
          if (i<revealed || finalText[i] === " ") out += finalText[i];
          else out += CHARS[Math.floor(Math.random()*CHARS.length)];
        }
        el.textContent = out;
        if (p<1) raf = requestAnimationFrame(frame);
        else el.textContent = finalText;
      }
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(frame);
    }
    var nodes = document.querySelectorAll(".section-tag");
    if (!nodes.length || !("IntersectionObserver" in window)) return;
    nodes.forEach(function (n) { n.dataset.origText = n.textContent.trim(); });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && !entry.target.dataset.scrambled) {
          entry.target.dataset.scrambled = "1";
          scramble(entry.target, entry.target.dataset.origText, 700);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    nodes.forEach(function (n) { io.observe(n); });
  }

  // ============================================================
  // 10. HORIZONTAL DRAG-SCROLL (timeline track)
  // ============================================================
  function initDragScroll() {
    document.querySelectorAll("[data-drag-scroll]").forEach(function (track) {
      var isDown = false, startX = 0, startLeft = 0, vel = 0, lastX = 0, lastT = 0, raf;
      track.addEventListener("pointerdown", function (e) {
        // Only initiate drag on the track itself, not on a card click
        isDown = true;
        track.classList.add("is-dragging");
        startX = e.pageX;
        startLeft = track.scrollLeft;
        lastX = e.pageX; lastT = performance.now();
        track.setPointerCapture(e.pointerId);
        cancelAnimationFrame(raf);
      });
      track.addEventListener("pointermove", function (e) {
        if (!isDown) return;
        var dx = e.pageX - startX;
        track.scrollLeft = startLeft - dx;
        var now = performance.now();
        var dt = now - lastT;
        if (dt > 0) vel = (e.pageX - lastX) / dt; // px/ms
        lastX = e.pageX; lastT = now;
      });
      function endDrag() {
        if (!isDown) return;
        isDown = false;
        track.classList.remove("is-dragging");
        // Inertia
        var v = vel; vel = 0;
        function decay() {
          if (Math.abs(v) < 0.02) return;
          track.scrollLeft -= v * 16;
          v *= 0.94;
          raf = requestAnimationFrame(decay);
        }
        raf = requestAnimationFrame(decay);
      }
      track.addEventListener("pointerup", endDrag);
      track.addEventListener("pointercancel", endDrag);
      track.addEventListener("pointerleave", endDrag);

      // Wheel: convert vertical to horizontal when over track (desktop)
      track.addEventListener("wheel", function (e) {
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
          track.scrollLeft += e.deltaY;
          e.preventDefault();
        }
      }, { passive: false });
    });
  }

  // ============================================================
  // 11. CLICK RIPPLE
  // ============================================================
  function initRipple() {
    if (prefersReduced) return;
    var targets = document.querySelectorAll(
      ".cta, .icon, .timeline__card, .bento__item .call-to-action, .contact__email-btn"
    );
    targets.forEach(function (el) {
      if (!el.style.position) el.style.position = "relative";
      el.addEventListener("pointerdown", function (e) {
        var r = el.getBoundingClientRect();
        var ripple = document.createElement("span");
        ripple.className = "pf-ripple";
        var size = Math.max(r.width, r.height);
        ripple.style.width = ripple.style.height = size + "px";
        ripple.style.left = e.clientX - r.left - size/2 + "px";
        ripple.style.top = e.clientY - r.top - size/2 + "px";
        el.appendChild(ripple);
        setTimeout(function () {
          if (ripple.parentNode) ripple.parentNode.removeChild(ripple);
        }, 700);
      });
    });
  }

  // ============================================================
  // 12. SCROLL PROGRESS BAR
  // ============================================================
  function initScrollBar() {
    if (prefersReduced) return;
    var bar = el("div", "pf-scroll-bar");
    bar.setAttribute("aria-hidden", "true");
    document.body.appendChild(bar);
    var ticking = false;
    function update() {
      var doc = document.documentElement;
      var max = doc.scrollHeight - doc.clientHeight || 1;
      var p = Math.min(100, Math.max(0, (window.scrollY/max)*100));
      bar.style.setProperty("--p", p.toFixed(2) + "%");
      ticking = false;
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    update();
  }

  // ============================================================
  // 13. SMOOTH IN-PAGE NAV
  // ============================================================
  function initSmoothNav() {
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener("click", function (e) {
        var id = a.getAttribute("href");
        if (!id || id === "#") return;
        var t = document.querySelector(id);
        if (!t) return;
        e.preventDefault();
        var navH = (document.querySelector(".nav") || {}).getBoundingClientRect
          ? document.querySelector(".nav").getBoundingClientRect().height : 0;
        var top = t.getBoundingClientRect().top + window.scrollY - navH - 8;
        window.scrollTo({
          top: top,
          behavior: prefersReduced ? "auto" : "smooth"
        });
      });
    });
  }

  // ============================================================
  // 14. EASTER EGG — Konami
  // ============================================================
  function initEasterEgg() {
    var seq = ["ArrowUp","ArrowUp","ArrowDown","ArrowDown",
               "ArrowLeft","ArrowRight","ArrowLeft","ArrowRight","b","a"];
    var i = 0;
    document.addEventListener("keydown", function (e) {
      var k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (k === seq[i]) {
        i++;
        if (i === seq.length) {
          document.documentElement.classList.add("party-mode");
          i = 0;
          console.log("%c PARTY MODE UNLOCKED ",
            "font-size:18px;color:#fff;background:#f50000;font-weight:bold;padding:8px;");
        }
      } else { i = 0; }
    });
  }

  // ---- helpers ----
  function el(tag, cls) { var n = document.createElement(tag); if (cls) n.className = cls; return n; }



  // ============================================================
  // 15. v4 PATCH — Hero water-displacement on hover + image swap
  //                + theme toggle hook (existing app.js handles class
  //                  toggling; we just persist it across reloads).
  // ============================================================
  function initThemePersist() {
    // The existing app.js handles toggle. We persist + restore.
    var KEY = "vn-theme-v4";
    var stored = null;
    try { stored = localStorage.getItem(KEY); } catch (e) {}
    if (stored === "light" || stored === "dark") {
      document.body.classList.add(stored + "-mode");
    }
    var btn = document.getElementById("theme");
    if (!btn) return;
    btn.addEventListener("click", function () {
      // Allow app.js to run first, then read state and persist
      setTimeout(function () {
        var b = document.body;
        if (b.classList.contains("light-mode")) {
          try { localStorage.setItem(KEY, "light"); } catch (e) {}
        } else if (b.classList.contains("dark-mode")) {
          try { localStorage.setItem(KEY, "dark"); } catch (e) {}
        } else {
          try { localStorage.removeItem(KEY); } catch (e) {}
        }
      }, 50);
    });
  }



  // ============================================================
  // 16. INFINITE SLIDER — clone children, wrap scrollLeft seamlessly
  // ============================================================
  function initInfiniteSlider() {
    document.querySelectorAll("[data-infinite]").forEach(function (track) {
      // Clone existing children once for seamless wrap
      var originals = Array.prototype.slice.call(track.children);
      if (!originals.length || track.dataset.infinited) return;
      track.dataset.infinited = "1";

      // Append a duplicate set of children
      originals.forEach(function (child) {
        var clone = child.cloneNode(true);
        clone.setAttribute("aria-hidden", "true");
        clone.setAttribute("data-clone", "1");
        // Disable toast interactions on clones to avoid duplicate handlers
        clone.removeAttribute("data-toast");
        track.appendChild(clone);
      });

      function halfWidth() {
        // The width occupied by the original set.
        // Read the gap ONCE (it's identical for every child) instead of
        // calling getComputedStyle inside the loop — avoids a forced reflow
        // per card on init/resize.
        var w = 0;
        var cs = getComputedStyle(track);
        var gap = parseInt(cs.gap, 10) || parseInt(cs.columnGap, 10) || 0;
        originals.forEach(function (c) {
          w += c.offsetWidth + gap;
        });
        return w;
      }

      var H = halfWidth();
      // Start a touch in so users can scroll either direction
      track.scrollLeft = 8;

      function wrap() {
        var max = H;
        if (track.scrollLeft >= max) {
          track.scrollLeft = track.scrollLeft - max;
        } else if (track.scrollLeft <= 0) {
          track.scrollLeft = track.scrollLeft + max;
        }
      }
      track.addEventListener("scroll", wrap, { passive: true });

      // Recompute halfWidth on resize (cards/gap may change responsively)
      window.addEventListener("resize", function () {
        H = halfWidth();
      }, { passive: true });

      // Auto-drift gently when not interacting (gives life on load)
      var drifting = true;
      var driftSpeed = 0.18; // px per frame
      function drift() {
        if (drifting && !track.classList.contains("is-dragging")) {
          track.scrollLeft += driftSpeed;
        }
        requestAnimationFrame(drift);
      }
      // Pause drift on hover / interaction
      track.addEventListener("pointerenter", function () { drifting = false; });
      track.addEventListener("pointerleave", function () { drifting = true; });
      track.addEventListener("touchstart", function () { drifting = false; }, { passive: true });
      track.addEventListener("touchend", function () { setTimeout(function(){ drifting = true; }, 1200); }, { passive: true });

      if (!prefersReduced) requestAnimationFrame(drift);
    });
  }



  // ============================================================
  // 22. MOBILE DRAWER — slide-in panel with focus trap, ESC,
  //     body-lock, click-outside-to-close, theme proxy.
  // ============================================================
  function initMobileDrawer() {
    var toggle = document.querySelector(".nav__toggle");
    var drawer = document.getElementById("drawer");
    if (!toggle || !drawer) return;

    var panel = drawer.querySelector(".drawer__panel");
    var closers = drawer.querySelectorAll("[data-drawer-close]");
    var anchorLinks = drawer.querySelectorAll("a[href^='#']");
    var lastFocus = null;

    function focusables() {
      return Array.prototype.slice.call(
        drawer.querySelectorAll(
          "a[href], button:not([disabled]), [tabindex]:not([tabindex='-1'])"
        )
      ).filter(function (n) { return n.offsetWidth > 0 || n.offsetHeight > 0; });
    }

    function open() {
      if (drawer.classList.contains("is-open")) return;
      lastFocus = document.activeElement;
      drawer.classList.add("is-open");
      drawer.setAttribute("aria-hidden", "false");
      toggle.setAttribute("aria-expanded", "true");
      toggle.setAttribute("aria-label", "Fechar menu");
      document.body.classList.add("drawer-open");
      // Move focus into the drawer after the slide-in finishes
      setTimeout(function () {
        var first = focusables()[1] || focusables()[0]; // skip close-btn → land on first link
        if (first) first.focus();
      }, 360);
    }

    function close() {
      if (!drawer.classList.contains("is-open")) return;
      drawer.classList.remove("is-open");
      drawer.setAttribute("aria-hidden", "true");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Abrir menu");
      document.body.classList.remove("drawer-open");
      if (lastFocus && typeof lastFocus.focus === "function") {
        lastFocus.focus();
      } else {
        toggle.focus();
      }
    }

    toggle.addEventListener("click", function (e) {
      e.preventDefault();
      if (drawer.classList.contains("is-open")) close();
      else open();
    });

    closers.forEach(function (c) {
      c.addEventListener("click", function (e) {
        e.preventDefault();
        close();
      });
    });

    // ESC closes
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && drawer.classList.contains("is-open")) {
        close();
      }
    });

    // Anchor links close after smooth-scroll triggers
    anchorLinks.forEach(function (a) {
      a.addEventListener("click", function () {
        // Let initSmoothNav handle scroll; close after a tick
        setTimeout(close, 180);
      });
    });

    // Focus trap inside the drawer while open
    drawer.addEventListener("keydown", function (e) {
      if (e.key !== "Tab" || !drawer.classList.contains("is-open")) return;
      var f = focusables();
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    });

    // Theme button: direct toggle (the proxy via desktop click was
    // inconsistent across browsers — synthetic click + delegated
    // listeners didn't always fire). Replicates app.js logic + persists
    // to localStorage + provides a small visual cue.
    var themeMobile = drawer.querySelector("#theme-mobile");
    if (themeMobile) {
      themeMobile.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        var darkPref = window.matchMedia("(prefers-color-scheme: dark)").matches;
        // app.js toggle logic: add the OPPOSITE class
        var cls = darkPref ? "light-mode" : "dark-mode";
        document.body.classList.toggle(cls);
        // Persist current state for initThemePersist
        try {
          if (document.body.classList.contains("light-mode")) {
            localStorage.setItem("vn-theme-v4", "light");
          } else if (document.body.classList.contains("dark-mode")) {
            localStorage.setItem("vn-theme-v4", "dark");
          } else {
            localStorage.removeItem("vn-theme-v4");
          }
        } catch (_) {}
        // Visual feedback (tactile pulse on the button)
        themeMobile.classList.add("is-toggling");
        setTimeout(function () { themeMobile.classList.remove("is-toggling"); }, 420);
      });
    }

    // Auto-close drawer if viewport grows past mobile breakpoint
    var mq = window.matchMedia("(min-width: 901px)");
    var mqHandler = function (e) { if (e.matches) close(); };
    if (mq.addEventListener) mq.addEventListener("change", mqHandler);
    else if (mq.addListener) mq.addListener(mqHandler);
  }



  // ============================================================
  // 23. HERO AURORA — depth parallax for the cutout photo,
  //     aurora background, and floating depth chips.
  //     Replaces the old WebGL fluid (now a no-op since the
  //     canvas/svg elements no longer exist).
  // ============================================================
  function initHeroAurora() {
    var photo = document.querySelector(".hero__photo");
    if (!photo) return;
    var aurora = photo.querySelector(".hero__aurora");
    // CSS classes were renamed to BEM during Fase 3 of the unification (was "v4-v4-" prefix doubled
    // namespace). Fall back to the single-prefix selector so older markup
    // keeps working.
    var cutout = photo.querySelector(".hero__cutout");
    var orb    = photo.querySelector(".hero__orb");
    var chips  = photo.querySelectorAll(".hero__chip");

    setTimeout(function () { photo.classList.add("is-revealed"); }, 220);

    if (prefersReduced || isTouch || !canHover) return;

    // -------- Photo + aurora parallax state --------
    var rect = null;
    var tx = 0, ty = 0, rx = 0, ry = 0;
    var hovering = false;

    // Orb follow position (eased)
    var orbTX = 0, orbTY = 0, orbX = 0, orbY = 0, orbScale = 1, orbScaleT = 1;

    // -------- Per-chip physics state --------
    var chipState = [];
    chips.forEach(function (chip) {
      var depth  = parseFloat(chip.getAttribute("data-depth")  || 0.5);
      var magnet = parseFloat(chip.getAttribute("data-magnet") || 0.6);
      var mass = 0.5 + (1 - depth) * 1.4;
      var seed = Math.random() * 6.283;
      var period = 7 + Math.random() * 5;
      chipState.push({
        el: chip, depth: depth, magnet: magnet, mass: mass,
        seed: seed, period: period,
        x: 0, y: 0, vx: 0, vy: 0,
        engaged: false
      });
    });

    var mouseVX = -9999, mouseVY = -9999;

    function recalc() { rect = photo.getBoundingClientRect(); }

    photo.addEventListener("pointerenter", function (e) {
      hovering = true;
      recalc();
      mouseVX = e.clientX; mouseVY = e.clientY;
    });
    photo.addEventListener("pointermove", function (e) {
      if (!rect) recalc();
      mouseVX = e.clientX; mouseVY = e.clientY;
      var x = (e.clientX - rect.left) / rect.width;
      var y = (e.clientY - rect.top) / rect.height;
      tx = (x - 0.5) * 2;
      ty = (y - 0.5) * 2;
      // Orb target position: scaled-down mouse offset from photo center
      orbTX = (x - 0.5) * rect.width * 0.4;
      orbTY = (y - 0.5) * rect.height * 0.4;
      orbScaleT = 1.08;
    }, { passive: true });
    photo.addEventListener("pointerleave", function () {
      hovering = false;
      tx = 0; ty = 0;
      mouseVX = -9999; mouseVY = -9999;
      orbTX = 0; orbTY = 0;
      orbScaleT = 1;
      rect = null;
    });
    window.addEventListener("scroll", function () { rect = null; }, { passive: true });
    window.addEventListener("resize", function () { rect = null; }, { passive: true });

    var REACH = 380;
    var FORCE = 95;
    var DAMPING = 0.78;
    var STIFFNESS_K = 0.13;
    var DEAD_ZONE = 28;       // px — when chip center within this distance of cursor,
                              //      damp the force to zero so we don't chatter

    function loop(now) {
      // ============ Photo + aurora layer parallax ============
      var ease = hovering ? 0.10 : 0.06;
      rx += (tx - rx) * ease;
      ry += (ty - ry) * ease;
      if (aurora) {
        aurora.style.setProperty("--aurora-x", (rx * -8).toFixed(1) + "px");
        aurora.style.setProperty("--aurora-y", (ry * -8).toFixed(1) + "px");
      }
      if (cutout) {
        cutout.style.setProperty("--photo-x", (rx * 14).toFixed(1) + "px");
        cutout.style.setProperty("--photo-y", (ry * 14).toFixed(1) + "px");
      }

      // ============ Orb glow follow (eased) ============
      if (orb) {
        orbX += (orbTX - orbX) * 0.10;
        orbY += (orbTY - orbY) * 0.10;
        orbScale += (orbScaleT - orbScale) * 0.08;
        orb.style.setProperty("--orb-x", orbX.toFixed(1) + "px");
        orb.style.setProperty("--orb-y", orbY.toFixed(1) + "px");
        orb.style.setProperty("--orb-s", orbScale.toFixed(3));
      }

      // ============ Per-chip magnetic spring physics ============
      var t = now / 1000;
      chipState.forEach(function (s) {
        // ⭐ JIGGLE FIX: subtract current transform (s.x, s.y) from the
        // measured rect to get the chip's STABLE HOME position. Otherwise
        // the rect moves with the chip and the force vector chatters.
        var r = s.el.getBoundingClientRect();
        var ccx = r.left + r.width / 2 - s.x;
        var ccy = r.top + r.height / 2 - s.y;

        var driftX = Math.cos(s.seed + t * (2 * Math.PI / s.period)) * 4 * s.depth;
        var driftY = Math.sin(s.seed + t * (2 * Math.PI / s.period) * 0.7) * 3 * s.depth;

        var targetX = driftX, targetY = driftY;
        var engaged = 0;

        if (mouseVX > -1000) {
          var dx = mouseVX - ccx;
          var dy = mouseVY - ccy;
          var dist = Math.sqrt(dx * dx + dy * dy);
          var influence = Math.max(0, 1 - dist / REACH);
          influence = influence * influence;

          // Dead-zone: force tapers to zero when very close, kills jitter
          if (dist < DEAD_ZONE) {
            influence *= dist / DEAD_ZONE;
          }

          if (influence > 0) {
            var nx = dist > 0.01 ? dx / dist : 0;
            var ny = dist > 0.01 ? dy / dist : 0;
            var f = s.magnet * influence * FORCE * s.depth;
            targetX += nx * f;
            targetY += ny * f;
            engaged = influence;
          }
        }

        var stiffness = STIFFNESS_K / s.mass;
        var ax = (targetX - s.x) * stiffness;
        var ay = (targetY - s.y) * stiffness;
        s.vx = (s.vx + ax) * DAMPING;
        s.vy = (s.vy + ay) * DAMPING;
        // Snap tiny velocity to 0 (kills micro-oscillation when at rest)
        if (Math.abs(s.vx) < 0.02) s.vx = 0;
        if (Math.abs(s.vy) < 0.02) s.vy = 0;
        s.x += s.vx;
        s.y += s.vy;

        s.el.style.setProperty("--chip-x", s.x.toFixed(2) + "px");
        s.el.style.setProperty("--chip-y", s.y.toFixed(2) + "px");

        var rotOffset = (s.vx * 0.6) - (s.vy * 0.3);
        rotOffset = Math.max(-12, Math.min(12, rotOffset));
        s.el.style.setProperty("--chip-rot-offset", rotOffset.toFixed(1) + "deg");

        var scaleBoost = 1 + engaged * 0.08;
        s.el.style.setProperty("--chip-scale", scaleBoost.toFixed(3));

        if (engaged > 0.2 && !s.engaged) {
          s.el.setAttribute("data-engaged", "1");
          s.engaged = true;
        } else if (engaged <= 0.05 && s.engaged) {
          s.el.removeAttribute("data-engaged");
          s.engaged = false;
        }
      });

      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }

  // ============================================================
  // 24. HERO BRUSH REVEAL — soft, persistent paint-stroke that
  //     "scratches" a grayscale canvas overlay on top of the
  //     full-color hero photo, revealing the colors underneath.
  //
  //     Architecture:
  //       • <img> always renders full color (CSS).
  //       • <canvas.hero__reveal> sits on top, painted ONCE on
  //         load/resize with a grayscale copy of the same image.
  //       • pointermove → destination-out brush stamps with a soft
  //         radial-gradient falloff erase circles in the canvas,
  //         exposing the color photo below. Strokes accumulate.
  //
  //     Performance:
  //       • Grayscale layer is never re-painted (resize only).
  //       • Pointer events buffered to next rAF tick (one paint
  //         pass per frame, no matter how many move events).
  //       • Stamps interpolated between samples → continuous
  //         stroke even on fast cursor sweeps. Spacing tuned to
  //         brush radius so we don't oversample.
  //       • DPR capped at 1.5 so high-density displays don't
  //         eat fillrate on huge canvases.
  // ============================================================
  function initHeroBrushReveal() {
    var photo  = document.querySelector(".hero__photo");
    if (!photo) return;
    var img    = photo.querySelector(".hero__img");
    var cutout = photo.querySelector(".hero__cutout");
    if (!img || !cutout) return;
    if (prefersReduced || isTouch || !canHover) return;

    var canvas = cutout.querySelector(".hero__reveal");
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.className = "hero__reveal";
      canvas.setAttribute("aria-hidden", "true");
      cutout.insertBefore(canvas, img.nextSibling);
    }
    var ctx = canvas.getContext("2d");
    if (!ctx) return;

    var BRUSH_RADIUS  = 90;   // CSS px — tune to taste
    var STAMP_SPACING = 14;   // CSS px between stamps along a stroke
    var DPR = Math.min(window.devicePixelRatio || 1, 1.5);

    var lastX = -1, lastY = -1;
    var pending = [];
    var rafQueued = false;

    // Mimic the img's CSS object-fit:cover + object-position:center 15%
    function paintGrayscale() {
      if (!img.complete || !img.naturalWidth) return;
      var w = canvas.width, h = canvas.height;
      var iw = img.naturalWidth, ih = img.naturalHeight;
      var ar = iw / ih, tar = w / h;
      var dw, dh, dx, dy;
      if (ar > tar) { dh = h; dw = h * ar; dx = (w - dw) * 0.5; dy = 0; }
      else          { dw = w; dh = w / ar; dx = 0; dy = (h - dh) * 0.15; }
      ctx.save();
      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(0, 0, w, h);
      // ctx.filter is supported in modern Chrome/Firefox/Safari 15+.
      // Falls back to a flat draw on old Safari (still readable, just
      // not desaturated — acceptable degradation).
      ctx.filter = "grayscale(100%) contrast(1.08) brightness(.92)";
      ctx.drawImage(img, dx, dy, dw, dh);
      ctx.restore();
    }

    function resize() {
      var r = cutout.getBoundingClientRect();
      if (!r.width || !r.height) return;
      canvas.width  = Math.max(2, Math.round(r.width  * DPR));
      canvas.height = Math.max(2, Math.round(r.height * DPR));
      paintGrayscale();
    }

    function brushAt(px, py) {
      var rad = BRUSH_RADIUS * DPR;
      var g = ctx.createRadialGradient(px, py, 0, px, py, rad);
      g.addColorStop(0,    "rgba(0,0,0,1)");
      g.addColorStop(0.55, "rgba(0,0,0,0.55)");
      g.addColorStop(1,    "rgba(0,0,0,0)");
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(px, py, rad, 0, Math.PI * 2);
      ctx.fill();
    }

    function flushPending() {
      rafQueued = false;
      if (!pending.length) return;
      for (var i = 0; i < pending.length; i++) {
        var p = pending[i];
        if (lastX < 0) {
          brushAt(p.x, p.y);
        } else {
          // Interpolate between samples for a continuous stroke
          var dx = p.x - lastX, dy = p.y - lastY;
          var dist = Math.sqrt(dx * dx + dy * dy);
          var steps = Math.max(1, Math.ceil(dist / (STAMP_SPACING * DPR)));
          for (var s = 1; s <= steps; s++) {
            var t = s / steps;
            brushAt(lastX + dx * t, lastY + dy * t);
          }
        }
        lastX = p.x; lastY = p.y;
      }
      pending.length = 0;
    }

    function onMove(e) {
      // Recompute rect each move — robust to scrolling, breathing
      // animation scale, and parallax translate on the cutout.
      var r = canvas.getBoundingClientRect();
      if (!r.width || !r.height) return;
      var x = (e.clientX - r.left) * (canvas.width  / r.width);
      var y = (e.clientY - r.top)  * (canvas.height / r.height);
      pending.push({ x: x, y: y });
      if (!rafQueued) {
        rafQueued = true;
        requestAnimationFrame(flushPending);
      }
    }
    function onLeave() { lastX = -1; lastY = -1; }

    if (img.complete && img.naturalWidth) resize();
    else img.addEventListener("load", resize, { once: true });

    photo.addEventListener("pointermove",  onMove,  { passive: true });
    photo.addEventListener("pointerleave", onLeave, { passive: true });

    var rzT = null;
    window.addEventListener("resize", function () {
      if (rzT) clearTimeout(rzT);
      rzT = setTimeout(resize, 100);
    }, { passive: true });
  }

  function boot() {
    // Critical / functional layer — must be ready immediately.
    try {
      initThemePersist();
      initCursor();
      initSectionMode();
      initActiveNav();
      initSmoothNav();
      initMobileDrawer();
    } catch (err) {
      console.warn("playful.js: core failed", err);
    }

    // [P15] Non-critical effects deferred to idle so they don't extend a long
    // main-thread task during the critical render (the "effects after load"
    // principle). They're all below-the-fold or interaction/hover driven.
    function effects() {
      try {
        initMagnetic();
        initCounters();
        initWordReveal();
        initScramble();
        initDragScroll();
        initInfiniteSlider();
        initRipple();
        initScrollBar();
        initHeroAurora();
        initEasterEgg();
      } catch (err) {
        console.warn("playful.js: effects failed", err);
      }
    }
    if ("requestIdleCallback" in window) requestIdleCallback(effects, { timeout: 2000 });
    else setTimeout(effects, 200);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  // Hero brush-reveal is a desktop hover effect that overlays a <canvas> on the
  // hero photo. Deferring it to `load` keeps that canvas from occluding the
  // image during the LCP window (which caused NO_LCP once CSS became render-blocking).
  function bootBrush() { try { initHeroBrushReveal(); } catch (e) {} }
  if (document.readyState === "complete") bootBrush();
  else window.addEventListener("load", bootBrush, { once: true });
})();
/* v4 — brush-reveal deferred to load (LCP-safe) */
