import os
from PIL import Image, ImageDraw, ImageFont

output_dir = r"d:\FINAL\NWISfinal\NWIS\frontend\public\samples"
os.makedirs(output_dir, exist_ok=True)

# 1. Generate PNG image of a DDR report page for OCR testing
img_path = os.path.join(output_dir, "ddr_scanned_page.png")
width, height = 800, 600
image = Image.new("RGB", (width, height), color=(255, 255, 255))
draw = ImageDraw.Draw(image)

text_lines = [
    "DAILY DRILLING REPORT - WELL X09",
    "Date: 2024-04-12 | Rig: ONGC E-760 | Status: Drilling",
    "Current Depth: 3790 m MD | Target Formation: Barail Shale",
    "----------------------------------------------------------------",
    "OPERATIONAL INCIDENT LOG:",
    "At 3764 m depth in Barail Shale, severe mud loss observed.",
    "Loss rate ~18 bbl/hr with active pit volume reduction.",
    "Mitigation applied: Spotted LCM pill (CaCO3 25 ppb).",
    "At 3772 m, experienced tight hole and stuck pipe condition.",
    "Overpull reached 18 tonnes overpull before string worked free.",
    "Drilling resumed with erratic torque spike across 3778 to 3790 m.",
    "Mitigation: mud weight raised 1.06 to 1.09 sg, wiper trip."
]

y = 40
for line in text_lines:
    draw.text((40, y), line, fill=(20, 20, 20))
    y += 35

image.save(img_path)
print(f"Generated OCR test image at: {img_path}")
