import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../../shared/services/api';

const dataOf = (res: any) => (res && typeof res === 'object' && 'data' in res ? res.data : res);

/** Listado de planos de casa para elegir uno como punto de partida.
 *  Lo comparten las calculadoras (barrederas y enchapes): ambas arrancan
 *  eligiendo un plano guardado, o creando uno nuevo si aún no hay. */
export function PlanoPicker({
  titulo,
  icono,
  descripcion,
  onSelect,
  ctaLabel = 'Calcular →',
  busyId,
  children,
}: {
  titulo: string;
  icono: ReactNode;
  descripcion: string;
  onSelect: (planId: string, plan: any) => void;
  ctaLabel?: string;
  /** id del plano que se está abriendo, para mostrar el estado de carga. */
  busyId?: string | null;
  /** Contenido opcional encima de la lista (enchapes lo usa para "continuar"). */
  children?: ReactNode;
}) {
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
      <div className="flex-between" style={{ marginBottom: 8, gap: 12 }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
          {icono} {titulo}
        </h1>
        <button type="button" className="btn btn-small" onClick={() => navigate('/planos/nuevo')} style={{ width: 'auto' }}>
          + Crear plano
        </button>
      </div>
      <p className="small" style={{ marginBottom: 16 }}>{descripcion}</p>

      {children}

      {loading ? (
        <p className="small" style={{ color: '#999' }}>Cargando planos…</p>
      ) : plans.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <p className="small" style={{ color: '#999' }}>Aún no tienes planos. Crea uno para poder calcular.</p>
          <button type="button" className="btn mt-2" onClick={() => navigate('/planos/nuevo')} style={{ width: 'auto' }}>
            Crear un plano
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {plans.map((p) => {
            const busy = busyId != null && String(busyId) === String(p.id);
            return (
              <button
                key={p.id}
                type="button"
                className="card"
                disabled={busyId != null}
                onClick={() => onSelect(String(p.id), p)}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', textAlign: 'left', cursor: busyId != null ? 'default' : 'pointer', font: 'inherit', color: 'inherit', opacity: busyId != null && !busy ? 0.5 : 1 }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 16 }}>{p.nombre || 'Plano sin nombre'}</div>
                  <p className="small">{[p.propietario, p.ubicacion].filter(Boolean).join(' · ') || '—'}</p>
                </div>
                <span className="small" style={{ color: '#b69462' }}>{busy ? 'Abriendo…' : ctaLabel}</span>
              </button>
            );
          })}
        </div>
      )}
    </main>
  );
}
