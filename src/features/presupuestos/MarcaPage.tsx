import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Palette, Check, RotateCcw, ShieldCheck } from 'lucide-react';
import { apiService, extractData } from '../../shared/services/api';
import { showNotification } from '../../shared/hooks/useNotifications';
import { ACENTOS_MARCA, type Marca } from './types';
import { marcaABackend, marcaDesdeBackend } from './mapeo';

const MARCA_INICIAL: Marca = {
  nombreEmpresa: '',
  colorAcento: ACENTOS_MARCA[0].valor,
};

interface PlantillaDoc {
  id: string;
  nombre: string;
  descripcion?: string;
}

/** Las tres disposiciones del aplicativo de referencia. Se usan si el servidor
 *  todavía no expone su propio catálogo de plantillas. */
const PLANTILLAS_BASE: PlantillaDoc[] = [
  { id: 'CLASICA', nombre: 'Clásica', descripcion: 'Encabezado con logo a la izquierda y tabla sobria.' },
  { id: 'COMPACTA', nombre: 'Compacta', descripcion: 'Menos aire entre filas: más actividades por página.' },
  { id: 'EDITORIAL', nombre: 'Editorial', descripcion: 'Portada con el logo grande y capítulos separados.' },
];

/**
 * HU-25 · Marca de la empresa en los documentos.
 *
 * Personaliza cómo se ve un PDF, nada más. No hay controles libres de
 * maquetación ni un selector de color abierto: el acento sale de una paleta ya
 * validada por contraste, así que ninguna combinación puede producir un
 * documento ilegible.
 *
 * Nada de lo que hay aquí toca presupuestos, APUs ni cálculos.
 */
