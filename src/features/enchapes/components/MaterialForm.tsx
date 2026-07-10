import type { MaterialEnchape } from '../types/enchapes'
import { TIPOS_ACABADO } from '../types/enchapes'

interface MaterialFormProps {
  matForm: MaterialEnchape
  setMatForm: React.Dispatch<React.SetStateAction<MaterialEnchape>>
  editingMaterialId: string | null
  onSave: () => void
}

export function MaterialForm({ matForm, setMatForm, editingMaterialId, onSave }: MaterialFormProps) {
  return (
    <div className="form-section" style={{ marginBottom: 16 }}>
      <h4 className="section-title" style={{ marginTop: 0 }}>
        {editingMaterialId ? 'Editar material' : 'Nuevo material'}
      </h4>
      <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
        <div>
          <label className="small" htmlFor="mat-nombre">Nombre</label>
          <input
            id="mat-nombre"
            className="input"
            value={matForm.nombre}
            onChange={(e) => setMatForm((m) => ({ ...m, nombre: e.target.value }))}
          />
        </div>
        <div>
          <label className="small" htmlFor="mat-tipo-acabado">Tipo de acabado</label>
          <select
            id="mat-tipo-acabado"
            className="input"
            value={matForm.tipoAcabado}
            onChange={(e) => setMatForm((m) => ({ ...m, tipoAcabado: e.target.value }))}
          >
            {TIPOS_ACABADO.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="small" htmlFor="mat-formato-largo">Formato largo (cm)</label>
          <input
            id="mat-formato-largo"
            className="input"
            type="number"
            value={matForm.formatoLargo || ''}
            onChange={(e) => setMatForm((m) => ({ ...m, formatoLargo: parseFloat(e.target.value) || undefined }))}
          />
        </div>
        <div>
          <label className="small" htmlFor="mat-formato-ancho">Formato ancho (cm)</label>
          <input
            id="mat-formato-ancho"
            className="input"
            type="number"
            value={matForm.formatoAncho || ''}
            onChange={(e) => setMatForm((m) => ({ ...m, formatoAncho: parseFloat(e.target.value) || undefined }))}
          />
        </div>
        <div>
          <label className="small" htmlFor="mat-formato-grosor">Grosor (mm)</label>
          <input
            id="mat-formato-grosor"
            className="input"
            type="number"
            value={matForm.formatoGrosor || ''}
            onChange={(e) => setMatForm((m) => ({ ...m, formatoGrosor: parseFloat(e.target.value) || undefined }))}
          />
        </div>
        <div>
          <label className="small" htmlFor="mat-color">Color</label>
          <input
            id="mat-color"
            className="input"
            value={matForm.color || ''}
            onChange={(e) => setMatForm((m) => ({ ...m, color: e.target.value }))}
          />
        </div>
        <div>
          <label className="small" htmlFor="mat-marca">Marca</label>
          <input
            id="mat-marca"
            className="input"
            value={matForm.marca || ''}
            onChange={(e) => setMatForm((m) => ({ ...m, marca: e.target.value }))}
          />
        </div>
        <div>
          <label className="small" htmlFor="mat-categoria">Categoría</label>
          <select
            id="mat-categoria"
            className="input"
            value={matForm.categoria}
            onChange={(e) =>
              setMatForm((m) => ({ ...m, categoria: e.target.value as MaterialEnchape['categoria'] }))
            }
          >
            <option value="Ambos">Ambos</option>
            <option value="Piso">Piso</option>
            <option value="Pared">Pared</option>
          </select>
        </div>
        <div>
          <label className="small" htmlFor="mat-m2-caja">m² por caja</label>
          <input
            id="mat-m2-caja"
            className="input"
            type="number"
            step="0.01"
            value={matForm.m2caja || ''}
            onChange={(e) => setMatForm((m) => ({ ...m, m2caja: parseFloat(e.target.value) || undefined }))}
          />
        </div>
        <div>
          <label className="small" htmlFor="mat-peso-caja">Peso caja (kg)</label>
          <input
            id="mat-peso-caja"
            className="input"
            type="number"
            step="0.1"
            value={matForm.pesoCaja || ''}
            onChange={(e) => setMatForm((m) => ({ ...m, pesoCaja: parseFloat(e.target.value) || undefined }))}
          />
        </div>
        <div>
          <label className="small" htmlFor="mat-modo-precio">Modo precio</label>
          <select
            id="mat-modo-precio"
            className="input"
            value={matForm.modoPrecio}
            onChange={(e) => setMatForm((m) => ({ ...m, modoPrecio: e.target.value as 'm2' | 'caja' }))}
          >
            <option value="m2">Por m²</option>
            <option value="caja">Por caja</option>
          </select>
        </div>
        {matForm.modoPrecio === 'm2' ? (
          <div>
            <label className="small" htmlFor="mat-precio-m2">Precio m²</label>
            <input
              id="mat-precio-m2"
              className="input"
              type="number"
              value={matForm.precioM2 || ''}
              onChange={(e) => setMatForm((m) => ({ ...m, precioM2: parseFloat(e.target.value) || undefined }))}
            />
          </div>
        ) : (
          <div>
            <label className="small" htmlFor="mat-precio-caja">Precio caja</label>
            <input
              id="mat-precio-caja"
              className="input"
              type="number"
              value={matForm.precioCaja || ''}
              onChange={(e) => setMatForm((m) => ({ ...m, precioCaja: parseFloat(e.target.value) || undefined }))}
            />
          </div>
        )}
        <div>
          <label className="small" htmlFor="mat-umbral-sobrante">Umbral sobrante (cm)</label>
          <input
            id="mat-umbral-sobrante"
            className="input"
            type="number"
            value={matForm.umbralSobranteCm || ''}
            onChange={(e) =>
              setMatForm((m) => ({ ...m, umbralSobranteCm: parseFloat(e.target.value) || undefined }))
            }
          />
        </div>
      </div>
      <button type="button" className="toolbar-btn" style={{ marginTop: 12 }} onClick={onSave}>
        {editingMaterialId ? 'Guardar cambios' : 'Agregar material'}
      </button>
    </div>
  )
}
