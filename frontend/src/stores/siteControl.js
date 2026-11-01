import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import apiClient from '../axiosConfig.js';

export const siteModules = [
  { key: 'materials', label: '素材浏览', description: '实拍、分类页面与素材查询' },
  { key: 'colorCard', label: '色卡工具', description: '设计专用色卡页面' },
  { key: 'sizeConverter', label: '尺码工具', description: '换码标与尺码推荐页面' },
  { key: 'drawer', label: '侧栏菜单', description: '公告、反馈、收藏、筛选与教程' },
  { key: 'fabricDetail', label: '面料细节入口', description: '导航中的面料详情入口' },
  { key: 'officialSite', label: '官网入口', description: '导航中的官网、知识库外链' }
];

export const useSiteControlStore = defineStore('siteControl', () => {
  const config = ref(null);
  const isAdmin = ref(false);
  const ready = ref(false);
  const error = ref(false);
  let pending;
  const refresh = () => {
    if (pending) return pending;
    pending = apiClient.get('/api/v1/site-control', { timeout: 8000 }).then(({ data }) => {
      config.value = data.data;
      isAdmin.value = data.isAdmin === true;
      error.value = false;
    }).catch(() => { error.value = true; }).finally(() => {
      ready.value = true;
      pending = null;
    });
    return pending;
  };
  const moduleEnabled = key => isAdmin.value || (config.value?.enabled === true && config.value.modules[key] === true);
  const stopped = computed(() => !isAdmin.value && config.value?.enabled === false);
  return { config, isAdmin, ready, error, refresh, moduleEnabled, stopped };
});
