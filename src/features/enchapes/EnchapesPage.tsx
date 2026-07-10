import { useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useEnchapes } from './hooks/useEnchapes'
import { BackButton } from '../../shared/components/BackButton'
import { Grid3x3, DraftingCompass, ClipboardList, Package, Calculator, Save, Trash2 } from 'lucide-react'
import { Fase1Canvas } from './components/Fase1Canvas'
import { Fase2Resumen } from './components/Fase2Resumen'
import { Fase3Materiales } from './components/Fase3Materiales'
import { Fase4Presupuesto } from './components/Fase4Presupuesto'

export function EnchapesPage() {
  const navigate = useNavigate()
  const enchapes = useEnchapes()
  const {
    proyecto,
    updateProyecto,
    niveles,
    nivelActivoId,
    addNivel,
    removeNivel,
    renameNivel,
    selectNivel,
    addSpace,
    removeSpace,
    updateSpace,
    updateSegmento,
    addSegmento,
    removeSegmento,
    addAdjacentSpace,
    conexiones,
    addConexion,
    removeConexion,
    selectedCardId,
    setSelectedCardId,
    updateSpacePosition,
    materiales,
    addMaterial,
    updateMaterial,
    removeMaterial,
    assignMaterial,
    assignPatron,
    updateAjuste,
    setOrientacion,
    bancoSobrantes,
    eliminarSobrante,
    fase,
    setFase,
    getNivelActivo,
    getMaterial,
    espacioCompleto,
    computeArea,
    calcularInstalacion,
    patronesParaEspacio,
    saveToBackend,
    loadProject,
    isSaving,
    resetProject,
  } = enchapes

  // Si venimos derivados de un plano (?project=<id>), cargamos ese proyecto.
  const [searchParams] = useSearchParams()
  const projectParam = searchParams.get('project')
  useEffect(() => {
    if (projectParam) loadProject(projectParam)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectParam])

  const nivelActivo = getNivelActivo()
  const espacios = nivelActivo?.espacios || []

  const phases = [
    { label: '1. Plano', icon: DraftingCompass },
    { label: '2. Resumen', icon: ClipboardList },
    { label: '3. Materiales', icon: Package },
    { label: '4. Presupuesto', icon: Calculator },
  ]

  return (
    <main>
      <BackButton />
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
        <Grid3x3 size={28} color="#b69462" /> Calculadora de Enchapes
      </h1>
      <p className="small">Calcula materiales, desperdicio y presupuesto para pisos y paredes</p>

      {/* Project info */}
      <div className="card mt-2" style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div>
          <label className="small" style={{ display: 'block', marginBottom: 4 }} htmlFor="ench-proyecto">Proyecto</label>
          <input
            id="ench-proyecto"
            className="input"
            value={proyecto.nombre}
            onChange={(e) => updateProyecto('nombre', e.target.value)}
            placeholder="Nombre del proyecto"
          />
        </div>
        <div>
          <label className="small" style={{ display: 'block', marginBottom: 4 }} htmlFor="ench-propietario">Propietario</label>
          <input
            id="ench-propietario"
            className="input"
            value={proyecto.propietario}
            onChange={(e) => updateProyecto('propietario', e.target.value)}
            placeholder="Propietario"
          />
        </div>
        <div>
          <label className="small" style={{ display: 'block', marginBottom: 4 }} htmlFor="ench-ubicacion">Ubicación</label>
          <input
            id="ench-ubicacion"
            className="input"
            value={proyecto.ubicacion}
            onChange={(e) => updateProyecto('ubicacion', e.target.value)}
            placeholder="Ubicación"
          />
        </div>
      </div>

      {/* Phase navigator */}
      <div className="flex-gap" style={{ marginTop: 24, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        {phases.map((ph, idx) => {
          const phase = idx + 1
          const active = fase === phase
          const Icon = ph.icon
          return (
            <button
              type="button"
              key={phase}
              onClick={() => setFase(phase)}
              className={active ? 'phase-btn phase-btn--active' : 'phase-btn'}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
            >
              <Icon size={16} /> {ph.label}
            </button>
          )
        })}
        <button
          type="button"
          onClick={saveToBackend}
          disabled={isSaving}
          className="save-btn"
          style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 8 }}
        >
          <Save size={16} /> {isSaving ? 'Guardando...' : 'Guardar proyecto'}
        </button>
        <button
          type="button"
          onClick={resetProject}
          className="btn-reset-project"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
        >
          <Trash2 size={16} /> Reiniciar proyecto
        </button>
      </div>

      {fase === 1 && (
        <Fase1Canvas
          niveles={niveles}
          nivelActivoId={nivelActivoId}
          selectNivel={selectNivel}
          addNivel={addNivel}
          removeNivel={removeNivel}
          renameNivel={renameNivel}
          espacios={espacios}
          conexiones={conexiones}
          addSpace={addSpace}
          removeSpace={removeSpace}
          updateSpace={updateSpace}
          updateSegmento={updateSegmento}
          addSegmento={addSegmento}
          removeSegmento={removeSegmento}
          addAdjacentSpace={addAdjacentSpace}
          addConexion={addConexion}
          removeConexion={removeConexion}
          selectedCardId={selectedCardId}
          setSelectedCardId={setSelectedCardId}
          updateSpacePosition={updateSpacePosition}
          computeArea={computeArea}
          getMaterial={getMaterial}
          readOnly
          onEditarPlano={() => navigate('/planos')}
        />
      )}

      {fase === 2 && (
        <Fase2Resumen
          niveles={niveles}
          computeArea={computeArea}
          getMaterial={getMaterial}
        />
      )}

      {fase === 3 && (
        <Fase3Materiales
          niveles={niveles}
          materiales={materiales}
          getMaterial={getMaterial}
          computeArea={computeArea}
          espacioCompleto={espacioCompleto}
          calcularInstalacion={calcularInstalacion}
          patronesParaEspacio={patronesParaEspacio}
          assignMaterial={assignMaterial}
          assignPatron={assignPatron}
          updateAjuste={updateAjuste}
          setOrientacion={setOrientacion}
          addMaterial={addMaterial}
          updateMaterial={updateMaterial}
          removeMaterial={removeMaterial}
        />
      )}

      {fase === 4 && (
        <Fase4Presupuesto
          niveles={niveles}
          materiales={materiales}
        />
      )}

      {/* Banco de sobrantes (visible en Fase 3 y 4) */}
      {(fase === 3 || fase === 4) && bancoSobrantes.length > 0 && (
        <div className="card" style={{ marginTop: 20 }}>
          <h3 className="section-title" style={{ marginTop: 0, marginBottom: 12 }}>
            ♻️ Banco de sobrantes
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {bancoSobrantes.map((sob) => (
              <div
                key={sob.id}
                style={{
                  padding: 10,
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span className="small">
                  {sob.materialNombre} · {sob.ancho.toFixed(2)}×{sob.alto.toFixed(2)}m · {sob.cantidad} pieza
                  {sob.cantidad > 1 ? 's' : ''} · {sob.origen}
                </span>
                <button
                  type="button"
                  onClick={() => eliminarSobrante(sob.id)}
                  style={{ background: 'none', border: 'none', color: '#ff3b30', cursor: 'pointer', fontSize: 12 }}
                >
                  Eliminar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  )
}
