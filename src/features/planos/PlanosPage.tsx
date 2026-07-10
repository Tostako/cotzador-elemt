import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DraftingCompass, Trash2 } from 'lucide-react';
import { apiService } from '../../shared/services/api';
import { showNotification } from '../../shared/hooks/useNotifications';

const dataOf = (res: any) => (res && typeof res === 'object' && 'data' in res ? res.data : res);

export function PlanosPage() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

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

  const remove = async (id: string) => {
    if (!window.confirm('¿Eliminar este plano? Esta acción no se puede deshacer.')) return;
    setDeleting(id);
    try {
      await apiService.deleteHousePlan(id);
      setPlans((ps) => ps.filter((p) => String(p.id) !== String(id)));
      showNotification('Correcto', 'success', 'El plano se eliminó.');
    } catch (e: any) {
      showNotification('Error', 'error', e?.message || 'No se pudo eliminar el plano.');
    } finally {
      setDeleting(null);
    }
  };

  const countHabs = (p: any) =>
    Array.isArray(p?.niveles)
      ? p.niveles.reduce((s: number, nv: any) => s + (Array.isArray(nv?.espacios) ? nv.espacios.length : 0), 0)
      : 0;

  return (
    <main>
      <div className="flex-between" style={{ marginBottom: 12, gap: 12 }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}><DraftingCompass size={28} color="#b69462" /> Planos de Casa</h1>
        <button type="button" className="btn btn-small" onClick={() => navigate('/planos/nuevo')} style={{ width: 'auto' }}>
          + Nuevo plano
        </button>
      </div>
      <p className="small" style={{ marginBottom: 16 }}>
        Plantillas maestras de vivienda (pisos y habitaciones). Desde un plano puedes derivar las calculadoras de
        enchapes y barrederas.
      </p>

      {loading ? (
        <p className="small" style={{ color: '#999' }}>Cargando planos…</p>
      ) : plans.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <p className="small" style={{ color: '#999' }}>Aún no tienes planos guardados.</p>
          <button type="button" className="btn mt-2" onClick={() => navigate('/planos/nuevo')} style={{ width: 'auto' }}>
            Crear mi primer plano
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {plans.map((p) => (
            <div key={p.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <button
                type="button"
                onClick={() => navigate(`/planos/${p.id}`)}
                style={{ flex: 1, textAlign: 'left', background: 'transparent', border: 'none', color: 'inherit', font: 'inherit', cursor: 'pointer', padding: 0 }}
              >
                <div style={{ fontWeight: 600, fontSize: 16 }}>{p.nombre || 'Plano sin nombre'}</div>
                <p className="small">{[p.propietario, p.ubicacion].filter(Boolean).join(' · ') || '—'}</p>
                <p className="small" style={{ color: '#8c8578' }}>
                  {(Array.isArray(p?.niveles) ? p.niveles.length : 0)} piso(s) · {countHabs(p)} habitación(es)
                </p>
              </button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn btn-small btn-secondary" onClick={() => navigate(`/planos/${p.id}`)} style={{ width: 'auto' }}>Abrir</button>
                <button type="button" className="btn btn-small btn-danger" onClick={() => remove(String(p.id))} disabled={deleting === String(p.id)} style={{ width: 'auto', display: 'inline-flex', alignItems: 'center' }} aria-label="Eliminar plano"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
