# Contenido del blog

Los artículos son archivos Markdown en `content/blog/`. El script `scripts/build-blog.js` los convierte en páginas estáticas dentro de `public/blog/` (que se versiona junto al resto del sitio).

## Publicar un artículo

1. Copia `content/blog/ejemplo-plantilla.md` con el nombre del slug (por ejemplo `ayudas-rehabilitacion-madrid-2026.md`; el nombre del archivo es la URL: `/blog/<slug>/`).
2. Rellena el frontmatter y escribe el texto.
3. Ejecuta `npm run build:blog` y revisa el resultado en `http://localhost:3000/blog/`.
4. Haz commit del `.md` **y** de `public/blog/` y `public/sitemap.xml`.

Para previsualizar borradores: `npm run build:blog -- --drafts` (no los publiques con ese comando).

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
