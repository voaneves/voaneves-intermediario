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
  var isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  var canHover =
    window.matchMedia &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches;

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
  // 3. HERO LETTER REVEAL
  // ============================================================
  function initHeroReveal() {
    if (prefersReduced) return;
    document.querySelectorAll(".hero__line").forEach(function (line) {
      if (line.dataset.split) return;
      line.dataset.split = "1";
      var txt = line.getAttribute("data-text") || line.textContent;
      line.textContent = "";
      var letters = [];
      for (var i = 0; i < txt.length; i++) {
        var s = document.createElement("span");
        s.className = "pf-letter";
        s.style.transitionDelay = (i * 35) + "ms";
        s.textContent = txt[i] === " " ? " " : txt[i];
        s.style.display = "inline-block";
        line.appendChild(s);
        letters.push(s);
      }
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          letters.forEach(function (l) { l.classList.add("in"); });
        });
      });
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
    function update() {
      var navH = nav.getBoundingClientRect().height;
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

  // ============================================================
  // 8. VELOCITY MARQUEE
  // ============================================================
  function initVelocityMarquee() {
    if (prefersReduced) return;
    var marquees = document.querySelectorAll(".marquee__wrapper_content");
    if (!marquees.length) return;
    var lastY = window.scrollY, vel = 0, ticking = false;
    function onScroll() {
      var dy = window.scrollY - lastY;
      lastY = window.scrollY;
      vel = Math.min(6, Math.abs(dy)*0.35);
      if (!ticking) { requestAnimationFrame(apply); ticking = true; }
    }
    function apply() {
      marquees.forEach(function (m) {
        var base = parseFloat(getComputedStyle(m).animationDuration) || 50;
        m.style.animationDuration = Math.max(8, base) / (1 + vel) + "s";
      });
      vel *= 0.85;
      if (vel > 0.05) requestAnimationFrame(apply);
      else ticking = false;
    }
    window.addEventListener("scroll", onScroll, { passive: true });
  }

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
  function initHeroWater() {
    // Now-deprecated. Real magic happens in initHeroLando below.
  }

  // ============================================================
  // 17. HERO LANDO EFFECT — 3D tilt + cursor-tracked band reveal
  //     + wireframe mesh parallax. Replaces the water effect.
  // ============================================================
  function initHeroLiquid() {
    // ============================================================
    // WebGL Navier-Stokes fluid sim — adapted (significantly) from
    // PavelDoGreat / 2014 GPU Gems chapter 38. Density is used as
    // an alpha mask: where fluid is, image B reveals over image A.
    // ============================================================
    var photo = document.querySelector(".hero__photo");
    if (!photo) return;
    var stage = photo.querySelector(".hero__stage");
    var canvas = photo.querySelector(".hero__wake-canvas");
    if (!canvas) return;

    // --- Static fallback: just hover-crossfade A → B with a 2nd <img> ---
    function fallback() {
      canvas.style.display = "none";
      photo.addEventListener("pointerenter", function () { photo.classList.add("is-active"); });
      photo.addEventListener("pointerleave", function () { photo.classList.remove("is-active"); });
    }

    if (prefersReduced || isTouch || !canHover) { fallback(); return; }

    // --- Try WebGL2 then WebGL1 ---
    var glParams = { alpha: true, depth: false, stencil: false, antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: false };
    var gl = canvas.getContext("webgl2", glParams);
    var isWebGL2 = !!gl;
    if (!isWebGL2) gl = canvas.getContext("webgl", glParams) || canvas.getContext("experimental-webgl", glParams);
    if (!gl) { fallback(); return; }

    // --- Detect supported texture formats ---
    var halfFloat;
    var supportLinearFiltering;
    if (isWebGL2) {
      gl.getExtension("EXT_color_buffer_float");
      supportLinearFiltering = gl.getExtension("OES_texture_float_linear");
    } else {
      halfFloat = gl.getExtension("OES_texture_half_float");
      supportLinearFiltering = gl.getExtension("OES_texture_half_float_linear");
    }
    if (!isWebGL2 && !halfFloat) { fallback(); return; }
    var halfFloatType = isWebGL2 ? gl.HALF_FLOAT : (halfFloat && halfFloat.HALF_FLOAT_OES);

    function getSupportedFormat(internalFormat, format, type) {
      if (!supportRenderTextureFormat(internalFormat, format, type)) {
        if (isWebGL2) {
          if (internalFormat === gl.R16F) return getSupportedFormat(gl.RG16F, gl.RG, type);
          if (internalFormat === gl.RG16F) return getSupportedFormat(gl.RGBA16F, gl.RGBA, type);
        }
        return null;
      }
      return { internalFormat: internalFormat, format: format };
    }
    function supportRenderTextureFormat(internalFormat, format, type) {
      var t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, 4, 4, 0, format, type, null);
      var fbo = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
      var ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
      gl.deleteTexture(t); gl.deleteFramebuffer(fbo);
      return ok;
    }

    var formatRGBA, formatRG, formatR;
    if (isWebGL2) {
      formatRGBA = getSupportedFormat(gl.RGBA16F, gl.RGBA, halfFloatType);
      formatRG = getSupportedFormat(gl.RG16F, gl.RG, halfFloatType);
      formatR = getSupportedFormat(gl.R16F, gl.RED, halfFloatType);
    } else {
      formatRGBA = getSupportedFormat(gl.RGBA, gl.RGBA, halfFloatType);
      formatRG = formatRGBA;
      formatR = formatRGBA;
    }
    if (!formatRGBA) { fallback(); return; }

    gl.clearColor(0, 0, 0, 0);

    // --- Config ---
    var CFG = {
      DOWNSAMPLE: 1,
      DENSITY_DISSIPATION: 0.965,
      VELOCITY_DISSIPATION: 0.985,
      PRESSURE_DISSIPATION: 0.8,
      PRESSURE_ITERATIONS: 16,
      CURL: 26,
      SPLAT_RADIUS: 0.0045,
      SPLAT_FORCE: 5500
    };

    // --- Shaders ---
    function compile(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.warn("shader compile fail:", gl.getShaderInfoLog(s));
        return null;
      }
      return s;
    }
    var baseVS = compile(gl.VERTEX_SHADER,
      "precision highp float;attribute vec2 aPosition;varying vec2 vUv;varying vec2 vL;varying vec2 vR;varying vec2 vT;varying vec2 vB;uniform vec2 texelSize;void main(){vUv=aPosition*0.5+0.5;vL=vUv-vec2(texelSize.x,0.);vR=vUv+vec2(texelSize.x,0.);vT=vUv+vec2(0.,texelSize.y);vB=vUv-vec2(0.,texelSize.y);gl_Position=vec4(aPosition,0.,1.);}");
    var clearFS = compile(gl.FRAGMENT_SHADER,
      "precision highp float;precision mediump sampler2D;varying vec2 vUv;uniform sampler2D uTexture;uniform float value;void main(){gl_FragColor=value*texture2D(uTexture,vUv);}");
    var displayFS = compile(gl.FRAGMENT_SHADER,
      "precision highp float;precision mediump sampler2D;varying vec2 vUv;uniform sampler2D uDensity;uniform sampler2D uBack;uniform float uReady;void main(){vec3 d=texture2D(uDensity,vUv).rgb;float m=clamp(max(d.r,max(d.g,d.b)),0.0,1.0);m=pow(m,0.85)*uReady;vec3 back=texture2D(uBack,vec2(vUv.x,1.0-vUv.y)).rgb;gl_FragColor=vec4(back,m);}");
    var splatFS = compile(gl.FRAGMENT_SHADER,
      "precision highp float;precision mediump sampler2D;varying vec2 vUv;uniform sampler2D uTarget;uniform float aspectRatio;uniform vec3 color;uniform vec2 point;uniform float radius;void main(){vec2 p=vUv-point.xy;p.x*=aspectRatio;vec3 splat=exp(-dot(p,p)/radius)*color;vec3 base=texture2D(uTarget,vUv).xyz;gl_FragColor=vec4(base+splat,1.0);}");
    var advectionFS = compile(gl.FRAGMENT_SHADER,
      "precision highp float;precision mediump sampler2D;varying vec2 vUv;uniform sampler2D uVelocity;uniform sampler2D uSource;uniform vec2 texelSize;uniform float dt;uniform float dissipation;void main(){vec2 coord=vUv-dt*texture2D(uVelocity,vUv).xy*texelSize;gl_FragColor=dissipation*texture2D(uSource,coord);gl_FragColor.a=1.0;}");
    var divergenceFS = compile(gl.FRAGMENT_SHADER,
      "precision highp float;precision mediump sampler2D;varying vec2 vUv;varying vec2 vL;varying vec2 vR;varying vec2 vT;varying vec2 vB;uniform sampler2D uVelocity;void main(){float L=texture2D(uVelocity,vL).x;float R=texture2D(uVelocity,vR).x;float T=texture2D(uVelocity,vT).y;float B=texture2D(uVelocity,vB).y;float div=0.5*(R-L+T-B);gl_FragColor=vec4(div,0.0,0.0,1.0);}");
    var curlFS = compile(gl.FRAGMENT_SHADER,
      "precision highp float;precision mediump sampler2D;varying vec2 vUv;varying vec2 vL;varying vec2 vR;varying vec2 vT;varying vec2 vB;uniform sampler2D uVelocity;void main(){float L=texture2D(uVelocity,vL).y;float R=texture2D(uVelocity,vR).y;float T=texture2D(uVelocity,vT).x;float B=texture2D(uVelocity,vB).x;float v=R-L-T+B;gl_FragColor=vec4(v,0.0,0.0,1.0);}");
    var vorticityFS = compile(gl.FRAGMENT_SHADER,
      "precision highp float;precision mediump sampler2D;varying vec2 vUv;varying vec2 vT;varying vec2 vB;uniform sampler2D uVelocity;uniform sampler2D uCurl;uniform float curl;uniform float dt;void main(){float T=texture2D(uCurl,vT).x;float B=texture2D(uCurl,vB).x;float C=texture2D(uCurl,vUv).x;vec2 force=vec2(abs(T)-abs(B),0.0);force*=1.0/length(force+0.00001)*curl*C;vec2 vel=texture2D(uVelocity,vUv).xy;gl_FragColor=vec4(vel+force*dt,0.0,1.0);}");
    var pressureFS = compile(gl.FRAGMENT_SHADER,
      "precision highp float;precision mediump sampler2D;varying vec2 vUv;varying vec2 vL;varying vec2 vR;varying vec2 vT;varying vec2 vB;uniform sampler2D uPressure;uniform sampler2D uDivergence;void main(){float L=texture2D(uPressure,vL).x;float R=texture2D(uPressure,vR).x;float T=texture2D(uPressure,vT).x;float B=texture2D(uPressure,vB).x;float div=texture2D(uDivergence,vUv).x;float p=(L+R+B+T-div)*0.25;gl_FragColor=vec4(p,0.0,0.0,1.0);}");
    var gradientSubtractFS = compile(gl.FRAGMENT_SHADER,
      "precision highp float;precision mediump sampler2D;varying vec2 vUv;varying vec2 vL;varying vec2 vR;varying vec2 vT;varying vec2 vB;uniform sampler2D uPressure;uniform sampler2D uVelocity;void main(){float L=texture2D(uPressure,vL).x;float R=texture2D(uPressure,vR).x;float T=texture2D(uPressure,vT).x;float B=texture2D(uPressure,vB).x;vec2 vel=texture2D(uVelocity,vUv).xy;vel.xy-=vec2(R-L,T-B);gl_FragColor=vec4(vel,0.0,1.0);}");

    if (!baseVS || !displayFS || !splatFS) { fallback(); return; }

    function GLProgram(vs, fs) {
      this.uniforms = {};
      this.program = gl.createProgram();
      gl.attachShader(this.program, vs);
      gl.attachShader(this.program, fs);
      gl.linkProgram(this.program);
      if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
        console.warn("link fail", gl.getProgramInfoLog(this.program));
      }
      var n = gl.getProgramParameter(this.program, gl.ACTIVE_UNIFORMS);
      for (var i = 0; i < n; i++) {
        var name = gl.getActiveUniform(this.program, i).name;
        this.uniforms[name] = gl.getUniformLocation(this.program, name);
      }
    }
    GLProgram.prototype.bind = function () { gl.useProgram(this.program); };

    var clearProgram = new GLProgram(baseVS, clearFS);
    var displayProgram = new GLProgram(baseVS, displayFS);
    var splatProgram = new GLProgram(baseVS, splatFS);
    var advectionProgram = new GLProgram(baseVS, advectionFS);
    var divergenceProgram = new GLProgram(baseVS, divergenceFS);
    var curlProgram = new GLProgram(baseVS, curlFS);
    var vorticityProgram = new GLProgram(baseVS, vorticityFS);
    var pressureProgram = new GLProgram(baseVS, pressureFS);
    var gradientSubtractProgram = new GLProgram(baseVS, gradientSubtractFS);

    // --- Quad ---
    var blit = (function () {
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,-1,1,1,1,1,-1]), gl.STATIC_DRAW);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0,1,2,0,2,3]), gl.STATIC_DRAW);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(0);
      return function (dest) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, dest);
        gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
      };
    })();

    // --- Framebuffers ---
    var texW, texH;
    var density, velocity, divergence, curlFB, pressure;
    function createFBO(texId, w, h, internalFormat, format, type, param) {
      gl.activeTexture(gl.TEXTURE0 + texId);
      var t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, param);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, param);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);
      var fbo = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
      gl.viewport(0, 0, w, h);
      gl.clear(gl.COLOR_BUFFER_BIT);
      return [t, fbo, texId];
    }
    function createDoubleFBO(texId, w, h, internalFormat, format, type, param) {
      var f1 = createFBO(texId, w, h, internalFormat, format, type, param);
      var f2 = createFBO(texId + 1, w, h, internalFormat, format, type, param);
      return {
        get read() { return f1; },
        get write() { return f2; },
        swap: function () { var t = f1; f1 = f2; f2 = t; }
      };
    }
    function initFB() {
      texW = gl.drawingBufferWidth >> CFG.DOWNSAMPLE;
      texH = gl.drawingBufferHeight >> CFG.DOWNSAMPLE;
      var lin = supportLinearFiltering ? gl.LINEAR : gl.NEAREST;
      density = createDoubleFBO(2, texW, texH, formatRGBA.internalFormat, formatRGBA.format, halfFloatType, lin);
      velocity = createDoubleFBO(0, texW, texH, formatRG.internalFormat, formatRG.format, halfFloatType, lin);
      divergence = createFBO(4, texW, texH, formatR.internalFormat, formatR.format, halfFloatType, gl.NEAREST);
      curlFB = createFBO(5, texW, texH, formatR.internalFormat, formatR.format, halfFloatType, gl.NEAREST);
      pressure = createDoubleFBO(6, texW, texH, formatR.internalFormat, formatR.format, halfFloatType, gl.NEAREST);
    }

    function resize() {
      var r = canvas.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      var w = Math.max(2, Math.floor(r.width * dpr));
      var h = Math.max(2, Math.floor(r.height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        initFB();
      }
    }
    resize();
    window.addEventListener("resize", resize, { passive: true });

    // --- Image B texture: ALWAYS bound to TEXTURE10. Starts as 1x1
    //     transparent placeholder; when the real image loads, replace
    //     the texture data in place. uReady gates the alpha: 0 until
    //     the image is loaded, then 1, so the canvas is fully
    //     transparent in the meantime (image A shows through). ---
    var imgBLoaded = 0;
    var imgBTex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE10);
    gl.bindTexture(gl.TEXTURE_2D, imgBTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
                  new Uint8Array([0, 0, 0, 0]));
    var imgB = new Image();
    imgB.addEventListener("load", function () {
      gl.activeTexture(gl.TEXTURE10);
      gl.bindTexture(gl.TEXTURE_2D, imgBTex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imgB);
      imgBLoaded = 1;
    });
    imgB.addEventListener("error", function () { console.warn("[hero] image B failed to load"); });
    imgB.src = canvas.getAttribute("data-img-b") || "assets/img/main_2.webp";

    // --- Pointer state ---
    var pointer = { x: 0, y: 0, dx: 0, dy: 0, down: false, moved: false };
    var hovering = false;
    var lastActivity = 0;
    var rect = null;
    function recalc() { rect = canvas.getBoundingClientRect(); }
    photo.addEventListener("pointerenter", function (e) {
      hovering = true;
      photo.classList.add("is-active");
      recalc();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      lastActivity = performance.now();
    });
    photo.addEventListener("pointermove", function (e) {
      if (!rect) recalc();
      var x = e.clientX - rect.left;
      var y = e.clientY - rect.top;
      pointer.dx = (x - pointer.x) * 5.0;
      pointer.dy = (y - pointer.y) * 5.0;
      pointer.x = x;
      pointer.y = y;
      pointer.moved = true;
      lastActivity = performance.now();
    }, { passive: true });
    photo.addEventListener("pointerleave", function () {
      hovering = false;
      photo.classList.remove("is-active");
      pointer.moved = false;
      rect = null;
    });
    window.addEventListener("scroll", function () { rect = null; }, { passive: true });

    // --- Sim ---
    function splat(x, y, dx, dy) {
      // Splat velocity
      splatProgram.bind();
      gl.uniform1i(splatProgram.uniforms.uTarget, velocity.read[2]);
      gl.uniform1f(splatProgram.uniforms.aspectRatio, canvas.width / canvas.height);
      gl.uniform2f(splatProgram.uniforms.point, x / canvas.width, 1.0 - y / canvas.height);
      gl.uniform3f(splatProgram.uniforms.color, dx, -dy, 1.0);
      gl.uniform1f(splatProgram.uniforms.radius, CFG.SPLAT_RADIUS);
      blit(velocity.write[1]);
      velocity.swap();
      // Splat density (always white — used as alpha mask)
      gl.uniform1i(splatProgram.uniforms.uTarget, density.read[2]);
      gl.uniform3f(splatProgram.uniforms.color, 0.95, 0.95, 0.95);
      blit(density.write[1]);
      density.swap();
    }

    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    function step() {
      var dt = 0.016;
      gl.viewport(0, 0, texW, texH);

      // Advect velocity
      advectionProgram.bind();
      gl.uniform2f(advectionProgram.uniforms.texelSize, 1.0 / texW, 1.0 / texH);
      gl.uniform1i(advectionProgram.uniforms.uVelocity, velocity.read[2]);
      gl.uniform1i(advectionProgram.uniforms.uSource, velocity.read[2]);
      gl.uniform1f(advectionProgram.uniforms.dt, dt);
      gl.uniform1f(advectionProgram.uniforms.dissipation, CFG.VELOCITY_DISSIPATION);
      blit(velocity.write[1]); velocity.swap();
      // Advect density
      gl.uniform1i(advectionProgram.uniforms.uVelocity, velocity.read[2]);
      gl.uniform1i(advectionProgram.uniforms.uSource, density.read[2]);
      gl.uniform1f(advectionProgram.uniforms.dissipation, CFG.DENSITY_DISSIPATION);
      blit(density.write[1]); density.swap();

      // Splat at cursor when moving
      if (pointer.moved) {
        var sdx = Math.max(-3000, Math.min(3000, pointer.dx * dpr));
        var sdy = Math.max(-3000, Math.min(3000, pointer.dy * dpr));
        splat(pointer.x * dpr, pointer.y * dpr, sdx, sdy);
        pointer.moved = false;
      }

      // Curl
      curlProgram.bind();
      gl.uniform2f(curlProgram.uniforms.texelSize, 1.0 / texW, 1.0 / texH);
      gl.uniform1i(curlProgram.uniforms.uVelocity, velocity.read[2]);
      blit(curlFB[1]);
      // Vorticity
      vorticityProgram.bind();
      gl.uniform2f(vorticityProgram.uniforms.texelSize, 1.0 / texW, 1.0 / texH);
      gl.uniform1i(vorticityProgram.uniforms.uVelocity, velocity.read[2]);
      gl.uniform1i(vorticityProgram.uniforms.uCurl, curlFB[2]);
      gl.uniform1f(vorticityProgram.uniforms.curl, CFG.CURL);
      gl.uniform1f(vorticityProgram.uniforms.dt, dt);
      blit(velocity.write[1]); velocity.swap();
      // Divergence
      divergenceProgram.bind();
      gl.uniform2f(divergenceProgram.uniforms.texelSize, 1.0 / texW, 1.0 / texH);
      gl.uniform1i(divergenceProgram.uniforms.uVelocity, velocity.read[2]);
      blit(divergence[1]);
      // Pressure decay
      clearProgram.bind();
      gl.uniform1i(clearProgram.uniforms.uTexture, pressure.read[2]);
      gl.uniform1f(clearProgram.uniforms.value, CFG.PRESSURE_DISSIPATION);
      blit(pressure.write[1]); pressure.swap();
      // Pressure iterations
      pressureProgram.bind();
      gl.uniform2f(pressureProgram.uniforms.texelSize, 1.0 / texW, 1.0 / texH);
      gl.uniform1i(pressureProgram.uniforms.uDivergence, divergence[2]);
      for (var i = 0; i < CFG.PRESSURE_ITERATIONS; i++) {
        gl.uniform1i(pressureProgram.uniforms.uPressure, pressure.read[2]);
        blit(pressure.write[1]); pressure.swap();
      }
      // Gradient subtract
      gradientSubtractProgram.bind();
      gl.uniform2f(gradientSubtractProgram.uniforms.texelSize, 1.0 / texW, 1.0 / texH);
      gl.uniform1i(gradientSubtractProgram.uniforms.uPressure, pressure.read[2]);
      gl.uniform1i(gradientSubtractProgram.uniforms.uVelocity, velocity.read[2]);
      blit(velocity.write[1]); velocity.swap();

      // --- Display: density-as-alpha + image B (always safe) ---
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      displayProgram.bind();
      gl.uniform1i(displayProgram.uniforms.uDensity, density.read[2]);
      gl.activeTexture(gl.TEXTURE10);
      gl.bindTexture(gl.TEXTURE_2D, imgBTex);
      gl.uniform1i(displayProgram.uniforms.uBack, 10);
      gl.uniform1f(displayProgram.uniforms.uReady, imgBLoaded);
      blit(null);
    }

    // --- 3D tilt (kept for parallax depth) ---
    var tx = 0, ty = 0, rx3 = 0, ry3 = 0;
    photo.addEventListener("pointermove", function (e) {
      if (!rect) return;
      var px = (e.clientX - rect.left) / rect.width;
      var py = (e.clientY - rect.top) / rect.height;
      tx = (px - 0.5) * 2; ty = (py - 0.5) * 2;
    }, { passive: true });
    photo.addEventListener("pointerleave", function () { tx = 0; ty = 0; });

    // --- Loop with idle pause ---
    function loop() {
      var ease = hovering ? 0.10 : 0.06;
      rx3 += (tx - rx3) * ease;
      ry3 += (ty - ry3) * ease;
      if (stage) {
        stage.style.transform =
          "rotateX(" + (-ry3 * 5).toFixed(2) + "deg) " +
          "rotateY(" + (rx3 * 7).toFixed(2) + "deg) " +
          "translateZ(" + (hovering ? 6 : 0) + "px)";
      }
      step();
      // Stop after ~6s of inactivity (density has fully dissipated)
      if (hovering || performance.now() - lastActivity < 6000) {
        requestAnimationFrame(loop);
      } else {
        running = false;
      }
    }

    var running = false;
    photo.addEventListener("pointerenter", function () {
      if (!running) { running = true; requestAnimationFrame(loop); }
    });
  }

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
        // The width occupied by the original set
        var w = 0;
        originals.forEach(function (c) {
          var s = getComputedStyle(track);
          w += c.offsetWidth + (parseInt(s.gap, 10) || parseInt(s.columnGap, 10) || 0);
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
    try {
      initCursor();
      initMagnetic();
      initHeroReveal();
      initHeroBrushReveal();
      initSectionMode();
      initActiveNav();
      initCounters();
      initWordReveal();
      initVelocityMarquee();
      initScramble();
      initDragScroll();
      initInfiniteSlider();
      initRipple();
      initScrollBar();
      initSmoothNav();
      initHeroWater();
      initHeroLiquid();
      initThemePersist();
      initMobileDrawer();
      initHeroAurora();
      initEasterEgg();
    } catch (err) {
      console.warn("playful.js: subsystem failed", err);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
