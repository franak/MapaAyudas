---
title: "Plantilla de artículo: cómo escribir una guía de ayudas"
description: "Artículo de ejemplo en borrador para probar el motor del blog. No se publica: lleva draft true."
date: 2026-11-27
tags: [plantilla, guias]
keyword: "plantilla de artículo"
draft: true
---

Este archivo es una **plantilla en borrador**. No aparece en el sitio mientras tenga `draft: true`; sirve para comprobar el formato y como punto de partida para nuevos artículos.

## Estructura recomendada

Abre con la respuesta directa a la pregunta que se hace el lector, y desarrolla después. Cada sección `##` aparece en el índice del artículo.

- Una idea por sección.
- Párrafos cortos.
- Enlaces a fuentes oficiales para cada dato (importes, plazos, porcentajes).

## Datos y fuentes

Cita siempre la convocatoria oficial y la fecha de consulta. Por ejemplo: [Plan de Recuperación](https://planderecuperacion.gob.es) o el [Mapa de Ayudas](/mapaayudas/) de ISAMART.

| Dato | Dónde comprobarlo |
| --- | --- |
| Plazo de solicitud | Texto de la convocatoria |
| Porcentaje de ayuda | Tabla de la convocatoria |

> Consejo: no publiques importes ni plazos sin verificarlos en la fuente oficial.

### Antes de publicar

Cambia `draft: true` por `draft: false` y ejecuta `npm run build:blog`.

## Cierre y siguiente paso

Termina con un paso claro para el lector. El motor añade automáticamente un bloque para solicitar información al final de cada artículo.
