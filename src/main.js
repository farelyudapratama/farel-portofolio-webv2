import './style.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { applyLang, ui } from './i18n.js';

gsap.registerPlugin(ScrollTrigger);

const root = document.documentElement;
// bypass animasi jika terdapat query param ?still (berguna untuk print preview / screenshot)
const prm = root.dataset.still === '1' || location.search.indexOf('still') !== -1;

/* toggle bahasa (id / en) */
const langBtn = document.querySelector('.masthead__lang');
const langLabel = document.querySelector('.masthead__lang-label');
function curLang() { return root.dataset.lang === 'en' ? 'en' : 'id'; }
function syncLangUI() {
  if (langLabel) langLabel.textContent = ui[curLang()].langOther;
}
// inisialisasi bahasa saat pertama kali load dari dataset/localstorage
if (curLang() === 'en') applyLang('en');
syncLangUI();
langBtn?.addEventListener('click', () => {
  const next = curLang() === 'id' ? 'en' : 'id';
  applyLang(next);
  syncLangUI();
  syncThemeLabel();
});

/* toggle tema gelap / terang */
const themeBtn = document.querySelector('.masthead__theme');
const themeLabel = document.querySelector('.masthead__theme-label');
function syncThemeLabel() {
  if (themeLabel) themeLabel.textContent = root.dataset.theme === 'dark' ? ui[curLang()].themeNight : ui[curLang()].themeDay;
}
syncThemeLabel();
themeBtn?.addEventListener('click', () => {
  const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
  root.dataset.theme = next;
  try { localStorage.setItem('theme', next); } catch (e) {}
  syncThemeLabel();
});

/* drawer navigasi mobile */
const sheet = document.getElementById('menu-seluler');
const burger = document.querySelector('.masthead__burger');
const closeBtn = document.querySelector('.sheet__close');
function openSheet(open) {
  if (!sheet) return;
  sheet.dataset.open = String(open);
  burger?.setAttribute('aria-expanded', String(open));
  if (open) { sheet.removeAttribute('inert'); closeBtn?.focus(); }
  else { sheet.setAttribute('inert', ''); burger?.focus(); }
}
burger?.addEventListener('click', () => openSheet(true));
closeBtn?.addEventListener('click', () => openSheet(false));
sheet?.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => openSheet(false)));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && sheet?.dataset.open === 'true') openSheet(false); });

/* scroll reading progress bar */
const reader = document.querySelector('.reader');
function updateReader() {
  const h = document.documentElement;
  const max = h.scrollHeight - h.clientHeight;
  const pct = max > 0 ? (h.scrollTop / max) * 100 : 0;
  if (reader) reader.style.width = pct + '%';
}
addEventListener('scroll', updateReader, { passive: true });
updateReader();

/* salin teks email ke clipboard dengan fallback untuk browser lama */
document.querySelectorAll('.copy').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const text = btn.getAttribute('data-copy') || '';
    const original = btn.textContent;
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (_) {}
      ta.remove();
    }
    btn.textContent = ui[curLang()].copyDone;
    btn.dataset.done = 'true';
    setTimeout(() => { btn.textContent = original; delete btn.dataset.done; }, 1800);
  });
});

/* floating preview kartu proyek saat hover:
   - mengikuti pergerakan kursor dengan clamp batas viewport
   - efek tilt dinamis berdasarkan kecepatan mouse
   - animasi reveal frame dan scramble text menggunakan GSAP */
(() => {
  const peek = document.querySelector('.peek');
  if (!peek) return;
  const frame = peek.querySelector('.peek__frame');
  const img = peek.querySelector('.peek__img');
  const tag = peek.querySelector('.peek__tag');
  const items = document.querySelectorAll('[data-preview]');
  if (!items.length) return;

  if (matchMedia('(hover: none), (pointer: coarse)').matches) return;

  // indikator dot dibuat manual via DOM agar dapat ditransform secara independen oleh GSAP
  const dot = document.createElement('span');
  dot.className = 'peek__dot';
  frame.appendChild(dot);
  gsap.set(peek, { opacity: 0 });
  gsap.set(frame, { opacity: 0 });

  const GAP = 28;
  const EDGE = 12;
  const EASE = 0.16;

  let active = null;
  let raf = 0;
  let side = 1;
  let mx = 0, my = 0;
  let x = 0, y = 0;
  let tilt = 0;
  let inTl = null, outTl = null, scrTween = null;
  const loaded = new Map();

  function preload(src) {
    if (loaded.has(src)) return loaded.get(src);
    const p = new Promise((resolve) => {
      const im = new Image();
      im.onload = im.onerror = resolve;
      im.src = src;
    });
    loaded.set(src, p);
    return p;
  }
  const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 800));
  idle(() => items.forEach((it) => preload(it.getAttribute('data-preview'))));

  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);

  function target() {
    const w = peek.offsetWidth;
    const h = peek.offsetHeight;
    if (mx + GAP + w + EDGE > innerWidth) side = -1;
    else if (mx - GAP - w - EDGE < 0) side = 1;
    else if (side === -1 && mx + GAP + w + EDGE <= innerWidth - 40) side = 1;
    let tx = mx + side * (GAP + w / 2);
    let ty = my;
    tx = clamp(tx, w / 2 + EDGE, innerWidth - w / 2 - EDGE);
    ty = clamp(ty, h / 2 + EDGE, innerHeight - h / 2 - EDGE);
    return [tx, ty];
  }

  function place() {
    peek.style.transform =
      `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${tilt.toFixed(2)}deg) translate(-50%, -50%)`;
  }
  function tick() {
    const [tx, ty] = target();
    const dx = tx - x;
    x += dx * EASE;
    y += (ty - y) * EASE;
    const want = clamp(dx * 0.12, -9, 9);
    tilt += (want - tilt) * 0.12;
    place();
    raf = requestAnimationFrame(tick);
  }
  function startLoop() { if (!raf) raf = requestAnimationFrame(tick); }
  function stopLoop() { cancelAnimationFrame(raf); raf = 0; }

  function anchorFor(item) {
    const r = item.getBoundingClientRect();
    mx = r.left + r.width * 0.55;
    my = r.top + r.height / 2;
  }

  // efek scramble text pada label caption kartu
  const GLYPH = '▒░▓#@%&*+=/<>';
  function scramble(el, text) {
    scrTween && scrTween.kill();
    const o = { p: 0 };
    scrTween = gsap.to(o, {
      p: 1, duration: 0.6, ease: 'none',
      onUpdate() {
        const n = Math.floor(o.p * text.length);
        el.textContent = text.slice(0, n) + [...text.slice(n)]
          .map((c) => (c === ' ' ? ' ' : GLYPH[(Math.random() * GLYPH.length) | 0])).join('');
      },
      onComplete() { el.textContent = text; },
    });
  }

  function animIn(first) {
    inTl && inTl.kill();
    outTl && outTl.kill();
    gsap.set(peek, { opacity: 1 });
    const tl = gsap.timeline();
    if (first) {
      tl.fromTo(frame,
        { scale: 0.5, rotation: -16, y: 46, rotationY: 0, transformOrigin: '30% 70%' },
        { scale: 1, rotation: -1.5, y: 0, duration: 0.85, ease: 'elastic.out(1, 0.55)' }, 0)
        .fromTo(frame, { opacity: 0 }, { opacity: 1, duration: 0.15, ease: 'none' }, 0);
    } else {
      // transisi rotasi 3D saat berpindah langsung antar kartu proyek
      tl.fromTo(frame,
        { rotationY: 78, opacity: 0, scale: 0.92, rotation: -1.5, transformPerspective: 900, transformOrigin: '50% 50%' },
        { rotationY: 0, opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.7)' }, 0);
    }
    tl.fromTo(img,
      { clipPath: 'inset(0% 0% 100% 0%)', scale: 1.35 },
      { clipPath: 'inset(0% 0% 0% 0%)', scale: 1, duration: 0.85, ease: 'power3.out', clearProps: 'clipPath' }, 0.06)
      .fromTo(dot, { scale: 0, rotation: -180, opacity: 1 },
        { scale: 1, rotation: 0, duration: 0.55, ease: 'back.out(3)' }, 0.28)
      .fromTo(tag, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' }, 0.22);
    inTl = tl;
  }

  function finishHide() {
    if (peek.dataset.show === 'true') return;
    peek.hidden = true;
    stopLoop();
  }
  function animOut() {
    inTl && inTl.kill();
    outTl && outTl.kill();
    outTl = gsap.timeline({ onComplete: finishHide })
      .to(frame, { scale: 0.7, rotation: '+=8', y: 24, opacity: 0, duration: 0.28, ease: 'back.in(1.7)' }, 0)
      .to(tag, { opacity: 0, duration: 0.15 }, 0)
      .to(peek, { opacity: 0, duration: 0.1 }, 0.2);
  }

  function show(item, e) {
    const src = item.getAttribute('data-preview');
    const kind = item.getAttribute('data-preview-kind') || 'web';
    const label = (item.querySelector('b')?.textContent
      || item.querySelector('.ticket__name')?.textContent || '').trim();
    const wasOpen = peek.dataset.show === 'true';
    active = item;
    peek.dataset.kind = kind;
    peek.hidden = false;
    if (e && e.clientX != null) { mx = e.clientX; my = e.clientY; } else anchorFor(item);

    preload(src).then(() => {
      if (active !== item) return;
      img.src = src;
      img.alt = label;
      if (!wasOpen) {
        const [tx, ty] = target();
        x = tx; y = ty; tilt = 0;
        place();
      }
      peek.dataset.show = 'true';
      animIn(!wasOpen);
      scramble(tag, 'fig · ' + label);
      startLoop();
    });
  }

  function hide(item) {
    if (active !== item) return;
    active = null;
    peek.dataset.show = 'false';
    animOut();
  }

  // sembunyikan preview saat modal lightbox dibuka agar tidak bertumpuk
  document.addEventListener('peek:kill', () => {
    inTl && inTl.kill();
    outTl && outTl.kill();
    scrTween && scrTween.kill();
    active = null;
    peek.dataset.show = 'false';
    gsap.set(peek, { opacity: 0 });
    gsap.set(frame, { opacity: 0 });
    peek.hidden = true;
    stopLoop();
  });

  items.forEach((item) => {
    item.addEventListener('pointerenter', (e) => show(item, e));
    item.addEventListener('pointermove', (e) => { mx = e.clientX; my = e.clientY; });
    item.addEventListener('pointerleave', () => hide(item));
    item.addEventListener('focusin', () => {
      // cegah preview muncul kembali saat fokus kembali ke elemen pemicu setelah lightbox ditutup
      if (Date.now() - Number(root.dataset.lbClosed || 0) < 600) return;
      if (!item.matches(':hover')) show(item);
    });
    item.addEventListener('focusout', (e) => {
      if (!item.contains(e.relatedTarget)) hide(item);
    });
  });

  addEventListener('scroll', () => {
    if (active && !active.matches(':hover')) anchorFor(active);
  }, { passive: true });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && active) hide(active); });
})();

