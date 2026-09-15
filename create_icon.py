import os
import subprocess
from PIL import Image, ImageDraw

def create_master_icon(size=1024):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # 1. Outer rounded rect (macOS standard squircle-style)
    # Margin ~80px for standard 1024px icon
    margin = 80
    x0, y0, x1, y1 = margin, margin, size - margin, size - margin
    radius = 190

    # Draw gradient background
    base_rect = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    base_draw = ImageDraw.Draw(base_rect)

    # Gradient from crimson-red (#e11d48) to violet-indigo (#4f46e5)
    for y in range(margin, size - margin):
        ratio = (y - margin) / (size - 2 * margin)
        # RGB interpolation
        r = int(239 * (1 - ratio) + 79 * ratio)
        g = int(68 * (1 - ratio) + 70 * ratio)
        b = int(68 * (1 - ratio) + 229 * ratio)
        base_draw.line([(margin, y), (size - margin, y)], fill=(r, g, b, 255))

    # Mask with rounded rectangle
    mask = Image.new("L", (size, size), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle([x0, y0, x1, y1], radius=radius, fill=255)

    # Soft outer drop shadow
    shadow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.rounded_rectangle([x0, y0 + 18, x1, y1 + 18], radius=radius, fill=(0, 0, 0, 90))
    
    # Composite shadow + masked gradient
    img.paste(shadow, (0, 0), shadow)
    img.paste(base_rect, (0, 0), mask)

    # 2. Add subtle glossy highlight border
    draw.rounded_rectangle([x0, y0, x1, y1], radius=radius, outline=(255, 255, 255, 60), width=4)

    # 3. Center White Icon Elements:
    # A circular vinyl record / music badge in center
    cx, cy = size // 2, size // 2 - 20
    circle_r = 230

    # Outer white circle with glow
    draw.ellipse([cx - circle_r, cy - circle_r, cx + circle_r, cy + circle_r], fill=(255, 255, 255, 28), outline=(255, 255, 255, 180), width=8)
    draw.ellipse([cx - 150, cy - 150, cx + 150, cy + 150], outline=(255, 255, 255, 60), width=4)

    # Musical Note Symbol + Download Arrow
    # Draw double beamed musical note (white with drop shadow)
    # Left note head
    n1_x, n1_y = cx - 75, cy + 40
    draw.ellipse([n1_x - 32, n1_y - 25, n1_x + 32, n1_y + 25], fill=(255, 255, 255, 255))
    # Right note head
    n2_x, n2_y = cx + 55, cy + 10
    draw.ellipse([n2_x - 32, n2_y - 25, n2_x + 32, n2_y + 25], fill=(255, 255, 255, 255))

    # Note stems
    draw.rectangle([n1_x + 18, cy - 110, n1_x + 32, n1_y], fill=(255, 255, 255, 255))
    draw.rectangle([n2_x + 18, cy - 130, n2_x + 32, n2_y], fill=(255, 255, 255, 255))

    # Connecting Beam
    beam_points = [
        (n1_x + 18, cy - 85),
        (n2_x + 32, cy - 105),
        (n2_x + 32, cy - 135),
        (n1_x + 18, cy - 115)
    ]
    draw.polygon(beam_points, fill=(255, 255, 255, 255))

    # Download arrow badge at bottom center
    arrow_cy = cy + 240
    # Down arrow shaft
    draw.rectangle([cx - 16, arrow_cy - 85, cx + 16, arrow_cy - 10], fill=(255, 255, 255, 255))
    # Arrow head
    draw.polygon([
        (cx - 50, arrow_cy - 15),
        (cx + 50, arrow_cy - 15),
        (cx, arrow_cy + 35)
    ], fill=(255, 255, 255, 255))
    # Base tray line
    draw.rounded_rectangle([cx - 70, arrow_cy + 50, cx + 70, arrow_cy + 62], radius=6, fill=(255, 255, 255, 255))

    return img

def build_icns():
    os.makedirs("AppIcon.iconset", exist_ok=True)
    master = create_master_icon(1024)
    master.save("AppIcon_1024.png")

    sizes = [
        (16, "icon_16x16.png"),
        (32, "icon_16x16@2x.png"),
        (32, "icon_32x32.png"),
        (64, "icon_32x32@2x.png"),
        (128, "icon_128x128.png"),
        (256, "icon_128x128@2x.png"),
        (256, "icon_256x256.png"),
        (512, "icon_256x256@2x.png"),
        (512, "icon_512x512.png"),
        (1024, "icon_512x512@2x.png"),
    ]

    for s, name in sizes:
        resized = master.resize((s, s), Image.Resampling.LANCZOS)
        resized.save(os.path.join("AppIcon.iconset", name))

    subprocess.run(["iconutil", "-c", "icns", "AppIcon.iconset", "-o", "AppIcon.icns"], check=True)
    print("AppIcon.icns successfully created!")

if __name__ == "__main__":
    build_icns()
