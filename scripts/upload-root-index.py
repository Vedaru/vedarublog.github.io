#!/usr/bin/env python3
"""Ensure root path can serve index.html correctly"""

import os
import shutil
from pathlib import Path
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

dist_dir = Path('./dist')
index_path = dist_dir / 'index.html'

if not index_path.exists():
    print(f'ERROR: index.html not found at {index_path}')
    exit(1)

print('Uploading index.html with proper headers to COS...')

try:
    with open(index_path, 'rb') as f:
        body = f.read()
    
    # Upload to root
    client.put_object(
        Bucket=BUCKET,
        Key='index.html',
        Body=body,
        ContentType='text/html; charset=utf-8',
        ContentDisposition='inline',
        CacheControl='max-age=0'
    )
    print('[OK] Uploaded index.html with:')
    print('  Content-Type: text/html; charset=utf-8')
    print('  Content-Disposition: inline')
    print('  Cache-Control: max-age=0')
    
except Exception as e:
    print(f'ERROR: Failed to upload index.html: {e}')
    exit(1)

print('Done!')
