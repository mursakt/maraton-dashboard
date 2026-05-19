import React, { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { LineChart, Line, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend, ComposedChart } from 'recharts'
import './App.css'
import { StatCard } from './components/StatCard'
import { ProgressBar } from './components/ProgressBar'
import { tempoStrToSec, secToTempoStr, secToHMS } from './utils/tempo'
import { fmt, hrZona, hrZonaColor, isTek, formaColor, formaLabel, pripravljenostColor, pripravljenostLabel } from './utils/helpers'
import { PLAN, PLAN_TRENINGI, CILJI, FAZA_COLOR, FAZA_LABEL, TODAY, TODAY_STR, YESTERDAY_STR, getCurrentTeden } from './constants/plan'
import { izracunajLoad, izracunajPripravljenost, opozoriloPredTreningom } from './utils/calculations'
import { TabPregled } from './components/TabPregled'
import { NaslednjihPetTreningov } from './components/NaslednjihPetTreningov'
import { TabPredikcija } from './components/TabPredikcija'
import { TabCilji } from './components/TabCilji'
import { TabPrehrana } from './components/TabPrehrana'
import { TabTreningi } from './components/TabTreningi'


function izracunajFormo(hrv, spanje, stres, workouts) {
  let score = 0; let factors = 0
  if (hrv) { const h = hrv<30?1:hrv<40?3:hrv<50?5:hrv<60?7:hrv<70?8:10; score+=h*0.35; factors+=0.35 }
  if (spanje) { const s = spanje<5?1:spanje<6?3:spanje<6.5?5:spanje<7?6:spanje<7.5?7.5:spanje<8?9:10; score+=s*0.3; factors+=0.3 }
  if (stres) { const st = stres>75?1:stres>60?3:stres>45?5:stres>35?6:stres>25?8:10; score+=st*0.2; factors+=0.2 }
  // Load faktor
  if (workouts && workouts.length > 0) {
    const { razmerje } = izracunajLoad(workouts)
    if (razmerje !== null) {
      const l = razmerje <= 0.8 ? 8 : razmerje <= 1.3 ? 10 : razmerje <= 1.5 ? 6 : 3
      score += l * 0.15; factors += 0.15
    }
  }
  if (factors===0) return null
  return Math.round((score/factors)*10)/10
}



// AI Analiza zadnjega teka
function AnalizaTeka({ workouts, metrike, prehrana }) {
  const [analiza, setAnaliza] = React.useState(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState(null)

  const zadnjiTek = workouts.find(w => isTek(w))

  React.useEffect(() => {
    if (!zadnjiTek) return
    fetchAnaliza()
  }, [zadnjiTek?.garmin_activity_id])

  async function fetchAnaliza() {
    if (!zadnjiTek) return
    setLoading(true)
    setError(null)

    const tekDatum = zadnjiTek.datum
    const danPred = new Date(new Date(tekDatum) - 86400000).toISOString().slice(0, 10)
    const metrikeDanPred = metrike.find(m => m.datum === danPred) || {}
    const prehranaVceraj = prehrana.find(p => p.datum === danPred && p.kalorije_skupaj > 0) || {}
    const metrikeTekDan = metrike.find(m => m.datum === tekDatum) || {}
    const hrDrift = zadnjiTek.max_hr && zadnjiTek.povprecni_hr ? zadnjiTek.max_hr - zadnjiTek.povprecni_hr : null

    const podatki = [
      "PODATKI TEKA (" + tekDatum + "):",
      "- Naziv: " + zadnjiTek.naziv,
      "- Razdalja: " + zadnjiTek.razdalja_km + " km",
      "- Čas: " + zadnjiTek.trajanje_min + " min",
      "- Povprečni tempo: " + (zadnjiTek.povprecni_tempo || 'ni podatka') + " /km",
      "- Povprečni HR: " + zadnjiTek.povprecni_hr + " bpm",
      "- Max HR: " + zadnjiTek.max_hr + " bpm",
      "- HR razpon max-avg (cardiac drift indikator): " + (hrDrift ? hrDrift + " bpm" : "ni podatka"),
      "- Aerobni Training Effect: " + (zadnjiTek.aerobni_te || "ni podatka"),
      "- Anaerobni Training Effect: " + (zadnjiTek.anaerobni_te || "ni podatka"),
      "- VO2max: " + (zadnjiTek.vo2max || "ni podatka"),
      "- Kalorije: " + (zadnjiTek.kalorije || "ni podatka") + " kcal",
      "",
      "DAN PRED TEKOM (" + danPred + "):",
      "- Kalorije: " + (prehranaVceraj.kalorije_skupaj ? Math.round(prehranaVceraj.kalorije_skupaj) + " kcal" : "ni podatka"),
      "- Ogljikovi hidrati: " + (prehranaVceraj.ogljikovi_hidrati_g ? Math.round(prehranaVceraj.ogljikovi_hidrati_g) + "g" : "ni podatka"),
      "- Beljakovine: " + (prehranaVceraj.beljakovine_g ? Math.round(prehranaVceraj.beljakovine_g) + "g" : "ni podatka"),
      "- HRV: " + (metrikeDanPred.hrv ? metrikeDanPred.hrv + " ms" : "ni podatka"),
      "- Spanje: " + (metrikeDanPred.spanje_h ? metrikeDanPred.spanje_h + " h" : "ni podatka"),
      "- Stres: " + (metrikeDanPred.stres_povprecje || "ni podatka"),
      "",
      "DAN TEKA:",
      "- HRV: " + (metrikeTekDan.hrv ? metrikeTekDan.hrv + " ms" : "ni podatka"),
      "- Stres: " + (metrikeTekDan.stres_povprecje || "ni podatka"),
    ].join("\n")

    const prompt = "Si strokovnjak za analizo teka in maratonske priprave. Analiziraj naslednji tek in pojasni zakaj je bil lahek ali težak. Bodi konkreten, ne splošen. Piši v slovenščini. NE omenjaj ciljev ali priporočil - samo analiziraj kaj se je zgodilo na podlagi podatkov.\n\n" + podatki + "\n\nAnaliziraj:\n1. Tempo in HR dinamika (je bil cardiac drift prisoten glede na razliko max-avg HR?)\n2. Vpliv prehrane dan prej na glikogenske rezerve\n3. Vpliv spanja in HRV na regeneracijo\n4. Kaj pove Training Effect o naporu\n5. Splošna ocena\n\nOdgovori SAMO z JSON formatom brez markdown:\n{\"ocena\": \"težak ali zmerno ali lahek\", \"emoji\": \"emoji\", \"tocke\": [\"točka1\", \"točka2\", \"točka3\", \"točka4\", \"točka5\"]}"

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }]
        })
      })
      const data = await response.json()
      const text = data.content && data.content[0] ? data.content[0].text : ''
      const start = text.indexOf('{')
      const end = text.lastIndexOf('}')
      if (start !== -1 && end !== -1) {
        const parsed = JSON.parse(text.slice(start, end + 1))
        setAnaliza(parsed)
      } else {
        setError('Napaka pri analizi')
      }
    } catch(e) {
      setError('Napaka: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  if (!zadnjiTek) return null

  const ocenaColor = analiza ? (analiza.ocena === 'težak' ? '#fcd34d' : analiza.ocena === 'lahek' ? '#86efac' : '#94a3b8') : '#94a3b8'
  const ocenaBg = analiza ? (analiza.ocena === 'težak' ? '#45180333' : analiza.ocena === 'lahek' ? '#05291633' : '#1e243333') : '#1e243333'

  return (
    <div className="card" style={{marginBottom:16}}>
      <h3>🤖 AI Analiza zadnjega teka — {zadnjiTek.naziv} ({zadnjiTek.datum})</h3>
      <div style={{display:'flex',gap:16,marginBottom:12,flexWrap:'wrap',alignItems:'center'}}>
        <span style={{fontFamily:'DM Mono',fontSize:13,color:'#94a3b8'}}>{fmt(zadnjiTek.razdalja_km)} km</span>
        <span style={{fontFamily:'DM Mono',fontSize:13,color:'#94a3b8'}}>{zadnjiTek.povprecni_tempo}/km</span>
        <span style={{fontFamily:'DM Mono',fontSize:13,color:hrZonaColor(zadnjiTek.povprecni_hr)}}>{zadnjiTek.povprecni_hr} avg · {zadnjiTek.max_hr} max bpm</span>
        <span style={{fontFamily:'DM Mono',fontSize:12,color:'#64748b'}}>TE: {fmt(zadnjiTek.aerobni_te,1)}</span>
        {analiza && (
          <span style={{fontSize:13,padding:'2px 10px',borderRadius:4,background:ocenaBg,color:ocenaColor,fontWeight:600}}>
            {analiza.emoji} {analiza.ocena.charAt(0).toUpperCase() + analiza.ocena.slice(1)}
          </span>
        )}
      </div>
      {loading && (
        <div style={{padding:'16px 0',color:'#64748b',fontSize:13}}>⟳ Claude analizira tek...</div>
      )}
      {error && <div className="alert warn">{error}</div>}
      {analiza && (
        <div>
          {analiza.tocke.map((t, i) => (
            <div key={i} style={{display:'flex',gap:10,padding:'8px 12px',borderRadius:6,marginBottom:6,background:'#0f172a',border:'1px solid #1e2433',fontSize:13,color:'#94a3b8',alignItems:'flex-start'}}>
              <span style={{color:'#475569',fontFamily:'DM Mono',fontSize:11,minWidth:20,marginTop:1}}>{i+1}.</span>
              <span style={{lineHeight:1.5}}>{t}</span>
            </div>
          ))}
        </div>
      )}
      {!loading && !analiza && !error && (
        <button onClick={fetchAnaliza} style={{padding:'8px 16px',background:'#1e2433',border:'1px solid #2d3748',borderRadius:6,color:'#94a3b8',cursor:'pointer',fontSize:13}}>
          Analiziraj tek
        </button>
      )}
    </div>
  )
}




function izracunajPredikcijo(workouts, metrike) {
  const teki = workouts.filter(w => isTek(w) && w.razdalja_km > 0 && w.povprecni_hr > 0)
  if (teki.length === 0) return null
  const vo2Teki = teki.filter(w => w.vo2max && w.vo2max > 0)
  const avgVo2 = vo2Teki.length > 0 ? vo2Teki.reduce((s, w) => s + w.vo2max, 0) / vo2Teki.length : null
  let casVo2 = null
  let vo2Uporabljen = null
  if (avgVo2) {
    vo2Uporabljen = avgVo2
    const vVO2max = 29.54 + 5.000663 * avgVo2 - 0.007546 * avgVo2 * avgVo2
    const maraTempoMMin = vVO2max * 0.77
    const maraTempoSecKm = 1000 / maraTempoMMin * 60
    casVo2 = maraTempoSecKm * 42.195
  }
  const hrTempoTocke = teki.filter(w => w.povprecni_hr >= 130 && w.povprecni_hr <= 175 && w.povprecni_tempo).map(w => ({ hr: w.povprecni_hr, tempoSec: tempoStrToSec(w.povprecni_tempo), datum: w.datum })).filter(p => p.tempoSec !== null)
  let casHR = null
  let tempoNa155 = null
  if (hrTempoTocke.length >= 2) {
    const n = hrTempoTocke.length
    const sumHR = hrTempoTocke.reduce((s, p) => s + p.hr, 0)
    const sumT = hrTempoTocke.reduce((s, p) => s + p.tempoSec, 0)
    const sumHR2 = hrTempoTocke.reduce((s, p) => s + p.hr * p.hr, 0)
    const sumHRT = hrTempoTocke.reduce((s, p) => s + p.hr * p.tempoSec, 0)
    const slope = (n * sumHRT - sumHR * sumT) / (n * sumHR2 - sumHR * sumHR)
    const intercept = (sumT - slope * sumHR) / n
    const maraHR = 163
    const maraTempoSec = slope * maraHR + intercept
    tempoNa155 = slope * 155 + intercept
    casHR = maraTempoSec * 42.195
  }
  let casBaza
  if (casVo2 && casHR) { casBaza = casVo2 * 0.6 + casHR * 0.4 }
  else if (casVo2) { casBaza = casVo2 }
  else if (casHR) { casBaza = casHR }
  else { return null }
  const zadnjaTeza = metrike.find(m => m.teza_kg)?.teza_kg
  const tezaKorekcija = zadnjaTeza ? (zadnjaTeza - 97) * 1.5 * 60 : 0
  const tedniMap = {}
  teki.forEach(w => {
    const d = new Date(w.datum); const mon = new Date(d); mon.setDate(d.getDate() - ((d.getDay() + 6) % 7))
    const key = mon.toISOString().slice(0, 10)
    tedniMap[key] = (tedniMap[key] || 0) + (w.razdalja_km || 0)
  })
  const maxKm = Math.max(...Object.values(tedniMap), 0)
  const kmKorekcija = maxKm < 35 ? 5 * 60 : maxKm > 50 ? -3 * 60 : 0
  const prvicKorekcija = 8 * 60
  const casFinal = casBaza + tezaKorekcija + kmKorekcija + prvicKorekcija
  let zanesljivost = 0
  let zanesljivostRazlogi = []
  if (teki.length >= 10) { zanesljivost += 25; zanesljivostRazlogi.push(`${teki.length} tekov v bazi ✓`) }
  else if (teki.length >= 5) { zanesljivost += 15; zanesljivostRazlogi.push(`${teki.length} tekov (optimalno 10+)`) }
  else { zanesljivost += 5; zanesljivostRazlogi.push(`samo ${teki.length} teki`) }
  if (vo2Teki.length >= 3) { zanesljivost += 25; zanesljivostRazlogi.push(`VO2max iz ${vo2Teki.length} meritev ✓`) }
  else if (vo2Teki.length > 0) { zanesljivost += 15; zanesljivostRazlogi.push(`VO2max samo ${vo2Teki.length} meritev`) }
  else { zanesljivostRazlogi.push('ni VO2max podatkov') }
  if (hrTempoTocke.length >= 5) { zanesljivost += 25; zanesljivostRazlogi.push('dobra HR-tempo korelacija ✓') }
  else if (hrTempoTocke.length >= 2) { zanesljivost += 15; zanesljivostRazlogi.push('osnovna HR-tempo korelacija') }
  else { zanesljivostRazlogi.push('premalo HR-tempo točk') }
  const currentTeden = getCurrentTeden()
  if (currentTeden >= 16) { zanesljivost += 25; zanesljivostRazlogi.push('pozna faza priprav ✓') }
  else if (currentTeden >= 10) { zanesljivost += 15; zanesljivostRazlogi.push(`T${currentTeden} — sredina priprav`) }
  else { zanesljivost += 5; zanesljivostRazlogi.push(`T${currentTeden} — zgodnja faza`) }
  zanesljivost = Math.min(zanesljivost, 95)
  let trend = null
  if (hrTempoTocke.length >= 4) {
    const sorted = [...hrTempoTocke].sort((a, b) => a.datum.localeCompare(b.datum))
    const prviDel = sorted.slice(0, Math.floor(sorted.length / 2))
    const zadnjiDel = sorted.slice(Math.floor(sorted.length / 2))
    const avgTempoZgodaj = prviDel.reduce((s, p) => s + p.tempoSec, 0) / prviDel.length
    const avgTempoKasno = zadnjiDel.reduce((s, p) => s + p.tempoSec, 0) / zadnjiDel.length
    trend = (avgTempoZgodaj - avgTempoKasno) * 42.195
  }
  return { casFinal, casVo2, casHR, zanesljivost, zanesljivostRazlogi, tezaKorekcija, kmKorekcija, prvicKorekcija, trend, tempoNa155, vo2Uporabljen, maxKm, steviloTekov: teki.length, zadnjaTeza }
}



export default function App() {
  const [tab, setTab] = useState('pregled')
  React.useEffect(() => { window._setTab = setTab }, [setTab])
  const [workouts, setWorkouts] = useState([])
  const [metrike, setMetrike] = useState([])
  const [prehrana, setPrehrana] = useState([])
  const [laps, setLaps] = useState([])
  const [prehranaCilji, setPrehranaCilji] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const currentTeden = getCurrentTeden()

  const fetchAll = React.useCallback(async () => {
      setLoading(true)
      try {
        const [w,m,p,l,pc] = await Promise.all([
          supabase.from('workouts').select('*').order('datum',{ascending:false}).limit(100),
          supabase.from('dnevne_metrike').select('*').order('datum',{ascending:false}).limit(120),
          supabase.from('prehrana').select('*').order('datum',{ascending:false}).limit(60),
          supabase.from('laps').select('*').order('datum',{ascending:false}).limit(500),
          supabase.from('prehrana_cilji').select('*').order('datum',{ascending:false}).limit(60),
        ])
        if(w.error)throw w.error; if(m.error)throw m.error; if(p.error)throw p.error
        setWorkouts(w.data||[]); setMetrike(m.data||[]); setPrehrana(p.data||[]); setLaps(l.data||[]); setPrehranaCilji(pc.data||[])
      } catch(e){setError(e.message)} finally{setLoading(false)}
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  if(loading) return(<div className="app"><div className="loading">Nalagam podatke…</div></div>)
  if(error) return(<div className="app"><div className="alert warn">⚠️ Napaka: {error}</div></div>)

  const planTeden = PLAN.find(p=>p.teden===currentTeden)
  const faza = planTeden?.faza||'F1'
  const zadnjeMetrike = metrike[0]||{}
  const formaScore = izracunajFormo(zadnjeMetrike.hrv, zadnjeMetrike.spanje_h, zadnjeMetrike.stres_povprecje, workouts)
  const predikcija = izracunajPredikcijo(workouts, metrike)

  return (
    <div className="app">
      <div className="header">
        <h1>Fitness Tracker TM</h1>
        <div style={{fontSize:10,color:'#2d3748',fontFamily:'DM Mono',marginTop:2,userSelect:'all'}}>https://maraton-dashboard.vercel.app/api/data</div>
        <div className="teden-badge">Teden <span>T{String(currentTeden).padStart(2,'0')}</span> · <span style={{color:FAZA_COLOR[faza]}}>{FAZA_LABEL[faza]}</span></div>
      </div>
      <div className="tabs">
        {['pregled','treningi','telo','prehrana','cilji','plan','predikcija'].map(t=>(
          <button key={t} className={`tab ${tab===t?'active':''}`} onClick={()=>setTab(t)}>
            {{pregled:'🏠 Pregled',treningi:'🏃 Treningi',telo:'❤️ Telo & HRV',prehrana:'🥗 Prehrana',cilji:'🎯 Cilji',plan:'📅 Plan',predikcija:'📈 Predikcija'}[t]}
          </button>
        ))}
      </div>
      {tab==='pregled'&&<TabPregled workouts={workouts} metrike={metrike} prehrana={prehrana} laps={laps} prehranaCilji={prehranaCilji} currentTeden={currentTeden} formaScore={formaScore} predikcija={predikcija}/>}
      {tab==='treningi'&&<TabTreningi workouts={workouts} metrike={metrike} prehrana={prehrana} laps={laps}/>}
      {tab==='telo'&&<TabTelo metrike={metrike} workouts={workouts}/>}
      {tab==='prehrana'&&<TabPrehrana prehrana={prehrana} workouts={workouts} metrike={metrike} prehranaCilji={prehranaCilji} onRefresh={fetchAll}/>}
      {tab==='cilji'&&<TabCilji prehranaCilji={prehranaCilji} onRefresh={fetchAll}/>}
      {tab==='plan'&&<TabPlan currentTeden={currentTeden}/>}
      {tab==='predikcija'&&<TabPredikcija predikcija={predikcija} workouts={workouts}/>}
    </div>
  )
}







function TabTelo({metrike, workouts=[]}){
  const tezaDejansko=metrike.filter(m=>m.teza_kg).slice(0,60).reverse()
  const tezaGraf=tezaDejansko.map(m=>{
    const p=PLAN.slice().reverse().find(pl=>pl.datum<=m.datum)
    return{datum:m.datum?.slice(5),dejanska:m.teza_kg,plan:p?.ciljnaKg||null}
  })
  const hrvData=metrike.filter(m=>m.hrv).slice(0,28).reverse().map(m=>({datum:m.datum?.slice(5),hrv:m.hrv}))
  const spanjeData=metrike.filter(m=>m.spanje_h).slice(0,14).reverse().map(m=>({datum:m.datum?.slice(5),ure:m.spanje_h}))
  const formaData=metrike.slice(0,14).reverse().map(m=>({datum:m.datum?.slice(5),forma:izracunajFormo(m.hrv,m.spanje_h,m.stres_povprecje)})).filter(d=>d.forma!==null)
  const bbData=metrike.filter(m=>m.body_battery_charged||m.body_battery_drained).slice(0,14).reverse().map(m=>({datum:m.datum?.slice(5),charged:m.body_battery_charged,drained:m.body_battery_drained,net:(m.body_battery_charged||0)-(m.body_battery_drained||0)}))
  const restingHrData=metrike.filter(m=>m.resting_hr).slice(0,20).reverse().map(m=>({datum:m.datum?.slice(5),hr:m.resting_hr}))
  const korakiData=metrike.filter(m=>m.koraki).slice(0,14).reverse().map(m=>({datum:m.datum?.slice(5),koraki:m.koraki}))
  const vigorousData=metrike.filter(m=>m.vigorous_intensity_min).slice(0,8).reverse().map(m=>({datum:m.datum?.slice(5),min:m.vigorous_intensity_min}))
  const z=metrike[0]||{}
  const avgSpanje=metrike.filter(m=>m.spanje_h).slice(0,7).reduce((s,m,_,a)=>s+m.spanje_h/a.length,0)
  const avgHRV=metrike.filter(m=>m.hrv).slice(0,7).reduce((s,m,_,a)=>s+m.hrv/a.length,0)
  const zadnjaTeza=metrike.find(m=>m.teza_kg)?.teza_kg
  const formaScore=izracunajFormo(z.hrv,z.spanje_h,z.stres_povprecje,workouts)

  const zadnjiBB = metrike.find(m=>m.body_battery_charged||m.body_battery_drained)||{}
  const zadnjiRestHR = metrike.find(m=>m.resting_hr)||{}
  const zadnjiKoraki = metrike.find(m=>m.koraki)||{}
  const avgKoraki7 = Math.round(metrike.filter(m=>m.koraki).slice(0,7).reduce((s,m,_,a)=>s+m.koraki/a.length,0))
  const bbNet = (zadnjiBB.body_battery_charged||0) - (zadnjiBB.body_battery_drained||0)

  return(<>
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
    <div className="grid3" style={{marginBottom:16}}>
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
        <h3>Koraki <span style={{fontSize:11,color:'#475569',fontFamily:'DM Mono',fontWeight:400}}>({metrike.find(m=>m.koraki)?.datum||'—'})</span></h3>
        <div><span className="stat-val" style={{color:zadnjiKoraki.koraki?(zadnjiKoraki.koraki>=10000?'#22c55e':zadnjiKoraki.koraki>=7000?'#eab308':'#f97316'):'#6b7280'}}>{zadnjiKoraki.koraki?(zadnjiKoraki.koraki/1000).toFixed(1)+'k':'—'}</span></div>
        <div className="stat-sub">povp. 7 dni: {avgKoraki7?(avgKoraki7/1000).toFixed(1)+'k':'—'} · cilj: 10k</div>
      </div>
    </div>
    <div className="card" style={{marginBottom:16}}>
      <h3>Teža — dejanska vs plan (kg)</h3>
      {tezaGraf.length>1?(
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={tezaGraf} margin={{top:4,right:4,left:-20,bottom:0}}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2433"/>
            <XAxis dataKey="datum" tick={{fontSize:10,fill:'#475569',fontFamily:'DM Mono'}} interval="preserveStartEnd"/>
            <YAxis domain={['auto','auto']} tick={{fontSize:10,fill:'#475569',fontFamily:'DM Mono'}}/>
            <Tooltip contentStyle={{background:'#111827',border:'1px solid #1e2433',borderRadius:8,fontSize:12}}/>
            <Legend wrapperStyle={{fontSize:11,color:'#94a3b8'}}/>
            <Line type="monotone" dataKey="dejanska" stroke="#3b82f6" strokeWidth={2} dot={false} name="Dejanska"/>
            <Line type="monotone" dataKey="plan" stroke="#475569" strokeWidth={1} strokeDasharray="4 4" dot={false} name="Plan"/>
          </LineChart>
        </ResponsiveContainer>
      ):<div className="empty">Ni dovolj podatkov</div>}
    </div>
    <div className="grid2">
      <div className="card">
        <h3>HRV (ms)</h3>
        {hrvData.length>1?(
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={hrvData} margin={{top:4,right:4,left:-20,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2433"/>
              <XAxis dataKey="datum" tick={{fontSize:10,fill:'#475569',fontFamily:'DM Mono'}} interval="preserveStartEnd"/>
              <YAxis domain={[30, 100]} tick={{fontSize:10,fill:'#475569',fontFamily:'DM Mono'}}/>
              <Tooltip contentStyle={{background:'#111827',border:'1px solid #1e2433',borderRadius:8,fontSize:12}}/>
              <ReferenceLine y={50} stroke="#22c55e" strokeDasharray="4 4"/>
              <Line type="monotone" dataKey="hrv" stroke="#22c55e" strokeWidth={2} dot={false}/>
            </LineChart>
          </ResponsiveContainer>
        ):<div className="empty">Ni dovolj podatkov</div>}
      </div>
  {/* Resting HR trend */}
    {restingHrData.length > 1 && (
      <div className="card" style={{marginBottom:16}}>
        <h3>Mirovni HR trend</h3>
        <div style={{fontSize:11,color:'#475569',marginBottom:8,fontFamily:'DM Mono'}}>Nižji = boljša aerobna adaptacija</div>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={restingHrData} margin={{top:4,right:8,left:-10,bottom:0}}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2433"/>
            <XAxis dataKey="datum" tick={{fontSize:10,fill:'#475569',fontFamily:'DM Mono'}} interval="preserveStartEnd"/>
            <YAxis domain={['auto','auto']} tick={{fontSize:10,fill:'#475569',fontFamily:'DM Mono'}}/>
            <Tooltip contentStyle={{background:'#111827',border:'1px solid #1e2433',borderRadius:8,fontSize:12}} formatter={v=>[`${v} bpm`,'Mirovni HR']}/>
            <Line type="monotone" dataKey="hr" stroke="#3b82f6" strokeWidth={2} dot={{r:3,fill:'#3b82f6'}}/>
          </LineChart>
        </ResponsiveContainer>
      </div>
    )}    <div className="card">
      <h3>Spanje (ure) — zadnjih 14 dni</h3>
      {spanjeData.length>1?(
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={spanjeData} margin={{top:4,right:0,left:-20,bottom:0}}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2433"/>
            <XAxis dataKey="datum" tick={{fontSize:10,fill:'#475569',fontFamily:'DM Mono'}}/>
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

    {/* Body Battery graf */}

    {/* Koraki graf */}
    {korakiData.length > 1 && (
      <div className="card" style={{marginBottom:16}}>
        <h3>Koraki — zadnjih 14 dni</h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={korakiData} margin={{top:4,right:8,left:-10,bottom:0}}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2433"/>
            <XAxis dataKey="datum" tick={{fontSize:10,fill:'#475569',fontFamily:'DM Mono'}} interval="preserveStartEnd"/>
            <YAxis tick={{fontSize:10,fill:'#475569',fontFamily:'DM Mono'}} tickFormatter={v=>v>=1000?`${(v/1000).toFixed(1)}k`:v}/>
            <Tooltip contentStyle={{background:'#111827',border:'1px solid #1e2433',borderRadius:8,fontSize:12}} formatter={v=>[`${v.toLocaleString()} korakov`,'']}/>
            <ReferenceLine y={10000} stroke="#475569" strokeDasharray="4 3" strokeOpacity={0.5}/>
            <ReferenceLine y={10000} stroke="#475569" strokeDasharray="5 3" strokeWidth={1.5} strokeOpacity={0.7}/>
            <Bar dataKey="koraki" radius={[3,3,0,0]} fill="#22c55e">
              {korakiData.map((d,i)=>(
                <Cell key={i} fill={d.koraki>=10000?'#22c55e':'#ef4444'}/>
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    )}

    <div className="grid2" style={{marginBottom:16}}>
      <div className="card">
        <h3>Forma trend (zadnjih 14 dni)</h3>
        {formaData.length>1?(
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={formaData} margin={{top:4,right:4,left:-20,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2433"/>
              <XAxis dataKey="datum" tick={{fontSize:10,fill:'#475569',fontFamily:'DM Mono'}} interval="preserveStartEnd"/>
              <YAxis domain={[3,10]} tick={{fontSize:10,fill:'#475569',fontFamily:'DM Mono'}}/>
              <Tooltip contentStyle={{background:'#111827',border:'1px solid #1e2433',borderRadius:8,fontSize:12}} formatter={v=>[fmt(v,1),'Forma']}/>
              <ReferenceLine y={6} stroke="#eab308" strokeDasharray="5 3" strokeWidth={1.5} strokeOpacity={0.7}/>
              <Line type="monotone" dataKey="forma" stroke="#f59e0b" strokeWidth={2} dot={{r:3,fill:'#f59e0b'}}/>
            </LineChart>
          </ResponsiveContainer>
        ):<div className="empty">Ni dovolj podatkov</div>}
      </div>
      {bbData.length > 1 && (
        <div className="card">
          <h3>Body Battery — zadnjih 14 dni</h3>
          <div style={{fontSize:11,color:'#475569',marginBottom:8,fontFamily:'DM Mono'}}>🟢 Polnjenje · 🔴 Praznjenje · Neto bilanca</div>
          <ResponsiveContainer width="100%" height={180}>
            <ComposedChart data={bbData} margin={{top:4,right:8,left:-10,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2433"/>
              <XAxis dataKey="datum" tick={{fontSize:10,fill:'#475569',fontFamily:'DM Mono'}} interval="preserveStartEnd"/>
              <YAxis tick={{fontSize:10,fill:'#475569',fontFamily:'DM Mono'}}/>
              <Tooltip contentStyle={{background:'#111827',border:'1px solid #1e2433',borderRadius:8,fontSize:12}}
                formatter={(v,n)=>n==='charged'?[`+${v}`,'Polnjenje']:n==='drained'?[`-${v}`,'Praznjenje']:[`${v>0?'+':''}${v}`,'Neto']}/>
              <Bar dataKey="charged" name="charged" fill="#22c55e" opacity={0.7} radius={[3,3,0,0]}/>
              <Bar dataKey="drained" name="drained" fill="#ef4444" opacity={0.7} radius={[3,3,0,0]}/>
              <Line type="monotone" dataKey="net" name="net" stroke="#f59e0b" strokeWidth={2}
                dot={(p)=><circle key={p.cx} cx={p.cx} cy={p.cy} r={3} fill={p.payload.net>=0?'#22c55e':'#ef4444'} stroke="none"/>}/>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
  </div>

  </div>
  </>)
}

function TabPlan({currentTeden}){
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
