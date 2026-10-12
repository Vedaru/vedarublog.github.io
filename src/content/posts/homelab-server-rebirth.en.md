---
title: "Rebirth of an old laptop: turning a Lenovo Xiaoxin into a full homelab server"
published: 2026-08-12
description: From a fresh Ubuntu 26.04 install to a headless server running six Docker services, with the whole process and every pitfall recorded.
tags: [server, Docker, Ubuntu, Homelab, Linux, tutorial]
category: Tech
draft: false
---

## How it started

I had a 2016 Lenovo Xiaoxin Air 13 lying around: i5-6200U, 8 GB RAM, 256 GB NVMe. The screen ribbon cable had long since snapped and the keyboard was half dead; selling it second-hand would not cover the postage. But it still boots, and that is enough.

My goal was simple: turn it into a quiet, all-purpose server in a corner, running Git, monitoring, backups, automation workflows and eventually a Minecraft server. All managed over SSH, no screen, no keyboard.

This post records the whole process, from an Ubuntu 26.04 LiveUSB to a proper server.

---

## The hardware

A look at this "server":

| Part | Spec |
|------|------|
| CPU | Intel i5-6200U (2C4T, 2.30 GHz / 2.80 GHz turbo) |
| RAM | 8 GB DDR4 (6.84 GiB usable, the GPU stole 1.2 GB) |
| Disk | 256 GB NVMe SSD |
| Network | WiFi 5 (Intel 8260) |
| GPU | Intel HD Graphics 520 (not needed at all) |

Yes, this is a laptop without even a screen. But it has NVMe, 8 GB of RAM and x86_64, which for a homelab is plenty.

---

## Chapter 1: installing Ubuntu 26.04 (Resolute Raccoon)

I made an Ubuntu 26.04 LTS LiveUSB on another computer, plugged it into the laptop and pressed F12 at boot for the boot menu.

The install was unremarkable: Minimal Install, tick "install third-party drivers", wipe the whole disk. The only thing to watch: **do not install the GUI components**, since they will be removed later anyway.

After the first boot, confirm SSH works, because this machine will never have a screen attached again.

```bash
# On the laptop
sudo apt update && sudo apt install openssh-server -y
sudo systemctl enable --now ssh
```

Then SSH in from my main machine and carry on:

```bash
ssh vedaru@192.168.1.11
```

Since that IP came from DHCP and could change on reboot, the first job was to **pin a static IP**.

```bash
sudo nmcli connection modify yuang5120-5G \
  ipv4.method manual \
  ipv4.addresses 192.168.1.11/24 \
  ipv4.gateway 192.168.1.1 \
  ipv4.dns 192.168.1.1
sudo nmcli connection down yuang5120-5G && sudo nmcli connection up yuang5120-5G
```

Good, the IP is pinned. No more guessing addresses.

---

## Chapter 2: killing the GUI, hunting the GPU

The laptop was running a full GNOME Shell plus GDM, eating close to 400 MB of RAM. For a headless server that is practically a crime.

```bash
# Step one: kill the graphical interface
sudo systemctl stop gdm
sudo systemctl disable gdm
sudo systemctl set-default multi-user.target
```

The screen goes black, which is exactly what I wanted. From then on the machine is managed over SSH and needs no display.

Next, the GPU. Intel HD Graphics 520 occupied 256 MB of VRAM through the i915 driver, with both display outputs (eDP-1, HDMI-A-1) in a disabled state: wasted for nothing.

```bash
# Blacklist the i915 driver
echo "blacklist i915" | sudo tee /etc/modprobe.d/blacklist-i915.conf

# Enable CPU turbo (2.30 GHz -> 2.80 GHz)
echo 0 | sudo tee /sys/devices/system/cpu/intel_pstate/no_turbo
```

After a reboot i915 is gone and the 256 MB frame buffer returns to the system pool. The CPU can also boost to 2.80 GHz, which matters for the future Minecraft server.

---

## Chapter 3: trimming everything

A server should not have Bluetooth, audio or webcam drivers. It should not have snapd, desktop notifications, system statistics or the firmware update daemon.

The big clean-up:

```bash
# The whole audio stack
sudo apt purge -y alsa-base alsa-utils pipewire wireplumber pulseaudio-utils \
  linux-sound-base rtkit

# Bluetooth
sudo apt purge -y bluez bluez-cups bluez-obexd gnome-bluetooth-sendto

# Snap (no snap packages left using its 47 MB)
sudo apt purge -y snapd

# Firmware updates and power management (not needed on a server)
sudo apt purge -y fwupd fwupd-signed power-profiles-daemon upower

# Desktop leftovers
sudo apt purge -y udisks2 ubuntu-insights update-notifier anacron ubuntu-report \
  sysstat laptop-detect gnome-shell-ubuntu-extensions
```

