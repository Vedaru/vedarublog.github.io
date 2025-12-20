# Git Push 故障排除指南

## 问题
```
fatal: unable to access 'https://github.com/Vedaru/vedarublog.github.io.git/': 
Failed to connect to github.com port 443 after 21108 ms: Could not connect to server
```

- ✅ GitHub 在浏览器上可以打开
- ✅ DNS 和基本网络连接正常
- ✅ Git 配置正确
- ❌ Git 无法连接到 GitHub（port 443）
- ❌ Curl HTTPS 也卡住

## 根本原因
这是**网络级的连接问题**，可能是：
1. 防火墙/代理对 Git 协议的限制（浏览器可能走不同路径）
2. ISP 或本地网络对特定端口/协议的限制
3. VPN 或网络设备配置问题

## 解决方案

### 方案 1：等待网络恢复（最安全）
当网络稳定后运行：
```powershell
cd "d:\Personal_Files\Projects\Github\vedarublog.github.io"
& 'D:\Git\cmd\git.exe' push origin HEAD
```

或使用自动重试脚本（最多重试 10 次）：
```powershell
& "d:\Personal_Files\Projects\Github\vedarublog.github.io\scripts\push-retry.ps1" -MaxRetries 10
```

### 方案 2：检查防火墙/代理设置
1. 检查 Windows Defender 防火墙是否允许 git.exe：
   - 设置 → 防火墙 → 允许应用通过防火墙
   
2. 检查是否有企业代理：
   ```powershell
   netsh winhttp show proxy
   ```

3. 如果有代理，配置 git：
   ```powershell
   & 'D:\Git\cmd\git.exe' config --global http.proxy [proxy-url]
   & 'D:\Git\cmd\git.exe' config --global https.proxy [proxy-url]
   ```

### 方案 3：使用 SSH（如果 HTTPS 持续失败）
```powershell
# 测试 SSH 连接
ssh -T git@github.com

# 如果成功，本仓库已切换到 SSH：
& 'D:\Git\cmd\git.exe' config --get remote.origin.url
# 应该显示：git@github.com:Vedaru/vedarublog.github.io.git
```

### 方案 4：临时使用浏览器 GH CLI（如果紧急）
1. 访问 GitHub Web 界面
2. 创建一个"工作流文件"来自动 pull 和构建
3. 或使用 GitHub CLI：
   ```powershell
   gh repo sync Vedaru/vedarublog.github.io
   ```

## 当前状态

**本地提交已保存：**
```
f0f4b52 (HEAD -> main) Fix TypeScript type mismatches and add missing script directives
```

**Git 配置（当前）：**
```
remote.origin.url = https://github.com/Vedaru/vedarublog.github.io.git
http.sslverify = false (已禁用用于测试)
http.connecttimeout = 60
http.readtimeout = 60
```

## 恢复步骤

当网络恢复时：

```powershell
# 恢复 SSL 验证（生产环境安全做法）
& 'D:\Git\cmd\git.exe' config --global http.sslVerify true

# 推送
& 'D:\Git\cmd\git.exe' push origin HEAD

# 验证
& 'D:\Git\cmd\git.exe' log --oneline -1
```

---

**下次检查：** 等待网络恢复，然后重试推送。
