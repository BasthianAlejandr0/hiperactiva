/* =========================================================
   Hiperactiva · interacciones del sitio
   ========================================================= */

const CONFIG = {
  // EDITAR: número de WhatsApp en formato internacional, sin "+" ni espacios.
  whatsapp: '56900000000',
  whatsappMessage: '¡Hola Hiperactiva! Vengo desde su sitio web y quiero cotizar un proyecto.',
  // EDITAR: endpoint que recibe el formulario (Formspree, Getform, Make, tu backend…).
  // Vacío = modo demo: muestra el mensaje de éxito pero no envía nada.
  formEndpoint: '',
};

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Analítica (GA4 / GTM) ---------- */
function track(event, params = {}) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...params });
  if (typeof window.gtag === 'function') window.gtag('event', event, params);
}

/* ---------- WhatsApp ---------- */
function whatsappUrl(message = CONFIG.whatsappMessage) {
  return `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(message)}`;
}

document.querySelectorAll('[data-wa]').forEach((link) => {
  link.href = whatsappUrl();
  link.addEventListener('click', () => track('whatsapp_click', { location: link.dataset.wa }));
});

/* ---------- Header: fondo al hacer scroll y se oculta al bajar ---------- */
const header = document.getElementById('header');
const waFloat = document.querySelector('.wa-float');
const contactSection = document.getElementById('contacto');
let lastY = window.scrollY;

function onScroll() {
  const y = window.scrollY;
  header.classList.toggle('is-scrolled', y > 24);
  const goingDown = y > lastY && y > 400;
  header.classList.toggle('is-hidden', goingDown && !document.body.classList.contains('menu-open'));
  lastY = y;
}
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// El botón flotante se oculta cuando el formulario de contacto está a la vista
if (waFloat && contactSection && 'IntersectionObserver' in window) {
  new IntersectionObserver(([entry]) => {
    waFloat.classList.toggle('is-hidden', entry.isIntersecting);
  }, { threshold: 0.25 }).observe(contactSection);
}

/* ---------- Menú móvil ---------- */
const menuToggle = document.querySelector('.menu-toggle');
const mobileMenu = document.getElementById('mobile-menu');

function setMenu(open) {
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
  mobileMenu.classList.toggle('is-open', open);
  document.body.classList.toggle('menu-open', open);
  if (open) header.classList.remove('is-hidden');
}

menuToggle.addEventListener('click', () => {
  setMenu(menuToggle.getAttribute('aria-expanded') !== 'true');
});
mobileMenu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && mobileMenu.classList.contains('is-open')) {
    setMenu(false);
    menuToggle.focus();
  }
});
window.matchMedia('(min-width: 961px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });

/* ---------- Enlace activo del menú según la sección visible ---------- */
// Se observan todas las secciones: las que no están en el menú (hero, contacto…) lo dejan sin activo
const navLinks = [...document.querySelectorAll('.nav a')];
const spySections = document.querySelectorAll('main section[id]');

if ('IntersectionObserver' in window) {
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navLinks.forEach((a) => {
        const active = a.getAttribute('href') === `#${entry.target.id}`;
        a.classList.toggle('is-active', active);
        if (active) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  spySections.forEach((s) => spy.observe(s));
}

/* ---------- Revelado al hacer scroll ---------- */
const revealEls = document.querySelectorAll('[data-reveal]');

if (prefersReducedMotion || !('IntersectionObserver' in window)) {
  revealEls.forEach((el) => el.classList.add('is-visible'));
} else {
  // Escalonado entre hermanos dentro de una misma grilla
  revealEls.forEach((el) => {
    const siblings = [...el.parentElement.children].filter((c) => c.hasAttribute('data-reveal'));
    const index = siblings.indexOf(el);
    if (index > 0) el.style.setProperty('--d', `${Math.min(index, 5) * 0.08}s`);
  });

  const revealer = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      obs.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  revealEls.forEach((el) => revealer.observe(el));
}

/* ---------- Badge del hero sigue levemente al cursor ---------- */
const badge = document.querySelector('.hero__badge');
const hero = document.querySelector('.hero');

if (badge && hero && !prefersReducedMotion && window.matchMedia('(pointer: fine)').matches) {
  hero.addEventListener('pointermove', (e) => {
    const r = hero.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    badge.style.transform = `translate(${x * -24}px, ${y * -24}px)`;
  });
  hero.addEventListener('pointerleave', () => { badge.style.transform = ''; });
}

/* ---------- Filtro de proyectos ---------- */
const filterButtons = document.querySelectorAll('[data-filter]');
const projects = document.querySelectorAll('.project');

filterButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const filter = btn.dataset.filter;
    filterButtons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    projects.forEach((p) => {
      const show = filter === 'todos' || p.dataset.cat === filter;
      p.classList.toggle('is-hidden', !show);
      if (show) p.classList.add('is-visible');
    });
  });
});

