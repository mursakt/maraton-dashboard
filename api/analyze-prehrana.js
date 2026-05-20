export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: 'API ključ ni nastavljen v Vercel Environment Variables' })

  const { prehrana30, metrike30, workouts30, cilji } = req.body

  const zadnjih7 = prehrana30.slice(0, 7)
  const zadnjih30 = prehrana30.slice(0, 30)

  const avg = (arr, key) => {
    const vals = arr.map(d => d[key]).filter(v => v > 0)
    return vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : null
  }

  const avg7kcal = avg(zadnjih7, 'kalorije_skupaj')
  const avg30kcal = avg(zadnjih30, 'kalorije_skupaj')
  const avg7belj = avg(zadnjih7, 'beljakovine_g')
  const avg30belj = avg(zadnjih30, 'beljakovine_g')
  const avg7oh = avg(zadnjih7, 'ogljikovi_hidrati_g')
  const avg30oh = avg(zadnjih30, 'ogljikovi_hidrati_g')
  const avg7masc = avg(zadnjih7, 'masc_g')

  // Deficit/surplus po dnevu
  const deficiti = prehrana30.map(p => {
    const m = metrike30.find(m2 => m2.datum === p.datum) || {}
    const w = workouts30.filter(w2 => w2.datum === p.datum).reduce((s, w2) => s + (w2.kalorije || 0), 0)
    const porabljene = m.skupaj_kcal || (m.bmr_kcal ? m.bmr_kcal + (m.aktivne_kcal || 0) : 1946 + w)
    return { datum: p.datum, deficit: p.kalorije_skupaj - porabljene, zauzite: p.kalorije_skupaj, porabljene }
  }).filter(d => d.zauzite > 0)

  const avg7deficit = deficiti.slice(0, 7).length
    ? Math.round(deficiti.slice(0, 7).reduce((s, d) => s + d.deficit, 0) / deficiti.slice(0, 7).length)
    : null

  // Korelacija prehrana → HRV naslednji dan
  const korelacije = prehrana30.slice(0, 14).map(p => {
    const m = metrike30.find(m2 => m2.datum === p.datum) || {}
    const jutri = new Date(new Date(p.datum).getTime() + 86400000).toISOString().slice(0, 10)
    const mJutri = metrike30.find(m2 => m2.datum === jutri) || {}
    return {
      datum: p.datum,
      kcal: p.kalorije_skupaj,
      oh: p.ogljikovi_hidrati_g,
      belj: p.beljakovine_g,
      hrvDanes: m.hrv,
      hrvJutri: mJutri.hrv,
      spanjeJutri: mJutri.spanje_h,
    }
  }).filter(k => k.kcal > 0 && k.hrvJutri)

  const korelStr = korelacije.slice(0, 7).map(k =>
    `  ${k.datum}: ${k.kcal}kcal, OH ${k.oh||'?'}g, belj ${k.belj||'?'}g → HRV naslednji dan: ${k.hrvJutri}ms, spanje: ${k.spanjeJutri||'?'}h`
  ).join('\n')

  // Treningi s kalorijami in prehrana dan prej
  const treningKorel = workouts30.filter(w => w.razdalja_km > 0).slice(0, 7).map(w => {
    const vceraj = new Date(new Date(w.datum).getTime() - 86400000).toISOString().slice(0, 10)
    const p = prehrana30.find(p2 => p2.datum === vceraj) || {}
    return `  ${w.datum}: ${w.naziv||'tek'} ${w.razdalja_km}km, HR ${w.povprecni_hr||'?'}bpm — dan prej: ${p.kalorije_skupaj||'?'}kcal, OH ${p.ogljikovi_hidrati_g||'?'}g`
  }).join('\n')

  // Teža trend
  const teze = metrike30.filter(m => m.teza_kg).slice(0, 30).map(m => `  ${m.datum}: ${m.teza_kg}kg`)

  const prompt = `Si strokovni nutricionistični AI za vzdržljivostnega tekača (cilj: maraton 3:45, oktober 2026). Izvedi sistematično "decision tree" analizo prehranjevalnih trendov na podlagi vseh spodnjih podatkov. Odgovori SAMO v slovenščini.

## Cilji prehrane
- Kalorije: ${cilji.kcal} kcal/dan
- Beljakovine: ${cilji.belj}g/dan (${Math.round(cilji.belj/80*10)/10}g/kg)
- Ogljikovi hidrati: ${cilji.oh}g/dan
- Maščobe: ${cilji.masc}g/dan

## Povprečja (zadnjih 7 vs 30 dni)
- Kalorije: 7d = ${avg7kcal||'?'} kcal | 30d = ${avg30kcal||'?'} kcal | cilj = ${cilji.kcal} kcal
- Beljakovine: 7d = ${avg7belj||'?'}g | 30d = ${avg30belj||'?'}g | cilj = ${cilji.belj}g
- Ogljikovi hidrati: 7d = ${avg7oh||'?'}g | 30d = ${avg30oh||'?'}g | cilj = ${cilji.oh}g
- Maščobe: 7d = ${avg7masc||'?'}g | cilj = ${cilji.masc}g
- Povprečni kalorijski deficit (7d): ${avg7deficit !== null ? (avg7deficit > 0 ? '+' : '') + avg7deficit + ' kcal' : '?'}

## Korelacija prehrana → regeneracija (HRV naslednji dan)
${korelStr || '  Ni dovolj podatkov'}

## Prehrana dan pred tekom → izvedba teka
${treningKorel || '  Ni dovolj podatkov'}

## Teža trend (zadnjih 30 dni)
${teze.slice(0, 10).join('\n') || '  Ni podatkov'}

Naredi decision tree analizo — za vsako dimenzijo prehrane preveri:
1. Je vrednost nad/pod ciljem? Za koliko?
2. Je trend zadnjih 7d boljši ali slabši kot 30d?
3. Ali obstaja vzorec med to metriko in regeneracijo/izvedbo?
4. Kaj je prioritetno popraviti?

Odgovori SAMO s to strukturo:

**🔴 Kritično — takoj popravi**
• [problem + številke + zakaj vpliva na maraton]

**🟡 Opozorila — pozornost**
• [problem + trend]

**🟢 Kar deluje**
• [kaj je v redu]

**📊 Vzorci iz podatkov**
• [konkretna korelacija iz tvojih podatkov — npr. "Ko zaužiješ pod X kcal, je HRV naslednji dan Y ms nižji"]

**💡 Priporočila (po prioriteti)**
1. [konkretno, z številkami, za ta teden]
2. [naslednji korak]
3. [dolgoročno]`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1200,
        messages: [{ role: 'user', content: prompt }]
      })
    })
    if (!response.ok) {
      const err = await response.text()
      return res.status(500).json({ error: `Anthropic napaka: ${err}` })
    }
    const data = await response.json()
    return res.status(200).json({ analiza: data.content[0].text })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
