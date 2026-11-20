(function () {
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var cfg = window.SITE || {};
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var narrow = window.matchMedia('(max-width: 820px)');

  // ---- botão da landing: só funciona com URL confirmada, nunca redireciona sozinho
  var cta = $('#cta');
  if (cfg.landingUrl) { cta.href = cfg.landingUrl; }
  else { cta.setAttribute('aria-disabled', 'true'); cta.addEventListener('click', function (e) { e.preventDefault(); }); }

  // ---- vídeo de abertura (opcional)
  var video = $('.hero__video'), btnPlay = $('#btnPlay'), btnMotion = $('#btnMotion'), ambient = null;
  var vsrc = narrow.matches ? (cfg.heroVideo && (cfg.heroVideo.mobile || cfg.heroVideo.desktop)) : (cfg.heroVideo && (cfg.heroVideo.desktop || cfg.heroVideo.mobile));
  if (video && vsrc && !reduce) {
    video.src = vsrc;
    video.addEventListener('playing', function () { video.classList.add('on'); });
    video.addEventListener('error', function () { video.classList.remove('on'); });
    var p = video.play();
    if (p && p.catch) p.catch(function () { btnPlay.hidden = false; });
    btnPlay.addEventListener('click', function () { video.play(); btnPlay.hidden = true; });
  } else if (video && vsrc && reduce) {
    btnPlay.hidden = false;
    btnPlay.addEventListener('click', function () { video.src = vsrc; video.play(); btnPlay.hidden = true; });
  }

  btnMotion.addEventListener('click', function () {
    var paused = btnMotion.getAttribute('aria-pressed') !== 'true';
    btnMotion.setAttribute('aria-pressed', String(paused));
    btnMotion.textContent = paused ? 'Retomar movimento' : 'Pausar movimento';
    if (ambient) ambient.paused(paused);
    if (video && video.classList.contains('on')) { paused ? video.pause() : video.play(); }
  });

  // conteúdo já está visível; tudo abaixo é só melhoria
  if (reduce || !window.gsap || !window.ScrollTrigger) { btnMotion.hidden = true; return; }
  gsap.registerPlugin(ScrollTrigger);

  gsap.to('.progress', { scaleX: 1, ease: 'none', scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: .2 } });

  // movimento ambiente (pausável)
  ambient = gsap.timeline();
  ambient.fromTo('.hero .layer--bg', { scale: 1.06, xPercent: -2 }, { scale: 1, xPercent: 2, duration: 16, ease: 'sine.inOut', yoyo: true, repeat: -1 }, 0);
  $$('.cut').forEach(function (c, i) {
    ambient.to(c, { rotation: (i % 2 ? 1 : -1) * 2.2, duration: 3.2 + (i % 3) * .9, ease: 'sine.inOut', yoyo: true, repeat: -1, transformOrigin: '50% 0%' }, 0);
  });

  // 1 abertura
  gsap.from(['.hero .eyebrow', '.hero h1', '.hero .lede', '.hero__actions'], { y: 36, opacity: 0, duration: .9, stagger: .12, ease: 'power3.out', delay: .1 });
  gsap.to('.hero__wrap', { yPercent: -10, opacity: .15, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

  // 2 natureza
  gsap.from('.card', { y: 70, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: '.card', start: 'top 82%' } });
  $$('.nat .cut').forEach(function (l) {
    gsap.to(l, { y: parseFloat(l.dataset.speed) * 3, ease: 'none', scrollTrigger: { trigger: '.nat', start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  // 3 consciência
  gsap.fromTo('.big', { backgroundPosition: '0% 0%' }, { backgroundPosition: '100% 60%', ease: 'none', scrollTrigger: { trigger: '.cons', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.from('.big', { y: 60, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: '.big', start: 'top 85%' } });
  gsap.from('.cons__cols p', { y: 30, opacity: 0, stagger: .15, duration: .8, scrollTrigger: { trigger: '.cons__cols', start: 'top 88%' } });
  gsap.to('.ring', { rotation: 40, ease: 'none', scrollTrigger: { trigger: '.cons', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.to('.cut--cons', { y: -120, ease: 'none', scrollTrigger: { trigger: '.cons', start: 'top bottom', end: 'bottom top', scrub: true } });

  // 4 mecânica: fica fixa por pouco tempo; a rolagem abre o círculo
  var tl = gsap.timeline({ scrollTrigger: { trigger: '.mec', start: 'top top', end: '+=75%', pin: true, scrub: .6, anticipatePin: 1 } });
  tl.fromTo('.mec__open', { clipPath: 'circle(7% at 50% 50%)' }, { clipPath: 'circle(85% at 50% 50%)', ease: 'none', duration: 1 }, 0);
  tl.fromTo('.mec__base span', { scale: .9, opacity: 1 }, { scale: 1.1, opacity: .6, ease: 'none', duration: 1 }, 0);
  $$('.mec .cut').forEach(function (l) {
    tl.to(l, { y: parseFloat(l.dataset.speed) * 2.2, x: parseFloat(l.dataset.speed) * -1.4, ease: 'none', duration: 1 }, 0);
  });
  gsap.from('.mec__panel', { y: 50, opacity: 0, duration: .9, ease: 'power3.out', scrollTrigger: { trigger: '.mec', start: 'top 60%' } });

  // 5 encerramento
  gsap.from(['.end .eyebrow', '.end h2', '.end .lede', '.cta'], { y: 40, opacity: 0, stagger: .12, duration: .9, ease: 'power3.out', scrollTrigger: { trigger: '.end', start: 'top 70%' } });

  if (document.fonts && document.fonts.ready) { document.fonts.ready.then(function () { ScrollTrigger.refresh(); }); }
})();
