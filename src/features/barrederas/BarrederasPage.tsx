import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Frame, Save } from 'lucide-react';
import { apiService } from '../../shared/services/api';
import { showNotification } from '../../shared/hooks/useNotifications';
import { fromBackendPlan, type PlanoMeta } from '../planos/mapping';
import { espacioColumnas, espacioColumnasExtra, espacioPerimetros, uid, type Espacio, type Nivel } from '../planos/planoGeometry';

const dataOf = (res: any) => (res && typeof res === 'object' && 'data' in res ? res.data : res);
const money = (n: number) => '$' + Math.round(n).toLocaleString('es-CO');

// Biblioteca de materiales reutilizable entre obras (persistida en el navegador).
const LIB_KEY = 'barrederas_materiales_v1';

type Modo = 'metro' | 'ceramica';
type Material = {
  id: string;
  nombre: string;
  tipo: string;
  color: string;
  altura: number; // cm
  modo: Modo;
  // modo === 'metro'
  precio_por_metro: number;
  // modo === 'ceramica'
  largo_cm: number; // largo de cada pieza (ej. 60)
  piezas_por_ceramica: number; // tiras que salen de una cerámica (por defecto 1)
  precio_por_ceramica: number;
};

const nuevoMaterial = (): Material => ({
  id: uid(),
  nombre: 'Barredera',
  tipo: 'aluminio',
  color: '',
  altura: 10,
  modo: 'metro',
  precio_por_metro: 0,
  largo_cm: 60,
  piezas_por_ceramica: 1,
  precio_por_ceramica: 0,
});

const normalizeMat = (m: any): Material => ({ ...nuevoMaterial(), ...m, id: m?.id || uid() });

const loadLib = (): Material[] => {
  try {
    const raw = localStorage.getItem(LIB_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length) return arr.map(normalizeMat);
    }
  } catch {
    /* ignore */
  }
  return [nuevoMaterial()];
};

// Cálculo por habitación según el material asignado.
function calcEspacio(perimetro: number, m?: Material): { ceramicas: number | null; precio: number } {
  if (!m) return { ceramicas: null, precio: 0 };
  if (m.modo === 'ceramica') {
    const largoM = (m.largo_cm || 0) / 100;
    const piezasNecesarias = largoM > 0 ? Math.ceil(perimetro / largoM) : 0;
    const porCeramica = Math.max(1, m.piezas_por_ceramica || 1);
    const ceramicas = Math.ceil(piezasNecesarias / porCeramica);
    return { ceramicas, precio: ceramicas * (m.precio_por_ceramica || 0) };
  }
  return { ceramicas: null, precio: perimetro * (m.precio_por_metro || 0) };
}

// Guarda los materiales en el catálogo de Materiales (categoría "Barrederas").
async function guardarEnCatalogo(materiales: Material[]): Promise<void> {
  const cats = dataOf(await apiService.getCatalogCategories());
  let cat = (Array.isArray(cats) ? cats : []).find((c: any) => (c.name || '').toLowerCase() === 'barrederas');
  if (!cat) cat = dataOf(await apiService.createCatalogCategory({ name: 'Barrederas', description: 'Materiales de barrederas' }));
  const catId = cat?.id;
  if (!catId) return;
  const existing = dataOf(await apiService.getCatalogProducts(String(catId)));
  const existingNames = new Set((Array.isArray(existing) ? existing : []).map((p: any) => (p.name || '').toLowerCase()));
  for (const m of materiales) {
    if (existingNames.has(m.nombre.trim().toLowerCase())) continue;
    const desc = m.modo === 'ceramica'
      ? `${m.tipo} · cerámica ${m.largo_cm} cm · ${m.piezas_por_ceramica} tira(s)/cerámica`
      : `${m.tipo} · por metro · altura ${m.altura} cm`;
    const prod = dataOf(await apiService.createCatalogProduct({ category_id: catId, name: m.nombre.trim(), description: desc }));
    const precio = m.modo === 'ceramica' ? m.precio_por_ceramica : m.precio_por_metro;
    if (prod?.id && precio > 0) {
      await apiService.addCatalogPrice(String(prod.id), {
        hardware_store: 'Barrederas',
        brand: m.tipo || 'General',
        price: precio,
        notes: m.modo === 'ceramica' ? `Por cerámica (${m.largo_cm} cm)` : 'Por metro',
      });
    }
  }
}

