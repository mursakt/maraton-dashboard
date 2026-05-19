import React from 'react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { TODAY } from '../constants/plan'
import { izracunajLoad, analizirajTek } from '../utils/calculations'
import { isTek, fmt, hrZona, hrZonaColor } from '../utils/helpers'
import { StatCard } from './StatCard'
import { NaslednjihPetTreningov } from './NaslednjihPetTreningov'

export function TabTreningi({workouts, metrike=[], prehrana=[], laps=[]}){
  const teki=workouts.filter(w=>isTek(w)&&w.razdalja_km>0)
  const tedniMap={}
  workouts.filter(w=>isTek(w)&&w.razdalja_km>0).forEach(w=>{
    if(!w.datum)return;const d=new Date(w.datum);const mon=new Date(d);mon.setDate(d.getDate()-((d.getDay()+6)%7));const key=mon.toISOString().slice(0,10)
    tedniMap[key]=(tedniMap[key]||0)+(w.razdalja_km||0)
  })
  const kmPoTednih=Object.entries(tedniMap).sort().slice(-12).map(([k,v])=>({teden:k.slice(5),km:Math.round(v*10)/10}))
  const totalKm=teki.reduce((s,w)=>s+(w.razdalja_km||0),0)
  const avgHR=teki.filter(w=>w.povprecni_hr).reduce((s,w,_,a)=>s+w.povprecni_hr/a.length,0)
  const vo2Data=workouts.filter(w=>w.vo2max&&w.vo2max>0).slice(0,20).reverse().map(w=>({datum:w.datum?.slice(5),vo2:w.vo2max}))

  // HR efikasnost (km/uro pri določenem HR)
  const hrEfik = teki.filter(w => w.povprecni_hr >= 138 && w.povprecni_hr <= 169 && w.povprecni_tempo).slice(0, 14).reverse().map(w => {
    const parts = (w.povprecni_tempo||'').split(':')
    const tempoSec = parts.length === 2 ? parseInt(parts[0])*60 + parseInt(parts[1]) : null
    const normTempoSec = tempoSec ? Math.round(tempoSec + (w.povprecni_hr - 155) * 3) : null
    return { datum: w.datum?.slice(5), efik: normTempoSec }
  }).filter(d => d.efik)

  // Load score
  const loadScore = workouts.filter(w => w.trajanje_min && w.aerobni_te).slice(0, 14).reverse().map(w => ({
    datum: w.datum?.slice(5),
    load: Math.round(w.trajanje_min * (w.aerobni_te / 2))
  }))

  // VO2max izracun
  const vo2Sorted = workouts.filter(w=>w.vo2max&&w.vo2max>0).sort((a,b)=>b.datum.localeCompare(a.datum))
  const zadnjiVo2 = vo2Sorted[0]?.vo2max || null
  const prejsnjiTeden = new Date(TODAY - 7*86400000).toISOString().slice(0,10)
  const starejsiVo2 = vo2Sorted.find(w => w.datum <= prejsnjiTeden)?.vo2max || null
  const vo2Diff = zadnjiVo2 && starejsiVo2 ? Math.round((zadnjiVo2 - starejsiVo2)*10)/10 : null

  return(<>
    <div className="grid4">
      <StatCard title="Skupaj km (teki)" value={fmt(totalKm,0)} unit="km"/>
      <StatCard title="Povp. HR na tekih" value={avgHR?fmt(avgHR,0):'—'} unit="bpm" sub={avgHR?`Cona ${hrZona(avgHR)}`:''} color={hrZonaColor(avgHR)}/>
      <StatCard title="Število tekov" value={teki.length} sub="v bazi"/>
      <div className="card">
        <h3>VO2max (trenutni)</h3>
        <div><span className="stat-val" style={{color:'#a78bfa'}}>{zadnjiVo2?fmt(zadnjiVo2,1):'—'}</span></div>
        <div className="stat-sub">cilj: 52 (za 3:45)</div>
        {vo2Diff !== null && (
          <div className="stat-sub" style={{color:vo2Diff>0?'#22c55e':vo2Diff<0?'#ef4444':'#6b7280',marginTop:4}}>
            {vo2Diff>0?'+':''}{vo2Diff} vs prejšnji teden
          </div>
        )}
        {zadnjiVo2 && <div className="stat-sub" style={{color: zadnjiVo2>=52?'#22c55e':'#f97316',marginTop:4}}>{zadnjiVo2>=52?'✓ cilj dosežen':`${fmt(52-zadnjiVo2,1)} do cilja`}</div>}
      </div>
    </div>
    {/* Analiza zadnjega teka */}
    {(() => {
      const zadnjiTek = workouts.find(w => isTek(w))
      const a = zadnjiTek ? analizirajTek(zadnjiTek, laps, metrike, prehrana, workouts) : null
      if (!a) return null

      const tempoSecToStr = sec => {
        if (!sec) return '—'
        return `${Math.floor(sec/60)}:${String(Math.round(sec%60)).padStart(2,'0')}`
      }

      let ocena = 'nevtralen'
      let ocenaEmoji = '😐'
      let ocenaColor = '#94a3b8'
      const negativni = [
        a.cardiacDrift > 12,
        a.ohNaKg && a.ohNaKg < 3,
        a.deficitVceraj && a.deficitVceraj < -400,
        a.hrv && a.hrv < 45,
        a.spanje && a.spanje < 6.5,
        a.tempoDegradacija && a.tempoDegradacija > 20,
      ].filter(Boolean).length
      if (negativni >= 3) { ocena = 'težak'; ocenaEmoji = '😤'; ocenaColor = '#f97316' }
      else if (negativni >= 1) { ocena = 'zmerno zahteven'; ocenaEmoji = '😮‍💨'; ocenaColor = '#eab308' }
      else { ocena = 'lahek'; ocenaEmoji = '😊'; ocenaColor = '#22c55e' }

      const tocke = []

      if (a.prvLap?.povprecni_tempo) {
        const barva = a.zacetniTempoOpis?.includes('prehitro') ? '#f97316' : '#22c55e'
        tocke.push({
          barva,
          tekst: `1. km: ${a.prvLap.povprecni_tempo}/km — ${a.zacetniTempoOpis || 'ok'}${a.zacetniTempoOpis?.includes('prehitro') ? '. Previsok začetni tempo je sprostil HR ki se ni mogel več zbiti nazaj.' : '.'}`
        })
      }

      if (a.cardiacDrift !== null) {
        const barva = a.cardiacDrift > 12 ? '#f97316' : a.cardiacDrift > 6 ? '#eab308' : '#22c55e'
        tocke.push({
          barva,
          tekst: `Cardiac drift: +${a.cardiacDrift} bpm (${a.driftOpis}) — HR v zadnji tretjini teka je bil ${a.cardiacDrift} bpm višji kot v prvi${a.cardiacDrift > 12 ? ', kar kaže na preobremenitev ali dehidracijo' : ''}.`
        })
      }

      if (a.kriticniKm) {
        tocke.push({
          barva: '#f97316',
          tekst: `Od ${a.kriticniKm}. km naprej je HR začel naraščati brez ustreznega izboljšanja tempa — telo je začelo delati nesorazmerno več za enak rezultat.`
        })
      }

      if (a.tempoDegradacija !== null) {
        const barva = a.tempoDegradacija > 15 ? '#f97316' : a.tempoDegradacija > 5 ? '#eab308' : '#22c55e'
        const sign = a.tempoDegradacija > 0 ? '+' : ''
        tocke.push({
          barva,
          tekst: `Tempo degradacija: ${sign}${a.tempoDegradacija} sek/km (${a.tempoDegOpis}) — prvi 3 km vs zadnji 3 km.`
        })
      }

      if (a.ohNaKg !== null) {
        const barva = a.ohNaKg < 3 ? '#ef4444' : a.ohNaKg < 5 ? '#eab308' : '#22c55e'
        tocke.push({
          barva,
          tekst: `Glikogen: ${a.ohDanPrej}g OH dan prej / ${a.tezaKg}kg = ${a.ohNaKg}g/kg — ${a.glikogenOpis}${a.ohNaKg < 3 ? '. Glikogen se izčrpa hitro, telo preide na maščobe ki so manj učinkovite.' : '.'}`
        })
      }

      if (a.deficitVceraj !== null) {
        const barva = a.deficitVceraj < -400 ? '#ef4444' : a.deficitVceraj < -200 ? '#eab308' : '#22c55e'
        const defStr = a.deficitVceraj > 0 ? `+${a.deficitVceraj} kcal suficit` : `${a.deficitVceraj} kcal deficit`
        const deficit7Str = a.povprecniDeficit7 !== null ? ` V zadnjih 7 dneh povprečno ${a.povprecniDeficit7 > 0 ? '+' : ''}${a.povprecniDeficit7} kcal/dan.` : ''
        let defKomentar = ''
        if (a.deficitVceraj !== null) {
          if (a.deficitVceraj < -600) defKomentar = ' Velik deficit — mišice in glikogen so bili slabo dopolnjeni.'
          else if (a.deficitVceraj < -300) defKomentar = ' Zmeren deficit — regeneracija bila omejena.'
          else if (a.deficitVceraj < 0) defKomentar = ' Blagi deficit — ni kritično.'
          else defKomentar = ' Suficit — dobro za regeneracijo.'
        }
        tocke.push({
          barva,
          tekst: `Kalorije dan prej: ${defStr} (zaužito ${Math.round(a.prehranaVceraj.kalorije_skupaj || 0)} kcal).${defKomentar}${deficit7Str}`
        })
      }

      if (a.hrv || a.spanje) {
        const hrv = a.hrv ? `HRV ${a.hrv}ms${a.hrv < 45 ? ' — nizek, telo ni bilo regenerirano' : ' — ok'}` : ''
        const spanje = a.spanje ? `spanje ${fmt(a.spanje)}h${a.spanje < 6.5 ? ' — premalo' : ' — ok'}` : ''
        const barva = (a.hrv && a.hrv < 45) || (a.spanje && a.spanje < 6.5) ? '#eab308' : '#22c55e'
        tocke.push({
          barva,
          tekst: `Regeneracija dan prej: ${[hrv, spanje].filter(Boolean).join(', ')}.`
        })
      }

      if (a.te) {
        const barva = a.te >= 4 ? '#f97316' : a.te >= 3 ? '#3b82f6' : '#22c55e'
        tocke.push({
          barva,
          tekst: `Training Effect: ${fmt(a.te, 1)} — ${a.teOpis}.`
        })
      }

      return (
        <div className="card" style={{marginBottom:16}}>
          <h3>Analiza zadnjega teka</h3>
          <div style={{display:'flex',gap:16,marginBottom:12,flexWrap:'wrap',alignItems:'center'}}>
            <span style={{fontFamily:'DM Mono',fontSize:13,color:'#94a3b8'}}>{a.tek.naziv}</span>
            <span style={{fontFamily:'DM Mono',fontSize:13,color:'#64748b'}}>{a.tek.datum}</span>
            <span style={{fontFamily:'DM Mono',fontSize:13,color:'#94a3b8'}}>{fmt(a.tek.razdalja_km)} km</span>
            <span style={{fontFamily:'DM Mono',fontSize:13,color:hrZonaColor(a.tek.povprecni_hr)}}>{a.tek.povprecni_hr} avg · {a.tek.max_hr} max bpm</span>
            <span style={{fontSize:13,padding:'2px 10px',borderRadius:4,background:ocenaColor+'22',color:ocenaColor,fontWeight:600}}>{ocenaEmoji} {ocena}</span>
          </div>
          {tocke.map((t, i) => (
            <div key={i} style={{display:'flex',gap:10,padding:'8px 12px',borderRadius:6,marginBottom:6,background:'#0f172a',borderLeft:`3px solid ${t.barva}`,fontSize:13,color:'#94a3b8',alignItems:'flex-start'}}>
              <span style={{lineHeight:1.5}}>{t.tekst}</span>
            </div>
          ))}
          {a.lapi.length > 0 && (
            <div style={{marginTop:12}}>
              <div style={{fontSize:11,color:'#475569',marginBottom:6,fontFamily:'DM Mono',textTransform:'uppercase',letterSpacing:'0.5px'}}>HR in tempo po km</div>
              <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
                {a.lapi.map((l, i) => (
                  <div key={i} style={{padding:'4px 8px',borderRadius:4,background:'#0f172a',border:'1px solid #1e2433',fontSize:11,fontFamily:'DM Mono',minWidth:70}}>
                    <div style={{color:'#475569'}}>{i+1}. km</div>
                    <div style={{color:hrZonaColor(l.povprecni_hr)}}>{l.povprecni_hr||'—'} bpm</div>
                    <div style={{color:'#64748b'}}>{l.povprecni_tempo||'—'}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )
    })()}




    <div className="card" style={{marginBottom:16}}>
      <h3>Km po tednih (samo teki)</h3>
      {kmPoTednih.length>0?(
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={kmPoTednih} margin={{top:4,right:0,left:-20,bottom:0}}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2433"/>
            <XAxis dataKey="teden" tick={{fontSize:11,fill:'#475569',fontFamily:'DM Mono'}}/>
            <YAxis tick={{fontSize:11,fill:'#475569',fontFamily:'DM Mono'}}/>
            <Tooltip contentStyle={{background:'#111827',border:'1px solid #1e2433',borderRadius:8,fontSize:12}}/>
            <Bar dataKey="km" fill="#3b82f6" radius={[4,4,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      ):<div className="empty">Ni dovolj podatkov</div>}
    </div>
    {hrEfik.length > 1 && (
        <div className="card" style={{marginBottom:16}}>
          <h3>HR efikasnost — tempo pri HR 155 bpm</h3>
          <div style={{fontSize:11,color:'#475569',marginBottom:8,fontFamily:'DM Mono'}}>Nižje = boljša aerobna efikasnost. Normaliziran na HR 155 bpm.</div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={hrEfik} margin={{top:4,right:16,left:10,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2433"/>
              <XAxis dataKey="datum" tick={{fontSize:10,fill:'#475569',fontFamily:'DM Mono'}} interval="preserveStartEnd"/>
              <YAxis
                reversed={true}
                domain={['auto','auto']}
                tick={{fontSize:10,fill:'#475569',fontFamily:'DM Mono'}}
                tickFormatter={v => { const m=Math.floor(v/60); const s=String(v%60).padStart(2,'0'); return `${m}:${s}` }}
                width={40}
              />
              <Tooltip
                contentStyle={{background:'#111827',border:'1px solid #1e2433',borderRadius:8,fontSize:12}}
                formatter={v=>{const m=Math.floor(v/60);const s=String(v%60).padStart(2,'0');return[`${m}:${s}/km`,'Tempo pri HR 155']}}
              />
              <Line type="monotone" dataKey="efik" stroke="#f59e0b" strokeWidth={2} dot={{r:4,fill:'#f59e0b'}}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    {loadScore.length > 1 && (
      <div className="card" style={{marginBottom:16}}>
        <h3>Tedenski load score</h3>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={loadScore} margin={{top:4,right:0,left:-20,bottom:0}}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2433"/>
            <XAxis dataKey="datum" tick={{fontSize:10,fill:'#475569',fontFamily:'DM Mono'}}/>
            <YAxis domain={[30, 100]} tick={{fontSize:10,fill:'#475569',fontFamily:'DM Mono'}}/>
            <Tooltip contentStyle={{background:'#111827',border:'1px solid #1e2433',borderRadius:8,fontSize:12}}/>
            <Bar dataKey="load" fill="#ef4444" radius={[3,3,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </div>
    )}
    {/* Load kartice */}
    {(() => {
      const { atl, ctl, razmerje, razmerjeOpis, razmerjeColor } = izracunajLoad(workouts)
      return (
        <div className="grid3" style={{marginBottom:16}}>
          <div className="card">
            <h3>Akutni Load — ATL (7 dni)</h3>
            <div className="stat-val" style={{color: atl > 200 ? '#ef4444' : atl > 100 ? '#eab308' : '#22c55e'}}>{atl}</div>
            <div className="stat-sub">kratkoročna utrujenost</div>
            <div style={{fontSize:11,color:'#475569',marginTop:8}}>Visok = utrujen, nizek = spočit</div>
          </div>
          <div className="card">
            <h3>Kronični Load — CTL (28 dni)</h3>
            <div className="stat-val" style={{color:'#3b82f6'}}>{ctl}</div>
            <div className="stat-sub">fitnes baza</div>
            <div style={{fontSize:11,color:'#475569',marginTop:8}}>Višji = boljša fitnes baza</div>
          </div>
          <div className="card">
            <h3>ATL/CTL Razmerje</h3>
            <div className="stat-val" style={{color: razmerjeColor}}>{razmerje !== null ? razmerje.toFixed(2) : '—'}</div>
            <div className="stat-sub" style={{color: razmerjeColor}}>{razmerjeOpis}</div>
            <div style={{fontSize:11,color:'#475569',marginTop:8}}>0.8–1.3 optimalno · &gt;1.5 nevarno</div>
          </div>
        </div>
      )
    })()}

    <div className="card">
      <h3>Vsi treningi ({workouts.length})</h3>
      <div className="workout-list" style={{maxHeight:420,overflowY:'auto'}}>
        {workouts.map((w,i)=>(<div key={i} className="workout-item"><span className="date">{w.datum?.slice(5)}</span><span className="type" style={{fontSize:11,minWidth:80}}>{w.naziv||w.tip_treninga||'—'}</span><span className="detail">{w.razdalja_km>0?`${fmt(w.razdalja_km)} km · `:''}{w.povprecni_tempo?`${w.povprecni_tempo}/km · `:''}{fmt(w.trajanje_min,0)} min</span>{w.vo2max>0&&<span style={{fontSize:11,color:'#a78bfa',fontFamily:'DM Mono'}}>VO2: {fmt(w.vo2max,1)}</span>}<span className="hr-badge" style={{background:hrZonaColor(w.povprecni_hr)+'22',color:hrZonaColor(w.povprecni_hr)}}>{w.povprecni_hr||'—'} bpm</span></div>))}
        {workouts.length===0&&<div className="empty">Ni podatkov</div>}
      </div>
      <NaslednjihPetTreningov/>
    </div>
  </>)
}
