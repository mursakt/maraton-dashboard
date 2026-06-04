import React from 'react'
import { SleepConsistency } from './SleepConsistency'
import { Sparkline } from './Sparkline'
import { Line, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea, ComposedChart } from 'recharts'
import { PLAN } from '../constants/plan'
import { izracunajFormo } from '../utils/calculations'
import { fmt, formaColor, formaLabel } from '../utils/helpers'

const CHART_HEIGHT = 200
const DAN_MS = 86400000
const mean = arr => arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : null
const std = arr => { if (arr.length < 2) return 0; const m = mean(arr); return Math.sqrt(arr.reduce((s, x) => s + (x - m) ** 2, 0) / arr.length) }

// ── Recovery scorecard vrstica ──────────────────────────────
function ScoreRow({ m, header }) {
  if (header) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.85fr 0.85fr 1.1fr 96px 1fr', gap: 8, alignItems: 'center', padding: '0 0 8px', borderBottom: '1px solid #1e2433' }}>
        {['Marker', 'Danes', '7d povp.', 'Baseline 60d', '28 dni', 'Status'].map((h, i) => (
          <div key={i} style={{ fontSize: 9, color: '#475569', fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '.5px', textAlign: i === 0 ? 'left' : i >= 4 ? 'left' : 'right' }}>{h}</div>
        ))}
      </div>
    )
  }
  const fmU = (v) => v == null ? '—' : `${fmt(v, m.dec)}${m.unit ? ' ' + m.unit : ''}`
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.85fr 0.85fr 1.1fr 96px 1fr', gap: 8, alignItems: 'center', padding: '9px 0', borderBottom: '1px solid #0f172a' }}>
      <div style={{ fontSize: 12, color: '#cbd5e1', fontWeight: 500 }}>{m.label}</div>
      <div style={{ textAlign: 'right', fontSize: 15, fontFamily: 'DM Mono', color: m.status.color }}>{fmU(m.cur)}</div>
      <div style={{ textAlign: 'right', fontSize: 12, fontFamily: 'DM Mono', color: '#94a3b8', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 4 }}>
        {m.avg7 != null ? fmt(m.avg7, m.dec) : '—'}
        {m.trend && <span style={{ color: m.trend.color, fontSize: 9 }}>{m.trend.up ? '▲' : '▼'}</span>}
      </div>
      <div style={{ textAlign: 'right', fontSize: 11, fontFamily: 'DM Mono', color: '#64748b' }}>
        {m.bMean != null ? `${fmt(m.bMean, m.dec)} ±${fmt(m.bSd, m.dec)}` : '—'}
      </div>
      <div><Sparkline data={m.spark} color={m.color} width={92} height={24} /></div>
      <div>
        <span style={{ fontSize: 11, fontFamily: 'DM Mono', color: m.status.color, background: m.status.color + '18', padding: '2px 8px', borderRadius: 4 }}>{m.status.label}</span>
      </div>
    </div>
  )
}

