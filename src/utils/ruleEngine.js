import { PLAN_TRENINGI } from '../constants/plan'
import { tempoStrToSec, secToTempoStr } from './tempo'
import { isTek, izracunajBMR } from './helpers'
import { izracunajLoad } from './calculations'

function avg(arr) {
  const valid = (arr || []).filter(v => v != null && !isNaN(v))
  if (!valid.length) return null
  return valid.reduce((s, v) => s + v, 0) / valid.length
}

function fmt(val, dec = 1) {
  if (val == null || isNaN(val)) return '—'
  return Number(val).toFixed(dec)
}

function tipIzOpis(opis) {
  if (!opis) return 'easy'
  const o = opis.toLowerCase()
  if (o.includes('maraton')) return 'race'
  if (o.includes('race pace')) return 'racepace'
  if (o.includes('interval')) return 'intervals'
  if (o.includes('hribč')) return 'hills'
  if (o.includes('dolgi tek')) return 'long'
  return 'easy'
}

function najdiPlanEntry(workout) {
  if (!workout) return null
  const byNaziv = PLAN_TRENINGI.find(p => p.naziv === workout.naziv)
  if (byNaziv) return byNaziv
  return PLAN_TRENINGI.find(p => p.datum === workout.datum) || null
}

function detectTip(workout) {
  const pe = najdiPlanEntry(workout)
  if (pe) return tipIzOpis(pe.opis)
  if (workout.aerobni_te >= 4 || (workout.povprecni_hr && workout.povprecni_hr > 165)) return 'intervals'
  if (workout.razdalja_km >= 12) return 'long'
  return 'easy'
}

const TIP_LABEL = {
  easy: 'lahkih tekov',
  long: 'dolgih tekov',
  intervals: 'intervalnih treningov',
  hills: 'hribčkov',
  racepace: 'race pace tekov',
  race: 'maratonov/polmaratonov',
}

function hrEff(workout) {
  const t = tempoStrToSec(workout.povprecni_tempo)
  if (!t || !workout.povprecni_hr || workout.povprecni_hr <= 0) return null
  return t / workout.povprecni_hr
}