/* interaksi hover kartu proyek:
   - background sweep dari arah kursor + aksen bar vertikal
   - animasi split-character wave pada teks judul
   - tilt/shift nomor tiket dan tag kategori
   - ripple effect pada posisi klik (hindari transform pada .ticket__name agar stretched link tetap presisi) */
(() => {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const cards = document.querySelectorAll('.ticket, .index li');
  if (!cards.length) return;
  document.documentElement.classList.add('fx-on');
  const cssVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

  function splitChars(el) {
    const text = el.textContent;
    el.setAttribute('aria-label', text);
    el.textContent = '';
    return [...text].map((c) => {
      const s = document.createElement('span');
      s.className = 'fx-ch';
      s.setAttribute('aria-hidden', 'true');
      s.textContent = c === ' ' ? '\u00a0' : c;
      el.appendChild(s);
      return s;
    });
  }

  cards.forEach((card) => {
    const isTicket = card.classList.contains('ticket');
    const nameEl = card.querySelector(isTicket ? '.ticket__name' : 'b');
    const chars = nameEl ? splitChars(nameEl) : [];
    const num = card.querySelector('.ticket__no');
    const desc = card.querySelector('.ticket__body p');
    const tagEl = card.querySelector(isTicket ? '.ticket__tag' : 'a > span:not(.gallery-badge)');
    const badge = () => card.querySelector('.gallery-badge');

    const wipe = document.createElement('span');
    wipe.className = 'fx-wipe';
    wipe.setAttribute('aria-hidden', 'true');
    const bar = document.createElement('i');
    bar.className = 'fx-bar';
    bar.setAttribute('aria-hidden', 'true');
    card.prepend(wipe, bar);
    gsap.set(wipe, { scaleX: 0 });
    gsap.set(bar, { scaleY: 0 });

    const qx = num ? gsap.quickTo(num, 'x', { duration: 0.6, ease: 'power3' }) : null;
    const qy = num ? gsap.quickTo(num, 'y', { duration: 0.6, ease: 'power3' }) : null;

    const sideOf = (e) => {
      const r = card.getBoundingClientRect();
      return e.clientX - r.left < r.width / 2 ? '0% 50%' : '100% 50%';
    };
    const spot = (e) => {
      const r = card.getBoundingClientRect();
      wipe.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      wipe.style.setProperty('--my', (e.clientY - r.top) + 'px');
      return r;
    };

    card.addEventListener('pointerenter', (e) => {
      spot(e);
      const accent = cssVar('--accent');
      gsap.set(wipe, { transformOrigin: sideOf(e) });
      gsap.to(wipe, { scaleX: 1, duration: 0.65, ease: 'expo.out', overwrite: true });
      gsap.to(bar, { scaleY: 1, duration: 0.5, ease: 'back.out(2.4)', overwrite: true });
      if (chars.length) {
        gsap.to(chars, {
          keyframes: [
            { yPercent: -32, duration: 0.14, ease: 'power2.out' },
            { yPercent: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' },
          ],
          stagger: 0.022, overwrite: true,
        });
      }
      if (num) gsap.to(num, { scale: 1.22, rotation: -8, duration: 0.8, ease: 'elastic.out(1, 0.4)' });
      if (desc) gsap.to(desc, { x: 10, duration: 0.55, ease: 'power3.out' });
      if (tagEl) gsap.to(tagEl, { x: -10, color: accent, duration: 0.4, ease: 'power3.out' });
      if (!isTicket && nameEl) gsap.to(nameEl, { x: 8, duration: 0.5, ease: 'power3.out' });
      const b = badge();
      if (b) gsap.to(b, { backgroundColor: accent, color: cssVar('--paper'), scale: 1.14, duration: 0.4, ease: 'back.out(3)' });
    });

    card.addEventListener('pointermove', (e) => {
      const r = spot(e);
      if (qx) {
        qx(((e.clientX - r.left) / r.width - 0.5) * 18);
        qy(((e.clientY - r.top) / r.height - 0.5) * 10);
      }
    });

    card.addEventListener('pointerleave', (e) => {
      gsap.set(wipe, { transformOrigin: sideOf(e) });
      gsap.to(wipe, { scaleX: 0, duration: 0.5, ease: 'power3.inOut', overwrite: true });
      gsap.to(bar, { scaleY: 0, duration: 0.3, ease: 'power2.in', overwrite: true });
      if (chars.length) gsap.to(chars, { yPercent: 0, duration: 0.3, overwrite: true });
      if (num) {
        gsap.to(num, { scale: 1, rotation: 0, duration: 0.7, ease: 'elastic.out(1, 0.5)' });
        qx(0); qy(0);
      }
      if (desc) gsap.to(desc, { x: 0, duration: 0.4, ease: 'power3.out' });
      if (tagEl) gsap.to(tagEl, { x: 0, duration: 0.4, ease: 'power3.out', clearProps: 'color' });
      if (!isTicket && nameEl) gsap.to(nameEl, { x: 0, duration: 0.4, ease: 'power3.out' });
      const b = badge();
      if (b) gsap.to(b, { scale: 1, duration: 0.3, clearProps: 'backgroundColor,color' });
    });

    // efek ripple tinta menyebar dari posisi pointer saat kartu diklik
    card.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      const r = card.getBoundingClientRect();
      const d = document.createElement('span');
      d.className = 'fx-ripple';
      d.style.left = (e.clientX - r.left) + 'px';
      d.style.top = (e.clientY - r.top) + 'px';
      wipe.appendChild(d);
      gsap.fromTo(d,
        { scale: 0, opacity: 0.5 },
        { scale: (Math.hypot(r.width, r.height) * 2) / 40, opacity: 0, duration: 0.8, ease: 'power2.out', onComplete: () => d.remove() });
      if (num) gsap.fromTo(num, { scale: 1.22 }, { scale: 0.88, duration: 0.12, yoyo: true, repeat: 1, ease: 'power2.out' });
    });
  });
})();

