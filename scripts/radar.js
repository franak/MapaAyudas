#!/usr/bin/env node
/**
 * Radar de contenido: valida y consulta content/radar.yml.
 *
 *   npm run radar              listado completo (ordenado por prioridad)
 *   npm run radar -- --next    los 3 temas que toca redactar
 *   npm run radar -- --check   valida el radar (sale con código 1 si hay errores)
 *
 * Solo lee archivos: no modifica el radar ni los artículos.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ROOT = path.join(__dirname, '..');
const RADAR = path.join(ROOT, 'content', 'radar.yml');
const BLOG = path.join(ROOT, 'content', 'blog');

const ESTADOS = ['idea', 'verificando', 'redactando', 'publicado', 'descartado'];
const INTENCIONES = ['informacional', 'comparativa', 'transaccional'];
const ACTIVOS = ['verificando', 'redactando', 'idea'];
const DIA = 86400000;

const hoy = new Date(new Date().toISOString().slice(0, 10));
const esFecha = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v)) && !isNaN(new Date(v));
const dias = (v) => Math.round((new Date(v) - hoy) / DIA);

function cargarRadar() {
  const data = yaml.load(fs.readFileSync(RADAR, 'utf8'), { schema: yaml.JSON_SCHEMA });
  if (!data || !Array.isArray(data.temas)) throw new Error('content/radar.yml debe tener la lista "temas"');
  return data.temas;
}

function articulos() {
  const out = {};
  if (!fs.existsSync(BLOG)) return out;
  for (const f of fs.readdirSync(BLOG).filter((n) => n.endsWith('.md'))) {
    const m = fs.readFileSync(path.join(BLOG, f), 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/);
    const fm = m ? yaml.load(m[1], { schema: yaml.JSON_SCHEMA }) || {} : {};
    out[fm.slug || f.replace(/\.md$/, '')] = { draft: fm.draft === true, file: f };
  }
  return out;
}

function validar(temas) {
  const errores = [];
  const avisos = [];
  const posts = articulos();
  const ids = new Set();

  for (const t of temas) {
    const id = t.id || '(sin id)';
    const err = (msg) => errores.push(`${id}: ${msg}`);
    const warn = (msg) => avisos.push(`${id}: ${msg}`);

    if (!t.id || !/^[a-z0-9-]+$/.test(t.id)) err('id obligatorio en minúsculas, números y guiones');
    if (ids.has(t.id)) err('id duplicado');
    ids.add(t.id);
    if (!t.tema) err('falta "tema"');
    if (!t.keyword) err('falta "keyword"');
    if (!INTENCIONES.includes(t.intencion)) err(`"intencion" debe ser: ${INTENCIONES.join(', ')}`);
    if (![1, 2, 3].includes(t.prioridad)) err('"prioridad" debe ser 1, 2 o 3 (1 = máxima)');
    if (!ESTADOS.includes(t.estado)) err(`"estado" debe ser: ${ESTADOS.join(', ')}`);
    for (const campo of ['caduca', 'revisar']) {
      if (t[campo] !== undefined && !esFecha(t[campo])) err(`"${campo}" debe ser YYYY-MM-DD`);
    }

    if (t.estado === 'publicado') {
      const p = posts[t.articulo];
      if (!t.articulo) err('estado publicado sin "articulo"');
      else if (!p) err(`el artículo "${t.articulo}" no existe en content/blog/`);
      else if (p.draft) err(`el artículo "${t.articulo}" sigue en draft`);
      if (!t.revisar) warn('artículo publicado sin fecha "revisar"');
    } else if (t.articulo && posts[t.articulo] && !posts[t.articulo].draft && t.estado !== 'descartado') {
      warn(`el artículo "${t.articulo}" ya está publicado: marca el tema como "publicado"`);
    }

    if (['verificando', 'redactando', 'publicado'].includes(t.estado) && !(t.fuentes && t.fuentes.length)) {
      err('un tema en curso o publicado necesita "fuentes" oficiales');
    }
    if (t.estado === 'publicado' && t.revisar && dias(t.revisar) < 0) warn(`REVISAR: venció el ${t.revisar}`);
    if (t.caduca && t.estado !== 'publicado' && t.estado !== 'descartado' && dias(t.caduca) < 0) {
      warn(`el plazo/vigencia caducó el ${t.caduca}: descartar o actualizar`);
    }
  }
  return { errores, avisos };
}

// Orden: urgente por caducidad próxima, luego prioridad, luego estado más avanzado
function puntuar(t) {
  const urgente = t.caduca && dias(t.caduca) >= 0 && dias(t.caduca) <= 45 ? 0 : 1;
  return [urgente, t.prioridad, ACTIVOS.indexOf(t.estado)];
}
function ordenar(temas) {
  return temas.slice().sort((a, b) => {
    const pa = puntuar(a), pb = puntuar(b);
    for (let i = 0; i < pa.length; i++) if (pa[i] !== pb[i]) return pa[i] - pb[i];
    return 0;
  });
}

function fila(t) {
  const extra = [t.caduca ? `caduca ${t.caduca}` : '', t.revisar ? `revisar ${t.revisar}` : ''].filter(Boolean).join(' · ');
  return `  P${t.prioridad}  ${t.estado.padEnd(11)} ${t.id.padEnd(34)} ${t.keyword}${extra ? '  [' + extra + ']' : ''}`;
}

// Compara el rendimiento propio (content/rendimiento.yml, datos de Search Console y GA4)
// y propone qué ideas se parecen más a lo que mejor funciona (mismas etiquetas e intención).
function rendimiento(temas) {
  const file = path.join(ROOT, 'content', 'rendimiento.yml');
  const datos = (fs.existsSync(file) && (yaml.load(fs.readFileSync(file, 'utf8'), { schema: yaml.JSON_SCHEMA }) || {}).articulos) || [];
  if (!datos.length) {
    console.log('Sin datos en content/rendimiento.yml: añade impresiones, clics y leads por artículo (Search Console + GA4) y vuelve a ejecutar.');
    return;
  }
  const porSlug = {};
  temas.forEach((t) => { if (t.articulo) porSlug[t.articulo] = t; });
  const ranking = datos
    .map((d) => ({ ...d, ctr: d.impresiones ? d.clics / d.impresiones : 0, conv: d.clics ? (d.leads || 0) / d.clics : 0 }))
    .sort((a, b) => (b.leads || 0) - (a.leads || 0) || b.clics - a.clics);

  console.log('Tus publicaciones, de mejor a peor rendimiento\n');
  ranking.forEach((d, i) => console.log(`  ${i + 1}. ${d.articulo.padEnd(40)} leads ${d.leads || 0} · clics ${d.clics} · CTR ${(d.ctr * 100).toFixed(1)} % · pos. ${d.posicion || '-'}`));

  const top = ranking.slice(0, 3).map((d) => porSlug[d.articulo]).filter(Boolean);
  const etiquetas = new Set(top.flatMap((t) => t.tags || []));
  const intenciones = new Set(top.map((t) => t.intencion));
  const candidatas = temas
    .filter((t) => ACTIVOS.includes(t.estado))
    .map((t) => ({ t, afinidad: (t.tags || []).filter((x) => etiquetas.has(x)).length + (intenciones.has(t.intencion) ? 1 : 0) }))
    .sort((a, b) => b.afinidad - a.afinidad || a.t.prioridad - b.t.prioridad)
    .slice(0, 3);

  console.log('\nIdeas más parecidas a lo que mejor te funciona:\n');
  candidatas.forEach(({ t, afinidad }) => console.log(fila(t) + `  (afinidad ${afinidad})`));
}

function main() {
  const args = process.argv.slice(2);
  const temas = cargarRadar();
  const { errores, avisos } = validar(temas);

  if (args.includes('--rendimiento')) return rendimiento(temas);

  if (args.includes('--benchmark')) {
    const b = yaml.load(fs.readFileSync(RADAR, 'utf8'), { schema: yaml.JSON_SCHEMA }).benchmark || {};
    console.log(`Benchmark del sector (${b.fecha || 'sin fecha'})\n`);
    (b.hallazgos || []).forEach((h) => console.log('  - ' + h));
    console.log('\nFormatos que funcionan:');
    (b.formatos_que_funcionan || []).forEach((f) => console.log('  - ' + f));
    return;
  }

  if (args.includes('--check')) {
    avisos.forEach((a) => console.warn('AVISO  ' + a));
    errores.forEach((e) => console.error('ERROR  ' + e));
    console.log(`${temas.length} temas · ${errores.length} errores · ${avisos.length} avisos`);
    process.exit(errores.length ? 1 : 0);
  }

  if (args.includes('--next')) {
    const cola = ordenar(temas.filter((t) => ACTIVOS.includes(t.estado))).slice(0, 3);
    console.log('Siguientes temas a redactar:\n');
    cola.forEach((t) => {
      console.log(fila(t));
      if (t.notas) console.log('      ' + t.notas);
      (t.fuentes || []).forEach((f) => console.log('      fuente: ' + f));
    });
    return;
  }

  console.log(`Radar de contenido (${temas.length} temas)\n`);
  ESTADOS.forEach((estado) => {
    const grupo = ordenar(temas.filter((t) => t.estado === estado));
    if (!grupo.length) return;
    console.log(`${estado.toUpperCase()} (${grupo.length})`);
    grupo.forEach((t) => console.log(fila(t)));
    console.log('');
  });
  avisos.forEach((a) => console.warn('AVISO  ' + a));
  errores.forEach((e) => console.error('ERROR  ' + e));
}

main();
