import { useStore } from '../../shared/services/store';

export function QuoteStep1() {
  const { formData, setFormData } = useStore();

  return (
    <div className="card mt-2" style={{ display: 'grid', gap: 16 }}>
      <div>
        <label className="small mb-1" htmlFor="quote-client">Nombre completo</label>
        <input
          id="quote-client"
          className="input"
          placeholder="Juan Pérez"
          value={formData.client}
          onChange={(e) => setFormData({ client: e.target.value })}
        />
      </div>
      <div>
        <label className="small mb-1" htmlFor="quote-project">Proyecto</label>
        <input
          id="quote-project"
          className="input"
          placeholder="Casa habitación"
          value={formData.project}
          onChange={(e) => setFormData({ project: e.target.value })}
        />
      </div>
    </div>
  );
}
