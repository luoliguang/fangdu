# OSS配置检查脚本 (PowerShell版本)
# 用于诊断阿里云OSS连接问题

param(
    [string]$EnvFile = ".env"
)

# 颜色定义
$Colors = @{
    Red = 'Red'
    Green = 'Green'
    Yellow = 'Yellow'
    Blue = 'Blue'
    White = 'White'
}

# 日志函数
function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor $Colors.Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor $Colors.Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor $Colors.Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor $Colors.Red
}

# 检查结果统计
$Script:CheckPassed = 0
$Script:CheckFailed = 0
$Script:CheckWarning = 0

# 添加检查结果
function Add-Result {
    param([string]$Result)
    switch ($Result) {
        "pass" { $Script:CheckPassed++ }
        "fail" { $Script:CheckFailed++ }
        "warn" { $Script:CheckWarning++ }
    }
}

# 读取环境变量文件
function Read-EnvFile {
    param([string]$FilePath)
    
    $envVars = @{}
    
    if (Test-Path $FilePath) {
        Get-Content $FilePath | ForEach-Object {
            if ($_ -match '^([^#][^=]+)=(.*)$') {
                $key = $matches[1].Trim()
                $value = $matches[2].Trim()
                # 移除引号
                $value = $value -replace '^["'']|["'']$', ''
                $envVars[$key] = $value
                # 设置环境变量
                [Environment]::SetEnvironmentVariable($key, $value, "Process")
            }
        }
    }
    
    return $envVars
}

# 测试网络连接
function Test-NetworkConnection {
    param([string]$Url)
    
    try {
        $response = Invoke-WebRequest -Uri $Url -Method Head -TimeoutSec 10 -ErrorAction Stop
        return $true
    }
    catch {
        return $false
    }
}

# 测试DNS解析
function Test-DnsResolution {
    param([string]$Hostname)
    
    try {
        $result = Resolve-DnsName -Name $Hostname -ErrorAction Stop
        return $true
    }
    catch {
        return $false
    }
}

Write-Host "=========================================" -ForegroundColor $Colors.Blue
Write-Host "     阿里云OSS配置检查脚本 v1.0" -ForegroundColor $Colors.Blue
Write-Host "=========================================" -ForegroundColor $Colors.Blue
Write-Host ""

# 1. 检查环境变量文件
Write-Info "1. 检查环境变量文件..."

