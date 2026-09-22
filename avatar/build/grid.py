import bpy, sys, numpy as np
a=sys.argv[sys.argv.index("--")+1:]; src,out,x0,y0,x1,y1=a[0],a[1],*map(int,a[2:6])
im=bpy.data.images.load(src); w,h=im.size
px=np.array(im.pixels[:]).reshape(h,w,4)[::-1]  # top-down
c=px[y0:y1,x0:x1].copy()
for y in range(y0,y1):
    if y%10==0: c[y-y0,:,:3]= c[y-y0,:,:3]*0.5+ (np.array([0,1,0]) if y%50==0 else np.array([1,1,0]))*0.5 if y%50==0 else c[y-y0,:,:3]*0.8+0.2
for x in range(x0,x1):
    if x%10==0: c[:,x-x0,:3]= c[:,x-x0,:3]*0.5+ np.array([0,1,0])*0.5 if x%50==0 else c[:,x-x0,:3]*0.8+0.2
c=np.repeat(np.repeat(c,2,0),2,1)
o=bpy.data.images.new("o",c.shape[1],c.shape[0]); o.pixels=c[::-1].ravel(); o.filepath_raw=out; o.file_format='PNG'; o.save()
