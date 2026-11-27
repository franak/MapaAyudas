#!/usr/bin/env node
/**
 * Generador estático del blog.
 *
 *   content/blog/*.md  ->  public/blog/index.html
 *                          public/blog/<slug>/index.html
 *                          public/blog/rss.xml
 *                          bloque <!-- blog:start/end --> de public/sitemap.xml
 *
 * Uso:  npm run build:blog            (solo publicados)
 *       npm run build:blog -- --drafts (incluye borradores, solo para previsualizar)
 *
 * Frontmatter YAML por artículo: ver content/README.md
 */
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { Marked } = require('marked');

const ROOT = path.join(__dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'content', 'blog');
const OUT_DIR = path.join(ROOT, 'public', 'blog');
const SITEMAP = path.join(ROOT, 'public', 'sitemap.xml');
const SITE = 'https://isamart.es';
const OG_DEFAULT = `${SITE}/landing/og-image.jpg`;
const WITH_DRAFTS = process.argv.includes('--drafts');

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slugify = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const fmtDate = (iso) => new Date(iso + 'T12:00:00Z').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const stripMd = (s) => s.replace(/```[\s\S]*?```/g, ' ').replace(/[#>*_`\[\]\(\)!-]/g, ' ');

// ── Lectura de artículos ─────────────────────────────────────────────────────
function parseFile(file) {
  const raw = fs.readFileSync(path.join(CONTENT_DIR, file), 'utf8');
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) throw new Error(`${file}: falta el frontmatter (--- ... ---)`);
  const meta = yaml.load(m[1]) || {};
  const body = m[2].trim();
  for (const k of ['title', 'description', 'date']) {
    if (!meta[k]) throw new Error(`${file}: falta el campo obligatorio "${k}"`);
  }
  const date = meta.date instanceof Date ? meta.date.toISOString().slice(0, 10) : String(meta.date);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`${file}: "date" debe tener formato YYYY-MM-DD`);
  let updated = meta.updated instanceof Date ? meta.updated.toISOString().slice(0, 10) : (meta.updated ? String(meta.updated) : date);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(updated)) throw new Error(`${file}: "updated" debe tener formato YYYY-MM-DD`);
  const slug = slugify(meta.slug || file.replace(/\.md$/, ''));
  const words = stripMd(body).split(/\s+/).filter(Boolean).length;
  return {
    file, slug, title: String(meta.title), description: String(meta.description),
    date, updated, tags: (meta.tags || []).map(String), keyword: meta.keyword ? String(meta.keyword) : '',
    image: meta.image ? String(meta.image) : '', draft: meta.draft === true,
    body, readingMin: Math.max(1, Math.round(words / 200)),
  };
}

// ── Markdown -> HTML (h2/h3 con id para anclas) ─────────────────────────────
function render(body) {
  const marked = new Marked();
  const used = new Set();
  const toc = [];
  marked.use({
    renderer: {
      heading(text, level, raw) {
        if (level !== 2 && level !== 3) return `<h${level}>${text}</h${level}>\n`;
        let id = slugify(raw) || 'seccion';
        let n = 2; const base = id;
        while (used.has(id)) id = `${base}-${n++}`;
        used.add(id);
        if (level === 2) toc.push({ id, text: raw });
        return `<h${level} id="${id}">${text}</h${level}>\n`;
      },
      link(href, title, text) {
        const external = /^https?:\/\//.test(href) && !href.startsWith(SITE);
        return `<a href="${esc(href)}"${title ? ` title="${esc(title)}"` : ''}${external ? ' target="_blank" rel="noopener"' : ''}>${text}</a>`;
      },
    },
  });
  return { html: marked.parse(body), toc };
}

// ── Piezas comunes de plantilla ──────────────────────────────────────────────
const HEADER = `
  <a href="#main" class="skip-link">Ir al contenido</a>
  <header class="lp-header" aria-label="cabecera">
    <div class="container header-inner">
      <a href="/"><img src="/recursos/IsamartLargoTexto.png" alt="ISAMART" class="lp-logo" /></a>
      <nav class="lp-nav" aria-label="navegación principal">
        <a href="/mapaayudas/">Mapa de Ayudas</a>
        <a href="/blog/">Blog</a>
        <a href="/#informacion">Solicitar información</a>
      </nav>
    </div>
  </header>`;

