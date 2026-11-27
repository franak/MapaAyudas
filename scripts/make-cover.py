#!/usr/bin/env python3
"""Genera la portada (1200x630) y la miniatura (600x315) de una entrada del blog.

Uso:  python3 scripts/make-cover.py <slug> [--variante 0-3]

Escribe en public/recursos/blog/:
  <slug>.jpg         portada (cabecera del artículo y og:image)
  <slug>-thumb.jpg   miniatura (listado del blog y home)

La ilustración no lleva texto, para que sirva igual en miniatura. El build del blog
(scripts/build-blog.js) exige que existan los dos archivos de cada artículo publicado.
Si quieres una imagen propia, sustituye esos archivos manteniendo los nombres y tamaños.
"""
import os
import sys
from PIL import Image, ImageChops, ImageDraw, ImageFilter

W, H = 1200, 630
ROOT = os.path.join(os.path.dirname(__file__), '..')
OUT = os.path.join(ROOT, 'public', 'recursos', 'blog')

# (cielo arriba, cielo abajo, edificio, ventana encendida, sol)
PALETAS = [
    ((26, 31, 54), (230, 126, 34), (44, 82, 130), (255, 214, 140), (255, 236, 179)),
    ((20, 40, 70), (86, 156, 190), (26, 31, 54), (255, 221, 150), (255, 244, 214)),
    ((45, 26, 54), (211, 84, 0), (30, 36, 70), (255, 200, 120), (255, 232, 170)),
    ((16, 52, 60), (120, 190, 140), (26, 31, 54), (255, 226, 160), (255, 246, 220)),
]


def degradado(c1, c2):
    img = Image.new('RGB', (W, H))
    d = ImageDraw.Draw(img)
    for y in range(H):
        t = y / (H - 1)
        d.line([(0, y), (W, y)], fill=tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3)))
    return img


def edificio(d, x, y, w, h, color, ventana, filas, cols, semilla):
    d.rectangle([x, y, x + w, y + h], fill=color)
    mx, my = w * 0.12, h * 0.08
    cw = (w - 2 * mx) / cols
    ch = (h - 2 * my) / filas
    n = 0
    for f in range(filas):
        for c in range(cols):
            n += 1
            encendida = (n * 7 + semilla) % 3 != 0
            col = ventana if encendida else tuple(max(0, v - 22) for v in color)
            x0 = x + mx + c * cw + cw * 0.15
            y0 = y + my + f * ch + ch * 0.18
            d.rectangle([x0, y0, x0 + cw * 0.7, y0 + ch * 0.62], fill=col)


def portada(variante):
    cielo1, cielo2, bloque, ventana, sol = PALETAS[variante % len(PALETAS)]
    img = degradado(cielo1, cielo2)

    # Halo del sol (se suma al cielo)
    halo = Image.new('RGB', (W, H), (0, 0, 0))
    ImageDraw.Draw(halo).ellipse([780, 70, 1060, 350], fill=tuple(int(v * 0.5) for v in sol))
    img = ImageChops.add(img, halo.filter(ImageFilter.GaussianBlur(60)))
    d = ImageDraw.Draw(img)
    d.ellipse([830, 120, 1010, 300], fill=sol)

    # Edificios residenciales
    suelo = H - 70
    edificio(d, 120, suelo - 330, 250, 330, tuple(max(0, v - 10) for v in bloque), ventana, 6, 3, variante)
    edificio(d, 400, suelo - 430, 330, 430, bloque, ventana, 8, 4, variante + 1)
    edificio(d, 760, suelo - 280, 230, 280, tuple(min(255, v + 12) for v in bloque), ventana, 5, 3, variante + 2)
    edificio(d, 1010, suelo - 360, 170, 360, tuple(max(0, v - 6) for v in bloque), ventana, 7, 2, variante)

    # Paneles solares en la azotea del edificio central
    for i in range(4):
        x0 = 420 + i * 78
        d.polygon([(x0, suelo - 430), (x0 + 66, suelo - 430), (x0 + 52, suelo - 462), (x0 - 14, suelo - 462)],
                  fill=(38, 74, 124), outline=(160, 200, 240))

    # Suelo con línea de color de marca
    d.rectangle([0, suelo, W, H], fill=(20, 24, 40))
    d.rectangle([0, suelo, W, suelo + 6], fill=(230, 126, 34))
    return img


def main():
    args = sys.argv[1:]
    if not args or args[0].startswith('-'):
        sys.exit(__doc__)
    slug = args[0]
    variante = int(args[args.index('--variante') + 1]) if '--variante' in args else sum(map(ord, slug)) % len(PALETAS)
    os.makedirs(OUT, exist_ok=True)
    img = portada(variante)
    img.save(os.path.join(OUT, f'{slug}.jpg'), quality=86, optimize=True)
    img.resize((600, 315), Image.LANCZOS).save(os.path.join(OUT, f'{slug}-thumb.jpg'), quality=82, optimize=True)
    print(f'Portada y miniatura de "{slug}" generadas en public/recursos/blog/')


if __name__ == '__main__':
    main()
