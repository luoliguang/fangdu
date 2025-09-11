#!/bin/bash

# OSS配置检查脚本
# 用于诊断阿里云OSS连接问题

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

# 检查结果统计
CHECK_PASSED=0
CHECK_FAILED=0
CHECK_WARNING=0

# 添加检查结果
add_result() {
    case $1 in
        "pass")
            ((CHECK_PASSED++))
            ;;
        "fail")
            ((CHECK_FAILED++))
            ;;
        "warn")
            ((CHECK_WARNING++))
            ;;
    esac
}

echo "==========================================="
echo "     阿里云OSS配置检查脚本 v1.0"
echo "==========================================="
echo ""

# 1. 检查环境变量文件
log_info "1. 检查环境变量文件..."

if [ -f ".env" ]; then
    log_success "找到 .env 文件"
    add_result "pass"
    
    # 加载环境变量
    source .env
else
    log_error "未找到 .env 文件"
    add_result "fail"
    echo "请确保在项目根目录下运行此脚本，并且存在 .env 文件"
    exit 1
fi

echo ""

# 2. 检查必需的环境变量
log_info "2. 检查OSS环境变量..."

# 检查 ACCESS_KEY_ID
if [ -z "$ALI_OSS_ACCESS_KEY_ID" ]; then
    log_error "ALI_OSS_ACCESS_KEY_ID 未设置"
    add_result "fail"
elif [ "$ALI_OSS_ACCESS_KEY_ID" = "your-production-oss-key-id" ] || [ "$ALI_OSS_ACCESS_KEY_ID" = "your_access_key_id" ]; then
    log_error "ALI_OSS_ACCESS_KEY_ID 使用了模板值，请设置实际值"
    add_result "fail"
else
    log_success "ALI_OSS_ACCESS_KEY_ID: ${ALI_OSS_ACCESS_KEY_ID:0:8}..."
    add_result "pass"
fi

# 检查 ACCESS_KEY_SECRET
if [ -z "$ALI_OSS_ACCESS_KEY_SECRET" ]; then
    log_error "ALI_OSS_ACCESS_KEY_SECRET 未设置"
    add_result "fail"
elif [ "$ALI_OSS_ACCESS_KEY_SECRET" = "your-production-oss-key-secret" ] || [ "$ALI_OSS_ACCESS_KEY_SECRET" = "your_access_key_secret" ]; then
    log_error "ALI_OSS_ACCESS_KEY_SECRET 使用了模板值，请设置实际值"
    add_result "fail"
else
    log_success "ALI_OSS_ACCESS_KEY_SECRET: ${ALI_OSS_ACCESS_KEY_SECRET:0:8}..."
    add_result "pass"
fi

# 检查 BUCKET
if [ -z "$ALI_OSS_BUCKET" ]; then
    log_error "ALI_OSS_BUCKET 未设置"
    add_result "fail"
elif [ "$ALI_OSS_BUCKET" = "your-production-oss-bucket" ] || [ "$ALI_OSS_BUCKET" = "your_bucket_name" ]; then
    log_error "ALI_OSS_BUCKET 使用了模板值，请设置实际值"
    add_result "fail"
else
    log_success "ALI_OSS_BUCKET: $ALI_OSS_BUCKET"
    add_result "pass"
fi

# 检查 REGION
if [ -z "$ALI_OSS_REGION" ]; then
    log_error "ALI_OSS_REGION 未设置"
    add_result "fail"
elif [[ ! "$ALI_OSS_REGION" =~ ^oss-cn- ]]; then
    log_error "ALI_OSS_REGION 格式不正确，应该以 'oss-cn-' 开头，当前值: $ALI_OSS_REGION"
    add_result "fail"
else
    log_success "ALI_OSS_REGION: $ALI_OSS_REGION"
    add_result "pass"
fi

echo ""

# 3. 检查网络连接
log_info "3. 检查网络连接..."

