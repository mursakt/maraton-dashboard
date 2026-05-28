import React from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts'
import { isTek, fmt } from '../utils/helpers'
import { secToHMS, secToTempoStr, tempoStrToSec } from '../utils/tempo'

function diffLabel(sec) {
  const abs = Math.abs(sec)
  const m = Math.floor(abs / 60), s = Math.round(abs % 60)
  return `${m}min ${s > 0 ? s + 's' : ''}`.trim()
}

export function TabPredikcija({ predikcija, workouts, laps = [] }) {
  if (!predikcija) return <div className="empty">Ni dovolj podatkov za predikcijo</div>
  const {
    casFinal, casVo2, casHR, riegelCas, projectedVo2, projectedCasVo2, casTekma,
    zanesljivost, zanesljivostRazlogi, tezaKorekcija, kmKorekcija, prvicKorekcija,
    driftKorekcija, recentDrift,
    trend, tempoNa155, vo2Uporabljen, ewmaVo2, vo2Slope, vo2ChartData,
    maxKm, steviloTekov, zadnjaTeza
  } = predikcija

  const ciljSec = 3 * 3600 + 45 * 60
  const diffDanes = casFinal - ciljSec
  const diffTekma = casTekma ? casTekma - ciljSec : null

  // Aerobna učinkovitost iz lap podatkov (tempo normaliziran na HR 150)
  const aerobaEfektivnost = React.useMemo(() => {
    if (!laps || laps.length === 0) return []
    const actDates = {}
    workouts.filter(w => isTek(w)).forEach(w => { if (w.garmin_activity_id) actDates[w.garmin_activity_id] = w.datum })
    const byAct = {}
    laps.forEach(l => { if (!byAct[l.garmin_activity_id]) byAct[l.garmin_activity_id] = []; byAct[l.garmin_activity_id].push(l) })
    const result = []
    Object.entries(byAct).forEach(([actId, actLaps]) => {
      const datum = actDates[actId]
      if (!datum) return
      const aerobic = actLaps.filter(l => l.povprecni_hr >= 138 && l.povprecni_hr <= 165 && l.povprecni_tempo)
      if (aerobic.length < 2) return
      const avgTempo = aerobic.reduce((s, l) => s + tempoStrToSec(l.povprecni_tempo), 0) / aerobic.length
      const avgHR = aerobic.reduce((s, l) => s + l.povprecni_hr, 0) / aerobic.length
      if (!avgTempo || avgTempo <= 0) return
      const normalized = Math.round(avgTempo + (avgHR - 150) * 3)
      result.push({ datum, tempoSec: normalized, hrAvg: Math.round(avgHR), label: datum.slice(5) })
    })
    result.sort((a, b) => a.datum.localeCompare(b.datum))
    // Add linear trend line
    if (result.length >= 3) {
      const pts = result.map((r, i) => ({ x: i, y: r.tempoSec }))
      const n = pts.length, sX = pts.reduce((s, p) => s + p.x, 0), sY = pts.reduce((s, p) => s + p.y, 0)
      const sXY = pts.reduce((s, p) => s + p.x * p.y, 0), sX2 = pts.reduce((s, p) => s + p.x * p.x, 0)
      const den = n * sX2 - sX * sX
      if (den !== 0) {
        const slope = (n * sXY - sX * sY) / den
        const intercept = (sY - slope * sX) / n
        result.forEach((r, i) => { r.trend = Math.round(intercept + slope * i) })
      }
    }
    return result
  }, [laps, workouts])

  const metodeDanes = [
    casVo2 && { label: 'VO2max EWMA', cas: casVo2, w: '35%', color: '#a78bfa', opis: `${fmt(ewmaVo2, 1)} ml/kg/min (eksponentno uteženo)` },
    casHR && { label: 'HR-tempo WLS', cas: casHR, w: '35%', color: '#3b82f6', opis: 'utežena regresija (trajanje × recency)' },
    { label: 'Riegel (polmaraton)', cas: riegelCas, w: '20%', color: '#22c55e', opis: '1:47:00 → Riegel ekstrapolacija' },
    projectedCasVo2 && { label: 'VO2max projekcija', cas: projectedCasVo2, w: '10%', color: '#f97316', opis: `${fmt(projectedVo2, 1)} ml/kg/min pričakovano 17.10.` },
  ].filter(Boolean)

  return (<>
    {/* Prediction header */}
    <div className="card" style={{ marginBottom: 16, padding: '28px 24px' }}>
      <h3 style={{ textAlign: 'center', marginBottom: 20 }}>Predviden čas — Ljubljana 17.10.2026</h3>
      <div style={{ display: 'flex', gap: 0, justifyContent: 'center' }}>
        {/* Danes */}
        <div style={{ flex: 1, textAlign: 'center', padding: '0 20px', borderRight: casTekma ? '1px solid #1e2433' : 'none' }}>
          <div style={{ fontSize: 11, color: '#475569', fontFamily: 'DM Mono', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Danes</div>
          <div className="pred-main" style={{ fontSize: 36, color: diffDanes <= 0 ? '#22c55e' : Math.abs(diffDanes) <= 600 ? '#eab308' : '#f97316' }}>
            {secToHMS(casFinal)}
          </div>
          <div style={{ marginTop: 8, fontSize: 13 }}>
            {diffDanes <= 0
              ? <span style={{ color: '#22c55e' }}>🎯 {diffLabel(diffDanes)} pod 3:45</span>
              : <span style={{ color: '#f97316' }}>⚠️ {diffLabel(diffDanes)} nad 3:45</span>}
          </div>
          <div style={{ fontSize: 11, color: '#475569', fontFamily: 'DM Mono', marginTop: 4 }}>{secToTempoStr(casFinal / 42.195)}/km</div>
        </div>
        {/* Tekma (projected) */}
        {casTekma && (
          <div style={{ flex: 1, textAlign: 'center', padding: '0 20px' }}>
            <div style={{ fontSize: 11, color: '#475569', fontFamily: 'DM Mono', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>17.10.2026 (projekcija)</div>
            <div className="pred-main" style={{ fontSize: 36, color: diffTekma <= 0 ? '#22c55e' : Math.abs(diffTekma) <= 600 ? '#eab308' : '#f97316' }}>
              {secToHMS(casTekma)}
            </div>
            <div style={{ marginTop: 8, fontSize: 13 }}>
              {diffTekma <= 0
                ? <span style={{ color: '#22c55e' }}>🎯 {diffLabel(diffTekma)} pod 3:45</span>
                : <span style={{ color: '#f97316' }}>⚠️ {diffLabel(diffTekma)} nad 3:45</span>}
            </div>
            <div style={{ fontSize: 11, color: '#475569', fontFamily: 'DM Mono', marginTop: 4 }}>{secToTempoStr(casTekma / 42.195)}/km</div>
          </div>
        )}
      </div>
    </div>

    <div className="grid2" style={{ marginBottom: 16 }}>
      {/* Metode */}
      <div className="card">
        <h3>Metode (ensemble)</h3>
        <div style={{ fontSize: 11, color: '#475569', marginBottom: 10, fontFamily: 'DM Mono' }}>4 metode, utežena vsota</div>
        {metodeDanes.map((m, i) => (
          <div key={i} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: i < metodeDanes.length - 1 ? '1px solid #0a0f1a' : 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: 12, color: m.color, fontFamily: 'DM Mono', fontWeight: 600 }}>{m.label}</span>
              <span style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                <span style={{ fontSize: 13, color: '#e2e8f0', fontFamily: 'DM Mono' }}>{secToHMS(m.cas)}</span>
                <span style={{ fontSize: 10, color: '#334155', fontFamily: 'DM Mono' }}>×{m.w}</span>
              </span>
            </div>
            <div style={{ fontSize: 10, color: '#334155', fontFamily: 'DM Mono', marginTop: 2 }}>{m.opis}</div>
          </div>
        ))}
        <div style={{ borderTop: '1px solid #2d3748', paddingTop: 8 }}>
          {[
            { label: 'Korekcija teža', val: tezaKorekcija, opis: zadnjaTeza ? `${fmt(zadnjaTeza, 1)} kg (baza 97 kg)` : '—' },
            { label: 'Korekcija km/teden', val: kmKorekcija, opis: `max ${fmt(maxKm, 0)} km/teden` },
            { label: 'Srčni drift', val: driftKorekcija, opis: recentDrift !== null ? `${recentDrift > 0 ? '+' : ''}${recentDrift} bpm (zadnji dolgi tek)` : 'ni lap podatkov' },
            { label: 'Buffer (prvi maraton)', val: prvicKorekcija, opis: 'pacing, wall, glikogen, psihika' },
          ].map(({ label, val, opis }, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
              <div>
                <div style={{ fontSize: 11, color: '#475569', fontFamily: 'DM Mono' }}>{label}</div>
                <div style={{ fontSize: 10, color: '#1e3a5f', fontFamily: 'DM Mono' }}>{opis}</div>
              </div>
              <div style={{ fontSize: 11, fontFamily: 'DM Mono', color: val < 0 ? '#22c55e' : val > 0 ? '#f97316' : '#475569', minWidth: 60, textAlign: 'right' }}>
                {val === 0 ? '0' : val < 0 ? `-${secToHMS(Math.abs(val)).slice(1)}` : `+${secToHMS(val).slice(1)}`}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Zanesljivost */}
      <div className="card">
        <h3>Zanesljivost predikcije</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div className="zanesljivost-bar" style={{ flex: 1 }}><div className="zanesljivost-fill" style={{ width: `${zanesljivost}%` }} /></div>
          <span style={{ fontFamily: 'DM Mono', fontSize: 20, fontWeight: 300, color: zanesljivost >= 70 ? '#22c55e' : zanesljivost >= 40 ? '#eab308' : '#f97316' }}>{zanesljivost}%</span>
        </div>
        {zanesljivostRazlogi.map((r, i) => <div key={i} className="razlog-item">· {r}</div>)}
        <div style={{ marginTop: 12, fontSize: 11, color: '#334155', fontFamily: 'DM Mono', borderTop: '1px solid #0a0f1a', paddingTop: 10 }}>
          <div style={{ marginBottom: 4 }}>VO2max EWMA: <span style={{ color: '#94a3b8' }}>{ewmaVo2 ? fmt(ewmaVo2, 1) : '—'} ml/kg/min</span></div>
          {projectedVo2 && <div style={{ marginBottom: 4 }}>VO2max 17.10: <span style={{ color: '#f97316' }}>{fmt(projectedVo2, 1)} ml/kg/min</span></div>}
          {vo2Slope !== null && <div style={{ marginBottom: 4 }}>Napredek: <span style={{ color: vo2Slope > 0 ? '#22c55e' : '#f97316' }}>{vo2Slope > 0 ? '+' : ''}{fmt(vo2Slope * 7, 2)} ml/kg/min / teden</span></div>}
          <div>Tempo pri HR 155: <span style={{ color: '#94a3b8' }}>{tempoNa155 ? secToTempoStr(tempoNa155) + '/km' : '—'}</span></div>
        </div>
      </div>
    </div>

    {/* VO2max trend + projekcija */}
    {vo2ChartData.length > 1 && (
      <div className="card" style={{ marginBottom: 16 }}>
        <h3>VO2max — trend in projekcija do 17.10.2026</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={vo2ChartData} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2433" />
            <XAxis dataKey="datum" tick={{ fontSize: 10, fill: '#475569', fontFamily: 'DM Mono' }} interval="preserveStartEnd" />
            <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: '#475569', fontFamily: 'DM Mono' }} tickFormatter={v => fmt(v, 0)} />
            <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1e2433', borderRadius: 8, fontSize: 12 }}
              formatter={(v, name) => [fmt(v, 1) + ' ml/kg/min', name === 'vo2' ? 'Izmerjeno' : name === 'trend' ? 'Trend' : 'Projekcija 17.10']} />
            <Legend formatter={v => v === 'vo2' ? 'Izmerjeno' : v === 'trend' ? 'Trend (regresija)' : 'Projekcija 17.10'} wrapperStyle={{ fontSize: 11, color: '#475569' }} />
            <Line type="monotone" dataKey="vo2" stroke="#a78bfa" strokeWidth={2} dot={{ r: 4, fill: '#a78bfa' }} connectNulls={false} />
            <Line type="monotone" dataKey="trend" stroke="#334155" strokeWidth={1} strokeDasharray="5 3" dot={false} connectNulls={true} />
            <Line type="monotone" dataKey="projected" stroke="#f97316" strokeWidth={0} dot={{ r: 7, fill: '#f97316', strokeWidth: 2, stroke: '#f97316' }} connectNulls={false} />
          </LineChart>
        </ResponsiveContainer>
        <div style={{ fontSize: 11, color: '#334155', marginTop: 6, fontFamily: 'DM Mono' }}>
          Oranžna pika = pričakovani VO2max na dan tekme · Rast: {vo2Slope > 0 ? '+' : ''}{fmt((vo2Slope || 0) * 7, 2)} ml/kg/min/teden
        </div>
      </div>
    )}

    {/* Aerobna učinkovitost */}
    {aerobaEfektivnost.length >= 3 && (
      <div className="card" style={{ marginBottom: 16 }}>
        <h3>Aerobna učinkovitost — tempo pri HR 150 bpm</h3>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={aerobaEfektivnost} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2433" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#475569', fontFamily: 'DM Mono' }} interval="preserveStartEnd" />
            <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: '#475569', fontFamily: 'DM Mono' }}
              tickFormatter={v => { const m = Math.floor(v / 60), s = v % 60; return `${m}:${String(s).padStart(2, '0')}` }} />
            <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1e2433', borderRadius: 8, fontSize: 12 }}
              formatter={(v, name) => { const m = Math.floor(v / 60), s = v % 60; return [`${m}:${String(s).padStart(2, '0')}/km`, name === 'tempoSec' ? 'Tempo @ HR150' : 'Trend'] }} />
            <Line type="monotone" dataKey="tempoSec" stroke="#06b6d4" strokeWidth={2} dot={{ r: 4, fill: '#06b6d4' }} connectNulls={false} />
            {aerobaEfektivnost[0]?.trend !== undefined && (
              <Line type="monotone" dataKey="trend" stroke="#334155" strokeWidth={1} strokeDasharray="5 3" dot={false} connectNulls={true} />
            )}
          </LineChart>
        </ResponsiveContainer>
        <div style={{ fontSize: 11, color: '#334155', marginTop: 6, fontFamily: 'DM Mono' }}>
          Nižje = hitrejše · Normalizirano na HR 150 bpm (~3 s/km/bpm korekcija) · Prikazuje aerobno formo neodvisno od tempa
        </div>
      </div>
    )}

    {/* Kaj potrebujem */}
    {(() => {
      const ciljMin = 225
      const potrebniVVO2max = 42195 / (ciljMin * 0.77)
      const a = 0.007546, b = -5.000663, c = potrebniVVO2max - 29.54
      const disc = b * b - 4 * a * c
      const potrebniVO2 = disc >= 0 ? Math.round((-b - Math.sqrt(disc)) / (2 * a) * 10) / 10 : 46
      const vo2Gap = vo2Uporabljen ? Math.round((potrebniVO2 - vo2Uporabljen) * 10) / 10 : null
      const potrebniTempo = 320
      const tempoGapSec = tempoNa155 ? tempoNa155 - potrebniTempo : null
      const kmGap = maxKm ? Math.round(60 - maxKm) : null

      const rows = [
        { label: 'VO2max (EWMA)', cilj: `≥ ${potrebniVO2} ml/kg/min`, trenutno: vo2Uporabljen ? `${fmt(vo2Uporabljen, 1)} ml/kg/min` : '—', ok: vo2Gap !== null && vo2Gap <= 0, gap: vo2Gap !== null && vo2Gap > 0 ? `+${fmt(vo2Gap, 1)} ml/kg/min za doseči` : null },
        { label: 'Tempo pri HR 155', cilj: '≤ 5:20/km', trenutno: tempoNa155 ? `${secToTempoStr(tempoNa155)}/km` : '—', ok: tempoGapSec !== null && tempoGapSec <= 0, gap: tempoGapSec !== null && tempoGapSec > 0 ? `${Math.round(tempoGapSec)}s/km prepočasen` : null },
        { label: 'Max teden', cilj: '≥ 60 km', trenutno: `${fmt(maxKm, 0)} km`, ok: kmGap !== null && kmGap <= 0, gap: kmGap !== null && kmGap > 0 ? `+${kmGap} km/teden manjka` : null },
      ]
      const diffDanes2 = casFinal - ciljSec
      return (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3>Kaj potrebujem za 3:45:00</h3>
          <div style={{ fontSize: 11, color: '#475569', marginBottom: 12, fontFamily: 'DM Mono' }}>
            {diffDanes2 > 0 ? `Danes ${Math.floor(diffDanes2 / 60)}min nad ciljnim časom — fokus na:` : '✓ Cilj je dosegljiv — ohranjaj formo.'}
          </div>
          {rows.map(({ label, cilj, trenutno, ok, gap }, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10, flexWrap: 'wrap', paddingBottom: 10, borderBottom: i < rows.length - 1 ? '1px solid #0a0f1a' : 'none' }}>
              <span style={{ fontSize: 11, fontFamily: 'DM Mono', color: '#475569', minWidth: 140 }}>{label}</span>
              <span style={{ fontSize: 13, fontFamily: 'DM Mono', color: ok ? '#22c55e' : '#94a3b8' }}>{trenutno}</span>
              {ok ? <span style={{ fontSize: 11, color: '#22c55e', fontFamily: 'DM Mono' }}>✓ cilj dosežen ({cilj})</span>
                : gap ? <span style={{ fontSize: 11, color: '#f97316', fontFamily: 'DM Mono' }}>⚠ {gap} · cilj: {cilj}</span>
                  : <span style={{ fontSize: 11, color: '#475569', fontFamily: 'DM Mono' }}>cilj: {cilj}</span>}
            </div>
          ))}
        </div>
      )
    })()}

    <div className="alert info">ℹ️ Model: VO2max EWMA 35% + HR-tempo WLS 30% + Riegel HM 25% + VO2max projekcija 10% · Kalibrirano za prvič: frakcija vVO2max 72% (ne 77%), Riegel exp 1.10 (ne 1.06), Garmin diskont −5%, buffer +22 min · Zanesljivost raste z vsakim tekom in dolžino priprav.</div>
  </>)
}
