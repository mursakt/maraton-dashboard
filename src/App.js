import React, { useState, useEffect } from 'react'
import { supabase } from './supabase'
import './App.css'
import { PLAN, FAZA_COLOR, FAZA_LABEL, getCurrentTeden } from './constants/plan'
import { izracunajFormo, izracunajPredikcijo } from './utils/calculations'
import { TabPregled } from './components/TabPregled'
import { TabPredikcija } from './components/TabPredikcija'
import { TabCilji } from './components/TabCilji'
import { TabPrehrana } from './components/TabPrehrana'
import { TabTreningi } from './components/TabTreningi'
import { TabTelo } from './components/TabTelo'
import { TabPlan } from './components/TabPlan'

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
  const predikcija = izracunajPredikcijo(workouts, metrike, laps)

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
      {tab==='treningi'&&<TabTreningi workouts={workouts} metrike={metrike} prehrana={prehrana} laps={laps} onRefresh={fetchAll}/>}
      {tab==='telo'&&<TabTelo metrike={metrike} workouts={workouts}/>}
      {tab==='prehrana'&&<TabPrehrana prehrana={prehrana} workouts={workouts} metrike={metrike} prehranaCilji={prehranaCilji} onRefresh={fetchAll}/>}
      {tab==='cilji'&&<TabCilji prehranaCilji={prehranaCilji} onRefresh={fetchAll} workouts={workouts} metrike={metrike} prehrana={prehrana}/>}
      {tab==='plan'&&<TabPlan currentTeden={currentTeden} workouts={workouts}/>}
      {tab==='predikcija'&&<TabPredikcija predikcija={predikcija} workouts={workouts} laps={laps} metrike={metrike}/>}
    </div>
  )
}






