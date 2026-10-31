"""Procedural 16-bit style pixel-art: parallax layers (seamless), tilesets, props for 5 levels.
Drawn at 480x270 (pixel scale 2) and upscaled nearest to 960x540."""
import random, math, numpy as np
from PIL import Image, ImageDraw, ImageFilter
O='/home/claude/game/www/assets/'
W,H=480,270
def hexc(h,a=255): h=h.lstrip('#'); return (int(h[0:2],16),int(h[2:4],16),int(h[4:6],16),a)
def lerp(c1,c2,t): return tuple(int(c1[i]+(c2[i]-c1[i])*t) for i in range(len(c1)))
def grad(top,bot,w=W,h=H,bands=14):
    im=Image.new('RGBA',(w,h)); d=ImageDraw.Draw(im)
    for y in range(h):
        t=math.floor(y/h*bands)/bands  # banded = pixel-art dithering feel
        d.line([(0,y),(w,y)],fill=lerp(top,bot,t))
    return im
def wrap_poly(d,pts,fill):
    for off in (-W,0,W): d.polygon([(x+off,y) for x,y in pts],fill=fill)
def wrap_rect(d,x0,y0,x1,y1,fill):
    for off in (-W,0,W): d.rectangle([x0+off,y0,x1+off,y1],fill=fill)
def wrap_ellipse(d,x0,y0,x1,y1,fill):
    for off in (-W,0,W): d.ellipse([x0+off,y0,x1+off,y1],fill=fill)
def up(im,s=2): return im.resize((im.width*s,im.height*s),Image.NEAREST)
def save(im,name): up(im).save(O+'bg/'+name+'.png',optimize=True)
def stars(d,n,col,rng,ymax=180):
    for _ in range(n):
        x,y=rng.randrange(W),rng.randrange(ymax); d.point((x,y),fill=col)
        if rng.random()<0.12: d.point((x+1,y),fill=col); d.point((x-1,y),fill=col); d.point((x,y+1),fill=col); d.point((x,y-1),fill=col)
def ridge(d,base,amp,freq,col,rng,jag=3,seed=0):
    pts=[(0,H)]
    ph=[rng.random()*6 for _ in range(3)]
    for x in range(0,W+1,2):
        y=base-amp*(0.5*math.sin(2*math.pi*x/W*freq+ph[0])+0.3*math.sin(2*math.pi*x/W*freq*2+ph[1])+0.2*math.sin(2*math.pi*x/W*freq*5+ph[2]))
        y+=rng.randint(-jag,jag) if jag else 0
        pts.append((x,y))
    pts.append((W,H)); d.polygon(pts,fill=col)

