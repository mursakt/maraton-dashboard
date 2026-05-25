import React, { useState, useEffect } from 'react'

// ── range: 20:00 → 12:00 next day (16 h = 960 min) ──────────────────────────

const RANGE_START  = 20 * 60
const RANGE_TOTAL  = 16 * 60
const CHART_H      = 380
const SLEEP_TARGET = 8 * 60   // 8h in minutes
const COLOR_GOOD   = '#22c55e'
const COLOR_WARN   = '#eab308'
const COLOR_BAD    = '#ef4444'

// ── 14 days of data ───────────────────────────────────────────────────────────

const DAYS = [
  { date: '05-12', day: 'Pon', bed: '23:15', wake: '7:30' },
  { date: '05-13', day: 'Tor', bed: '23:45', wake: '7:20' },
  { date: '05-14', day: 'Sre', bed: '00:10', wake: '7:45' },
  { date: '05-15', day: 'Čet', bed: '23:20', wake: '8:00' },
  { date: '05-16', day: 'Pet', bed: '23:50', wake: '6:15' },
  { date: '05-17', day: 'Sob', bed: '00:30', wake: '9:00' },
  { date: '05-18', day: 'Ned', bed: '23:00', wake: '8:30' },
  { date: '05-19', day: 'Pon', bed: '23:10', wake: '7:45' },
  { date: '05-20', day: 'Tor', bed: '00:20', wake: '7:30' },
  { date: '05-21', day: 'Sre', bed: '23:50', wake: '8:10' },
  { date: '05-22', day: 'Čet', bed: '23:30', wake: '8:20' },
  { date: '05-23', day: 'Pet', bed: '23:54', wake: '6:01' },
  { date: '05-24', day: 'Sob', bed: '01:00', wake: '9:30' },
  { date: '05-25', day: 'Ned', bed: '22:45', wake: '7:00' },
]

const METRICS = [
  { key: 'eff',    label: 'Učinkovitost', val: 97,     prev: 94,     unit: '%', goodUp: true,  anim: true  },
  { key: 'sleep',  label: 'Spanje',       val: '5:56', prev: '5:42', unit: '',  goodUp: true,  anim: false },
  { key: 'awake',  label: 'Budnost',      val: '0:11', prev: '0:18', unit: '',  goodUp: false, anim: false },
  { key: 'events', label: 'Prebujanj',    val: 10,     prev: 13,     unit: '',  goodUp: false, anim: true  },
  { key: 'stress', label: 'Stres',        val: 0,      prev: 2,      unit: '%', goodUp: false, anim: true  },
]

// ── helpers ───────────────────────────────────────────────────────────────────

function absMin(t) {
  const [h, m] = t.split(':').map(Number)
  const v = h * 60 + m
  return v < RANGE_START ? v + 1440 : v
}

function offsetPct(t) {
  return ((absMin(t) - RANGE_START) / RANGE_TOTAL) * 100
}

function durMin(bed, wake) {
  return absMin(wake) - absMin(bed)
}

function durStr(min) {
  return `${Math.floor(min / 60)}h ${min % 60}min`
}

function durColor(min) {
  if (min >= 7 * 60) return COLOR_GOOD
  if (min >= 6 * 60) return COLOR_WARN
  return COLOR_BAD
}

function stdDev(arr) {
  const mean = arr.reduce((s, v) => s + v, 0) / arr.length
  return Math.sqrt(arr.reduce((s, v) => s + (v - mean) ** 2, 0) / arr.length)
}

function trendInfo(val, prev, goodUp) {
  const toN = v => typeof v === 'string' && v.includes(':')
    ? v.split(':').map(Number).reduce((h, m) => h * 60 + m)
    : Number(v)
  const diff = toN(val) - toN(prev)
  if (diff === 0) return { arrow: '→', color: '#64748b' }
  const up = diff > 0
  return { arrow: up ? '↑' : '↓', color: (goodUp ? up : !up) ? COLOR_GOOD : COLOR_BAD }
}