export function runRuleEngine({ zadnjiTek, lapsTeka = [], metrike = [], prehrana = [], workouts = [] }) {
  const findings = []

  function add(category, severity, title, detail, metric = null) {
    findings.push({ category, severity, title, detail, metric })
  }

  if (!zadnjiTek) return findings

  const tekDatum = zadnjiTek.datum
  const danPred = new Date(new Date(tekDatum) - 86400000).toISOString().slice(0, 10)
  // metrike je sortiran newest first
  const metrikeDanPred = metrike.find(m => m.datum === danPred) || {}
  const metrikeTekDan = metrike.find(m => m.datum === tekDatum) || {}
  const prehranaVceraj = prehrana.find(p => p.datum === danPred && p.kalorije_skupaj > 0) || {}
  const tezaKg = metrike.find(m => m.teza_kg)?.teza_kg || 95

  const lapi = lapsTeka
    .filter(l => l.garmin_activity_id === zadnjiTek.garmin_activity_id)
    .sort((a, b) => a.lap_number - b.lap_number)

  const planEntry = najdiPlanEntry(zadnjiTek)
  const tipTreninga = detectTip(zadnjiTek)

  const vsiTeki = workouts
    .filter(w => isTek(w) && w.datum < tekDatum && w.razdalja_km > 0)
    .sort((a, b) => b.datum.localeCompare(a.datum))
  const istiTip = vsiTeki.filter(w => detectTip(w) === tipTreninga).slice(0, 8)

  // ─── 1. CARDIAC DRIFT ────────────────────────────────────────────
  if (lapi.length >= 3) {
    const tretjina = Math.floor(lapi.length / 3)
    const prvaHR = avg(lapi.slice(0, tretjina).map(l => l.povprecni_hr))
    const zadnjaHR = avg(lapi.slice(-tretjina).map(l => l.povprecni_hr))
    if (prvaHR && zadnjaHR) {
      const drift = Math.round(zadnjaHR - prvaHR)
      if (drift > 20)
        add('tek', 'alarm', 'Cardiac drift kritičen', `HR narastel za ${drift} bpm — glikogen izčrpan ali dehidracija`, { drift })
      else if (drift > 12)
        add('tek', 'warning', 'Cardiac drift visok', `HR narastel za ${drift} bpm — verjetno nizek glikogen ali vročina`, { drift })
      else if (drift > 6)
        add('tek', 'info', 'Cardiac drift zmeren', `HR narastel za ${drift} bpm — normalno za daljši tek`, { drift })
      else if (drift <= 3 && zadnjiTek.razdalja_km >= 10)
        add('tek', 'info', 'Minimalen cardiac drift', `HR stabilen čez tek (drift ${drift} bpm) — odličen aerobni indikator`, { drift })
    }
  }

  // ─── 2. TEMPO DEGRADACIJA ─────────────────────────────────────────
  if (lapi.length >= 6) {
    const prvi3 = lapi.slice(0, 3).filter(l => l.povprecni_tempo)
    const zadnji3 = lapi.slice(-3).filter(l => l.povprecni_tempo)
    if (prvi3.length && zadnji3.length) {
      const zac = avg(prvi3.map(l => tempoStrToSec(l.povprecni_tempo)))
      const kon = avg(zadnji3.map(l => tempoStrToSec(l.povprecni_tempo)))
      if (zac && kon) {
        const diff = Math.round(kon - zac)
        if (diff > 30)
          add('tek', 'alarm', 'Velik padec tempa', `Zadnji del ${diff}s/km počasneje kot začetek — glikogen ali pregrevanje`, { diff })
        else if (diff > 15)
          add('tek', 'warning', 'Zmeren padec tempa', `Zadnji del ${diff}s/km počasneje — pazi na prehrano in tempo`, { diff })
        else if (diff > 5)
          add('tek', 'info', 'Blag padec tempa', `Minimalen padec ${diff}s/km — normalno`, { diff })
        else if (diff < -5)
          add('tek', 'info', 'Negativni split', `Zadnji del ${Math.abs(diff)}s/km hitrejši — odlično!`, { diff })
      }
    }
  }

  // ─── 3. HR ZONA vs PLAN ───────────────────────────────────────────
  if (planEntry?.hr && zadnjiTek.povprecni_hr) {
    const parts = planEntry.hr.split('–')
    const hrMin = Number(parts[0])
    const hrMax = Number(parts[1])
    const avgHr = zadnjiTek.povprecni_hr
    if (!isNaN(hrMin) && !isNaN(hrMax)) {
      if (avgHr > hrMax + 5)
        add('tek', 'warning', 'HR nad ciljno cono', `Povp. HR ${avgHr} bpm (plan: ${planEntry.hr}) — previsok napor za "${planEntry.opis}"`, { avgHr, hrMin, hrMax })
      else if (avgHr < hrMin - 10)
        add('tek', 'info', 'HR pod ciljno cono', `Povp. HR ${avgHr} bpm (plan: ${planEntry.hr}) — preveč konzervativno`, { avgHr, hrMin, hrMax })
    }
  }

  // ─── 4. TRAINING EFFECT vs TIP ────────────────────────────────────
  const te = zadnjiTek.aerobni_te
  if (te) {
    if (tipTreninga === 'easy' && te >= 4)
      add('tek', 'warning', 'Lahek tek prenaporen', `TE ${fmt(te, 1)} — za easy tek previsok, verjetno pretrd tempo`, { te })
    else if (tipTreninga === 'long' && te >= 4.5)
      add('tek', 'warning', 'Dolgi tek prenaporen', `TE ${fmt(te, 1)} — dolgi tek bi moral biti TE 3–4`, { te })
    else if (tipTreninga === 'intervals' && te < 3)
      add('tek', 'info', 'Intervalski trening blag', `TE ${fmt(te, 1)} — za intervale je pričakovan TE 4+`, { te })
  }

  // ─── 5. GLIKOGEN (OH dan prej) ────────────────────────────────────
  const ohVceraj = prehranaVceraj.ogljikovi_hidrati_g || 0
  if (ohVceraj > 0) {
    const ohNaKg = ohVceraj / tezaKg
    if (ohNaKg < 2)
      add('prehrana', 'alarm', 'Kritično nizki glikogen pred tekom', `${Math.round(ohVceraj)}g OH (${fmt(ohNaKg, 1)} g/kg) dan prej — glikogen ni bil napolnjen`, { ohNaKg })
    else if (ohNaKg < 3)
      add('prehrana', 'warning', 'Nizke glikogenske rezerve', `${Math.round(ohVceraj)}g OH (${fmt(ohNaKg, 1)} g/kg) dan prej — pod optimumom`, { ohNaKg })
    else if (ohNaKg >= 5 && (tipTreninga === 'long' || tipTreninga === 'intervals'))
      add('prehrana', 'info', 'Dobre glikogenske rezerve', `${Math.round(ohVceraj)}g OH (${fmt(ohNaKg, 1)} g/kg) — dobro napolnjen pred zahtevnim tekom`, { ohNaKg })
  }

  // ─── 6. KALORIJSKI DEFICIT ────────────────────────────────────────
  const metVceraj = metrike.find(m => m.datum === danPred) || {}
  const workoutKcalVceraj = workouts
    .filter(w => w.datum === danPred)
    .reduce((s, w) => s + (w.kalorije || 0), 0)
  const porabljeneVceraj = metVceraj.skupaj_kcal || ((metVceraj.bmr_kcal || izracunajBMR(tezaKg)) + workoutKcalVceraj)
  if (prehranaVceraj.kalorije_skupaj) {
    const deficit = Math.round(prehranaVceraj.kalorije_skupaj - porabljeneVceraj)
    if (deficit < -700)
      add('prehrana', 'alarm', 'Velik deficit dan pred tekom', `${Math.abs(deficit)} kcal deficit — energija bo nizka`, { deficit })
    else if (deficit < -400)
      add('prehrana', 'warning', 'Kalorijski deficit pred tekom', `${Math.abs(deficit)} kcal deficit dan pred tekom`, { deficit })
  }

  // ─── 7. BELJAKOVINE ───────────────────────────────────────────────
  if (prehranaVceraj.beljakovine_g) {
    const beljNaKg = prehranaVceraj.beljakovine_g / tezaKg
    if (beljNaKg < 1.4)
      add('prehrana', 'warning', 'Premalo beljakovin za regeneracijo', `${Math.round(prehranaVceraj.beljakovine_g)}g beljakovin (${fmt(beljNaKg, 1)} g/kg) — optimum 1.6–2.0 g/kg`, { beljNaKg })
  }

  // ─── 8. HRV ───────────────────────────────────────────────────────
  // metrike[0] = najnovejši dan
  const hrv = metrikeDanPred.hrv || metrikeTekDan.hrv
  if (hrv) {
    const hrv7 = avg(metrike.slice(0, 7).map(m => m.hrv))
    if (hrv7) {
      const pad = (hrv7 - hrv) / hrv7
      if (pad > 0.25)
        add('regeneracija', 'alarm', 'HRV kritično nizek', `HRV ${Math.round(hrv)} ms (7d povp. ${Math.round(hrv7)} ms) — padec ${Math.round(pad * 100)}%`, { hrv, hrv7, pad })
      else if (pad > 0.15)
        add('regeneracija', 'warning', 'HRV znižan', `HRV ${Math.round(hrv)} ms vs 7d povp. ${Math.round(hrv7)} ms (−${Math.round(pad * 100)}%)`, { hrv, hrv7, pad })
      else if (pad < -0.10)
        add('regeneracija', 'info', 'HRV nadpovprečen', `HRV ${Math.round(hrv)} ms — ${Math.round(Math.abs(pad) * 100)}% nad 7d povp. — odlična regeneracija`, { hrv, hrv7 })
    }

    // Downtrend: metrike[0]=newest → hrv[i] < hrv[i+1] pomeni padajoč trend v času
    const hrv5 = metrike.slice(0, 5).map(m => m.hrv).filter(Boolean)
    if (hrv5.length >= 4) {
      let padajoc = true
      for (let i = 0; i < hrv5.length - 1; i++) {
        if (hrv5[i] >= hrv5[i + 1]) { padajoc = false; break }
      }
      if (padajoc)
        add('regeneracija', 'warning', 'HRV pada 5 dni zapored',
          `${[...hrv5].reverse().map(v => Math.round(v)).join(' → ')} ms — možna kronična utrujenost`, { hrv5 })
    }
  }

  // ─── 9. RESTING HR TREND ──────────────────────────────────────────
  const rhr5 = metrike.slice(0, 5).map(m => m.resting_hr).filter(Boolean)
  if (rhr5.length >= 4) {
    // rhr5[0]=newest, rhr5[last]=oldest
    const rhrNew = rhr5[0]
    const rhrOld = rhr5[rhr5.length - 1]
    const delta = rhrNew - rhrOld
    if (delta >= 5)
      add('regeneracija', 'warning', 'Resting HR narašča', `RHR +${delta} bpm v 5 dneh (${rhrOld}→${rhrNew} bpm) — možna preutrujenost ali bolezen`, { rhrOld, rhrNew, delta })
    else if (delta <= -5)
      add('regeneracija', 'info', 'Resting HR pada', `RHR −${Math.abs(delta)} bpm v 5 dneh (${rhrOld}→${rhrNew} bpm) — regeneracija napreduje`, { rhrOld, rhrNew, delta })
  }

  // ─── 10. SPANJE ───────────────────────────────────────────────────
  const spanje = metrikeDanPred.spanje_h
  if (spanje) {
    const { atl } = izracunajLoad(workouts)
    if (spanje < 6 && atl > 100)
      add('regeneracija', 'alarm', 'Kritično malo spanja pri visoki obremenitvi', `${spanje}h spanja ob ATL ${atl} — visok rizik preobremenitve`, { spanje, atl })
    else if (spanje < 6.5)
      add('regeneracija', 'warning', 'Premalo spanja', `${spanje}h spanja — pod minimumom za regeneracijo`, { spanje })
    else if (spanje < 7)
      add('regeneracija', 'info', 'Spanje pod optimumom', `${spanje}h — priporoča se 7–9h za maratonske priprave`, { spanje })
  }

  // ─── 11. STRES + SPANJE KOMBINACIJA ──────────────────────────────
  const stres = metrikeDanPred.stres_povprecje
  if (stres && spanje && stres > 65 && spanje < 6.5)
    add('regeneracija', 'alarm', 'Visok stres + malo spanja',
      `Stres ${Math.round(stres)} + ${spanje}h spanja — regeneracija kritična`, { stres, spanje })

  // ─── 12. ATL/CTL ──────────────────────────────────────────────────
  const { atl, ctl, razmerje } = izracunajLoad(workouts)
  if (razmerje != null) {
    if (razmerje > 1.5)
      add('load', 'alarm', 'Preobremenitev', `ATL/CTL = ${razmerje.toFixed(2)} — nevarnost poškodbe`, { razmerje, atl, ctl })
    else if (razmerje > 1.3)
      add('load', 'warning', 'Visoka trenažna obremenitev', `ATL/CTL = ${razmerje.toFixed(2)} — pazi na znake utrujenosti`, { razmerje, atl, ctl })
    else if (razmerje < 0.6)
      add('load', 'info', 'Nizka obremenitev', `ATL/CTL = ${razmerje.toFixed(2)} — dobro za regeneracijo`, { razmerje, atl, ctl })
  }

  // ─── 13. TEDENSKI KM SKOK ─────────────────────────────────────────
  const tekDay = new Date(tekDatum)
  const monThis = new Date(tekDay)
  monThis.setDate(tekDay.getDate() - ((tekDay.getDay() + 6) % 7))
  const monLast = new Date(monThis)
  monLast.setDate(monLast.getDate() - 7)
  const monThisStr = monThis.toISOString().slice(0, 10)
  const monLastStr = monLast.toISOString().slice(0, 10)

  const thisWeekKm = workouts
    .filter(w => isTek(w) && w.datum >= monThisStr && w.datum <= tekDatum)
    .reduce((s, w) => s + (w.razdalja_km || 0), 0)
  const lastWeekKm = workouts
    .filter(w => isTek(w) && w.datum >= monLastStr && w.datum < monThisStr)
    .reduce((s, w) => s + (w.razdalja_km || 0), 0)

  if (lastWeekKm > 5 && thisWeekKm > 5) {
    const pct = (thisWeekKm - lastWeekKm) / lastWeekKm
    if (pct > 0.20)
      add('load', 'warning', 'Velik tedenski km skok',
        `${fmt(lastWeekKm, 1)} → ${fmt(thisWeekKm, 1)} km (+${Math.round(pct * 100)}%) — priporoča se max +10%/teden`,
        { pct, thisWeekKm, lastWeekKm })
  }

  // ─── 14. PRIMERJAVA ISTEGA TIPA ───────────────────────────────────
  const label = TIP_LABEL[tipTreninga] || 'tekov'

  if (istiTip.length >= 2) {
    // HR učinkovitost: tempo_sec / avg_hr — nižje = boljše
    const currentEff = hrEff(zadnjiTek)
    const prevEffs = istiTip.slice(0, 5).map(hrEff).filter(Boolean)
    if (currentEff && prevEffs.length >= 2) {
      const avgPrev = avg(prevEffs)
      if (avgPrev) {
        const delta = (avgPrev - currentEff) / avgPrev
        if (delta > 0.05)
          add('primerjava', 'info', `HR učinkovitost boljša (vs ${istiTip.length} ${label})`,
            `${Math.round(delta * 100)}% boljša — pri enakem HR tečeš hitreje`, { delta, currentEff, avgPrev })
        else if (delta < -0.05)
          add('primerjava', 'warning', `HR učinkovitost slabša (vs ${istiTip.length} ${label})`,
            `${Math.round(Math.abs(delta) * 100)}% slabša od povprečja — utrujenost ali vreme?`, { delta, currentEff, avgPrev })
        else
          add('primerjava', 'info', `HR učinkovitost podobna (vs ${istiTip.length} ${label})`,
            `Konzistentna forma (${Math.round(Math.abs(delta) * 100)}% razlika)`, { delta })
      }
    }

    // Povprečni HR pri podobni razdalji
    const soDalsinsko = istiTip.filter(w => Math.abs((w.razdalja_km || 0) - (zadnjiTek.razdalja_km || 0)) <= 2)
    if (soDalsinsko.length >= 2 && zadnjiTek.povprecni_hr) {
      const avgHrPrej = avg(soDalsinsko.slice(0, 4).map(w => w.povprecni_hr))
      if (avgHrPrej) {
        const hrDelta = zadnjiTek.povprecni_hr - avgHrPrej
        if (hrDelta < -5)
          add('primerjava', 'info', `Nižji HR pri enaki razdalji (vs ${soDalsinsko.length} ${label})`,
            `${Math.round(Math.abs(hrDelta))} bpm manj pri ${fmt(zadnjiTek.razdalja_km, 1)} km — boljša srčna ekonomičnost`, { hrDelta, avgHrPrej })
        else if (hrDelta > 5)
          add('primerjava', 'warning', `Višji HR pri enaki razdalji (vs ${soDalsinsko.length} ${label})`,
            `${Math.round(hrDelta)} bpm več od povprečja pri ${fmt(zadnjiTek.razdalja_km, 1)} km — utrujenost ali vreme?`, { hrDelta, avgHrPrej })
      }
    }

    // Tempo primerjava pri podobni razdalji
    const tempoTeki = istiTip.filter(
      w => Math.abs((w.razdalja_km || 0) - (zadnjiTek.razdalja_km || 0)) <= 2 && w.povprecni_tempo
    )
    const currTempoSec = tempoStrToSec(zadnjiTek.povprecni_tempo)
    if (tempoTeki.length >= 2 && currTempoSec) {
      const avgTempoPrej = avg(tempoTeki.slice(0, 4).map(w => tempoStrToSec(w.povprecni_tempo)))
      if (avgTempoPrej && Math.abs(currTempoSec - avgTempoPrej) > 10) {
        const tempoDelta = currTempoSec - avgTempoPrej
        add('primerjava', 'info',
          `Tempo ${tempoDelta < 0 ? 'hitrejši' : 'počasnejši'} (vs ${tempoTeki.length} ${label})`,
          `${secToTempoStr(Math.round(currTempoSec))} vs povp. ${secToTempoStr(Math.round(avgTempoPrej))} /km (${Math.abs(Math.round(tempoDelta))}s/km)`,
          { tempoDelta, currTempoSec, avgTempoPrej })
      }
    }

    // Povzetk primerjave — splošni kontekst
    const avgHrVsi = avg(istiTip.map(w => w.povprecni_hr))
    const avgKmVsi = avg(istiTip.map(w => w.razdalja_km))
    if (avgHrVsi && avgKmVsi) {
      add('primerjava', 'info', `Kontekst: ${istiTip.length} ${label} v bazi`,
        `Povp. ${fmt(avgKmVsi, 1)} km pri ${Math.round(avgHrVsi)} bpm povprečno`, {})
    }

  } else {
    add('primerjava', 'info', `Premalo podatkov za primerjavo`,
      `Samo ${istiTip.length} prejšnji ${label} tega tipa — primerjava bo dostopna po 2+ tekih`, {})
  }

  return findings
}
