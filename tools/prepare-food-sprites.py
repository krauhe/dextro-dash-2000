"""Prepare authorised opaque-background food artwork as clean RGBA sprites.

Connected near-white background is removed without cutting white egg/eyes.
Each sprite is normalised to a common foot baseline for runtime animation.
Usage: prepare-food-sprites.py ATLAS OUTPUT_DIRECTORY [BANANA_REPLACEMENT]
"""
from pathlib import Path
from collections import deque
import sys
from PIL import Image, ImageFilter

def cut_background(image):
    image = image.convert('RGBA')
    pixels = image.load()
    width, height = image.size
    visited = bytearray(width * height)
    queue = deque()
    def push(x, y):
        offset = y * width + x
        if visited[offset]: return
        visited[offset] = 1
        r, g, b, a = pixels[x, y]
        # Checkerboard is achromatic and very bright; white eyes remain
        # protected by their coloured outline and disconnected component.
        if a == 0 or (min(r,g,b) >= 222 and max(r,g,b)-min(r,g,b) < 19):
            queue.append((x,y))
    for x in range(width): push(x,0); push(x,height-1)
    for y in range(height): push(0,y); push(width-1,y)
    while queue:
        x,y = queue.popleft()
        pixels[x,y] = (0,0,0,0)
        for nx,ny in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
            if 0 <= nx < width and 0 <= ny < height: push(nx,ny)
    bounds = image.getbbox()
    if not bounds: raise ValueError('Empty character')
    sprite=image.crop(bounds)
    sprite.thumbnail((440,450),Image.Resampling.LANCZOS)
    # Fjern den sidste lyse mattepixel efter nedskalering. Indre hvide
    # ansigtsdele bevares; kun alfakanalens ydre kant trækkes én pixel ind.
    sprite.putalpha(sprite.getchannel('A').filter(ImageFilter.MinFilter(3)))
    result=Image.new('RGBA',(512,512))
    result.alpha_composite(sprite,((512-sprite.width)//2,480-sprite.height))
    return result

atlas=Image.open(sys.argv[1])
output=Path(sys.argv[2])
for i,name in enumerate(('apple','egg','banana','avocado','burger','pizza')):
    w,h=atlas.width//3,atlas.height//2
    cell=atlas.crop(((i%3)*w,(i//3)*h,(i%3+1)*w,(i//3+1)*h))
    if name=='banana' and len(sys.argv)>3: cell=Image.open(sys.argv[3])
    result=cut_background(cell)
    result.save(output/f'food-{name}.png')
    print(name,result.size,result.getchannel('A').getextrema())