if (Test-Path $EnvFile) {
    Write-Success "找到 $EnvFile 文件"
    Add-Result "pass"
    
    # 读取环境变量
    $envVars = Read-EnvFile $EnvFile
else {
    Write-Error "未找到 $EnvFile 文件"
    Add-Result "fail"
    Write-Host "请确保在项目根目录下运行此脚本，并且存在 $EnvFile 文件"
    exit 1
}

Write-Host ""

# 2. 检查必需的环境变量
Write-Info "2. 检查OSS环境变量..."

# 检查 ACCESS_KEY_ID
$accessKeyId = $env:ALI_OSS_ACCESS_KEY_ID
if ([string]::IsNullOrEmpty($accessKeyId)) {
    Write-Error "ALI_OSS_ACCESS_KEY_ID 未设置"
    Add-Result "fail"
}
elseif ($accessKeyId -eq "your-production-oss-key-id" -or $accessKeyId -eq "your_access_key_id") {
    Write-Error "ALI_OSS_ACCESS_KEY_ID 使用了模板值，请设置实际值"
    Add-Result "fail"
}
else {
    $maskedKey = $accessKeyId.Substring(0, [Math]::Min(8, $accessKeyId.Length)) + "..."
    Write-Success "ALI_OSS_ACCESS_KEY_ID: $maskedKey"
    Add-Result "pass"
}

# 检查 ACCESS_KEY_SECRET
$accessKeySecret = $env:ALI_OSS_ACCESS_KEY_SECRET
if ([string]::IsNullOrEmpty($accessKeySecret)) {
    Write-Error "ALI_OSS_ACCESS_KEY_SECRET 未设置"
    Add-Result "fail"
}
elseif ($accessKeySecret -eq "your-production-oss-key-secret" -or $accessKeySecret -eq "your_access_key_secret") {
    Write-Error "ALI_OSS_ACCESS_KEY_SECRET 使用了模板值，请设置实际值"
    Add-Result "fail"
}
else {
    $maskedSecret = $accessKeySecret.Substring(0, [Math]::Min(8, $accessKeySecret.Length)) + "..."
    Write-Success "ALI_OSS_ACCESS_KEY_SECRET: $maskedSecret"
    Add-Result "pass"
}

# 检查 BUCKET
$bucket = $env:ALI_OSS_BUCKET
if ([string]::IsNullOrEmpty($bucket)) {
    Write-Error "ALI_OSS_BUCKET 未设置"
    Add-Result "fail"
}
elseif ($bucket -eq "your-production-oss-bucket" -or $bucket -eq "your_bucket_name") {
    Write-Error "ALI_OSS_BUCKET 使用了模板值，请设置实际值"
    Add-Result "fail"
}
else {
    Write-Success "ALI_OSS_BUCKET: $bucket"
    Add-Result "pass"
}

# 检查 REGION
$region = $env:ALI_OSS_REGION
if ([string]::IsNullOrEmpty($region)) {
    Write-Error "ALI_OSS_REGION 未设置"
    Add-Result "fail"
}
elseif (-not $region.StartsWith("oss-cn-")) {
    Write-Error "ALI_OSS_REGION 格式不正确，应该以 'oss-cn-' 开头，当前值: $region"
    Add-Result "fail"
}
else {
    Write-Success "ALI_OSS_REGION: $region"
    Add-Result "pass"
}

Write-Host ""

# 3. 检查网络连接
Write-Info "3. 检查网络连接..."

if (-not [string]::IsNullOrEmpty($bucket) -and -not [string]::IsNullOrEmpty($region)) {
    $endpoint = "$bucket.$region.aliyuncs.com"
    
    Write-Info "测试连接到: $endpoint"
    
    # 检查DNS解析
    if (Test-DnsResolution $endpoint) {
        Write-Success "DNS解析正常"
        Add-Result "pass"
    }
    else {
        Write-Error "DNS解析失败"
        Add-Result "fail"
    }
    
    # 检查HTTPS连接
    if (Test-NetworkConnection "https://$endpoint") {
        Write-Success "HTTPS连接正常"
        Add-Result "pass"
    }
    else {
        Write-Warning "HTTPS连接失败，可能是网络问题或endpoint不正确"
        Add-Result "warn"
    }
}
else {
    Write-Error "无法测试网络连接，因为BUCKET或REGION未正确设置"
    Add-Result "fail"
}

Write-Host ""

# 4. 检查运行环境
Write-Info "4. 检查运行环境..."

# 检查Node.js版本
try {
    $nodeVersion = node --version 2>$null
    if ($nodeVersion) {
        Write-Success "Node.js版本: $nodeVersion"
        Add-Result "pass"
    }
    else {
        Write-Error "未找到Node.js"
        Add-Result "fail"
    }
}
catch {
    Write-Error "未找到Node.js"
    Add-Result "fail"
}

# 检查package.json
if (Test-Path "package.json") {
    Write-Success "找到 package.json"
    Add-Result "pass"
}
else {
    Write-Warning "未找到 package.json"
    Add-Result "warn"
}

# 检查node_modules
if (Test-Path "node_modules") {
    Write-Success "找到 node_modules 目录"
    Add-Result "pass"
}
else {
    Write-Warning "未找到 node_modules 目录，请运行 npm install"
    Add-Result "warn"
}

Write-Host ""

# 5. 检查服务状态
Write-Info "5. 检查服务状态..."

# 检查PM2
try {
    $pm2Version = pm2 --version 2>$null
    if ($pm2Version) {
        Write-Success "找到PM2"
        Add-Result "pass"
        
        # 检查PM2进程
        $pm2List = pm2 list 2>$null
        if ($pm2List -match "online") {
            Write-Success "PM2服务正在运行"
            Add-Result "pass"
        }
        else {
            Write-Warning "PM2服务未运行或无在线进程"
            Add-Result "warn"
        }
    }
    else {
        Write-Warning "未找到PM2，可能使用其他方式运行服务"
        Add-Result "warn"
    }
}
catch {
    Write-Warning "未找到PM2，可能使用其他方式运行服务"
    Add-Result "warn"
}

# 检查端口占用
$port = if ($env:PORT) { $env:PORT } else { "3000" }
$portInUse = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
if ($portInUse) {
    Write-Success "端口 $port 正在被使用"
    Add-Result "pass"
}
else {
    Write-Warning "端口 $port 未被占用，服务可能未启动"
    Add-Result "warn"
}

Write-Host ""

# 6. 生成诊断报告
Write-Info "6. 生成诊断报告..."

$totalChecks = $Script:CheckPassed + $Script:CheckFailed + $Script:CheckWarning

Write-Host "=========================================" -ForegroundColor $Colors.Blue
Write-Host "           诊断报告" -ForegroundColor $Colors.Blue
Write-Host "=========================================" -ForegroundColor $Colors.Blue
Write-Host "总检查项: $totalChecks"
Write-Host "通过: $Script:CheckPassed" -ForegroundColor $Colors.Green
Write-Host "警告: $Script:CheckWarning" -ForegroundColor $Colors.Yellow
Write-Host "失败: $Script:CheckFailed" -ForegroundColor $Colors.Red
Write-Host ""

if ($Script:CheckFailed -eq 0) {
    if ($Script:CheckWarning -eq 0) {
        Write-Success "所有检查都通过了！OSS配置应该正常工作。"
    }
    else {
        Write-Warning "主要配置正确，但有一些警告项需要注意。"
    }
}
else {
    Write-Error "发现 $Script:CheckFailed 个严重问题，需要修复后才能正常使用OSS功能。"
    Write-Host ""
    Write-Host "建议修复步骤："
    Write-Host "1. 检查并更新 .env 文件中的OSS配置"
    Write-Host "2. 确保使用正确的AccessKey和Region"
    Write-Host "3. 验证网络连接和防火墙设置"
    Write-Host "4. 重启服务并查看日志"
}

Write-Host ""
Write-Host "详细排查指南请参考: docs/OSS_TROUBLESHOOTING.md"
Write-Host "=========================================" -ForegroundColor $Colors.Blue

# 返回适当的退出码
if ($Script:CheckFailed -gt 0) {
    exit 1
}
else {
    exit 0
}