import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ClipboardList, Search, Handshake } from 'lucide-react';
import { apiService, extractData } from '../../shared/services/api';
import { grupoDesdeBackend } from './mapeo';
import { ETIQUETA_RECURSO, aNumero, money, type GrupoRecurso } from './types';

/** Fila del consolidado: un insumo con su cantidad sumada en toda la obra. */
interface FilaConsolidado {
  insumoId: string;
  descripcion: string;
  unidad: string;
  grupo: GrupoRecurso;
  cantidadTotal: string | number;
  valorUnitario: string;
  valorTotal: string;
}

const ORDEN_GRUPOS: GrupoRecurso[] = ['MATERIALES', 'MANO_OBRA', 'EQUIPOS', 'TRANSPORTE'];

/** Lee el consolidado venga agrupado por el servidor o como lista plana. */
function normalizar(d: any): FilaConsolidado[] {
  if (!d) return [];
  const bruto: any[] = Array.isArray(d)
    ? d
    : Array.isArray(d.items) ? d.items
    : Array.isArray(d.insumos) ? d.insumos
    // Formato agrupado: { grupos: [{ tipo, items: [...] }] }
    : Array.isArray(d.grupos) ? d.grupos.flatMap((g: any) => (g.items ?? []).map((i: any) => ({ grupo: g.tipo ?? g.grupo, ...i })))
    : [];
  return bruto.map((i) => ({
    insumoId: String(i.insumoId ?? i.insumo_id ?? i.id ?? ''),
    descripcion: i.descripcion ?? i.nombre ?? '',
    unidad: i.unidad ?? '',
    // El servidor nombra los grupos en singular (MATERIAL, EQUIPO): sin
    // traducir, el insumo caería fuera de todas las secciones y no se vería.
    grupo: grupoDesdeBackend(i.grupo ?? i.tipo),
    cantidadTotal: i.cantidadTotal ?? i.cantidad_total ?? i.cantidad ?? 0,
    valorUnitario: String(i.valorUnitario ?? i.valor_unitario ?? '0'),
    valorTotal: String(i.valorTotal ?? i.valor_total ?? '0'),
  }));
}

/**
 * HU-19 · Consolidados de materiales, mano de obra y equipos.
 *
 * Es la lista de compras de la obra: cada insumo con la cantidad sumada de
 * todo el proyecto. Según el DOC-04 es el módulo más útil en obra, así que se
 * diseña pensando en consultarlo desde el móvil.
 */
