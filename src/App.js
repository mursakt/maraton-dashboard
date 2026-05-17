import React, { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend, ComposedChart } from 'recharts'

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

function izracunajFormo(hrv, spanje, stres) {
  let score = 0; let factors = 0
  if (hrv) { const h = hrv<30?1:hrv<40?3:hrv<50?5:hrv<60?7:hrv<70?8:10; score+=h*0.4; factors+=0.4 }
  if (spanje) { const s = spanje<5?1:spanje<6?3:spanje<6.5?5:spanje<7?6:spanje<7.5?7.5:spanje<8?9:10; score+=s*0.35; factors+=0.35 }
  if (stres) { const st = stres>75?1:stres>60?3:stres>45?5:stres>35?6:stres>25?8:10; score+=st*0.25; factors+=0.25 }
  if (factors===0) return null
  return Math.round((score/factors)*10)/10
}
function formaColor(s) { if(!s)return'#6b7280'; if(s>=8)return'#22c55e'; if(s>=6)return'#84cc16'; if(s>=4)return'#eab308'; if(s>=2)return'#f97316'; return'#ef4444' }
function formaLabel(s) { if(!s)return'—'; if(s>=8)return'Odlično'; if(s>=6)return'Dobro'; if(s>=4)return'Povprečno'; if(s>=2)return'Slabo'; return'Kritično' }

