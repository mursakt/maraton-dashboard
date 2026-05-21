import React from 'react'
import { PLAN, FAZA_COLOR, FAZA_LABEL } from '../constants/plan'

export function TabPlan({currentTeden, workouts=[]}) {
  const actKmByWeek = {}
  workouts.filter(w => w.razdalja_km > 0).forEach(w => {
    if (!w.datum) return
    const d = new Date(w.datum)
    const mon = new Date(d); mon.setDate(d.getDate() - ((d.getDay()+6)%7))
    const key = mon.toISOString().slice(0, 10)
    actKmByWeek[key] = (actKmByWeek[key] || 0) + (w.razdalja_km || 0)
  })

  return(
    <div className="card">
      <h3>24-tedenski program</h3>
      <div style={{maxHeight:520,overflowY:'auto',marginTop:8}}>
        {PLAN.map(p => {
          const actKm = Math.round((actKmByWeek[p.datum] || 0) * 10) / 10
          const done = actKm > 0
          const pct = p.km > 0 && done ? Math.round(actKm / p.km * 100) : null
          const pctColor = pct === null ? null : pct >= 90 ? '#22c55e' : pct >= 60 ? '#eab308' : '#ef4444'
          return (
            <div key={p.teden} className={`plan-row ${p.teden===currentTeden?'current':''}`}>
              {p.teden===currentTeden&&<span style={{fontSize:10,color:'#3b82f6',marginRight:4}}>▶</span>}
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
          )
        })}
      </div>
    </div>
  )
}