export function MarcaPage() {
  const navigate = useNavigate();
  const [marca, setMarca] = useState<Marca>(MARCA_INICIAL);
  const [plantillas, setPlantillas] = useState<PlantillaDoc[]>(PLANTILLAS_BASE);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const [m, ps] = await Promise.all([
        apiService.getMarca().then(extractData).catch((e) => { if (!cancel) setError(e?.message || null); return null; }),
        apiService.getPlantillasDocumento().then(extractData).catch(() => null),
      ]);
      if (cancel) return;
      if (m) {
        setMarca({ ...MARCA_INICIAL, ...marcaDesdeBackend(m) });
        setError(null);
      }
      const arr = Array.isArray(ps) ? ps : (ps?.items ?? null);
      if (Array.isArray(arr) && arr.length) {
        setPlantillas(arr.map((p: any) => ({ id: String(p.id ?? p.codigo), nombre: p.nombre ?? String(p.id), descripcion: p.descripcion })));
      }
      setCargando(false);
    })();
    return () => { cancel = true; };
  }, []);

  const set = (patch: Partial<Marca>) => setMarca((m) => ({ ...m, ...patch }));

  const guardar = async () => {
    if (!marca.nombreEmpresa.trim()) {
      showNotification('Atención', 'warning', 'El nombre de la empresa es obligatorio: encabeza todos los documentos.');
      return;
    }
    setGuardando(true);
    try {
      await apiService.updateMarca(marcaABackend({ ...marca, nombreEmpresa: marca.nombreEmpresa.trim() }));
      showNotification('Guardada', 'success', 'La marca se aplicará a los documentos que generes desde ahora.');
      setError(null);
    } catch (e: any) {
      showNotification('Error', 'error', e?.message || 'No se pudo guardar la marca.');
    } finally {
      setGuardando(false);
    }
  };

  const restablecer = () => {
    if (!window.confirm('Se volverá a la presentación por defecto de ELEMENT. ¿Continuar?')) return;
    setMarca({ ...MARCA_INICIAL, nombreEmpresa: marca.nombreEmpresa, plantillaDocumento: 'CLASICA' });
    showNotification('Restablecida', 'info', 'Recuerda guardar para que el cambio quede aplicado.');
  };

  const plantillaActiva = marca.plantillaDocumento ?? 'CLASICA';

  if (cargando) return <main><p className="small" style={{ color: '#999' }}>Cargando la marca…</p></main>;

  return (
    <main>
      <div className="flex-between" style={{ marginBottom: 8, gap: 12, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 'clamp(20px, 5.5vw, 28px)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Palette size={26} color="#b69462" /> Marca de la empresa
        </h1>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-small btn-secondary" onClick={() => navigate('/obra')} style={{ width: 'auto' }}>← Proyectos</button>
          <button type="button" className="btn btn-small btn-secondary" onClick={restablecer} style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <RotateCcw size={15} /> Restablecer
          </button>
          <button type="button" className="btn btn-small" onClick={guardar} disabled={guardando} style={{ width: 'auto' }}>
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
      <p className="small" style={{ marginBottom: 16 }}>
        Así se ven tus presupuestos cuando salen de la app. No afecta a los cálculos.
      </p>

      {error && (
        <div className="card" style={{ marginBottom: 14, borderColor: 'rgba(255,107,107,0.3)' }}>
          <p className="small" style={{ color: '#ff6b6b' }}>{error}</p>
          <p className="small" style={{ color: '#8c8578', marginTop: 6 }}>
            Puedes escribir los datos, pero no se guardarán hasta que el servidor exponga /org/branding.
          </p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(min(300px, 100%), 1fr)', gap: 16, alignItems: 'start' }} className="marca-layout">
        <div style={{ minWidth: 0, display: 'grid', gap: 14 }}>
          <div className="card">
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Datos comerciales</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))', gap: 12 }}>
              <Campo etiqueta="Nombre de la empresa *" valor={marca.nombreEmpresa} onChange={(v) => set({ nombreEmpresa: v })} placeholder="ELEMENT Arquitectura" />
              <Campo etiqueta="NIT" valor={marca.nit ?? ''} onChange={(v) => set({ nit: v })} placeholder="900.123.456-7" />
              <Campo etiqueta="Dirección" valor={marca.direccion ?? ''} onChange={(v) => set({ direccion: v })} placeholder="Cra. 43A #1-50" />
              <Campo etiqueta="Teléfono" valor={marca.telefono ?? ''} onChange={(v) => set({ telefono: v })} placeholder="+57 318 4575744" />
              <Campo etiqueta="Correo" valor={marca.correo ?? ''} onChange={(v) => set({ correo: v })} placeholder="contacto@element.haus" tipo="email" />
              <Campo etiqueta="Sitio web" valor={marca.sitioWeb ?? ''} onChange={(v) => set({ sitioWeb: v })} placeholder="element.haus" />
            </div>
            <div style={{ marginTop: 12 }}>
              <Campo etiqueta="URL del logo" valor={marca.logoUrl ?? ''} onChange={(v) => set({ logoUrl: v })} placeholder="https://…/logo.png" />
              <p className="small" style={{ color: '#8c8578', marginTop: 5 }}>
                Fondo transparente y al menos 400 px de ancho para que no se vea pixelado en el PDF.
              </p>
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Color de acento</h3>
            <p className="small" style={{ color: '#8c8578', marginBottom: 12 }}>
              Solo estos seis: todos están comprobados para que el texto se lea sobre ellos.
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {ACENTOS_MARCA.map((a) => {
                const activo = marca.colorAcento.toLowerCase() === a.valor.toLowerCase();
                return (
                  <button
                    key={a.valor}
                    type="button"
                    onClick={() => set({ colorAcento: a.valor })}
                    aria-pressed={activo}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                      background: 'none', border: 'none', cursor: 'pointer', font: 'inherit', padding: 0,
                    }}
                  >
                    <span style={{
                      display: 'grid', placeItems: 'center', width: 42, height: 42, borderRadius: 12, background: a.valor,
                      outline: activo ? '2px solid #f4efe6' : '1px solid rgba(255,255,255,0.14)', outlineOffset: 2,
                    }}>
                      {activo && <Check size={18} color="#fff" />}
                    </span>
                    <span className="small" style={{ color: activo ? '#f4efe6' : '#8c8578' }}>{a.nombre}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Plantilla del documento</h3>
            <p className="small" style={{ color: '#8c8578', marginBottom: 12 }}>
              La disposición se elige entre plantillas terminadas, no se maqueta a mano.
            </p>
            <div style={{ display: 'grid', gap: 8 }}>
              {plantillas.map((p) => {
                const activa = plantillaActiva === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => set({ plantillaDocumento: p.id })}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', width: '100%',
                      padding: '11px 13px', borderRadius: 10, cursor: 'pointer', font: 'inherit', color: 'inherit',
                      background: activa ? 'rgba(182,148,98,0.14)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${activa ? 'rgba(182,148,98,0.45)' : 'rgba(255,255,255,0.06)'}`,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600 }}>{p.nombre}</div>
                      {p.descripcion && <p className="small" style={{ color: '#8c8578' }}>{p.descripcion}</p>}
                    </div>
                    {activa && <Check size={17} color="#b69462" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Vista previa: el usuario elige mirando, no imaginando */}
        <div style={{ minWidth: 0, position: 'sticky', top: 84 }} className="marca-preview">
          <div className="card">
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, color: '#8c8578' }}>Vista previa</h3>
            <div style={{ background: '#fff', color: '#1a1a1a', borderRadius: 8, padding: 16, fontSize: 11, lineHeight: 1.5 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 10, borderBottom: `2px solid ${marca.colorAcento}` }}>
                {marca.logoUrl ? (
                  <img src={marca.logoUrl} alt="" style={{ maxHeight: 30, maxWidth: 90, objectFit: 'contain' }} />
                ) : (
                  <div style={{ width: 34, height: 34, borderRadius: 5, background: marca.colorAcento, flexShrink: 0 }} />
                )}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 13 }}>{marca.nombreEmpresa || 'Nombre de la empresa'}</div>
                  <div style={{ color: '#666', fontSize: 9 }}>
                    {[marca.nit, marca.telefono, marca.correo].filter(Boolean).join(' · ') || 'NIT · Teléfono · Correo'}
                  </div>
                </div>
              </div>

              <div style={{ margin: '12px 0 8px', fontWeight: 700, color: marca.colorAcento, fontSize: 12 }}>
                PRESUPUESTO DE OBRA
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 9.5 }}>
                <thead>
                  <tr style={{ background: marca.colorAcento, color: '#fff' }}>
                    <th style={{ textAlign: 'left', padding: '4px 6px' }}>Actividad</th>
                    <th style={{ textAlign: 'right', padding: '4px 6px' }}>Cant.</th>
                    <th style={{ textAlign: 'right', padding: '4px 6px' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {[['Mampostería en bloque n.º 5', '48,00', '$4.128.000'],
                    ['Pañete impermeabilizado', '96,00', '$2.304.000'],
                    ['Enchape piso porcelanato', '62,50', '$5.937.500']].map(([a, c, t], i) => (
                    <tr key={a} style={{ background: i % 2 ? '#f6f6f6' : '#fff' }}>
                      <td style={{ padding: '4px 6px' }}>{a}</td>
                      <td style={{ padding: '4px 6px', textAlign: 'right' }}>{c}</td>
                      <td style={{ padding: '4px 6px', textAlign: 'right' }}>{t}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, paddingTop: 7, borderTop: `1px solid ${marca.colorAcento}`, fontWeight: 800, fontSize: 11 }}>
                <span>TOTAL</span>
                <span style={{ color: marca.colorAcento }}>$12.369.500</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 12, padding: '9px 11px', borderRadius: 9, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <ShieldCheck size={15} color="#8c8578" style={{ flexShrink: 0, marginTop: 1 }} />
              <span className="small" style={{ color: '#8c8578' }}>
                Cambiar la marca no modifica ningún presupuesto, APU ni cantidad. Solo cambia la presentación.
              </span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .marca-layout { grid-template-columns: 1fr !important; }
          .marca-preview { position: static !important; }
        }
      `}</style>
    </main>
  );
}

function Campo({
  etiqueta, valor, onChange, placeholder, tipo = 'text',
}: {
  etiqueta: string;
  valor: string;
  onChange: (v: string) => void;
  placeholder?: string;
  tipo?: string;
}) {
  return (
    <div style={{ minWidth: 0 }}>
      <label className="small" style={{ display: 'block', marginBottom: 4 }}>{etiqueta}</label>
      <input className="input" type={tipo} value={valor} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}
