import React from 'react'
import { PLAN, PLAN_TRENINGI, FAZA_COLOR, FAZA_LABEL } from '../constants/plan'

const TIP_ICON = { A: '⚡', B: '🏃', C: '📏' }
const TIP_COLOR = { A: '#f97316', B: '#3b82f6', C: '#a78bfa' }

function tipIzOpis(opis = '') {
  const o = opis.toLowerCase()
  if (o.includes('maraton')) return 'race'
  if (o.includes('polmaraton')) return 'race'
  if (o.includes('race pace')) return 'racepace'
  if (o.includes('interval')) return 'intervals'
  if (o.includes('hribč')) return 'hills'
  if (o.includes('strides') || o.includes('razponi')) return 'strides'
  if (o.includes('dolgi tek')) return 'long'
  return 'easy'
}

const TIP_BADGE = {
  easy:      { label: 'Lahkotno',   color: '#3b82f6' },
  long:      { label: 'Dolgi tek',  color: '#a78bfa' },
  intervals: { label: 'Intervali',  color: '#f97316' },
  hills:     { label: 'Hribčki',    color: '#eab308' },
  racepace:  { label: 'Race Pace',  color: '#ef4444' },
  race:      { label: 'Tekma',      color: '#22c55e' },
  strides:   { label: 'Strides',    color: '#06b6d4' },
}

