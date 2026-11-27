/* Analítica con consentimiento (Google Analytics 4 directo + Consent Mode v2).
 * - Hasta que el usuario acepta las cookies NO se carga gtag.js ni se envía ningún evento.
 * - El consentimiento se guarda en localStorage('cookieConsent'): 'accepted' | 'true' = aceptado.
 * - Solo se concede analytics_storage; publicidad queda siempre denegada.
 * - Los eventos no incluyen datos personales (nombre, email, teléfono, texto libre).
 */
(function () {
  'use strict';

  var GA_ID = 'G-CWYC3QGKVC';
  var KEY = 'cookieConsent';
  var loaded = false;

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }

  // Consent Mode v2: todo denegado por defecto
  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied'
  });

  function hasConsent() {
    try {
      var v = localStorage.getItem(KEY);
      return v === 'accepted' || v === 'true';
    } catch (e) { return false; }
  }

  function load() {
    if (loaded || !hasConsent()) return;
    loaded = true;
    gtag('consent', 'update', { analytics_storage: 'granted' });
    gtag('js', new Date());
    gtag('config', GA_ID);
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);
  }

  function track(name, params) {
    if (!hasConsent()) return;
    gtag('event', name, params || {});
  }

  // Llamar cuando el usuario pulsa "Aceptar" en el banner
  function grant() {
    try { localStorage.setItem(KEY, 'accepted'); } catch (e) { /* sin storage */ }
    load();
  }

  window.isamartAnalytics = { track: track, grant: grant, hasConsent: hasConsent };

  // Clics automáticos: descargas, CTAs y contacto directo
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var href = a.getAttribute('href') || '';
    var text = (a.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80);

    if (/\.(pdf|xlsx?|docx?|zip)(\?|#|$)/i.test(href)) {
      track('file_download', {
        file_name: decodeURIComponent(href.split('/').pop().split(/[?#]/)[0]),
        link_text: text
      });
    } else if (href.indexOf('mailto:') === 0 || href.indexOf('tel:') === 0) {
      track('contact_click', { contact_type: href.split(':')[0] });
    } else if (href === '#informacion' || /^\/?mapaayudas\/?$/.test(href.replace(/^https?:\/\/[^/]+/, '')) || href.indexOf('/blog') === 0) {
      track('cta_click', { cta_text: text, cta_target: href });
    }
  });

  load();
})();
