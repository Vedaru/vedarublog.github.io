---
title: 旧笔记本的重生：把 Lenovo 小新打造成全能 Homelab 服务器
published: 2026-08-12
description: 从 Ubuntu 26.04 全新安装开始，把一台闲置笔记本变成跑着 6 个 Docker 服务的 headless 服务器，全过程记录与踩坑指南。
tags: [服务器, Docker, Ubuntu, Homelab, Linux, 教程]
category: 技术
draft: false
---

## 缘起

手头有一台 2016 年的 Lenovo 小新 Air 13，i5-6200U、8GB 内存、256GB NVMe。屏幕排线早就断了，键盘也半残，卖二手连快递费都不够。但它还能开机——这就够了。

我的目标很简单：把它变成一个安静躺在角落里的全能服务器，跑 Git、监控、备份、自动化工作流，以及未来的 Minecraft 服务端。一切通过 SSH 管理，不接屏幕，不插键盘。

这篇文章记录了我从 Ubuntu 26.04 LiveUSB 开始，一步步把它调教成一台正经服务器的全过程。

---

## 硬件底子

先看一眼这台"服务器"的配置：

| 部件 | 规格 |
|------|------|
| CPU | Intel i5-6200U (2C4T, 2.30GHz / 2.80GHz Turbo) |
| 内存 | 8GB DDR4（6.84 GiB 可用，GPU 偷了 1.2GB） |
| 硬盘 | 256GB NVMe SSD |
| 网络 | WiFi 5 (Intel 8260) |
| 显卡 | Intel HD Graphics 520（完全不需要） |

是的，这是一台连屏幕都没有的笔记本。但它有 NVMe，有 8GB 内存，有 x86_64——对 Homelab 来说，够用。

---

## 第一章：安装 Ubuntu 26.04（Resolute Raccoon）

用另一台电脑做了 Ubuntu 26.04 LTS 的 LiveUSB，插上笔记本，开机按 F12 进启动菜单。

安装过程没什么特别的，选 Minimal Install、勾选"安装第三方驱动"、分区选择整盘擦除。唯一的注意事项：**不要安装 GUI 组件**——反正后面也会删掉的。

装完第一次启动，确认 SSH 能通。因为之后这台机器不会再接屏幕。

```bash
# 在笔记本上
sudo apt update && sudo apt install openssh-server -y
sudo systemctl enable --now ssh
```

然后用我的主力机 SSH 进去继续干活：

```bash
ssh vedaru@192.168.1.11
```

由于这个 IP 是 DHCP 分配的，重启可能会变。第一件事：**锁定静态 IP**。

```bash
sudo nmcli connection modify yuang5120-5G \
  ipv4.method manual \
  ipv4.addresses 192.168.1.11/24 \
  ipv4.gateway 192.168.1.1 \
  ipv4.dns 192.168.1.1
sudo nmcli connection down yuang5120-5G && sudo nmcli connection up yuang5120-5G
```

好，IP 锁死了。再也不用猜地址了。

---

## 第二章：杀 GUI，逐 GPU

这台笔记本跑着完整的 GNOME Shell + GDM，吃掉了将近 400MB 内存。对于一个 headless 服务器来说，这简直是犯罪。

```bash
# 第一步：杀掉图形界面
sudo systemctl stop gdm
sudo systemctl disable gdm
sudo systemctl set-default multi-user.target
```

屏幕黑了——这正是我要的。从此这台机器通过 SSH 管理，不需要显示器。

接下来是 GPU。Intel HD Graphics 520 通过 i915 驱动占着 256MB 显存，而且两个显示输出（eDP-1、HDMI-A-1）都处于 disabled 状态——白白浪费。

```bash
# 黑名单 i915 驱动
echo "blacklist i915" | sudo tee /etc/modprobe.d/blacklist-i915.conf

# 启用 CPU Turbo（从 2.30GHz → 2.80GHz）
echo 0 | sudo tee /sys/devices/system/cpu/intel_pstate/no_turbo
```

