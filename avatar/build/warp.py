import bpy, sys, numpy as np, json
a=sys.argv[sys.argv.index("--")+1:]; src,out=a[0],a[1]
P=[((242.5,236),(375,497.5)),((357.5,236),(532.5,502.5)),((220,234),(337,492)),((265,239),(415,500)),
   ((335,239),(497,502)),((379,232.5),(562,511)),((300,305),(477,585)),((300,312.5),(465,602)),
   ((262.5,361),(402,667)),((339,361),(522,665)),((300,362.5),(465,667)),((300,436),(470,755)),
   ((242.5,198),(375,445)),((357.5,198),(535,455))]
X=np.array([p[0] for p in P],float); Y=np.array([p[1] for p in P],float)
def U(r2): 
    with np.errstate(divide='ignore',invalid='ignore'): v=r2*np.log(r2)
    return np.nan_to_num(v)
n=len(X); K=U(((X[:,None,:]-X[None,:,:])**2).sum(-1)); Pm=np.hstack([np.ones((n,1)),X])
L=np.zeros((n+3,n+3)); L[:n,:n]=K+np.eye(n)*20.0; L[:n,n:]=Pm; L[n:,:n]=Pm.T
W=np.linalg.solve(L,np.vstack([Y,np.zeros((3,2))]))
R=600; gy,gx=np.mgrid[0:R,0:R]; G=np.stack([gx.ravel()+0.5,gy.ravel()+0.5],1)
M=U(((G[:,None,:]-X[None,:,:])**2).sum(-1))@W[:n]+W[n]+G@W[n+1:]
im=bpy.data.images.load(src); w,h=im.size; px=np.array(im.pixels[:]).reshape(h,w,4)[::-1]
sx=np.clip(M[:,0],0,w-1.001); sy=np.clip(M[:,1],0,h-1.001); x0=sx.astype(int); y0=sy.astype(int); fx=(sx-x0)[:,None]; fy=(sy-y0)[:,None]
c=(px[y0,x0]*(1-fx)*(1-fy)+px[y0,x0+1]*fx*(1-fy)+px[y0+1,x0]*(1-fx)*fy+px[y0+1,x0+1]*fx*fy).reshape(R,R,4)
rgb=c[...,:3]; bright=rgb.mean(-1); gr=rgb[...,1]/np.maximum(rgb[...,0],1e-3)
bg=(bright>0.62)&(gr>0.80)
band=np.zeros((R,R),bool); band[200:275,205:395]=True
bg&=~band
a=(~bg).astype(float)
for _ in range(6):   # grow + soften the background mask a little
    a=np.minimum(a,np.minimum.reduce([np.roll(a,1,0),np.roll(a,-1,0),np.roll(a,1,1),np.roll(a,-1,1)]))
for _ in range(4):
    a=(a+np.roll(a,1,0)+np.roll(a,-1,0)+np.roll(a,1,1)+np.roll(a,-1,1))/5
c[...,3]=a
o=bpy.data.images.new("o",R,R,alpha=True); o.pixels=c[::-1].ravel(); o.filepath_raw=out; o.file_format='PNG'; o.save()
# skin sample: cheeks
ch=np.concatenate([px[560:610,330:380,:3].reshape(-1,3),px[560:610,540:580,:3].reshape(-1,3),px[790:830,300:360,:3].reshape(-1,3)])
print("SKIN", json.dumps(np.median(ch,0).tolist()))