export function TabPlan({currentTeden, workouts=[]}) {
  const [expanded, setExpanded] = React.useState(currentTeden)

  const actKmByWeek = {}
  const actByDate = {}
  workouts.filter(w => w.razdalja_km > 0).forEach(w => {
    if (!w.datum) return
    const d = new Date(w.datum)
    const mon = new Date(d); mon.setDate(d.getDate() - ((d.getDay()+6)%7))
    actKmByWeek[mon.toISOString().slice(0,10)] = (actKmByWeek[mon.toISOString().slice(0,10)] || 0) + (w.razdalja_km || 0)
    if (!actByDate[w.datum]) actByDate[w.datum] = []
    actByDate[w.datum].push(w)
  })

  const treningiByTeden = {}
  PLAN_TRENINGI.forEach(t => {
    if (!treningiByTeden[t.teden]) treningiByTeden[t.teden] = []
    treningiByTeden[t.teden].push(t)
  })

  return(
    <div className="card">
      <h3>26-tedenski program</h3>
      <div style={{maxHeight:720,overflowY:'auto',marginTop:8}}>
        {PLAN.map(p => {
          const actKm = Math.round((actKmByWeek[p.datum] || 0) * 10) / 10
          const done = actKm > 0
          const pct = p.km > 0 && done ? Math.round(actKm / p.km * 100) : null
          const pctColor = pct === null ? null : pct >= 90 ? '#22c55e' : pct >= 60 ? '#eab308' : '#ef4444'
          const isOpen = expanded === p.teden
          const tedenskiTreningi = treningiByTeden[p.teden] || []

          return (
            <React.Fragment key={p.teden}>
              <div
                className={`plan-row ${p.teden===currentTeden?'current':''}`}
                onClick={() => setExpanded(isOpen ? null : p.teden)}
                style={{cursor:'pointer',userSelect:'none'}}
              >
                <span style={{fontSize:10,color:isOpen?'#94a3b8':'#1e2433',marginRight:4,transition:'transform 0.15s',display:'inline-block',transform:isOpen?'rotate(90deg)':'rotate(0deg)'}}>▶</span>
                <span className="t-num">T{String(p.teden).padStart(2,'0')}</span>
                <span className="t-datum">{p.datum}</span>
                <span className="t-faza" style={{background:FAZA_COLOR[p.faza]+'22',color:FAZA_COLOR[p.faza]}}>{p.faza}</span>
                <span style={{fontSize:13,color:'#94a3b8',flex:1}}>{FAZA_LABEL[p.faza]}</span>
                <span className="t-km">{p.km} km</span>
                {done
                  ? <span style={{fontSize:11,fontFamily:'DM Mono',color:pctColor,minWidth:80,textAlign:'right'}}>{actKm} km · {pct}%</span>
                  : <span style={{fontSize:11,color:'#1e2433',minWidth:80}}/>
                }
                <span className="t-kg">{p.ciljnaKg} kg</span>
              </div>

              {isOpen && (
                <div style={{background:'#080f1e',borderBottom:'1px solid #1e2433',padding:'10px 12px 14px 28px'}}>
                  {tedenskiTreningi.length === 0 ? (
                    <div style={{fontSize:12,color:'#475569',fontFamily:'DM Mono'}}>Ni planiranih treningov za ta teden.</div>
                  ) : (
                    <div style={{display:'flex',flexDirection:'column',gap:8}}>
                      {tedenskiTreningi.map(t => {
                        const suffix = t.naziv.slice(-1)
                        const tip = tipIzOpis(t.opis)
                        const badge = TIP_BADGE[tip] || TIP_BADGE.easy
                        const actWo = actByDate[t.datum] || []
                        const actWoKm = actWo.reduce((s,w) => s+(w.razdalja_km||0), 0)
                        const actWoHR = actWo.find(w => w.povprecni_hr)?.povprecni_hr
                        const actWoTempo = actWo.find(w => w.povprecni_tempo)?.povprecni_tempo
                        const completed = actWoKm > 0

                        return (
                          <div key={t.naziv} style={{display:'flex',gap:10,alignItems:'flex-start',padding:'9px 12px',borderRadius:6,background: completed ? '#0d1f12' : '#0a1628',border:`1px solid ${completed ? '#16532422' : '#1e243344'}`}}>
                            {/* Naziv badge */}
                            <div style={{minWidth:44,fontFamily:'DM Mono',fontSize:11,fontWeight:700,color:TIP_COLOR[suffix]||'#94a3b8',paddingTop:1}}>
                              {t.naziv}
                            </div>
                            {/* Plan details */}
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{display:'flex',gap:6,alignItems:'center',marginBottom:4,flexWrap:'wrap'}}>
                                <span style={{fontSize:10,fontFamily:'DM Mono',color:badge.color,background:badge.color+'22',padding:'1px 7px',borderRadius:3}}>
                                  {badge.label}
                                </span>
                                <span style={{fontSize:12,color:'#e2e8f0',fontWeight:500}}>{t.opis}</span>
                              </div>
                              {t.razlaga && (
                                <div style={{fontSize:11,color:'#64748b',marginTop:2,marginBottom:4,lineHeight:1.5,fontStyle:'italic'}}>
                                  {t.razlaga}
                                </div>
                              )}
                              <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
                                <span style={{fontSize:11,fontFamily:'DM Mono',color:'#475569'}}>{t.datum.slice(5)}</span>
                                <span style={{fontSize:11,fontFamily:'DM Mono',color:'#64748b'}}>{t.km} km</span>
                                <span style={{fontSize:11,fontFamily:'DM Mono',color:'#64748b'}}>{t.tempo}/km</span>
                                <span style={{fontSize:11,fontFamily:'DM Mono',color:'#64748b'}}>🫀 {t.hr} bpm</span>
                              </div>
                            </div>
                            {/* Actual */}
                            <div style={{minWidth:90,textAlign:'right'}}>
                              {completed ? (
                                <div style={{display:'flex',flexDirection:'column',gap:2,alignItems:'flex-end'}}>
                                  <span style={{fontSize:11,fontFamily:'DM Mono',color:'#22c55e',fontWeight:600}}>✓ {Math.round(actWoKm*10)/10} km</span>
                                  {actWoHR && <span style={{fontSize:10,fontFamily:'DM Mono',color:'#475569'}}>{actWoHR} bpm</span>}
                                  {actWoTempo && <span style={{fontSize:10,fontFamily:'DM Mono',color:'#475569'}}>{actWoTempo}/km</span>}
                                </div>
                              ) : (
                                <span style={{fontSize:10,color:'#1e3a5f',fontFamily:'DM Mono'}}>—</span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  <div style={{marginTop:10,display:'flex',gap:16,flexWrap:'wrap'}}>
                    <span style={{fontSize:11,color:'#334155',fontFamily:'DM Mono'}}>Ciljna teža: <span style={{color:'#94a3b8'}}>{p.ciljnaKg} kg</span></span>
                    <span style={{fontSize:11,color:'#334155',fontFamily:'DM Mono'}}>Plan km: <span style={{color:'#94a3b8'}}>{p.km} km</span></span>
                    {done && <span style={{fontSize:11,fontFamily:'DM Mono',color:pctColor}}>Opravljeno: {actKm} km ({pct}%)</span>}
                  </div>
                </div>
              )}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}
