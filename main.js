(function () {
  'use strict';
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var cfg = window.SITE || {};
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGsap = !!(window.gsap && window.ScrollTrigger);

  var btnMotion = $('#btnMotion'), btnTilt = $('#btnTilt');
  var ambient = null, videoCtl = null, tiltCtl = null;

  // ---- botão da landing: só funciona com URL confirmada e nunca redireciona sozinho
  var cta = $('#cta');
  if (cfg.landingUrl) { cta.href = cfg.landingUrl; }
  else { cta.setAttribute('aria-disabled', 'true'); cta.addEventListener('click', function (e) { e.preventDefault(); }); }

  // ---- recorte no vidro: a imagem do card mostra o mesmo fundo da seção, alinhado
  function setupCutout() {
    var bgImg = $('#natBg img'), fig = $('#natCut'), cimg = fig && $('img', fig), section = $('#natureza');
    if (!bgImg || !cimg || !section) return;
    function align() {
      var b = bgImg.getBoundingClientRect(), f = fig.getBoundingClientRect();
      if (!b.width) return;
      cimg.style.width = b.width + 'px';
      cimg.style.height = b.height + 'px';
      cimg.style.transform = 'translate3d(' + (b.left - f.left) + 'px,' + (b.top - f.top) + 'px,0)';
    }
    var visible = false;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) align(); }, { rootMargin: '200px' }).observe(section);
    }
    window.addEventListener('resize', align);
    window.addEventListener('load', align);
    bgImg.addEventListener('load', align);
    align();
    if (hasGsap && !reduce) { gsap.ticker.add(function () { if (visible) align(); }); }
  }
  setupCutout();

  // ---- vídeo de abertura: loop contínuo com fade cruzado, sem botões
  function createLoopVideo(a, src) {
    var FADE = 1.2;
    var b = a.cloneNode(false);
    a.parentNode.appendChild(b);
    var vids = [a, b], cur = 0, switching = false, started = false, enabled = true, visible = true;
    vids.forEach(function (v) { v.src = src; v.muted = true; v.loop = false; v.playsInline = true; v.preload = 'auto'; v.style.opacity = 0; });

    function fade(v, to, d) { gsap.to(v, { opacity: to, duration: d, ease: 'none', overwrite: true }); }
    function retryOnGesture() {
      var evs = ['touchend', 'click', 'keydown'];
      var h = function () { evs.forEach(function (t) { window.removeEventListener(t, h); }); if (enabled && visible) vids[cur].play().catch(function () {}); };
      evs.forEach(function (t) { window.addEventListener(t, h, { passive: true }); });
    }
    function apply() {
      var v = vids[cur];
      if (enabled && visible) { var p = v.play(); if (p && p.catch) p.catch(retryOnGesture); }
      else { vids.forEach(function (x) { x.pause(); }); }
    }
    a.addEventListener('playing', function () { if (!started) { started = true; fade(a, 1, FADE); } });
    vids.forEach(function (v) { v.addEventListener('error', function () { v.style.opacity = 0; }); });

    function swap() {
      switching = true;
      var out = vids[cur], inn = vids[1 - cur];
      try { inn.currentTime = 0; } catch (e) {}
      var p = inn.play(); if (p && p.catch) p.catch(function () {});
      fade(inn, 1, FADE); fade(out, 0, FADE);
      cur = 1 - cur;
      setTimeout(function () { out.pause(); switching = false; }, FADE * 1000 + 60);
    }
    gsap.ticker.add(function () {
      if (!enabled || !visible || !started || switching) return;
      var v = vids[cur];
      if (isFinite(v.duration) && v.duration > 0 && v.duration - v.currentTime <= FADE + 0.1) swap();
    });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; apply(); }).observe($('.hero'));
    }
    apply();
    return { setEnabled: function (on) { enabled = on; apply(); } };
  }

  // ---- giroscópio (só celular): move as camadas conforme a inclinação
  function createTilt() {
    var st = { x: 0, y: 0 }, base = null, enabled = true, active = false, frameOn = false, amp = 1, lastX = 99, lastY = 99;
    var qx = gsap.quickTo(st, 'x', { duration: 0.6, ease: 'power3.out' });
    var qy = gsap.quickTo(st, 'y', { duration: 0.6, ease: 'power3.out' });
    var layers = $$('[data-tilt-layer]'), cuts = $$('.cut[data-depth]'), root = document.documentElement;

    function onOri(e) {
      if (!enabled || e.gamma == null || e.beta == null) return;
      var ang = (screen.orientation && typeof screen.orientation.angle === 'number') ? screen.orientation.angle : (window.orientation || 0);
      var g = e.gamma, bt = e.beta;
      if (Math.abs(ang) === 90) { var t = g; g = ang === 90 ? bt : -bt; bt = ang === 90 ? -t : t; }
      if (!base) base = { g: g, b: bt };
      base.g += (g - base.g) * 0.004; base.b += (bt - base.b) * 0.004; // recentraliza devagar
      qx(clamp((g - base.g) / 22, -1, 1));
      qy(clamp((bt - base.b) / 22, -1, 1));
    }
    function frame() {
      if (Math.abs(st.x - lastX) < 0.002 && Math.abs(st.y - lastY) < 0.002) return;
      lastX = st.x; lastY = st.y;
      layers.forEach(function (el) { var d = parseFloat(el.dataset.tiltLayer) || 1; gsap.set(el, { x: st.x * -14 * d * amp, y: st.y * -10 * d * amp }); });
      cuts.forEach(function (el) { var d = parseFloat(el.dataset.depth) || 1; gsap.set(el, { xPercent: st.x * -7 * d * amp, yPercent: st.y * -5 * d * amp }); });
      root.style.setProperty('--tilt-x', st.x.toFixed(3));
    }
    function ensureFrame() { if (!frameOn) { frameOn = true; gsap.ticker.add(frame); } }
    function onMove(e) {
      if (!enabled || e.pointerType === 'touch') return;
      qx(clamp((e.clientX / window.innerWidth - 0.5) * 2, -1, 1));
      qy(clamp((e.clientY / window.innerHeight - 0.5) * 2, -1, 1));
    }
    return {
      // celular: giroscópio
      begin: function () {
        if (active) return; active = true;
        window.addEventListener('deviceorientation', onOri, { passive: true });
        ensureFrame();
      },
      // desktop: posição do cursor, mais ampla porque a tela é maior
      beginMouse: function () {
        if (active) return; active = true; amp = 1.6;
        window.addEventListener('pointermove', onMove, { passive: true });
        document.documentElement.addEventListener('mouseleave', function () { qx(0); qy(0); });
        ensureFrame();
      },
      setEnabled: function (on) { enabled = on; if (!on) { qx(0); qy(0); } }
    };
  }

  function initTilt() {
    if (reduce || !hasGsap) return;
    var coarse = window.matchMedia('(pointer: coarse)').matches;
    var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (fine && !coarse) { tiltCtl = createTilt(); tiltCtl.beginMouse(); return; } // PC: segue o cursor
    if (!coarse || !('DeviceOrientationEvent' in window)) return;
    tiltCtl = createTilt();
    var DOE = window.DeviceOrientationEvent;
    if (typeof DOE.requestPermission === 'function') {
      // iOS: a permissão só pode ser pedida depois de um toque
      btnTilt.hidden = false;
      btnTilt.addEventListener('click', function () {
        DOE.requestPermission().then(function (s) {
          if (s === 'granted') { tiltCtl.begin(); btnTilt.hidden = true; }
          else { btnTilt.textContent = 'Inclinação indisponível'; btnTilt.disabled = true; }
        }).catch(function () { btnTilt.hidden = true; });
      });
    } else {
      tiltCtl.begin();
    }
  }

  // ---- botão de pausa (movimento ambiente, vídeo e giroscópio)
  btnMotion.addEventListener('click', function () {
    var paused = btnMotion.getAttribute('aria-pressed') !== 'true';
    btnMotion.setAttribute('aria-pressed', String(paused));
    btnMotion.textContent = paused ? 'Retomar movimento' : 'Pausar movimento';
    if (ambient) ambient.paused(paused);
    if (videoCtl) videoCtl.setEnabled(!paused);
    if (tiltCtl) tiltCtl.setEnabled(!paused);
  });

  // ---- sem GSAP ou com movimento reduzido: página estática e totalmente legível
  if (!hasGsap || reduce) { btnMotion.hidden = true; return; }

  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  // ---- rolagem suave (Lenis) ligada ao ScrollTrigger. No toque o navegador mantém a inércia nativa.
  var lenis = null;
  if (window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.09, smoothWheel: true, wheelMultiplier: 1, anchors: false });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
    // links internos (#secao) passam pelo Lenis para rolar suave; a pinagem da Mecânica continua correta
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a || a.getAttribute('href').length < 2) return;
      var t = $(a.getAttribute('href'));
      if (!t) return;
      e.preventDefault();
      lenis.scrollTo(t, { duration: 1.4 });
    });
  }

  var vsrc = window.matchMedia('(max-width: 820px)').matches
    ? (cfg.heroVideo && (cfg.heroVideo.mobile || cfg.heroVideo.desktop))
    : (cfg.heroVideo && (cfg.heroVideo.desktop || cfg.heroVideo.mobile));
  if (vsrc) videoCtl = createLoopVideo($('.hero__video'), vsrc);
  initTilt();

  var mm = gsap.matchMedia();
  mm.add('(prefers-reduced-motion: no-preference)', function () {
    var scrub = function (trigger, start, end, extra) {
      return Object.assign({ trigger: trigger, start: start, end: end, scrub: true }, extra || {});
    };

    gsap.to('.progress', { scaleX: 1, ease: 'none', scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: 0.2 } });

    // movimento ambiente (pausável): o fundo respira e as folhas balançam de leve
    ambient = gsap.timeline();
    ambient.fromTo('.hero .layer--bg', { scale: 1.06, xPercent: -2 }, { scale: 1, xPercent: 2, duration: 16, ease: 'sine.inOut', yoyo: true, repeat: -1 }, 0);
    $$('.cut').forEach(function (c, i) {
      ambient.to(c, { rotation: (i % 2 ? 1 : -1) * 2.2, duration: 3.2 + (i % 3) * 0.9, ease: 'sine.inOut', yoyo: true, repeat: -1, transformOrigin: '50% 0%' }, 0);
    });

    // 1 abertura: entrada ao carregar; depois o texto sai com a rolagem
    gsap.from(['.hero .eyebrow', '.hero h1', '.hero .lede'], { y: 36, opacity: 0, duration: 0.9, stagger: 0.12, ease: 'power3.out', delay: 0.1 });
    gsap.to('.hero__wrap', { yPercent: -10, opacity: 0.15, ease: 'none', scrollTrigger: scrub('.hero', 'top top', 'bottom top') });

    // 2 natureza: tudo acompanha a rolagem
    gsap.fromTo('.card', { y: 90, opacity: 0 }, { y: 0, opacity: 1, ease: 'none', scrollTrigger: scrub('.card', 'top 95%', 'top 55%') });
    $$('.nat .cut').forEach(function (l) {
      gsap.to(l, { y: parseFloat(l.dataset.speed) * 3, ease: 'none', scrollTrigger: scrub('.nat', 'top bottom', 'bottom top') });
    });

    // 3 consciência: a textura desliza dentro das letras
    gsap.fromTo('.big', { backgroundPosition: '0% 0%' }, { backgroundPosition: '100% 60%', ease: 'none', scrollTrigger: scrub('.cons', 'top bottom', 'bottom top') });
    gsap.fromTo('.big', { y: 80, opacity: 0 }, { y: 0, opacity: 1, ease: 'none', scrollTrigger: scrub('.big', 'top 98%', 'top 60%') });
    gsap.from('.cons__cols p', { y: 40, opacity: 0, stagger: 0.3, ease: 'none', scrollTrigger: scrub('.cons__cols', 'top 95%', 'top 60%') });
    gsap.to('.ring', { rotation: 40, ease: 'none', scrollTrigger: scrub('.cons', 'top bottom', 'bottom top') });

    // 4 mecânica: fica fixa por pouco tempo; a rolagem abre o círculo e afasta as folhas
    var tl = gsap.timeline({ scrollTrigger: { trigger: '.mec', start: 'top top', end: '+=75%', pin: true, scrub: 0.6, anticipatePin: 1 } });
    tl.fromTo('.mec__open', { clipPath: 'circle(7% at 50% 50%)' }, { clipPath: 'circle(85% at 50% 50%)', ease: 'none', duration: 1 }, 0);
    tl.fromTo('.mec__base span', { scale: 0.9, opacity: 1 }, { scale: 1.1, opacity: 0.6, ease: 'none', duration: 1 }, 0);
    tl.fromTo('.mec__panel', { y: 60, opacity: 0 }, { y: 0, opacity: 1, ease: 'none', duration: 0.4 }, 0.1);
    $$('.mec .cut').forEach(function (l) {
      tl.to(l, { y: parseFloat(l.dataset.speed) * 2.2, x: parseFloat(l.dataset.speed) * -1.4, ease: 'none', duration: 1 }, 0);
    });

    // 5 encerramento
    gsap.from(['.end .eyebrow', '.end h2', '.end .lede', '.cta'], { y: 40, opacity: 0, stagger: 0.15, ease: 'none', scrollTrigger: scrub('.end', 'top 85%', 'top 35%') });
  });

  if (document.fonts && document.fonts.ready) { document.fonts.ready.then(function () { ScrollTrigger.refresh(); }); }
})();
