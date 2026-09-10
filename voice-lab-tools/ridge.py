"""Follow the centre of a constant-width stroke.

No skeleton. Step forward along the current heading, then re-centre across the
stroke perpendicular to it. Crossings are passed straight through because the
heading carries us: where the measured width blows out (two strokes overlapping)
we simply do not re-centre for that step.
"""
import math

def ink_at(m, x, y):
    xi, yi = int(round(x)), int(round(y))
    if yi < 0 or yi >= len(m) or xi < 0 or xi >= len(m[0]): return 0
    return m[yi][xi]

def run_extent(m, x, y, nx, ny, limit):
    """How far the ink reaches from (x,y) along +n and -n."""
    a = 0.0
    while a < limit and ink_at(m, x+nx*(a+0.5), y+ny*(a+0.5)): a += 0.5
    b = 0.0
    while b < limit and ink_at(m, x-nx*(b+0.5), y-ny*(b+0.5)): b += 0.5
    return a, b

def find_start(m):
    """Leftmost ink column: centre of its run, heading right."""
    h = len(m); w = len(m[0])
    for x in range(w):
        ys = [y for y in range(h) if m[y][x]]
        if ys:
            groups = []; cur = [ys[0]]
            for y in ys[1:]:
                if y == cur[-1]+1: cur.append(y)
                else: groups.append(cur); cur = [y]
            groups.append(cur)
            g = max(groups, key=len)
            return (float(x), (g[0]+g[-1])/2.0)
    return None

def follow_from(m, sw, start, heading, step=1.6, max_steps=6000):
    x, y = start
    hx, hy = heading
    half = sw/2.0
    pts = [(x, y)]
    for _ in range(max_steps):
        nx_, ny_ = x + hx*step, y + hy*step
        if not ink_at(m, nx_, ny_):
            # nose out: fan for a heading that stays on ink (end caps, tight turns)
            found = False
            for ang in [0.2,-0.2,0.4,-0.4,0.6,-0.6,0.85,-0.85,1.1,-1.1,1.35,-1.35,1.6,-1.6,1.9,-1.9]:
                ca, sa = math.cos(ang), math.sin(ang)
                tx, ty = hx*ca-hy*sa, hx*sa+hy*ca
                if ink_at(m, x+tx*step, y+ty*step):
                    hx, hy = tx, ty; nx_, ny_ = x+tx*step, y+ty*step
                    found = True; break
            if not found: break
        # re-centre across the stroke, unless this looks like a crossing
        px, py = -hy, hx
        a, b = run_extent(m, nx_, ny_, px, py, half*3)
        width = a + b
        if width <= half*2.6:
            shift = (a-b)/2.0
            nx_ += px*shift; ny_ += py*shift
        ndx, ndy = nx_-x, ny_-y
        nl = math.hypot(ndx, ndy) or 1
        hx, hy = hx*0.55 + (ndx/nl)*0.45, hy*0.55 + (ndy/nl)*0.45
        hl = math.hypot(hx, hy) or 1; hx, hy = hx/hl, hy/hl
        x, y = nx_, ny_
        pts.append((x, y))
        # stop if we have curled back onto the very start
        if len(pts) > 40 and math.hypot(x-start[0], y-start[1]) < step*0.8: break
    return pts


def _starts(m):
    """Candidate seeds: extreme ink point on each side, centred in its run."""
    h=len(m); w=len(m[0]); out=[]
    cols=[x for x in range(w) if any(m[y][x] for y in range(h))]
    rows=[y for y in range(h) if any(m[y])]
    if not cols or not rows: return out
    def col_mid(x):
        ys=[y for y in range(h) if m[y][x]]; return (float(x),(ys[0]+ys[-1])/2.0)
    def row_mid(y):
        xs=[x for x in range(w) if m[y][x]]; return ((xs[0]+xs[-1])/2.0,float(y))
    out.append(col_mid(cols[0])); out.append(col_mid(cols[-1]))
    out.append(row_mid(rows[0])); out.append(row_mid(rows[-1]))
    return out

def _cover(m, P, sw):
    if len(P)<10: return 0.0
    ink=[(x,y) for y,r in enumerate(m) for x,v in enumerate(r) if v]
    if not ink: return 0.0
    R=(sw/2+2.5)**2
    st=max(1,len(ink)//1500); samp=ink[::st]
    def d2(px,py,ax,ay,bx,by):
        dx,dy=bx-ax,by-ay; L=dx*dx+dy*dy
        t=0.0 if L==0 else max(0,min(1,((px-ax)*dx+(py-ay)*dy)/L))
        return (px-(ax+t*dx))**2+(py-(ay+t*dy))**2
    hit=sum(1 for (px,py) in samp if any(d2(px,py,P[i][0],P[i][1],P[i+1][0],P[i+1][1])<=R
                                          for i in range(len(P)-1)))
    return hit/len(samp)

def _length(c):
    return sum(math.hypot(c[i][0]-c[i-1][0], c[i][1]-c[i-1][1]) for i in range(1,len(c)))

def follow(m, sw, step=None):
    """Try a range of step sizes; a step that is small relative to the stroke
    makes the follower oscillate across the width, which covers the ink perfectly
    while wandering. Score on coverage first, then shortest path."""
    steps = [max(1.2, sw/f) for f in (14.0, 10.0, 7.0, 5.0)] if step is None else [step]
    best, bestkey = None, None
    for st in steps:
        c = _follow_one(m, sw, st)
        if not c: continue
        cov = _cover(m, c, sw)
        key = (round(cov, 3), -_length(c))
        if bestkey is None or key > bestkey: bestkey, best = key, c
    return best or []

def _follow_one(m, sw, step):
    """Trace from several seeds and headings; keep the SIMPLEST path that still
    covers the stroke.

    A forward pass plus a reversed backward pass is only needed when the seed
    lands mid-path. When one direction already covers the shape, concatenating
    both makes the path double back on itself -- which looks fine but breaks the
    trim, because the whole shape is then revealed at once.
    """
    cands = []
    for st in _starts(m):
        for h0 in ((1.0,0.0),(-1.0,0.0),(0.0,1.0),(0.0,-1.0)):
            fwd  = follow_from(m, sw, st, h0, step)
            back = follow_from(m, sw, st, (-h0[0],-h0[1]), step)
            if len(fwd) > 20:  cands.append(fwd)
            if len(back) > 20: cands.append(back)
            if len(fwd) > 3 and len(back) > 3:
                cands.append(list(reversed(back[1:])) + fwd)
    if not cands: return []
    def sep(c):
        return math.hypot(c[0][0]-c[-1][0], c[0][1]-c[-1][1])
    scored = [(_cover(m, c, sw), len(c), sep(c), c) for c in cands]
    best = max(s[0] for s in scored)
    good = [s for s in scored if s[0] >= best - 0.015]
    # A path whose two ends coincide has doubled back on itself; that breaks the
    # trim, so prefer an open one, then the shortest.
    span = max(len(m[0]), len(m))
    openish = [s for s in good if s[2] > span*0.25]
    pick = openish if openish else good
    pick.sort(key=lambda s: s[1])
    return pick[0][3]
