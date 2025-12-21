import os
import sys
import mimetypes
from typing import Dict

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

if not all([SECRET_ID, SECRET_KEY, BUCKET, REGION]):
    print('Missing env: TENCENT_SECRET_ID/TENCENT_SECRET_KEY/COS_BUCKET/COS_REGION', file=sys.stderr)
    sys.exit(1)

try:
    from qcloud_cos import CosConfig, CosS3Client
except Exception as e:
    print('Failed to import qcloud_cos SDK:', e, file=sys.stderr)
    sys.exit(2)

config = CosConfig(Region=REGION, SecretId=SECRET_ID, SecretKey=SECRET_KEY, Token=None, Scheme='https')
client = CosS3Client(config)

fixed = 0
skipped = 0

def desired_headers_for_key(key: str) -> Dict[str, str]:
    # Decide proper ContentType and optionally ContentDisposition
    ct = mimetypes.guess_type(key)[0]
    headers: Dict[str, str] = {}
    if ct:
        headers['ContentType'] = ct
    # Force inline for HTML so browsers do not download it
    if key.lower().endswith('.html'):
        headers['ContentDisposition'] = 'inline'
        headers['ContentType'] = headers.get('ContentType', 'text/html')
    return headers

# Iterate objects (paginate)
marker = ''
while True:
    resp = client.list_objects(Bucket=BUCKET, Marker=marker)
    contents = resp.get('Contents', [])
    if not contents:
        break
    for obj in contents:
        key = obj['Key']
        # Skip directories
        if key.endswith('/'):
            continue
        headers = desired_headers_for_key(key)
        if not headers:
            skipped += 1
            continue
        # Copy to itself with replaced metadata
        try:
            client.copy_object(
                Bucket=BUCKET,
                Key=key,
                CopySource={'Bucket': BUCKET, 'Region': REGION, 'Key': key},
                MetadataDirective='Replaced',
                **headers
            )
            fixed += 1
            print(f'Fixed meta: {key} -> {headers}')
        except Exception as e:
            print(f'Failed to fix meta for {key}: {e}', file=sys.stderr)
    if resp.get('IsTruncated'):
        marker = resp.get('NextMarker')
    else:
        break

print(f'Done. Fixed={fixed}, Skipped={skipped}')
