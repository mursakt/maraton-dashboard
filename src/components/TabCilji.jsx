import React from 'react'
import { supabase } from '../supabase'
import { TODAY, TODAY_STR } from '../constants/plan'

const TIPI_DNI = {
  'Tek': { cilj_kcal: 2600, cilj_belj_g: 162, cilj_oh_g: 270, cilj_masc_g: 97 },
  'Long run': { cilj_kcal: 3100, cilj_belj_g: 162, cilj_oh_g: 400, cilj_masc_g: 97 },
  'Gym': { cilj_kcal: 2400, cilj_belj_g: 162, cilj_oh_g: 200, cilj_masc_g: 102 },
  'Rest': { cilj_kcal: 2200, cilj_belj_g: 162, cilj_oh_g: 170, cilj_masc_g: 108 },
}

function VnosCiljev({ prehranaCilji, onRefresh }) {
  const [teden, setTeden] = React.useState([])
  const [saving, setSaving] = React.useState(false)
  const [saved, setSaved] = React.useState(false)

  // Generiraj naslednji teden (pon-ned)
  React.useEffect(() => {
    const dni = []
    const danes = new Date(TODAY)
    // Pojdi na ponedeljek tega ali naslednjega tedna
    const pon = new Date(danes)
    const day = pon.getDay()
    const diff = day === 0 ? 1 : (day === 1 ? 0 : 8 - day)
    pon.setDate(pon.getDate() + diff)

    const danNames = ['Ned','Pon','Tor','Sre','Čet','Pet','Sob']
    for (let i = 0; i < 7; i++) {
      const d = new Date(pon)
      d.setDate(d.getDate() + i)
      const datumStr = d.toISOString().slice(0, 10)
      const obstoječi = prehranaCilji.find(c => c.datum === datumStr)
      dni.push({
        datum: datumStr,
        dayName: danNames[d.getDay()],
        tip: obstoječi?.tip_dneva || '',
        cilj_kcal: obstoječi?.cilj_kcal || '',
        cilj_belj_g: obstoječi?.cilj_belj_g || '',
        cilj_oh_g: obstoječi?.cilj_oh_g || '',
        cilj_masc_g: obstoječi?.cilj_masc_g || '',
      })
    }
    setTeden(dni)
  }, [prehranaCilji])

  function handleTip(i, tip) {
    const novo = [...teden]
    novo[i] = { ...novo[i], tip, ...(TIPI_DNI[tip] || {}) }
    setTeden(novo)
  }

  function handleVal(i, field, val) {
    const novo = [...teden]
    novo[i] = { ...novo[i], [field]: val }
    setTeden(novo)
  }

  async function shrani() {
    setSaving(true)
    try {
      for (const d of teden) {
        if (!d.tip && !d.cilj_kcal) continue
        await supabase.from('prehrana_cilji').upsert({
          datum: d.datum,
          tip_dneva: d.tip || null,
          cilj_kcal: parseInt(d.cilj_kcal) || null,
          cilj_belj_g: parseInt(d.cilj_belj_g) || null,
          cilj_oh_g: parseInt(d.cilj_oh_g) || null,
          cilj_masc_g: parseInt(d.cilj_masc_g) || null,
        }, { onConflict: 'datum' })
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      if (onRefresh) onRefresh()
    } catch(e) {
      console.error(e)
    }
    setSaving(false)
  }

  const inputStyle = {
    background: '#0f172a', border: '1px solid #1e2433', borderRadius: 4,
    color: '#e2e8f0', fontSize: 11, fontFamily: 'DM Mono',
    padding: '3px 6px', width: 60, textAlign: 'right'
  }

  return (
    <div className="card" style={{marginBottom: 16}}>
      <h3>Tedenski cilji prehrane</h3>
      <div style={{overflowX:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
          <thead>
            <tr style={{borderBottom:'1px solid #1e2433'}}>
              {['Dan','Tip','Kcal','Belj','OH','Masc'].map(h => (
                <th key={h} style={{padding:'4px 8px',color:'#475569',fontFamily:'DM Mono',fontSize:10,textAlign:'left',fontWeight:400,textTransform:'uppercase'}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {teden.map((d, i) => (
              <tr key={d.datum} style={{borderBottom:'1px solid #0f172a'}}>
                <td style={{padding:'6px 8px',color:'#64748b',fontFamily:'DM Mono',fontSize:11,whiteSpace:'nowrap'}}>
                  {d.dayName} {d.datum.slice(5)}
                </td>
                <td style={{padding:'6px 8px'}}>
                  <select
                    value={d.tip}
                    onChange={e => handleTip(i, e.target.value)}
                    style={{...inputStyle, width: 90, textAlign: 'left'}}
                  >
                    <option value="">—</option>
                    {Object.keys(TIPI_DNI).map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </td>
                {['cilj_kcal','cilj_belj_g','cilj_oh_g','cilj_masc_g'].map(field => (
                  <td key={field} style={{padding:'6px 8px'}}>
                    <input
                      type="number"
                      value={d[field]}
                      onChange={e => handleVal(i, field, e.target.value)}
                      style={inputStyle}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        onClick={shrani}
        disabled={saving}
        style={{marginTop:12,padding:'8px 20px',background:saved?'#052e16':saving?'#1e2433':'#1e3a5f',border:`1px solid ${saved?'#14532d':'#2d4a7a'}`,borderRadius:6,color:saved?'#86efac':'#94a3b8',cursor:'pointer',fontSize:12,fontFamily:'DM Mono'}}
      >
        {saved ? '✓ Shranjeno' : saving ? 'Shranjujem...' : 'Shrani cilje'}
      </button>
    </div>
  )
}

export function TabCilji({ prehranaCilji, onRefresh }) {
  const jutri = new Date(TODAY)
  jutri.setDate(jutri.getDate() + 1)
  const jutriStr = jutri.toISOString().slice(0, 10)
  const manjkaJutri = !prehranaCilji.find(c => c.datum === jutriStr)

  return (<>
    {manjkaJutri && (
      <div className="alert warn" style={{marginBottom:16}}>
        ⚠️ Manjkajo cilji prehrane za jutri ({jutriStr}) — vnesi jih spodaj.
      </div>
    )}
    {!manjkaJutri && (
      <div className="alert ok" style={{marginBottom:16,background:'#052e1620',border:'1px solid #14532d',color:'#86efac'}}>
        ✓ Cilji za jutri ({jutriStr}) so nastavljeni.
      </div>
    )}
    <VnosCiljev prehranaCilji={prehranaCilji} onRefresh={onRefresh}/>

    {/* Pregled vnesenih ciljev */}
    {prehranaCilji.length > 0 && (
      <div className="card">
        <h3>Vneseni cilji</h3>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
            <thead>
              <tr style={{borderBottom:'1px solid #1e2433'}}>
                {['Datum','Tip','Kcal','Belj','OH','Masc'].map(h=>(
                  <th key={h} style={{padding:'4px 8px',color:'#475569',fontFamily:'DM Mono',fontSize:10,textAlign:'left',fontWeight:400,textTransform:'uppercase'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {prehranaCilji.slice(0,14).map((c,i)=>(
                <tr key={i} style={{borderBottom:'1px solid #0f172a',opacity:c.datum<TODAY_STR?0.5:1}}>
                  <td style={{padding:'6px 8px',color:'#64748b',fontFamily:'DM Mono',fontSize:11}}>{c.datum}</td>
                  <td style={{padding:'6px 8px',color:'#94a3b8',fontSize:11}}>{c.tip_dneva||'—'}</td>
                  <td style={{padding:'6px 8px',color:'#f97316',fontFamily:'DM Mono',fontSize:11}}>{c.cilj_kcal||'—'}</td>
                  <td style={{padding:'6px 8px',color:'#22c55e',fontFamily:'DM Mono',fontSize:11}}>{c.cilj_belj_g||'—'}g</td>
                  <td style={{padding:'6px 8px',color:'#3b82f6',fontFamily:'DM Mono',fontSize:11}}>{c.cilj_oh_g||'—'}g</td>
                  <td style={{padding:'6px 8px',color:'#a78bfa',fontFamily:'DM Mono',fontSize:11}}>{c.cilj_masc_g||'—'}g</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )}
  </>)
}
