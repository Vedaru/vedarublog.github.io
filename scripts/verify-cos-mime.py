#!/usr/bin/env python3
"""Verify COS objects have expected Content-Type headers."""

import os
from qcloud_cos import CosConfig, CosS3Client

SECRET_ID = os.environ.get('TENCENT_SECRET_ID')
SECRET_KEY = os.environ.get('TENCENT_SECRET_KEY')
BUCKET = os.environ.get('COS_BUCKET')
REGION = os.environ.get('COS_REGION')

if not all([SECRET_ID, SECRET_KEY, BUCKET, REGION]):
    print('ERROR: Missing environment variables')
    exit(1)

config = CosConfig(Region=REGION, SecretId=SECRET_ID, SecretKey=SECRET_KEY, Scheme='https')
client = CosS3Client(config)

EXPECTED = {
    '.html': 'text/html',
    '.htm': 'text/html',
    '.css': 'text/css',
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
    '.txt': 'text/plain',
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

PREFIXES = ['_astro/', 'assets/', 'pio/', '']

print('Verifying Content-Type headers for a sample of COS objects...')
checked = 0
mismatch = 0

for prefix in PREFIXES:
    try:
        resp = client.list_objects(Bucket=BUCKET, Prefix=prefix, MaxKeys=1000)
        for obj in resp.get('Contents', [])[:100]:
            key = obj.get('Key')
            if not key:
                continue
            ext = '.' + key.split('.')[-1].lower() if '.' in key else ''
            expected = EXPECTED.get(ext)
            try:
                head = client.head_object(Bucket=BUCKET, Key=key)
                ct = (head.get('Content-Type') or '').split(';')[0].strip()
                if expected and ct and ct != expected:
                    print(f'[MISMATCH] {key}: got {ct}, expected {expected}')
                    mismatch += 1
                checked += 1
            except Exception as e:
                print(f'[ERROR] head {key}: {e}')
    except Exception as e:
        print(f'[ERROR] list {prefix}: {e}')

print(f'Done. Checked={checked}, Mismatch={mismatch}')
