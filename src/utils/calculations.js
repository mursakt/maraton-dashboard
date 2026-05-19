import { PLAN, CILJI, TODAY, TODAY_STR, YESTERDAY_STR, getCurrentTeden } from '../constants/plan'

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
