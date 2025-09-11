/**
 * 环境变量验证工具
 * 用于验证阿里云OSS相关环境变量的配置
 */

// 加载环境变量
require('dotenv').config()

const fs = require('fs')
const path = require('path')
const https = require('https')
const dns = require('dns')
const { promisify } = require('util')

const dnsLookup = promisify(dns.lookup)

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
}

const log = {
  info: (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}[WARNING]${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}[ERROR]${colors.reset} ${msg}`)
}

/**
 * 验证结果类
 */
class ValidationResult {
  constructor() {
    this.passed = 0
    this.failed = 0
    this.warnings = 0
    this.errors = []
    this.warnings_list = []
  }

  addPass() {
    this.passed++
  }

  addFail(message) {
    this.failed++
    this.errors.push(message)
  }

  addWarning(message) {
    this.warnings++
    this.warnings_list.push(message)
  }

  get total() {
    return this.passed + this.failed + this.warnings
  }

  get isValid() {
    return this.failed === 0
  }
}

/**
 * 环境变量验证器
 */
class EnvValidator {
  constructor() {
    this.result = new ValidationResult()
  }

  /**
   * 验证必需的环境变量
   */
  validateRequiredEnvVars() {
    log.info('检查必需的环境变量...')

    const requiredVars = [
      'ALI_OSS_ACCESS_KEY_ID',
      'ALI_OSS_ACCESS_KEY_SECRET',
      'ALI_OSS_BUCKET',
      'ALI_OSS_REGION'
    ]

    const templateValues = [
      'your-production-oss-key-id',
      'your-production-oss-key-secret',
      'your-production-oss-bucket',
      'your_access_key_id',
      'your_access_key_secret',
      'your_bucket_name'
    ]

    for (const varName of requiredVars) {
      const value = process.env[varName]
      
      if (!value) {
        log.error(`${varName} 未设置`)
        this.result.addFail(`${varName} 未设置`)
      } else if (templateValues.includes(value)) {
        log.error(`${varName} 使用了模板值: ${value}`)
        this.result.addFail(`${varName} 使用了模板值`)
      } else {
        // 对敏感信息进行脱敏显示
        const displayValue = varName.includes('SECRET') 
          ? value.substring(0, 8) + '...'
          : value
        log.success(`${varName}: ${displayValue}`)
        this.result.addPass()
      }
    }
  }

  /**
   * 验证OSS Region格式
   */
  validateOssRegion() {
    log.info('验证OSS Region格式...')

    const region = process.env.ALI_OSS_REGION
    if (!region) {
      return // 已在上面检查过
    }

    if (!region.startsWith('oss-cn-')) {
      log.error(`OSS Region格式不正确: ${region}，应该以 'oss-cn-' 开头`)
      this.result.addFail('OSS Region格式不正确')
    } else {
      log.success(`OSS Region格式正确: ${region}`)
      this.result.addPass()
    }
  }

  /**
   * 测试DNS解析
   */
  async testDnsResolution() {
    log.info('测试DNS解析...')

    const bucket = process.env.ALI_OSS_BUCKET
    const region = process.env.ALI_OSS_REGION

    if (!bucket || !region) {
      log.warning('无法测试DNS解析，因为BUCKET或REGION未设置')
      this.result.addWarning('无法测试DNS解析')
      return
    }

    const endpoint = `${bucket}.${region}.aliyuncs.com`

    try {
      await dnsLookup(endpoint)
      log.success(`DNS解析成功: ${endpoint}`)
      this.result.addPass()
    } catch (error) {
      log.error(`DNS解析失败: ${endpoint} - ${error.message}`)
      this.result.addFail('DNS解析失败')
    }
  }

  /**
   * 测试HTTPS连接
   */
  async testHttpsConnection() {
    log.info('测试HTTPS连接...')

    const bucket = process.env.ALI_OSS_BUCKET
    const region = process.env.ALI_OSS_REGION

    if (!bucket || !region) {
      log.warning('无法测试HTTPS连接，因为BUCKET或REGION未设置')
      this.result.addWarning('无法测试HTTPS连接')
      return
    }

    const endpoint = `${bucket}.${region}.aliyuncs.com`
    const url = `https://${endpoint}`

    return new Promise((resolve) => {
      const req = https.request(url, { method: 'HEAD', timeout: 10000 }, (res) => {
        log.success(`HTTPS连接成功: ${url} (状态码: ${res.statusCode})`)
        this.result.addPass()
        resolve()
      })

      req.on('error', (error) => {
        log.warning(`HTTPS连接失败: ${url} - ${error.message}`)
        this.result.addWarning('HTTPS连接失败')
        resolve()
      })

      req.on('timeout', () => {
        log.warning(`HTTPS连接超时: ${url}`)
        this.result.addWarning('HTTPS连接超时')
        req.destroy()
        resolve()
      })

      req.end()
    })
  }

  /**
   * 验证OSS配置完整性
   */
  validateOssConfig() {
    log.info('验证OSS配置完整性...')

    const accessKeyId = process.env.ALI_OSS_ACCESS_KEY_ID
    const accessKeySecret = process.env.ALI_OSS_ACCESS_KEY_SECRET
    const bucket = process.env.ALI_OSS_BUCKET
    const region = process.env.ALI_OSS_REGION

    // 检查AccessKey ID格式
    if (accessKeyId && accessKeyId.length < 16) {
      log.warning('AccessKey ID长度可能不正确，通常应该是24位字符')
      this.result.addWarning('AccessKey ID长度异常')
    }

    // 检查AccessKey Secret格式
    if (accessKeySecret && accessKeySecret.length < 20) {
      log.warning('AccessKey Secret长度可能不正确，通常应该是30位字符')
      this.result.addWarning('AccessKey Secret长度异常')
    }

    // 检查Bucket名称格式
    if (bucket) {
      const bucketRegex = /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/
      if (!bucketRegex.test(bucket)) {
        log.warning('Bucket名称格式可能不正确，应该是3-63位小写字母、数字或连字符')
        this.result.addWarning('Bucket名称格式异常')
      } else {
        log.success('Bucket名称格式正确')
        this.result.addPass()
      }
    }
  }

  /**
   * 检查环境变量文件
   */
  checkEnvFile() {
    log.info('检查环境变量文件...')

    const envFiles = ['.env', '.env.local', '.env.production']
    let foundEnvFile = false

    for (const file of envFiles) {
      if (fs.existsSync(file)) {
        log.success(`找到环境变量文件: ${file}`)
        foundEnvFile = true
        this.result.addPass()

        // 检查文件内容
        const content = fs.readFileSync(file, 'utf8')
        const lines = content.split('\n')
        const ossLines = lines.filter(line => line.includes('ALI_OSS'))
        
        if (ossLines.length > 0) {
          log.success(`${file} 包含 ${ossLines.length} 个OSS配置项`)
        } else {
          log.warning(`${file} 不包含OSS配置`)
          this.result.addWarning(`${file} 缺少OSS配置`)
        }
      }
    }

    if (!foundEnvFile) {
      log.error('未找到任何环境变量文件')
      this.result.addFail('缺少环境变量文件')
    }
  }

  /**
   * 生成修复建议
   */
  generateFixSuggestions() {
    const suggestions = []

    if (this.result.errors.some(e => e.includes('未设置'))) {
      suggestions.push('1. 在 .env 文件中添加缺失的OSS环境变量')
    }

    if (this.result.errors.some(e => e.includes('模板值'))) {
      suggestions.push('2. 将模板值替换为实际的OSS配置信息')
    }

    if (this.result.errors.some(e => e.includes('Region格式'))) {
      suggestions.push('3. 修正OSS Region格式，确保以 "oss-cn-" 开头')
    }

    if (this.result.errors.some(e => e.includes('DNS解析'))) {
      suggestions.push('4. 检查网络连接和DNS设置')
    }

    if (suggestions.length === 0 && this.result.warnings > 0) {
      suggestions.push('1. 检查并解决警告项以确保最佳性能')
    }

    return suggestions
  }

  /**
   * 运行完整验证
   */
  async runFullValidation() {
    console.log('=========================================')
    console.log('     阿里云OSS环境变量验证工具')
    console.log('=========================================')
    console.log('')

    this.checkEnvFile()
    console.log('')

    this.validateRequiredEnvVars()
    console.log('')

    this.validateOssRegion()
    console.log('')

    this.validateOssConfig()
    console.log('')

    await this.testDnsResolution()
    console.log('')

    await this.testHttpsConnection()
    console.log('')

    // 生成报告
    this.generateReport()
    
    // 返回验证结果
    return this.result
  }

  /**
   * 生成验证报告
   */
  generateReport() {
    log.info('生成验证报告...')

    console.log('=========================================')
    console.log('           验证报告')
    console.log('=========================================')
    console.log(`总检查项: ${this.result.total}`)
    console.log(`${colors.green}通过: ${this.result.passed}${colors.reset}`)
    console.log(`${colors.yellow}警告: ${this.result.warnings}${colors.reset}`)
    console.log(`${colors.red}失败: ${this.result.failed}${colors.reset}`)
    console.log('')

    if (this.result.isValid) {
      if (this.result.warnings === 0) {
        log.success('所有验证都通过了！OSS配置应该可以正常工作。')
      } else {
        log.warning('主要配置正确，但有一些警告需要注意。')
      }
    } else {
      log.error(`发现 ${this.result.failed} 个严重问题，需要修复后才能正常使用OSS功能。`)
      
      console.log('')
      console.log('错误详情:')
      this.result.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`)
      })

      if (this.result.warnings_list.length > 0) {
        console.log('')
        console.log('警告详情:')
        this.result.warnings_list.forEach((warning, index) => {
          console.log(`  ${index + 1}. ${warning}`)
        })
      }

      console.log('')
      console.log('修复建议:')
      const suggestions = this.generateFixSuggestions()
      suggestions.forEach(suggestion => {
        console.log(`  ${suggestion}`)
      })
    }

    console.log('')
    console.log('详细排查指南请参考: docs/OSS_TROUBLESHOOTING.md')
    console.log('=========================================')

    return this.result
  }
}

/**
 * 导出验证函数
 */
async function validateOssEnv() {
  const validator = new EnvValidator()
  const result = await validator.runFullValidation()
  return result
}

/**
 * 快速验证函数（仅检查必需项）
 */
function quickValidate() {
  const requiredVars = [
    'ALI_OSS_ACCESS_KEY_ID',
    'ALI_OSS_ACCESS_KEY_SECRET', 
    'ALI_OSS_BUCKET',
    'ALI_OSS_REGION'
  ]

  const missing = requiredVars.filter(varName => !process.env[varName])
  
  if (missing.length > 0) {
    throw new Error(`缺少必需的环境变量: ${missing.join(', ')}`)
  }

  const region = process.env.ALI_OSS_REGION
  if (!region.startsWith('oss-cn-')) {
    throw new Error(`OSS Region格式不正确: ${region}`)
  }

  return true
}

module.exports = {
  validateOssEnv,
  quickValidate,
  EnvValidator
}

// 如果直接运行此文件，执行验证
if (require.main === module) {
  validateOssEnv().then(result => {
    process.exit(result.isValid ? 0 : 1)
  }).catch(error => {
    console.error('验证过程中发生错误:', error.message)
    process.exit(1)
  })
}