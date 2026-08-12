/**
 * Semilla de datos de prueba para el módulo de Presupuestos de Obra.
 *
 * Crea un catálogo realista (insumos + APUs con su composición) y un proyecto
 * completo con presupuesto, para poder ver todas las pantallas con datos de
 * verdad: presupuesto por capítulos, panel, consolidados y cotizaciones.
 *
 * Cómo usarlo:
 *   1. Abre la app en el navegador CON LA SESIÓN INICIADA.
 *   2. Consola del navegador (F12 → Console).
 *   3. Pega este archivo completo y pulsa Enter.
 *   4. Ejecuta:  await sembrar()
 *
 * Para borrar el proyecto de prueba después:  await limpiar()
 * Los insumos y APUs del catálogo NO se borran: son reutilizables y el
 * backend no expone un DELETE para ellos.
 *
 * Es idempotente: si vuelves a ejecutarlo no duplica insumos ni APUs (los
 * busca por descripción antes de crearlos).
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

  /** Aplana el cuerpo de error: NestJS devuelve `message` como array y
   *  quedarse con el primero esconde el resto de los motivos. */
  const motivos = (bruto) => {
    if (!bruto) return [];
    const m = bruto.message ?? bruto.error ?? bruto;
    if (Array.isArray(m)) return m.map(String);
    if (typeof m === 'string') return [m];
    return [JSON.stringify(m)];
  };

  const pedir = async (metodo, ruta, cuerpo, silencioso) => {
    const res = await fetch(BASE + ruta, {
      method: metodo,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      credentials: 'include',
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    });
    let datos = null;
    try { datos = await res.json(); } catch { /* sin cuerpo */ }
    const d = datos && typeof datos === 'object' && 'data' in datos ? datos.data : datos;
    if (!res.ok) {
      const lista = motivos(d);
      const e = new Error(lista.join(' · ') || `HTTP ${res.status} en ${metodo} ${ruta}`);
      e.status = res.status;
      e.motivos = lista;
      e.cuerpoEnviado = cuerpo;
      e.respuesta = d;
      // Sin esto solo se ve el mensaje resumido y hay que adivinar el resto.
      // La sonda lo silencia: son 16 peticiones y el ruido tapa el resultado.
      if (cuerpo && !silencioso) {
        console.groupCollapsed(`%c↳ ${metodo} ${ruta} → ${res.status}`, 'color:#ff6b6b');
        console.log('enviado:', cuerpo);
        console.log('respuesta cruda:', d);
        console.groupEnd();
      }
      throw e;
    }
    return d;
  };

  /**
   * Averigua qué espera el validador para el grupo, sin llegar a crear nada.
   *
   * El truco: se manda el candidato junto con una descripción vacía y un valor
   * no numérico, dos motivos de rechazo seguros. Así la petición falla siempre
   * —no se guarda ningún insumo— y basta con mirar si entre los motivos sigue
   * apareciendo una queja sobre el grupo. Si desaparece, ese candidato vale.
   *
   * Se prueban dos cosas, porque el mensaje dice «Grupo» con mayúscula y eso
   * apunta a que el campo del DTO no se llama `grupo`: si el nombre no
   * coincide, el valor llega indefinido y el rechazo es el mismo mandes lo que
   * mandes. Por eso primero se busca el NOMBRE del campo y luego el VALOR.
   */
  const quejaDeGrupo = (motivos) => (motivos || []).some((m) => /grupo/i.test(m));

  /** Manda un cuerpo condenado a fallar y dice si el grupo sigue estorbando. */
  const sondear = async (cuerpo) => {
    try {
      await pedir('POST', `${PRE}/catalog/supplies`, cuerpo, true);
      return { ok: false, nota: 'SE CREO - revisalo en el maestro', motivos: [] };
    } catch (e) {
      const queja = (e.motivos || []).find((m) => /grupo/i.test(m));
      return queja
        ? { ok: false, nota: 'rechazado: ' + queja, motivos: e.motivos || [] }
        : { ok: true, nota: 'OK - sin queja de grupo', motivos: e.motivos || [] };
    }
  };

  /**
   * Todo el resultado en UN bloque de texto plano.
   *
   * Antes salía con console.table, que en Chrome no se copia: solo se podían
   * pegar las trazas de los 400, que es justo lo que no aporta nada. Ahora se
   * imprime una sola cadena, y además queda en `window.__grupos` para poder
   * hacer `copy(__grupos)`.
   */
  window.probarGrupos = async () => {
    const base = { descripcion: '', unidad: '', valorUnitario: 'x' };
    const lineas = [];
    const campos = ['grupo', 'Grupo', 'tipo', 'tipoRecurso', 'tipo_recurso', 'grupoRecurso', 'grupo_recurso'];
    const valores = ['MATERIAL', 'MATERIALES', 'Material', 'material',
                     'MANO OBRA', 'MANO_OBRA', 'EQUIPO', 'EQUIPOS', 'TRANSPORTE'];

    // Lo primero y más útil: TODOS los motivos de una sola petición. Ahí se ve
    // de golpe qué otros campos rechaza el DTO, no solo el grupo.
    const primera = await sondear({ ...base, grupo: 'MATERIAL' });
    lineas.push('=== MOTIVOS COMPLETOS de POST /catalog/supplies ===');
    lineas.push('enviado: { descripcion:"", unidad:"", valorUnitario:"x", grupo:"MATERIAL" }');
    if (primera.motivos.length) primera.motivos.forEach((m, i) => lineas.push(`  ${i + 1}. ${m}`));
    else lineas.push('  (sin motivos en la respuesta)');

    lineas.push('', '=== 1) NOMBRE DEL CAMPO (valor fijo MATERIAL) ===');
    const porCampo = [];
    for (const campo of campos) {
      const r = await sondear({ ...base, [campo]: 'MATERIAL' });
      porCampo.push({ campo, ok: r.ok });
      lineas.push(`  ${campo.padEnd(16)} ${r.nota}`);
    }

    const campoBueno = porCampo.find((c) => c.ok)?.campo || 'grupo';
    lineas.push('', `=== 2) VALOR (campo "${campoBueno}") ===`);
    const porValor = [];
    for (const valor of valores) {
      const r = await sondear({ ...base, [campoBueno]: valor });
      porValor.push({ valor, ok: r.ok });
      lineas.push(`  ${valor.padEnd(16)} ${r.nota}`);
    }

    lineas.push('', '=== RESUMEN ===');
    lineas.push(`campo aceptado : ${porCampo.filter((c) => c.ok).map((c) => c.campo).join(', ') || 'NINGUNO'}`);
    lineas.push(`valores válidos: ${porValor.filter((v) => v.ok).map((v) => v.valor).join(', ') || 'NINGUNO'}`);

    const texto = lineas.join('\n');
    window.__grupos = texto;
    console.log(texto);
    console.log('%cCopia el bloque de arriba, o ejecuta:  copy(__grupos)', 'font-weight:bold');
    return texto;
  };

  const lista = (d) => (Array.isArray(d) ? d : (d?.items ?? d?.data ?? d?.results ?? []));
  const clave = (s) => String(s ?? '').trim().toLowerCase();

  /**
   * Valores comprobados contra el servidor con probarGrupos().
   *
   * OJO: el mensaje de error del validador dice «MANO OBRA» con espacio, pero
   * ese valor lo rechaza; el bueno es `MANO_OBRA`. No copiar del mensaje.
   */
  const GRUPO_BACKEND = {
    MATERIALES: 'MATERIAL',
    MANO_OBRA: 'MANO_OBRA',
    EQUIPOS: 'EQUIPO',
    TRANSPORTE: 'TRANSPORTE',
  };

  // ── Catálogo ────────────────────────────────────────────────

  const INSUMOS = [
    ['Cemento gris uso general 50 kg', 'bulto', 'MATERIALES', 34500],
    ['Arena de río lavada', 'm3', 'MATERIALES', 95000],
    ['Triturado 3/4"', 'm3', 'MATERIALES', 118000],
    ['Bloque n.º 5 perforado, 12x20x40', 'und', 'MATERIALES', 2450],
    ['Acero de refuerzo 60000 PSI', 'kg', 'MATERIALES', 5800],
    ['Porcelanato 60x60, tráfico alto', 'm2', 'MATERIALES', 62000],
    ['Cerámica pared 30x60', 'm2', 'MATERIALES', 38500],
    ['Adhesivo para porcelanato 25 kg', 'bulto', 'MATERIALES', 42000],
    ['Boquilla premium color', 'kg', 'MATERIALES', 9800],
    ['Estuco plástico', 'galón', 'MATERIALES', 38000],
    ['Pintura vinilo tipo 1', 'galón', 'MATERIALES', 89000],
    ['Guardaescoba MDF 10 cm', 'ml', 'MATERIALES', 12400],
    ['Tubería PVC sanitaria 4"', 'ml', 'MATERIALES', 28500],
    ['Cable THHN n.º 12', 'ml', 'MATERIALES', 3900],
    ['Tomacorriente doble con polo a tierra', 'und', 'MATERIALES', 12800],
    ['Impermeabilizante integral', 'kg', 'MATERIALES', 8600],
    ['Oficial de construcción', 'día', 'MANO_OBRA', 98000],
    ['Ayudante de construcción', 'día', 'MANO_OBRA', 68000],
    ['Oficial enchapador', 'día', 'MANO_OBRA', 115000],
    ['Oficial pintor', 'día', 'MANO_OBRA', 92000],
    ['Oficial electricista', 'día', 'MANO_OBRA', 125000],
    ['Mezcladora de concreto 1 saco', 'día', 'EQUIPOS', 85000],
    ['Andamio certificado (cuerpo)', 'día', 'EQUIPOS', 18000],
    ['Pulidora con disco diamantado', 'día', 'EQUIPOS', 32000],
    ['Herramienta menor', 'global', 'EQUIPOS', 5500],
    ['Volqueta 5 m3', 'viaje', 'TRANSPORTE', 180000],
    ['Acarreo vertical de materiales', 'm3', 'TRANSPORTE', 22000],
  ];

  /** Rendimiento = cuánto insumo entra en UNA unidad de la actividad. */
  const APUS = [
    ['Demolición de muro en mampostería', 'm2', 'PRELIMINARES', [
      ['Oficial de construcción', 0.12], ['Ayudante de construcción', 0.25], ['Herramienta menor', 1],
    ]],
    ['Retiro y cargue de escombros', 'm3', 'PRELIMINARES', [
      ['Ayudante de construcción', 0.35], ['Volqueta 5 m3', 0.2], ['Acarreo vertical de materiales', 1],
    ]],
    ['Mampostería en bloque n.º 5', 'm2', 'ESTRUCTURA', [
      ['Bloque n.º 5 perforado, 12x20x40', 12.5], ['Cemento gris uso general 50 kg', 0.35],
      ['Arena de río lavada', 0.035], ['Oficial de construcción', 0.28], ['Ayudante de construcción', 0.28],
      ['Mezcladora de concreto 1 saco', 0.08], ['Herramienta menor', 1],
    ]],
    ['Pañete impermeabilizado sobre muro', 'm2', 'ESTRUCTURA', [
      ['Cemento gris uso general 50 kg', 0.22], ['Arena de río lavada', 0.022],
      ['Impermeabilizante integral', 0.25], ['Oficial de construcción', 0.16],
      ['Ayudante de construcción', 0.16], ['Herramienta menor', 1],
    ]],
    ['Enchape de piso en porcelanato 60x60', 'm2', 'ACABADOS', [
      ['Porcelanato 60x60, tráfico alto', 1.08], ['Adhesivo para porcelanato 25 kg', 0.18],
      ['Boquilla premium color', 0.35], ['Oficial enchapador', 0.22],
      ['Ayudante de construcción', 0.22], ['Pulidora con disco diamantado', 0.05], ['Herramienta menor', 1],
    ]],
    ['Enchape de pared en cerámica 30x60', 'm2', 'ACABADOS', [
      ['Cerámica pared 30x60', 1.1], ['Adhesivo para porcelanato 25 kg', 0.2],
      ['Boquilla premium color', 0.3], ['Oficial enchapador', 0.26],
      ['Ayudante de construcción', 0.26], ['Herramienta menor', 1],
    ]],
    ['Estuco y pintura sobre muro', 'm2', 'ACABADOS', [
      ['Estuco plástico', 0.12], ['Pintura vinilo tipo 1', 0.09],
      ['Oficial pintor', 0.14], ['Ayudante de construcción', 0.09],
      ['Andamio certificado (cuerpo)', 0.05], ['Herramienta menor', 1],
    ]],
    ['Instalación de guardaescoba MDF', 'ml', 'ACABADOS', [
      ['Guardaescoba MDF 10 cm', 1.05], ['Oficial de construcción', 0.06], ['Herramienta menor', 1],
    ]],
    ['Punto hidráulico PVC sanitario', 'und', 'INSTALACIONES', [
      ['Tubería PVC sanitaria 4"', 3.2], ['Oficial de construcción', 0.5],
      ['Ayudante de construcción', 0.5], ['Herramienta menor', 1],
    ]],
    ['Punto eléctrico tomacorriente doble', 'und', 'INSTALACIONES', [
      ['Cable THHN n.º 12', 12], ['Tomacorriente doble con polo a tierra', 1],
      ['Oficial electricista', 0.4], ['Ayudante de construcción', 0.2], ['Herramienta menor', 1],
    ]],
  ];

  /** Actividades del presupuesto: [APU, cantidad]. Un apartamento de 85 m². */
  const PRESUPUESTO = [
    ['Demolición de muro en mampostería', 24],
    ['Retiro y cargue de escombros', 9.5],
    ['Mampostería en bloque n.º 5', 38],
    ['Pañete impermeabilizado sobre muro', 76],
    ['Enchape de piso en porcelanato 60x60', 68],
    ['Enchape de pared en cerámica 30x60', 42],
    ['Estuco y pintura sobre muro', 185],
    ['Instalación de guardaescoba MDF', 54],
    ['Punto hidráulico PVC sanitario', 6],
    ['Punto eléctrico tomacorriente doble', 14],
  ];

  const NOMBRE_PROYECTO = 'Remodelación apto 502 — Datos de prueba';

  // ── Siembra ─────────────────────────────────────────────────

  /** Devuelve un mapa descripción→id, creando solo lo que falte. */
  async function sembrarInsumos() {
    const existentes = new Map(
      lista(await pedir('GET', `${PRE}/catalog/supplies`)).map((i) => [clave(i.descripcion), String(i.id)])
    );
    const mapa = new Map(existentes);
    let creados = 0;
    for (const [descripcion, unidad, grupo, valorUnitario] of INSUMOS) {
      if (mapa.has(clave(descripcion))) continue;
      // CreateSupplyDto no lleva precio: mandarlo aquí no da error, se ignora
      // sin más, y el insumo quedaría en cero. El precio va aparte.
      const nuevo = await pedir('POST', `${PRE}/catalog/supplies`, {
        descripcion, unidad, grupo: GRUPO_BACKEND[grupo] ?? grupo,
      });
      if (!nuevo?.id) throw new Error(`El servidor no devolvió id al crear el insumo "${descripcion}".`);
      const id = String(nuevo.id);
      // Segunda llamada: el precio es una serie histórica con su propio
      // endpoint, y `valor` es el único campo obligatorio de CreatePriceDto.
      await pedir('POST', `${PRE}/catalog/supplies/${id}/prices`, {
        valor: valorUnitario,
        motivo: 'Carga inicial de datos de prueba',
      });
      mapa.set(clave(descripcion), id);
      creados++;
    }
    console.log(`  insumos: ${creados} creados con precio, ${INSUMOS.length - creados} ya existían`);
    return mapa;
  }

  /** Los cuatro que necesitan los APUs, en el orden del presupuesto impreso. */
  const CAPITULOS = [
    ['PRELIMINARES', 1],
    ['ESTRUCTURA', 2],
    ['ACABADOS', 3],
    ['INSTALACIONES', 4],
  ];

  /**
   * Empareja los capítulos por nombre y crea los que falten.
   *
   * Antes esto abortaba si el servidor no tenía ninguno, y como la app no
   * ofrece dónde crearlos, era un callejón sin salida.
   */
  async function mapaCapitulos() {
    const caps = lista(await pedir('GET', `${PRE}/catalog/chapters`));
    const mapa = new Map(caps.map((c) => [clave(c.nombre), String(c.id)]));
    let creados = 0;
    for (const [nombre, orden] of CAPITULOS) {
      if (mapa.has(clave(nombre))) continue;
      const nuevo = await pedir('POST', `${PRE}/catalog/chapters`, { nombre, orden });
      if (!nuevo?.id) throw new Error(`El servidor no devolvió id al crear el capítulo "${nombre}".`);
      mapa.set(clave(nombre), String(nuevo.id));
      creados++;
    }
    console.log(`  capítulos: ${creados} creados, ${CAPITULOS.length - creados} ya existían`);
    return mapa;
  }

  async function sembrarApus(insumos, capitulos) {
    const existentes = new Map(
      lista(await pedir('GET', `${PRE}/catalog/apus?limit=200`)).map((a) => [clave(a.descripcion), String(a.id)])
    );
    const mapa = new Map(existentes);
    let creados = 0;
    const omitidos = [];
    for (const [descripcion, unidad, capitulo, componentes] of APUS) {
      if (mapa.has(clave(descripcion))) continue;
      const capituloId = capitulos.get(clave(capitulo));
      if (!capituloId) { omitidos.push(`${descripcion} (falta el capítulo "${capitulo}")`); continue; }
      const nuevo = await pedir('POST', `${PRE}/catalog/apus`, {
        descripcion, unidad, capituloId,
        // Solo rendimientos: los precios los pone el servidor desde el maestro.
        componentes: componentes.map(([insumo, rendimiento]) => ({
          insumoId: insumos.get(clave(insumo)), rendimiento,
        })),
      });
      if (!nuevo?.id) throw new Error(`El servidor no devolvió id al crear el APU "${descripcion}".`);
      mapa.set(clave(descripcion), String(nuevo.id));
      creados++;
    }
    console.log(`  APUs: ${creados} creados, ${APUS.length - creados - omitidos.length} ya existían`);
    if (omitidos.length) console.warn('  ⚠️ omitidos:', omitidos);
    return mapa;
  }

  async function sembrarProyecto(apus) {
    const proyecto = await pedir('POST', `${PRE}/projects`, {
      nombre: NOMBRE_PROYECTO,
      cliente: 'Familia Restrepo Gómez',
      ubicacion: 'Cra. 43A #1-50, Medellín',
      area_m2: 85,
      tipo_obra: 'REMODELACION',
      fecha: new Date().toISOString().slice(0, 10),
      aiu: { pctAdministracion: 15, pctImprevistos: 3, pctUtilidad: 5, ivaAplica: false, pctIva: 19, baseIva: 'TOTAL', descuento: 0 },
    });
    if (!proyecto?.id) throw new Error('El servidor no devolvió id al crear el proyecto.');
    const pid = String(proyecto.id);

    let agregadas = 0;
    for (const [descripcion, cantidad] of PRESUPUESTO) {
      const apuId = apus.get(clave(descripcion));
      if (!apuId) { console.warn(`  ⚠️ sin APU para "${descripcion}"`); continue; }
      await pedir('POST', `${PRE}/projects/${pid}/budget/items`, { apuId, cantidad, siExiste: 'SUMAR' });
      agregadas++;
    }
    console.log(`  presupuesto: ${agregadas} actividad(es)`);
    return pid;
  }

  window.sembrar = async () => {
    console.log('%c▶ Sembrando datos de prueba', 'font-weight:bold;font-size:13px');
    try {
      const insumos = await sembrarInsumos();
      const capitulos = await mapaCapitulos();
      const apus = await sembrarApus(insumos, capitulos);
      const pid = await sembrarProyecto(apus);

      // Se relee para comprobar que quedó guardado de verdad, no solo que
      // respondió 200: es el fallo que buscamos con el diagnóstico.
      const presupuesto = await pedir('GET', `${PRE}/projects/${pid}/budget`);
      const totales = presupuesto?.totales ?? {};
      const nCaps = (presupuesto?.capitulos ?? []).length;
      const nAct = (presupuesto?.capitulos ?? []).reduce((s, c) => s + (c.actividades?.length ?? 0), 0);

      console.log('%c✅ Listo', 'color:#4ade80;font-weight:bold');
      console.table({
        proyecto: pid,
        capítulos: nCaps,
        actividades: nAct,
        'costo directo': totales.costoDirecto ?? '—',
        total: totales.total ?? '—',
      });
      if (nAct === 0) {
        console.warn('⚠️ El presupuesto volvió vacío: el servidor aceptó las actividades pero no las guardó.');
      }
      console.log(`Ábrelo en: ${location.origin}/obra/${pid}/presupuesto`);
      window.__proyectoSemilla = pid;
      return pid;
    } catch (e) {
      console.error('❌', e.message);
      if (e.status === 404) console.error('   Esa ruta no existe en el backend. Comprueba el prefijo /costos.');
      throw e;
    }
  };

  window.limpiar = async () => {
    const pid = window.__proyectoSemilla;
    if (!pid) {
      console.warn('No hay proyecto sembrado en esta sesión. Bórralo desde la app.');
      return;
    }
    await pedir('DELETE', `${PRE}/projects/${pid}`);
    console.log(`🗑️ Proyecto ${pid} enviado a la papelera.`);
    delete window.__proyectoSemilla;
  };

  // El sello de versión evita la duda de "¿pegué la copia nueva o la vieja?".
  console.log('%cSemilla v5 cargada.', 'font-weight:bold',
    'Ejecuta:  await sembrar()   ·   Si falla por el grupo:  await probarGrupos()');
})();
