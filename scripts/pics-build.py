#!/usr/bin/env python3
import sys, os
from PIL import Image

PICS = {
    "teapot": ("om", "1FAD6"), "toothbrush": ("om", "1FAA5"), "mirror": ("om", "1FA9E"), "plant": ("om", "1FAB4"),
    "bucket": ("om", "1FAA3"), "basket": ("om", "1F9FA"), "ladder": ("om", "1FA9C"), "hammer": ("om", "1F528"),
    "lamp": ("om", "E163"), "washing-machine": ("om", "E1CF"), "coffee-machine": ("om", "E155"), "bottle": ("om", "E0CC"),
    "jug": ("om", "E153"), "chopsticks": ("om", "1F962"), "pencil": ("om", "270F"), "headphones": ("om", "1F3A7"),
    "tablet": ("om", "E1CC"), "calculator": ("om", "E1DB"), "keyboard": ("om", "E1D1"), "scales": ("om", "E32B"),
    "fork": ("own", "fork"), "plate": ("own", "plate"), "bowl": ("own", "bowl"), "pot": ("own", "pot"),
    "kettle": ("own", "kettle"), "fridge": ("own", "fridge"), "pillow": ("own", "pillow"), "towel": ("own", "towel"),
    "toaster": ("own", "toaster"),
}
MAGIC = b"\x89PNG\r\n\x1a\n"

def main(om, own, out):
    os.makedirs(out, exist_ok=True)
    for name, (kind, stem) in PICS.items():
        src = os.path.join(om if kind == "om" else own, stem + ".png")
        with open(src, "rb") as f:
            if f.read(8) != MAGIC:
                raise SystemExit(f"{src}: not a PNG")
        im = Image.open(src).convert("RGBA")
        if im.size != (256, 256):
            im = im.resize((256, 256), Image.LANCZOS)
        q = im.quantize(colors=48, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
        q.save(os.path.join(out, name + ".png"), optimize=True)
        print(name, os.path.getsize(os.path.join(out, name + ".png")))

if __name__ == "__main__":
    main(*sys.argv[1:4])
