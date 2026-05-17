export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET')

  const SUPABASE_URL = process.env.SUPABASE_URL
  const SUPABASE_KEY = process.env.SUPABASE_KEY

  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json'
  }

  async function fetchTable(table, query = '') {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, { headers })
    return r.json()
  }

  try {
    const [workouts, metrike, prehrana, laps] = await Promise.all([
      fetchTable('workouts', 'select=*&order=datum.desc&limit=30'),
      fetchTable('dnevne_metrike', 'select=*&order=datum.desc&limit=30'),
      fetchTable('prehrana', 'select=*&order=datum.desc&limit=14'),
      fetchTable('laps', 'select=*&order=datum.desc&limit=200'),
    ])

    res.status(200).json({ workouts, metrike, prehrana, laps })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