const FOOTER = `
  <div id="cookie-banner" class="cookie-banner" style="display: none;">
    <div class="cookie-content">
      <div class="cookie-text">
        <h3>Uso de cookies</h3>
        <p>Utilizamos cookies propias para mejorar tu experiencia y, con tu consentimiento, cookies de análisis. Más detalles en nuestra <a href="/legal/cookies.html" target="_blank">Política de Cookies</a>.</p>
      </div>
      <div class="cookie-buttons">
        <button id="cookie-accept" class="btn btn-primary btn-small">Aceptar</button>
        <button id="cookie-reject" class="btn btn-secondary btn-small">Rechazar</button>
      </div>
    </div>
  </div>
  <footer class="lp-footer" aria-label="pie de página">
    <div class="container">
      <p>&copy; ${new Date().getFullYear()} ISAMART. Todos los derechos reservados.</p>
      <p>
        <a href="/legal/aviso-legal.html">Aviso Legal</a> ·
        <a href="/legal/privacidad.html">Política de Privacidad</a> ·
        <a href="/legal/cookies.html">Política de Cookies</a>
      </p>
    </div>
  </footer>
  <script src="/landing/js/landing.js"></script>`;

function page({ title, description, canonical, ogType, image, robots, jsonld, body }) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}" />
  ${robots ? `<meta name="robots" content="${robots}" />\n  ` : ''}<link rel="canonical" href="${canonical}" />
  <link rel="alternate" type="application/rss+xml" title="Blog ISAMART" href="${SITE}/blog/rss.xml" />

  <meta property="og:type" content="${ogType}" />
  <meta property="og:locale" content="es_ES" />
  <meta property="og:site_name" content="ISAMART Rehabilitación Energética" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:url" content="${canonical}" />
  <meta property="og:image" content="${image}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(description)}" />
  <meta name="twitter:image" content="${image}" />

  <script type="application/ld+json">
${JSON.stringify(jsonld, null, 2).replace(/</g, '\\u003c')}
  </script>

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Raleway:wght@300;400;600;700&family=Open+Sans:wght@400;500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/landing/css/landing.css" />
  <link rel="stylesheet" href="/landing/css/blog.css" />
  <script src="/js/analytics.js" defer></script>
</head>
<body>${HEADER}
${body}
${FOOTER}
</body>
</html>
`;
}

const abs = (u) => (/^https?:\/\//.test(u) ? u : SITE + (u.startsWith('/') ? u : '/' + u));
const ORG = { '@type': 'Organization', '@id': `${SITE}/#organization`, name: 'ISAMART', url: SITE + '/', logo: { '@type': 'ImageObject', url: `${SITE}/recursos/IsamartLargoTexto.png` } };

function card(p) {
  return `<article class="post-card">
        <p class="post-meta"><time datetime="${p.date}">${fmtDate(p.date)}</time> · ${p.readingMin} min de lectura</p>
        <h2><a href="/blog/${p.slug}/">${esc(p.title)}</a></h2>
        <p>${esc(p.description)}</p>
        ${p.tags.length ? `<p class="post-tags">${p.tags.map((t) => `<span>${esc(t)}</span>`).join('')}</p>` : ''}
      </article>`;
}

function articlePage(p, all) {
  const { html, toc } = render(p.body);
  const url = `${SITE}/blog/${p.slug}/`;
  const image = p.image ? abs(p.image) : OG_DEFAULT;
  const related = all.filter((o) => o.slug !== p.slug && o.tags.some((t) => p.tags.includes(t))).slice(0, 3);
  const jsonld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BlogPosting', headline: p.title, description: p.description, inLanguage: 'es',
        datePublished: p.date, dateModified: p.updated, image, mainEntityOfPage: url,
        author: { '@id': `${SITE}/#organization` }, publisher: ORG,
        ...(p.tags.length ? { keywords: p.tags.join(', ') } : {}),
      },
      {
        '@type': 'BreadcrumbList', itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Inicio', item: SITE + '/' },
          { '@type': 'ListItem', position: 2, name: 'Blog', item: SITE + '/blog/' },
          { '@type': 'ListItem', position: 3, name: p.title, item: url },
        ],
      },
    ],
  };
  const body = `
  <main id="main" class="blog-main">
    <article class="container blog-article">
      <nav class="breadcrumbs" aria-label="Migas de pan"><a href="/">Inicio</a> › <a href="/blog/">Blog</a> › <span>${esc(p.title)}</span></nav>
      <h1>${esc(p.title)}</h1>
      <p class="post-meta">Publicado el <time datetime="${p.date}">${fmtDate(p.date)}</time>${p.updated !== p.date ? ` · Actualizado el <time datetime="${p.updated}">${fmtDate(p.updated)}</time>` : ''} · ${p.readingMin} min de lectura</p>
      ${toc.length > 2 ? `<nav class="post-toc" aria-label="Índice"><strong>En este artículo</strong><ol>${toc.map((t) => `<li><a href="#${t.id}">${esc(t.text)}</a></li>`).join('')}</ol></nav>` : ''}
      <div class="post-content">
${html}
      </div>
      <aside class="post-cta" aria-label="Solicitar información">
        <h2>¿Quieres saber qué ayudas te corresponden?</h2>
        <p>En ISAMART, como agente rehabilitador, analizamos tu caso y te acompañamos en toda la tramitación.</p>
        <p><a class="btn btn-primary" href="/#informacion">Solicitar información</a> <a class="btn btn-secondary" href="/mapaayudas/">Ver convocatorias abiertas</a></p>
      </aside>
      ${related.length ? `<section class="post-related"><h2>Te puede interesar</h2><div class="post-list">${related.map(card).join('\n')}</div></section>` : ''}
    </article>
  </main>`;
  return page({ title: `${p.title} | Blog ISAMART`, description: p.description, canonical: url, ogType: 'article', image, jsonld, body });
}

