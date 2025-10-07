# 🔍 部署验证指南

## 最快速的验证方法（推荐）⭐

### 方法 1：浏览器 Network 检查（最直观）

1. **打开您的网站**
   - 访问：`http://your-domain.com` 或 `http://your-server-ip`

2. **打开开发者工具**
   - 按 `F12` 键
   - 或右键 → 检查

3. **切换到 Network 标签**
   - 点击顶部的 "Network" (网络) 标签
   - 勾选 "Preserve log" (保留日志)

4. **刷新页面**
   - 按 `F5` 或 `Ctrl+R`

5. **查找心跳请求**
   - 在筛选框输入 `heartbeat`
   - 应该看到：
     - ✅ `POST /api/v1/visits/heartbeat` 请求
     - ✅ 每 30 秒自动发送一次
     - ✅ 状态码：200 OK
     - ✅ 响应：`{"success":true,"message":"心跳更新成功"}`

6. **查找访问记录请求**
   - 在筛选框输入 `record`
   - 应该看到：
     - ✅ `POST /api/v1/visits/record` 请求
     - ✅ 切换页面时发送
     - ✅ 状态码：200 OK

7. **测试离线通知**
   - 关闭浏览器标签页
   - 应该看到：
     - ✅ `POST /api/v1/visits/offline` 请求（可能很快，需要仔细看）

**结果判断：**
- ✅ 如果看到这些请求 → **部署成功！新功能正常工作！**
- ❌ 如果没有看到 → 继续查看下面的故障排除

---

### 方法 2：管理后台统计（验证功能）

1. **登录管理后台**
   - 访问：`http://your-domain.com/admin`
   - 输入管理员账号密码

2. **进入统计页面**
   - 点击左侧菜单 "统计分析"

3. **查看在线人数**
   - 找到 "当前在线" 指标
   - 记下数字（例如：1）

4. **测试多浏览器**
   - 用另一个浏览器打开网站（例如 Chrome → Edge）
   - 刷新管理后台统计页面
   - 在线人数应该增加（例如：1 → 2）

5. **测试浏览器关闭**
   - 关闭新打开的浏览器
   - 等待 1-2 分钟
   - 刷新管理后台统计页面
   - 在线人数应该减少（例如：2 → 1）

**结果判断：**
- ✅ 在线人数随浏览器开关变化 → **新功能工作正常！**
- ❌ 在线人数不变或不准确 → 继续查看故障排除

---

## 服务器端验证

### 方法 3：检查代码版本

```bash
# SSH 登录服务器
ssh user@your-server

# 进入项目目录
cd /path/to/fangdu

# 查看最新提交
git log -1 --oneline
```

**应该显示：**
```
bd24fb7 feat: 优化在线统计系统并清理项目 (v1.5.2)
```

如果不是这个版本：
```bash
# 拉取最新代码
git pull origin main

# 运行部署脚本
./deploy.sh
```

---

### 方法 4：检查数据库表

```bash
# 进入数据库目录
cd backend/database

# 查看所有表
sqlite3 my_materials.db "SELECT name FROM sqlite_master WHERE type='table';"
```

**应该看到：**
```
materials
feedbacks
visits
online_sessions  ← 这是新表！
```

如果没有 `online_sessions` 表：
```bash
# 运行数据库迁移
cd /path/to/fangdu
node backend/scripts/migrate-add-online-sessions.js
```

---

### 方法 5：测试心跳 API

```bash
# 测试心跳接口
curl -X POST http://localhost:3002/api/v1/visits/heartbeat \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "test123"}'
```

**应该返回：**
```json
{"success":true,"message":"心跳更新成功"}
```

---

### 方法 6：查看在线会话

```bash
# 查看当前在线会话
cd /path/to/fangdu/backend/database
sqlite3 my_materials.db "SELECT session_id, datetime(last_heartbeat, 'localtime') as last_beat FROM online_sessions ORDER BY last_heartbeat DESC LIMIT 5;"
```

**应该看到：**
```
session_1728123456789_abc|2024-10-08 18:30:45
session_1728123456790_def|2024-10-08 18:30:15
```

---

## 自动化检查脚本

### Windows (PowerShell)

```powershell
# 运行检查脚本
.\check-deployment.ps1
```

### Linux/macOS

```bash
# 添加执行权限
chmod +x check-deployment.sh

# 运行检查脚本
./check-deployment.sh
```

脚本会自动检查：
- ✅ Git 版本
- ✅ 数据库表结构
- ✅ 服务运行状态
- ✅ API 接口
- ✅ 前端代码

---

## 故障排除

### 问题 1：浏览器没有看到 heartbeat 请求

**可能原因：**
- 前端代码未更新
- 浏览器缓存了旧代码

**解决方法：**
```bash
# 服务器上
cd /path/to/fangdu
git pull origin main
./deploy.sh

# 浏览器中
按 Ctrl+Shift+Delete 清除缓存
或按 Ctrl+F5 强制刷新
```

---

### 问题 2：API 返回 404 或 500 错误

**可能原因：**
- 后端代码未更新
- 服务未重启

**解决方法：**
```bash
# 服务器上
cd /path/to/fangdu
git pull origin main

# 重启服务
pm2 restart fangdu-backend

# 或者
./deploy.sh
```

---

### 问题 3：在线人数始终是 0

**可能原因：**
- `online_sessions` 表不存在
- 心跳机制未启动

**解决方法：**
```bash
# 1. 检查数据库表
cd /path/to/fangdu/backend/database
sqlite3 my_materials.db "SELECT name FROM sqlite_master WHERE type='table' AND name='online_sessions';"

# 2. 如果没有，运行迁移
cd /path/to/fangdu
node backend/scripts/migrate-add-online-sessions.js

# 3. 重启服务
pm2 restart fangdu-backend
```

---

### 问题 4：在线人数不准确

**可能原因：**
- 浏览器缓存
- 心跳未正常发送

**解决方法：**
1. 清除浏览器缓存
2. 打开 F12 → Network，确认 heartbeat 请求每 30 秒发送一次
3. 查看服务器日志：`pm2 logs fangdu-backend`

---

## 验证清单

部署后请依次确认：

- [ ] 代码版本是 v1.5.2（bd24fb7）
- [ ] 数据库中有 `online_sessions` 表
- [ ] 后端服务正在运行
- [ ] 浏览器 Network 中可以看到 heartbeat 请求
- [ ] 管理后台显示正确的在线人数
- [ ] 多个浏览器打开时，在线人数增加
- [ ] 关闭浏览器后 1-2 分钟，在线人数减少

---

## 快速命令参考

```bash
# 更新代码
git pull origin main

# 一键部署
./deploy.sh

# 数据库迁移
node backend/scripts/migrate-add-online-sessions.js

# 重启服务
pm2 restart fangdu-backend

# 查看日志
pm2 logs fangdu-backend

# 查看在线会话
sqlite3 backend/database/my_materials.db "SELECT COUNT(*) FROM online_sessions WHERE last_heartbeat >= datetime('now', '-1 minute');"

# 测试 API
curl http://localhost:3002/api/v1/visits/online
```

---

**有任何问题，请检查：**
1. 浏览器 F12 → Network 标签
2. PM2 日志：`pm2 logs fangdu-backend`
3. 数据库表：`sqlite3 backend/database/my_materials.db ".tables"`

