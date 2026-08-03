"""Regenerate brand PNGs from media/new_logo.jpeg.

Outputs (all solid-black art on transparent background):
  admin/public/logo-full.png, storefront/public/logo-full.png  — trimmed "Gr8" wordmark
  admin/public/favicon.png, storefront/public/favicon.png,
  storefront/src/app/icon.png                                   — square G monogram
"""
from collections import deque
from pathlib import Path

from PIL import Image, ImageChops, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "media" / "new_logo.jpeg"

im = Image.open(SRC).convert("L")
w, h = im.size

# Luminance -> alpha: white paper drops out, ink stays, edges keep a smooth ramp.
WHITE, BLACK = 235, 70
lut = []
for v in range(256):
    if v >= WHITE:
        lut.append(0)
    elif v <= BLACK:
        lut.append(255)
    else:
        lut.append(round(255 * (WHITE - v) / (WHITE - BLACK)))
alpha = im.point(lut)

art = Image.new("RGBA", (w, h), (0, 0, 0, 0))
art.putalpha(alpha)  # RGB stays black

bbox = alpha.getbbox()
wordmark = art.crop(bbox)
print("wordmark:", wordmark.size)

# --- G monogram: leftmost connected component on a downscaled mask ---
SCALE = max(1, w // 360)
small = alpha.resize((w // SCALE, h // SCALE))
sw, sh = small.size
px = small.load()
seen = [[False] * sw for _ in range(sh)]
components = []  # (min_x, pixel set)
for y in range(sh):
    for x in range(sw):
        if seen[y][x] or px[x, y] < 128:
            continue
        q = deque([(x, y)])
        seen[y][x] = True
        pixels = set()
        minx = x
        while q:
            cx, cy = q.popleft()
            pixels.add((cx, cy))
            minx = min(minx, cx)
            for nx, ny in ((cx-1, cy), (cx+1, cy), (cx, cy-1), (cx, cy+1),
                           (cx-1, cy-1), (cx+1, cy-1), (cx-1, cy+1), (cx+1, cy+1)):
                if 0 <= nx < sw and 0 <= ny < sh and not seen[ny][nx] and px[nx, ny] >= 128:
                    seen[ny][nx] = True
                    q.append((nx, ny))
        if len(pixels) > 30:  # skip speckle
            components.append((minx, pixels))

components.sort(key=lambda c: c[0])  # leftmost glyph = the G
# Mask alpha to only the G's pixels — its italic bounding rectangle overlaps
# the neighbouring glyphs, so a plain rectangular crop would catch them too.
mask_small = Image.new("L", (sw, sh), 0)
mpx = mask_small.load()
for cx, cy in components[0][1]:
    mpx[cx, cy] = 255
mask_small = mask_small.filter(ImageFilter.MaxFilter(3))  # dilate ~1px small-scale
mask = mask_small.resize((w, h), Image.BILINEAR)
g_alpha = ImageChops.multiply(alpha, mask)
g = Image.new("RGBA", (w, h), (0, 0, 0, 0))
g.putalpha(g_alpha)
g = g.crop(g_alpha.getbbox())
print("G glyph:", g.size, "of", len(components), "components")

# Center on a square canvas with ~8% margin, then normalize to 1024px.
side = round(max(g.size) * 1.16)
mark = Image.new("RGBA", (side, side), (0, 0, 0, 0))
mark.paste(g, ((side - g.width) // 2, (side - g.height) // 2))
mark = mark.resize((1024, 1024), Image.LANCZOS)

for dest in ("admin/public/logo-full.png", "storefront/public/logo-full.png"):
    wordmark.save(ROOT / dest)
    print("wrote", dest)
for dest in ("admin/public/favicon.png", "storefront/public/favicon.png",
             "storefront/src/app/icon.png"):
    mark.save(ROOT / dest)
    print("wrote", dest)
