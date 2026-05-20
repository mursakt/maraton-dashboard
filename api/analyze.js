export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: 'API ključ ni nastavljen v Vercel Environment Variables' })

  const { tek, lapi, metrikeVceraj, prehranaVceraj, zadnjih10Treningov, subjektivnaOcena } = req.body

  const lapStr = lapi?.length > 0
    ? lapi.map((l, i) => `  km ${i + 1}: HR ${l.povprecni_hr || '?'} bpm, tempo ${l.povprecni_tempo || '?'}/km`).join('\n')
    : '  Ni podatkov o lapih'

  const zadnjih10Str = zadnjih10Treningov?.slice(0, 10).map(w =>
    `  ${w.datum}: ${w.naziv || w.tip_treninga || 'trening'} — ${w.razdalja_km || 0}km, ${w.trajanje_min || 0}min, HR ${w.povprecni_hr || '?'} bpm, TE ${w.aerobni_te || '?'}`
  ).join('\n') || '  Ni podatkov'

  const tezaKg = metrikeVceraj.teza_kg || 80
  const ohNaKg = prehranaVceraj.oh_g ? (prehranaVceraj.oh_g / tezaKg).toFixed(1) : '?'

  const prompt = `Si izkušen trenerski AI za maratonca. Analiziraj ta tek in odgovori SAMO v slovenščini, kratko in jedrnato. Uporabi vse podatke — ne ignoriraj nobenih.

## Tek
- Datum: ${tek.datum}, Razdalja: ${tek.razdalja_km} km, Trajanje: ${tek.trajanje_min} min
- Povp. HR: ${tek.povprecni_hr} bpm, Max HR: ${tek.max_hr} bpm, Povp. tempo: ${tek.povprecni_tempo}/km
- Aerobni Training Effect: ${tek.aerobni_te}, VO2max (Garmin): ${tek.vo2max || '?'}, Kalorije: ${tek.kalorije || '?'} kcal
- Tekačeva subjektivna ocena: ${subjektivnaOcena || 'ni podane'}

## Lapi (km po km)
${lapStr}

## Regeneracija dan pred tekom
- HRV: ${metrikeVceraj.hrv || '?'} ms
- Spanje: ${metrikeVceraj.spanje_h || '?'} h
- Stres (povprečje dneva): ${metrikeVceraj.stres_povprecje || '?'}
- Body Battery zjutraj: ${metrikeVceraj.body_battery_zjutraj || '?'}
- Teža: ${tezaKg} kg

## Prehrana dan pred tekom
- Kalorije: ${prehranaVceraj.kalorije_skupaj || '?'} kcal
- Ogljikovi hidrati: ${prehranaVceraj.oh_g || '?'} g (${ohNaKg} g/kg — optimalno je 5–7 g/kg za maratonca)
- Beljakovine: ${prehranaVceraj.beljakovine_g || '?'} g
- Maščobe: ${prehranaVceraj.mascobe_g || '?'} g

## Zadnjih 10 treningov (kontekst obremenitve)
${zadnjih10Str}

Odgovori SAMO s to strukturo, brez uvodnih besed:

**✅ Kaj je šlo dobro**
• [točka]
• [točka]

**⚠️ Kaj je šlo slabo**
• [točka]
• [točka]

**🧠 Zakaj sem se tako počutil**
[1–2 stavka razlage na podlagi podatkov — HRV, spanje, glikogen, obremenitev]

**💡 Priporočila za naslednjič**
• [konkretno priporočilo s številkami]
• [konkretno priporočilo]
• [konkretno priporočilo]`

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
        max_tokens: 900,
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