重启后 i915 消失，256MB 帧缓冲回到系统池。CPU 也能睿频到 2.80GHz 了——这对后续的 Minecraft 服务端很重要。

---

## 第三章：精简一切

一台服务器不该有蓝牙、音频、摄像头驱动。不该有 snapd。不该有桌面通知、系统统计、固件更新精灵。

开始大扫除：

```bash
# 音频全家桶
sudo apt purge -y alsa-base alsa-utils pipewire wireplumber pulseaudio-utils \
  linux-sound-base rtkit

# 蓝牙
sudo apt purge -y bluez bluez-cups bluez-obexd gnome-bluetooth-sendto

# Snap（没有任何 snap 包还在占用 47MB）
sudo apt purge -y snapd

# 固件更新、电源管理（服务器不需要）
sudo apt purge -y fwupd fwupd-signed power-profiles-daemon upower

# 桌面残留
sudo apt purge -y udisks2 ubuntu-insights update-notifier anacron ubuntu-report \
  sysstat laptop-detect gnome-shell-ubuntu-extensions
```

同时黑名单内核模块，确保重启后也不会加载：

```bash
cat << EOF | sudo tee /etc/modprobe.d/blacklist-server.conf
blacklist snd_hda_intel
blacklist snd_sof_pci_intel_skl
blacklist snd_sof_intel_hda_generic
blacklist btusb
blacklist bluetooth
blacklist uvcvideo
EOF
```

最终：手动安装的包从 **529 个** 砍到 **158 个**，运行的服务从 50+ 降到 **20 个**。

---

## 第四章：Docker + 服务全家桶

服务器不能光裸着。Docker 安排上，然后把所有服务塞进容器。

### Docker 安装

```bash
sudo apt install -y docker.io
sudo usermod -aG docker $USER
```

### 服务列表

我选的服务都遵循一个原则：**轻量、Docker 化、通过 Cloudflare Tunnel 暴露**。

| 服务 | 镜像 | 用途 | 内存 |
|------|------|------|------|
| **Forgejo** | `codeberg.org/forgejo/forgejo:10` | Git 托管（Gitea fork） | ~115 MB |
| **Portainer** | `portainer/portainer-ce:latest` | Docker 可视化管理 | ~21 MB |
| **UrBackup** | `uroni/urbackup-server` | 增量备份服务端 | ~9 MB |
| **n8n** | `n8nio/n8n:latest` | 低代码自动化工作流 | ~311 MB |
| **Beszel** | `henrygd/beszel:latest` | 轻量服务器监控 | ~16 MB |

所有容器统一配置 `restart: unless-stopped`，确保重启后自动恢复。

n8n 最重（311MB）——Node.js 应用的通病。Beszel 最轻（16MB），替代了之前 402MB 的 Netdata。

### 数据安全

一个惨痛教训：`docker stop && docker rm` 不会自动保留数据，除非你明确挂载了 Volume。我用 `docker-compose` 管理所有服务，数据目录统一放在 `~/docker/<服务名>/data`，任何重建都不会丢数据。

```yaml
# 示例：Forgejo 的 compose 文件
services:
  forgejo:
    image: codeberg.org/forgejo/forgejo:10
    container_name: forgejo
    restart: unless-stopped
    volumes:
      - ./data:/data          # 数据持久化
      - /etc/timezone:/etc/timezone:ro
      - /etc/localtime:/etc/localtime:ro
    ports:
      - "127.0.0.1:3000:3000" # 只监听 localhost
      - "2222:22"              # Git SSH
```

注意那个 `127.0.0.1:3000:3000`——所有 Web 端口都绑定到 localhost，不暴露在局域网里。外部访问全部走 Cloudflare Tunnel。

---

## 第五章：Cloudflare Tunnel 统一入口

传统做法是配 Nginx 反代 + 申请 SSL 证书 + DDNS。Cloudflare Tunnel 更简单：在服务器上跑一个 `cloudflared` 进程，所有流量通过 Cloudflare 边缘节点转发到本地端口。

