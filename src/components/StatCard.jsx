import React from 'react'

export function StatCard({ title, value, unit, sub, color }) {
  return (
    <div className="card">
      <h3>{title}</h3>
      <div><span className="stat-val" style={color?{color}:{}}>{value}</span>{unit&&<span className="stat-unit">{unit}</span>}</div>
      {sub&&<div className="stat-sub">{sub}</div>}
    </div>
  )
}
