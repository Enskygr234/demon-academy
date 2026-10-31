import json,sys
from PIL import Image,ImageDraw
D='/home/claude/game/www/assets/sprites/'
meta=json.load(open('/home/claude/game/www/assets/data/sprite_meta.json'))
for key in sys.argv[1:]:
    m=meta[key]; atl=json.load(open(D+key+'.json')); img=Image.open(D+key+'.png')
    FW,FH=m['frameW'],m['frameH']; anims=m['anims']; cols=max(anims.values())
    out=Image.new('RGBA',(cols*FW+60,len(anims)*FH),(200,200,210,255)); d=ImageDraw.Draw(out)
    for r,(a,n) in enumerate(anims.items()):
        d.text((2,r*FH+2),a,fill=(0,0,0))
        for i in range(n):
            f=atl['frames'][f'{a}_{i}']; fr=f['frame']; s=f['spriteSourceSize']
            crop=img.crop((fr['x'],fr['y'],fr['x']+fr['w'],fr['y']+fr['h']))
            ox=60+i*FW; oy=r*FH
            d.rectangle([ox,oy,ox+FW-1,oy+FH-1],outline=(150,150,160))
            out.alpha_composite(crop,(ox+s['x'],oy+s['y']))
            d.line([(ox+m['anchorX'],oy),(ox+m['anchorX'],oy+FH)],fill=(255,0,0,120))
            d.line([(ox,oy+m['anchorY']),(ox+FW,oy+m['anchorY'])],fill=(0,0,255,120))
    out.save(f'/home/claude/work/prev_{key}.png')