// ── animated counter ──────────────────────────────────────────────────────────

function CountUp({ to, unit, duration = 900 }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    const start = performance.now()
    const frame = now => {
      const p = Math.min(1, (now - start) / duration)
      setN(Math.round(p * to))
      if (p < 1) requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
  }, [to, duration])
  return <>{n}{unit}</>
}

// ── derived data ──────────────────────────────────────────────────────────────

const daysWithDur = DAYS.map(d => ({ ...d, dur: durMin(d.bed, d.wake) }))
const avgBedPct   = DAYS.reduce((s, d) => s + offsetPct(d.bed),  0) / DAYS.length
const avgWakePct  = DAYS.reduce((s, d) => s + offsetPct(d.wake), 0) / DAYS.length
const sleepDebt   = Math.round(daysWithDur.reduce((s, d) => s + (SLEEP_TARGET - d.dur), 0) / 60 * 10) / 10

const bedStdDev   = Math.round(stdDev(DAYS.map(d => absMin(d.bed))) )
const wakeStdDev  = Math.round(stdDev(DAYS.map(d => absMin(d.wake))))
const consistencyScore = Math.max(0, Math.round(100 - (bedStdDev + wakeStdDev) / 2))

const avgDurMin   = Math.round(daysWithDur.reduce((s, d) => s + d.dur, 0) / DAYS.length)

const Y_TICKS = [20, 22, 24, 26, 28, 30, 32, 34, 36].map(h => ({
  label: `${String(h % 24).padStart(2, '0')}:00`,
  pct:   ((h * 60 - RANGE_START) / RANGE_TOTAL) * 100,
  isMid: h === 24,
}))

// ── component ─────────────────────────────────────────────────────────────────

