import { useStore } from '../../shared/services/store';

export function QuoteStep1() {
  const { formData, setFormData } = useStore();

  return (
    <div className="card mt-2" style={{ display: 'grid', gap: 16 }}>
      <div>
        <p className="small mb-1">Nombre completo</p>
        <input
          className="input"
          placeholder="Juan Pérez"
          value={formData.client}
          onChange={(e) => setFormData({ client: e.target.value })}
        />
      </div>
      <div>
        <p className="small mb-1">Proyecto</p>
        <input
          className="input"
          placeholder="Casa habitación"
          value={formData.project}
          onChange={(e) => setFormData({ project: e.target.value })}
        />
      </div>
    </div>
  );
}
