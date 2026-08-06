import { ref } from 'vue'

const isDark = ref(false)

function applyTheme() {
  document.body.classList.toggle('theme-light', !isDark.value)
}

// 用户显式偏好 > 服务端下发的默认值 > 亮色兜底
function resolveInitialTheme() {
  const userPref = localStorage.getItem('fangdu-theme')
  if (userPref === 'dark') return true
  if (userPref === 'light') return false
  const serverDefault = localStorage.getItem('fangdu-theme-server-default')
  if (serverDefault === 'dark') return true
  return false // 亮色兜底
}

isDark.value = resolveInitialTheme()

// 后台静默拉取服务端配置的默认主题，更新缓存；
// 若用户无显式偏好，立即生效
async function syncServerDefault() {
  try {
    const baseURL = import.meta.env.VITE_API_BASE_URL || ''
    const res = await fetch(`${baseURL}/api/v1/drawer-config/site-config/default_theme`)
    if (!res.ok) return
    const data = await res.json()
    const value = data?.data?.value // 'light' | 'dark'
    if (value !== 'light' && value !== 'dark') return

    localStorage.setItem('fangdu-theme-server-default', value)

    // 没有用户显式偏好时，实时生效
    if (!localStorage.getItem('fangdu-theme')) {
      isDark.value = value === 'dark'
      applyTheme()
    }
  } catch (_) {}
}

// 应用启动时拉一次（不阻塞渲染）
syncServerDefault()

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
