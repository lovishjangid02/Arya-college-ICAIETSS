/**
 * ICETIS-2026 — Arya College of Engineering, Jaipur
 * Core JavaScript Engine: Lumen Roof Day/Night WebGL Atmosphere & Interactive UI
 */

(function () {
  'use strict';

  // Helper
  const $ = (id) => document.getElementById(id);
  const root = document.documentElement.style;
  const docEl = document.documentElement;
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // -------------------------------------------------------------------------
  // LENIS SMOOTH SCROLLING SETUP
  // -------------------------------------------------------------------------
  let lenis = null;
  if (typeof globalThis.Lenis !== 'undefined' && !calm) {
    try {
      lenis = new globalThis.Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        touchMultiplier: 1.5,
        wheelMultiplier: 1.0,
        infinite: false,
        autoRaf: false
      });
      window.lenis = lenis;
    } catch (e) {
      console.warn('Lenis initialization failed:', e);
    }
  }

  // -------------------------------------------------------------------------
  // 1. THEME INITIALIZATION (DEFAULT DAY, PERSISTENCE VIA LOCALSTORAGE)
  // -------------------------------------------------------------------------
  const savedTheme = localStorage.getItem('icetis_theme') || 'day';
  let initialNight = savedTheme === 'night' ? 1 : 0;

  // Set initial attributes immediately to avoid flashing
  docEl.setAttribute('data-theme', savedTheme);
  root.setProperty('--k', initialNight.toString());
  root.setProperty('--k2', initialNight.toString());
  root.setProperty('--dip', '0');
  root.setProperty('--sink', '0px');
  root.setProperty('--on-day', (1 - initialNight).toString());
  root.setProperty('--on-night', initialNight.toString());

  // -------------------------------------------------------------------------
  // 2. LUMEN ROOF PHYSICS CONSTANTS & STATE
  // -------------------------------------------------------------------------
  const SINK = 240;  // ms to reach lowest point
  const RISE = 820;  // ms to float back up
  const DEPTH = 0.27; // sink depth relative to viewport height

  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const smooth = (a, b, x) => {
    x = clamp((x - a) / (b - a));
    return x * x * (3 - 2 * x);
  };

  let night = initialNight;
  let target = initialNight;
  let from = initialNight;
  let start = -1e9;
  let queued = null;
  let swapped = true;
  let k = initialNight;
  let surge = 0;
  let animating = false;
  let clock = 0;

  // -------------------------------------------------------------------------
  // 3. WEBGL2 FOG SHADER SETUP (LUMEN ROOF ALGORITHM)
  // -------------------------------------------------------------------------
  const cv = $('fog');
  let gl = null;
  let U = {};

  if (cv) {
    gl = cv.getContext('webgl2', {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      powerPreference: 'high-performance'
    });

    if (gl) {
      const vs = `#version 300 es
      void main(){
        vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
        gl_Position = vec4(p * 2. - 1., 0, 1);
      }`;

      const fs = `#version 300 es
      precision highp float;
      uniform vec2 R;
      uniform float T, S, K;
      out vec4 O;

      float h(vec2 p){
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      float n(vec2 p){
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3. - 2. * f);
        return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y);
      }

      float fbm(vec2 p){
        float a = .5, s = 0.;
        mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
        p = mat2(.8, .6, -.6, .8) * p + 5.3;
        for(int i = 0; i < 5; i++){
          s += a * n(p);
          p = m * p;
          a *= .5;
        }
        return s;
      }

      void main(){
        vec2 uv = gl_FragCoord.xy / R;
        uv.y = 1. - uv.y;
        float asp = R.x / R.y;
        vec2 p = vec2(uv.x * asp, uv.y);
        float t = T * .05;

        vec2 w = vec2(fbm(p * 1.3 + vec2(t, -t * .6)), fbm(p * 1.3 + vec2(-t * .8, t) + 7.));
        float d = fbm(p * 1.9 + w * 1.7 + vec2(t * 1.6, -t * 1.1 + S * .5));
        float e = fbm(p * .9 - w + vec2(-t, t * .5) + 3.);

        float low = smoothstep(.70, 1.04, uv.y + (d - .5) * .34);
        float side = smoothstep(.2, .0, uv.x + (e - .5) * .28) + smoothstep(.8, 1., uv.x + (e - .5) * .28);
        side *= smoothstep(.25, .6, uv.y) * .2;
        float wisps = smoothstep(.5, .78, d) * smoothstep(.22, .5, uv.y) * smoothstep(.86, .6, uv.y) * .18;
        float rest = clamp(low + side + wisps, 0., 1.);

        float front = 1.02 - S * .68;
        float rise = smoothstep(front - .02, front + .26, uv.y + (d - .5) * .5);
        float haze = S * (.3 + .46 * d);
        float a = clamp(max(rest, max(rise * .97, haze)), 0., 1.);

        // Color palettes: Day (golden-white daylight mist) vs Night (deep navy-gold night fog)
        vec3 dayA = vec3(.98, .96, .90), dayB = vec3(.91, .88, .80);
        vec3 nitA = vec3(.30, .33, .45), nitB = vec3(.08, .11, .19);
        vec3 c = mix(mix(dayB, dayA, d * 1.15), mix(nitB, nitA, d * 1.1), K);

        // Luminous gold architectural glow near the entrance arch
        float porch = exp(-dot((uv - vec2(.50, .68)) * vec2(2.0, 3.2), (uv - vec2(.50, .68)) * vec2(2.0, 3.2)) * 3.5);
        c = mix(c, vec3(.92, .75, .30), K * porch * .48 * (1. - S));

        O = vec4(c * a, a);
      }`;

      const sh = (type, src) => {
        const o = gl.createShader(type);
        gl.shaderSource(o, src);
        gl.compileShader(o);
        if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) {
          console.error('Shader compilation error:', gl.getShaderInfoLog(o));
        }
        return o;
      };

      const pr = gl.createProgram();
      gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs));
      gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs));
      gl.linkProgram(pr);

      if (gl.getProgramParameter(pr, gl.LINK_STATUS)) {
        gl.useProgram(pr);
        for (const u of ['R', 'T', 'S', 'K']) {
          U[u] = gl.getUniformLocation(pr, u);
        }
      } else {
        console.error('Program linking failed:', gl.getProgramInfoLog(pr));
        gl = null;
      }
    }
  }

  // Responsive Canvas Size handling
  function resizeCanvas() {
    if (!gl || !cv) return;
    const w = Math.round(Math.min(window.innerWidth, 960));
    const h = Math.round((w * window.innerHeight) / window.innerWidth);
    if (cv.width !== w || cv.height !== h) {
      cv.width = w;
      cv.height = h;
      gl.viewport(0, 0, w, h);
    }
  }

  window.addEventListener('resize', resizeCanvas, { passive: true });
  resizeCanvas();

  // -------------------------------------------------------------------------
  // 4. DAY / NIGHT TOGGLE & TRANSITION MANAGEMENT
  // -------------------------------------------------------------------------
  function updateDOMTheme(isNight) {
    const themeName = isNight ? 'night' : 'day';
    docEl.setAttribute('data-theme', themeName);
    localStorage.setItem('icetis_theme', themeName);

    // Toggle set visibility
    const setDay = $('setDay');
    const setNight = $('setNight');
    if (setDay && setNight) {
      setDay.classList.toggle('is-on', !isNight);
      setNight.classList.toggle('is-on', !!isNight);
    }

    // Update ARIA attributes for buttons if present
    const btnDay = $('btnDay');
    const btnNight = $('btnNight');
    if (btnDay && btnNight) {
      btnDay.setAttribute('aria-pressed', (!isNight).toString());
      btnNight.setAttribute('aria-pressed', (!!isNight).toString());
    }

    // Update navbar single theme toggle
    const navThemeToggle = $('navThemeToggle');
    const navThemeText = $('navThemeText');
    if (navThemeText) {
      navThemeText.textContent = isNight ? 'Night' : 'Day';
    }
    if (navThemeToggle) {
      navThemeToggle.setAttribute('title', isNight ? 'Switch to Day Mode' : 'Switch to Night Mode');
      navThemeToggle.setAttribute('aria-label', isNight ? 'Switch to Day Mode' : 'Switch to Night Mode');
      navThemeToggle.setAttribute('aria-pressed', (!!isNight).toString());
    }

    // Update mini sticky nav toggle text/icon
    const stickyThemeLabel = $('stickyThemeLabel');
    const stickyThemeIcon = $('stickyThemeIcon');
    if (stickyThemeLabel && stickyThemeIcon) {
      if (isNight) {
        stickyThemeLabel.textContent = 'Day Mode';
        stickyThemeIcon.textContent = '☀️';
      } else {
        stickyThemeLabel.textContent = 'Night Mode';
        stickyThemeIcon.textContent = '🌙';
      }
    }
  }

  // Set initial DOM state
  updateDOMTheme(initialNight);

  function pickTheme(n) {
    if (n === target && queued === null) return;

    if (calm) {
      target = night = n;
      k = n;
      updateDOMTheme(n);
      root.setProperty('--k', n.toString());
      root.setProperty('--k2', n.toString());
      root.setProperty('--on-day', (1 - n).toString());
      root.setProperty('--on-night', n.toString());
      return;
    }

    if (animating) {
      queued = n;
    } else {
      beginTransition(n, clock);
    }
  }

  function beginTransition(n, now) {
    target = n;
    from = k;
    start = now;
    swapped = false;
    animating = true;
  }

  // Hook toggle button events
  const btnDay = $('btnDay');
  const btnNight = $('btnNight');
  if (btnDay) btnDay.onclick = () => pickTheme(0);
  if (btnNight) btnNight.onclick = () => pickTheme(1);

  // Single navbar theme toggle button
  const navThemeToggle = $('navThemeToggle');
  if (navThemeToggle) {
    navThemeToggle.onclick = () => {
      pickTheme(target === 1 ? 0 : 1);
    };
  }

  // Mini sticky nav theme toggle button
  const stickyThemeToggle = $('stickyThemeToggle');
  if (stickyThemeToggle) {
    stickyThemeToggle.onclick = () => {
      pickTheme(target === 1 ? 0 : 1);
    };
  }

  // -------------------------------------------------------------------------
  // 5. ANIMATION FRAME LOOP (LUMEN ROOF SINK & FLOAT CLOCK)
  // -------------------------------------------------------------------------
  function frame(now) {
    clock = now;
    const d = now - start;
    let y = 0, s = 0, dip = 0, k2 = k;

    if (animating) {
      if (d < SINK) {
        // Sinking motion into fog
        const x = d / SINK;
        y = x * x * (3 - 2 * x) * DEPTH;
      } else {
        // Swap scene at lowest point when obscured by fog surge
        if (!swapped) {
          swapped = true;
          night = target;
          updateDOMTheme(target);
        }
        // Floating back up
        const x = clamp((d - SINK) / RISE);
        y = Math.pow(1 - x, 3.4) * DEPTH;
      }

      // Fog surge curve
      s = smooth(0, SINK * 0.92, d) * (1 - smooth(SINK + 70, SINK + RISE * 0.92, d));

      // UI opacity dip curve
      dip = smooth(30, 190, d) * (1 - smooth(330, 720, d));

      // Colors interpolate smoothly
      k = from + (target - from) * smooth(120, 520, d);
      k2 = from + (target - from) * smooth(340, 760, d);

      // Animation complete check
      if (d >= SINK + RISE) {
        animating = false;
        k = k2 = target;
        y = s = dip = 0;
        if (queued !== null && queued !== target) {
          const q = queued;
          queued = null;
          beginTransition(q, now);
        } else {
          queued = null;
        }
      }
    }

    // Write computed dynamic values to CSS variables
    root.setProperty('--sink', (y * window.innerHeight).toFixed(1) + 'px');
    root.setProperty('--k', k.toFixed(3));
    root.setProperty('--k2', k2.toFixed(3));
    root.setProperty('--dip', dip.toFixed(3));
    root.setProperty('--on-day', (1 - k).toFixed(3));
    root.setProperty('--on-night', k.toFixed(3));

    // Render WebGL Fog
    if (gl) {
      gl.uniform2f(U.R, cv.width, cv.height);
      gl.uniform1f(U.T, now / 1000);
      gl.uniform1f(U.S, s);
      gl.uniform1f(U.K, k);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
  }

  // -------------------------------------------------------------------------
  // 5. ANIMATION FRAME LOOP (LUMEN ROOF SINK & FLOAT CLOCK + CINEMATIC PARALLAX)
  // -------------------------------------------------------------------------
  let currentParallaxY = 0;
  let scrollDir = 'down';
  let lastScrollY = window.scrollY || 0;

  function loop(t) {
    frame(t);
    if (lenis) {
      lenis.raf(t);
      if (typeof lenis.direction !== 'undefined' && lenis.direction !== 0) {
        scrollDir = lenis.direction === -1 ? 'up' : 'down';
      }
    } else {
      const currentY = window.scrollY || window.pageYOffset || 0;
      const delta = currentY - lastScrollY;
      if (Math.abs(delta) > 1.5) {
        scrollDir = delta > 0 ? 'down' : 'up';
        lastScrollY = currentY;
      }
    }

    if (!calm) {
      const scrollY = lenis ? lenis.scroll : (window.scrollY || window.pageYOffset || 0);
      const maxParallax = window.innerHeight * 0.12;
      const targetP = Math.min(scrollY * 0.055, maxParallax);
      currentParallaxY += (targetP - currentParallaxY) * 0.12;
      root.setProperty('--parallax-y', `${currentParallaxY.toFixed(2)}px`);
    } else {
      root.setProperty('--parallax-y', '0px');
    }

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // -------------------------------------------------------------------------
  // 6. STICKY SECONDARY NAVBAR VISIBILITY
  // -------------------------------------------------------------------------
  const stickyNav = $('stickyNav');
  window.addEventListener(
    'scroll',
    () => {
      if (!stickyNav) return;
      if (window.scrollY > 380) {
        stickyNav.classList.add('visible');
      } else {
        stickyNav.classList.remove('visible');
      }
    },
    { passive: true }
  );

  // -------------------------------------------------------------------------
  // 7. COUNTDOWN TIMER TO DECEMBER 18, 2026
  // -------------------------------------------------------------------------
  const confDate = new Date('2026-12-18T09:00:00+05:30').getTime();

  function updateCountdown() {
    const now = new Date().getTime();
    const diff = confDate - now;

    if (diff <= 0) {
      if ($('days')) $('days').textContent = '00';
      if ($('hours')) $('hours').textContent = '00';
      if ($('minutes')) $('minutes').textContent = '00';
      if ($('seconds')) $('seconds').textContent = '00';
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if ($('days')) $('days').textContent = days < 10 ? '0' + days : days;
    if ($('hours')) $('hours').textContent = hours < 10 ? '0' + hours : hours;
    if ($('minutes')) $('minutes').textContent = minutes < 10 ? '0' + minutes : minutes;
    if ($('seconds')) $('seconds').textContent = seconds < 10 ? '0' + seconds : seconds;
  }

  setInterval(updateCountdown, 1000);
  updateCountdown();

  // -------------------------------------------------------------------------
  // 8. REGISTRATION PRICING & CATEGORIES
  // Note: INR and USD pricing are now unified in the same section without toggling.
  // -------------------------------------------------------------------------

  // -------------------------------------------------------------------------
  // 9. MODALS SYSTEM (REGISTER NOW & SUBMIT PAPER)
  // -------------------------------------------------------------------------
  const registerModal = $('registerModal');
  const submitModal = $('submitModal');

  function openModal(modal) {
    if (!modal) return;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    if (lenis) lenis.stop();
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove('active');
    document.body.style.overflow = '';
    if (lenis) lenis.start();
  }

  // Open triggers
  document.querySelectorAll('[data-open-modal="register"]').forEach((btn) => {
    btn.onclick = (e) => {
      e.preventDefault();
      const cat = btn.getAttribute('data-category');
      const select = $('regCategory');
      if (cat && select) {
        select.value = cat;
      }
      openModal(registerModal);
    };
  });

  document.querySelectorAll('[data-open-modal="submit"]').forEach((btn) => {
    btn.onclick = (e) => {
      e.preventDefault();
      openModal(submitModal);
    };
  });

  // Close triggers
  document.querySelectorAll('.modal-close-btn').forEach((btn) => {
    btn.onclick = function () {
      const parentModal = this.closest('.modal-overlay');
      closeModal(parentModal);
    };
  });

  // Close on backdrop click
  document.querySelectorAll('.modal-overlay').forEach((overlay) => {
    overlay.addEventListener('click', function (e) {
      if (e.target === this) {
        closeModal(this);
      }
    });
  });

  // Escape key closes modals
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal(registerModal);
      closeModal(submitModal);
      closeMobileDrawer();
    }
  });

  // -------------------------------------------------------------------------
  // 10. TOAST NOTIFICATION SYSTEM
  // -------------------------------------------------------------------------
  const toastContainer = $('toastContainer');

  function showToast(message, icon = '✓') {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span style="color:#d4af37;font-weight:bold;font-size:16px;">${icon}</span><span>${message}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4200);
  }

  // -------------------------------------------------------------------------
  // 11. FORM SUBMISSION HANDLERS
  // -------------------------------------------------------------------------
  // Registration Form
  const regForm = $('regForm');
  if (regForm) {
    regForm.onsubmit = (e) => {
      e.preventDefault();
      closeModal(registerModal);
      showToast('Registration submitted successfully! A confirmation email will be sent shortly.');
      regForm.reset();
    };
  }

  // Paper Submission Form
  const paperForm = $('paperForm');
  if (paperForm) {
    paperForm.onsubmit = (e) => {
      e.preventDefault();
      closeModal(submitModal);
      showToast('Paper manuscript uploaded successfully! Paper ID: ICETIS-2026-M' + Math.floor(1000 + Math.random() * 9000));
      paperForm.reset();
    };
  }

  // Contact Form
  const contactForm = $('contactForm');
  if (contactForm) {
    contactForm.onsubmit = (e) => {
      e.preventDefault();
      showToast('Thank you! Your inquiry has been forwarded to the organizing committee.');
      contactForm.reset();
    };
  }

  // Template Download Buttons
  document.querySelectorAll('.btn-download-template').forEach((btn) => {
    btn.onclick = (e) => {
      e.preventDefault();
      showToast('Downloading author manuscript template package (Word & LaTeX)...', '📥');
    };
  });

  // -------------------------------------------------------------------------
  // 12. MOBILE MENU DRAWER
  // -------------------------------------------------------------------------
  const mobileNavDrawer = $('mobileNavDrawer');
  const mobileMenuBtn = $('mobileMenuBtn');
  const closeDrawerBtn = $('closeDrawerBtn');

  function openMobileDrawer() {
    if (mobileNavDrawer) mobileNavDrawer.classList.add('open');
    document.body.style.overflow = 'hidden';
    if (lenis) lenis.stop();
  }

  function closeMobileDrawer() {
    if (mobileNavDrawer) mobileNavDrawer.classList.remove('open');
    document.body.style.overflow = '';
    if (lenis) lenis.start();
  }

  if (mobileMenuBtn) mobileMenuBtn.onclick = openMobileDrawer;
  if (closeDrawerBtn) closeDrawerBtn.onclick = closeMobileDrawer;

  if (mobileNavDrawer) {
    mobileNavDrawer.addEventListener('click', (e) => {
      if (e.target === mobileNavDrawer) closeMobileDrawer();
    });
  }

  document.querySelectorAll('.drawer-links a').forEach((link) => {
    link.onclick = closeMobileDrawer;
  });

  // -------------------------------------------------------------------------
  // 13. SMOOTH IN-PAGE ANCHOR NAVIGATION (LENIS INTEGRATION)
  // -------------------------------------------------------------------------
  document.querySelectorAll('a[href^="#"]:not([data-open-modal])').forEach((link) => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (!href || href === '#' || href.length < 2) return;
      const targetEl = document.querySelector(href);
      if (targetEl) {
        e.preventDefault();
        const offset = href === '#home' ? 0 : -72;
        if (lenis) {
          lenis.scrollTo(targetEl, { offset: offset, duration: 1.15 });
        } else {
          const rect = targetEl.getBoundingClientRect();
          window.scrollTo({
            top: window.pageYOffset + rect.top + offset,
            behavior: 'smooth'
          });
        }
        if (history.pushState) {
          history.pushState(null, '', href);
        }
      }
    });
  });

  // -------------------------------------------------------------------------
  // 14. BIDIRECTIONAL SCROLL REVEAL ANIMATION SYSTEM
  // -------------------------------------------------------------------------
  function initScrollReveals() {
    if (calm) return; // Respect prefers-reduced-motion

    // Activate reveal transitions
    docEl.classList.add('js-reveal-ready');

    // 1. Standalone module containers & headers
    const standaloneSelectors = [
      '#home .conference-tag',
      '#home .hero-title',
      '#home .hero-venue-banner',
      '#home .hero-actions',
      '#home .hero-bottom-bar',
      '.section-header',
      '#about .about-content',
      '#about .college-card',
      '#dates .dates-notice-card',
      '#guidelines .submission-banner',
      '#registration .intl-pricing-banner',
      '#registration .detail-box',
      '#registration .bank-details-card',
      '#registration .reg-notes-box',
      '#publication .pub-notice-box',
      '#venue .venue-card-main',
      '#venue .jaipur-guide-box',
      '#contact .contact-form-card',
      '.footer-bottom'
    ];

    standaloneSelectors.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => {
        el.classList.add('reveal-on-scroll');
        if (sel.includes('.college-card') || sel.includes('.venue-card-main')) {
          el.classList.add('reveal-scale');
        }
      });
    });

    // 2. Grids and multi-card groups with stagger effect
    const staggeredGroups = [
      { selector: '#about .about-features .about-feature-item', stagger: 90, scale: false },
      { selector: '#about .stats-grid .stat-item', stagger: 80, scale: true },
      { selector: '#tracks .tracks-grid .track-card', stagger: 90, scale: true },
      { selector: '#dates .timeline-item', stagger: 80, scale: false },
      { selector: '#guidelines .guidelines-grid .guide-card', stagger: 90, scale: false },
      { selector: '#registration .pricing-cards-grid .pricing-card', stagger: 120, scale: true },
      { selector: '#publication .pub-partners-grid .pub-partner-card', stagger: 80, scale: true },
      { selector: '#speakers .comm-card', stagger: 80, scale: true },
      { selector: '#venue .attractions-grid .attraction-pill', stagger: 60, scale: false },
      { selector: '#contact .contact-info-col .contact-card-item', stagger: 80, scale: false },
      { selector: '.site-footer .footer-col', stagger: 80, scale: false }
    ];

    staggeredGroups.forEach(({ selector, stagger, scale }) => {
      const items = document.querySelectorAll(selector);
      items.forEach((item, index) => {
        item.classList.add('reveal-on-scroll');
        if (scale) item.classList.add('reveal-scale');
        item.style.transitionDelay = `${index * stagger}ms`;
      });
    });

    // 3. Direction-Aware Cinematic IntersectionObserver (Slide-Up on scroll down, Slide-Down on scroll up)
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const el = entry.target;
          const rect = entry.boundingClientRect;
          const vh = window.innerHeight || document.documentElement.clientHeight;

          if (entry.isIntersecting) {
            // Element is entering into the viewport
            if (scrollDir === 'up' && rect.top < vh * 0.45) {
              // Scrolled up: enter from top (slide-down)
              el.classList.add('reveal-from-top');
            } else if (scrollDir === 'down' && rect.bottom > vh * 0.55) {
              // Scrolled down: enter from bottom (slide-up)
              el.classList.remove('reveal-from-top');
            }
            el.classList.add('is-revealed');
          } else {
            // Element has left the viewport.
            // Safety buffer of 60px: only reset when safely outside the screen so user NEVER sees the change
            if (rect.bottom < -60) {
              // Exited above screen: user scrolled down past it.
              // Prepare for when user scrolls back UP (will enter from top)
              el.classList.remove('is-revealed');
              el.classList.add('reveal-from-top');
            } else if (rect.top > vh + 60) {
              // Exited below screen: user scrolled up past it.
              // Prepare for when user scrolls back DOWN (will enter from bottom)
              el.classList.remove('is-revealed');
              el.classList.remove('reveal-from-top');
            }
          }
        });
      },
      {
        threshold: [0, 0.08, 0.2],
        rootMargin: '10px 0px 10px 0px'
      }
    );

    document.querySelectorAll('.reveal-on-scroll').forEach((el) => {
      revealObserver.observe(el);
    });

    // Automatically reveal elements that are already within the viewport on initial page load
    const initialReveal = () => {
      document.querySelectorAll('.reveal-on-scroll').forEach((el) => {
        const rect = el.getBoundingClientRect();
        const viewportH = window.innerHeight || document.documentElement.clientHeight;
        if (rect.top < viewportH && rect.bottom > 0) {
          el.classList.add('is-revealed');
        }
      });
    };
    requestAnimationFrame(initialReveal);
    setTimeout(initialReveal, 120);
  }

  // Initialize scroll reveals
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initScrollReveals);
  } else {
    initScrollReveals();
  }

})();

