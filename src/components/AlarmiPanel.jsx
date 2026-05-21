import React from 'react'
import { CILJI } from '../constants/plan'
import { izracunajLoad } from '../utils/calculations'
import { isTek } from '../utils/helpers'

function avg(arr, key) {
  const v = arr.map(m => typeof key === 'function' ? key(m) : m[key]).filter(x => x != null && x > 0)
  return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null
}

export function AlarmiPanel({ workouts, metrike, prehrana }) {
  const alarmi = []
  const now = new Date()

  // ── TRENING: ATL/CTL ──────────────────────────────────────
  const { atl, ctl, razmerje } = izracunajLoad(workouts)
  if (razmerje !== null) {
    if (razmerje > 1.5)
      alarmi.push({ nivo:'kritično', kat:'Trening', naziv:`ATL/CTL ${razmerje.toFixed(2)} — akutna preobremenitev`, fix:'Zmanjšaj tedenski obseg za 30% in dodaj počivalni dan.' })
    else if (razmerje > 1.3)
      alarmi.push({ nivo:'opozorilo', kat:'Trening', naziv:`ATL/CTL ${razmerje.toFixed(2)} — visoka obremenitev`, fix:'Ohrani obseg, zamenjaj en trening z lahkim.' })
  }

  // TRENING: tedenski km porast
  const kmTa   = workouts.filter(w => new Date(w.datum) >= new Date(now - 7*86400000)  && isTek(w)).reduce((s,w)=>s+(w.razdalja_km||0),0)
  const kmPrej = workouts.filter(w => { const d=new Date(w.datum); return d>=new Date(now-14*86400000)&&d<new Date(now-7*86400000)&&isTek(w) }).reduce((s,w)=>s+(w.razdalja_km||0),0)
  if (kmPrej > 5 && kmTa > kmPrej * 1.15)
    alarmi.push({ nivo:'opozorilo', kat:'Trening', naziv:`Km ta teden +${Math.round((kmTa/kmPrej-1)*100)}% (${Math.round(kmTa)} vs ${Math.round(kmPrej)}km)`, fix:'Porast nad 10%/teden poveča tveganje poškodbe.' })

  // ── HRV ──────────────────────────────────────────────────
  const hrv3  = avg(metrike.slice(0,  3), 'hrv')
  const hrv10 = avg(metrike.slice(0, 10), 'hrv')
  let hrvTrendAlarm = false
  if (hrv3 && hrv10 && hrv10 > 0) {
    const pad = (hrv10 - hrv3) / hrv10
    if (pad > 0.15) {
      alarmi.push({ nivo:'kritično', kat:'Regeneracija', naziv:`HRV pada −${Math.round(pad*100)}% (3d avg: ${Math.round(hrv3)}ms)`, fix:'Brez intenzivnih treningov. Prioritiziraj spanje in prehrano.' })
      hrvTrendAlarm = true
    } else if (pad > 0.08) {
      alarmi.push({ nivo:'opozorilo', kat:'Regeneracija', naziv:`HRV trend nižje −${Math.round(pad*100)}% (3d avg: ${Math.round(hrv3)}ms)`, fix:'Zamenjaj intenziven trening z lahkim.' })
      hrvTrendAlarm = true
    }
  }
  if (!hrvTrendAlarm && hrv3 !== null) {
    if (hrv3 < 30)
      alarmi.push({ nivo:'kritično', kat:'Regeneracija', naziv:`HRV kritično nizek: ${Math.round(hrv3)}ms`, fix:'Počivaj. Intenzivni trening danes kontraproduktiven.' })
    else if (hrv3 < 40)
      alarmi.push({ nivo:'opozorilo', kat:'Regeneracija', naziv:`HRV nizek: ${Math.round(hrv3)}ms`, fix:'Lahek trening ali počitek danes.' })
  }

  // ── RESTING HR ───────────────────────────────────────────
  const rhrKey = m => m.hr_pocivaj || m.resting_hr
  const rhr3  = avg(metrike.slice(0, 3), rhrKey)
  const rhr10 = avg(metrike.slice(3, 10), rhrKey)
  if (rhr3 && rhr10) {
    const porast = rhr3 - rhr10
    if (porast > 5)
      alarmi.push({ nivo:'kritično', kat:'Regeneracija', naziv:`HR počitek +${Math.round(porast)}bpm v tednu (zdaj ${Math.round(rhr3)}bpm)`, fix:'Resna utrujenost ali bolezni. Počitek in po potrebi zdravnik.' })
    else if (porast > 3)
      alarmi.push({ nivo:'opozorilo', kat:'Regeneracija', naziv:`HR počitek +${Math.round(porast)}bpm v tednu (zdaj ${Math.round(rhr3)}bpm)`, fix:'Povečana utrujenost. Zmanjšaj intenzivnost ta teden.' })
  }

  // ── SPANJE ───────────────────────────────────────────────
  const spanje7 = avg(metrike.slice(0, 7), 'spanje_h')
  if (spanje7 !== null) {
    if (spanje7 < 6)
      alarmi.push({ nivo:'kritično', kat:'Regeneracija', naziv:`Spanje ${spanje7.toFixed(1)}h povp./noč (cilj 7.5h+)`, fix:'Kronično pomanjkanje — regeneracija in hormonski odziv sta blokirana.' })
    else if (spanje7 < 7)
      alarmi.push({ nivo:'opozorilo', kat:'Regeneracija', naziv:`Spanje ${spanje7.toFixed(1)}h povp./noč (cilj 7.5h+)`, fix:'Pojdi spat uro prej. Vsaka ura šteje pri maratoncu.' })
  }

  // ── STRES ────────────────────────────────────────────────
  const stres7 = avg(metrike.slice(0, 7), 'stres_povprecje')
  if (stres7 !== null) {
    if (stres7 > 70)
      alarmi.push({ nivo:'kritično', kat:'Regeneracija', naziv:`Stres ${Math.round(stres7)}/100 (7d povp.)`, fix:'Kronično visok stres ruši HRV in okrevanje. Zmanjšaj trening obseg.' })
    else if (stres7 > 55)
      alarmi.push({ nivo:'opozorilo', kat:'Regeneracija', naziv:`Stres ${Math.round(stres7)}/100 (7d povp.)`, fix:'Meditacija, hoja in manj intenzivnih treningov.' })
  }

  // ── BODY BATTERY ─────────────────────────────────────────
  const bbCharged = avg(metrike.slice(0, 7), 'body_battery_charged')
  const bbDrained = avg(metrike.slice(0, 7), 'body_battery_drained')
  if (bbCharged !== null && bbDrained !== null && bbDrained > bbCharged * 1.3)
    alarmi.push({ nivo:'opozorilo', kat:'Regeneracija', naziv:`Body battery: trošiš ${Math.round(bbDrained)} vs napolniš ${Math.round(bbCharged)}/dan`, fix:'Spanje in počitek ne kompenzira porabe — zmanjšaj stres ali obseg.' })

  // ── TEŽA ─────────────────────────────────────────────────
  const tezaNow  = metrike.slice(0, 3).find(m => m.teza_kg)?.teza_kg
  const tezaPrej = metrike.slice(7, 14).find(m => m.teza_kg)?.teza_kg
  if (tezaNow && tezaPrej && tezaPrej - tezaNow > 1.5)
    alarmi.push({ nivo:'opozorilo', kat:'Telo', naziv:`Hiter padec teže −${(tezaPrej-tezaNow).toFixed(1)}kg v 7 dneh`, fix:'Prehiter padec = izguba mišic. Povečaj kalorije in beljakovine.' })

  // ── PREHRANA: MAKRI ──────────────────────────────────────
  const z7 = prehrana.filter(p => p.kalorije_skupaj > 0).slice(0, 7)
  if (z7.length >= 3) {
    const avgF = key => z7.reduce((s, p) => s + (p[key]||0), 0) / z7.length
    const aKcal = avgF('kalorije_skupaj')
    const aBelj = avgF('beljakovine_g')
    const aOH   = avgF('ogljikovi_hidrati_g')
    const aMasc = avgF('masc_g')
    const pc = (v, c) => Math.round(v/c*100)

    if (aKcal > 0) {
      const p = pc(aKcal, CILJI.kcal)
      if (p < 75)       alarmi.push({ nivo:'kritično', kat:'Prehrana', naziv:`Kalorije ${Math.round(aKcal)} kcal (${p}% cilja, 7d)`, fix:`Deficit ${Math.round(CILJI.kcal-aKcal)} kcal/dan → telo razgrajuje mišice.` })
      else if (p < 90)  alarmi.push({ nivo:'opozorilo', kat:'Prehrana', naziv:`Kalorije ${Math.round(aKcal)} kcal (${p}% cilja, 7d)`, fix:`Dodaj ~${Math.round(CILJI.kcal-aKcal)} kcal/dan.` })
      else if (p > 115) alarmi.push({ nivo:'opozorilo', kat:'Prehrana', naziv:`Kalorije ${Math.round(aKcal)} kcal (${p}% cilja, 7d)`, fix:'Suficit na počivalne dni — zmanjšaj maščobe in sladkorje.' })
    }
    if (aBelj > 0) {
      const p = pc(aBelj, CILJI.belj)
      if (aBelj > 250)  alarmi.push({ nivo:'opozorilo', kat:'Prehrana', naziv:`Beljakovine ${Math.round(aBelj)}g — preveč (7d)`, fix:'Nad 3g/kg → ledvični stres. Nadomesti z OH.' })
      else if (p < 75)  alarmi.push({ nivo:'kritično', kat:'Prehrana', naziv:`Beljakovine ${Math.round(aBelj)}g (${p}% cilja, 7d)`, fix:'Pod 1.4g/kg → mišice se razgrajujejo po tekih.' })
      else if (p < 90)  alarmi.push({ nivo:'opozorilo', kat:'Prehrana', naziv:`Beljakovine ${Math.round(aBelj)}g (${p}% cilja, 7d)`, fix:'Dodaj skyr 200g ali piščančje prsi.' })
    }
    if (aOH > 0) {
      const p = pc(aOH, CILJI.oh)
      if (p < 70)       alarmi.push({ nivo:'kritično', kat:'Prehrana', naziv:`OH ${Math.round(aOH)}g (${p}% cilja, 7d)`, fix:'Glikogen kronično izpraznjen → teki bodo trdi, okrevanje počasno.' })
      else if (p < 85)  alarmi.push({ nivo:'opozorilo', kat:'Prehrana', naziv:`OH ${Math.round(aOH)}g (${p}% cilja, 7d)`, fix:'Dan pred tekom moraš biti nad ciljem OH.' })
    }
    if (aMasc > 0 && pc(aMasc, CILJI.masc) < 60)
      alarmi.push({ nivo:'opozorilo', kat:'Prehrana', naziv:`Maščobe ${Math.round(aMasc)}g (${pc(aMasc, CILJI.masc)}% cilja, 7d)`, fix:'Slabša absorpcija vitaminov A/D/E/K in hormonske motnje.' })
  }

  // ── MIKROHRANILA ─────────────────────────────────────────
  const z7m = prehrana.filter(p => p.natrij_mg > 0).slice(0, 7)
  if (z7m.length >= 2) {
    const avgM = key => { const v = z7m.map(p => p[key]).filter(x => x > 0); return v.length ? v.reduce((s,x)=>s+x,0)/v.length : null }
    const FIX = {
      železo_mg:    { krit:'Leča 200g + špinača + vitamin C za absorpcijo.', opo:'Dodaj lečo ali goveje meso.' },
      kalcij_mg:    { krit:'Sardine, tofu, skyr, jogurt.', opo:'Dodaj mlečne ali sardine.' },
      vitamin_c_mg: { krit:'Rdeča paprika, brokoli, kivi.', opo:'Rdeča paprika ali kivi.' },
      kalij_mg:     { krit:'Fižol 200g, sladki krompir, banana.', opo:'Banana ali sladki krompir.' },
      vitamin_a_iu: { krit:'Sladki krompir, korenček, jetra.', opo:'Korenček ali sladki krompir.' },
      vlaknine_g:   { krit:'Leča, stročnice, ovseni kosmiči, avokado.', opo:'Stročnice in polnozrnata živila.' },
      natrij_mg:    { ul:'Izogni se predelani hrani, kobasicam in slani hrani.' },
      holesterol_mg:{ ul:'Zmanjšaj jajca, ocvrto hrano in rdeče meso.' },
      sladkorji_g:  { ul:'Zmanjšaj sladke pijače, sladke jogurte in predelano hrano.' },
    }
    const mikroDef = [
      { key:'železo_mg',    cilj:18,   naziv:'Železo',    enota:'mg',  ulKrit:70,   ulWarn:45,   kritPct:55, opoPct:75  },
      { key:'kalcij_mg',    cilj:1000, naziv:'Kalcij',    enota:'mg',  ulKrit:2500, ulWarn:2000, kritPct:40, opoPct:70  },
      { key:'vitamin_c_mg', cilj:90,   naziv:'Vitamin C', enota:'mg',  ulKrit:2000, ulWarn:1000, kritPct:40, opoPct:65  },
      { key:'kalij_mg',     cilj:3500, naziv:'Kalij',     enota:'mg',  ulKrit:7000, ulWarn:5000, kritPct:50, opoPct:70  },
      { key:'vitamin_a_iu', cilj:5000, naziv:'Vitamin A', enota:'IU',  ulKrit:10000,ulWarn:7500, kritPct:40, opoPct:65  },
      { key:'vlaknine_g',   cilj:30,   naziv:'Vlaknine',  enota:'g',   ulKrit:80,   ulWarn:60,   kritPct:40, opoPct:65  },
      { key:'natrij_mg',    cilj:2300, naziv:'Natrij',    enota:'mg',  ulKrit:5000, ulWarn:3500, kritPct:null,opoPct:null},
      { key:'holesterol_mg',cilj:300,  naziv:'Holesterol',enota:'mg',  ulKrit:700,  ulWarn:400,  kritPct:null,opoPct:null},
      { key:'sladkorji_g',  cilj:50,   naziv:'Sladkorji', enota:'g',   ulKrit:120,  ulWarn:80,   kritPct:null,opoPct:null},
    ]
    mikroDef.forEach(m => {
      const v = avgM(m.key); if (!v) return
      const p = Math.round(v / m.cilj * 100)
      const disp = m.enota === 'g' ? `${Math.round(v*10)/10}g` : m.enota === 'IU' ? `${Math.round(v)}IU` : `${Math.round(v)}mg`
      const fix = FIX[m.key]
      if (m.ulKrit && v > m.ulKrit)
        alarmi.push({ nivo:'kritično', kat:'Mikrohranila', naziv:`${m.naziv} preveč: ${disp} (UL ${m.ulKrit}${m.enota})`, fix: fix?.ul || 'Zmanjšaj takoj.' })
      else if (m.ulWarn && v > m.ulWarn)
        alarmi.push({ nivo:'opozorilo', kat:'Mikrohranila', naziv:`${m.naziv} visoko: ${disp} (>${m.ulWarn}${m.enota})`, fix: fix?.ul || 'Blizu zgornje meje — preveri dodatke.' })
      else if (m.kritPct && p < m.kritPct)
        alarmi.push({ nivo:'kritično', kat:'Mikrohranila', naziv:`${m.naziv} ${disp} — ${p}% cilja (7d)`, fix: fix?.krit || '' })
      else if (m.opoPct && p < m.opoPct)
        alarmi.push({ nivo:'opozorilo', kat:'Mikrohranila', naziv:`${m.naziv} ${disp} — ${p}% cilja (7d)`, fix: fix?.opo || '' })
    })
  }

  // ── VO2MAX TREND ─────────────────────────────────────────
  const vo2Sorted = workouts.filter(w => w.vo2max > 0).sort((a,b) => b.datum.localeCompare(a.datum))
  const vo2Zdaj  = vo2Sorted[0]?.vo2max
  const cutoff4w = new Date(now - 28*86400000).toISOString().slice(0,10)
  const vo2Pred4 = vo2Sorted.find(w => w.datum <= cutoff4w)?.vo2max
  if (vo2Zdaj && vo2Pred4 && vo2Pred4 - vo2Zdaj > 1)
    alarmi.push({ nivo:'opozorilo', kat:'Forma', naziv:`VO2max pada: ${vo2Zdaj.toFixed(1)} → ${vo2Pred4.toFixed(1)} ml/kg/min (4 tedni)`, fix:'Preveri ali je dovolj intenzivnih treningov v programu.' })

  // ── SORT & RENDER ─────────────────────────────────────────
  alarmi.sort((a,b) => a.nivo === b.nivo ? 0 : a.nivo === 'kritično' ? -1 : 1)
  const kritCount = alarmi.filter(a => a.nivo === 'kritično').length
  const opoCount  = alarmi.filter(a => a.nivo === 'opozorilo').length

  if (alarmi.length === 0) return (
    <div style={{padding:'12px 16px',background:'#052e16',border:'1px solid #14532d',borderRadius:8,marginBottom:16,display:'flex',alignItems:'center',gap:10}}>
      <span style={{fontSize:15}}>✅</span>
      <span style={{fontSize:13,color:'#86efac'}}>Vse metrike v redu — nadaljuj po planu.</span>
    </div>
  )

  return (
    <div className="card" style={{marginBottom:16}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14,flexWrap:'wrap',gap:8}}>
        <h3 style={{margin:0}}>Alarmi & Opozorila</h3>
        <div style={{display:'flex',gap:6,fontFamily:'DM Mono',fontSize:11}}>
          {kritCount > 0 && <span style={{color:'#fca5a5',background:'#2d0505',padding:'2px 9px',borderRadius:4,border:'1px solid #7f1d1d'}}>🔴 {kritCount} kritično</span>}
          {opoCount  > 0 && <span style={{color:'#fde68a',background:'#1a1200',padding:'2px 9px',borderRadius:4,border:'1px solid #78350f'}}>🟡 {opoCount} opozorilo</span>}
        </div>
      </div>
      {alarmi.map((a, i) => (
        <div key={i} style={{
          borderLeft:`3px solid ${a.nivo==='kritično'?'#ef4444':'#eab308'}`,
          paddingLeft:12, marginBottom:10,
          paddingBottom: i < alarmi.length-1 ? 10 : 0,
          borderBottom:  i < alarmi.length-1 ? '1px solid #0a0f1a' : 'none',
        }}>
          <div style={{display:'flex',alignItems:'baseline',gap:7,marginBottom:3,flexWrap:'wrap'}}>
            <span style={{fontSize:10,fontFamily:'DM Mono',color:'#475569',background:'#0f172a',padding:'1px 6px',borderRadius:3,flexShrink:0}}>{a.kat}</span>
            <span style={{fontSize:12,fontWeight:600,color:a.nivo==='kritično'?'#f87171':'#fbbf24'}}>{a.naziv}</span>
          </div>
          {a.fix && <div style={{fontSize:11,color:'#64748b',fontFamily:'DM Mono'}}>➜ {a.fix}</div>}
        </div>
      ))}
    </div>
  )
}
