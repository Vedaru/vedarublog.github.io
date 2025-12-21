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
mimetypes.add_type('image/avif', '.avif')
mimetypes.add_type('image/webp', '.webp')
mimetypes.add_type('image/png', '.png')
mimetypes.add_type('image/jpeg', '.jpg')
mimetypes.add_type('image/jpeg', '.jpeg')
mimetypes.add_type('image/gif', '.gif')
mimetypes.add_type('image/bmp', '.bmp')
mimetypes.add_type('application/xml', '.xml')
mimetypes.add_type('text/plain', '.txt')
mimetypes.add_type('application/wasm', '.wasm')
mimetypes.add_type('application/pdf', '.pdf')
mimetypes.add_type('audio/mpeg', '.mp3')
mimetypes.add_type('audio/mp4', '.m4a')
mimetypes.add_type('audio/ogg', '.ogg')
mimetypes.add_type('audio/wav', '.wav')
mimetypes.add_type('video/mp4', '.mp4')
mimetypes.add_type('video/webm', '.webm')
mimetypes.add_type('application/manifest+json', '.webmanifest')
mimetypes.add_type('application/vnd.ms-fontobject', '.eot')

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
    ext = Path(local_path).suffix.lower()
    
    # Explicitly set correct MIME types to prevent download
    explicit_types = {
        '.html': 'text/html; charset=utf-8',
        '.htm': 'text/html; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.js': 'application/javascript',
        '.mjs': 'application/javascript',
        '.json': 'application/json',
        '.map': 'application/json',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.webp': 'image/webp',
        '.avif': 'image/avif',
        '.gif': 'image/gif',
        '.bmp': 'image/bmp',
        '.xml': 'application/xml',
        '.txt': 'text/plain; charset=utf-8',
        '.webmanifest': 'application/manifest+json',
        '.woff': 'font/woff',
        '.woff2': 'font/woff2',
        '.ttf': 'font/ttf',
        '.otf': 'font/otf',
        '.eot': 'application/vnd.ms-fontobject',
        '.wasm': 'application/wasm',
        '.pdf': 'application/pdf',
        '.mp3': 'audio/mpeg',
        '.m4a': 'audio/mp4',
        '.ogg': 'audio/ogg',
        '.wav': 'audio/wav',
        '.mp4': 'video/mp4',
        '.webm': 'video/webm',
    }
    
    ct = explicit_types.get(ext) or mimetypes.guess_type(local_path)[0] or 'application/octet-stream'
    # Always set Content-Disposition: inline to prevent download on all files
    cd = 'inline'
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
            'ContentDisposition': cd,  # Always set this, even for attachments
        }
        client.put_object(**kwargs)
        fixed += 1
        print(f'Uploaded with headers: {rel_key} -> ct={ct} cd={cd or ""}')
    except Exception as e:
        skipped += 1
        print(f'Failed to upload {rel_key}: {e}', file=sys.stderr)

print(f'Done. Fixed={fixed}, Skipped={skipped}, DIST={DIST_DIR}')
