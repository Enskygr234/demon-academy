import numpy as np, cv2, json
from PIL import Image
from scipy import ndimage as ndi
U='/mnt/user-data/uploads/'; O='/home/claude/game/www/assets/'
def trim(im):
    bb=im.getbbox(); return im.crop(bb) if bb else im
def alpha_crop(f,box,scale=1.0,name=None,folder='fx'):
    im=Image.open(U+f).convert('RGBA').crop(box)
    a=np.array(im); a[...,3]=np.where(a[...,3]<40,0,a[...,3]); im=trim(Image.fromarray(a))
    if scale!=1: im=im.resize((round(im.width*scale),round(im.height*scale)),Image.LANCZOS)
    im.save(O+f'{folder}/{name}.png'); return im.size
def grabcut(f,box,name,scale,folder='sprites',flip=False):
    src=np.array(Image.open(U+f).convert('RGB'))
    x0,y0,x1,y1=box; pad=6
    crop=src[y0-pad:y1+pad,x0-pad:x1+pad].copy()
    mask=np.zeros(crop.shape[:2],np.uint8)
    rect=(pad,pad,x1-x0,y1-y0)
    bgd=np.zeros((1,65)); fgd=np.zeros((1,65))
    cv2.grabCut(cv2.cvtColor(crop,cv2.COLOR_RGB2BGR),mask,rect,bgd,fgd,6,cv2.GC_INIT_WITH_RECT)
    fg=(mask==1)|(mask==3)
    fg=ndi.binary_opening(fg,iterations=1)
    lab,n=ndi.label(fg)
    if n:
        sizes=ndi.sum(fg,lab,range(1,n+1)); fg=np.isin(lab,1+np.where(sizes>0.04*sizes.max())[0])
    fg=ndi.binary_fill_holes(fg)
    al=(ndi.gaussian_filter(fg.astype(float),0.6)*255).clip(0,255).astype(np.uint8)
    im=trim(Image.fromarray(np.dstack([crop,al]),'RGBA'))
    if flip: im=im.transpose(Image.FLIP_LEFT_RIGHT)
    im=im.resize((round(im.width*scale),round(im.height*scale)),Image.NEAREST if scale>1.2 else Image.LANCZOS)
    im.save(O+f'{folder}/{name}.png'); return im.size
import os
for d in ['fx','ui','portraits']: os.makedirs(O+d,exist_ok=True)
sizes={}
OV='c8b415de-image.png'
# enemies / bosses from overview sheet (static designs, animated procedurally in-engine)
sizes['drone']=grabcut(OV,(1000,485,1092,585),'drone',0.95,flip=True)
sizes['experiment']=grabcut(OV,(1205,485,1315,590),'experiment',0.95)
sizes['guardian']=grabcut(OV,(1352,345,1512,462),'guardian',1.7,flip=True)
sizes['crimson']=grabcut(OV,(1516,345,1662,462),'crimson',1.6)
sizes['proto']=grabcut(OV,(1345,488,1522,608),'proto',1.6,flip=True)
sizes['director']=grabcut(OV,(1520,488,1662,610),'director',1.7)
# UI
im=Image.open(U+OV).convert('RGBA')
im.crop((0,0,1135,290)).save(O+'ui/banner.png')
im.crop((10,0,350,250)).save(O+'ui/logo_panel.png')
for i,(n,box) in enumerate({'academy':(10,325,198,615),'forest':(212,325,398,615),'lab':(412,325,598,615),'city':(612,325,798,615),'void':(810,325,966,615)}.items()):
    im.crop(box).save(O+f'ui/area_{n}.png')
H=Image.open(U+'e161a48a-image.png').convert('RGBA')
for n,box in {'kai':(115,0,370,255),'mira':(455,0,735,255),'ryu':(825,0,1085,255),'elena':(1175,0,1450,255)}.items():
    trim(H.crop(box)).save(O+f'portraits/{n}.png')
# effects
fx={'claw':('76e12cd0-image.png',(1095,452,1232,592),0.6),'arc':('76e12cd0-image.png',(1238,455,1445,598),0.55),
    'voidflame':('76e12cd0-image.png',(1198,588,1292,752),0.5),'eruption':('76e12cd0-image.png',(1292,620,1500,780),0.6),
    'orb_green':('40af7eb2-image.png',(1122,902,1242,1020),0.45),'leaf':('40af7eb2-image.png',(1035,930,1092,980),0.6),
    'tornado':('40af7eb2-image.png',(262,848,425,1022),0.6),'vines':('40af7eb2-image.png',(688,905,895,1022),0.6),
    'swirl':('40af7eb2-image.png',(445,905,685,1022),0.6),'voidspike':('e229a001-image.png',(1305,585,1505,728),0.6)}
for n,(f,b,s) in fx.items(): sizes['fx_'+n]=alpha_crop(f,b,s,n)
print(sizes)
