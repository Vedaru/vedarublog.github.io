#!/usr/bin/env python3
"""Disable COS force download setting"""

import os
import sys
from qcloud_cos import CosConfig, CosS3Client

SECRET_ID = os.environ.get('TENCENT_SECRET_ID')
SECRET_KEY = os.environ.get('TENCENT_SECRET_KEY')
BUCKET = os.environ.get('COS_BUCKET')
REGION = os.environ.get('COS_REGION')

if not all([SECRET_ID, SECRET_KEY, BUCKET, REGION]):
    print('ERROR: Missing environment variables')
    sys.exit(1)

config = CosConfig(Region=REGION, SecretId=SECRET_ID, SecretKey=SECRET_KEY, Scheme='https')
client = CosS3Client(config)

print(f'Checking bucket configuration for: {BUCKET}')
print()

# Try to get current bucket configuration
try:
    response = client.get_bucket(Bucket=BUCKET)
    print('Current bucket info retrieved')
except Exception as e:
    print(f'Note: {e}')

print()
print('Attempting to disable force download...')
print('Note: This may require setting custom headers via put_bucket_cors or similar')
print()

# The x-cos-force-download is typically controlled by:
# 1. Bucket policy
# 2. Custom domain settings
# 3. Or it's a default behavior that needs console/API override

print('MANUAL ACTION REQUIRED:')
print('1. Go to: https://console.cloud.tencent.com/cos')
print(f'2. Select bucket: {BUCKET}')
print('3. Navigate to: Configuration Management -> Basic Configuration')
print('4. Find "Force Download" or "Hotlink Protection" settings')
print('5. Disable "Force Download" option')
print()
print('Alternative: Add custom header rules in bucket settings:')
print('  - Header: Content-Disposition')
print('  - Value: inline')
print('  - Apply to: All files or specific paths')
