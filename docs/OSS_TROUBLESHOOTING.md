# 阿里云OSS配置问题排查指南

## 问题症状

根据您提供的错误信息，主要问题包括：
1. 无法获取阿里云素材
2. 无法上传素材
3. OSS endpoint错误："The bucket you are attempting to access must be addressed using the specified endpoint"

## 问题原因分析

### 1. Endpoint配置错误
- **问题**：OSS endpoint与bucket所在区域不匹配
- **表现**：API返回500错误，提示endpoint错误
- **原因**：云服务器环境变量中的region配置与实际bucket区域不符

### 2. 环境变量配置不完整
- **问题**：生产环境的OSS配置使用了模板值
- **表现**：连接失败，认证错误
- **原因**：`.env.production`文件中的OSS配置未正确设置

## 配置检查清单

### ✅ 步骤1：验证阿里云OSS基本信息

在阿里云控制台确认以下信息：

```bash
# 1. 登录阿里云控制台 -> 对象存储OSS
# 2. 记录以下信息：

✓ Bucket名称: ________________
✓ Bucket区域: ________________ (如：华南1(深圳))
✓ 区域代码: __________________ (如：oss-cn-shenzhen)
✓ 外网访问域名: ______________ (如：your-bucket.oss-cn-shenzhen.aliyuncs.com)
✓ AccessKey ID: ______________
✓ AccessKey Secret: __________
```

### ✅ 步骤2：检查云服务器环境变量

在云服务器上执行以下命令：

```bash
# 1. 进入项目目录
cd /path/to/your/fangdu/backend

# 2. 检查环境变量文件
cat .env

# 3. 验证OSS相关配置
echo "ALI_OSS_ACCESS_KEY_ID: $ALI_OSS_ACCESS_KEY_ID"
echo "ALI_OSS_ACCESS_KEY_SECRET: $ALI_OSS_ACCESS_KEY_SECRET"
echo "ALI_OSS_BUCKET: $ALI_OSS_BUCKET"
echo "ALI_OSS_REGION: $ALI_OSS_REGION"
```

### ✅ 步骤3：正确配置环境变量

根据步骤1获取的信息，更新云服务器的`.env`文件：

```bash
# 编辑环境变量文件
vim .env

# 或者
nano .env
```

确保包含以下正确配置：

```env
# 阿里云OSS配置
ALI_OSS_ACCESS_KEY_ID=your_actual_access_key_id
ALI_OSS_ACCESS_KEY_SECRET=your_actual_access_key_secret
ALI_OSS_BUCKET=your_actual_bucket_name
ALI_OSS_REGION=oss-cn-shenzhen  # 替换为实际区域代码
```

### ✅ 步骤4：验证网络连接

```bash
# 1. 测试DNS解析
nslookup your-bucket.oss-cn-shenzhen.aliyuncs.com

# 2. 测试网络连接
curl -I https://your-bucket.oss-cn-shenzhen.aliyuncs.com

# 3. 检查防火墙设置
sudo ufw status
```

### ✅ 步骤5：重启服务

```bash
# 1. 重启后端服务
pm2 restart all

# 2. 查看启动日志
pm2 logs --lines 50

# 3. 检查服务状态
pm2 status
```

## 常见配置错误

### 错误1：Region代码不正确

```bash
# ❌ 错误配置
ALI_OSS_REGION=guangzhou

# ✅ 正确配置
ALI_OSS_REGION=oss-cn-guangzhou
```

### 错误2：使用了模板值

```bash
# ❌ 错误配置（来自.env.production模板）
ALI_OSS_ACCESS_KEY_ID=your-production-oss-key-id
ALI_OSS_BUCKET=your-production-oss-bucket

# ✅ 正确配置
ALI_OSS_ACCESS_KEY_ID=LTAI5t6A7B8C9D0E1F2G3H4I
ALI_OSS_BUCKET=fangdu-materials
```

### 错误3：权限配置不当

确保AccessKey具有以下权限：
- AliyunOSSFullAccess（完整权限）
- 或者自定义权限策略包含：
  - oss:PutObject（上传文件）
  - oss:GetObject（获取文件）
  - oss:DeleteObject（删除文件）
  - oss:ListObjects（列出文件）

## 测试验证

### 1. 后端API测试

```bash
# 测试上传接口
curl -X POST http://your-server:3000/api/materials \
  -F "file=@test.jpg" \
  -F "name=测试图片" \
  -F "tags=测试"

# 测试获取接口
curl http://your-server:3000/api/materials
```

### 2. 前端功能测试

1. 打开前端页面
2. 尝试上传文件
3. 检查浏览器控制台是否有错误
4. 验证文件是否正确显示

## 日志分析

### 查看详细错误信息

```bash
# 1. 查看PM2日志
pm2 logs backend --lines 100

# 2. 查看Nginx错误日志
sudo tail -f /var/log/nginx/error.log

# 3. 查看系统日志
journalctl -u your-app-service -f
```

### 常见错误信息解读

```bash
# 错误1：Endpoint不匹配
"The bucket you are attempting to access must be addressed using the specified endpoint"
# 解决：检查ALI_OSS_REGION配置

# 错误2：认证失败
"InvalidAccessKeyId" 或 "SignatureDoesNotMatch"
# 解决：检查AccessKey ID和Secret

# 错误3：权限不足
"AccessDenied"
# 解决：检查AccessKey权限配置

# 错误4：网络连接问题
"RequestTimeout" 或 "NetworkError"
# 解决：检查网络连接和防火墙设置
```

## 快速修复脚本

创建一个快速检查脚本：

```bash
#!/bin/bash
# oss-check.sh

echo "=== OSS配置检查 ==="

# 检查环境变量
echo "1. 检查环境变量..."
if [ -z "$ALI_OSS_ACCESS_KEY_ID" ]; then
    echo "❌ ALI_OSS_ACCESS_KEY_ID 未设置"
else
    echo "✅ ALI_OSS_ACCESS_KEY_ID: ${ALI_OSS_ACCESS_KEY_ID:0:8}..."
fi

if [ -z "$ALI_OSS_BUCKET" ]; then
    echo "❌ ALI_OSS_BUCKET 未设置"
else
    echo "✅ ALI_OSS_BUCKET: $ALI_OSS_BUCKET"
fi

if [ -z "$ALI_OSS_REGION" ]; then
    echo "❌ ALI_OSS_REGION 未设置"
else
    echo "✅ ALI_OSS_REGION: $ALI_OSS_REGION"
fi

# 检查网络连接
echo "\n2. 检查网络连接..."
ENDPOINT="$ALI_OSS_BUCKET.$ALI_OSS_REGION.aliyuncs.com"
if curl -s --head "https://$ENDPOINT" > /dev/null; then
    echo "✅ 网络连接正常: $ENDPOINT"
else
    echo "❌ 网络连接失败: $ENDPOINT"
fi

echo "\n=== 检查完成 ==="
```

## 联系支持

如果按照以上步骤仍无法解决问题，请提供以下信息：

1. 云服务器操作系统版本
2. Node.js版本
3. 完整的错误日志
4. 当前环境变量配置（隐藏敏感信息）
5. 阿里云OSS控制台截图

---

**注意**：请确保不要在日志或截图中暴露AccessKey等敏感信息。