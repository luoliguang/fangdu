#!/bin/bash

# OSS配置快速修复脚本
# 用于自动修复常见的阿里云OSS配置问题

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查是否在正确的目录
check_directory() {
    if [ ! -f "package.json" ]; then
        log_error "请在项目根目录下运行此脚本"
        exit 1
    fi
    
    if [ ! -d "backend" ]; then
        log_error "未找到backend目录"
        exit 1
    fi
}

# 备份现有配置
backup_config() {
    log_info "备份现有配置..."
    
    cd backend
    
    if [ -f ".env" ]; then
        BACKUP_FILE=".env.backup.$(date +%Y%m%d_%H%M%S)"
        cp .env "$BACKUP_FILE"
        log_success "配置已备份到: $BACKUP_FILE"
    else
        log_warning "未找到现有的.env文件"
    fi
}

# 交互式收集OSS配置信息
collect_oss_config() {
    log_info "收集阿里云OSS配置信息..."
    
    echo ""
    echo "请提供以下阿里云OSS配置信息："
    echo "(可以在阿里云控制台 -> 对象存储OSS 中找到)"
    echo ""
    
    # AccessKey ID
    while [ -z "$ACCESS_KEY_ID" ]; do
        read -p "AccessKey ID: " ACCESS_KEY_ID
        if [ -z "$ACCESS_KEY_ID" ]; then
            log_error "AccessKey ID不能为空"
        fi
    done
    
    # AccessKey Secret
    while [ -z "$ACCESS_KEY_SECRET" ]; do
        read -s -p "AccessKey Secret: " ACCESS_KEY_SECRET
        echo
        if [ -z "$ACCESS_KEY_SECRET" ]; then
            log_error "AccessKey Secret不能为空"
        fi
    done
    
    # Bucket名称
    while [ -z "$BUCKET_NAME" ]; do
        read -p "Bucket名称: " BUCKET_NAME
        if [ -z "$BUCKET_NAME" ]; then
            log_error "Bucket名称不能为空"
        fi
    done
    
    # Region
    echo ""
    echo "常用Region代码："
    echo "  华东1(杭州): oss-cn-hangzhou"
    echo "  华东2(上海): oss-cn-shanghai"
    echo "  华北1(青岛): oss-cn-qingdao"
    echo "  华北2(北京): oss-cn-beijing"
    echo "  华南1(深圳): oss-cn-shenzhen"
    echo "  华南2(河源): oss-cn-heyuan"
    echo "  华南3(广州): oss-cn-guangzhou"
    echo ""
    
    while [ -z "$REGION" ]; do
        read -p "Region代码 (如: oss-cn-shenzhen): " REGION
        if [ -z "$REGION" ]; then
            log_error "Region不能为空"
        elif [[ ! "$REGION" =~ ^oss-cn- ]]; then
            log_error "Region格式不正确，应该以 'oss-cn-' 开头"
            REGION=""
        fi
    done
}

