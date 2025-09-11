# 云服务器阿里云OSS配置完整指南

## 问题背景

根据您遇到的问题：
1. 无法获取阿里云素材
2. 无法上传素材
3. OSS endpoint错误

这些问题通常是由于云服务器上的OSS配置不正确导致的。本指南将帮助您完整配置云服务器上的OSS环境。

## 前置准备

### 1. 阿里云OSS信息收集

在开始配置之前，请先在阿里云控制台收集以下信息：

```bash
# 登录阿里云控制台 -> 对象存储OSS -> Bucket列表
# 记录以下信息：

✓ Bucket名称: ________________
✓ Bucket区域: ________________ (如：华南1(深圳))
✓ 区域代码: __________________ (如：oss-cn-shenzhen)
✓ 外网访问域名: ______________ (如：your-bucket.oss-cn-shenzhen.aliyuncs.com)
```

### 2. AccessKey信息

```bash
# 阿里云控制台 -> AccessKey管理
# 创建或获取AccessKey信息：

✓ AccessKey ID: ______________
✓ AccessKey Secret: __________
```

**重要提醒**：确保AccessKey具有OSS完整权限或以下权限：
- `oss:PutObject` (上传文件)
- `oss:GetObject` (获取文件)
- `oss:DeleteObject` (删除文件)
- `oss:ListObjects` (列出文件)

## 云服务器配置步骤

### 步骤1：连接云服务器

```bash
# 使用SSH连接到您的云服务器
ssh username@your-server-ip

# 或使用云服务器控制台的远程连接功能
```

### 步骤2：进入项目目录

```bash
# 进入您的项目目录
cd /path/to/your/fangdu

# 确认项目结构
ls -la
# 应该看到 backend/ frontend/ 等目录
```

### 步骤3：检查当前配置

```bash
# 进入后端目录
cd backend

# 查看当前环境变量文件
ls -la .env*

# 查看当前配置内容
cat .env
```

### 步骤4：备份现有配置

```bash
# 备份当前配置（如果存在）
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)

# 确认备份
ls -la .env.backup*
```

### 步骤5：配置正确的环境变量

#### 方法A：直接编辑.env文件

```bash
# 使用vim编辑器
vim .env

# 或使用nano编辑器
nano .env
```

在编辑器中，确保包含以下正确配置：

```env
# 应用基础配置
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# 数据库配置（根据实际情况修改）
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=your_db_username
DB_PASSWORD=your_db_password
DB_DATABASE=fangdu_prod

# JWT配置
JWT_SECRET=your_very_secure_jwt_secret_key
JWT_EXPIRES_IN=24h

# 阿里云OSS配置（重要！请替换为实际值）
ALI_OSS_ACCESS_KEY_ID=LTAI5t6A7B8C9D0E1F2G3H4I
ALI_OSS_ACCESS_KEY_SECRET=your_actual_access_key_secret_30_chars
ALI_OSS_BUCKET=your_actual_bucket_name
ALI_OSS_REGION=oss-cn-shenzhen

# 其他配置
MAX_FILE_SIZE=10485760
UPLOAD_DIR=/var/uploads
```

#### 方法B：使用脚本批量设置

```bash
# 创建配置脚本
cat > setup_oss_env.sh << 'EOF'
#!/bin/bash

# OSS配置设置脚本
echo "设置阿里云OSS环境变量..."

# 提示用户输入配置信息
read -p "请输入AccessKey ID: " ACCESS_KEY_ID
read -s -p "请输入AccessKey Secret: " ACCESS_KEY_SECRET
echo
read -p "请输入Bucket名称: " BUCKET_NAME
read -p "请输入Region (如: oss-cn-shenzhen): " REGION

# 备份现有配置
if [ -f ".env" ]; then
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    echo "已备份现有配置"
fi

# 更新或添加OSS配置
echo "" >> .env
echo "# 阿里云OSS配置" >> .env
echo "ALI_OSS_ACCESS_KEY_ID=$ACCESS_KEY_ID" >> .env
echo "ALI_OSS_ACCESS_KEY_SECRET=$ACCESS_KEY_SECRET" >> .env
echo "ALI_OSS_BUCKET=$BUCKET_NAME" >> .env
echo "ALI_OSS_REGION=$REGION" >> .env

echo "OSS配置已更新！"
EOF

# 运行配置脚本
chmod +x setup_oss_env.sh
./setup_oss_env.sh
```

### 步骤6：验证配置

#### 使用内置验证工具

```bash
# 运行环境变量验证
node utils/validateEnv.js

# 或使用PowerShell脚本（如果在Windows服务器上）
powershell -ExecutionPolicy Bypass -File ../scripts/oss-check.ps1

# 或使用Bash脚本（Linux服务器）
bash ../scripts/oss-check.sh
```

#### 手动验证

```bash
# 检查环境变量是否正确加载
echo "AccessKey ID: $ALI_OSS_ACCESS_KEY_ID"
echo "Bucket: $ALI_OSS_BUCKET"
echo "Region: $ALI_OSS_REGION"

# 测试网络连接
curl -I https://$ALI_OSS_BUCKET.$ALI_OSS_REGION.aliyuncs.com
```