export function SleepConsistency() {
  const [selected, setSelected] = useState(null)
  const [mounted,  setMounted]  = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="card" style={{ marginBottom: 16 }}>

      {/* ── header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
        <h3 style={{ margin: 0 }}>Spanec — 14 dni</h3>
        <div style={{ display: 'flex', gap: 10, fontFamily: 'DM Mono', fontSize: 11, flexWrap: 'wrap' }}>
          <span style={{ color: '#475569' }}>
            konsistentnost:&nbsp;
            <span style={{ color: consistencyScore >= 75 ? COLOR_GOOD : consistencyScore >= 55 ? COLOR_WARN : COLOR_BAD, fontWeight: 600 }}>
              {consistencyScore}%
            </span>
          </span>
          <span style={{ color: '#475569' }}>
            povp. trajanje:&nbsp;
            <span style={{ color: durColor(avgDurMin), fontWeight: 600 }}>{durStr(avgDurMin)}</span>
          </span>
          <span style={{ color: '#475569' }}>
            sleep debt:&nbsp;
            <span style={{ color: sleepDebt > 0 ? COLOR_BAD : COLOR_GOOD, fontWeight: 600 }}>
              {sleepDebt > 0 ? '+' : ''}{sleepDebt}h
            </span>
          </span>
        </div>
      </div>

      {/* ── chart ── */}
      <div style={{ display: 'flex', marginBottom: 36 }}>

        {/* Y-axis */}
        <div style={{ width: 48, position: 'relative', height: CHART_H, flexShrink: 0 }}>
          {Y_TICKS.map(t => (
            <div key={t.label} style={{
              position: 'absolute',
              top: `${t.pct}%`,
              right: 6,
              transform: 'translateY(-50%)',
              fontSize: 10,
              color: t.isMid ? '#475569' : '#334155',
              fontFamily: 'DM Mono',
              fontWeight: t.isMid ? 600 : 400,
              whiteSpace: 'nowrap',
            }}>{t.label}</div>
          ))}
        </div>

        {/* Chart area */}
        <div style={{ flex: 1, position: 'relative', height: CHART_H }}>

          {/* Grid lines */}
          {Y_TICKS.map(t => (
            <div key={t.label} style={{
              position: 'absolute',
              top: `${t.pct}%`, left: 0, right: 0, height: 1,
              background: t.isMid ? '#252f42' : '#0f172a',
              zIndex: 0,
            }} />
          ))}

          {/* Avg bedtime dashed line */}
          <div style={{ position: 'absolute', top: `${avgBedPct}%`, left: 0, right: 0, zIndex: 3, pointerEvents: 'none' }}>
            <div style={{ borderTop: '1.5px dashed #f59e0b' }} />
            <div style={{ position: 'absolute', right: 2, top: -14, fontSize: 9, color: '#f59e0b', fontFamily: 'DM Mono' }}>
              ø {String(Math.floor((RANGE_START + avgBedPct / 100 * RANGE_TOTAL) / 60) % 24).padStart(2,'0')}:
              {String(Math.round((RANGE_START + avgBedPct / 100 * RANGE_TOTAL) % 60)).padStart(2,'0')}
            </div>
          </div>

          {/* Avg wake dashed line */}
          <div style={{ position: 'absolute', top: `${avgWakePct}%`, left: 0, right: 0, zIndex: 3, pointerEvents: 'none' }}>
            <div style={{ borderTop: '1.5px dashed #38bdf8' }} />
            <div style={{ position: 'absolute', right: 2, top: 3, fontSize: 9, color: '#38bdf8', fontFamily: 'DM Mono' }}>
              ø {String(Math.floor((RANGE_START + avgWakePct / 100 * RANGE_TOTAL) / 60) % 24).padStart(2,'0')}:
              {String(Math.round((RANGE_START + avgWakePct / 100 * RANGE_TOTAL) % 60)).padStart(2,'0')}
            </div>
          </div>

          {/* Day columns */}
          <div style={{ display: 'flex', height: '100%', gap: 4 }}>
            {daysWithDur.map((d, i) => {
              const topPct  = offsetPct(d.bed)
              const hPct    = offsetPct(d.wake) - offsetPct(d.bed)
              const isSel   = selected === i
              const color   = durColor(d.dur)
              const barH    = hPct / 100 * CHART_H   // px height of bar
              const isWeekEnd = i === 6              // separator after day 7

              // Tooltip direction: left 3 columns anchor left, right 3 anchor right, rest center
              const tipStyle = i < 3
                ? { left: 0, transform: 'none' }
                : i > 10
                  ? { right: 0, left: 'auto', transform: 'none' }
                  : { left: '50%', transform: 'translateX(-50%)' }

              return (
                <React.Fragment key={d.date}>
                  <div
                    style={{ flex: 1, position: 'relative', cursor: 'pointer' }}
                    onClick={() => setSelected(isSel ? null : i)}
                  >
                    {/* Sleep bar */}
                    <div style={{
                      position: 'absolute',
                      top: `${topPct}%`, left: 0, right: 0,
                      height: `${hPct}%`,
                      background: isSel
                        ? `${color}33`
                        : `${color}18`,
                      border: `1px solid ${isSel ? color : color + '55'}`,
                      borderRadius: 4,
                      transition: 'border-color .15s, background .15s',
                      zIndex: 1,
                    }}>
                      {/* Duration label inside bar if tall enough */}
                      {barH > 28 && (
                        <div style={{
                          position: 'absolute',
                          bottom: 4, left: 0, right: 0,
                          textAlign: 'center',
                          fontSize: 9,
                          fontFamily: 'DM Mono',
                          color: isSel ? color : color + 'aa',
                          lineHeight: 1,
                          pointerEvents: 'none',
                        }}>
                          {Math.floor(d.dur / 60)}:{String(d.dur % 60).padStart(2,'0')}
                        </div>
                      )}
                    </div>

                    {/* Tooltip */}
                    {isSel && (
                      <div style={{
                        position: 'absolute',
                        top: `${topPct}%`,
                        ...tipStyle,
                        marginTop: -90,
                        background: '#080e1c',
                        border: `1px solid ${color}66`,
                        borderRadius: 8,
                        padding: '8px 12px',
                        fontSize: 11,
                        fontFamily: 'DM Mono',
                        whiteSpace: 'nowrap',
                        zIndex: 20,
                        boxShadow: '0 8px 24px #00000090',
                        pointerEvents: 'none',
                      }}>
                        <div style={{ color: '#94a3b8', fontWeight: 700, fontSize: 12, marginBottom: 6 }}>
                          {d.day} {d.date}
                        </div>
                        <div style={{ color: '#94a3b8', marginBottom: 2 }}>
                          Spanje:&nbsp;<span style={{ color: '#f59e0b' }}>{d.bed}</span>
                        </div>
                        <div style={{ color: '#94a3b8', marginBottom: 6 }}>
                          Prebujenje:&nbsp;<span style={{ color: '#38bdf8' }}>{d.wake}</span>
                        </div>
                        <div style={{ color, fontWeight: 600 }}>⏱ {durStr(d.dur)}</div>
                      </div>
                    )}

                    {/* Day label */}
                    <div style={{
                      position: 'absolute',
                      bottom: -34, left: '50%',
                      transform: 'translateX(-50%)',
                      textAlign: 'center',
                      pointerEvents: 'none',
                    }}>
                      <div style={{ fontSize: 10, color: isSel ? '#93c5fd' : '#475569', fontFamily: 'DM Mono', whiteSpace: 'nowrap' }}>
                        {d.day}
                      </div>
                      <div style={{ fontSize: 9, color: '#334155', fontFamily: 'DM Mono' }}>
                        {d.date}
                      </div>
                    </div>
                  </div>

                  {/* Week separator */}
                  {isWeekEnd && (
                    <div style={{
                      width: 1,
                      alignSelf: 'stretch',
                      background: '#1e2433',
                      flexShrink: 0,
                      margin: '0 2px',
                    }} />
                  )}
                </React.Fragment>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── legend ── */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 14, fontSize: 10, fontFamily: 'DM Mono', flexWrap: 'wrap' }}>
        <span style={{ color: COLOR_GOOD }}>■ ≥7h</span>
        <span style={{ color: COLOR_WARN }}>■ 6–7h</span>
        <span style={{ color: COLOR_BAD  }}>■ &lt;6h</span>
        <span style={{ color: '#f59e0b', marginLeft: 8 }}>— — ø spanje</span>
        <span style={{ color: '#38bdf8' }}>— — ø prebujenje</span>
      </div>

      {/* ── sleep duration trend bars ── */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, color: '#475569', fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>
          Trajanje po dnevih
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 40 }}>
          {daysWithDur.map((d, i) => {
            const pct = Math.min(100, (d.dur / (10 * 60)) * 100)
            const color = durColor(d.dur)
            return (
              <React.Fragment key={d.date}>
                <div
                  key={d.date}
                  title={`${d.day}: ${durStr(d.dur)}`}
                  style={{
                    flex: 1, height: `${pct}%`,
                    background: color + (selected === i ? 'cc' : '55'),
                    border: `1px solid ${color + '88'}`,
                    borderRadius: '2px 2px 0 0',
                    transition: 'background .15s',
                    cursor: 'pointer',
                    alignSelf: 'flex-end',
                  }}
                  onClick={() => setSelected(selected === i ? null : i)}
                />
                {i === 6 && <div style={{ width: 1, background: '#1e2433', flexShrink: 0, alignSelf: 'stretch' }} />}
              </React.Fragment>
            )
          })}
        </div>
        {/* 8h reference */}
        <div style={{ height: 1, background: '#1e2433', marginTop: 1 }} />
        <div style={{ fontSize: 9, color: '#334155', fontFamily: 'DM Mono', textAlign: 'right', marginTop: 2 }}>
          cilj: 8h
        </div>
      </div>

      {/* ── efficiency bar ── */}
      <div style={{ marginBottom: 16, paddingTop: 12, borderTop: '1px solid #1e2433' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, fontSize: 11, fontFamily: 'DM Mono' }}>
          <span style={{ color: '#475569', textTransform: 'uppercase', letterSpacing: '.5px', fontSize: 10 }}>
            Učinkovitost spanja
          </span>
          <div style={{ display: 'flex', gap: 14, fontSize: 10 }}>
            <span style={{ color: COLOR_GOOD }}>● 5:56 spanje</span>
            <span style={{ color: '#475569' }}>● 0:11 budnost</span>
          </div>
        </div>
        <div style={{ position: 'relative', height: 8, background: '#1e2433', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', left: 0, top: 0, height: '100%',
            width: mounted ? '97%' : '0%',
            background: 'linear-gradient(90deg, #15803d, #22c55e)',
            borderRadius: 4,
            transition: 'width 1s cubic-bezier(.4,0,.2,1)',
          }} />
        </div>
        <div style={{ textAlign: 'right', marginTop: 4, fontSize: 10, fontFamily: 'DM Mono', color: COLOR_GOOD }}>
          {mounted ? <CountUp to={97} unit="%" duration={1000} /> : '0%'}
        </div>
      </div>

      {/* ── metric cards ── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {METRICS.map(m => {
          const t = trendInfo(m.val, m.prev, m.goodUp)
          return (
            <div key={m.key} style={{
              flex: '1 1 80px', minWidth: 0,
              padding: '10px 12px',
              background: '#080e1c',
              border: '1px solid #1e2433',
              borderRadius: 8,
            }}>
              <div style={{ fontSize: 9, color: '#475569', fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>
                {m.label}
              </div>
              <div style={{ fontSize: 22, fontWeight: 300, color: '#e2e8f0', fontFamily: 'DM Mono', lineHeight: 1, marginBottom: 6 }}>
                {m.anim && mounted
                  ? <CountUp to={Number(m.val)} unit={m.unit} />
                  : `${m.val}${m.unit}`}
              </div>
              <div style={{ fontSize: 10, fontFamily: 'DM Mono', color: t.color }}>
                {t.arrow} {typeof m.prev === 'string' ? m.prev : `${m.prev}${m.unit}`}
              </div>
            </div>
          )
        })}

        {/* Consistency card */}
        <div style={{
          flex: '1 1 80px', minWidth: 0,
          padding: '10px 12px',
          background: '#080e1c',
          border: '1px solid #1e2433',
          borderRadius: 8,
        }}>
          <div style={{ fontSize: 9, color: '#475569', fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>
            Konsistentnost
          </div>
          <div style={{ fontSize: 22, fontWeight: 300, fontFamily: 'DM Mono', lineHeight: 1, marginBottom: 6,
            color: consistencyScore >= 75 ? COLOR_GOOD : consistencyScore >= 55 ? COLOR_WARN : COLOR_BAD }}>
            {mounted ? <CountUp to={consistencyScore} unit="%" /> : '0%'}
          </div>
          <div style={{ fontSize: 10, fontFamily: 'DM Mono', color: '#475569' }}>
            σ leganje ±{bedStdDev}min
          </div>
        </div>

        {/* Sleep debt card */}
        <div style={{
          flex: '1 1 80px', minWidth: 0,
          padding: '10px 12px',
          background: '#080e1c',
          border: `1px solid ${sleepDebt > 2 ? '#450a0a' : '#1e2433'}`,
          borderRadius: 8,
        }}>
          <div style={{ fontSize: 9, color: '#475569', fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>
            Sleep Debt
          </div>
          <div style={{ fontSize: 22, fontWeight: 300, fontFamily: 'DM Mono', lineHeight: 1, marginBottom: 6,
            color: sleepDebt <= 0 ? COLOR_GOOD : sleepDebt <= 3 ? COLOR_WARN : COLOR_BAD }}>
            {sleepDebt > 0 ? '+' : ''}{sleepDebt}h
          </div>
          <div style={{ fontSize: 10, fontFamily: 'DM Mono', color: '#475569' }}>
            vs 8h/dan cilj
          </div>
        </div>
      </div>
    </div>
  )
}
