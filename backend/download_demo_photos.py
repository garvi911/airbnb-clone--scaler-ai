"""One-time download of the fixed demo asset set; not needed to run the app."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.request import urlopen
from app.seed import PHOTOS

target = Path(__file__).resolve().parents[1] / 'frontend' / 'public' / 'stays'
target.mkdir(parents=True, exist_ok=True)

def download(item):
    i, photo = item
    path = target / f'{i + 1}.jpg'
    if not path.exists():
        with urlopen(f'https://images.unsplash.com/{photo}?auto=format&fit=crop&w=1200&q=85', timeout=30) as response:
            path.write_bytes(response.read())
    return path.name, path.stat().st_size

if __name__ == '__main__':
    for result in ThreadPoolExecutor(max_workers=4).map(download, enumerate(PHOTOS)):
        print(*result)
