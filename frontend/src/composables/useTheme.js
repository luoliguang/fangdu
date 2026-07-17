import { ref } from 'vue'

const isDark = ref(true)

function applyTheme() {
  document.body.classList.toggle('theme-light', !isDark.value)
}

// 初始化：读取本地存储
const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('fangdu-theme') : null
if (saved === 'light') {
  isDark.value = false
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
