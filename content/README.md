# Contenido del blog

Los artículos son archivos Markdown en `content/blog/`. El script `scripts/build-blog.js` los convierte en páginas estáticas dentro de `public/blog/` (que se versiona junto al resto del sitio).

## Publicar un artículo

1. Copia `content/blog/ejemplo-plantilla.md` con el nombre del slug (por ejemplo `ayudas-rehabilitacion-madrid-2026.md`; el nombre del archivo es la URL: `/blog/<slug>/`).
2. Rellena el frontmatter y escribe el texto.
3. Genera la portada y la miniatura: `python3 scripts/make-cover.py <slug>` (crea `public/recursos/blog/<slug>.jpg` y `<slug>-thumb.jpg`; puedes sustituirlas por imágenes propias de 1200×630 y 600×315). **Son obligatorias**: el build falla si faltan. Opcional: `imageAlt` en el frontmatter para el texto alternativo.
4. Ejecuta `npm run build:blog` y revisa el resultado en `http://localhost:3000/blog/`.
5. Haz commit del `.md`, de `public/blog/`, `public/recursos/blog/`, `public/sitemap.xml` **y** `public/index.html` (el build actualiza en la home la sección con las 3 últimas entradas).

Para previsualizar borradores: `npm run build:blog -- --drafts` (no los publiques con ese comando).

## Radar de contenido

`content/radar.yml` es la lista de temas por escribir, con su prioridad, estado y fuentes oficiales. Incluye el benchmark del sector (qué funciona a otros). `content/rendimiento.yml` recoge las métricas de tus artículos.

| Comando | Qué hace |
| --- | --- |
| `npm run radar` | Lista todos los temas por estado y prioridad |
| `npm run radar -- --next` | Los 3 temas que toca redactar (primero los que caducan pronto) |
| `npm run radar -- --benchmark` | Qué contenido funciona en el sector |
| `npm run radar -- --rendimiento` | Ordena tus artículos por leads y propone ideas parecidas a las mejores |
| `npm run radar -- --check` | Valida el radar (también avisa de artículos a revisar) |

Flujo: elige un tema → pasa a `verificando` y rellena `fuentes` oficiales → `redactando` → publica el `.md` y pasa el tema a `publicado` con `articulo` y fecha `revisar`. Cada mes, copia a `rendimiento.yml` las impresiones, clics y leads de Search Console y GA4.

## Frontmatter

| Campo | Obligatorio | Descripción |
| --- | --- | --- |
| `title` | sí | Título (H1). Idealmente ≤ 60 caracteres con la keyword. |
| `description` | sí | Meta description (140-155 caracteres). |
| `date` | sí | Fecha de publicación `YYYY-MM-DD`. Si es futura, el artículo se omite hasta esa fecha al regenerar. |
| `updated` | no | Última actualización `YYYY-MM-DD` (por defecto, `date`). Actualízala al revisar plazos o importes. |
| `tags` | no | Lista de etiquetas; se usan para "Te puede interesar". |
| `keyword` | no | Keyword objetivo (solo documentación interna). |
| `image` | no | Imagen social. Ruta (`/recursos/...`) o URL absoluta. Por defecto, `og-image.jpg`. |
| `slug` | no | Sustituye al nombre del archivo en la URL. |
| `draft` | no | `true` = no se publica ni entra en el sitemap. |

## Qué genera el motor

- `public/blog/index.html` con el listado (si no hay artículos publicados queda con `noindex`).
- `public/blog/<slug>/index.html` con canonical, Open Graph, JSON-LD `BlogPosting` y `BreadcrumbList`, índice, CTA a captación y artículos relacionados.
- `public/blog/rss.xml`.
- El bloque entre `<!-- blog:start -->` y `<!-- blog:end -->` de `public/sitemap.xml`.