// ── HRV/RHR graf z baseline pasom ───────────────────────────
function BandChart({ title, sub, rows, color, lo, hi, unit, yPad = 4 }) {
  if (rows.length < 2) return <div className="card" style={{ marginBottom: 0 }}><h3>{title}</h3><div className="empty">Ni dovolj podatkov</div></div>
  const allV = rows.flatMap(r => [r.val, r.ma]).filter(v => v != null)
  const yMin = Math.min(...allV, lo ?? Infinity) - yPad
  const yMax = Math.max(...allV, hi ?? -Infinity) + yPad
  return (
    <div className="card">
      <h3>{title}</h3>
      <div style={{ fontSize: 10, color: '#475569', marginBottom: 8, fontFamily: 'DM Mono' }}>{sub}</div>
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        <ComposedChart data={rows} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e2433" />
          <XAxis dataKey="datum" tick={{ fontSize: 10, fill: '#475569', fontFamily: 'DM Mono' }} interval={Math.max(0, Math.floor(rows.length / 5) - 1)} />
          <YAxis domain={[yMin, yMax]} tick={{ fontSize: 10, fill: '#475569', fontFamily: 'DM Mono' }} />
          {lo != null && hi != null && <ReferenceArea y1={lo} y2={hi} fill={color} fillOpacity={0.09} stroke="none" />}
          <Tooltip content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null
            const d = payload[0]?.payload
            return (
              <div style={{ background: '#111827', border: '1px solid #1e2433', borderRadius: 8, padding: '8px 12px', fontSize: 11, fontFamily: 'DM Mono' }}>
                <div style={{ color: '#64748b', marginBottom: 4 }}>{label}</div>
                <div style={{ color }}>{d.val} {unit}</div>
                {d.ma != null && <div style={{ color: '#94a3b8' }}>7d povp: {d.ma} {unit}</div>}
              </div>
            )
          }} />
          <Line type="monotone" dataKey="val" stroke={color} strokeWidth={1} strokeOpacity={0.3} dot={{ r: 1.8, fill: color, fillOpacity: 0.55, strokeWidth: 0 }} name="dnevno" connectNulls={false} />
          <Line type="monotone" dataKey="ma" stroke={color} strokeWidth={2.5} dot={false} name="7d povp." connectNulls={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

export function TabTelo({ metrike, workouts = [] }) {
  // ── Teža: MA7 + tempo ──────────────────────────
  const tezaDejansko = metrike.filter(m => m.teza_kg).slice(0, 60).reverse()
  const tezaGraf = tezaDejansko.map(m => {
    const p = PLAN.slice().reverse().find(pl => pl.datum <= m.datum)
    const t = new Date(m.datum).getTime()
    const okno = tezaDejansko.filter(x => { const xt = new Date(x.datum).getTime(); return xt <= t && xt > t - 7 * DAN_MS })
    const ma7 = okno.reduce((s, x) => s + x.teza_kg, 0) / okno.length
    return { datum: m.datum?.slice(5), _t: t, dejanska: m.teza_kg, ma7: Math.round(ma7 * 100) / 100, plan: p?.ciljnaKg || null }
  })
  const tezaTempo = (() => {
    if (tezaGraf.length < 2) return null
    const zadnji = tezaGraf[tezaGraf.length - 1]
    const cilj = zadnji._t - 7 * DAN_MS
    const prej = tezaGraf.reduce((best, g) => Math.abs(g._t - cilj) < Math.abs(best._t - cilj) ? g : best, tezaGraf[0])
    if (prej === zadnji) return null
    return Math.round((zadnji.ma7 - prej.ma7) * 10) / 10
  })()

  // ── Scorecard markerji ──────────────────────────
  const buildMarker = (label, fn, opt) => {
    const all = metrike.map(fn).filter(v => v != null && v > 0)
    const cur = all[0] ?? null
    const avg7 = all.length ? mean(all.slice(0, 7)) : null
    const base = all.slice(0, 60); const bMean = base.length ? mean(base) : null; const bSd = std(base)
    const spark = all.slice(0, 28).reverse()
    const { unit = '', dec = 0, higherBetter, band, target, stres, tempo, color } = opt
    let status
    if (target != null) status = { label: cur >= target ? 'cilj ✓' : cur >= target - 1 ? 'blizu' : 'premalo', color: cur >= target ? '#22c55e' : cur >= target - 1 ? '#eab308' : '#ef4444' }
    else if (stres) status = { label: cur < 35 ? 'nizek' : cur < 55 ? 'zmeren' : 'visok', color: cur < 35 ? '#22c55e' : cur < 55 ? '#eab308' : '#ef4444' }
    else if (tempo !== undefined) status = tempo == null ? { label: '—', color: '#6b7280' } : { label: `${tempo > 0 ? '+' : ''}${fmt(tempo)} kg/t`, color: tempo < 0 ? '#22c55e' : tempo > 0 ? '#f97316' : '#94a3b8' }
    else if (band && bSd > 0 && cur != null) {
      const lo = bMean - bSd, hi = bMean + bSd
      if (cur >= lo && cur <= hi) status = { label: 'normalno', color: '#94a3b8' }
      else { const above = cur > hi; const good = higherBetter ? above : !above; status = { label: above ? 'nad baseline' : 'pod baseline', color: good ? '#22c55e' : '#ef4444' } }
    } else status = { label: '—', color: '#6b7280' }
    let trend = null
    if (avg7 != null && bMean != null && Math.abs(avg7 - bMean) >= Math.max(bSd * 0.2, 0.01)) {
      const up = avg7 > bMean; const good = higherBetter ? up : !up
      trend = { up, color: good ? '#22c55e' : '#ef4444' }
    }
    return { label, unit, dec, cur, avg7, bMean, bSd, spark, status, trend, color }
  }

  const markers = [
    buildMarker('HRV', m => m.hrv, { unit: 'ms', dec: 0, higherBetter: true, band: true, color: '#22c55e' }),
    buildMarker('Mirovni HR', m => m.hr_pocivaj || m.resting_hr, { unit: 'bpm', dec: 0, higherBetter: false, band: true, color: '#3b82f6' }),
    buildMarker('Spanje', m => m.spanje_h, { unit: 'h', dec: 1, higherBetter: true, target: 7.5, color: '#8b5cf6' }),
    buildMarker('Stres', m => m.stres_povprecje, { unit: '', dec: 0, higherBetter: false, stres: true, color: '#f97316' }),
    buildMarker('Teža', m => m.teza_kg, { unit: 'kg', dec: 1, higherBetter: false, tempo: tezaTempo, color: '#3b82f6' }),
  ]

  // ── HRV/RHR band podatki ──────────────────────────
  const bandRows = (fn) => {
    const arr = metrike.filter(m => fn(m) > 0).slice(0, 30).reverse()
    return arr.map((m, i) => {
      const win = arr.slice(Math.max(0, i - 6), i + 1).map(fn)
      return { datum: m.datum?.slice(5), val: fn(m), ma: Math.round(mean(win) * 10) / 10 }
    })
  }
  const hrvRows = bandRows(m => m.hrv)
  const rhrRows = bandRows(m => m.hr_pocivaj || m.resting_hr)
  const hrvBase = metrike.map(m => m.hrv).filter(v => v > 0).slice(0, 60)
  const hrvMean = mean(hrvBase), hrvSd = std(hrvBase)
  const rhrBase = metrike.map(m => m.hr_pocivaj || m.resting_hr).filter(v => v > 0).slice(0, 60)
  const rhrMean = mean(rhrBase), rhrSd = std(rhrBase)

  // ── Spalni dolg (kumulativno vs 7.5h, zadnjih 14 noči) ──────
  const SPANJE_CILJ = 7.5
  const spanjeRaw = metrike.filter(m => m.spanje_h > 0).slice(0, 14).reverse()
  let dolg = 0
  const spanjeData = spanjeRaw.map(m => {
    dolg += (m.spanje_h - SPANJE_CILJ)
    return { datum: m.datum?.slice(5), ure: m.spanje_h, dolg: Math.round(dolg * 10) / 10 }
  })
  const spalniDolg = spanjeData.length ? spanjeData[spanjeData.length - 1].dolg : null

  // ── Koraki ──────────────────────────
  const korakiData = metrike.filter(m => m.koraki != null).slice(0, 14).reverse().map(m => ({ datum: m.datum?.slice(5), koraki: m.koraki }))
  const zadnjiKoraki = metrike.find(m => m.koraki != null) || {}
  const avgKoraki7 = Math.round(metrike.filter(m => m.koraki != null).slice(0, 7).reduce((s, m, _, a) => s + m.koraki / a.length, 0))

  // ── Body Battery + Forma ──────────────────────────
  const z = metrike[0] || {}
  const zadnjiBB = metrike.find(m => m.body_battery_charged || m.body_battery_drained) || {}
  const bbNet = (zadnjiBB.body_battery_charged || 0) - (zadnjiBB.body_battery_drained || 0)
  const formaScore = izracunajFormo(z.hrv, z.spanje_h, z.stres_povprecje, workouts)

  const xInterval = (len) => Math.max(0, Math.floor(len / 5) - 1)

  return (<>
    {/* ── Recovery scorecard ─── */}
    <div className="card" style={{ marginBottom: 16 }}>
      <h3>Regeneracija — scorecard</h3>
      <div style={{ fontSize: 10, color: '#475569', marginBottom: 10, fontFamily: 'DM Mono' }}>
        Status glede na tvojo osebno 60-dnevno baseline (±1 SD = normalno). Trend = 7d povprečje proti baseline.
      </div>
      <ScoreRow header />
      {markers.map((m, i) => <ScoreRow key={i} m={m} />)}
    </div>

    {/* ── Sekundarno: Forma, Body Battery, Koraki ─── */}
    <div className="grid3">
      <div className="card">
        <h3>Forma danes</h3>
        <div><span className="stat-val" style={{ color: formaColor(formaScore) }}>{formaScore ? fmt(formaScore) : '—'}</span></div>
        <div className="stat-sub" style={{ color: formaColor(formaScore) }}>{formaLabel(formaScore)}</div>
      </div>
      <div className="card">
        <h3>Body Battery <span style={{ fontSize: 11, color: '#475569', fontFamily: 'DM Mono', fontWeight: 400 }}>({metrike.find(m => m.body_battery_charged || m.body_battery_drained)?.datum?.slice(5) || '—'})</span></h3>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 4 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontFamily: 'DM Mono', color: '#22c55e', fontWeight: 300 }}>+{zadnjiBB.body_battery_charged || '—'}</div>
            <div style={{ fontSize: 10, color: '#475569' }}>polnjenje</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontFamily: 'DM Mono', color: '#ef4444', fontWeight: 300 }}>-{zadnjiBB.body_battery_drained || '—'}</div>
            <div style={{ fontSize: 10, color: '#475569' }}>praznjenje</div>
          </div>
        </div>
        {zadnjiBB.body_battery_charged && <div className="stat-sub" style={{ color: bbNet >= 0 ? '#22c55e' : '#ef4444' }}>Neto: {bbNet >= 0 ? '+' : ''}{bbNet}</div>}
      </div>
      <div className="card">
        <h3>Koraki <span style={{ fontSize: 11, color: '#475569', fontFamily: 'DM Mono', fontWeight: 400 }}>({metrike.find(m => m.koraki != null)?.datum?.slice(5) || '—'})</span></h3>
        <div><span className="stat-val" style={{ color: zadnjiKoraki.koraki ? (zadnjiKoraki.koraki >= 10000 ? '#22c55e' : zadnjiKoraki.koraki >= 7000 ? '#eab308' : '#f97316') : '#6b7280' }}>{zadnjiKoraki.koraki ? (zadnjiKoraki.koraki / 1000).toFixed(1) + 'k' : '—'}</span></div>
        <div className="stat-sub">povp. 7 dni: {avgKoraki7 ? (avgKoraki7 / 1000).toFixed(1) + 'k' : '—'} · cilj: 10k</div>
      </div>
    </div>

    {/* ── Teža graf ─── */}
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
        <h3>Teža — povprečje 7d vs plan (kg)</h3>
        {tezaTempo != null && (
          <div style={{ fontSize: 11, fontFamily: 'DM Mono', color: '#475569' }}>
            Tempo: <span style={{ color: tezaTempo < 0 ? '#22c55e' : tezaTempo > 0 ? '#f97316' : '#94a3b8', fontWeight: 500 }}>
              {tezaTempo > 0 ? '+' : ''}{fmt(tezaTempo)} kg/teden {tezaTempo < 0 ? '▼' : tezaTempo > 0 ? '▲' : ''}
            </span>
          </div>
        )}
      </div>
      {tezaGraf.length > 1 ? (
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <ComposedChart data={tezaGraf} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2433" />
            <XAxis dataKey="datum" tick={{ fontSize: 10, fill: '#475569', fontFamily: 'DM Mono' }} interval={xInterval(tezaGraf.length)} />
            <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: '#475569', fontFamily: 'DM Mono' }} />
            <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1e2433', borderRadius: 8, fontSize: 12 }} />
            <Line type="monotone" dataKey="dejanska" stroke="#3b82f6" strokeWidth={1} strokeOpacity={0.22} dot={{ r: 1.8, fill: '#3b82f6', fillOpacity: 0.5, strokeWidth: 0 }} name="Dnevno" />
            <Line type="monotone" dataKey="ma7" stroke="#3b82f6" strokeWidth={2.5} dot={false} name="Povprečje 7d" />
            <Line type="monotone" dataKey="plan" stroke="#475569" strokeWidth={1} strokeDasharray="4 4" dot={false} name="Cilj plan" />
          </ComposedChart>
        </ResponsiveContainer>
      ) : <div className="empty">Ni dovolj podatkov</div>}
    </div>

    {/* ── HRV + RHR z baseline pasom ─── */}
    <div className="grid2">
      <BandChart title="HRV — z normalnim pasom" sub="zeleni pas = tvoja baseline ±1 SD · pod pasom = znižan (utrujenost)"
        rows={hrvRows} color="#22c55e" unit="ms"
        lo={hrvSd > 0 ? Math.round(hrvMean - hrvSd) : null} hi={hrvSd > 0 ? Math.round(hrvMean + hrvSd) : null} />
      <BandChart title="Mirovni HR — z normalnim pasom" sub="moder pas = baseline ±1 SD · nad pasom = utrujenost/bolezen"
        rows={rhrRows} color="#3b82f6" unit="bpm"
        lo={rhrSd > 0 ? Math.round(rhrMean - rhrSd) : null} hi={rhrSd > 0 ? Math.round(rhrMean + rhrSd) : null} yPad={2} />
    </div>

    {/* ── Spanje (dolg) + Koraki ─── */}
    <div className="grid2">
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
          <h3>Spanje &amp; spalni dolg — 14 noči</h3>
          {spalniDolg != null && (
            <div style={{ fontSize: 11, fontFamily: 'DM Mono' }}>
              Dolg: <span style={{ color: spalniDolg >= -2 ? '#22c55e' : spalniDolg >= -7 ? '#eab308' : '#ef4444', fontWeight: 500 }}>{spalniDolg > 0 ? '+' : ''}{fmt(spalniDolg)} h</span>
            </div>
          )}
        </div>
        <div style={{ fontSize: 10, color: '#475569', marginBottom: 8, fontFamily: 'DM Mono' }}>stolpci = ure/noč (cilj 7.5h) · črta = kumulativni dolg vs cilj</div>
        {spanjeData.length > 1 ? (
          <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
            <ComposedChart data={spanjeData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2433" />
              <XAxis dataKey="datum" tick={{ fontSize: 10, fill: '#475569', fontFamily: 'DM Mono' }} interval={xInterval(spanjeData.length)} />
              <YAxis yAxisId="ure" domain={[0, 10]} tick={{ fontSize: 10, fill: '#475569', fontFamily: 'DM Mono' }} width={28} />
              <YAxis yAxisId="dolg" orientation="right" tick={{ fontSize: 10, fill: '#a78bfa', fontFamily: 'DM Mono' }} width={28} />
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1e2433', borderRadius: 8, fontSize: 12 }} />
              <ReferenceLine yAxisId="ure" y={7.5} stroke="#475569" strokeDasharray="5 3" strokeWidth={1.5} strokeOpacity={0.7} />
              <Bar yAxisId="ure" dataKey="ure" radius={[3, 3, 0, 0]} fill="#22c55e">
                {spanjeData.map((d, i) => (<Cell key={i} fill={d.ure >= 7.5 ? '#22c55e' : d.ure >= 6.5 ? '#eab308' : '#ef4444'} />))}
              </Bar>
              <Line yAxisId="dolg" type="monotone" dataKey="dolg" stroke="#a78bfa" strokeWidth={2} dot={false} name="dolg" />
            </ComposedChart>
          </ResponsiveContainer>
        ) : <div className="empty">Ni dovolj podatkov</div>}
      </div>
      <div className="card">
        <h3>Koraki — zadnjih 14 dni</h3>
        {korakiData.length > 1 ? (
          <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
            <BarChart data={korakiData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2433" />
              <XAxis dataKey="datum" tick={{ fontSize: 10, fill: '#475569', fontFamily: 'DM Mono' }} interval={xInterval(korakiData.length)} />
              <YAxis tick={{ fontSize: 10, fill: '#475569', fontFamily: 'DM Mono' }} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v} />
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1e2433', borderRadius: 8, fontSize: 12 }} formatter={v => [`${v.toLocaleString()} korakov`, '']} />
              <ReferenceLine y={10000} stroke="#475569" strokeDasharray="5 3" strokeWidth={1.5} strokeOpacity={0.7} />
              <Bar dataKey="koraki" radius={[3, 3, 0, 0]} fill="#22c55e">
                {korakiData.map((d, i) => (<Cell key={i} fill={d.koraki >= 10000 ? '#22c55e' : '#eab308'} />))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : <div className="empty">Ni dovolj podatkov</div>}
      </div>
    </div>

    <SleepConsistency metrike={metrike} />
  </>)
}
