"""Create collage hero images for roundup articles using real plugin screenshots."""
from PIL import Image, ImageDraw, ImageFont
import os

SRC = "public/images/heroes/src"
OUT = "public/images/heroes"
W, H = 1200, 630
BG = (15, 15, 20)

try:
    label_font = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 16)
    title_font = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 36)
except:
    label_font = ImageFont.load_default()
    title_font = ImageFont.load_default()


def load_img(name):
    for ext in ['.jpg', '.png', '.webp']:
        path = os.path.join(SRC, name + ext)
        if os.path.exists(path):
            return Image.open(path).convert("RGB")
    # Try with the name as-is (with extension)
    path = os.path.join(SRC, name)
    if os.path.exists(path):
        return Image.open(path).convert("RGB")
    print(f"  WARNING: {name} not found")
    return Image.new("RGB", (400, 300), (40, 40, 50))


def fit_to_box(img, box_w, box_h):
    """Resize image to fit within box, maintaining aspect ratio."""
    ratio = min(box_w / img.width, box_h / img.height)
    new_w, new_h = int(img.width * ratio), int(img.height * ratio)
    return img.resize((new_w, new_h), Image.LANCZOS)


def make_collage(images, output_name, title_text=None):
    """Create a 2x2 or 3-across collage from plugin screenshots."""
    canvas = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(canvas)

    n = len(images)
    padding = 8

    if title_text:
        # Title bar at top
        title_h = 60
        draw.rectangle([0, 0, W, title_h], fill=(20, 20, 28))
        draw.text((30, 14), title_text, fill=(255, 255, 255), font=title_font)
        area_top = title_h + padding
    else:
        area_top = padding

    area_h = H - area_top - padding

    if n <= 2:
        cols, rows = n, 1
    elif n <= 4:
        cols, rows = 2, 2
    else:
        cols, rows = 3, 2

    cell_w = (W - padding * (cols + 1)) // cols
    cell_h = (area_h - padding * (rows - 1)) // rows

    for i, (img_name, label) in enumerate(images[:cols*rows]):
        row, col = i // cols, i % cols
        x = padding + col * (cell_w + padding)
        y = area_top + row * (cell_h + padding)

        img = load_img(img_name)
        fitted = fit_to_box(img, cell_w, cell_h)

        # Center in cell
        cx = x + (cell_w - fitted.width) // 2
        cy = y + (cell_h - fitted.height) // 2
        canvas.paste(fitted, (cx, cy))

        # Label at bottom of cell
        if label:
            label_y = y + cell_h - 24
            # Semi-transparent background for label
            draw.rectangle([x, label_y - 2, x + cell_w, label_y + 20], fill=(0, 0, 0))
            draw.text((x + 8, label_y), label, fill=(200, 200, 200), font=label_font)

    out_path = os.path.join(OUT, output_name)
    canvas.save(out_path, "JPEG", quality=85)
    print(f"  Created: {output_name}")


# Also use existing hero images as sources
HEROES = "public/images/heroes"

# ── Best Free Reverb ──
make_collage([
    ("../valhalla-supermassive", "Valhalla Supermassive"),
    ("tal-reverb", "TAL-Reverb-4"),
    ("orilriver", "OrilRiver"),
    ("dragonfly", "Dragonfly Reverb"),
], "best-free-reverb.jpg", "Best Free Reverb Plugins")

# ── Best Free Synth ──
make_collage([
    ("../vital", "Vital"),
    ("../surge-xt", "Surge XT"),
    ("../dexed", "Dexed"),
    ("helm", "Helm"),
], "best-free-synth.jpg", "Best Free Synth Plugins")

# ── Best Free VST ──
make_collage([
    ("../vital", "Vital"),
    ("../fabfilter-pro-q-4", "FabFilter Pro-Q 4"),
    ("../valhalla-supermassive", "Valhalla Supermassive"),
    ("../surge-xt", "Surge XT"),
    ("../dexed", "Dexed"),
    ("../soundtoys-little-plate", "Soundtoys Little Plate"),
], "best-free-vst.jpg", "Best Free VST Plugins 2026")

# ── Best Free DAW ──
make_collage([
    ("ardour", "Ardour"),
    ("lmms", "LMMS"),
    ("waveform", "Waveform Free"),
    ("cakewalk", "Cakewalk"),
], "best-free-daw.jpg", "Best Free DAW Software")

# ── Best Free Drum ──
make_collage([
    ("mt-powerdrumkit", "MT-PowerDrumKit"),
    ("ssd-free", "SSD5 Free"),
    ("sitala", "Sitala"),
], "best-free-drum.jpg", "Best Free Drum Plugins")

# ── Plugin Boutique Guide ──
make_collage([
    ("pb-storefront", ""),
], "plugin-boutique-guide.jpg", "Plugin Boutique — Deals Guide")

# ── Free vs Paid ──
make_collage([
    ("../vital", "Vital (Free)"),
    ("../fabfilter-pro-q-4", "FabFilter Pro-Q 4 (Paid)"),
    ("../dexed", "Dexed (Free)"),
    ("../arturia-v-collection", "Arturia V Collection (Paid)"),
], "free-vs-paid.jpg", "Free vs Paid Plugins")

print("\nAll collages done!")