function indexPage(posts) {
  const url = `${SITE}/blog/`;
  const jsonld = {
    '@context': 'https://schema.org', '@type': 'Blog', name: 'Blog ISAMART', url, inLanguage: 'es', publisher: ORG,
    description: 'Guías y novedades sobre ayudas y subvenciones para la rehabilitación energética de viviendas y edificios en Madrid.',
  };
  const body = `
  <main id="main" class="blog-main">
    <div class="container">
      <h1>Blog de rehabilitación energética</h1>
      <p class="lead">Guías, plazos y novedades sobre ayudas y subvenciones para rehabilitar tu vivienda o edificio en Madrid.</p>
      ${posts.length
        ? `<div class="post-list">${posts.map(card).join('\n')}</div>`
        : '<p class="post-empty">Estamos preparando los primeros artículos. Mientras tanto, consulta las <a href="/mapaayudas/">convocatorias abiertas</a>.</p>'}
    </div>
  </main>`;
  return page({
    title: 'Blog de ayudas a la rehabilitación energética en Madrid | ISAMART',
    description: jsonld.description, canonical: url, ogType: 'website', image: OG_DEFAULT,
    robots: posts.length ? '' : 'noindex, follow', jsonld, body,
  });
}

function rss(posts) {
  const items = posts.slice(0, 20).map((p) => `    <item>
      <title>${esc(p.title)}</title>
      <link>${SITE}/blog/${p.slug}/</link>
      <guid isPermaLink="true">${SITE}/blog/${p.slug}/</guid>
      <pubDate>${new Date(p.date + 'T12:00:00Z').toUTCString()}</pubDate>
      <description>${esc(p.description)}</description>
    </item>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Blog ISAMART</title>
    <link>${SITE}/blog/</link>
    <description>Ayudas y subvenciones para la rehabilitación energética en Madrid.</description>
    <language>es-ES</language>
${items}
  </channel>
</rss>
`;
}

function updateSitemap(posts) {
  const START = '<!-- blog:start -->', END = '<!-- blog:end -->';
  let xml = fs.readFileSync(SITEMAP, 'utf8');
  const entries = posts.length
    ? [`  <url>\n    <loc>${SITE}/blog/</loc>\n    <lastmod>${posts[0].updated}</lastmod>\n    <priority>0.8</priority>\n  </url>`]
        .concat(posts.map((p) => `  <url>\n    <loc>${SITE}/blog/${p.slug}/</loc>\n    <lastmod>${p.updated}</lastmod>\n    <priority>0.7</priority>\n  </url>`)).join('\n')
    : '';
  const block = `${START}\n${entries}${entries ? '\n' : ''}  ${END}`;
  if (xml.includes(START)) xml = xml.replace(new RegExp(`${START}[\\s\\S]*?${END}`), block);
  else xml = xml.replace('</urlset>', `  ${block}\n</urlset>`);
  fs.writeFileSync(SITEMAP, xml);
}

// ── Main ─────────────────────────────────────────────────────────────────────
function main() {
  const files = fs.existsSync(CONTENT_DIR) ? fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.md')) : [];
  const all = files.map(parseFile);
  const seen = new Set();
  for (const p of all) {
    if (seen.has(p.slug)) throw new Error(`Slug duplicado: ${p.slug}`);
    seen.add(p.slug);
  }
  const posts = all.filter((p) => WITH_DRAFTS || !p.draft).sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
  const today = new Date().toISOString().slice(0, 10);
  const future = posts.filter((p) => p.date > today && !WITH_DRAFTS);
  const live = posts.filter((p) => !future.includes(p));

  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const p of live) {
    fs.mkdirSync(path.join(OUT_DIR, p.slug), { recursive: true });
    fs.writeFileSync(path.join(OUT_DIR, p.slug, 'index.html'), articlePage(p, live));
  }
  fs.writeFileSync(path.join(OUT_DIR, 'index.html'), indexPage(live));
  fs.writeFileSync(path.join(OUT_DIR, 'rss.xml'), rss(live));
  // Los borradores nunca entran en el sitemap
  updateSitemap(WITH_DRAFTS ? live.filter((p) => !p.draft) : live);

  console.log(`Blog: ${live.length} artículo(s) generados${future.length ? `, ${future.length} programado(s) para el futuro (omitidos)` : ''}${WITH_DRAFTS ? ' [incluye borradores]' : ''}.`);
}

main();
