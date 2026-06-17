import { PLAN_TRENINGI } from '../constants/plan'

export function fmt(val, dec = 1) { if (val == null || isNaN(val)) return '—'; return Number(val).toFixed(dec) }
export function hrZona(hr) { if (!hr) return '—'; if (hr<123) return 'Z0'; if (hr<138) return 'Z1'; if (hr<154) return 'Z2'; if (hr<169) return 'Z3'; if (hr<185) return 'Z4'; return 'Z5' }
export function hrZonaColor(hr) { if (!hr) return '#6b7280'; if (hr<138) return '#22c55e'; if (hr<154) return '#3b82f6'; if (hr<169) return '#eab308'; if (hr<185) return '#f97316'; return '#ef4444' }
export function isTek(w) { const t=(w.tip_treninga||'').toLowerCase(); return t.includes('run')||t.includes('tek') }
export function formaColor(s) { if(!s)return'#6b7280'; if(s>=8)return'#22c55e'; if(s>=6)return'#84cc16'; if(s>=4)return'#eab308'; if(s>=2)return'#f97316'; return'#ef4444' }
export function formaLabel(s) { if(!s)return'—'; if(s>=8)return'Odlično'; if(s>=6)return'Dobro'; if(s>=4)return'Povprečno'; if(s>=2)return'Slabo'; return'Kritično' }

// Mifflin-St Jeor BMR for male, height 178 cm, age 31
export function izracunajBMR(tezaKg) { return Math.round(10 * (tezaKg || 90) + 6.25 * 178 - 5 * 31 + 5) }

export function pripravljenostColor(p) {
  if (!p) return '#6b7280'
  if (p >= 80) return '#22c55e'
  if (p >= 60) return '#84cc16'
  if (p >= 40) return '#eab308'
  if (p >= 20) return '#f97316'
  return '#ef4444'
}

export function pripravljenostLabel(p) {
  if (!p) return '—'
  if (p >= 80) return 'Odlično pripravljen'
  if (p >= 60) return 'Dobro pripravljen'
  if (p >= 40) return 'Zmerno pripravljen'
  if (p >= 20) return 'Slabo pripravljen'
  return 'Ni priporočljivo teči'
}

// Iz naziva treninga ("Ljubljana - T09D") izlušči plansko kodo (npr. "T09D").
export function planKodaIzNaziva(naziv) {
  const m = (naziv || '').match(/T\d{2}[A-D]/i)
  return m ? m[0].toUpperCase() : null
}

// Poišče planiran trening za dani workout. Prednost ima koda iz naziva — treningi so
// poimenovani po planu, tudi če je dejanski datum zamaknjen (npr. T09A izveden dan kasneje).
// Šele če kode ni, pade nazaj na ujemanje po datumu.
export function najdiPlanTrening(workout) {
  if (!workout) return null
  const koda = planKodaIzNaziva(workout.naziv)
  if (koda) {
    const byKoda = PLAN_TRENINGI.find(p => p.naziv === koda)
    if (byKoda) return byKoda
  }
  return PLAN_TRENINGI.find(p => p.datum === workout.datum) || null
}
