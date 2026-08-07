import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LayoutDashboard, Plus, AlertTriangle, ArrowRight } from 'lucide-react';
import { apiService, extractData } from '../../shared/services/api';
import {
  ETIQUETA_RECURSO, aNumero, money,
  type GrupoRecurso, type Proyecto, type ResumenAnalitica,
} from './types';

/** Tono por tipo de recurso: del dorado de marca al más apagado, para que la
 *  composición del gasto se lea de un vistazo sin inventar colores nuevos. */
const TONO_RECURSO: Record<GrupoRecurso, string> = {
  MATERIALES: '#b69462',
  MANO_OBRA: '#7d6742',
  EQUIPOS: '#5f5340',
  TRANSPORTE: '#463f34',
};

/** HU-17 · HU-18 — Panel principal: cómo va el proyecto y dónde está el dinero. */
export function PanelObraPage() {
  const { projectId = '' } = useParams();
  const navigate = useNavigate();
  const [proyecto, setProyecto] = useState<Proyecto | null>(null);
  const [resumen, setResumen] = useState<ResumenAnalitica | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [proy, res] = await Promise.all([
        apiService.getObraProyecto(projectId).then(extractData).catch(() => null),
        apiService.getAnalitica(projectId).then(extractData),
      ]);
      setProyecto(proy || null);
      setResumen(res || null);
    } catch (e: any) {
      setError(e?.message || 'No se pudo cargar el panel.');
    } finally {
      setCargando(false);
    }
  }, [projectId]);

  // La analítica se recalcula al entrar: no hay botón "Actualizar" obligatorio (H-14).
  useEffect(() => { cargar(); }, [cargar]);

  if (cargando) return <main><p className="small" style={{ color: '#999' }}>Cargando panel…</p></main>;

  if (error) {
    return (
      <main>
        <div className="card" style={{ textAlign: 'center', padding: 32 }}>
          <p className="small" style={{ color: '#ff6b6b' }}>{error}</p>
          <button type="button" className="btn btn-small mt-2" onClick={() => navigate('/obra')} style={{ width: 'auto' }}>← Volver a proyectos</button>
        </div>
      </main>
    );
  }

  // Un proyecto recién creado no muestra un panel lleno de ceros: eso no informa
  // y desmoraliza. Se ofrecen los caminos para empezar (DOC-04 §4).
  if (!resumen || resumen.estadoVacio || resumen.actividades === 0) {
    return (
      <main>
        <Encabezado proyecto={proyecto} projectId={projectId} />
        <div className="card" style={{ textAlign: 'center', padding: 44, marginTop: 16 }}>
          <h3 style={{ fontWeight: 700, fontSize: 18 }}>Este presupuesto está vacío</h3>
          <p className="small" style={{ color: '#8c8578', marginTop: 8, marginBottom: 20 }}>
            Agrega la primera actividad desde el catálogo de APUs y el panel se llenará solo.
          </p>
          <button type="button" className="btn" onClick={() => navigate(`/obra/${projectId}/presupuesto`)} style={{ width: 'auto' }}>
            Agregar la primera actividad
          </button>
        </div>
      </main>
    );
  }

  const costoDirecto = aNumero(resumen.costoDirecto);
  const cdPorM2 = proyecto?.areaM2 ? costoDirecto / proyecto.areaM2 : null;

  return (
    <main>
      <Encabezado proyecto={proyecto} projectId={projectId} computedAt={resumen.computedAt} />

      {/* ② Cifras clave: cuatro tarjetas y ni una más */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(190px, 100%), 1fr))', gap: 12, marginTop: 18 }}>
        <Cifra etiqueta="Actividades" valor={String(resumen.actividades)} nota="en presupuesto" />
        <Cifra etiqueta="Costo directo" valor={money(resumen.costoDirecto)} nota="sin AIU" />
        <Cifra etiqueta="AIU aplicado" valor={money(resumen.aiu?.valor)} nota={`${resumen.aiu?.pct ?? 0} % sobre el costo directo`} />
        <Cifra etiqueta="Total proyecto" valor={money(resumen.total)} nota={resumen.costoPorM2 ? `${money(resumen.costoPorM2)} / m²` : 'sin área registrada'} destacada />
      </div>

      {/* ③ Composición del gasto */}
      <section className="card" style={{ marginTop: 16 }}>
        <div className="flex-between" style={{ marginBottom: 4, gap: 8, flexWrap: 'wrap' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>Costos por tipo de recurso</h3>
          {cdPorM2 !== null && <span className="small" style={{ color: '#8c8578' }}>Sobre costo directo · {money(cdPorM2)} / m²</span>}
        </div>
        <div style={{ marginTop: 14, display: 'grid', gap: 14 }}>
          {(resumen.recursos ?? []).map((r) => (
            <div key={r.tipo}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                <span style={{ fontWeight: 600 }}>{ETIQUETA_RECURSO[r.tipo] ?? r.tipo}</span>
                <span style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
                  <span className="small" style={{ color: '#8c8578' }}>{r.pct?.toFixed(1)} %</span>
                  <span style={{ fontWeight: 700 }}>{money(r.valor)}</span>
                  {r.porM2 && <span className="small" style={{ color: '#8c8578', minWidth: 96, textAlign: 'right' }}>{money(r.porM2)} / m²</span>}
                </span>
              </div>
              <Barra pct={r.pct ?? 0} color={TONO_RECURSO[r.tipo] ?? '#b69462'} />
            </div>
          ))}
        </div>
      </section>

      {/* ④ Concentración por capítulo — lectura tipo Pareto */}
      <section className="card" style={{ marginTop: 16 }}>
        <div className="flex-between" style={{ marginBottom: 4, gap: 8, flexWrap: 'wrap' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>Dónde se concentra el presupuesto</h3>
          <span className="small" style={{ color: '#8c8578' }}>
            {(resumen.capitulos ?? []).length} capítulos · ordenados por participación
          </span>
        </div>
        <div style={{ marginTop: 14, display: 'grid', gap: 12 }}>
          {/* El servidor ya los manda ordenados por participación; el cliente no reordena. */}
          {(resumen.capitulos ?? []).map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => navigate(`/obra/${projectId}/presupuesto`)}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit', color: 'inherit', textAlign: 'left', width: '100%' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                <span style={{ fontWeight: 600 }}>{c.nombre}</span>
                <span style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
                  <span className="small" style={{ color: '#8c8578' }}>{c.actividades} act.</span>
                  <span className="small" style={{ color: '#8c8578' }}>{c.pct?.toFixed(1)} %</span>
                  <span style={{ fontWeight: 700, color: '#b69462', minWidth: 108, textAlign: 'right' }}>{money(c.valor)}</span>
                </span>
              </div>
              <Barra pct={c.pct ?? 0} color="#b69462" />
            </button>
          ))}
        </div>
      </section>

      {resumen.computedAt && (
        <p className="small" style={{ color: '#5f594f', marginTop: 14, textAlign: 'right' }}>
          Calculado {new Date(resumen.computedAt).toLocaleString('es-CO')}
        </p>
      )}
    </main>
  );
}

