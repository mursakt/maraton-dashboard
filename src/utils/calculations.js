import { PLAN, CILJI, TODAY, TODAY_STR, YESTERDAY_STR, getCurrentTeden, RACE_DATE } from '../constants/plan'
import { tempoStrToSec } from './tempo'
import { isTek, izracunajBMR } from './helpers'

export function izracunajLoad(workouts) {
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

export function izracunajPripravljenost(metrike, prehrana, workouts) {
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

export function opozoriloPredTreningom(workouts, prehrana) {
  const danes = TODAY
  const jutri = new Date(danes)
  jutri.setDate(jutri.getDate() + 1)
  const jutriStr = jutri.toISOString().slice(0, 10)

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

export function izracunajFormo(hrv, spanje, stres, workouts) {
  let score = 0; let factors = 0
  if (hrv) { const h = hrv<30?1:hrv<40?3:hrv<50?5:hrv<60?7:hrv<70?8:10; score+=h*0.35; factors+=0.35 }
  if (spanje) { const s = spanje<5?1:spanje<6?3:spanje<6.5?5:spanje<7?6:spanje<7.5?7.5:spanje<8?9:10; score+=s*0.3; factors+=0.3 }
  if (stres) { const st = stres>75?1:stres>60?3:stres>45?5:stres>35?6:stres>25?8:10; score+=st*0.2; factors+=0.2 }
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

export function analizirajTek(zadnjiTek, lapsTeka, metrike, prehrana, workouts) {
  if (!zadnjiTek) return null

  const tekDatum = zadnjiTek.datum
  const danPred = new Date(new Date(tekDatum) - 86400000).toISOString().slice(0, 10)

  const metrikeDanPred = metrike.find(m => m.datum === danPred) || {}
  const prehranaVceraj = prehrana.find(p => p.datum === danPred && p.kalorije_skupaj > 0) || {}

  const workoutVceraj = workouts.filter(w => w.datum === danPred)
  const treningKcalVceraj = workoutVceraj.reduce((s, w) => s + (w.kalorije || 0), 0)
  const metVceraj = metrike.find(m => m.datum === danPred) || {}
  const porabljeneVceraj = metVceraj.skupaj_kcal || ((metVceraj.bmr_kcal || izracunajBMR(metrike.find(m => m.teza_kg)?.teza_kg)) + treningKcalVceraj)
  const deficitVceraj = prehranaVceraj.kalorije_skupaj ? Math.round(prehranaVceraj.kalorije_skupaj - porabljeneVceraj) : null

  const zadnjih7Prehrana = prehrana.filter(p => p.kalorije_skupaj > 0 && p.datum < tekDatum).slice(0, 7)
  const deficiti7 = zadnjih7Prehrana.map(p => {
    const w = workouts.filter(w2 => w2.datum === p.datum).reduce((s, w2) => s + (w2.kalorije || 0), 0)
    const mD = metrike.find(m2 => m2.datum === p.datum) || {}
    const por = mD.skupaj_kcal || ((mD.bmr_kcal || izracunajBMR(metrike.find(m => m.teza_kg)?.teza_kg)) + w)
    return p.kalorije_skupaj - por
  })
  const povprecniDeficit7 = deficiti7.length > 0 ? Math.round(deficiti7.reduce((s, d) => s + d, 0) / deficiti7.length) : null

  const lapi = lapsTeka.filter(l => l.garmin_activity_id === zadnjiTek.garmin_activity_id)
    .sort((a, b) => a.lap_number - b.lap_number)

  let cardiacDrift = null
  let driftOpis = null
  if (lapi.length >= 3) {
    const tretjina = Math.floor(lapi.length / 3)
    const prvaLapi = lapi.slice(0, tretjina).filter(l => l.povprecni_hr)
    const zadnjaLapi = lapi.slice(-tretjina).filter(l => l.povprecni_hr)
    if (prvaLapi.length > 0 && zadnjaLapi.length > 0) {
      const prvaHR = prvaLapi.reduce((s, l) => s + l.povprecni_hr, 0) / prvaLapi.length
      const zadnjaHR = zadnjaLapi.reduce((s, l) => s + l.povprecni_hr, 0) / zadnjaLapi.length
      cardiacDrift = Math.round(zadnjaHR - prvaHR)
    }
    if (cardiacDrift > 20) driftOpis = 'zelo velik'
    else if (cardiacDrift > 12) driftOpis = 'velik'
    else if (cardiacDrift > 6) driftOpis = 'zmeren'
    else driftOpis = 'minimalen'
  }

  let tempoDegradacija = null
  let tempoDegOpis = null
  if (lapi.length >= 6) {
    const prvi3 = lapi.slice(0, 3).filter(l => l.povprecni_tempo)
    const zadnji3 = lapi.slice(-3).filter(l => l.povprecni_tempo)
    if (prvi3.length > 0 && zadnji3.length > 0) {
      const avgTempoZac = prvi3.reduce((s, l, _, a) => s + tempoStrToSec(l.povprecni_tempo) / a.length, 0)
      const avgTempoKon = zadnji3.reduce((s, l, _, a) => s + tempoStrToSec(l.povprecni_tempo) / a.length, 0)
      // pozitivno = upad tempa (počasnejše), negativno = negativni split (pohitritev)
      tempoDegradacija = Math.round(avgTempoKon - avgTempoZac)
      if (tempoDegradacija > 30) tempoDegOpis = 'velik padec tempa'
      else if (tempoDegradacija > 15) tempoDegOpis = 'zmeren padec tempa'
      else if (tempoDegradacija > 5) tempoDegOpis = 'blag padec tempa'
      else if (tempoDegradacija < -5) tempoDegOpis = 'negativni split'
      else tempoDegOpis = 'konstanten tempo'
    }
  }

  let kriticniKm = null
  if (lapi.length >= 4) {
    for (let i = 2; i < lapi.length; i++) {
      const l = lapi[i]
      const prej = lapi[i - 1]
      if (l.povprecni_hr && prej.povprecni_hr && l.povprecni_tempo && prej.povprecni_tempo) {
        const hrDelta = l.povprecni_hr - prej.povprecni_hr
        const tempoDelta = tempoStrToSec(l.povprecni_tempo) - tempoStrToSec(prej.povprecni_tempo)
        if (hrDelta >= 5 && tempoDelta >= -5 && !kriticniKm) {
          kriticniKm = i + 1
        }
      }
    }
  }

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

  const hrv = metrikeDanPred.hrv
  const spanje = metrikeDanPred.spanje_h
  const stres = metrikeDanPred.stres_povprecje

  const te = zadnjiTek.aerobni_te
  let teOpis = null
  if (te >= 5) teOpis = 'prezahtevno — pretreniranost'
  else if (te >= 4) teOpis = 'threshold — prezahtevno za lahek dan'
  else if (te >= 3) teOpis = 'aerobno — ok za bazo'
  else if (te >= 2) teOpis = 'vzdrževano — lahek tek'
  else teOpis = 'minimalen učinek'

  const prvLap = lapi[0]
  const optimalniBazniTempo = 400
  let zacetniTempoOpis = null
  if (prvLap?.povprecni_tempo) {
    const prvTempoSec = tempoStrToSec(prvLap.povprecni_tempo)
    const razlika = optimalniBazniTempo - prvTempoSec
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

// Kalibracijske konstante — standardne empirične vrednosti iz literature
const MARA_VO2_FRACTION = 0.76   // rekreativni maratonci vzdržujejo 74–78% VO2max (Daniels 2005)
const MARA_HR = 161               // tipičen maratonski HR za treniranega rekreativca
const RIEGEL_EXP = 1.07           // standardni Riegel eksponent (Riegel 1977, n=134 tekačev)

export function izracunajPredikcijo(workouts, metrike, laps = []) {
  const teki = workouts.filter(w => isTek(w) && w.razdalja_km > 0 && w.povprecni_hr > 0)
  if (teki.length === 0) return null

  const today = new Date()
  const raceDate = new Date(RACE_DATE)

  // 1. Riegel sidro — dinamično iz najboljše tekme ≥ 18 km iz workouts
  // Fallback: polmaraton 1:47:00 (oktober 2025)
  const raceTeki = workouts
    .filter(w => isTek(w) && w.razdalja_km >= 18 && w.trajanje_min > 0)
    .sort((a, b) => {
      const paceA = a.trajanje_min / a.razdalja_km
      const paceB = b.trajanje_min / b.razdalja_km
      return paceA - paceB  // najhitrejša tekma
    })
  let riegelDistM = 21097.5, riegelSec = 6420, riegelLabel = '1:47:00 HM (fallback)'
  if (raceTeki.length > 0) {
    const best = raceTeki[0]
    riegelSec = Math.round(best.trajanje_min * 60)
    riegelDistM = best.razdalja_km * 1000
    riegelLabel = `${best.razdalja_km} km (${best.datum})`
  }
  const riegelCas = Math.round(riegelSec * Math.pow(42195 / riegelDistM, RIEGEL_EXP))

  // 2. EWMA VO2max z Garmin diskontom
  // Razpolovni čas 21 dni; novejši teki eksponentno pomembnejši
  const vo2Teki = teki.filter(w => w.vo2max && w.vo2max > 0)
  let ewmaVo2 = null, casVo2 = null, vo2Uporabljen = null
  if (vo2Teki.length > 0) {
    const weighted = vo2Teki.map(w => {
      const days = Math.max(0, (today - new Date(w.datum)) / 86400000)
      return { vo2: w.vo2max, wt: Math.pow(0.5, days / 21), datum: w.datum }
    })
    const sumWt = weighted.reduce((s, x) => s + x.wt, 0)
    ewmaVo2 = weighted.reduce((s, x) => s + x.vo2 * x.wt, 0) / sumWt
    vo2Uporabljen = ewmaVo2
    const vVO2max = 29.54 + 5.000663 * ewmaVo2 - 0.007546 * ewmaVo2 * ewmaVo2
    casVo2 = (1000 / (vVO2max * MARA_VO2_FRACTION)) * 42.195 * 60
  }

  // 3. Linearna projekcija VO2max do 17.10.2026 (ista frakcija)
  let projectedVo2 = null, projectedCasVo2 = null, vo2Slope = null, vo2ChartData = []
  if (vo2Teki.length >= 3) {
    const sorted = [...vo2Teki].sort((a, b) => a.datum.localeCompare(b.datum))
    const t0 = new Date(sorted[0].datum).getTime()
    const pts = sorted.map(w => ({ x: (new Date(w.datum) - t0) / 86400000, y: w.vo2max, datum: w.datum }))
    const n = pts.length
    const sX = pts.reduce((s, p) => s + p.x, 0), sY = pts.reduce((s, p) => s + p.y, 0)
    const sXY = pts.reduce((s, p) => s + p.x * p.y, 0), sX2 = pts.reduce((s, p) => s + p.x * p.x, 0)
    const den = n * sX2 - sX * sX
    if (den !== 0) {
      vo2Slope = (n * sXY - sX * sY) / den
      const b0 = (sY - vo2Slope * sX) / n
      const dToRace = (raceDate - new Date(sorted[0].datum)) / 86400000
      let rawProj = b0 + vo2Slope * dToRace
      if (ewmaVo2) { rawProj = Math.min(rawProj, ewmaVo2 + 5); rawProj = Math.max(rawProj, ewmaVo2 - 1) }
      projectedVo2 = rawProj
      const vVP = 29.54 + 5.000663 * projectedVo2 - 0.007546 * projectedVo2 * projectedVo2
      projectedCasVo2 = (1000 / (vVP * MARA_VO2_FRACTION)) * 42.195 * 60
      const dToday = (today - new Date(sorted[0].datum)) / 86400000
      vo2ChartData = [
        ...pts.map(p => ({ datum: p.datum.slice(5), vo2: Math.round(p.y * 10) / 10, trend: Math.round((b0 + vo2Slope * p.x) * 10) / 10 })),
        { datum: today.toISOString().slice(5, 10), vo2: null, trend: Math.round((b0 + vo2Slope * dToday) * 10) / 10, projected: null },
        { datum: '10-17', vo2: null, trend: null, projected: Math.round(projectedVo2 * 10) / 10 },
      ]
    }
  }

  // 4. Utežena HR-tempo regresija (WLS) — utež = trajanje × recency
  // Marathon HR = 160 (konzervativen; 163 je za izkušene)
  const hrTempoTocke = teki
    .filter(w => w.povprecni_hr >= 130 && w.povprecni_hr <= 175 && w.povprecni_tempo)
    .map(w => {
      const days = Math.max(0, (today - new Date(w.datum)) / 86400000)
      const wt = ((w.trajanje_min || 30) / 60) * Math.pow(0.5, days / 49)
      return { hr: w.povprecni_hr, tempoSec: tempoStrToSec(w.povprecni_tempo), datum: w.datum, wt }
    })
    .filter(p => p.tempoSec !== null && p.tempoSec > 0)

  let casHR = null, tempoNa155 = null
  if (hrTempoTocke.length >= 2) {
    const sW = hrTempoTocke.reduce((s, p) => s + p.wt, 0)
    const sWH = hrTempoTocke.reduce((s, p) => s + p.wt * p.hr, 0)
    const sWT = hrTempoTocke.reduce((s, p) => s + p.wt * p.tempoSec, 0)
    const sWH2 = hrTempoTocke.reduce((s, p) => s + p.wt * p.hr * p.hr, 0)
    const sWHT = hrTempoTocke.reduce((s, p) => s + p.wt * p.hr * p.tempoSec, 0)
    const den2 = sW * sWH2 - sWH * sWH
    if (den2 !== 0) {
      const slope = (sW * sWHT - sWH * sWT) / den2
      const intercept = (sWT - slope * sWH) / sW
      casHR = (slope * MARA_HR + intercept) * 42.195
      tempoNa155 = slope * 155 + intercept
    }
  }

  // 5. Srčni drift iz lap podatkov — merilo aerobne baze
  // Visok drift = aerobna baza ni dovolj razvita → kazen
  let driftKorekcija = 0, recentDrift = null
  if (laps.length > 0) {
    const longRuns = teki
      .filter(w => w.razdalja_km >= 10 && w.garmin_activity_id)
      .sort((a, b) => b.datum.localeCompare(a.datum))
    for (const run of longRuns.slice(0, 3)) {
      const runLaps = laps
        .filter(l => l.garmin_activity_id === run.garmin_activity_id && l.povprecni_hr > 0)
        .sort((a, b) => (a.lap_number || 0) - (b.lap_number || 0))
      if (runLaps.length < 4) continue
      const third = Math.floor(runLaps.length / 3)
      const firstHR = runLaps.slice(0, third).reduce((s, l) => s + l.povprecni_hr, 0) / third
      const lastHR = runLaps.slice(-third).reduce((s, l) => s + l.povprecni_hr, 0) / third
      recentDrift = Math.round(lastHR - firstHR)
      if (recentDrift > 20) driftKorekcija = 10 * 60
      else if (recentDrift > 15) driftKorekcija = 6 * 60
      else if (recentDrift > 10) driftKorekcija = 3 * 60
      else if (recentDrift > 5) driftKorekcija = 1 * 60
      break
    }
  }

  // 6. Ensemble "danes"
  const methodsDanes = []
  if (casVo2) methodsDanes.push({ cas: casVo2, w: 0.35 })
  if (casHR) methodsDanes.push({ cas: casHR, w: 0.30 })
  methodsDanes.push({ cas: riegelCas, w: 0.25 })
  if (projectedCasVo2) methodsDanes.push({ cas: projectedCasVo2, w: 0.10 })
  if (methodsDanes.length === 0) return null
  const twD = methodsDanes.reduce((s, m) => s + m.w, 0)
  const casBaza = methodsDanes.reduce((s, m) => s + m.cas * m.w, 0) / twD

  // Ensemble "tekma" — VO2max projekcija kot primarna
  let casTekmaBase = null
  if (projectedCasVo2) {
    const mT = [{ cas: projectedCasVo2, w: 0.45 }]
    if (casHR) mT.push({ cas: casHR, w: 0.30 })
    mT.push({ cas: riegelCas, w: 0.25 })
    const twT = mT.reduce((s, m) => s + m.w, 0)
    casTekmaBase = mT.reduce((s, m) => s + m.cas * m.w, 0) / twT
  }

  // Korekcije
  const currentTeden = getCurrentTeden()
  const zadnjaTeza = metrike.find(m => m.teza_kg)?.teza_kg
  const tezaKorekcija = 0  // VO2max je v ml/kg/min — teža je že upoštevana
  const prvicKorekcija = 0  // ni podatkovne osnove za fiksni penalty

  const tedniMap = {}
  teki.forEach(w => {
    const d = new Date(w.datum); const mon = new Date(d); mon.setDate(d.getDate() - ((d.getDay() + 6) % 7))
    const key = mon.toISOString().slice(0, 10)
    tedniMap[key] = (tedniMap[key] || 0) + (w.razdalja_km || 0)
  })
  const maxKm = Math.max(...Object.values(tedniMap), 0)

  // Danes: korekcija na podlagi trenutnega volumna
  const kmKorekcija = maxKm < 25 ? 15 * 60 : maxKm < 35 ? 8 * 60 : maxKm < 45 ? 4 * 60 : maxKm < 55 ? 0 : maxKm < 70 ? -2 * 60 : -4 * 60

  // Tekma: korekcija na podlagi projiciranega volumna iz plana
  const futurePlan = PLAN.filter(p => p.teden > currentTeden && p.teden <= 20)
  const projectedPeakKm = futurePlan.length > 0 ? Math.max(...futurePlan.map(p => p.km)) : maxKm
  const kmKorekcijaTekma = projectedPeakKm < 35 ? 8 * 60 : projectedPeakKm < 45 ? 4 * 60 : projectedPeakKm < 55 ? 0 : projectedPeakKm < 65 ? -2 * 60 : -4 * 60

  // Danes: vključuje drift (odraža trenutno stanje aerobne baze)
  const casFinal = casBaza + tezaKorekcija + kmKorekcija + prvicKorekcija + driftKorekcija
  // Tekma: brez drift korekcije (drift se bo z treningom izboljšal do tekme)
  const casTekma = casTekmaBase ? casTekmaBase + tezaKorekcija + kmKorekcijaTekma + prvicKorekcija : null

  // Zanesljivost
  let zanesljivost = 0, zanesljivostRazlogi = []
  if (teki.length >= 10) { zanesljivost += 20; zanesljivostRazlogi.push(`${teki.length} tekov v bazi ✓`) }
  else if (teki.length >= 5) { zanesljivost += 12; zanesljivostRazlogi.push(`${teki.length} tekov (optimalno 10+)`) }
  else { zanesljivost += 4; zanesljivostRazlogi.push(`samo ${teki.length} teki`) }
  if (vo2Teki.length >= 3) { zanesljivost += 20; zanesljivostRazlogi.push(`VO2max EWMA iz ${vo2Teki.length} meritev ✓`) }
  else if (vo2Teki.length > 0) { zanesljivost += 12; zanesljivostRazlogi.push(`VO2max samo ${vo2Teki.length} meritev`) }
  else { zanesljivostRazlogi.push('ni VO2max podatkov') }
  if (hrTempoTocke.length >= 5) { zanesljivost += 20; zanesljivostRazlogi.push('HR-tempo WLS korelacija ✓') }
  else if (hrTempoTocke.length >= 2) { zanesljivost += 12; zanesljivostRazlogi.push('osnovna HR-tempo korelacija') }
  else { zanesljivostRazlogi.push('premalo HR-tempo točk') }
  zanesljivost += 15; zanesljivostRazlogi.push('polmaraton 1:47 (Riegel sidro) ✓')
  if (currentTeden >= 16) { zanesljivost += 20; zanesljivostRazlogi.push('pozna faza priprav ✓') }
  else if (currentTeden >= 10) { zanesljivost += 12; zanesljivostRazlogi.push(`T${currentTeden} — sredina priprav`) }
  else { zanesljivost += 4; zanesljivostRazlogi.push(`T${currentTeden} — zgodnja faza`) }
  zanesljivost = Math.min(zanesljivost, 95)

  // Trend (HR-tempo napredek skozi čas)
  let trend = null
  if (hrTempoTocke.length >= 4) {
    const sortedT = [...hrTempoTocke].sort((a, b) => a.datum.localeCompare(b.datum))
    const half = Math.floor(sortedT.length / 2)
    const avgZgodaj = sortedT.slice(0, half).reduce((s, p) => s + p.tempoSec, 0) / half
    const avgKasno = sortedT.slice(half).reduce((s, p) => s + p.tempoSec, 0) / (sortedT.length - half)
    trend = (avgZgodaj - avgKasno) * 42.195
  }

  return {
    casFinal, casVo2, casHR, riegelCas, riegelLabel, projectedVo2, projectedCasVo2, casTekma,
    zanesljivost, zanesljivostRazlogi, tezaKorekcija, kmKorekcija, kmKorekcijaTekma, prvicKorekcija,
    driftKorekcija, recentDrift,
    trend, tempoNa155, vo2Uporabljen, ewmaVo2, vo2Slope, vo2ChartData,
    maxKm, steviloTekov: teki.length, zadnjaTeza
  }
}
