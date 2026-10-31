"""Builds the app icon (adaptive foreground/background + legacy) and splash screens from the supplied art.
Output goes to assets/ for `npx @capacitor/assets generate --android`."""
import math, random, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
U = sys.argv[1] if len(sys.argv) > 1 else '/mnt/user-data/uploads/'
O = sys.argv[2] if len(sys.argv) > 2 else 'assets/'
S = 1024
rng = random.Random(3)

def radial(size, inner, outer, power=1.0):
    y, x = np.mgrid[0:size, 0:size]; c = (size - 1) / 2
    d = np.clip(np.sqrt((x - c) ** 2 + (y - c) ** 2) / (size * 0.72), 0, 1) ** power
    a = np.array(inner, float); b = np.array(outer, float)
    img = a[None, None] * (1 - d[..., None]) + b[None, None] * d[..., None]
    return Image.fromarray(img.astype(np.uint8), 'RGB').convert('RGBA')

# ---------- background: void swirl + stars
bg = radial(S, (88, 24, 140), (10, 4, 22), 0.8)
d = ImageDraw.Draw(bg, 'RGBA')
for i in range(26):  # swirl arcs
    r = 120 + i * 17; a0 = rng.randrange(360)
    d.arc([S/2 - r, S/2 - r*0.9, S/2 + r, S/2 + r*0.9], a0, a0 + rng.randrange(60, 200), fill=(190, 90, 255, 40 + i), width=6)
for _ in range(140):
    x, y = rng.randrange(S), rng.randrange(S); s = rng.choice([4, 4, 8])
    d.rectangle([x, y, x + s, y + s], fill=(235, 210, 255, rng.randrange(120, 255)))
bg = bg.filter(ImageFilter.GaussianBlur(1))

# ---------- foreground: rune ring + Kai portrait (pixel-art upscale) with aura
fg = Image.new('RGBA', (S, S), (0, 0, 0, 0))
ring = Image.new('RGBA', (S, S), (0, 0, 0, 0)); rd = ImageDraw.Draw(ring)
c = S / 2; R = 330
rd.ellipse([c - R, c - R, c + R, c + R], outline=(255, 90, 200, 255), width=14)
rd.ellipse([c - R + 30, c - R + 30, c + R - 30, c + R - 30], outline=(190, 110, 255, 220), width=6)
for k in range(5):  # star points
    a = -math.pi / 2 + k * 2 * math.pi / 5
    rd.polygon([(c + (R + 46) * math.cos(a), c + (R + 46) * math.sin(a)),
                (c + (R - 6) * math.cos(a - 0.09), c + (R - 6) * math.sin(a - 0.09)),
                (c + (R - 6) * math.cos(a + 0.09), c + (R - 6) * math.sin(a + 0.09))], fill=(255, 120, 220, 255))
for k in range(36):  # rune ticks
    a = k * 2 * math.pi / 36; r1, r2 = R - 26, R - 12
    rd.line([(c + r1 * math.cos(a), c + r1 * math.sin(a)), (c + r2 * math.cos(a), c + r2 * math.sin(a))], fill=(230, 180, 255, 200), width=5)
glow = ring.filter(ImageFilter.GaussianBlur(18))
fg.alpha_composite(glow); fg.alpha_composite(glow); fg.alpha_composite(ring)

kai = Image.open(U + 'e161a48a-image.png').convert('RGBA').crop((150, 0, 345, 205))
kai = kai.crop(kai.getbbox())
scale = 560 / kai.height
kai = kai.resize((round(kai.width * scale), round(kai.height * scale)), Image.NEAREST)
# circular cut so the bust sits inside the ring
mask = Image.new('L', (S, S), 0); ImageDraw.Draw(mask).ellipse([c - R + 34, c - R + 34, c + R - 34, c + R - 34], fill=255)
layer = Image.new('RGBA', (S, S), (0, 0, 0, 0))
kx, ky = int(c - kai.width / 2), int(c - kai.height / 2 + 40)
aura = Image.new('RGBA', (S, S), (0, 0, 0, 0))
al = kai.split()[3].point(lambda v: 255 if v > 40 else 0)
aura.paste(Image.new('RGBA', kai.size, (200, 60, 255, 255)), (kx, ky), al)
aura = aura.filter(ImageFilter.GaussianBlur(22))
layer.alpha_composite(aura); layer.alpha_composite(kai, (kx, ky))
inner = Image.new('RGBA', (S, S), (0, 0, 0, 0)); inner.paste(layer, (0, 0), Image.composite(layer.split()[3], Image.new('L', (S, S), 0), mask))
# let the hair spill over the top of the ring a little: keep pixels above ring centre-line unmasked
top = Image.new('L', (S, S), 0); ImageDraw.Draw(top).rectangle([0, 0, S, c - R + 120], fill=255)
spill = Image.new('RGBA', (S, S), (0, 0, 0, 0)); spill.paste(layer, (0, 0), Image.composite(layer.split()[3], Image.new('L', (S, S), 0), top))
fg.alpha_composite(inner); fg.alpha_composite(spill)

bg.save(O + 'icon-background.png')
fg.save(O + 'icon-foreground.png')
full = bg.copy(); full.alpha_composite(fg)
full.save(O + 'icon-only.png')

# ---------- splash: logo from the overview sheet on the void background
SP = 2732
sp = radial(SP, (60, 16, 100), (8, 3, 18), 0.9)
sd = ImageDraw.Draw(sp, 'RGBA')
for _ in range(400):
    x, y = rng.randrange(SP), rng.randrange(SP); s = rng.choice([4, 6, 10])
    sd.rectangle([x, y, x + s, y + s], fill=(235, 210, 255, rng.randrange(80, 230)))
logo = Image.open(U + 'c8b415de-image.png').convert('RGBA').crop((18, 8, 345, 245))
# knock out the dark backdrop of the logo crop so only the lettering/emblem remains
a = np.array(logo).astype(int); lum = a[..., :3].max(-1)
a[..., 3] = np.clip((lum - 70) * 4, 0, 255)
logo = Image.fromarray(a.astype(np.uint8), 'RGBA')
ls = 1400 / logo.width; logo = logo.resize((1400, round(logo.height * ls)), Image.NEAREST)
lg = logo.filter(ImageFilter.GaussianBlur(30))
sp.alpha_composite(lg, ((SP - logo.width) // 2, (SP - logo.height) // 2 - 60))
sp.alpha_composite(logo, ((SP - logo.width) // 2, (SP - logo.height) // 2 - 60))
sp.convert('RGB').save(O + 'splash.png')
sp.convert('RGB').save(O + 'splash-dark.png')
print('ok')
