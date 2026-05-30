import React, { useState, useEffect } from 'react'

const RANGE_START  = 20 * 60   // 20:00
const RANGE_TOTAL  = 13 * 60   // 20:00 → 09:00 naslednji dan
const CHART_H      = 360
const SLEEP_TARGET = 8 * 60
const COLOR_GOOD   = '#22c55e'
const COLOR_WARN   = '#eab308'
const COLOR_BAD    = '#ef4444'
const DAY_NAMES    = ['Ned', 'Pon', 'Tor', 'Sre', 'Čet', 'Pet', 'Sob']

function absMin(t) {
  if (!t) return null
  const [h, m] = t.split(':').map(Number)
  const v = h * 60 + m
  return v < RANGE_START ? v + 1440 : v
}

function offsetPct(t) {
  const a = absMin(t)
  if (a === null) return null
  return ((a - RANGE_START) / RANGE_TOTAL) * 100
}

function durMin(bed, wake) {
  const b = absMin(bed), w = absMin(wake)
  if (!b || !w) return null
  return w - b
}

function durStr(min) {
  if (!min) return '—'
  return `${Math.floor(min / 60)}h ${min % 60}min`
}

function durColor(min) {
  if (!min) return '#475569'
  if (min >= 7 * 60) return COLOR_GOOD
  if (min >= 6 * 60) return COLOR_WARN
  return COLOR_BAD
}

function stdDev(arr) {
  if (arr.length < 2) return 0
  const mean = arr.reduce((s, v) => s + v, 0) / arr.length
  return Math.sqrt(arr.reduce((s, v) => s + (v - mean) ** 2, 0) / arr.length)
}

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

const Y_TICKS = [20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33].map(h => ({
  label: `${String(h % 24).padStart(2, '0')}:00`,
  pct:   ((h * 60 - RANGE_START) / RANGE_TOTAL) * 100,
  isMid: h === 24,
  isTarget: false,
})).filter(t => t.pct >= 0 && t.pct <= 100)

