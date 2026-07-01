import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  /** Destino opcional. Por defecto va a la página principal de la app (/dashboard). */
  to?: string;
  /** Texto del botón. Por defecto "Volver al inicio". */
  label?: string;
}

/** Botón para volver a la página principal de la app (Dashboard). */
export function BackButton({ to = '/dashboard', label = 'Volver al inicio' }: BackButtonProps) {
  const navigate = useNavigate();

  return (
    <button
      className="btn btn-ghost btn-small mb-2"
      onClick={() => navigate(to)}
      style={{ width: 'auto', gap: 6 }}
    >
      <ArrowLeft size={16} /> {label}
    </button>
  );
}
