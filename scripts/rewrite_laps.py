"""Re-segmentira tek 23286972522 v 6x800 + hoje + cooldown in (po potrebi) prepise lape v Supabase.

Uporaba:
  python scripts/rewrite_laps.py            # DRY-RUN: samo izpise kaj bi zapisal
  python scripts/rewrite_laps.py --write     # dejansko prepise lape v Supabase (rabi .env.local)
"""
import xml.etree.ElementTree as ET
import sys, os, json, urllib.request
from datetime import datetime

ACT_ID = 23286972522
DATUM = '2026-06-17'
TCX = r'C:\Users\user\Desktop\maraton-dashboard\data\23286972522.tcx'
SUPA_URL = 'https://hcdcvhqojengvukbiwli.supabase.co'

NS = {'t': 'http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2',
      'ns3': 'http://www.garmin.com/xmlschemas/ActivityExtension/v2'}

def pt(s): return datetime.fromisoformat(s.replace('Z', '+00:00'))

def load_points():
    root = ET.parse(TCX).getroot()
    pts = []
    for tp in root.iter('{%s}Trackpoint' % NS['t']):
        def g(tag):
            e = tp.find('t:%s' % tag, NS); return e.text if e is not None else None
        hr_e = tp.find('t:HeartRateBpm/t:Value', NS)
        rcad = tp.find('.//ns3:RunCadence', NS)
        d = g('DistanceMeters')
        pts.append({'t': pt(g('Time')), 'dist': float(d) if d else None,
                    'hr': int(hr_e.text) if hr_e is not None else None,
                    'cad': float(rcad.text) if rcad is not None else None})
    t0 = pts[0]['t']
    last = 0.0
    for p in pts:
        p['et'] = (p['t'] - t0).total_seconds()
        if p['dist'] is None: p['dist'] = last
        last = p['dist']
    return pts

def detect(pts):
    def speed_at(i, win=4):
        a = max(0, i-win); b = min(len(pts)-1, i+win)
        dd = pts[b]['dist']-pts[a]['dist']; dt = pts[b]['et']-pts[a]['et']
        return dd/dt if dt > 0 else 0.0
    for i, p in enumerate(pts): p['v'] = speed_at(i)
    def cls(v):
        if v < 2.3: return 'WALK'
        if v >= 3.45: return 'WORK'
        return 'JOG'
    for p in pts: p['c'] = cls(p['v'])
    segs = []
    for p in pts:
        if segs and segs[-1]['c'] == p['c']: segs[-1]['pts'].append(p)
        else: segs.append({'c': p['c'], 'pts': [p]})
    def dur(s): return s['pts'][-1]['et']-s['pts'][0]['et']+1
    changed = True
    while changed:
        changed = False
        for i, s in enumerate(segs):
            if dur(s) < 8 and len(segs) > 1:
                if i == 0: tgt = 1
                elif i == len(segs)-1: tgt = i-1
                else: tgt = i-1 if dur(segs[i-1]) >= dur(segs[i+1]) else i+1
                segs[tgt]['pts'].extend(s['pts']); segs[tgt]['pts'].sort(key=lambda x: x['et'])
                segs.pop(i); changed = True; break
    merged = []
    for s in segs:
        if merged and merged[-1]['c'] == s['c']: merged[-1]['pts'].extend(s['pts'])
        else: merged.append(s)
    return merged

def build_rows(segs, cad_factor):
    intensity_map = {'WORK': 'ACTIVE', 'WALK': 'RECOVERY', 'JOG': 'COOLDOWN'}
    rows = []
    for i, s in enumerate(segs, 1):
        ps = s['pts']
        d_km = (ps[-1]['dist']-ps[0]['dist'])/1000.0
        sec = ps[-1]['et']-ps[0]['et']+1
        hrs = [x['hr'] for x in ps if x['hr']]
        cads = [x['cad'] for x in ps if x['cad'] is not None]
        avg_hr = round(sum(hrs)/len(hrs)) if hrs else None
        max_hr = max(hrs) if hrs else None
        avg_cad = round(sum(cads)/len(cads)*cad_factor, 1) if cads else None
        pace_sec = round(sec/d_km) if d_km > 0 else None
        tempo = f'{pace_sec//60}:{pace_sec%60:02d}' if pace_sec else None
        it = intensity_map[s['c']]
        rows.append({
            'garmin_activity_id': ACT_ID,
            'lap_number': i,
            'datum': DATUM,
            'razdalja_km': round(d_km, 3),
            'trajanje_sec': round(sec, 1),
            'povprecni_hr': avg_hr,
            'max_hr': max_hr,
            'povprecni_tempo': tempo,
            'povprecni_tempo_sec': None,
            'kalorije': None,
            'intensity_type': it,
            'wkt_step_index': None,
            'cadence': avg_cad,
            'power_w': None,
            'stride_length_cm': None,
            'ground_contact_ms': None,
            'target_pace_low_sec': 260 if it == 'ACTIVE' else None,
            'target_pace_high_sec': 290 if it == 'ACTIVE' else None,
        })
    return rows

