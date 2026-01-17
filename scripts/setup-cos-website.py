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

# Configure compression: disable gzip for audio files, enable for others
audio_suffixes = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac']
rules = []

# Rules to disable gzip for audio files
for suffix in audio_suffixes:
    rules.append({
        'ID': f'disable-gzip-audio{suffix.replace(".", "-")}',
        'Status': 'Enabled',
        'Filter': {'Suffix': suffix},
        'CompressionType': 'none'
    })

# Rule to enable gzip for all other files
rules.append({
    'ID': 'enable-gzip-others',
    'Status': 'Enabled',
    'CompressionType': 'standard',
    'CompressionFormat': 'gzip'
})

try:
    print('Configuring compression rules...')
    response = client.put_bucket_compression(
        Bucket=BUCKET,
        CompressionConfiguration={'Rules': rules}
    )
    print('SUCCESS: Compression configured (gzip disabled for audio files)')
except Exception as e:
    print(f'ERROR: Failed to configure compression: {e}', file=sys.stderr)
    sys.exit(1)
