import React from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ComposedChart, Bar } from 'recharts'
import { CILJI, TODAY_STR, YESTERDAY_STR } from '../constants/plan'
import { fmt } from '../utils/helpers'
import { ProgressBar } from './ProgressBar'

export function TabPrehrana({prehrana, workouts, metrike=[], prehranaCilji=[], onRefresh}){
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
  const waterfall7 = prehrana.filter(p => p.kalorije_skupaj > 0).slice(0, 7).reverse().map(p => {
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
    const def = p.kalorije_skupaj - porabljene
    return { datum: p.datum?.slice(5), zauzite: p.kalorije_skupaj, porabljene, deficit: def }
  })

  // Analiza trendov
  // ===== RULE-BASED ANALIZA =====
  const z30 = prehrana.filter(p => p.kalorije_skupaj > 0).slice(0, 30)
  const avg30Kcal = z30.reduce((s,p,_,a) => s + p.kalorije_skupaj/a.length, 0) || 0
  const avg30Belj = z30.reduce((s,p,_,a) => s + p.beljakovine_g/a.length, 0) || 0
  const avg30OH   = z30.reduce((s,p,_,a) => s + p.ogljikovi_hidrati_g/a.length, 0) || 0

  const trendStr = (v7, v30) => {
    if (!v7 || !v30) return ''
    if (v7 > v30 * 1.05) return ' ↑'
    if (v7 < v30 * 0.95) return ' ↓'
    return ' →'
  }
  const pc = (v, c) => Math.round(v / c * 100)

  const z7mikro = z7.filter(p => p.natrij_mg > 0)
  const avgM = key => { const v = z7mikro.map(p => p[key]).filter(v => v > 0); return v.length ? v.reduce((s,x) => s+x,0)/v.length : null }
  const mikro = {
    natrij: avgM('natrij_mg'), kalij: avgM('kalij_mg'), vlaknine: avgM('vlaknine_g'),
    sladkorji: avgM('sladkorji_g'), vitamin_c: avgM('vitamin_c_mg'), železo: avgM('železo_mg'),
  }

  const kritično = [], opozorila = [], vRedu = []

  // Kalorije
  if (avgKcal > 0) {
    const p = pc(avgKcal, CILJI.kcal), t = trendStr(avgKcal, avg30Kcal)
    if (p < 75) kritično.push({ naziv: 'Kalorije', msg: `${Math.round(avgKcal)} kcal = ${p}% cilja${t}. Deficit ${Math.round(CILJI.kcal-avgKcal)} kcal/dan → telo razgrajuje mišično tkivo, regeneracija trpi.`, fix: `Dodaj: riž 200g = 260kcal, ovseni kosmiči 80g = 300kcal, orehi 30g = 200kcal.` })
    else if (p < 90) opozorila.push({ naziv: 'Kalorije', msg: `${Math.round(avgKcal)} kcal = ${p}% cilja${t}. Na dneve z gibi podhranjeno.`, fix: `Dodaj ~${Math.round(CILJI.kcal-avgKcal)} kcal: banana + orehi + skyr = ~350 kcal.` })
    else if (p > 115) opozorila.push({ naziv: 'Kalorije — suficit', msg: `${Math.round(avgKcal)} kcal = ${p}% cilja${t}. +${Math.round(avgKcal-CILJI.kcal)} kcal/dan.`, fix: 'Zmanjšaj maščobe in sladkorje na počivalne dni.' })
    else vRedu.push(`Kalorije ${Math.round(avgKcal)} kcal (${p}%)`)
  }
  // Beljakovine
  if (avgBelj > 0) {
    const p = pc(avgBelj, CILJI.belj), t = trendStr(avgBelj, avg30Belj)
    const gkg = Math.round(avgBelj/80*10)/10
    if (p < 75) kritično.push({ naziv: 'Beljakovine', msg: `${Math.round(avgBelj)}g = ${p}% cilja${t} (${gkg}g/kg). Pod 1.4g/kg → mišice se razgrajujejo po tekih namesto gradijo.`, fix: `Piščančje prsi 200g = 50g, skyr 200g = 20g, tuna 150g = 35g, jajca 3× = 18g.` })
    else if (p < 90) opozorila.push({ naziv: 'Beljakovine', msg: `${Math.round(avgBelj)}g = ${p}% cilja${t} (${gkg}g/kg). Regeneracija suboptimalna.`, fix: `Dodaj ~${Math.round(CILJI.belj-avgBelj)}g/dan: skyr 200g ali piščanec 150g.` })
    else vRedu.push(`Beljakovine ${Math.round(avgBelj)}g (${p}%)`)
  }
  // OH
  if (avgOH > 0) {
    const p = pc(avgOH, CILJI.oh), t = trendStr(avgOH, avg30OH)
    if (p < 70) kritično.push({ naziv: 'Ogljikovi hidrati', msg: `${Math.round(avgOH)}g = ${p}% cilja${t} (${Math.round(avgOH/80*10)/10}g/kg). Glikogen kronično izpraznjen → teki napornejši, okrevanje počasnejše.`, fix: `Riž 200g = 52g, testenine 200g = 60g, ovseni kosmiči 80g = 52g, krompir 200g = 36g.` })
    else if (p < 85) opozorila.push({ naziv: 'Ogljikovi hidrati', msg: `${Math.round(avgOH)}g = ${p}% cilja${t}. Dan pred tekom moraš biti nad ${CILJI.oh}g.`, fix: `Banana + riž + kruh = +${Math.round(CILJI.oh-avgOH)}g OH.` })
    else vRedu.push(`OH ${Math.round(avgOH)}g (${p}%)`)
  }
  // Maščobe
  if (avgMasc > 0) {
    const p = pc(avgMasc, CILJI.masc)
    if (p < 60) opozorila.push({ naziv: 'Maščobe', msg: `${Math.round(avgMasc)}g = ${p}% cilja. Slabša absorpcija vitaminov A/D/E/K, hormonske motnje.`, fix: 'Avokado ½ = 15g, olivno olje 1 žlica = 14g, orehi 30g = 18g.' })
    else if (p > 140) opozorila.push({ naziv: 'Maščobe — presežek', msg: `${Math.round(avgMasc)}g = ${p}% cilja. Izpodriva prostor za OH — primarni vir energije za maraton.`, fix: 'Zmanjšaj ocvrto hrano in predelane snacke.' })
    else vRedu.push(`Maščobe ${Math.round(avgMasc)}g (${p}%)`)
  }
  // Mikrohranila
  if (z7mikro.length >= 2) {
    const mikroDef = [
      { key:'železo',    naziv:'Železo',     cilj:18,   enota:'mg', kritPct:55, opoPct:75,
        msg:(p,v) => `${Math.round(v*10)/10}mg = ${p}% cilja (18mg). Anemija znižuje kapaciteto O₂ — neposreden vpliv na vzdržljivost.`,
        hrana:'Goveja jetra 100g = 6mg, leča 200g = 7mg, špinača 200g = 5mg. Z vit. C poveča absorpcijo 3×.' },
      { key:'kalij',     naziv:'Kalij',      cilj:3500, enota:'mg', kritPct:50, opoPct:70,
        msg:(p,v) => `${Math.round(v)}mg = ${p}% cilja (3500mg). Mišični krči, motnje srčnega ritma med dolgimi teki.`,
        hrana:'Sladki krompir 200g = 700mg, avokado 150g = 700mg, fižol 200g = 1000mg, banana = 420mg.',
        presežekPct:150, presežekMsg:(p,v) => `${Math.round(v)}mg = ${p}% cilja. Neravnovesje z natrijem → motnje ritma pri ekstremnih naporih.` },
      { key:'vlaknine',  naziv:'Vlaknine',   cilj:30,   enota:'g',  kritPct:40, opoPct:65,
        msg:(p,v) => `${Math.round(v*10)/10}g = ${p}% cilja (30g). Slabša prebava, počasnejše sproščanje energije.`,
        hrana:'Ovseni kosmiči 80g = 8g, leča 200g = 8g, polnozrnati kruh 2r = 4g, jabolko = 4g.',
        presežekPct:200, presežekMsg:(p,v) => `${Math.round(v)}g = ${p}% cilja. Pazi dan pred tekom — GI težave med tekom.` },
      { key:'vitamin_c', naziv:'Vitamin C',  cilj:90,   enota:'mg', kritPct:40, opoPct:65,
        msg:(p,v) => `${Math.round(v)}mg = ${p}% cilja (90mg). Slabša absorpcija železa in imunska funkcija.`,
        hrana:'Rdeča paprika 100g = 140mg, pomaranča = 70mg, brokoli 100g = 90mg, jagode 150g = 85mg.' },
      { key:'natrij',    naziv:'Natrij',     cilj:2300, enota:'mg', kritPct:null, opoPct:null,
        presežekPct:150, presežekMsg:(p,v) => `${Math.round(v)}mg = ${p}% cilja (2300mg). Zadržavanje vode, višji krvni tlak, slabša ekonomičnost teka.` },
      { key:'sladkorji', naziv:'Sladkorji',  cilj:50,   enota:'g',  kritPct:null, opoPct:null,
        presežekPct:150, presežekMsg:(p,v) => `${Math.round(v)}g = ${p}% cilja (50g). Nihanje krvnega sladkorja → energijski padci med tekom.` },
    ]
    mikroDef.forEach(m => {
      const v = mikro[m.key]; if (!v) return
      const p = pc(v, m.cilj)
      if (m.kritPct && p < m.kritPct) kritično.push({ naziv: m.naziv, msg: m.msg(p, v), fix: m.hrana })
      else if (m.opoPct && p < m.opoPct) opozorila.push({ naziv: m.naziv, msg: m.msg(p, v), fix: m.hrana })
      else if (m.presežekPct && p > m.presežekPct) opozorila.push({ naziv: `${m.naziv} — presežek`, msg: m.presežekMsg(p, v), fix: null })
      else if (m.kritPct) vRedu.push(`${m.naziv} ${Math.round(v*10)/10}${m.enota} (${p}%)`)
    })
  }

  // Vzorci iz podatkov
  const vzorci = []
  const tekiZOH = workouts.filter(w => w.razdalja_km > 5 && w.povprecni_hr).slice(0, 15).map(w => {
    const vd = new Date(new Date(w.datum).getTime()-86400000).toISOString().slice(0,10)
    const p = prehrana.find(p2 => p2.datum === vd)
    return p?.ogljikovi_hidrati_g ? { oh: p.ogljikovi_hidrati_g, hr: w.povprecni_hr } : null
  }).filter(Boolean)
  if (tekiZOH.length >= 4) {
    const s = [...tekiZOH].sort((a,b) => a.oh-b.oh)
    const sp = s.slice(0,Math.floor(s.length/2)), zg = s.slice(Math.ceil(s.length/2))
    const hr1 = Math.round(sp.reduce((a,d)=>a+d.hr,0)/sp.length)
    const hr2 = Math.round(zg.reduce((a,d)=>a+d.hr,0)/zg.length)
    const oh1 = Math.round(sp.reduce((a,d)=>a+d.oh,0)/sp.length)
    const oh2 = Math.round(zg.reduce((a,d)=>a+d.oh,0)/zg.length)
    if (Math.abs(hr1-hr2) >= 3) vzorci.push(`OH dan prej: ko ~${oh1}g → avg HR ${hr1}bpm na teku | ko ~${oh2}g → ${hr2}bpm (${Math.abs(hr1-hr2)}bpm razlika, ${tekiZOH.length} tekov)`)
  }
  const kcalHRV = prehrana.filter(p => p.kalorije_skupaj > 0).slice(0,20).map(p => {
    const jutri = new Date(new Date(p.datum).getTime()+86400000).toISOString().slice(0,10)
    const m = metrike.find(m2 => m2.datum===jutri)
    return m?.hrv ? { kcal: p.kalorije_skupaj, hrv: m.hrv } : null
  }).filter(Boolean)
  if (kcalHRV.length >= 5) {
    const s = [...kcalHRV].sort((a,b) => a.kcal-b.kcal)
    const sp = s.slice(0,Math.floor(s.length/2)), zg = s.slice(Math.ceil(s.length/2))
    const h1 = Math.round(sp.reduce((a,d)=>a+d.hrv,0)/sp.length)
    const h2 = Math.round(zg.reduce((a,d)=>a+d.hrv,0)/zg.length)
    const k1 = Math.round(sp.reduce((a,d)=>a+d.kcal,0)/sp.length)
    const k2 = Math.round(zg.reduce((a,d)=>a+d.kcal,0)/zg.length)
    if (Math.abs(h1-h2) >= 3) vzorci.push(`Kalorije → HRV: ko ~${k1}kcal → HRV ${h1}ms | ko ~${k2}kcal → ${h2}ms (${Math.abs(h1-h2)}ms razlika)`)
  }
  const beljHRV = prehrana.filter(p => p.beljakovine_g > 0).slice(0,20).map(p => {
    const jutri = new Date(new Date(p.datum).getTime()+86400000).toISOString().slice(0,10)
    const m = metrike.find(m2 => m2.datum===jutri)
    return m?.hrv ? { belj: p.beljakovine_g, hrv: m.hrv } : null
  }).filter(Boolean)
  if (beljHRV.length >= 5) {
    const s = [...beljHRV].sort((a,b) => a.belj-b.belj)
    const sp = s.slice(0,Math.floor(s.length/2)), zg = s.slice(Math.ceil(s.length/2))
    const h1 = Math.round(sp.reduce((a,d)=>a+d.hrv,0)/sp.length)
    const h2 = Math.round(zg.reduce((a,d)=>a+d.hrv,0)/zg.length)
    const cut = Math.round(s[Math.floor(s.length/2)].belj)
    if (Math.abs(h1-h2) >= 3) vzorci.push(`Beljakovine → HRV: ko pod ${cut}g → HRV ${h1}ms | ko nad ${cut}g → ${h2}ms (${Math.abs(h1-h2)}ms razlika)`)
  }

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
                      <div style={{color:'#64748b'}}>Skupaj porabljene: {Math.round(d.skupajPor)} kcal</div>
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
        <h3>Analiza trendov — zadnjih 7 dni</h3>
        {kritično.length === 0 && opozorila.length === 0 && <div style={{fontSize:12,color:'#22c55e',marginBottom:8}}>✓ Vse metrike v redu.</div>}
        {kritično.map((item, i) => (
          <div key={i} style={{borderLeft:'3px solid #ef4444',paddingLeft:10,marginBottom:10}}>
            <div style={{fontSize:11,fontWeight:600,color:'#f87171',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:3}}>🔴 {item.naziv}</div>
            <div style={{fontSize:12,color:'#94a3b8',lineHeight:1.6}}>{item.msg}</div>
            {item.fix && <div style={{fontSize:11,color:'#475569',marginTop:4}}>➜ {item.fix}</div>}
          </div>
        ))}
        {opozorila.map((item, i) => (
          <div key={i} style={{borderLeft:'3px solid #eab308',paddingLeft:10,marginBottom:10}}>
            <div style={{fontSize:11,fontWeight:600,color:'#fbbf24',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:3}}>🟡 {item.naziv}</div>
            <div style={{fontSize:12,color:'#94a3b8',lineHeight:1.6}}>{item.msg}</div>
            {item.fix && <div style={{fontSize:11,color:'#475569',marginTop:4}}>➜ {item.fix}</div>}
          </div>
        ))}
        {vRedu.length > 0 && <div style={{fontSize:11,color:'#4ade80',marginTop:4}}>🟢 V redu: {vRedu.join(' · ')}</div>}
        {vzorci.length > 0 && (
          <div style={{marginTop:14,paddingTop:12,borderTop:'1px solid #1e2433'}}>
            <div style={{fontSize:11,color:'#64748b',fontFamily:'DM Mono',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:6}}>📊 Vzorci iz tvojih podatkov</div>
            {vzorci.map((v, i) => <div key={i} style={{fontSize:12,color:'#64748b',fontFamily:'DM Mono',marginBottom:4}}>• {v}</div>)}
          </div>
        )}
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
