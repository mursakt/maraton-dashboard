import React from 'react'
import { Bar, Line, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea, Cell } from 'recharts'
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


const PHASE_COLOR = { WARMUP:'#3b82f6', ACTIVE:'#f97316', RECOVERY:'#f97316', STRIDES:'#f97316', COOLDOWN:'#94a3b8', RUN:'#3b82f6' }
const PHASE_LABEL = { WARMUP:'Easy', ACTIVE:'Strides', RECOVERY:'Strides', STRIDES:'Strides', COOLDOWN:'Cooldown', RUN:'Tek' }

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
  // Izločen tek 04-27 (id 22675643667): 31min/5.84km pri HR 147 → anomalija,
  // kratek tek brez drifta z nizkim HR je dajal nerealno visoko efikasnost.
  const efikByWeek = {}
  teki.filter(w => w.povprecni_hr >= 138 && w.povprecni_hr <= 169 && w.povprecni_tempo && w.garmin_activity_id !== 22675643667).forEach(w => {
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

  const [compWorkoutId, setCompWorkoutId] = React.useState(null)
  const [bgWorkoutId, setBgWorkoutId] = React.useState(null)
  const [activePhase, setActivePhase] = React.useState(null)
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

            // Strukturiran = ima delovne intervale (ACTIVE/RECOVERY). Garmin označi
            // navadne 1km avto-lape z intensity_type "INTERVAL" — to NI strukturiran trening.
            const hasStructured = a.lapi.some(l => l.intensity_type === 'ACTIVE' || l.intensity_type === 'RECOVERY')
            const activeLapi   = a.lapi.filter(l => l.intensity_type === 'ACTIVE')
            const recoveryLapi = a.lapi.filter(l => l.intensity_type === 'RECOVERY')
            const easyLapi     = hasStructured
              ? a.lapi.filter(l => l.intensity_type === 'WARMUP' || l.intensity_type === 'COOLDOWN')
              : a.lapi

            // Strides (~20s ponovitve) vs intervali (daljši) — ločimo po trajanju ACTIVE lapov
            const activeAvgSec = activeLapi.length
              ? activeLapi.reduce((s, l) => s + (l.trajanje_sec || 0), 0) / activeLapi.length : 0
            const isStrides    = activeAvgSec > 0 && activeAvgSec <= 40
            const workLabel    = isStrides ? 'strides' : 'intervali'
            const workLabelCap = isStrides ? 'Strides' : 'Interval'
            const phaseLabelOf = ph => ph === 'STRIDES' ? workLabelCap : (PHASE_LABEL[ph] || ph)

            const chartData = easyLapi.map((l, i) => ({
              km: i + 1,
              hr: l.povprecni_hr || null,
              pace: parsePace(l.povprecni_tempo),
            })).filter(d => d.hr && d.pace)

            const bgLaps = bgWorkoutId
              ? laps.filter(l => String(l.garmin_activity_id) === String(bgWorkoutId)).sort((x,y) => x.lap_number - y.lap_number)
              : null
            const bgChartData = bgLaps
              ? bgLaps.filter(l => !l.intensity_type || l.intensity_type === 'WARMUP' || l.intensity_type === 'COOLDOWN').map(l => ({ hr: l.povprecni_hr||null, pace: parsePace(l.povprecni_tempo) })).filter(d => d.hr && d.pace)
              : chartData

            const compLaps = compWorkoutId
              ? laps.filter(l => String(l.garmin_activity_id) === String(compWorkoutId)).sort((x,y) => x.lap_number - y.lap_number)
              : []
            const compChartData = compLaps
              .filter(l => !l.intensity_type || l.intensity_type === 'WARMUP' || l.intensity_type === 'COOLDOWN')
              .map(l => ({ hr: l.povprecni_hr||null, pace: parsePace(l.povprecni_tempo) }))
              .filter(d => d.hr && d.pace)
            const maxLen = Math.max(bgChartData.length, compChartData.length)
            const mergedData = Array.from({length: maxLen}, (_, i) => ({
              km: i+1,
              hr: bgChartData[i]?.hr ?? null,
              pace: bgChartData[i]?.pace ?? null,
              compHr: compChartData[i]?.hr ?? null,
              compPace: compChartData[i]?.pace ?? null,
            }))

            const decouplingPct = calcDecoupling(chartData.map(d => ({
              povprecni_hr: d.hr,
              povprecni_tempo: `${Math.floor(d.pace/60)}:${String(d.pace%60).padStart(2,'0')}`,
            })))

            const tipTeka = detectTipLocal(a.tek)
            const istiTipTeki = workouts
              .filter(w => isTek(w) && w.datum < a.tek.datum && w.razdalja_km > 0)
              .sort((x, y) => y.datum.localeCompare(x.datum))
              .filter(w => detectTipLocal(w) === tipTeka)
              .slice(0, 8)
            const prevDecouplings = istiTipTeki
              .map(w => calcDecoupling(
                laps.filter(l => l.garmin_activity_id === w.garmin_activity_id && (!l.intensity_type || l.intensity_type === 'WARMUP'))
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

            const allPaces = [...bgChartData.map(d=>d.pace), ...compChartData.map(d=>d.pace)].filter(Boolean)
            const paceMin = allPaces.length ? Math.min(...allPaces) - 10 : 0
            const paceMax = allPaces.length ? Math.max(...allPaces) + 10 : 400

            return (
              <div style={{marginBottom:14}}>

                {/* ── Strides sekcija (samo za strukturirane teke) ── */}
                {hasStructured && activeLapi.length > 0 && (() => {
                  const stridePaces = activeLapi.map(l => parsePace(l.povprecni_tempo)).filter(Boolean)
                  const fastestPace = Math.min(...stridePaces)
                  const slowestPace = Math.max(...stridePaces)

                  return (
                    <div style={{marginBottom:16}}>
                      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:10,flexWrap:'wrap'}}>
                        <div style={{fontSize:11,color:'#f97316',fontFamily:'DM Mono',textTransform:'uppercase',letterSpacing:'0.5px',fontWeight:600}}>
                          ⚡ {activeLapi.length}× {workLabel}
                        </div>
                        <span style={{fontSize:11,color:'#475569',fontFamily:'DM Mono'}}>
                          najhitrejši: <span style={{color:'#22c55e',fontWeight:600}}>{Math.floor(fastestPace/60)}:{String(fastestPace%60).padStart(2,'0')}/km</span>
                        </span>
                        <span style={{fontSize:11,color:'#475569',fontFamily:'DM Mono'}}>
                          progresija: <span style={{color: slowestPace - fastestPace > 30 ? '#22c55e' : '#94a3b8', fontWeight:600}}>
                            {Math.round((slowestPace - fastestPace) / activeLapi.length)}s/km/{isStrides ? 'stride' : 'interval'}
                          </span>
                        </span>
                      </div>

                      {/* Stride kartice */}
                      <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:10}}>
                        {activeLapi.map((l, i) => {
                          const pace = parsePace(l.povprecni_tempo)
                          const isNajhitrejsi = pace === fastestPace
                          const progPct = stridePaces.length > 1 ? (slowestPace - pace) / (slowestPace - fastestPace) : 1
                          const col = `hsl(${Math.round(30 + progPct * 20)}, ${Math.round(70 + progPct * 30)}%, ${Math.round(45 + progPct * 15)}%)`
                          return (
                            <div key={i} style={{
                              padding:'10px 14px', borderRadius:8, background:'#080f1e',
                              border:`1px solid ${col}${isNajhitrejsi ? '' : '66'}`,
                              minWidth:80, textAlign:'center',
                              boxShadow: isNajhitrejsi ? `0 0 12px ${col}44` : 'none',
                            }}>
                              <div style={{fontSize:9,color:'#475569',fontFamily:'DM Mono',marginBottom:4}}>#{i+1}</div>
                              <div style={{fontSize:16,fontWeight:700,color:col,fontFamily:'DM Mono',lineHeight:1}}>
                                {pace ? `${Math.floor(pace/60)}:${String(pace%60).padStart(2,'0')}` : '—'}
                              </div>
                              <div style={{fontSize:9,color:'#334155',fontFamily:'DM Mono',marginTop:3}}>/km</div>
                              {l.max_hr > 0 && <div style={{fontSize:9,color:'#f9731666',fontFamily:'DM Mono',marginTop:4}}>max {l.max_hr} bpm</div>}
                              {l.razdalja_km && <div style={{fontSize:9,color:'#1e3a5f',fontFamily:'DM Mono',marginTop:1}}>{Math.round(l.razdalja_km*1000)}m</div>}
                            </div>
                          )
                        })}
                      </div>

                    </div>
                  )
                })()}

                {/* ── Graf celotnega teka ── */}
                {(() => {
                  // Samo prave faze strukturiranega treninga so smiselne; ostalo (vklj. Garmin
                  // "INTERVAL" avto-lape) je navaden tek.
                  const toChartPhase = p => (p === 'ACTIVE' || p === 'RECOVERY') ? 'STRIDES' : (p === 'WARMUP' || p === 'COOLDOWN') ? p : 'RUN'

                  // Base: bgWorkoutId-ovi lapi ali zadnji tek
                  const baseLapsFull = bgWorkoutId
                    ? laps.filter(l => String(l.garmin_activity_id) === String(bgWorkoutId)).sort((x,y) => x.lap_number - y.lap_number)
                    : a.lapi
                  const baseHasStr = baseLapsFull.some(l => l.intensity_type === 'ACTIVE' || l.intensity_type === 'RECOVERY')
                  const baseEasyL = baseHasStr
                    ? baseLapsFull.filter(l => l.intensity_type === 'WARMUP')
                    : baseLapsFull

                  // Easy stats (iz base teka — definirano po baseEasyL)
                  const easyHRs = baseEasyL.filter(l => l.povprecni_hr).map(l => l.povprecni_hr)
                  const easyAvgHR = easyHRs.length ? Math.round(easyHRs.reduce((s,h)=>s+h,0)/easyHRs.length) : null
                  const easyPaces = baseEasyL.map(l => parsePace(l.povprecni_tempo)).filter(Boolean)
                  const easyAvgPaceSec = easyPaces.length ? Math.round(easyPaces.reduce((s,p)=>s+p,0)/easyPaces.length) : null

                  // Primerjalni tek — CELE laps (vse faze), ne le ogrevanje
                  const rawCompLaps = compWorkoutId
                    ? laps.filter(l => String(l.garmin_activity_id) === String(compWorkoutId)).sort((x,y) => x.lap_number - y.lap_number)
                    : bgWorkoutId ? a.lapi : []

                  // Strukturiran tek (intervali/strides) → proporcionalna časovna os;
                  // easy/long run → ostane po lapih (idx, ker so avto-lapi ~1 km enakomerni).
                  const isStructured = baseLapsFull.some(l => l.intensity_type === 'ACTIVE' || l.intensity_type === 'RECOVERY')

                  // Osnovni tek + kumulativni čas (min) — širina rezine = dejansko trajanje lapa
                  let cumSec = 0
                  const fullRunData = baseLapsFull.map((l, i) => {
                    const tStart = cumSec / 60
                    cumSec += (l.trajanje_sec || 0)
                    const tEnd = cumSec / 60
                    return {
                      idx: i + 1,
                      x: isStructured ? (tStart + tEnd) / 2 : i + 1,
                      tStart, tEnd,
                      hr: l.povprecni_hr || null,
                      pace: parsePace(l.povprecni_tempo),
                      phase: l.intensity_type || 'RUN',
                      chartPhase: toChartPhase(l.intensity_type),
                      targetLow: l.target_pace_low_sec || null,
                      targetHigh: l.target_pace_high_sec || null,
                    }
                  })
                  const baseTotalMin = cumSec / 60

                  // Primerjalni tek — cele laps, poravnan po lastnem kumulativnem času (strukturiran)
                  // ali po indeksu lapa (easy/long); prikaže se kot ločena, popolna krivulja.
                  let compCumSec = 0
                  const compPoints = rawCompLaps.map((l, i) => {
                    const cStart = compCumSec / 60
                    compCumSec += (l.trajanje_sec || 0)
                    const cEnd = compCumSec / 60
                    return {
                      x: isStructured ? (cStart + cEnd) / 2 : i + 1,
                      idxComp: i + 1,
                      compHr: l.povprecni_hr || null,
                      compPace: parsePace(l.povprecni_tempo),
                      phase: l.intensity_type || 'RUN',
                      chartPhase: toChartPhase(l.intensity_type),
                      _comp: true,
                    }
                  }).filter(d => d.compHr || d.compPace)
                  const compTotalMin = compCumSec / 60

                  // Unique chart phases in order of appearance (for legend)
                  const uniquePhases = []
                  fullRunData.forEach(d => { if (!uniquePhases.includes(d.chartPhase)) uniquePhases.push(d.chartPhase) })

                  // Phase ranges: čas-based (strukturiran) ali idx±0.5 (easy/long)
                  const phaseRanges = []
                  fullRunData.forEach(d => {
                    const start = isStructured ? d.tStart : d.idx - 0.5
                    const end   = isStructured ? d.tEnd   : d.idx + 0.5
                    const last = phaseRanges[phaseRanges.length - 1]
                    if (last && last.phase === d.chartPhase) last.end = end
                    else phaseRanges.push({ phase: d.chartPhase, start, end })
                  })

                  const hasComp = !!(compWorkoutId || bgWorkoutId)

                  // Dva načina prikaza:
                  //  • poln tek (brez zooma): časovna os (strukturiran) ali lap-indeks (easy)
                  //  • segment zoom (activePhase): re-indeksiraj lape segmenta 1..n in poravnaj
                  //    osnovni + primerjalni tek po poziciji v segmentu (stride#1 vs stride#1 …)
                  let compForDisplay, targetBands, shadeRanges, xMin, xMax, xTicks
                  let showComp, timeAxis, dispPaceMin, dispPaceMax

                  if (activePhase) {
                    timeAxis = false
                    const baseSeg = fullRunData.filter(d => d.chartPhase === activePhase)
                      .map((d, i) => ({ ...d, x: i + 1, segIdx: i + 1 }))
                    const compSeg = (hasComp ? compPoints.filter(d => d.chartPhase === activePhase) : [])
                      .map((d, i) => ({ ...d, x: i + 1, segIdx: i + 1 }))
                    showComp = compSeg.length > 0
                    compForDisplay = [...baseSeg, ...compSeg].sort((p, q) => p.x - q.x)
                    const segLen = Math.max(baseSeg.length, compSeg.length)
                    xMin = 0.5; xMax = segLen + 0.5
                    xTicks = Array.from({ length: segLen }, (_, i) => i + 1)
                    targetBands = baseSeg.filter(d => d.targetLow && d.targetHigh)
                      .map(d => ({ x1: d.segIdx - 0.5, x2: d.segIdx + 0.5, targetLow: d.targetLow, targetHigh: d.targetHigh }))
                    // osenči delovne (ACTIVE) lape osnovnega teka znotraj segmenta
                    shadeRanges = baseSeg.filter(d => d.phase === 'ACTIVE')
                      .map(d => ({ phase: 'STRIDES', start: d.segIdx - 0.5, end: d.segIdx + 0.5 }))
                    const segPaces = [
                      ...baseSeg.map(d => d.pace).filter(Boolean),
                      ...compSeg.map(d => d.compPace).filter(Boolean),
                      ...targetBands.flatMap(d => [d.targetLow, d.targetHigh]),
                    ]
                    dispPaceMin = segPaces.length ? Math.min(...segPaces) - 10 : 0
                    dispPaceMax = segPaces.length ? Math.max(...segPaces) + 10 : 400
                  } else {
                    timeAxis = isStructured
                    showComp = hasComp && compPoints.length > 0
                    compForDisplay = showComp
                      ? [...fullRunData, ...compPoints].sort((p, q) => p.x - q.x)
                      : fullRunData
                    targetBands = isStructured
                      ? fullRunData.filter(d => d.targetLow && d.targetHigh)
                          .map(d => ({ x1: d.tStart, x2: d.tEnd, targetLow: d.targetLow, targetHigh: d.targetHigh }))
                      : []
                    shadeRanges = phaseRanges
                    const compLen = showComp ? compPoints.length : 0
                    xMin = isStructured ? 0 : 0.5
                    xMax = isStructured
                      ? Math.max(baseTotalMin, showComp ? compTotalMin : 0)
                      : Math.max(baseLapsFull.length, compLen) + 0.5
                    xTicks = isStructured ? undefined
                      : Array.from({ length: Math.max(baseLapsFull.length, compLen) }, (_, i) => i + 1)
                    const paceVals = [
                      ...fullRunData.map(d => d.pace).filter(Boolean),
                      ...(showComp ? compPoints.map(d => d.compPace).filter(Boolean) : []),
                      ...targetBands.flatMap(d => [d.targetLow, d.targetHigh]),
                    ]
                    dispPaceMin = paceVals.length ? Math.min(...paceVals) - 10 : 0
                    dispPaceMax = paceVals.length ? Math.max(...paceVals) + 10 : 400
                  }

                  if (fullRunData.length < 2) return null

                  // ── Primerjalne številke: tempo, HR, napredek (upošteva zoom prek compForDisplay) ──
                  const avgOf = (arr, key) => { const v = arr.map(d => d[key]).filter(x => x > 0); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null }
                  const cmpMainHR = avgOf(compForDisplay.filter(d => !d._comp), 'hr')
                  const cmpMainPace = avgOf(compForDisplay.filter(d => !d._comp), 'pace')
                  const cmpCompHR = avgOf(compForDisplay.filter(d => d._comp), 'compHr')
                  const cmpCompPace = avgOf(compForDisplay.filter(d => d._comp), 'compPace')
                  const cmpMainW = bgWorkoutId ? workouts.find(w => String(w.garmin_activity_id) === String(bgWorkoutId)) : a.tek
                  const cmpCompW = compWorkoutId ? workouts.find(w => String(w.garmin_activity_id) === String(compWorkoutId)) : (bgWorkoutId ? a.tek : null)
                  const fmtPace = p => { if (!p) return '—'; const s = Math.round(p); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` }
                  const paceDelta = (cmpMainPace != null && cmpCompPace != null) ? Math.round(cmpMainPace - cmpCompPace) : null // <0 = glavni hitrejši
                  const hrDelta = (cmpMainHR != null && cmpCompHR != null) ? Math.round(cmpMainHR - cmpCompHR) : null         // <0 = glavni nižji HR
                  let napredek = null
                  if (paceDelta != null && hrDelta != null) {
                    const faster = paceDelta <= -2, slower = paceDelta >= 2, lowerHR = hrDelta <= -2, higherHR = hrDelta >= 2
                    if ((faster && !higherHR) || (!slower && lowerHR)) napredek = { txt: 'napredek — boljša ekonomija (hitreje/lažje)', color: '#22c55e' }
                    else if ((slower && !lowerHR) || (!faster && higherHR)) napredek = { txt: 'nazadovanje — slabša ekonomija', color: '#ef4444' }
                    else napredek = { txt: 'mešano — primerjaj kontekst (teren, vreme)', color: '#94a3b8' }
                  }

                  return (
                    <div>
                      {/* 1. Cardiac drift — prva točka analize, samo easy segment */}
                      {decouplingPct !== null && (
                        <div style={{marginBottom:12,padding:'10px 14px',borderRadius:6,background:'#080f1e',border:`1px solid ${dcColor}22`}}>
                          <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',marginBottom:4}}>
                            <span style={{fontSize:11,color:'#475569',fontFamily:'DM Mono',textTransform:'uppercase',letterSpacing:'0.5px'}}>Pa:HR Cardiac Drift</span>
                            <span style={{fontWeight:700,color:dcColor,fontFamily:'DM Mono',fontSize:15}}>{decouplingPct > 0 ? '+' : ''}{decouplingPct}%</span>
                            <span style={{fontSize:11,color:dcColor,fontFamily:'DM Mono'}}>{dcLabel}</span>
                            {decouplingAvgPrev !== null && (() => {
                              const delta = decouplingPct - decouplingAvgPrev
                              const boljse = delta < -1, slabse = delta > 1
                              return (
                                <span style={{fontSize:10,color:'#334155',fontFamily:'DM Mono'}}>
                                  vs {TIP_LABEL_SHORT[tipTeka]} ({prevDecouplings.length}×):
                                  <span style={{color: boljse?'#22c55e':slabse?'#f97316':'#64748b',fontWeight:600,marginLeft:3}}>
                                    {decouplingAvgPrev>0?'+':''}{decouplingAvgPrev}% {boljse?'↑':slabse?'↓':'≈'}
                                  </span>
                                </span>
                              )
                            })()}
                          </div>
                          <div style={{fontSize:11,color:'#475569',fontFamily:'DM Mono',lineHeight:1.5}}>
                            {decouplingInterpretacija(decouplingPct)}
                          </div>
                        </div>
                      )}

                      {/* 2. Easy faza stats */}
                      <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:8,flexWrap:'wrap'}}>
                        <div style={{fontSize:11,color:'#475569',fontFamily:'DM Mono',textTransform:'uppercase',letterSpacing:'0.5px'}}>
                          {hasStructured ? 'Easy faza' : 'HR & Pace po km'}
                        </div>
                        {easyAvgHR && (
                          <span style={{fontSize:11,color:'#94a3b8',fontFamily:'DM Mono'}}>
                            povp. HR: <span style={{color:hrZonaColor(easyAvgHR),fontWeight:600}}>{easyAvgHR} bpm</span>
                          </span>
                        )}
                        {easyAvgPaceSec && (
                          <span style={{fontSize:11,color:'#94a3b8',fontFamily:'DM Mono'}}>
                            povp. tempo: <span style={{color:'#3b82f6',fontWeight:600}}>{Math.floor(easyAvgPaceSec/60)}:{String(easyAvgPaceSec%60).padStart(2,'0')}/km</span>
                          </span>
                        )}
                      </div>

                      {/* Legenda / zoom chips */}
                      {hasStructured && (
                        <div style={{display:'flex',gap:5,marginBottom:8,flexWrap:'wrap',alignItems:'center'}}>
                          {uniquePhases.map(ph => {
                            const isActive = activePhase === ph
                            const col = PHASE_COLOR[ph] || '#94a3b8'
                            return (
                              <button key={ph} onClick={() => setActivePhase(isActive ? null : ph)} style={{
                                padding:'3px 10px', borderRadius:4, cursor:'pointer', fontFamily:'DM Mono', fontSize:11,
                                border:`1px solid ${col}${isActive?'':55}`,
                                background: isActive ? col+'22' : 'transparent',
                                color: col, transition:'all .15s',
                              }}>
                                {phaseLabelOf(ph)}
                              </button>
                            )
                          })}
                          {activePhase && (
                            <button onClick={() => setActivePhase(null)} style={{
                              padding:'3px 10px', borderRadius:4, cursor:'pointer', fontFamily:'DM Mono', fontSize:11,
                              border:'1px solid #334155', background:'transparent', color:'#475569',
                            }}>× vse</button>
                          )}
                          <span style={{fontSize:10,color:'#1e3a5f',fontFamily:'DM Mono',marginLeft:4}}>
                            {activePhase ? `zoom: ${PHASE_LABEL[activePhase]}` : 'klikni fazo za zoom'}
                          </span>
                        </div>
                      )}


                      {/* Chart */}
                      {timeAxis && (
                        <div style={{fontSize:10,color:'#475569',fontFamily:'DM Mono',marginBottom:6}}>
                          os X = čas teka (min) · širina rezine = trajanje lapa{targetBands.length>0 ? ' · zelena cona = ciljni tempo' : ''}
                        </div>
                      )}
                      {activePhase && (
                        <div style={{fontSize:10,color:'#475569',fontFamily:'DM Mono',marginBottom:6}}>
                          os X = zaporedni lap v segmentu{showComp ? ' · poravnano: lap#1 vs lap#1 obeh tekov' : ''}{targetBands.length>0 ? ' · zelena cona = ciljni tempo' : ''}
                        </div>
                      )}
                      {showComp && (() => {
                        const compW = compWorkoutId ? workouts.find(w=>String(w.garmin_activity_id)===String(compWorkoutId)) : null
                        const bgW = bgWorkoutId ? workouts.find(w=>String(w.garmin_activity_id)===String(bgWorkoutId)) : null
                        const baseName = bgWorkoutId ? (bgW?.naziv || 'ozadje') : a.tek.naziv
                        const compName = compWorkoutId ? (compW?.naziv || 'primerjava') : a.tek.naziv
                        return (
                          <div style={{fontSize:11,color:'#475569',fontFamily:'DM Mono',marginBottom:6,display:'flex',gap:14,flexWrap:'wrap'}}>
                            <span style={{fontWeight:600,color:'#94a3b8'}}>━ {baseName} (glavni, polna)</span>
                            <span style={{opacity:0.5}}>━ {compName} (primerjava, ozadje)</span>
                          </div>
                        )
                      })()}
                      <ResponsiveContainer width="100%" height={220}>
                        <ComposedChart data={compForDisplay} margin={{top:4,right:8,left:4,bottom:0}}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e2433"/>
                          <XAxis dataKey="x" type="number"
                            domain={[xMin, xMax]}
                            ticks={xTicks}
                            tickFormatter={timeAxis ? (v => `${Math.round(v)}′`) : undefined}
                            tick={{fontSize:10,fill:'#475569',fontFamily:'DM Mono'}}
                            label={{value:timeAxis?'min':'lap',position:'insideBottomRight',offset:-2,fontSize:10,fill:'#475569'}}/>
                          <YAxis yAxisId="hr" domain={['auto','auto']} tick={{fontSize:10,fill:'#f97316',fontFamily:'DM Mono'}} width={32}/>
                          <YAxis yAxisId="pace" orientation="right" reversed={true} domain={[dispPaceMin,dispPaceMax]}
                            tick={{fontSize:10,fill:'#3b82f6',fontFamily:'DM Mono'}} width={38}
                            tickFormatter={v=>{const m=Math.floor(v/60),s=String(v%60).padStart(2,'0');return`${m}:${s}`}}/>
                          <Tooltip content={({active,payload}) => {
                            if (!active||!payload?.length) return null
                            const d = payload[0]?.payload
                            if (!d) return null
                            const fmtP = p => p ? `${Math.floor(p/60)}:${String(p%60).padStart(2,'0')}` : '—'
                            const compW = compWorkoutId ? workouts.find(w=>String(w.garmin_activity_id)===String(compWorkoutId)) : null
                            const bgW = bgWorkoutId ? workouts.find(w=>String(w.garmin_activity_id)===String(bgWorkoutId)) : null
                            const compName = compW?.naziv || bgW?.naziv || 'Primerjava'
                            // točka primerjalnega teka
                            if (d._comp) {
                              return (
                                <div style={{background:'#111827',border:'1px solid #94a3b844',borderRadius:8,padding:'8px 12px',fontSize:11,fontFamily:'DM Mono'}}>
                                  <div style={{color:'#94a3b8',fontWeight:600,marginBottom:4,fontSize:10}}>{compName}{d.idxComp?` · lap ${d.idxComp}`:''}</div>
                                  <div style={{color:'#f97316'}}>HR: {d.compHr??'—'} bpm</div>
                                  <div style={{color:'#3b82f6'}}>Pace: {fmtP(d.compPace)} /km</div>
                                </div>
                              )
                            }
                            // točka osnovnega teka
                            const ph = d.chartPhase || d.phase
                            const col = PHASE_COLOR[ph]||'#94a3b8'
                            return (
                              <div style={{background:'#111827',border:`1px solid ${col}44`,borderRadius:8,padding:'8px 12px',fontSize:11,fontFamily:'DM Mono'}}>
                                <div style={{color:col,fontWeight:600,marginBottom:4,fontSize:10}}>{phaseLabelOf(ph)}{d.idx?` · lap ${d.idx}`:''}{showComp?' · osnovni':''}</div>
                                <div style={{color:'#f97316'}}>HR: {d.hr??'—'} bpm</div>
                                <div style={{color:'#3b82f6'}}>Pace: {fmtP(d.pace)} /km</div>
                                {d.targetLow && d.targetHigh && (
                                  <div style={{color:'#22c55e'}}>Cilj: {fmtP(d.targetLow)}–{fmtP(d.targetHigh)} /km</div>
                                )}
                              </div>
                            )
                          }}/>
                          {/* Phase shading (poln pogled: faze; zoom: delovni ACTIVE lapi) */}
                          {shadeRanges.map((p,i) => (
                            <ReferenceArea key={i} yAxisId="hr" x1={p.start} x2={p.end}
                              fill={PHASE_COLOR[p.phase]||'#94a3b8'} fillOpacity={0.1}/>
                          ))}
                          {/* Ciljna pace cona (zelena) na intervalih — samo strukturiran tek z uvoženim targetom */}
                          {targetBands.map((d,i) => (
                            <ReferenceArea key={'tgt'+i} yAxisId="pace" x1={d.x1} x2={d.x2} y1={d.targetLow} y2={d.targetHigh}
                              fill="#22c55e" fillOpacity={0.12} stroke="#22c55e" strokeOpacity={0.45} strokeDasharray="3 3"/>
                          ))}
                          {/* Primerjalni tek = zbledel v ozadju (narisan prvi, da je glavni na vrhu) */}
                          {showComp && <Line yAxisId="hr" type="monotone" dataKey="compHr" stroke="#f97316" strokeWidth={1.5} strokeOpacity={0.32} dot={false} connectNulls={true}/>}
                          {showComp && <Line yAxisId="pace" type="monotone" dataKey="compPace" stroke="#3b82f6" strokeWidth={1.5} strokeOpacity={0.32} dot={false} connectNulls={true}/>}
                          {/* Glavni (zadnji) tek = polna črta v ospredju */}
                          <Line yAxisId="hr" type="monotone" dataKey="hr" stroke="#f97316"
                            strokeWidth={2} strokeOpacity={1}
                            dot={{r: showComp ? 3 : 4, fill:'#f97316'}} activeDot={{r:6}} name="HR" connectNulls={showComp}/>
                          <Line yAxisId="pace" type="monotone" dataKey="pace" stroke="#3b82f6"
                            strokeWidth={2} strokeOpacity={1}
                            dot={{r: showComp ? 3 : 4, fill:'#3b82f6'}} activeDot={{r:6}} name="Pace" connectNulls={showComp}/>
                        </ComposedChart>
                      </ResponsiveContainer>

                      {/* Primerjalne številke: tempo, HR, napredek */}
                      {showComp && cmpMainPace != null && (
                        <div style={{ marginTop: 12, padding: '10px 14px', background: '#080f1e', border: '1px solid #1e2433', borderRadius: 8 }}>
                          <div style={{ fontSize: 10, color: '#475569', fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>
                            Primerjava{activePhase ? ` · ${phaseLabelOf(activePhase)} segment` : ''}
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr', gap: 6, fontSize: 12, fontFamily: 'DM Mono', alignItems: 'center' }}>
                            <div></div>
                            <div style={{ color: '#475569', fontSize: 10, textAlign: 'right' }}>TEMPO /km</div>
                            <div style={{ color: '#475569', fontSize: 10, textAlign: 'right' }}>POVP. HR</div>

                            <div style={{ color: '#cbd5e1' }}>{cmpMainW?.naziv || 'Glavni'} <span style={{ color: '#475569' }}>{cmpMainW?.datum?.slice(5)}</span></div>
                            <div style={{ textAlign: 'right', color: '#3b82f6', fontWeight: 600 }}>{fmtPace(cmpMainPace)}</div>
                            <div style={{ textAlign: 'right', color: hrZonaColor(Math.round(cmpMainHR)), fontWeight: 600 }}>{cmpMainHR ? Math.round(cmpMainHR) : '—'}</div>

                            <div style={{ color: '#94a3b8' }}>{cmpCompW?.naziv || 'Primerjava'} <span style={{ color: '#475569' }}>{cmpCompW?.datum?.slice(5)}</span></div>
                            <div style={{ textAlign: 'right', color: '#3b82f6', opacity: 0.65 }}>{fmtPace(cmpCompPace)}</div>
                            <div style={{ textAlign: 'right', color: '#94a3b8', opacity: 0.65 }}>{cmpCompHR ? Math.round(cmpCompHR) : '—'}</div>
                          </div>
                          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #1e2433', display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 11, fontFamily: 'DM Mono' }}>
                            {paceDelta != null && <span style={{ color: '#64748b' }}>Δ tempo: <span style={{ color: paceDelta < 0 ? '#22c55e' : paceDelta > 0 ? '#f97316' : '#94a3b8', fontWeight: 600 }}>{paceDelta === 0 ? 'enako' : `${Math.abs(paceDelta)} s/km ${paceDelta < 0 ? 'hitreje' : 'počasneje'}`}</span></span>}
                            {hrDelta != null && <span style={{ color: '#64748b' }}>Δ HR: <span style={{ color: hrDelta < 0 ? '#22c55e' : hrDelta > 0 ? '#f97316' : '#94a3b8', fontWeight: 600 }}>{hrDelta === 0 ? 'enako' : `${Math.abs(hrDelta)} bpm ${hrDelta < 0 ? 'nižje' : 'višje'}`}</span></span>}
                            {napredek && <span style={{ color: napredek.color, fontWeight: 600 }}>→ {napredek.txt}</span>}
                          </div>
                          <div style={{ marginTop: 6, fontSize: 9, color: '#334155', fontFamily: 'DM Mono' }}>glavni tek (ospredje) glede na primerjalni (ozadje)</div>
                        </div>
                      )}

                    </div>
                  )
                })()}
              </div>
            )
          })()}
          <div style={{marginBottom:14}}>
            <div style={{fontSize:11,color:'#475569',marginBottom:6,fontFamily:'DM Mono',textTransform:'uppercase',letterSpacing:'0.5px'}}>Primerjava tekov</div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              <div style={{flex:1,minWidth:200}}>
                <div style={{fontSize:10,color:'#334155',fontFamily:'DM Mono',marginBottom:4}}>Glavni tek (ospredje)</div>
                <select
                  value={bgWorkoutId || ''}
                  onChange={e => setBgWorkoutId(e.target.value || null)}
                  style={{background:'#1e2433',border:'1px solid #334155',borderRadius:6,color:'#94a3b8',fontSize:12,padding:'6px 12px',fontFamily:'DM Mono',cursor:'pointer',width:'100%'}}
                >
                  <option value="">{a.tek.datum} — {a.tek.naziv} (zadnji)</option>
                  {workouts
                    .filter(w => isTek(w) && w.razdalja_km > 0 && w.garmin_activity_id !== a.tek.garmin_activity_id)
                    .sort((x,y) => y.datum.localeCompare(x.datum))
                    .slice(0, 25)
                    .map(w => (
                      <option key={w.garmin_activity_id || w.id} value={w.garmin_activity_id}>
                        {w.datum} — {w.naziv} ({fmt(w.razdalja_km)} km)
                      </option>
                    ))
                  }
                </select>
              </div>
              <div style={{flex:1,minWidth:200}}>
                <div style={{fontSize:10,color:'#334155',fontFamily:'DM Mono',marginBottom:4}}>Primerjalni tek (ozadje)</div>
                <select
                  value={compWorkoutId || ''}
                  onChange={e => setCompWorkoutId(e.target.value || null)}
                  style={{background:'#1e2433',border:'1px solid #334155',borderRadius:6,color:'#94a3b8',fontSize:12,padding:'6px 12px',fontFamily:'DM Mono',cursor:'pointer',width:'100%'}}
                >
                  <option value="">— Izberi tek —</option>
                  {workouts
                    .filter(w => isTek(w) && w.razdalja_km > 0 && w.garmin_activity_id !== a.tek.garmin_activity_id)
                    .sort((x,y) => y.datum.localeCompare(x.datum))
                    .slice(0, 25)
                    .map(w => (
                      <option key={w.garmin_activity_id || w.id} value={w.garmin_activity_id}>
                        {w.datum} — {w.naziv} ({fmt(w.razdalja_km)} km)
                      </option>
                    ))
                  }
                </select>
              </div>
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
