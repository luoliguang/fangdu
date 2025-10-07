# 🛠️ 服务器维护指南

## 快速清理服务器

### 立即执行清理（推荐）

```bash
cd /path/to/fangdu/scripts
sudo chmod +x cleanup-server.sh
sudo ./cleanup-server.sh
```

选择选项 **10**（全部清理）即可一键清除所有无用文件。

---

## 📦 清理脚本说明

### 1. 全面清理工具 (`cleanup-server.sh`)

**功能**：清除服务器上的各种无用文件

**清理内容**：
- ✅ 系统日志文件（保留7天）
- ✅ APT/YUM 软件包缓存
- ✅ npm/yarn 缓存
- ✅ Docker 垃圾文件和镜像
- ✅ 临时文件 (/tmp, /var/tmp)
- ✅ 旧的内核文件
- ✅ PM2 应用日志
- ✅ Nginx 日志
- ✅ 系统内存缓存

**使用方法**：
```bash
cd scripts
sudo chmod +x cleanup-server.sh
sudo ./cleanup-server.sh
```

**通常可释放空间**：500MB - 5GB（取决于服务器使用时间）

---

### 2. CPU 分析工具 (`find-cpu-hogs.sh`)

**功能**：找出导致 CPU 满的罪魁祸首

**分析内容**：
- 系统负载情况
- CPU 占用 TOP 10 进程
- Node.js 进程状态
- Nginx 进程状态
- Docker 容器资源使用
- PM2 进程监控
- 僵尸进程检测

**使用方法**：
```bash
cd scripts
chmod +x find-cpu-hogs.sh
./find-cpu-hogs.sh
```

**何时使用**：
- CPU 使用率过高时
- 服务器响应缓慢时
- 定期检查（每周一次）

---

### 3. 自动监控系统 (`setup-monitoring.sh`)

**功能**：设置自动监控和定期清理

**自动任务**：
- ⏰ 每 5 分钟检查资源使用
- 🧹 每天凌晨 2 点自动清理
- 💾 每周日清理 SWAP
- 📝 每月清理旧日志

**使用方法**：
```bash
cd scripts
sudo chmod +x setup-monitoring.sh
sudo ./setup-monitoring.sh
```

**一次设置，长期受益！**

---

## 🚀 快速操作指南

### 场景 1：磁盘空间不足

```bash
# 1. 查看磁盘使用
df -h

# 2. 找出大文件
sudo du -sh /var/* | sort -hr | head -10
sudo du -sh /var/log/* | sort -hr | head -10

# 3. 执行清理
cd /path/to/fangdu/scripts
sudo ./cleanup-server.sh
# 选择 10（全部清理）

# 4. 再次检查
df -h
```

---

### 场景 2：CPU 占用过高

```bash
# 1. 查看 CPU 占用情况
cd /path/to/fangdu/scripts
./find-cpu-hogs.sh

# 2. 如果是 Node.js 进程占用过高
pm2 restart all

# 3. 如果是 Nginx 占用过高
sudo systemctl restart nginx

# 4. 如果是 Docker 容器占用过高
docker stats  # 查看哪个容器
docker restart <container-name>

# 5. 清理内存和缓存
sync && sudo sh -c 'echo 3 > /proc/sys/vm/drop_caches'
```

---

### 场景 3：内存不足

```bash
# 1. 查看内存使用
free -h

# 2. 查看占用内存最多的进程
ps aux --sort=-%mem | head -10

# 3. 清理系统缓存
sync
sudo sh -c 'echo 3 > /proc/sys/vm/drop_caches'

# 4. 清理 SWAP
sudo swapoff -a && sudo swapon -a

# 5. 重启占用过多的服务
pm2 restart all
sudo systemctl restart nginx
```

---

### 场景 4：SWAP 使用率过高

```bash
# 1. 查看 SWAP 状态
swapon --show
free -h

# 2. 清理 SWAP
sudo swapoff -a
sudo swapon -a

# 3. 查看效果
free -h

# 4. 如果问题持续，重启服务释放内存
pm2 restart all
```

---

## 📅 定期维护计划

### 每天
- 查看服务器状态：`free -h && df -h`
- 查看服务是否正常：`pm2 status && systemctl status nginx`

### 每周
```bash
# 1. 执行全面清理
cd /path/to/fangdu/scripts
sudo ./cleanup-server.sh

# 2. 检查 CPU 使用
./find-cpu-hogs.sh

# 3. 查看监控日志
sudo tail -f /var/log/server-monitor.log
```

### 每月
```bash
# 1. 检查磁盘空间
df -h
sudo du -sh /var/* | sort -hr | head -10

# 2. 清理旧备份和日志
find /path/to/backups -mtime +30 -delete

# 3. 检查系统更新
sudo apt update && sudo apt upgrade

# 4. 重启服务器（可选，释放所有资源）
sudo reboot
```

