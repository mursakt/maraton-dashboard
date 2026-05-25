export const PLAN = [
  { teden: 1,  datum: '2026-04-20', faza: 'F1', km: 11,  ciljnaKg: 97.0 },
  { teden: 2,  datum: '2026-04-27', faza: 'F1', km: 22,  ciljnaKg: 96.5 },
  { teden: 3,  datum: '2026-05-04', faza: 'F1', km: 24,  ciljnaKg: 96.0 },
  { teden: 4,  datum: '2026-05-11', faza: 'F1', km: 28,  ciljnaKg: 95.5 },
  { teden: 5,  datum: '2026-05-18', faza: 'F1', km: 29,  ciljnaKg: 95.0 },
  { teden: 6,  datum: '2026-05-25', faza: 'F1', km: 21,  ciljnaKg: 94.5 },
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

export const CILJI = { kcal: 2240, belj: 224, oh: 196, masc: 62 }

export const PLAN_TRENINGI = [
  // T01 — F1 regeneracijski uvod
  { datum: '2026-04-22', teden: 1,  naziv: 'T01A', opis: '5 km lahkotno',               km: 5,  tempo: '6:15', hr: '138–154' },
  { datum: '2026-04-23', teden: 1,  naziv: 'T01B', opis: '6 km lahkotno',               km: 6,  tempo: '6:15', hr: '138–154' },
  // T02
  { datum: '2026-04-27', teden: 2,  naziv: 'T02A', opis: '6 km lahkotno',               km: 6,  tempo: '6:15', hr: '138–154' },
  { datum: '2026-04-29', teden: 2,  naziv: 'T02B', opis: '6 km lahkotno',               km: 6,  tempo: '6:15', hr: '138–154' },
  { datum: '2026-05-02', teden: 2,  naziv: 'T02C', opis: '10 km dolgi tek',             km: 10, tempo: '6:00', hr: '138–154' },
  // T03
  { datum: '2026-05-04', teden: 3,  naziv: 'T03A', opis: '6 km lahkotno',               km: 6,  tempo: '6:15', hr: '138–154' },
  { datum: '2026-05-07', teden: 3,  naziv: 'T03B', opis: '7 km lahkotno',               km: 7,  tempo: '6:15', hr: '138–154' },
  { datum: '2026-05-09', teden: 3,  naziv: 'T03C', opis: '11 km dolgi tek',             km: 11, tempo: '6:00', hr: '138–154' },
  // T04
  { datum: '2026-05-12', teden: 4,  naziv: 'T04A', opis: '7 km lahkotno',               km: 7,  tempo: '6:15', hr: '138–154' },
  { datum: '2026-05-14', teden: 4,  naziv: 'T04B', opis: '8 km lahkotno',               km: 8,  tempo: '6:15', hr: '138–154' },
  { datum: '2026-05-16', teden: 4,  naziv: 'T04C', opis: '13 km dolgi tek',             km: 13, tempo: '6:00', hr: '138–154' },
  // T05
  { datum: '2026-05-19', teden: 5,  naziv: 'T05A', opis: '7 km lahkotno',               km: 7,  tempo: '6:15', hr: '138–154' },
  { datum: '2026-05-21', teden: 5,  naziv: 'T05B', opis: '8 km lahkotno',               km: 8,  tempo: '6:15', hr: '138–154' },
  { datum: '2026-05-23', teden: 5,  naziv: 'T05C', opis: '14 km dolgi tek',             km: 14, tempo: '6:00', hr: '138–154' },
  // T06 — regeneracijski teden
  { datum: '2026-05-26', teden: 6,  naziv: 'T06A', opis: '5 km lahkotno',               km: 5,  tempo: '6:15', hr: '138–154' },
  { datum: '2026-05-28', teden: 6,  naziv: 'T06B', opis: '6 km lahkotno',               km: 6,  tempo: '6:15', hr: '138–154' },
  { datum: '2026-05-30', teden: 6,  naziv: 'T06C', opis: '10 km dolgi tek',             km: 10, tempo: '6:00', hr: '138–154' },
  // T07 — F2 začetek, intervali
  { datum: '2026-06-02', teden: 7,  naziv: 'T07A', opis: '5×800m intervali',            km: 8,  tempo: '4:50', hr: '169–185' },
  { datum: '2026-06-04', teden: 7,  naziv: 'T07B', opis: '8 km lahkotno',               km: 8,  tempo: '6:15', hr: '138–154' },
  { datum: '2026-06-06', teden: 7,  naziv: 'T07C', opis: '15 km dolgi tek',             km: 15, tempo: '6:00', hr: '138–154' },
  // T08 — hribčki
  { datum: '2026-06-09', teden: 8,  naziv: 'T08A', opis: 'Hribčki 8×30s + 5 km',      km: 8,  tempo: '6:15', hr: '169–185' },
  { datum: '2026-06-11', teden: 8,  naziv: 'T08B', opis: '9 km lahkotno',               km: 9,  tempo: '6:15', hr: '138–154' },
  { datum: '2026-06-13', teden: 8,  naziv: 'T08C', opis: '17 km dolgi tek',             km: 17, tempo: '6:00', hr: '138–154' },
  // T09
  { datum: '2026-06-16', teden: 9,  naziv: 'T09A', opis: '6×800m intervali',            km: 9,  tempo: '4:50', hr: '169–185' },
  { datum: '2026-06-18', teden: 9,  naziv: 'T09B', opis: '9 km lahkotno',               km: 9,  tempo: '6:15', hr: '138–154' },
  { datum: '2026-06-20', teden: 9,  naziv: 'T09C', opis: '18 km dolgi tek',             km: 18, tempo: '6:00', hr: '138–154' },
  // T10 — hribčki
  { datum: '2026-06-23', teden: 10, naziv: 'T10A', opis: 'Hribčki 6×45s + 5 km',      km: 8,  tempo: '6:15', hr: '169–185' },
  { datum: '2026-06-25', teden: 10, naziv: 'T10B', opis: '10 km lahkotno',              km: 10, tempo: '6:15', hr: '138–154' },
  { datum: '2026-06-27', teden: 10, naziv: 'T10C', opis: '20 km dolgi tek',             km: 20, tempo: '6:00', hr: '138–154' },
  // T11
  { datum: '2026-06-30', teden: 11, naziv: 'T11A', opis: '3×1600m intervali',           km: 9,  tempo: '4:55', hr: '169–185' },
  { datum: '2026-07-02', teden: 11, naziv: 'T11B', opis: '10 km lahkotno',              km: 10, tempo: '6:15', hr: '138–154' },
  { datum: '2026-07-04', teden: 11, naziv: 'T11C', opis: '22 km dolgi tek',             km: 22, tempo: '6:00', hr: '138–154' },
  // T12 — polmaraton teden (T12B = počitek, izpuščen)
  { datum: '2026-07-07', teden: 12, naziv: 'T12A', opis: '5 km lahkotno',               km: 5,  tempo: '6:15', hr: '138–154' },
  { datum: '2026-07-11', teden: 12, naziv: 'T12C', opis: 'Polmaraton testni',           km: 21, tempo: '5:13', hr: '162–170' },
  // T13 — hribčki
  { datum: '2026-07-14', teden: 13, naziv: 'T13A', opis: 'Hribčki 8×45s + 5 km',      km: 8,  tempo: '6:15', hr: '169–185' },
  { datum: '2026-07-16', teden: 13, naziv: 'T13B', opis: '10 km lahkotno',              km: 10, tempo: '6:15', hr: '138–154' },
  { datum: '2026-07-18', teden: 13, naziv: 'T13C', opis: '24 km dolgi tek',             km: 24, tempo: '6:00', hr: '138–154' },
  // T14
  { datum: '2026-07-21', teden: 14, naziv: 'T14A', opis: '4×1600m intervali',           km: 10, tempo: '4:55', hr: '169–185' },
  { datum: '2026-07-23', teden: 14, naziv: 'T14B', opis: '10 km lahkotno',              km: 10, tempo: '6:15', hr: '138–154' },
  { datum: '2026-07-25', teden: 14, naziv: 'T14C', opis: '25 km dolgi tek',             km: 25, tempo: '6:00', hr: '138–154' },
  // T15 — F3 začetek, race pace runi
  { datum: '2026-07-28', teden: 15, naziv: 'T15A', opis: 'Race Pace Run 2+8+2 km',     km: 12, tempo: '5:15', hr: '162–170' },
  { datum: '2026-07-30', teden: 15, naziv: 'T15B', opis: '10 km lahkotno',              km: 10, tempo: '6:15', hr: '138–154' },
  { datum: '2026-08-01', teden: 15, naziv: 'T15C', opis: '26 km dolgi tek race pace',  km: 26, tempo: '6:00', hr: '138–154' },
  // T16
  { datum: '2026-08-04', teden: 16, naziv: 'T16A', opis: 'Race Pace Run 2+10+2 km',    km: 14, tempo: '5:15', hr: '162–170' },
  { datum: '2026-08-06', teden: 16, naziv: 'T16B', opis: '10 km lahkotno',              km: 10, tempo: '6:15', hr: '138–154' },
  { datum: '2026-08-08', teden: 16, naziv: 'T16C', opis: '28 km dolgi tek race pace',  km: 28, tempo: '6:00', hr: '138–154' },
  // T17
  { datum: '2026-08-11', teden: 17, naziv: 'T17A', opis: 'Race Pace Run 2+12+2 km',    km: 16, tempo: '5:15', hr: '162–170' },
  { datum: '2026-08-13', teden: 17, naziv: 'T17B', opis: '10 km lahkotno',              km: 10, tempo: '6:15', hr: '138–154' },
  { datum: '2026-08-15', teden: 17, naziv: 'T17C', opis: '30 km dolgi tek race pace',  km: 30, tempo: '6:00', hr: '138–154' },
  // T18 — regeneracijski teden
  { datum: '2026-08-18', teden: 18, naziv: 'T18A', opis: '6 km lahkotno',               km: 6,  tempo: '6:15', hr: '138–154' },
  { datum: '2026-08-20', teden: 18, naziv: 'T18B', opis: '8 km lahkotno',               km: 8,  tempo: '6:15', hr: '138–154' },
  { datum: '2026-08-22', teden: 18, naziv: 'T18C', opis: '18 km dolgi tek',             km: 18, tempo: '6:00', hr: '138–154' },
  // T19 — vrh F3
  { datum: '2026-08-25', teden: 19, naziv: 'T19A', opis: 'Race Pace Run 2+12+2 km',    km: 16, tempo: '5:15', hr: '162–170' },
  { datum: '2026-08-27', teden: 19, naziv: 'T19B', opis: '10 km lahkotno',              km: 10, tempo: '6:15', hr: '138–154' },
  { datum: '2026-08-29', teden: 19, naziv: 'T19C', opis: '34 km dolgi tek race pace',  km: 34, tempo: '6:00', hr: '138–154' },
  // T20 — peak teden (37km dolgi tek!)
  { datum: '2026-09-01', teden: 20, naziv: 'T20A', opis: 'Race Pace Run 2+10+2 km',    km: 14, tempo: '5:15', hr: '162–170' },
  { datum: '2026-09-03', teden: 20, naziv: 'T20B', opis: '10 km lahkotno',              km: 10, tempo: '6:15', hr: '138–154' },
  { datum: '2026-09-05', teden: 20, naziv: 'T20C', opis: '37 km dolgi tek race pace',  km: 37, tempo: '6:00', hr: '138–154' },
  // T21 — F4 tapering začetek
  { datum: '2026-09-08', teden: 21, naziv: 'T21A', opis: 'Race Pace Run 2+8+2 km',     km: 12, tempo: '5:15', hr: '162–170' },
  { datum: '2026-09-10', teden: 21, naziv: 'T21B', opis: '8 km lahkotno',               km: 8,  tempo: '6:15', hr: '138–154' },
  { datum: '2026-09-12', teden: 21, naziv: 'T21C', opis: '22 km dolgi tek',             km: 22, tempo: '6:00', hr: '138–154' },
  // T22
  { datum: '2026-09-15', teden: 22, naziv: 'T22A', opis: 'Race Pace Run 2+6+2 km',     km: 10, tempo: '5:15', hr: '162–170' },
  { datum: '2026-09-17', teden: 22, naziv: 'T22B', opis: '6 km lahkotno',               km: 6,  tempo: '6:15', hr: '138–154' },
  { datum: '2026-09-19', teden: 22, naziv: 'T22C', opis: '16 km dolgi tek',             km: 16, tempo: '6:00', hr: '138–154' },
  // T23
  { datum: '2026-09-22', teden: 23, naziv: 'T23A', opis: 'Race Pace Run 2+4+2 km',     km: 8,  tempo: '5:15', hr: '162–170' },
  { datum: '2026-09-24', teden: 23, naziv: 'T23B', opis: '5 km lahkotno',               km: 5,  tempo: '6:15', hr: '138–154' },
  { datum: '2026-09-26', teden: 23, naziv: 'T23C', opis: '10 km dolgi tek',             km: 10, tempo: '6:00', hr: '138–154' },
  // T24 — Race week
  { datum: '2026-09-29', teden: 24, naziv: 'T24A', opis: '3 km lahkotno',               km: 3,  tempo: '6:15', hr: '123–138' },
  { datum: '2026-10-01', teden: 24, naziv: 'T24B', opis: '2 km rahlo',                  km: 2,  tempo: '6:30', hr: '123–138' },
  { datum: '2026-10-04', teden: 24, naziv: 'T24C', opis: 'Maraton sub 3:45',            km: 42, tempo: '5:19', hr: '162–170' },
]

export const FAZA_COLOR = { F1: '#3b82f6', F2: '#eab308', F3: '#ef4444', F4: '#22c55e' }
export const FAZA_LABEL = { F1: 'Faza 1 – Baza', F2: 'Faza 2 – Gradnja', F3: 'Faza 3 – Specifika', F4: 'Tapering' }

export const TODAY = new Date()
export const TODAY_STR = TODAY.toISOString().slice(0, 10)
export const YESTERDAY_STR = new Date(TODAY - 86400000).toISOString().slice(0, 10)

export function getCurrentTeden() {
  for (let i = PLAN.length - 1; i >= 0; i--) { if (new Date(PLAN[i].datum) <= TODAY) return PLAN[i].teden }
  return 1
}
