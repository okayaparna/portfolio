"""Trace the centreline of a stroked path out of a rendered PNG tile.

Pure stdlib. Pipeline: decode -> binary mask -> Zhang-Suen thinning -> walk the
skeleton from an endpoint (at a junction keep going straightest, so a lasso
crossing is traversed the way it was drawn) -> RDP simplify -> resample.
"""
import zlib, math
from struct import unpack

# ---------- PNG ----------
def load_png(path):
    d = open(path, 'rb').read()
    pos, idat, w, h, ct = 8, b'', None, None, None
    while pos < len(d):
        ln = unpack('>I', d[pos:pos+4])[0]; typ = d[pos+4:pos+8]
        if typ == b'IHDR': w, h, bd, ct = unpack('>IIBB', d[pos+8:pos+18])
        elif typ == b'IDAT': idat += d[pos+8:pos+8+ln]
        pos += 12 + ln
    raw = zlib.decompress(idat)
    ch = {0:1, 2:3, 3:1, 4:2, 6:4}[ct]
    stride = w*ch
    out = bytearray(); prev = bytearray(stride); i = 0
    for y in range(h):
        f = raw[i]; i += 1
        line = bytearray(raw[i:i+stride]); i += stride
        if f:
            for x in range(stride):
                a = line[x-ch] if x >= ch else 0
                b = prev[x]
                c = prev[x-ch] if x >= ch else 0
                if f == 1: line[x] = (line[x]+a) & 255
                elif f == 2: line[x] = (line[x]+b) & 255
                elif f == 3: line[x] = (line[x]+(a+b)//2) & 255
                elif f == 4:
                    p = a+b-c; pa, pb, pc = abs(p-a), abs(p-b), abs(p-c)
                    pr = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                    line[x] = (line[x]+pr) & 255
        out += line; prev = line
    return w, h, ch, out

def mask_of(w, h, ch, buf, x0, y0, tw, th, thresh=200):
    """Binary mask of a tile: 1 where the stroke is (darker than threshold)."""
    m = [[0]*tw for _ in range(th)]
    stride = w*ch
    for y in range(th):
        yy = y0+y
        if yy >= h: break
        row = m[y]
        for x in range(tw):
            xx = x0+x
            if xx >= w: break
            o = yy*stride + xx*ch
            if (buf[o]+buf[o+1]+buf[o+2])/3 < thresh: row[x] = 1
    return m

# ---------- Zhang-Suen thinning ----------
def thin(m):
    h = len(m); w = len(m[0])
    def nb(x, y):
        return [m[y-1][x], m[y-1][x+1], m[y][x+1], m[y+1][x+1],
                m[y+1][x], m[y+1][x-1], m[y][x-1], m[y-1][x-1]]  # P2..P9
    changed = True
    while changed:
        changed = False
        for step in (0, 1):
            rm = []
            for y in range(1, h-1):
                for x in range(1, w-1):
                    if not m[y][x]: continue
                    p = nb(x, y)
                    B = sum(p)
                    if B < 2 or B > 6: continue
                    A = sum(1 for i in range(8) if p[i] == 0 and p[(i+1) % 8] == 1)
                    if A != 1: continue
                    if step == 0:
                        if p[0]*p[2]*p[4] or p[2]*p[4]*p[6]: continue
                    else:
                        if p[0]*p[2]*p[6] or p[0]*p[4]*p[6]: continue
                    rm.append((x, y))
            if rm:
                changed = True
                for x, y in rm: m[y][x] = 0
    return m

N8 = [(-1,-1),(0,-1),(1,-1),(1,0),(1,1),(0,1),(-1,1),(-1,0)]
def neighbours(m, x, y):
    h = len(m); w = len(m[0]); out = []
    for dx, dy in N8:
        nx, ny = x+dx, y+dy
        if 0 <= nx < w and 0 <= ny < h and m[ny][nx]: out.append((nx, ny))
    return out

def prune(m, min_len=9):
    """Drop short spurs left by thinning, so they do not divert the walk."""
    h=len(m); w=len(m[0])
    for _ in range(min_len):
        rm=[(x,y) for y in range(h) for x in range(w)
            if m[y][x] and len(neighbours(m,x,y))<=1]
        if not rm: break
        # only clip tips that sit on a spur, never the two true ends
        if len(rm)<=2: break
        for x,y in rm: m[y][x]=0
    return m

def walk(m):
    """Order the skeleton into one polyline.

    Greedy directional walk: at every step take the unused neighbour whose
    direction best continues the current heading, so a crossing is traversed
    straight through rather than turning down the other branch. When the walk
    dead-ends inside a diagonal cluster it hops to the nearest unused pixel
    that still lies ahead, which bridges the small breaks thinning leaves.
    """
    h=len(m); w=len(m[0])
    pts=[(x,y) for y in range(h) for x in range(w) if m[y][x]]
    if not pts: return []
    pset=set(pts)
    ends=[p for p in pts if len(neighbours(m,*p))==1]
    start=min(ends,key=lambda p:(p[0],p[1])) if ends else min(pts,key=lambda p:(p[0],p[1]))

    used={start}
    path=[start]
    cur=start
    vx,vy=1.0,0.0                       # assume we set off rightwards
    while True:
        cand=[n for n in neighbours(m,*cur) if n not in used]
        nxt=None
        if cand:
            best,bd=None,-2
            for c in cand:
                dx,dy=c[0]-cur[0],c[1]-cur[1]
                dl=math.hypot(dx,dy) or 1
                dot=(vx*dx+vy*dy)/dl
                if dot>bd: bd,best=dot,c
            nxt=best
        else:
            # hop the gap: nearest unused pixel within a small radius, ahead of us
            best,bs=None,1e9
            for r in range(2,9):
                for dx in range(-r,r+1):
                    for dy in range(-r,r+1):
                        if max(abs(dx),abs(dy))!=r: continue
                        c=(cur[0]+dx,cur[1]+dy)
                        if c not in pset or c in used: continue
                        dl=math.hypot(dx,dy) or 1
                        dot=(vx*dx+vy*dy)/dl
                        if dot<0.2: continue          # never double back
                        score=dl*(1.6-dot)
                        if score<bs: bs,best=score,c
                if best: break
            nxt=best
        if not nxt: break
        dx,dy=nxt[0]-cur[0],nxt[1]-cur[1]
        dl=math.hypot(dx,dy) or 1
        # smooth the heading so noise does not whip it around
        vx,vy = vx*0.6+(dx/dl)*0.4, vy*0.6+(dy/dl)*0.4
        vl=math.hypot(vx,vy) or 1; vx,vy=vx/vl,vy/vl
        used.add(nxt); path.append(nxt); cur=nxt
    return path

# ---------- simplify / resample ----------
def rdp(pts, eps):
    if len(pts) < 3: return pts[:]
    ax, ay = pts[0]; bx, by = pts[-1]
    dx, dy = bx-ax, by-ay
    nl = math.hypot(dx, dy)
    worst, wi = -1, 0
    for i in range(1, len(pts)-1):
        px, py = pts[i]
        d = abs(dy*px - dx*py + bx*ay - by*ax)/nl if nl else math.hypot(px-ax, py-ay)
        if d > worst: worst, wi = d, i
    if worst > eps:
        return rdp(pts[:wi+1], eps)[:-1] + rdp(pts[wi:], eps)
    return [pts[0], pts[-1]]

def resample(pts, n):
    if len(pts) < 2: return pts[:]
    L = [0.0]
    for i in range(1, len(pts)):
        L.append(L[-1] + math.hypot(pts[i][0]-pts[i-1][0], pts[i][1]-pts[i-1][1]))
    total = L[-1]
    if total <= 0: return pts[:1]*n
    out = []
    for k in range(n):
        s = total*k/(n-1)
        i = 1
        while i < len(L) and L[i] < s: i += 1
        if i >= len(L): out.append(pts[-1]); continue
        u = (s-L[i-1])/max(1e-9, L[i]-L[i-1])
        out.append((pts[i-1][0]+(pts[i][0]-pts[i-1][0])*u,
                    pts[i-1][1]+(pts[i][1]-pts[i-1][1])*u))
    return out

def stroke_width(m):
    """Median run length across rows -- the stroke thickness, in px."""
    runs = []
    for row in m:
        c = 0
        for v in row:
            if v: c += 1
            elif c: runs.append(c); c = 0
        if c: runs.append(c)
    if not runs: return 0
    runs.sort()
    return runs[len(runs)//2]
