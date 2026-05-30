import React from 'react'
import { SleepConsistency } from './SleepConsistency'
import { LineChart, Line, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend, ComposedChart } from 'recharts'
import { PLAN } from '../constants/plan'
import { izracunajFormo } from '../utils/calculations'
import { fmt, formaColor, formaLabel } from '../utils/helpers'
import { StatCard } from './StatCard'

const CHART_HEIGHT = 200

export function TabTelo({metrike, workouts=[]}){
  const tezaDejansko=metrike.filter(m=>m.teza_kg).slice(0,60).reverse()
  const tezaGraf=tezaDejansko.map(m=>{
    const p=PLAN.slice().reverse().find(pl=>pl.datum<=m.datum)
    return{datum:m.datum?.slice(5),dejanska:m.teza_kg,plan:p?.ciljnaKg||null}
  })
  const hrvData=metrike.filter(m=>m.hrv).slice(0,28).reverse().map(m=>({datum:m.datum?.slice(5),hrv:m.hrv}))
  const hrvMax = hrvData.length > 0 ? Math.max(...hrvData.map(d => d.hrv)) + 5 : 100
  const spanjeData=metrike.filter(m=>m.spanje_h).slice(0,14).reverse().map(m=>({datum:m.datum?.slice(5),ure:m.spanje_h}))
  const restingHrData=metrike.filter(m=>m.resting_hr).slice(0,20).reverse().map(m=>({datum:m.datum?.slice(5),hr:m.resting_hr}))
  const korakiData=metrike.filter(m=>m.koraki!=null).slice(0,14).reverse().map(m=>({datum:m.datum?.slice(5),koraki:m.koraki}))
  const z=metrike[0]||{}
  const avgSpanje=metrike.filter(m=>m.spanje_h).slice(0,7).reduce((s,m,_,a)=>s+m.spanje_h/a.length,0)
  const avgHRV=metrike.filter(m=>m.hrv).slice(0,7).reduce((s,m,_,a)=>s+m.hrv/a.length,0)
  const zadnjaTeza=metrike.find(m=>m.teza_kg)?.teza_kg
  const formaScore=izracunajFormo(z.hrv,z.spanje_h,z.stres_povprecje,workouts)

  const zadnjiBB = metrike.find(m=>m.body_battery_charged||m.body_battery_drained)||{}
  const zadnjiRestHR = metrike.find(m=>m.resting_hr)||{}
  const zadnjiKoraki = metrike.find(m=>m.koraki!=null)||{}
  const avgKoraki7 = Math.round(metrike.filter(m=>m.koraki!=null).slice(0,7).reduce((s,m,_,a)=>s+m.koraki/a.length,0))
  const bbNet = (zadnjiBB.body_battery_charged||0) - (zadnjiBB.body_battery_drained||0)

  const xInterval = (len) => Math.max(0, Math.floor(len / 5) - 1)

  return(<>
    {/* Stat kartice */}
    <div className="grid5">
      <div className="card">
        <h3>Teža <span style={{fontSize:11,color:'#475569',fontFamily:'DM Mono',fontWeight:400}}>({metrike.find(m=>m.teza_kg)?.datum||'—'})</span></h3>
        <div><span className="stat-val">{zadnjaTeza?fmt(zadnjaTeza):'—'}</span><span className="stat-unit">kg</span></div>
      </div>
      <div className="card">
        <h3>HRV <span style={{fontSize:11,color:'#475569',fontFamily:'DM Mono',fontWeight:400}}>({metrike.find(m=>m.hrv)?.datum||'—'})</span></h3>
        <div><span className="stat-val" style={{color:z.hrv>50?'#22c55e':z.hrv>35?'#eab308':'#ef4444'}}>{z.hrv?fmt(z.hrv,0):'—'}</span><span className="stat-unit">ms</span></div>
      </div>
      <StatCard title="Spanje povp. 7d" value={avgSpanje?fmt(avgSpanje):'—'} unit="h" color={avgSpanje>=7.5?'#22c55e':avgSpanje>=6.5?'#eab308':'#ef4444'}/>
      <StatCard title="HRV povp. 7d" value={avgHRV?fmt(avgHRV,0):'—'} unit="ms" color={avgHRV>50?'#22c55e':avgHRV>35?'#eab308':'#ef4444'}/>
      <div className="card"><h3>Forma danes</h3><div><span className="stat-val" style={{color:formaColor(formaScore)}}>{formaScore?fmt(formaScore):'—'}</span></div><div className="stat-sub" style={{color:formaColor(formaScore)}}>{formaLabel(formaScore)}</div></div>
    </div>

    {/* Stat kartice — Body Battery, Mirovni HR, Koraki */}
    <div className="grid3">
      <div className="card">
        <h3>Body Battery <span style={{fontSize:11,color:'#475569',fontFamily:'DM Mono',fontWeight:400}}>({metrike.find(m=>m.body_battery_charged||m.body_battery_drained)?.datum||'—'})</span></h3>
        <div style={{display:'flex',gap:12,alignItems:'flex-end',marginBottom:4}}>
          <div style={{textAlign:'center'}}>
            <div style={{fontSize:20,fontFamily:'DM Mono',color:'#22c55e',fontWeight:300}}>+{zadnjiBB.body_battery_charged||'—'}</div>
            <div style={{fontSize:10,color:'#475569'}}>polnjenje</div>
          </div>
          <div style={{textAlign:'center'}}>
            <div style={{fontSize:20,fontFamily:'DM Mono',color:'#ef4444',fontWeight:300}}>-{zadnjiBB.body_battery_drained||'—'}</div>
            <div style={{fontSize:10,color:'#475569'}}>praznjenje</div>
          </div>
        </div>
        {zadnjiBB.body_battery_charged && <div className="stat-sub" style={{color:bbNet>=0?'#22c55e':'#ef4444'}}>Neto: {bbNet>=0?'+':''}{bbNet}</div>}
      </div>
      <div className="card">
        <h3>Mirovni HR <span style={{fontSize:11,color:'#475569',fontFamily:'DM Mono',fontWeight:400}}>({metrike.find(m=>m.resting_hr)?.datum||'—'})</span></h3>
        <div><span className="stat-val" style={{color:zadnjiRestHR.resting_hr?(zadnjiRestHR.resting_hr<45?'#22c55e':zadnjiRestHR.resting_hr<50?'#eab308':'#f97316'):'#6b7280'}}>{zadnjiRestHR.resting_hr||'—'}</span><span className="stat-unit">bpm</span></div>
        {(() => {
          const avgRHR7 = Math.round(metrike.filter(m=>m.resting_hr).slice(0,7).reduce((s,m,_,a)=>s+m.resting_hr/a.length,0))
          return <div className="stat-sub">povp. 7 dni: {avgRHR7||'—'} bpm · trend navzdol = dobro</div>
        })()}
      </div>
      <div className="card">
        <h3>Koraki <span style={{fontSize:11,color:'#475569',fontFamily:'DM Mono',fontWeight:400}}>({metrike.find(m=>m.koraki!=null)?.datum||'—'})</span></h3>
        <div><span className="stat-val" style={{color:zadnjiKoraki.koraki?(zadnjiKoraki.koraki>=10000?'#22c55e':zadnjiKoraki.koraki>=7000?'#eab308':'#f97316'):'#6b7280'}}>{zadnjiKoraki.koraki?(zadnjiKoraki.koraki/1000).toFixed(1)+'k':'—'}</span></div>
        <div className="stat-sub">povp. 7 dni: {avgKoraki7?(avgKoraki7/1000).toFixed(1)+'k':'—'} · cilj: 10k</div>
      </div>
    </div>

    {/* Teža graf */}
    <div className="card" style={{marginBottom:16}}>
      <h3>Teža — dejanska vs plan (kg)</h3>
      {tezaGraf.length>1?(
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <LineChart data={tezaGraf} margin={{top:4,right:4,left:-20,bottom:0}}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2433"/>
            <XAxis dataKey="datum" tick={{fontSize:10,fill:'#475569',fontFamily:'DM Mono'}} interval={xInterval(tezaGraf.length)}/>
            <YAxis domain={['auto','auto']} tick={{fontSize:10,fill:'#475569',fontFamily:'DM Mono'}}/>
            <Tooltip contentStyle={{background:'#111827',border:'1px solid #1e2433',borderRadius:8,fontSize:12}}/>
            <Legend wrapperStyle={{fontSize:11,color:'#94a3b8'}}/>
            <Line type="monotone" dataKey="dejanska" stroke="#3b82f6" strokeWidth={2} dot={false} name="Dejanska"/>
            <Line type="monotone" dataKey="plan" stroke="#475569" strokeWidth={1} strokeDasharray="4 4" dot={false} name="Plan"/>
          </LineChart>
        </ResponsiveContainer>
      ):<div className="empty">Ni dovolj podatkov</div>}
    </div>

    {/* HRV + Mirovni HR — skupen graf */}
    {(() => {
      const map = {}
      hrvData.forEach(d => { map[d.datum] = { ...(map[d.datum]||{}), hrv: d.hrv } })
      restingHrData.forEach(d => { map[d.datum] = { ...(map[d.datum]||{}), hr: d.hr } })
      const merged = Object.entries(map).sort().slice(-20).map(([datum, v]) => ({ datum, ...v }))
      const hrMin = restingHrData.length ? Math.min(...restingHrData.map(d=>d.hr)) - 3 : 40
      const hrMax = restingHrData.length ? Math.max(...restingHrData.map(d=>d.hr)) + 3 : 70
      return merged.length > 1 ? (
        <div className="card" style={{marginBottom:16}}>
          <h3>HRV &amp; Mirovni HR</h3>
          <div style={{fontSize:11,color:'#475569',marginBottom:8,fontFamily:'DM Mono'}}>
            <span style={{color:'#22c55e'}}>— HRV</span> (levo, ms) &nbsp;·&nbsp;
            <span style={{color:'#3b82f6'}}>— Mirovni HR</span> (desno, bpm)
          </div>
          <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
            <ComposedChart data={merged} margin={{top:4,right:8,left:4,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2433"/>
              <XAxis dataKey="datum" tick={{fontSize:10,fill:'#475569',fontFamily:'DM Mono'}} interval={xInterval(merged.length)}/>
              <YAxis yAxisId="hrv" domain={[30, hrvMax]} tick={{fontSize:10,fill:'#22c55e',fontFamily:'DM Mono'}} width={28}/>
              <YAxis yAxisId="hr" orientation="right" domain={[hrMin, hrMax]} tick={{fontSize:10,fill:'#3b82f6',fontFamily:'DM Mono'}} width={30}/>
              <ReferenceLine yAxisId="hrv" y={50} stroke="#22c55e" strokeDasharray="4 4" opacity={0.5}/>
              <Tooltip
                content={({active,payload,label}) => {
                  if (!active || !payload?.length) return null
                  const d = payload[0]?.payload
                  return (
                    <div style={{background:'#111827',border:'1px solid #1e2433',borderRadius:8,padding:'8px 12px',fontSize:11,fontFamily:'DM Mono'}}>
                      <div style={{color:'#64748b',marginBottom:4}}>{label}</div>
                      {d.hrv && <div style={{color:'#22c55e'}}>HRV: {d.hrv} ms</div>}
                      {d.hr  && <div style={{color:'#3b82f6'}}>Mirovni HR: {d.hr} bpm</div>}
                    </div>
                  )
                }}
              />
              <Line yAxisId="hrv" type="monotone" dataKey="hrv" stroke="#22c55e" strokeWidth={2} dot={false} connectNulls={false}/>
              <Line yAxisId="hr"  type="monotone" dataKey="hr"  stroke="#3b82f6" strokeWidth={2} dot={false} connectNulls={false}/>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ) : <div className="empty">Ni dovolj podatkov</div>
    })()}

    {/* Spanje + Koraki */}
    <div className="grid2">
      <div className="card">
        <h3>Spanje (ure) — zadnjih 14 dni</h3>
        {spanjeData.length>1?(
          <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
            <BarChart data={spanjeData} margin={{top:4,right:0,left:-20,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2433"/>
              <XAxis dataKey="datum" tick={{fontSize:10,fill:'#475569',fontFamily:'DM Mono'}} interval={xInterval(spanjeData.length)}/>
              <YAxis domain={[4,10]} tick={{fontSize:10,fill:'#475569',fontFamily:'DM Mono'}}/>
              <Tooltip contentStyle={{background:'#111827',border:'1px solid #1e2433',borderRadius:8,fontSize:12}}/>
              <ReferenceLine y={7.5} stroke="#475569" strokeDasharray="5 3" strokeWidth={1.5} strokeOpacity={0.7}/>
              <Bar dataKey="ure" radius={[3,3,0,0]} fill="#22c55e">
                {spanjeData.map((d,i)=>(
                  <Cell key={i} fill={d.ure>=7.5?'#22c55e':'#ef4444'}/>
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ):<div className="empty">Ni dovolj podatkov</div>}
      </div>
      <div className="card">
        <h3>Koraki — zadnjih 14 dni</h3>
        {korakiData.length>1?(
          <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
            <BarChart data={korakiData} margin={{top:4,right:8,left:-10,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2433"/>
              <XAxis dataKey="datum" tick={{fontSize:10,fill:'#475569',fontFamily:'DM Mono'}} interval={xInterval(korakiData.length)}/>
              <YAxis tick={{fontSize:10,fill:'#475569',fontFamily:'DM Mono'}} tickFormatter={v=>v>=1000?`${(v/1000).toFixed(1)}k`:v}/>
              <Tooltip contentStyle={{background:'#111827',border:'1px solid #1e2433',borderRadius:8,fontSize:12}} formatter={v=>[`${v.toLocaleString()} korakov`,'']}/>
              <ReferenceLine y={10000} stroke="#475569" strokeDasharray="5 3" strokeWidth={1.5} strokeOpacity={0.7}/>
              <Bar dataKey="koraki" radius={[3,3,0,0]} fill="#22c55e">
                {korakiData.map((d,i)=>(
                  <Cell key={i} fill={d.koraki>=10000?'#22c55e':'#ef4444'}/>
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ):<div className="empty">Ni dovolj podatkov</div>}
      </div>
    </div>

    <SleepConsistency metrike={metrike} />

  </>)
}
