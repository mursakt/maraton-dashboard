import React from 'react'
import { PLAN, TODAY, TODAY_STR, YESTERDAY_STR } from '../constants/plan'
import { izracunajLoad, izracunajPripravljenost, opozoriloPredTreningom } from '../utils/calculations'
import { isTek, fmt, hrZonaColor, formaColor, formaLabel, pripravljenostColor, pripravljenostLabel } from '../utils/helpers'
import { secToHMS } from '../utils/tempo'
import { StatCard } from './StatCard'
import { NaslednjihPetTreningov } from './NaslednjihPetTreningov'

export function TabPregled({workouts,metrike,prehrana,laps,prehranaCilji=[],currentTeden,formaScore,predikcija}){
  const planTeden=PLAN.find(p=>p.teden===currentTeden)
  const tedStart=planTeden?new Date(planTeden.datum):new Date()
  const tedEnd=new Date(tedStart);tedEnd.setDate(tedEnd.getDate()+7)
  const kmTaTeden=workouts.filter(w=>{const d=new Date(w.datum);return d>=tedStart&&d<tedEnd&&isTek(w)}).reduce((s,w)=>s+(w.razdalja_km||0),0)
  const z=metrike[0]||{}
  const zadnjaTeza=metrike.find(m=>m.teza_kg)?.teza_kg
  const pripravljenost = izracunajPripravljenost(metrike, prehrana, workouts)
  const opozorilo = opozoriloPredTreningom(workouts, prehrana)

  // Kalorijski deficit/suficit
  // Zadnji datum z MFP podatki (ne danes)
  const zadnjiMfpDatum = prehrana
    .filter(p => p.kalorije_skupaj > 0 && p.datum < TODAY_STR)
    .sort((a,b) => b.datum.localeCompare(a.datum))[0]?.datum || YESTERDAY_STR
  const skupniDatum = zadnjiMfpDatum
  const vcerajPrehrana = prehrana.find(p => p.datum === skupniDatum) || {}
  const vcerajMetrike = metrike.find(m => m.datum === skupniDatum) || {}
  const vcerajWorkout = workouts.filter(w => w.datum === skupniDatum)
  const aktivneKcalTrening = vcerajWorkout.reduce((s, w) => s + (w.kalorije || 0), 0)
  // Uporabi vcerajMetrike (skupniDatum) - NE z (danes)
  const pasivneKcal = vcerajMetrike.bmr_kcal || 1946
  const aktivneKcalGarmin = vcerajMetrike.aktivne_kcal || 0
  const skupajPorabljene = vcerajMetrike.skupaj_kcal || (pasivneKcal + aktivneKcalTrening)
  const zauziteKcal = vcerajPrehrana.kalorije_skupaj || 0
  const deficit = zauziteKcal - skupajPorabljene // skupaj_kcal ze vkljucuje trening

  // 7-dnevna mediana deficita
  const zadnjih7 = prehrana.filter(p => p.kalorije_skupaj > 0).slice(0, 7)
  const deficiti7 = zadnjih7.map(p => {
    const w = workouts.filter(w2 => w2.datum === p.datum).reduce((s, w2) => s + (w2.kalorije || 0), 0)
    return p.kalorije_skupaj - (pasivneKcal + w)
  })
  const medianaDeficit = deficiti7.length > 0 ? deficiti7.sort((a,b)=>a-b)[Math.floor(deficiti7.length/2)] : null

  const alarms=[]
  if (opozorilo) alarms.push({type:'opozorilo', msg: opozorilo})
  if(z.hrv&&z.hrv<40)alarms.push({type:'warn',msg:'⚠️ HRV nizek ('+z.hrv+'ms) — razmisli o lažjem treningu danes'})
  if(z.spanje_h&&z.spanje_h<6.5)alarms.push({type:'warn',msg:'⚠️ Malo spanja ('+fmt(z.spanje_h)+'h) — regeneracija trpi'})
  if(zadnjaTeza&&planTeden&&zadnjaTeza>planTeden.ciljnaKg+1)alarms.push({type:'info',msg:`ℹ️ Teža (${fmt(zadnjaTeza)}kg) je ${fmt(zadnjaTeza-planTeden.ciljnaKg)}kg nad planom`})
  if(formaScore&&formaScore<4)alarms.push({type:'warn',msg:`⚠️ Forma nizka (${fmt(formaScore)}/10) — premisli ali je danes trening smiseln`})
  if(alarms.length===0)alarms.push({type:'ok',msg:'✅ Vse vrednosti v redu — nadaljuj po planu'})

  const kmPlan=planTeden?.km||0
  const dniDoMaratona=Math.ceil((new Date('2026-10-17')-TODAY)/(1000*60*60*24))
  const predCas = predikcija ? secToHMS(predikcija.casFinal) : null
  const ciljSec = 3*3600+45*60
  const diffSec = predikcija ? predikcija.casFinal - ciljSec : null

  return(<>
    {alarms.map((a,i)=><div key={i} className={`alert ${a.type}`}>{a.msg}</div>)}

    {/* Vrstica 1: Pripravljenost, Forma, KM, Teža, Dni */}
    <div className="grid5" style={{marginBottom:16}}>
      <div className="card">
        <h3>Pripravljenost na tek</h3>
        <div><span className="stat-val" style={{color:pripravljenostColor(pripravljenost)}}>{pripravljenost ? `${pripravljenost}%` : '—'}</span></div>
        <div className="stat-sub" style={{color:pripravljenostColor(pripravljenost)}}>{pripravljenostLabel(pripravljenost)}</div>
      </div>
      <div className="card">
        <h3>Forma danes</h3>
        <div><span className="stat-val" style={{color:formaColor(formaScore)}}>{formaScore?fmt(formaScore):'—'}</span></div>
        <div className="stat-sub" style={{color:formaColor(formaScore)}}>{formaLabel(formaScore)}</div>
      </div>
      <StatCard title="Km ta teden" value={fmt(kmTaTeden)} unit="km" sub={`plan: ${kmPlan} km`} color={kmTaTeden>=kmPlan?'#22c55e':'#f97316'}/>
      <StatCard title="Zadnja teža" value={zadnjaTeza?fmt(zadnjaTeza):'—'} unit="kg" sub={planTeden?`cilj: ${planTeden.ciljnaKg} kg`:''}/>
      <StatCard title="Dni do maratona" value={dniDoMaratona} sub="17. oktober 2026"/>
    </div>

    {/* Analiza zadnjega teka */}
    {/* AI Analiza teka */}
    {/* Load kartice */}
    {(() => {
      const { atl, ctl, razmerje, razmerjeOpis, razmerjeColor } = izracunajLoad(workouts)
      return (
        <div className="grid3" style={{marginBottom:16}}>
          <div className="card">
            <h3>Akutni Load — ATL (7 dni)</h3>
            <div style={{display:'flex',alignItems:'baseline',gap:6}}>
              <span className="stat-val" style={{color: atl > 200 ? '#ef4444' : atl > 100 ? '#eab308' : '#22c55e'}}>{atl}</span>
              <span style={{fontSize:12,color: atl > 200 ? '#ef4444' : atl > 100 ? '#eab308' : '#22c55e',fontWeight:500}}>{atl > 200 ? 'visok' : atl > 100 ? 'zmeren' : 'nizek'}</span>
            </div>
            <div className="stat-sub">kratkoročna utrujenost · optimalno: 80–150</div>
          </div>
          <div className="card">
            <h3>Kronični Load — CTL (28 dni)</h3>
            <div style={{display:'flex',alignItems:'baseline',gap:6}}>
              <span className="stat-val" style={{color: ctl < 30 ? '#6b7280' : ctl < 60 ? '#3b82f6' : '#22c55e'}}>{ctl}</span>
              <span style={{fontSize:12,color: ctl < 30 ? '#6b7280' : ctl < 60 ? '#3b82f6' : '#22c55e',fontWeight:500}}>{ctl < 30 ? 'nizek' : ctl < 60 ? 'zmeren' : 'visok'}</span>
            </div>
            <div className="stat-sub">fitnes baza · višji = boljša baza</div>
          </div>
          <div className="card">
            <h3>ATL/CTL Razmerje</h3>
            <div style={{display:'flex',alignItems:'baseline',gap:6}}>
              <span className="stat-val" style={{color: razmerjeColor}}>{razmerje !== null ? razmerje.toFixed(2) : '—'}</span>
              <span style={{fontSize:12,color: razmerjeColor,fontWeight:500}}>{razmerjeOpis}</span>
            </div>
            <div className="stat-sub">optimalno: 0.8–1.3 · &gt;1.5 = nevarnost</div>
          </div>
        </div>
      )
    })()}

    {/* Kalorije: porabljene vs zaužite */}
      <div className="card">
        <h3>Kalorije <span style={{fontSize:11,color:'#475569',fontFamily:'DM Mono',fontWeight:400}}>({skupniDatum})</span></h3>
        <div style={{display:'flex',gap:24,alignItems:'flex-start',marginBottom:8}}>
          <div style={{flex:1}}>
            <div style={{fontSize:11,color:'#64748b',marginBottom:4,textTransform:'uppercase',letterSpacing:'.5px'}}>Porabljene</div>
            <div style={{fontSize:24,fontFamily:'DM Mono',fontWeight:300}}>{skupajPorabljene} <span style={{fontSize:12,color:'#64748b'}}>kcal</span></div>
            <div style={{fontSize:11,color:'#475569',marginTop:4}}>
              {vcerajMetrike.bmr_kcal ? `${vcerajMetrike.bmr_kcal} bazal + ${vcerajMetrike.aktivne_kcal||0} aktivne` : `~${pasivneKcal} bazal + ${aktivneKcalTrening} trening`}
            </div>
          </div>
          <div style={{fontSize:20,color:'#2d3748',alignSelf:'center'}}>vs</div>
          <div style={{flex:1}}>
            <div style={{fontSize:11,color:'#64748b',marginBottom:4,textTransform:'uppercase',letterSpacing:'.5px'}}>Zaužite</div>
            <div style={{fontSize:24,fontFamily:'DM Mono',fontWeight:300,color:zauziteKcal>0?'#e2e8f0':'#475569'}}>{zauziteKcal||'—'} <span style={{fontSize:12,color:'#64748b'}}>kcal</span></div>
          </div>
        </div>
        {zauziteKcal > 0 && (
          <div style={{padding:'8px 12px',borderRadius:6,background:deficit>0?'#052e1620':'#45180320',border:`1px solid ${deficit>0?'#14532d':'#78350f'}`,marginTop:8}}>
            <span style={{fontFamily:'DM Mono',fontSize:14,fontWeight:500,color:deficit>0?'#86efac':'#fcd34d'}}>
              {deficit>0?`+${Math.round(deficit)} kcal suficit`:`${Math.round(deficit)} kcal deficit`}
            </span>
          </div>
        )}
      </div>
      <div className="card">
        <h3>Kalorijski trend (mediana 7 dni)</h3>
        {medianaDeficit !== null ? (
          <div>
            <div style={{fontSize:36,fontFamily:'DM Mono',fontWeight:200,color:medianaDeficit>0?'#22c55e':'#f97316'}}>
              {medianaDeficit>0?'+':''}{Math.round(medianaDeficit)}
              <span style={{fontSize:14,color:'#64748b',marginLeft:4}}>kcal/dan</span>
            </div>
            <div style={{fontSize:12,color:'#475569',marginTop:6}}>
              {medianaDeficit>200?'Suficit — dober za ohranjanje energije':medianaDeficit>0?'Blagi suficit — ok':medianaDeficit>-300?'Blagi deficit — dober za izgubo teže':'Velik deficit — pazi na regeneracijo'}
            </div>
          </div>
        ) : <div className="empty" style={{padding:8}}>Ni dovolj podatkov</div>}
      </div>


    <div className="card">
      <h3>Zadnji 5 treningov</h3>
      <div className="workout-list">
        {workouts.slice(0,5).map((w,i)=>(<div key={i} className="workout-item"><span className="date">{w.datum?.slice(5)}</span><span className="type">{w.naziv||w.tip_treninga||'—'}</span><span className="detail">{fmt(w.razdalja_km)} km · {w.povprecni_tempo||'—'}/km · {fmt(w.trajanje_min,0)} min</span><span className="hr-badge" style={{background:hrZonaColor(w.povprecni_hr)+'22',color:hrZonaColor(w.povprecni_hr)}}>{w.povprecni_hr?`${w.povprecni_hr} bpm`:'—'}</span></div>))}
        {workouts.length===0&&<div className="empty">Ni podatkov</div>}
      </div>
      <NaslednjihPetTreningov/>
    </div>
  </>)
}
