import { useState } from 'react';
import { Upload, AlertTriangle, CheckCircle2, FileSpreadsheet, RefreshCw } from 'lucide-react';
import { apiService, extractData } from '../../shared/services/api';
import { showNotification } from '../../shared/hooks/useNotifications';
import { FormModal } from '../../shared/components/FormModal';

export type TipoImportacion = 'APUS' | 'INSUMOS';

/** Formato del libro que espera el servidor, por tipo. */
const FORMATO: Record<TipoImportacion, { hoja: string; columnas: string[]; ejemplo?: string }> = {
  APUS: {
    hoja: 'APUs',
    columnas: ['codigo', 'descripcion', 'unidad', 'capitulo', 'componentes'],
    ejemplo: 'Cemento gris x50kg:0.02;Operario oficial:0.01',
  },
  // Sin confirmar: el endpoint de insumos comparte controlador y patrón, pero
  // no tenemos su hoja ni sus cabeceras documentadas.
  INSUMOS: {
    hoja: 'Insumos',
    columnas: ['descripcion', 'unidad', 'grupo', 'valorUnitario'],
  },
};

interface ErrorFila {
  fila: number;
  motivo: string;
}

/** Lo que devuelve la previsualización del servidor. */
interface Resumen {
  jobId: string;
  nuevos: number;
  actualizados: number;
  conError: number;
  expiraEn?: string;
}

/**
 * HU-13 · Importación del catálogo desde una hoja de cálculo.
 *
 * El archivo se sube tal cual —multipart, campo `archivo`— y lo parsea el
 * servidor: aquí no se lee ni se valida nada. Antes se analizaba el CSV en el
 * cliente y se mandaban las filas en JSON, que es justo lo que el endpoint no
 * acepta.
 *
 * Sigue siendo en dos pasos: subir devuelve un resumen y un `job_id` sin
 * escribir nada, y solo `confirm` aplica el lote.
 */
