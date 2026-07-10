import { useMemo, useRef, useState, useEffect, useCallback, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stage, Layer, Line, Circle, Rect, Text, Arrow, Group } from 'react-konva';
import { apiService } from '../../shared/services/api';
import { showNotification } from '../../shared/hooks/useNotifications';
import {
  type Espacio, type Nivel, type Dir,
  SNAP_M, DIRV, ROOM_COLORS, uid, newEspacio, computeRing, shoelaceArea, wallLength, espacioArea,
} from './planoGeometry';
import { toBackendPlan, fromBackendPlan, type PlanoMeta } from './mapping';
import { Grid3x3, Frame } from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// Editor CAD 2D por nodos — Fase 3 (persistencia).
// Estructura: Plano → niveles (pisos) → espacios (habitaciones).
// Cada espacio es un polígono (nodos + muros). Guarda/carga vía
// /tile-calculator/house-plans (ver mapping.ts).
// ─────────────────────────────────────────────────────────────

const dataOf = (res: any) => (res && typeof res === 'object' && 'data' in res ? res.data : res);

export function PlanoEditor({ planId }: { planId?: string }) {
  const navigate = useNavigate();
  const [meta, setMeta] = useState<PlanoMeta>({ nombre: '', propietario: '', ubicacion: '' });
  const [niveles, setNiveles] = useState<Nivel[]>(() => [
    { id: uid(), nombre: 'Planta Baja', espacios: [newEspacio('Habitación 1')] },
  ]);
  const [nivelActivoId, setNivelActivoId] = useState<string>(() => niveles[0].id);
  const [espacioActivoId, setEspacioActivoId] = useState<string>(() => niveles[0].espacios[0].id);
  const [selectedNodeId, setSelectedNodeId] = useState<string>(() => niveles[0].espacios[0].nodes[0].id);
  const [mode, setMode] = useState<'muro' | 'salto'>('muro');
  const [colActiva, setColActiva] = useState(false); // marcar columnas en muros
  const [colCount, setColCount] = useState(1); // nº de columnas por muro
  const [colAncho, setColAncho] = useState(30); // ancho de la columna (cm)
  const [colFondo, setColFondo] = useState(15); // saliente de la columna (cm)
  const [distance, setDistance] = useState('3');
  const [scale, setScale] = useState(44);
  const [placing, setPlacing] = useState(false); // ubicando el punto inicial de una nueva habitación
  const [movingNode, setMovingNode] = useState(false); // reubicando el nodo seleccionado
  const [savedId, setSavedId] = useState<string | undefined>(planId);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [derivando, setDerivando] = useState(false);
  const [showDatos, setShowDatos] = useState(false); // datos del plano colapsables

  // Cargar plano existente
  useEffect(() => {
    if (!planId) return;
    let cancel = false;
    setLoading(true);
    (async () => {
      try {
        const plan = dataOf(await apiService.getHousePlan(planId));
        if (cancel || !plan) return;
        const mapped = fromBackendPlan(plan);
        setMeta(mapped.meta);
        setNiveles(mapped.niveles);
        setSavedId(planId);
        const nv = mapped.niveles[0];
        setNivelActivoId(nv.id);
        setEspacioActivoId(nv.espacios[0].id);
        setSelectedNodeId(nv.espacios[0].nodes[0].id);
      } catch {
        /* noop */
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [planId]);

  const guardar = async () => {
    if (!meta.nombre.trim()) {
      showNotification('Atención', 'warning', 'Ponle un nombre al plano antes de guardar.');
      return;
    }
    setSaving(true);
    try {
      const payload = toBackendPlan(meta, niveles);
      if (savedId) {
        await apiService.updateHousePlan(savedId, payload);
        showNotification('Guardado', 'success', 'Los cambios del plano se guardaron correctamente.');
      } else {
        const created = dataOf(await apiService.createHousePlan(payload));
        const newId = created?.id;
        if (newId) {
          setSavedId(String(newId));
          showNotification('Guardado', 'success', 'El plano se creó correctamente.');
          navigate(`/planos/${newId}`, { replace: true });
        } else {
          showNotification('Guardado', 'info', 'El plano se guardó, pero el backend no devolvió un id.');
        }
      }
    } catch (e: any) {
      showNotification('Error', 'error', e?.message || 'No se pudo guardar el plano.');
    } finally {
      setSaving(false);
    }
  };

  // Derivar el plano a la calculadora de enchapes (el backend copia los espacios).
  const derivarEnchapes = async () => {
    if (!savedId) return;
    setDerivando(true);
    try {
      const created = dataOf(await apiService.importPlanToTiles(savedId, { nombre: `Enchapes ${meta.nombre}` }));
      const pid = created?.id;
      showNotification('Listo', 'success', 'Se creó un proyecto de enchapes desde el plano.');
      navigate(pid ? `/calculadoras/enchapes?project=${pid}` : '/calculadoras/enchapes');
    } catch (e: any) {
      showNotification('Error', 'error', e?.message || 'No se pudo derivar a enchapes.');
    } finally {
      setDerivando(false);
    }
  };

  const nivelActivo = niveles.find((n) => n.id === nivelActivoId) ?? niveles[0];
  const espacios = nivelActivo.espacios;
  const espacioActivo = espacios.find((e) => e.id === espacioActivoId) ?? espacios[0];

  // Actualiza inmutablemente el espacio activo
  const updateEspacio = useCallback(
    (fn: (e: Espacio) => Espacio) => {
      setNiveles((nvs) =>
        nvs.map((nv) =>
          nv.id !== nivelActivoId
            ? nv
            : { ...nv, espacios: nv.espacios.map((e) => (e.id !== espacioActivoId ? e : fn(e))) }
        )
      );
    },
    [nivelActivoId, espacioActivoId]
  );

  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 560 });
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: Math.max(420, el.clientHeight) }));
    ro.observe(el);
    setSize({ w: el.clientWidth, h: Math.max(420, el.clientHeight) });
    return () => ro.disconnect();
  }, []);

  // Centrar según todos los nodos del nivel activo
  const allNodes = useMemo(() => espacios.flatMap((e) => e.nodes), [espacios]);
  const center = useMemo(() => {
    if (allNodes.length === 0) return { cx: 0, cy: 0 };
    const xs = allNodes.map((n) => n.x);
    const ys = allNodes.map((n) => n.y);
    return { cx: (Math.min(...xs) + Math.max(...xs)) / 2, cy: (Math.min(...ys) + Math.max(...ys)) / 2 };
  }, [allNodes]);
  const ox = size.w / 2 - center.cx * scale;
  const oy = size.h / 2 - center.cy * scale;
  const toPx = (x: number, y: number) => ({ px: ox + x * scale, py: oy + y * scale });

  const commitEspacio = (updated: Espacio) => {
    setNiveles((nvs) =>
      nvs.map((nv) =>
        nv.id !== nivelActivoId ? nv : { ...nv, espacios: nv.espacios.map((x) => (x.id !== updated.id ? x : updated)) }
      )
    );
  };

  const addWall = (dir: Dir) => {
    if (placing || movingNode) return;
    const distM = parseFloat(distance);
    if (!distM || distM <= 0) return;
    const e = espacioActivo;
    const from = e.nodes.find((n) => n.id === selectedNodeId);
    if (!from) return;
    const v = DIRV[dir];
    const tx = +(from.x + v.x * distM).toFixed(3);
    const ty = +(from.y + v.y * distM).toFixed(3);
    const snap = e.nodes.find((n) => n.id !== from.id && Math.hypot(n.x - tx, n.y - ty) <= SNAP_M);
    const targetId = snap ? snap.id : uid();
    const nodes = snap ? e.nodes : [...e.nodes, { id: targetId, x: tx, y: ty }];
    const dup = e.walls.some((w) => (w.a === from.id && w.b === targetId) || (w.a === targetId && w.b === from.id));
    const nuevasCols = colActiva ? Array.from({ length: colCount }, () => ({ ancho: colAncho, fondo: colFondo })) : undefined;
    const walls = dup ? e.walls : [...e.walls, { id: uid(), a: from.id, b: targetId, opening: mode === 'salto', columnas: nuevasCols }];
    commitEspacio({ ...e, nodes, walls });
    setSelectedNodeId(targetId);
  };

  const undo = () => {
    const e = espacioActivo;
    if (e.walls.length === 0) return;
    const last = e.walls[e.walls.length - 1];
    const walls = e.walls.slice(0, -1);
    const usedB = walls.some((w) => w.a === last.b || w.b === last.b);
    const nodes = usedB || e.nodes[0].id === last.b ? e.nodes : e.nodes.filter((n) => n.id !== last.b);
    commitEspacio({ ...e, nodes, walls });
    setSelectedNodeId(last.a);
  };

  const clearEspacio = () => {
    const e = espacioActivo;
    const first = e.nodes[0] ?? { id: uid(), x: 0, y: 0 };
    commitEspacio({ ...e, nodes: [first], walls: [] });
    setSelectedNodeId(first.id);
  };

  // Clic en un muro: con "Columna" activo pone/quita columnas; si no, alterna abertura.
  const toggleWallOpening = (id: string) => {
    if (placing || movingNode) return;
    if (colActiva) {
      updateEspacio((e) => ({
        ...e,
        walls: e.walls.map((w) =>
          w.id === id
            ? { ...w, columnas: (w.columnas?.length || 0) > 0 ? [] : Array.from({ length: colCount }, () => ({ ancho: colAncho, fondo: colFondo })) }
            : w
        ),
      }));
      return;
    }
    updateEspacio((e) => ({ ...e, walls: e.walls.map((w) => (w.id === id ? { ...w, opening: !w.opening } : w)) }));
  };

  // Reubicar el nodo seleccionado a una posición (en metros)
  const moveNode = (nodeId: string, x: number, y: number) => {
    updateEspacio((e) => ({ ...e, nodes: e.nodes.map((n) => (n.id === nodeId ? { ...n, x, y } : n)) }));
  };

  // ── Niveles ──
  const addNivel = () => {
    const n: Nivel = { id: uid(), nombre: `Piso ${niveles.length + 1}`, espacios: [newEspacio('Habitación 1')] };
    setNiveles((nvs) => [...nvs, n]);
    setNivelActivoId(n.id);
    setEspacioActivoId(n.espacios[0].id);
    setSelectedNodeId(n.espacios[0].nodes[0].id);
  };
  const removeNivel = (id: string) => {
    if (niveles.length <= 1) return;
    const rest = niveles.filter((n) => n.id !== id);
    setNiveles(rest);
    if (nivelActivoId === id) {
      const nv = rest[0];
      setNivelActivoId(nv.id);
      setEspacioActivoId(nv.espacios[0].id);
      setSelectedNodeId(nv.espacios[0].nodes[0].id);
    }
  };
  const renameNivel = (id: string, nombre: string) =>
    setNiveles((nvs) => nvs.map((n) => (n.id === id ? { ...n, nombre } : n)));
  const selectNivel = (id: string) => {
    const nv = niveles.find((n) => n.id === id);
    if (!nv) return;
    setNivelActivoId(id);
    setEspacioActivoId(nv.espacios[0].id);
    setSelectedNodeId(nv.espacios[0].nodes[0].id);
  };

  // ── Espacios (habitaciones) ──
  // "+ Habitación" entra en modo ubicar: el siguiente clic en el lienzo fija el punto inicial.
  const addEspacio = () => setPlacing(true);

  const createEspacioAt = (x: number, y: number) => {
    const nombre = `Habitación ${espacios.length + 1}`;
    const e = newEspacio(nombre, { x, y });
    setNiveles((nvs) => nvs.map((nv) => (nv.id === nivelActivoId ? { ...nv, espacios: [...nv.espacios, e] } : nv)));
    setEspacioActivoId(e.id);
    setSelectedNodeId(e.nodes[0].id);
    setPlacing(false);
  };

  // Zoom con dos dedos (pellizco) en móvil.
  const pinchDist = useRef<number | null>(null);
  const handleTouchMove = (e: any) => {
    const touches = e?.evt?.touches;
    if (!touches || touches.length < 2) return;
    e.evt.preventDefault();
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    const dist = Math.hypot(dx, dy);
    if (pinchDist.current != null && pinchDist.current > 0) {
      const factor = dist / pinchDist.current;
      setScale((s) => Math.max(16, Math.min(160, s * factor)));
    }
    pinchDist.current = dist;
  };
  const handleTouchEnd = () => { pinchDist.current = null; };

  // Clic en el lienzo: ubicar nueva habitación o reubicar el nodo seleccionado.
  const handleStageClick = (e: any) => {
    if (!placing && !movingNode) return;
    const stage = e.target?.getStage?.();
    const pos = stage?.getPointerPosition?.();
    if (!pos) return;
    const snap = (v: number) => Math.round((v / scale) * 2) / 2; // a la ½ metro más cercana
    const wx = snap(pos.x - ox);
    const wy = snap(pos.y - oy);
    if (placing) {
      createEspacioAt(wx, wy);
    } else {
      moveNode(selectedNodeId, wx, wy);
      setMovingNode(false);
    }
  };
  const removeEspacio = (id: string) => {
    if (espacios.length <= 1) return;
    const rest = espacios.filter((e) => e.id !== id);
    setNiveles((nvs) => nvs.map((nv) => (nv.id === nivelActivoId ? { ...nv, espacios: rest } : nv)));
    if (espacioActivoId === id) {
      setEspacioActivoId(rest[0].id);
      setSelectedNodeId(rest[0].nodes[0].id);
    }
  };
  const renameEspacio = (id: string, nombre: string) =>
    setNiveles((nvs) =>
      nvs.map((nv) => (nv.id === nivelActivoId ? { ...nv, espacios: nv.espacios.map((e) => (e.id === id ? { ...e, nombre } : e)) } : nv))
    );
  const selectEspacio = (id: string) => {
    const e = espacios.find((x) => x.id === id);
    if (!e) return;
    setEspacioActivoId(id);
    setSelectedNodeId(e.nodes[0].id);
  };

  // Al hacer clic en un nodo: si es de otra habitación, la activa
  const onNodeClick = (espacioId: string, nodeId: string) => {
    if (placing || movingNode) return;
    if (espacioId !== espacioActivoId) setEspacioActivoId(espacioId);
    setSelectedNodeId(nodeId);
  };

  // Métricas del espacio activo
  const perimTotal = espacioActivo.walls.reduce((s, w) => s + wallLength(espacioActivo.nodes, w), 0);
  const perimWalls = espacioActivo.walls
    .filter((w) => !w.opening)
    .reduce((s, w) => s + wallLength(espacioActivo.nodes, w), 0);
  const ringActivo = computeRing(espacioActivo.nodes, espacioActivo.walls);
  const areaActivo = ringActivo ? shoelaceArea(ringActivo) : 0;
  const areaNivel = espacios.reduce((s, e) => s + espacioArea(e), 0);

  // Grilla
  const gridLines: number[][] = [];
  {
    const step = scale;
    for (let x = ox % step; x < size.w; x += step) gridLines.push([x, 0, x, size.h]);
    for (let y = oy % step; y < size.h; y += step) gridLines.push([0, y, size.w, y]);
  }

  // Flechas de dirección del nodo seleccionado (espacio activo)
  const sel = espacioActivo.nodes.find((n) => n.id === selectedNodeId);
  const arrowHandles: { dir: Dir; pts: number[] }[] = [];
  if (sel) {
    const { px, py } = toPx(sel.x, sel.y);
    const r0 = 16;
    const r1 = 40;
    arrowHandles.push({ dir: 'N', pts: [px, py - r0, px, py - r1] });
    arrowHandles.push({ dir: 'S', pts: [px, py + r0, px, py + r1] });
    arrowHandles.push({ dir: 'E', pts: [px + r0, py, px + r1, py] });
    arrowHandles.push({ dir: 'W', pts: [px - r0, py, px - r1, py] });
  }

  const roomColor = (idx: number) => ROOM_COLORS[idx % ROOM_COLORS.length];
  const btn = (active: boolean): CSSProperties => ({
    padding: '8px 14px',
    borderRadius: 8,
    border: `1px solid ${active ? '#b69462' : 'rgba(255,255,255,0.12)'}`,
    background: active ? 'rgba(182,148,98,0.2)' : 'transparent',
    color: active ? '#b69462' : '#fff',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: 13,
  });
  const dirBtn: CSSProperties = {
    width: 40,
    height: 40,
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.05)',
    color: '#f4efe6',
    cursor: 'pointer',
    fontSize: 18,
  };
  return (
    <div>
      {/* Barra superior: guardar / volver */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
        <button type="button" className="btn btn-secondary btn-small" onClick={() => navigate('/planos')} style={{ width: 'auto' }}>← Mis planos</button>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {savedId && (
            <>
              <button type="button" className="btn btn-small btn-secondary" onClick={derivarEnchapes} disabled={derivando} style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6 }} title="Crear un proyecto de enchapes con estos espacios"><Grid3x3 size={15} /> A Enchapes</button>
              <button type="button" className="btn btn-small btn-secondary" onClick={() => navigate(`/calculadoras/barrederas/${savedId}`)} style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6 }} title="Calcular barrederas con este plano"><Frame size={15} /> A Barrederas</button>
            </>
          )}
          <button type="button" className="btn btn-small" onClick={guardar} disabled={saving || loading} style={{ width: 'auto' }}>
            {saving ? 'Guardando…' : savedId ? '💾 Guardar cambios' : '💾 Guardar plano'}
          </button>
        </div>
      </div>
      {loading && <p className="small" style={{ marginBottom: 12 }}>Cargando plano…</p>}

      {/* Datos del plano (colapsable) */}
      <div className="card" style={{ marginBottom: 12, padding: showDatos ? undefined : '10px 16px' }}>
        <button
          type="button"
          onClick={() => setShowDatos((v) => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', background: 'none', border: 'none', color: '#f4efe6', cursor: 'pointer', font: 'inherit', padding: 0 }}
        >
          <span style={{ fontWeight: 600 }}>Datos del plano</span>
          <span className="small" style={{ color: '#8c8578' }}>{meta.nombre || 'Sin nombre'}{meta.ubicacion ? ` · ${meta.ubicacion}` : ''}</span>
          <span style={{ marginLeft: 'auto', color: '#8c8578' }}>{showDatos ? '▲' : '▼'}</span>
        </button>
        {showDatos && (
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginTop: 12 }}>
            <div>
              <label className="small" style={{ display: 'block', marginBottom: 4 }}>Nombre del plano</label>
              <input id="plano-nombre" className="input" value={meta.nombre} onChange={(e) => setMeta({ ...meta, nombre: e.target.value })} placeholder="Ej: Casa de Juan" />
            </div>
            <div>
              <label className="small" style={{ display: 'block', marginBottom: 4 }}>Propietario</label>
              <input id="plano-prop" className="input" value={meta.propietario} onChange={(e) => setMeta({ ...meta, propietario: e.target.value })} placeholder="Propietario" />
            </div>
            <div>
              <label className="small" style={{ display: 'block', marginBottom: 4 }}>Ubicación</label>
              <input id="plano-ubic" className="input" value={meta.ubicacion} onChange={(e) => setMeta({ ...meta, ubicacion: e.target.value })} placeholder="Ciudad" />
            </div>
          </div>
        )}
      </div>

      {/* Controles: piso · habitación · herramientas */}
      <div className="card" style={{ marginBottom: 12, display: 'grid', gap: 14 }}>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          {/* Piso */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: '1 1 240px' }}>
            <label className="small" style={{ fontWeight: 700 }}>Piso</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <select className="select" value={nivelActivoId} onChange={(e) => selectNivel(e.target.value)} style={{ flex: 1 }} aria-label="Piso activo">
                {niveles.map((nv) => (<option key={nv.id} value={nv.id}>{nv.nombre}</option>))}
              </select>
              <button type="button" style={dirBtn} onClick={addNivel} title="Agregar piso">＋</button>
              <button type="button" style={{ ...dirBtn, color: niveles.length > 1 ? '#ff6b6b' : '#555' }} onClick={() => removeNivel(nivelActivoId)} disabled={niveles.length <= 1} title="Eliminar piso">🗑</button>
            </div>
            <input className="input" value={nivelActivo.nombre} onChange={(e) => renameNivel(nivelActivo.id, e.target.value)} placeholder="Nombre del piso" aria-label="Nombre del piso" />
          </div>
          {/* Habitación */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: '1 1 240px' }}>
            <label className="small" style={{ fontWeight: 700 }}>Habitación</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <select className="select" value={espacioActivoId} onChange={(e) => selectEspacio(e.target.value)} style={{ flex: 1 }} aria-label="Habitación activa">
                {espacios.map((e) => (<option key={e.id} value={e.id}>{e.nombre}</option>))}
              </select>
              <button type="button" style={dirBtn} onClick={addEspacio} title="Agregar habitación">＋</button>
              <button type="button" style={{ ...dirBtn, color: espacios.length > 1 ? '#ff6b6b' : '#555' }} onClick={() => removeEspacio(espacioActivoId)} disabled={espacios.length <= 1} title="Eliminar habitación">🗑</button>
            </div>
            <input className="input" value={espacioActivo.nombre} onChange={(e) => renameEspacio(espacioActivo.id, e.target.value)} placeholder="Nombre de la habitación" aria-label="Nombre de la habitación" />
          </div>
        </div>

        {/* Herramientas de dibujo */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" style={btn(mode === 'muro')} onClick={() => setMode('muro')}>🧱 Muro</button>
            <button type="button" style={btn(mode === 'salto')} onClick={() => setMode('salto')}>🚪 Abertura</button>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', ...btn(colActiva) }}>
            <input type="checkbox" checked={colActiva} onChange={(ev) => setColActiva(ev.target.checked)} style={{ cursor: 'pointer' }} />
            <span>🏛️ Columna</span>
          </label>
          {colActiva && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <label className="small">N°</label>
              <input className="input" type="number" min={1} step={1} value={colCount} onChange={(ev) => setColCount(Math.max(1, parseInt(ev.target.value) || 1))} style={{ width: 60 }} aria-label="Número de columnas del muro" />
              <label className="small">Ancho</label>
              <input className="input" type="number" min={0} step={1} value={colAncho} onChange={(ev) => setColAncho(parseFloat(ev.target.value) || 0)} style={{ width: 70 }} aria-label="Ancho de columna (cm)" />
              <span className="small">cm</span>
              <label className="small">Saliente</label>
              <input className="input" type="number" min={0} step={1} value={colFondo} onChange={(ev) => setColFondo(parseFloat(ev.target.value) || 0)} style={{ width: 70 }} aria-label="Saliente de columna (cm)" />
              <span className="small">cm</span>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label className="small">Distancia</label>
            <input className="input" type="number" min={0} step={0.1} value={distance} onChange={(e) => setDistance(e.target.value)} style={{ width: 80 }} aria-label="Distancia en metros" />
            <span className="small">m</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 38px)', gridTemplateRows: 'repeat(2, 38px)', gap: 4 }}>
            <span />
            <button type="button" style={dirBtn} onClick={() => addWall('N')} title="Arriba">↑</button>
            <span />
            <button type="button" style={dirBtn} onClick={() => addWall('W')} title="Izquierda">←</button>
            <button type="button" style={dirBtn} onClick={() => addWall('S')} title="Abajo">↓</button>
            <button type="button" style={dirBtn} onClick={() => addWall('E')} title="Derecha">→</button>
          </div>
          <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
            <button type="button" style={btn(movingNode)} onClick={() => { setPlacing(false); setMovingNode((v) => !v); }} title="Reubicar el punto seleccionado">✎ Mover</button>
            <button type="button" style={btn(false)} onClick={undo} title="Deshacer último muro">↶</button>
            <button type="button" style={{ ...btn(false), color: '#ff6b6b', borderColor: 'rgba(255,107,107,0.3)' }} onClick={clearEspacio} title="Limpiar habitación">🗑️</button>
          </div>
        </div>
      </div>

      {/* Lienzo */}
      {(placing || movingNode) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', marginBottom: 10, borderRadius: 10, background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.35)' }}>
          <span className="small" style={{ color: '#93c5fd', fontWeight: 600 }}>
            {placing
              ? '📍 Haz clic en el lienzo para ubicar el punto inicial de la nueva habitación.'
              : '✎ Haz clic en el lienzo para mover el punto seleccionado a esa posición.'}
          </span>
          <button type="button" style={{ ...btn(false), padding: '6px 12px', marginLeft: 'auto' }} onClick={() => { setPlacing(false); setMovingNode(false); }}>Cancelar</button>
        </div>
      )}
      {colActiva && !placing && !movingNode && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', marginBottom: 10, borderRadius: 10, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.35)' }}>
          <span className="small" style={{ color: '#fbbf24', fontWeight: 600 }}>🏛️ Columna activa: los muros que dibujes llevarán {colCount} columna{colCount > 1 ? 's' : ''} de {colAncho}×{colFondo} cm. Toca un muro existente para ponerle o quitarle columnas. Cada columna suma 2 × saliente ({(2 * colFondo / 100).toFixed(2)} m) a las barrederas.</span>
        </div>
      )}
      <div ref={wrapRef} style={{ position: 'relative', width: '100%', height: '58vh', minHeight: 420, borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', background: '#0c0b0a', cursor: placing || movingNode ? 'crosshair' : 'default', touchAction: 'none' }}>
        {/* Zoom (overlay) */}
        <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 5, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button type="button" style={{ ...dirBtn, background: 'rgba(20,18,16,0.85)' }} onClick={() => setScale((s) => Math.min(120, s + 6))} title="Acercar">+</button>
          <button type="button" style={{ ...dirBtn, background: 'rgba(20,18,16,0.85)' }} onClick={() => setScale((s) => Math.max(16, s - 6))} title="Alejar">−</button>
        </div>
        <Stage width={size.w} height={size.h} onClick={handleStageClick} onTap={handleStageClick} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
          <Layer listening={false}>
            {gridLines.map((p, i) => (
              <Line key={i} points={p} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
            ))}
          </Layer>

          <Layer>
            {espacios.map((e, idx) => {
              const isActive = e.id === espacioActivoId;
              const col = roomColor(idx);
              return (
                <Group key={e.id} opacity={isActive ? 1 : 0.4}>
                  {e.walls.map((w) => {
                    const a = e.nodes.find((n) => n.id === w.a);
                    const b = e.nodes.find((n) => n.id === w.b);
                    if (!a || !b) return null;
                    const pa = toPx(a.x, a.y);
                    const pb = toPx(b.x, b.y);
                    const mid = { x: (pa.px + pb.px) / 2, y: (pa.py + pb.py) / 2 };
                    const len = Math.hypot(a.x - b.x, a.y - b.y);
                    return (
                      <Group key={w.id} onClick={isActive ? () => toggleWallOpening(w.id) : undefined} onTap={isActive ? () => toggleWallOpening(w.id) : undefined}>
                        <Line points={[pa.px, pa.py, pb.px, pb.py]} stroke={w.opening ? '#8c8578' : col} strokeWidth={w.opening ? 3 : 5} dash={w.opening ? [8, 6] : undefined} lineCap="round" />
                        {(w.columnas?.length || 0) > 0 && (w.columnas || []).map((c, ci) => {
                          const n = w.columnas!.length;
                          const f = (ci + 1) / (n + 1);
                          const cx = pa.px + (pb.px - pa.px) * f;
                          const cy = pa.py + (pb.py - pa.py) * f;
                          const wPx = Math.max(8, (c.ancho / 100) * scale);
                          const hPx = Math.max(8, (c.fondo / 100) * scale);
                          return <Rect key={ci} x={cx - wPx / 2} y={cy - hPx / 2} width={wPx} height={hPx} fill="#f59e0b" stroke="#0c0b0a" strokeWidth={1.5} cornerRadius={2} listening={false} />;
                        })}
                        {isActive && (
                          <Text x={mid.x - 24} y={mid.y - 20} width={48} align="center" text={`${len.toFixed(2)} m`} fontSize={12} fill={w.opening ? '#8c8578' : '#e8dcc6'} />
                        )}
                      </Group>
                    );
                  })}
                  {e.nodes.map((n) => {
                    const { px, py } = toPx(n.x, n.y);
                    const isSel = isActive && n.id === selectedNodeId;
                    return (
                      <Circle key={n.id} x={px} y={py} radius={isSel ? 8 : 6} fill={isSel ? col : '#0c0b0a'} stroke={col} strokeWidth={2} onClick={() => onNodeClick(e.id, n.id)} onTap={() => onNodeClick(e.id, n.id)} />
                    );
                  })}
                </Group>
              );
            })}

            {/* Flechas de dirección en el nodo seleccionado */}
            {arrowHandles.map((h) => (
              <Arrow key={h.dir} points={h.pts} pointerLength={8} pointerWidth={8} stroke="#b69462" fill="#b69462" strokeWidth={3} opacity={0.85} hitStrokeWidth={20} onClick={() => addWall(h.dir)} onTap={() => addWall(h.dir)} />
            ))}
          </Layer>
        </Stage>
      </div>

      {/* Métricas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginTop: 12 }}>
        <div className="card" style={{ padding: 14 }}>
          <div className="small">Perímetro total ({espacioActivo.nombre})</div>
          <div style={{ fontWeight: 700, fontSize: 20, color: '#b69462' }}>{perimTotal.toFixed(2)} m</div>
        </div>
        <div className="card" style={{ padding: 14 }}>
          <div className="small">Perímetro con muro (barrederas)</div>
          <div style={{ fontWeight: 700, fontSize: 20, color: '#b69462' }}>{perimWalls.toFixed(2)} m</div>
        </div>
        <div className="card" style={{ padding: 14 }}>
          <div className="small">Área {ringActivo ? '(cerrada)' : '(abierta)'}</div>
          <div style={{ fontWeight: 700, fontSize: 20, color: ringActivo ? '#34d399' : '#8c8578' }}>{ringActivo ? `${areaActivo.toFixed(2)} m²` : '—'}</div>
        </div>
        <div className="card" style={{ padding: 14 }}>
          <div className="small">Área total del piso</div>
          <div style={{ fontWeight: 700, fontSize: 20, color: '#f4efe6' }}>{areaNivel.toFixed(2)} m²</div>
        </div>
      </div>

      <p className="small" style={{ color: '#8c8578', marginTop: 10 }}>
        Cada habitación es un polígono independiente. Selecciona una habitación (chip o clic en sus nodos), elige un
        nodo, escribe la distancia y una dirección para trazar muros; vuelve al primer nodo para cerrarla. Marca muros
        como <strong style={{ color: '#a59e90' }}>abertura</strong> (clic en el muro) para puertas/pasillos.
        Activa <strong style={{ color: '#fbbf24' }}>🏛️ Columna</strong> para que los muros lleven columnas (se dibujan en naranja y suman perímetro en Barrederas).
      </p>
    </div>
  );
}
