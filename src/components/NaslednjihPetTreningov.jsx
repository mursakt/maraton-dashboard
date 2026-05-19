import React from 'react'
import { PLAN_TRENINGI, TODAY_STR } from '../constants/plan'

export function NaslednjihPetTreningov() {
  const prihodnji = PLAN_TRENINGI.filter(p => p.datum > TODAY_STR).slice(0, 5)
  if (prihodnji.length === 0) return null
  return (
    <>
      <div style={{borderTop:'1px dashed #2d3748',margin:'12px 0'}}/>
      <h3 style={{fontSize:11,fontWeight:500,color:'#64748b',textTransform:'uppercase',letterSpacing:'.8px',marginBottom:10}}>Naslednjih 5 treningov</h3>
      <div className="workout-list">
        {prihodnji.map((p,i)=>(
          <div key={i} className="workout-item" style={{opacity:0.75}}>
            <span className="date" style={{color:'#475569'}}>{p.datum.slice(5)}</span>
            <span className="type" style={{color:'#64748b',fontStyle:'italic'}}>{p.naziv}</span>
            <span className="detail" style={{color:'#475569'}}>{p.opis} · {p.km} km · {p.tempo}/km</span>
            <span className="hr-badge" style={{background:'#1e243360',color:'#475569',border:'1px dashed #2d3748'}}>{p.hr}</span>
          </div>
        ))}
      </div>
    </>
  )
}
