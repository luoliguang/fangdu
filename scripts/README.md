# 🛠️ 服务器维护脚本集合

快速清理和优化服务器的工具集。

---

## 🚀 快速开始

### 方法 1：从 Windows 本地清理（最简单）

在本地 Windows PowerShell 中运行：

```powershell
cd D:\Data\GitHub\fangdu\scripts
.\cleanup-server.ps1
```

输入服务器 IP，自动清理完成！

---

### 方法 2：在服务器上直接清理

SSH 登录到服务器后：

```bash
cd /path/to/fangdu/scripts
sudo chmod +x cleanup-server.sh
sudo ./cleanup-server.sh
```

选择 **10** 执行全面清理。

---

## 📦 脚本说明

### 🧹 清理工具

| 脚本 | 说明 | 平台 | 用途 |
|------|------|------|------|
| `cleanup-server.sh` | 全面清理脚本 | Linux | 在服务器上运行，清理各种无用文件 |
| `cleanup-server.ps1` | 远程清理脚本 | Windows | 从本地 Windows 远程清理服务器 |

**可清理内容**：
- ✅ 系统日志（保留7天）
- ✅ 包管理器缓存（APT/YUM）
- ✅ npm/yarn 缓存
- ✅ Docker 垃圾
- ✅ 临时文件
- ✅ PM2 日志
- ✅ Nginx 日志
- ✅ 系统缓存和 SWAP

**通常可释放**：500MB - 5GB

---

### 🔍 诊断工具

| 脚本 | 说明 | 用途 |
|------|------|------|
| `find-cpu-hogs.sh` | CPU 分析工具 | 找出 CPU 占用高的进程 |
| `emergency-fix.sh` | 紧急修复工具 | 全面诊断和修复服务器问题 |
| `emergency-fix.ps1` | 远程诊断工具 | 从 Windows 远程诊断服务器 |
| `fix-port-80.sh` | 端口占用修复 | 解决 80 端口被占用问题 |

---

### ⚙️ 自动化工具

| 脚本 | 说明 | 用途 |
|------|------|------|
| `setup-monitoring.sh` | 监控系统设置 | 设置自动监控和定期清理 |

**自动任务**：
- ⏰ 每 5 分钟检查资源使用
- 🧹 每天凌晨 2 点自动清理
- 💾 每周日清理 SWAP
- 📝 每月清理旧日志

---

## 📖 使用场景

### 场景 1：磁盘空间不足

```bash
# 快速清理
sudo ./cleanup-server.sh
# 选择 10（全部清理）
```

---

### 场景 2：CPU 占用过高（已修复，但想知道原因）

```bash
# 查看 CPU 占用
./find-cpu-hogs.sh

# 如果发现异常进程，重启它
pm2 restart all  # 或其他相应命令
```

---

### 场景 3：服务器无响应

```bash
# 在本地 Windows 运行
.\emergency-fix.ps1

# 或在服务器上运行
sudo ./emergency-fix.sh
```

---

### 场景 4：Nginx 启动失败（端口占用）

```bash
sudo ./fix-port-80.sh
```

---

### 场景 5：设置长期监控（推荐）

```bash
sudo ./setup-monitoring.sh
```

一次设置，永久受益！

---

## ⚡ 一键命令速查

### 查看系统状态
```bash
free -h         # 内存使用
df -h           # 磁盘使用
top             # 进程监控
pm2 status      # PM2 应用状态
systemctl status nginx  # Nginx 状态
```

### 快速清理
```bash
# 清理内存缓存
sync && sudo sh -c 'echo 3 > /proc/sys/vm/drop_caches'

# 清理 SWAP
sudo swapoff -a && sudo swapon -a

# 清理日志
sudo journalctl --vacuum-time=7d

# 清理 Docker
docker system prune -a -f
```

### 重启服务
```bash
pm2 restart all              # 重启 PM2 应用
sudo systemctl restart nginx # 重启 Nginx
docker-compose restart       # 重启 Docker 容器
```

---

## 📅 推荐维护计划

### 每天
```bash
# 快速检查
free -h && df -h
pm2 status
```

### 每周
```bash
# 执行清理
cd /path/to/fangdu/scripts
sudo ./cleanup-server.sh
```

### 每月
```bash
# 全面检查和清理
sudo ./cleanup-server.sh  # 全面清理
./find-cpu-hogs.sh        # 检查性能
# 考虑重启服务器
```

### 一次性设置
```bash
# 设置自动监控（强烈推荐）
sudo ./setup-monitoring.sh
```

---

## 🔧 脚本权限设置

第一次使用前，需要设置可执行权限：

```bash
cd /path/to/fangdu/scripts
chmod +x *.sh
```

---

## 📝 相关文档

- [服务器恢复指南](../docs/SERVER_RECOVERY.md) - 详细的故障排查指南
- [维护指南](../docs/MAINTENANCE_GUIDE.md) - 完整的维护操作手册
- [部署文档](../docs/DEPLOYMENT.md) - 部署和配置说明

---

## ⚠️ 注意事项

1. **需要 root 权限**：大多数清理操作需要 `sudo`
2. **定期备份**：清理前建议备份重要数据
3. **测试环境**：新脚本先在测试环境运行
4. **查看日志**：清理后检查服务是否正常运行

---

## 💡 常见问题

### Q: 清理后服务无法启动？
A: 检查是否误删了重要文件，查看日志：`journalctl -xe`

### Q: 清理效果不明显？
A: 可能需要清理项目文件：
```bash
# 清理 node_modules（谨慎）
cd /path/to/project
rm -rf node_modules
npm install
```

### Q: 如何查看清理效果？
A: 清理前后对比：
```bash
df -h  # 清理前
# ... 执行清理 ...
df -h  # 清理后
```

### Q: 可以定时自动清理吗？
A: 可以！运行：
```bash
sudo ./setup-monitoring.sh
```

---

## 🆘 需要帮助？

如果遇到问题：

1. 查看脚本执行日志
2. 检查错误信息
3. 参考 [SERVER_RECOVERY.md](../docs/SERVER_RECOVERY.md)
4. 查看系统日志：`sudo journalctl -xe`

---

*最后更新：2025-10-03*

