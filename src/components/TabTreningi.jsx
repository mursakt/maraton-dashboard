import React from 'react'
import { Bar, Line, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts'
import { TODAY } from '../constants/plan'
import { izracunajLoad, analizirajTek } from '../utils/calculations'
import { isTek, fmt, hrZona, hrZonaColor } from '../utils/helpers'
import { StatCard } from './StatCard'
import { NaslednjihPetTreningov } from './NaslednjihPetTreningov'
import { AnalizaTeka } from './AnalizaTeka'
import { supabase } from '../supabase'

const OCENE = [
  { key: 'lahko',          label: 'Lahko',          color: '#22c55e' },
  { key: 'nevtralno',      label: 'Nevtralno',      color: '#3b82f6' },
  { key: 'zmerno_tezko',   label: 'Zmerno težko',   color: '#eab308' },
  { key: 'katastrofalno',  label: 'Katastrofalno',  color: '#ef4444' },
]

export function TabTreningi({workouts, metrike=[], prehrana=[], laps=[], onRefresh}){
  const teki=workouts.filter(w=>isTek(w)&&w.razdalja_km>0)
  const tedniMap={}
  workouts.filter(w=>isTek(w)&&w.razdalja_km>0).forEach(w=>{
    if(!w.datum)return;const d=new Date(w.datum);const mon=new Date(d);mon.setDate(d.getDate()-((d.getDay()+6)%7));const key=mon.toISOString().slice(0,10)
    tedniMap[key]=(tedniMap[key]||0)+(w.razdalja_km||0)
  })
  const kmPoTednih=Object.entries(tedniMap).sort().slice(-12).map(([k,v])=>({teden:k.slice(5),km:Math.round(v*10)/10}))
  const totalKm=teki.reduce((s,w)=>s+(w.razdalja_km||0),0)
  const avgHR=teki.filter(w=>w.povprecni_hr).reduce((s,w,_,a)=>s+w.povprecni_hr/a.length,0)
  const vo2Data=workouts.filter(w=>w.vo2max&&w.vo2max>0).slice(0,20).reverse().map(w=>({datum:w.datum?.slice(5),vo2:w.vo2max}))

  // HR efikasnost po tednih
  const efikByWeek = {}
  teki.filter(w => w.povprecni_hr >= 138 && w.povprecni_hr <= 169 && w.povprecni_tempo).forEach(w => {
    if (!w.datum) return
    const d = new Date(w.datum)
    const mon = new Date(d); mon.setDate(d.getDate() - ((d.getDay()+6)%7))
    const key = mon.toISOString().slice(5, 10)
    const parts = (w.povprecni_tempo||'').split(':')
    const tempoSec = parts.length === 2 ? parseInt(parts[0])*60 + parseInt(parts[1]) : null
    const norm = tempoSec ? Math.round(tempoSec + (w.povprecni_hr - 155) * 3) : null
    if (norm) { if (!efikByWeek[key]) efikByWeek[key] = []; efikByWeek[key].push(norm) }
  })
  const kombiniranGraf = kmPoTednih.map(({ teden, km }) => ({
    teden, km,
    efik: efikByWeek[teden] ? Math.round(efikByWeek[teden].reduce((a,b)=>a+b,0)/efikByWeek[teden].length) : null
  }))

  // VO2max izracun
  const vo2Sorted = workouts.filter(w=>w.vo2max&&w.vo2max>0).sort((a,b)=>b.datum.localeCompare(a.datum))
  const zadnjiVo2 = vo2Sorted[0]?.vo2max || null
  const prejsnjiTeden = new Date(TODAY - 7*86400000).toISOString().slice(0,10)
  const starejsiVo2 = vo2Sorted.find(w => w.datum <= prejsnjiTeden)?.vo2max || null
  const vo2Diff = zadnjiVo2 && starejsiVo2 ? Math.round((zadnjiVo2 - starejsiVo2)*10)/10 : null

  const [ocenaMap, setOcenaMap] = React.useState({})
  const getOcena = (workout) => ocenaMap[workout.id] ?? workout.subjektivna_ocena
  const saveOcena = async (workoutId, ocena) => {
    setOcenaMap(prev => ({ ...prev, [workoutId]: ocena }))
    await supabase.from('workouts').update({ subjektivna_ocena: ocena }).eq('id', workoutId)
    if (onRefresh) onRefresh()
  }
  const atlCtlTrend = React.useMemo(() => {
    const loadMap = {}
    workouts.forEach(w => {
      if (!w.datum) return
      loadMap[w.datum] = (loadMap[w.datum] || 0) + Math.round((w.trajanje_min || 0) * (w.aerobni_te || 1))
    })
    const result = []
    const today = new Date()
    for (let i = 89; i >= 0; i--) {
      const date = new Date(today - i * 86400000)
      const dateStr = date.toISOString().slice(0, 10)
      let atlSum = 0
      for (let j = 0; j < 7; j++) atlSum += loadMap[new Date(date - j * 86400000).toISOString().slice(0, 10)] || 0
      let ctlSum = 0
      for (let j = 0; j < 28; j++) ctlSum += loadMap[new Date(date - j * 86400000).toISOString().slice(0, 10)] || 0
      const atl = Math.round(atlSum / 7)
      const ctl = Math.round(ctlSum / 28)
      const tsb = ctl - atl
      result.push({ datum: dateStr.slice(5), atl, ctl, tsb })
    }
    return result
  }, [workouts])

  const [aiAnaliza, setAiAnaliza] = React.useState(null)
  const [aiLoading, setAiLoading] = React.useState(false)
  const [aiError, setAiError] = React.useState(null)

  const fetchAiAnaliza = async (zadnjiTek) => {
    setAiLoading(true)
    setAiError(null)
    setAiAnaliza(null)
    try {
      const vcerajStr = new Date(new Date(zadnjiTek.datum) - 86400000).toISOString().slice(0, 10)
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          tek: zadnjiTek,
          lapi: laps.filter(l => l.datum === zadnjiTek.datum),
          metrikeVceraj: metrike.find(m => m.datum === vcerajStr) || {},
          prehranaVceraj: prehrana.find(p => p.datum === vcerajStr) || {},
          zadnjih10Treningov: workouts.slice(0, 10),
          subjektivnaOcena: getOcena(zadnjiTek),
        })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setAiAnaliza(data.analiza)
    } catch (e) {
      setAiError(e.message)
    } finally {
      setAiLoading(false)
    }
  }

  return(<>
    <div className="grid4">
      <StatCard title="Skupaj km (teki)" value={fmt(totalKm,0)} unit="km"/>
      <StatCard title="Povp. HR na tekih" value={avgHR?fmt(avgHR,0):'—'} unit="bpm" sub={avgHR?`Cona ${hrZona(avgHR)}`:''} color={hrZonaColor(avgHR)}/>
      <StatCard title="Število tekov" value={teki.length} sub="v bazi"/>
      <div className="card">
        <h3>VO2max (trenutni)</h3>
        <div><span className="stat-val" style={{color:'#a78bfa'}}>{zadnjiVo2?fmt(zadnjiVo2,1):'—'}</span></div>
        <div className="stat-sub">cilj: 52 (za 3:45)</div>
        {vo2Diff !== null && (
          <div className="stat-sub" style={{color:vo2Diff>0?'#22c55e':vo2Diff<0?'#ef4444':'#6b7280',marginTop:4}}>
            {vo2Diff>0?'+':''}{vo2Diff} vs prejšnji teden
          </div>
        )}
        {zadnjiVo2 && <div className="stat-sub" style={{color: zadnjiVo2>=52?'#22c55e':'#f97316',marginTop:4}}>{zadnjiVo2>=52?'✓ cilj dosežen':`${fmt(52-zadnjiVo2,1)} do cilja`}</div>}
      </div>
    </div>
    {/* Analiza zadnjega teka */}
    {(() => {
      const zadnjiTek = workouts.find(w => isTek(w))
      const a = zadnjiTek ? analizirajTek(zadnjiTek, laps, metrike, prehrana, workouts) : null
      if (!a) return null

      return (
        <div className="card" style={{marginBottom:16}}>
          <h3>Analiza zadnjega teka</h3>
          <div style={{display:'flex',gap:16,marginBottom:14,flexWrap:'wrap',alignItems:'center'}}>
            <span style={{fontFamily:'DM Mono',fontSize:13,color:'#94a3b8'}}>{a.tek.naziv}</span>
            <span style={{fontFamily:'DM Mono',fontSize:13,color:'#64748b'}}>{a.tek.datum}</span>
            <span style={{fontFamily:'DM Mono',fontSize:13,color:'#94a3b8'}}>{fmt(a.tek.razdalja_km)} km</span>
            <span style={{fontFamily:'DM Mono',fontSize:13,color:hrZonaColor(a.tek.povprecni_hr)}}>{a.tek.povprecni_hr} avg · {a.tek.max_hr} max bpm</span>
          </div>
          {a.lapi.length > 0 && (() => {
            const parsePace = s => {
              if (!s) return null
              const parts = s.split(':').map(Number)
              return parts[0] * 60 + (parts[1] || 0)
            }
            const chartData = a.lapi.map((l, i) => ({
              km: i + 1,
              hr: l.povprecni_hr || null,
              pace: parsePace(l.povprecni_tempo),
            })).filter(d => d.hr && d.pace)

            // Pa:HR aerobni decoupling
            let decouplingPct = null
            if (chartData.length >= 4) {
              const half = Math.floor(chartData.length / 2)
              const ratio = arr => arr.reduce((s, d) => s + d.pace / d.hr, 0) / arr.length
              const r1 = ratio(chartData.slice(0, half))
              const r2 = ratio(chartData.slice(half))
              decouplingPct = Math.round((r2 - r1) / r1 * 1000) / 10
            }

            const paceMin = chartData.length ? Math.min(...chartData.map(d=>d.pace)) - 10 : 0
            const paceMax = chartData.length ? Math.max(...chartData.map(d=>d.pace)) + 10 : 400

            return (
              <div style={{marginBottom:14}}>
                <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:6,flexWrap:'wrap'}}>
                  <div style={{fontSize:11,color:'#475569',fontFamily:'DM Mono',textTransform:'uppercase',letterSpacing:'0.5px'}}>HR &amp; Pace po km</div>
                  {decouplingPct !== null && (
                    <div style={{fontFamily:'DM Mono',fontSize:12}}>
                      <span style={{color:'#475569'}}>Pa:HR decoupling: </span>
                      <span style={{fontWeight:600,color: Math.abs(decouplingPct) < 5 ? '#22c55e' : decouplingPct < 8 ? '#eab308' : '#ef4444'}}>
                        {decouplingPct > 0 ? '+' : ''}{decouplingPct}%
                      </span>
                      <span style={{color:'#475569',marginLeft:6}}>
                        {Math.abs(decouplingPct) < 5 ? '✓ aerobno stabilno' : decouplingPct < 8 ? '⚠ blag drift' : '⚠ cardiac drift'}
                      </span>
                    </div>
                  )}
                </div>
                {chartData.length >= 2 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <ComposedChart data={chartData} margin={{top:4,right:8,left:4,bottom:0}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e2433"/>
                      <XAxis dataKey="km" tick={{fontSize:10,fill:'#475569',fontFamily:'DM Mono'}} label={{value:'km',position:'insideBottomRight',offset:-2,fontSize:10,fill:'#475569'}}/>
                      <YAxis yAxisId="hr" domain={['auto','auto']} tick={{fontSize:10,fill:'#f97316',fontFamily:'DM Mono'}} width={32}/>
                      <YAxis yAxisId="pace" orientation="right" reversed={true} domain={[paceMin, paceMax]} tick={{fontSize:10,fill:'#3b82f6',fontFamily:'DM Mono'}} width={38} tickFormatter={v => { const m=Math.floor(v/60); const s=String(v%60).padStart(2,'0'); return `${m}:${s}` }}/>
                      <Tooltip
                        content={({active,payload,label}) => {
                          if (!active || !payload?.length) return null
                          const d = payload[0]?.payload
                          if (!d) return null
                          const pm = Math.floor(d.pace/60), ps = String(d.pace%60).padStart(2,'0')
                          return (
                            <div style={{background:'#111827',border:'1px solid #1e2433',borderRadius:8,padding:'8px 12px',fontSize:11,fontFamily:'DM Mono'}}>
                              <div style={{color:'#64748b',marginBottom:4}}>{label}. km</div>
                              <div style={{color:'#f97316'}}>HR: {d.hr} bpm</div>
                              <div style={{color:'#3b82f6'}}>Pace: {pm}:{ps} /km</div>
                            </div>
                          )
                        }}
                      />
                      <Line yAxisId="hr" type="monotone" dataKey="hr" stroke="#f97316" strokeWidth={2} dot={{r:3,fill:'#f97316'}} name="HR"/>
                      <Line yAxisId="pace" type="monotone" dataKey="pace" stroke="#3b82f6" strokeWidth={2} dot={{r:3,fill:'#3b82f6'}} name="Pace"/>
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
                    {a.lapi.map((l, i) => (
                      <div key={i} style={{padding:'4px 8px',borderRadius:4,background:'#0f172a',border:'1px solid #1e2433',fontSize:11,fontFamily:'DM Mono',minWidth:70}}>
                        <div style={{color:'#475569'}}>{i+1}. km</div>
                        <div style={{color:hrZonaColor(l.povprecni_hr)}}>{l.povprecni_hr||'—'} bpm</div>
                        <div style={{color:'#64748b'}}>{l.povprecni_tempo||'—'}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })()}
          <div style={{marginBottom:14}}>
            <div style={{fontSize:11,color:'#475569',marginBottom:6,fontFamily:'DM Mono',textTransform:'uppercase',letterSpacing:'0.5px'}}>Subjektivna ocena teka</div>
            <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
              {OCENE.map(o => {
                const current = getOcena(zadnjiTek)
                const active = current === o.key
                return (
                  <button key={o.key} onClick={() => saveOcena(zadnjiTek.id, o.key)} style={{padding:'5px 14px',borderRadius:4,border:`1px solid ${active ? o.color : '#334155'}`,background:active ? o.color+'33' : '#1e2d3d',color:active ? o.color : '#94a3b8',fontSize:12,cursor:'pointer',fontFamily:'DM Mono'}}>{o.label}</button>
                )
              })}
            </div>
          </div>
          <div style={{borderTop:'1px solid #1e2433',paddingTop:14}}>
            <button
              onClick={() => fetchAiAnaliza(zadnjiTek)}
              disabled={aiLoading}
              style={{padding:'7px 18px',borderRadius:6,border:'1px solid #6366f1',background:aiLoading?'#1e2433':'#6366f122',color:aiLoading?'#475569':'#a5b4fc',fontSize:13,cursor:aiLoading?'default':'pointer',fontFamily:'DM Mono',fontWeight:500}}
            >
              {aiLoading ? '⏳ Analiziram...' : '🤖 Analiziraj z AI'}
            </button>
            {aiError && <div style={{marginTop:10,fontSize:12,color:'#f87171',fontFamily:'DM Mono'}}>{aiError}</div>}
            {aiAnaliza && (
              <div style={{marginTop:12}}>
                {aiAnaliza.split('\n').map((line, i) => {
                  const isHeader = line.startsWith('**')
                  return (
                    <div key={i} style={{fontSize:isHeader?11:13,fontWeight:isHeader?600:400,color:isHeader?'#e2e8f0':'#94a3b8',marginTop:isHeader?12:2,lineHeight:1.65}}>
                      {line.replace(/\*\*/g,'')}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )
    })()}

    <div className="card" style={{marginBottom:16}}>
      <h3>Km po tednih &amp; HR efikasnost</h3>
      <div style={{fontSize:11,color:'#475569',marginBottom:8,fontFamily:'DM Mono'}}>
        <span style={{color:'#3b82f6',fontWeight:600}}>■</span> km (levo) &nbsp;·&nbsp;
        <span style={{color:'#f59e0b',fontWeight:600}}>—</span> tempo pri HR 155 bpm (desno, nižje = boljša efikasnost)
      </div>
      {kombiniranGraf.length > 0 ? (
        <ResponsiveContainer width="100%" height={210}>
          <ComposedChart data={kombiniranGraf} margin={{top:4,right:8,left:4,bottom:0}}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2433"/>
            <XAxis dataKey="teden" tick={{fontSize:10,fill:'#475569',fontFamily:'DM Mono'}}/>
            <YAxis yAxisId="km" tick={{fontSize:10,fill:'#3b82f6',fontFamily:'DM Mono'}} width={28}/>
            <YAxis yAxisId="efik" orientation="right" reversed={true} domain={['auto','auto']} tick={{fontSize:10,fill:'#f59e0b',fontFamily:'DM Mono'}} width={40} tickFormatter={v => { const m=Math.floor(v/60); const s=String(v%60).padStart(2,'0'); return `${m}:${s}` }}/>
            <Tooltip
              content={({active,payload,label}) => {
                if (!active || !payload?.length) return null
                const d = payload[0]?.payload
                if (!d) return null
                return (
                  <div style={{background:'#111827',border:'1px solid #1e2433',borderRadius:8,padding:'8px 12px',fontSize:11,fontFamily:'DM Mono'}}>
                    <div style={{color:'#64748b',marginBottom:4}}>teden {label}</div>
                    <div style={{color:'#3b82f6'}}>Km: {d.km}</div>
                    {d.efik && <div style={{color:'#f59e0b'}}>Efik: {Math.floor(d.efik/60)}:{String(d.efik%60).padStart(2,'0')}/km pri HR 155</div>}
                  </div>
                )
              }}
            />
            <Bar yAxisId="km" dataKey="km" fill="#3b82f644" stroke="#3b82f6" strokeWidth={1} radius={[4,4,0,0]}/>
            <Line yAxisId="efik" type="monotone" dataKey="efik" stroke="#f59e0b" strokeWidth={2} dot={{r:4,fill:'#f59e0b'}} connectNulls={false}/>
          </ComposedChart>
        </ResponsiveContainer>
      ) : <div className="empty">Ni dovolj podatkov</div>}
    </div>
    {/* Load kartice */}
    {(() => {
      const { atl, ctl, razmerje, razmerjeOpis, razmerjeColor } = izracunajLoad(workouts)
      return (
        <div className="grid3" style={{marginBottom:16}}>
          <div className="card">
            <h3>Akutni Load — ATL (7 dni)</h3>
            <div className="stat-val" style={{color: atl > 200 ? '#ef4444' : atl > 100 ? '#eab308' : '#22c55e'}}>{atl}</div>
            <div className="stat-sub">kratkoročna utrujenost</div>
            <div style={{fontSize:11,color:'#475569',marginTop:8}}>Visok = utrujen, nizek = spočit</div>
          </div>
          <div className="card">
            <h3>Kronični Load — CTL (28 dni)</h3>
            <div className="stat-val" style={{color:'#3b82f6'}}>{ctl}</div>
            <div className="stat-sub">fitnes baza</div>
            <div style={{fontSize:11,color:'#475569',marginTop:8}}>Višji = boljša fitnes baza</div>
          </div>
          <div className="card">
            <h3>ATL/CTL Razmerje</h3>
            <div className="stat-val" style={{color: razmerjeColor}}>{razmerje !== null ? razmerje.toFixed(2) : '—'}</div>
            <div className="stat-sub" style={{color: razmerjeColor}}>{razmerjeOpis}</div>
            <div style={{fontSize:11,color:'#475569',marginTop:8}}>0.8–1.3 optimalno · &gt;1.5 nevarno</div>
          </div>
        </div>
      )
    })()}

    <div className="card" style={{marginBottom:16}}>
      <h3>ATL / CTL / Form — 90 dni</h3>
      <div style={{fontSize:11,color:'#475569',marginBottom:8,fontFamily:'DM Mono'}}>
        <span style={{color:'#f97316'}}>ATL</span> kratkoročna utrujenost &nbsp;·&nbsp;
        <span style={{color:'#3b82f6'}}>CTL</span> fitnes baza &nbsp;·&nbsp;
        <span style={{color:'#22c55e'}}>Form</span>/<span style={{color:'#ef4444'}}>Form</span> = CTL−ATL (zeleno = svež, rdeče = utrujen)
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={atlCtlTrend} margin={{top:4,right:8,left:4,bottom:0}}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e2433"/>
          <XAxis dataKey="datum" tick={{fontSize:9,fill:'#475569',fontFamily:'DM Mono'}} interval={Math.floor(atlCtlTrend.length/6)}/>
          <YAxis yAxisId="load" tick={{fontSize:10,fill:'#475569',fontFamily:'DM Mono'}} width={28}/>
          <YAxis yAxisId="tsb" orientation="right" tick={{fontSize:10,fill:'#475569',fontFamily:'DM Mono'}} width={32}/>
          <Tooltip
            contentStyle={{background:'#111827',border:'1px solid #1e2433',borderRadius:8,fontSize:11}}
            content={({active,payload,label}) => {
              if (!active || !payload?.length) return null
              const d = payload[0]?.payload
              if (!d) return null
              return (
                <div style={{background:'#111827',border:'1px solid #1e2433',borderRadius:8,padding:'8px 12px',fontSize:11,fontFamily:'DM Mono'}}>
                  <div style={{color:'#64748b',marginBottom:5}}>{label}</div>
                  <div style={{color:'#f97316'}}>ATL: {d.atl}</div>
                  <div style={{color:'#3b82f6'}}>CTL: {d.ctl}</div>
                  <div style={{color: d.tsb >= 0 ? '#22c55e' : '#ef4444', fontWeight:600}}>Form: {d.tsb > 0 ? '+' : ''}{d.tsb}</div>
                </div>
              )
            }}
          />
          <ReferenceLine yAxisId="tsb" y={0} stroke="#475569" strokeDasharray="4 2" strokeWidth={1}/>
          <Bar yAxisId="tsb" dataKey="tsb" name="Form" radius={[2,2,0,0]} maxBarSize={6}>
            {atlCtlTrend.map((entry, i) => (
              <Cell key={i} fill={entry.tsb >= 0 ? '#22c55e' : '#ef4444'} opacity={0.75}/>
            ))}
          </Bar>
          <Line yAxisId="load" type="monotone" dataKey="atl" stroke="#f97316" strokeWidth={2} dot={false} name="ATL"/>
          <Line yAxisId="load" type="monotone" dataKey="ctl" stroke="#3b82f6" strokeWidth={2} dot={false} name="CTL"/>
        </ComposedChart>
      </ResponsiveContainer>
    </div>

    <div className="card">
      <NaslednjihPetTreningov/>
    </div>
  </>)
}
