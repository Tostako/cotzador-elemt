import { useParams } from 'react-router-dom';
import { PlanoEditor } from './PlanoEditor';

export function PlanoEditorPage() {
  const { id } = useParams();
  return (
    <main>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
        🏠 {id ? 'Editar plano' : 'Nuevo plano'}
      </h1>
      <p className="small" style={{ marginBottom: 16 }}>
        Dibuja la distribución de la vivienda (pisos y habitaciones). Es la plantilla maestra desde la que se derivan
        las calculadoras.
      </p>
      {/* key fuerza remontar el editor al cambiar de plano / nuevo */}
      <PlanoEditor key={id || 'nuevo'} planId={id} />
    </main>
  );
}
