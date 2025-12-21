import os
from qcloud_cos import CosConfig, CosS3Client

SECRET_ID = os.environ.get('TENCENT_SECRET_ID')
SECRET_KEY = os.environ.get('TENCENT_SECRET_KEY')
BUCKET = os.environ.get('COS_BUCKET')
REGION = os.environ.get('COS_REGION')

if not all([SECRET_ID, SECRET_KEY, BUCKET, REGION]):
    print("❌ 环境变量缺失")
    print(f"  TENCENT_SECRET_ID: {'✓' if SECRET_ID else '❌'}")
    print(f"  TENCENT_SECRET_KEY: {'✓' if SECRET_KEY else '❌'}")
    print(f"  COS_BUCKET: {'✓' if BUCKET else '❌'}")
    print(f"  COS_REGION: {'✓' if REGION else '❌'}")
    exit(1)

config = CosConfig(Region=REGION, SecretId=SECRET_ID, SecretKey=SECRET_KEY, Scheme='https')
client = CosS3Client(config)

print(f"🔍 检查 bucket: {BUCKET} (region: {REGION})")
print()

# 1. 检查COS静态网站配置
print("📋 COS静态网站配置:")
try:
    response = client.get_bucket_website(Bucket=BUCKET)
    if 'WebsiteConfiguration' in response:
        cfg = response['WebsiteConfiguration']
        index = cfg.get('IndexDocument', {}).get('Suffix', 'NOT SET')
        error = cfg.get('ErrorDocument', {}).get('Key', 'NOT SET')
        print(f"  ✓ 已启用静态网站托管")
        print(f"    索引文档: {index}")
        print(f"    错误文档: {error}")
    else:
        print(f"  ❌ 未启用静态网站托管")
except Exception as e:
    print(f"  ❌ 获取配置失败: {e}")

print()

# 2. 检查index.html的元数据
print("📄 index.html 元数据:")
try:
    response = client.head_object(Bucket=BUCKET, Key='index.html')
    print(f"  ✓ 文件存在")
    print(f"    Content-Type: {response.get('Content-Type', 'NOT SET')}")
    print(f"    Content-Disposition: {response.get('Content-Disposition', 'NOT SET')}")
    print(f"    Content-Length: {response.get('Content-Length', 'N/A')} bytes")
except Exception as e:
    print(f"  ❌ 无法读取: {e}")

print()

# 3. 检查其他HTML文件
print("🔍 检查其他HTML文件:")
try:
    response = client.list_objects(
        Bucket=BUCKET,
        Prefix='',
        Delimiter='',
        MaxKeys=1000
    )
    html_files = [obj.get('Key') for obj in response.get('Contents', []) if obj.get('Key', '').endswith('.html')]
    if html_files:
        print(f"  ✓ 发现 {len(html_files)} 个HTML文件:")
        for f in html_files[:10]:
            print(f"    - {f}")
        if len(html_files) > 10:
            print(f"    ... 还有 {len(html_files)-10} 个")
    else:
        print(f"  ❌ 未发现HTML文件")
except Exception as e:
    print(f"  ❌ 列举失败: {e}")
