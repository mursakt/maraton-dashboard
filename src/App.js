import React, { useState, useEffect } from 'react'
import { supabase } from './supabase'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts'

// ── Plan data ──────────────────────────────────────────────────────────────
const PLAN = [
  { teden: 1,  datum: '2026-04-20', faza: 'F1', km: 11,  ciljnaKg: 97.0 },
  { teden: 2,  datum: '2026-04-27', faza: 'F1', km: 22,  ciljnaKg: 96.5 },
  { teden: 3,  datum: '2026-05-04', faza: 'F1', km: 24,  ciljnaKg: 96.0 },
  { teden: 4,  datum: '2026-05-11', faza: 'F1', km: 28,  ciljnaKg: 95.5 },
  { teden: 5,  datum: '2026-05-18', faza: 'F1', km: 29,  ciljnaKg: 95.0 },
  { teden: 6,  datum: '2026-05-25', faza: 'F1', km: 21,  ciljnaKg: 96.0 },
  { teden: 7,  datum: '2026-06-01', faza: 'F2', km: 27,  ciljnaKg: 94.5 },
  { teden: 8,  datum: '2026-06-08', faza: 'F2', km: 30,  ciljnaKg: 94.0 },
  { teden: 9,  datum: '2026-06-15', faza: 'F2', km: 31,  ciljnaKg: 93.5 },
  { teden: 10, datum: '2026-06-22', faza: 'F2', km: 34,  ciljnaKg: 93.0 },
  { teden: 11, datum: '2026-06-29', faza: 'F2', km: 36,  ciljnaKg: 92.5 },
  { teden: 12, datum: '2026-07-06', faza: 'F2', km: 26,  ciljnaKg: 92.0 },
  { teden: 13, datum: '2026-07-13', faza: 'F2', km: 38,  ciljnaKg: 91.5 },
  { teden: 14, datum: '2026-07-20', faza: 'F2', km: 39,  ciljnaKg: 91.0 },
  { teden: 15, datum: '2026-07-27', faza: 'F3', km: 44,  ciljnaKg: 90.5 },
  { teden: 16, datum: '2026-08-03', faza: 'F3', km: 48,  ciljnaKg: 90.0 },
  { teden: 17, datum: '2026-08-10', faza: 'F3', km: 52,  ciljnaKg: 89.5 },
  { teden: 18, datum: '2026-08-17', faza: 'F3', km: 32,  ciljnaKg: 89.0 },
  { teden: 19, datum: '2026-08-24', faza: 'F3', km: 52,  ciljnaKg: 88.5 },
  { teden: 20, datum: '2026-08-31', faza: 'F3', km: 57,  ciljnaKg: 88.0 },
  { teden: 21, datum: '2026-09-07', faza: 'F4', km: 38,  ciljnaKg: 87.0 },
  { teden: 22, datum: '2026-09-14', faza: 'F4', km: 28,  ciljnaKg: 86.5 },
  { teden: 23, datum: '2026-09-21', faza: 'F4', km: 19,  ciljnaKg: 86.0 },
  { teden: 24, datum: '2026-09-28', faza: 'F4', km: 42,  ciljnaKg: 85.0 },
]

const FAZA_COLOR = { F1: '#3b82f6', F2: '#eab308', F3: '#ef4444', F4: '#22c55e' }
const FAZA_LABEL = { F1: 'Faza 1 – Baza', F2: 'Faza 2 – Gradnja', F3: 'Faza 3 – Specifika', F4: 'Tapering' }

const TODAY = new Date('2026-05-15')

function getCurrentTeden() {
  for (let i = PLAN.length - 1; i >= 0; i--) {
    if (new Date(PLAN[i].datum) <= TODAY) return PLAN[i].teden
  }
  return 1
}

// ── Helpers ────────────────────────────────────────────────────────────────
function fmt(val, dec = 1) {
  if (val == null || isNaN(val)) return '—'
  return Number(val).toFixed(dec)
}

