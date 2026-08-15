import { useCallback, useEffect, useState } from 'react';
import { FolderTree, Plus, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { apiService, extractData } from '../../shared/services/api';
import { showNotification } from '../../shared/hooks/useNotifications';
import { FormModal } from '../../shared/components/FormModal';
import { capitulosDesdeBackend } from './mapeo';
import type { Capitulo } from './types';

/**
 * HU-09 · Capítulos del catálogo.
 *
 * Son el esqueleto del presupuesto: todo APU pertenece a uno, así que un
 * servidor sin capítulos deja el catálogo bloqueado. Hasta ahora la app solo
 * los leía y había que insertarlos por fuera.
 *
 * El `orden` no es cosmético: es la secuencia del presupuesto impreso, y por
 * eso se edita aquí en vez de dejarlo al azar del alta.
 */
export function CapitulosPage() {
  const [capitulos, setCapitulos] = useState<Capitulo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editando, setEditando] = useState<Capitulo | null>(null);
  const [creando, setCreando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setCapitulos(capitulosDesdeBackend(extractData(await apiService.getCapitulos())));
    } catch (e: any) {
      setCapitulos([]);
      setError(e?.message || 'No se pudieron cargar los capítulos.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const eliminar = async (c: Capitulo) => {
    if (!window.confirm(`¿Eliminar el capítulo "${c.nombre}"?`)) return;
    try {
      await apiService.deleteCapitulo(c.id);
      showNotification('Eliminado', 'success', `Se eliminó "${c.nombre}".`);
      cargar();
    } catch (e: any) {
      // El servidor responde 400 —no 409— cuando el capítulo tiene APUs. Sin
      // mirar el `codigo` parecería un error de validación cualquiera.
      if (e?.codigo === 'CAPITULO_EN_USO') {
        showNotification('No se puede eliminar', 'warning',
          `"${c.nombre}" tiene APUs asignados. Muévelos a otro capítulo antes de borrarlo.`);
      } else {
        showNotification('Error', 'error', e?.message || 'No se pudo eliminar el capítulo.');
      }
    }
  };

  return (
    <main>
      <div className="flex-between" style={{ marginBottom: 8, gap: 12, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 'clamp(22px, 6vw, 32px)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
          <FolderTree size={28} color="#b69462" /> Capítulos
        </h1>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {!cargando && !error && (
            <span className="small" style={{ color: '#8c8578' }}>
              {capitulos.length} capítulo{capitulos.length === 1 ? '' : 's'}
            </span>
          )}
          <button type="button" className="btn btn-small" onClick={() => setCreando(true)} style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Plus size={15} /> Nuevo capítulo
          </button>
        </div>
      </div>
      <p className="small" style={{ marginBottom: 16 }}>
        Agrupan los APUs y fijan el orden en que salen los capítulos del presupuesto impreso.
      </p>

      {cargando ? (
        <p className="small" style={{ color: '#999' }}>Cargando capítulos…</p>
      ) : error ? (
        <div className="card" style={{ textAlign: 'center', padding: 32 }}>
          <p className="small" style={{ color: '#ff6b6b' }}>{error}</p>
        </div>
      ) : capitulos.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <p className="small" style={{ color: '#999' }}>
            No hay capítulos. Sin al menos uno no se pueden crear APUs.
          </p>
          <button type="button" className="btn mt-2" onClick={() => setCreando(true)} style={{ width: 'auto' }}>
            Crear el primero
          </button>
        </div>
      ) : (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <th style={{ textAlign: 'right', padding: '10px 8px', width: 70 }}>Orden</th>
                <th style={{ textAlign: 'left', padding: '10px 8px', width: 110 }}>Código</th>
                <th style={{ textAlign: 'left', padding: '10px 8px' }}>Nombre</th>
                <th style={{ padding: '10px 8px', width: 90 }} />
              </tr>
            </thead>
            <tbody>
              {capitulos.map((c) => (
                <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px 8px', textAlign: 'right', color: '#8c8578' }}>{c.orden ?? '—'}</td>
                  <td style={{ padding: '10px 8px', color: '#c0b8a9' }}>{c.codigo ?? '—'}</td>
                  <td style={{ padding: '10px 8px', fontWeight: 600 }}>{c.nombre}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button type="button" onClick={() => setEditando(c)}
                      style={{ background: 'none', border: 'none', color: '#8c8578', cursor: 'pointer', padding: 4, marginRight: 2 }}
                      aria-label={`Editar ${c.nombre}`}>
                      <Pencil size={15} />
                    </button>
                    <button type="button" onClick={() => eliminar(c)}
                      style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', padding: 4 }}
                      aria-label={`Eliminar ${c.nombre}`}>
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(creando || editando) && (
        <ModalCapitulo
          capitulo={editando}
          siguienteOrden={(capitulos.reduce((m, c) => Math.max(m, c.orden ?? 0), 0)) + 1}
          onClose={() => { setCreando(false); setEditando(null); }}
          onGuardado={() => { setCreando(false); setEditando(null); cargar(); }}
        />
      )}
    </main>
  );
}

function ModalCapitulo({
  capitulo,
  siguienteOrden,
  onClose,
  onGuardado,
}: {
  capitulo: Capitulo | null;
  siguienteOrden: number;
  onClose: () => void;
  onGuardado: () => void;
}) {
  const [nombre, setNombre] = useState(capitulo?.nombre ?? '');
  const [codigo, setCodigo] = useState(capitulo?.codigo ?? '');
  const [orden, setOrden] = useState(String(capitulo?.orden ?? siguienteOrden));
  const [guardando, setGuardando] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);

  const guardar = async () => {
    if (!nombre.trim()) {
      showNotification('Falta el nombre', 'warning', 'El capítulo necesita un nombre.');
      return;
    }
    setGuardando(true);
    setFallo(null);
    const cuerpo = {
      nombre: nombre.trim(),
      // Vacío se manda como undefined: el servidor guarda null, no "".
      codigo: codigo.trim() || undefined,
      orden: orden.trim() ? Number(orden) : undefined,
    };
    try {
      if (capitulo) await apiService.updateCapitulo(capitulo.id, cuerpo);
      else await apiService.createCapitulo(cuerpo);
      showNotification('Guardado', 'success', `Capítulo "${cuerpo.nombre}" ${capitulo ? 'actualizado' : 'creado'}.`);
      onGuardado();
    } catch (e: any) {
      setFallo(e?.message || 'No se pudo guardar el capítulo.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <FormModal
      title={capitulo ? 'Editar capítulo' : 'Nuevo capítulo'}
      subtitle={capitulo ? capitulo.nombre : 'Agrupa los APUs y fija su orden en el presupuesto.'}
      maxWidth={460}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-small btn-secondary" onClick={onClose} style={{ width: 'auto' }}>Cancelar</button>
          <button type="button" className="btn btn-small" onClick={guardar} disabled={guardando} style={{ width: 'auto' }}>
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </>
      }
    >
      <div style={{ display: 'grid', gap: 12 }}>
        <div>
          <label className="small" style={{ display: 'block', marginBottom: 4 }}>Nombre *</label>
          <input className="input" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Preliminares" autoFocus />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(140px, 100%), 1fr))', gap: 12 }}>
          <div>
            <label className="small" style={{ display: 'block', marginBottom: 4 }}>Código</label>
            <input className="input" value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="PRE" />
          </div>
          <div>
            <label className="small" style={{ display: 'block', marginBottom: 4 }}>Orden</label>
            <input className="input" type="number" min={1} step={1} value={orden} onChange={(e) => setOrden(e.target.value)} />
          </div>
        </div>
        <p className="small" style={{ color: '#8c8578' }}>
          El orden decide en qué posición sale el capítulo en el presupuesto impreso.
        </p>

        {fallo && (
          <div style={{ display: 'flex', gap: 9, padding: '10px 12px', borderRadius: 10, background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.28)' }}>
            <AlertTriangle size={15} color="#ff6b6b" style={{ flexShrink: 0, marginTop: 1 }} />
            <p className="small" style={{ color: '#ffb4b4', wordBreak: 'break-word' }}>{fallo}</p>
          </div>
        )}
      </div>
    </FormModal>
  );
}
