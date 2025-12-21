#!/usr/bin/env python3
"""Verify COS configuration"""

import os
import sys
from qcloud_cos import CosConfig, CosS3Client

SECRET_ID = os.environ.get('TENCENT_SECRET_ID')
SECRET_KEY = os.environ.get('TENCENT_SECRET_KEY')
BUCKET = os.environ.get('COS_BUCKET')
REGION = os.environ.get('COS_REGION')

if not all([SECRET_ID, SECRET_KEY, BUCKET, REGION]):
    print('ERROR: Missing environment variables', file=sys.stderr)
    sys.exit(1)

config = CosConfig(Region=REGION, SecretId=SECRET_ID, SecretKey=SECRET_KEY, Scheme='https')
client = CosS3Client(config)

print('Verifying COS configuration...')
print()

# Check static website configuration
try:
    response = client.get_bucket_website(Bucket=BUCKET)
    cfg = response.get('WebsiteConfiguration', {})
    index = cfg.get('IndexDocument', {}).get('Suffix', 'NOT SET')
    error = cfg.get('ErrorDocument', {}).get('Key', 'NOT SET')
    print(f'Static Website Config:')
    print(f'  IndexDocument: {index}')
    print(f'  ErrorDocument: {error}')
except Exception as e:
    print(f'ERROR: Failed to get static website config: {e}', file=sys.stderr)
    sys.exit(1)

print()

# Check index.html metadata
try:
    response = client.head_object(Bucket=BUCKET, Key='index.html')
    ct = response.get('Content-Type', 'NOT SET')
    cd = response.get('Content-Disposition', 'NOT SET')
    print(f'index.html Metadata:')
    print(f'  Content-Type: {ct}')
    print(f'  Content-Disposition: {cd}')
except Exception as e:
    print(f'ERROR: Failed to check index.html: {e}', file=sys.stderr)
    sys.exit(1)

print()
print('Verification complete!')
