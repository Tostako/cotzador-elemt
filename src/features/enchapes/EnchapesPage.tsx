import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useEnchapes } from './hooks/useEnchapes'
import { apiService } from '../../shared/services/api'
import { showNotification } from '../../shared/hooks/useNotifications'
import { PlanoPicker } from '../planos/PlanoPicker'
import { BackButton } from '../../shared/components/BackButton'
import { Grid3x3, DraftingCompass, ClipboardList, Package, Calculator, Save, Trash2 } from 'lucide-react'
import { Fase1Canvas } from './components/Fase1Canvas'
import { Fase2Resumen } from './components/Fase2Resumen'
import { Fase3Materiales } from './components/Fase3Materiales'
import { Fase4Presupuesto } from './components/Fase4Presupuesto'

const dataOf = (res: any) => (res && typeof res === 'object' && 'data' in res ? res.data : res)

/** Busca un proyecto de enchapes ya derivado de este plano, para reabrirlo en vez
 *  de crear otro. Sin esto cada visita dejaría un proyecto nuevo en el servidor,
 *  y la app no tiene pantalla para verlos ni borrarlos. */
async function buscarProyectoDerivado(planId: string, planNombre?: string): Promise<any | null> {
  try {
    const res = dataOf(await apiService.getTileProjects())
    const list: any[] = Array.isArray(res) ? res : []
    // 1) Vínculo real, si el backend lo devuelve.
    const porPlan = list.find((p) => {
      const ref = p?.house_plan_id ?? p?.housePlanId ?? p?.plano_id
      return ref != null && String(ref) === String(planId)
    })
    if (porPlan) return porPlan
    // 2) Si no hay vínculo, por el nombre con el que se crean ("Enchapes <plano>").
    //    Es frágil: si renombras el plano deja de emparejar y se creará otro proyecto.
    const esperado = `enchapes ${String(planNombre || '').trim()}`.trim().toLowerCase()
    if (esperado === 'enchapes') return null
    return list.find((p) => String(p?.nombre || '').trim().toLowerCase() === esperado) || null
  } catch {
    return null // sin listado seguimos con la importación normal
  }
}

export function EnchapesPage() {
  const [searchParams] = useSearchParams()
  const projectParam = searchParams.get('project')

  // Con ?project= se entra al asistente; si no, primero se elige un plano
  // — igual que en barrederas, que siempre parte de un plano.
  if (projectParam) return <EnchapesCalc projectParam={projectParam} />
  return <EnchapesPicker />
}

function EnchapesPicker() {
  const navigate = useNavigate()
  const [abriendo, setAbriendo] = useState<string | null>(null)

  const abrirPlano = async (planId: string, plan: any) => {
    setAbriendo(planId)
    try {
      const existente = await buscarProyectoDerivado(planId, plan?.nombre)
      let projectId = existente?.id
      if (!projectId) {
        const created = dataOf(
          await apiService.importPlanToTiles(planId, { nombre: `Enchapes ${String(plan?.nombre || '').trim()}`.trim() })
        )
        projectId = created?.id
      }
      if (!projectId) throw new Error('El servidor no devolvió el proyecto de enchapes.')
      navigate(`/calculadoras/enchapes?project=${projectId}`)
    } catch (e: any) {
      showNotification('Error', 'error', e?.message || 'No se pudo abrir el plano en enchapes.')
      setAbriendo(null)
    }
  }

  return (
    <PlanoPicker
      titulo="Enchapes"
      icono={<Grid3x3 size={28} color="#b69462" />}
      descripcion="Elige un plano de casa para calcular materiales, desperdicio y presupuesto de pisos y paredes."
      onSelect={abrirPlano}
      busyId={abriendo}
    />
  )
}

function EnchapesCalc({ projectParam }: { projectParam: string | null }) {
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
      {/* flexWrap: en móvil el título y el botón no caben en una línea y se salían del ancho. */}
      <div className="flex-between" style={{ marginBottom: 8, gap: 12, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 'clamp(22px, 6vw, 32px)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Grid3x3 size={28} color="#b69462" /> Calculadora de Enchapes
        </h1>
        <button type="button" className="btn btn-small btn-secondary" onClick={() => navigate('/calculadoras/enchapes')} style={{ width: 'auto' }}>
          ← Cambiar plano
        </button>
      </div>
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
