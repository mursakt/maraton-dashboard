export function tempoStrToSec(tempo) {
  if (!tempo) return null
  const parts = tempo.split(':')
  if (parts.length !== 2) return null
  return parseInt(parts[0]) * 60 + parseInt(parts[1])
}

export function secToTempoStr(sec) {
  if (!sec) return '—'
  const min = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  return `${min}:${s.toString().padStart(2, '0')}`
}

export function secToHMS(totalSec) {
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = Math.round(totalSec % 60)
  return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}
