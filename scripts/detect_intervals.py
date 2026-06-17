import xml.etree.ElementTree as ET
import sys
from datetime import datetime

NS = {'t': 'http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2',
      'ns3': 'http://www.garmin.com/xmlschemas/ActivityExtension/v2'}

path = sys.argv[1] if len(sys.argv) > 1 else r'C:\Users\user\Desktop\maraton-dashboard\data\23286972522.tcx'
root = ET.parse(path).getroot()

def pt(s): return datetime.fromisoformat(s.replace('Z', '+00:00'))

pts = []
for tp in root.iter('{%s}Trackpoint' % NS['t']):
    def g(tag):
        e = tp.find('t:%s' % tag, NS); return e.text if e is not None else None
    t = g('Time'); dist = g('DistanceMeters')
    hr_e = tp.find('t:HeartRateBpm/t:Value', NS)
    rcad = tp.find('.//ns3:RunCadence', NS)
    pts.append({'t': pt(t), 'dist': float(dist) if dist else None,
                'hr': int(hr_e.text) if hr_e is not None else None,
                'cad': float(rcad.text) if rcad is not None else None})

t0 = pts[0]['t']
for p in pts:
    p['et'] = (p['t'] - t0).total_seconds()

# carry forward distance nulls (none here, but safe)
last = 0.0
for p in pts:
    if p['dist'] is None: p['dist'] = last
    last = p['dist']

# smoothed speed (m/s) over +-4s window
def speed_at(i, win=4):
    a = max(0, i-win); b = min(len(pts)-1, i+win)
    dd = pts[b]['dist'] - pts[a]['dist']; dt = pts[b]['et'] - pts[a]['et']
    return dd/dt if dt > 0 else 0.0

for i, p in enumerate(pts):
    p['v'] = speed_at(i)

def pace_str(v):
    if v <= 0.1: return '  --  '
    sec = 1000.0 / v
    return f'{int(sec//60)}:{int(sec%60):02d}'

# classify each second: WORK (fast), WALK (recovery), JOG (easy/cooldown)
# walking ~ <2.2 m/s (>7:35/km); work > 3.4 m/s (<4:54/km); else jog
def cls(v):
    if v < 2.3: return 'WALK'
    if v >= 3.45: return 'WORK'
    return 'JOG'

for p in pts: p['c'] = cls(p['v'])

# group consecutive same-class into raw segments
segs = []
for p in pts:
    if segs and segs[-1]['c'] == p['c']:
        segs[-1]['pts'].append(p)
    else:
        segs.append({'c': p['c'], 'pts': [p]})

def seg_info(s):
    ps = s['pts']
    d = ps[-1]['dist'] - ps[0]['dist']
    dur = ps[-1]['et'] - ps[0]['et'] + 1
    hrs = [x['hr'] for x in ps if x['hr']]
    return d, dur, (sum(hrs)/len(hrs) if hrs else None)

# merge tiny segments (<8s) into neighbours by reclassifying noise
def merge_short(segs, min_dur=8):
    changed = True
    while changed:
        changed = False
        for i, s in enumerate(segs):
            d, dur, _ = seg_info(s)
            if dur < min_dur and len(segs) > 1:
                # merge into longer neighbour
                if i == 0: tgt = i+1
                elif i == len(segs)-1: tgt = i-1
                else:
                    _, dl, _ = seg_info(segs[i-1]); _, dr, _ = seg_info(segs[i+1])
                    tgt = i-1 if dl >= dr else i+1
                segs[tgt]['pts'].extend(s['pts'])
                segs[tgt]['pts'].sort(key=lambda x: x['et'])
                segs.pop(i)
                changed = True
                break
    return segs

segs = merge_short(segs)
# re-merge now-adjacent same class
merged = []
for s in segs:
    if merged and merged[-1]['c'] == s['c']:
        merged[-1]['pts'].extend(s['pts'])
    else:
        merged.append(s)
segs = merged

print(f"{'#':>2} {'tip':5} {'razd':>7} {'cas':>7} {'tempo':>6} {'HR':>4}")
print('-'*40)
work_n = 0
for i, s in enumerate(segs, 1):
    d, dur, hr = seg_info(s)
    v = d/dur if dur else 0
    tag = s['c']
    if tag == 'WORK': work_n += 1; tag = f'WORK#{work_n}'
    print(f"{i:>2} {tag:7} {d:6.0f}m {dur:6.0f}s {pace_str(v):>6} {hr if hr else 0:4.0f}")
print('-'*40)
print('Stevilo WORK odsekov:', work_n)
work_d = [seg_info(s)[0] for s in segs if s['c']=='WORK']
if work_d:
    print('WORK razdalje (m):', [round(x) for x in work_d])
