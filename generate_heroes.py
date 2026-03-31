"""Generate hero images for PluginDrop articles."""
from PIL import Image, ImageDraw, ImageFont
import os, math

OUTPUT_DIR = "public/images/heroes"
os.makedirs(OUTPUT_DIR, exist_ok=True)

W, H = 1200, 630  # OG image standard

# Article configs: (filename, title, subtitle, accent_color, icon_emoji_text)
articles = [
    ("vital", "Vital", "Free Wavetable Synth", "#7C3AED", "SYNTH"),
    ("valhalla-supermassive", "Valhalla Supermassive", "Free Reverb & Delay", "#6D28D9", "REVERB"),
    ("tdr-nova", "TDR Nova", "Free Dynamic EQ", "#2563EB", "EQ"),
    ("surge-xt", "Surge XT", "Free Open Source Synth", "#DC2626", "SYNTH"),
    ("spitfire-labs", "Spitfire LABS", "Free Sample Library", "#059669", "SAMPLES"),
    ("soundtoys-little-plate", "Soundtoys Little Plate", "Free Plate Reverb", "#D97706", "REVERB"),
    ("izotope-vinyl", "iZotope Vinyl", "Free Lo-Fi Plugin", "#4F46E5", "EFFECT"),
    ("dexed", "Dexed", "Free DX7 Emulation", "#EA580C", "SYNTH"),
    ("fabfilter-pro-q-4", "FabFilter Pro-Q 4", "30% Off Spring Sale", "#EAB308", "EQ"),
    ("arturia-v-collection", "Arturia V Collection", "50% Off — 39 Instruments", "#E11D48", "BUNDLE"),
    ("best-free-reverb", "Best Free Reverb Plugins", "2026 Roundup", "#8B5CF6", "GUIDE"),
    ("best-free-synth", "Best Free Synth Plugins", "2026 Roundup", "#10B981", "GUIDE"),
    ("best-free-vst", "Best Free VST Plugins", "2026 Roundup", "#3B82F6", "GUIDE"),
    ("best-free-daw", "Best Free DAW Software", "2026 Roundup", "#F59E0B", "GUIDE"),
    ("best-free-drum", "Best Free Drum Plugins", "2026 Roundup", "#EF4444", "GUIDE"),
    ("plugin-boutique-guide", "Plugin Boutique", "Deals & Savings Guide", "#14B8A6", "GUIDE"),
    ("free-vs-paid", "Free vs Paid Plugins", "Worth Upgrading?", "#8B5CF6", "GUIDE"),
]

def hex_to_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

def darken(rgb, factor=0.3):
    return tuple(int(c * factor) for c in rgb)

def draw_grid(draw, w, h, color, spacing=40):
    """Draw subtle grid pattern."""
    grid_color = (*color, 15)
    for x in range(0, w, spacing):
        draw.line([(x, 0), (x, h)], fill=grid_color, width=1)
    for y in range(0, h, spacing):
        draw.line([(0, y), (w, y)], fill=grid_color, width=1)

def draw_waveform(draw, w, h, color, y_center):
    """Draw decorative waveform."""
    points = []
    for x in range(0, w, 3):
        amplitude = 30 * math.sin(x * 0.02) * math.cos(x * 0.005)
        y = y_center + amplitude
        points.append((x, y))
    if len(points) > 1:
        draw.line(points, fill=(*color, 40), width=2)

try:
    title_font = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 56)
    subtitle_font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 28)
    tag_font = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 18)
    brand_font = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 20)
except:
    title_font = ImageFont.load_default()
    subtitle_font = ImageFont.load_default()
    tag_font = ImageFont.load_default()
    brand_font = ImageFont.load_default()

for filename, title, subtitle, accent_hex, tag in articles:
    accent = hex_to_rgb(accent_hex)
    bg_dark = darken(accent, 0.12)

    img = Image.new("RGBA", (W, H), (*bg_dark, 255))
    draw = ImageDraw.Draw(img, "RGBA")

    # Background grid
    draw_grid(draw, W, H, accent)

    # Decorative waveforms
    draw_waveform(draw, W, H, accent, H * 0.3)
    draw_waveform(draw, W, H, accent, H * 0.7)

    # Gradient overlay from left
    for x in range(W // 2):
        alpha = int(80 * (1 - x / (W // 2)))
        draw.line([(x, 0), (x, H)], fill=(*accent, alpha))

    # Tag pill
    tag_text = tag
    tag_bbox = draw.textbbox((0, 0), tag_text, font=tag_font)
    tag_w = tag_bbox[2] - tag_bbox[0] + 24
    tag_h = tag_bbox[3] - tag_bbox[1] + 12
    tag_x, tag_y = 60, H // 2 - 80
    draw.rounded_rectangle(
        [tag_x, tag_y, tag_x + tag_w, tag_y + tag_h],
        radius=4, fill=(*accent, 200)
    )
    draw.text((tag_x + 12, tag_y + 4), tag_text, fill=(255, 255, 255), font=tag_font)

    # Title
    title_y = tag_y + tag_h + 16
    draw.text((60, title_y), title, fill=(255, 255, 255), font=title_font)

    # Subtitle
    sub_y = title_y + 70
    draw.text((60, sub_y), subtitle, fill=(200, 200, 200), font=subtitle_font)

    # Bottom accent line
    draw.rectangle([0, H - 4, W, H], fill=(*accent, 255))

    # Brand watermark
    draw.text((W - 160, H - 36), "PluginDrop", fill=(255, 255, 255, 80), font=brand_font)

    # Save as RGB JPEG
    img_rgb = img.convert("RGB")
    path = os.path.join(OUTPUT_DIR, f"{filename}.jpg")
    img_rgb.save(path, "JPEG", quality=85)
    print(f"  Created: {path}")

print(f"\nDone: {len(articles)} hero images generated")