/* komponen modal lightbox galeri proyek:
   - animasi transisi zoom/expand dari posisi screenshot asal (FLIP / shared-element transition)
   - dukungan zoom pan, glare interaktif, navigasi keyboard/touch swipe
   - data galeri dimuat dari manifest JSON atau fallback preview thumbnail */
(() => {
  const box = document.getElementById('lightbox');
  if (!box) return;
  const triggers = document.querySelectorAll('[data-gallery]');
  if (!triggers.length) return;

  const q = (s) => box.querySelector(s);
  const bg = q('.lightbox__bg');
  const ink = q('.lightbox__ink');
  const frame = q('.lightbox__frame');
  const shot = q('.lightbox__shot');
  const imgEl = q('.lightbox__img');
  const glare = q('.lightbox__glare');
  const titleEl = q('.lightbox__title');
  const countEl = q('.lightbox__count');
  const dotsEl = q('.lightbox__dots');
  const linkOpen = q('.lightbox__open');
  const btnClose = q('.lightbox__close');
  const btnPrev = q('.lightbox__nav--prev');
  const btnNext = q('.lightbox__nav--next');
  const corners = box.querySelectorAll('.lightbox__corner');
  const ZOOM = 2.2;

  let manifest = null;
  let list = [];
  let idx = 0;
  let from = null;           // info koordinat titik klik { pt, rect } elemen pemicu
  let lastFocus = null;
  let isOpen = false;
  let opening = false;
  let busy = false;
  let ready = false;
  let zoomed = false;
  let titleChars = [];
  let dots = [];
  let openTl = null;

  const getManifest = () => {
    if (manifest) return Promise.resolve(manifest);
    return fetch('/img/gallery/manifest.json')
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({}))
      .then((m) => (manifest = m || {}));
  };
  const decode = (url) => new Promise((res) => {
    const im = new Image();
    im.onload = im.onerror = () => res();
    im.src = url;
  });
  const circle = (r, x, y) => `circle(${r}px at ${x}px ${y}px)`;
  const farthest = (x, y) => Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) + 40;

  // menambahkan badge 'galeri' pada kartu yang memiliki multi-gambar
  triggers.forEach((t) => {
    const key = t.getAttribute('data-gallery');
    const host = t.querySelector('.ticket__name, b');
    if (host && !t.querySelector('.gallery-badge')) {
      const s = document.createElement('span');
      s.className = 'gallery-badge';
      s.textContent = 'galeri';
      s.setAttribute('aria-hidden', 'true');
      host.insertAdjacentElement('afterend', s);
    }
    void key;
  });

  gsap.set(shot, { transformPerspective: 1100 });

  /* pembuatan elemen judul per karakter & pagination dot*/
  function splitTitle(text) {
    titleEl.textContent = '';
    titleEl.setAttribute('aria-label', text);
    titleChars = [...text].map((c) => {
      const s = document.createElement('span');
      s.className = 'lb-ch';
      s.setAttribute('aria-hidden', 'true');
      s.textContent = c;
      titleEl.appendChild(s);
      return s;
    });
  }
  function buildDots() {
    dotsEl.textContent = '';
    if (list.length < 2) return [];
    return list.map((_, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'lightbox__dot' + (i === idx ? ' is-on' : '');
      b.setAttribute('aria-label', 'Gambar ' + (i + 1));
      b.addEventListener('click', () => go(i));
      dotsEl.appendChild(b);
      return b;
    });
  }
  function syncDots() {
    dots.forEach((d, i) => {
      d.classList.toggle('is-on', i === idx);
      gsap.to(d, { width: i === idx ? 30 : 8, duration: 0.4, ease: 'power3.out' });
    });
    countEl.textContent = list.length > 1 ? `${idx + 1} / ${list.length}` : '';
  }

  /* fungsi pembuka lightbox dengan transisi FLIP / expanding frame */
  async function openGallery(urls, name, info, href, start = 0) {
    if (!urls.length) return false;
    if (isOpen || opening) return true;
    opening = true; isOpen = true; ready = false; zoomed = false;
    list = urls; idx = Math.min(Math.max(start, 0), urls.length - 1); from = info;
    lastFocus = document.activeElement;
    document.dispatchEvent(new CustomEvent('peek:kill'));

    if (href) { linkOpen.href = href; linkOpen.hidden = false; } else linkOpen.hidden = true;
    imgEl.src = urls[idx];
    imgEl.alt = name;
    { const nx = urls[idx + 1]; if (nx) decode(nx); const pv2 = urls[idx - 1]; if (pv2) decode(pv2); }
    await Promise.race([decode(urls[idx]), new Promise((r) => setTimeout(r, 220))]);

    // reset state dan props animasi sebelumnya
    gsap.set([frame, shot, imgEl, bg, ink], { clearProps: 'all' });
    gsap.set(shot, { transformPerspective: 1100 });
    shot.classList.remove('is-zoomed');
    frame.classList.remove('is-settled');
    splitTitle(name);
    dots = buildDots();
    countEl.textContent = urls.length > 1 ? `${idx + 1} / ${urls.length}` : '';
    box.dataset.single = String(urls.length <= 1);

    const ox = info?.pt?.x ?? innerWidth / 2;
    const oy = info?.pt?.y ?? innerHeight / 2;
    const R = farthest(ox, oy);

    // sembunyikan kontrol dan atur titik awal clip-path lingkaran pada kursor
    gsap.set([bg, ink], { clipPath: circle(0, ox, oy) });
    gsap.set(titleChars, { yPercent: 125, rotation: 7 });
    gsap.set([countEl, linkOpen, btnPrev, btnNext, btnClose, ...dots], { opacity: 0 });
    gsap.set(corners, { opacity: 0, scale: 0 });

    box.hidden = false;
    document.body.style.overflow = 'hidden';
    // sembunyikan thumbnail asal sementara waktu agar tampak berpindah ke lightbox
    if (info?.srcEl) gsap.set(info.srcEl, { opacity: 0 });
    btnClose.focus({ preventScroll: true });

    const fr = frame.getBoundingClientRect(); // ukuran akhir (belum ditransform)
    const flip = !!info?.rect && info.rect.width > 40 && fr.width > 0;
    const tl = gsap.timeline({
      onComplete: () => {
        gsap.set(frame, { clearProps: 'clipPath' });
        frame.classList.add('is-settled');
        ready = true; opening = false;
      },
      onReverseComplete: finish,
    });
    openTl = tl;

    // reveal backdrop: aksen merah terlebih dahulu disusul layer gelap
    tl.fromTo(ink, { clipPath: circle(0, ox, oy) }, { clipPath: circle(R, ox, oy), duration: 0.8, ease: 'power3.inOut' }, 0)
      .fromTo(bg, { clipPath: circle(0, ox, oy) }, { clipPath: circle(R, ox, oy), duration: 0.85, ease: 'power3.inOut' }, 0.1);

    if (flip) {
      // transisi FLIP dari posisi kartu asal ke tengah layar
      const r = info.rect;
      const s = r.width / fr.width;
      const cropPx = Math.max(0, fr.height - r.height / s);
      gsap.set(frame, {
        transformOrigin: '0 0', x: r.left - fr.left, y: r.top - fr.top, scale: s, rotation: -1.5,
        clipPath: `inset(0px 0px ${cropPx}px 0px)`,
      });
      tl.to(frame, {
        x: 0, y: 0, scale: 1, rotation: 0,
        clipPath: 'inset(-90px -90px -90px -90px)',
        duration: 0.7, ease: 'expo.inOut',
      }, 0.08);
    } else {
      tl.fromTo(frame,
        { opacity: 0, scale: 0.68, y: 70, rotation: -6 },
        { opacity: 1, scale: 1, y: 0, rotation: 0, duration: 0.7, ease: 'back.out(1.5)' }, 0.15);
    }
    tl.fromTo(imgEl, { scale: 1.14 }, { scale: 1, duration: 0.8, ease: 'power3.out' }, 0.08)
      .to(corners, { opacity: 1, scale: 1, duration: 0.5, stagger: 0.05, ease: 'back.out(2.6)' }, 0.5)
      .to(titleChars, { yPercent: 0, rotation: 0, duration: 0.7, stagger: 0.028, ease: 'power4.out' }, 0.35)
      .fromTo([countEl, linkOpen], { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.4, stagger: 0.06, ease: 'power2.out' }, 0.45)
      .fromTo(btnPrev, { x: -60 }, { x: 0, duration: 0.5, ease: 'back.out(2)' }, 0.4)
      .fromTo(btnNext, { x: 60 }, { x: 0, duration: 0.5, ease: 'back.out(2)' }, 0.45)
      .fromTo(btnClose, { rotation: -120, scale: 0 }, { rotation: 0, scale: 1, duration: 0.5, ease: 'back.out(2.2)' }, 0.35)
      .to([btnPrev, btnNext, btnClose], { opacity: 1, duration: 0.3 }, 0.4);
    if (dots.length) tl.fromTo(dots, { scaleX: 0 }, { scaleX: 1, opacity: 1, duration: 0.35, stagger: 0.04, ease: 'back.out(2)' }, 0.55);
    syncDots();
    return true;
  }

  /*  fungsi penutup lightbox & pemulihan state DOM */
  function finish() {
    box.hidden = true;
    document.body.style.overflow = '';
    gsap.set([bg, ink, frame, shot, imgEl, countEl, linkOpen, btnPrev, btnNext, btnClose, ...corners],
      { clearProps: 'all' });
    gsap.set(shot, { transformPerspective: 1100 });
    frame.classList.remove('is-settled');
    isOpen = false; opening = false; busy = false; ready = false; zoomed = false;
    if (from?.srcEl) gsap.to(from.srcEl, { opacity: 1, duration: 0.4, ease: 'power2.out' });
    root.dataset.lbClosed = String(Date.now());
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  function close() {
    if (!isOpen || busy) return;
    if (opening && openTl) { // jika ditutup saat proses membuka, balik arah timeline
      ready = false; busy = true; openTl.timeScale(2.5).reverse(); return;
    }
    busy = true; ready = false;
    zoomed = false;
    shot.classList.remove('is-zoomed');
    gsap.killTweensOf([imgEl, shot]);
    gsap.set(imgEl, { x: 0, y: 0, scale: 1, opacity: 1 });
    gsap.set(shot, { rotationX: 0, rotationY: 0 });
    frame.classList.remove('is-settled');

    const fr = frame.getBoundingClientRect();
    const r = from?.rect;
    const cx = r ? r.left + r.width / 2 : (from?.pt?.x ?? innerWidth / 2);
    const cy = r ? r.top + r.height / 2 : (from?.pt?.y ?? innerHeight / 2);

    const tl = gsap.timeline({ onComplete: finish });
    tl.to([btnClose, btnPrev, btnNext], { opacity: 0, scale: 0.5, duration: 0.18, ease: 'power2.in', stagger: 0.02 }, 0)
      .to([countEl, linkOpen, ...dots], { opacity: 0, y: 10, duration: 0.15 }, 0)
      .to(titleChars, { yPercent: -125, duration: 0.22, stagger: 0.01, ease: 'power2.in' }, 0)
      .to(corners, { scale: 0, opacity: 0, duration: 0.18, stagger: 0.02 }, 0);
    // thumbnail asal dikembalikan di awal, bukan menunggu dialog hilang total
    if (from?.srcEl) tl.to(from.srcEl, { opacity: 1, duration: 0.3, ease: 'power2.out' }, 0.1);

    if (r && r.width > 40 && fr.width > 0) {
      const s = r.width / fr.width;
      const cropPx = Math.max(0, fr.height - r.height / s);
      gsap.set(frame, { transformOrigin: '0 0', clipPath: 'inset(-90px -90px -90px -90px)' });
      tl.to(frame, {
        x: r.left - fr.left, y: r.top - fr.top, scale: s, rotation: -1.5,
        clipPath: `inset(0px 0px ${cropPx}px 0px)`,
        duration: 0.45, ease: 'power3.inOut',
      }, 0.05);
    } else {
      tl.to(frame, { scale: 0.72, y: 60, opacity: 0, rotation: 4, duration: 0.3, ease: 'power3.in' }, 0.05);
    }
    tl.to(bg, { clipPath: circle(0, cx, cy), duration: 0.45, ease: 'power3.inOut' }, 0.12)
      .to(ink, { clipPath: circle(0, cx, cy), duration: 0.45, ease: 'power3.inOut' }, 0.18);
  }

  /*  transisi pergantian gambar (slide next / prev) */
  async function go(to, dirHint) {
    if (!ready || busy || list.length < 2) return;
    to = (to + list.length) % list.length;
    if (to === idx) return;
    busy = true;
    const d = dirHint || (to > idx ? 1 : -1);
    setZoom(false);
    const pre = decode(list[to]);
    await gsap.to(imgEl, { x: -d * 80, opacity: 0, duration: 0.28, ease: 'power2.in', overwrite: 'auto' }).then();
    await pre;
    const ow = shot.offsetWidth, oh = shot.offsetHeight;
    imgEl.src = list[to];
    gsap.set(shot, { width: 'auto', height: 'auto' });
    const nw = shot.offsetWidth, nh = shot.offsetHeight;
    idx = to;
    syncDots();
    const tl = gsap.timeline({
      onComplete: () => {
        gsap.set(shot, { clearProps: 'width,height' });
        gsap.set(imgEl, { clearProps: 'clipPath' });
        busy = false;
      },
    });
    // animasikan ukuran frame ke rasio gambar baru secara halus
    tl.fromTo(shot, { width: ow, height: oh }, { width: nw, height: nh, duration: 0.65, ease: 'expo.inOut' }, 0)
      .fromTo(imgEl,
        { x: d * 90, opacity: 1, scale: 1.18, clipPath: `inset(0% ${d > 0 ? 0 : 100}% 0% ${d > 0 ? 100 : 0}%)` },
        { x: 0, scale: 1, clipPath: 'inset(0% 0% 0% 0%)', duration: 0.85, ease: 'expo.out' }, 0.05)
      .fromTo(countEl, { yPercent: -70, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.4, ease: 'power3.out' }, 0.1);
  }

  /*  efek tilt 3D interaktif dan zoom-pan gambar */
  function pan(nx, ny) {
    gsap.to(imgEl, {
      x: -nx * shot.offsetWidth * (ZOOM - 1),
      y: -ny * shot.offsetHeight * (ZOOM - 1),
      duration: 0.5, ease: 'power3.out', overwrite: 'auto',
    });
  }
  function setZoom(on, e) {
    if (on === zoomed) return;
    zoomed = on;
    shot.classList.toggle('is-zoomed', on);
    if (on) {
      gsap.to(shot, { rotationX: 0, rotationY: 0, duration: 0.4, overwrite: 'auto' });
      gsap.to(imgEl, { scale: ZOOM, duration: 0.75, ease: 'expo.out', overwrite: 'auto' });
      if (e) {
        const r = frame.getBoundingClientRect();
        pan((e.clientX - r.left) / r.width - 0.5, (e.clientY - r.top) / r.height - 0.5);
      }
    } else {
      gsap.to(imgEl, { scale: 1, x: 0, y: 0, duration: 0.6, ease: 'expo.inOut', overwrite: 'auto' });
    }
  }
  shot.addEventListener('pointermove', (e) => {
    if (!ready || busy || e.pointerType !== 'mouse') return;
    const r = frame.getBoundingClientRect(); // frame tidak ikut tilt → stabil
    const nx = (e.clientX - r.left) / r.width - 0.5;
    const ny = (e.clientY - r.top) / r.height - 0.5;
    glare.style.setProperty('--gx', (nx + 0.5) * 100 + '%');
    glare.style.setProperty('--gy', (ny + 0.5) * 100 + '%');
    if (zoomed) pan(nx, ny);
    else gsap.to(shot, { rotationY: nx * 9, rotationX: -ny * 7, duration: 0.6, ease: 'power3.out', overwrite: 'auto' });
  });
  shot.addEventListener('pointerleave', () => {
    if (!zoomed) gsap.to(shot, { rotationX: 0, rotationY: 0, duration: 0.9, ease: 'elastic.out(1, 0.5)', overwrite: 'auto' });
  });
  shot.addEventListener('click', (e) => { if (ready && !busy && !dragged) setZoom(!zoomed, e); });

  /* ---------- event handler tombol & navigasi keyboard ---------- */
  btnClose.addEventListener('click', close);
  btnPrev.addEventListener('click', () => go(idx - 1, -1));
  btnNext.addEventListener('click', () => go(idx + 1, 1));
  [[btnPrev, -8], [btnNext, 8]].forEach(([b, dx]) => {
    b.addEventListener('pointerenter', () => ready && gsap.fromTo(b, { x: 0 }, { x: dx, duration: 0.5, ease: 'elastic.out(1, 0.4)' }));
    b.addEventListener('pointerleave', () => gsap.to(b, { x: 0, duration: 0.4, ease: 'power3.out' }));
  });
  box.addEventListener('click', (e) => {
    if (!e.target.closest('.lightbox__frame, .lightbox__cap, .lightbox__foot, button, a')) close();
  });

  addEventListener('keydown', (e) => {
    if (!isOpen || box.hidden) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowRight') go(idx + 1, 1);
    else if (e.key === 'ArrowLeft') go(idx - 1, -1);
    else if (e.key === 'Tab') {
      const f = [btnClose, btnPrev, btnNext, linkOpen, ...dotsEl.querySelectorAll('button')]
        .filter((el) => el && !el.hidden && el.offsetParent !== null);
      if (!f.length) return;
      const i = f.indexOf(document.activeElement);
      const n = e.shiftKey ? (i <= 0 ? f.length - 1 : i - 1) : (i === f.length - 1 ? 0 : i + 1);
      e.preventDefault();
      f[n].focus();
    }
  });

  // gestur touch/swipe pada layar sentuh: navigasi slide atau pan foto saat zoom
  const stage = q('.lightbox__stage');
  let t0 = null, panFrom = null, dragged = false;
  stage.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') return;
    t0 = { x: e.clientX, y: e.clientY };
    dragged = false;
    panFrom = zoomed ? { x: gsap.getProperty(imgEl, 'x'), y: gsap.getProperty(imgEl, 'y') } : null;
  });
  stage.addEventListener('pointermove', (e) => {
    if (!t0 || e.pointerType === 'mouse') return;
    const dx = e.clientX - t0.x, dy = e.clientY - t0.y;
    if (Math.abs(dx) + Math.abs(dy) > 10) dragged = true;
    if (zoomed && panFrom) {
      const mx = (shot.offsetWidth * (ZOOM - 1)) / 2;
      const my = (shot.offsetHeight * (ZOOM - 1)) / 2;
      gsap.set(imgEl, {
        x: Math.max(-mx, Math.min(mx, panFrom.x + dx)),
        y: Math.max(-my, Math.min(my, panFrom.y + dy)),
      });
    }
  });
  const endTouch = (e) => {
    if (!t0 || e.pointerType === 'mouse') return;
    const dx = e.clientX - t0.x, dy = e.clientY - t0.y;
    if (!zoomed && ready && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      go(idx + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
    }
    t0 = null; panFrom = null;
    setTimeout(() => { dragged = false; }, 60); // cegah event tap zoom terpicu setelah dragging
  };
  stage.addEventListener('pointerup', endTouch);
  stage.addEventListener('pointercancel', endTouch);

  /* --- trigger pembuka galeri pada kartu proyek ---
     resolusi sumber gambar:
       1) atribut data-images pada elemen HTML
       2) manifest.json berdasarkan key data-gallery
       3) fallback ke URL thumbnail data-preview */
  triggers.forEach((t) => {
    const key = t.getAttribute('data-gallery');
    const nameEl = t.querySelector('.ticket__name, b');
    const link = t.querySelector('a');
    const name = (t.getAttribute('data-title')
      || nameEl?.getAttribute('aria-label') || nameEl?.textContent || '').trim();
    const href = t.getAttribute('data-href') || (link ? link.href : '');
    const own = (t.getAttribute('data-images') || '').split(',').map((s) => s.trim()).filter(Boolean);
    const isFlag = t.classList.contains('flag__shots');
    t.addEventListener('click', (e) => {
      // izinkan default action browser jika klik disertai modifier key (misal Ctrl/Cmd + click)
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault(); // cegah navigasi langsung agar lightbox dapat terbuka terlebih dahulu
      if (isOpen || opening) return;
      const cr = t.getBoundingClientRect();
      let pt = { x: e.clientX, y: e.clientY };
      if (!e.clientX && !e.clientY) pt = { x: cr.left + cr.width / 2, y: cr.top + cr.height / 2 };
      const box2 = (b) => ({ left: b.left, top: b.top, width: b.width, height: b.height });
      let rect = null, srcEl = null, clicked = null;
      if (isFlag) {
        // simpan koordinat gambar yang diklik sebagai titik awal transisi shared-element
        clicked = e.target.closest ? e.target.closest('img') : null;
        srcEl = t.querySelector('.flag__plate') || clicked || t.querySelector('img');
        if (srcEl) { const b = srcEl.getBoundingClientRect(); if (b.width > 40) rect = box2(b); }
      } else {
        const pk = document.querySelector('.peek');
        const pf = pk && pk.querySelector('.peek__frame');
        if (pk && pf && pk.dataset.show === 'true' && !pk.hidden) {
          const b = pf.getBoundingClientRect();
          if (b.width > 40) rect = box2(b);
        }
      }
      getManifest().then(async (mf) => {
        let urls = [...new Set([...own, ...((mf && mf[key]) || [])])];
        if (!urls.length) {
          const pv = t.getAttribute('data-preview');
          urls = pv ? [pv] : [];
        }
        let start = 0;
        if (clicked) {
          const s = clicked.getAttribute('src');
          const i = urls.findIndex((u) => u === s);
          if (i > 0) start = i;
        }
        const ok = await openGallery(urls, name, { pt, rect, srcEl }, href, start);
        if (!ok && href) window.location.href = href;
      });
    });
    // aksesibilitas keyboard: picu click pada key Enter atau Space
    if (isFlag) {
      t.addEventListener('keydown', (e) => {
        if (e.target === t && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); t.click(); }
      });
    }
    // pemanas: manifest + 2 gambar pertama diunduh saat hover/fokus,
    // jadi klik tidak menunggu fetch + decode dari nol
    let warmed = false;
    const warm = () => {
      if (warmed) return; warmed = true;
      const pv0 = t.getAttribute('data-preview');
      if (pv0) decode(pv0);
      getManifest().then((mf) => {
        const urls = [...new Set([...own, ...((mf && mf[key]) || [])])];
        (urls.length ? urls : (pv0 ? [pv0] : [])).slice(0, 2).forEach((u) => decode(u));
      });
    };
    t.addEventListener('pointerenter', warm, { passive: true });
    t.addEventListener('focusin', warm);
  });
  (window.requestIdleCallback || ((fn) => setTimeout(fn, 1200)))(() => getManifest());
})();