```yaml
# /etc/cloudflared/config.yml
tunnel: b8e0b001-75d3-481e-b880-5847053cd8d4
credentials-file: /etc/cloudflared/b8e0b001-75d3-481e-b880-5847053cd8d4.json
ingress:
  - hostname: git.vedaru.cn
    service: http://localhost:3000
  - hostname: portainer.vedaru.cn
    service: https://localhost:9443
    originRequest:
      noTLSVerify: true
  - hostname: backup.vedaru.cn
    service: http://localhost:55414
  - hostname: n8n.vedaru.cn
    service: http://localhost:5678
  - hostname: monitor.vedaru.cn
    service: http://localhost:8090
  - service: http_status:404
```

每个子域名一条规则，匹配失败返回 404。没有开放任何入站端口，不需要公网 IP，SSL 证书全自动。

最终的域名地图：

| 域名 | 服务 |
|------|------|
| `git.vedaru.cn` | Forgejo Git 托管 |
| `portainer.vedaru.cn` | Docker 管理面板 |
| `backup.vedaru.cn` | UrBackup 备份面板 |
| `n8n.vedaru.cn` | n8n 自动化工作流 |
| `monitor.vedaru.cn` | Beszel 系统监控 |

---

## 第六章：安全加固

服务都暴露到了公网——安全不能马虎。

### 防火墙（UFW）

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp comment "SSH"
sudo ufw --force enable
```

只开放 SSH 的 22 端口。所有 Docker 端口的入站流量被拒绝。

### 绕过 Docker 的 iptables 漏洞

Docker 会直接修改 iptables 规则，绕过 UFW。解决方案：所有容器端口绑定到 `127.0.0.1` 而不是 `0.0.0.0`。

```bash
-p 127.0.0.1:3000:3000   # ✅ 只有本机能访问
-p 3000:3000              # ❌ 局域网都能访问
```

Cloudflare Tunnel 走 localhost，不受影响。局域网里的其他设备无法直接访问任何服务。

### Fail2ban

```bash
sudo apt install -y fail2ban
```

默认的 sshd jail 已经启用：3 次密码错误 = 10 分钟封禁。

### SSH 加固

```bash
PermitRootLogin no   # 禁止 root 登录
```

密码认证保留着——因为我还没配 SSH Key。但 fail2ban 兜底，暴力破解不可行。

---

## 第七章：从 2GB 到 1GB 的优化之旅

这是我最有成就感的部分。下面是内存使用的演变：

| 阶段 | 已用内存 | 可用内存 | 做了什么 |
|------|----------|----------|----------|
| 初始状态 | 2.0 GiB | 4.9 GiB | Ubuntu 26.04 + GNOME + 所有服务 |
| 杀 GUI | 1.2 GiB | 5.6 GiB | 关掉 GDM、GNOME Shell |
| 杀 i915 | 1.0 GiB | 5.8 GiB | GPU 驱动黑名单（重启后生效） |
| 杀 netdata | 1.5 GiB | 5.4 GiB | 402MB → Beszel 16MB |
| 杀 snapd+fwupd | 1.3 GiB | 5.5 GiB | 卸掉无用的系统服务 |
| **最终** | **1.0 GiB** | **5.8 GiB** | 371 个包移除、音频/蓝牙/摄像头彻底消失 |

从 **2.0 GiB → 1.0 GiB**，省下了整整 1GB 内存。这意味着我可以放心地分配 3GB 给未来的 Minecraft 服务端，还有 2.8GB 余量。

---

## 第八章：Beszel 监控的踩坑

替换 Netdata 为 Beszel 的过程有两个坑：

**坑一：Hub 和 Agent 不在同一网络**

Beszel 的 Hub（Web 界面）通过 SSH 连接到 Agent（数据采集）。两个容器如果在不同的 Docker 网络里，`localhost` 在容器内部指向的是自己而不是宿主机。解决方案：都用 `--network host`，共享宿主机网络栈。

**坑二：SSH 密钥认证**

Agent 用 `KEY` 环境变量存储**公钥**来验证 Hub 的连接。Hub 需要有对应的**私钥**在数据目录下的 `id_ed25519` 文件。我一开始用 `openssl rand -base64` 生成随机字符串当 Key——Agent 日志直接喷 `ssh: no key found`。

正确做法：

```bash
# 生成 ED25519 密钥对
ssh-keygen -t ed25519 -f ~/beszel-data/beszel_key -N "" -C "beszel"

