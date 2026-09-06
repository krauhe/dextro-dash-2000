"""Build the sixteen-frame candy atlas from the generated 4 x 4 sheet.

Uses the previously approved convex candy cutout, preserving opaque white
stripes. Normalizes centres, height and projected disk width for steady turns.
Usage: python tools/prepare-candy-spin16.py INPUT.png OUTPUT.png
"""
import importlib.util
import math
import pathlib
import sys
from PIL import Image, ImageDraw, ImageFilter

spec = importlib.util.spec_from_file_location('cutout', pathlib.Path(__file__).with_name('prepare-candy-atlas.py'))
cutout = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cutout)

def prepare(source_path, output_path):
    source = Image.open(source_path).convert('RGB')
    atlas = Image.new('RGBA', (1536, 1536))
    for index in range(16):
        col, row = index % 4, index // 4
        crop = source.crop((round(col * source.width / 4), round(row * source.height / 4),
                            round((col + 1) * source.width / 4), round((row + 1) * source.height / 4)))
        pixels = crop.load()
        rim = []
        for y in range(crop.height):
            xs = [x for x in range(crop.width) if pixels[x, y][0] > 130
                  and pixels[x, y][0] - max(pixels[x, y][1:]) > 32]
            if xs:
                rim.extend([(xs[0], y), (xs[-1], y)])
        mask = Image.new('L', (crop.width * 4, crop.height * 4))
        ImageDraw.Draw(mask).polygon([(x * 4, y * 4) for x, y in cutout.convex_hull(rim)], fill=255)
        mask = mask.filter(ImageFilter.MinFilter(9)).resize(crop.size, Image.Resampling.LANCZOS)
        sprite = crop.convert('RGBA')
        sprite.putalpha(mask)
        sprite = sprite.crop(mask.getbbox())
        # Orthographic silhouette of a rounded disk: face plus visible rim.
        angle = index * math.tau / 16
        width = round(320 * math.sqrt(math.cos(angle) ** 2 + (0.18 * math.sin(angle)) ** 2))
        sprite = sprite.resize((width, 336), Image.Resampling.LANCZOS)
        atlas.alpha_composite(sprite, (col * 384 + (384 - width) // 2, row * 384 + 24))
    atlas.save(output_path)
    print(f'{output_path}: {atlas.size}, RGBA, 16 frames, alpha {atlas.getchannel("A").getextrema()}')

if __name__ == '__main__':
    prepare(*sys.argv[1:])
