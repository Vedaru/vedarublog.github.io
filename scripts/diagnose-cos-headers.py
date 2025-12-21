#!/usr/bin/env python3
"""Diagnose COS index.html headers"""

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

print('=== COS index.html Headers Diagnosis ===\n')

# Check head_object
print('1. HEAD request to index.html:')
try:
    response = client.head_object(Bucket=BUCKET, Key='index.html')
    print(f'   Status: OK')
    print(f'   Content-Type: {response.get("Content-Type", "NOT SET")}')
    print(f'   Content-Disposition: {response.get("Content-Disposition", "NOT SET")}')
    print(f'   Cache-Control: {response.get("Cache-Control", "NOT SET")}')
    print(f'   Content-Length: {response.get("Content-Length", "NOT SET")}')
    print()
except Exception as e:
    print(f'   ERROR: {e}\n')

# Try get_object to see what server returns
print('2. GET request body info:')
try:
    response = client.get_object(Bucket=BUCKET, Key='index.html')
    print(f'   Status: OK')
    headers = response.get('ResponseMetadata', {}).get('HTTPHeaders', {})
    for k, v in headers.items():
        print(f'   {k}: {v}')
    response['Body'].close()
    print()
except Exception as e:
    print(f'   ERROR: {e}\n')

# List bucket to find all HTML files
print('3. All HTML files in bucket:')
try:
    response = client.list_objects(
        Bucket=BUCKET,
        Prefix='',
        MaxKeys=100
    )
    html_files = [obj.get('Key') for obj in response.get('Contents', []) 
                  if obj.get('Key', '').endswith('.html')]
    for f in html_files[:20]:
        print(f'   - {f}')
    if len(html_files) > 20:
        print(f'   ... and {len(html_files)-20} more')
    print()
except Exception as e:
    print(f'   ERROR: {e}\n')

print('=== End of Diagnosis ===')
