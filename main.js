(function () {
  'use strict';
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var cfg = window.SITE || {};
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGsap = !!(window.gsap && window.ScrollTrigger);
  var hasSplit = !!window.SplitText;

  var btnMotion = $('#btnMotion'), btnTilt = $('#btnTilt');
  var ambient = null, videoCtl = null, tiltCtl = null, lightCtl = null;

  // ---- botão e link da landing: só funcionam com URL confirmada e nunca redirecionam sozinhos
  var cta = $('#cta'), footLanding = $('#footLanding');
  if (cfg.landingUrl) { cta.href = cfg.landingUrl; footLanding.href = cfg.landingUrl; footLanding.hidden = false; }
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

  // ---- vídeo da abertura: o arquivo já tem a emenda cruzada, então basta loop nativo + fade de entrada
  function setupVideo(v, src) {
    var enabled = true, visible = true, shown = false;
    v.muted = true; v.loop = true; v.playsInline = true; v.src = src;
    v.addEventListener('playing', function () {
      if (shown) return; shown = true;
      gsap.to(v, { opacity: 1, duration: 1.6, ease: 'power1.out' });
    });
    v.addEventListener('error', function () { v.style.opacity = 0; });
    function retryOnGesture() {
      var evs = ['pointerdown', 'keydown', 'wheel', 'touchend'];
      var h = function () { evs.forEach(function (t) { window.removeEventListener(t, h); }); apply(); };
      evs.forEach(function (t) { window.addEventListener(t, h, { passive: true }); });
    }
    function apply() {
      if (enabled && visible) { var p = v.play(); if (p && p.catch) p.catch(retryOnGesture); }
      else v.pause();
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; apply(); }).observe($('.hero'));
    }
    apply();
    return { setEnabled: function (on) { enabled = on; apply(); } };
  }

  // ---- luz dinâmica da Mecânica (shader WebGL leve, em meia resolução)
  function setupLight(canvas, section) {
    var gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
    if (!gl) { section.classList.add('mec--nogl'); canvas.style.display = 'none'; return null; }
    var vs = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
    var fs = [
      'precision mediump float;uniform vec2 uRes;uniform float uTime;uniform vec2 uMouse;',
      'float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
      'float n(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),u.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),u.x),u.y);}',
      'float fbm(vec2 p){float v=0.,a=.5;for(int k=0;k<5;k++){v+=a*n(p);p*=2.02;a*=.5;}return v;}',
      'void main(){',
      ' vec2 uv=gl_FragCoord.xy/uRes; vec2 p=(gl_FragCoord.xy-.5*uRes)/uRes.y; float t=uTime*.06;',
      ' vec3 deep=vec3(.027,.118,.027), moss=vec3(.176,.325,.102), fern=vec3(.278,.439,.137);',
      ' vec3 col=mix(deep,moss,smoothstep(-.2,1.1,uv.y+.25*fbm(p*1.5+t)));',
      ' float f=fbm(p*2.2+vec2(t*1.4,-t)); float c=pow(1.-abs(sin(f*6.2831+t*3.)),14.); col+=fern*c*.12;',
      ' vec2 o=p-vec2(-.9,.7); float a=atan(o.y,o.x);',
      ' float r=pow(.5+.5*sin(a*18.+fbm(vec2(a*3.,t*2.))*4.+t*2.),6.)*smoothstep(1.8,.2,length(o)); col+=vec3(.55,.68,.36)*r*.12;',
      ' vec2 m=(uMouse-.5)*vec2(uRes.x/uRes.y,1.); float s=exp(-dot(p-m,p-m)*2.5); col+=vec3(.45,.6,.3)*s*.22;',
      ' col*=1.-.35*dot(uv-.5,uv-.5)*2.; gl_FragColor=vec4(col,1.);',
      '}'
    ].join('\n');
    function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; }
    var prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { section.classList.add('mec--nogl'); canvas.style.display = 'none'; return null; }
    gl.useProgram(prog);
    var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var uRes = gl.getUniformLocation(prog, 'uRes'), uTime = gl.getUniformLocation(prog, 'uTime'), uMouse = gl.getUniformLocation(prog, 'uMouse');
    var mouse = { x: 0.3, y: 0.7 }, target = { x: 0.3, y: 0.7 }, visible = false, enabled = true, t0 = performance.now();
    function size() {
      var scale = 0.5; // meia resolução: a luz é suave, não precisa de mais
      canvas.width = Math.max(2, Math.round(canvas.clientWidth * scale));
      canvas.height = Math.max(2, Math.round(canvas.clientHeight * scale));
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
    size(); window.addEventListener('resize', size);
    window.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      target.x = e.clientX / window.innerWidth; target.y = 1 - e.clientY / window.innerHeight;
    }, { passive: true });
    function draw() {
      if (!visible || !enabled) return;
      var tt = (performance.now() - t0) / 1000;
      mouse.x += (target.x - mouse.x) * 0.05; mouse.y += (target.y - mouse.y) * 0.05;
      if (!target.moved) { target.x = 0.5 + Math.cos(tt * 0.2) * 0.25; target.y = 0.6 + Math.sin(tt * 0.15) * 0.15; }
      gl.uniform2f(uRes, canvas.width, canvas.height); gl.uniform1f(uTime, tt); gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    window.addEventListener('pointermove', function (e) { if (e.pointerType !== 'touch') target.moved = true; }, { passive: true, once: true });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(section);
    gsap.ticker.add(draw);
    draw();
    return { setEnabled: function (on) { enabled = on; } };
  }

  // ---- giroscópio (celular) ou cursor (PC): move as camadas
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
    function onMove(e) {
      if (!enabled || e.pointerType === 'touch') return;
      qx(clamp((e.clientX / window.innerWidth - 0.5) * 2, -1, 1));
      qy(clamp((e.clientY / window.innerHeight - 0.5) * 2, -1, 1));
    }
    function frame() {
      if (Math.abs(st.x - lastX) < 0.002 && Math.abs(st.y - lastY) < 0.002) return;
      lastX = st.x; lastY = st.y;
      layers.forEach(function (el) { var d = parseFloat(el.dataset.tiltLayer) || 1; gsap.set(el, { x: st.x * -14 * d * amp, y: st.y * -10 * d * amp }); });
      cuts.forEach(function (el) { var d = parseFloat(el.dataset.depth) || 1; gsap.set(el, { xPercent: st.x * -7 * d * amp, yPercent: st.y * -5 * d * amp }); });
      root.style.setProperty('--tilt-x', st.x.toFixed(3));
    }
    function ensureFrame() { if (!frameOn) { frameOn = true; gsap.ticker.add(frame); } }
    return {
      begin: function () {
        if (active) return; active = true;
        window.addEventListener('deviceorientation', onOri, { passive: true });
        ensureFrame();
      },
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
    if (fine && !coarse) { tiltCtl = createTilt(); tiltCtl.beginMouse(); return; }
    if (!coarse || !('DeviceOrientationEvent' in window)) return;
    tiltCtl = createTilt();
    var DOE = window.DeviceOrientationEvent;
    if (typeof DOE.requestPermission === 'function') {
      btnTilt.hidden = false; // iOS: a permissão só pode ser pedida depois de um toque
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

  // ---- pausa: movimento ambiente, vídeo, luz e cursor/giroscópio
  btnMotion.addEventListener('click', function () {
    var paused = btnMotion.getAttribute('aria-pressed') !== 'true';
    btnMotion.setAttribute('aria-pressed', String(paused));
    btnMotion.textContent = paused ? 'Retomar movimento' : 'Pausar movimento';
    if (ambient) ambient.paused(paused);
    if (videoCtl) videoCtl.setEnabled(!paused);
    if (tiltCtl) tiltCtl.setEnabled(!paused);
    if (lightCtl) lightCtl.setEnabled(!paused);
  });

  // ---- sem GSAP ou com movimento reduzido: página estática e totalmente legível
  if (!hasGsap || reduce) { btnMotion.hidden = true; $('.mec').classList.add('mec--static'); return; }

  gsap.registerPlugin(ScrollTrigger);
  if (hasSplit) gsap.registerPlugin(SplitText);
  ScrollTrigger.config({ ignoreMobileResize: true });

  // ---- rolagem suave (Lenis) ligada ao ScrollTrigger. No toque o navegador mantém a inércia nativa.
  if (window.Lenis) {
    var lenis = new window.Lenis({ lerp: 0.09, smoothWheel: true, wheelMultiplier: 1, anchors: false });
    window.lenis = lenis; // acessível para depuração no console
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
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
    ? (cfg.heroVideo && cfg.heroVideo.mobile)
    : (cfg.heroVideo && (cfg.heroVideo.desktop || cfg.heroVideo.mobile));
  if (vsrc) videoCtl = setupVideo($('.hero__video'), vsrc);
  lightCtl = setupLight($('.mec__light'), $('.mec'));
  initTilt();

  // ---- utilitários de texto (SplitText): linhas sobem de dentro de uma máscara, palavras em cascata
  var scrub = function (trigger, start, end, s) {
    return { trigger: trigger, start: start, end: end, scrub: s == null ? true : s };
  };
  function fixMasks(self) { (self.masks || []).forEach(function (m) { m.style.paddingBottom = '.14em'; m.style.marginBottom = '-.14em'; }); }
  function revealLines(sel, st, extra) {
    $$(sel).forEach(function (el) {
      if (!hasSplit) { gsap.from(el, Object.assign({ y: 30, opacity: 0, ease: 'none', scrollTrigger: st(el) }, extra)); return; }
      SplitText.create(el, {
        type: 'lines', mask: 'lines', autoSplit: true,
        onSplit: function (self) {
          fixMasks(self);
          return gsap.from(self.lines, Object.assign({ yPercent: 115, ease: 'none', stagger: 0.15, scrollTrigger: st(el) }, extra));
        }
      });
    });
  }
  function revealWords(sel, st, extra) {
    $$(sel).forEach(function (el) {
      if (!hasSplit) { gsap.from(el, Object.assign({ y: 30, opacity: 0, ease: 'none', scrollTrigger: st(el) }, extra)); return; }
      SplitText.create(el, {
        type: 'words,lines', mask: 'lines', autoSplit: true,
        onSplit: function (self) {
          fixMasks(self);
          return gsap.from(self.words, Object.assign({ yPercent: 120, rotate: 4, opacity: 0, ease: 'none', stagger: 0.08, scrollTrigger: st(el) }, extra));
        }
      });
    });
  }
  function revealEyebrow(sel, st) {
    $$(sel).forEach(function (el) {
      gsap.fromTo(el, { opacity: 0, letterSpacing: '.6em' }, { opacity: 1, letterSpacing: '.22em', ease: 'none', scrollTrigger: st(el) });
    });
  }

  var mm = gsap.matchMedia();
  mm.add('(prefers-reduced-motion: no-preference)', function () {
    gsap.to('.progress', { scaleX: 1, ease: 'none', scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: 0.2 } });

    // movimento ambiente (pausável): o fundo respira e as folhas balançam de leve
    ambient = gsap.timeline();
    ambient.fromTo('.hero .layer--bg', { scale: 1.06, xPercent: -2 }, { scale: 1, xPercent: 2, duration: 16, ease: 'sine.inOut', yoyo: true, repeat: -1 }, 0);
    $$('.cut').forEach(function (c, i) {
      ambient.to(c, { rotation: (i % 2 ? 1 : -1) * 2.2, duration: 3.2 + (i % 3) * 0.9, ease: 'sine.inOut', yoyo: true, repeat: -1, transformOrigin: '50% 0%' }, 0);
    });

    // 1 ABERTURA: entrada ao carregar (palavras sobem da máscara); depois tudo segue a rolagem
    if (hasSplit) {
      SplitText.create('.hero h1', {
        type: 'words,lines', mask: 'lines', autoSplit: true,
        onSplit: function (self) { fixMasks(self); return gsap.from(self.words, { yPercent: 120, rotate: 5, duration: 1.2, ease: 'expo.out', stagger: 0.07, delay: 0.25 }); }
      });
      SplitText.create('.hero .lede', {
        type: 'lines', mask: 'lines', autoSplit: true,
        onSplit: function (self) { fixMasks(self); return gsap.from(self.lines, { yPercent: 115, duration: 1, ease: 'expo.out', stagger: 0.1, delay: 0.75 }); }
      });
    }
    gsap.fromTo('.hero .eyebrow', { opacity: 0, letterSpacing: '.6em' }, { opacity: 1, letterSpacing: '.22em', duration: 1.4, ease: 'expo.out', delay: 0.1 });
    // passagem para a Natureza: o texto sobe e some, o vídeo desce mais devagar e escurece
    gsap.to('.hero__wrap', { yPercent: -18, opacity: 0, ease: 'none', scrollTrigger: scrub('.hero', 'top top', '75% top') });
    gsap.to('.hero .layer--bg', { yPercent: 10, ease: 'none', scrollTrigger: scrub('.hero', 'top top', 'bottom top') });
    gsap.to('.hero .layer--bg', { opacity: 0.5, ease: 'none', scrollTrigger: scrub('.hero', '35% top', 'bottom top') });

    // 2 NATUREZA: o card se abre de dentro para fora; os textos entram em sequência
    gsap.fromTo('.card', { clipPath: 'inset(12% 10% 12% 10% round 28px)', scale: 0.94, opacity: 0.2 },
      // termina com o recorte maior que o card para não cortar a sombra externa do vidro
      { clipPath: 'inset(-15% -15% -25% -15% round 40px)', scale: 1, opacity: 1, ease: 'none', scrollTrigger: scrub('.card', 'top 98%', 'top 45%') });
    gsap.fromTo('.card__fig', { clipPath: 'inset(100% 0 0 0 round 20px)' },
      { clipPath: 'inset(0% 0 0 0 round 20px)', ease: 'none', scrollTrigger: scrub('.card', 'top 85%', 'top 35%') });
    revealEyebrow('.card .eyebrow', function () { return scrub('.card', 'top 80%', 'top 45%'); });
    revealWords('.card h2', function () { return scrub('.card', 'top 78%', 'top 38%'); });
    revealLines('.card h3, .card p.body', function (el) { return scrub(el, 'top 95%', 'top 60%'); });
    gsap.from('.card__links > *', { y: 24, opacity: 0, stagger: 0.12, ease: 'none', scrollTrigger: scrub('.card__links', 'top 98%', 'top 70%') });
    $$('.nat .cut').forEach(function (l) {
      gsap.to(l, { y: parseFloat(l.dataset.speed) * 3, ease: 'none', scrollTrigger: scrub('.nat', 'top bottom', 'bottom top') });
    });

    // 3 CONSCIÊNCIA: o card claro sobe e se assenta; a palavra se revela de baixo para cima
    gsap.fromTo('.cons', { scale: 0.94, y: 60 }, { scale: 1, y: 0, ease: 'none', scrollTrigger: scrub('.cons', 'top bottom', 'top 30%') });
    gsap.fromTo('.big', { backgroundPosition: '0% 0%' }, { backgroundPosition: '100% 60%', ease: 'none', scrollTrigger: scrub('.cons', 'top bottom', 'bottom top') });
    gsap.fromTo('.big', { clipPath: 'inset(100% 0% -10% 0%)', y: 70 }, { clipPath: 'inset(-25% 0% -10% 0%)', y: 0, ease: 'none', scrollTrigger: scrub('.big', 'top 95%', 'top 55%') });
    revealEyebrow('.cons .eyebrow', function (el) { return scrub(el, 'top 95%', 'top 70%'); });
    gsap.fromTo('.cons__rule', { clipPath: 'inset(0 50% 0 50%)' }, { clipPath: 'inset(0 0% 0 0%)', ease: 'none', scrollTrigger: scrub('.cons__rule', 'top 95%', 'top 70%') });
    revealLines('.cons__cols p', function (el) { return scrub(el, 'top 95%', 'top 65%'); });
    gsap.to('.ring', { rotation: 40, ease: 'none', scrollTrigger: scrub('.cons', 'top bottom', 'bottom top') });
    ScrollTrigger.create({ trigger: '.cons', start: 'top 40px', end: 'bottom 40px', toggleClass: { targets: '.bar', className: 'bar--dark' } });

    // 4 MECÂNICA (fixa): verde com luz dinâmica e texto branco -> a paisagem abre com o card -> some no verde do Encerramento
    var mec = gsap.timeline({ scrollTrigger: { trigger: '.mec', start: 'top top', end: '+=220%', pin: true, scrub: 0.6, anticipatePin: 1 } });
    mec.fromTo('.mec__intro .eyebrow', { opacity: 0, letterSpacing: '.6em' }, { opacity: 1, letterSpacing: '.22em', duration: 0.12, ease: 'none' }, 0);
    if (hasSplit) {
      var ts = SplitText.create('.mec__title', { type: 'words,lines', mask: 'lines' });
      fixMasks(ts);
      mec.from(ts.words, { yPercent: 120, rotate: 4, opacity: 0, duration: 0.2, stagger: 0.025, ease: 'none' }, 0.02);
    } else {
      mec.from('.mec__title', { y: 40, opacity: 0, duration: 0.2, ease: 'none' }, 0.02);
    }
    mec.to('.mec__intro', { yPercent: -12, opacity: 0, duration: 0.14, ease: 'none' }, 0.42)
       .fromTo('.mec__open', { clipPath: 'circle(0% at 50% 50%)' }, { clipPath: 'circle(85% at 50% 50%)', duration: 0.3, ease: 'none' }, 0.42)
       .fromTo('.mec__open img', { scale: 1.25 }, { scale: 1, duration: 0.36, ease: 'none' }, 0.42)
       .fromTo('.mec__panel', { clipPath: 'inset(0% 0% 100% 0% round 24px)', y: 40, opacity: 0 }, { clipPath: 'inset(-30% -20% -40% -20% round 32px)', y: 0, opacity: 1, duration: 0.16, ease: 'none' }, 0.6)
       .from('.mec__panel li', { x: -20, opacity: 0, stagger: 0.025, duration: 0.08, ease: 'none' }, 0.66)
       .to('.mec__fade', { opacity: 1, duration: 0.12, ease: 'none' }, 0.88);

    // 5 ENCERRAMENTO: entra a partir do mesmo verde
    revealEyebrow('.end .eyebrow', function (el) { return scrub(el, 'top 95%', 'top 70%'); });
    revealWords('.end h2', function (el) { return scrub(el, 'top 92%', 'top 50%'); });
    revealLines('.end .lede', function (el) { return scrub(el, 'top 95%', 'top 65%'); });
    gsap.fromTo('.cta', { clipPath: 'inset(-40% 50% -60% 50% round 999px)', opacity: 0 }, { clipPath: 'inset(-40% -20% -60% -20% round 999px)', opacity: 1, ease: 'none', scrollTrigger: scrub('.cta', 'top 98%', 'top 75%') });
    gsap.from('.cut--end', { y: -140, opacity: 0, ease: 'none', scrollTrigger: scrub('.end', 'top 90%', 'top 30%') });

    // RODAPÉ (termina exatamente no fim da página)
    gsap.from('.foot__wrap > *', { y: 30, opacity: 0, stagger: 0.12, ease: 'none', scrollTrigger: scrub('.foot', 'top bottom', 'bottom bottom') });
  });

  if (document.fonts && document.fonts.ready) { document.fonts.ready.then(function () { ScrollTrigger.refresh(); }); }
})();