function Encabezado({ proyecto, projectId, computedAt }: { proyecto: Proyecto | null; projectId: string; computedAt?: string }) {
  const navigate = useNavigate();
  const detalle = [
    proyecto?.cliente,
    proyecto?.areaM2 ? `${proyecto.areaM2} m²` : null,
    computedAt ? `actualizado ${new Date(computedAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}` : null,
  ].filter(Boolean).join(' · ');

  return (
    <>
      <div className="flex-between" style={{ marginBottom: 6, gap: 12, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 'clamp(20px, 5.5vw, 28px)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
          <LayoutDashboard size={26} color="#b69462" /> {proyecto?.nombre || 'Panel principal'}
        </h1>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-small btn-secondary" onClick={() => navigate('/obra')} style={{ width: 'auto' }}>← Proyectos</button>
          {/* Una sola acción primaria por pantalla (DOC-04 §1) */}
          <button type="button" className="btn btn-small" onClick={() => navigate(`/obra/${projectId}/presupuesto`)} style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Plus size={16} /> Agregar actividad
          </button>
        </div>
      </div>
      <p className="small" style={{ color: '#8c8578' }}>{detalle || '—'}</p>
    </>
  );
}

function Cifra({ etiqueta, valor, nota, destacada = false }: { etiqueta: string; valor: string; nota?: string; destacada?: boolean }) {
  return (
    <div
      className="card"
      style={{
        padding: 18,
        // La tarjeta del total se resalta con el acento de marca: es la cifra
        // por la que el usuario abrió la herramienta.
        background: destacada ? 'rgba(182,148,98,0.10)' : undefined,
        borderColor: destacada ? 'rgba(182,148,98,0.34)' : undefined,
      }}
    >
      <div className="small" style={{ color: '#8c8578', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 11 }}>{etiqueta}</div>
      <div style={{ fontWeight: 800, fontSize: 'clamp(18px, 3.2vw, 24px)', color: destacada ? '#b69462' : '#f4efe6', marginTop: 6 }}>{valor}</div>
      {/* La aclaración evita que la cifra se malinterprete (DOC-04 §4) */}
      {nota && <div className="small" style={{ color: '#8c8578', marginTop: 4 }}>{nota}</div>}
    </div>
  );
}

function Barra({ pct, color }: { pct: number; color: string }) {
  const ancho = Math.max(0, Math.min(100, pct));
  return (
    <div style={{ height: 10, borderRadius: 999, background: '#111', overflow: 'hidden' }}>
      <div style={{ width: `${ancho}%`, height: '100%', background: color, transition: 'width .4s var(--ease-lp)' }} />
    </div>
  );
}

/** Aviso accionable: cada uno lleva al lugar exacto donde se corrige. */
export function Aviso({ texto, accion, onAccion }: { texto: string; accion: string; onAccion: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: 'rgba(255,149,0,0.08)', border: '1px solid rgba(255,149,0,0.25)', flexWrap: 'wrap' }}>
      <AlertTriangle size={16} color="#ff9500" />
      <span className="small" style={{ flex: 1 }}>{texto}</span>
      <button type="button" onClick={onAccion} className="small" style={{ background: 'none', border: 'none', color: '#b69462', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {accion} <ArrowRight size={13} />
      </button>
    </div>
  );
}