def get_key():
    env = os.path.join(os.path.dirname(__file__), '..', '.env.local')
    if not os.path.exists(env):
        return None
    raw = open(env, 'rb').read()
    for enc in ('utf-8-sig', 'utf-16', 'latin-1'):
        try:
            text = raw.decode(enc)
            break
        except Exception:
            text = None
    if text is None:
        return None
    for line in text.splitlines():
        line = line.strip().lstrip('﻿')
        if line.startswith('SUPABASE_SERVICE_KEY='):
            return line.split('=', 1)[1].strip()
    return None

def supa(method, path, key, body=None):
    req = urllib.request.Request(SUPA_URL + path, method=method,
        data=json.dumps(body).encode() if body is not None else None,
        headers={'apikey': key, 'Authorization': f'Bearer {key}',
                 'Content-Type': 'application/json', 'Prefer': 'return=representation'})
    with urllib.request.urlopen(req) as r:
        txt = r.read().decode()
        return r.status, (json.loads(txt) if txt else None)

def main():
    write = '--write' in sys.argv
    pts = load_points()
    segs = detect(pts)
    # umeri kadenco na obstojeci format baze (lap1 je bil 160.125 -> double cadence)
    first_work = next((s for s in segs if s['c'] == 'WORK'), None)
    cad_factor = 1.0
    if first_work:
        cads = [x['cad'] for x in first_work['pts'] if x['cad'] is not None]
        if cads:
            avg = sum(cads)/len(cads)
            cad_factor = 2.0 if avg < 110 else 1.0
    rows = build_rows(segs, cad_factor)
    print(f"Detektiranih lapov: {len(rows)} (cad_factor={cad_factor})")
    print(f"{'#':>2} {'tip':9} {'km':>6} {'sec':>6} {'tempo':>6} {'HR':>4} {'max':>4} {'cad':>6} {'target':>9}")
    for r in rows:
        tgt = f"{r['target_pace_low_sec']}-{r['target_pace_high_sec']}" if r['target_pace_low_sec'] else '-'
        print(f"{r['lap_number']:>2} {r['intensity_type']:9} {r['razdalja_km']:6.3f} {r['trajanje_sec']:6.1f} "
              f"{str(r['povprecni_tempo']):>6} {r['povprecni_hr'] or 0:4} {r['max_hr'] or 0:4} "
              f"{str(r['cadence']):>6} {tgt:>9}")
    print('SUM km:', round(sum(r['razdalja_km'] for r in rows), 3),
          ' SUM sec:', round(sum(r['trajanje_sec'] for r in rows), 1))

    if not write:
        print('\n[DRY-RUN] Nic ni zapisano. Za zapis: python scripts/rewrite_laps.py --write')
        return

    key = get_key()
    if not key:
        print('\nNAPAKA: SUPABASE_SERVICE_KEY ni v .env.local'); sys.exit(1)
    st, old = supa('GET', f'/rest/v1/laps?select=id&garmin_activity_id=eq.{ACT_ID}', key)
    print(f'\nObstojecih lapov v bazi: {len(old)}')
    st, _ = supa('DELETE', f'/rest/v1/laps?garmin_activity_id=eq.{ACT_ID}', key)
    print(f'DELETE status: {st}')
    st, ins = supa('POST', '/rest/v1/laps', key, rows)
    print(f'INSERT status: {st}, vstavljenih: {len(ins) if ins else 0}')
    print('Koncano. Osvezi dashboard.')

if __name__ == '__main__':
    main()
