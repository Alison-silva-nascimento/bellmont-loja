from pathlib import Path
import re
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "src" / "data" / "products.ts"
ASSETS = ROOT / "public" / "assets"
OUTPUT = ROOT / "docs" / "catalog"


def font(size: int, bold: bool = False):
    filename = "arialbd.ttf" if bold else "arial.ttf"
    return ImageFont.truetype(str(Path("C:/Windows/Fonts") / filename), size)


def money(value: float) -> str:
    return f"R$ {value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def read_products():
    products = []
    pattern = re.compile(
        r"\{ id: '(?P<id>[^']+)'.*?brand: '(?P<brand>[^']+)'.*?name: '(?P<name>[^']+)'.*?category: '(?P<category>[^']+)'.*?price: (?P<price>\d+(?:\.\d+)?).*?images: \[asset\('(?P<image>[^']+)'\)"
    )
    for line in SOURCE.read_text(encoding="utf-8").splitlines():
        match = pattern.search(line)
        if match:
            item = match.groupdict()
            item["price"] = float(item["price"])
            products.append(item)
    return products


def wrap(draw, text, text_font, width):
    words = text.split()
    lines, current = [], ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if draw.textbbox((0, 0), candidate, font=text_font)[2] <= width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines[:2]


def sheet(items, category_label, page, total_pages, filename):
    width, height = 1800, 2400
    margin, gutter = 70, 28
    columns, rows = 2, 4
    header_height = 250
    card_width = (width - margin * 2 - gutter * (columns - 1)) // columns
    card_height = (height - header_height - margin - gutter * (rows - 1)) // rows
    canvas = Image.new("RGB", (width, height), "#f3f0e9")
    draw = ImageDraw.Draw(canvas)

    draw.rectangle((0, 0, width, 18), fill="#b99a61")
    draw.text((margin, 58), "BELLMONT + IMPÉRIO FIT", fill="#111111", font=font(30, True))
    draw.text((margin, 108), category_label.upper(), fill="#111111", font=font(70, True))
    draw.text((width - margin, 78), f"PÁGINA {page}/{total_pages}", anchor="ra", fill="#6d665b", font=font(24, True))
    draw.line((margin, 205, width - margin, 205), fill="#bbb5aa", width=2)

    for index, item in enumerate(items):
        row, col = divmod(index, columns)
        x = margin + col * (card_width + gutter)
        y = header_height + row * (card_height + gutter)
        draw.rounded_rectangle((x, y, x + card_width, y + card_height), radius=10, fill="#ffffff", outline="#d8d3c9", width=2)

        image_path = ASSETS / item["image"]
        product_image = Image.open(image_path).convert("RGB")
        image_box = (card_width - 32, card_height - 150)
        fitted = ImageOps.contain(product_image, image_box, Image.Resampling.LANCZOS)
        image_x = x + (card_width - fitted.width) // 2
        image_y = y + 16 + (image_box[1] - fitted.height) // 2
        canvas.paste(fitted, (image_x, image_y))

        separator_y = y + card_height - 134
        draw.line((x + 18, separator_y, x + card_width - 18, separator_y), fill="#e2ded6", width=2)
        name_font = font(25, True)
        name_lines = wrap(draw, item["name"], name_font, card_width - 36)
        for line_index, line in enumerate(name_lines):
            draw.text((x + 18, separator_y + 14 + line_index * 29), line, fill="#111111", font=name_font)
        draw.text((x + 18, y + card_height - 34), money(item["price"]), anchor="ls", fill="#8b6a27", font=font(26, True))

    OUTPUT.mkdir(parents=True, exist_ok=True)
    target = OUTPUT / filename
    canvas.save(target, "PNG", optimize=True)
    return target


products = read_products()
groups = [
    ("Streetwear", [p for p in products if p["category"] == "streetwear"], 8),
    ("Perfumaria", [p for p in products if p["category"] == "perfumes"], 8),
    ("IMPÉRIO FIT", [p for p in products if p["category"] == "fitness"], 8),
]

generated = []
for label, items, page_size in groups:
    pages = [items[i:i + page_size] for i in range(0, len(items), page_size)]
    slug = "streetwear" if label == "Streetwear" else "perfumaria" if label == "Perfumaria" else "imperio-fit"
    for page_number, page_items in enumerate(pages, start=1):
        generated.append(sheet(page_items, label, page_number, len(pages), f"catalogo-{slug}-{page_number}.png"))

print(f"Produtos: {len(products)}")
for target in generated:
    print(target)
