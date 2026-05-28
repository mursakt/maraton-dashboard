import { isTek } from './helpers'
import { tempoStrToSec, secToTempoStr } from './tempo'
import { getCurrentTeden, PLAN } from '../constants/plan'

// Neodvisna, unbiased ocena realnosti predikcije.
// Ne zaupa nobeni parametru modela — gleda samo surove podatke.
// Vsak check vrne: { label, score (-2..+2), message, color }

function minsec(totalSec) {
  const m = Math.floor(Math.abs(totalSec) / 60)
  const s = Math.round(Math.abs(totalSec) % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export function oceniRealizem(predikcija, workouts, metrike, laps = []) {
  if (!predikcija) return null

  const { casFinal, vo2Slope, maxKm, recentDrift, casHR, riegelCas } = predikcija
  const teki = workouts.filter(w => isTek(w) && w.razdalja_km > 0)
  const maraTempoSec = casFinal / 42.195
  const checks = []

  // ── 1. Easy pace vs. predviden marathon tempo ──────────────────────────────
  // Tipično je marathon 12–18% hitrejši od easy teka.
  // Če je ratio zunaj tega, je predikcija vprašljiva.
  const easyRuns = teki
    .filter(w => w.povprecni_hr && w.povprecni_hr < 150 && w.povprecni_tempo && w.razdalja_km >= 5)
    .slice(0, 6)
  if (easyRuns.length >= 2) {
    const avgEasyTempo = easyRuns.reduce((s, w) => s + (tempoStrToSec(w.povprecni_tempo) || 0), 0) / easyRuns.length
    const ratio = maraTempoSec / avgEasyTempo
    const pct = Math.round((1 - ratio) * 100)
    if (ratio > 0.93) {
      checks.push({ label: 'Easy vs. marathon pace', score: -2, color: '#ef4444', message: `Predviden marathon tempo je le ${pct}% hitrejši od easy teka (${secToTempoStr(avgEasyTempo)}/km) — razlika premajhna, fizikalno vprašljivo` })
    } else if (ratio > 0.87) {
      checks.push({ label: 'Easy vs. marathon pace', score: -1, color: '#f97316', message: `Marathon tempo ${pct}% hitrejši od easy teka — na spodnji meji realnega (tipično 12–18%)` })
    } else if (ratio > 0.80) {
      checks.push({ label: 'Easy vs. marathon pace', score: 1, color: '#22c55e', message: `Marathon tempo ${pct}% hitrejši od easy teka — realistično razmerje` })
    } else {
      checks.push({ label: 'Easy vs. marathon pace', score: 2, color: '#22c55e', message: `Marathon tempo ${pct}% hitrejši od easy teka — aerobna baza podpira predikcijo` })
    }
  }

  // ── 2. Srčni drift na dolgem teku ─────────────────────────────────────────
  // Drift > 15 bpm pomeni, da aerobna baza ne bo zdržala 42 km pri predvidenem tempu.
  if (recentDrift !== null) {
    if (recentDrift > 20) {
      checks.push({ label: 'Srčni drift', score: -2, color: '#ef4444', message: `Drift +${recentDrift} bpm — kritično. Aerobni sistem se sesuje pred km 30, tempo bo padel za >30 s/km` })
    } else if (recentDrift > 14) {
      checks.push({ label: 'Srčni drift', score: -1, color: '#f97316', message: `Drift +${recentDrift} bpm — aerobna baza šibka. Pričakuj upad v zadnji tretjini maratona` })
    } else if (recentDrift > 7) {
      checks.push({ label: 'Srčni drift', score: 0, color: '#eab308', message: `Drift +${recentDrift} bpm — sprejemljiv, a se bo izboljšal šele z daljšo kilometrino` })
    } else {
      checks.push({ label: 'Srčni drift', score: 2, color: '#22c55e', message: `Drift +${recentDrift} bpm — aerobna baza stabilna, podpira predviden tempo` })
    }
  }

  // ── 3. Najdaljši trening ───────────────────────────────────────────────────
  // Za maraton je potrebno doseči vsaj 28–32 km dolge teke.
  const longestRun = Math.max(...teki.map(w => w.razdalja_km || 0), 0)
  if (longestRun < 16) {
    checks.push({ label: 'Najdaljši tek', score: -2, color: '#ef4444', message: `${longestRun.toFixed(1)} km — preboj za km 30+ bo šok za telo. Nujno 28–32 km pred tapering.` })
  } else if (longestRun < 22) {
    checks.push({ label: 'Najdaljši tek', score: -1, color: '#f97316', message: `${longestRun.toFixed(1)} km — v redu za to fazo, a do tekme nujno doseči 28–32 km` })
  } else if (longestRun < 28) {
    checks.push({ label: 'Najdaljši tek', score: 0, color: '#eab308', message: `${longestRun.toFixed(1)} km — na pravi poti, cilj je 30 km pred tapering` })
  } else {
    checks.push({ label: 'Najdaljši tek', score: 2, color: '#22c55e', message: `${longestRun.toFixed(1)} km — vzdržljivostna baza potrjena` })
  }

  // ── 4. VO2max trend ────────────────────────────────────────────────────────
  // Trend je iz linearne regresije — neodvisno od absolutne vrednosti.
  if (vo2Slope !== null) {
    const weekly = vo2Slope * 7
    if (vo2Slope < -0.003) {
      checks.push({ label: 'VO2max trend', score: -2, color: '#ef4444', message: `VO2max pada (${weekly.toFixed(2)}/teden) — telo se ne adaptira. Preobremenjenost ali premalo regeneracije.` })
    } else if (vo2Slope < 0.007) {
      checks.push({ label: 'VO2max trend', score: -1, color: '#f97316', message: `VO2max stagnira (~${weekly.toFixed(2)}/teden) — adaptacija prepočasna za dosego ciljnega časa` })
    } else if (vo2Slope < 0.04) {
      checks.push({ label: 'VO2max trend', score: 1, color: '#22c55e', message: `VO2max raste +${weekly.toFixed(2)}/teden — dobra aerobna adaptacija` })
    } else {
      checks.push({ label: 'VO2max trend', score: 2, color: '#22c55e', message: `VO2max raste hitro +${weekly.toFixed(2)}/teden — odlična forma` })
    }
  }

  // ── 5. Volumen — bo peak dovolj visok? ────────────────────────────────────
  // Iz PLAN preberemo max km v prihodnjih tednih in primerjamo s potrebnim.
  const currentTeden = getCurrentTeden()
  const futurePlan = PLAN.filter(p => p.teden > currentTeden && p.teden <= 20)
  const planPeakKm = futurePlan.length > 0 ? Math.max(...futurePlan.map(p => p.km)) : maxKm
  const requiredKm = casFinal < 13500 ? 60 : casFinal < 14400 ? 52 : casFinal < 16200 ? 44 : 38
  const ratio5 = planPeakKm / requiredKm
  if (ratio5 < 0.75) {
    checks.push({ label: 'Peak volumen (plan)', score: -2, color: '#ef4444', message: `Plan predvideva max ${planPeakKm} km/teden — prenizko za cilj (potrebno ${requiredKm} km)` })
  } else if (ratio5 < 0.9) {
    checks.push({ label: 'Peak volumen (plan)', score: -1, color: '#f97316', message: `Plan predvideva max ${planPeakKm} km/teden — malo pod idealom ${requiredKm} km` })
  } else if (ratio5 < 1.1) {
    checks.push({ label: 'Peak volumen (plan)', score: 1, color: '#22c55e', message: `Plan predvideva max ${planPeakKm} km/teden — zadostuje za cilj` })
  } else {
    checks.push({ label: 'Peak volumen (plan)', score: 2, color: '#22c55e', message: `Plan predvideva max ${planPeakKm} km/teden — presega minimum za cilj` })
  }

  // ── 6. HRV trend (zadnjih 14 dni) ─────────────────────────────────────────
  // Pada HRV = telo se preobremenuje, ne adaptira. Raste HRV = adaptacija teče.
  const hrvData = metrike.filter(m => m.hrv && m.hrv > 0).slice(0, 14)
  if (hrvData.length >= 8) {
    const recent = hrvData.slice(0, 7).map(m => m.hrv)
    const older = hrvData.slice(7).map(m => m.hrv)
    const avgRecent = recent.reduce((s, v) => s + v, 0) / recent.length
    const avgOlder = older.reduce((s, v) => s + v, 0) / older.length
    const delta = avgRecent - avgOlder
    if (delta < -5) {
      checks.push({ label: 'HRV trend (14 dni)', score: -2, color: '#ef4444', message: `HRV padel za ${Math.abs(delta).toFixed(0)} točk (${avgOlder.toFixed(0)}→${avgRecent.toFixed(0)}) — preobremenjenost, telo se ne adaptira` })
    } else if (delta < -2) {
      checks.push({ label: 'HRV trend (14 dni)', score: -1, color: '#f97316', message: `HRV rahlo nižji (−${Math.abs(delta).toFixed(1)}) — pazi na regeneracijo` })
    } else if (delta < 3) {
      checks.push({ label: 'HRV trend (14 dni)', score: 1, color: '#22c55e', message: `HRV stabilen (${avgOlder.toFixed(0)}→${avgRecent.toFixed(0)}) — dobra regeneracija` })
    } else {
      checks.push({ label: 'HRV trend (14 dni)', score: 2, color: '#22c55e', message: `HRV raste +${delta.toFixed(0)} točk — odlična adaptacija` })
    }
  }

  // ── 7. Konsistentnost med metodami ────────────────────────────────────────
  // Riegel (real race) in HR-tempo metoda (training data) bi morala biti skladna.
  // Velika razlika = eden od njiju je nesigurliv.
  if (casHR && riegelCas) {
    const diffMin = Math.abs(casHR - riegelCas) / 60
    if (diffMin > 40) {
      checks.push({ label: 'Konsistentnost metod', score: -2, color: '#ef4444', message: `HR metoda in Riegel se razlikujeta za ${Math.round(diffMin)} min — predikcija je nestabilna, podatkov premalo` })
    } else if (diffMin > 25) {
      checks.push({ label: 'Konsistentnost metod', score: -1, color: '#f97316', message: `Razlika med metodami ${Math.round(diffMin)} min — zmerna negotovost` })
    } else if (diffMin > 12) {
      checks.push({ label: 'Konsistentnost metod', score: 0, color: '#eab308', message: `Razlika ${Math.round(diffMin)} min — sprejemljivo za zgodnjo fazo` })
    } else {
      checks.push({ label: 'Konsistentnost metod', score: 1, color: '#22c55e', message: `Metodi skladni (razlika ${Math.round(diffMin)} min) — konsistentna predikcija` })
    }
  }

  // ── 8. Teža vs. plan ──────────────────────────────────────────────────────
  // Teža vpliva na VO2max/kg. Če je nad planom, je VO2max precenevčen.
  const latestWeight = metrike.find(m => m.teza_kg)?.teza_kg
  const planWeight = PLAN.find(p => p.teden === currentTeden)?.ciljnaKg
  if (latestWeight && planWeight) {
    const diff = latestWeight - planWeight
    if (diff > 4) {
      checks.push({ label: 'Teža vs. plan', score: -2, color: '#ef4444', message: `${latestWeight.toFixed(1)} kg — ${diff.toFixed(1)} kg nad ciljno za T${currentTeden} (${planWeight} kg). VO2max/kg precenjen.` })
    } else if (diff > 2) {
      checks.push({ label: 'Teža vs. plan', score: -1, color: '#f97316', message: `${latestWeight.toFixed(1)} kg — ${diff.toFixed(1)} kg nad ciljno (${planWeight} kg)` })
    } else if (diff > -1) {
      checks.push({ label: 'Teža vs. plan', score: 1, color: '#22c55e', message: `${latestWeight.toFixed(1)} kg — na planu (cilj ${planWeight} kg)` })
    } else {
      checks.push({ label: 'Teža vs. plan', score: 2, color: '#22c55e', message: `${latestWeight.toFixed(1)} kg — pod ciljno težo, VO2max/kg ugoden` })
    }
  }

  // ── Skupna ocena ──────────────────────────────────────────────────────────
  const totalScore = checks.reduce((s, c) => s + c.score, 0)
  const maxPossible = checks.length * 2
  const pct = maxPossible > 0 ? Math.round((totalScore + maxPossible) / (2 * maxPossible) * 100) : 50

  let verdict, verdictColor, verdictOpis
  if (pct >= 72) {
    verdict = 'Realna'; verdictColor = '#22c55e'
    verdictOpis = 'Podatki podpirajo predikcijo — cilj je dosegljiv ob doslednem izvajanju plana.'
  } else if (pct >= 52) {
    verdict = 'Pogojno realna'; verdictColor = '#eab308'
    verdictOpis = 'Predikcija je možna, a zahteva vse: perfektno prehrano, regeneracijo in pacing.'
  } else if (pct >= 35) {
    verdict = 'Tvegana'; verdictColor = '#f97316'
    verdictOpis = 'Več signalov kaže na preveliko optimizem. Predikcija predpostavlja idealne pogoje ki jih podatki ne potrjujejo.'
  } else {
    verdict = 'Preoptimistična'; verdictColor = '#ef4444'
    verdictOpis = 'Podatki konsistentno kažejo, da predviden čas ne ustreza trenutni formi. Revidiraj cilj.'
  }

  return { verdict, verdictColor, verdictOpis, score: totalScore, maxScore: maxPossible, pct, checks }
}