# Hub 使用私钥（id_ed25519），Agent 使用公钥（KEY 环境变量）
cp ~/beszel-data/beszel_key ~/beszel-data/id_ed25519
PUBKEY=$(cat ~/beszel-data/beszel_key.pub)
```

搞定。登录后添加系统 `localhost:45876`，仪表盘秒连。

---

## 第九章：踩过的其他坑

### UrBackup 的 TCP vs HTTP

UrBackup 有两个端口：55414（Web UI）和 55415（客户端 TCP）。最初我把两者都绑到同一个域名 `backup.vedaru.cn`，HTTP 规则写在 TCP 前面。结果 Cloudflare Tunnel 把所有请求都匹配到了 HTTP 规则，TCP 连接收到 `websocket: bad handshake`。

解决方案：**必须用不同的子域名**。

```yaml
  - hostname: backup.vedaru.cn
    service: http://localhost:55414
  - hostname: backup-tcp.vedaru.cn
    service: tcp://localhost:55415
```

### Docker Volume 丢失数据

一次 `docker stop && docker rm` 操作中，我忘了检查容器的 Volume 挂载，结果新建的容器指向了空的宿主机目录，原有数据安静地躺在孤儿 Volume 里。还好发现及时——所有的数据都在 `~/docker/<服务>/data` 下，重新挂载回来就恢复了。

**教训**：每次操作容器前，`docker inspect <容器> | grep -A10 Mounts` 看一眼。

### 代理和本地服务的爱恨情仇

我的主力机上跑着 `sing-box` 代理隧道。所有 HTTP 流量默认走代理，但 `git.vedaru.cn` 等本地服务需要直连。解决方案：在代理环境变量里加 `NO_PROXY`。

```bash
export NO_PROXY="localhost,127.0.0.1,.vedaru.cn,.local,.lan"
export no_proxy="$NO_PROXY"
```

---

## 第十章：最终状态

### 服务器资源

```
CPU:    i5-6200U @ 2.80GHz Turbo
RAM:    1.0 GiB used / 6.8 GiB total / 5.8 GiB available
Disk:   19 GiB used / 233 GiB total
Pkgs:   158 (从 529 砍下来的)
Svcs:   20 running
```

### 运行的服务

| 容器 | 内存 | 用途 |
|------|------|------|
| n8n | 311 MB | 自动化工作流 |
| forgejo | 115 MB | Git 托管 |
| portainer | 21 MB | Docker 管理 |
| beszel | 11 MB | 监控 Hub |
| beszel-agent | 5 MB | 监控 Agent |
| urbackup | 9 MB | 备份服务端 |

### 安全状态

- UFW 防火墙：仅开放 22/tcp
- Docker 端口：全部绑定 localhost
- Fail2ban：SSH 暴力破解防护
- PermitRootLogin：禁用
- Cloudflare Tunnel：零开放端口

---

## 展望

这台服务器还远未完工。接下来的计划：

- **Minecraft 服务端**（PaperMC，3GB 堆内存，预计支持 4-6 个玩家同时在线）
- **NapCat QQ 机器人**
- 用 n8n 把 Beszel 的告警接入 QQ/邮件通知

一台即将被扔进垃圾桶的旧笔记本，现在安安静静地在角落里跑着 6 个 Docker 容器。没有屏幕，没有键盘，没有风扇声。SSH 连上去，`btop` 看一眼，心满意足。

*如果你也有一台吃灰的旧笔记本——别扔。它的第二人生可能比你想象的要精彩得多。*
