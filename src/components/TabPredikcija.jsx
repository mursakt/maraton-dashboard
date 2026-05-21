import React from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { isTek, fmt } from '../utils/helpers'
import { secToHMS, secToTempoStr } from '../utils/tempo'

export function TabPredikcija({predikcija, workouts}){
  if(!predikcija) return <div className="empty">Ni dovolj podatkov za predikcijo</div>
  const {casFinal,casVo2,casHR,zanesljivost,zanesljivostRazlogi,tezaKorekcija,kmKorekcija,prvicKorekcija,trend,tempoNa155,vo2Uporabljen,maxKm,steviloTekov,zadnjaTeza} = predikcija
  const ciljSec = 3*3600+45*60
  const diffSec = casFinal - ciljSec
  const diffMin = Math.round(diffSec/60)
  const vo2PoTreningih = workouts.filter(w=>isTek(w)&&w.vo2max>0).slice(0,20).reverse()
  const predTrend = vo2PoTreningih.map(w=>{
    if(!w.vo2max) return null
    const vVO2max = 29.54 + 5.000663*w.vo2max - 0.007546*w.vo2max*w.vo2max
    const sec = (1000/(vVO2max*0.77)/60)*42.195*60
    return {datum:w.datum?.slice(5), cas:Math.round(sec/60)}
  }).filter(Boolean)
  return (<>
    <div className="card" style={{marginBottom:16,textAlign:'center',padding:'32px 24px'}}>
      <h3 style={{textAlign:'center',marginBottom:24}}>Predviden čas na maratonu — Ljubljana 17.10.2026</h3>
      <div className="pred-main" style={{color: diffSec<=0?'#22c55e':Math.abs(diffMin)<=10?'#eab308':'#f97316', textAlign:'center'}}>{secToHMS(casFinal)}</div>
      <div style={{marginTop:12,fontSize:15,textAlign:'center'}}>
        {diffSec<=0?<span className="pred-diff-pos">🎯 {secToHMS(Math.abs(diffSec)).slice(1)} pod ciljnim časom 3:45:00</span>:<span className="pred-diff-neg">⚠️ {Math.floor(Math.abs(diffSec)/60)}min {Math.round(Math.abs(diffSec)%60)}s nad ciljnim časom 3:45:00</span>}
      </div>
      <div style={{marginTop:8,fontSize:13,color:'#475569',fontFamily:'DM Mono'}}>Maratonski tempo: {secToTempoStr(casFinal/42.195)}/km</div>
    </div>
    <div className="card" style={{marginBottom:16}}>
      <h3>Zanesljivost predikcije</h3>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:8}}>
        <div className="zanesljivost-bar" style={{flex:1}}><div className="zanesljivost-fill" style={{width:`${zanesljivost}%`}}/></div>
        <span style={{fontFamily:'DM Mono',fontSize:18,fontWeight:300,color:zanesljivost>=70?'#22c55e':zanesljivost>=40?'#eab308':'#f97316'}}>{zanesljivost}%</span>
      </div>
      <div style={{marginTop:8}}>{zanesljivostRazlogi.map((r,i)=><div key={i} className="razlog-item">· {r}</div>)}</div>
      <div style={{marginTop:12,fontSize:12,color:'#475569'}}>Zanesljivost bo rasla z več treningi, VO2max meritvami in napredkom v programu.</div>
    </div>
    <div className="grid2">
      <div className="card">
        <h3>Kako smo prišli do tega časa</h3>
        {[['Baza (VO2max metoda)', casVo2?secToHMS(casVo2):'—', 0],['Baza (HR-tempo metoda)', casHR?secToHMS(casHR):'—', 0],['Korekcija teža', tezaKorekcija===0?'0':tezaKorekcija<0?`-${secToHMS(Math.abs(tezaKorekcija)).slice(1)}`:`+${secToHMS(Math.abs(tezaKorekcija)).slice(1)}`, tezaKorekcija],['Korekcija kilometrina', kmKorekcija===0?'0':kmKorekcija<0?`-${secToHMS(Math.abs(kmKorekcija)).slice(1)}`:`+${secToHMS(Math.abs(kmKorekcija)).slice(1)}`, kmKorekcija],['Buffer (prvi maraton)', `+${secToHMS(prvicKorekcija).slice(1)}`, prvicKorekcija]].map(([l,v,k],i)=>(
          <div key={i} className="faktor-row"><span className="faktor-label">{l}</span><span className="faktor-val" style={{color:k<0?'#22c55e':k>0?'#f97316':'#94a3b8'}}>{v}</span></div>
        ))}
        <div className="faktor-row" style={{borderTop:'1px solid #2d3748',marginTop:8,paddingTop:8,fontWeight:500}}>
          <span className="faktor-label" style={{color:'#e2e8f0'}}>Skupaj</span>
          <span className="faktor-val" style={{color:'#e2e8f0',fontSize:16}}>{secToHMS(casFinal)}</span>
        </div>
      </div>
      <div className="card">
        <h3>Podatki ki vplivajo na predikcijo</h3>
        {[['Število tekov v bazi',steviloTekov],['Povp. VO2max',vo2Uporabljen?fmt(vo2Uporabljen,1):'—'],['Tempo pri HR 155',tempoNa155?secToTempoStr(tempoNa155)+'/km':'—'],['Max km/teden',fmt(maxKm,0)+' km'],['Zadnja teža',zadnjaTeza?fmt(zadnjaTeza)+' kg':'—']].map(([l,v],i)=>(
          <div key={i} className="faktor-row"><span className="faktor-label">{l}</span><span className="faktor-val">{v}</span></div>
        ))}
        <div className="faktor-row">
          <span className="faktor-label">Trend napredka</span>
          <span className="faktor-val" style={{color: trend===null||trend===0?'#94a3b8':trend>0?'#22c55e':'#f97316'}}>
            {trend===null?'—':trend===0?'0':trend>0?`−${secToHMS(trend).slice(1)} ↑`:`+${secToHMS(Math.abs(trend)).slice(1)} ↓`}
          </span>
        </div>
      </div>
    </div>
    {predTrend.length > 1 && (
      <div className="card">
        <h3>Predikcija skozi čas — na podlagi VO2max (min)</h3>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={predTrend} margin={{top:4,right:4,left:-10,bottom:0}}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2433"/>
            <XAxis dataKey="datum" tick={{fontSize:10,fill:'#475569',fontFamily:'DM Mono'}} interval="preserveStartEnd"/>
            <YAxis domain={['auto','auto']} tick={{fontSize:10,fill:'#475569',fontFamily:'DM Mono'}} tickFormatter={v=>`${Math.floor(v/60)}:${String(v%60).padStart(2,'0')}`}/>
            <Tooltip contentStyle={{background:'#111827',border:'1px solid #1e2433',borderRadius:8,fontSize:12}} formatter={v=>[`${Math.floor(v/60)}:${String(Math.round(v%60)).padStart(2,'0')}`, 'Predikcija']}/>
            <ReferenceLine y={225} stroke="#22c55e" strokeDasharray="4 4" label={{value:'3:45',fill:'#22c55e',fontSize:10}}/>
            <Line type="monotone" dataKey="cas" stroke="#a78bfa" strokeWidth={2} dot={{r:4,fill:'#a78bfa'}}/>
          </LineChart>
        </ResponsiveContainer>
        <div style={{fontSize:11,color:'#475569',marginTop:8,fontFamily:'DM Mono'}}>* Graf kaže trend predikcije na podlagi VO2max — zelena črta = cilj 3:45</div>
      </div>
    )}
    <div className="alert info" style={{marginTop:16}}>ℹ️ Predikcija temelji na {steviloTekov} treningih in se bo izboljševala z vsakim novim tekom. Zanesljivost bo visoka (&gt;70%) od T10 naprej.</div>

    {(() => {
      // Potrebni VO2max za 3:45 (obratna formula)
      const ciljMin = 225
      const potrebniVVO2max = 42195 / (ciljMin * 0.77)
      const a = 0.007546, b = -5.000663, c = potrebniVVO2max - 29.54
      const disc = b*b - 4*a*c
      const potrebniVO2 = disc >= 0 ? Math.round((-b - Math.sqrt(disc)) / (2*a) * 10) / 10 : 46
      const vo2Gap = vo2Uporabljen ? Math.round((potrebniVO2 - vo2Uporabljen) * 10) / 10 : null
      const potrebniTempo = 320 // 5:20/km pri HR 155 za 3:45
      const tempoGapSec = tempoNa155 ? tempoNa155 - potrebniTempo : null
      const potrebniKm = 60
      const kmGap = maxKm ? Math.round(potrebniKm - maxKm) : null

      const rows = [
        {
          label: 'VO2max',
          cilj: `≥ ${potrebniVO2} ml/kg/min`,
          trenutno: vo2Uporabljen ? `${fmt(vo2Uporabljen,1)} ml/kg/min` : '—',
          ok: vo2Gap !== null && vo2Gap <= 0,
          gap: vo2Gap !== null && vo2Gap > 0 ? `+${fmt(vo2Gap,1)} ml/kg/min za doseči` : null,
        },
        {
          label: 'Tempo pri HR 155',
          cilj: '≤ 5:20/km',
          trenutno: tempoNa155 ? `${secToTempoStr(tempoNa155)}/km` : '—',
          ok: tempoGapSec !== null && tempoGapSec <= 0,
          gap: tempoGapSec !== null && tempoGapSec > 0 ? `${Math.round(tempoGapSec)}s/km prepočasen` : null,
        },
        {
          label: 'Max teden',
          cilj: '≥ 60 km',
          trenutno: `${fmt(maxKm,0)} km`,
          ok: kmGap !== null && kmGap <= 0,
          gap: kmGap !== null && kmGap > 0 ? `+${kmGap} km/teden manjka` : null,
        },
      ]

      return (
        <div className="card" style={{marginTop:16}}>
          <h3>Kaj potrebujem za 3:45:00</h3>
          <div style={{fontSize:11,color:'#475569',marginBottom:12,fontFamily:'DM Mono'}}>
            {diffSec > 0
              ? `Trenutno ${Math.floor(diffSec/60)}min ${Math.round(diffSec%60)}s nad ciljnim časom — fokus na:`
              : '✓ Cilj je že dosegljiv — ohranjaj formo.'}
          </div>
          {rows.map(({label,cilj,trenutno,ok,gap},i) => (
            <div key={i} style={{display:'flex',alignItems:'baseline',gap:10,marginBottom:10,flexWrap:'wrap',paddingBottom:10,borderBottom:i<rows.length-1?'1px solid #0a0f1a':'none'}}>
              <span style={{fontSize:11,fontFamily:'DM Mono',color:'#475569',minWidth:140}}>{label}</span>
              <span style={{fontSize:13,fontFamily:'DM Mono',color:ok?'#22c55e':'#94a3b8'}}>{trenutno}</span>
              {ok
                ? <span style={{fontSize:11,color:'#22c55e',fontFamily:'DM Mono'}}>✓ cilj dosežen ({cilj})</span>
                : gap
                  ? <span style={{fontSize:11,color:'#f97316',fontFamily:'DM Mono'}}>⚠ {gap} · cilj: {cilj}</span>
                  : <span style={{fontSize:11,color:'#475569',fontFamily:'DM Mono'}}>cilj: {cilj}</span>
              }
            </div>
          ))}
        </div>
      )
    })()}
  </>)
}
