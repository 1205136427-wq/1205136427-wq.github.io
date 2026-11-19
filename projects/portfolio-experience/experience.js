(() => {
  'use strict';

  document.documentElement.classList.add('js');

  const clamp01 = (value) => Math.min(1, Math.max(0, value));
  const smoothstep = (edge0, edge1, value) => {
    const x = clamp01((value - edge0) / (edge1 - edge0));
    return x * x * (3 - 2 * x);
  };
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Keep the visual and assistive reading order aligned with the intended descent.
  const main = document.querySelector('#main');
  const sectionOrder = [
    'top',
    'camera-study',
    'idea',
    'grammar',
    'scenes',
    'interface',
    'craft',
    'end',
  ];
  sectionOrder.forEach((id) => {
    const section = document.getElementById(id);
    if (section && main) main.append(section);
  });

  const surfaceLayer = document.getElementById('ambientSurface');
  const waterLayer = document.getElementById('ambientWater');
  const cosmosLayer = document.getElementById('ambientCosmos');
  const pageDepth = document.getElementById('pageDepth');
  const pageDepthFill = document.getElementById('pageDepthFill');
  const pageZone = document.getElementById('pageZone');
  let scrollProgress = 0;

  function zoneFor(progress) {
    if (progress < 0.24) return 'SURFACE';
    if (progress < 0.38) return 'DRIFT';
    if (progress < 0.57) return 'DESCENT';
    if (progress < 0.74) return 'DEEP';
    if (progress < 0.9) return 'BIOLUME';
    return 'COSMOS';
  }

  function updateScrollState() {
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    scrollProgress = clamp01(window.scrollY / maxScroll);

    const surfaceOpacity = 1 - smoothstep(0.02, 0.28, scrollProgress);
    const waterOpacity =
      smoothstep(0.07, 0.3, scrollProgress) * (1 - smoothstep(0.69, 0.92, scrollProgress));
    const cosmosOpacity = smoothstep(0.63, 0.92, scrollProgress);

    if (surfaceLayer) {
      surfaceLayer.style.opacity = surfaceOpacity.toFixed(3);
      surfaceLayer.style.transform = `scale(${(1.035 + scrollProgress * 0.035).toFixed(4)}) translate3d(0, ${(scrollProgress * -1.4).toFixed(2)}vh, 0)`;
    }
    if (waterLayer) {
      waterLayer.style.opacity = waterOpacity.toFixed(3);
      waterLayer.style.transform = `scale(${(1.05 + scrollProgress * 0.045).toFixed(4)}) translate3d(0, ${(scrollProgress * -1.2).toFixed(2)}vh, 0)`;
    }
    if (cosmosLayer) {
      cosmosLayer.style.opacity = cosmosOpacity.toFixed(3);
      cosmosLayer.style.transform = `scale(${(1.06 + scrollProgress * 0.05).toFixed(4)}) translate3d(0, ${(scrollProgress * -0.8).toFixed(2)}vh, 0)`;
    }

    if (pageDepth) pageDepth.textContent = (scrollProgress * 68.2).toFixed(1).padStart(5, '0');
    if (pageDepthFill) pageDepthFill.style.transform = `scaleY(${Math.max(0.025, scrollProgress)})`;
    if (pageZone) pageZone.textContent = zoneFor(scrollProgress);
  }

  let scrollQueued = false;
  function queueScrollUpdate() {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(() => {
      scrollQueued = false;
      updateScrollState();
    });
  }

  window.addEventListener('scroll', queueScrollUpdate, { passive: true });
  window.addEventListener('resize', queueScrollUpdate, { passive: true });
  updateScrollState();

  const revealElements = Array.from(document.querySelectorAll('.reveal'));
  revealElements.forEach((element, index) => {
    element.style.transitionDelay = `${(index % 4) * 70}ms`;
  });

  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    );
    revealElements.forEach((element) => revealObserver.observe(element));

    const navLinks = Array.from(document.querySelectorAll('.chapter-nav a'));
    const navObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          navLinks.forEach((link) => {
            link.classList.toggle('is-active', link.dataset.section === entry.target.id);
          });
        });
      },
      { threshold: 0.18, rootMargin: '-18% 0px -55% 0px' },
    );
    sectionOrder.forEach((id) => {
      const section = document.getElementById(id);
      if (section) navObserver.observe(section);
    });
  } else {
    revealElements.forEach((element) => element.classList.add('is-visible'));
  }

  const canvas = document.getElementById('ambientCanvas');
  const particles = [];
  let ctx = null;
  let width = 0;
  let height = 0;
  let dpr = 1;
  let sprites = [];
  let pointerX = 0.5;
  let pointerY = 0.5;
  let pointerTargetX = 0.5;
  let pointerTargetY = 0.5;

  function createSprite(rgb) {
    const sprite = document.createElement('canvas');
    sprite.width = 64;
    sprite.height = 64;
    const spriteContext = sprite.getContext('2d');
    if (!spriteContext) return sprite;
    const gradient = spriteContext.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, `rgba(${rgb}, 1)`);
    gradient.addColorStop(0.13, `rgba(${rgb}, 0.92)`);
    gradient.addColorStop(0.38, `rgba(${rgb}, 0.25)`);
    gradient.addColorStop(1, `rgba(${rgb}, 0)`);
    spriteContext.fillStyle = gradient;
    spriteContext.fillRect(0, 0, 64, 64);
    return sprite;
  }

  function buildParticles() {
    particles.length = 0;
    if (!canvas) return;
    width = window.innerWidth;
    height = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 1.6);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const count = width < 620 ? 30 : width < 1100 ? 48 : 72;
    for (let index = 0; index < count; index += 1) {
      const depth = 0.25 + Math.random() * 0.75;
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        depth,
        radius: 0.45 + depth * 2.1,
        alpha: 0.08 + Math.random() * 0.3,
        phase: Math.random() * Math.PI * 2,
        speed: 0.8 + Math.random() * 1.8,
        drift: (Math.random() - 0.5) * 5,
        tint: Math.random(),
      });
    }
  }

  sprites = [createSprite('232, 181, 139'), createSprite('160, 226, 222'), createSprite('235, 249, 255')];
  buildParticles();

  function drawParticles(time) {
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'lighter';
    const goldBias = 1 - smoothstep(0.05, 0.32, scrollProgress);
    const cyanBias = smoothstep(0.16, 0.5, scrollProgress) * (1 - smoothstep(0.76, 1, scrollProgress));
    const starBias = smoothstep(0.58, 0.94, scrollProgress);

    pointerX += (pointerTargetX - pointerX) * 0.035;
    pointerY += (pointerTargetY - pointerY) * 0.035;

    particles.forEach((particle) => {
      if (!reduceMotion.matches) {
        particle.y -= particle.speed * 0.09;
        particle.x += Math.sin(time * 0.00018 + particle.phase) * 0.05 + particle.drift * 0.002;
        if (particle.y < -20) particle.y = height + 20;
        if (particle.x < -20) particle.x = width + 20;
        if (particle.x > width + 20) particle.x = -20;
      }

      const parallaxX = (pointerX - 0.5) * particle.depth * 30;
      const parallaxY = (pointerY - 0.5) * particle.depth * 24;
      const x = particle.x + parallaxX;
      const y = particle.y + parallaxY;
      const flicker = 0.7 + Math.sin(time * 0.0011 * particle.speed + particle.phase) * 0.3;
      const alpha = particle.alpha * flicker * (0.72 + scrollProgress * 0.45);
      const tintGold = goldBias * (0.62 + particle.tint * 0.38);
      const tintCyan = cyanBias * (0.6 + particle.tint * 0.4);
      const tintStar = starBias * (0.62 + particle.tint * 0.38);
      const strongest = Math.max(tintGold, tintCyan, tintStar);
      const sprite = tintGold === strongest ? sprites[0] : tintCyan === strongest ? sprites[1] : sprites[2];
      const size = particle.radius * 7 * (1 + starBias * 0.3);
      ctx.globalAlpha = clamp01(alpha);
      ctx.drawImage(sprite, x - size / 2, y - size / 2, size, size);
    });
    ctx.globalAlpha = 1;
  }

  window.addEventListener(
    'pointermove',
    (event) => {
      pointerTargetX = event.clientX / Math.max(1, window.innerWidth);
      pointerTargetY = event.clientY / Math.max(1, window.innerHeight);
    },
    { passive: true },
  );
  window.addEventListener('resize', buildParticles, { passive: true });

  const study = document.getElementById('cameraStudy');
  const film = document.getElementById('studyFilm');
  const filmToggle = document.getElementById('studyFilmToggle');
  const readoutLight = document.getElementById('readoutLight');
  const readoutCamera = document.getElementById('readoutCamera');
  const readoutParticles = document.getElementById('readoutParticles');
  const depthControl = document.getElementById('depthControl');
  const depthTrack = depthControl ? depthControl.querySelector('.depth-control__track') : null;
  const depthTrackFill = document.getElementById('depthTrackFill');
  const depthThumb = document.getElementById('depthThumb');
  const depthStops = Array.from(document.querySelectorAll('.depth-stops button'));
  const directionButtons = Array.from(document.querySelectorAll('.direction-switch button'));
  const depthTimeLabels = depthControl ? Array.from(depthControl.querySelectorAll('.depth-control__value')) : [];
  const mobileFilmQuery = window.matchMedia('(max-width: 620px)');
  let filmVariant = mobileFilmQuery.matches ? 'mobile' : 'desktop';
  let filmSourceReady = false;
  let scrubbingFilm = false;
  let filmInView = false;
  let userPaused = reduceMotion.matches;
  let manualPlayback = false;
  let lastFilmSync = 0;

  const FILM_PROFILES = {
    desktop: {
      fallbackDuration: 38.24,
      returnStart: 23.7,
      stopWindows: [6, 10.6, 32, 34.5],
      seekPoints: { 0: 0, 50: 8.9, 100: 22.2 },
      timeline: [
        { from: 0, to: 6, zone: 'SURFACE', light: 'SUN / RIGHT', camera: 'LEVEL', particles: 'LOW' },
        { from: 6, to: 8.5, zone: 'UNDERWATER', light: 'SUN + VOLUME', camera: 'DESCEND', particles: 'MEDIUM' },
        { from: 8.5, to: 10.6, zone: 'UNDERWATER', light: 'BEAM / RIGHT', camera: 'HOLD', particles: 'MEDIUM' },
        { from: 10.6, to: 23.5, zone: 'COSMOS', light: 'AURORA / AMBIENT', camera: 'FLY / +Z', particles: 'DENSE' },
        { from: 23.5, to: 32, zone: 'COSMOS', light: 'CORE / GATHER', camera: 'REVERSE / -Z', particles: 'GATHER' },
        { from: 32, to: 34.5, zone: 'UNDERWATER', light: 'BEAM / RESTORE', camera: 'SETTLE', particles: 'CLEAR' },
        { from: 34.5, to: Infinity, zone: 'SURFACE', light: 'SUN / RESTORED', camera: 'RISE / LEVEL', particles: 'LOW' },
      ],
    },
    mobile: {
      fallbackDuration: 31.6,
      returnStart: 19.8,
      stopWindows: [2.8, 7, 28.5, 30.5],
      seekPoints: { 0: 0, 50: 6, 100: 19 },
      timeline: [
        { from: 0, to: 2.8, zone: 'SURFACE', light: 'SUN / RIGHT', camera: 'LEVEL', particles: 'LOW' },
        { from: 2.8, to: 4.8, zone: 'UNDERWATER', light: 'SUN + VOLUME', camera: 'DESCEND', particles: 'MEDIUM' },
        { from: 4.8, to: 7, zone: 'UNDERWATER', light: 'BEAM / RIGHT', camera: 'HOLD', particles: 'MEDIUM' },
        { from: 7, to: 19.8, zone: 'COSMOS', light: 'AURORA / AMBIENT', camera: 'FLY / +Z', particles: 'DENSE' },
        { from: 19.8, to: 28.5, zone: 'COSMOS', light: 'CORE / GATHER', camera: 'REVERSE / -Z', particles: 'GATHER' },
        { from: 28.5, to: 30.5, zone: 'UNDERWATER', light: 'BEAM / RESTORE', camera: 'SETTLE', particles: 'CLEAR' },
        { from: 30.5, to: Infinity, zone: 'SURFACE', light: 'SUN / RESTORED', camera: 'RISE / LEVEL', particles: 'LOW' },
      ],
    },
  };

  function filmProfile() {
    return FILM_PROFILES[filmVariant] || FILM_PROFILES.desktop;
  }

  function filmDuration() {
    return film && Number.isFinite(film.duration) && film.duration > 0 ? film.duration : filmProfile().fallbackDuration;
  }

  function formatFilmTime(seconds) {
    const total = Math.max(0, Math.round(Number(seconds) || 0));
    return String(Math.floor(total / 60)).padStart(2, '0') + ':' + String(total % 60).padStart(2, '0');
  }

  function filmStageAt(time) {
    const timeline = filmProfile().timeline;
    return timeline.find((entry) => time >= entry.from && time < entry.to) || timeline[timeline.length - 1];
  }

  function syncFilmUi() {
    if (!film) return;
    const duration = filmDuration();
    const time = Math.max(0, Math.min(duration, film.currentTime || 0));
    const progress = clamp01(time / duration);
    const profile = filmProfile();
    const stage = filmStageAt(time);
    const returning = time >= profile.returnStart && time < profile.stopWindows[3];

    if (depthTrackFill) depthTrackFill.style.height = (progress * 100).toFixed(2) + '%';
    if (depthThumb) depthThumb.style.top = (progress * 100).toFixed(2) + '%';
    if (depthControl) {
      depthControl.setAttribute('aria-valuenow', time.toFixed(1));
      depthControl.setAttribute('aria-valuemax', duration.toFixed(1));
      depthControl.setAttribute('aria-valuetext', stage.zone + ', ' + formatFilmTime(time));
    }
    if (depthTimeLabels[0]) depthTimeLabels[0].textContent = formatFilmTime(time);
    if (depthTimeLabels[1]) depthTimeLabels[1].textContent = formatFilmTime(duration);
    if (filmToggle) filmToggle.classList.toggle('is-paused', film.paused);

    const [surfaceEnd, underwaterEnd, returnEnd, surfaceResume] = profile.stopWindows;
    const activeStop = time < surfaceEnd ? 0 : time < underwaterEnd || (time >= returnEnd && time < surfaceResume) ? 1 : time < returnEnd ? 2 : 0;
    depthStops.forEach((button, index) => button.classList.toggle('is-active', index === activeStop));
    directionButtons.forEach((button) => {
      const active = button.dataset.direction === (returning ? 'return' : 'descent');
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });

    if (readoutLight) readoutLight.textContent = stage.light;
    if (readoutCamera) readoutCamera.textContent = stage.camera;
    if (readoutParticles) readoutParticles.textContent = stage.particles;
    if (study) study.dataset.stage = stage.zone.toLowerCase();
  }

  function seekFilm(seconds, play = true) {
    if (!film) return;
    const duration = filmDuration();
    film.currentTime = Math.max(0, Math.min(duration - 0.03, seconds));
    if (play) {
      manualPlayback = true;
      userPaused = false;
      film.play().catch(() => {});
    } else {
      manualPlayback = false;
      userPaused = true;
      film.pause();
    }
    syncFilmUi();
  }

  function toggleFilmPlayback() {
    if (!film) return;
    if (film.paused) {
      manualPlayback = true;
      userPaused = false;
      film.play().catch(() => {});
    } else {
      manualPlayback = false;
      userPaused = true;
      film.pause();
    }
    syncFilmUi();
  }

  function filmFromPointer(event) {
    if (!film || !depthTrack) return;
    const rect = depthTrack.getBoundingClientRect();
    const ratio = clamp01((event.clientY - rect.top) / Math.max(1, rect.height));
    seekFilm(ratio * filmDuration(), false);
  }

  function configureFilmSource() {
    if (!film) return;
    const nextVariant = mobileFilmQuery.matches ? 'mobile' : 'desktop';
    if (filmSourceReady && nextVariant === filmVariant) return;
    const src = film.dataset[nextVariant + 'Src'];
    const poster = film.dataset[nextVariant + 'Poster'];
    if (!src) return;
    filmVariant = nextVariant;
    filmSourceReady = true;
    if (poster) film.poster = poster;
    if (film.getAttribute('src') !== src) {
      film.src = src;
      film.load();
    }
    syncFilmUi();
  }

  if (film) {
    film.muted = true;
    configureFilmSource();
    film.addEventListener('timeupdate', syncFilmUi, { passive: true });
    film.addEventListener('loadedmetadata', syncFilmUi);
    film.addEventListener('seeked', syncFilmUi);
    film.addEventListener('play', syncFilmUi);
    film.addEventListener('pause', syncFilmUi);
    if (filmToggle) filmToggle.addEventListener('click', toggleFilmPlayback);

    directionButtons.forEach((button) => {
      button.addEventListener('click', () => {
        seekFilm(button.dataset.direction === 'return' ? filmProfile().returnStart : 0, true);
      });
    });

    depthStops.forEach((button) => {
      button.addEventListener('click', () => {
        seekFilm(filmProfile().seekPoints[Number(button.dataset.depth)] ?? 0, true);
      });
    });

    if (depthControl) {
      depthControl.addEventListener('pointerdown', (event) => {
        scrubbingFilm = true;
        if (depthControl.setPointerCapture) depthControl.setPointerCapture(event.pointerId);
        filmFromPointer(event);
        event.preventDefault();
      });
      window.addEventListener('pointermove', (event) => {
        if (scrubbingFilm) filmFromPointer(event);
      }, { passive: true });
      window.addEventListener('pointerup', () => { scrubbingFilm = false; });
      window.addEventListener('pointercancel', () => { scrubbingFilm = false; });
      depthControl.addEventListener('keydown', (event) => {
        const step = event.shiftKey ? 2 : 0.5;
        let next = film.currentTime || 0;
        if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next += step;
        else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') next -= step;
        else if (event.key === 'PageDown') next += 4;
        else if (event.key === 'PageUp') next -= 4;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = filmDuration();
        else return;
        event.preventDefault();
        seekFilm(next, false);
      });
    }

    const observer = new IntersectionObserver(([entry]) => {
      filmInView = entry.isIntersecting;
      if (filmInView && !userPaused && !reduceMotion.matches) film.play().catch(() => {});
      else if (!filmInView && !manualPlayback) film.pause();
    }, { threshold: 0.35 });
    observer.observe(film);

    if (study) {
      const sectionObserver = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) return;
        manualPlayback = false;
        if (!userPaused) film.pause();
      }, { threshold: 0 });
      sectionObserver.observe(study);
    }

    const handleVariantChange = () => {
      configureFilmSource();
      if (filmInView && !userPaused && !reduceMotion.matches) film.play().catch(() => {});
    };
    if (mobileFilmQuery.addEventListener) mobileFilmQuery.addEventListener('change', handleVariantChange);

    if (reduceMotion.matches) film.pause();
    syncFilmUi();
  }

  function animate(now) {
    if (!document.hidden) {
      if (film && !film.paused && !scrubbingFilm && now - lastFilmSync > 70) {
        syncFilmUi();
        lastFilmSync = now;
      }
      drawParticles(now);
    }
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
})();

