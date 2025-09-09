import { ref, reactive, computed, watch } from 'vue'

/**
 * 表单管理组合式函数
 * @param {Object} initialValues - 初始表单值
 * @param {Object} validationRules - 验证规则
 * @param {Object} options - 配置选项
 * @returns {Object} 表单相关的响应式数据和方法
 */
export function useForm(initialValues = {}, validationRules = {}, options = {}) {
  const {
    validateOnChange = true,
    validateOnBlur = true,
    resetOnSubmit = false
  } = options

  // 表单数据
  const formData = reactive({ ...initialValues })
  
  // 错误状态
  const errors = reactive({})
  
  // 触摸状态（字段是否被访问过）
  const touched = reactive({})
  
  // 提交状态
  const isSubmitting = ref(false)
  const isSubmitted = ref(false)

  // 计算属性
  const isValid = computed(() => {
    return Object.keys(errors).length === 0
  })

  const isDirty = computed(() => {
    return JSON.stringify(formData) !== JSON.stringify(initialValues)
  })

  const hasErrors = computed(() => {
    return Object.keys(errors).length > 0
  })

  // 验证单个字段
  const validateField = (fieldName) => {
    const value = formData[fieldName]
    const rules = validationRules[fieldName]
    
    if (!rules) {
      delete errors[fieldName]
      return true
    }

    // 清除之前的错误
    delete errors[fieldName]

    // 执行验证规则
    for (const rule of rules) {
      const result = rule(value, formData)
      if (result !== true) {
        errors[fieldName] = result
        return false
      }
    }

    return true
  }

  // 验证所有字段
  const validateForm = () => {
    let isFormValid = true
    
    Object.keys(validationRules).forEach(fieldName => {
      const fieldValid = validateField(fieldName)
      if (!fieldValid) {
        isFormValid = false
      }
    })

    return isFormValid
  }

  // 设置字段值
  const setFieldValue = (fieldName, value) => {
    formData[fieldName] = value
    
    if (validateOnChange && touched[fieldName]) {
      validateField(fieldName)
    }
  }

  // 设置字段错误
  const setFieldError = (fieldName, error) => {
    if (error) {
      errors[fieldName] = error
    } else {
      delete errors[fieldName]
    }
  }

  // 设置字段触摸状态
  const setFieldTouched = (fieldName, isTouched = true) => {
    touched[fieldName] = isTouched
    
    if (validateOnBlur && isTouched) {
      validateField(fieldName)
    }
  }

  // 重置表单
  const resetForm = (newValues = initialValues) => {
    Object.keys(formData).forEach(key => {
      delete formData[key]
    })
    Object.assign(formData, newValues)
    
    Object.keys(errors).forEach(key => {
      delete errors[key]
    })
    
    Object.keys(touched).forEach(key => {
      delete touched[key]
    })
    
    isSubmitting.value = false
    isSubmitted.value = false
  }

  // 重置字段
  const resetField = (fieldName) => {
    formData[fieldName] = initialValues[fieldName]
    delete errors[fieldName]
    delete touched[fieldName]
  }

  // 提交表单
  const handleSubmit = async (onSubmit) => {
    isSubmitted.value = true
    
    // 标记所有字段为已触摸
    Object.keys(validationRules).forEach(fieldName => {
      touched[fieldName] = true
    })
    
    // 验证表单
    const isFormValid = validateForm()
    
    if (!isFormValid) {
      return { success: false, errors }
    }

    try {
      isSubmitting.value = true
      const result = await onSubmit(formData)
      
      if (resetOnSubmit) {
        resetForm()
      }
      
      return { success: true, data: result }
    } catch (error) {
      return { success: false, error }
    } finally {
      isSubmitting.value = false
    }
  }

  // 获取字段属性（用于绑定到输入组件）
  const getFieldProps = (fieldName) => {
    return {
      value: formData[fieldName],
      error: errors[fieldName],
      touched: touched[fieldName],
      onChange: (value) => setFieldValue(fieldName, value),
      onBlur: () => setFieldTouched(fieldName, true)
    }
  }

  // 监听表单数据变化
  if (validateOnChange) {
    watch(
      () => formData,
      () => {
        Object.keys(touched).forEach(fieldName => {
          if (touched[fieldName]) {
            validateField(fieldName)
          }
        })
      },
      { deep: true }
    )
  }

  return {
    // 响应式状态
    formData,
    errors,
    touched,
    isSubmitting,
    isSubmitted,
    
    // 计算属性
    isValid,
    isDirty,
    hasErrors,
    
    // 方法
    validateField,
    validateForm,
    setFieldValue,
    setFieldError,
    setFieldTouched,
    resetForm,
    resetField,
    handleSubmit,
    getFieldProps
  }
}

/**
 * 常用验证规则
 */
export const validationRules = {
  // 必填
  required: (message = '此字段为必填项') => {
    return (value) => {
      if (value === null || value === undefined || value === '') {
        return message
      }
      return true
    }
  },

  // 最小长度
  minLength: (min, message) => {
    return (value) => {
      if (value && value.length < min) {
        return message || `最少需要${min}个字符`
      }
      return true
    }
  },

  // 最大长度
  maxLength: (max, message) => {
    return (value) => {
      if (value && value.length > max) {
        return message || `最多允许${max}个字符`
      }
      return true
    }
  },

  // 邮箱格式
  email: (message = '请输入有效的邮箱地址') => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return (value) => {
      if (value && !emailRegex.test(value)) {
        return message
      }
      return true
    }
  },

  // 数字
  number: (message = '请输入有效的数字') => {
    return (value) => {
      if (value && isNaN(Number(value))) {
        return message
      }
      return true
    }
  },

  // 最小值
  min: (minValue, message) => {
    return (value) => {
      if (value && Number(value) < minValue) {
        return message || `值不能小于${minValue}`
      }
      return true
    }
  },

  // 最大值
  max: (maxValue, message) => {
    return (value) => {
      if (value && Number(value) > maxValue) {
        return message || `值不能大于${maxValue}`
      }
      return true
    }
  },

  // 正则表达式
  pattern: (regex, message = '格式不正确') => {
    return (value) => {
      if (value && !regex.test(value)) {
        return message
      }
      return true
    }
  },

  // 自定义验证
  custom: (validator, message = '验证失败') => {
    return (value, formData) => {
      try {
        const result = validator(value, formData)
        return result === true ? true : (result || message)
      } catch (error) {
        return message
      }
    }
  }
}