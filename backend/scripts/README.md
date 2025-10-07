# 脚本说明

## 📂 当前脚本

### 1. `init-drawer-config.js`
- **用途**: 初始化侧边抽屉配置数据
- **运行**: `node backend/scripts/init-drawer-config.js`
- **何时使用**: 首次部署或重置抽屉配置时

### 2. `migrate-add-online-sessions.js`
- **用途**: 数据库迁移 - 添加在线会话表和 session_id 字段
- **运行**: `node backend/scripts/migrate-add-online-sessions.js`
- **何时使用**: 
  - 自动：运行 `./deploy.sh` 或 `.\deploy.ps1` 时自动执行
  - 手动：升级时运行此脚本添加新表

---

## 🗑️ 已清理的脚本

以下脚本已被删除（功能已整合到部署脚本或其他地方）：

- ❌ `migrate-add-session-id.js` - 功能已整合到 `migrate-add-online-sessions.js`
- ❌ `quick-fix-database.js` - 临时修复脚本，已不需要

---

## 📝 脚本管理原则

1. **最小化原则**: 只保留必要的脚本
2. **整合原则**: 相关功能整合到一个脚本中
3. **自动化原则**: 优先使用部署脚本自动执行
4. **文档化原则**: 每个脚本都有清晰的说明

---

## 🚀 常用命令

```bash
# 数据库迁移（推荐）
./deploy.sh          # Linux/macOS
.\deploy.ps1         # Windows

# 手动运行迁移
cd backend
node scripts/migrate-add-online-sessions.js

# 初始化抽屉配置
node scripts/init-drawer-config.js
```

