"""Extract animation frames from supplied sprite sheets into Phaser atlases.
Each animation = band rect on the sheet; components whose centroid lies in the band are kept,
split into frames by vertical gap analysis, anchored at body bottom-centre and packed."""
import json, sys, numpy as np
from PIL import Image
from scipy import ndimage as ndi
U='/mnt/user-data/uploads/'
OUT='/home/claude/game/www/assets/'

def load_alpha_sheet(path):
    return np.array(Image.open(U+path).convert('RGBA'))

def load_dark_sheet(path, bg=(16,20,32)):
    a=np.array(Image.open(U+path).convert('RGB')).astype(int)
    d=np.sqrt(((a-np.array(bg))**2).sum(-1))
    nonbg=d>16
    lines=ndi.binary_opening(nonbg,structure=np.ones((1,40)))|ndi.binary_opening(nonbg,structure=np.ones((40,1)))
    lines=ndi.binary_dilation(lines,structure=np.ones((3,3)))
    R,G,B=a[...,0],a[...,1],a[...,2]
    linecol=(np.abs(R-G)<10)&(B-R>4)&(B-R<20)
    fg=nonbg&~(lines&linecol)
    fg=ndi.binary_opening(fg,structure=np.ones((2,2)))
    # strip leftover 1-3px grid line stubs: pixels in long thin runs that are line-coloured-ish
    hl=ndi.binary_opening(fg,structure=np.ones((1,30)))&~ndi.binary_opening(fg,structure=np.ones((5,1)))
    vl=ndi.binary_opening(fg,structure=np.ones((30,1)))&~ndi.binary_opening(fg,structure=np.ones((1,5)))
    fg&=~(hl|vl)
    lab,n=ndi.label(fg); sizes=ndi.sum(fg,lab,range(1,n+1))
    fg=np.isin(lab,1+np.where(sizes>120)[0])
    fg=ndi.binary_closing(fg,iterations=2); fg=ndi.binary_fill_holes(fg)
    return np.dstack([a.astype(np.uint8),(fg*255).astype(np.uint8)])

def comps(arr, thr=50, dil=2):
    m=arr[...,3]>thr
    md=ndi.binary_dilation(m,iterations=dil)
    lab,n=ndi.label(md)
    return m,lab,n

def frames_in_band(arr, m, lab, n, band, expected=None, mingap=3):
    x0,y0,x1,y1=band
    objs=ndi.find_objects(lab)
    sel=np.zeros(m.shape,bool)
    for i,sl in enumerate(objs):
        if sl is None: continue
        ys,xs=sl
        cy=(ys.start+ys.stop)/2; cx=(xs.start+xs.stop)/2
        if x0<=cx<x1 and y0<=cy<y1:
            sel|=(lab==i+1)
    sel&=m
    prof=sel.sum(0)
    on=prof>0
    runs=[];x=0;W=len(on)
    while x<W:
        if on[x]:
            s=x
            while x<W and on[x]: x+=1
            runs.append([s,x])
        else: x+=1
    # merge small gaps
    merged=[]
    for r in runs:
        if merged and r[0]-merged[-1][1]<mingap: merged[-1][1]=r[1]
        else: merged.append(r)
    # merge tiny slivers into neighbours
    def mass(r): return prof[r[0]:r[1]].sum()
    changed=True
    while changed and len(merged)>1:
        changed=False
        for i,r in enumerate(merged):
            if mass(r)<250:
                j=i-1 if i>0 and (i==len(merged)-1 or r[0]-merged[i-1][1] < merged[i+1][0]-r[1]) else i+1
                a,b=sorted([i,j]); merged[a]=[merged[a][0],merged[b][1]]; del merged[b]; changed=True; break
    if expected:
        while len(merged)>expected:
            gaps=[merged[i+1][0]-merged[i][1] for i in range(len(merged)-1)]
            i=int(np.argmin(gaps)); merged[i]=[merged[i][0],merged[i+1][1]]; del merged[i+1]
        while len(merged)<expected:
            i=int(np.argmax([r[1]-r[0] for r in merged])); s,e=merged[i]
            a=s+(e-s)*3//10; b=s+(e-s)*7//10
            c=a+int(np.argmin(prof[a:b]))
            merged[i]=[s,c]; merged.insert(i+1,[c,e])
    out=[]
    for s,e in merged:
        sub=sel[:,s:e]
        rows=np.where(sub.any(1))[0]
        if len(rows)==0: continue
        t,b=rows[0],rows[-1]+1
        crop=arr[t:b,s:e].copy()
        crop[...,3]=np.where(sub[t:b],crop[...,3],0)
        out.append(crop)
    return out