### 步骤7：重启服务

#### 如果使用PM2

```bash
# 重启所有PM2进程
pm2 restart all

# 查看启动日志
pm2 logs --lines 50

# 检查进程状态
pm2 status
```

#### 如果使用systemd

```bash
# 重启服务
sudo systemctl restart your-app-service

# 查看服务状态
sudo systemctl status your-app-service

# 查看日志
journalctl -u your-app-service -f
```

#### 如果使用Docker

```bash
# 重启容器
docker-compose restart backend

# 查看日志
docker-compose logs -f backend
```

### 步骤8：测试功能

#### 测试后端API

```bash
# 测试上传接口
curl -X POST http://localhost:3000/api/materials \
  -F "file=@/path/to/test/image.jpg" \
  -F "name=测试图片" \
  -F "tags=测试"

# 测试获取接口
curl http://localhost:3000/api/materials
```

#### 测试前端功能

1. 打开浏览器访问前端页面
2. 尝试上传文件
3. 检查是否能正常显示已上传的文件
4. 查看浏览器控制台是否有错误

## 常见问题解决

### 问题1："The bucket you are attempting to access must be addressed using the specified endpoint"

**原因**：Region配置与实际Bucket所在区域不匹配

**解决方案**：
```bash
# 1. 登录阿里云控制台确认Bucket实际区域
# 2. 更新.env文件中的ALI_OSS_REGION
# 例如：如果Bucket在深圳，应该设置为 oss-cn-shenzhen

# 3. 重启服务
pm2 restart all
```

### 问题2：认证失败 (InvalidAccessKeyId)

**原因**：AccessKey配置错误

**解决方案**：
```bash
# 1. 检查AccessKey是否正确
echo "当前AccessKey: $ALI_OSS_ACCESS_KEY_ID"

# 2. 在阿里云控制台验证AccessKey状态
# 3. 如果需要，重新生成AccessKey
# 4. 更新.env文件
# 5. 重启服务
```

### 问题3：权限不足 (AccessDenied)

**原因**：AccessKey权限不足

**解决方案**：
```bash
# 1. 在阿里云控制台 -> RAM访问控制
# 2. 找到对应的用户
# 3. 添加权限策略：AliyunOSSFullAccess
# 4. 或创建自定义策略包含必要的OSS权限
```

### 问题4：网络连接问题

**原因**：服务器网络配置或防火墙问题

**解决方案**：
```bash
# 1. 检查防火墙设置
sudo ufw status

# 2. 允许HTTPS出站连接
sudo ufw allow out 443

# 3. 测试网络连接
curl -I https://oss-cn-shenzhen.aliyuncs.com

# 4. 检查DNS解析
nslookup your-bucket.oss-cn-shenzhen.aliyuncs.com
```

## 安全最佳实践

### 1. 环境变量安全

```bash
# 设置.env文件权限
chmod 600 .env

# 确保.env文件不被版本控制
echo ".env" >> .gitignore

# 定期轮换AccessKey
# 建议每3-6个月更换一次AccessKey
```

### 2. 网络安全

```bash
# 配置防火墙只允许必要端口
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw allow 3000  # 应用端口（如果需要直接访问）

# 启用防火墙
sudo ufw enable
```

### 3. 访问控制

- 使用RAM子账号而不是主账号AccessKey
- 为不同环境使用不同的AccessKey
- 定期审查和清理不必要的权限

## 监控和维护

### 1. 日志监控

```bash
# 设置日志轮转
sudo logrotate -f /etc/logrotate.conf

# 监控应用日志
tail -f /var/log/your-app/app.log

# 监控PM2日志
pm2 logs --lines 100
```

### 2. 性能监控

```bash
# 监控系统资源
htop

# 监控磁盘使用
df -h

# 监控网络连接
netstat -tlnp
```

### 3. 定期检查

```bash
# 创建定期检查脚本
cat > /etc/cron.daily/oss-health-check << 'EOF'
#!/bin/bash
cd /path/to/your/fangdu/backend
node utils/validateEnv.js > /var/log/oss-health-check.log 2>&1
EOF

chmod +x /etc/cron.daily/oss-health-check
```

## 故障排查清单

当遇到OSS相关问题时，请按以下顺序检查：

- [ ] 1. 环境变量是否正确设置
- [ ] 2. AccessKey是否有效且权限充足
- [ ] 3. Region配置是否与Bucket实际区域匹配
- [ ] 4. 网络连接是否正常
- [ ] 5. 防火墙是否阻止了HTTPS连接
- [ ] 6. 服务是否正确重启
- [ ] 7. 应用日志中是否有详细错误信息

## 联系支持

如果按照本指南操作后仍然遇到问题，请提供以下信息：

1. 云服务器操作系统和版本
2. Node.js版本
3. 完整的错误日志（请隐藏敏感信息）
4. 环境变量配置（请隐藏AccessKey等敏感信息）
5. 网络测试结果

---

**重要提醒**：
- 请勿在日志、截图或任何公开场所暴露AccessKey等敏感信息
- 定期备份重要配置文件
- 建议在测试环境先验证配置后再应用到生产环境