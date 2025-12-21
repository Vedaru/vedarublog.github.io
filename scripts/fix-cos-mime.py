import os
import sys
import mimetypes
from pathlib import Path
from typing import Tuple

# Ensure common web types are recognized
mimetypes.add_type('text/html', '.html')
mimetypes.add_type('application/javascript', '.js')
mimetypes.add_type('text/css', '.css')
mimetypes.add_type('application/json', '.json')
mimetypes.add_type('image/svg+xml', '.svg')
mimetypes.add_type('font/woff2', '.woff2')
mimetypes.add_type('font/woff', '.woff')
mimetypes.add_type('font/ttf', '.ttf')
mimetypes.add_type('image/x-icon', '.ico')

SECRET_ID = os.environ.get('TENCENT_SECRET_ID')
SECRET_KEY = os.environ.get('TENCENT_SECRET_KEY')
BUCKET = os.environ.get('COS_BUCKET')  # e.g., vedarublog-1392778645
REGION = os.environ.get('COS_REGION')  # e.g., ap-hongkong
DIST_DIR = os.environ.get('DIST_DIR') or str(Path(__file__).resolve().parents[1] / 'dist')

if not all([SECRET_ID, SECRET_KEY, BUCKET, REGION]):
    print('Missing env: TENCENT_SECRET_ID/TENCENT_SECRET_KEY/COS_BUCKET/COS_REGION', file=sys.stderr)
    sys.exit(1)

if not os.path.isdir(DIST_DIR):
    print(f'DIST_DIR not found: {DIST_DIR}', file=sys.stderr)
    sys.exit(1)

try:
    from qcloud_cos import CosConfig, CosS3Client
except Exception as e:
    print('Failed to import qcloud_cos SDK:', e, file=sys.stderr)
    sys.exit(2)

config = CosConfig(Region=REGION, SecretId=SECRET_ID, SecretKey=SECRET_KEY, Token=None, Scheme='https')
client = CosS3Client(config)

INLINE_EXTS = {
    '.html', '.htm', '.css', '.js', '.mjs', '.json', '.svg', '.ico',
    '.png', '.jpg', '.jpeg', '.webp', '.gif',
    '.woff', '.woff2', '.ttf', '.otf',
}

def guess_headers(local_path: str) -> Tuple[str, str]:
    """Return (content_type, content_disposition)"""
    ct = mimetypes.guess_type(local_path)[0] or 'application/octet-stream'
    ext = Path(local_path).suffix.lower()
    cd = 'inline' if ext in INLINE_EXTS else ''
    return ct, cd

fixed = 0
skipped = 0

root = Path(DIST_DIR)
for p in root.rglob('*'):
    if p.is_dir():
        continue
    rel_key = p.relative_to(root).as_posix()
    ct, cd = guess_headers(str(p))
    try:
        with open(p, 'rb') as f:
            body = f.read()
        kwargs = {
            'Bucket': BUCKET,
            'Key': rel_key,
            'Body': body,
            'ContentType': ct,
        }
        if cd:
            kwargs['ContentDisposition'] = cd
        # Re-upload with proper headers
        client.put_object(**kwargs)
        fixed += 1
        print(f'Uploaded with headers: {rel_key} -> ct={ct} cd={cd or ""}')
    except Exception as e:
        skipped += 1
        print(f'Failed to upload {rel_key}: {e}', file=sys.stderr)

print(f'Done. Fixed={fixed}, Skipped={skipped}, DIST={DIST_DIR}')