---

## 🔧 手动清理命令速查

### 清理系统日志
```bash
# 清理 journalctl 日志
sudo journalctl --vacuum-time=7d
sudo journalctl --vacuum-size=100M

# 清理旧日志文件
sudo find /var/log -type f -name "*.log.*" -mtime +7 -delete
sudo find /var/log -type f -name "*.gz" -mtime +7 -delete
```

### 清理包缓存
```bash
# Ubuntu/Debian
sudo apt clean
sudo apt autoclean
sudo apt autoremove -y

# CentOS/RHEL
sudo yum clean all
```

### 清理 Docker
```bash
# 清理未使用的镜像和容器
docker system prune -a -f

# 清理卷
docker volume prune -f

# 查看 Docker 磁盘使用
docker system df
```

### 清理 npm/yarn
```bash
# 清理 npm 缓存
npm cache clean --force
rm -rf ~/.npm/_cacache

# 清理 yarn 缓存
yarn cache clean
```

### 清理 PM2
```bash
# 清空所有日志
pm2 flush

# 删除所有日志文件
rm -rf ~/.pm2/logs/*.log
```

### 清理 Nginx
```bash
# 清空日志文件
sudo truncate -s 0 /var/log/nginx/access.log
sudo truncate -s 0 /var/log/nginx/error.log

# 删除压缩的旧日志
sudo rm -f /var/log/nginx/*.gz
```

### 清理临时文件
```bash
# 清理 /tmp
sudo find /tmp -type f -atime +3 -delete

# 清理用户缓存
rm -rf ~/.cache/*

# 清理系统缓存
sync
sudo sh -c 'echo 3 > /proc/sys/vm/drop_caches'
```

---

## 🎯 预防 CPU 满的措施

### 1. 限制 Node.js 内存使用

在 PM2 配置中：
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'fangdu-backend',
    script: './server.js',
    node_args: '--max-old-space-size=512',  // 限制 512MB
    instances: 1,
    max_memory_restart: '500M'  // 超过 500MB 自动重启
  }]
}
```

### 2. 设置 Nginx 限制

在 nginx.conf 中：
```nginx
# 限制并发连接
limit_conn_zone $binary_remote_addr zone=addr:10m;
limit_conn addr 10;

# 限制请求速率
limit_req_zone $binary_remote_addr zone=one:10m rate=10r/s;
limit_req zone=one burst=20;
```

### 3. Docker 资源限制

在 docker-compose.yml 中：
```yaml
services:
  fangdu-app:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
```

### 4. 监控告警

设置云服务器控制台告警：
- CPU > 80% 持续 5 分钟
- 内存 > 85%
- 磁盘 > 80%

---

## 📊 查看系统状态命令

### 快速检查
```bash
# 一键查看系统状态
echo "=== CPU ===" && top -bn1 | head -5 && \
echo "=== 内存 ===" && free -h && \
echo "=== 磁盘 ===" && df -h && \
echo "=== 负载 ===" && uptime && \
echo "=== 进程 ===" && ps aux --sort=-%cpu | head -5
```

### 详细分析
```bash
# 实时监控
htop  # 需要安装: sudo apt install htop

# 或使用 top
top

# 按键：
# P - 按 CPU 排序
# M - 按内存排序
# q - 退出
```

### 查看日志
```bash
# PM2 日志
pm2 logs

# Nginx 错误日志
sudo tail -f /var/log/nginx/error.log

# 系统日志
sudo journalctl -xe

# 监控日志（如果已设置）
tail -f /var/log/server-monitor.log
```

---

## ⚡ 紧急处理流程

### 服务器卡死/CPU 100%

```bash
# 1. 通过 SSH 登录（如果可以）
ssh root@your-server-ip

# 2. 查看 CPU 占用
ps aux --sort=-%cpu | head -10

# 3. 找到占用最高的进程，记住 PID
# 4. 停止进程
kill <PID>
# 或强制停止
kill -9 <PID>

# 5. 如果是 PM2 应用
pm2 stop all
pm2 restart all

# 6. 清理内存
sync && sudo sh -c 'echo 3 > /proc/sys/vm/drop_caches'

# 7. 如果 SSH 都连不上，从云控制台强制重启
```

### 防止再次发生

```bash
# 设置自动监控
cd /path/to/fangdu/scripts
sudo ./setup-monitoring.sh
```

---

## 📞 需要帮助？

如果遇到问题：

1. 查看详细错误日志
2. 运行 `find-cpu-hogs.sh` 找出问题
3. 运行 `cleanup-server.sh` 清理空间
4. 参考 `docs/SERVER_RECOVERY.md` 恢复指南

---

*最后更新：2025-10-03*

