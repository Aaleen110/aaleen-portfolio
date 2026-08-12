// main.js
import { createNodeField } from './scene.js';

const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------------------------------------------------------
   Mobile nav toggle
--------------------------------------------------------- */
(function initNav() {
  const toggle = document.getElementById('navToggle');
  const links = document.getElementById('navLinks');
  if (!toggle || !links) return;

  toggle.addEventListener('click', () => {
    const open = links.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
  });

  links.querySelectorAll('a').forEach((a) => {
    a.addEventListener('click', () => {
      links.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
})();

/* ---------------------------------------------------------
   Scroll progress trace (top of viewport)
--------------------------------------------------------- */
(function initScrollTrace() {
  const bar = document.getElementById('scrollTrace');
  if (!bar) return;
  function update() {
    const doc = document.documentElement;
    const scrolled = doc.scrollTop;
    const max = doc.scrollHeight - doc.clientHeight;
    const pct = max > 0 ? (scrolled / max) * 100 : 0;
    bar.style.width = pct + '%';
  }
  document.addEventListener('scroll', update, { passive: true });
  update();
})();

/* ---------------------------------------------------------
   Generic reveal-on-scroll for skill groups + [data-reveal]
--------------------------------------------------------- */
(function initReveals() {
  const targets = document.querySelectorAll('.skill-group, [data-reveal]');
  if (!targets.length) return;

  if (REDUCED_MOTION) {
    targets.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
  );
  targets.forEach((el, i) => {
    el.style.transitionDelay = REDUCED_MOTION ? '0ms' : `${(i % 6) * 60}ms`;
    io.observe(el);
  });
})();

/* ---------------------------------------------------------
   Timeline: draw trace line + reveal items in sequence
--------------------------------------------------------- */
(function initTimeline() {
  const timeline = document.getElementById('timeline');
  if (!timeline) return;
  const items = timeline.querySelectorAll('.timeline__item');

  if (REDUCED_MOTION) {
    timeline.classList.add('is-drawn');
    items.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          timeline.classList.add('is-drawn');
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.2, rootMargin: '0px 0px -60px 0px' }
  );
  items.forEach((el) => io.observe(el));
})();

/* ---------------------------------------------------------
   Project cards — pointer-driven 3D tilt
--------------------------------------------------------- */
(function initTiltCards() {
  if (REDUCED_MOTION) return;
  const cards = document.querySelectorAll('[data-tilt]');
  const MAX_TILT = 8;

  cards.forEach((card) => {
    const inner = card.querySelector('.tilt-card__inner');

    function onMove(e) {
      const rect = card.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;
      const rotY = (px - 0.5) * MAX_TILT * 2;
      const rotX = (0.5 - py) * MAX_TILT * 2;
      card.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg)`;
      if (inner) {
        inner.style.setProperty('--mx', `${px * 100}%`);
        inner.style.setProperty('--my', `${py * 100}%`);
      }
    }
    function onLeave() {
      card.style.transform = 'rotateX(0deg) rotateY(0deg)';
    }

    card.addEventListener('pointermove', onMove);
    card.addEventListener('pointerleave', onLeave);
  });
})();

/* ---------------------------------------------------------
   Contact icons — subtle tilt on hover
--------------------------------------------------------- */
(function initIconTilt() {
  if (REDUCED_MOTION) return;
  document.querySelectorAll('[data-tilt-icon]').forEach((icon) => {
    icon.addEventListener('pointermove', (e) => {
      const rect = icon.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      icon.style.transform = `rotateX(${-py * 22}deg) rotateY(${px * 22}deg) translateZ(4px)`;
    });
    icon.addEventListener('pointerleave', () => {
      icon.style.transform = 'rotateX(0) rotateY(0)';
    });
  });
})();

/* ---------------------------------------------------------
   Hero name — mouse-reactive 3D tilt
--------------------------------------------------------- */
(function initHeroTilt() {
  if (REDUCED_MOTION) return;
  const hero = document.getElementById('top');
  const nameLayer = document.querySelector('.hero__name-layer--main');
  const shadowLayer = document.querySelector('.hero__name-layer--shadow');
  if (!hero || !nameLayer) return;

  let target = { x: 0, y: 0 };
  let current = { x: 0, y: 0 };

  hero.addEventListener('pointermove', (e) => {
    const rect = hero.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    target = { x: px, y: py };
  });
  hero.addEventListener('pointerleave', () => { target = { x: 0, y: 0 }; });

  function raf() {
    current.x += (target.x - current.x) * 0.06;
    current.y += (target.y - current.y) * 0.06;
    const rotY = current.x * 10;
    const rotX = -current.y * 8;
    nameLayer.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg)`;
    if (shadowLayer) {
      shadowLayer.style.transform = `translate3d(${6 + current.x * 14}px, ${8 - current.y * 10}px, -40px)`;
    }
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);
})();

/* ---------------------------------------------------------
   Contact form — mailto handoff (no backend on this site)
--------------------------------------------------------- */
(function initContactForm() {
  const form = document.getElementById('contactForm');
  const status = document.getElementById('formStatus');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const message = form.message.value.trim();

    if (!name || !email || !message) {
      status.textContent = 'Fill in every field before sending.';
      return;
    }

    const subject = encodeURIComponent(`Portfolio contact from ${name}`);
    const body = encodeURIComponent(`${message}\n\n— ${name} (${email})`);
    window.location.href = `mailto:aaleenmirza110@gmail.com?subject=${subject}&body=${body}`;
    status.textContent = 'Opening your mail client…';
  });
})();

/* ---------------------------------------------------------
   3D scenes (hero topology + skills ambient field)
--------------------------------------------------------- */
(function initScenes() {
  const heroCanvas = document.getElementById('heroCanvas');
  const stackCanvas = document.getElementById('stackCanvas');

  if (heroCanvas) {
    createNodeField(heroCanvas, {
      nodeCount: 48,
      palette: ['#6FA8C9', '#E8601C', '#4FD1C5'],
      pulseCount: 9,
      neighborLinks: 2,
      spread: 5.4,
      rotationSpeed: 0.035,
      parallax: true,
    });
  }
  if (stackCanvas) {
    createNodeField(stackCanvas, {
      nodeCount: 34,
      palette: ['#6FA8C9', '#4FD1C5'],
      pulseCount: 0,
      neighborLinks: 1,
      spread: 6.5,
      rotationSpeed: 0.015,
      parallax: false,
    });
  }
})();
