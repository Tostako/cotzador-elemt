import { useState } from 'react';
import { Upload, AlertTriangle, CheckCircle2, FileSpreadsheet } from 'lucide-react';
import { apiService, extractData } from '../../shared/services/api';
import { showNotification } from '../../shared/hooks/useNotifications';
import { FormModal } from '../../shared/components/FormModal';
import { GRUPOS_VALIDOS, detectarSeparador, leerNumero, partirLineaCsv } from './importacion';

export type TipoImportacion = 'APUS' | 'INSUMOS';

/** Columnas esperadas por tipo. El orden no importa: se busca por encabezado. */
const COLUMNAS: Record<TipoImportacion, { requeridas: string[]; ejemplo: string }> = {
  INSUMOS: {
    requeridas: ['descripcion', 'unidad', 'grupo', 'valorUnitario'],
    ejemplo: 'descripcion;unidad;grupo;valorUnitario\nCemento gris 50 kg;bulto;MATERIALES;32000',
  },
  APUS: {
    requeridas: ['descripcion', 'unidad', 'capitulo'],
    ejemplo: 'descripcion;unidad;capitulo;valorUnitario\nMampostería bloque n.º 5;m2;Estructura;86000',
  },
};

/** Fila rechazada, venga del análisis local o del servidor. */
interface ErrorFila {
  fila: number;
  motivo: string;
}

