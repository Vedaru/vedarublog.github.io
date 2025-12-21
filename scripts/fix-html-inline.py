#!/usr/bin/env python3
"""Fix HTML files Content-Disposition to inline"""

import os
from pathlib import Path
from qcloud_cos import CosConfig, CosS3Client

SECRET_ID = os.environ.get('TENCENT_SECRET_ID')
SECRET_KEY = os.environ.get('TENCENT_SECRET_KEY')
BUCKET = os.environ.get('COS_BUCKET')
REGION = os.environ.get('COS_REGION')

if not all([SECRET_ID, SECRET_KEY, BUCKET, REGION]):
    print('ERROR: Missing environment variables', file=__import__('sys').stderr)
    exit(1)

config = CosConfig(Region=REGION, SecretId=SECRET_ID, SecretKey=SECRET_KEY, Scheme='https')
client = CosS3Client(config)

dist_dir = Path('./dist')
html_count = 0

print('Fixing HTML files Content-Disposition to inline...')
for html_file in dist_dir.rglob('*.html'):
    rel_key = html_file.relative_to(dist_dir).as_posix()
    try:
        with open(html_file, 'rb') as f:
            body = f.read()
        client.put_object(
            Bucket=BUCKET,
            Key=rel_key,
            Body=body,
            ContentType='text/html; charset=utf-8',
            ContentDisposition='inline'
        )
        html_count += 1
        print(f'  [OK] {rel_key}')
    except Exception as e:
        print(f'  [ERROR] {rel_key}: {e}')

print(f'Total HTML files fixed: {html_count}')