# ---------------- LEVEL 1: ACADEMY ----------------
def academy(rng):
    far=grad(hexc('1a0f3d'),hexc('7a3d8f')); d=ImageDraw.Draw(far)
    stars(d,90,hexc('e8d8ff'),rng,140)
    d.ellipse([360,28,400,68],fill=hexc('f4e6ff')); d.ellipse([368,30,404,64],fill=hexc('cdb3ef'))  # crescent-ish moon
    d.ellipse([352,20,408,76],outline=hexc('9a7cc9',90))
    ridge(d,200,30,2,hexc('3a2463'),rng,1)
    # distant castle silhouettes with spires
    for cx in range(20,W,120):
        c=hexc('2a1a4f'); h=rng.randint(60,90); w=rng.randint(40,60)
        wrap_rect(d,cx,200-h,cx+w,240,c)
        for sx in (cx-4,cx+w-6,cx+w//2-5):
            th=rng.randint(30,55); wrap_rect(d,sx,200-h-th+12,sx+10,200-h+5,c); wrap_poly(d,[(sx-2,200-h-th+12),(sx+5,200-h-th-14),(sx+12,200-h-th+12)],c)
        for wy in range(200-h+10,236,12):
            for wx in range(cx+5,cx+w-5,9):
                if rng.random()<0.35: wrap_rect(d,wx,wy,wx+2,wy+4,hexc('ffcf6b'))
    d.rectangle([0,236,W,H],fill=hexc('22143f'))
    save(far,'academy_far')
    mid=Image.new('RGBA',(W,H)); d=ImageDraw.Draw(mid)
    wall=hexc('4b3a78'); dark=hexc('35285a'); trim=hexc('6b58a3')
    for x in range(0,W,96):  # colonnade / academy facade
        d.rectangle([x,110,x+96,H],fill=wall)
        d.rectangle([x+14,140,x+82,250],fill=dark)
        d.pieslice([x+14,112,x+82,176],180,360,fill=dark)
        d.rectangle([x+20,150,x+76,248],fill=hexc('1d1538'))
        d.pieslice([x+20,122,x+76,180],180,360,fill=hexc('1d1538'))
        # stained glass
        for i,col in enumerate(['8a4fd6','d05aa8','4f7fd6','e0a64f']):
            d.rectangle([x+30+i*10,160,x+36+i*10,200],fill=hexc(col,200))
        d.pieslice([x+28,140,x+68,180],180,360,fill=hexc('b06ad6',170))
        d.line([(x+48,140),(x+48,200)],fill=hexc('1d1538'),width=2)
        d.rectangle([x,104,x+10,H],fill=trim); d.rectangle([x-2,100,x+12,106],fill=hexc('8b78c3'))
        for by in range(116,H,10): d.line([(x+11,by),(x+95,by)],fill=hexc('42326b'))
    d.rectangle([0,96,W,104],fill=trim); d.rectangle([0,92,W,96],fill=hexc('8b78c3'))
    for x in range(0,W,16): d.rectangle([x,84,x+8,92],fill=trim)
    save(mid,'academy_mid')
    return dict(sky='#1a0f3d',tiles=('5a4a8a','3b2f63','8676c0','2a2048','6fbf5a'),accent='#b06ad6')

# ---------------- LEVEL 2: FOREST ----------------
def forest(rng):
    far=grad(hexc('0e1a2a'),hexc('3d2a5e')); d=ImageDraw.Draw(far)
    stars(d,60,hexc('cfe8ff'),rng,110)
    d.ellipse([90,30,130,70],fill=hexc('d9f5e6')); 
    ridge(d,170,40,2,hexc('2a2a52'),rng,2); ridge(d,195,25,3,hexc('1f2f45'),rng,2)
    for x in range(0,W,14):  # distant pine silhouettes
        h=rng.randint(40,80); c=hexc('16263a')
        wrap_poly(d,[(x-8,230),(x,230-h),(x+8,230)],c)
    d.rectangle([0,228,W,H],fill=hexc('132033'))
    save(far,'forest_far')
    mid=Image.new('RGBA',(W,H)); d=ImageDraw.Draw(mid)
    for i in range(7):
        x=rng.randrange(W); w=rng.randint(18,34); c=hexc('3b2a2a'); hl=hexc('5a3d36')
        wrap_rect(d,x,40,x+w,H,c); wrap_rect(d,x+3,40,x+6,H,hl)
        for ry in range(60,H,22): wrap_rect(d,x+w-6,ry,x+w-2,ry+8,hexc('2a1d1f'))
        # roots
        wrap_poly(d,[(x-14,H),(x,H-30),(x+4,H)],c); wrap_poly(d,[(x+w+14,H),(x+w,H-26),(x+w-4,H)],c)
        # canopy blobs
        for k in range(6):
            cx=x+w//2+rng.randint(-50,50); cy=rng.randint(10,90); r=rng.randint(22,40)
            wrap_ellipse(d,cx-r,cy-r,cx+r,cy+r*0.8,hexc(rng.choice(['1f4a3a','275a3f','1a3f36'])))
            wrap_ellipse(d,cx-r+6,cy-r+4,cx+r-12,cy-r+14,hexc('3f7a4a'))
    # glowing mushrooms & fireflies
    for _ in range(40):
        x,y=rng.randrange(W),rng.randrange(60,250); d.point((x,y),fill=hexc(rng.choice(['bfff8a','8affd9','e48aff'])))
    for _ in range(10):
        x=rng.randrange(W); y=rng.randint(235,262)
        wrap_rect(d,x,y,x+1,y+6,hexc('d8d0c0')); wrap_ellipse(d,x-4,y-4,x+5,y+1,hexc(rng.choice(['b45aff','4fe0c0'])))
    save(mid,'forest_mid')
    return dict(sky='#0e1a2a',tiles=('6b4a35','4a3226','3f9a4a','2a1d18','6fd35a'),accent='#4fe08a')

# ---------------- LEVEL 3: LAB ----------------
def lab(rng):
    far=grad(hexc('050c18'),hexc('0f2338')); d=ImageDraw.Draw(far)
    for x in range(0,W,40):
        d.rectangle([x,0,x+38,H],fill=hexc('0c1b2c')); d.line([(x+39,0),(x+39,H)],fill=hexc('16304a'))
        for y in range(0,H,30): d.line([(x,y),(x+38,y)],fill=hexc('102438'))
    for y in (30,58): d.rectangle([0,y,W,y+6],fill=hexc('1d3a55')); d.line([(0,y+1),(W,y+1)],fill=hexc('2f5a7a'))
    for x in range(0,W,60): d.rectangle([x+10,8,x+30,12],fill=hexc('5ad6ff'))
    save(far,'lab_far')
    mid=Image.new('RGBA',(W,H)); d=ImageDraw.Draw(mid)
    for x in range(0,W,160):
        # specimen tanks
        for k,tx in enumerate((x+20,x+70)):
            d.rectangle([tx,120,tx+34,236],fill=hexc('1b6c8a',200)); d.rectangle([tx+4,126,tx+30,232],fill=hexc('3fc8ff',120))
            for b in range(5): bx=tx+8+rng.randint(0,18); by=rng.randint(135,225); d.ellipse([bx,by,bx+3,by+3],fill=hexc('c8f4ff'))
            d.ellipse([tx+10,165,tx+24,190],fill=hexc('2a3f4f',220))
            d.rectangle([tx-3,112,tx+37,122],fill=hexc('3a4a5a')); d.rectangle([tx-3,234,tx+37,246],fill=hexc('3a4a5a'))
            d.line([(tx-3,113),(tx+37,113)],fill=hexc('6a7f90'))
        # monitor console
        d.rectangle([x+118,170,x+152,200],fill=hexc('1d2a35')); d.rectangle([x+121,173,x+149,193],fill=hexc('0e4a3a'))
        for ly in range(176,192,4): d.line([(x+123,ly),(x+123+rng.randint(6,24),ly)],fill=hexc('5affb0'))
        d.rectangle([x+124,200,x+146,246],fill=hexc('26323c'))
    # pipes
    d.rectangle([0,90,W,96],fill=hexc('2f3d4a')); d.line([(0,91),(W,91)],fill=hexc('56697a'))
    for x in range(0,W,48): d.rectangle([x,86,x+6,100],fill=hexc('46586a'))
    save(mid,'lab_mid')
    return dict(sky='#050c18',tiles=('4a5868','2c3642','8a9cb0','1a222a','ffcc33'),accent='#3fc8ff')

# ---------------- LEVEL 4: BROKEN CITY ----------------
def city(rng):
    far=grad(hexc('2a0f2e'),hexc('e0703a'),bands=18); d=ImageDraw.Draw(far)
    d.ellipse([200,140,280,220],fill=hexc('ffb36b')); 
    for _ in range(14):  # smoke streaks
        y=rng.randint(30,140); x=rng.randrange(W); d.rectangle([x,y,x+rng.randint(40,120),y+3],fill=hexc('5a2a3a',120))
    for x in range(0,W,26):
        h=rng.randint(60,170); w=rng.randint(18,26); c=hexc('3a1a2a')
        top=240-h; wrap_rect(d,x,top,x+w,250,c)
        if rng.random()<0.6: wrap_poly(d,[(x,top),(x+w*0.6,top-rng.randint(6,20)),(x+w,top+rng.randint(4,18)),(x+w,top)],c)
        for wy in range(top+6,240,8):
            for wx in range(x+3,x+w-3,6):
                if rng.random()<0.15: wrap_rect(d,wx,wy,wx+2,wy+3,hexc('ff9a4a'))
    d.rectangle([0,248,W,H],fill=hexc('2a1220'))
    save(far,'city_far')
    mid=Image.new('RGBA',(W,H)); d=ImageDraw.Draw(mid)
    for x in range(0,W,120):
        h=rng.randint(120,170); top=H-h
        c=hexc('4a2a33'); wrap_rect(d,x+6,top,x+86,H,c)
        # broken jagged top
        pts=[(x+6,top)]+[(x+6+i*10,top-rng.randint(-14,8)) for i in range(9)]+[(x+86,top)]
        wrap_poly(d,pts+[(x+86,top+10),(x+6,top+10)],c)
        for wy in range(top+12,H-20,16):
            for wx in range(x+14,x+80,14):
                col=hexc('1f0f16') if rng.random()<0.7 else hexc('ff7a2a')
                wrap_rect(d,wx,wy,wx+7,wy+9,col)
        # exposed rebar
        for _ in range(4): rx=x+rng.randint(10,80); wrap_rect(d,rx,top-rng.randint(6,16),rx,top,hexc('8a6a6a'))
        # fire glow
        fx=x+rng.randint(10,70); fy=top+rng.randint(15,60)
        wrap_ellipse(d,fx-8,fy-6,fx+8,fy+6,hexc('ff6a1a',160)); wrap_ellipse(d,fx-4,fy-8,fx+4,fy+2,hexc('ffd26a'))
    save(mid,'city_mid')
    return dict(sky='#2a0f2e',tiles=('6a5a5a','3f3434','9a8a80','241c1e','ff6a2a'),accent='#ff7a2a')

# ---------------- LEVEL 5: VOID GATE ----------------
def void(rng):
    far=grad(hexc('05010d'),hexc('2a0a45')); d=ImageDraw.Draw(far)
    stars(d,160,hexc('d8b8ff'),rng,H)
    for _ in range(8):
        y=rng.randint(20,200); d.arc([rng.randint(-100,300),y,rng.randint(300,600),y+60],0,180,fill=hexc('5a1a8a',140),width=2)
    ridge(d,235,30,3,hexc('1a0830'),rng,4)
    save(far,'void_far')
    # vortex (non-tiling feature)
    vt=Image.new('RGBA',(200,200)); d=ImageDraw.Draw(vt)
    for r in range(96,0,-3):
        t=r/96; col=lerp(hexc('1a0030'),hexc('d06aff'),(1-t)**0.6) if r>18 else hexc('000000')
        d.ellipse([100-r,100-r*0.8,100+r,100+r*0.8],outline=col,width=3)
    for a in range(0,360,12):
        for k in range(12):
            r=20+k*6; ang=math.radians(a+k*14); d.point((100+r*math.cos(ang),100+0.8*r*math.sin(ang)),fill=hexc('f0c8ff'))
    up(vt).save(O+'bg/void_vortex.png')
    mid=Image.new('RGBA',(W,H)); d=ImageDraw.Draw(mid)
    for _ in range(9):  # floating rocks
        x=rng.randrange(W); y=rng.randint(40,200); w=rng.randint(20,50)
        wrap_poly(d,[(x,y),(x+w,y),(x+w-6,y+8),(x+w//2,y+rng.randint(18,34)),(x+6,y+8)],hexc('2a1640'))
        wrap_rect(d,x,y-2,x+w,y,hexc('8a3ad6'))
        for c in range(3): cx=x+rng.randint(4,w-4); wrap_poly(d,[(cx,y-2),(cx+3,y-10),(cx+6,y-2)],hexc('c06aff'))
    for x in range(0,W,70):  # ruined pillars
        h=rng.randint(60,130); wrap_rect(d,x,H-h,x+16,H,hexc('231338')); wrap_rect(d,x+2,H-h,x+4,H,hexc('5a2a8a'))
    save(mid,'void_mid')
    return dict(sky='#05010d',tiles=('3a2457','221433','a05aff','140a20','d06aff'),accent='#c06aff')

# --------------- tiles: 0 empty, 1 top, 2 fill, 3 platform(one-way), 4 top-left, 5 top-right, 6 spikes, 7 deco block --------------
def tileset(key,pal,rng):
    base,dark,top,deep,accent=[hexc(c) for c in pal]
    T=16; im=Image.new('RGBA',(T*8,T)); d=ImageDraw.Draw(im)
    def block(ox,toprow=True):
        d.rectangle([ox,0,ox+15,15],fill=base)
        for _ in range(10): x,y=rng.randrange(16),rng.randrange(16); d.point((ox+x,y),fill=dark)
        d.line([(ox,15),(ox+15,15)],fill=deep); d.line([(ox+15,0),(ox+15,15)],fill=dark)
        if key in('academy','lab','void'):
            d.line([(ox,7),(ox+15,7)],fill=dark); d.line([(ox+7,0),(ox+7,7)],fill=dark); d.line([(ox+3,8),(ox+3,15)],fill=dark)
        if toprow:
            d.rectangle([ox,0,ox+15,3],fill=top); d.line([(ox,0),(ox+15,0)],fill=lerp(top,(255,255,255,255),0.35))
            if key=='forest':
                for x in range(0,16,3): d.point((ox+x,4),fill=top); d.point((ox+x+1,0),fill=accent)
            if key=='lab':
                for x in range(0,16,4): d.line([(ox+x,1),(ox+x+1,2)],fill=accent)
            if key=='void': d.point((ox+rng.randrange(16),4),fill=accent)
    block(0); block(16,False)
    # one-way platform
    d.rectangle([32,0,47,5],fill=top); d.line([(32,0),(47,0)],fill=lerp(top,(255,255,255,255),0.4)); d.line([(32,5),(47,5)],fill=deep)
    for x in (34,44): d.line([(x,6),(x,9)],fill=dark)
    block(48); d.line([(48,0),(48,15)],fill=lerp(top,(255,255,255,255),0.3))
    block(64); d.line([(79,0),(79,15)],fill=deep)
    # spikes
    for x in range(0,16,4): d.polygon([(80+x,15),(80+x+2,4),(80+x+4,15)],fill=hexc('c8c8d8')); d.line([(80+x+2,4),(80+x+2,15)],fill=accent)
    block(96,True); [d.point((96+x,y),fill=accent) for x,y in ((3,6),(12,6),(3,12),(12,12))]
    d.rectangle([112,0,127,15],fill=deep)
    up(im).save(O+f'tiles/{key}.png')

# ---------------- props (environmental objects) ----------------
def props(rng):
    P={}
    def mk(w,h): im=Image.new('RGBA',(w,h)); return im,ImageDraw.Draw(im)
    im,d=mk(12,48); d.rectangle([5,8,6,47],fill=hexc('2a2440')); d.rectangle([2,0,9,9],fill=hexc('3a3058')); d.rectangle([3,2,8,7],fill=hexc('ffd27a')); d.rectangle([3,44,8,47],fill=hexc('2a2440')); P['lamp']=im
    im,d=mk(14,34); d.line([(1,0),(12,0)],fill=hexc('c8a24a')); d.rectangle([2,1,11,28],fill=hexc('5a2a9a')); d.polygon([(2,28),(7,33),(11,28)],fill=hexc('5a2a9a')); d.rectangle([5,8,8,16],fill=hexc('e8c86a')); P['banner']=im
    im,d=mk(22,30); d.rectangle([0,0,21,29],fill=hexc('5a3a2a')); 
    for y in (2,10,18): d.rectangle([2,y,19,y+6],fill=hexc('2a1a14')); [d.rectangle([3+i*3,y+1,4+i*3,y+6],fill=hexc(rng.choice(['8a2a2a','2a4a8a','3a7a3a','8a7a2a']))) for i in range(5)]
    P['bookshelf']=im
    im,d=mk(16,16); d.rectangle([0,0,15,15],fill=hexc('7a5a3a')); d.rectangle([0,0,15,15],outline=hexc('3a2a1a')); d.line([(0,0),(15,15)],fill=hexc('3a2a1a')); d.line([(15,0),(0,15)],fill=hexc('3a2a1a')); P['crate']=im
    im,d=mk(20,22); d.ellipse([0,0,19,21],fill=hexc('2f6a3a')); d.ellipse([3,2,15,10],fill=hexc('4f9a4a')); d.rectangle([8,16,11,21],fill=hexc('4a3020')); P['bush']=im
    im,d=mk(10,12); d.rectangle([4,5,5,11],fill=hexc('e8e0d0')); d.ellipse([0,0,9,6],fill=hexc('b45aff')); d.point((3,2),fill=hexc('ffffff')); P['mushroom']=im
    im,d=mk(16,40); d.rectangle([2,4,13,36],fill=hexc('3fc8ff',140)); d.rectangle([0,0,15,4],fill=hexc('4a5a6a')); d.rectangle([0,36,15,39],fill=hexc('4a5a6a')); d.ellipse([5,16,10,24],fill=hexc('233a4a')); P['tank']=im
    im,d=mk(20,20); d.rectangle([0,0,19,19],fill=hexc('1d2a35')); d.rectangle([2,2,17,12],fill=hexc('0e4a3a')); d.line([(3,5),(12,5)],fill=hexc('5affb0')); d.line([(3,8),(9,8)],fill=hexc('5affb0')); P['console']=im
    im,d=mk(44,18); d.polygon([(2,10),(10,3),(30,3),(38,10),(43,11),(43,16),(0,16)],fill=hexc('5a3a3a')); d.rectangle([12,5,20,9],fill=hexc('1a1a22')); d.rectangle([22,5,29,9],fill=hexc('1a1a22')); d.ellipse([5,12,12,18],fill=hexc('1a1a1a')); d.ellipse([30,12,37,18],fill=hexc('1a1a1a')); d.ellipse([16,0,24,6],fill=hexc('ff7a2a',180)); P['carwreck']=im
    im,d=mk(12,16); d.polygon([(6,0),(11,8),(9,15),(2,15),(0,8)],fill=hexc('ff6a1a')); d.polygon([(6,5),(9,10),(7,15),(4,15),(3,10)],fill=hexc('ffd26a')); P['fire']=im
    im,d=mk(12,20); d.polygon([(6,0),(11,10),(6,19),(1,10)],fill=hexc('a05aff')); d.polygon([(6,2),(8,10),(6,16)],fill=hexc('e8c8ff')); P['crystal']=im
    im,d=mk(18,36); d.rectangle([3,4,14,35],fill=hexc('b8b0c8')); d.rectangle([1,0,16,5],fill=hexc('d8d0e8')); d.rectangle([5,10,12,26],fill=hexc('ff5aa0')); d.rectangle([7,12,10,24],fill=hexc('ffd0e8')); P['checkpoint']=im
    im,d=mk(18,36); d.rectangle([3,4,14,35],fill=hexc('8a8098')); d.rectangle([1,0,16,5],fill=hexc('a8a0b8')); d.rectangle([5,10,12,26],fill=hexc('4a4058')); P['checkpoint_off']=im
    im,d=mk(10,10); d.ellipse([0,0,9,9],fill=hexc('ff4a6a')); d.ellipse([2,2,5,5],fill=hexc('ffc8d8')); P['orb_hp']=im
    im,d=mk(10,10); d.ellipse([0,0,9,9],fill=hexc('4a9aff')); d.ellipse([2,2,5,5],fill=hexc('c8e8ff')); P['orb_mp']=im
    im,d=mk(12,12); d.rectangle([1,3,10,11],fill=hexc('c8902a')); d.rectangle([1,3,10,5],fill=hexc('ffd26a')); d.rectangle([5,6,6,8],fill=hexc('3a2a1a')); P['chest']=im
    im,d=mk(8,8); d.ellipse([0,0,7,7],fill=hexc('ffd23a')); d.ellipse([2,1,4,3],fill=hexc('fff2b0')); P['coin']=im
    im,d=mk(24,40); d.rectangle([0,0,23,39],fill=hexc('2a1a4a')); d.rectangle([2,2,21,39],fill=hexc('8a3ad6',200)); d.ellipse([4,6,19,30],fill=hexc('e8c8ff',220)); P['portal']=im
    for k,v in P.items(): up(v).save(O+f'tiles/prop_{k}.png')

rng=random.Random(7)
import json
cfg={}
for name,fn in [('academy',academy),('forest',forest),('lab',lab),('city',city),('void',void)]:
    c=fn(rng); tileset(name,c['tiles'],rng); cfg[name]={'sky':c['sky'],'accent':c['accent']}
props(rng)
json.dump(cfg,open(O+'data/bg_meta.json','w'))
print('ok')