function hrZona(hr) {
  if (!hr) return '—'
  if (hr < 123) return 'Z0'
  if (hr < 138) return 'Z1'
  if (hr < 154) return 'Z2'
  if (hr < 169) return 'Z3'
  if (hr < 185) return 'Z4'
  return 'Z5'
}

function hrZonaColor(hr) {
  if (!hr) return '#6b7280'
  if (hr < 138) return '#22c55e'
  if (hr < 154) return '#3b82f6'
  if (hr < 169) return '#eab308'
  if (hr < 185) return '#f97316'
  return '#ef4444'
}

// ── CSS ────────────────────────────────────────────────────────────────────
const css = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0a0a0f; color: #e2e8f0; font-family: 'DM Sans', sans-serif; }
  ::-webkit-scrollbar { width: 6px; } 
  ::-webkit-scrollbar-track { background: #111; }
  ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }

  .app { min-height: 100vh; padding: 24px; max-width: 1200px; margin: 0 auto; }

  .header { display: flex; align-items: baseline; gap: 16px; margin-bottom: 32px; border-bottom: 1px solid #1e2433; padding-bottom: 20px; }
  .header h1 { font-size: 22px; font-weight: 600; letter-spacing: -0.5px; }
  .header .sub { font-size: 13px; color: #64748b; font-family: 'DM Mono', monospace; }
  .header .teden-badge { margin-left: auto; background: #1e2433; border: 1px solid #2d3748; border-radius: 8px; padding: 6px 14px; font-family: 'DM Mono', monospace; font-size: 12px; color: #94a3b8; }
  .header .teden-badge span { color: #e2e8f0; font-weight: 500; }

  .tabs { display: flex; gap: 4px; margin-bottom: 24px; background: #111827; border-radius: 10px; padding: 4px; width: fit-content; }
  .tab { padding: 8px 18px; border-radius: 7px; font-size: 13px; font-weight: 500; cursor: pointer; border: none; background: transparent; color: #64748b; transition: all 0.15s; }
  .tab.active { background: #1e2433; color: #e2e8f0; }
  .tab:hover:not(.active) { color: #94a3b8; }

  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
  .grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-bottom: 16px; }
  .grid4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 16px; }

  .card { background: #111827; border: 1px solid #1e2433; border-radius: 12px; padding: 20px; }
  .card.full { grid-column: 1 / -1; }
  .card h3 { font-size: 11px; font-weight: 500; color: #64748b; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 14px; }

  .stat-val { font-size: 32px; font-weight: 300; font-family: 'DM Mono', monospace; letter-spacing: -1px; }
  .stat-unit { font-size: 14px; color: #64748b; margin-left: 4px; }
  .stat-sub { font-size: 12px; color: #475569; margin-top: 4px; font-family: 'DM Mono', monospace; }

  .progress-bar { height: 6px; background: #1e2433; border-radius: 3px; overflow: hidden; margin: 8px 0; }
  .progress-fill { height: 100%; border-radius: 3px; transition: width 0.5s ease; }

  .workout-list { display: flex; flex-direction: column; gap: 8px; }
  .workout-item { display: flex; align-items: center; gap: 12px; padding: 12px 14px; background: #0f172a; border-radius: 8px; border: 1px solid #1e2433; }
  .workout-item .date { font-family: 'DM Mono', monospace; font-size: 11px; color: #475569; min-width: 52px; }
  .workout-item .type { font-size: 12px; font-weight: 500; color: #94a3b8; min-width: 100px; }
  .workout-item .detail { font-family: 'DM Mono', monospace; font-size: 12px; color: #64748b; }
  .workout-item .hr-badge { margin-left: auto; font-family: 'DM Mono', monospace; font-size: 11px; padding: 2px 8px; border-radius: 4px; font-weight: 500; }

  .alert { display: flex; gap: 10px; padding: 12px 14px; border-radius: 8px; font-size: 13px; margin-bottom: 10px; }
  .alert.warn { background: #451a03; border: 1px solid #78350f; color: #fcd34d; }
  .alert.ok { background: #052e16; border: 1px solid #14532d; color: #86efac; }
  .alert.info { background: #0c1a2e; border: 1px solid #1e3a5f; color: #7dd3fc; }

  .plan-row { display: flex; gap: 8px; align-items: center; padding: 10px 14px; border-radius: 8px; background: #0f172a; border: 1px solid #1e2433; margin-bottom: 6px; font-size: 13px; }
  .plan-row.current { border-color: #3b82f6; background: #0f1f3d; }
  .plan-row .t-num { font-family: 'DM Mono', monospace; font-size: 11px; color: #475569; min-width: 28px; }
  .plan-row .t-datum { font-family: 'DM Mono', monospace; font-size: 11px; color: #475569; min-width: 90px; }
  .plan-row .t-faza { font-size: 11px; padding: 2px 7px; border-radius: 4px; font-weight: 600; min-width: 50px; text-align: center; }
  .plan-row .t-km { font-family: 'DM Mono', monospace; font-size: 12px; color: #94a3b8; margin-left: auto; }
  .plan-row .t-kg { font-family: 'DM Mono', monospace; font-size: 11px; color: #475569; min-width: 60px; text-align: right; }

  .empty { text-align: center; padding: 40px; color: #475569; font-size: 13px; }

  .loading { display: flex; align-items: center; justify-content: center; height: 200px; color: #475569; font-family: 'DM Mono', monospace; font-size: 13px; }

  .nutrition-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #1e2433; }
  .nutrition-row:last-child { border-bottom: none; }
  .nutrition-label { font-size: 13px; color: #94a3b8; }
  .nutrition-val { font-family: 'DM Mono', monospace; font-size: 13px; }
  .nutrition-target { font-family: 'DM Mono', monospace; font-size: 11px; color: #475569; }

  @media (max-width: 768px) {
    .grid2, .grid3, .grid4 { grid-template-columns: 1fr; }
    .app { padding: 16px; }
    .tabs { flex-wrap: wrap; }
  }
`

// ── Components ─────────────────────────────────────────────────────────────
function StatCard({ title, value, unit, sub, color }) {
  return (
    <div className="card">
      <h3>{title}</h3>
      <div>
        <span className="stat-val" style={color ? { color } : {}}>{value}</span>
        {unit && <span className="stat-unit">{unit}</span>}
      </div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  )
}

function ProgressBar({ value, max, color = '#3b82f6' }) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  return (
    <div className="progress-bar">
      <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

// ── Main App ───────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState('pregled')
  const [workouts, setWorkouts] = useState([])
  const [metrike, setMetrike] = useState([])
  const [prehrana, setPrehrana] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const currentTeden = getCurrentTeden()

  useEffect(() => {
    async function fetchAll() {
      setLoading(true)
      try {
        const [w, m, p] = await Promise.all([
          supabase.from('workouts').select('*').order('datum', { ascending: false }).limit(60),
          supabase.from('dnevne_metrike').select('*').order('datum', { ascending: false }).limit(30),
          supabase.from('prehrana').select('*').order('datum', { ascending: false }).limit(30),
        ])
        if (w.error) throw w.error
        if (m.error) throw m.error
        if (p.error) throw p.error
        setWorkouts(w.data || [])
        setMetrike(m.data || [])
        setPrehrana(p.data || [])
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [])

  if (loading) return (
    <div className="app">
      <style>{css}</style>
      <div className="loading">Nalagam podatke iz Supabase…</div>
    </div>
  )

  if (error) return (
    <div className="app">
      <style>{css}</style>
      <div className="alert warn">⚠️ Napaka pri povezavi: {error}</div>
    </div>
  )

  return (
    <div className="app">
      <style>{css}</style>
      <Header currentTeden={currentTeden} />
      <div className="tabs">
        {['pregled', 'treningi', 'telo', 'prehrana', 'plan'].map(t => (
          <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {{ pregled: '🏠 Pregled', treningi: '🏃 Treningi', telo: '❤️ Telo & HRV', prehrana: '🥗 Prehrana', plan: '📅 Plan' }[t]}
          </button>
        ))}
      </div>
      {tab === 'pregled'  && <TabPregled workouts={workouts} metrike={metrike} prehrana={prehrana} currentTeden={currentTeden} />}
      {tab === 'treningi' && <TabTreningi workouts={workouts} />}
      {tab === 'telo'     && <TabTelo metrike={metrike} />}
      {tab === 'prehrana' && <TabPrehrana prehrana={prehrana} workouts={workouts} />}
      {tab === 'plan'     && <TabPlan currentTeden={currentTeden} />}
    </div>
  )
}

function Header({ currentTeden }) {
  const planTeden = PLAN.find(p => p.teden === currentTeden)
  const faza = planTeden?.faza || 'F1'
  return (
    <div className="header">
      <h1>🏁 Maraton Ljubljana 2026</h1>
      <span className="sub">Timmu · cilj 3:45 · 5. oktober</span>
      <div className="teden-badge">
        Teden <span>T{String(currentTeden).padStart(2, '0')}</span> · {' '}
        <span style={{ color: FAZA_COLOR[faza] }}>{FAZA_LABEL[faza]}</span>
      </div>
    </div>
  )
}

// ── TAB: PREGLED ───────────────────────────────────────────────────────────
function TabPregled({ workouts, metrike, prehrana, currentTeden }) {
  const planTeden = PLAN.find(p => p.teden === currentTeden)

  // km ta teden
  const tedStart = planTeden ? new Date(planTeden.datum) : new Date()
  const tedEnd = new Date(tedStart); tedEnd.setDate(tedEnd.getDate() + 7)
  const kmTaTeden = workouts
    .filter(w => { const d = new Date(w.datum); return d >= tedStart && d < tedEnd && w.tip?.toLowerCase().includes('tek') })
    .reduce((s, w) => s + (w.razdalja_km || 0), 0)

  // zadnje metrike
  const zadnjeMetrike = metrike[0] || {}
  const zadnjaTeza = metrike.find(m => m.teza)?.teza

  // alarms
  const alarms = []
  if (zadnjeMetrike.hrv && zadnjeMetrike.hrv < 40) alarms.push({ type: 'warn', msg: '⚠️ HRV nizek (' + zadnjeMetrike.hrv + 'ms) — razmisli o lažjem treningu danes' })
  if (zadnjeMetrike.spanje_ure && zadnjeMetrike.spanje_ure < 6.5) alarms.push({ type: 'warn', msg: '⚠️ Malo spanja (' + fmt(zadnjeMetrike.spanje_ure) + 'h) — regeneracija trpi' })
  if (zadnjaTeza && planTeden && zadnjaTeza > planTeden.ciljnaKg + 1) alarms.push({ type: 'info', msg: `ℹ️ Teža (${fmt(zadnjaTeza)}kg) je ${fmt(zadnjaTeza - planTeden.ciljnaKg)}kg nad planom` })
  if (alarms.length === 0) alarms.push({ type: 'ok', msg: '✅ Vse vrednosti v redu — nadaljuj po planu' })

  const kmPlan = planTeden?.km || 0
  const dniDoMaratona = Math.ceil((new Date('2026-10-04') - TODAY) / (1000 * 60 * 60 * 24))

  return (
    <>
      {alarms.map((a, i) => <div key={i} className={`alert ${a.type}`}>{a.msg}</div>)}
      <div className="grid4">
        <StatCard title="Teden programa" value={`T${String(currentTeden).padStart(2, '0')}`} sub={`od 24 — ${FAZA_LABEL[planTeden?.faza || 'F1']}`} />
        <StatCard title="Km ta teden" value={fmt(kmTaTeden)} unit="km" sub={`plan: ${kmPlan} km`} color={kmTaTeden >= kmPlan ? '#22c55e' : '#f97316'} />
        <StatCard title="Zadnja teža" value={zadnjaTeza ? fmt(zadnjaTeza) : '—'} unit="kg" sub={planTeden ? `cilj: ${planTeden.ciljnaKg} kg` : ''} />
        <StatCard title="Dni do maratona" value={dniDoMaratona} sub="4. oktober 2026" />
      </div>
      <div className="grid2">
        <div className="card">
          <h3>Km ta teden — napredek</h3>
          <ProgressBar value={kmTaTeden} max={kmPlan || 1} color={kmTaTeden >= kmPlan ? '#22c55e' : '#3b82f6'} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#475569', fontFamily: 'DM Mono', marginTop: 6 }}>
            <span>{fmt(kmTaTeden)} km opravljeno</span>
            <span>{kmPlan} km cilj</span>
          </div>
        </div>
        <div className="card">
          <h3>Pot do maratona</h3>
          <ProgressBar value={currentTeden} max={24} color='#ef4444' />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#475569', fontFamily: 'DM Mono', marginTop: 6 }}>
            <span>Teden {currentTeden}</span>
            <span>{Math.round((currentTeden / 24) * 100)}% opravljeno</span>
          </div>
        </div>
      </div>
      <div className="grid3">
        <StatCard title="HRV (zadnji)" value={zadnjeMetrike.hrv ? fmt(zadnjeMetrike.hrv, 0) : '—'} unit="ms" sub="cilj: >50ms" color={zadnjeMetrike.hrv > 50 ? '#22c55e' : zadnjeMetrike.hrv > 35 ? '#eab308' : '#ef4444'} />
        <StatCard title="Spanje (zadnje)" value={zadnjeMetrike.spanje_ure ? fmt(zadnjeMetrike.spanje_ure) : '—'} unit="h" sub="cilj: >7.5h" color={zadnjeMetrike.spanje_ure >= 7.5 ? '#22c55e' : zadnjeMetrike.spanje_ure >= 6.5 ? '#eab308' : '#ef4444'} />
        <StatCard title="Stres (zadnji)" value={zadnjeMetrike.stres ? fmt(zadnjeMetrike.stres, 0) : '—'} sub="cilj: <30" color={zadnjeMetrike.stres < 30 ? '#22c55e' : zadnjeMetrike.stres < 50 ? '#eab308' : '#ef4444'} />
      </div>
      <div className="card">
        <h3>Zadnji 5 treningov</h3>
        <div className="workout-list">
          {workouts.slice(0, 5).map((w, i) => (
            <div key={i} className="workout-item">
              <span className="date">{w.datum?.slice(5)}</span>
              <span className="type">{w.tip || '—'}</span>
              <span className="detail">{fmt(w.razdalja_km)} km · {w.tempo || '—'}/km · {fmt(w.trajanje_min, 0)} min</span>
              <span className="hr-badge" style={{ background: hrZonaColor(w.povprecni_hr) + '22', color: hrZonaColor(w.povprecni_hr) }}>
                {w.povprecni_hr ? `${w.povprecni_hr} bpm` : '—'}
              </span>
            </div>
          ))}
          {workouts.length === 0 && <div className="empty">Ni podatkov o treningih</div>}
        </div>
      </div>
    </>
  )
}

// ── TAB: TRENINGI ──────────────────────────────────────────────────────────
function TabTreningi({ workouts }) {
  const teki = workouts.filter(w => w.tip?.toLowerCase().includes('tek') || w.razdalja_km > 0)

  // km po tednih za graf
  const kmPoTednih = []
  const tedniMap = {}
  teki.forEach(w => {
    if (!w.datum) return
    const d = new Date(w.datum)
    const mon = new Date(d); mon.setDate(d.getDate() - d.getDay() + 1)
    const key = mon.toISOString().slice(0, 10)
    tedniMap[key] = (tedniMap[key] || 0) + (w.razdalja_km || 0)
  })
  Object.entries(tedniMap).sort().slice(-10).forEach(([k, v]) => {
    kmPoTednih.push({ teden: k.slice(5), km: Math.round(v * 10) / 10 })
  })

  const totalKm = teki.reduce((s, w) => s + (w.razdalja_km || 0), 0)
  const avgHR = teki.filter(w => w.povprecni_hr).reduce((s, w, _, a) => s + w.povprecni_hr / a.length, 0)
  const avgTempo = teki.filter(w => w.tempo).length

  return (
    <>
      <div className="grid3">
        <StatCard title="Skupaj km (vsi)" value={fmt(totalKm, 0)} unit="km" />
        <StatCard title="Povp. HR na tekih" value={avgHR ? fmt(avgHR, 0) : '—'} unit="bpm" sub={avgHR ? `Cona ${hrZona(avgHR)}` : ''} color={hrZonaColor(avgHR)} />
        <StatCard title="Število tekov" value={teki.length} sub="v bazi" />
      </div>
      <div className="card" style={{ marginBottom: 16 }}>
        <h3>Km po tednih</h3>
        {kmPoTednih.length > 0 ? (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={kmPoTednih} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2433" />
              <XAxis dataKey="teden" tick={{ fontSize: 11, fill: '#475569', fontFamily: 'DM Mono' }} />
              <YAxis tick={{ fontSize: 11, fill: '#475569', fontFamily: 'DM Mono' }} />
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1e2433', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="km" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : <div className="empty">Ni dovolj podatkov za graf</div>}
      </div>
      <div className="card">
        <h3>Vsi teki ({teki.length})</h3>
        <div className="workout-list" style={{ maxHeight: 400, overflowY: 'auto' }}>
          {teki.map((w, i) => (
            <div key={i} className="workout-item">
              <span className="date">{w.datum?.slice(5)}</span>
              <span className="type" style={{ fontSize: 11 }}>{w.tip || 'Tek'}</span>
              <span className="detail">{fmt(w.razdalja_km)} km · {w.tempo || '—'}/km</span>
              <span style={{ fontSize: 11, color: '#475569', fontFamily: 'DM Mono', marginLeft: 8 }}>TE {w.training_effect || '—'}</span>
              <span className="hr-badge" style={{ background: hrZonaColor(w.povprecni_hr) + '22', color: hrZonaColor(w.povprecni_hr) }}>
                {w.povprecni_hr || '—'} bpm
              </span>
            </div>
          ))}
          {teki.length === 0 && <div className="empty">Ni podatkov</div>}
        </div>
      </div>
    </>
  )
}

// ── TAB: TELO & HRV ───────────────────────────────────────────────────────
function TabTelo({ metrike }) {
  const tezaData = metrike.filter(m => m.teza).slice(0, 20).reverse().map(m => ({ datum: m.datum?.slice(5), teza: m.teza }))
  const hrvData = metrike.filter(m => m.hrv).slice(0, 20).reverse().map(m => ({ datum: m.datum?.slice(5), hrv: m.hrv }))
  const spanjeData = metrike.filter(m => m.spanje_ure).slice(0, 14).reverse().map(m => ({ datum: m.datum?.slice(5), ure: m.spanje_ure }))

  const zadnje = metrike[0] || {}
  const avgSpanje = metrike.filter(m => m.spanje_ure).slice(0, 7).reduce((s, m, _, a) => s + m.spanje_ure / a.length, 0)
  const avgHRV = metrike.filter(m => m.hrv).slice(0, 7).reduce((s, m, _, a) => s + m.hrv / a.length, 0)

  return (
    <>
      <div className="grid4">
        <StatCard title="Teža (zadnja)" value={zadnje.teza ? fmt(zadnje.teza) : '—'} unit="kg" />
        <StatCard title="HRV (zadnji)" value={zadnje.hrv ? fmt(zadnje.hrv, 0) : '—'} unit="ms" color={zadnje.hrv > 50 ? '#22c55e' : zadnje.hrv > 35 ? '#eab308' : '#ef4444'} />
        <StatCard title="Spanje povp. 7d" value={avgSpanje ? fmt(avgSpanje) : '—'} unit="h" color={avgSpanje >= 7.5 ? '#22c55e' : avgSpanje >= 6.5 ? '#eab308' : '#ef4444'} />
        <StatCard title="HRV povp. 7d" value={avgHRV ? fmt(avgHRV, 0) : '—'} unit="ms" color={avgHRV > 50 ? '#22c55e' : avgHRV > 35 ? '#eab308' : '#ef4444'} />
      </div>
      <div className="grid2">
        <div className="card">
          <h3>Teža (kg)</h3>
          {tezaData.length > 1 ? (
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={tezaData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2433" />
                <XAxis dataKey="datum" tick={{ fontSize: 10, fill: '#475569', fontFamily: 'DM Mono' }} />
                <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: '#475569', fontFamily: 'DM Mono' }} />
                <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1e2433', borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="teza" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : <div className="empty">Ni dovolj podatkov</div>}
        </div>
        <div className="card">
          <h3>HRV (ms)</h3>
          {hrvData.length > 1 ? (
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={hrvData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2433" />
                <XAxis dataKey="datum" tick={{ fontSize: 10, fill: '#475569', fontFamily: 'DM Mono' }} />
                <YAxis tick={{ fontSize: 10, fill: '#475569', fontFamily: 'DM Mono' }} />
                <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1e2433', borderRadius: 8, fontSize: 12 }} />
                <ReferenceLine y={50} stroke="#22c55e" strokeDasharray="4 4" />
                <Line type="monotone" dataKey="hrv" stroke="#22c55e" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : <div className="empty">Ni dovolj podatkov</div>}
        </div>
      </div>
      <div className="card">
        <h3>Spanje (ure) — zadnjih 14 dni</h3>
        {spanjeData.length > 1 ? (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={spanjeData} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2433" />
              <XAxis dataKey="datum" tick={{ fontSize: 10, fill: '#475569', fontFamily: 'DM Mono' }} />
              <YAxis domain={[4, 10]} tick={{ fontSize: 10, fill: '#475569', fontFamily: 'DM Mono' }} />
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1e2433', borderRadius: 8, fontSize: 12 }} />
              <ReferenceLine y={7.5} stroke="#22c55e" strokeDasharray="4 4" />
              <Bar dataKey="ure" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : <div className="empty">Ni dovolj podatkov</div>}
      </div>
    </>
  )
}

// ── TAB: PREHRANA ─────────────────────────────────────────────────────────
function TabPrehrana({ prehrana, workouts }) {
  const zadnja = prehrana[0] || {}

  // povprečja 7 dni
  const zadnjih7 = prehrana.slice(0, 7)
  const avgKcal = zadnjih7.filter(p => p.kalorije).reduce((s, p, _, a) => s + p.kalorije / a.length, 0)
  const avgBelj = zadnjih7.filter(p => p.beljakovine).reduce((s, p, _, a) => s + p.beljakovine / a.length, 0)
  const avgOH = zadnjih7.filter(p => p.ogljikovi_hidrati).reduce((s, p, _, a) => s + p.ogljikovi_hidrati / a.length, 0)
  const avgMasc = zadnjih7.filter(p => p.mascobe).reduce((s, p, _, a) => s + p.mascobe / a.length, 0)

  // kalorije zadnjih 14 dni za graf
  const kcalData = prehrana.filter(p => p.kalorije).slice(0, 14).reverse().map(p => ({
    datum: p.datum?.slice(5),
    kcal: p.kalorije,
    belj: p.beljakovine,
  }))

  // beljakovine cilj: ~2g/kg teže (~190g)
  const beljCilj = 190

  return (
    <>
      <div className="grid4">
        <StatCard title="Kalorije (danes)" value={zadnja.kalorije ? fmt(zadnja.kalorije, 0) : '—'} unit="kcal" />
        <StatCard title="Beljakovine (danes)" value={zadnja.beljakovine ? fmt(zadnja.beljakovine, 0) : '—'} unit="g" sub={`cilj: ${beljCilj}g`} color={zadnja.beljakovine >= beljCilj ? '#22c55e' : zadnja.beljakovine >= beljCilj * 0.8 ? '#eab308' : '#ef4444'} />
        <StatCard title="OH (danes)" value={zadnja.ogljikovi_hidrati ? fmt(zadnja.ogljikovi_hidrati, 0) : '—'} unit="g" />
        <StatCard title="Maščobe (danes)" value={zadnja.mascobe ? fmt(zadnja.mascobe, 0) : '—'} unit="g" />
      </div>
      <div className="grid2">
        <div className="card">
          <h3>Povprečje 7 dni</h3>
          <div className="nutrition-row">
            <span className="nutrition-label">Kalorije</span>
            <div style={{ textAlign: 'right' }}>
              <div className="nutrition-val">{avgKcal ? fmt(avgKcal, 0) : '—'} kcal</div>
            </div>
          </div>
          <div className="nutrition-row">
            <span className="nutrition-label">Beljakovine</span>
            <div style={{ textAlign: 'right' }}>
              <div className="nutrition-val" style={{ color: avgBelj >= beljCilj ? '#22c55e' : '#f97316' }}>{avgBelj ? fmt(avgBelj, 0) : '—'} g</div>
              <div className="nutrition-target">cilj {beljCilj}g</div>
            </div>
          </div>
          <div className="nutrition-row">
            <span className="nutrition-label">Ogljikovi hidrati</span>
            <div className="nutrition-val">{avgOH ? fmt(avgOH, 0) : '—'} g</div>
          </div>
          <div className="nutrition-row">
            <span className="nutrition-label">Maščobe</span>
            <div className="nutrition-val">{avgMasc ? fmt(avgMasc, 0) : '—'} g</div>
          </div>
        </div>
        <div className="card">
          <h3>Kalorije — zadnjih 14 dni</h3>
          {kcalData.length > 1 ? (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={kcalData} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2433" />
                <XAxis dataKey="datum" tick={{ fontSize: 10, fill: '#475569', fontFamily: 'DM Mono' }} />
                <YAxis tick={{ fontSize: 10, fill: '#475569', fontFamily: 'DM Mono' }} />
                <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1e2433', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="kcal" fill="#f97316" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="empty">Ni dovolj podatkov</div>}
        </div>
      </div>
    </>
  )
}

// ── TAB: PLAN ─────────────────────────────────────────────────────────────
function TabPlan({ currentTeden }) {
  return (
    <div className="card full">
      <h3>24-tedenski program</h3>
      <div style={{ maxHeight: 520, overflowY: 'auto', marginTop: 8 }}>
        {PLAN.map(p => (
          <div key={p.teden} className={`plan-row ${p.teden === currentTeden ? 'current' : ''}`}>
            {p.teden === currentTeden && <span style={{ fontSize: 10, color: '#3b82f6', marginRight: 4 }}>▶</span>}
            <span className="t-num">T{String(p.teden).padStart(2, '0')}</span>
            <span className="t-datum">{p.datum}</span>
            <span className="t-faza" style={{ background: FAZA_COLOR[p.faza] + '22', color: FAZA_COLOR[p.faza] }}>{p.faza}</span>
            <span style={{ fontSize: 13, color: '#94a3b8', flex: 1 }}>{FAZA_LABEL[p.faza]}</span>
            <span className="t-km">{p.km} km</span>
            <span className="t-kg">{p.ciljnaKg} kg</span>
          </div>
        ))}
      </div>
    </div>
  )
}
