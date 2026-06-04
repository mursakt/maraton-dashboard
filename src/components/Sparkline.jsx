import React from 'react'

// Majhen inline SVG sparkline. data = polje števil (staro → novo).
export function Sparkline({ data = [], width = 96, height = 26, color = '#3b82f6', strokeWidth = 1.5, fill = true }) {
  const vals = data.filter(v => v != null && !isNaN(v))
  if (vals.length < 2) return <svg width={width} height={height} />
  const min = Math.min(...vals), max = Math.max(...vals)
  const span = max - min || 1
  const dx = width / (vals.length - 1)
  const pts = vals.map((v, i) => [i * dx, height - 2 - ((v - min) / span) * (height - 4)])
  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `${line} L${(pts[pts.length - 1][0]).toFixed(1)},${height} L0,${height} Z`
  const gid = React.useId ? React.useId() : `sg${Math.random().toString(36).slice(2)}`
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      {fill && (
        <>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <path d={area} fill={`url(#${gid})`} stroke="none" />
        </>
      )}
      <path d={line} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={2} fill={color} />
    </svg>
  )
}
