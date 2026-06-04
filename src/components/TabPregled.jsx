import React from 'react'
import { PLAN, PLAN_TRENINGI, TODAY_STR, YESTERDAY_STR, RACE_DATE } from '../constants/plan'
import { izracunajLoad, izracunajPripravljenost } from '../utils/calculations'
import { isTek, fmt, formaLabel, pripravljenostColor, pripravljenostLabel, hrZonaColor, izracunajBMR } from '../utils/helpers'
import { AlarmiPanel } from './AlarmiPanel'

const fmtCas = (s) => s ? `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}` : null

// ── DANES verdikt: zmeša pripravljenost + plan + HRV/RHR/load trend v eno priporočilo ──
function izracunajVerdikt({ pripravljenost, razmerje, hrvPadecPct, rhrPorast, planiran, jeDanes }) {
  const opis = (planiran?.opis || '').toLowerCase()
  let tip = 'lahek'
  if (/interval|tempo|fartlek|ponav|prag|vo2|hitr/.test(opis)) tip = 'kakovost'
  else if (/dolg/.test(opis)) tip = 'dolgi'

  // Najslabši signal določa nivo
  const razlogi = []
  let nivo = 'green'
  const flag = (cond, txt, lvl) => { if (cond) { razlogi.push(txt); if (lvl === 'red' || nivo === 'green') nivo = lvl } }
  // rdeče
  if (pripravljenost != null && pripravljenost < 45) flag(true, `pripravljenost ${pripravljenost}%`, 'red')
  if (hrvPadecPct != null && hrvPadecPct > 15) flag(true, `HRV pada −${Math.round(hrvPadecPct)}%`, 'red')
  if (rhrPorast != null && rhrPorast > 5) flag(true, `HR počitka +${Math.round(rhrPorast)} bpm`, 'red')
  if (razmerje != null && razmerje > 1.5) flag(true, `ATL/CTL ${razmerje.toFixed(2)}`, 'red')
  // rumeno (samo če še ni rdeče)
  if (nivo !== 'red') {
    if (pripravljenost != null && pripravljenost < 60) flag(true, `pripravljenost ${pripravljenost}%`, 'caution')
    if (hrvPadecPct != null && hrvPadecPct > 8) flag(true, `HRV −${Math.round(hrvPadecPct)}%`, 'caution')
    if (rhrPorast != null && rhrPorast > 3) flag(true, `HR počitka +${Math.round(rhrPorast)} bpm`, 'caution')
    if (razmerje != null && razmerje > 1.3) flag(true, `ATL/CTL ${razmerje.toFixed(2)}`, 'caution')
  }

  const datumTxt = planiran ? (jeDanes ? 'danes' : `naslednji (${planiran.datum})`) : null
  const planTxt = planiran ? `${planiran.opis} @ ${planiran.tempo}/km` : null

  // Ni načrtovanega treninga = prost dan
  if (!planiran) {
    if (nivo === 'red') return { nivo: 'red', ikona: '🔴', naslov: 'POČITEK', razlog: razlogi.length ? razlogi.join(' · ') + ' → telo potrebuje regeneracijo' : 'telo potrebuje regeneracijo' }
    return { nivo: 'green', ikona: '🟢', naslov: 'PROST DAN', razlog: 'po planu ni treninga — lahka hoja ali počitek', plan: null }
  }

  if (pripravljenost == null) {
    return { nivo: 'neutral', ikona: '⚪', naslov: planiran.opis.toUpperCase(), razlog: `${datumTxt} · ni dovolj podatkov za prilagoditev`, plan: planTxt }
  }

  if (nivo === 'red') {
    return { nivo: 'red', ikona: '🔴', naslov: 'POČITEK / 20–30 min hoja', razlog: `${razlogi.join(' · ')} → izpusti ${planiran.naziv}`, plan: planTxt }
  }
  if (nivo === 'caution') {
    if (tip === 'kakovost' || tip === 'dolgi') {
      return { nivo: 'caution', ikona: '🟡', naslov: `LAHEK TEK ${planiran.km} km @ 6:15`, razlog: `${razlogi.join(' · ')} → znižaj intenzivnost, prestavi ${planiran.naziv}`, plan: planTxt }
    }
    return { nivo: 'caution', ikona: '🟡', naslov: `${planiran.opis.toUpperCase()} @ ${planiran.tempo}`, razlog: `${razlogi.join(' · ')} → izvedi previdno`, plan: planTxt }
  }
  // green
  return { nivo: 'green', ikona: '🟢', naslov: `${planiran.opis.toUpperCase()} @ ${planiran.tempo}`, razlog: `telo pripravljeno (pripravljenost ${pripravljenost}%) → izvedi ${planiran.naziv} po planu`, plan: planTxt }
}