I also blacklisted kernel modules so they are not loaded after a reboot:

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

In the end: manually installed packages dropped from **529 to 158**, and running services from over 50 down to **20**.

---

## Chapter 4: Docker and a stack of services

A server should not sit there bare. Docker goes on, and every service goes into a container.

### Installing Docker

```bash
sudo apt install -y docker.io
sudo usermod -aG docker $USER
```

### The service list

All the services I picked follow one principle: **lightweight, containerised, exposed through a Cloudflare Tunnel**.

| Service | Image | Purpose | Memory |
|---------|-------|---------|--------|
| **Forgejo** | `codeberg.org/forgejo/forgejo:10` | Git hosting (Gitea fork) | ~115 MB |
| **Portainer** | `portainer/portainer-ce:latest` | Visual Docker management | ~21 MB |
| **UrBackup** | `uroni/urbackup-server` | Incremental backup server | ~9 MB |
| **n8n** | `n8nio/n8n:latest` | Low-code automation workflows | ~311 MB |
| **Beszel** | `henrygd/beszel:latest` | Lightweight server monitoring | ~16 MB |

Every container is configured with `restart: unless-stopped` so it comes back after a reboot.

n8n is the heaviest (311 MB), the usual cost of a Node.js app. Beszel is the lightest (16 MB), replacing Netdata which used 402 MB.

### Data safety

A hard-won lesson: `docker stop && docker rm` does not preserve data unless you explicitly mounted a volume. I manage every service with `docker-compose` and keep data under `~/docker/<service>/data`, so a rebuild never loses anything.

```yaml
# Example: the Forgejo compose file
services:
  forgejo:
    image: codeberg.org/forgejo/forgejo:10
    container_name: forgejo
    restart: unless-stopped
    volumes:
      - ./data:/data          # persistent data
      - /etc/timezone:/etc/timezone:ro
      - /etc/localtime:/etc/localtime:ro
    ports:
      - "127.0.0.1:3000:3000" # listen on localhost only
      - "2222:22"              # Git SSH
```

Note the `127.0.0.1:3000:3000`: every web port binds to localhost and is never exposed on the LAN. All external access goes through the Cloudflare Tunnel.

---

## Chapter 5: a single entry point with Cloudflare Tunnel

The traditional approach is an Nginx reverse proxy, an SSL certificate and DDNS. Cloudflare Tunnel is simpler: run one `cloudflared` process on the server and all traffic is forwarded from Cloudflare's edge to a local port.

```yaml
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

One rule per subdomain, and a 404 if nothing matches. No inbound ports open, no public IP needed, SSL fully automatic.

The final domain map:

| Domain | Service |
|--------|---------|
| `git.vedaru.cn` | Forgejo Git hosting |
| `portainer.vedaru.cn` | Docker management panel |
| `backup.vedaru.cn` | UrBackup panel |
| `n8n.vedaru.cn` | n8n automation workflows |
| `monitor.vedaru.cn` | Beszel monitoring |

---

## Chapter 6: hardening

The services are exposed to the internet, so security cannot be sloppy.

### Firewall (UFW)

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp comment "SSH"
sudo ufw --force enable
```

Only port 22 for SSH is open. All inbound traffic to Docker ports is denied.

### Working around Docker's iptables hole

Docker edits iptables rules directly, bypassing UFW. The solution: bind every container port to `127.0.0.1` instead of `0.0.0.0`.

```bash
-p 127.0.0.1:3000:3000   # only the host can reach it
-p 3000:3000              # the whole LAN can reach it
```

Cloudflare Tunnel goes through localhost and is unaffected, while no other device on the LAN can reach any service directly.

### Fail2ban

```bash
sudo apt install -y fail2ban
```

The default sshd jail is enabled: three wrong passwords means a ten-minute ban.

### SSH hardening

```bash
PermitRootLogin no   # no root login
```

Password authentication stays, because I have not set up SSH keys yet. But fail2ban is the safety net, so brute force is impractical.

---

## Chapter 7: the journey from 2 GB to 1 GB

This is the part I am proudest of. Here is how memory usage evolved:

| Stage | Used | Available | What I did |
|-------|------|-----------|------------|
| Initial | 2.0 GiB | 4.9 GiB | Ubuntu 26.04 + GNOME + all services |
| Killed the GUI | 1.2 GiB | 5.6 GiB | Stopped GDM and GNOME Shell |
| Killed i915 | 1.0 GiB | 5.8 GiB | GPU driver blacklist (takes effect after reboot) |
| Killed netdata | 1.5 GiB | 5.4 GiB | 402 MB -> Beszel at 16 MB |
| Killed snapd+fwupd | 1.3 GiB | 5.5 GiB | Removed useless system services |
| **Final** | **1.0 GiB** | **5.8 GiB** | 371 packages removed, audio/Bluetooth/webcam gone |

From **2.0 GiB to 1.0 GiB**, a full gigabyte saved. That means I can comfortably give 3 GB to the future Minecraft server and still have 2.8 GB spare.

---

## Chapter 8: pitfalls in Beszel monitoring

Two pitfalls while replacing Netdata with Beszel:

**Pitfall one: Hub and Agent on different networks**

Beszel's Hub (the web UI) connects to the Agent (data collection) over SSH. If the two containers are on different Docker networks, `localhost` inside a container points at itself rather than the host. Solution: run both with `--network host` so they share the host network stack.

**Pitfall two: SSH key authentication**

The Agent stores a **public key** in the `KEY` environment variable to verify the Hub's connection, and the Hub needs the matching **private key** as `id_ed25519` in its data directory. I first used `openssl rand -base64` to generate a random string as the key, and the Agent log immediately spat out `ssh: no key found`.

The right way:

```bash
# Generate an ED25519 key pair
ssh-keygen -t ed25519 -f ~/beszel-data/beszel_key -N "" -C "beszel"

# Hub uses the private key (id_ed25519), Agent uses the public key (KEY env var)
cp ~/beszel-data/beszel_key ~/beszel-data/id_ed25519
PUBKEY=$(cat ~/beszel-data/beszel_key.pub)
```

Done. After logging in, add the system `localhost:45876` and the dashboard connects instantly.

---

## Chapter 9: other pitfalls

### UrBackup's TCP versus HTTP

UrBackup has two ports: 55414 (web UI) and 55415 (client TCP). I initially bound both to the same domain, `backup.vedaru.cn`, with the HTTP rule first. Cloudflare Tunnel then matched everything to the HTTP rule and TCP connections got `websocket: bad handshake`.

Solution: **they must use different subdomains**.

```yaml
  - hostname: backup.vedaru.cn
    service: http://localhost:55414
  - hostname: backup-tcp.vedaru.cn
    service: tcp://localhost:55415
```

### Docker volumes losing data

During one `docker stop && docker rm` I forgot to check the container's volume mounts, so the new container pointed at an empty host directory while the old data sat quietly in an orphaned volume. Luckily I noticed in time; everything lives under `~/docker/<service>/data`, so remounting restored it.

**Lesson**: before touching a container, glance at `docker inspect <container> | grep -A10 Mounts`.

### A proxy's love-hate relationship with local services

My main machine runs a `sing-box` proxy tunnel, and all HTTP traffic goes through the proxy by default, but local services such as `git.vedaru.cn` need a direct connection. Solution: add `NO_PROXY` to the proxy environment.

```bash
export NO_PROXY="localhost,127.0.0.1,.vedaru.cn,.local,.lan"
export no_proxy="$NO_PROXY"
```

---

## Chapter 10: the final state

### Server resources

```
CPU:    i5-6200U @ 2.80GHz Turbo
RAM:    1.0 GiB used / 6.8 GiB total / 5.8 GiB available
Disk:   19 GiB used / 233 GiB total
Pkgs:   158 (down from 529)
Svcs:   20 running
```

### Running services

| Container | Memory | Purpose |
|-----------|--------|---------|
| n8n | 311 MB | Automation workflows |
| forgejo | 115 MB | Git hosting |
| portainer | 21 MB | Docker management |
| beszel | 11 MB | Monitoring hub |
| beszel-agent | 5 MB | Monitoring agent |
| urbackup | 9 MB | Backup server |

### Security

- UFW firewall: only 22/tcp open
- Docker ports: all bound to localhost
- Fail2ban: SSH brute-force protection
- PermitRootLogin: disabled
- Cloudflare Tunnel: zero open ports

---

## Looking ahead

This server is far from finished. The plan:

- **Minecraft server** (PaperMC, 3 GB heap, expected to support 4-6 players at once)
- **NapCat QQ bot**
- Wiring Beszel alerts into QQ/email notifications through n8n

An old laptop that was headed for the bin is now sitting quietly in a corner running six Docker containers. No screen, no keyboard, no fan noise. SSH in, glance at `btop`, and feel content.

*If you also have a dusty old laptop: do not throw it away. Its second life might be far more interesting than you expect.*