def anchor(crop):
    m=crop[...,3]>100
    lab,n=ndi.label(ndi.binary_dilation(m,iterations=1))
    if n==0: return crop.shape[1]/2, crop.shape[0]
    sizes=ndi.sum(m,lab,range(1,n+1)); big=lab==(1+int(np.argmax(sizes)))
    ys,xs=np.where(big&m)
    top=ys.min(); h=ys.max()-top
    upper=xs[ys<top+max(4,h*0.45)]
    return float(np.median(upper)), float(ys.max()+1)

def scale_crop(crop, s, nearest=False):
    if abs(s-1)<1e-3: return crop
    im=Image.fromarray(crop,'RGBA')
    w=max(1,round(im.width*s)); h=max(1,round(im.height*s))
    if nearest: return np.array(im.resize((w,h),Image.NEAREST))
    # premultiply to avoid dark halos
    a=crop.astype(float); al=a[...,3:4]/255
    pm=np.concatenate([a[...,:3]*al,a[...,3:4]],-1).astype(np.uint8)
    r=np.array(Image.fromarray(pm,'RGBA').resize((w,h),Image.LANCZOS)).astype(float)
    al2=np.clip(r[...,3:4],1,255)/255
    rgb=np.clip(r[...,:3]/al2,0,255)
    out=np.concatenate([rgb,r[...,3:4]],-1)
    out[...,3]=np.where(out[...,3]<24,0,out[...,3])
    return out.astype(np.uint8)

def pack(key, anims, scale, flipx=False, nearest=False, fps=None):
    """anims: dict name -> list of crops. writes atlas png/json; returns anim defs"""
    frames=[]
    for name,crops in anims.items():
        for i,c in enumerate(crops):
            if flipx: c=c[:,::-1].copy()
            c=scale_crop(c,scale,nearest)
            ax,ay=anchor(c)
            frames.append((f'{name}_{i}',c,ax,ay))
    left=max(ax for _,_,ax,_ in frames); right=max(c.shape[1]-ax for _,c,ax,_ in frames)
    up=max(ay for _,_,_,ay in frames); down=max(c.shape[0]-ay for _,c,_,ay in frames)
    half=int(np.ceil(max(left,right)))+1
    SW=2*half; SH=int(np.ceil(up+down))+1; AX=half; AY=int(np.ceil(up))
    # shelf pack
    maxw=2048; x=y=rowh=0; placed=[]
    for nm,c,ax,ay in sorted(frames,key=lambda f:-f[1].shape[0]):
        h,w=c.shape[:2]
        if x+w+2>maxw: x=0;y+=rowh+2;rowh=0
        placed.append((nm,c,ax,ay,x,y)); x+=w+2; rowh=max(rowh,h)
    H=y+rowh; W=maxw if y>0 else x
    sheet=np.zeros((H,W,4),np.uint8); fj={}
    for nm,c,ax,ay,px,py in placed:
        h,w=c.shape[:2]; sheet[py:py+h,px:px+w]=c
        ox=int(round(AX-ax)); oy=int(round(AY-ay))
        fj[nm]={'frame':{'x':px,'y':py,'w':w,'h':h},'rotated':False,'trimmed':True,
                'spriteSourceSize':{'x':ox,'y':oy,'w':w,'h':h},'sourceSize':{'w':SW,'h':SH}}
    Image.fromarray(sheet,'RGBA').save(OUT+f'sprites/{key}.png',optimize=True)
    json.dump({'frames':fj,'meta':{'image':f'{key}.png','size':{'w':W,'h':H},'scale':'1',
               'anchor':{'x':AX,'y':AY,'w':SW,'h':SH}}},open(OUT+f'sprites/{key}.json','w'))
    defs={n:len(c) for n,c in anims.items()}
    return {'frameW':SW,'frameH':SH,'anchorX':AX,'anchorY':AY,'anims':defs}

def run_sheet(arr, bands, expected, mingap=3, thr=50, dil=2):
    m,lab,n=comps(arr,thr,dil)
    res={}
    for name,band in bands.items():
        fr=frames_in_band(arr,m,lab,n,band,expected.get(name),mingap)
        res[name]=fr
    return res

