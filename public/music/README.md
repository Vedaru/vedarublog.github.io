此目录由 `scripts/download-music.js` 自动生成（如果存在）。

- `playlist.json`：站点构建时使用的本地播放列表（包含 `url` 指向 `/music/<file>.mp3`）。

在 GitHub Actions 中添加了 `.github/workflows/download-music.yml`，推送到 `main` 分支会自动运行脚本并在仓库中提交下载的文件。也可手动运行：

```bash
pnpm download-music
# 或
node scripts/download-music.js
```

注意：将 MP3 上传到仓库会显著增加仓库体积，请谨慎使用。