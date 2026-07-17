import { ref } from 'vue'

// 检测是否为低配设备：
// 1. 系统开启了「减少动效」(无障碍 / 省电模式)
// 2. 逻辑核心数 ≤ 2
// 3. 内存 < 2 GB（仅 Chrome/Edge 支持，其他浏览器忽略）
function isLowEndDevice() {
  if (typeof window === 'undefined') return false
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true
  if ((navigator.hardwareConcurrency || 4) <= 2) return true
  if (navigator.deviceMemory !== undefined && navigator.deviceMemory < 2) return true
  return false
}

const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('fangdu-theme') : null

// 优先级：手动保存的偏好 > 设备性能检测 > 默认暗色
let initialDark = true
if (saved === 'light') {
  initialDark = false
} else if (saved === 'dark') {
  initialDark = true
} else {
  // 首次访问，无历史偏好 → 按设备性能决定
  initialDark = !isLowEndDevice()
}

const isDark = ref(initialDark)

function applyTheme() {
  document.body.classList.toggle('theme-light', !isDark.value)
}

export function useTheme() {
  function toggleTheme() {
    isDark.value = !isDark.value
    localStorage.setItem('fangdu-theme', isDark.value ? 'dark' : 'light')
    applyTheme()
  }

  function initTheme() {
    applyTheme()
  }

  return { isDark, toggleTheme, initTheme }
}