meta={}
# ---- Heroes (sheet e161a48a: 4 columns)
H=load_alpha_sheet('e161a48a-image.png')
rows={'idle':(262,348),'run':(350,425),'jump':(428,505),'fall':(507,585),'attack':(587,662),
      'heavy':(664,744),'dash':(746,806),'hurt':(808,876),'death':(878,938),'skill':(940,1020)}
cols={'kai':(135,475),'mira':(478,805),'ryu':(805,1175),'elena':(1178,1536)}
exp={'kai':dict(idle=5,run=6,jump=3,fall=2,attack=5,heavy=5,dash=3,hurt=2,death=4,skill=6),
     'mira':dict(idle=4,run=6,jump=3,fall=2,attack=5,heavy=5,dash=3,hurt=2,death=4,skill=6),
     'ryu':dict(idle=5,run=6,jump=3,fall=2,attack=5,heavy=5,dash=3,hurt=2,death=4,skill=6),
     'elena':dict(idle=5,run=6,jump=3,fall=2,attack=5,heavy=5,dash=3,hurt=2,death=4,skill=6)}
for k,(x0,x1) in cols.items():
    bands={a:(x0,y0,x1,y1) for a,(y0,y1) in rows.items()}
    if k=='elena': bands['death']=(x0,878,x1,952); bands['skill']=(x0,952,x1,1024)
    r=run_sheet(H,bands,exp[k],dil=1 if k=='elena' else 2)
    print(k,{a:len(v) for a,v in r.items()})
    meta[k]=pack(k,r,1.15)
# ---- Corrupted student (void sheet)
S=load_alpha_sheet('e229a001-image.png')
b={'idle':(520,10,1010,142),'run':(520,145,1290,258),'jump':(520,260,910,372),'fall':(520,372,750,482),
   'attack':(520,470,1330,590),'heavy':(520,595,1300,728),'dash':(520,730,970,815),'hurt':(520,815,800,905),
   'death':(520,905,1520,1010)}
meta['student']=pack('student',run_sheet(S,b,dict(idle=4,run=6,jump=3,fall=2,attack=5,heavy=5,dash=3,hurt=2,death=7)),0.62)
# ---- Shadow wolf
Wf=load_alpha_sheet('76e12cd0-image.png')
b={'idle':(140,10,780,135),'run':(140,138,1020,240),'jump':(140,242,700,360),'fall':(140,360,490,460),
   'attack':(140,460,1065,570),'heavy':(140,572,1095,705),'dash':(140,705,730,800),'hurt':(140,800,480,905),
   'death':(140,905,1400,1005)}
meta['wolf']=pack('wolf',run_sheet(Wf,b,dict(idle=4,run=6,jump=3,fall=2,attack=5,heavy=5,dash=3,hurt=2,death=7)),0.72)
# ---- Forest spirit
F=load_alpha_sheet('40af7eb2-image.png')
b={'idle':(565,0,1035,112),'run':(565,115,1390,230),'jump':(565,232,955,336),'fall':(565,338,825,432),
   'attack':(565,425,1405,552),'heavy':(565,553,1536,695),'dash':(565,696,1075,752),'hurt':(565,755,825,842),
   'death':(565,845,1536,905)}
meta['spirit']=pack('spirit',run_sheet(F,b,dict(idle=4,run=6,jump=3,fall=2,attack=6,heavy=6,dash=3,hurt=2,death=7)),0.8)
# ---- Corrupted paladin -> Void Soldier
P=load_dark_sheet('b116345e-image.jpg')
Image.fromarray(P,'RGBA').save('/home/claude/work/pal_mask.png')
b={'idle':(115,75,540,182),'walk':(115,200,745,305),'run':(115,312,745,428),'attack':(20,455,690,602),
   'hurt':(20,642,285,748),'death':(360,630,1360,750),'blast':(780,330,1360,428),'dash':(780,480,1210,584)}
meta['soldier']=pack('soldier',run_sheet(P,b,dict(idle=4,walk=6,run=6,attack=6,hurt=2,death=8,blast=5,dash=3),thr=100,dil=2),0.8)
json.dump(meta,open(OUT+'data/sprite_meta.json','w'),indent=1)
for k,v in meta.items(): print(k,v)
