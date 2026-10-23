from pathlib import Path
import re
import zipfile

root = Path(__file__).resolve().parents[1]
source = (root / 'src' / 'data' / 'products.ts').read_text(encoding='utf-8')
pattern = re.compile(
    r"\{ id: '(?P<id>[^']+)'.*?slug: '(?P<slug>[^']+)'.*?images: \[asset\('(?P<image>[^']+)'\)"
)
products = [match.groupdict() for match in pattern.finditer(source)]
target = root / 'docs' / 'catalog' / 'imagens-produtos-bellmont-imperio-fit.zip'

with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED) as archive:
    for product in products:
        image = root / 'public' / 'assets' / product['image']
        archive_name = f"{product['id']}-{product['slug']}{image.suffix.lower()}"
        archive.write(image, archive_name)

with zipfile.ZipFile(target, 'r') as archive:
    entries = archive.infolist()
    if len(entries) != 47:
        raise RuntimeError(f'Esperadas 47 imagens, encontradas {len(entries)}')
    if archive.testzip() is not None:
        raise RuntimeError('O ZIP contém uma entrada corrompida')

print(f'ZIP={target}')
print(f'IMAGENS={len(entries)}')
print(f'TAMANHO={target.stat().st_size}')
