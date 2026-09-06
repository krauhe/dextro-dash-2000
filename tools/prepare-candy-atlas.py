"""Prepare eight generated candy renders as an actual transparent sprite atlas.

User-approved deterministic cutout: these particular candies are convex solids.
Their red perimeter defines a convex hull; white candy interiors stay opaque.
This is not a generic white-background remover and must not be used for foliage.
Usage: python tools/prepare-candy-atlas.py SOURCE.png assets/candy-spin.png
"""
import sys
from PIL import Image, ImageDraw, ImageFilter


def convex_hull(points):
    """Monotone-chain hull around the candy's red rim, including white stripes."""
    points = sorted(set(points))
    def cross(origin, left, right):
        return (left[0]-origin[0])*(right[1]-origin[1]) - (left[1]-origin[1])*(right[0]-origin[0])
    lower, upper = [], []
    for collection, sequence in ((lower, points), (upper, reversed(points))):
        for point in sequence:
            while len(collection) >= 2 and cross(collection[-2], collection[-1], point) <= 0:
                collection.pop()
            collection.append(point)
    return lower[:-1] + upper[:-1]


def prepare(source_path, output_path):
    source = Image.open(source_path).convert('RGB')
    if source.size != (1536, 1024):
        raise ValueError('This cutout is calibrated for the approved 1536 x 1024 render.')
    # Renders have uneven cell centres. Explicit windows avoid cutting a neighbour.
    columns = [(45, 445), (450, 805), (875, 1075), (1140, 1500)]
    rows = [(95, 470), (545, 920)]
    atlas = Image.new('RGBA', (1536, 768))
    for index in range(8):
        left, right = columns[index % 4]
        top, bottom = rows[index // 4]
        crop = source.crop((left, top, right, bottom))
        pixels = crop.load()
        rim = []
        for y in range(crop.height):
            xs = [x for x in range(crop.width)
                  if pixels[x,y][0] > 130 and pixels[x,y][0]-max(pixels[x,y][1:]) > 32]
            if xs:
                rim.extend([(xs[0], y), (xs[-1], y)])
        hull = convex_hull(rim)
        mask = Image.new('L', (crop.width*4, crop.height*4))
        ImageDraw.Draw(mask).polygon([(x*4,y*4) for x,y in hull], fill=255)
        # Inset by one source pixel so the pale checkerboard cannot fringe the rim.
        mask = mask.filter(ImageFilter.MinFilter(9)).resize(crop.size, Image.Resampling.LANCZOS)
        sprite = crop.convert('RGBA')
        sprite.putalpha(mask)
        sprite = sprite.crop(mask.getbbox())
        width = round(sprite.width * 336 / sprite.height)
        sprite = sprite.resize((width,336), Image.Resampling.LANCZOS)
        atlas.alpha_composite(sprite, ((index%4)*384+(384-width)//2, (index//4)*384+24))
    atlas.save(output_path)
    print(f'{output_path}: {atlas.size}, RGBA, alpha={atlas.getchannel("A").getextrema()}')


if __name__ == '__main__':
    prepare(sys.argv[1], sys.argv[2])