/* ---------- Formulario de contacto ---------- */
const form = document.getElementById('contact-form');
const success = document.getElementById('form-success');
const statusEl = form.querySelector('.form__status');
const submitBtn = form.querySelector('[type="submit"]');
const submitLabel = submitBtn.querySelector('.btn__label');
let triedSubmit = false;

const rules = {
  nombre: (v) => (v.trim().length >= 2 ? '' : 'Cuéntanos tu nombre.'),
  email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Revisa tu email, parece incompleto.'),
  telefono: (v) => (!v.trim() || v.replace(/\D/g, '').length >= 8 ? '' : 'Revisa el número (mínimo 8 dígitos).'),
  mensaje: (v) => (v.trim().length >= 10 ? '' : 'Cuéntanos un poco más (mínimo 10 caracteres).'),
  privacidad: (_, el) => (el.checked ? '' : 'Necesitamos tu autorización para responderte.'),
};

function validateField(name) {
  const el = form.elements[name];
  const message = rules[name](el.value, el);
  const errorEl = document.getElementById(`e-${name}`);
  el.setAttribute('aria-invalid', message ? 'true' : 'false');
  if (errorEl) errorEl.textContent = message;
  return !message;
}

function validateForm() {
  const results = Object.keys(rules).map(validateField);
  return results.every(Boolean);
}

Object.keys(rules).forEach((name) => {
  const el = form.elements[name];
  const evt = el.type === 'checkbox' ? 'change' : 'input';
  el.addEventListener(evt, () => { if (triedSubmit) validateField(name); });
  el.addEventListener('blur', () => { if (triedSubmit || el.value) validateField(name); });
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  triedSubmit = true;
  statusEl.textContent = '';
  statusEl.classList.remove('is-error');

  // Bots que llenan el campo trampa
  if (form.elements._gotcha.value) return;

  if (!validateForm()) {
    form.querySelector('[aria-invalid="true"]')?.focus();
    return;
  }

  const data = new FormData(form);
  submitBtn.disabled = true;
  submitLabel.textContent = 'Enviando…';

  try {
    if (CONFIG.formEndpoint) {
      const res = await fetch(CONFIG.formEndpoint, {
        method: 'POST',
        body: data,
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } else {
      console.info('[Hiperactiva] Formulario en modo demo: configura CONFIG.formEndpoint en assets/js/main.js para recibir los mensajes.');
      await new Promise((r) => setTimeout(r, 700));
    }

    track('generate_lead', { form: 'contacto', servicios: data.getAll('servicios').join(', ') });
    showSuccess(data);
  } catch (err) {
    statusEl.textContent = 'No pudimos enviar tu mensaje. Inténtalo de nuevo o escríbenos por WhatsApp.';
    statusEl.classList.add('is-error');
    submitBtn.disabled = false;
    submitLabel.textContent = 'Enviar mensaje';
  }
});

function showSuccess(data) {
  const firstName = String(data.get('nombre')).trim().split(/\s+/)[0];
  const services = data.getAll('servicios');

  success.querySelector('[data-success-name]').textContent = firstName ? `, ${firstName}` : '';

  // Mensaje de WhatsApp prellenado con lo que escribió la persona
  const waText = [
    `¡Hola Hiperactiva! Soy ${data.get('nombre')}.`,
    'Les acabo de escribir desde el formulario del sitio.',
    services.length ? `Me interesa: ${services.join(', ')}.` : '',
  ].filter(Boolean).join(' ');
  const waLink = document.getElementById('success-wa');
  waLink.href = whatsappUrl(waText);
  waLink.addEventListener('click', () => track('whatsapp_click', { location: 'form_success' }), { once: true });

  form.hidden = true;
  success.hidden = false;
  success.focus();
}

/* ---------- Año del footer ---------- */
document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
