import sys, json, math; sys.path.insert(0,'.')
from trace import load_png, mask_of, stroke_width, rdp, resample
from ridge import follow

meta=json.load(open('gridmeta.json')); FILES,TW,TH,COLS=meta['files'],meta['TW'],meta['TH'],meta['COLS']
w,h,ch,buf=load_png('grid.png')

def smooth(pts,passes=2):
    for _ in range(passes):
        out=[pts[0]]
        for i in range(1,len(pts)-1):
            out.append(((pts[i-1][0]+2*pts[i][0]+pts[i+1][0])/4,(pts[i-1][1]+2*pts[i][1]+pts[i+1][1])/4))
        out.append(pts[-1]); pts=out
    return pts
def seg_d2(px,py,ax,ay,bx,by):
    dx,dy=bx-ax,by-ay; L=dx*dx+dy*dy
    t=0.0 if L==0 else max(0,min(1,((px-ax)*dx+(py-ay)*dy)/L))
    return (px-(ax+t*dx))**2+(py-(ay+t*dy))**2

res={}
print("%-9s %6s %6s %8s   %s"%("voice","stroke","pts","ink covered","note"))
for idx,(fn,ab,sm,key) in enumerate(FILES):
    cx=(idx%COLS)*TW; cy=(idx//COLS)*TH
    m=mask_of(w,h,ch,buf,cx,cy,TW,TH,thresh=245)
    ys=[y for y,r in enumerate(m) if any(r)]
    if not ys: continue
    xs=[x for r in m for x,v in enumerate(r) if v]
    x0,y0=min(xs),min(ys)
    crop=[r[min(xs):max(xs)+1] for r in m[min(ys):max(ys)+1]]
    sw=stroke_width(crop)
    P=follow(crop,sw)
    if len(P)<40: print("%-9s FAILED"%key); continue
    # A bidirectional trace can go out and come straight back, giving a path that
    # retraces itself -- the trim then reveals the whole shape at once. Detect the
    # palindrome and keep a single pass.
    folded=False
    n=len(P)
    if n>40:
        half=n//2
        d=[math.hypot(P[i][0]-P[n-1-i][0], P[i][1]-P[n-1-i][1]) for i in range(half)]
        if sum(d)/len(d) < sw*0.9:
            P=P[:half]; folded=True
    P=resample(smooth(rdp(P,0.8),2),180)
    ink=[(x,y) for y,r in enumerate(crop) for x,v in enumerate(r) if v]
    R=(sw/2+2.5)**2
    step=max(1,len(ink)//4000); samp=ink[::step]
    hit=sum(1 for (px,py) in samp if any(seg_d2(px,py,P[i][0],P[i][1],P[i+1][0],P[i+1][1])<=R for i in range(len(P)-1)))
    cov=100*hit/len(samp)
    xs2=[p[0] for p in P]; ys2=[p[1] for p in P]
    bx0,bx1,by0,by1=min(xs2),max(xs2),min(ys2),max(ys2)
    ccx,ccy=(bx0+bx1)/2,(by0+by1)/2; span=max(bx1-bx0,by1-by0) or 1
    res[key]={"pts":[[round((p[0]-ccx)/span*2,4),round((p[1]-ccy)/span*2,4)] for p in P],
              "strokeRel":round(sw/span*2,4),"cov":round(cov,1)}
    import statistics as _st
    _seg=[math.hypot(P[i][0]-P[i-1][0],P[i][1]-P[i-1][1]) for i in range(1,len(P))]
    _tot=sum(_seg); _rev=sum(1 for i in range(2,len(P)) if (P[i][0]-P[i-1][0])*(P[i-1][0]-P[i-2][0])<0)
    _span=max(max(p[0] for p in P)-min(p[0] for p in P), max(p[1] for p in P)-min(p[1] for p in P)) or 1
    print("%-9s %6d %6d %7.1f%%  len/span=%5.2f revs=%3d %s"%(key,sw,len(P),cov,_tot/_span,_rev,"folded" if folded else ""))
json.dump(res,open('traced_v3.json','w'),separators=(',',':'))
print("\nwrote traced.json  %d voices  %d bytes"%(len(res),len(open('traced_v3.json').read())))
