#!/bin/bash

# SQLite数据库备份脚本
# 用于定期备份数据库文件

# 配置变量
DB_PATH="/path/to/your/project/backend/database/my_materials.db"
BACKUP_DIR="/path/to/backup/directory"
MAX_BACKUPS=7  # 保留最近7个备份

# 创建备份目录
mkdir -p "$BACKUP_DIR"

# 生成备份文件名（包含时间戳）
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/my_materials_backup_$TIMESTAMP.db"

echo "🔄 开始备份数据库..."
echo "源文件: $DB_PATH"
echo "备份文件: $BACKUP_FILE"

# 检查源数据库文件是否存在
if [ ! -f "$DB_PATH" ]; then
    echo "❌ 错误：数据库文件不存在: $DB_PATH"
    exit 1
fi

# 执行备份
cp "$DB_PATH" "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "✅ 数据库备份成功"
    echo "备份大小: $(du -h "$BACKUP_FILE" | cut -f1)"
else
    echo "❌ 数据库备份失败"
    exit 1
fi

# 清理旧备份（保留最近的N个备份）
echo "🧹 清理旧备份文件..."
cd "$BACKUP_DIR"
ls -t my_materials_backup_*.db | tail -n +$((MAX_BACKUPS + 1)) | xargs -r rm
echo "保留最近 $MAX_BACKUPS 个备份文件"

# 显示当前所有备份
echo ""
echo "📁 当前备份文件列表:"
ls -lah "$BACKUP_DIR"/my_materials_backup_*.db 2>/dev/null || echo "没有找到备份文件"

echo ""
echo "🎉 备份任务完成！"