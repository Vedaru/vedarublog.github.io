import requests
urls = [
    'https://vedarublog-1392778645.cos-website.ap-hongkong.myqcloud.com/index.html?response-content-disposition=inline',
    'https://vedarublog-1392778645.cos-website.ap-hongkong.myqcloud.com/index.html',
    'https://vedarublog-1392778645.cos.ap-hongkong.myqcloud.com/index.html',
]
for u in urls:
    print('---', u)
    try:
        r = requests.get(u, timeout=10)
        print('Status:', r.status_code)
        print('Content-Type:', r.headers.get('Content-Type'))
        print('Content-Disposition:', r.headers.get('Content-Disposition'))
        print('x-cos-force-download:', r.headers.get('x-cos-force-download'))
    except Exception as e:
        print('ERROR:', e)
