/**
 * Diagnóstico del módulo de Presupuestos de Obra.
 *
 * Cómo usarlo:
 *   1. Abre la app en el navegador CON LA SESIÓN INICIADA.
 *   2. Abre la consola del navegador (F12 → Console).
 *   3. Pega este archivo completo y pulsa Enter.
 *
 * Por defecto solo hace lecturas (GET), que no modifican nada.
 * Para probar también el guardado, ejecuta después:  await probarEscritura()
 * Eso crea un proyecto llamado "ZZZ Diagnóstico" y lo borra al terminar.
 */
(() => {
  const BASE = 'http://localhost:3000/api/v1';
  const PRE = '/costos';

  const token = (() => {
    try { return JSON.parse(localStorage.getItem('element_user:v1')).token; } catch { return null; }
  })();

  if (!token) {
    console.error('❌ No hay sesión. Inicia sesión en la app y vuelve a ejecutar esto.');
    return;
  }

  const pedir = async (metodo, ruta, cuerpo) => {
    const t0 = performance.now();
    try {
      const res = await fetch(BASE + ruta, {
        method: metodo,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        credentials: 'include',
        body: cuerpo ? JSON.stringify(cuerpo) : undefined,
      });
      const ms = Math.round(performance.now() - t0);
      let datos = null;
      try { datos = await res.json(); } catch { /* sin cuerpo */ }
      return { ok: res.ok, status: res.status, ms, datos };
    } catch (e) {
      return { ok: false, status: 0, ms: Math.round(performance.now() - t0), datos: { error: String(e) } };
    }
  };

  const veredicto = (r) => {
    if (r.status === 0) return '🔌 sin conexión';
    if (r.status === 404) return '❌ NO EXISTE';
    if (r.status === 401) return '🔒 sin autorizar';
    if (r.status === 403) return '🚫 sin permiso';
    if (r.status >= 500) return '💥 error del servidor';
    if (r.ok) return '✅ responde';
    return `⚠️ ${r.status}`;
  };

  const contenido = (r) => {
    const d = r.datos && 'data' in r.datos ? r.datos.data : r.datos;
    if (d == null) return '—';
    if (Array.isArray(d)) return `array (${d.length})`;
    if (typeof d === 'object') return `objeto {${Object.keys(d).slice(0, 4).join(', ')}}`;
    return String(d).slice(0, 40);
  };

  window.probarLectura = async () => {
    console.log('%c▶ Lecturas (no modifican nada)', 'font-weight:bold;font-size:13px');

    // Se necesita un proyecto real para las rutas anidadas.
    const lista = await pedir('GET', `${PRE}/projects`);
    const arr = lista.datos && 'data' in lista.datos ? lista.datos.data : lista.datos;
    const pid = Array.isArray(arr) && arr[0] ? arr[0].id : null;

    const rutas = [
      ['GET', `${PRE}/projects`, 'Listar proyectos'],
      ['GET', `${PRE}/catalog/chapters`, 'Capítulos'],
      ['GET', `${PRE}/catalog/apus`, 'Base de APUs'],
      ['GET', `${PRE}/catalog/supplies`, 'Insumos'],
    ];
    if (pid) {
      rutas.push(
        ['GET', `${PRE}/projects/${pid}`, 'Detalle del proyecto'],
        ['GET', `${PRE}/projects/${pid}/budget`, 'Presupuesto'],
        ['GET', `${PRE}/projects/${pid}/aiu`, 'AIU'],
        ['GET', `${PRE}/projects/${pid}/analytics/summary`, 'Analítica del panel'],
        ['GET', `${PRE}/projects/${pid}/documents`, 'Documentos'],
      );
    } else {
      console.warn('⚠️ No hay proyectos: no se pueden probar las rutas anidadas. Crea uno o ejecuta probarEscritura().');
    }

    const tabla = [];
    for (const [m, ruta, nombre] of rutas) {
      const r = await pedir(m, ruta);
      tabla.push({ Qué: nombre, Método: m, Ruta: ruta, Estado: veredicto(r), Código: r.status, ms: r.ms, Devuelve: contenido(r) });
    }
    console.table(tabla);

    const faltan = tabla.filter((t) => t.Código === 404);
    if (faltan.length === 0) console.log('%c✅ Todas las rutas de lectura responden.', 'color:#34c759;font-weight:bold');
    else console.warn(`❌ Faltan ${faltan.length} ruta(s):`, faltan.map((f) => f.Ruta));
    return tabla;
  };

  window.probarEscritura = async () => {
    console.log('%c▶ Escritura (crea un proyecto de prueba y lo borra al final)', 'font-weight:bold;font-size:13px');
    const pasos = [];
    let pid = null;

    // 1. Crear
    const creado = await pedir('POST', `${PRE}/projects`, {
      nombre: 'ZZZ Diagnóstico', cliente: 'Prueba', ubicacion: 'Bogotá D.C.',
      areaM2: 80, tipoObra: 'REMODELACION', fecha: new Date().toISOString().slice(0, 10), descuento: 0,
    });
    const cd = creado.datos && 'data' in creado.datos ? creado.datos.data : creado.datos;
    pid = cd?.id ?? null;
    pasos.push({ Paso: '1. Crear proyecto', Estado: veredicto(creado), Código: creado.status, Detalle: pid ? `id ${pid}` : JSON.stringify(creado.datos).slice(0, 80) });

    if (pid) {
      // 2. Guardar AIU y volver a leerlo (¿persiste de verdad?)
      const put = await pedir('PUT', `${PRE}/projects/${pid}/aiu`, {
        administracionPct: 18, imprevistosPct: 4, utilidadPct: 6, ivaAplica: true, ivaPct: 19, descuento: 0,
      });
      pasos.push({ Paso: '2. Guardar AIU (PUT)', Estado: veredicto(put), Código: put.status, Detalle: contenido(put) });

      const get = await pedir('GET', `${PRE}/projects/${pid}/aiu`);
      const g = get.datos && 'data' in get.datos ? get.datos.data : get.datos;
      const persiste = Number(g?.administracionPct) === 18 && Number(g?.utilidadPct) === 6;
      pasos.push({
        Paso: '3. Releer AIU',
        Estado: get.ok ? (persiste ? '✅ PERSISTE' : '⚠️ responde pero NO guardó') : veredicto(get),
        Código: get.status,
        Detalle: g ? `admin=${g.administracionPct} util=${g.utilidadPct}` : contenido(get),
      });

      // 3. Agregar una actividad si hay algún APU en el catálogo
      const apus = await pedir('GET', `${PRE}/catalog/apus?limit=1`);
      const aArr = apus.datos && 'data' in apus.datos ? apus.datos.data : apus.datos;
      const apuId = Array.isArray(aArr) && aArr[0] ? aArr[0].id : null;
      if (apuId) {
        const add = await pedir('POST', `${PRE}/projects/${pid}/budget/items`, { apuId, cantidad: 10, siExiste: 'SUMAR' });
        const ad = add.datos && 'data' in add.datos ? add.datos.data : add.datos;
        pasos.push({ Paso: '4. Agregar actividad', Estado: veredicto(add), Código: add.status, Detalle: ad?.id ? `item ${ad.id} · parcial ${ad.valorParcial ?? '?'}` : contenido(add) });

        if (ad?.id) {
          const patch = await pedir('PATCH', `${PRE}/projects/${pid}/budget/items/${ad.id}`, { cantidad: 25 });
          const pd = patch.datos && 'data' in patch.datos ? patch.datos.data : patch.datos;
          pasos.push({ Paso: '5. Cambiar cantidad', Estado: veredicto(patch), Código: patch.status, Detalle: pd?.valorParcial ? `parcial ${pd.valorParcial}` : contenido(patch) });
          const del = await pedir('DELETE', `${PRE}/projects/${pid}/budget/items/${ad.id}`);
          pasos.push({ Paso: '6. Borrar actividad', Estado: veredicto(del), Código: del.status, Detalle: contenido(del) });
        }
      } else {
        pasos.push({ Paso: '4. Agregar actividad', Estado: '⏭️ omitido', Código: '—', Detalle: 'no hay APUs en el catálogo' });
      }

      // 4. Limpiar
      const borrado = await pedir('DELETE', `${PRE}/projects/${pid}`);
      pasos.push({ Paso: '7. Borrar proyecto de prueba', Estado: veredicto(borrado), Código: borrado.status, Detalle: contenido(borrado) });
      if (!borrado.ok) console.warn(`⚠️ Quedó el proyecto de prueba "ZZZ Diagnóstico" (${pid}). Bórralo a mano.`);
    }

    console.table(pasos);
    return pasos;
  };

  console.log('%c🔎 Diagnóstico cargado', 'font-weight:bold;font-size:14px;color:#b69462');
  console.log('Ejecuta:  await probarLectura()      → solo lecturas, no toca nada');
  console.log('Y luego:  await probarEscritura()    → crea y borra un proyecto de prueba');
})();