export function ModalImportar({
  tipo,
  onClose,
  onImportado,
}: {
  tipo: TipoImportacion;
  onClose: () => void;
  onImportado: () => void;
}) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [errores, setErrores] = useState<ErrorFila[]>([]);
  const [subiendo, setSubiendo] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);

  const formato = FORMATO[tipo];
  const etiqueta = tipo === 'INSUMOS' ? 'insumos' : 'APUs';

  const elegir = (f: File) => {
    setArchivo(f);
    setResumen(null);
    setErrores([]);
    // El servidor parsea XLSX. Se avisa aquí para no gastar una subida y un
    // error del servidor en algo que se ve por la extensión.
    setFallo(/\.xlsx?$/i.test(f.name)
      ? null
      : 'El servidor espera un archivo de Excel (.xlsx). Si tienes un CSV, ábrelo en Excel y usa «Guardar como → Libro de Excel».');
  };

  /** Paso 1: subir y previsualizar. No escribe nada en el catálogo. */
  const revisar = async () => {
    if (!archivo) return;
    setSubiendo(true);
    setFallo(null);
    setErrores([]);
    try {
      const d: any = extractData(tipo === 'INSUMOS'
        ? await apiService.importarInsumos(archivo)
        : await apiService.importarApus(archivo));

      const jobId = d?.job_id ?? d?.jobId ?? d?.id;
      if (!jobId) {
        // Sin job no hay segundo paso: se dio por aplicada.
        showNotification('Importado', 'success', 'El servidor procesó el archivo.');
        onImportado();
        return;
      }
      setResumen({
        jobId: String(jobId),
        nuevos: Number(d?.nuevos ?? 0),
        actualizados: Number(d?.actualizados ?? 0),
        conError: Number(d?.con_error ?? d?.conError ?? 0),
        expiraEn: d?.expira_en ?? d?.expiraEn,
      });

      // El detalle por fila es lo que permite corregir el archivo; sin él solo
      // se sabe cuántas fallaron, no por qué.
      try {
        const errs = extractData(await apiService.erroresImportacion(String(jobId)));
        const arr = Array.isArray(errs) ? errs : (errs?.items ?? errs?.errores ?? []);
        if (Array.isArray(arr) && arr.length) {
          setErrores(arr.map((x: any) => ({
            fila: x.fila ?? x.row ?? x.linea ?? 0,
            motivo: x.motivo ?? x.mensaje ?? x.message ?? x.error ?? 'Fila rechazada',
          })));
        }
      } catch { /* el detalle es opcional; el resumen ya da el número */ }
    } catch (e: any) {
      setFallo(e?.message || 'El servidor rechazó el archivo.');
    } finally {
      setSubiendo(false);
    }
  };

  /** Paso 2: aplicar el lote. */
  const confirmar = async () => {
    if (!resumen) return;
    setConfirmando(true);
    setFallo(null);
    try {
      const d: any = extractData(await apiService.confirmarImportacion(resumen.jobId));
      const n = d?.importadas ?? d?.creadas ?? (resumen.nuevos + resumen.actualizados);
      showNotification('Importado', 'success', `${n} registro(s) aplicados al catálogo.`);
      onImportado();
    } catch (e: any) {
      setFallo(e?.message || 'No se pudo confirmar la importación.');
    } finally {
      setConfirmando(false);
    }
  };

  const aplicables = resumen ? resumen.nuevos + resumen.actualizados : 0;

  return (
    <FormModal
      title={`Importar ${etiqueta}`}
      subtitle="Desde un archivo de Excel. Se revisa antes de guardar nada."
      maxWidth={620}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-small btn-secondary" onClick={onClose} style={{ width: 'auto' }}>Cancelar</button>
          {resumen ? (
            <button type="button" className="btn btn-small" onClick={confirmar} disabled={confirmando || aplicables === 0} style={{ width: 'auto' }}>
              {confirmando ? 'Importando…' : `Confirmar ${aplicables} fila(s)`}
            </button>
          ) : (
            <button type="button" className="btn btn-small" onClick={revisar} disabled={subiendo || !archivo} style={{ width: 'auto' }}>
              {subiendo ? 'Subiendo…' : 'Revisar archivo'}
            </button>
          )}
        </>
      }
    >
      <label
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '26px 16px',
          border: '1px dashed rgba(255,255,255,0.2)', borderRadius: 12, cursor: 'pointer', textAlign: 'center',
        }}
      >
        <Upload size={22} color="#b69462" />
        <span style={{ fontWeight: 600 }}>{archivo?.name || 'Elegir archivo .xlsx'}</span>
        <span className="small" style={{ color: '#8c8578' }}>
          Hoja «{formato.hoja}» con las columnas: {formato.columnas.join(', ')}
        </span>
        <input
          type="file"
          accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) elegir(f); }}
          style={{ display: 'none' }}
        />
      </label>

      {fallo && (
        <div style={{ display: 'flex', gap: 8, marginTop: 12, padding: '10px 12px', borderRadius: 9, background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.25)' }}>
          <AlertTriangle size={15} color="#ff6b6b" style={{ flexShrink: 0, marginTop: 1 }} />
          <span className="small" style={{ color: '#ffb4b4', wordBreak: 'break-word' }}>{fallo}</span>
        </div>
      )}

      {resumen && (
        <div style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 10 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
              <CheckCircle2 size={15} color="#4ade80" /> {resumen.nuevos} nuevo(s)
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: '#5aa9e6' }}>
              <RefreshCw size={15} /> {resumen.actualizados} actualizado(s)
            </span>
            {resumen.conError > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: '#ff9500' }}>
                <AlertTriangle size={15} /> {resumen.conError} con error
              </span>
            )}
          </div>

          {errores.length > 0 && (
            <div style={{ maxHeight: 150, overflowY: 'auto', display: 'grid', gap: 3 }}>
              {errores.map((e, i) => (
                <div key={`${e.fila}-${i}`} className="small" style={{ color: '#c0b8a9', padding: '5px 9px', borderRadius: 7, background: 'rgba(255,149,0,0.07)' }}>
                  {e.fila ? <strong>Fila {e.fila}</strong> : <strong>Error</strong>} · {e.motivo}
                </div>
              ))}
            </div>
          )}
          {/* Con errores contados pero sin detalle, decirlo es más honesto que
              dejar la lista vacía como si no hubiera nada que corregir. */}
          {resumen.conError > 0 && errores.length === 0 && (
            <p className="small" style={{ color: '#8c8578' }}>
              El servidor no detalló qué filas fallaron.
            </p>
          )}

          <p className="small" style={{ color: '#8c8578', marginTop: 10 }}>
            Todavía no se ha guardado nada. Al confirmar entran solo las filas válidas.
            {resumen.expiraEn && ' La previsualización caduca: si tardas, vuelve a subir el archivo.'}
          </p>
        </div>
      )}

      <details style={{ marginTop: 14 }}>
        <summary className="small" style={{ cursor: 'pointer', color: '#8c8578', display: 'flex', alignItems: 'center', gap: 6 }}>
          <FileSpreadsheet size={14} /> Ver el formato esperado
        </summary>
        <div className="small" style={{ marginTop: 8, padding: 10, borderRadius: 8, background: 'rgba(0,0,0,0.3)', color: '#c0b8a9' }}>
          <p>Libro de Excel con una hoja llamada <strong>«{formato.hoja}»</strong> y estas cabeceras exactas:</p>
          <pre style={{ margin: '6px 0', overflowX: 'auto', fontSize: 11 }}>{formato.columnas.join(' | ')}</pre>
          {formato.ejemplo && (
            <>
              <p style={{ marginTop: 8 }}>
                <strong>componentes</strong>: los insumos separados por <code>;</code>, cada uno como
                {' '}<code>nombre:rendimiento</code>. El nombre debe coincidir exactamente con el del maestro.
              </p>
              <pre style={{ margin: '6px 0', overflowX: 'auto', fontSize: 11 }}>{formato.ejemplo}</pre>
            </>
          )}
        </div>
      </details>
    </FormModal>
  );
}