export function SleepConsistency({ metrike = [] }) {
  const [selected, setSelected] = useState(null)
  const [mounted,  setMounted]  = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80)
    return () => clearTimeout(t)
  }, [])

  // Vzemi zadnjih 14 dni ki imajo bed ali wake čas (ali vsaj spanje_h)
  const days = metrike
    .filter(m => m.datum && (m.spanje_zacetek || m.spanje_konec || m.spanje_h))
    .slice(0, 14)
    .reverse()
    .map(m => {
      const d = new Date(m.datum)
      const dur = m.spanje_zacetek && m.spanje_konec
        ? durMin(m.spanje_zacetek, m.spanje_konec)
        : m.spanje_h ? Math.round(m.spanje_h * 60) : null
      return {
        datum:  m.datum,
        date:   m.datum.slice(5),
        day:    DAY_NAMES[d.getDay()],
        bed:    m.spanje_zacetek || null,
        wake:   m.spanje_konec   || null,
        dur,
        h:      m.spanje_h,
        stres:  m.stres_povprecje ?? null,
        hrv:    m.hrv ?? null,
      }
    })

  if (days.length === 0) return null

  const hasTimes = days.some(d => d.bed && d.wake)

  // Stats
  const daysWithDur = days.filter(d => d.dur)
  const avgDurMin   = daysWithDur.length
    ? Math.round(daysWithDur.reduce((s, d) => s + d.dur, 0) / daysWithDur.length)
    : null
  const sleepDebt = daysWithDur.length
    ? Math.round(daysWithDur.reduce((s, d) => s + (SLEEP_TARGET - d.dur), 0) / 60 * 10) / 10
    : null

  const bedTimes  = days.filter(d => d.bed).map(d => absMin(d.bed))
  const wakeTimes = days.filter(d => d.wake).map(d => absMin(d.wake))
  const bedStdDev  = bedTimes.length  >= 2 ? Math.round(stdDev(bedTimes))  : null
  const wakeStdDev = wakeTimes.length >= 2 ? Math.round(stdDev(wakeTimes)) : null
  const consistencyScore = bedStdDev !== null && wakeStdDev !== null
    ? Math.max(0, Math.round(100 - (bedStdDev + wakeStdDev) / 2))
    : daysWithDur.length >= 2
      ? Math.max(0, Math.round(100 - stdDev(daysWithDur.map(d => d.dur)) / 1.5))
      : null

  const avgBedPct  = bedTimes.length
    ? bedTimes.reduce((s, v) => s + ((v - RANGE_START) / RANGE_TOTAL) * 100, 0) / bedTimes.length
    : null
  const avgWakePct = wakeTimes.length
    ? wakeTimes.reduce((s, v) => s + ((v - RANGE_START) / RANGE_TOTAL) * 100, 0) / wakeTimes.length
    : null

  const avgStres = days.filter(d => d.stres !== null).length
    ? Math.round(days.filter(d => d.stres !== null).reduce((s, d) => s + d.stres, 0) / days.filter(d => d.stres !== null).length)
    : null
  const avgHRV = days.filter(d => d.hrv !== null).length
    ? Math.round(days.filter(d => d.hrv !== null).reduce((s, d) => s + d.hrv, 0) / days.filter(d => d.hrv !== null).length)
    : null

  return (
    <div className="card" style={{ marginBottom: 16 }}>

      {/* header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
        <h3 style={{ margin: 0 }}>Spanec — zadnjih {days.length} dni</h3>
        <div style={{ display: 'flex', gap: 10, fontFamily: 'DM Mono', fontSize: 11, flexWrap: 'wrap' }}>
          {consistencyScore !== null && (
            <span style={{ color: '#475569' }}>
              konsistentnost:&nbsp;
              <span style={{ color: consistencyScore >= 75 ? COLOR_GOOD : consistencyScore >= 55 ? COLOR_WARN : COLOR_BAD, fontWeight: 600 }}>
                {consistencyScore}%
              </span>
            </span>
          )}
          {avgDurMin && (
            <span style={{ color: '#475569' }}>
              povp.:&nbsp;
              <span style={{ color: durColor(avgDurMin), fontWeight: 600 }}>{durStr(avgDurMin)}</span>
            </span>
          )}
          {sleepDebt !== null && (
            <span style={{ color: '#475569' }}>
              sleep debt:&nbsp;
              <span style={{ color: sleepDebt > 0 ? COLOR_BAD : COLOR_GOOD, fontWeight: 600 }}>
                {sleepDebt > 0 ? '+' : ''}{sleepDebt}h
              </span>
            </span>
          )}
        </div>
      </div>

      {hasTimes ? (
        /* ── Gantt prikaz (čas leganja → vstajanja) ── */
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

            {/* Avg bedtime */}
            {avgBedPct !== null && (
              <div style={{ position: 'absolute', top: `${avgBedPct}%`, left: 0, right: 0, zIndex: 3, pointerEvents: 'none' }}>
                <div style={{ borderTop: '1.5px dashed #f59e0b' }} />
                <div style={{ position: 'absolute', right: 2, top: -14, fontSize: 9, color: '#f59e0b', fontFamily: 'DM Mono' }}>
                  ø {String(Math.floor((RANGE_START + avgBedPct / 100 * RANGE_TOTAL) / 60) % 24).padStart(2,'0')}:
                  {String(Math.round((RANGE_START + avgBedPct / 100 * RANGE_TOTAL) % 60)).padStart(2,'0')}
                </div>
              </div>
            )}

            {/* Avg waketime */}
            {avgWakePct !== null && (
              <div style={{ position: 'absolute', top: `${avgWakePct}%`, left: 0, right: 0, zIndex: 3, pointerEvents: 'none' }}>
                <div style={{ borderTop: '1.5px dashed #38bdf8' }} />
                <div style={{ position: 'absolute', right: 2, top: 3, fontSize: 9, color: '#38bdf8', fontFamily: 'DM Mono' }}>
                  ø {String(Math.floor((RANGE_START + avgWakePct / 100 * RANGE_TOTAL) / 60) % 24).padStart(2,'0')}:
                  {String(Math.round((RANGE_START + avgWakePct / 100 * RANGE_TOTAL) % 60)).padStart(2,'0')}
                </div>
              </div>
            )}

            {/* Day columns */}
            <div style={{ display: 'flex', height: '100%', gap: 4 }}>
              {days.map((d, i) => {
                const topPct  = d.bed  ? offsetPct(d.bed)  : null
                const botPct  = d.wake ? offsetPct(d.wake) : null
                const hPct    = topPct !== null && botPct !== null ? botPct - topPct : null
                const isSel   = selected === i
                const color   = durColor(d.dur)
                const barH    = hPct !== null ? hPct / 100 * CHART_H : 0

                const tipStyle = i < 3
                  ? { left: 0, transform: 'none' }
                  : i > days.length - 4
                    ? { right: 0, left: 'auto', transform: 'none' }
                    : { left: '50%', transform: 'translateX(-50%)' }

                return (
                  <div
                    key={d.datum}
                    style={{ flex: 1, position: 'relative', cursor: 'pointer' }}
                    onClick={() => setSelected(isSel ? null : i)}
                  >
                    {/* Sleep bar */}
                    {topPct !== null && hPct !== null && (
                      <div style={{
                        position: 'absolute',
                        top: `${topPct}%`, left: 0, right: 0,
                        height: `${hPct}%`,
                        background: isSel ? `${color}33` : `${color}18`,
                        border: `1px solid ${isSel ? color : color + '55'}`,
                        borderRadius: 4,
                        transition: 'border-color .15s, background .15s',
                        zIndex: 1,
                      }}>
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
                            {d.dur ? `${Math.floor(d.dur/60)}:${String(d.dur%60).padStart(2,'0')}` : ''}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Tooltip */}
                    {isSel && (
                      <div style={{
                        position: 'absolute',
                        top: topPct !== null ? `${topPct}%` : '30%',
                        ...tipStyle,
                        marginTop: -100,
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
                        {d.bed  && <div style={{ color: '#94a3b8', marginBottom: 2 }}>Spanje:&nbsp;<span style={{ color: '#f59e0b' }}>{d.bed}</span></div>}
                        {d.wake && <div style={{ color: '#94a3b8', marginBottom: 6 }}>Prebujenje:&nbsp;<span style={{ color: '#38bdf8' }}>{d.wake}</span></div>}
                        {d.dur  && <div style={{ color, fontWeight: 600, marginBottom: 4 }}>⏱ {durStr(d.dur)}</div>}
                        {d.hrv   !== null && <div style={{ color: '#94a3b8' }}>HRV: <span style={{ color: d.hrv > 50 ? COLOR_GOOD : d.hrv > 35 ? COLOR_WARN : COLOR_BAD }}>{d.hrv} ms</span></div>}
                        {d.stres !== null && <div style={{ color: '#94a3b8' }}>Stres: <span style={{ color: d.stres < 25 ? COLOR_GOOD : d.stres < 50 ? COLOR_WARN : COLOR_BAD }}>{d.stres}</span></div>}
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
                      <div style={{ fontSize: 10, color: isSel ? '#93c5fd' : '#475569', fontFamily: 'DM Mono', whiteSpace: 'nowrap' }}>{d.day}</div>
                      <div style={{ fontSize: 9, color: '#334155', fontFamily: 'DM Mono' }}>{d.date}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ) : (
        /* ── Fallback: samo trajanje (če časi še niso sinhronizirani) ── */
        <div style={{ display: 'flex', marginBottom: 36 }}>
          <div style={{ width: 36, position: 'relative', height: 200, flexShrink: 0 }}>
            {[4,5,6,7,8,9,10].map(h => {
              const pct = 100 - ((h - 4) / 6) * 100
              return (
                <div key={h} style={{ position: 'absolute', top: `${pct}%`, right: 6, transform: 'translateY(-50%)', fontSize: 10, color: h === 8 ? '#f59e0b' : '#334155', fontFamily: 'DM Mono', whiteSpace: 'nowrap' }}>{h}h</div>
              )
            })}
          </div>
          <div style={{ flex: 1, position: 'relative', height: 200 }}>
            {[4,5,6,7,8,9,10].map(h => (
              <div key={h} style={{ position: 'absolute', top: `${100 - ((h-4)/6)*100}%`, left: 0, right: 0, height: 1, background: h === 8 ? '#f59e0b44' : '#0f172a' }} />
            ))}
            <div style={{ display: 'flex', height: '100%', gap: 4 }}>
              {days.map((d, i) => {
                const hVal = d.h || 0
                const barH = ((Math.min(hVal, 10) - 4) / 6) * 100
                const isSel = selected === i
                const color = durColor(d.dur)
                return (
                  <div key={d.datum} style={{ flex: 1, position: 'relative', cursor: 'pointer' }} onClick={() => setSelected(isSel ? null : i)}>
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${Math.max(0, barH)}%`, background: isSel ? `${color}33` : `${color}18`, border: `1px solid ${isSel ? color : color + '55'}`, borderRadius: '4px 4px 0 0' }} />
                    <div style={{ position: 'absolute', bottom: -34, left: '50%', transform: 'translateX(-50%)', textAlign: 'center', pointerEvents: 'none' }}>
                      <div style={{ fontSize: 10, color: isSel ? '#93c5fd' : '#475569', fontFamily: 'DM Mono', whiteSpace: 'nowrap' }}>{d.day}</div>
                      <div style={{ fontSize: 9, color: '#334155', fontFamily: 'DM Mono' }}>{d.date}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* legend */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 14, fontSize: 10, fontFamily: 'DM Mono', flexWrap: 'wrap' }}>
        <span style={{ color: COLOR_GOOD }}>■ ≥7h</span>
        <span style={{ color: COLOR_WARN }}>■ 6–7h</span>
        <span style={{ color: COLOR_BAD  }}>■ &lt;6h</span>
        {hasTimes && <><span style={{ color: '#f59e0b', marginLeft: 8 }}>— — ø spanje</span><span style={{ color: '#38bdf8' }}>— — ø prebujenje</span></>}
      </div>

      {/* metric cards */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {consistencyScore !== null && (
          <div style={{ flex: '1 1 80px', minWidth: 0, padding: '10px 12px', background: '#080e1c', border: '1px solid #1e2433', borderRadius: 8 }}>
            <div style={{ fontSize: 9, color: '#475569', fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>Konsistentnost</div>
            <div style={{ fontSize: 22, fontWeight: 300, fontFamily: 'DM Mono', lineHeight: 1, marginBottom: 6, color: consistencyScore >= 75 ? COLOR_GOOD : consistencyScore >= 55 ? COLOR_WARN : COLOR_BAD }}>
              {mounted ? <CountUp to={consistencyScore} unit="%" /> : '0%'}
            </div>
            <div style={{ fontSize: 10, fontFamily: 'DM Mono', color: '#475569' }}>
              {bedStdDev !== null ? `σ leganje ±${bedStdDev}min` : `σ ±${Math.round(stdDev(daysWithDur.map(d=>d.dur)))}min`}
            </div>
          </div>
        )}

        {sleepDebt !== null && (
          <div style={{ flex: '1 1 80px', minWidth: 0, padding: '10px 12px', background: '#080e1c', border: `1px solid ${sleepDebt > 2 ? '#450a0a' : '#1e2433'}`, borderRadius: 8 }}>
            <div style={{ fontSize: 9, color: '#475569', fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>Sleep Debt</div>
            <div style={{ fontSize: 22, fontWeight: 300, fontFamily: 'DM Mono', lineHeight: 1, marginBottom: 6, color: sleepDebt <= 0 ? COLOR_GOOD : sleepDebt <= 3 ? COLOR_WARN : COLOR_BAD }}>
              {sleepDebt > 0 ? '+' : ''}{sleepDebt}h
            </div>
            <div style={{ fontSize: 10, fontFamily: 'DM Mono', color: '#475569' }}>vs 8h/dan cilj</div>
          </div>
        )}

        {avgStres !== null && (
          <div style={{ flex: '1 1 80px', minWidth: 0, padding: '10px 12px', background: '#080e1c', border: '1px solid #1e2433', borderRadius: 8 }}>
            <div style={{ fontSize: 9, color: '#475569', fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>Stres (povp.)</div>
            <div style={{ fontSize: 22, fontWeight: 300, fontFamily: 'DM Mono', lineHeight: 1, marginBottom: 6, color: avgStres < 25 ? COLOR_GOOD : avgStres < 50 ? COLOR_WARN : COLOR_BAD }}>
              {mounted ? <CountUp to={avgStres} unit="" /> : avgStres}
            </div>
            <div style={{ fontSize: 10, fontFamily: 'DM Mono', color: '#475569' }}>&lt;25 nizek · &gt;50 visok</div>
          </div>
        )}

        {avgHRV !== null && (
          <div style={{ flex: '1 1 80px', minWidth: 0, padding: '10px 12px', background: '#080e1c', border: '1px solid #1e2433', borderRadius: 8 }}>
            <div style={{ fontSize: 9, color: '#475569', fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>HRV (povp.)</div>
            <div style={{ fontSize: 22, fontWeight: 300, fontFamily: 'DM Mono', lineHeight: 1, marginBottom: 6, color: avgHRV > 50 ? COLOR_GOOD : avgHRV > 35 ? COLOR_WARN : COLOR_BAD }}>
              {mounted ? <CountUp to={avgHRV} unit=" ms" /> : `${avgHRV} ms`}
            </div>
            <div style={{ fontSize: 10, fontFamily: 'DM Mono', color: '#475569' }}>&gt;50 dobro · &lt;35 slabo</div>
          </div>
        )}
      </div>
    </div>
  )
}
