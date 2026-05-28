import React from 'react'
import { supabase } from '../supabase'
import { TODAY, TODAY_STR, PLAN, PLAN_TRENINGI, getCurrentTeden, RACE_DATE } from '../constants/plan'
import { izracunajLoad, izracunajFormo } from '../utils/calculations'

const TIPI_DNI = {
  'Tek': { cilj_kcal: 2600, cilj_belj_g: 162, cilj_oh_g: 270, cilj_masc_g: 97 },
  'Long run': { cilj_kcal: 3100, cilj_belj_g: 162, cilj_oh_g: 400, cilj_masc_g: 97 },
  'Gym': { cilj_kcal: 2400, cilj_belj_g: 162, cilj_oh_g: 200, cilj_masc_g: 102 },
  'Rest': { cilj_kcal: 2200, cilj_belj_g: 162, cilj_oh_g: 170, cilj_masc_g: 108 },
}

// ── Samodejni izračun ciljev ────────────────────────────────────────────
function izracunajAutoCilje(workouts, metrike, prehrana) {
  const { atl, ctl, razmerje } = izracunajLoad(workouts)

  const zadnjeMetrike = metrike[0] || {}
  const tezaKg = metrike.find(m => m.teza_kg)?.teza_kg || 95
  // Mifflin-St Jeor z dejansko težo; višina/starost sta relativno stabilni konstanti
  const bmr = metrike.find(m => m.bmr_kcal)?.bmr_kcal
    || Math.round(10 * tezaKg + 6.25 * 178 - 5 * 31 + 5)

  // ── 7d povprečje dejanskega vnosa (osnova izračuna) ─────────────────
  const z7 = prehrana.filter(p => p.kalorije_skupaj > 0).slice(0, 7)
  const avg7kcal = z7.length > 0
    ? Math.round(z7.reduce((s, p) => s + p.kalorije_skupaj, 0) / z7.length) : 0
  const avg7belj = z7.length > 0
    ? Math.round(z7.reduce((s, p) => s + (p.beljakovine_g || 0), 0) / z7.length) : 0

  // Povprečni kaloriji iz treningov v zadnjih 7 dneh (da ločim "počivalni ekvivalent")
  let totalWorkoutKcal7 = 0
  for (let i = 0; i < 7; i++) {
    const d = new Date(new Date(TODAY) - i * 86400000).toISOString().slice(0, 10)
    workouts.filter(w => w.datum === d).forEach(w => { totalWorkoutKcal7 += w.kalorije || 0 })
  }
  const avgWorkoutKcal7 = Math.round(totalWorkoutKcal7 / 7)

  // "Počivalni ekvivalent" = povprečni vnos minus treningov → baza za rest dni
  const restBase = avg7kcal > 0
    ? Math.max(2000, avg7kcal - avgWorkoutKcal7)
    : Math.round(bmr * 1.25)

  // ── Trend telesne teže (zadnji 2 tedna) ─────────────────────────────
  const cutoff60d = new Date(TODAY); cutoff60d.setDate(cutoff60d.getDate() - 60)
  const cutoff60dStr = cutoff60d.toISOString().slice(0, 10)
  const tezeData = [...metrike]
    .filter(m => m.teza_kg && m.datum >= cutoff60dStr)
    .sort((a, b) => b.datum.localeCompare(a.datum))
  let weeklyLossRate = null  // kg/teden, pozitivno = hujšanje
  if (tezeData.length >= 4) {
    const newestKg = tezeData[0].teza_kg
    const oldestKg = tezeData[tezeData.length - 1].teza_kg
    const daysBetween = Math.max(1,
      (new Date(tezeData[0].datum) - new Date(tezeData[tezeData.length - 1].datum)) / 86400000
    )
    weeklyLossRate = Math.round(((oldestKg - newestKg) / daysBetween * 7) * 10) / 10
  }

  // ── Ciljna teža iz plana ─────────────────────────────────────────────
  const currentTeden = getCurrentTeden()
  const planTeden = PLAN.find(p => p.teden === currentTeden)
  const ciljnaKg = planTeden?.ciljnaKg || tezaKg
  const weightDelta = tezaKg - ciljnaKg  // pozitivno = nad ciljem

  // ── Forma ────────────────────────────────────────────────────────────
  const formaScore = izracunajFormo(
    zadnjeMetrike.hrv, zadnjeMetrike.spanje_h, zadnjeMetrike.stres_povprecje, workouts
  )

  // ── Prilagoditev na podlagi trenда teže (ne samo odmika od cilja) ────
  // Vedno ohrani vsaj majhen deficit — cilj je hujšanje ne glede na pozicijo vs plan
  const targetRate = 0.4  // kg/teden željeno hujšanje
  let histAdj = 0  // prilagoditev na počivalno bazo
  if (weeklyLossRate !== null) {
    if (weeklyLossRate > targetRate + 0.2) histAdj = +150  // prehitro hujša → poveč
    else if (weeklyLossRate >= targetRate - 0.1) histAdj = 0  // v redu → ohrani
    else if (weeklyLossRate >= 0) histAdj = -150  // prepočasi → zmanjšaj
    else histAdj = -300  // pridobiva → zmanjšaj bolj
  } else {
    // Ni podatkov o trendu → uporabi odmik od cilja (vedno vsaj -100)
    histAdj = weightDelta > 0.5 ? -250 : weightDelta > 0 ? -150 : -100
  }

  // ATL/CTL: visoka obremenitev → povečaj kalorije
  let loadAdjust = 0
  if (razmerje !== null) {
    if (razmerje > 1.5) loadAdjust = +200
    else if (razmerje > 1.3) loadAdjust = +100
    else if (razmerje < 0.7) loadAdjust = -50
  }

  // Forma: slaba forma → povečaj kalorije
  let formaAdjust = 0
  if (formaScore !== null) {
    if (formaScore < 4) formaAdjust = +150
    else if (formaScore < 5.5) formaAdjust = +75
  }

  // Skupna prilagojena baza za počivalne dni
  const adjRestBase = restBase + histAdj + loadAdjust + formaAdjust

  // ── Parametri po tipu treninga ───────────────────────────────────────
  // kpm = kcal/km pri 80 kg; pct = delež porabe ki ga dodamo k cilju; min = minimalni kcal
  const TRENING_PARAMS = {
    rest:      { kpm: 0,  pct: 0,    min: 2100, tip: 'Rest',      label: 'Rest'       },
    easy:      { kpm: 65, pct: 0.50, min: 2200, tip: 'Tek',       label: 'Lahki tek'  },
    long:      { kpm: 68, pct: 0.50, min: 2500, tip: 'Long run',  label: 'Long run'   },
    intervals: { kpm: 88, pct: 0.65, min: 2400, tip: 'Tek',       label: 'Intervali'  },
    hills:     { kpm: 82, pct: 0.60, min: 2350, tip: 'Tek',       label: 'Hribčki'    },
    racepace:  { kpm: 76, pct: 0.55, min: 2350, tip: 'Tek',       label: 'Race pace'  },
    race:      { kpm: 80, pct: 0.60, min: 2600, tip: 'Long run',  label: 'Tekma'      },
  }

  function getTipTreninga(opis, km) {
    const o = (opis || '').toLowerCase()
    if (o.includes('maraton') && km > 30) return 'race'
    if (o.includes('race pace')) return 'racepace'
    if (o.includes('interval')) return 'intervals'
    if (o.includes('hribč')) return 'hills'
    if (o.includes('dolgi tek') || km >= 14) return 'long'
    if (km > 0) return 'easy'
    return 'rest'
  }

  // ── Generiraj 7 dni ──────────────────────────────────────────────────
  const danes = new Date(TODAY)
  const day = danes.getDay()
  const diff = day === 0 ? 1 : (day === 1 ? 0 : 8 - day)
  const pon = new Date(danes)
  pon.setDate(danes.getDate() + diff)
  const danNames = ['Ned', 'Pon', 'Tor', 'Sre', 'Čet', 'Pet', 'Sob']

  const days = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(pon)
    d.setDate(pon.getDate() + i)
    const datumStr = d.toISOString().slice(0, 10)

    const planTrening = PLAN_TRENINGI.find(t => t.datum === datumStr)
    const km = planTrening?.km || 0
    const tipTreninga = getTipTreninga(planTrening?.opis, km)
    const params = TRENING_PARAMS[tipTreninga]

    // Kcal poraba treninga (skalirana na dejansko težo)
    const workoutKcal = Math.round(km * params.kpm * (tezaKg / 80))
    const workoutContrib = Math.round(workoutKcal * params.pct)
    const rawKcal = adjRestBase + workoutContrib
    const cilj_kcal = Math.max(params.min, rawKcal)

    // Makrohranila
    const cilj_belj_g = Math.round(Math.max(160, tezaKg * 1.8))
    const cilj_masc_g = Math.round(Math.max(tezaKg * 0.8, (cilj_kcal * 0.25) / 9))
    const cilj_oh_g = Math.max(100, Math.round((cilj_kcal - cilj_belj_g * 4 - cilj_masc_g * 9) / 4))

    // Ocenjeni deficit
    const ocenjenaPoraba = Math.round(bmr * 1.2) + workoutKcal
    const deficit = ocenjenaPoraba - cilj_kcal

    days.push({
      datum: datumStr,
      dayName: danNames[d.getDay()],
      tip: params.tip,        // za shranjevanje v DB (Tek / Long run / Rest)
      tipLabel: params.label, // za prikaz (Intervali / Hribčki / Race pace / …)
      cilj_kcal,
      cilj_belj_g,
      cilj_oh_g,
      cilj_masc_g,
      km,
      workoutKcal,
      deficit,
      desc: planTrening?.opis || '',
    })
  }

  return {
    days, tezaKg, ciljnaKg, weightDelta,
    avg7kcal, avg7belj, restBase, adjRestBase,
    histAdj, loadAdjust, formaAdjust,
    weeklyLossRate, formaScore, atl, ctl, razmerje, bmr,
  }
}