if [ -n "$ALI_OSS_BUCKET" ] && [ -n "$ALI_OSS_REGION" ]; then
    ENDPOINT="$ALI_OSS_BUCKET.$ALI_OSS_REGION.aliyuncs.com"
    
    log_info "测试连接到: $ENDPOINT"
    
    # 检查DNS解析
    if nslookup "$ENDPOINT" > /dev/null 2>&1; then
        log_success "DNS解析正常"
        add_result "pass"
    else
        log_error "DNS解析失败"
        add_result "fail"
    fi
    
    # 检查HTTP连接
    if curl -s --head --max-time 10 "https://$ENDPOINT" > /dev/null 2>&1; then
        log_success "HTTPS连接正常"
        add_result "pass"
    else
        log_warning "HTTPS连接失败，可能是网络问题或endpoint不正确"
        add_result "warn"
    fi
else
    log_error "无法测试网络连接，因为BUCKET或REGION未正确设置"
    add_result "fail"
fi

echo ""

# 4. 检查Node.js和依赖
log_info "4. 检查运行环境..."

# 检查Node.js版本
if command -v node > /dev/null 2>&1; then
    NODE_VERSION=$(node --version)
    log_success "Node.js版本: $NODE_VERSION"
    add_result "pass"
else
    log_error "未找到Node.js"
    add_result "fail"
fi

# 检查package.json
if [ -f "package.json" ]; then
    log_success "找到 package.json"
    add_result "pass"
else
    log_warning "未找到 package.json"
    add_result "warn"
fi

# 检查node_modules
if [ -d "node_modules" ]; then
    log_success "找到 node_modules 目录"
    add_result "pass"
else
    log_warning "未找到 node_modules 目录，请运行 npm install"
    add_result "warn"
fi

echo ""

# 5. 检查服务状态
log_info "5. 检查服务状态..."

# 检查PM2
if command -v pm2 > /dev/null 2>&1; then
    log_success "找到PM2"
    add_result "pass"
    
    # 检查PM2进程
    if pm2 list | grep -q "online"; then
        log_success "PM2服务正在运行"
        add_result "pass"
    else
        log_warning "PM2服务未运行或无在线进程"
        add_result "warn"
    fi
else
    log_warning "未找到PM2，可能使用其他方式运行服务"
    add_result "warn"
fi

# 检查端口占用
PORT=${PORT:-3000}
if netstat -tlnp 2>/dev/null | grep -q ":$PORT "; then
    log_success "端口 $PORT 正在被使用"
    add_result "pass"
else
    log_warning "端口 $PORT 未被占用，服务可能未启动"
    add_result "warn"
fi

echo ""

# 6. 生成诊断报告
log_info "6. 生成诊断报告..."

TOTAL_CHECKS=$((CHECK_PASSED + CHECK_FAILED + CHECK_WARNING))

echo "==========================================="
echo "           诊断报告"
echo "==========================================="
echo "总检查项: $TOTAL_CHECKS"
echo -e "${GREEN}通过: $CHECK_PASSED${NC}"
echo -e "${YELLOW}警告: $CHECK_WARNING${NC}"
echo -e "${RED}失败: $CHECK_FAILED${NC}"
echo ""

if [ $CHECK_FAILED -eq 0 ]; then
    if [ $CHECK_WARNING -eq 0 ]; then
        log_success "所有检查都通过了！OSS配置应该正常工作。"
    else
        log_warning "主要配置正确，但有一些警告项需要注意。"
    fi
else
    log_error "发现 $CHECK_FAILED 个严重问题，需要修复后才能正常使用OSS功能。"
    echo ""
    echo "建议修复步骤："
    echo "1. 检查并更新 .env 文件中的OSS配置"
    echo "2. 确保使用正确的AccessKey和Region"
    echo "3. 验证网络连接和防火墙设置"
    echo "4. 重启服务并查看日志"
fi

echo ""
echo "详细排查指南请参考: docs/OSS_TROUBLESHOOTING.md"
echo "==========================================="

# 返回适当的退出码
if [ $CHECK_FAILED -gt 0 ]; then
    exit 1
else
    exit 0
fi