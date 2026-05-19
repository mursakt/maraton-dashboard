import React from 'react'
import { isTek, fmt, hrZonaColor } from '../utils/helpers'

export function AnalizaTeka({ workouts, metrike, prehrana }) {
  const [analiza, setAnaliza] = React.useState(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState(null)

  const zadnjiTek = workouts.find(w => isTek(w))

  React.useEffect(() => {
    if (!zadnjiTek) return
    fetchAnaliza()
  }, [zadnjiTek?.garmin_activity_id])

  async function fetchAnaliza() {
    if (!zadnjiTek) return
    setLoading(true)
    setError(null)

    const tekDatum = zadnjiTek.datum
    const danPred = new Date(new Date(tekDatum) - 86400000).toISOString().slice(0, 10)
    const metrikeDanPred = metrike.find(m => m.datum === danPred) || {}
    const prehranaVceraj = prehrana.find(p => p.datum === danPred && p.kalorije_skupaj > 0) || {}
    const metrikeTekDan = metrike.find(m => m.datum === tekDatum) || {}
    const hrDrift = zadnjiTek.max_hr && zadnjiTek.povprecni_hr ? zadnjiTek.max_hr - zadnjiTek.povprecni_hr : null

    const podatki = [
      "PODATKI TEKA (" + tekDatum + "):",
      "- Naziv: " + zadnjiTek.naziv,
      "- Razdalja: " + zadnjiTek.razdalja_km + " km",
      "- Čas: " + zadnjiTek.trajanje_min + " min",
      "- Povprečni tempo: " + (zadnjiTek.povprecni_tempo || 'ni podatka') + " /km",
      "- Povprečni HR: " + zadnjiTek.povprecni_hr + " bpm",
      "- Max HR: " + zadnjiTek.max_hr + " bpm",
      "- HR razpon max-avg (cardiac drift indikator): " + (hrDrift ? hrDrift + " bpm" : "ni podatka"),
      "- Aerobni Training Effect: " + (zadnjiTek.aerobni_te || "ni podatka"),
      "- Anaerobni Training Effect: " + (zadnjiTek.anaerobni_te || "ni podatka"),
      "- VO2max: " + (zadnjiTek.vo2max || "ni podatka"),
      "- Kalorije: " + (zadnjiTek.kalorije || "ni podatka") + " kcal",
      "",
      "DAN PRED TEKOM (" + danPred + "):",
      "- Kalorije: " + (prehranaVceraj.kalorije_skupaj ? Math.round(prehranaVceraj.kalorije_skupaj) + " kcal" : "ni podatka"),
      "- Ogljikovi hidrati: " + (prehranaVceraj.ogljikovi_hidrati_g ? Math.round(prehranaVceraj.ogljikovi_hidrati_g) + "g" : "ni podatka"),
      "- Beljakovine: " + (prehranaVceraj.beljakovine_g ? Math.round(prehranaVceraj.beljakovine_g) + "g" : "ni podatka"),
      "- HRV: " + (metrikeDanPred.hrv ? metrikeDanPred.hrv + " ms" : "ni podatka"),
      "- Spanje: " + (metrikeDanPred.spanje_h ? metrikeDanPred.spanje_h + " h" : "ni podatka"),
      "- Stres: " + (metrikeDanPred.stres_povprecje || "ni podatka"),
      "",
      "DAN TEKA:",
      "- HRV: " + (metrikeTekDan.hrv ? metrikeTekDan.hrv + " ms" : "ni podatka"),
      "- Stres: " + (metrikeTekDan.stres_povprecje || "ni podatka"),
    ].join("\n")

    const prompt = "Si strokovnjak za analizo teka in maratonske priprave. Analiziraj naslednji tek in pojasni zakaj je bil lahek ali težak. Bodi konkreten, ne splošen. Piši v slovenščini. NE omenjaj ciljev ali priporočil - samo analiziraj kaj se je zgodilo na podlagi podatkov.\n\n" + podatki + "\n\nAnaliziraj:\n1. Tempo in HR dinamika (je bil cardiac drift prisoten glede na razliko max-avg HR?)\n2. Vpliv prehrane dan prej na glikogenske rezerve\n3. Vpliv spanja in HRV na regeneracijo\n4. Kaj pove Training Effect o naporu\n5. Splošna ocena\n\nOdgovori SAMO z JSON formatom brez markdown:\n{\"ocena\": \"težak ali zmerno ali lahek\", \"emoji\": \"emoji\", \"tocke\": [\"točka1\", \"točka2\", \"točka3\", \"točka4\", \"točka5\"]}"

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }]
        })
      })
      const data = await response.json()
      const text = data.content && data.content[0] ? data.content[0].text : ''
      const start = text.indexOf('{')
      const end = text.lastIndexOf('}')
      if (start !== -1 && end !== -1) {
        const parsed = JSON.parse(text.slice(start, end + 1))
        setAnaliza(parsed)
      } else {
        setError('Napaka pri analizi')
      }
    } catch(e) {
      setError('Napaka: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  if (!zadnjiTek) return null

  const ocenaColor = analiza ? (analiza.ocena === 'težak' ? '#fcd34d' : analiza.ocena === 'lahek' ? '#86efac' : '#94a3b8') : '#94a3b8'
  const ocenaBg = analiza ? (analiza.ocena === 'težak' ? '#45180333' : analiza.ocena === 'lahek' ? '#05291633' : '#1e243333') : '#1e243333'

  return (
    <div className="card" style={{marginBottom:16}}>
      <h3>🤖 AI Analiza zadnjega teka — {zadnjiTek.naziv} ({zadnjiTek.datum})</h3>
      <div style={{display:'flex',gap:16,marginBottom:12,flexWrap:'wrap',alignItems:'center'}}>
        <span style={{fontFamily:'DM Mono',fontSize:13,color:'#94a3b8'}}>{fmt(zadnjiTek.razdalja_km)} km</span>
        <span style={{fontFamily:'DM Mono',fontSize:13,color:'#94a3b8'}}>{zadnjiTek.povprecni_tempo}/km</span>
        <span style={{fontFamily:'DM Mono',fontSize:13,color:hrZonaColor(zadnjiTek.povprecni_hr)}}>{zadnjiTek.povprecni_hr} avg · {zadnjiTek.max_hr} max bpm</span>
        <span style={{fontFamily:'DM Mono',fontSize:12,color:'#64748b'}}>TE: {fmt(zadnjiTek.aerobni_te,1)}</span>
        {analiza && (
          <span style={{fontSize:13,padding:'2px 10px',borderRadius:4,background:ocenaBg,color:ocenaColor,fontWeight:600}}>
            {analiza.emoji} {analiza.ocena.charAt(0).toUpperCase() + analiza.ocena.slice(1)}
          </span>
        )}
      </div>
      {loading && (
        <div style={{padding:'16px 0',color:'#64748b',fontSize:13}}>⟳ Claude analizira tek...</div>
      )}
      {error && <div className="alert warn">{error}</div>}
      {analiza && (
        <div>
          {analiza.tocke.map((t, i) => (
            <div key={i} style={{display:'flex',gap:10,padding:'8px 12px',borderRadius:6,marginBottom:6,background:'#0f172a',border:'1px solid #1e2433',fontSize:13,color:'#94a3b8',alignItems:'flex-start'}}>
              <span style={{color:'#475569',fontFamily:'DM Mono',fontSize:11,minWidth:20,marginTop:1}}>{i+1}.</span>
              <span style={{lineHeight:1.5}}>{t}</span>
            </div>
          ))}
        </div>
      )}
      {!loading && !analiza && !error && (
        <button onClick={fetchAnaliza} style={{padding:'8px 16px',background:'#1e2433',border:'1px solid #2d3748',borderRadius:6,color:'#94a3b8',cursor:'pointer',fontSize:13}}>
          Analiziraj tek
        </button>
      )}
    </div>
  )
}