# 验证配置信息
validate_config() {
    log_info "验证配置信息..."
    
    # 验证AccessKey ID格式
    if [ ${#ACCESS_KEY_ID} -lt 16 ]; then
        log_warning "AccessKey ID长度可能不正确 (当前: ${#ACCESS_KEY_ID} 字符)"
    fi
    
    # 验证AccessKey Secret格式
    if [ ${#ACCESS_KEY_SECRET} -lt 20 ]; then
        log_warning "AccessKey Secret长度可能不正确 (当前: ${#ACCESS_KEY_SECRET} 字符)"
    fi
    
    # 验证Bucket名称格式
    if [[ ! "$BUCKET_NAME" =~ ^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$ ]]; then
        log_warning "Bucket名称格式可能不正确，应该是3-63位小写字母、数字或连字符"
    fi
    
    # 测试网络连接
    ENDPOINT="$BUCKET_NAME.$REGION.aliyuncs.com"
    log_info "测试网络连接到: $ENDPOINT"
    
    if curl -s --head --max-time 10 "https://$ENDPOINT" > /dev/null 2>&1; then
        log_success "网络连接正常"
    else
        log_warning "网络连接测试失败，请检查网络设置和防火墙"
    fi
}

# 更新环境变量文件
update_env_file() {
    log_info "更新环境变量文件..."
    
    # 创建临时文件
    TEMP_ENV=".env.tmp"
    
    # 如果存在现有的.env文件，先复制非OSS配置
    if [ -f ".env" ]; then
        grep -v "^ALI_OSS_" .env > "$TEMP_ENV" || true
    else
        # 创建基础配置
        cat > "$TEMP_ENV" << EOF
# 应用配置
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# 数据库配置（请根据实际情况修改）
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=your_db_username
DB_PASSWORD=your_db_password
DB_DATABASE=fangdu_prod

# JWT配置
JWT_SECRET=your_very_secure_jwt_secret_key
JWT_EXPIRES_IN=24h

# 文件上传配置
MAX_FILE_SIZE=10485760
UPLOAD_DIR=/var/uploads
EOF
    fi
    
    # 添加OSS配置
    cat >> "$TEMP_ENV" << EOF

# 阿里云OSS配置
ALI_OSS_ACCESS_KEY_ID=$ACCESS_KEY_ID
ALI_OSS_ACCESS_KEY_SECRET=$ACCESS_KEY_SECRET
ALI_OSS_BUCKET=$BUCKET_NAME
ALI_OSS_REGION=$REGION
EOF
    
    # 替换原文件
    mv "$TEMP_ENV" ".env"
    
    # 设置安全权限
    chmod 600 .env
    
    log_success "环境变量文件已更新"
}

# 验证更新后的配置
verify_updated_config() {
    log_info "验证更新后的配置..."
    
    # 加载环境变量
    source .env
    
    # 检查环境变量是否正确设置
    if [ "$ALI_OSS_ACCESS_KEY_ID" = "$ACCESS_KEY_ID" ] && \
       [ "$ALI_OSS_ACCESS_KEY_SECRET" = "$ACCESS_KEY_SECRET" ] && \
       [ "$ALI_OSS_BUCKET" = "$BUCKET_NAME" ] && \
       [ "$ALI_OSS_REGION" = "$REGION" ]; then
        log_success "环境变量配置正确"
    else
        log_error "环境变量配置验证失败"
        return 1
    fi
    
    # 运行内置验证工具（如果存在）
    if [ -f "utils/validateEnv.js" ]; then
        log_info "运行详细验证..."
        if node utils/validateEnv.js; then
            log_success "详细验证通过"
        else
            log_warning "详细验证发现一些问题，请查看上面的输出"
        fi
    fi
}

# 重启服务
restart_services() {
    log_info "重启服务..."
    
    # 检查PM2
    if command -v pm2 > /dev/null 2>&1; then
        log_info "使用PM2重启服务..."
        pm2 restart all
        
        # 等待服务启动
        sleep 3
        
        # 检查服务状态
        if pm2 list | grep -q "online"; then
            log_success "PM2服务重启成功"
        else
            log_warning "PM2服务状态异常，请检查日志"
            pm2 logs --lines 20
        fi
    else
        log_warning "未找到PM2，请手动重启您的应用服务"
        echo "如果使用systemd，请运行: sudo systemctl restart your-app-service"
        echo "如果使用Docker，请运行: docker-compose restart backend"
    fi
}

# 测试功能
test_functionality() {
    log_info "测试OSS功能..."
    
    # 等待服务完全启动
    sleep 5
    
    # 测试后端健康检查
    PORT=${PORT:-3000}
    if curl -s "http://localhost:$PORT/health" > /dev/null 2>&1; then
        log_success "后端服务响应正常"
    else
        log_warning "后端服务可能未完全启动，请稍后手动测试"
    fi
    
    echo ""
    echo "您可以通过以下方式测试OSS功能："
    echo "1. 打开前端页面，尝试上传文件"
    echo "2. 使用curl测试API："
    echo "   curl -X POST http://localhost:$PORT/api/materials \\"
    echo "     -F \"file=@test.jpg\" \\"
    echo "     -F \"name=测试图片\" \\"
    echo "     -F \"tags=测试\""
}

# 生成配置报告
generate_report() {
    log_info "生成配置报告..."
    
    REPORT_FILE="oss_config_report_$(date +%Y%m%d_%H%M%S).txt"
    
    cat > "$REPORT_FILE" << EOF
阿里云OSS配置报告
==================

配置时间: $(date)
操作系统: $(uname -a)
Node.js版本: $(node --version 2>/dev/null || echo "未安装")

OSS配置信息:
- AccessKey ID: ${ACCESS_KEY_ID:0:8}...
- Bucket: $BUCKET_NAME
- Region: $REGION
- Endpoint: $BUCKET_NAME.$REGION.aliyuncs.com

配置文件位置: $(pwd)/.env
备份文件: $(ls -t .env.backup.* 2>/dev/null | head -1 || echo "无")

网络测试:
$(curl -I "https://$BUCKET_NAME.$REGION.aliyuncs.com" 2>&1 | head -5)

服务状态:
$(pm2 list 2>/dev/null || echo "PM2未运行")

注意事项:
1. 请确保AccessKey具有足够的OSS权限
2. 定期轮换AccessKey以提高安全性
3. 不要将.env文件提交到版本控制系统
4. 定期备份重要配置文件
EOF
    
    log_success "配置报告已生成: $REPORT_FILE"
}

# 主函数
main() {
    echo "========================================="
    echo "     阿里云OSS配置快速修复工具"
    echo "========================================="
    echo ""
    
    # 检查运行环境
    check_directory
    
    # 备份现有配置
    backup_config
    
    # 收集配置信息
    collect_oss_config
    
    # 验证配置
    validate_config
    
    # 确认更新
    echo ""
    echo "即将使用以下配置更新OSS设置："
    echo "  AccessKey ID: ${ACCESS_KEY_ID:0:8}..."
    echo "  Bucket: $BUCKET_NAME"
    echo "  Region: $REGION"
    echo ""
    read -p "确认更新配置？(y/N): " CONFIRM
    
    if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
        log_info "操作已取消"
        exit 0
    fi
    
    # 更新配置文件
    update_env_file
    
    # 验证更新
    verify_updated_config
    
    # 重启服务
    restart_services
    
    # 测试功能
    test_functionality
    
    # 生成报告
    generate_report
    
    echo ""
    log_success "OSS配置修复完成！"
    echo ""
    echo "后续步骤："
    echo "1. 测试文件上传功能"
    echo "2. 检查应用日志确认无错误"
    echo "3. 如有问题，请参考: docs/OSS_TROUBLESHOOTING.md"
    echo "========================================="
}

# 错误处理
trap 'log_error "脚本执行过程中发生错误，请检查上面的输出"' ERR

# 运行主函数
main "$@"