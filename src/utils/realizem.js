import { isTek } from './helpers'
import { tempoStrToSec, secToTempoStr } from './tempo'
import { PLAN, PLAN_TRENINGI, getCurrentTeden } from '../constants/plan'

// Neodvisna, unbiased ocena realnosti predikcije.
// Ne zaupa nobeni parametru modela — gleda samo surove podatke.
// Vsak check vrne: { label, score (-2..+2), message, color }

export function oceniRealizem(predikcija, workouts, metrike, laps = []) {
  if (!predikcija) return null

  const { casFinal, vo2Slope, maxKm, recentDrift, casHR, riegelCas } = predikcija
  const teki = workouts.filter(w => isTek(w) && w.razdalja_km > 0)
  const maraTempoSec = casFinal / 42.195
  const currentTeden = getCurrentTeden()
  const checks = []

  // ── 1. Aerobna učinkovitost vs. predikcija (iz lap podatkov) ──────────────
  // Vzamemo lape pri HR 148–165 bpm in normaliziramo tempo na 160 bpm
  // s Fittsovim modelom: vsak bpm razlike ≈ 4 s/km.
  // Primerjamo normaliziran tempo (aerobna baza) z napovejanim maratonskim.
  const aerobniLapi = laps.filter(l => {
    const ts = tempoStrToSec(l.povprecni_tempo)
    return l.povprecni_hr && l.povprecni_hr >= 148 && l.povprecni_hr <= 165 &&
      ts && ts > 0 && ts < 600
  }).slice(0, 40)

  if (aerobniLapi.length >= 5) {
    const normirani = aerobniLapi.map(l => tempoStrToSec(l.povprecni_tempo) + (l.povprecni_hr - 160) * 4)
    const avgNorm = normirani.reduce((s, v) => s + v, 0) / normirani.length
    const diff = avgNorm - maraTempoSec
    const diffPct = (diff / maraTempoSec) * 100
    if (diff < -30) {
      checks.push({ label: 'Aerobna učinkovitost', score: 2, color: '#22c55e', message: `Aerobna baza (${secToTempoStr(Math.round(avgNorm))}/km @160bpm) je ${Math.abs(diffPct).toFixed(0)}% nad napovejanim maratonskim tempom — predikcija konzervativna` })
    } else if (diff < 0) {
      checks.push({ label: 'Aerobna učinkovitost', score: 1, color: '#22c55e', message: `Aerobna baza (${secToTempoStr(Math.round(avgNorm))}/km @160bpm) podpira napovejan tempo ${secToTempoStr(Math.round(maraTempoSec))}/km` })
    } else if (diff < 25) {
      checks.push({ label: 'Aerobna učinkovitost', score: 0, color: '#eab308', message: `Aerobna baza (${secToTempoStr(Math.round(avgNorm))}/km @160bpm) blizu napovedanega tempa — na meji` })
    } else {
      checks.push({ label: 'Aerobna učinkovitost', score: -1, color: '#f97316', message: `Aerobna baza (${secToTempoStr(Math.round(avgNorm))}/km @160bpm) počasnejša od napovedanega tempa — predikcija zahtevnejša` })
    }
  }

  // ── 2. Srčni drift — prilagojen fazi ─────────────────────────────────────
  // V zgodnji fazi (T01–T10) je drift do 18 bpm normalen — baza se gradi.
  // V kasnejši fazi (T11+) mora biti drift pod 12 bpm za realen maraton.
  if (recentDrift !== null) {
    const earlyPhase = currentTeden <= 10
    if (earlyPhase) {
      if (recentDrift > 22) {
        checks.push({ label: 'Srčni drift', score: -1, color: '#f97316', message: `Drift +${recentDrift} bpm — za T${currentTeden} visoko, aerobna baza šibka` })
      } else if (recentDrift > 18) {
        checks.push({ label: 'Srčni drift', score: 0, color: '#eab308', message: `Drift +${recentDrift} bpm — v T${currentTeden} sprejemljivo, izboljšuje se z kilometrino` })
      } else if (recentDrift > 10) {
        checks.push({ label: 'Srčni drift', score: 1, color: '#22c55e', message: `Drift +${recentDrift} bpm — za ${currentTeden}. teden dober znak aerobne baze` })
      } else {
        checks.push({ label: 'Srčni drift', score: 2, color: '#22c55e', message: `Drift +${recentDrift} bpm — odlična srčna stabilnost za to fazo` })
      }
    } else {
      if (recentDrift > 20) {
        checks.push({ label: 'Srčni drift', score: -2, color: '#ef4444', message: `Drift +${recentDrift} bpm — kritično za T${currentTeden}. Aerobni sistem se sesuje pred km 30` })
      } else if (recentDrift > 14) {
        checks.push({ label: 'Srčni drift', score: -1, color: '#f97316', message: `Drift +${recentDrift} bpm — aerobna baza šibka za to fazo` })
      } else if (recentDrift > 7) {
        checks.push({ label: 'Srčni drift', score: 0, color: '#eab308', message: `Drift +${recentDrift} bpm — sprejemljiv` })
      } else {
        checks.push({ label: 'Srčni drift', score: 2, color: '#22c55e', message: `Drift +${recentDrift} bpm — aerobna baza stabilna` })
      }
    }
  }

  // ── 3. Najdaljši trening — prilagojen planu ───────────────────────────────
  // Primerjamo z ciljnim C-treningom za trenutni teden v PLAN_TRENINGI.
  // Če smo na ali nad planiranim, je to pozitiven signal.
  const longestRun = Math.max(...teki.map(w => w.razdalja_km || 0), 0)
  const planCforCurrentWeek = PLAN_TRENINGI.filter(t => t.teden === currentTeden && t.naziv.endsWith('C'))
  const planLongRunKm = planCforCurrentWeek.length > 0 ? Math.max(...planCforCurrentWeek.map(t => t.km)) : null
  const absoluteTarget = 30

  if (planLongRunKm !== null) {
    const ratio = longestRun / planLongRunKm
    if (ratio >= 1.0) {
      checks.push({ label: 'Najdaljši tek', score: 2, color: '#22c55e', message: `${longestRun.toFixed(1)} km — dosega ali presega plan T${currentTeden} (${planLongRunKm} km)` })
    } else if (ratio >= 0.85) {
      checks.push({ label: 'Najdaljši tek', score: 1, color: '#22c55e', message: `${longestRun.toFixed(1)} km — blizu plana T${currentTeden} (${planLongRunKm} km)` })
    } else if (ratio >= 0.7) {
      checks.push({ label: 'Najdaljši tek', score: 0, color: '#eab308', message: `${longestRun.toFixed(1)} km — pod planom T${currentTeden} (${planLongRunKm} km)` })
    } else {
      checks.push({ label: 'Najdaljši tek', score: -1, color: '#f97316', message: `${longestRun.toFixed(1)} km — znatno pod planom T${currentTeden} (${planLongRunKm} km), zaostajanje` })
    }
  } else {
    if (longestRun >= absoluteTarget) {
      checks.push({ label: 'Najdaljši tek', score: 2, color: '#22c55e', message: `${longestRun.toFixed(1)} km — vzdržljivostna baza potrjena` })
    } else if (longestRun >= 22) {
      checks.push({ label: 'Najdaljši tek', score: 0, color: '#eab308', message: `${longestRun.toFixed(1)} km — na pravi poti, cilj je 30 km pred tapering` })
    } else if (longestRun >= 16) {
      checks.push({ label: 'Najdaljši tek', score: -1, color: '#f97316', message: `${longestRun.toFixed(1)} km — do tekme nujno doseči 28–32 km` })
    } else {
      checks.push({ label: 'Najdaljši tek', score: -2, color: '#ef4444', message: `${longestRun.toFixed(1)} km — preboj za km 30+ bo šok za telo` })
    }
  }

  // ── 4. VO2max trend ────────────────────────────────────────────────────────
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
  if (casHR && riegelCas) {
    const diffMin = Math.abs(casHR - riegelCas) / 60
    if (diffMin > 40) {
      checks.push({ label: 'Konsistentnost metod', score: -2, color: '#ef4444', message: `HR metoda in Riegel se razlikujeta za ${Math.round(diffMin)} min — predikcija nestabilna, podatkov premalo` })
    } else if (diffMin > 30) {
      checks.push({ label: 'Konsistentnost metod', score: -1, color: '#f97316', message: `Razlika med metodami ${Math.round(diffMin)} min — zmerna negotovost` })
    } else if (diffMin > 15) {
      checks.push({ label: 'Konsistentnost metod', score: 0, color: '#eab308', message: `Razlika ${Math.round(diffMin)} min — sprejemljivo za zgodnjo fazo` })
    } else {
      checks.push({ label: 'Konsistentnost metod', score: 1, color: '#22c55e', message: `Metodi skladni (razlika ${Math.round(diffMin)} min) — konsistentna predikcija` })
    }
  }

  // ── 8. Teža vs. plan ──────────────────────────────────────────────────────
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

  // ── 9. Frekvenca treningov (zadnjih 28 dni) ───────────────────────────────
  // Konsistentnost je ključna — prekinitve v treningu so slabši signal od volumna.
  const cutoff28 = new Date(); cutoff28.setDate(cutoff28.getDate() - 28)
  const recentRuns = teki.filter(w => w.datum && new Date(w.datum) >= cutoff28)
  const runsPerWeek = recentRuns.length / 4
  if (runsPerWeek >= 4) {
    checks.push({ label: 'Frekvenca treningov', score: 2, color: '#22c55e', message: `${recentRuns.length} tekov v 28 dneh (${runsPerWeek.toFixed(1)}/teden) — odlična konsistentnost` })
  } else if (runsPerWeek >= 3) {
    checks.push({ label: 'Frekvenca treningov', score: 2, color: '#22c55e', message: `${recentRuns.length} tekov v 28 dneh (${runsPerWeek.toFixed(1)}/teden) — dobra konsistentnost` })
  } else if (runsPerWeek >= 2) {
    checks.push({ label: 'Frekvenca treningov', score: 1, color: '#22c55e', message: `${recentRuns.length} tekov v 28 dneh (${runsPerWeek.toFixed(1)}/teden) — sprejemljivo, a ciljaj na 3+/teden` })
  } else if (runsPerWeek >= 1) {
    checks.push({ label: 'Frekvenca treningov', score: -1, color: '#f97316', message: `${recentRuns.length} tekov v 28 dneh (${runsPerWeek.toFixed(1)}/teden) — prenizka frekvenca za maraton` })
  } else {
    checks.push({ label: 'Frekvenca treningov', score: -2, color: '#ef4444', message: `${recentRuns.length} tekov v 28 dneh — kritično nizka frekvenca` })
  }

  // ── 10. Kakovost spanja (zadnjih 7 dni) ──────────────────────────────────
  // Spanje je primarni regeneracijski mehanizem — brez njega ni adaptacije.
  const spanjeData = metrike.filter(m => m.spanje_h && m.spanje_h > 0).slice(0, 7)
  if (spanjeData.length >= 4) {
    const avgSpanje = spanjeData.reduce((s, m) => s + m.spanje_h, 0) / spanjeData.length
    if (avgSpanje >= 7.5) {
      checks.push({ label: 'Spanje (7 dni)', score: 2, color: '#22c55e', message: `Povprečje ${avgSpanje.toFixed(1)}h/noč — odlično za regeneracijo in adaptacijo` })
    } else if (avgSpanje >= 7.0) {
      checks.push({ label: 'Spanje (7 dni)', score: 2, color: '#22c55e', message: `Povprečje ${avgSpanje.toFixed(1)}h/noč — dobra regeneracija` })
    } else if (avgSpanje >= 6.5) {
      checks.push({ label: 'Spanje (7 dni)', score: 1, color: '#22c55e', message: `Povprečje ${avgSpanje.toFixed(1)}h/noč — sprejemljivo, ciljaj na 7–8h` })
    } else if (avgSpanje >= 6.0) {
      checks.push({ label: 'Spanje (7 dni)', score: 0, color: '#eab308', message: `Povprečje ${avgSpanje.toFixed(1)}h/noč — malo, regeneracija omejena` })
    } else {
      checks.push({ label: 'Spanje (7 dni)', score: -1, color: '#f97316', message: `Povprečje ${avgSpanje.toFixed(1)}h/noč — premalo za kakovostno adaptacijo` })
    }
  }

  // ── 11. Stres (zadnjih 7 dni) ─────────────────────────────────────────────
  // Nizek kronični stres = boljša hormonska osnova za adaptacijo (kortizol).
  const stresData = metrike.filter(m => m.stres_povprecje && m.stres_povprecje > 0).slice(0, 7)
  if (stresData.length >= 4) {
    const avgStres = stresData.reduce((s, m) => s + m.stres_povprecje, 0) / stresData.length
    if (avgStres < 25) {
      checks.push({ label: 'Stres (7 dni)', score: 2, color: '#22c55e', message: `Povprečje ${avgStres.toFixed(0)}/100 — odlična hormonska osnova za adaptacijo` })
    } else if (avgStres < 35) {
      checks.push({ label: 'Stres (7 dni)', score: 2, color: '#22c55e', message: `Povprečje ${avgStres.toFixed(0)}/100 — nizek stres podpira regeneracijo` })
    } else if (avgStres < 45) {
      checks.push({ label: 'Stres (7 dni)', score: 1, color: '#22c55e', message: `Povprečje ${avgStres.toFixed(0)}/100 — zmeren stres, regeneracija delno omejena` })
    } else if (avgStres < 55) {
      checks.push({ label: 'Stres (7 dni)', score: 0, color: '#eab308', message: `Povprečje ${avgStres.toFixed(0)}/100 — povišan stres, pazi na preobremenitev` })
    } else {
      checks.push({ label: 'Stres (7 dni)', score: -1, color: '#f97316', message: `Povprečje ${avgStres.toFixed(0)}/100 — visok kronični stres blokira adaptacijo` })
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
    verdictOpis = 'Več signalov kaže na preveč optimizma. Predikcija predpostavlja idealne pogoje ki jih podatki ne potrjujejo.'
  } else {
    verdict = 'Preoptimistična'; verdictColor = '#ef4444'
    verdictOpis = 'Podatki konsistentno kažejo, da predviden čas ne ustreza trenutni formi. Revidiraj cilj.'
  }

  return { verdict, verdictColor, verdictOpis, score: totalScore, maxScore: maxPossible, pct, checks }
}
