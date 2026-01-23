# 个人博客

自己做的个人博客，使用的是Mizuki博客模板。

# 修改内容

优化了Musicplayer，取消了进度条动画，添加了显示进度条时长和音量百分比的卡片。
转换了歌曲的加载策略，只在workflow运行时通过meting api获取歌曲url与封面，并将音频文件转化成opus之后保存到本地，加载速度更快。

优化了日记界面的TOC卡片，现在可以直接点击TOC跳转到相应月份的日记。

在pio组件中添加了聊天的功能，后端由Cloudflare Workers AI提供AI模块支持。