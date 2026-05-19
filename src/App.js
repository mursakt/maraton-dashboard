import React, { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { LineChart, Line, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend, ComposedChart } from 'recharts'

const PLAN = [
  { teden: 1,  datum: '2026-04-20', faza: 'F1', km: 11,  ciljnaKg: 97.0 },
  { teden: 2,  datum: '2026-04-27', faza: 'F1', km: 22,  ciljnaKg: 96.5 },
  { teden: 3,  datum: '2026-05-04', faza: 'F1', km: 24,  ciljnaKg: 96.0 },
  { teden: 4,  datum: '2026-05-11', faza: 'F1', km: 28,  ciljnaKg: 95.5 },
  { teden: 5,  datum: '2026-05-18', faza: 'F1', km: 29,  ciljnaKg: 95.0 },
  { teden: 6,  datum: '2026-05-25', faza: 'F1', km: 21,  ciljnaKg: 96.0 },
  { teden: 7,  datum: '2026-06-01', faza: 'F2', km: 27,  ciljnaKg: 94.5 },
  { teden: 8,  datum: '2026-06-08', faza: 'F2', km: 30,  ciljnaKg: 94.0 },
  { teden: 9,  datum: '2026-06-15', faza: 'F2', km: 31,  ciljnaKg: 93.5 },
  { teden: 10, datum: '2026-06-22', faza: 'F2', km: 34,  ciljnaKg: 93.0 },
  { teden: 11, datum: '2026-06-29', faza: 'F2', km: 36,  ciljnaKg: 92.5 },
  { teden: 12, datum: '2026-07-06', faza: 'F2', km: 26,  ciljnaKg: 92.0 },
  { teden: 13, datum: '2026-07-13', faza: 'F2', km: 38,  ciljnaKg: 91.5 },
  { teden: 14, datum: '2026-07-20', faza: 'F2', km: 39,  ciljnaKg: 91.0 },
  { teden: 15, datum: '2026-07-27', faza: 'F3', km: 44,  ciljnaKg: 90.5 },
  { teden: 16, datum: '2026-08-03', faza: 'F3', km: 48,  ciljnaKg: 90.0 },
  { teden: 17, datum: '2026-08-10', faza: 'F3', km: 52,  ciljnaKg: 89.5 },
  { teden: 18, datum: '2026-08-17', faza: 'F3', km: 32,  ciljnaKg: 89.0 },
  { teden: 19, datum: '2026-08-24', faza: 'F3', km: 52,  ciljnaKg: 88.5 },
  { teden: 20, datum: '2026-08-31', faza: 'F3', km: 57,  ciljnaKg: 88.0 },
  { teden: 21, datum: '2026-09-07', faza: 'F4', km: 38,  ciljnaKg: 87.0 },
  { teden: 22, datum: '2026-09-14', faza: 'F4', km: 28,  ciljnaKg: 86.5 },
  { teden: 23, datum: '2026-09-21', faza: 'F4', km: 19,  ciljnaKg: 86.0 },
  { teden: 24, datum: '2026-09-28', faza: 'F4', km: 42,  ciljnaKg: 85.0 },
]

// Cilji prehrane
const CILJI = { kcal: 2240, belj: 224, oh: 196, masc: 62 }


// Planirani treningi iz programa
const PLAN_TRENINGI = [
  // T01
  { datum: '2026-04-22', teden: 1, naziv: 'T01A', opis: '5 km lahkotno', km: 5, tempo: '6:15', hr: '138–154' },
  { datum: '2026-04-23', teden: 1, naziv: 'T01B', opis: '6 km lahkotno', km: 6, tempo: '6:15', hr: '138–154' },
  // T02
  { datum: '2026-04-27', teden: 2, naziv: 'T02A', opis: '6 km lahkotno', km: 6, tempo: '6:15', hr: '138–154' },
  { datum: '2026-04-29', teden: 2, naziv: 'T02B', opis: '6 km lahkotno', km: 6, tempo: '6:15', hr: '138–154' },
  { datum: '2026-05-02', teden: 2, naziv: 'T02C', opis: '10 km dolgi tek', km: 10, tempo: '6:00', hr: '138–154' },
  // T03
  { datum: '2026-05-04', teden: 3, naziv: 'T03A', opis: '6 km lahkotno', km: 6, tempo: '6:15', hr: '138–154' },
  { datum: '2026-05-07', teden: 3, naziv: 'T03B', opis: '7 km lahkotno', km: 7, tempo: '6:15', hr: '138–154' },
  { datum: '2026-05-09', teden: 3, naziv: 'T03C', opis: '11 km dolgi tek', km: 11, tempo: '6:00', hr: '138–154' },
  // T04
  { datum: '2026-05-12', teden: 4, naziv: 'T04A', opis: '7 km lahkotno', km: 7, tempo: '6:15', hr: '138–154' },
  { datum: '2026-05-14', teden: 4, naziv: 'T04B', opis: '8 km lahkotno', km: 8, tempo: '6:15', hr: '138–154' },
  { datum: '2026-05-16', teden: 4, naziv: 'T04C', opis: '13 km dolgi tek', km: 13, tempo: '6:00', hr: '138–154' },
  // T05
  { datum: '2026-05-19', teden: 5, naziv: 'T05A', opis: '7 km lahkotno', km: 7, tempo: '6:15', hr: '138–154' },
  { datum: '2026-05-21', teden: 5, naziv: 'T05B', opis: '8 km lahkotno', km: 8, tempo: '6:15', hr: '138–154' },
  { datum: '2026-05-23', teden: 5, naziv: 'T05C', opis: '14 km dolgi tek', km: 14, tempo: '6:00', hr: '138–154' },
  // T06
  { datum: '2026-05-26', teden: 6, naziv: 'T06A', opis: '5 km lahkotno', km: 5, tempo: '6:15', hr: '138–154' },
  { datum: '2026-05-28', teden: 6, naziv: 'T06B', opis: '6 km lahkotno', km: 6, tempo: '6:15', hr: '138–154' },
  { datum: '2026-05-30', teden: 6, naziv: 'T06C', opis: '10 km lahkotno ⚡', km: 10, tempo: '6:00', hr: '138–154' },
  // T07
  { datum: '2026-06-02', teden: 7, naziv: 'T07A', opis: '5×800m intervali', km: 8, tempo: '4:50', hr: '169–185' },
  { datum: '2026-06-04', teden: 7, naziv: 'T07B', opis: '8 km lahkotno', km: 8, tempo: '6:15', hr: '138–154' },
  { datum: '2026-06-06', teden: 7, naziv: 'T07C', opis: '15 km dolgi tek', km: 15, tempo: '6:00', hr: '138–154' },
  // T08
  { datum: '2026-06-09', teden: 8, naziv: 'T08A', opis: '🏔️ Hribčki 8×30s + 5km', km: 8, tempo: '6:15', hr: '138–185' },
  { datum: '2026-06-11', teden: 8, naziv: 'T08B', opis: '9 km lahkotno', km: 9, tempo: '6:15', hr: '138–154' },
  { datum: '2026-06-13', teden: 8, naziv: 'T08C', opis: '17 km dolgi tek', km: 17, tempo: '6:00', hr: '138–154' },
]

const FAZA_COLOR = { F1: '#3b82f6', F2: '#eab308', F3: '#ef4444', F4: '#22c55e' }
const FAZA_LABEL = { F1: 'Faza 1 – Baza', F2: 'Faza 2 – Gradnja', F3: 'Faza 3 – Specifika', F4: 'Tapering' }
const TODAY = new Date()
const TODAY_STR = TODAY.toISOString().slice(0, 10)
const YESTERDAY_STR = new Date(TODAY - 86400000).toISOString().slice(0, 10)

function getCurrentTeden() {
  for (let i = PLAN.length - 1; i >= 0; i--) { if (new Date(PLAN[i].datum) <= TODAY) return PLAN[i].teden }
  return 1
}
function fmt(val, dec = 1) { if (val == null || isNaN(val)) return '—'; return Number(val).toFixed(dec) }
function hrZona(hr) { if (!hr) return '—'; if (hr<123) return 'Z0'; if (hr<138) return 'Z1'; if (hr<154) return 'Z2'; if (hr<169) return 'Z3'; if (hr<185) return 'Z4'; return 'Z5' }
function hrZonaColor(hr) { if (!hr) return '#6b7280'; if (hr<138) return '#22c55e'; if (hr<154) return '#3b82f6'; if (hr<169) return '#eab308'; if (hr<185) return '#f97316'; return '#ef4444' }
function isTek(w) { const t=(w.tip_treninga||'').toLowerCase(); return t.includes('run')||t.includes('tek') }

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
function formaColor(s) { if(!s)return'#6b7280'; if(s>=8)return'#22c55e'; if(s>=6)return'#84cc16'; if(s>=4)return'#eab308'; if(s>=2)return'#f97316'; return'#ef4444' }
function formaLabel(s) { if(!s)return'—'; if(s>=8)return'Odlično'; if(s>=6)return'Dobro'; if(s>=4)return'Povprečno'; if(s>=2)return'Slabo'; return'Kritično' }

// Pripravljenost na naslednji tek (0-100%)
function izracunajPripravljenost(metrike, prehrana, workouts) {
  const { atl, ctl, razmerje } = izracunajLoad(workouts)
  const z = metrike[0] || {}
  const vceraj = prehrana.find(p => p.datum === YESTERDAY_STR) || prehrana[0] || {}
  
  let score = 0
  let max = 0
  
  // HRV (30%)
  if (z.hrv) {
    max += 30
    if (z.hrv >= 70) score += 30
    else if (z.hrv >= 60) score += 25
    else if (z.hrv >= 50) score += 20
    else if (z.hrv >= 40) score += 12
    else score += 5
  }
  
  // Spanje (25%)
  if (z.spanje_h) {
    max += 25
    if (z.spanje_h >= 8) score += 25
    else if (z.spanje_h >= 7.5) score += 22
    else if (z.spanje_h >= 7) score += 18
    else if (z.spanje_h >= 6.5) score += 12
    else if (z.spanje_h >= 6) score += 7
    else score += 2
  }
  
  // Stres (15%)
  if (z.stres_povprecje) {
    max += 15
    if (z.stres_povprecje < 25) score += 15
    else if (z.stres_povprecje < 35) score += 12
    else if (z.stres_povprecje < 50) score += 8
    else if (z.stres_povprecje < 65) score += 4
    else score += 1
  }
  
  // Prehrana včeraj - kalorije (15%)
  if (vceraj.kalorije_skupaj) {
    max += 15
    const ratio = vceraj.kalorije_skupaj / CILJI.kcal
    if (ratio >= 0.9 && ratio <= 1.2) score += 15
    else if (ratio >= 0.8) score += 10
    else if (ratio >= 0.7) score += 5
    else score += 0
  }
  
  // Prehrana včeraj - OH (15%)
  if (vceraj.ogljikovi_hidrati_g) {
    max += 15
    const ratio = vceraj.ogljikovi_hidrati_g / CILJI.oh
    if (ratio >= 0.9) score += 15
    else if (ratio >= 0.75) score += 10
    else if (ratio >= 0.6) score += 5
    else score += 0
  }
  
  // Load faktor (15%) - ATL/CTL razmerje
  if (razmerje !== null) {
    max += 15
    if (razmerje >= 0.8 && razmerje <= 1.3) score += 15
    else if (razmerje >= 0.6 && razmerje <= 1.5) score += 10
    else score += 3
  }

  if (max === 0) return null
  return Math.round((score / max) * 100)
}

function pripravljenostColor(p) {
  if (!p) return '#6b7280'
  if (p >= 80) return '#22c55e'
  if (p >= 60) return '#84cc16'
  if (p >= 40) return '#eab308'
  if (p >= 20) return '#f97316'
  return '#ef4444'
}

function pripravljenostLabel(p) {
  if (!p) return '—'
  if (p >= 80) return 'Odlično pripravljen'
  if (p >= 60) return 'Dobro pripravljen'
  if (p >= 40) return 'Zmerno pripravljen'
  if (p >= 20) return 'Slabo pripravljen'
  return 'Ni priporočljivo teči'
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



function tempoStrToSec(tempo) {
  if (!tempo) return null
  const parts = tempo.split(':')
  if (parts.length !== 2) return null
  return parseInt(parts[0]) * 60 + parseInt(parts[1])
}

function secToTempoStr(sec) {
  if (!sec) return '—'
  const min = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  return `${min}:${s.toString().padStart(2, '0')}`
}

function secToHMS(totalSec) {
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = Math.round(totalSec % 60)
  return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
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

// Opozorilo pred treningom
function opozoriloPredTreningom(workouts, prehrana) {
  const danes = TODAY
  const jutri = new Date(danes)
  jutri.setDate(jutri.getDate() + 1)
  const jutriStr = jutri.toISOString().slice(0, 10)
  
  // Poišči jutrinji trening iz plana (po imenu ali datumu)
  // Gremo po workoutu - check if any planned workout tomorrow
  // Ker nimamo scheduled workouta, gledamo plan teden
  const currentTeden = getCurrentTeden()
  const planTeden = PLAN.find(p => p.teden === currentTeden)
  const danVTednu = TODAY.getDay() // 0=ned, 1=pon...
  
  // Predpostavimo dolg tek ob koncu tedna
  const jeJutriDolgiTek = danVTednu === 5 || danVTednu === 6 // petek ali sobota
  
  if (!jeJutriDolgiTek) return null
  
  const danes_preh = prehrana.find(p => p.datum === TODAY_STR)
  if (!danes_preh) return null
  
  const ohDanes = danes_preh.ogljikovi_hidrati_g || 0
  const kcalDanes = danes_preh.kalorije_skupaj || 0
  const ohCilj = CILJI.oh
  const kcalCilj = CILJI.kcal
  
  const msgs = []
  if (ohDanes < ohCilj * 0.8) {
    msgs.push(`pojej še vsaj ${Math.round(ohCilj - ohDanes)}g OH`)
  }
  if (kcalDanes < kcalCilj * 0.85) {
    msgs.push(`dodaj ${Math.round(kcalCilj - kcalDanes)} kcal`)
  }
  
  if (msgs.length > 0) {
    return `🍝 Jutri dolg tek — ${msgs.join(' in ')}`
  }
  return null
}

const css = `
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body{background:#0a0a0f;color:#e2e8f0;font-family:'DM Sans',sans-serif}
  ::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:#111}::-webkit-scrollbar-thumb{background:#333;border-radius:3px}
  .app{min-height:100vh;padding:24px;max-width:1200px;margin:0 auto}
  .header{display:flex;align-items:baseline;gap:16px;margin-bottom:32px;border-bottom:1px solid #1e2433;padding-bottom:20px;flex-wrap:wrap}
  .header h1{font-size:22px;font-weight:600;letter-spacing:-.5px}
  .header .sub{font-size:13px;color:#64748b;font-family:'DM Mono',monospace}
  .header .teden-badge{margin-left:auto;background:#1e2433;border:1px solid #2d3748;border-radius:8px;padding:6px 14px;font-family:'DM Mono',monospace;font-size:12px;color:#94a3b8}
  .header .teden-badge span{color:#e2e8f0;font-weight:500}
  .tabs{display:flex;gap:4px;margin-bottom:24px;background:#111827;border-radius:10px;padding:4px;width:fit-content;flex-wrap:wrap}
  .tab{padding:8px 18px;border-radius:7px;font-size:13px;font-weight:500;cursor:pointer;border:none;background:transparent;color:#64748b;transition:all .15s}
  .tab.active{background:#1e2433;color:#e2e8f0}
  .tab:hover:not(.active){color:#94a3b8}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}
  .grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:16px}
  .grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:16px}
  .grid5{display:grid;grid-template-columns:repeat(5,1fr);gap:16px;margin-bottom:16px}
  .card{background:#111827;border:1px solid #1e2433;border-radius:12px;padding:20px}
  .card h3{font-size:11px;font-weight:500;color:#64748b;text-transform:uppercase;letter-spacing:.8px;margin-bottom:14px}
  .stat-val{font-size:32px;font-weight:300;font-family:'DM Mono',monospace;letter-spacing:-1px}
  .stat-unit{font-size:14px;color:#64748b;margin-left:4px}
  .stat-sub{font-size:12px;color:#475569;margin-top:4px;font-family:'DM Mono',monospace}
  .progress-bar{height:6px;background:#1e2433;border-radius:3px;overflow:hidden;margin:8px 0}
  .progress-fill{height:100%;border-radius:3px;transition:width .5s ease}
  .workout-list{display:flex;flex-direction:column;gap:8px}
  .workout-item{display:flex;align-items:center;gap:12px;padding:12px 14px;background:#0f172a;border-radius:8px;border:1px solid #1e2433;flex-wrap:wrap}
  .workout-item .date{font-family:'DM Mono',monospace;font-size:11px;color:#475569;min-width:52px}
  .workout-item .type{font-size:12px;font-weight:500;color:#94a3b8;min-width:90px}
  .workout-item .detail{font-family:'DM Mono',monospace;font-size:12px;color:#64748b}
  .workout-item .hr-badge{margin-left:auto;font-family:'DM Mono',monospace;font-size:11px;padding:2px 8px;border-radius:4px;font-weight:500}
  .alert{display:flex;gap:10px;padding:12px 14px;border-radius:8px;font-size:13px;margin-bottom:10px}
  .alert.warn{background:#451a03;border:1px solid #78350f;color:#fcd34d}
  .alert.ok{background:#052e16;border:1px solid #14532d;color:#86efac}
  .alert.info{background:#0c1a2e;border:1px solid #1e3a5f;color:#7dd3fc}
  .alert.opozorilo{background:#3b0764;border:1px solid #6b21a8;color:#e879f9}
  .plan-row{display:flex;gap:8px;align-items:center;padding:10px 14px;border-radius:8px;background:#0f172a;border:1px solid #1e2433;margin-bottom:6px;font-size:13px}
  .plan-row.current{border-color:#3b82f6;background:#0f1f3d}
  .plan-row .t-num{font-family:'DM Mono',monospace;font-size:11px;color:#475569;min-width:28px}
  .plan-row .t-datum{font-family:'DM Mono',monospace;font-size:11px;color:#475569;min-width:90px}
  .plan-row .t-faza{font-size:11px;padding:2px 7px;border-radius:4px;font-weight:600;min-width:50px;text-align:center}
  .plan-row .t-km{font-family:'DM Mono',monospace;font-size:12px;color:#94a3b8;margin-left:auto}
  .plan-row .t-kg{font-family:'DM Mono',monospace;font-size:11px;color:#475569;min-width:60px;text-align:right}
  .empty{text-align:center;padding:40px;color:#475569;font-size:13px}
  .loading{display:flex;align-items:center;justify-content:center;height:200px;color:#475569;font-family:'DM Mono',monospace;font-size:13px}
  .nutrition-row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #1e2433}
  .nutrition-row:last-child{border-bottom:none}
  .nutrition-label{font-size:13px;color:#94a3b8}
  .nutrition-val{font-family:'DM Mono',monospace;font-size:13px}
  .nutrition-target{font-family:'DM Mono',monospace;font-size:11px;color:#475569}
  .forma-ring{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px}
  .forma-score{font-size:48px;font-weight:200;font-family:'DM Mono',monospace;letter-spacing:-2px;line-height:1}
  .forma-label{font-size:12px;font-weight:500;text-transform:uppercase;letter-spacing:.8px}
  .forma-sub{font-size:11px;color:#475569;font-family:'DM Mono',monospace}
  .pred-main{font-size:64px;font-weight:200;font-family:'DM Mono',monospace;letter-spacing:-3px;line-height:1}
  .pred-cilj{font-size:13px;color:#475569;font-family:'DM Mono',monospace;margin-top:4px}
  .pred-diff-pos{color:#22c55e;font-family:'DM Mono',monospace;font-size:14px;font-weight:500}
  .pred-diff-neg{color:#ef4444;font-family:'DM Mono',monospace;font-size:14px;font-weight:500}
  .zanesljivost-bar{height:8px;background:#1e2433;border-radius:4px;overflow:hidden;margin:8px 0}
  .zanesljivost-fill{height:100%;border-radius:4px;background:linear-gradient(90deg,#3b82f6,#22c55e)}
  .faktor-row{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #1e2433;font-size:13px}
  .faktor-row:last-child{border-bottom:none}
  .faktor-label{color:#94a3b8}
  .faktor-val{font-family:'DM Mono',monospace}
  .razlog-item{font-size:12px;color:#64748b;padding:3px 0;font-family:'DM Mono',monospace}
  .analiza-item{display:flex;gap:8px;padding:8px 12px;border-radius:6px;font-size:12px;margin-bottom:6px;align-items:flex-start}
  .analiza-item.ok{background:#052e1620;border-left:3px solid #22c55e;color:#86efac}
  .analiza-item.warn{background:#45180320;border-left:3px solid #f97316;color:#fcd34d}
  .analiza-item.info{background:#0c1a2e20;border-left:3px solid #3b82f6;color:#7dd3fc}
  .big-ring{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:8px 0}
  .big-ring-val{font-size:52px;font-weight:200;font-family:'DM Mono',monospace;letter-spacing:-2px;line-height:1}
  .big-ring-label{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px}
  .big-ring-sub{font-size:11px;color:#475569}
  .macro-card{background:#111827;border:1px solid #1e2433;border-radius:12px;padding:16px}
  .macro-card h3{font-size:11px;font-weight:500;color:#64748b;text-transform:uppercase;letter-spacing:.8px;margin-bottom:10px}
  .macro-val{font-size:28px;font-weight:300;font-family:'DM Mono',monospace}
  .macro-cilj{font-size:11px;color:#475569;margin-top:2px}
  .macro-diff{font-size:12px;font-family:'DM Mono',monospace;margin-top:4px;font-weight:500}
  @media(max-width:768px){.grid2,.grid3,.grid4,.grid5{grid-template-columns:1fr}.app{padding:16px}.tabs{flex-wrap:wrap}.pred-main{font-size:48px}}
`

function StatCard({ title, value, unit, sub, color }) {
  return (
    <div className="card">
      <h3>{title}</h3>
      <div><span className="stat-val" style={color?{color}:{}}>{value}</span>{unit&&<span className="stat-unit">{unit}</span>}</div>
      {sub&&<div className="stat-sub">{sub}</div>}
    </div>
  )
}
function ProgressBar({ value, max, color = '#3b82f6', showPct = false }) {
  const rawPct = Math.round((value / max) * 100)
  const over = rawPct > 100
  const extraPct = over ? Math.min(rawPct - 100, 50) : 0
  return (
    <div>
      <div style={{height:6,background:'#1e2433',borderRadius:3,overflow:'hidden',margin:'8px 0',position:'relative',display:'flex'}}>
        {over ? (
          <>
            <div style={{height:'100%',width:'100%',background:color,borderRadius:3,position:'absolute',left:0,top:0}}/>
            <div style={{height:'100%',width:`${extraPct}%`,background:color,backgroundImage:'repeating-linear-gradient(45deg,transparent,transparent 3px,rgba(0,0,0,0.5) 3px,rgba(0,0,0,0.5) 6px)',borderRadius:'0 3px 3px 0',position:'absolute',right:0,top:0}}/>
          </>
        ) : (
          <div style={{height:'100%',width:`${rawPct}%`,background:color,borderRadius:3,transition:'width 0.5s ease'}}/>
        )}
      </div>
      {showPct && <div style={{fontSize:11,color:rawPct>=100?color:'#64748b',fontFamily:'DM Mono',textAlign:'right',marginTop:-4}}>{rawPct}%</div>}
    </div>
  )
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

  if(loading) return(<div className="app"><style>{css}</style><div className="loading">Nalagam podatke…</div></div>)
  if(error) return(<div className="app"><style>{css}</style><div className="alert warn">⚠️ Napaka: {error}</div></div>)

  const planTeden = PLAN.find(p=>p.teden===currentTeden)
  const faza = planTeden?.faza||'F1'
  const zadnjeMetrike = metrike[0]||{}
  const formaScore = izracunajFormo(zadnjeMetrike.hrv, zadnjeMetrike.spanje_h, zadnjeMetrike.stres_povprecje, workouts)
  const predikcija = izracunajPredikcijo(workouts, metrike)

  return (
    <div className="app"><style>{css}</style>
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



// ── LOAD IZRAČUN ─────────────────────────────────────────────────────────────
function izracunajLoad(workouts) {
  const danes = new Date()
  
  function loadZaDan(datum) {
    const d = workouts.filter(w => w.datum === datum)
    return d.reduce((s, w) => {
      const te = w.aerobni_te || 1
      const min = w.trajanje_min || 0
      return s + Math.round(min * te)
    }, 0)
  }
  
  // ATL - zadnjih 7 dni
  let atlSum = 0
  for (let i = 0; i < 7; i++) {
    const d = new Date(danes - i * 86400000).toISOString().slice(0, 10)
    atlSum += loadZaDan(d)
  }
  const atl = Math.round(atlSum / 7)
  
  // CTL - zadnjih 28 dni
  let ctlSum = 0
  for (let i = 0; i < 28; i++) {
    const d = new Date(danes - i * 86400000).toISOString().slice(0, 10)
    ctlSum += loadZaDan(d)
  }
  const ctl = Math.round(ctlSum / 28)
  
  // ATL/CTL razmerje
  const razmerje = ctl > 0 ? Math.round((atl / ctl) * 100) / 100 : null
  
  let razmerjeOpis = '—'
  let razmerjeColor = '#6b7280'
  if (razmerje !== null) {
    if (razmerje < 0.8) { razmerjeOpis = 'Premalo treniraš'; razmerjeColor = '#3b82f6' }
    else if (razmerje <= 1.3) { razmerjeOpis = 'Optimalno'; razmerjeColor = '#22c55e' }
    else if (razmerje <= 1.5) { razmerjeOpis = 'Visoka obremenitev'; razmerjeColor = '#eab308' }
    else { razmerjeOpis = 'Nevarnost poškodbe'; razmerjeColor = '#ef4444' }
  }
  
  return { atl, ctl, razmerje, razmerjeOpis, razmerjeColor }
}

// ── ANALIZA ZADNJEGA TEKA ─────────────────────────────────────────────────
function analizirajTek(zadnjiTek, lapsTeka, metrike, prehrana, workouts) {
  if (!zadnjiTek) return null

  const tekDatum = zadnjiTek.datum
  const danPred = new Date(new Date(tekDatum) - 86400000).toISOString().slice(0, 10)

  const metrikeDanPred = metrike.find(m => m.datum === danPred) || {}
  const prehranaVceraj = prehrana.find(p => p.datum === danPred && p.kalorije_skupaj > 0) || {}

  // Kalorijski deficit včeraj
  const workoutVceraj = workouts.filter(w => w.datum === danPred)
  const treningKcalVceraj = workoutVceraj.reduce((s, w) => s + (w.kalorije || 0), 0)
  const metVceraj = metrike.find(m => m.datum === danPred) || {}
  const porabljeneVceraj = metVceraj.skupaj_kcal || (metVceraj.bmr_kcal ? metVceraj.bmr_kcal + treningKcalVceraj : 1946 + treningKcalVceraj)
  const deficitVceraj = prehranaVceraj.kalorije_skupaj ? Math.round(prehranaVceraj.kalorije_skupaj - porabljeneVceraj) : null

  // Kalorijski deficit zadnjih 7 dni
  const zadnjih7Prehrana = prehrana.filter(p => p.kalorije_skupaj > 0 && p.datum < tekDatum).slice(0, 7)
  const deficiti7 = zadnjih7Prehrana.map(p => {
    const w = workouts.filter(w2 => w2.datum === p.datum).reduce((s, w2) => s + (w2.kalorije || 0), 0)
    const mD = metrike.find(m2 => m2.datum === p.datum) || {}
    const por = mD.skupaj_kcal || (mD.bmr_kcal ? mD.bmr_kcal + w : 1946 + w)
    return p.kalorije_skupaj - por
  })
  const povprecniDeficit7 = deficiti7.length > 0 ? Math.round(deficiti7.reduce((s, d) => s + d, 0) / deficiti7.length) : null

  // Lap analiza
  const lapi = lapsTeka.filter(l => l.garmin_activity_id === zadnjiTek.garmin_activity_id)
    .sort((a, b) => a.lap_number - b.lap_number)

  const tempoStrToSec = t => {
    if (!t) return null
    const [m, s] = t.split(':').map(Number)
    return m * 60 + s
  }

  // Cardiac drift: HR v prvi tretjini vs zadnji tretjini
  let cardiacDrift = null
  let driftOpis = null
  if (lapi.length >= 3) {
    const tretjina = Math.floor(lapi.length / 3)
    const prvaHR = lapi.slice(0, tretjina).filter(l => l.povprecni_hr).reduce((s, l, _, a) => s + l.povprecni_hr / a.length, 0)
    const zadnjaHR = lapi.slice(-tretjina).filter(l => l.povprecni_hr).reduce((s, l, _, a) => s + l.povprecni_hr / a.length, 0)
    cardiacDrift = Math.round(zadnjaHR - prvaHR)
    if (cardiacDrift > 20) driftOpis = 'zelo velik'
    else if (cardiacDrift > 12) driftOpis = 'velik'
    else if (cardiacDrift > 6) driftOpis = 'zmeren'
    else driftOpis = 'minimalen'
  }

  // Tempo degradacija: prvi 3 km vs zadnji 3 km
  let tempoDegradacija = null
  let tempoDegOpis = null
  if (lapi.length >= 6) {
    const prvi3 = lapi.slice(0, 3).filter(l => l.povprecni_tempo)
    const zadnji3 = lapi.slice(-3).filter(l => l.povprecni_tempo)
    if (prvi3.length > 0 && zadnji3.length > 0) {
      const avgTempoZac = prvi3.reduce((s, l, _, a) => s + tempoStrToSec(l.povprecni_tempo) / a.length, 0)
      const avgTempoKon = zadnji3.reduce((s, l, _, a) => s + tempoStrToSec(l.povprecni_tempo) / a.length, 0)
      tempoDegradacija = Math.round(avgTempoKon - avgTempoZac)
      if (tempoDegradacija > 30) tempoDegOpis = 'velik padec tempa'
      else if (tempoDegradacija > 15) tempoDegOpis = 'zmeren padec tempa'
      else if (tempoDegradacija > 5) tempoDegOpis = 'blag padec tempa'
      else if (tempoDegradacija < -5) tempoDegOpis = 'negativni split'
      else tempoDegOpis = 'konstanten tempo'
    }
  }

  // Poišči km kjer se je HR začel povečevati nesorazmerno s tempom
  let kriticniKm = null
  if (lapi.length >= 4) {
    for (let i = 2; i < lapi.length; i++) {
      const l = lapi[i]
      const prej = lapi[i - 1]
      if (l.povprecni_hr && prej.povprecni_hr && l.povprecni_tempo && prej.povprecni_tempo) {
        const hrDelta = l.povprecni_hr - prej.povprecni_hr
        const tempoDelta = tempoStrToSec(l.povprecni_tempo) - tempoStrToSec(prej.povprecni_tempo)
        // HR naraste za 5+ bpm, tempo pa se ne izboljša
        if (hrDelta >= 5 && tempoDelta >= -5 && !kriticniKm) {
          kriticniKm = i + 1
        }
      }
    }
  }

  // Glikogenska analiza
  const tezaKg = metrike.find(m => m.teza_kg)?.teza_kg || 95
  const ohDanPrej = prehranaVceraj.ogljikovi_hidrati_g || 0
  const ohNaKg = ohDanPrej > 0 ? Math.round((ohDanPrej / tezaKg) * 10) / 10 : null
  let glikogenOpis = null
  if (ohNaKg !== null) {
    if (ohNaKg < 2) glikogenOpis = 'kritično nizke rezerve'
    else if (ohNaKg < 3) glikogenOpis = 'zelo nizke rezerve'
    else if (ohNaKg < 5) glikogenOpis = 'suboptimalne rezerve'
    else glikogenOpis = 'dobre rezerve'
  }

  // HRV in spanje
  const hrv = metrikeDanPred.hrv
  const spanje = metrikeDanPred.spanje_h
  const stres = metrikeDanPred.stres_povprecje

  // Training Effect
  const te = zadnjiTek.aerobni_te
  let teOpis = null
  if (te >= 5) teOpis = 'prezahtevno — pretreniranost'
  else if (te >= 4) teOpis = 'threshold — prezahtevno za lahek dan'
  else if (te >= 3) teOpis = 'aerobno — ok za bazo'
  else if (te >= 2) teOpis = 'vzdrževano — lahek tek'
  else teOpis = 'minimalen učinek'

  // Začetni tempo vs optimalni tempo za bazo (Cona 2 = ~6:40-7:00/km za tvoj profil)
  const prvLap = lapi[0]
  const optimalniBazniTempo = 400 // 6:40/km v sekundah
  let zacetniTempoOpis = null
  if (prvLap?.povprecni_tempo) {
    const prvTempoSec = tempoStrToSec(prvLap.povprecni_tempo)
    const razlika = optimalniBazniTempo - prvTempoSec // pozitivno = prehitro
    if (razlika > 30) zacetniTempoOpis = `${Math.round(razlika)} sek/km prehitro`
    else if (razlika > 10) zacetniTempoOpis = `${Math.round(razlika)} sek/km prehitro`
    else if (razlika < -10) zacetniTempoOpis = `${Math.round(Math.abs(razlika))} sek/km počasneje kot optimalno`
    else zacetniTempoOpis = 'optimalen začetni tempo'
  }

  return {
    tek: zadnjiTek,
    lapi,
    cardiacDrift,
    driftOpis,
    tempoDegradacija,
    tempoDegOpis,
    kriticniKm,
    ohNaKg,
    glikogenOpis,
    ohDanPrej: Math.round(ohDanPrej),
    tezaKg,
    hrv,
    spanje,
    stres,
    te,
    teOpis,
    prvLap,
    zacetniTempoOpis,
    deficitVceraj,
    povprecniDeficit7,
    prehranaVceraj,
    metrikeDanPred,
  }
}



// Helper za prikaz naslednjih 5 treningov
function NaslednjihPetTreningov() {
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


// Tipi dni s privzetimi vrednostmi
const TIPI_DNI = {
  'Tek': { cilj_kcal: 2600, cilj_belj_g: 162, cilj_oh_g: 270, cilj_masc_g: 97 },
  'Long run': { cilj_kcal: 3100, cilj_belj_g: 162, cilj_oh_g: 400, cilj_masc_g: 97 },
  'Gym': { cilj_kcal: 2400, cilj_belj_g: 162, cilj_oh_g: 200, cilj_masc_g: 102 },
  'Rest': { cilj_kcal: 2200, cilj_belj_g: 162, cilj_oh_g: 170, cilj_masc_g: 108 },
}

// Vnos tedenskih ciljev
function VnosCiljev({ prehranaCilji, onRefresh }) {
  const [teden, setTeden] = React.useState([])
  const [saving, setSaving] = React.useState(false)
  const [saved, setSaved] = React.useState(false)

  // Generiraj naslednji teden (pon-ned)
  React.useEffect(() => {
    const dni = []
    const danes = new Date(TODAY)
    // Pojdi na ponedeljek tega ali naslednjega tedna
    const pon = new Date(danes)
    const day = pon.getDay()
    const diff = day === 0 ? 1 : (day === 1 ? 0 : 8 - day)
    pon.setDate(pon.getDate() + diff)
    
    const danNames = ['Ned','Pon','Tor','Sre','Čet','Pet','Sob']
    for (let i = 0; i < 7; i++) {
      const d = new Date(pon)
      d.setDate(d.getDate() + i)
      const datumStr = d.toISOString().slice(0, 10)
      const obstoječi = prehranaCilji.find(c => c.datum === datumStr)
      dni.push({
        datum: datumStr,
        dayName: danNames[d.getDay()],
        tip: obstoječi?.tip_dneva || '',
        cilj_kcal: obstoječi?.cilj_kcal || '',
        cilj_belj_g: obstoječi?.cilj_belj_g || '',
        cilj_oh_g: obstoječi?.cilj_oh_g || '',
        cilj_masc_g: obstoječi?.cilj_masc_g || '',
      })
    }
    setTeden(dni)
  }, [prehranaCilji])

  function handleTip(i, tip) {
    const novo = [...teden]
    novo[i] = { ...novo[i], tip, ...(TIPI_DNI[tip] || {}) }
    setTeden(novo)
  }

  function handleVal(i, field, val) {
    const novo = [...teden]
    novo[i] = { ...novo[i], [field]: val }
    setTeden(novo)
  }

  async function shrani() {
    setSaving(true)
    try {
      for (const d of teden) {
        if (!d.tip && !d.cilj_kcal) continue
        await supabase.from('prehrana_cilji').upsert({
          datum: d.datum,
          tip_dneva: d.tip || null,
          cilj_kcal: parseInt(d.cilj_kcal) || null,
          cilj_belj_g: parseInt(d.cilj_belj_g) || null,
          cilj_oh_g: parseInt(d.cilj_oh_g) || null,
          cilj_masc_g: parseInt(d.cilj_masc_g) || null,
        }, { onConflict: 'datum' })
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      if (onRefresh) onRefresh()
    } catch(e) {
      console.error(e)
    }
    setSaving(false)
  }

  const inputStyle = {
    background: '#0f172a', border: '1px solid #1e2433', borderRadius: 4,
    color: '#e2e8f0', fontSize: 11, fontFamily: 'DM Mono',
    padding: '3px 6px', width: 60, textAlign: 'right'
  }

  return (
    <div className="card" style={{marginBottom: 16}}>
      <h3>Tedenski cilji prehrane</h3>
      <div style={{overflowX:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
          <thead>
            <tr style={{borderBottom:'1px solid #1e2433'}}>
              {['Dan','Tip','Kcal','Belj','OH','Masc'].map(h => (
                <th key={h} style={{padding:'4px 8px',color:'#475569',fontFamily:'DM Mono',fontSize:10,textAlign:'left',fontWeight:400,textTransform:'uppercase'}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {teden.map((d, i) => (
              <tr key={d.datum} style={{borderBottom:'1px solid #0f172a'}}>
                <td style={{padding:'6px 8px',color:'#64748b',fontFamily:'DM Mono',fontSize:11,whiteSpace:'nowrap'}}>
                  {d.dayName} {d.datum.slice(5)}
                </td>
                <td style={{padding:'6px 8px'}}>
                  <select
                    value={d.tip}
                    onChange={e => handleTip(i, e.target.value)}
                    style={{...inputStyle, width: 90, textAlign: 'left'}}
                  >
                    <option value="">—</option>
                    {Object.keys(TIPI_DNI).map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </td>
                {['cilj_kcal','cilj_belj_g','cilj_oh_g','cilj_masc_g'].map(field => (
                  <td key={field} style={{padding:'6px 8px'}}>
                    <input
                      type="number"
                      value={d[field]}
                      onChange={e => handleVal(i, field, e.target.value)}
                      style={inputStyle}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        onClick={shrani}
        disabled={saving}
        style={{marginTop:12,padding:'8px 20px',background:saved?'#052e16':saving?'#1e2433':'#1e3a5f',border:`1px solid ${saved?'#14532d':'#2d4a7a'}`,borderRadius:6,color:saved?'#86efac':'#94a3b8',cursor:'pointer',fontSize:12,fontFamily:'DM Mono'}}
      >
        {saved ? '✓ Shranjeno' : saving ? 'Shranjujem...' : 'Shrani cilje'}
      </button>
    </div>
  )
}



function TabCilji({ prehranaCilji, onRefresh }) {
  const jutri = new Date(TODAY)
  jutri.setDate(jutri.getDate() + 1)
  const jutriStr = jutri.toISOString().slice(0, 10)
  const manjkaJutri = !prehranaCilji.find(c => c.datum === jutriStr)

  return (<>
    {manjkaJutri && (
      <div className="alert warn" style={{marginBottom:16}}>
        ⚠️ Manjkajo cilji prehrane za jutri ({jutriStr}) — vnesi jih spodaj.
      </div>
    )}
    {!manjkaJutri && (
      <div className="alert ok" style={{marginBottom:16,background:'#052e1620',border:'1px solid #14532d',color:'#86efac'}}>
        ✓ Cilji za jutri ({jutriStr}) so nastavljeni.
      </div>
    )}
    <VnosCiljev prehranaCilji={prehranaCilji} onRefresh={onRefresh}/>

    {/* Pregled vnesenih ciljev */}
    {prehranaCilji.length > 0 && (
      <div className="card">
        <h3>Vneseni cilji</h3>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
            <thead>
              <tr style={{borderBottom:'1px solid #1e2433'}}>
                {['Datum','Tip','Kcal','Belj','OH','Masc'].map(h=>(
                  <th key={h} style={{padding:'4px 8px',color:'#475569',fontFamily:'DM Mono',fontSize:10,textAlign:'left',fontWeight:400,textTransform:'uppercase'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {prehranaCilji.slice(0,14).map((c,i)=>(
                <tr key={i} style={{borderBottom:'1px solid #0f172a',opacity:c.datum<TODAY_STR?0.5:1}}>
                  <td style={{padding:'6px 8px',color:'#64748b',fontFamily:'DM Mono',fontSize:11}}>{c.datum}</td>
                  <td style={{padding:'6px 8px',color:'#94a3b8',fontSize:11}}>{c.tip_dneva||'—'}</td>
                  <td style={{padding:'6px 8px',color:'#f97316',fontFamily:'DM Mono',fontSize:11}}>{c.cilj_kcal||'—'}</td>
                  <td style={{padding:'6px 8px',color:'#22c55e',fontFamily:'DM Mono',fontSize:11}}>{c.cilj_belj_g||'—'}g</td>
                  <td style={{padding:'6px 8px',color:'#3b82f6',fontFamily:'DM Mono',fontSize:11}}>{c.cilj_oh_g||'—'}g</td>
                  <td style={{padding:'6px 8px',color:'#a78bfa',fontFamily:'DM Mono',fontSize:11}}>{c.cilj_masc_g||'—'}g</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )}
  </>)
}

function TabPregled({workouts,metrike,prehrana,laps,prehranaCilji=[],currentTeden,formaScore,predikcija}){
  const planTeden=PLAN.find(p=>p.teden===currentTeden)
  const tedStart=planTeden?new Date(planTeden.datum):new Date()
  const tedEnd=new Date(tedStart);tedEnd.setDate(tedEnd.getDate()+7)
  const kmTaTeden=workouts.filter(w=>{const d=new Date(w.datum);return d>=tedStart&&d<tedEnd&&isTek(w)}).reduce((s,w)=>s+(w.razdalja_km||0),0)
  const z=metrike[0]||{}
  const zadnjaTeza=metrike.find(m=>m.teza_kg)?.teza_kg
  const pripravljenost = izracunajPripravljenost(metrike, prehrana, workouts)
  const opozorilo = opozoriloPredTreningom(workouts, prehrana)
  
  // Kalorijski deficit/suficit
  // Zadnji datum z MFP podatki (ne danes)
  const zadnjiMfpDatum = prehrana
    .filter(p => p.kalorije_skupaj > 0 && p.datum < TODAY_STR)
    .sort((a,b) => b.datum.localeCompare(a.datum))[0]?.datum || YESTERDAY_STR
  const skupniDatum = zadnjiMfpDatum
  const vcerajPrehrana = prehrana.find(p => p.datum === skupniDatum) || {}
  const vcerajMetrike = metrike.find(m => m.datum === skupniDatum) || {}
  const vcerajWorkout = workouts.filter(w => w.datum === skupniDatum)
  const aktivneKcalTrening = vcerajWorkout.reduce((s, w) => s + (w.kalorije || 0), 0)
  // Uporabi vcerajMetrike (skupniDatum) - NE z (danes)
  const pasivneKcal = vcerajMetrike.bmr_kcal || 1946
  const aktivneKcalGarmin = vcerajMetrike.aktivne_kcal || 0
  const skupajPorabljene = vcerajMetrike.skupaj_kcal || (pasivneKcal + aktivneKcalTrening)
  const zauziteKcal = vcerajPrehrana.kalorije_skupaj || 0
  const deficit = zauziteKcal - skupajPorabljene // skupaj_kcal ze vkljucuje trening
  
  // 7-dnevna mediana deficita
  const zadnjih7 = prehrana.filter(p => p.kalorije_skupaj > 0).slice(0, 7)
  const deficiti7 = zadnjih7.map(p => {
    const w = workouts.filter(w2 => w2.datum === p.datum).reduce((s, w2) => s + (w2.kalorije || 0), 0)
    return p.kalorije_skupaj - (pasivneKcal + w)
  })
  const medianaDeficit = deficiti7.length > 0 ? deficiti7.sort((a,b)=>a-b)[Math.floor(deficiti7.length/2)] : null

  const alarms=[]
  if (opozorilo) alarms.push({type:'opozorilo', msg: opozorilo})
  if(z.hrv&&z.hrv<40)alarms.push({type:'warn',msg:'⚠️ HRV nizek ('+z.hrv+'ms) — razmisli o lažjem treningu danes'})
  if(z.spanje_h&&z.spanje_h<6.5)alarms.push({type:'warn',msg:'⚠️ Malo spanja ('+fmt(z.spanje_h)+'h) — regeneracija trpi'})
  if(zadnjaTeza&&planTeden&&zadnjaTeza>planTeden.ciljnaKg+1)alarms.push({type:'info',msg:`ℹ️ Teža (${fmt(zadnjaTeza)}kg) je ${fmt(zadnjaTeza-planTeden.ciljnaKg)}kg nad planom`})
  if(formaScore&&formaScore<4)alarms.push({type:'warn',msg:`⚠️ Forma nizka (${fmt(formaScore)}/10) — premisli ali je danes trening smiseln`})
  if(alarms.length===0)alarms.push({type:'ok',msg:'✅ Vse vrednosti v redu — nadaljuj po planu'})
  
  const kmPlan=planTeden?.km||0
  const dniDoMaratona=Math.ceil((new Date('2026-10-17')-TODAY)/(1000*60*60*24))
  const predCas = predikcija ? secToHMS(predikcija.casFinal) : null
  const ciljSec = 3*3600+45*60
  const diffSec = predikcija ? predikcija.casFinal - ciljSec : null

  return(<>
    {alarms.map((a,i)=><div key={i} className={`alert ${a.type}`}>{a.msg}</div>)}
    
    {/* Vrstica 1: Pripravljenost, Forma, KM, Teža, Dni */}
    <div className="grid5" style={{marginBottom:16}}>
      <div className="card">
        <h3>Pripravljenost na tek</h3>
        <div><span className="stat-val" style={{color:pripravljenostColor(pripravljenost)}}>{pripravljenost ? `${pripravljenost}%` : '—'}</span></div>
        <div className="stat-sub" style={{color:pripravljenostColor(pripravljenost)}}>{pripravljenostLabel(pripravljenost)}</div>
      </div>
      <div className="card">
        <h3>Forma danes</h3>
        <div><span className="stat-val" style={{color:formaColor(formaScore)}}>{formaScore?fmt(formaScore):'—'}</span></div>
        <div className="stat-sub" style={{color:formaColor(formaScore)}}>{formaLabel(formaScore)}</div>
      </div>
      <StatCard title="Km ta teden" value={fmt(kmTaTeden)} unit="km" sub={`plan: ${kmPlan} km`} color={kmTaTeden>=kmPlan?'#22c55e':'#f97316'}/>
      <StatCard title="Zadnja teža" value={zadnjaTeza?fmt(zadnjaTeza):'—'} unit="kg" sub={planTeden?`cilj: ${planTeden.ciljnaKg} kg`:''}/>
      <StatCard title="Dni do maratona" value={dniDoMaratona} sub="17. oktober 2026"/>
    </div>

    {/* Analiza zadnjega teka */}
    {/* AI Analiza teka */}
    {/* Load kartice */}
    {(() => {
      const { atl, ctl, razmerje, razmerjeOpis, razmerjeColor } = izracunajLoad(workouts)
      return (
        <div className="grid3" style={{marginBottom:16}}>
          <div className="card">
            <h3>Akutni Load — ATL (7 dni)</h3>
            <div style={{display:'flex',alignItems:'baseline',gap:6}}>
              <span className="stat-val" style={{color: atl > 200 ? '#ef4444' : atl > 100 ? '#eab308' : '#22c55e'}}>{atl}</span>
              <span style={{fontSize:12,color: atl > 200 ? '#ef4444' : atl > 100 ? '#eab308' : '#22c55e',fontWeight:500}}>{atl > 200 ? 'visok' : atl > 100 ? 'zmeren' : 'nizek'}</span>
            </div>
            <div className="stat-sub">kratkoročna utrujenost · optimalno: 80–150</div>
          </div>
          <div className="card">
            <h3>Kronični Load — CTL (28 dni)</h3>
            <div style={{display:'flex',alignItems:'baseline',gap:6}}>
              <span className="stat-val" style={{color: ctl < 30 ? '#6b7280' : ctl < 60 ? '#3b82f6' : '#22c55e'}}>{ctl}</span>
              <span style={{fontSize:12,color: ctl < 30 ? '#6b7280' : ctl < 60 ? '#3b82f6' : '#22c55e',fontWeight:500}}>{ctl < 30 ? 'nizek' : ctl < 60 ? 'zmeren' : 'visok'}</span>
            </div>
            <div className="stat-sub">fitnes baza · višji = boljša baza</div>
          </div>
          <div className="card">
            <h3>ATL/CTL Razmerje</h3>
            <div style={{display:'flex',alignItems:'baseline',gap:6}}>
              <span className="stat-val" style={{color: razmerjeColor}}>{razmerje !== null ? razmerje.toFixed(2) : '—'}</span>
              <span style={{fontSize:12,color: razmerjeColor,fontWeight:500}}>{razmerjeOpis}</span>
            </div>
            <div className="stat-sub">optimalno: 0.8–1.3 · &gt;1.5 = nevarnost</div>
          </div>
        </div>
      )
    })()}

    {/* Kalorije: porabljene vs zaužite */}
      <div className="card">
        <h3>Kalorije <span style={{fontSize:11,color:'#475569',fontFamily:'DM Mono',fontWeight:400}}>({skupniDatum})</span></h3>
        <div style={{display:'flex',gap:24,alignItems:'flex-start',marginBottom:8}}>
          <div style={{flex:1}}>
            <div style={{fontSize:11,color:'#64748b',marginBottom:4,textTransform:'uppercase',letterSpacing:'.5px'}}>Porabljene</div>
            <div style={{fontSize:24,fontFamily:'DM Mono',fontWeight:300}}>{skupajPorabljene} <span style={{fontSize:12,color:'#64748b'}}>kcal</span></div>
            <div style={{fontSize:11,color:'#475569',marginTop:4}}>
              {vcerajMetrike.bmr_kcal ? `${vcerajMetrike.bmr_kcal} bazal + ${vcerajMetrike.aktivne_kcal||0} aktivne` : `~${pasivneKcal} bazal + ${aktivneKcalTrening} trening`}
            </div>
          </div>
          <div style={{fontSize:20,color:'#2d3748',alignSelf:'center'}}>vs</div>
          <div style={{flex:1}}>
            <div style={{fontSize:11,color:'#64748b',marginBottom:4,textTransform:'uppercase',letterSpacing:'.5px'}}>Zaužite</div>
            <div style={{fontSize:24,fontFamily:'DM Mono',fontWeight:300,color:zauziteKcal>0?'#e2e8f0':'#475569'}}>{zauziteKcal||'—'} <span style={{fontSize:12,color:'#64748b'}}>kcal</span></div>
          </div>
        </div>
        {zauziteKcal > 0 && (
          <div style={{padding:'8px 12px',borderRadius:6,background:deficit>0?'#052e1620':'#45180320',border:`1px solid ${deficit>0?'#14532d':'#78350f'}`,marginTop:8}}>
            <span style={{fontFamily:'DM Mono',fontSize:14,fontWeight:500,color:deficit>0?'#86efac':'#fcd34d'}}>
              {deficit>0?`+${Math.round(deficit)} kcal suficit`:`${Math.round(deficit)} kcal deficit`}
            </span>
          </div>
        )}
      </div>
      <div className="card">
        <h3>Kalorijski trend (mediana 7 dni)</h3>
        {medianaDeficit !== null ? (
          <div>
            <div style={{fontSize:36,fontFamily:'DM Mono',fontWeight:200,color:medianaDeficit>0?'#22c55e':'#f97316'}}>
              {medianaDeficit>0?'+':''}{Math.round(medianaDeficit)}
              <span style={{fontSize:14,color:'#64748b',marginLeft:4}}>kcal/dan</span>
            </div>
            <div style={{fontSize:12,color:'#475569',marginTop:6}}>
              {medianaDeficit>200?'Suficit — dober za ohranjanje energije':medianaDeficit>0?'Blagi suficit — ok':medianaDeficit>-300?'Blagi deficit — dober za izgubo teže':'Velik deficit — pazi na regeneracijo'}
            </div>
          </div>
        ) : <div className="empty" style={{padding:8}}>Ni dovolj podatkov</div>}
      </div>


    <div className="card">
      <h3>Zadnji 5 treningov</h3>
      <div className="workout-list">
        {workouts.slice(0,5).map((w,i)=>(<div key={i} className="workout-item"><span className="date">{w.datum?.slice(5)}</span><span className="type">{w.naziv||w.tip_treninga||'—'}</span><span className="detail">{fmt(w.razdalja_km)} km · {w.povprecni_tempo||'—'}/km · {fmt(w.trajanje_min,0)} min</span><span className="hr-badge" style={{background:hrZonaColor(w.povprecni_hr)+'22',color:hrZonaColor(w.povprecni_hr)}}>{w.povprecni_hr?`${w.povprecni_hr} bpm`:'—'}</span></div>))}
        {workouts.length===0&&<div className="empty">Ni podatkov</div>}
      </div>
      <NaslednjihPetTreningov/>
    </div>
  </>)
}

function TabPrehrana({prehrana, workouts, metrike=[], prehranaCilji=[], onRefresh}){
  // Vedno prikaži včerajšnje podatke
  const vceraj = prehrana.find(p => p.datum === YESTERDAY_STR) || prehrana.filter(p => p.kalorije_skupaj > 0)[0] || {}
  
  const prikazDatum = vceraj.datum || YESTERDAY_STR
  // Danes - samo če imamo MFP vnos za TODAY_STR
  const danesPrehrana = prehrana.find(p => p.datum === TODAY_STR && p.kalorije_skupaj > 0) || null
  
  // Povprečje 7 dni (samo dnevi z vnosi)
  const z7 = prehrana.filter(p => p.kalorije_skupaj > 0).slice(0, 7)
  const avgKcal = z7.reduce((s,p,_,a) => s + p.kalorije_skupaj/a.length, 0) || 0
  const avgBelj = z7.reduce((s,p,_,a) => s + p.beljakovine_g/a.length, 0) || 0
  const avgOH = z7.reduce((s,p,_,a) => s + p.ogljikovi_hidrati_g/a.length, 0) || 0
  const avgMasc = z7.reduce((s,p,_,a) => s + p.masc_g/a.length, 0) || 0

  // Grafi za zadnjih 14 dni
  const graf14 = prehrana.filter(p => p.kalorije_skupaj > 0 && p.datum <= TODAY_STR).slice(0, 14).reverse()
  
  // Waterfall podatki za zadnjih 7 dni
  const waterfall7 = prehrana.filter(p => p.kalorije_skupaj > 0 && p.datum < TODAY_STR).slice(0, 7).reverse().map(p => {
    const mD = metrike.find(m => m.datum === p.datum) || {}
    const bmrD = mD.bmr_kcal || 1946
    const aktivneD = mD.aktivne_kcal || 0
    const skupajPor = mD.skupaj_kcal || (bmrD + aktivneD)
    const deficit = p.kalorije_skupaj - skupajPor
    return {
      datum: p.datum?.slice(5),
      zauzite: p.kalorije_skupaj,
      bmr: bmrD,
      aktivne: aktivneD,
      skupaj_porabljene: skupajPor,
      deficit: Math.round(deficit),
    }
  })
  const kcalData = graf14.map(p => ({ datum: p.datum?.slice(5), kcal: p.kalorije_skupaj, cilj: CILJI.kcal }))
  const beljData = graf14.map(p => ({ datum: p.datum?.slice(5), val: p.beljakovine_g, cilj: CILJI.belj }))
  const ohData = graf14.map(p => ({ datum: p.datum?.slice(5), val: p.ogljikovi_hidrati_g, cilj: CILJI.oh }))
  const mascData = graf14.map(p => ({ datum: p.datum?.slice(5), val: p.masc_g, cilj: CILJI.masc }))

  // Kalorijski deficit graf
  const deficitData = graf14.map(p => {
    const w = workouts.filter(w2 => w2.datum === p.datum).reduce((s, w2) => s + (w2.kalorije || 0), 0)
    const mD = metrike.find(m2 => m2.datum === p.datum) || {}
    const porabljene = mD.skupaj_kcal || (mD.bmr_kcal ? mD.bmr_kcal + w : 1946 + w)
    const bmrD = mD.bmr_kcal || 1946
    const aktivneD = mD.aktivne_kcal || w
    const def = p.kalorije_skupaj - porabljene
    return { datum: p.datum?.slice(5), zauzite: p.kalorije_skupaj, porabljene, deficit: def }
  })

  // Analiza trendov
  const trendi = []
  if (avgKcal > 0 && avgKcal < CILJI.kcal * 0.85) trendi.push({ tip: 'warn', msg: `Povprečne kalorije (${Math.round(avgKcal)} kcal) so ${Math.round(CILJI.kcal - avgKcal)} kcal pod ciljem — tveganje premalo energije za treninge.` })
  if (avgBelj > 0 && avgBelj < CILJI.belj * 0.85) trendi.push({ tip: 'warn', msg: `Beljakovine v povprečju ${Math.round(avgBelj)}g — pod ciljem ${CILJI.belj}g. Regeneracija mišic bo slabša.` })
  if (avgOH > 0 && avgOH < CILJI.oh * 0.8) trendi.push({ tip: 'warn', msg: `OH v povprečju ${Math.round(avgOH)}g — pod ciljem ${CILJI.oh}g. Glikogenske rezerve bodo nizke pred teki.` })
  if (avgKcal > CILJI.kcal * 1.15) trendi.push({ tip: 'info', msg: `Povprečne kalorije (${Math.round(avgKcal)} kcal) so nad ciljem — ok za dneve s teki, pazi na dneve brez.` })
  if (avgBelj >= CILJI.belj * 0.95) trendi.push({ tip: 'ok', msg: `Beljakovine v redu — ${Math.round(avgBelj)}g povprečno, cilj ${CILJI.belj}g. Dobra regeneracija.` })
  if (avgOH >= CILJI.oh * 0.9) trendi.push({ tip: 'ok', msg: `OH v redu — ${Math.round(avgOH)}g povprečno. Glikogenske rezerve optimalne.` })
  if (trendi.length === 0) trendi.push({ tip: 'ok', msg: 'Prehrana v redu — nadaljuj po planu.' })

  function diffStr(val, cilj) {
    if (!val || !cilj) return ''
    const diff = val - cilj
    const pct = Math.round((val/cilj)*100)
    if (diff > 0) return `+${Math.round(diff)}g (${pct}%)`
    return `${Math.round(diff)}g (${pct}%)`
  }
  function diffStrKcal(val, cilj) {
    if (!val || !cilj) return ''
    const diff = val - cilj
    const pct = Math.round((val/cilj)*100)
    if (diff > 0) return `+${Math.round(diff)} kcal (${pct}%)`
    return `${Math.round(diff)} kcal (${pct}%)`
  }
  function diffColor(val, cilj, inverted=false) {
    if (!val || !cilj) return '#6b7280'
    const ratio = val/cilj
    if (inverted) { if(ratio<=1)return'#22c55e'; if(ratio<=1.2)return'#eab308'; return'#ef4444' }
    if(ratio>=0.95)return'#22c55e'; if(ratio>=0.8)return'#eab308'; return'#ef4444'
  }

  const grafProps = { margin:{top:4,right:4,left:-20,bottom:0}, height:160 }
  const axisProps = { tick:{fontSize:10,fill:'#475569',fontFamily:'DM Mono'}, interval:'preserveStartEnd' }
  const tooltipProps = { contentStyle:{background:'#111827',border:'1px solid #1e2433',borderRadius:8,fontSize:12} }

  // Dinamični cilji za vsak datum
  // Najprej poglej prehrana tabelo (tam so cilji shranjeni skupaj z vnosom)
  // Potem prehrana_cilji (za prihodnje dni)
  const getCilji = (datum) => {
    const p = prehrana.find(p2 => p2.datum === datum)
    if (p && p.cilj_kcal) return { kcal: p.cilj_kcal, belj: p.cilj_belj_g || CILJI.belj, oh: p.cilj_oh_g || CILJI.oh, masc: p.cilj_masc_g || CILJI.masc, tip: p.tip_dneva }
    const c = prehranaCilji.find(pc => pc.datum === datum)
    if (c && c.cilj_kcal) return { kcal: c.cilj_kcal, belj: c.cilj_belj_g || CILJI.belj, oh: c.cilj_oh_g || CILJI.oh, masc: c.cilj_masc_g || CILJI.masc, tip: c.tip_dneva }
    return { ...CILJI, tip: null }
  }
  const ciljiVceraj = getCilji(prikazDatum)
  const ciljiDanes = getCilji(TODAY_STR)

  return(<>
    {/* Današnji makri - samo če imamo podatke */}
    {danesPrehrana && (
      <div style={{marginBottom:16}}>
        <div style={{fontSize:11,color:'#475569',fontFamily:'DM Mono',marginBottom:8,textTransform:'uppercase',letterSpacing:'.5px'}}>Danes ({TODAY_STR})</div>
        <div className="grid4">
          {[
            { title: `Kalorije (${TODAY_STR})`, val: danesPrehrana.kalorije_skupaj, cilj: ciljiDanes.kcal, unit: 'kcal', isDiffKcal: true },
            { title: `Beljakovine (${TODAY_STR})`, val: danesPrehrana.beljakovine_g, cilj: ciljiDanes.belj, unit: 'g' },
            { title: `OH (${TODAY_STR})`, val: danesPrehrana.ogljikovi_hidrati_g, cilj: ciljiDanes.oh, unit: 'g' },
            { title: `Maščobe (${TODAY_STR})`, val: danesPrehrana.masc_g, cilj: ciljiDanes.masc, unit: 'g' },
          ].map((m,i) => (
            <div key={i} className="card" style={{border:'1px solid #1e3a5f'}}>
              <h3>{m.title}</h3>
              <div style={{display:'flex',alignItems:'baseline',gap:4}}>
                <span className="stat-val" style={{color:diffColor(m.val,m.cilj)}}>{Math.round(m.val)}</span>
                <span className="stat-unit">{m.unit}</span>
              </div>
              {m.isDiffKcal
                ? <div className="stat-sub" style={{color:diffColor(m.val,m.cilj)}}>{m.val>m.cilj?`+${Math.round(m.val-m.cilj)}`:`${Math.round(m.val-m.cilj)}`} kcal ({Math.round(m.val/m.cilj*100)}%)</div>
                : <div className="stat-sub" style={{color:diffColor(m.val,m.cilj)}}>{m.val>m.cilj?`+${Math.round(m.val-m.cilj)}`:`${Math.round(m.val-m.cilj)}`}g ({Math.round(m.val/m.cilj*100)}%)</div>
              }
              <ProgressBar value={m.val} max={m.cilj} color={diffColor(m.val,m.cilj)} showPct={true}/>
              <div style={{fontSize:10,color:'#334155',fontFamily:'DM Mono',marginTop:4}}>cilj: {Math.round(m.cilj)} {m.unit}{ciljiDanes.tip ? ` · ${ciljiDanes.tip}` : ''}</div>
            </div>
          ))}
        </div>
      </div>
    )}

    {/* Včerajšnji makri */}
    <div className="grid4" style={{marginBottom:16}}>
      {[
        { title: `Kalorije (${prikazDatum})`, val: vceraj.kalorije_skupaj, cilj: ciljiVceraj.kcal, unit: 'kcal', isDiffKcal: true },
        { title: `Beljakovine (${prikazDatum})`, val: vceraj.beljakovine_g, cilj: ciljiVceraj.belj, unit: 'g' },
        { title: `OH (${prikazDatum})`, val: vceraj.ogljikovi_hidrati_g, cilj: ciljiVceraj.oh, unit: 'g' },
        { title: `Maščobe (${prikazDatum})`, val: vceraj.masc_g, cilj: ciljiVceraj.masc, unit: 'g' },
      ].map((m,i) => m.val ? (
        <div key={i} className="card">
          <h3>{m.title}</h3>
          <div style={{display:'flex',alignItems:'baseline',gap:4}}>
            <span className="stat-val" style={{color:diffColor(m.val,m.cilj)}}>{Math.round(m.val)}</span>
            <span className="stat-unit">{m.unit}</span>
          </div>
          {m.isDiffKcal
            ? <div className="stat-sub" style={{color:diffColor(m.val,m.cilj)}}>{m.val>m.cilj?`+${Math.round(m.val-m.cilj)}`:`${Math.round(m.val-m.cilj)}`} kcal ({Math.round(m.val/m.cilj*100)}%)</div>
            : <div className="stat-sub" style={{color:diffColor(m.val,m.cilj)}}>{m.val>m.cilj?`+${Math.round(m.val-m.cilj)}`:`${Math.round(m.val-m.cilj)}`}g ({Math.round(m.val/m.cilj*100)}%)</div>
          }
          <ProgressBar value={m.val} max={m.cilj} color={diffColor(m.val,m.cilj)} showPct={true}/>
          <div style={{fontSize:10,color:'#334155',fontFamily:'DM Mono',marginTop:4}}>cilj: {Math.round(m.cilj)} {m.unit}</div>
        </div>
      ) : null)}
    </div>




    {/* Mikrohranila včeraj */}
    {vceraj.natrij_mg > 0 && (
      <div style={{marginBottom:16}}>
        <div style={{fontSize:10,color:'#334155',fontFamily:'DM Mono',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:8}}>Mikrohranila ({prikazDatum})</div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          {[
            { naziv: 'Natrij', val: vceraj.natrij_mg, enota: 'mg', cilj: 2300, color: '#f97316' },
            { naziv: 'Kalij', val: vceraj.kalij_mg, enota: 'mg', cilj: 3500, color: '#22c55e' },
            { naziv: 'Vlaknine', val: vceraj.vlaknine_g, enota: 'g', cilj: 30, color: '#3b82f6' },
            { naziv: 'Sladkorji', val: vceraj.sladkorji_g, enota: 'g', cilj: 50, color: '#eab308' },
            { naziv: 'Holesterol', val: vceraj.holesterol_mg, enota: 'mg', cilj: 300, color: '#94a3b8' },
            { naziv: 'Vitamin C', val: vceraj.vitamin_c_mg, enota: 'mg', cilj: 90, color: '#f59e0b' },
            { naziv: 'Kalcij', val: vceraj.kalcij_mg, enota: 'mg', cilj: 1000, color: '#a78bfa' },
            { naziv: 'Železo', val: vceraj.železo_mg, enota: 'mg', cilj: 18, color: '#ef4444' },
          ].map((m, i) => m.val > 0 ? (
            <div key={i} style={{
              background:'#0f172a', border:'1px solid #1e2433', borderRadius:8,
              padding:'8px 12px', minWidth:90, flex:'1 1 90px'
            }}>
              <div style={{fontSize:10,color:'#475569',fontFamily:'DM Mono',textTransform:'uppercase',marginBottom:4}}>{m.naziv}</div>
              <div style={{fontSize:16,fontFamily:'DM Mono',fontWeight:300,color:m.val>=m.cilj?'#22c55e':m.color}}>
                {Math.round(m.val)}<span style={{fontSize:10,color:'#475569',marginLeft:2}}>{m.enota}</span>
              </div>
              <div style={{fontSize:10,color:'#334155',marginTop:2}}>cilj: {m.cilj}{m.enota}</div>
              <div style={{height:3,background:'#1e2433',borderRadius:2,marginTop:4}}>
                <div style={{height:'100%',width:`${Math.min(100,Math.round(m.val/m.cilj*100))}%`,background:m.val>=m.cilj?'#22c55e':m.color,borderRadius:2}}/>
              </div>
            </div>
          ) : null)}
        </div>
      </div>
    )}

    {/* Waterfall kalorijski graf - zadnjih 7 dni */}
    {waterfall7.length > 0 && (() => {
      // Pravi waterfall: vsak dan = zauzite (zeleno) - bmr (rdeče) - aktivne (rdeče) = bilanca
      // Stolpci: začnejo tam kjer prejšnji konča (kumulativni)
      const waterfallData = waterfall7.map(d => {
        // Za vsak dan naredi 3 stolpce: zauzite, -bmr, -aktivne
        return [
          { datum: d.datum, label: 'Zaužite', value: d.zauzite, type: 'zauzite' },
          { datum: d.datum, label: 'BMR', value: -d.bmr, type: 'bmr' },
          { datum: d.datum, label: 'Aktivne', value: -d.aktivne, type: 'aktivne' },
        ]
      }).flat()

      // Izračunaj kumulativne vrednosti za waterfall
      let running = 0
      const wfBars = waterfall7.map(d => {
        const startZauzite = running
        running += d.zauzite
        const startBmr = running
        running -= d.bmr
        const startAktivne = running
        running -= d.aktivne
        const bilanca = d.deficit
        return {
          datum: d.datum,
          // Zaužite: od 0 do zauzite
          zauziteStart: 0,
          zauziteVal: d.zauzite,
          // BMR: od zauzite navzdol
          bmrStart: d.zauzite - d.bmr,
          bmrVal: d.bmr,
          // Aktivne: od (zauzite-bmr) navzdol  
          aktivneStart: d.zauzite - d.bmr - d.aktivne,
          aktivneVal: d.aktivne,
          // Bilanca
          bilanca: d.deficit,
          skupajPor: d.skupaj_porabljene,
          zauzite: d.zauzite,
        }
      })

      return (
        <div className="card" style={{marginBottom:16}}>
          <h3>Kalorijska bilanca — zadnjih 7 dni</h3>
          <div style={{fontSize:11,color:'#475569',marginBottom:12,fontFamily:'DM Mono'}}>
            🟢 Zaužite &nbsp;·&nbsp; 🔵 BMR (pasivne) &nbsp;·&nbsp; 🟣 Aktivne
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={wfBars} margin={{top:8,right:8,left:10,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2433"/>
              <XAxis dataKey="datum" tick={{fontSize:10,fill:'#475569',fontFamily:'DM Mono'}}/>
              <YAxis tick={{fontSize:10,fill:'#475569',fontFamily:'DM Mono'}} width={45}/>
              <Tooltip
                contentStyle={{background:'#111827',border:'1px solid #1e2433',borderRadius:8,fontSize:12}}
                formatter={(v, name, props) => {
                  const d = props.payload
                  if (name === 'bilanca') return [`${v > 0 ? '+' : ''}${Math.round(v)} kcal`, 'Bilanca']
                  return null
                }}
                content={({active, payload, label}) => {
                  if (!active || !payload?.length) return null
                  const d = payload[0]?.payload
                  if (!d) return null
                  return (
                    <div style={{background:'#111827',border:'1px solid #1e2433',borderRadius:8,padding:'8px 12px',fontSize:12}}>
                      <div style={{color:'#94a3b8',marginBottom:6,fontFamily:'DM Mono'}}>{label}</div>
                      <div style={{color:'#22c55e'}}>Zaužite: {Math.round(d.zauzite)} kcal</div>
                      <div style={{color:'#3b82f6'}}>BMR: {Math.round(d.bmrVal)} kcal</div>
                      <div style={{color:'#8b5cf6'}}>Aktivne: {Math.round(d.aktivneVal)} kcal</div>
                      <div style={{color: d.bilanca >= 0 ? '#22c55e' : '#ef4444', fontWeight:600, marginTop:4, borderTop:'1px solid #1e2433', paddingTop:4}}>
                        Bilanca: {d.bilanca >= 0 ? '+' : ''}{Math.round(d.bilanca)} kcal
                      </div>
                    </div>
                  )
                }}
              />
              <Bar dataKey="zauziteVal" name="Zaužite" stackId="a" fill="#22c55e" radius={[3,3,0,0]} opacity={0.85}/>
              <Bar dataKey="bmrVal" name="BMR" stackId="b" fill="#3b82f6" radius={[0,0,0,0]} opacity={0.75}/>
              <Bar dataKey="aktivneVal" name="Aktivne" stackId="b" fill="#8b5cf6" radius={[0,0,3,3]} opacity={0.75}/>
              <Line type="monotone" dataKey="bilanca" name="Bilanca" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4 3"
                dot={(props) => {
                  const {cx, cy, payload} = props
                  return <circle key={cx+cy} cx={cx} cy={cy} r={4} fill={payload.bilanca >= 0 ? '#22c55e' : '#ef4444'} stroke="#0f172a" strokeWidth={2}/>
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
          <div style={{display:'flex',gap:6,marginTop:12,flexWrap:'wrap'}}>
            {waterfall7.map((d,i)=>(
              <div key={i} style={{padding:'6px 10px',borderRadius:6,background:'#0f172a',border:`1px solid ${d.deficit>=0?'#14532d':'#450a0a'}`,fontSize:11,fontFamily:'DM Mono',minWidth:64,textAlign:'center'}}>
                <div style={{color:'#475569',marginBottom:3}}>{d.datum}</div>
                <div style={{color:d.deficit>=0?'#22c55e':'#ef4444',fontWeight:600,fontSize:12}}>
                  {d.deficit>=0?'+':''}{d.deficit}
                </div>
                <div style={{color:'#334155',fontSize:10,marginTop:2}}>kcal</div>
              </div>
            ))}
          </div>
        </div>
      )
    })()}

    {/* Kalorijski deficit graf */}


    {/* Povprečje 7 dni + linijski grafi */}
    <div className="grid2" style={{marginBottom:16}}>
      <div className="card">
        <h3>Povprečje 7 dni</h3>
        {[
          { label: 'Kalorije', val: avgKcal, cilj: CILJI.kcal, unit: 'kcal', isKcal: true },
          { label: 'Beljakovine', val: avgBelj, cilj: CILJI.belj, unit: 'g' },
          { label: 'Ogljikovi hidrati', val: avgOH, cilj: CILJI.oh, unit: 'g' },
          { label: 'Maščobe', val: avgMasc, cilj: CILJI.masc, unit: 'g' },
        ].map((r, i) => (
          <div key={i} className="nutrition-row">
            <span className="nutrition-label">{r.label}</span>
            <div style={{textAlign:'right'}}>
              <div className="nutrition-val" style={{color: r.val ? diffColor(r.val, r.cilj) : '#6b7280'}}>
                {r.val ? fmt(r.val, 0) : '—'} {r.unit}
              </div>
              <div className="nutrition-target">cilj {r.cilj}{r.unit} · {r.val ? Math.round((r.val/r.cilj)*100) : '—'}%</div>
            </div>
          </div>
        ))}
      </div>

      {/* Analiza trendov */}
      <div className="card">
        <h3>Analiza trendov</h3>
        {trendi.map((t, i) => (
          <div key={i} className={`analiza-item ${t.tip}`} style={{marginBottom:8}}>
            <span>{t.tip==='ok'?'✓':t.tip==='warn'?'⚠':'ℹ'}</span>
            <span style={{fontSize:12}}>{t.msg}</span>
          </div>
        ))}
      </div>
    </div>

    {/* Linijsk    {/* Združeni makro graf z dropdownom */}
    {(() => {
      const [selectedMakro, setSelectedMakro] = React.useState('kcal')
      const makroOpcije = [
        { key: 'kcal', naziv: 'Kalorije', data: kcalData, dataKey: 'kcal', cilj: ciljiVceraj.kcal||CILJI.kcal, color: '#f97316', unit: 'kcal' },
        { key: 'belj', naziv: 'Beljakovine', data: beljData, dataKey: 'val', cilj: ciljiVceraj.belj||CILJI.belj, color: '#22c55e', unit: 'g' },
        { key: 'oh', naziv: 'OH', data: ohData, dataKey: 'val', cilj: ciljiVceraj.oh||CILJI.oh, color: '#3b82f6', unit: 'g' },
        { key: 'masc', naziv: 'Maščobe', data: mascData, dataKey: 'val', cilj: ciljiVceraj.masc||CILJI.masc, color: '#a78bfa', unit: 'g' },
      ]
      const g = makroOpcije.find(m => m.key === selectedMakro) || makroOpcije[0]
      const maxVal = g.data.length > 0 ? Math.max(...g.data.map(d => d[g.dataKey] || 0), g.cilj) : g.cilj
      const yMax = Math.ceil(maxVal * 1.15)
      return (
        <div className="card" style={{marginBottom:16}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <h3 style={{margin:0}}>Trend prehrane — zadnjih 14 dni</h3>
            <div style={{display:'flex',gap:6}}>
              {makroOpcije.map(m => (
                <button key={m.key} onClick={()=>setSelectedMakro(m.key)} style={{
                  padding:'4px 10px', borderRadius:4, fontSize:11, fontFamily:'DM Mono', cursor:'pointer',
                  background: selectedMakro===m.key ? m.color+'33' : '#0f172a',
                  border: `1px solid ${selectedMakro===m.key ? m.color : '#1e2433'}`,
                  color: selectedMakro===m.key ? m.color : '#475569'
                }}>{m.naziv}</button>
              ))}
            </div>
          </div>
          {g.data.length > 1 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={g.data} margin={{top:4,right:8,left:-10,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2433"/>
                <XAxis dataKey="datum" {...axisProps}/>
                <YAxis tick={{fontSize:10,fill:'#475569',fontFamily:'DM Mono'}} domain={[0, yMax]}/>
                <Tooltip {...tooltipProps} formatter={v=>[`${Math.round(v)} ${g.unit}`, g.naziv]}/>
                <ReferenceLine y={g.cilj} stroke={g.color} strokeDasharray="5 3" strokeWidth={1.5} strokeOpacity={0.7}/>
                <Line type="monotone" dataKey={g.dataKey} stroke={g.color} strokeWidth={2} dot={{r:3,fill:g.color}}/>
              </LineChart>
            </ResponsiveContainer>
          ) : <div className="empty">Ni dovolj podatkov</div>}
        </div>
      )
    })()}

    {/* Mikro hranila graf z dropdownom */}
    {vceraj.natrij_mg > 0 && (() => {
      const [selectedMikro, setSelectedMikro] = React.useState('natrij')
      const mikroOpcije = [
        { key: 'natrij', naziv: 'Natrij', dataKey: 'natrij_mg', cilj: 2300, color: '#f97316', unit: 'mg' },
        { key: 'kalij', naziv: 'Kalij', dataKey: 'kalij_mg', cilj: 3500, color: '#22c55e', unit: 'mg' },
        { key: 'vlaknine', naziv: 'Vlaknine', dataKey: 'vlaknine_g', cilj: 30, color: '#3b82f6', unit: 'g' },
        { key: 'sladkorji', naziv: 'Sladkorji', dataKey: 'sladkorji_g', cilj: 50, color: '#eab308', unit: 'g' },
        { key: 'holesterol', naziv: 'Holesterol', dataKey: 'holesterol_mg', cilj: 300, color: '#94a3b8', unit: 'mg' },
        { key: 'vitamin_c', naziv: 'Vit. C', dataKey: 'vitamin_c_mg', cilj: 90, color: '#f59e0b', unit: 'mg' },
        { key: 'kalcij', naziv: 'Kalcij', dataKey: 'kalcij_mg', cilj: 1000, color: '#a78bfa', unit: 'mg' },
        { key: 'železo', naziv: 'Železo', dataKey: 'železo_mg', cilj: 18, color: '#ef4444', unit: 'mg' },
      ]
      const gm = mikroOpcije.find(m => m.key === selectedMikro) || mikroOpcije[0]
      const mikroData = graf14.map(p => ({ datum: p.datum?.slice(5), val: p[gm.dataKey] || 0 }))
      const maxMikro = Math.max(...mikroData.map(d => d.val), gm.cilj) * 1.15
      return (
        <div className="card" style={{marginBottom:16}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12,flexWrap:'wrap',gap:6}}>
            <h3 style={{margin:0}}>Mikrohranila — zadnjih 14 dni</h3>
            <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
              {mikroOpcije.map(m => (
                <button key={m.key} onClick={()=>setSelectedMikro(m.key)} style={{
                  padding:'3px 8px', borderRadius:4, fontSize:10, fontFamily:'DM Mono', cursor:'pointer',
                  background: selectedMikro===m.key ? m.color+'33' : '#0f172a',
                  border: `1px solid ${selectedMikro===m.key ? m.color : '#1e2433'}`,
                  color: selectedMikro===m.key ? m.color : '#475569'
                }}>{m.naziv}</button>
              ))}
            </div>
          </div>
          {mikroData.filter(d=>d.val>0).length > 1 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={mikroData} margin={{top:4,right:8,left:-10,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2433"/>
                <XAxis dataKey="datum" {...axisProps}/>
                <YAxis tick={{fontSize:10,fill:'#475569',fontFamily:'DM Mono'}} domain={[0, Math.ceil(maxMikro)]}/>
                <Tooltip {...tooltipProps} formatter={v=>[`${Math.round(v*10)/10} ${gm.unit}`, gm.naziv]}/>
                <ReferenceLine y={gm.cilj} stroke={gm.color} strokeDasharray="5 3" strokeWidth={1.5} strokeOpacity={0.7}/>
                <Line type="monotone" dataKey="val" stroke={gm.color} strokeWidth={2} dot={{r:3,fill:gm.color}}/>
              </LineChart>
            </ResponsiveContainer>
          ) : <div className="empty">Ni dovolj podatkov za mikrohranila</div>}
        </div>
      )
    })()}
  </>)

}

function TabPredikcija({predikcija, workouts}){
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
          <span className="faktor-val" style={{color:trend&&trend>0?'#22c55e':trend&&trend<0?'#f97316':'#94a3b8'}}>
            {trend===null?'—':trend>0?`-${secToHMS(Math.abs(trend)).slice(1)}`:trend<0?`+${secToHMS(Math.abs(trend)).slice(1)}`:'0'}
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
  </>)
}

function TabTreningi({workouts, metrike=[], prehrana=[], laps=[]}){
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

  // HR efikasnost (km/uro pri določenem HR)
  const hrEfik = teki.filter(w => w.povprecni_hr >= 138 && w.povprecni_hr <= 169 && w.povprecni_tempo).slice(0, 14).reverse().map(w => {
    const parts = (w.povprecni_tempo||'').split(':')
    const tempoSec = parts.length === 2 ? parseInt(parts[0])*60 + parseInt(parts[1]) : null
    const normTempoSec = tempoSec ? Math.round(tempoSec + (w.povprecni_hr - 155) * 3) : null
    return { datum: w.datum?.slice(5), efik: normTempoSec }
  }).filter(d => d.efik)

  // Load score
  const loadScore = workouts.filter(w => w.trajanje_min && w.aerobni_te).slice(0, 14).reverse().map(w => ({
    datum: w.datum?.slice(5),
    load: Math.round(w.trajanje_min * (w.aerobni_te / 2))
  }))

  // VO2max izracun
  const vo2Sorted = workouts.filter(w=>w.vo2max&&w.vo2max>0).sort((a,b)=>b.datum.localeCompare(a.datum))
  const zadnjiVo2 = vo2Sorted[0]?.vo2max || null
  // Poišci VO2max od pred 7 dni
  const prejsnjiTeden = new Date(TODAY - 7*86400000).toISOString().slice(0,10)
  const starejsiVo2 = vo2Sorted.find(w => w.datum <= prejsnjiTeden)?.vo2max || null
  const vo2Diff = zadnjiVo2 && starejsiVo2 ? Math.round((zadnjiVo2 - starejsiVo2)*10)/10 : null

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

      const tempoSecToStr = sec => {
        if (!sec) return '—'
        return `${Math.floor(sec/60)}:${String(Math.round(sec%60)).padStart(2,'0')}`
      }

      // Ocena težavnosti
      let ocena = 'nevtralen'
      let ocenaEmoji = '😐'
      let ocenaColor = '#94a3b8'
      const negativni = [
        a.cardiacDrift > 12,
        a.ohNaKg && a.ohNaKg < 3,
        a.deficitVceraj && a.deficitVceraj < -400,
        a.hrv && a.hrv < 45,
        a.spanje && a.spanje < 6.5,
        a.tempoDegradacija && a.tempoDegradacija > 20,
      ].filter(Boolean).length
      if (negativni >= 3) { ocena = 'težak'; ocenaEmoji = '😤'; ocenaColor = '#f97316' }
      else if (negativni >= 1) { ocena = 'zmerno zahteven'; ocenaEmoji = '😮‍💨'; ocenaColor = '#eab308' }
      else { ocena = 'lahek'; ocenaEmoji = '😊'; ocenaColor = '#22c55e' }

      // Sestavi točke analize
      const tocke = []

      // 1. Začetni tempo
      if (a.prvLap?.povprecni_tempo) {
        const barva = a.zacetniTempoOpis?.includes('prehitro') ? '#f97316' : '#22c55e'
        tocke.push({
          barva,
          tekst: `1. km: ${a.prvLap.povprecni_tempo}/km — ${a.zacetniTempoOpis || 'ok'}${a.zacetniTempoOpis?.includes('prehitro') ? '. Previsok začetni tempo je sprostil HR ki se ni mogel več zbiti nazaj.' : '.'}`
        })
      }

      // 2. Cardiac drift
      if (a.cardiacDrift !== null) {
        const barva = a.cardiacDrift > 12 ? '#f97316' : a.cardiacDrift > 6 ? '#eab308' : '#22c55e'
        tocke.push({
          barva,
          tekst: `Cardiac drift: +${a.cardiacDrift} bpm (${a.driftOpis}) — HR v zadnji tretjini teka je bil ${a.cardiacDrift} bpm višji kot v prvi${a.cardiacDrift > 12 ? ', kar kaže na preobremenitev ali dehidracijo' : ''}.`
        })
      }

      // 3. Kritični km
      if (a.kriticniKm) {
        tocke.push({
          barva: '#f97316',
          tekst: `Od ${a.kriticniKm}. km naprej je HR začel naraščati brez ustreznega izboljšanja tempa — telo je začelo delati nesorazmerno več za enak rezultat.`
        })
      }

      // 4. Tempo degradacija
      if (a.tempoDegradacija !== null) {
        const barva = a.tempoDegradacija > 15 ? '#f97316' : a.tempoDegradacija > 5 ? '#eab308' : '#22c55e'
        const sign = a.tempoDegradacija > 0 ? '+' : ''
        tocke.push({
          barva,
          tekst: `Tempo degradacija: ${sign}${a.tempoDegradacija} sek/km (${a.tempoDegOpis}) — prvi 3 km vs zadnji 3 km.`
        })
      }

      // 5. Glikogen
      if (a.ohNaKg !== null) {
        const barva = a.ohNaKg < 3 ? '#ef4444' : a.ohNaKg < 5 ? '#eab308' : '#22c55e'
        tocke.push({
          barva,
          tekst: `Glikogen: ${a.ohDanPrej}g OH dan prej / ${a.tezaKg}kg = ${a.ohNaKg}g/kg — ${a.glikogenOpis}${a.ohNaKg < 3 ? '. Glikogen se izčrpa hitro, telo preide na maščobe ki so manj učinkovite.' : '.'}`
        })
      }

      // 6. Kalorijski deficit
      if (a.deficitVceraj !== null) {
        const barva = a.deficitVceraj < -400 ? '#ef4444' : a.deficitVceraj < -200 ? '#eab308' : '#22c55e'
        const defStr = a.deficitVceraj > 0 ? `+${a.deficitVceraj} kcal suficit` : `${a.deficitVceraj} kcal deficit`
        const deficit7Str = a.povprecniDeficit7 !== null ? ` V zadnjih 7 dneh povprečno ${a.povprecniDeficit7 > 0 ? '+' : ''}${a.povprecniDeficit7} kcal/dan.` : ''
        let defKomentar = ''
        if (a.deficitVceraj !== null) {
          if (a.deficitVceraj < -600) defKomentar = ' Velik deficit — mišice in glikogen so bili slabo dopolnjeni.'
          else if (a.deficitVceraj < -300) defKomentar = ' Zmeren deficit — regeneracija bila omejena.'
          else if (a.deficitVceraj < 0) defKomentar = ' Blagi deficit — ni kritično.'
          else defKomentar = ' Suficit — dobro za regeneracijo.'
        }
        tocke.push({
          barva,
          tekst: `Kalorije dan prej: ${defStr} (zaužito ${Math.round(a.prehranaVceraj.kalorije_skupaj || 0)} kcal).${defKomentar}${deficit7Str}`
        })
      }

      // 7. HRV in spanje
      if (a.hrv || a.spanje) {
        const hrv = a.hrv ? `HRV ${a.hrv}ms${a.hrv < 45 ? ' — nizek, telo ni bilo regenerirano' : ' — ok'}` : ''
        const spanje = a.spanje ? `spanje ${fmt(a.spanje)}h${a.spanje < 6.5 ? ' — premalo' : ' — ok'}` : ''
        const barva = (a.hrv && a.hrv < 45) || (a.spanje && a.spanje < 6.5) ? '#eab308' : '#22c55e'
        tocke.push({
          barva,
          tekst: `Regeneracija dan prej: ${[hrv, spanje].filter(Boolean).join(', ')}.`
        })
      }

      // 8. Training Effect
      if (a.te) {
        const barva = a.te >= 4 ? '#f97316' : a.te >= 3 ? '#3b82f6' : '#22c55e'
        tocke.push({
          barva,
          tekst: `Training Effect: ${fmt(a.te, 1)} — ${a.teOpis}.`
        })
      }

      return (
        <div className="card" style={{marginBottom:16}}>
          <h3>Analiza zadnjega teka</h3>
          <div style={{display:'flex',gap:16,marginBottom:12,flexWrap:'wrap',alignItems:'center'}}>
            <span style={{fontFamily:'DM Mono',fontSize:13,color:'#94a3b8'}}>{a.tek.naziv}</span>
            <span style={{fontFamily:'DM Mono',fontSize:13,color:'#64748b'}}>{a.tek.datum}</span>
            <span style={{fontFamily:'DM Mono',fontSize:13,color:'#94a3b8'}}>{fmt(a.tek.razdalja_km)} km</span>
            <span style={{fontFamily:'DM Mono',fontSize:13,color:hrZonaColor(a.tek.povprecni_hr)}}>{a.tek.povprecni_hr} avg · {a.tek.max_hr} max bpm</span>
            <span style={{fontSize:13,padding:'2px 10px',borderRadius:4,background:ocenaColor+'22',color:ocenaColor,fontWeight:600}}>{ocenaEmoji} {ocena}</span>
          </div>
          {tocke.map((t, i) => (
            <div key={i} style={{display:'flex',gap:10,padding:'8px 12px',borderRadius:6,marginBottom:6,background:'#0f172a',borderLeft:`3px solid ${t.barva}`,fontSize:13,color:'#94a3b8',alignItems:'flex-start'}}>
              <span style={{lineHeight:1.5}}>{t.tekst}</span>
            </div>
          ))}
          {a.lapi.length > 0 && (
            <div style={{marginTop:12}}>
              <div style={{fontSize:11,color:'#475569',marginBottom:6,fontFamily:'DM Mono',textTransform:'uppercase',letterSpacing:'0.5px'}}>HR in tempo po km</div>
              <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
                {a.lapi.map((l, i) => (
                  <div key={i} style={{padding:'4px 8px',borderRadius:4,background:'#0f172a',border:'1px solid #1e2433',fontSize:11,fontFamily:'DM Mono',minWidth:70}}>
                    <div style={{color:'#475569'}}>{i+1}. km</div>
                    <div style={{color:hrZonaColor(l.povprecni_hr)}}>{l.povprecni_hr||'—'} bpm</div>
                    <div style={{color:'#64748b'}}>{l.povprecni_tempo||'—'}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )
    })()}


    


    <div className="card" style={{marginBottom:16}}>
      <h3>Km po tednih (samo teki)</h3>
      {kmPoTednih.length>0?(
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={kmPoTednih} margin={{top:4,right:0,left:-20,bottom:0}}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2433"/>
            <XAxis dataKey="teden" tick={{fontSize:11,fill:'#475569',fontFamily:'DM Mono'}}/>
            <YAxis tick={{fontSize:11,fill:'#475569',fontFamily:'DM Mono'}}/>
            <Tooltip contentStyle={{background:'#111827',border:'1px solid #1e2433',borderRadius:8,fontSize:12}}/>
            <Bar dataKey="km" fill="#3b82f6" radius={[4,4,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      ):<div className="empty">Ni dovolj podatkov</div>}
    </div>
    {hrEfik.length > 1 && (
        <div className="card" style={{marginBottom:16}}>
          <h3>HR efikasnost — tempo pri HR 155 bpm</h3>
          <div style={{fontSize:11,color:'#475569',marginBottom:8,fontFamily:'DM Mono'}}>Nižje = boljša aerobna efikasnost. Normaliziran na HR 155 bpm.</div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={hrEfik} margin={{top:4,right:16,left:10,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2433"/>
              <XAxis dataKey="datum" tick={{fontSize:10,fill:'#475569',fontFamily:'DM Mono'}} interval="preserveStartEnd"/>
              <YAxis
                reversed={true}
                domain={['auto','auto']}
                tick={{fontSize:10,fill:'#475569',fontFamily:'DM Mono'}}
                tickFormatter={v => { const m=Math.floor(v/60); const s=String(v%60).padStart(2,'0'); return `${m}:${s}` }}
                width={40}
              />
              <Tooltip
                contentStyle={{background:'#111827',border:'1px solid #1e2433',borderRadius:8,fontSize:12}}
                formatter={v=>{const m=Math.floor(v/60);const s=String(v%60).padStart(2,'0');return[`${m}:${s}/km`,'Tempo pri HR 155']}}
              />
              <Line type="monotone" dataKey="efik" stroke="#f59e0b" strokeWidth={2} dot={{r:4,fill:'#f59e0b'}}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    {loadScore.length > 1 && (
      <div className="card" style={{marginBottom:16}}>
        <h3>Tedenski load score</h3>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={loadScore} margin={{top:4,right:0,left:-20,bottom:0}}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2433"/>
            <XAxis dataKey="datum" tick={{fontSize:10,fill:'#475569',fontFamily:'DM Mono'}}/>
            <YAxis domain={[30, 100]} tick={{fontSize:10,fill:'#475569',fontFamily:'DM Mono'}}/>
            <Tooltip contentStyle={{background:'#111827',border:'1px solid #1e2433',borderRadius:8,fontSize:12}}/>
            <Bar dataKey="load" fill="#ef4444" radius={[3,3,0,0]}/>
          </BarChart>
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

    <div className="card">
      <h3>Vsi treningi ({workouts.length})</h3>
      <div className="workout-list" style={{maxHeight:420,overflowY:'auto'}}>
        {workouts.map((w,i)=>(<div key={i} className="workout-item"><span className="date">{w.datum?.slice(5)}</span><span className="type" style={{fontSize:11,minWidth:80}}>{w.naziv||w.tip_treninga||'—'}</span><span className="detail">{w.razdalja_km>0?`${fmt(w.razdalja_km)} km · `:''}{w.povprecni_tempo?`${w.povprecni_tempo}/km · `:''}{fmt(w.trajanje_min,0)} min</span>{w.vo2max>0&&<span style={{fontSize:11,color:'#a78bfa',fontFamily:'DM Mono'}}>VO2: {fmt(w.vo2max,1)}</span>}<span className="hr-badge" style={{background:hrZonaColor(w.povprecni_hr)+'22',color:hrZonaColor(w.povprecni_hr)}}>{w.povprecni_hr||'—'} bpm</span></div>))}
        {workouts.length===0&&<div className="empty">Ni podatkov</div>}
      </div>
      <NaslednjihPetTreningov/>
    </div>
  </>)
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
