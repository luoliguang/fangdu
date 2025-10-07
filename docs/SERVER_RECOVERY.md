# 🚨 云服务器故障恢复指南

## 目录
1. [紧急情况处理](#紧急情况处理)
2. [SWAP 问题诊断与修复](#swap-问题诊断与修复)
3. [内存不足问题](#内存不足问题)
4. [服务恢复步骤](#服务恢复步骤)
5. [预防措施](#预防措施)

---

## 紧急情况处理

### 情况一：服务器完全无法访问

如果您的服务器完全打不开，按以下步骤操作：

#### 1️⃣ 从 Windows 本地诊断（推荐）

```powershell
# 在项目根目录下运行
cd scripts
.\emergency-fix.ps1
```

按提示输入服务器 IP 地址，脚本会自动诊断问题。

#### 2️⃣ 直接 SSH 登录服务器

```bash
# 替换为您的服务器 IP
ssh root@your-server-ip
```

如果能够登录，运行诊断脚本：

```bash
cd /path/to/fangdu/scripts
chmod +x emergency-fix.sh
./emergency-fix.sh
```

#### 3️⃣ 如果 SSH 也无法连接

这说明服务器可能已经死机，需要：

1. 登录云服务器管理控制台（阿里云/腾讯云/AWS等）
2. 查看服务器监控面板：
   - CPU 使用率
   - 内存使用率
   - 磁盘使用率
   - 网络流量
3. 检查是否有告警信息
4. 尝试通过控制台的 VNC 或远程连接功能登录
5. **最后手段**：强制重启服务器（可能导致数据丢失）

---

## SWAP 问题诊断与修复

### 什么是 SWAP 问题？

SWAP（交换空间）是当物理内存不足时使用的虚拟内存。如果：
- SWAP 使用率 > 80%：系统会变得非常慢
- SWAP 满了：系统可能会杀死进程或死机
- 没有 SWAP：小内存服务器会频繁崩溃

### 快速检查

```bash
# 查看内存和 SWAP 状态
free -h

# 查看 SWAP 详情
swapon --show

# 查看内存使用最多的进程
ps aux --sort=-%mem | head -10
```

### 诊断结果解读

```
              total        used        free
Mem:          1.9Gi       1.8Gi       100Mi
Swap:         4.0Gi       3.9Gi       100Mi
```

- **危险**：Swap used > 3.5G (使用率 > 85%)
- **警告**：Swap used > 2.0G (使用率 > 50%)
- **正常**：Swap used < 1.0G (使用率 < 25%)

### 修复方案

#### 方案 A：清理 SWAP（临时解决）

```bash
# 1. 停止占用内存的服务
pm2 stop all
docker-compose down

# 2. 清理系统缓存
sync
sudo sh -c 'echo 3 > /proc/sys/vm/drop_caches'

# 3. 清理 SWAP
sudo swapoff -a
sudo swapon -a

# 4. 重启服务
pm2 start all
docker-compose up -d

# 5. 检查状态
free -h
```

#### 方案 B：增加 SWAP 空间（推荐）

```bash
# 1. 检查当前 SWAP
sudo swapon --show

# 2. 关闭现有 SWAP（如果有）
sudo swapoff /swapfile
sudo rm -f /swapfile

# 3. 创建新的 4GB SWAP 文件
sudo dd if=/dev/zero of=/swapfile bs=1M count=4096 status=progress

# 4. 设置权限
sudo chmod 600 /swapfile

# 5. 格式化为 SWAP
sudo mkswap /swapfile

# 6. 启用 SWAP
sudo swapon /swapfile

# 7. 验证
swapon --show
free -h

# 8. 永久启用（添加到 /etc/fstab）
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# 9. 优化 SWAP 使用（降低 swappiness）
sudo sysctl vm.swappiness=10
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
```

**说明**：
- `swappiness=10` 表示只有在内存使用超过 90% 时才使用 SWAP
- 默认值是 60，对于服务器来说太高了

#### 方案 C：创建更大的 SWAP（内存 < 2GB 时）

```bash
# 如果服务器内存小于 2GB，建议创建 6-8GB SWAP
sudo dd if=/dev/zero of=/swapfile bs=1M count=8192 status=progress
# 后续步骤同方案 B
```

---

## 内存不足问题

### 立即释放内存

```bash
# 1. 查看内存使用
free -h
top -o %MEM

# 2. 停止非必要服务
pm2 stop app-name  # 停止特定应用
docker stop container-name  # 停止特定容器

# 3. 清理缓存
# 清理页缓存
sudo sh -c 'echo 1 > /proc/sys/vm/drop_caches'

# 清理目录项和inode缓存
sudo sh -c 'echo 2 > /proc/sys/vm/drop_caches'

# 清理所有缓存
sudo sh -c 'echo 3 > /proc/sys/vm/drop_caches'

# 4. 清理 npm 缓存
npm cache clean --force

# 5. 清理 Docker（如果使用）
docker system prune -a -f
docker volume prune -f

# 6. 清理系统日志
sudo journalctl --vacuum-time=7d
sudo journalctl --vacuum-size=100M
```

### 找出内存泄漏的进程

```bash
# 持续监控内存使用
watch -n 1 'ps aux --sort=-%mem | head -10'

# 查看某个进程的详细内存使用
top -p <PID>

# 如果是 Node.js 进程占用过多内存
pm2 restart app-name
```

### 长期解决方案

#### 1. 限制 Node.js 内存使用

在 `backend/ecosystem.config.js` 或 PM2 配置中：

```javascript
module.exports = {
  apps: [{
    name: 'fangdu-backend',
    script: './server.js',
    node_args: '--max-old-space-size=512',  // 限制为 512MB
    instances: 1,
    exec_mode: 'fork',  // 不使用 cluster 模式
    watch: false
  }]
}
```

#### 2. 在本地构建前端

**强烈推荐**：不要在云服务器上运行 `npm run build`，会占用大量内存！

在本地 Windows 上：

```bash
cd frontend
npm install
npm run build

# 将 dist 目录上传到服务器
scp -r dist/* root@your-server:/var/www/html/
```

或使用 WinSCP、FileZilla 等工具上传 `dist` 文件夹。

#### 3. 使用 Docker 限制内存

在 `docker-compose.yml` 中：

```yaml
services:
  fangdu-app:
    build: .
    container_name: fangdu-backend
    deploy:
      resources:
        limits:
          memory: 512M  # 限制最大内存
        reservations:
          memory: 256M  # 保留内存
```

---

## 服务恢复步骤

### 完整恢复流程

```bash
# ============================================
# 第一步：诊断问题
# ============================================

# 检查系统状态
free -h
df -h
top -bn1 | head -20

# 检查服务状态
sudo systemctl status nginx
pm2 status
docker ps -a

# ============================================
# 第二步：清理和修复
# ============================================

# 清理内存
sync
sudo sh -c 'echo 3 > /proc/sys/vm/drop_caches'

# 修复 SWAP（如果需要）
sudo swapoff -a
sudo swapon -a

# 清理磁盘空间
sudo journalctl --vacuum-time=7d
docker system prune -f

# ============================================
# 第三步：重启服务
# ============================================

# 重启 Nginx
sudo systemctl restart nginx
sudo systemctl status nginx

# 重启后端应用
pm2 restart all
pm2 status
pm2 logs --lines 50

# 或重启 Docker 容器
docker-compose down
docker-compose up -d
docker logs fangdu-backend

# ============================================
# 第四步：验证
# ============================================

# 检查端口
sudo netstat -tlnp | grep -E ":(80|443|3000|3002)"

# 测试后端 API
curl http://localhost:3002/api/materials

# 测试前端
curl http://localhost

# 检查 Nginx 日志
sudo tail -f /var/log/nginx/error.log

# ============================================
# 第五步：监控
# ============================================

# 持续监控内存
watch -n 5 free -h

# 监控 PM2
pm2 monit

# 查看实时日志
pm2 logs
```

---

## 预防措施

### 1. 服务器配置建议

#### 最小配置（生产环境不推荐）
- CPU: 1核
- 内存: 1GB
- SWAP: 6GB
- 磁盘: 20GB

#### 推荐配置
- CPU: 2核
- 内存: 2GB
- SWAP: 4GB
- 磁盘: 40GB

#### 理想配置
- CPU: 4核
- 内存: 4GB
- SWAP: 2GB（作为备用）
- 磁盘: 60GB

### 2. 自动化监控脚本

创建 `/root/monitor.sh`：

```bash
#!/bin/bash

# 监控阈值
MEM_THRESHOLD=85
DISK_THRESHOLD=85
SWAP_THRESHOLD=75

# 获取使用率
MEM_USAGE=$(free | grep Mem | awk '{printf("%.0f"), $3/$2 * 100}')
DISK_USAGE=$(df -h / | awk 'NR==2{print $5}' | sed 's/%//')
SWAP_USAGE=$(free | grep Swap | awk '{if($2>0) printf("%.0f"), $3/$2 * 100; else print 0}')

# 检查并告警
if [ "$MEM_USAGE" -gt "$MEM_THRESHOLD" ]; then
    echo "$(date): 内存使用率 ${MEM_USAGE}% 超过阈值！" >> /var/log/server-monitor.log
    # 自动清理
    sync
    echo 3 > /proc/sys/vm/drop_caches
fi

if [ "$SWAP_USAGE" -gt "$SWAP_THRESHOLD" ]; then
    echo "$(date): SWAP使用率 ${SWAP_USAGE}% 超过阈值！" >> /var/log/server-monitor.log
    # 可以在这里添加重启服务的逻辑
fi

if [ "$DISK_USAGE" -gt "$DISK_THRESHOLD" ]; then
    echo "$(date): 磁盘使用率 ${DISK_USAGE}% 超过阈值！" >> /var/log/server-monitor.log
    # 清理日志
    journalctl --vacuum-time=7d
fi
```

添加到 crontab（每5分钟检查一次）：

```bash
chmod +x /root/monitor.sh
crontab -e

# 添加以下行
*/5 * * * * /root/monitor.sh
```

### 3. 定期维护

每周执行一次：

```bash
#!/bin/bash
# weekly-maintenance.sh

echo "$(date): 开始每周维护"

# 清理日志
journalctl --vacuum-time=14d

# 清理 Docker
docker system prune -f

# 清理 npm 缓存
npm cache clean --force

# 重启 PM2 应用（释放内存）
pm2 restart all

# 清理系统缓存
sync
echo 3 > /proc/sys/vm/drop_caches

# 清理 SWAP
swapoff -a
swapon -a

echo "$(date): 维护完成"
```

### 4. 构建策略

**强烈建议**：在本地构建，在服务器上只部署！

#### 本地构建流程（Windows）

```bash
# 1. 在本地构建前端
cd frontend
npm install
npm run build

# 2. 使用 SCP 或 SFTP 上传
# 使用 PowerShell
scp -r dist/* root@your-server:/var/www/html/

# 或使用图形化工具：WinSCP、FileZilla
```

#### 服务器上只部署后端

```bash
# 在服务器上
cd /path/to/fangdu/backend
npm install --production
pm2 start ecosystem.config.js
```

### 5. 设置告警

在云服务器控制台设置：

1. **内存使用率告警**：> 80%
2. **CPU 使用率告警**：> 85%
3. **磁盘使用率告警**：> 80%
4. **进程异常退出告警**
5. **网络异常告警**

---

## 快速参考

### 常用命令速查

```bash
# 查看内存
free -h

# 查看 SWAP
swapon --show

# 查看磁盘
df -h

# 查看进程
top
htop  # 需要安装

# 查看端口
sudo netstat -tlnp
sudo ss -tlnp

# 重启服务
sudo systemctl restart nginx
pm2 restart all
docker-compose restart

# 查看日志
pm2 logs
sudo tail -f /var/log/nginx/error.log
docker logs container-name

# 清理内存
sync && echo 3 | sudo tee /proc/sys/vm/drop_caches

# 清理 SWAP
sudo swapoff -a && sudo swapon -a
```

### 紧急联系清单

- [ ] 云服务器控制台登录地址：______________
- [ ] 云服务器账号：______________
- [ ] 服务器 IP：______________
- [ ] SSH 端口：22（默认）
- [ ] 域名：______________
- [ ] 备份位置：______________

---

## 故障排查决策树

```
服务器无法访问
├─ 能 ping 通？
│  ├─ 是 → 检查服务状态
│  │      ├─ Nginx 运行？
│  │      ├─ PM2 运行？
│  │      └─ Docker 运行？
│  └─ 否 → 服务器死机
│         └─ 登录控制台 → VNC 连接 → 强制重启
│
├─ 能 SSH 登录？
│  ├─ 是 → 检查资源使用
│  │      ├─ 内存 > 90%？ → 清理内存
│  │      ├─ SWAP > 80%？ → 清理/扩展 SWAP
│  │      ├─ 磁盘 > 85%？ → 清理磁盘
│  │      └─ CPU 100%？ → 找出进程并优化
│  └─ 否 → SSH 服务故障
│         └─ 通过控制台 VNC 登录修复
│
└─ 服务响应慢？
   ├─ 检查 SWAP 使用率
   ├─ 检查慢查询
   └─ 检查网络带宽
```

---

## 联系支持

如果以上方法都无法解决问题：

1. 导出服务器监控数据
2. 保存错误日志
3. 记录问题出现的时间和操作
4. 联系云服务器技术支持

---

*最后更新：2025-10-03*