// Pripravljenost na naslednji tek (0-100%)
function izracunajPripravljenost(metrike, prehrana, workouts) {
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

// Analiza zadnjega teka
function analizirajZadnjiTek(workouts, metrike, prehrana) {
  const zadnjiTek = workouts.find(w => isTek(w))
  if (!zadnjiTek) return null
  
  const tekDatum = zadnjiTek.datum
  const danPred = new Date(new Date(tekDatum) - 86400000).toISOString().slice(0, 10)
  
  const metrikeDanPred = metrike.find(m => m.datum === danPred) || {}
  const prehranaVceraj = prehrana.find(p => p.datum === danPred) || {}
  const metrikeTekDan = metrike.find(m => m.datum === tekDatum) || {}
  
  const razlogi = []
  let ocena = 'nevtralno'
  
  // HR analiza
  const hr = zadnjiTek.povprecni_hr
  if (hr > 169) {
    razlogi.push({ tip: 'warn', msg: `Visok povprečni HR (${hr} bpm) — Cona 4, zelo naporno` })
    ocena = 'težak'
  } else if (hr > 154) {
    razlogi.push({ tip: 'info', msg: `Povprečni HR ${hr} bpm — Cona 3, zmerno naporno` })
  } else {
    razlogi.push({ tip: 'ok', msg: `Povprečni HR ${hr} bpm — Cona 2, aerobno` })
    ocena = 'lahek'
  }
  
  // Prehrana dan prej
  if (prehranaVceraj.kalorije_skupaj) {
    if (prehranaVceraj.kalorije_skupaj < CILJI.kcal * 0.8) {
      razlogi.push({ tip: 'warn', msg: `Dan pred tekom: samo ${Math.round(prehranaVceraj.kalorije_skupaj)} kcal — premalo goriva (cilj ${CILJI.kcal})` })
      ocena = 'težak'
    } else {
      razlogi.push({ tip: 'ok', msg: `Dan pred tekom: ${Math.round(prehranaVceraj.kalorije_skupaj)} kcal — dovolj goriva` })
    }
  }
  
  if (prehranaVceraj.ogljikovi_hidrati_g) {
    if (prehranaVceraj.ogljikovi_hidrati_g < CILJI.oh * 0.7) {
      razlogi.push({ tip: 'warn', msg: `OH dan prej: ${Math.round(prehranaVceraj.ogljikovi_hidrati_g)}g — nizke glikogenske rezerve (cilj ${CILJI.oh}g)` })
      ocena = 'težak'
    } else {
      razlogi.push({ tip: 'ok', msg: `OH dan prej: ${Math.round(prehranaVceraj.ogljikovi_hidrati_g)}g — glikogen napolnjen` })
    }
  }
  
  // Spanje
  if (metrikeDanPred.spanje_h) {
    if (metrikeDanPred.spanje_h < 6.5) {
      razlogi.push({ tip: 'warn', msg: `Spanje dan prej: ${fmt(metrikeDanPred.spanje_h)}h — premalo regeneracije` })
      ocena = 'težak'
    } else {
      razlogi.push({ tip: 'ok', msg: `Spanje dan prej: ${fmt(metrikeDanPred.spanje_h)}h — dobra regeneracija` })
    }
  }
  
  // HRV
  if (metrikeDanPred.hrv) {
    if (metrikeDanPred.hrv < 40) {
      razlogi.push({ tip: 'warn', msg: `HRV dan prej: ${metrikeDanPred.hrv}ms — telo ni bilo regenerirano` })
      ocena = 'težak'
    } else {
      razlogi.push({ tip: 'ok', msg: `HRV dan prej: ${metrikeDanPred.hrv}ms — dobra regeneracija` })
    }
  }
  
  // TE analiza
  if (zadnjiTek.aerobni_te >= 4) {
    razlogi.push({ tip: 'warn', msg: `Training Effect ${fmt(zadnjiTek.aerobni_te, 1)} — zelo visoka obremenitev` })
  }
  
  return { tek: zadnjiTek, razlogi, ocena }
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
function ProgressBar({ value, max, color = '#3b82f6' }) {
  const pct = Math.min(100, Math.round((value/max)*100))
  return (<div className="progress-bar"><div className="progress-fill" style={{width:`${pct}%`,background:color}}/></div>)
}

export default function App() {
  const [tab, setTab] = useState('pregled')
  const [workouts, setWorkouts] = useState([])
  const [metrike, setMetrike] = useState([])
  const [prehrana, setPrehrana] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const currentTeden = getCurrentTeden()

  useEffect(() => {
    async function fetchAll() {
      setLoading(true)
      try {
        const [w,m,p] = await Promise.all([
          supabase.from('workouts').select('*').order('datum',{ascending:false}).limit(100),
          supabase.from('dnevne_metrike').select('*').order('datum',{ascending:false}).limit(120),
          supabase.from('prehrana').select('*').order('datum',{ascending:false}).limit(60),
        ])
        if(w.error)throw w.error; if(m.error)throw m.error; if(p.error)throw p.error
        setWorkouts(w.data||[]); setMetrike(m.data||[]); setPrehrana(p.data||[])
      } catch(e){setError(e.message)} finally{setLoading(false)}
    }
    fetchAll()
  }, [])

  if(loading) return(<div className="app"><style>{css}</style><div className="loading">Nalagam podatke…</div></div>)
  if(error) return(<div className="app"><style>{css}</style><div className="alert warn">⚠️ Napaka: {error}</div></div>)

  const planTeden = PLAN.find(p=>p.teden===currentTeden)
  const faza = planTeden?.faza||'F1'
  const zadnjeMetrike = metrike[0]||{}
  const formaScore = izracunajFormo(zadnjeMetrike.hrv, zadnjeMetrike.spanje_h, zadnjeMetrike.stres_povprecje)
  const predikcija = izracunajPredikcijo(workouts, metrike)

  return (
    <div className="app"><style>{css}</style>
      <div className="header">
        <h1>🏁 Maraton Ljubljana 2026</h1>
        <span className="sub">Timmu · cilj 3:45 · 17. oktober</span>
        <div className="teden-badge">Teden <span>T{String(currentTeden).padStart(2,'0')}</span> · <span style={{color:FAZA_COLOR[faza]}}>{FAZA_LABEL[faza]}</span></div>
      </div>
      <div className="tabs">
        {['pregled','treningi','telo','prehrana','plan','predikcija'].map(t=>(
          <button key={t} className={`tab ${tab===t?'active':''}`} onClick={()=>setTab(t)}>
            {{pregled:'🏠 Pregled',treningi:'🏃 Treningi',telo:'❤️ Telo & HRV',prehrana:'🥗 Prehrana',plan:'📅 Plan',predikcija:'🎯 Predikcija'}[t]}
          </button>
        ))}
      </div>
      {tab==='pregled'&&<TabPregled workouts={workouts} metrike={metrike} prehrana={prehrana} currentTeden={currentTeden} formaScore={formaScore} predikcija={predikcija}/>}
      {tab==='treningi'&&<TabTreningi workouts={workouts}/>}
      {tab==='telo'&&<TabTelo metrike={metrike}/>}
      {tab==='prehrana'&&<TabPrehrana prehrana={prehrana} workouts={workouts}/>}
      {tab==='plan'&&<TabPlan currentTeden={currentTeden}/>}
      {tab==='predikcija'&&<TabPredikcija predikcija={predikcija} workouts={workouts}/>}
    </div>
  )
}

function TabPregled({workouts,metrike,prehrana,currentTeden,formaScore,predikcija}){
  const planTeden=PLAN.find(p=>p.teden===currentTeden)
  const tedStart=planTeden?new Date(planTeden.datum):new Date()
  const tedEnd=new Date(tedStart);tedEnd.setDate(tedEnd.getDate()+7)
  const kmTaTeden=workouts.filter(w=>{const d=new Date(w.datum);return d>=tedStart&&d<tedEnd&&isTek(w)}).reduce((s,w)=>s+(w.razdalja_km||0),0)
  const z=metrike[0]||{}
  const zadnjaTeza=metrike.find(m=>m.teza_kg)?.teza_kg
  const pripravljenost = izracunajPripravljenost(metrike, prehrana, workouts)
  const analizaTeka = analizirajZadnjiTek(workouts, metrike, prehrana)
  const opozorilo = opozoriloPredTreningom(workouts, prehrana)
  
  // Kalorijski deficit/suficit
  const vcerajPrehrana = prehrana.find(p => p.datum === YESTERDAY_STR) || prehrana[0] || {}
  const vcerajMetrike = metrike.find(m => m.datum === YESTERDAY_STR) || {}
  const vcerajWorkout = workouts.filter(w => w.datum === YESTERDAY_STR)
  const aktivneKcalTrening = vcerajWorkout.reduce((s, w) => s + (w.kalorije || 0), 0)
  const pasivneKcal = 1800 // bazalni metabolizem estimat
  const skupajPorabljene = pasivneKcal + aktivneKcalTrening
  const zauziteKcal = vcerajPrehrana.kalorije_skupaj || 0
  const deficit = zauziteKcal - skupajPorabljene
  
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
        <h3>Pripravljenost na trek</h3>
        <div className="big-ring">
          <div className="big-ring-val" style={{color:pripravljenostColor(pripravljenost)}}>{pripravljenost ? `${pripravljenost}%` : '—'}</div>
          <div className="big-ring-label" style={{color:pripravljenostColor(pripravljenost),fontSize:10}}>{pripravljenostLabel(pripravljenost)}</div>
        </div>
      </div>
      <div className="card">
        <h3>Forma danes</h3>
        <div className="forma-ring">
          <div className="forma-score" style={{color:formaColor(formaScore)}}>{formaScore?fmt(formaScore):'—'}</div>
          <div className="forma-label" style={{color:formaColor(formaScore)}}>{formaLabel(formaScore)}</div>
          <div className="forma-sub">iz 10</div>
        </div>
      </div>
      <StatCard title="Km ta teden" value={fmt(kmTaTeden)} unit="km" sub={`plan: ${kmPlan} km`} color={kmTaTeden>=kmPlan?'#22c55e':'#f97316'}/>
      <StatCard title="Zadnja teža" value={zadnjaTeza?fmt(zadnjaTeza):'—'} unit="kg" sub={planTeden?`cilj: ${planTeden.ciljnaKg} kg`:''}/>
      <StatCard title="Dni do maratona" value={dniDoMaratona} sub="17. oktober 2026"/>
    </div>

    {/* Analiza zadnjega teka */}
    {analizaTeka && (
      <div className="card" style={{marginBottom:16}}>
        <h3>Analiza zadnjega teka — {analizaTeka.tek.naziv} ({analizaTeka.tek.datum})</h3>
        <div style={{display:'flex',gap:16,marginBottom:12,flexWrap:'wrap'}}>
          <span style={{fontFamily:'DM Mono',fontSize:13,color:'#94a3b8'}}>{fmt(analizaTeka.tek.razdalja_km)} km</span>
          <span style={{fontFamily:'DM Mono',fontSize:13,color:'#94a3b8'}}>{analizaTeka.tek.povprecni_tempo}/km</span>
          <span style={{fontFamily:'DM Mono',fontSize:13,color:hrZonaColor(analizaTeka.tek.povprecni_hr)}}>{analizaTeka.tek.povprecni_hr} bpm</span>
          <span style={{fontSize:13,padding:'2px 8px',borderRadius:4,background:analizaTeka.ocena==='težak'?'#45180333':analizaTeka.ocena==='lahek'?'#05291633':'#1e243333',color:analizaTeka.ocena==='težak'?'#fcd34d':analizaTeka.ocena==='lahek'?'#86efac':'#94a3b8',fontWeight:600}}>
            {analizaTeka.ocena==='težak'?'😤 Težak':analizaTeka.ocena==='lahek'?'😊 Lahek':'😐 Nevtralen'}
          </span>
        </div>
        {analizaTeka.razlogi.map((r,i)=>(
          <div key={i} className={`analiza-item ${r.tip}`}>
            <span>{r.tip==='ok'?'✓':r.tip==='warn'?'⚠':'ℹ'}</span>
            <span>{r.msg}</span>
          </div>
        ))}
      </div>
    )}

    <div className="grid2">
      <div className="card"><h3>Km ta teden</h3><ProgressBar value={kmTaTeden} max={kmPlan||1} color={kmTaTeden>=kmPlan?'#22c55e':'#3b82f6'}/><div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'#475569',fontFamily:'DM Mono',marginTop:6}}><span>{fmt(kmTaTeden)} km</span><span>{kmPlan} km cilj</span></div></div>
      <div className="card">
        <h3>🎯 Predikcija maratona</h3>
        {predCas ? (
          <div>
            <div style={{display:'flex',alignItems:'baseline',gap:12}}>
              <span className="pred-main">{predCas}</span>
              {diffSec !== null && (
                <span className={diffSec<=0?'pred-diff-pos':'pred-diff-neg'}>
                  {diffSec<=0?'':'+'}
                  {diffSec<0?'-':''}
                  {secToHMS(Math.abs(diffSec)).slice(1)}
                  {diffSec<=0?' pod ciljem':' nad ciljem'}
                </span>
              )}
            </div>
            <div className="pred-cilj">cilj: 3:45:00 · zanesljivost {predikcija.zanesljivost}%</div>
          </div>
        ) : <div className="empty" style={{padding:8}}>Ni dovolj podatkov</div>}
      </div>
    </div>

    {/* Kalorije: porabljene vs zaužite */}
    <div className="grid2" style={{marginBottom:16}}>
      <div className="card">
        <h3>Kalorije včeraj</h3>
        <div style={{display:'flex',gap:16,alignItems:'flex-end',marginBottom:8}}>
          <div>
            <div style={{fontSize:11,color:'#64748b',marginBottom:4}}>Porabljene</div>
            <div style={{fontSize:24,fontFamily:'DM Mono',fontWeight:300}}>{skupajPorabljene} <span style={{fontSize:12,color:'#64748b'}}>kcal</span></div>
            <div style={{fontSize:11,color:'#475569'}}>~{pasivneKcal} bazal + {aktivneKcalTrening} trening</div>
          </div>
          <div style={{fontSize:28,color:'#1e2433'}}>vs</div>
          <div>
            <div style={{fontSize:11,color:'#64748b',marginBottom:4}}>Zaužite</div>
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
    </div>

    <div className="grid2">
      <div className="card"><h3>Pot do maratona</h3><ProgressBar value={currentTeden} max={24} color='#ef4444'/><div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'#475569',fontFamily:'DM Mono',marginTop:6}}><span>Teden {currentTeden}</span><span>{Math.round((currentTeden/24)*100)}% opravljeno</span></div></div>
      <div className="grid3" style={{margin:0}}>
        <StatCard title="HRV (zadnji)" value={z.hrv?fmt(z.hrv,0):'—'} unit="ms" sub="cilj: >50ms" color={z.hrv>50?'#22c55e':z.hrv>35?'#eab308':'#ef4444'}/>
        <StatCard title="Spanje" value={z.spanje_h?fmt(z.spanje_h):'—'} unit="h" sub="cilj: >7.5h" color={z.spanje_h>=7.5?'#22c55e':z.spanje_h>=6.5?'#eab308':'#ef4444'}/>
        <StatCard title="Stres" value={z.stres_povprecje?fmt(z.stres_povprecje,0):'—'} sub="cilj: <30" color={!z.stres_povprecje?'#6b7280':z.stres_povprecje<30?'#22c55e':z.stres_povprecje<50?'#eab308':'#ef4444'}/>
      </div>
    </div>
    <div className="card">
      <h3>Zadnji 5 treningov</h3>
      <div className="workout-list">
        {workouts.slice(0,5).map((w,i)=>(<div key={i} className="workout-item"><span className="date">{w.datum?.slice(5)}</span><span className="type">{w.naziv||w.tip_treninga||'—'}</span><span className="detail">{fmt(w.razdalja_km)} km · {w.povprecni_tempo||'—'}/km · {fmt(w.trajanje_min,0)} min</span><span className="hr-badge" style={{background:hrZonaColor(w.povprecni_hr)+'22',color:hrZonaColor(w.povprecni_hr)}}>{w.povprecni_hr?`${w.povprecni_hr} bpm`:'—'}</span></div>))}
        {workouts.length===0&&<div className="empty">Ni podatkov</div>}
      </div>
    </div>
  </>)
}