export function BarrederasPage() {
  const { planId } = useParams();
  return planId ? <BarrederasCalc planId={planId} /> : <PlanoPicker />;
}

function PlanoPicker() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const res = dataOf(await apiService.getHousePlans());
        if (!cancel) setPlans(Array.isArray(res) ? res : []);
      } catch {
        if (!cancel) setPlans([]);
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, []);

  return (
    <main>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}><Frame size={28} color="#b69462" /> Barrederas</h1>
      <p className="small" style={{ marginBottom: 16 }}>Elige un plano de casa para calcular las barrederas por habitación.</p>
      {loading ? (
        <p className="small" style={{ color: '#999' }}>Cargando planos…</p>
      ) : plans.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <p className="small" style={{ color: '#999' }}>No tienes planos. Crea uno primero en “Planos”.</p>
          <button type="button" className="btn mt-2" onClick={() => navigate('/planos/nuevo')} style={{ width: 'auto' }}>Crear un plano</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {plans.map((p) => (
            <button
              key={p.id}
              type="button"
              className="card"
              onClick={() => navigate(`/calculadoras/barrederas/${p.id}`)}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', textAlign: 'left', cursor: 'pointer', font: 'inherit', color: 'inherit' }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: 16 }}>{p.nombre || 'Plano sin nombre'}</div>
                <p className="small">{[p.propietario, p.ubicacion].filter(Boolean).join(' · ') || '—'}</p>
              </div>
              <span className="small" style={{ color: '#b69462' }}>Calcular →</span>
            </button>
          ))}
        </div>
      )}
    </main>
  );
}

