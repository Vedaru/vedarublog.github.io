#!/usr/bin/env python3
"""Configure COS bucket static website settings"""

import os
import sys
from qcloud_cos import CosConfig, CosS3Client

SECRET_ID = os.environ.get('TENCENT_SECRET_ID')
SECRET_KEY = os.environ.get('TENCENT_SECRET_KEY')
BUCKET = os.environ.get('COS_BUCKET')
REGION = os.environ.get('COS_REGION')

if not all([SECRET_ID, SECRET_KEY, BUCKET, REGION]):
    print('ERROR: Missing required environment variables', file=sys.stderr)
    print(f'  TENCENT_SECRET_ID: {bool(SECRET_ID)}', file=sys.stderr)
    print(f'  TENCENT_SECRET_KEY: {bool(SECRET_KEY)}', file=sys.stderr)
    print(f'  COS_BUCKET: {bool(BUCKET)}', file=sys.stderr)
    print(f'  COS_REGION: {bool(REGION)}', file=sys.stderr)
    sys.exit(1)

config = CosConfig(Region=REGION, SecretId=SECRET_ID, SecretKey=SECRET_KEY, Scheme='https')
client = CosS3Client(config)

try:
    print(f'Configuring static website for bucket: {BUCKET}')
    response = client.put_bucket_website(
        Bucket=BUCKET,
        WebsiteConfiguration={
            'IndexDocument': {'Suffix': 'index.html'},
            'ErrorDocument': {'Key': 'index.html'},
        }
    )
    print('SUCCESS: Static website configured (index.html)')
    
    # Verify configuration
    response = client.get_bucket_website(Bucket=BUCKET)
    if 'WebsiteConfiguration' in response:
        cfg = response['WebsiteConfiguration']
        index = cfg.get('IndexDocument', {}).get('Suffix', 'NOT SET')
        error = cfg.get('ErrorDocument', {}).get('Key', 'NOT SET')
        print(f'Verified: IndexDocument={index}, ErrorDocument={error}')
except Exception as e:
    print(f'ERROR: Failed to configure static website: {e}', file=sys.stderr)
    sys.exit(1)
