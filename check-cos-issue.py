import os
from qcloud_cos import CosConfig, CosS3Client

SECRET_ID = os.environ.get('TENCENT_SECRET_ID')
SECRET_KEY = os.environ.get('TENCENT_SECRET_KEY')
BUCKET = os.environ.get('COS_BUCKET')
REGION = os.environ.get('COS_REGION')

if not all([SECRET_ID, SECRET_KEY, BUCKET, REGION]):
    print("❌ 环境变量缺失，请先设置TENCENT_SECRET_ID/KEY等")
    exit(1)

config = CosConfig(Region=REGION, SecretId=SECRET_ID, SecretKey=SECRET_KEY, Scheme='https')
client = CosS3Client(config)

# 检查index.html的headers
try:
    response = client.head_object(Bucket=BUCKET, Key='index.html')
    print("✓ index.html Headers:")
    print(f"  Content-Type: {response.get('Content-Type', 'NOT SET')}")
    print(f"  Content-Disposition: {response.get('Content-Disposition', 'NOT SET')}")
    print(f"  Content-Length: {response.get('Content-Length', 'N/A')}")
except Exception as e:
    print(f"❌ 无法读取index.html: {e}")

# 检查COS静态网站配置
try:
    response = client.get_bucket_website(Bucket=BUCKET)
    print("\n✓ COS静态网站配置:")
    if 'WebsiteConfiguration' in response:
        website_config = response['WebsiteConfiguration']
        print(f"  索引文档: {website_config.get('IndexDocument', {}).get('Suffix', 'NOT SET')}")
        print(f"  错误文档: {website_config.get('ErrorDocument', {}).get('Key', 'NOT SET')}")
    else:
        print("  ❌ 未配置静态网站托管")
except Exception as e:
    print(f"❌ 无法获取静态网站配置: {e}")
