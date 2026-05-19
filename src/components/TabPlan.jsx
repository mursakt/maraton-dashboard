import React from 'react'
import { PLAN, FAZA_COLOR, FAZA_LABEL } from '../constants/plan'

export function TabPlan({currentTeden}){
  return(
    <div className="card">
      <h3>24-tedenski program</h3>
      <div style={{maxHeight:520,overflowY:'auto',marginTop:8}}>
        {PLAN.map(p=>(<div key={p.teden} className={`plan-row ${p.teden===currentTeden?'current':''}`}>
          {p.teden===currentTeden&&<span style={{fontSize:10,color:'#3b82f6',marginRight:4}}>▶</span>}
          <span className="t-num">T{String(p.teden).padStart(2,'0')}</span>
          <span className="t-datum">{p.datum}</span>
          <span className="t-faza" style={{background:FAZA_COLOR[p.faza]+'22',color:FAZA_COLOR[p.faza]}}>{p.faza}</span>
          <span style={{fontSize:13,color:'#94a3b8',flex:1}}>{FAZA_LABEL[p.faza]}</span>
          <span className="t-km">{p.km} km</span>
          <span className="t-kg">{p.ciljnaKg} kg</span>
        </div>))}
      </div>
    </div>
  )
}