/* animasi khusus proyek unggulan (SnapCal & Lumimi):
   - reveal judul per karakter, animasi stamp mendarat, dan efek magnetik link
   - SnapCal: animasi 3 screenshot HP membuka seperti kipas + scroll parallax
   - Lumimi: curtain reveal, bracket ornamen, glare mouse, dan parallax
   - floating cursor pill saat mouse berada di atas area screenshot */
(() => {
  if (prm) return;
  const flags = gsap.utils.toArray('.flag');
  if (!flags.length) return;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const chip = document.querySelector('.flag-cursor');

  function splitChars(el) {
    const text = el.textContent;
    el.setAttribute('aria-label', text);
    el.textContent = '';
    return [...text].map((c) => {
      const s = document.createElement('span');
      s.className = 'fx-ch';
      s.setAttribute('aria-hidden', 'true');
      s.textContent = c === ' ' ? '\u00a0' : c;
      el.appendChild(s);
      return s;
    });
  }
  function splitTags(p) {
    const parts = p.textContent.split(' · ').map((s) => s.trim()).filter(Boolean);
    p.textContent = '';
    return parts.map((t, i) => {
      if (i) p.appendChild(document.createTextNode(' · '));
      const s = document.createElement('span');
      s.className = 'tg';
      s.textContent = t;
      p.appendChild(s);
      return s;
    });
  }

  const leaveFns = [];

  flags.forEach((flag) => {
    const h3 = flag.querySelector('.flag__head h3');
    const stamp = flag.querySelector('.stamp');
    const shots = flag.querySelector('.flag__shots');
    const imgs = shots ? [...shots.querySelectorAll('img')] : [];
    const lede = flag.querySelector('.flag__lede');
    const items = flag.querySelectorAll('.changelog li');
    const tagsP = flag.querySelector('.tags');
    const links = flag.querySelectorAll('.flag__links a');

    const chars = h3 ? splitChars(h3) : [];
    const tgs = tagsP ? splitTags(tagsP) : [];

    // inisialisasi posisi awal sebelum animasi scroll trigger terpicu
    gsap.set(chars, { yPercent: 115, rotation: 9 });
    if (stamp) gsap.set(stamp, { scale: 2.4, rotation: -18, opacity: 0 });
    if (lede) gsap.set(lede, { clipPath: 'inset(0% 0% 100% 0%)', y: 18, opacity: 0 });
    gsap.set(items, { x: -30, opacity: 0 });
    gsap.set(tgs, { y: 14, opacity: 0 });
    gsap.set(links, { y: 18, opacity: 0 });

    const tl = gsap.timeline({
      scrollTrigger: { trigger: flag, start: 'top 78%', once: true },
      defaults: { ease: 'power3.out' },
    });
    tl.to(chars, { yPercent: 0, rotation: 0, duration: 0.85, stagger: 0.045, ease: 'power4.out' }, 0);
    if (stamp) {
      tl.to(stamp, { scale: 1, rotation: -1.5, opacity: 1, duration: 0.32, ease: 'power4.in' }, 0.4)
        .add(() => {
          // efek getar/bounce saat stempel mendarat
          gsap.fromTo(flag, { y: 0 }, { keyframes: [{ y: 6, duration: 0.06 }, { y: -3, duration: 0.09 }, { y: 0, duration: 0.2 }] });
          gsap.fromTo(stamp, { scale: 1.1 }, { scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.4)' });
        }, 0.72);
    }
    if (lede) tl.to(lede, { clipPath: 'inset(0% 0% 0% 0%)', y: 0, opacity: 1, duration: 0.9, clearProps: 'clipPath' }, 0.5);
    tl.to(items, { x: 0, opacity: 1, duration: 0.6, stagger: 0.09 }, 0.65)
      .to(tgs, { y: 0, opacity: 1, duration: 0.45, stagger: 0.035 }, 0.95)
      .to(links, { y: 0, opacity: 1, duration: 0.55, stagger: 0.08, ease: 'back.out(2.2)' }, 1.05);
    flag.classList.add('is-in');

    /* --- interaksi hover bounce pada tag keahlian --- */
    if (fine) {
      tgs.forEach((tg) => {
        tg.addEventListener('pointerenter', () => gsap.fromTo(tg, { y: 0 }, { y: -4, duration: 0.4, ease: 'back.out(3)', overwrite: 'auto' }));
        tg.addEventListener('pointerleave', () => gsap.to(tg, { y: 0, duration: 0.3, overwrite: 'auto' }));
      });
      // efek magnetic cursor pada link tombol proyek
      links.forEach((a) => {
        const qx = gsap.quickTo(a, 'x', { duration: 0.5, ease: 'power3' });
        const qy = gsap.quickTo(a, 'y', { duration: 0.5, ease: 'power3' });
        a.addEventListener('pointermove', (e) => {
          const r = a.getBoundingClientRect();
          qx((e.clientX - (r.left + r.width / 2)) * 0.3);
          qy((e.clientY - (r.top + r.height / 2)) * 0.5);
        });
        a.addEventListener('pointerleave', () => { qx(0); qy(0); });
      });
    }

    if (!shots || !imgs.length) return;

    /* --- floating pill cursor 'Lihat' pada screenshot unggulan --- */
    if (fine && chip) {
      root.classList.add('chip-on');
      const cx = gsap.quickTo(chip, 'x', { duration: 0.4, ease: 'power3' });
      const cy = gsap.quickTo(chip, 'y', { duration: 0.4, ease: 'power3' });
      shots.addEventListener('pointerenter', (e) => {
        gsap.set(chip, { x: e.clientX, y: e.clientY });
        gsap.to(chip, { scale: 1, opacity: 1, duration: 0.45, ease: 'back.out(2.4)', overwrite: 'auto' });
      });
      shots.addEventListener('pointermove', (e) => { cx(e.clientX); cy(e.clientY); });
      shots.addEventListener('pointerleave', () => gsap.to(chip, { scale: 0, opacity: 0, duration: 0.25, overwrite: 'auto' }));
      shots.addEventListener('pointerdown', () => gsap.fromTo(chip, { scale: 1 }, { scale: 0.78, duration: 0.1, yoyo: true, repeat: 1 }));
    }

    const plate = shots.querySelector('.flag__plate');

    /* === animasi SnapCal: fanning out 3 screenshot HP === */
    if (!plate && imgs.length > 1) {
      const c = Math.floor(imgs.length / 2);
      const mid = (el) => el.offsetLeft + el.offsetWidth / 2;
      const rest = imgs.map((_, i) => ({ rot: (i - c) * 3, y: i === c ? 0 : 6 }));
      const spread = imgs.map((_, i) => ({ x: (i - c) * 20, rot: (i - c) * 9, y: i === c ? -14 : -2 }));
      const depth = imgs.map((_, i) => (i === c ? 1 : 0.6));
      imgs.forEach((img, i) => {
        gsap.set(img, {
          transformPerspective: 900, zIndex: i === c ? 3 : 1,
          x: mid(imgs[c]) - mid(img), y: 56, rotation: (i - c) * -15,
          scale: 0.9, opacity: 0,
        });
      });
      const sorted = imgs.map((_, i) => i).sort((a, b) => Math.abs(a - c) - Math.abs(b - c));
      sorted.forEach((i, n) => {
        const img = imgs[i];
        const at = 0.2 + n * 0.3;
        if (i === c) {
          tl.to(img, { y: rest[i].y, scale: 1, rotation: rest[i].rot, opacity: 1, duration: 0.8, ease: 'back.out(1.7)' }, at);
        } else {
          tl.to(img, { opacity: 1, duration: 0.2, ease: 'none' }, at)
            .to(img, { x: 0, y: rest[i].y, scale: 1, rotation: rest[i].rot, duration: 1.2, ease: 'elastic.out(1, 0.6)' }, at);
        }
      });
      // scroll parallax dengan kecepatan berbeda antar layer gambar
      imgs.forEach((img, i) => {
        const d = i === c ? 12 : 5;
        gsap.fromTo(img, { yPercent: d }, {
          yPercent: -d, ease: 'none',
          scrollTrigger: { trigger: shots, start: 'top bottom', end: 'bottom top', scrub: true },
        });
      });

      if (fine) {
        let hot = -1;
        let open = false;
        const toRest = () => {
          open = false; hot = -1;
          imgs.forEach((img, i) => gsap.to(img, {
            x: 0, y: rest[i].y, rotation: rest[i].rot, rotationX: 0, rotationY: 0, scale: 1, opacity: 1,
            zIndex: i === c ? 3 : 1, duration: 0.9, ease: 'elastic.out(1, 0.55)', overwrite: 'auto',
          }));
        };
        shots.addEventListener('pointerenter', () => {
          open = true;
          imgs.forEach((img, i) => gsap.to(img, {
            x: spread[i].x, y: spread[i].y, rotation: spread[i].rot,
            duration: 0.8, ease: 'elastic.out(1, 0.55)', overwrite: 'auto',
          }));
        });
        shots.addEventListener('pointermove', (e) => {
          if (!open) return;
          const r = shots.getBoundingClientRect();
          const nx = (e.clientX - r.left) / r.width - 0.5;
          const ny = (e.clientY - r.top) / r.height - 0.5;
          const over = imgs.indexOf(e.target.closest('img'));
          imgs.forEach((img, i) => {
            const isHot = over === i;
            gsap.to(img, {
              x: spread[i].x + nx * 14 * depth[i],
              rotationY: nx * 14 * depth[i],
              rotationX: -ny * 9 * depth[i],
              scale: over < 0 ? 1 : (isHot ? 1.08 : 0.96),
              opacity: over < 0 || isHot ? 1 : 0.72,
              zIndex: isHot ? 6 : (i === c ? 3 : 1),
              duration: 0.55, ease: 'power3.out', overwrite: 'auto',
            });
          });
          hot = over;
        });
        shots.addEventListener('pointerleave', toRest);
        leaveFns.push(() => { toRest(); });
      }
      return;
    }

    /* === animasi Lumimi: curtain reveal frame proyek desktop === */
    if (plate) {
      const img = plate.querySelector('img');
      const curtain = shots.querySelector('.flag__curtain');
      const corners = shots.querySelectorAll('.flag__corner');
      const glare = shots.querySelector('.flag__glare');
      gsap.set(plate, { transformPerspective: 1000 });
      gsap.set(img, { scale: 1.3, opacity: 0 });
      gsap.set(curtain, { scaleX: 0, transformOrigin: '0% 50%' });
      gsap.set(corners, { scale: 0, opacity: 0 });

      tl.to(curtain, { scaleX: 1, duration: 0.55, ease: 'power3.inOut' }, 0.15)
        .set(img, { opacity: 1 }, 0.7)
        .set(curtain, { transformOrigin: '100% 50%' }, 0.7)
        .to(curtain, { scaleX: 0, duration: 0.7, ease: 'power3.inOut' }, 0.7)
        .to(img, { scale: 1.1, duration: 1.5, ease: 'power3.out' }, 0.7)
        .to(corners, { scale: 1, opacity: 1, duration: 0.55, stagger: 0.07, ease: 'back.out(2.6)' }, 1.15);

      // parallax vertikal halus pada screenshot di dalam frame
      gsap.fromTo(img, { yPercent: -4 }, {
        yPercent: 4, ease: 'none',
        scrollTrigger: { trigger: shots, start: 'top bottom', end: 'bottom top', scrub: true },
      });

      if (fine) {
        shots.addEventListener('pointermove', (e) => {
          const r = shots.getBoundingClientRect();
          const nx = (e.clientX - r.left) / r.width - 0.5;
          const ny = (e.clientY - r.top) / r.height - 0.5;
          if (glare) {
            glare.style.setProperty('--gx', (nx + 0.5) * 100 + '%');
            glare.style.setProperty('--gy', (ny + 0.5) * 100 + '%');
          }
          gsap.to(plate, { rotationY: nx * 9, rotationX: -ny * 7, duration: 0.6, ease: 'power3.out', overwrite: 'auto' });
          gsap.to(img, { x: -nx * 16, duration: 0.8, ease: 'power3.out', overwrite: 'auto' });
        });
        const back = () => {
          gsap.to(plate, { rotationX: 0, rotationY: 0, duration: 1, ease: 'elastic.out(1, 0.5)', overwrite: 'auto' });
          gsap.to(img, { x: 0, duration: 0.6, overwrite: 'auto' });
        };
        shots.addEventListener('pointerleave', back);
        leaveFns.push(back);
      }
    }
  });

  // sembunyikan kursor custom saat lightbox aktif
  document.addEventListener('peek:kill', () => {
    leaveFns.forEach((fn) => fn());
    if (chip) gsap.to(chip, { scale: 0, opacity: 0, duration: 0.2, overwrite: 'auto' });
  });
  if (chip) gsap.set(chip, { xPercent: -50, yPercent: -50, scale: 0, opacity: 0 });
})();

/* inisialisasi animasi intro dan ScrollTrigger halaman */
if (prm) {
  gsap.set('.reveal, .cover__kicker, .cover__body, .cover__body > *, .cover__photo, .cover__scroll, .cover__line > span', { clearProps: 'all', opacity: 1 });
  document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-in'));
} else {
  gsap.defaults({ ease: 'power3.out' });

  /* timeline animasi pembuka (hero cover section) */
  const introTl = gsap.timeline({ delay: 0.1 });

  // intro: kicker dan status open to work muncul meluncur
  introTl.from('.cover__kicker', { yPercent: -40, opacity: 0, duration: 0.6 });

  // intro: baris tipografi nama muncul naik (masking via overflow-hidden)
  introTl.from('.cover__line > span', {
    yPercent: 110,
    rotation: 2,
    duration: 0.9,
    ease: 'power4.out',
    stagger: 0.09,
  }, '-=0.25');

  // intro: deskripsi bio dan tombol aksi fade-in bertahap
  introTl.from('.cover__body > *', {
    y: 22, opacity: 0, duration: 0.7, stagger: 0.1,
  }, '-=0.5');

  // intro: foto potret muncul dari bawah dengan scale-up halus
  introTl.from('.cover__photo', {
    y: 40, opacity: 0, scale: 0.94, duration: 0.9, ease: 'power3.out',
  }, '-=0.8');

  // intro: indikator scroll ke bawah
  introTl.from('.cover__scroll', { opacity: 0, y: 10, duration: 0.5 }, '-=0.3');

  // loop animasi float naik-turun pada teks indikator scroll
  gsap.to('.cover__scroll', {
    y: 6, repeat: -1, yoyo: true, duration: 1.1, ease: 'sine.inOut', delay: 1.6,
  });

  /* efek parallax saat scroll pada foto dan tipografi cover */
  gsap.to('.cover__photo img', {
    yPercent: 18,
    ease: 'none',
    scrollTrigger: { trigger: '.cover', start: 'top top', end: 'bottom top', scrub: true },
  });
  gsap.to('.cover__name', {
    yPercent: -8,
    ease: 'none',
    scrollTrigger: { trigger: '.cover', start: 'top top', end: 'bottom top', scrub: true },
  });

  /* reveal header section (nomor dan judul) saat memasuki viewport */
  gsap.utils.toArray('.sechead').forEach((head) => {
    const st = { trigger: head, start: 'top 85%' };
    gsap.from(head.querySelector('.sechead__no'), {
      scrollTrigger: st, scale: 0, rotation: -120, opacity: 0, duration: 0.7, ease: 'back.out(1.7)',
    });
    gsap.from(head.querySelector('.sechead__title'), {
      scrollTrigger: st, x: -40, opacity: 0, duration: 0.8,
    });
    const meta = head.querySelector('.sechead__meta');
    if (meta) gsap.from(meta, { scrollTrigger: st, x: 30, opacity: 0, duration: 0.8 });
  });

  /* reveal bertahap elemen konten saat di-scroll */

  // kartu proyek Android meluncur masuk dari sisi kiri
  gsap.utils.toArray('.ticket').forEach((item) => {
    gsap.from(item, {
      scrollTrigger: { trigger: item, start: 'top 88%' },
      x: -36, opacity: 0, duration: 0.6,
    });
    item.classList.add('is-in');
  });

  // daftar indeks proyek web/backend muncul bertahap (stagger)
  const idx = gsap.utils.toArray('.index li');
  if (idx.length) {
    gsap.from(idx, {
      scrollTrigger: { trigger: '.index', start: 'top 85%' },
      y: 20, opacity: 0, duration: 0.5, stagger: 0.05,
    });
    idx.forEach((el) => el.classList.add('is-in'));
  }

  // baris tabel spesifikasi masuk dari sisi kiri
  gsap.utils.toArray('.specsheet__row').forEach((row) => {
    gsap.from(row, {
      scrollTrigger: { trigger: row, start: 'top 88%' },
      x: -28, opacity: 0, duration: 0.6,
    });
    row.classList.add('is-in');
  });

  /* linimasa riwayat: item masuk berselingan kiri/kanan */
  const tl = document.querySelector('.timeline');
  if (tl) {
    gsap.utils.toArray('.timeline li').forEach((li, i) => {
      gsap.from(li, {
        scrollTrigger: { trigger: li, start: 'top 85%' },
        x: i % 2 ? 40 : -40, opacity: 0, duration: 0.7,
      });
      gsap.from(li.querySelector('.timeline__v'), {
        scrollTrigger: { trigger: li, start: 'top 85%' },
        scale: 0, rotation: -14, duration: 0.6, ease: 'back.out(2)', delay: 0.1,
      });
      li.classList.add('is-in');
    });
    // progres garis linimasa dikontrol dengan mengubah variabel css --line
    gsap.fromTo(tl, { '--line': '0%' }, {
      '--line': '100%', ease: 'none',
      scrollTrigger: { trigger: tl, start: 'top 70%', end: 'bottom 70%', scrub: true },
    });
  }

  /* reveal section kontak saat mendekati bagian bawah halaman */
  const contact = document.querySelector('.contact');
  if (contact) {
    gsap.from('.contact__lede', {
      scrollTrigger: { trigger: contact, start: 'top 75%' }, y: 30, opacity: 0, duration: 0.8,
    });
    gsap.from('.contact__mail', {
      scrollTrigger: { trigger: contact, start: 'top 70%' }, scale: 0.92, opacity: 0, duration: 0.8, ease: 'back.out(1.4)',
    });
    gsap.from('.contact__links li', {
      scrollTrigger: { trigger: '.contact__links', start: 'top 88%' },
      y: 18, opacity: 0, duration: 0.5, stagger: 0.08,
    });
  }

  /* efek magnetic cursor pada tombol hero CTA */
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.querySelectorAll('.cover__cta .btn').forEach((btn) => {
      const strength = 0.35;
      btn.addEventListener('mousemove', (e) => {
        const r = btn.getBoundingClientRect();
        gsap.to(btn, {
          x: (e.clientX - r.left - r.width / 2) * strength,
          y: (e.clientY - r.top - r.height / 2) * strength,
          duration: 0.4, ease: 'power2.out',
        });
      });
      btn.addEventListener('mouseleave', () => {
        gsap.to(btn, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1,0.4)' });
      });
    });
  }

  /* auto-hide navbar: sembunyi saat scroll ke bawah, muncul saat scroll ke atas */
  const masthead = document.querySelector('.masthead');
  if (masthead) {
    const show = gsap.to(masthead, { yPercent: -100, paused: true, duration: 0.35, ease: 'power2.inOut' });
    ScrollTrigger.create({
      start: 'top -120',
      end: 'max',
      onUpdate: (self) => {
        if (self.direction === 1 && self.scroll() > 200) show.play();
        else show.reverse();
      },
    });
  }

  // kalkulasi ulang koordinat ScrollTrigger setelah seluruh aset halaman selesai dimuat
  window.addEventListener('load', () => ScrollTrigger.refresh());
}