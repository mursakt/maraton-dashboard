import React from 'react'
import { PLAN, PLAN_TRENINGI, TODAY_STR, YESTERDAY_STR } from '../constants/plan'
import { izracunajLoad, izracunajPripravljenost } from '../utils/calculations'
import { isTek, fmt, formaColor, formaLabel, pripravljenostColor, pripravljenostLabel, hrZona, hrZonaColor } from '../utils/helpers'
import { StatCard } from './StatCard'
import { AlarmiPanel } from './AlarmiPanel'

function MacroBar({ label, value, goal, color = '#3b82f6' }) {
  const v = value || 0
  const pct = goal > 0 ? v / goal : 0
  const over = pct > 1
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.5px' }}>{label}</span>
        <span style={{ fontSize: 11, fontFamily: 'DM Mono', color: v > 0 ? '#94a3b8' : '#475569' }}>
          {v > 0 ? `${Math.round(v)} / ${Math.round(goal)}g` : `— / ${Math.round(goal)}g`}
        </span>
      </div>
      <div style={{ height: 5, borderRadius: 3, background: '#1e2433', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${Math.min(pct * 100, 100)}%`,
          background: over ? '#f97316' : color,
          borderRadius: 3,
          transition: 'width .3s',
        }} />
      </div>
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
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '9px 0',
      borderBottom: last ? 'none' : '1px solid #0f172a',
    }}>
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

export function TabPregled({ workouts, metrike, prehrana, laps, prehranaCilji = [], currentTeden, formaScore, predikcija }) {
  const planTeden = PLAN.find(p => p.teden === currentTeden)
  const tedStart = planTeden ? new Date(planTeden.datum) : new Date()
  const tedEnd = new Date(tedStart); tedEnd.setDate(tedEnd.getDate() + 7)

  // Km ta teden
  const kmTaTeden = workouts
    .filter(w => { const d = new Date(w.datum); return d >= tedStart && d < tedEnd && isTek(w) })
    .reduce((s, w) => s + (w.razdalja_km || 0), 0)
  const kmPlan = planTeden?.km || 0

  // Load
  const { atl, ctl, razmerje, razmerjeOpis, razmerjeColor } = izracunajLoad(workouts)

  // Pripravljenost
  const pripravljenost = izracunajPripravljenost(metrike, prehrana, workouts)

  // Dni do maratona
  const dniDoMaratona = Math.ceil((new Date('2026-10-17') - new Date()) / (1000 * 60 * 60 * 24))

  // Napoved maratona
  const predCas = predikcija?.casFinal
  const predStr = predCas
    ? `${Math.floor(predCas / 3600)}:${String(Math.floor((predCas % 3600) / 60)).padStart(2, '0')}:${String(Math.floor(predCas % 60)).padStart(2, '0')}`
    : null
  const predVsCilj = predCas ? Math.round((predCas - 13500) / 60) : null
  const predColor = !predCas ? '#6b7280' : predVsCilj <= 0 ? '#22c55e' : predVsCilj <= 10 ? '#eab308' : '#ef4444'

  // Zadnji tek
  const zadnjiTek = workouts.find(w => isTek(w))

  // Naslednji trening iz plana
  const naslednji = PLAN_TRENINGI.find(p => p.datum > TODAY_STR)

  // Metrike - pomožne funkcije
  const m7avg = (key) => {
    const vals = metrike.slice(0, 7).map(m => m[key]).filter(x => x != null && x > 0)
    return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null
  }
  const zadnjeM = metrike[0] || {}

  // HRV
  const hrv3avg = (() => {
    const v = metrike.slice(0, 3).map(m => m.hrv).filter(x => x > 0)
    return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null
  })()
  const hrv7avg = m7avg('hrv')
  const hrvDelta = hrv3avg && hrv7avg ? hrv3avg - hrv7avg : null

  // Resting HR
  const rhrKey = m => m.hr_pocivaj || m.resting_hr
  const rhr3avg = (() => {
    const v = metrike.slice(0, 3).map(rhrKey).filter(x => x > 0)
    return v.length ? Math.round(v.reduce((s, x) => s + x, 0) / v.length) : null
  })()
  const rhr7avg = (() => {
    const v = metrike.slice(0, 7).map(rhrKey).filter(x => x > 0)
    return v.length ? Math.round(v.reduce((s, x) => s + x, 0) / v.length) : null
  })()

  // Spanje
  const spanje7avg = m7avg('spanje_h')

  // Teža
  const zadnjaTeza = metrike.find(m => m.teza_kg)?.teza_kg
  const tezaPrej7 = metrike.slice(5, 14).find(m => m.teza_kg)?.teza_kg
  const tezaDelta = zadnjaTeza && tezaPrej7 ? zadnjaTeza - tezaPrej7 : null

  // Prehrana - zadnji dan z MFP podatki
  const zadnjiMfpDatum = prehrana
    .filter(p => p.kalorije_skupaj > 0 && p.datum < TODAY_STR)
    .sort((a, b) => b.datum.localeCompare(a.datum))[0]?.datum || YESTERDAY_STR
  const vP = prehrana.find(p => p.datum === zadnjiMfpDatum) || {}
  const vM = metrike.find(m => m.datum === zadnjiMfpDatum) || {}
  const vW = workouts.filter(w => w.datum === zadnjiMfpDatum)
  const trainKcal = vW.reduce((s, w) => s + (w.kalorije || 0), 0)
  const skupajPorabljene = vM.skupaj_kcal || ((vM.bmr_kcal || 1946) + trainKcal)
  const zauziteKcal = vP.kalorije_skupaj || 0
  const deficit = zauziteKcal - skupajPorabljene

  // 7-dnevni povp. neto deficit
  const z7 = prehrana.filter(p => p.kalorije_skupaj > 0).slice(0, 7)
  const avgDeficit7 = z7.length > 0 ? Math.round(z7.reduce((s, p) => {
    const wKcal = workouts.filter(w2 => w2.datum === p.datum).reduce((s2, w2) => s2 + (w2.kalorije || 0), 0)
    const mD = metrike.find(m2 => m2.datum === p.datum) || {}
    return s + p.kalorije_skupaj - (mD.skupaj_kcal || ((mD.bmr_kcal || 1946) + wKcal))
  }, 0) / z7.length) : null

  // Cilji za makre (iz prehranaCilji ali vP)
  const cZ = prehranaCilji.find(c => c.datum === zadnjiMfpDatum) || prehranaCilji[0] || {}
  const ciljBelj = cZ.cilj_belj_g || vP.cilj_belj_g || 175
  const ciljOH = cZ.cilj_oh_g || vP.cilj_oh_g || 196
  const ciljMasc = cZ.cilj_masc_g || vP.cilj_masc_g || 62

  // Koraki
  const koraki = zadnjeM.koraki > 0 ? Math.round(zadnjeM.koraki) : null

  return (<>
    <AlarmiPanel workouts={workouts} metrike={metrike} prehrana={prehrana} predikcija={predikcija} />

    {/* ── ROW 1: KLJUČNE METRIKE ─── */}
    <div className="grid5" style={{ marginBottom: 12 }}>
      <div className="card">
        <h3>Pripravljenost</h3>
        <div><span className="stat-val" style={{ color: pripravljenostColor(pripravljenost) }}>{pripravljenost ? `${pripravljenost}%` : '—'}</span></div>
        <div className="stat-sub" style={{ color: pripravljenostColor(pripravljenost) }}>{pripravljenostLabel(pripravljenost)}</div>
      </div>

      <div className="card">
        <h3>Forma danes</h3>
        <div><span className="stat-val" style={{ color: formaColor(formaScore) }}>{formaScore ? fmt(formaScore) : '—'}</span></div>
        <div className="stat-sub" style={{ color: formaColor(formaScore) }}>{formaLabel(formaScore)}</div>
      </div>

      <div className="card">
        <h3>Napoved maratona</h3>
        <div>
          <span className="stat-val" style={{ color: predColor, fontSize: 28, letterSpacing: '-1px' }}>{predStr || '—'}</span>
        </div>
        <div className="stat-sub" style={{ color: predColor }}>
          {predVsCilj != null
            ? (predVsCilj <= 0 ? `${Math.abs(predVsCilj)} min pod 3:45` : `+${predVsCilj} min nad 3:45`)
            : 'cilj: 3:45:00'}
        </div>
      </div>

      <StatCard
        title="Km ta teden"
        value={fmt(kmTaTeden)}
        unit="km"
        sub={`plan: ${kmPlan} km`}
        color={kmTaTeden >= kmPlan ? '#22c55e' : '#f97316'}
      />

      <StatCard title="Dni do maratona" value={dniDoMaratona} sub="17. oktober 2026" />
    </div>

    {/* ── ROW 2: TRENING + NASLEDNJI TRENING ─── */}
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 12 }}>

      {/* Trening & Load */}
      <div className="card">
        <h3>Trening & obremenitev</h3>

        {/* ATL / CTL / Razmerje */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
          {[
            { lab: 'ATL', val: atl || '—', sub: '7-dnevno', color: '#e2e8f0' },
            { lab: 'CTL', val: ctl || '—', sub: '28-dnevno', color: '#e2e8f0' },
            { lab: 'ATL / CTL', val: razmerje ? fmt(razmerje, 2) : '—', sub: razmerjeOpis, color: razmerjeColor },
          ].map(({ lab, val, sub, color }) => (
            <div key={lab} style={{ textAlign: 'center', padding: '10px 6px', background: '#0f172a', borderRadius: 8 }}>
              <div style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5 }}>{lab}</div>
              <div style={{ fontSize: 24, fontFamily: 'DM Mono', fontWeight: 300, color, lineHeight: 1 }}>{val}</div>
              <div style={{ fontSize: 10, color: lab === 'ATL / CTL' ? color : '#475569', marginTop: 4 }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* Zadnji tek */}
        <div style={{ borderTop: '1px solid #1e2433', paddingTop: 12 }}>
          <div style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10 }}>
            Zadnji tek
            {zadnjiTek && <span style={{ fontFamily: 'DM Mono', color: '#64748b', marginLeft: 8, textTransform: 'none', letterSpacing: 0 }}>{zadnjiTek.datum}</span>}
          </div>
          {zadnjiTek ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                {[
                  { lab: 'Razdalja', val: `${fmt(zadnjiTek.razdalja_km)} km`, color: '#e2e8f0' },
                  { lab: 'Tempo', val: zadnjiTek.povprecni_tempo || '—', color: '#e2e8f0' },
                  { lab: 'Povp. HR', val: zadnjiTek.povprecni_hr ? `${zadnjiTek.povprecni_hr} bpm` : '—', color: hrZonaColor(zadnjiTek.povprecni_hr) },
                  { lab: 'HR Zona', val: hrZona(zadnjiTek.povprecni_hr), color: hrZonaColor(zadnjiTek.povprecni_hr) },
                ].map(({ lab, val, color }) => (
                  <div key={lab}>
                    <div style={{ fontSize: 10, color: '#64748b', marginBottom: 3 }}>{lab}</div>
                    <div style={{ fontSize: 16, fontFamily: 'DM Mono', color }}>{val}</div>
                  </div>
                ))}
              </div>
              {(zadnjiTek.vo2max || zadnjiTek.aerobni_te) && (
                <div style={{ marginTop: 10, fontSize: 11, color: '#475569', fontFamily: 'DM Mono' }}>
                  {zadnjiTek.vo2max ? `VO2max ${fmt(zadnjiTek.vo2max, 1)} ml/kg/min` : ''}
                  {zadnjiTek.vo2max && zadnjiTek.aerobni_te ? ' · ' : ''}
                  {zadnjiTek.aerobni_te ? `Trening. efekt ${zadnjiTek.aerobni_te.toFixed(1)}` : ''}
                </div>
              )}
            </>
          ) : (
            <div style={{ color: '#475569', fontSize: 12 }}>Ni tekov v bazi</div>
          )}
        </div>
      </div>

      {/* Naslednji trening */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
        <h3>Naslednji trening</h3>
        {naslednji ? (
          <>
            <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'DM Mono', marginBottom: 6 }}>{naslednji.datum}</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#e2e8f0', marginBottom: 6 }}>{naslednji.naziv}</div>
            <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.65, marginBottom: 12, flex: 1 }}>{naslednji.opis}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, borderTop: '1px solid #1e2433', paddingTop: 10 }}>
              {[
                ['Razdalja', `${naslednji.km} km`],
                ['Ciljni tempo', `${naslednji.tempo}/km`],
                ['HR', naslednji.hr || '—'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, color: '#64748b' }}>{k}</span>
                  <span style={{ fontSize: 11, fontFamily: 'DM Mono', color: '#94a3b8' }}>{v}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="empty" style={{ padding: 24 }}>Ni načrtovanih treningov</div>
        )}
      </div>
    </div>

    {/* ── ROW 3: PREHRANA + TELO ─── */}
    <div className="grid2">

      {/* Prehrana & Makri */}
      <div className="card">
        <h3>
          Prehrana
          <span style={{ fontSize: 10, color: '#475569', fontFamily: 'DM Mono', fontWeight: 400, textTransform: 'none', letterSpacing: 0, marginLeft: 8 }}>
            {zadnjiMfpDatum}
          </span>
        </h3>

        {/* Kcal balance */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 3 }}>Zaužite</div>
            <div style={{ fontSize: 26, fontFamily: 'DM Mono', fontWeight: 300 }}>
              {zauziteKcal || '—'}
              <span style={{ fontSize: 12, color: '#64748b', marginLeft: 4 }}>kcal</span>
            </div>
          </div>
          <div style={{ fontSize: 14, color: '#334155', paddingBottom: 5 }}>vs</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 3 }}>Porabljene</div>
            <div style={{ fontSize: 26, fontFamily: 'DM Mono', fontWeight: 300 }}>
              {skupajPorabljene}
              <span style={{ fontSize: 12, color: '#64748b', marginLeft: 4 }}>kcal</span>
            </div>
          </div>
        </div>

        {zauziteKcal > 0 && (
          <div style={{
            padding: '7px 12px', borderRadius: 6,
            background: deficit > 0 ? '#052e1620' : '#45180320',
            border: `1px solid ${deficit > 0 ? '#14532d' : '#78350f'}`,
            marginBottom: 14,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontFamily: 'DM Mono', fontSize: 13, fontWeight: 500, color: deficit > 0 ? '#86efac' : '#fcd34d' }}>
              {deficit > 0 ? '+' : ''}{Math.round(deficit)} kcal {deficit > 0 ? 'suficit' : 'deficit'}
            </span>
            {avgDeficit7 !== null && (
              <span style={{ fontSize: 10, color: '#64748b', fontFamily: 'DM Mono' }}>
                7d: {avgDeficit7 > 0 ? '+' : ''}{avgDeficit7} kcal/dan
              </span>
            )}
          </div>
        )}

        <div style={{ borderTop: '1px solid #1e2433', paddingTop: 12 }}>
          <MacroBar label="Beljakovine" value={vP.beljakovine_g} goal={ciljBelj} color="#a78bfa" />
          <MacroBar label="Ogljikovi hidrati" value={vP.ogljikovi_hidrati_g} goal={ciljOH} color="#3b82f6" />
          <MacroBar label="Maščobe" value={vP.masc_g} goal={ciljMasc} color="#f59e0b" />
        </div>
      </div>

      {/* Telo & Regeneracija */}
      <div className="card">
        <h3>Telo & regeneracija</h3>
        <MetrikaRow
          label="Teža"
          value={zadnjaTeza ? `${fmt(zadnjaTeza)} kg` : '—'}
          sub={planTeden ? `cilj: ${planTeden.ciljnaKg} kg` : ''}
          delta={tezaDelta}
          deltaReverse={true}
        />
        <MetrikaRow
          label="HRV"
          value={hrv3avg ? `${Math.round(hrv3avg)} ms` : (zadnjeM.hrv ? `${Math.round(zadnjeM.hrv)} ms` : '—')}
          sub={hrv7avg ? `7d povp: ${Math.round(hrv7avg)} ms` : ''}
          delta={hrvDelta}
        />
        <MetrikaRow
          label="Spanje"
          value={zadnjeM.spanje_h ? `${fmt(zadnjeM.spanje_h, 1)} h` : '—'}
          sub={spanje7avg ? `7d povp: ${fmt(spanje7avg, 1)} h` : ''}
          delta={null}
        />
        <MetrikaRow
          label="HR počitek"
          value={rhr3avg ? `${rhr3avg} bpm` : '—'}
          sub={rhr7avg ? `7d povp: ${rhr7avg} bpm` : ''}
          delta={rhr3avg && rhr7avg ? rhr3avg - rhr7avg : null}
          deltaReverse={true}
        />
        <MetrikaRow
          label="Stres"
          value={zadnjeM.stres_povprecje ? `${Math.round(zadnjeM.stres_povprecje)} / 100` : '—'}
          sub={''}
          delta={null}
          last={!koraki}
        />
        {koraki && (
          <MetrikaRow
            label="Koraki"
            value={koraki >= 1000 ? `${(koraki / 1000).toFixed(1)}k` : String(koraki)}
            sub={''}
            delta={null}
            last={true}
          />
        )}
      </div>
    </div>
  </>)
}