function BarrederasCalc({ planId }: { planId: string }) {
  const navigate = useNavigate();
  const [meta, setMeta] = useState<PlanoMeta>({ nombre: '', propietario: '', ubicacion: '' });
  const [niveles, setNiveles] = useState<Nivel[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingMat, setSavingMat] = useState(false);
  const [materiales, setMateriales] = useState<Material[]>(() => loadLib()); // desde la biblioteca
  const [editId, setEditId] = useState<string>(() => loadLib()[0]?.id || ''); // material en edición
  const [asignacion, setAsignacion] = useState<Record<string, string>>({});

  // Guarda la biblioteca de materiales para reutilizarla en otras obras.
  useEffect(() => {
    try {
      localStorage.setItem(LIB_KEY, JSON.stringify(materiales));
    } catch {
      /* ignore */
    }
  }, [materiales]);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const plan = dataOf(await apiService.getHousePlan(planId));
        if (cancel || !plan) return;
        const mapped = fromBackendPlan(plan);
        setMeta(mapped.meta);
        setNiveles(mapped.niveles);
        const mat0 = materiales[0]?.id;
        const asig: Record<string, string> = {};
        mapped.niveles.forEach((nv) => nv.espacios.forEach((e) => { if (mat0) asig[e.id] = mat0; }));
        setAsignacion(asig);
      } catch {
        showNotification('Error', 'error', 'No se pudo cargar el plano.');
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId]);

  const getMat = (id: string | undefined) => materiales.find((m) => m.id === id);
  const editMat = getMat(editId) || materiales[0];

  // Cada columna del muro suma 2 × su saliente (medidas puestas en el editor de planos).
  const extraColumnas = (e: Espacio) => espacioColumnasExtra(e);
  const perimetroDe = (e: Espacio) => espacioPerimetros(e).conMuro + extraColumnas(e);

  const totales = useMemo(() => {
    let metros = 0;
    let ceramicas = 0;
    let precio = 0;
    let columnas = 0;
    niveles.forEach((nv) =>
      nv.espacios.forEach((e) => {
        const perimetro = perimetroDe(e);
        const m = getMat(asignacion[e.id]);
        const r = calcEspacio(perimetro, m);
        metros += perimetro;
        columnas += espacioColumnas(e);
        if (r.ceramicas != null) ceramicas += r.ceramicas;
        precio += r.precio;
      })
    );
    return { metros, ceramicas, precio, columnas };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [niveles, asignacion, materiales]);

  const patchEdit = (patch: Partial<Material>) =>
    setMateriales((ms) => ms.map((m) => (m.id === editId ? { ...m, ...patch } : m)));

  const addMaterial = () => {
    const m = nuevoMaterial();
    setMateriales((ms) => [...ms, m]);
    setEditId(m.id);
  };

  const removeMaterial = () => {
    if (materiales.length <= 1) return;
    const id = editId;
    const rest = materiales.filter((m) => m.id !== id);
    setMateriales(rest);
    setEditId(rest[0]?.id || '');
    setAsignacion((a) => {
      const fallback = rest[0]?.id;
      const next: Record<string, string> = {};
      for (const k of Object.keys(a)) next[k] = a[k] === id ? fallback : a[k];
      return next;
    });
  };

  // "Guardar materiales": biblioteca local (ya persiste) + catálogo de Materiales.
  const guardarMateriales = async () => {
    setSavingMat(true);
    try {
      localStorage.setItem(LIB_KEY, JSON.stringify(materiales));
      await guardarEnCatalogo(materiales);
      showNotification('Materiales guardados', 'success', 'Disponibles en próximas obras y en la sección Materiales.');
    } catch (e: any) {
      showNotification('Guardado parcial', 'warning', e?.message || 'Se guardaron localmente, pero no en el catálogo.');
    } finally {
      setSavingMat(false);
    }
  };

  const guardar = async () => {
    setSaving(true);
    try {
      const created = dataOf(await apiService.importPlanToGuardaescobas(planId, { nombre: `Barrederas ${meta.nombre}` }));
      const projectId = created?.id;
      if (projectId) {
        await apiService.updateGuardaescobasProject(String(projectId), {
          materiales: materiales.map((m) => ({
            id: m.id,
            nombre: m.nombre,
            tipo: m.tipo,
            color: m.color,
            altura: m.altura,
            modo: m.modo,
            precio_por_metro: m.precio_por_metro,
            largo_cm: m.largo_cm,
            piezas_por_ceramica: m.piezas_por_ceramica,
            precio_por_ceramica: m.precio_por_ceramica,
          })),
        });
      }
      showNotification('Guardado', 'success', 'Se creó el proyecto de barrederas con sus materiales.');
    } catch (e: any) {
      showNotification('Error', 'error', e?.message || 'No se pudo guardar el proyecto.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main>
        <p className="small" style={{ color: '#999' }}>Cargando plano…</p>
      </main>
    );
  }

  const hayCeramica = materiales.some((m) => m.modo === 'ceramica');
  const hayColumnas = niveles.some((nv) => nv.espacios.some((e) => espacioColumnas(e) > 0));
  const labelDe = (m: Material) => `${m.nombre}${m.color ? ` — ${m.color}` : ''} · ${m.modo === 'ceramica' ? 'cerámica' : 'metro'}`;

  return (
    <main>
      <div className="flex-between" style={{ marginBottom: 8, gap: 12 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}><Frame size={26} color="#b69462" /> Barrederas — {meta.nombre || 'Plano'}</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn btn-small btn-secondary" onClick={() => navigate('/calculadoras/barrederas')} style={{ width: 'auto' }}>← Cambiar plano</button>
          <button type="button" className="btn btn-small" onClick={guardar} disabled={saving} style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6 }}>{saving ? 'Guardando…' : (<><Save size={15} /> Guardar obra</>)}</button>
        </div>
      </div>
      <p className="small" style={{ marginBottom: 16 }}>El metraje de cada habitación es su perímetro con muro (las aberturas —puertas/pasillos— no cuentan). Las columnas se marcan en el editor de planos y suman perímetro.</p>

      {/* Materiales */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="flex-between mb-2">
          <h3 style={{ fontSize: 18, fontWeight: 600 }}>Materiales</h3>
          <button type="button" className="btn btn-small" onClick={guardarMateriales} disabled={savingMat} style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6 }}>{savingMat ? 'Guardando…' : (<><Save size={15} /> Guardar materiales</>)}</button>
        </div>

        {/* Selector de material a editar */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
          <select className="select" value={editId} onChange={(e) => setEditId(e.target.value)} style={{ flex: '1 1 220px', maxWidth: 320 }}>
            {materiales.map((m) => (
              <option key={m.id} value={m.id}>{labelDe(m)}</option>
            ))}
          </select>
          <button type="button" className="btn btn-small btn-secondary" onClick={addMaterial} style={{ width: 'auto' }}>+ Agregar material</button>
          <button type="button" className="btn btn-small btn-danger" onClick={removeMaterial} disabled={materiales.length <= 1} style={{ width: 'auto' }}>Eliminar</button>
        </div>

        {/* Edición del material seleccionado */}
        {editMat && (
          <div style={{ padding: 12, borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8 }}>
              <div>
                <label className="small" style={{ display: 'block', marginBottom: 4 }}>Nombre</label>
                <input className="input" value={editMat.nombre} onChange={(e) => patchEdit({ nombre: e.target.value })} />
              </div>
              <div>
                <label className="small" style={{ display: 'block', marginBottom: 4 }}>Tipo</label>
                <input className="input" value={editMat.tipo} onChange={(e) => patchEdit({ tipo: e.target.value })} placeholder="aluminio, cerámica…" />
              </div>
              <div>
                <label className="small" style={{ display: 'block', marginBottom: 4 }}>Color</label>
                <input className="input" value={editMat.color} onChange={(e) => patchEdit({ color: e.target.value })} />
              </div>
              <div>
                <label className="small" style={{ display: 'block', marginBottom: 4 }}>Modo de cálculo</label>
                <select className="select" value={editMat.modo} onChange={(e) => patchEdit({ modo: e.target.value as Modo })}>
                  <option value="metro">Por metro</option>
                  <option value="ceramica">Por cerámica (cortada)</option>
                </select>
              </div>
            </div>

            {editMat.modo === 'metro' ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, marginTop: 10 }}>
                <div>
                  <label className="small" style={{ display: 'block', marginBottom: 4 }}>Precio por metro</label>
                  <input className="input" type="number" min={0} step={0.5} value={editMat.precio_por_metro} onChange={(e) => patchEdit({ precio_por_metro: parseFloat(e.target.value) || 0 })} />
                </div>
                <div>
                  <label className="small" style={{ display: 'block', marginBottom: 4 }}>Altura (cm)</label>
                  <input className="input" type="number" min={0} step={1} value={editMat.altura} onChange={(e) => patchEdit({ altura: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, marginTop: 10 }}>
                <div>
                  <label className="small" style={{ display: 'block', marginBottom: 4 }}>Largo de la cerámica (cm)</label>
                  <input className="input" type="number" min={0} step={1} value={editMat.largo_cm} onChange={(e) => patchEdit({ largo_cm: parseFloat(e.target.value) || 0 })} placeholder="Ej: 60" />
                </div>
                <div>
                  <label className="small" style={{ display: 'block', marginBottom: 4 }}>Tiras por cerámica</label>
                  <input className="input" type="number" min={1} step={1} value={editMat.piezas_por_ceramica} onChange={(e) => patchEdit({ piezas_por_ceramica: parseInt(e.target.value) || 1 })} />
                </div>
                <div>
                  <label className="small" style={{ display: 'block', marginBottom: 4 }}>Precio por cerámica</label>
                  <input className="input" type="number" min={0} step={0.5} value={editMat.precio_por_ceramica} onChange={(e) => patchEdit({ precio_por_ceramica: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>
            )}
          </div>
        )}
        <p className="small" style={{ color: '#8c8578', marginTop: 10 }}>💾 “Guardar materiales” los deja disponibles para tus próximas obras y en la sección Materiales.</p>
      </div>

      {/* Columnas del plano (solo lectura) — se marcan y miden en el editor de planos */}
      {hayColumnas && (
        <div className="card" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600 }}>🏛️ Columnas del plano: {totales.columnas}</span>
          <span className="small" style={{ color: '#8c8578' }}>Cada columna suma 2 × su saliente al perímetro (medidas puestas en el editor de planos).</span>
        </div>
      )}

      {/* Detalle por habitación */}
      {niveles.map((nv) => (
        <div key={nv.id} className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>{nv.nombre}</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <th style={{ textAlign: 'left', padding: '10px 8px' }}>Habitación</th>
                  <th style={{ textAlign: 'right', padding: '10px 8px' }}>Metros</th>
                  <th style={{ textAlign: 'left', padding: '10px 8px' }}>Material</th>
                  {hayCeramica && <th style={{ textAlign: 'right', padding: '10px 8px' }}>Cerámicas</th>}
                  <th style={{ textAlign: 'right', padding: '10px 8px' }}>Precio</th>
                </tr>
              </thead>
              <tbody>
                {nv.espacios.map((e) => {
                  const base = espacioPerimetros(e).conMuro;
                  const ncol = espacioColumnas(e);
                  const extra = extraColumnas(e);
                  const perimetro = base + extra;
                  const material = getMat(asignacion[e.id]);
                  const r = calcEspacio(perimetro, material);
                  return (
                    <tr key={e.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '10px 8px' }}>
                        {e.nombre}
                        {ncol > 0 && <span className="small" style={{ color: '#f59e0b' }}> · 🏛️ {ncol} col</span>}
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 600 }}>
                        {perimetro.toFixed(2)} m
                        {extra > 0 && <span className="small" style={{ color: '#f59e0b' }}> (+{extra.toFixed(2)})</span>}
                      </td>
                      <td style={{ padding: '10px 8px' }}>
                        <select className="select" value={asignacion[e.id] || ''} onChange={(ev) => setAsignacion((a) => ({ ...a, [e.id]: ev.target.value }))} style={{ maxWidth: 220 }}>
                          {materiales.map((mm) => (
                            <option key={mm.id} value={mm.id}>{mm.nombre}{mm.color ? ` — ${mm.color}` : ''}</option>
                          ))}
                        </select>
                      </td>
                      {hayCeramica && (
                        <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 700, color: '#60a5fa' }}>
                          {r.ceramicas != null ? r.ceramicas : '—'}
                        </td>
                      )}
                      <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 700, color: '#b69462' }}>{money(r.precio)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* Totales */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <div className="card" style={{ padding: 16 }}>
          <div className="small">Total metros de barrederas</div>
          <div style={{ fontWeight: 800, fontSize: 24, color: '#b69462' }}>{totales.metros.toFixed(2)} m</div>
        </div>
        {hayCeramica && (
          <div className="card" style={{ padding: 16 }}>
            <div className="small">Cerámicas necesarias</div>
            <div style={{ fontWeight: 800, fontSize: 24, color: '#60a5fa' }}>{totales.ceramicas}</div>
          </div>
        )}
        <div className="card" style={{ padding: 16 }}>
          <div className="small">Precio total estimado</div>
          <div style={{ fontWeight: 800, fontSize: 24, color: '#34d399' }}>{money(totales.precio)}</div>
        </div>
      </div>
    </main>
  );
}
