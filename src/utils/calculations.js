import { PLAN, CILJI, TODAY, TODAY_STR, YESTERDAY_STR, getCurrentTeden } from '../constants/plan'
import { tempoStrToSec } from './tempo'

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
  const porabljeneVceraj = metVceraj.skupaj_kcal || (metVceraj.bmr_kcal ? metVceraj.bmr_kcal + treningKcalVceraj : 1946 + treningKcalVceraj)
  const deficitVceraj = prehranaVceraj.kalorije_skupaj ? Math.round(prehranaVceraj.kalorije_skupaj - porabljeneVceraj) : null

  const zadnjih7Prehrana = prehrana.filter(p => p.kalorije_skupaj > 0 && p.datum < tekDatum).slice(0, 7)
  const deficiti7 = zadnjih7Prehrana.map(p => {
    const w = workouts.filter(w2 => w2.datum === p.datum).reduce((s, w2) => s + (w2.kalorije || 0), 0)
    const mD = metrike.find(m2 => m2.datum === p.datum) || {}
    const por = mD.skupaj_kcal || (mD.bmr_kcal ? mD.bmr_kcal + w : 1946 + w)
    return p.kalorije_skupaj - por
  })
  const povprecniDeficit7 = deficiti7.length > 0 ? Math.round(deficiti7.reduce((s, d) => s + d, 0) / deficiti7.length) : null

  const lapi = lapsTeka.filter(l => l.garmin_activity_id === zadnjiTek.garmin_activity_id)
    .sort((a, b) => a.lap_number - b.lap_number)

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
