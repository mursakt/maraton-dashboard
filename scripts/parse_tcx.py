import xml.etree.ElementTree as ET
import sys

NS = {
    't': 'http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2',
    'ns3': 'http://www.garmin.com/xmlschemas/ActivityExtension/v2',
}

path = sys.argv[1] if len(sys.argv) > 1 else r'C:\Users\user\Desktop\maraton-dashboard\data\23286972522.tcx'
tree = ET.parse(path)
root = tree.getroot()

from datetime import datetime
def pt(s):
    return datetime.fromisoformat(s.replace('Z', '+00:00'))

# Trackpoints
pts = []
for tp in root.iter('{%s}Trackpoint' % NS['t']):
    def g(tag):
        e = tp.find('t:%s' % tag, NS)
        return e.text if e is not None else None
    t = g('Time')
    dist = g('DistanceMeters')
    hr_e = tp.find('t:HeartRateBpm/t:Value', NS)
    hr = hr_e.text if hr_e is not None else None
    cad = None
    ext = tp.find('t:Extensions', NS)
    if ext is not None:
        spd = tp.find('.//ns3:Speed', NS)
        rcad = tp.find('.//ns3:RunCadence', NS)
        cad = rcad.text if rcad is not None else None
    pts.append({
        't': pt(t) if t else None,
        'dist': float(dist) if dist else None,
        'hr': int(hr) if hr else None,
        'cad': float(cad) if cad else None,
    })

# Laps as recorded
laps = []
for lap in root.iter('{%s}Lap' % NS['t']):
    tts = lap.find('t:TotalTimeSeconds', NS)
    dm = lap.find('t:DistanceMeters', NS)
    inten = lap.find('t:Intensity', NS)
    trig = lap.find('t:TriggerMethod', NS)
    laps.append({
        'start': lap.get('StartTime'),
        'sec': float(tts.text) if tts is not None else None,
        'dist': float(dm.text) if dm is not None else None,
        'intensity': inten.text if inten is not None else None,
        'trigger': trig.text if trig is not None else None,
    })

t0 = pts[0]['t']
print('Trackpoints:', len(pts))
print('Total distance (m):', pts[-1]['dist'])
print('Total time (s):', (pts[-1]['t'] - t0).total_seconds())
print('HR coverage:', sum(1 for p in pts if p['hr']), '/', len(pts))
print('Dist coverage:', sum(1 for p in pts if p['dist'] is not None), '/', len(pts))
print('Cad coverage:', sum(1 for p in pts if p['cad'] is not None), '/', len(pts))
# sampling interval
deltas = [(pts[i]['t']-pts[i-1]['t']).total_seconds() for i in range(1, min(30, len(pts)))]
print('First deltas (s):', deltas[:15])
print()
print('Recorded laps:')
for i, l in enumerate(laps, 1):
    print(f"  {i}: {l['intensity']:8} {l['trigger']:12} {l['dist']:7.1f}m  {l['sec']:7.1f}s")