export function ConsolidadosPage() {
  const { projectId = '' } = useParams();
  const navigate = useNavigate();
  const [filas, setFilas] = useState<FilaConsolidado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [grupo, setGrupo] = useState<'' | GrupoRecurso>('');

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setFilas(normalizar(extractData(await apiService.getConsolidados(projectId))));
    } catch (e: any) {
      setFilas([]);
      setError(e?.message || 'No se pudo cargar el consolidado.');
    } finally {
      setCargando(false);
    }
  }, [projectId]);

  useEffect(() => { cargar(); }, [cargar]);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return filas.filter((f) =>
      (!grupo || f.grupo === grupo) && (!q || f.descripcion.toLowerCase().includes(q))
    );
  }, [filas, busqueda, grupo]);

  const porGrupo = useMemo(() => {
    const mapa = new Map<GrupoRecurso, FilaConsolidado[]>();
    for (const f of visibles) {
      const lista = mapa.get(f.grupo) ?? [];
      lista.push(f);
      mapa.set(f.grupo, lista);
    }
    // Se recorre en el orden fijo de los grupos, no en el de llegada.
    return ORDEN_GRUPOS.filter((g) => mapa.has(g)).map((g) => [g, mapa.get(g)!] as const);
  }, [visibles]);

  const totalGeneral = visibles.reduce((s, f) => s + aNumero(f.valorTotal), 0);

  return (
    <main>
      <div className="flex-between" style={{ marginBottom: 8, gap: 12, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 'clamp(20px, 5.5vw, 28px)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
          <ClipboardList size={26} color="#b69462" /> Consolidados
        </h1>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-small btn-secondary" onClick={() => navigate(`/obra/${projectId}/presupuesto`)} style={{ width: 'auto' }}>← Presupuesto</button>
          {/* El consolidado es justo lo que se le manda al proveedor: el paso
              siguiente natural es pedirle precio. */}
          <button type="button" className="btn btn-small" onClick={() => navigate(`/obra/${projectId}/cotizaciones`)} disabled={filas.length === 0} style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Handshake size={15} /> Cotizar
          </button>
        </div>
      </div>
      <p className="small" style={{ marginBottom: 16 }}>
        Todos los insumos del proyecto con su cantidad sumada. Es la lista de compras de la obra.
      </p>

      <div className="card" style={{ marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 0 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#8c8578' }} />
          <input className="input" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar insumo…" style={{ paddingLeft: 36 }} />
        </div>
        {/* El filtro es local sobre lo ya normalizado, así que usa el nombre de la interfaz. */}
        <select className="select" value={grupo} onChange={(e) => setGrupo(e.target.value as '' | GrupoRecurso)} style={{ flex: '0 1 200px' }} aria-label="Filtrar por grupo">
          <option value="">Todos los grupos</option>
          {ORDEN_GRUPOS.map((g) => <option key={g} value={g}>{ETIQUETA_RECURSO[g]}</option>)}
        </select>
      </div>

      {cargando ? (
        <p className="small" style={{ color: '#999' }}>Cargando consolidado…</p>
      ) : error ? (
        <div className="card" style={{ textAlign: 'center', padding: 32 }}>
          <p className="small" style={{ color: '#ff6b6b' }}>{error}</p>
          <p className="small" style={{ color: '#8c8578', marginTop: 8 }}>Falta el endpoint analytics/consolidated en el servidor.</p>
        </div>
      ) : filas.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <p className="small" style={{ color: '#999' }}>Aún no hay insumos: el presupuesto está vacío.</p>
        </div>
      ) : visibles.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <p className="small" style={{ color: '#999' }}>Ningún insumo coincide con el filtro.</p>
        </div>
      ) : (
        <>
          {porGrupo.map(([g, items]) => {
            const subtotal = items.reduce((s, f) => s + aNumero(f.valorTotal), 0);
            return (
              <div key={g} className="card" style={{ marginBottom: 14 }}>
                <div className="flex-between" style={{ marginBottom: 12, gap: 8, flexWrap: 'wrap' }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700 }}>{ETIQUETA_RECURSO[g] ?? g}</h3>
                  <span style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
                    <span className="small" style={{ color: '#8c8578' }}>{items.length} insumo{items.length === 1 ? '' : 's'}</span>
                    <span style={{ fontWeight: 700, color: '#b69462' }}>{money(subtotal)}</span>
                  </span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <th style={{ textAlign: 'left', padding: '9px 8px' }}>Insumo</th>
                        <th style={{ textAlign: 'center', padding: '9px 8px' }}>Un.</th>
                        <th style={{ textAlign: 'right', padding: '9px 8px' }}>Cantidad</th>
                        <th style={{ textAlign: 'right', padding: '9px 8px' }}>V. unitario</th>
                        <th style={{ textAlign: 'right', padding: '9px 8px' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((f) => (
                        <tr key={f.insumoId || f.descripcion} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td style={{ padding: '9px 8px' }}>{f.descripcion}</td>
                          <td style={{ padding: '9px 8px', textAlign: 'center', color: '#8c8578' }}>{f.unidad}</td>
                          <td style={{ padding: '9px 8px', textAlign: 'right', fontWeight: 600 }}>{f.cantidadTotal}</td>
                          <td style={{ padding: '9px 8px', textAlign: 'right', color: '#c0b8a9' }}>{money(f.valorUnitario)}</td>
                          <td style={{ padding: '9px 8px', textAlign: 'right', fontWeight: 700, color: '#b69462' }}>{money(f.valorTotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}

          <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700 }}>Total insumos</span>
            <span style={{ fontWeight: 800, fontSize: 20, color: '#b69462' }}>{money(totalGeneral)}</span>
          </div>
        </>
      )}
    </main>
  );
}