function TabPrehrana({prehrana, workouts}){
  // Vedno prikaži včerajšnje podatke
  const vceraj = prehrana.find(p => p.datum === YESTERDAY_STR) || prehrana.filter(p => p.kalorije_skupaj > 0)[0] || {}
  
  const prikazDatum = vceraj.datum || YESTERDAY_STR
  
  // Povprečje 7 dni (samo dnevi z vnosi)
  const z7 = prehrana.filter(p => p.kalorije_skupaj > 0).slice(0, 7)
  const avgKcal = z7.reduce((s,p,_,a) => s + p.kalorije_skupaj/a.length, 0) || 0
  const avgBelj = z7.reduce((s,p,_,a) => s + p.beljakovine_g/a.length, 0) || 0
  const avgOH = z7.reduce((s,p,_,a) => s + p.ogljikovi_hidrati_g/a.length, 0) || 0
  const avgMasc = z7.reduce((s,p,_,a) => s + p.mascobe_g/a.length, 0) || 0

  // Grafi za zadnjih 14 dni
  const graf14 = prehrana.filter(p => p.kalorije_skupaj > 0).slice(0, 14).reverse()
  const kcalData = graf14.map(p => ({ datum: p.datum?.slice(5), kcal: p.kalorije_skupaj, cilj: CILJI.kcal }))
  const beljData = graf14.map(p => ({ datum: p.datum?.slice(5), val: p.beljakovine_g, cilj: CILJI.belj }))
  const ohData = graf14.map(p => ({ datum: p.datum?.slice(5), val: p.ogljikovi_hidrati_g, cilj: CILJI.oh }))
  const mascData = graf14.map(p => ({ datum: p.datum?.slice(5), val: p.mascobe_g, cilj: CILJI.masc }))

  // Kalorijski deficit graf
  const deficitData = graf14.map(p => {
    const w = workouts.filter(w2 => w2.datum === p.datum).reduce((s, w2) => s + (w2.kalorije || 0), 0)
    const porabljene = 1800 + w
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

  return(<>
    {/* Včerajšnji makri */}
    <div style={{marginBottom:8,fontSize:12,color:'#475569',fontFamily:'DM Mono'}}>Prikazujem podatke za: <span style={{color:'#94a3b8'}}>{prikazDatum}</span></div>
    <div className="grid4" style={{marginBottom:16}}>
      {[
        { title: 'Kalorije (včeraj)', val: vceraj.kalorije_skupaj, cilj: CILJI.kcal, unit: 'kcal', isDiffKcal: true },
        { title: 'Beljakovine (včeraj)', val: vceraj.beljakovine_g, cilj: CILJI.belj, unit: 'g' },
        { title: 'OH (včeraj)', val: vceraj.ogljikovi_hidrati_g, cilj: CILJI.oh, unit: 'g' },
        { title: 'Maščobe (včeraj)', val: vceraj.mascobe_g, cilj: CILJI.masc, unit: 'g' },
      ].map((m, i) => (
        <div key={i} className="macro-card">
          <h3>{m.title}</h3>
          <div className="macro-val" style={{color: m.val ? diffColor(m.val, m.cilj) : '#475569'}}>
            {m.val ? fmt(m.val, 0) : '—'}<span style={{fontSize:13,color:'#64748b',marginLeft:4}}>{m.unit}</span>
          </div>
          <div className="macro-cilj">cilj: {m.cilj}{m.unit}</div>
          {m.val && <div className="macro-diff" style={{color: diffColor(m.val, m.cilj)}}>
            {m.isDiffKcal ? diffStrKcal(m.val, m.cilj) : diffStr(m.val, m.cilj)}
          </div>}
          {m.val && <ProgressBar value={m.val} max={m.cilj * 1.3} color={diffColor(m.val, m.cilj)}/>}
        </div>
      ))}
    </div>

    {/* Kalorijski deficit graf */}
    <div className="card" style={{marginBottom:16}}>
      <h3>Zaužite vs porabljene kalorije — zadnjih 14 dni</h3>
      {deficitData.length > 1 ? (
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={deficitData} margin={{top:4,right:4,left:-20,bottom:0}}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2433"/>
            <XAxis dataKey="datum" {...axisProps}/>
            <YAxis tick={{fontSize:10,fill:'#475569',fontFamily:'DM Mono'}}/>
            <Tooltip {...tooltipProps}/>
            <Legend wrapperStyle={{fontSize:11,color:'#94a3b8'}}/>
            <Bar dataKey="zauzite" fill="#f97316" radius={[3,3,0,0]} name="Zaužite"/>
            <Bar dataKey="porabljene" fill="#3b82f620" radius={[3,3,0,0]} name="Porabljene (est.)" stroke="#3b82f6" strokeWidth={1}/>
          </ComposedChart>
        </ResponsiveContainer>
      ) : <div className="empty">Ni dovolj podatkov</div>}
    </div>

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

    {/* Linijski grafi za makre */}
    <div className="grid2">
      {[
        { title: 'Kalorije — zadnjih 14 dni', data: kcalData, key: 'kcal', cilj: CILJI.kcal, color: '#f97316', unit: 'kcal' },
        { title: 'Beljakovine — zadnjih 14 dni', data: beljData, key: 'val', cilj: CILJI.belj, color: '#22c55e', unit: 'g' },
        { title: 'OH — zadnjih 14 dni', data: ohData, key: 'val', cilj: CILJI.oh, color: '#3b82f6', unit: 'g' },
        { title: 'Maščobe — zadnjih 14 dni', data: mascData, key: 'val', cilj: CILJI.masc, color: '#a78bfa', unit: 'g' },
      ].map((g, i) => (
        <div key={i} className="card">
          <h3>{g.title}</h3>
          {g.data.length > 1 ? (
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={g.data} margin={{top:4,right:4,left:-20,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2433"/>
                <XAxis dataKey="datum" {...axisProps}/>
                <YAxis tick={{fontSize:10,fill:'#475569',fontFamily:'DM Mono'}}/>
                <Tooltip {...tooltipProps} formatter={v=>[`${Math.round(v)} ${g.unit}`, '']}/>
                <ReferenceLine y={g.cilj} stroke={g.color} strokeDasharray="4 4" strokeOpacity={0.5}/>
                <Line type="monotone" dataKey={g.key} stroke={g.color} strokeWidth={2} dot={{r:3,fill:g.color}}/>
              </LineChart>
            </ResponsiveContainer>
          ) : <div className="empty">Ni dovolj podatkov</div>}
        </div>
      ))}
    </div>
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

function TabTreningi({workouts}){
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
  const hrEfik = teki.filter(w => w.povprecni_hr && w.razdalja_km && w.trajanje_min).slice(0, 14).reverse().map(w => ({
    datum: w.datum?.slice(5),
    efik: Math.round((w.razdalja_km / (w.trajanje_min / 60)) * 10) / 10 // km/h
  }))

  // Load score
  const loadScore = workouts.filter(w => w.trajanje_min && w.aerobni_te).slice(0, 14).reverse().map(w => ({
    datum: w.datum?.slice(5),
    load: Math.round(w.trajanje_min * (w.aerobni_te / 2))
  }))

  return(<>
    <div className="grid3">
      <StatCard title="Skupaj km (teki)" value={fmt(totalKm,0)} unit="km"/>
      <StatCard title="Povp. HR na tekih" value={avgHR?fmt(avgHR,0):'—'} unit="bpm" sub={avgHR?`Cona ${hrZona(avgHR)}`:''} color={hrZonaColor(avgHR)}/>
      <StatCard title="Število tekov" value={teki.length} sub="v bazi"/>
    </div>
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
    <div className="grid2" style={{marginBottom:16}}>
      {vo2Data.length>1&&(
        <div className="card">
          <h3>VO2max trend</h3>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={vo2Data} margin={{top:4,right:4,left:-20,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2433"/>
              <XAxis dataKey="datum" tick={{fontSize:10,fill:'#475569',fontFamily:'DM Mono'}} interval="preserveStartEnd"/>
              <YAxis domain={['auto','auto']} tick={{fontSize:10,fill:'#475569',fontFamily:'DM Mono'}}/>
              <Tooltip contentStyle={{background:'#111827',border:'1px solid #1e2433',borderRadius:8,fontSize:12}} formatter={v=>[fmt(v,1),'VO2max']}/>
              <Line type="monotone" dataKey="vo2" stroke="#a78bfa" strokeWidth={2} dot={{r:3,fill:'#a78bfa'}}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      {hrEfik.length > 1 && (
        <div className="card">
          <h3>HR efikasnost (km/h)</h3>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={hrEfik} margin={{top:4,right:4,left:-20,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2433"/>
              <XAxis dataKey="datum" tick={{fontSize:10,fill:'#475569',fontFamily:'DM Mono'}} interval="preserveStartEnd"/>
              <YAxis domain={['auto','auto']} tick={{fontSize:10,fill:'#475569',fontFamily:'DM Mono'}}/>
              <Tooltip contentStyle={{background:'#111827',border:'1px solid #1e2433',borderRadius:8,fontSize:12}} formatter={v=>[`${v} km/h`, 'Hitrost']}/>
              <Line type="monotone" dataKey="efik" stroke="#f59e0b" strokeWidth={2} dot={{r:3,fill:'#f59e0b'}}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
    {loadScore.length > 1 && (
      <div className="card" style={{marginBottom:16}}>
        <h3>Tedenski load score</h3>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={loadScore} margin={{top:4,right:0,left:-20,bottom:0}}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2433"/>
            <XAxis dataKey="datum" tick={{fontSize:10,fill:'#475569',fontFamily:'DM Mono'}}/>
            <YAxis tick={{fontSize:10,fill:'#475569',fontFamily:'DM Mono'}}/>
            <Tooltip contentStyle={{background:'#111827',border:'1px solid #1e2433',borderRadius:8,fontSize:12}}/>
            <Bar dataKey="load" fill="#ef4444" radius={[3,3,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </div>
    )}
    <div className="card">
      <h3>Vsi treningi ({workouts.length})</h3>
      <div className="workout-list" style={{maxHeight:420,overflowY:'auto'}}>
        {workouts.map((w,i)=>(<div key={i} className="workout-item"><span className="date">{w.datum?.slice(5)}</span><span className="type" style={{fontSize:11,minWidth:80}}>{w.naziv||w.tip_treninga||'—'}</span><span className="detail">{w.razdalja_km>0?`${fmt(w.razdalja_km)} km · `:''}{w.povprecni_tempo?`${w.povprecni_tempo}/km · `:''}{fmt(w.trajanje_min,0)} min</span>{w.vo2max>0&&<span style={{fontSize:11,color:'#a78bfa',fontFamily:'DM Mono'}}>VO2: {fmt(w.vo2max,1)}</span>}<span className="hr-badge" style={{background:hrZonaColor(w.povprecni_hr)+'22',color:hrZonaColor(w.povprecni_hr)}}>{w.povprecni_hr||'—'} bpm</span></div>))}
        {workouts.length===0&&<div className="empty">Ni podatkov</div>}
      </div>
    </div>
  </>)
}

function TabTelo({metrike}){
  const tezaDejansko=metrike.filter(m=>m.teza_kg&&m.datum>='2026-04-20').slice(0,60).reverse()
  const tezaGraf=tezaDejansko.map(m=>{
    const p=PLAN.slice().reverse().find(pl=>pl.datum<=m.datum)
    return{datum:m.datum?.slice(5),dejanska:m.teza_kg,plan:p?.ciljnaKg||null}
  })
  const hrvData=metrike.filter(m=>m.hrv).slice(0,20).reverse().map(m=>({datum:m.datum?.slice(5),hrv:m.hrv}))
  const spanjeData=metrike.filter(m=>m.spanje_h).slice(0,14).reverse().map(m=>({datum:m.datum?.slice(5),ure:m.spanje_h}))
  const formaData=metrike.slice(0,14).reverse().map(m=>({datum:m.datum?.slice(5),forma:izracunajFormo(m.hrv,m.spanje_h,m.stres_povprecje)})).filter(d=>d.forma!==null)
  const z=metrike[0]||{}
  const avgSpanje=metrike.filter(m=>m.spanje_h).slice(0,7).reduce((s,m,_,a)=>s+m.spanje_h/a.length,0)
  const avgHRV=metrike.filter(m=>m.hrv).slice(0,7).reduce((s,m,_,a)=>s+m.hrv/a.length,0)
  const zadnjaTeza=metrike.find(m=>m.teza_kg)?.teza_kg
  const formaScore=izracunajFormo(z.hrv,z.spanje_h,z.stres_povprecje)

  return(<>
    <div className="grid5">
      <StatCard title="Teža (zadnja)" value={zadnjaTeza?fmt(zadnjaTeza):'—'} unit="kg"/>
      <StatCard title="HRV (zadnji)" value={z.hrv?fmt(z.hrv,0):'—'} unit="ms" color={z.hrv>50?'#22c55e':z.hrv>35?'#eab308':'#ef4444'}/>
      <StatCard title="Spanje povp. 7d" value={avgSpanje?fmt(avgSpanje):'—'} unit="h" color={avgSpanje>=7.5?'#22c55e':avgSpanje>=6.5?'#eab308':'#ef4444'}/>
      <StatCard title="HRV povp. 7d" value={avgHRV?fmt(avgHRV,0):'—'} unit="ms" color={avgHRV>50?'#22c55e':avgHRV>35?'#eab308':'#ef4444'}/>
      <div className="card"><h3>Forma danes</h3><div className="forma-ring"><div className="forma-score" style={{color:formaColor(formaScore)}}>{formaScore?fmt(formaScore):'—'}</div><div className="forma-label" style={{color:formaColor(formaScore)}}>{formaLabel(formaScore)}</div><div className="forma-sub">iz 10</div></div></div>
    </div>
    <div className="card" style={{marginBottom:16}}>
      <h3>Teža — dejanska vs plan (kg)</h3>
      {tezaGraf.length>1?(
        <ResponsiveContainer width="100%" height={200}>
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
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={hrvData} margin={{top:4,right:4,left:-20,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2433"/>
              <XAxis dataKey="datum" tick={{fontSize:10,fill:'#475569',fontFamily:'DM Mono'}} interval="preserveStartEnd"/>
              <YAxis tick={{fontSize:10,fill:'#475569',fontFamily:'DM Mono'}}/>
              <Tooltip contentStyle={{background:'#111827',border:'1px solid #1e2433',borderRadius:8,fontSize:12}}/>
              <ReferenceLine y={50} stroke="#22c55e" strokeDasharray="4 4"/>
              <Line type="monotone" dataKey="hrv" stroke="#22c55e" strokeWidth={2} dot={false}/>
            </LineChart>
          </ResponsiveContainer>
        ):<div className="empty">Ni dovolj podatkov</div>}
      </div>
      <div className="card">
        <h3>Forma trend (zadnjih 14 dni)</h3>
        {formaData.length>1?(
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={formaData} margin={{top:4,right:4,left:-20,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2433"/>
              <XAxis dataKey="datum" tick={{fontSize:10,fill:'#475569',fontFamily:'DM Mono'}} interval="preserveStartEnd"/>
              <YAxis domain={[0,10]} tick={{fontSize:10,fill:'#475569',fontFamily:'DM Mono'}}/>
              <Tooltip contentStyle={{background:'#111827',border:'1px solid #1e2433',borderRadius:8,fontSize:12}}/>
              <ReferenceLine y={6} stroke="#22c55e" strokeDasharray="4 4"/>
              <Line type="monotone" dataKey="forma" stroke="#f59e0b" strokeWidth={2} dot={{r:3,fill:'#f59e0b'}}/>
            </LineChart>
          </ResponsiveContainer>
        ):<div className="empty">Ni dovolj podatkov</div>}
      </div>
    </div>
    <div className="card">
      <h3>Spanje (ure) — zadnjih 14 dni</h3>
      {spanjeData.length>1?(
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={spanjeData} margin={{top:4,right:0,left:-20,bottom:0}}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2433"/>
            <XAxis dataKey="datum" tick={{fontSize:10,fill:'#475569',fontFamily:'DM Mono'}}/>
            <YAxis domain={[4,10]} tick={{fontSize:10,fill:'#475569',fontFamily:'DM Mono'}}/>
            <Tooltip contentStyle={{background:'#111827',border:'1px solid #1e2433',borderRadius:8,fontSize:12}}/>
            <ReferenceLine y={7.5} stroke="#22c55e" strokeDasharray="4 4"/>
            <Bar dataKey="ure" fill="#8b5cf6" radius={[3,3,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      ):<div className="empty">Ni dovolj podatkov</div>}
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
