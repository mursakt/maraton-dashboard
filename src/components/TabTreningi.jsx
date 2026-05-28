import React from 'react'
import { Bar, Line, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts'
import { TODAY, PLAN_TRENINGI } from '../constants/plan'
import { izracunajLoad, analizirajTek } from '../utils/calculations'
import { runRuleEngine } from '../utils/ruleEngine'
import { isTek, fmt, hrZona, hrZonaColor } from '../utils/helpers'
import { StatCard } from './StatCard'
import { supabase } from '../supabase'

function calcDecoupling(lapList) {
  const data = lapList
    .filter(l => l.povprecni_hr && l.povprecni_tempo)
    .map(l => {
      const p = l.povprecni_tempo.split(':').map(Number)
      const pace = p.length === 2 ? p[0] * 60 + (p[1] || 0) : null
      return pace ? { hr: l.povprecni_hr, pace } : null
    })
    .filter(Boolean)
  if (data.length < 4) return null
  const half = Math.floor(data.length / 2)
  // Frielov standard: fatigue index = pace_sec × HR (višje = slabše)
  // decoupling = (f2/f1 - 1) × 100 → pozitivno ko HR raste in/ali tempo pada
  const fatigue = arr => arr.reduce((s, d) => s + d.pace * d.hr, 0) / arr.length
  const f1 = fatigue(data.slice(0, half))
  const f2 = fatigue(data.slice(half))
  return Math.round((f2 / f1 - 1) * 1000) / 10
}

function detectTipLocal(workout) {
  const pe = PLAN_TRENINGI.find(p => p.datum === workout.datum || p.naziv === workout.naziv)
  const o = (pe?.opis || '').toLowerCase()
  if (o.includes('maraton')) return 'race'
  if (o.includes('race pace')) return 'racepace'
  if (o.includes('interval')) return 'intervals'
  if (o.includes('hribč')) return 'hills'
  if (o.includes('dolgi tek')) return 'long'
  if (workout.aerobni_te >= 4 || workout.povprecni_hr > 165) return 'intervals'
  if (workout.razdalja_km >= 12) return 'long'
  return 'easy'
}

function decouplingInterpretacija(pct) {
  if (pct < 0)   return 'Negativni split aerobno — srce in tempo sta se izboljšala v drugi polovici. Odlična aerobna kontrola.'
  if (pct < 3)   return 'Odlično aerobno — srce je ostalo stabilno skozi ves tek. Aerobna baza je na visoki ravni.'
  if (pct < 5)   return 'Dobra aerobna stabilnost — normalna variacija, srce se ni bistveno utrudilo.'
  if (pct < 10)  return 'Blag cardiac drift — rahla utrujenost srca v drugi polovici. Morda malo nizek glikogen ob koncu.'
  if (pct < 20)  return 'Zmeren drift — srce se je utrudilo. Možni vzroki: nizek glikogen dan prej, dehidracija ali previsok tempo.'
  return 'Velik drift — glikogen je bil zelo nizek ali napor previsok. Preveri prehrano dan prej in hidracijo med tekom.'
}

const TIP_LABEL_SHORT = {
  easy: 'lahki teki', long: 'dolgi teki', intervals: 'intervali',
  hills: 'hribčki', racepace: 'RPR', race: 'tekme',
}

const SEV_ICON = { alarm: '🔴', warning: '🟡', info: '🔵' }
const SEV_BORDER = { alarm: '#ef444418', warning: '#eab30818', info: '#3b82f618' }
const SEV_COLOR = { alarm: '#f87171', warning: '#fbbf24', info: '#60a5fa' }
const CAT_COLOR = {
  tek: '#a78bfa', prehrana: '#34d399', regeneracija: '#38bdf8',
  load: '#fb923c', primerjava: '#94a3b8',
}
const CAT_LABEL = {
  tek: 'Tek', prehrana: 'Prehrana', regeneracija: 'Regeneracija',
  load: 'Obremenitev', primerjava: 'Primerjava',
}

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
    const norm = tempoSec ? Math.round(tempoSec + (w.povprecni_hr - 155) * 4) : null
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

  const zadnjiTekZaAnalizo = workouts.find(w => isTek(w))
  const findings = React.useMemo(() =>
    runRuleEngine({ zadnjiTek: zadnjiTekZaAnalizo, lapsTeka: laps, metrike, prehrana, workouts }),
    [zadnjiTekZaAnalizo?.garmin_activity_id, laps.length, metrike.length, prehrana.length]
  )

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
            const decouplingPct = calcDecoupling(chartData.map(d => ({
              povprecni_hr: d.hr,
              povprecni_tempo: `${Math.floor(d.pace/60)}:${String(d.pace%60).padStart(2,'0')}`,
            })))

            // Primerjava z istim tipom tekov
            const tipTeka = detectTipLocal(a.tek)
            const istiTipTeki = workouts
              .filter(w => isTek(w) && w.datum < a.tek.datum && w.razdalja_km > 0)
              .sort((x, y) => y.datum.localeCompare(x.datum))
              .filter(w => detectTipLocal(w) === tipTeka)
              .slice(0, 8)
            const prevDecouplings = istiTipTeki
              .map(w => calcDecoupling(
                laps.filter(l => l.garmin_activity_id === w.garmin_activity_id)
                    .sort((x, y) => x.lap_number - y.lap_number)
              ))
              .filter(d => d !== null)
            const decouplingAvgPrev = prevDecouplings.length >= 2
              ? Math.round(prevDecouplings.reduce((s, d) => s + d, 0) / prevDecouplings.length * 10) / 10
              : null

            const dcColor = decouplingPct === null ? '#6b7280'
              : decouplingPct < 5 ? '#22c55e'
              : decouplingPct < 10 ? '#eab308' : '#ef4444'
            const dcLabel = decouplingPct === null ? '' : decouplingPct < 5 ? '✓ aerobno stabilno' : decouplingPct < 10 ? '⚠ blag drift' : '⚠ cardiac drift'

            const paceMin = chartData.length ? Math.min(...chartData.map(d=>d.pace)) - 10 : 0
            const paceMax = chartData.length ? Math.max(...chartData.map(d=>d.pace)) + 10 : 400

            return (
              <div style={{marginBottom:14}}>
                <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:6,flexWrap:'wrap'}}>
                  <div style={{fontSize:11,color:'#475569',fontFamily:'DM Mono',textTransform:'uppercase',letterSpacing:'0.5px'}}>HR &amp; Pace po km</div>
                  {decouplingPct !== null && (
                    <div style={{fontFamily:'DM Mono',fontSize:12,display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                      <span style={{color:'#475569'}}>Pa:HR decoupling:</span>
                      <span style={{fontWeight:700,color:dcColor,fontSize:13}}>
                        {decouplingPct > 0 ? '+' : ''}{decouplingPct}%
                      </span>
                      <span style={{color:'#475569'}}>{dcLabel}</span>
                      {decouplingAvgPrev !== null && (() => {
                        const delta = decouplingPct - decouplingAvgPrev
                        const boljse = delta < -1
                        const slabse = delta > 1
                        return (
                          <span style={{fontSize:11,color:'#334155'}}>
                            vs {TIP_LABEL_SHORT[tipTeka]} ({prevDecouplings.length}×):
                            <span style={{color: boljse ? '#22c55e' : slabse ? '#f97316' : '#64748b', fontWeight:600, marginLeft:4}}>
                              {decouplingAvgPrev > 0 ? '+' : ''}{decouplingAvgPrev}%
                            </span>
                            <span style={{color: boljse ? '#22c55e' : slabse ? '#f97316' : '#64748b', marginLeft:4}}>
                              {boljse ? '↑ boljše' : slabse ? '↓ slabše' : '≈ podobno'}
                            </span>
                          </span>
                        )
                      })()}
                    </div>
                  )}
                </div>
                {decouplingPct !== null && (
                  <div style={{fontSize:11,color:'#475569',fontFamily:'DM Mono',marginBottom:8,paddingLeft:2,lineHeight:1.5}}>
                    {decouplingInterpretacija(decouplingPct)}
                  </div>
                )}
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
          {findings.length > 0 && (
            <div style={{borderTop:'1px solid #1e2433',paddingTop:14}}>
              <div style={{fontSize:11,color:'#475569',fontFamily:'DM Mono',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:10}}>
                Analiza · {findings.filter(f=>f.severity==='alarm').length} alarm · {findings.filter(f=>f.severity==='warning').length} opozorilo · {findings.filter(f=>f.severity==='info').length} info
              </div>
              {['alarm','warning','info'].flatMap(sev => findings.filter(f => f.severity === sev)).map((f, i) => (
                <div key={i} style={{display:'flex',gap:10,padding:'8px 12px',borderRadius:6,marginBottom:5,background:'#080f1e',border:`1px solid ${SEV_BORDER[f.severity]}`,alignItems:'flex-start'}}>
                  <span style={{fontSize:13,marginTop:1,flexShrink:0}}>{SEV_ICON[f.severity]}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',gap:7,alignItems:'center',marginBottom:3,flexWrap:'wrap'}}>
                      <span style={{fontSize:10,fontFamily:'DM Mono',color:CAT_COLOR[f.category],background:CAT_COLOR[f.category]+'22',padding:'1px 7px',borderRadius:3,flexShrink:0}}>
                        {CAT_LABEL[f.category]}
                      </span>
                      <span style={{fontSize:12,color:SEV_COLOR[f.severity],fontWeight:600,lineHeight:1.4}}>{f.title}</span>
                    </div>
                    <div style={{fontSize:12,color:'#64748b',lineHeight:1.5}}>{f.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
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

    {vo2Data.length > 1 && (
      <div className="card" style={{marginBottom:16}}>
        <h3>VO2max trend</h3>
        <div style={{fontSize:11,color:'#475569',marginBottom:8,fontFamily:'DM Mono'}}>
          Cilj: <span style={{color:'#22c55e'}}>52 ml/kg/min</span> za sub 3:45
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <ComposedChart data={vo2Data} margin={{top:4,right:8,left:4,bottom:0}}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2433"/>
            <XAxis dataKey="datum" tick={{fontSize:10,fill:'#475569',fontFamily:'DM Mono'}} interval="preserveStartEnd"/>
            <YAxis domain={['auto','auto']} tick={{fontSize:10,fill:'#a78bfa',fontFamily:'DM Mono'}} width={28}/>
            <ReferenceLine y={52} stroke="#22c55e" strokeDasharray="4 2" strokeWidth={1} label={{value:'cilj 52',position:'insideTopRight',fontSize:9,fill:'#22c55e'}}/>
            <Tooltip contentStyle={{background:'#111827',border:'1px solid #1e2433',borderRadius:8,fontSize:12}} formatter={v=>[`${fmt(v,1)} ml/kg/min`,'VO2max']}/>
            <Line type="monotone" dataKey="vo2" stroke="#a78bfa" strokeWidth={2} dot={{r:4,fill:'#a78bfa'}}/>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    )}

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

    {/* ATL/CTL Interpretacija */}
    {atlCtlTrend.length >= 30 && (() => {
      const cur   = atlCtlTrend[atlCtlTrend.length - 1]
      const ago7  = atlCtlTrend[atlCtlTrend.length - 8]  || atlCtlTrend[0]
      const ago14 = atlCtlTrend[atlCtlTrend.length - 15] || atlCtlTrend[0]

      const ctlD14 = cur.ctl - ago14.ctl
      const atlD7  = cur.atl - ago7.atl
      const tsbD7  = cur.tsb - ago7.tsb

      const last30      = atlCtlTrend.slice(-30)
      const daysNegTsb  = last30.filter(d => d.tsb < 0).length
      const peakAtl30   = Math.max(...last30.map(d => d.atl))

      const tsbColor = cur.tsb > 5 ? '#22c55e' : cur.tsb > -10 ? '#94a3b8' : cur.tsb > -30 ? '#eab308' : cur.tsb > -50 ? '#f97316' : '#ef4444'
      const atlColor = cur.atl > 150 ? '#ef4444' : cur.atl > 100 ? '#f97316' : cur.atl > 50 ? '#eab308' : '#22c55e'

      const atlOpis = cur.atl < 50  ? 'Nizka akutna utrujenost — malo treniral/a v zadnjem tednu.'
        : cur.atl < 100 ? 'Zmerna akutna utrujenost — normalen teden.'
        : cur.atl < 150 ? 'Visoka akutna utrujenost — intenziven teden.'
        : cur.atl < 200 ? 'Zelo visoka utrujenost — pazi na regeneracijo.'
        : 'Kritična obremenitev — počitek nujen.'

      const ctlOpis = cur.ctl < 40  ? 'Nizka fitnes baza — zgodnja faza ali po pavzi.'
        : cur.ctl < 70  ? 'Zmerna baza — redni tekač.'
        : cur.ctl < 100 ? 'Dobra fitnes baza — resni maratonski trening.'
        : 'Visoka fitnes baza — vrhunski nivo.'

      const tsbOpis = cur.tsb > 25   ? 'Preveč svež — verjetno premalo treninga v zadnjem času.'
        : cur.tsb > 5   ? 'Svež in spočit — idealno za tekmo ali test.'
        : cur.tsb > -10 ? 'Nevtralno — dobro razmerje med tregom in regeneracijo.'
        : cur.tsb > -30 ? 'Produktivna utrujenost — optimalna cona za trenažni napredek.'
        : cur.tsb > -50 ? 'Visoka utrujenost — potrebna regeneracija, pazi na preobremenitev.'
        : 'Preobremenjenost — visoko tveganje za poškodbo ali bolezen.'

      const ctlTrendColor = ctlD14 >= 5 ? '#22c55e' : ctlD14 >= 0 ? '#eab308' : '#ef4444'
      const ctlTrendOpis  = ctlD14 >= 5  ? `Fitnes baza raste dobro (+${ctlD14} v 14 dneh).`
        : ctlD14 >= 2  ? `Fitnes baza raste počasi (+${ctlD14} v 14 dneh).`
        : ctlD14 >= -2 ? `Fitnes baza je stabilna (${ctlD14>=0?'+':''}${ctlD14} v 14 dneh).`
        : `Fitnes baza pada (${ctlD14} v 14 dneh) — premalo treninga.`

      const atlTrendColor = Math.abs(atlD7) < 5 ? '#94a3b8' : atlD7 > 0 ? '#f97316' : '#22c55e'
      const atlTrendOpis  = atlD7 > 20  ? `Hitro narašča (+${atlD7}) — zelo visoka obremenitev.`
        : atlD7 > 5   ? `Narašča (+${atlD7}) — teden s povečanim treningom.`
        : atlD7 > -5  ? `Stabilen (${atlD7>=0?'+':''}${atlD7}).`
        : atlD7 > -20 ? `Pada (${atlD7}) — regeneracijski teden.`
        : `Hitro pada (${atlD7}) — manj treninga ali tapering.`

      const tsbTrendColor = tsbD7 > 0 ? '#22c55e' : tsbD7 < -5 ? '#f97316' : '#94a3b8'
      const tsbTrendOpis  = tsbD7 > 10 ? `Form se hitro izboljšuje (+${tsbD7} v 7 dneh) — regeneracija poteka.`
        : tsbD7 > 3   ? `Form se izboljšuje (+${tsbD7} v 7 dneh).`
        : tsbD7 > -3  ? `Form je stabilen (${tsbD7>=0?'+':''}${tsbD7} v 7 dneh).`
        : tsbD7 > -10 ? `Form pada (${tsbD7} v 7 dneh) — utrujenost se kopiči.`
        : `Form hitro pada (${tsbD7} v 7 dneh) — visoka obremenitev.`

      return (
        <div className="card" style={{marginBottom:16}}>
          <h3>Interpretacija ATL / CTL / Form</h3>

          {/* Trenutno stanje */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:14}}>
            {[
              { label:'ATL — Akutna utrujenost', val:cur.atl,  color:atlColor, opis:atlOpis },
              { label:'CTL — Fitnes baza',       val:cur.ctl,  color:'#3b82f6', opis:ctlOpis },
              { label:'Form (TSB = CTL−ATL)',    val:(cur.tsb>0?'+':'')+cur.tsb, color:tsbColor, opis:tsbOpis },
            ].map(({label,val,color,opis}) => (
              <div key={label} style={{background:'#080f1e',borderRadius:6,padding:'10px 12px',border:'1px solid #1e2433'}}>
                <div style={{fontSize:10,color:'#475569',fontFamily:'DM Mono',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:4}}>{label}</div>
                <div style={{fontSize:22,fontWeight:700,color,fontFamily:'DM Mono',marginBottom:5}}>{val}</div>
                <div style={{fontSize:11,color:'#64748b',lineHeight:1.4}}>{opis}</div>
              </div>
            ))}
          </div>

          {/* Trendi */}
          <div style={{borderTop:'1px solid #1e2433',paddingTop:12,marginBottom:14}}>
            <div style={{fontSize:10,color:'#475569',fontFamily:'DM Mono',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:8}}>Trendi</div>
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {[
                { label:'CTL / 14 dni', color:ctlTrendColor, opis:ctlTrendOpis },
                { label:'ATL / 7 dni',  color:atlTrendColor, opis:atlTrendOpis },
                { label:'Form / 7 dni', color:tsbTrendColor, opis:tsbTrendOpis },
                {
                  label:'Neg. TSB / 30d',
                  color: daysNegTsb > 20 ? '#f97316' : daysNegTsb > 10 ? '#eab308' : '#94a3b8',
                  opis: `${daysNegTsb}/30 dni v utrujenosti — ${daysNegTsb>20?'kronična utrujenost, potreben regeneracijski teden':daysNegTsb>10?'normalna obremenitev za maratonske priprave':'dobro razmerje'}`,
                },
                {
                  label:'Peak ATL / 30d',
                  color: peakAtl30 > 200 ? '#ef4444' : peakAtl30 > 150 ? '#f97316' : '#94a3b8',
                  opis: `${peakAtl30} — ${peakAtl30>200?'kritično visok vrh obremenitve v zadnjem mesecu':peakAtl30>150?'visok vrh, pazi na kopičenje':peakAtl30>100?'zmeren vrh obremenitve':'nizek vrh, možno povečanje km'}`,
                },
              ].map(({label,color,opis}) => (
                <div key={label} style={{display:'flex',gap:10,alignItems:'flex-start'}}>
                  <span style={{fontSize:11,fontFamily:'DM Mono',color:'#334155',minWidth:100,flexShrink:0,paddingTop:1}}>{label}</span>
                  <span style={{fontSize:12,color,lineHeight:1.5}}>{opis}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Kaj pomenijo metrike */}
          <div style={{borderTop:'1px solid #1e2433',paddingTop:12}}>
            <div style={{fontSize:10,color:'#475569',fontFamily:'DM Mono',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:8}}>Kaj pomenijo metrike</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              {[
                { title:'ATL — Acute Training Load', color:'#f97316', lines:[
                  '7-dnevno drseče povprečje obremenitve.',
                  'Meri kratkoročno akutno utrujenost.',
                  '< 50 nizka · 50–100 zmerna · 100–150 visoka · > 150 kritična',
                ]},
                { title:'CTL — Chronic Training Load', color:'#3b82f6', lines:[
                  '28-dnevno drseče povprečje = fitnes baza.',
                  'Raste počasi (tedni), pada hitreje (dnevi brez treninga).',
                  '< 40 nizka · 40–70 zmerna · 70–100 dobra · > 100 vrhunska',
                ]},
                { title:'TSB — Training Stress Balance', color:'#22c55e', lines:[
                  'Form = CTL − ATL. Meri razmerje fitnes/utrujenost.',
                  '+5 do +20: idealno za tekmo ali test.',
                  '−10 do −30: produktivna utrujenost (napredek).',
                  '< −40: nevarnost preobremenitve.',
                ]},
                { title:'ATL/CTL — Razmerje obremenitve', color:'#a78bfa', lines:[
                  'Meri hitrost povečevanja treninga.',
                  '< 0.8 premalo · 0.8–1.3 optimalno.',
                  '1.3–1.5 visoka obremenitev · > 1.5 nevarnost poškodbe.',
                ]},
              ].map(({title,color,lines}) => (
                <div key={title} style={{background:'#080f1e',borderRadius:6,padding:'10px 12px',border:'1px solid #1e2433'}}>
                  <div style={{fontSize:11,color,fontWeight:600,marginBottom:6,fontFamily:'DM Mono'}}>{title}</div>
                  {lines.map((l,i) => (
                    <div key={i} style={{fontSize:11,color:'#64748b',lineHeight:1.55,paddingLeft:8,borderLeft:`2px solid ${color}22`,marginBottom:i<lines.length-1?3:0}}>{l}</div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )
    })()}

  </>)
}