const VERDIKT_BARVA = {
  green: { brd: '#14532d', bg: '#04140b', txt: '#86efac' },
  caution: { brd: '#78350f', bg: '#1a1200', txt: '#fcd34d' },
  red: { brd: '#7f1d1d', bg: '#1a0606', txt: '#fca5a5' },
  neutral: { brd: '#1e2433', bg: '#0b1220', txt: '#94a3b8' },
}

function KpiCard({ naslov, glavna, glavnaColor = '#e2e8f0', sub, subColor = '#64748b', trend }) {
  return (
    <div className="card">
      <h3>{naslov}</h3>
      <div><span className="stat-val" style={{ color: glavnaColor }}>{glavna}</span></div>
      {sub && <div className="stat-sub" style={{ color: subColor }}>{sub}</div>}
      {trend && <div style={{ fontSize: 11, color: trend.color, fontFamily: 'DM Mono', marginTop: 4 }}>{trend.txt}</div>}
    </div>
  )
}

function MetrikaRow({ label, value, sub, delta, deltaReverse = false, last = false }) {
  let arrowEl = null
  if (delta != null && Math.abs(delta) >= 0.1) {
    const up = delta > 0
    const good = deltaReverse ? !up : up
    const absVal = Math.abs(delta) < 10 ? Math.abs(delta).toFixed(1) : Math.round(Math.abs(delta))
    arrowEl = (
      <span style={{ fontSize: 10, color: good ? '#22c55e' : '#ef4444', marginLeft: 6, fontFamily: 'DM Mono' }}>
        {up ? '▲' : '▼'} {absVal}
      </span>
    )
  }
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: last ? 'none' : '1px solid #0f172a' }}>
      <div>
        <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.4px' }}>{label}</div>
        {sub && <div style={{ fontSize: 10, color: '#475569', marginTop: 1, fontFamily: 'DM Mono' }}>{sub}</div>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <span style={{ fontSize: 15, fontFamily: 'DM Mono', color: '#e2e8f0' }}>{value}</span>
        {arrowEl}
      </div>
    </div>
  )
}

function CardLink({ children, onClick }) {
  return (
    <span onClick={onClick} style={{ fontSize: 11, color: '#475569', fontFamily: 'DM Mono', cursor: 'pointer', textTransform: 'none', letterSpacing: 0, float: 'right', fontWeight: 400 }}
      onMouseEnter={e => e.currentTarget.style.color = '#94a3b8'} onMouseLeave={e => e.currentTarget.style.color = '#475569'}>
      {children} →
    </span>
  )
}