function InfoChip({ label, sub, color }) {
  return (
    <div style={{ padding: '5px 10px', borderRadius: 6, background: '#0c1120', border: `1px solid ${color}40`, display: 'flex', flexDirection: 'column', gap: 1 }}>
      <div style={{ fontSize: 11, color, fontFamily: 'DM Mono', fontWeight: 600 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: '#475569', fontFamily: 'DM Mono' }}>{sub}</div>}
    </div>
  )
}

function AutoCilji({ workouts, metrike, prehrana, onApply }) {
  const calc = React.useMemo(
    () => izracunajAutoCilje(workouts, metrike, prehrana),
    [workouts, metrike, prehrana]
  )

  const tezaColor = calc.weightDelta > 0.3 ? '#eab308' : calc.weightDelta < -0.1 ? '#22c55e' : '#94a3b8'
  const atlColor = calc.razmerje == null ? '#475569' : calc.razmerje > 1.3 ? '#ef4444' : calc.razmerje < 0.8 ? '#3b82f6' : '#22c55e'
  const formaColor = calc.formaScore == null ? '#475569' : calc.formaScore < 4 ? '#ef4444' : calc.formaScore < 5.5 ? '#eab308' : '#22c55e'
  const trendColor = calc.weeklyLossRate == null ? '#475569'
    : calc.weeklyLossRate > 0.6 ? '#eab308'
    : calc.weeklyLossRate >= 0.2 ? '#22c55e'
    : calc.weeklyLossRate >= 0 ? '#f97316'
    : '#ef4444'

  const adjStr = () => {
    const parts = []
    if (calc.histAdj !== 0) parts.push(`trend ${calc.histAdj > 0 ? '+' : ''}${calc.histAdj}`)
    if (calc.loadAdjust !== 0) parts.push(`load ${calc.loadAdjust > 0 ? '+' : ''}${calc.loadAdjust}`)
    if (calc.formaAdjust !== 0) parts.push(`forma ${calc.formaAdjust > 0 ? '+' : ''}${calc.formaAdjust}`)
    return parts.length ? parts.join(' · ') : 'brez prilagoditev'
  }

  return (
    <div className="card" style={{ marginBottom: 16, border: '1px solid #1e3a5f' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
        <div>
          <h3>Samodejni predlog ciljev</h3>
          <div style={{ fontSize: 11, color: '#475569' }}>
            Baza = 7d povprečje dejanskega vnosa ({calc.avg7kcal > 0 ? `${calc.avg7kcal} kcal` : 'ni podatkov'}).
            Prilagojeno za trend teže, ATL/CTL in formo.
          </div>
        </div>
        <button
          onClick={() => onApply(calc.days)}
          style={{ background: '#1e3a5f', border: '1px solid #3b82f6', color: '#93c5fd', padding: '7px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontFamily: 'DM Mono', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}
        >
          Naloži v tabelo →
        </button>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        <InfoChip
          label={`7d avg: ${calc.avg7kcal > 0 ? calc.avg7kcal : '—'} kcal`}
          sub={`počivalna baza: ${calc.adjRestBase} kcal`}
          color="#f97316"
        />
        <InfoChip
          label={calc.weeklyLossRate != null
            ? `Trend: ${calc.weeklyLossRate > 0 ? '-' : '+'}${Math.abs(calc.weeklyLossRate)} kg/ted`
            : 'Trend: ni podatkov'}
          sub={calc.weeklyLossRate != null
            ? (calc.weeklyLossRate > 0.6 ? 'prehitro (>0.6 kg/ted)' : calc.weeklyLossRate >= 0.2 ? 'v redu (cilj ~0.4)' : calc.weeklyLossRate >= 0 ? 'prepočasi' : 'pridobiva')
            : 'premalo meritev teže'}
          color={trendColor}
        />
        <InfoChip
          label={`Teža: ${Math.round(calc.tezaKg * 10) / 10} kg`}
          sub={calc.weightDelta > 0.1
            ? `+${Math.round(calc.weightDelta * 10) / 10} kg nad ciljem (${calc.ciljnaKg})`
            : calc.weightDelta < -0.1
            ? `${Math.round(calc.weightDelta * 10) / 10} kg pod ciljem (${calc.ciljnaKg})`
            : `na cilju ${calc.ciljnaKg} kg`}
          color={tezaColor}
        />
        <InfoChip
          label={`ATL/CTL: ${calc.razmerje != null ? calc.razmerje : '—'}`}
          sub={calc.razmerje != null
            ? (calc.razmerje > 1.3 ? 'visoka obremenitev' : calc.razmerje < 0.8 ? 'premalo treniraš' : 'optimalno')
            : 'ni podatkov'}
          color={atlColor}
        />
        {calc.formaScore != null && (
          <InfoChip
            label={`Forma: ${calc.formaScore}/10`}
            sub={calc.formaScore < 4 ? 'slaba' : calc.formaScore < 5.5 ? 'srednja' : 'dobra'}
            color={formaColor}
          />
        )}
      </div>

      {(calc.histAdj !== 0 || calc.loadAdjust !== 0 || calc.formaAdjust !== 0) && (
        <div style={{ marginBottom: 10, padding: '6px 10px', background: '#0c1120', border: '1px solid #1e2433', borderRadius: 6, fontSize: 10, color: '#475569', fontFamily: 'DM Mono' }}>
          Prilagoditve na počivalno bazo: {adjStr()}
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #1e2433' }}>
              {['Dan', 'Tip', 'km', 'Kcal', 'Belj', 'OH', 'Masc', '±kcal'].map(h => (
                <th key={h} style={{ padding: '4px 8px', color: '#475569', fontFamily: 'DM Mono', fontSize: 10, textAlign: 'left', fontWeight: 400, textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {calc.days.map(d => (
              <tr key={d.datum} style={{ borderBottom: '1px solid #0f172a' }}>
                <td style={{ padding: '5px 8px', color: '#64748b', fontFamily: 'DM Mono', whiteSpace: 'nowrap' }}>
                  {d.dayName} {d.datum.slice(5)}
                </td>
                <td style={{ padding: '5px 8px' }}>
                  <span style={{
                    fontSize: 10, padding: '2px 7px', borderRadius: 4, fontFamily: 'DM Mono',
                    background: d.tipLabel === 'Long run' ? '#0a2010'
                      : d.tipLabel === 'Intervali' || d.tipLabel === 'Hribčki' ? '#1a0a2e'
                      : d.tipLabel === 'Race pace' ? '#0f1a2e'
                      : d.tipLabel === 'Rest' ? '#1a1a2a'
                      : '#0f1f3a',
                    color: d.tipLabel === 'Long run' ? '#86efac'
                      : d.tipLabel === 'Intervali' || d.tipLabel === 'Hribčki' ? '#c084fc'
                      : d.tipLabel === 'Race pace' ? '#60a5fa'
                      : d.tipLabel === 'Rest' ? '#475569'
                      : '#93c5fd',
                  }}>{d.tipLabel}</span>
                </td>
                <td style={{ padding: '5px 8px', color: '#475569', fontFamily: 'DM Mono', fontSize: 10 }}>
                  {d.km > 0 ? d.km : '—'}
                </td>
                <td style={{ padding: '5px 8px', color: '#f97316', fontFamily: 'DM Mono', fontWeight: 600 }}>{d.cilj_kcal}</td>
                <td style={{ padding: '5px 8px', color: '#22c55e', fontFamily: 'DM Mono' }}>{d.cilj_belj_g}g</td>
                <td style={{ padding: '5px 8px', color: '#3b82f6', fontFamily: 'DM Mono' }}>{d.cilj_oh_g}g</td>
                <td style={{ padding: '5px 8px', color: '#a78bfa', fontFamily: 'DM Mono' }}>{d.cilj_masc_g}g</td>
                <td style={{ padding: '5px 8px', fontFamily: 'DM Mono', fontSize: 10,
                  color: d.deficit > 200 ? '#ef4444' : d.deficit > 0 ? '#f97316' : '#22c55e' }}>
                  {d.deficit > 0 ? `-${d.deficit}` : `+${Math.abs(d.deficit)}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 8, fontSize: 10, color: '#334155', fontFamily: 'DM Mono' }}>
        Belj 1.8 g/kg · Masc min 0.8 g/kg · Min: Rest 2100 / Tek 2300 / Long run 2500 kcal · Long run: 50% trening kcal, Tek: 60%
      </div>
    </div>
  )
}

function VnosCiljev({ prehranaCilji, onRefresh, initTeden }) {
  const [teden, setTeden] = React.useState([])
  const [saving, setSaving] = React.useState(false)
  const [saved, setSaved] = React.useState(false)

  // Generiraj teden (pon-ned); initTeden ima prednost pred obstoječimi cilji
  React.useEffect(() => {
    const dni = []
    const danes = new Date(TODAY)
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
      const auto = initTeden?.find(a => a.datum === datumStr)
      dni.push({
        datum: datumStr,
        dayName: danNames[d.getDay()],
        tip: auto?.tip || obstoječi?.tip_dneva || '',
        cilj_kcal: auto?.cilj_kcal || obstoječi?.cilj_kcal || '',
        cilj_belj_g: auto?.cilj_belj_g || obstoječi?.cilj_belj_g || '',
        cilj_oh_g: auto?.cilj_oh_g || obstoječi?.cilj_oh_g || '',
        cilj_masc_g: auto?.cilj_masc_g || obstoječi?.cilj_masc_g || '',
      })
    }
    setTeden(dni)
  }, [prehranaCilji, initTeden])

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

export function TabCilji({ prehranaCilji, onRefresh, workouts=[], metrike=[], prehrana=[] }) {
  const [initTeden, setInitTeden] = React.useState(null)

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
    <AutoCilji
      workouts={workouts}
      metrike={metrike}
      prehrana={prehrana}
      onApply={days => setInitTeden(days)}
    />
    <VnosCiljev prehranaCilji={prehranaCilji} onRefresh={onRefresh} initTeden={initTeden}/>

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
