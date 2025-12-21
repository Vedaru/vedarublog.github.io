#!/usr/bin/env python3
"""Test actual HTTP headers from COS website domain"""

import requests
import os

BUCKET = os.environ.get('COS_BUCKET')
REGION = os.environ.get('COS_REGION')

if not all([BUCKET, REGION]):
    print('ERROR: Missing COS_BUCKET or COS_REGION')
    exit(1)

website_url = f'https://{BUCKET}.cos-website.{REGION}.myqcloud.com'

print(f'Testing HTTP headers from: {website_url}')
print()

# Test root path
print('1. Root path (/):')
try:
    response = requests.head(website_url + '/', timeout=10, allow_redirects=True)
    print(f'   Status: {response.status_code}')
    print(f'   Content-Type: {response.headers.get("Content-Type", "NOT SET")}')
    print(f'   Content-Disposition: {response.headers.get("Content-Disposition", "NOT SET")}')
    print(f'   Cache-Control: {response.headers.get("Cache-Control", "NOT SET")}')
    print()
except Exception as e:
    print(f'   ERROR: {e}\n')

# Test index.html
print('2. /index.html:')
try:
    response = requests.head(website_url + '/index.html', timeout=10, allow_redirects=True)
    print(f'   Status: {response.status_code}')
    print(f'   Content-Type: {response.headers.get("Content-Type", "NOT SET")}')
    print(f'   Content-Disposition: {response.headers.get("Content-Disposition", "NOT SET")}')
    print(f'   Cache-Control: {response.headers.get("Cache-Control", "NOT SET")}')
    print()
except Exception as e:
    print(f'   ERROR: {e}\n')

# Test with GET to see all headers
print('3. Full GET request headers:')
try:
    response = requests.get(website_url + '/index.html', timeout=10, stream=True)
    print(f'   Status: {response.status_code}')
    print('   All headers:')
    for k, v in response.headers.items():
        print(f'     {k}: {v}')
    response.close()
except Exception as e:
    print(f'   ERROR: {e}')