export function TabPregled({ workouts, metrike, prehrana, laps, prehranaCilji = [], currentTeden, formaScore, predikcija, onNavigate = () => {} }) {
  const planTeden = PLAN.find(p => p.teden === currentTeden)
  const tedStart = planTeden ? new Date(planTeden.datum) : new Date()
  const tedEnd = new Date(tedStart); tedEnd.setDate(tedEnd.getDate() + 7)

  // Km ta teden
  const kmTaTeden = workouts.filter(w => { const d = new Date(w.datum); return d >= tedStart && d < tedEnd && isTek(w) }).reduce((s, w) => s + (w.razdalja_km || 0), 0)
  const kmPlan = planTeden?.km || 0

  // Load + pripravljenost
  const { atl, ctl, razmerje, razmerjeOpis, razmerjeColor } = izracunajLoad(workouts)
  const pripravljenost = izracunajPripravljenost(metrike, prehrana, workouts)
  const dniDoMaratona = Math.ceil((new Date(RACE_DATE) - new Date()) / (1000 * 60 * 60 * 24))

  // ── Napoved + trend ───────────────────────────────
  const predCas = predikcija?.casFinal
  const predStr = fmtCas(predCas)
  const predVsCilj = predCas ? Math.round((predCas - 13500) / 60) : null
  const predColor = !predCas ? '#6b7280' : predVsCilj <= 0 ? '#22c55e' : predVsCilj <= 10 ? '#eab308' : '#ef4444'
  const trendSec = predikcija?.trend
  const napovedTrend = trendSec == null ? null
    : trendSec > 30 ? { txt: `↗ napreduješ (${Math.abs(Math.round(trendSec / 60))} min hitreje)`, color: '#22c55e' }
    : trendSec < -30 ? { txt: `↘ nazaduješ (${Math.abs(Math.round(trendSec / 60))} min počasneje)`, color: '#ef4444' }
    : { txt: '→ stabilno', color: '#64748b' }
  const tekmaStr = fmtCas(predikcija?.casTekma)

  // ── Metrike trendi ───────────────────────────────
  const avgN = (arr, key, n) => { const v = arr.slice(0, n).map(m => typeof key === 'function' ? key(m) : m[key]).filter(x => x > 0); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null }
  const zadnjeM = metrike[0] || {}
  const hrv3 = avgN(metrike, 'hrv', 3)
  const hrv7 = avgN(metrike, 'hrv', 7)
  const hrv10 = avgN(metrike, 'hrv', 10)
  const hrvPadecPct = hrv3 && hrv10 ? (hrv10 - hrv3) / hrv10 * 100 : null
  const hrvTrend = hrvPadecPct == null ? null
    : hrvPadecPct > 4 ? { txt: `HRV ↘ −${Math.round(hrvPadecPct)}%`, color: '#ef4444' }
    : hrvPadecPct < -4 ? { txt: `HRV ↗ +${Math.round(-hrvPadecPct)}%`, color: '#22c55e' }
    : { txt: 'HRV → stabilen', color: '#64748b' }
  const rhrKey = m => m.hr_pocivaj || m.resting_hr
  const rhr3 = avgN(metrike, rhrKey, 3)
  const rhr7 = avgN(metrike, rhrKey, 7)
  const rhrPorast = rhr3 && rhr7 ? rhr3 - rhr7 : null
  const spanje7 = avgN(metrike, 'spanje_h', 7)
  const stres7 = avgN(metrike, 'stres_povprecje', 7)

  // Teža trend
  const zadnjaTeza = metrike.find(m => m.teza_kg)?.teza_kg
  const tezaPrej7 = metrike.slice(5, 14).find(m => m.teza_kg)?.teza_kg
  const tezaDelta = zadnjaTeza && tezaPrej7 ? zadnjaTeza - tezaPrej7 : null

  // ── Verdikt ───────────────────────────────
  const planiranDanes = PLAN_TRENINGI.find(p => p.datum === TODAY_STR)
  const planiranNasl = planiranDanes || PLAN_TRENINGI.find(p => p.datum > TODAY_STR)
  const verdikt = izracunajVerdikt({ pripravljenost, razmerje, hrvPadecPct, rhrPorast: rhrPorast != null ? Math.round(rhrPorast) : null, planiran: planiranNasl, jeDanes: !!planiranDanes })
  const vb = VERDIKT_BARVA[verdikt.nivo]

  // ── Prehrana (zadnji MFP dan) ───────────────────────────────
  const zadnjiMfpDatum = prehrana.filter(p => p.kalorije_skupaj > 0 && p.datum < TODAY_STR).sort((a, b) => b.datum.localeCompare(a.datum))[0]?.datum || YESTERDAY_STR
  const vP = prehrana.find(p => p.datum === zadnjiMfpDatum) || {}
  const vM = metrike.find(m => m.datum === zadnjiMfpDatum) || {}
  const trainKcal = workouts.filter(w => w.datum === zadnjiMfpDatum).reduce((s, w) => s + (w.kalorije || 0), 0)
  const skupajPorabljene = vM.skupaj_kcal || ((vM.bmr_kcal || izracunajBMR(zadnjaTeza)) + trainKcal)
  const zauziteKcal = vP.kalorije_skupaj || 0
  const deficit = zauziteKcal - skupajPorabljene
  const z7 = prehrana.filter(p => p.kalorije_skupaj > 0).slice(0, 7)
  const avgDeficit7 = z7.length > 0 ? Math.round(z7.reduce((s, p) => {
    const wKcal = workouts.filter(w2 => w2.datum === p.datum).reduce((s2, w2) => s2 + (w2.kalorije || 0), 0)
    const mD = metrike.find(m2 => m2.datum === p.datum) || {}
    return s + p.kalorije_skupaj - (mD.skupaj_kcal || ((mD.bmr_kcal || izracunajBMR(zadnjaTeza)) + wKcal))
  }, 0) / z7.length) : null

  // Zadnji tek (kratek povzetek)
  const zadnjiTek = workouts.find(w => isTek(w))

  return (<>
    {/* Alarmi — strnjeno */}
    <AlarmiPanel workouts={workouts} metrike={metrike} prehrana={prehrana} predikcija={predikcija} compact />

    {/* ── DANES VERDIKT ─── */}
    <div style={{ border: `1px solid ${vb.brd}`, background: vb.bg, borderRadius: 10, padding: '14px 18px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ fontSize: 30, lineHeight: 1 }}>{verdikt.ikona}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10, fontFamily: 'DM Mono', color: vb.txt, textTransform: 'uppercase', letterSpacing: '1px', opacity: .7 }}>Danes</span>
          <span style={{ fontSize: 19, fontWeight: 700, color: vb.txt }}>{verdikt.naslov}</span>
        </div>
        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 3, fontFamily: 'DM Mono' }}>{verdikt.razlog}</div>
        {verdikt.plan && verdikt.nivo !== 'green' && (
          <div style={{ fontSize: 11, color: '#475569', marginTop: 2, fontFamily: 'DM Mono' }}>plan: {verdikt.plan}</div>
        )}
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 22, fontFamily: 'DM Mono', fontWeight: 300, color: '#e2e8f0' }}>{dniDoMaratona}</div>
        <div style={{ fontSize: 10, color: '#475569', fontFamily: 'DM Mono' }}>dni do maratona</div>
        <div style={{ fontSize: 10, color: '#475569', fontFamily: 'DM Mono' }}>17.10.2026</div>
      </div>
    </div>

    {/* ── 3 SEVERNICE ─── */}
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
      {/* Napoved */}
      <div className="card">
        <h3>Napoved maratona <CardLink onClick={() => onNavigate('predikcija')}>predikcija</CardLink></h3>
        <div><span className="stat-val" style={{ color: predColor, fontSize: 28, letterSpacing: '-1px' }}>{predStr || '—'}</span></div>
        <div className="stat-sub" style={{ color: predColor }}>
          {predVsCilj != null ? (predVsCilj <= 0 ? `${Math.abs(predVsCilj)} min pod 3:45` : `+${predVsCilj} min nad 3:45`) : 'cilj: 3:45:00'}
        </div>
        <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'DM Mono', marginTop: 4 }}>
          {tekmaStr && <span>tekma ~{tekmaStr.slice(0, 4)}</span>}
          {napovedTrend && <span style={{ color: napovedTrend.color }}>{tekmaStr ? ' · ' : ''}{napovedTrend.txt}</span>}
        </div>
      </div>

      {/* Pripravljenost */}
      <KpiCard
        naslov="Pripravljenost"
        glavna={pripravljenost ? `${pripravljenost}%` : '—'}
        glavnaColor={pripravljenostColor(pripravljenost)}
        sub={pripravljenostLabel(pripravljenost)}
        subColor={pripravljenostColor(pripravljenost)}
        trend={hrvTrend}
      />

      {/* Ta teden */}
      <div className="card">
        <h3>Ta teden <CardLink onClick={() => onNavigate('treningi')}>treningi</CardLink></h3>
        <div><span className="stat-val" style={{ color: kmTaTeden >= kmPlan ? '#22c55e' : '#f97316' }}>{fmt(kmTaTeden)}</span><span className="stat-unit">/ {kmPlan} km</span></div>
        <div className="stat-sub">forma {formaScore ? fmt(formaScore) : '—'} · {formaLabel(formaScore)}</div>
        <div style={{ fontSize: 11, color: razmerjeColor, fontFamily: 'DM Mono', marginTop: 4 }}>
          ATL/CTL {razmerje ? fmt(razmerje, 2) : '—'} · {razmerjeOpis}
        </div>
      </div>
    </div>

    {/* ── POVZETEK: Regeneracija + Energija ─── */}
    <div className="grid2">
      {/* Regeneracija */}
      <div className="card">
        <h3>Regeneracija <CardLink onClick={() => onNavigate('telo')}>telo &amp; HRV</CardLink></h3>
        <MetrikaRow label="HRV" value={hrv3 ? `${Math.round(hrv3)} ms` : '—'} sub={hrv7 ? `7d povp: ${Math.round(hrv7)} ms` : ''} delta={hrv3 && hrv7 ? hrv3 - hrv7 : null} />
        <MetrikaRow label="Spanje" value={zadnjeM.spanje_h ? `${fmt(zadnjeM.spanje_h, 1)} h` : '—'} sub={spanje7 ? `7d povp: ${fmt(spanje7, 1)} h` : ''} />
        <MetrikaRow label="HR počitek" value={rhr3 ? `${Math.round(rhr3)} bpm` : '—'} sub={rhr7 ? `7d povp: ${Math.round(rhr7)} bpm` : ''} delta={rhrPorast} deltaReverse />
        <MetrikaRow label="Stres" value={stres7 ? `${Math.round(stres7)} / 100` : '—'} sub="7d povp." last />
      </div>

      {/* Energija & teža */}
      <div className="card">
        <h3>Energija &amp; teža <CardLink onClick={() => onNavigate('prehrana')}>prehrana</CardLink></h3>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-end', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 2 }}>Zaužite</div>
            <div style={{ fontSize: 22, fontFamily: 'DM Mono', fontWeight: 300 }}>{zauziteKcal || '—'}<span style={{ fontSize: 11, color: '#64748b', marginLeft: 3 }}>kcal</span></div>
          </div>
          <div style={{ fontSize: 13, color: '#334155', paddingBottom: 4 }}>vs</div>
          <div>
            <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 2 }}>Porabljene</div>
            <div style={{ fontSize: 22, fontFamily: 'DM Mono', fontWeight: 300 }}>{skupajPorabljene}<span style={{ fontSize: 11, color: '#64748b', marginLeft: 3 }}>kcal</span></div>
          </div>
          <div style={{ fontSize: 10, color: '#475569', fontFamily: 'DM Mono', paddingBottom: 4, marginLeft: 'auto' }}>{zadnjiMfpDatum}</div>
        </div>
        {zauziteKcal > 0 && (
          <div style={{ padding: '7px 12px', borderRadius: 6, background: deficit > 0 ? '#052e1620' : '#45180320', border: `1px solid ${deficit > 0 ? '#14532d' : '#78350f'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontFamily: 'DM Mono', fontSize: 13, fontWeight: 500, color: deficit > 0 ? '#86efac' : '#fcd34d' }}>
              {deficit > 0 ? '+' : ''}{Math.round(deficit)} kcal {deficit > 0 ? 'suficit' : 'deficit'}
            </span>
            {avgDeficit7 !== null && <span style={{ fontSize: 10, color: '#64748b', fontFamily: 'DM Mono' }}>7d: {avgDeficit7 > 0 ? '+' : ''}{avgDeficit7} kcal/dan</span>}
          </div>
        )}
        <MetrikaRow label="Teža" value={zadnjaTeza ? `${fmt(zadnjaTeza)} kg` : '—'} sub={planTeden ? `cilj T${currentTeden}: ${planTeden.ciljnaKg} kg` : ''} delta={tezaDelta} deltaReverse last />
        {zadnjiTek && (
          <div style={{ fontSize: 11, color: '#475569', fontFamily: 'DM Mono', marginTop: 8, paddingTop: 8, borderTop: '1px solid #0f172a' }}>
            Zadnji tek {zadnjiTek.datum?.slice(5)}: {fmt(zadnjiTek.razdalja_km)} km @ {zadnjiTek.povprecni_tempo || '—'}
            {zadnjiTek.povprecni_hr ? <span style={{ color: hrZonaColor(zadnjiTek.povprecni_hr) }}> · {zadnjiTek.povprecni_hr} bpm</span> : ''}
          </div>
        )}
      </div>
    </div>
  </>)
}
