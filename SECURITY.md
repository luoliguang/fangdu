# 安全配置指南

## 🔒 敏感信息保护

本项目已经配置了完善的安全措施来保护敏感信息，确保您的账号密码和密钥不会泄露到GitHub。

### 已保护的敏感信息

1. **环境变量文件** (`.env`)
   - 数据库密码
   - JWT密钥
   - 访问令牌
   - 阿里云OSS密钥
   - 管理员账号密码

2. **数据库文件** (`*.db`, `*.sqlite`)
3. **上传文件目录** (`uploads/`)
4. **日志文件** (`*.log`)

### .gitignore 配置

项目已配置了完善的 `.gitignore` 文件，以下文件和目录不会被上传到GitHub：

```
# 环境变量文件
.env
.env.local
.env.*.local

# 数据库文件
*.db
*.sqlite
*.sqlite3
database/

# 上传文件
uploads/

# 日志文件
logs/
*.log
```

## 🚀 安全部署步骤

### 1. 检查敏感文件状态

在上传到GitHub之前，请确认以下命令的输出：

```bash
# 检查哪些文件会被上传
git status

# 检查 .env 文件是否被忽略
git check-ignore backend/.env
# 应该输出：backend/.env
```

### 2. 配置生产环境

在服务器上部署时：

```bash
# 1. 复制环境变量模板
cp backend/env.example backend/.env

# 2. 编辑环境变量文件
nano backend/.env
```

### 3. 必须修改的安全配置

在生产环境中，请务必修改以下配置：

```bash
# JWT密钥 - 使用强随机字符串
JWT_SECRET=your-very-secure-random-string-here

# 访问令牌 - 使用复杂密码
SECRET_TOKEN=your-super-complex-secret-token

# 管理员密码 - 使用强密码
ADMIN_PASSWORD=your-strong-admin-password
USER_PASSWORD=your-strong-user-password

# 阿里云OSS配置 - 使用真实的密钥
ALI_OSS_ACCESS_KEY_ID=your-real-access-key-id
ALI_OSS_ACCESS_KEY_SECRET=your-real-access-key-secret
```

## 🛡️ 安全最佳实践

### 1. 密码强度要求
- 至少12位字符
- 包含大小写字母、数字和特殊字符
- 不使用常见密码或个人信息

### 2. 定期更新密钥
- JWT密钥建议每3-6个月更换
- 访问令牌建议每月更换
- 发现安全问题时立即更换所有密钥

### 3. 环境隔离
- 开发环境和生产环境使用不同的密钥
- 测试环境不使用生产数据
- 不在代码中硬编码任何敏感信息

### 4. 访问控制
- 限制服务器SSH访问
- 使用防火墙限制端口访问
- 定期审查访问日志

## ⚠️ 紧急情况处理

如果意外泄露了敏感信息：

1. **立即更换所有相关密钥**
2. **检查Git历史记录**：
   ```bash
   # 搜索历史记录中的敏感信息
   git log --all --full-history -- backend/.env
   ```
3. **如果敏感信息已提交到Git**：
   ```bash
   # 从历史记录中完全删除文件
   git filter-branch --force --index-filter 'git rm --cached --ignore-unmatch backend/.env' --prune-empty --tag-name-filter cat -- --all
   ```
4. **强制推送更新**：
   ```bash
   git push origin --force --all
   ```

## 📞 支持

如果您在安全配置方面有任何疑问，请查看项目文档或联系开发团队。

---

**记住：安全是一个持续的过程，不是一次性的配置！**