/**
 * HU-13 · Importación del catálogo desde una hoja de cálculo.
 *
 * Nunca se importa a ciegas: el archivo se analiza, se muestra qué filas
 * entran y cuáles se rechazan con el motivo, y solo entonces el usuario
 * confirma. Un archivo con errores no bloquea al resto — se importa lo válido
 * y se reporta lo demás.
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
  const [nombreArchivo, setNombreArchivo] = useState('');
  const [filas, setFilas] = useState<Record<string, string>[]>([]);
  const [errores, setErrores] = useState<ErrorFila[]>([]);
  const [jobId, setJobId] = useState<string | null>(null);
  const [analizando, setAnalizando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);

  const esperadas = COLUMNAS[tipo].requeridas;

  const leerArchivo = async (archivo: File) => {
    setNombreArchivo(archivo.name);
    setFilas([]); setErrores([]); setJobId(null); setFallo(null);

    if (/\.xlsx?$/i.test(archivo.name)) {
      setFallo('Los .xlsx no se pueden leer aquí. En Excel usa «Guardar como → CSV UTF-8» y vuelve a intentarlo.');
      return;
    }

    const texto = (await archivo.text()).replace(/^﻿/, '');
    const lineas = texto.split(/\r?\n/).filter((l) => l.trim());
    if (lineas.length < 2) {
      setFallo('El archivo no tiene filas de datos.');
      return;
    }
    const sep = detectarSeparador(lineas[0]);
    const cabecera = partirLineaCsv(lineas[0], sep).map((h) => h.replace(/\s+/g, '').toLowerCase());

    const faltan = esperadas.filter((c) => !cabecera.includes(c.toLowerCase()));
    if (faltan.length) {
      setFallo(`Faltan columnas obligatorias: ${faltan.join(', ')}.`);
      return;
    }

    const buenas: Record<string, string>[] = [];
    const malas: ErrorFila[] = [];
    for (let i = 1; i < lineas.length; i++) {
      const celdas = partirLineaCsv(lineas[i], sep);
      const fila: Record<string, string> = {};
      cabecera.forEach((h, j) => { fila[h] = celdas[j] ?? ''; });

      const vacias = esperadas.filter((c) => !fila[c.toLowerCase()]);
      if (vacias.length) {
        malas.push({ fila: i + 1, motivo: `Sin ${vacias.join(', ')}` });
        continue;
      }
      if (tipo === 'INSUMOS') {
        if (!GRUPOS_VALIDOS.includes(fila.grupo.toUpperCase() as any)) {
          malas.push({ fila: i + 1, motivo: `Grupo "${fila.grupo}" no válido (${GRUPOS_VALIDOS.join(', ')})` });
          continue;
        }
        const v = leerNumero(fila.valorunitario);
        if (!Number.isFinite(v) || v < 0) {
          malas.push({ fila: i + 1, motivo: `Valor unitario "${fila.valorunitario}" no es un número` });
          continue;
        }
        fila.valorunitario = String(v);
        fila.grupo = fila.grupo.toUpperCase();
      }
      buenas.push(fila);
    }

    setFilas(buenas);
    setErrores(malas);
  };

  /** Paso 1: el servidor analiza y devuelve un job; nada queda guardado aún. */
  const analizar = async () => {
    setAnalizando(true);
    try {
      const cuerpo = {
        filas: filas.map((f) => (tipo === 'INSUMOS'
          ? { descripcion: f.descripcion, unidad: f.unidad, grupo: f.grupo, valorUnitario: f.valorunitario }
          : { descripcion: f.descripcion, unidad: f.unidad, capitulo: f.capitulo, valorUnitario: f.valorunitario })),
        dryRun: true,
      };
      const res = extractData(tipo === 'INSUMOS'
        ? await apiService.importarInsumos(cuerpo)
        : await apiService.importarApus(cuerpo));

      const id = res?.jobId ?? res?.job_id ?? res?.id;
      if (!id) {
        // Sin job no hay segundo paso: el servidor ya aplicó la importación.
        showNotification('Importado', 'success', `${filas.length} fila(s) procesada(s).`);
        onImportado();
        return;
      }
      setJobId(String(id));
      // Los rechazos del servidor se suman a los detectados aquí: pueden ser
      // otros (duplicados, capítulo inexistente) y hay que verlos todos.
      try {
        const errs = extractData(await apiService.erroresImportacion(String(id)));
        const arr = Array.isArray(errs) ? errs : (errs?.items ?? []);
        if (Array.isArray(arr) && arr.length) {
          setErrores((e) => [...e, ...arr.map((x: any) => ({ fila: x.fila ?? x.row ?? 0, motivo: x.motivo ?? x.mensaje ?? x.message ?? 'Rechazada' }))]);
        }
      } catch { /* el detalle de errores es opcional */ }
    } catch (e: any) {
      setFallo(e?.message || 'El servidor rechazó el archivo.');
    } finally {
      setAnalizando(false);
    }
  };

  /** Paso 2: solo ahora se escribe en el catálogo. */
  const confirmar = async () => {
    if (!jobId) return;
    setConfirmando(true);
    try {
      const res = extractData(await apiService.confirmarImportacion(jobId));
      const n = res?.importadas ?? res?.creadas ?? filas.length;
      showNotification('Importado', 'success', `${n} registro(s) agregado(s) al catálogo.`);
      onImportado();
    } catch (e: any) {
      showNotification('Error', 'error', e?.message || 'No se pudo confirmar la importación.');
    } finally {
      setConfirmando(false);
    }
  };

  const etiqueta = tipo === 'INSUMOS' ? 'insumos' : 'APUs';

  return (
    <FormModal
      title={`Importar ${etiqueta}`}
      subtitle="Desde un CSV exportado de Excel. Se revisa antes de guardar nada."
      maxWidth={620}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-small btn-secondary" onClick={onClose} style={{ width: 'auto' }}>Cancelar</button>
          {jobId ? (
            <button type="button" className="btn btn-small" onClick={confirmar} disabled={confirmando} style={{ width: 'auto' }}>
              {confirmando ? 'Importando…' : `Confirmar ${filas.length} fila(s)`}
            </button>
          ) : (
            <button type="button" className="btn btn-small" onClick={analizar} disabled={analizando || filas.length === 0} style={{ width: 'auto' }}>
              {analizando ? 'Revisando…' : 'Revisar archivo'}
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
        <span style={{ fontWeight: 600 }}>{nombreArchivo || 'Elegir archivo CSV'}</span>
        <span className="small" style={{ color: '#8c8578' }}>
          Columnas: {esperadas.join(', ')}
        </span>
        <input
          type="file"
          accept=".csv,text/csv,.xlsx,.xls"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) leerArchivo(f); }}
          style={{ display: 'none' }}
        />
      </label>

      {fallo && (
        <div style={{ display: 'flex', gap: 8, marginTop: 12, padding: '10px 12px', borderRadius: 9, background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.25)' }}>
          <AlertTriangle size={15} color="#ff6b6b" style={{ flexShrink: 0, marginTop: 1 }} />
          <span className="small" style={{ color: '#ffb4b4' }}>{fallo}</span>
        </div>
      )}

      {(filas.length > 0 || errores.length > 0) && (
        <div style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 10 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
              <CheckCircle2 size={15} color="#4ade80" /> {filas.length} fila(s) válidas
            </span>
            {errores.length > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: '#ff9500' }}>
                <AlertTriangle size={15} /> {errores.length} rechazada(s)
              </span>
            )}
          </div>

          {errores.length > 0 && (
            <div style={{ maxHeight: 150, overflowY: 'auto', display: 'grid', gap: 3 }}>
              {errores.map((e, i) => (
                <div key={`${e.fila}-${i}`} className="small" style={{ color: '#c0b8a9', padding: '5px 9px', borderRadius: 7, background: 'rgba(255,149,0,0.07)' }}>
                  <strong>Fila {e.fila}</strong> · {e.motivo}
                </div>
              ))}
            </div>
          )}

          {jobId && (
            <p className="small" style={{ color: '#8c8578', marginTop: 10 }}>
              Todavía no se ha guardado nada. Al confirmar entran solo las filas válidas; las rechazadas se quedan fuera.
            </p>
          )}
        </div>
      )}

      <details style={{ marginTop: 14 }}>
        <summary className="small" style={{ cursor: 'pointer', color: '#8c8578', display: 'flex', alignItems: 'center', gap: 6 }}>
          <FileSpreadsheet size={14} /> Ver el formato esperado
        </summary>
        <pre className="small" style={{ marginTop: 8, padding: 10, borderRadius: 8, background: 'rgba(0,0,0,0.3)', overflowX: 'auto', color: '#c0b8a9', fontSize: 11 }}>
{COLUMNAS[tipo].ejemplo}
        </pre>
      </details>
    </FormModal>
  );
}
