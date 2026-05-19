import React from 'react'

export function ProgressBar({ value, max, color = '#3b82f6', showPct = false }) {
  const rawPct = Math.round((value / max) * 100)
  const over = rawPct > 100
  const extraPct = over ? Math.min(rawPct - 100, 50) : 0
  return (
    <div>
      <div style={{height:6,background:'#1e2433',borderRadius:3,overflow:'hidden',margin:'8px 0',position:'relative',display:'flex'}}>
        {over ? (
          <>
            <div style={{height:'100%',width:'100%',background:color,borderRadius:3,position:'absolute',left:0,top:0}}/>
            <div style={{height:'100%',width:`${extraPct}%`,background:color,backgroundImage:'repeating-linear-gradient(45deg,transparent,transparent 3px,rgba(0,0,0,0.5) 3px,rgba(0,0,0,0.5) 6px)',borderRadius:'0 3px 3px 0',position:'absolute',right:0,top:0}}/>
          </>
        ) : (
          <div style={{height:'100%',width:`${rawPct}%`,background:color,borderRadius:3,transition:'width 0.5s ease'}}/>
        )}
      </div>
      {showPct && <div style={{fontSize:11,color:rawPct>=100?color:'#64748b',fontFamily:'DM Mono',textAlign:'right',marginTop:-4}}>{rawPct}%</div>}
    </div>
  )
}
