import { useEffect, useRef, useState } from 'react';
import { Download, FileText, Sheet, Loader2, Check } from 'lucide-react';
import { apiService, extractData } from '../../shared/services/api';
import { showNotification } from '../../shared/hooks/useNotifications';

type TipoDocumento =
  | 'PDF_CLIENTE' | 'PDF_INTERNO' | 'PDF_COSTOS_APU'
  | 'XLSX_PRESUPUESTO' | 'XLSX_INSUMOS' | 'XLSX_APUS';

/** Las siete salidas del aplicativo de referencia agrupadas en un solo menú (H-12). */
const SALIDAS: Array<{ tipo: TipoDocumento; etiqueta: string; nota?: string; destacada?: boolean; icono: 'pdf' | 'xlsx' }> = [
  { tipo: 'PDF_CLIENTE', etiqueta: 'PDF para el cliente', nota: 'Sin costos internos', destacada: true, icono: 'pdf' },
  { tipo: 'PDF_INTERNO', etiqueta: 'PDF interno', nota: 'Incluye costos', icono: 'pdf' },
  { tipo: 'PDF_COSTOS_APU', etiqueta: 'PDF de costos APU', icono: 'pdf' },
  { tipo: 'XLSX_PRESUPUESTO', etiqueta: 'Presupuesto en Excel', icono: 'xlsx' },
  { tipo: 'XLSX_INSUMOS', etiqueta: 'Insumos en Excel', icono: 'xlsx' },
  { tipo: 'XLSX_APUS', etiqueta: 'APUs en Excel', icono: 'xlsx' },
];

/**
 * HU-20 · HU-21 — Menú de exportación.
 *
 * La generación es asíncrona: el servidor responde 202 con un identificador y
 * hay que consultar el estado hasta que deje de estar GENERANDO. El documento
 * resultante es inmutable y lleva una referencia visible (p. ej. PR-2026-0184)
 * para poder citarlo en una conversación con el cliente.
 */
export function ExportarMenu({ projectId, deshabilitado }: { projectId: string; deshabilitado?: boolean }) {
  const [abierto, setAbierto] = useState(false);
  const [generando, setGenerando] = useState<TipoDocumento | null>(null);
  const [listo, setListo] = useState<{ referencia?: string; url?: string } | null>(null);
  const cajaRef = useRef<HTMLDivElement>(null);
  const sondeo = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const fuera = (e: MouseEvent) => {
      if (cajaRef.current && !cajaRef.current.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener('mousedown', fuera);
    return () => document.removeEventListener('mousedown', fuera);
  }, []);

  useEffect(() => () => { if (sondeo.current) clearTimeout(sondeo.current); }, []);

  /** Consulta el estado del documento hasta que esté listo (máx. ~30 s). */
  const esperarDocumento = async (docId: string, intentos = 15): Promise<any | null> => {
    for (let i = 0; i < intentos; i++) {
      await new Promise((r) => { sondeo.current = setTimeout(r, 2000); });
      try {
        const d = extractData(await apiService.getDocumento(docId));
        if (d?.estado && d.estado !== 'GENERANDO') return d;
      } catch {
        return null; // si el endpoint de consulta no existe, se corta el sondeo
      }
    }
    return null;
  };

  const generar = async (tipo: TipoDocumento) => {
    setAbierto(false);
    setGenerando(tipo);
    setListo(null);
    try {
      const res = extractData(await apiService.generarDocumento(projectId, { tipo }));
      if (!res?.id) throw new Error('El servidor no devolvió el identificador del documento.');

      showNotification('Generando', 'info', `Documento ${res.referencia || res.id} en preparación…`);
      const doc = await esperarDocumento(res.id);

      if (doc?.url) {
        setListo({ referencia: doc.referencia || res.referencia, url: doc.url });
        window.open(doc.url, '_blank', 'noopener,noreferrer');
        showNotification('Listo', 'success', `Documento ${doc.referencia || ''} generado.`);
      } else {
        // Queda encolado: no es un error, solo tarda más de lo que esperamos aquí.
        setListo({ referencia: res.referencia });
        showNotification('En proceso', 'warning', 'El documento sigue generándose. Aparecerá en Documentos del proyecto.');
      }
    } catch (e: any) {
      showNotification('Error', 'error', e?.message || 'No se pudo generar el documento.');
    } finally {
      setGenerando(null);
    }
  };

  return (
    <div style={{ position: 'relative' }} ref={cajaRef}>
      <button
        type="button"
        className="btn btn-small btn-secondary"
        onClick={() => setAbierto((v) => !v)}
        disabled={deshabilitado || generando !== null}
        aria-haspopup="menu"
        aria-expanded={abierto}
        style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6 }}
      >
        {generando ? <Loader2 size={15} className="exp-girando" /> : listo ? <Check size={15} /> : <Download size={15} />}
        {generando ? 'Generando…' : 'Exportar'}
      </button>

      {abierto && (
        <div
          role="menu"
          style={{
            position: 'absolute', right: 0, top: 'calc(100% + 6px)', zIndex: 30, minWidth: 250,
            background: 'var(--color-card)', border: '1px solid var(--color-line)', borderRadius: 14,
            boxShadow: '0 18px 44px rgba(0,0,0,0.5)', padding: 6,
          }}
        >
          {SALIDAS.map((s, i) => (
            <div key={s.tipo}>
              {i === 3 && <div style={{ height: 1, background: 'var(--color-line)', margin: '6px 4px' }} />}
              <button
                type="button"
                role="menuitem"
                onClick={() => generar(s.tipo)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
                  padding: '10px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', font: 'inherit',
                  background: s.destacada ? 'rgba(182,148,98,0.12)' : 'transparent',
                  color: s.destacada ? '#e9dcc2' : '#c8c0b1',
                }}
              >
                {s.icono === 'pdf' ? <FileText size={15} /> : <Sheet size={15} />}
                <span style={{ flex: 1 }}>{s.etiqueta}</span>
                {s.nota && <span className="small" style={{ color: '#8c8578', fontSize: 11 }}>{s.nota}</span>}
              </button>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .exp-girando { animation: expGirar 1s linear infinite; }
        @keyframes expGirar { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
