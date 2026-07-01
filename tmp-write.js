const fs = require('fs');
const path = 'src/features/enchapes/EnchapesPage.tsx';

const content = `import { useState, useRef, useCallback, useEffect } from 'react'
import { useEnchapes } from './hooks/useEnchapes'
import type { MaterialEnchape } from './types/enchapes'
import {
  TIPOS_ACABADO,
  ACABADOS_CONTINUOS,
  umbralPorDefecto,
  nombreConColor,
} from './types/enchapes'
import {
  computeArea,
  calcularInstalacion,
  calcularSobrantesEspacio,
  patronesParaMaterial,
  generarPlanoSVG,
  calcularPresupuesto,
} from './utils/calculations'
import { showNotification } from '../../shared/hooks/useNotifications'

export function EnchapesPage() {
  const ench = useEnchapes()
  const [f3e, setF3e] = useState<Set<string>>(new Set())
  const toggleF3 = (id: string) => setF3e(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
  const [matDraft, setMatDraft] = useState<Partial<MaterialEnchape>>({ nombre: '', tipoAcabado: TIPOS_ACABADO[0], categoria: 'Ambos', modoPrecio: 'm2', umbralSobranteCm: umbralPorDefecto(TIPOS_ACABADO[0]) })
  const [editingMatId, setEditingMatId] = useState<string | null>(null)

  const nivelActivo = ench.getNivelActivo()
  const espacios = nivelActivo?.espacios || []
  const [cs, setCs] = useState({ w: 1400, h: 900 })
  const offX = espacios.length ? -Math.min(0, ...espacios.map(e => e.x)) + 200 : 200
  const offY = espacios.length ? -Math.min(0, ...espacios.map(e => e.y)) + 200 : 200

  useEffect(() => {
    if (!espacios.length) return
    const mx = Math.max(...espacios.map(e => e.x + 260))
    const my = Math.max(...espacios.map(e => e.y + 220))
    setCs({ w: Math.max(1400, mx + 400), h: Math.max(900, my + 400) })
  }, [espacios])

  const [dg, setDg] = useState<string | null>(null)
  const dref = useRef<any>(null)
  const onDown = (ev: React.PointerEvent, sid: string) => {
    if ((ev.target as HTMLElement).closest('input,button,select,textarea')) return
    ev.preventDefault()
    const sp = espacios.find(s => s.id === sid)
    if (!sp) return
    dref.current = { x: ev.clientX, y: ev.clientY, ox: sp.x, oy: sp.y }
    setDg(sid)
    const onMove = (m: PointerEvent) => {
      if (!dref.current) return
      const dx = (m.clientX - dref.current.x) / ench.zoomLevel
      const dy = (m.clientY - dref.current.y) / ench.zoomLevel
      ench.updateSpacePosition(sid, dref.current.ox + dx, dref.current.oy + dy)
    }
    const onUp = () => { dref.current = null; setDg(null); window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp) }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const [lo, setLo] = useState<string | null>(null)
  const onLink = (ev: React.PointerEvent, sid: string) => {
    ev.preventDefault(); ev.stopPropagation(); setLo(sid)
    const onUp = (u: PointerEvent) => {
      const el = document.elementFromPoint(u.clientX, u.clientY)
      const tc = el?.closest('[data-sid]') as HTMLElement | null
      if (tc) { const tid = tc.getAttribute('data-sid'); if (tid && tid !== sid) ench.addConexion(sid, tid) }
      setLo(null); window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointerup', onUp)
  }

  const nv = ench.niveles.find(n => n.id === ench.visNivelId)
  const esv = nv?.espacios || []
  const spv = esv.find(s => s.id === ench.visSpaceId)
  const mtv = spv ? ench.getMaterial(spv.materialId || '') : undefined
  useEffect(() => { if (!ench.visNivelId && ench.niveles.length) ench.setVisNivelId(ench.niveles[0].id) }, [ench.niveles])
  useEffect(() => { if ((!ench.visSpaceId || !esv.some(s => s.id === ench.visSpaceId)) && esv.length) ench.setVisSpaceId(esv[0].id) }, [esv])

  const tp = espacios.filter(e => e.tipo === 'piso').reduce((a, s) => a + computeArea(s), 0)
  const tw = espacios.filter(e => e.tipo === 'pared').reduce((a, s) => a + computeArea(s), 0)
  const hay = ench.niveles.some(n => n.espacios.length > 0)
  const tgp = ench.niveles.reduce((a, n) => a + n.espacios.filter(e => e.tipo === 'piso').reduce((b, s) => b + computeArea(s), 0), 0)
  const tgw = ench.niveles.reduce((a, n) => a + n.espacios.filter(e => e.tipo === 'pared').reduce((b, s) => b + computeArea(s), 0), 0)

  const handleSaveMaterial = () => {
    if (!matDraft.nombre?.trim()) { showNotification('Atencion', 'warning', 'Ponle un nombre al material.'); return }
    const mat: MaterialEnchape = {
      id: editingMatId || ('mat_' + Math.random().toString(36).slice(2, 9)),
      nombre: matDraft.nombre.trim(),
      tipoAcabado: matDraft.tipoAcabado || TIPOS_ACABADO[0],
      formatoLargo: matDraft.formatoLargo,
      formatoAncho: matDraft.formatoAncho,
      formatoGrosor: matDraft.formatoGrosor,
      color: matDraft.color,
      marca: matDraft.marca,
      categoria: (matDraft.categoria || 'Ambos') as any,
      m2caja: matDraft.m2caja,
      pesoCaja: matDraft.pesoCaja,
      modoPrecio: (matDraft.modoPrecio || 'm2') as any,
      precioM2: matDraft.precioM2,
      precioCaja: matDraft.precioCaja,
      umbralSobranteCm: matDraft.umbralSobranteCm,
    }
    if (editingMatId) ench.updateMaterial(editingMatId, mat)
    else ench.addMaterial(mat)
    setMatDraft({ nombre: '', tipoAcabado: TIPOS_ACABADO[0], categoria: 'Ambos', modoPrecio: 'm2', umbralSobranteCm: umbralPorDefecto(TIPOS_ACABADO[0]) })
    setEditingMatId(null)
    showNotification('Correcto', 'success', editingMatId ? 'Material actualizado.' : 'Material creado.')
  }

  const totalEsp = ench.niveles.reduce((a, n) => a + n.espacios.length, 0)
  const totalAsig = ench.niveles.reduce((a, n) => a + n.espacios.filter(s => ench.espacioCompleto(s)).length, 0)
  const pres = calcularPresupuesto(ench.niveles, ench.materiales)

  return (
    <main>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>Calculadora de Enchapes</h1>
      <p className="small">Calcula materiales, desperdicio y presupuesto para pisos y paredes</p>

      <div className="card mt-2" style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div><label className="small" style={{ display: 'block', marginBottom: 4 }}>Proyecto</label>
          <input className="input" value={ench.proyecto.nombre} onChange={v => ench.updateProyecto('nombre', v.target.value)} placeholder="Nombre del proyecto" /></div>
        <div><label className="small" style={{ display: 'block', marginBottom: 4 }}>Propietario</label>
          <input className="input" value={ench.proyecto.propietario} onChange={v => ench.updateProyecto('propietario', v.target.value)} placeholder="Propietario" /></div>
        <div><label className="small" style={{ display: 'block', marginBottom: 4 }}>Ubicacion</label>
          <input className="input" value={ench.proyecto.ubicacion} onChange={v => ench.updateProyecto('ubicacion', v.target.value)} placeholder="Ubicacion" /></div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 4, overflowX: 'auto', padding: '16px 0', borderBottom: '1px solid var(--color-line)', marginBottom: 20 }}>
        {[{n:1,l:'Recoleccion'},{n:2,l:'Resumen'},{n:3,l:'Materiales'},{n:4,l:'Presupuesto'}].map(s => (
          <button key={s.n} className={\`btn btn-small \${ench.vista==='wizard' && ench.fase===s.n ? '' : 'btn-secondary'}\`}
            onClick={() => { ench.setVista('wizard'); ench.setFase(s.n) }} style={{ whiteSpace: 'nowrap', fontSize: 13 }}>
            {String(s.n).padStart(2,'0')} {s.l}
          </button>
        ))}
        <span style={{ color: 'var(--color-line)', margin: '0 8px' }}>|</span>
        <button className={\`btn btn-small \${ench.vista==='catalogo' ? '' : 'btn-secondary'}\`} onClick={() => ench.setVista('catalogo')}>Catalogo</button>
        <button className={\`btn btn-small \${ench.vista==='visual' ? '' : 'btn-secondary'}\`} onClick={() => ench.setVista('visual')}>Visualizacion</button>
      </div>

      {ench.vista === 'wizard' && (
        <>
          {ench.fase === 1 && (
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Recoleccion de datos</h2>
              <p className="small" style={{ marginBottom: 14, color: '#999' }}>Arrastra tarjetas para organizar. Usa el icono de enlace para conectar espacios.</p>
              <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                {ench.niveles.map(n => (
                  <div key={n.id} className={n.id === ench.nivelActivoId ? 'btn' : 'btn btn-secondary'}
                    style={{ fontSize: 13, padding: '8px 14px', cursor: 'pointer', width: 'auto' }}
                    onClick={() => ench.selectNivel(n.id)}>
                    {n.nombre}
                    {ench.niveles.length > 1 && <span style={{ marginLeft: 8, opacity: 0.5, cursor: 'pointer' }} onClick={ev => { ev.stopPropagation(); ench.removeNivel(n.id) }}>x</span>}
                  </div>
                ))}
                <button className="btn btn-small btn-secondary" onClick={ench.addNivel} style={{ borderStyle: 'dashed', borderWidth: 2 }}>+ Nivel</button>
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                <button className="btn btn-small btn-secondary" onClick={() => ench.addSpace('piso')}>+ Piso</button>
                <button className="btn btn-small btn-secondary" onClick={() => ench.addSpace('pared')}>+ Pared</button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginLeft: 'auto', background: 'var(--color-card)', border: '1px solid var(--color-line)', borderRadius: 7, padding: 2 }}>
                  <button className="btn btn-small btn-secondary" style={{ width: 30, padding: 0 }} onClick={() => ench.setZoomLevel(Math.max(0.3, Math.round((ench.zoomLevel-0.15)*100)/100))}>-</button>
                  <span style={{ fontSize: 12, minWidth: 40, textAlign: 'center', fontWeight: 600 }}>{Math.round(ench.zoomLevel*100)}%</span>
                  <button className="btn btn-small btn-secondary" style={{ width: 30, padding: 0 }} onClick={() => ench.setZoomLevel(Math.min(1.5, Math.round((ench.zoomLevel+0.15)*100)/100))}>+</button>
                </div>
              </div>
              <div style={{ background: '#0E1B2E', border: '1px solid #1F3A5C', borderRadius: 12, overflow: 'auto', height: '60vh', minHeight: 380, maxHeight: 620, position: 'relative', backgroundImage: 'linear-gradient(#1F3A5C 1px, transparent 1px), linear-gradient(90deg, #1F3A5C 1px, transparent 1px)', backgroundSize: '28px 28px' }}>
                <div style={{ width: cs.w, height: cs.h, transform: \`scale(\${ench.zoomLevel})\`, transformOrigin: '0 0', position: 'relative' }}>
                  {ench.conexiones.map(c => {
                    const a = espacios.find(s => s.id === c.a)
                    const b = espacios.find(s => s.id === c.b)
                    if (!a || !b) return null
                    const x1 = a.x + 114 + offX, y1 = a.y + 60 + offY
                    const x2 = b.x + 114 + offX, y2 = b.y + 60 + offY
                    const len = Math.hypot(x2-x1, y2-y1)
                    const ang = Math.atan2(y2-y1, x2-x1) * 180 / Math.PI
                    return <div key={c.id} style={{ position: 'absolute', left: x1, top: y1-1, width: len, height: 2, background: 'repeating-linear-gradient(90deg, #9B7FE8 0 7px, transparent 7px 13px)', transform: \`rotate(\${ang}deg)\`, transformOrigin: '0 0', cursor: 'pointer', zIndex: 1 }} onClick={() => ench.removeConexion(c.id)} />
                  })}
                  {espacios.map(sp => (
                    <div key={sp.id} data-sid={sp.id}
                      style={{ position: 'absolute', left: sp.x + offX, top: sp.y + offY, width: 228, background: 'var(--color-card)', border: \`1.5px solid \${sp.tipo==='pared' ? 'var(--color-accent)' : '#fff'}\`, borderRadius: 9, padding: '10px 13px', boxShadow: '0 2px 10px rgba(0,0,0,0.3)', zIndex: ench.selectedCardId===sp.id ? 10 : 2, opacity: dg===sp.id ? 0.8 : 1 }}
                      onPointerDown={ev => onDown(ev, sp.id)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 7 }}>
                        <span style={{ cursor: 'grab', color: '#999', fontSize: 16, padding: '4px 2px', userSelect: 'none' }}>***</span>
                        <input style={{ flex: 1, border: 'none', background: 'none', fontWeight: 600, fontSize: 13, color: '#fff', padding: '2px 0' }} value={sp.nombre} onChange={v => ench.updateSpace(sp.id, { nombre: v.target.value })} onPointerDown={ev => ev.stopPropagation()} />
                        <span style={{ cursor: 'crosshair', fontSize: 14, padding: '4px 2px' }} onPointerDown={ev => onLink(ev, sp.id)}>link</span>
                        <button style={{ border: 'none', background: 'none', color: '#999', fontSize: 17, width: 28, height: 28, cursor: 'pointer' }} onClick={ev => { ev.stopPropagation(); ench.removeSpace(sp.id) }}>x</button>
                      </div>
                      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                        <button className={\`btn btn-small \${sp.tipo==='piso' ? '' : 'btn-secondary'}\`} style={{ flex: 1, fontSize: 10, textTransform: 'uppercase', padding: '4px 0' }} onClick={ev => { ev.stopPropagation(); ench.updateSpace(sp.id, { tipo: 'piso' }) }}>Piso</button>
                        <button className={\`btn btn-small \${sp.tipo==='pared' ? '' : 'btn-secondary'}\`} style={{ flex: 1, fontSize: 10, textTransform: 'uppercase', padding: '4px 0' }} onClick={ev => { ev.stopPropagation(); ench.updateSpace(sp.id, { tipo: 'pared' }) }}>Pared</button>
                      </div>
                      <span style={{ fontSize: 9, color: '#999', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: 3 }}>Tramos</span>
                      {sp.segmentos.map((seg, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: 5, marginBottom: 5, alignItems: 'center' }}>
                          <input type="number" step={0.01} min={0} className="input" style={{ flex: 1, padding: '5px 6px', fontSize: 12 }} value={seg.largo} onChange={v => ench.updateSegmento(sp.id, idx, 'largo', parseFloat(v.target.value)||0)} onPointerDown={ev => ev.stopPropagation()} placeholder="Largo" />
                          <input type="number" step={0.01} min={0} className="input" style={{ flex: 1, padding: '5px 6px', fontSize: 12 }} value={seg.ancho} onChange={v => ench.updateSegmento(sp.id, idx, 'ancho', parseFloat(v.target.value)||0)} onPointerDown={ev => ev.stopPropagation()} placeholder={sp.tipo==='pared'?'Alto':'Ancho'} />
                          {sp.segmentos.length > 1 && <button style={{ border: 'none', background: 'none', color: '#999', fontSize: 13, width: 16, cursor: 'pointer' }} onClick={ev => { ev.stopPropagation(); ench.removeSegmento(sp.id, idx) }}>x</button>}
                        </div>
                      ))}
                      <button style={{ display: 'block', width: '100%', border: '1px dashed var(--color-line)', background: 'none', color: 'var(--color-accent)', fontSize: 10.5, fontWeight: 600, padding: 4, borderRadius: 5, margin: '4px 0 6px', cursor: 'pointer' }} onClick={ev => { ev.stopPropagation(); ench.addSegmento(sp.id) }}>+ Tramo</button>
                      {sp.tipo === 'piso' && <button style={{ display: 'block', width: '100%', border: 'none', background: 'none', color: '#5E7B85', fontSize: 10.5, fontWeight: 600, padding: '3px 0', textAlign: 'left', cursor: 'pointer' }} onClick={ev => { ev.stopPropagation(); ench.addAdjacentSpace(sp.id, 'pared') }}>+ Pared</button>}
                      <div style={{ fontSize: 12, color: '#999', borderTop: '1px solid var(--color-line)', paddingTop: 7, display: 'flex', justifyContent: 'space-between' }}>
                        <span>Area</span><strong style={{ color: '#fff' }}>{computeArea(sp).toFixed(2)} m2</strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ marginTop: 14, display: 'flex', gap: 22, flexWrap: 'wrap', background: 'rgba(182,148,98,0.1)', borderRadius: 8, padding: '11px 16px', fontSize: 12.5 }}>
                <span>Piso: <b style={{ color: 'var(--color-accent)' }}>{tp.toFixed(2)} m2</b></span>
                <span>Pared: <b style={{ color: 'var(--color-accent)' }}>{tw.toFixed(2)} m2</b></span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
                <button className="btn" onClick={() => ench.setFase(2)}>Resumen</button>
              </div>
            </div>
          )}

          {ench.fase === 2 && (
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Resumen</h2>
              <p className="small" style={{ marginBottom: 18 }}>Revisa areas por nivel.</p>
              {!hay ? <div className="card" style={{ textAlign: 'center', padding: 40 }}><p className="small">No hay espacios.</p></div> : (
                <>
                  {ench.niveles.map(niv => {
                    if (!niv.espacios.length) return null
                    return (
                      <div key={niv.id} style={{ marginBottom: 20 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ width: 5, height: 14, background: 'var(--color-accent)', borderRadius: 2 }} />{niv.nombre}
                        </h3>
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--color-card)', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--color-line)' }}>
                            <thead><tr style={{ background: '#000', color: '#fff' }}>
                              <th style={{ padding: '9px 12px', fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', textAlign: 'left' }}>Espacio</th>
                              <th style={{ padding: '9px 12px', fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', textAlign: 'left' }}>Tipo</th>
                              <th style={{ padding: '9px 12px', fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', textAlign: 'left' }}>Tramos</th>
                              <th style={{ padding: '9px 12px', fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', textAlign: 'left' }}>Area</th>
                            </tr></thead>
                            <tbody>
                              {niv.espacios.map(sp => (
                                <tr key={sp.id} style={{ borderTop: '1px solid var(--color-line)' }}>
                                  <td style={{ padding: '9px 12px', fontSize: 13 }}>{sp.nombre}</td>
                                  <td style={{ padding: '9px 12px' }}><span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', background: sp.tipo==='piso'?'rgba(182,148,98,0.15)':'rgba(94,123,133,0.15)', color: sp.tipo==='piso'?'var(--color-accent)':'#5E7B85' }}>{sp.tipo}</span></td>
                                  <td style={{ padding: '9px 12px', fontSize: 13 }}>{sp.segmentos.length}</td>
                                  <td style={{ padding: '9px 12px', fontSize: 13 }}>{computeArea(sp).toFixed(2)} m2</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )
                  })}
                  <div style={{ marginTop: 18, background: 'var(--color-card)', color: '#fff', borderRadius: 10, padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                    <span style={{ fontSize: 13, opacity: 0.75 }}>Total PISO</span><span style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-accent)' }}>{tgp.toFixed(2)} m2</span>
                  </div>
                  <div style={{ marginTop: 8, background: 'var(--color-card)', color: '#fff', borderRadius: 10, padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                    <span style={{ fontSize: 13, opacity: 0.75 }}>Total PARED</span><span style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-accent)' }}>{tgw.toFixed(2)} m2</span>
                  </div>
                </>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 26 }}>
                <button className="btn btn-secondary" onClick={() => ench.setFase(1)}>Recoleccion</button>
                <button className="btn" onClick={() => ench.setFase(3)}>Materiales</button>
              </div>
            </div>
          )}

          {ench.fase === 3 && (
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Asignacion</h2>
              <p className="small" style={{ marginBottom: 18 }}>Asigna material y patron.</p>
              {!ench.materiales.length ? (
                <div className="card" style={{ textAlign: 'center', padding: 40 }}>
                  <p className="small">Catalogo vacio.</p><button className="btn mt-2" onClick={() => ench.setVista('catalogo')}>Ir al catalogo</button>
                </div>
              ) : (
                <>
                  <span className="small" style={{ color: '#999' }}>{totalAsig} de {totalEsp} asignados</span>
                  {ench.niveles.map(niv => {
                    if (!niv.espacios.length) return null
                    return (
                      <div key={niv.id} style={{ marginBottom: 6 }}>
                        <h3 style={{ fontSize: 13, margin: '14px 0 8px', color: '#999' }}>{niv.nombre}</h3>
                        {niv.espacios.map(sp => {
                          const mat = ench.getMaterial(sp.materialId || '')
                          const comp = ench.espacioCompleto(sp)
                          const exp = f3e.has(sp.id)
                          const filtro = sp.filtroTipoAcabado || ''
                          const tiposDisp = [...new Set(ench.materiales.map(m => m.tipoAcabado))]
                          const matsFil = ench.materiales.filter(m => {
                            const okTipo = !filtro || m.tipoAcabado === filtro
                            const okCat = m.categoria === 'Ambos' || (m.categoria === 'Piso' && sp.tipo === 'piso') || (m.categoria === 'Pared' && sp.tipo === 'pared')
                            return okTipo && okCat
                          })
                          const continuo = mat && ACABADOS_CONTINUOS.has(mat.tipoAcabado)
                          const opsPat = mat ? patronesParaMaterial(sp, mat) : []
                          const res = mat && sp.patronId ? calcularInstalacion(sp, mat, sp.patronId, sp.ajusteDesperdicio) : null
                          return (
                            <div key={sp.id} className="card" style={{ marginBottom: 10, padding: exp ? '14px 16px' : '11px 16px', cursor: 'pointer' }} onClick={() => toggleF3(sp.id)}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <b style={{ fontSize: 13.5 }}>{sp.nombre}</b>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <span className="small">{sp.tipo==='pared'?'Pared':'Piso'} {computeArea(sp).toFixed(2)} m2</span>
                                  <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20, textTransform: 'uppercase', background: comp?'rgba(52,199,89,0.15)':'rgba(182,148,98,0.15)', color: comp?'#34c759':'var(--color-accent)' }}>{comp?'Asignado':'Pendiente'}</span>
                                  <span style={{ color: '#999' }}>{exp ? '^' : 'v'}</span>
                                </span>
                              </div>
                              {exp && (
                                <div style={{ marginTop: 10 }} onClick={ev => ev.stopPropagation()}>
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                                    <div>
                                      <label className="small" style={{ display: 'block', marginBottom: 4, fontSize: 9.5, color: '#999', fontWeight: 600, textTransform: 'uppercase' }}>Tipo</label>
                                      <select className="select" style={{ fontSize: 12.5 }} value={filtro} onChange={v => ench.setFiltroTipo(sp.id, v.target.value || null)}>
                                        <option value="">Todos</option>
                                        {tiposDisp.map(t => <option key={t} value={t}>{t}</option>)}
                                      </select>
                                    </div>
                                    <div>
                                      <label className="small" style={{ display: 'block', marginBottom: 4, fontSize: 9.5, color: '#999', fontWeight: 600, textTransform: 'uppercase' }}>Material</label>
                                      <select className="select" style={{ fontSize: 12.5 }} value={sp.materialId || ''} onChange={v => ench.assignMaterial(sp.id, v.target.value || null)}>
                                        <option value="">Sin material</option>
                                        {matsFil.map(m => <option key={m.id} value={m.id}>{nombreConColor(m)}</option>)}
                                      </select>
                                    </div>
                                    <div>
                                      <label className="small" style={{ display: 'block', marginBottom: 4, fontSize: 9.5, color: '#999', fontWeight: 600, textTransform: 'uppercase' }}>Patron</label>
                                      {continuo ? <input className="input" style={{ fontSize: 12.5 }} type="number" step={0.5} placeholder="% desp" value={sp.ajusteDesperdicio || ''} onChange={v => ench.updateAjuste(sp.id, parseFloat(v.target.value)||0)} />
                                        : mat ? (
                                          <select className="select" style={{ fontSize: 12.5 }} value={sp.patronId || ''} onChange={v => ench.assignPatron(sp.id, v.target.value || null)}>
                                            <option value="">Selecciona</option>
                                            {opsPat.map(p => <option key={p.id} value={p.id}>{p.nombre} (~{p.desperdicioEstimado}%)</option>)}
                                          </select>
                                        ) : <select className="select" disabled><option>Elige material</option></select>}
                                    </div>
                                  </div>
                                  {!continuo && mat && sp.patronId && (
                                    <div style={{ marginTop: 8 }}>
                                      <label className="small" style={{ display: 'block', marginBottom: 4 }}>Ajuste manual (%)</label>
                                      <input className="input" type="number" step={0.5} style={{ maxWidth: 120, fontSize: 12 }} value={sp.ajusteDesperdicio || ''} onChange={v => ench.updateAjuste(sp.id, parseFloat(v.target.value)||0)} />
                                    </div>
                                  )}
                                  {res && (
                                    <div style={{ marginTop: 8, background: 'rgba(182,148,98,0.1)', borderRadius: 8, padding: '10px 12px', fontSize: 12.5, color: 'var(--color-accent)' }}>
                                      <b>Desperdicio: {res.desperdicioPct.toFixed(1)}%</b> Area a comprar: <b>{res.areaComprada.toFixed(2)} m2</b>
                                      {res.piezas ? ' Piezas: ' + res.piezas : ''}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 26 }}>
                <button className="btn btn-secondary" onClick={() => ench.setFase(2)}>Resumen</button>
                <button className="btn" onClick={() => ench.setFase(4)}>Presupuesto</button>
              </div>
            </div>
          )}

          {ench.fase === 4 && (
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Presupuesto</h2>
              <p className="small" style={{ marginBottom: 18 }}>Resumen final y costos.</p>
              {!hay ? <div className="card" style={{ textAlign: 'center', padding: 40 }}><p className="small">No hay datos.</p></div> : (
                <>
                  {ench.niveles.map(niv => {
                    if (!niv.espacios.length) return null
                    return (
                      <div key={niv.id} style={{ marginBottom: 20 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ width: 5, height: 14, background: 'var(--color-accent)', borderRadius: 2 }} />{niv.nombre}
                        </h3>
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--color-card)', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--color-line)' }}>
                            <thead><tr style={{ background: '#000', color: '#fff' }}>
                              <th style={{ padding: '9px 12px', fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', textAlign: 'left' }}>Espacio</th>
                              <th style={{ padding: '9px 12px', fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', textAlign: 'left' }}>Tipo</th>
                              <th style={{ padding: '9px 12px', fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', textAlign: 'left' }}>Area</th>
                              <th style={{ padding: '9px 12px', fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', textAlign: 'left' }}>Material</th>
                              <th style={{ padding: '9px 12px', fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', textAlign: 'left' }}>Desp</th>
                              <th style={{ padding: '9px 12px', fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', textAlign: 'left' }}>Comprar</th>
                              <th style={{ padding: '9px 12px', fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', textAlign: 'left' }}>Costo</th>
                            </tr></thead>
                            <tbody>
                              {niv.espacios.map(sp => {
                                const area = computeArea(sp)
                                const mat = ench.getMaterial(sp.materialId || '')
                                let costo = 0, desp = 0, areaC = area
                                if (mat && sp.patronId) {
                                  const r = calcularInstalacion(sp, mat, sp.patronId, sp.ajusteDesperdicio)
                                  desp = r.desperdicioPct; areaC = r.areaComprada
                                  if (mat.modoPrecio === 'caja') {
                                    const m2c = parseFloat(String(mat.m2caja)) || 1
                                    const cajas = Math.ceil(areaC / m2c)
                                    costo = cajas * (parseFloat(String(mat.precioCaja)) || 0)
                                  } else {
                                    costo = areaC * (parseFloat(String(mat.precioM2)) || 0)
                                  }
                                }
                                return (
                                  <tr key={sp.id} style={{ borderTop: '1px solid var(--color-line)' }}>
                                    <td style={{ padding: '9px 12px', fontSize: 13 }}>{sp.nombre}</td>
                                    <td style={{ padding: '9px 12px' }}><span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', background: sp.tipo==='piso'?'rgba(182,148,98,0.15)':'rgba(94,123,133,0.15)', color: sp.tipo==='piso'?'var(--color-accent)':'#5E7B85' }}>{sp.tipo}</span></td>
                                    <td style={{ padding: '9px 12px', fontSize: 13 }}>{area.toFixed(2)} m2</td>
                                    <td style={{ padding: '9px 12px', fontSize: 13 }}>{mat?.nombre || '-'}</td>
                                    <td style={{ padding: '9px 12px', fontSize: 13 }}>{mat ? desp.toFixed(1) + '%' : '-'}</td>
                                    <td style={{ padding: '9px 12px', fontSize: 13 }}>{mat ? areaC.toFixed(2) + ' m2' : '-'}</td>
                                    <td style={{ padding: '9px 12px', fontSize: 13 }}>{costo ? '$' + costo.toLocaleString('es-CO') : '-'}</td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )
                  })}
                  {Object.keys(pres.porMaterial).length > 0 && (
                    <div style={{ marginBottom: 20 }}>
                      <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 8px' }}>Totales por material</h3>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--color-card)', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--color-line)' }}>
                          <thead><tr style={{ background: '#000', color: '#fff' }}>
                            <th style={{ padding: '9px 12px', fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', textAlign: 'left' }}>Material</th>
                            <th style={{ padding: '9px 12px', fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', textAlign: 'left' }}>Area</th>
                            <th style={{ padding: '9px 12px', fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', textAlign: 'left' }}>Cajas</th>
                            <th style={{ padding: '9px 12px', fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', textAlign: 'left' }}>Costo</th>
                          </tr></thead>
                          <tbody>
                            {Object.values(pres.porMaterial).map(m => (
                              <tr key={m.nombre} style={{ borderTop: '1px solid var(--color-line)' }}>
                                <td style={{ padding: '9px 12px', fontSize: 13 }}>{m.nombre}</td>
                                <td style={{ padding: '9px 12px', fontSize: 13 }}>{m.area.toFixed(2)} m2</td>
                                <td style={{ padding: '9px 12px', fontSize: 13 }}>{m.cajas || '-'}</td>
                                <td style={{ padding: '9px 12px', fontSize: 13 }}>${m.costo.toLocaleString('es-CO')}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  <div style={{ background: 'var(--color-card)', color: '#fff', borderRadius: 10, padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                    <span style={{ fontSize: 13, opacity: 0.75 }}>Presupuesto total</span>
                    <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-accent)' }}>${pres.granTotal.toLocaleString('es-CO')}</span>
                  </div>
                </>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 26 }}>
                <button className="btn btn-secondary" onClick={() => ench.setFase(3)}>Materiales</button>
                <button className="btn" onClick={() => window.print()}>Imprimir</button>
              </div>
            </div>
          )}
        </>
      )}

      {ench.vista === 'catalogo' && (
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Catalogo de materiales</h2>
          <p className="small" style={{ marginBottom: 18 }}>Crea y administra materiales.</p>
          <div className="card" style={{ marginBottom: 22 }}>
            <h3 style={{ fontSize: 14, margin: '0 0 12px' }}>{editingMatId ? 'Editar' : 'Nuevo'}</h3>
            <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
              <div><label className="small" style={{ display: 'block', marginBottom: 4 }}>Nombre</label><input className="input" value={matDraft.nombre || ''} onChange={v => setMatDraft(p => ({...p, nombre: v.target.value}))} placeholder="ej. Porcelanato" /></div>
              <div><label className="small" style={{ display: 'block', marginBottom: 4 }}>Tipo</label>
                <select className="select" value={matDraft.tipoAcabado} onChange={v => setMatDraft(p => ({...p, tipoAcabado: v.target.value, umbralSobranteCm: umbralPorDefecto(v.target.value)}))}>
                  {TIPOS_ACABADO.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div><label className="small" style={{ display: 'block', marginBottom: 4 }}>Aplica a</label>
                <select className="select" value={matDraft.categoria} onChange={v => setMatDraft(p => ({...p, categoria: v.target.value as any}))}>
                  <option>Ambos</option><option>Piso</option><option>Pared</option>
                </select>
              </div>
              <div><label className="small" style={{ display: 'block', marginBottom: 4 }}>Marca</label><input className="input" value={matDraft.marca || ''} onChange={v => setMatDraft(p => ({...p, marca: v.target.value}))} /></div>
              <div><label className="small" style={{ display: 'block', marginBottom: 4 }}>Largo (cm)</label><input className="input" type="number" step={0.1} value={matDraft.formatoLargo || ''} onChange={v => setMatDraft(p => ({...p, formatoLargo: parseFloat(v.target.value)||undefined}))} /></div>
              <div><label className="small" style={{ display: 'block', marginBottom: 4 }}>Ancho (cm)</label><input className="input" type="number" step={0.1} value={matDraft.formatoAncho || ''} onChange={v => setMatDraft(p => ({...p, formatoAncho: parseFloat(v.target.value)||undefined}))} /></div>
              <div><label className="small" style={{ display: 'block', marginBottom: 4 }}>Grosor (mm)</label><input className="input" type="number" step={0.1} value={matDraft.formatoGrosor || ''} onChange={v => setMatDraft(p => ({...p, formatoGrosor: parseFloat(v.target.value)||undefined}))} /></div>
              <div><label className="small" style={{ display: 'block', marginBottom: 4 }}>Color</label><input className="input" value={matDraft.color || ''} onChange={v => setMatDraft(p => ({...p, color: v.target.value}))} /></div>
              <div><label className="small" style={{ display: 'block', marginBottom: 4 }}>m2 por caja</label><input className="input" type="number" step={0.01} value={matDraft.m2caja || ''} onChange={v => setMatDraft(p => ({...p, m2caja: parseFloat(v.target.value)||undefined}))} /></div>
              <div><label className="small" style={{ display: 'block', marginBottom: 4 }}>Peso caja (kg)</label><input className="input" type="number" step={0.1} value={matDraft.pesoCaja || ''} onChange={v => setMatDraft(p => ({...p, pesoCaja: parseFloat(v.target.value)||undefined}))} /></div>
              <div><label className="small" style={{ display: 'block', marginBottom: 4 }}>Umbral (cm)</label><input className="input" type="number" step={1} value={matDraft.umbralSobranteCm ?? ''} onChange={v => setMatDraft(p => ({...p, umbralSobranteCm: parseFloat(v.target.value)||undefined}))} /></div>
            </div>
            <div style={{ margin: '10px 0' }}>
              <label style={{ marginRight: 14, fontSize: 12 }}><input type="radio" name="mp" checked={matDraft.modoPrecio==='m2'} onChange={() => setMatDraft(p => ({...p, modoPrecio: 'm2'}))} /> m2</label>
              <label style={{ fontSize: 12 }}><input type="radio" name="mp" checked={matDraft.modoPrecio==='caja'} onChange={() => setMatDraft(p => ({...p, modoPrecio: 'caja'}))} /> Caja</label>
            </div>
            {matDraft.modoPrecio === 'm2' ? (
              <div><label className="small" style={{ display: 'block', marginBottom: 4 }}>Precio m2</label><input className="input" type="number" step={100} value={matDraft.precioM2 || ''} onChange={v => setMatDraft(p => ({...p, precioM2: parseFloat(v.target.value)||undefined}))} /></div>
            ) : (
              <div><label className="small" style={{ display: 'block', marginBottom: 4 }}>Precio caja</label><input className="input" type="number" step={100} value={matDraft.precioCaja || ''} onChange={v => setMatDraft(p => ({...p, precioCaja: parseFloat(v.target.value)||undefined}))} /></div>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button className="btn" onClick={handleSaveMaterial}>{editingMatId ? 'Guardar' : 'Crear'}</button>
              {editingMatId && <button className="btn btn-secondary" onClick={() => { setEditingMatId(null); setMatDraft({ nombre: '', tipoAcabado: TIPOS_ACABADO[0], categoria: 'Ambos', modoPrecio: 'm2', umbralSobranteCm: umbralPorDefecto(TIPOS_ACABADO[0]) }) }}>Cancelar</button>}
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--color-card)', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--color-line)' }}>
              <thead><tr style={{ background: '#000', color: '#fff' }}>
                <th style={{ padding: '9px 12px', fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', textAlign: 'left' }}>Nombre</th>
                <th style={{ padding: '9px 12px', fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', textAlign: 'left' }}>Tipo</th>
                <th style={{ padding: '9px 12px', fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', textAlign: 'left' }}>Formato</th>
                <th style={{ padding: '9px 12px', fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', textAlign: 'left' }}>Precio</th>
                <th style={{ padding: '9px 12px', fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', textAlign: 'left' }}></th>
              </tr></thead>
              <tbody>
                {ench.materiales.map(m => (
                  <tr key={m.id} style={{ borderTop: '1px solid var(--color-line)' }}>
                    <td style={{ padding: '9px 12px', fontSize: 13 }}>{nombreConColor(m)}</td>
                    <td style={{ padding: '9px 12px', fontSize: 13 }}>{m.tipoAcabado}</td>
                    <td style={{ padding: '9px 12px', fontSize: 13 }}>{[m.formatoLargo, m.formatoAncho].filter(Boolean).join('x')}{m.formatoLargo ? ' cm' : ''}</td>
                    <td style={{ padding: '9px 12px', fontSize: 13 }}>{m.modoPrecio === 'caja' ? '$' + (m.precioCaja || 0).toLocaleString('es-CO') + '/caja' : '$' + (m.precioM2 || 0).toLocaleString('es-CO') + '/m2'}</td>
                    <td style={{ padding: '9px 12px' }}>
                      <button className="btn btn-small btn-secondary" onClick={() => { setMatDraft(m); setEditingMatId(m.id) }}>Editar</button>
                      <button className="btn btn-small btn-danger" style={{ marginLeft: 8 }} onClick={() => { if (window.confirm('Eliminar?')) e.removeMaterial(m.id) }}>Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!ench.materiales.length && <p className="small" style={{ textAlign: 'center', padding: 24 }}>No hay materiales.</p>}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 26 }}>
            <button className="btn btn-secondary" onClick={() => ench.setVista('wizard')}>Volver</button>
          </div>
        </div>
      )}

      {ench.vista === 'visual' && (
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Visualizacion</h2>
          <p className="small" style={{ marginBottom: 18 }}>Plano SVG.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 18 }}>
            <div><label className="small" style={{ display: 'block', marginBottom: 4 }}>Nivel</label>
              <select className="select" value={ench.visNivelId || ''} onChange={v => ench.setVisNivelId(v.target.value)}>
                {ench.niveles.map(n => <option key={n.id} value={n.id}>{n.nombre}</option>)}
              </select>
            </div>
            <div><label className="small" style={{ display: 'block', marginBottom: 4 }}>Espacio</label>
              <select className="select" value={ench.visSpaceId || ''} onChange={v => ench.setVisSpaceId(v.target.value)}>
                {esv.map(s => <option key={s.id} value={s.id}>{s.nombre}{s.materialId && s.patronId ? '' : ' (sin config)'}</option>)}
              </select>
            </div>
          </div>
          {spv && mtv && spv.patronId && (
            <div className="card" style={{ marginBottom: 18, background: '#FFFEFC' }}>
              {(() => {
                const principal = spv.segmentos.reduce((max, s) => ((parseFloat(String(s.largo))||0)*(parseFloat(String(s.ancho))||0)) > ((parseFloat(String(max.largo))||0)*(parseFloat(String(max.ancho))||0)) ? s : max, spv.segmentos[0])
                const L0 = parseFloat(String(principal.largo)) || 0
                const A0 = parseFloat(String(principal.ancho)) || 0
                const pL = parseFloat(String(mtv.formatoLargo)) / 100
                const pA = parseFloat(String(mtv.formatoAncho)) / 100
                if (!pL || !pA) return <p className="small">Material sin formato.</p>
                const rA = calcularInstalacion({...spv, segmentos: [principal]}, mtv, spv.patronId, 0)
                const rB = calcularInstalacion({...spv, segmentos: [{largo: principal.ancho, ancho: principal.largo}]}, mtv, spv.patronId, 0)
                let usarA = true
                if (spv.orientacionManual === 'largo') usarA = true
                else if (spv.orientacionManual === 'ancho') usarA = false
                else usarA = (rA?.desperdicioPct || 0) <= (rB?.desperdicioPct || 0)
                const L = usarA ? L0 : A0
                const A2 = usarA ? A0 : L0
                const plano = generarPlanoSVG(L, A2, pL, pA, spv.patronId)
                return <div dangerouslySetInnerHTML={{ __html: plano.svgHtml }} />
              })()}
            </div>
          )}
          {(!spv || !mtv || !spv.patronId) && <div className="card" style={{ textAlign: 'center', padding: 40 }}><p className="small">Selecciona espacio con material y patron.</p></div>}
          <div className="card" style={{ marginTop: 18 }}>
            <h3 style={{ fontSize: 14, marginBottom: 8 }}>Banco de sobrantes</h3>
            {ench.bancoSobrantes.length ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr style={{ borderBottom: '1px solid var(--color-line)' }}>
                    <th style={{ padding: '8px 12px', fontSize: 10.5, textAlign: 'left' }}>Material</th>
                    <th style={{ padding: '8px 12px', fontSize: 10.5, textAlign: 'left' }}>Medida</th>
                    <th style={{ padding: '8px 12px', fontSize: 10.5, textAlign: 'left' }}>Cant</th>
                    <th style={{ padding: '8px 12px', fontSize: 10.5, textAlign: 'left' }}>Origen</th>
                    <th style={{ padding: '8px 12px', fontSize: 10.5, textAlign: 'left' }}></th>
                  </tr></thead>
                  <tbody>
                    {ench.bancoSobrantes.map(s => (
                      <tr key={s.id} style={{ borderTop: '1px solid var(--color-line)' }}>
                        <td style={{ padding: '8px 12px', fontSize: 12 }}>{s.materialNombre || s.materialId}</td>
                        <td style={{ padding: '8px 12px', fontSize: 12 }}>{(s.ancho*100).toFixed(0)}x{(s.alto*100).toFixed(0)}cm</td>
                        <td style={{ padding: '8px 12px', fontSize: 12 }}>{s.cantidad}</td>
                        <td style={{ padding: '8px 12px', fontSize: 12, color: '#999' }}>{s.patronNombre || s.patronId}</td>
                        <td style={{ padding: '8px 12px' }}><button className="btn btn-small btn-danger" onClick={() => ench.eliminarSobrante(s.id)}>x</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="small">Sin sobrantes.</p>}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 26 }}>
            <button className="btn btn-secondary" onClick={() => ench.setVista('wizard')}>Volver</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 40, paddingTop: 20, borderTop: '1px solid var(--color-line)' }}>
        <button className="btn btn-small btn-danger" onClick={ench.resetProject}>Reiniciar</button>
        <button className="btn btn-small btn-secondary" onClick={() => showNotification('Correcto', 'success', 'Guardado en localStorage.')}>Guardar</button>
      </div>
    </main>
  )
}
`;

fs.writeFileSync(path, content, 'utf8');
console.log('Written ' + path + ' (' + content.length + ' chars)');
