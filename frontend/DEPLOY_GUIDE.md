# 🚀 前端部署指南

## 优化配置说明

已对 `vite.config.js` 进行优化，减少构建时内存使用：

### 优化内容
- ✅ 关闭 source map（节省内存和时间）
- ✅ 使用 esbuild 压缩（比 terser 更快更省内存）
- ✅ 手动分割代码块（避免单个chunk过大）
- ✅ 关闭构建体积报告（节省内存）
- ✅ 移除生产环境的 console 和 debugger

### 代码分割策略
- `vue-vendor`: Vue核心库
- `element-plus`: UI组件库
- `markdown-editor`: Markdown编辑器
- `echarts`: 图表库
- `utils`: 工具库（axios等）

## 在服务器上构建

### 方法1：使用优化脚本（推荐）

```bash
# 1. 上传代码到服务器
git pull  # 如果使用git

# 2. 给脚本执行权限
chmod +x build-on-server.sh

# 3. 运行构建脚本
./build-on-server.sh

# 脚本会自动：
# - 检测内存
# - 必要时创建SWAP
# - 限制Node.js内存使用
# - 执行优化构建
# - 显示构建结果
```

### 方法2：手动构建

```bash
# 1. 清理缓存
npm cache clean --force

# 2. 设置内存限制并构建
NODE_OPTIONS="--max-old-space-size=1536" npm run build

# 3. 部署到Nginx
sudo rm -rf /var/www/html/*
sudo cp -r dist/* /var/www/html/
sudo chown -R nginx:nginx /var/www/html/
sudo chmod -R 755 /var/www/html/
sudo systemctl reload nginx
```

### 方法3：分步构建（内存极小的情况）

```bash
# 1. 只构建关键文件
NODE_OPTIONS="--max-old-space-size=1024" npm run build -- --mode production

# 2. 如果还是失败，增加SWAP
sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 3. 再次尝试构建
NODE_OPTIONS="--max-old-space-size=1536" npm run build
```

## 在本地构建后上传（最可靠）

### Windows PowerShell

```powershell
# 1. 在本地构建
cd D:\Data\GitHub\fangdu\frontend
npm run build

# 2. 压缩dist目录
Compress-Archive -Path .\dist\* -DestinationPath dist.zip -Force

# 3. 上传到服务器（替换为你的服务器IP）
scp dist.zip root@你的服务器IP:/tmp/

# 4. SSH到服务器部署
ssh root@你的服务器IP
cd /tmp
unzip -o dist.zip -d dist/
sudo rm -rf /var/www/html/*
sudo cp -r dist/* /var/www/html/
sudo chown -R nginx:nginx /var/www/html/
sudo chmod -R 755 /var/www/html/
sudo systemctl reload nginx
rm -rf dist/ dist.zip
```

### Git Bash / Linux / Mac

```bash
# 1. 在本地构建
cd ~/fangdu/frontend
npm run build

# 2. 打包上传
tar -czf dist.tar.gz dist/
scp dist.tar.gz root@你的服务器IP:/tmp/

# 3. 服务器部署
ssh root@你的服务器IP << 'EOF'
cd /tmp
tar -xzf dist.tar.gz
sudo rm -rf /var/www/html/*
sudo cp -r dist/* /var/www/html/
sudo chown -R nginx:nginx /var/www/html/
sudo chmod -R 755 /var/www/html/
sudo systemctl reload nginx
rm -rf dist/ dist.tar.gz
EOF
```

## 一键部署脚本（Windows）

创建 `deploy.bat`:

```batch
@echo off
echo 开始构建和部署...

REM 构建
call npm run build
if errorlevel 1 (
    echo 构建失败！
    pause
    exit /b 1
)

REM 打包
powershell Compress-Archive -Path .\dist\* -DestinationPath dist.zip -Force

REM 上传并部署（需要先配置SSH密钥）
set SERVER=root@你的服务器IP
scp dist.zip %SERVER%:/tmp/
ssh %SERVER% "cd /tmp && unzip -o dist.zip -d dist/ && sudo rm -rf /var/www/html/* && sudo cp -r dist/* /var/www/html/ && sudo chown -R nginx:nginx /var/www/html/ && sudo systemctl reload nginx && rm -rf dist/ dist.zip"

del dist.zip
echo 部署完成！
pause
```

## 故障排除

### 问题1：构建时被 Killed

**原因**：内存不足

**解决方案**：
```bash
# 添加SWAP空间
sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
free -h  # 验证
```

### 问题2：构建很慢

**解决方案**：
```bash
# 清理缓存
npm cache clean --force
rm -rf node_modules/.cache

# 使用更少的CPU核心
npm run build -- --no-parallel
```

### 问题3：Nginx 403

**解决方案**：
```bash
# 检查文件权限
ls -la /var/www/html/

# 修复权限
sudo chown -R nginx:nginx /var/www/html/
sudo chmod -R 755 /var/www/html/
sudo chmod 644 /var/www/html/index.html

# 检查SELinux（CentOS）
getenforce
sudo setenforce 0  # 临时关闭测试
```

### 问题4：页面空白

**检查**：
```bash
# 查看Nginx错误日志
sudo tail -f /var/log/nginx/error.log

# 检查index.html是否存在
ls -l /var/www/html/index.html

# 检查浏览器控制台是否有错误
```

## 性能优化建议

### 1. 启用Nginx Gzip压缩

编辑 `/etc/nginx/nginx.conf`:

```nginx
http {
    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript 
               application/json application/javascript application/xml+rss 
               application/rss+xml font/truetype font/opentype 
               application/vnd.ms-fontobject image/svg+xml;
    gzip_min_length 1000;
}
```

### 2. 设置静态资源缓存

```nginx
server {
    location ~* \.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 3. 启用HTTP/2

```nginx
server {
    listen 443 ssl http2;
    # ... 其他SSL配置
}
```

## 常用命令

```bash
# 查看构建文件大小
du -sh dist/

# 查看详细文件列表
ls -lh dist/

# 测试Nginx配置
sudo nginx -t

# 重启Nginx
sudo systemctl restart nginx

# 查看Nginx状态
sudo systemctl status nginx

# 实时查看访问日志
sudo tail -f /var/log/nginx/access.log

# 查看服务器内存
free -h

# 查看磁盘空间
df -h
```

## 推荐的CI/CD流程

1. 代码推送到Git仓库
2. GitHub Actions / GitLab CI 自动构建
3. 构建产物上传到服务器或CDN
4. 服务器拉取最新构建文件
5. 重启Nginx服务

这样可以避免在小内存服务器上构建，确保部署稳定可靠。 