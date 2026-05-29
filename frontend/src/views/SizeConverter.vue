<template>
  <div class="size-converter-container">
    <header class="page-header">
      <div class="header-content">
        <span class="eyebrow">SIZE TOOLS</span>
        <h1>跟单专属尺码工具</h1>
        <p>客户总是喜欢换码标，也是没招了...</p>
      </div>
    </header>

    <div class="card">
      <div class="tab-container">
        <div
          class="tab"
          :class="{ active: activeTab === 'sizeConversion' }"
          @click="activeTab = 'sizeConversion'"
        >
          换码标
        </div>
        <div
          class="tab"
          :class="{ active: activeTab === 'sizeRecommendation' }"
          @click="activeTab = 'sizeRecommendation'"
        >
          尺码推荐
        </div>
      </div>

      <div v-if="activeTab === 'sizeConversion'" class="conversion-layout">
        <!-- 左侧控制面板 -->
        <aside class="control-panel">
          <div class="form-group">
            <label class="group-label">尺码范围</label>
            <div class="size-selection">
              <div class="size-range">
                <label>起始</label>
                <el-select v-model="startSize" @change="updateSizeRange" class="select-control" size="large" popper-class="custom-select-dropdown">
                  <el-option v-for="(size, index) in sizeOrder" :key="index" :label="size" :value="index" />
                </el-select>
              </div>
              <div class="size-range">
                <label>结束</label>
                <el-select v-model="endSize" @change="updateSizeRange" class="select-control" size="large" popper-class="custom-select-dropdown">
                  <el-option v-for="(size, index) in sizeOrder" :key="index" :label="size" :value="index" :disabled="index < startSize" />
                </el-select>
              </div>
            </div>
          </div>

          <div class="form-group">
            <label class="group-label">降码数量</label>
            <el-select v-model="decrementCount" @change="calculateConversion" class="select-control" size="large" popper-class="custom-select-dropdown">
              <el-option v-for="n in 5" :key="n" :label="`降 ${n} 码`" :value="n" />
            </el-select>
          </div>

          <div class="conversion-summary">
            <div class="summary-row">
              <span class="summary-pill">{{ sizeOrder[startSize] }}</span>
              <span class="summary-sep">→</span>
              <span class="summary-pill">{{ sizeOrder[endSize] }}</span>
            </div>
            <div class="summary-meta">
              降 {{ decrementCount }} 码 · 共 {{ conversionResult.length }} 项
            </div>
          </div>
        </aside>

        <!-- 右侧结果区 -->
        <section class="result-panel">
          <div class="result-panel-header">
            <h3>转换结果</h3>
            <el-button v-if="conversionResult.length > 0" type="primary" @click="copyResult" class="copy-button" :icon="CopyDocument">
              复制全部
            </el-button>
          </div>

          <div v-if="conversionResult.length > 0" class="result-list">
            <div v-for="(item, index) in conversionResult" :key="index" class="result-row">
              <span class="size-badge original">{{ item.original }}</span>
              <span class="result-arrow">→</span>
              <span class="size-badge converted">{{ item.converted }}</span>
              <button class="copy-single-button" @click="copySingleResult(item)" title="复制此项">
                <el-icon><CopyDocument /></el-icon>
              </button>
            </div>
          </div>

          <div v-else class="result-empty">
            <p>请在左侧选择尺码范围</p>
          </div>

          <transition name="toast-fade">
            <div v-if="copySuccess" class="copy-success">
              <i class="success-icon">✓</i> 已复制到剪贴板
            </div>
          </transition>
        </section>
      </div>

      <div v-else-if="activeTab === 'sizeRecommendation'" class="recommendation-container">
        <div class="coming-soon">
          <div class="coming-soon-badge">敬请期待</div>
          <p>尺码推荐功能正在开发中</p>
          <span class="coming-soon-hint">将根据身高体重智能推荐合适尺码</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { markRaw } from 'vue'
import { ElSelect, ElOption, ElButton, ElIcon } from 'element-plus'
import { CopyDocument } from '@element-plus/icons-vue'
import 'element-plus/dist/index.css'

export default {
  name: 'SizeConverter',
  components: {
    ElSelect,
    ElOption,
    ElButton,
    ElIcon,
    CopyDocument
  },
  data() {
    return {
      activeTab: 'sizeConversion',
      startSize: 3, // 默认从XL开始
      endSize: 6, // 默认到4XL结束
      decrementCount: 3,
      conversionResult: [],
      copySuccess: false,
      sizeOrder: ['XXXS', 'XXS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL', '7XL', '8XL', '9XL', '10XL', '11XL','12XL','13XL','14XL'],
      CopyDocument: markRaw(CopyDocument) // 使用 markRaw 包裹图标组件，避免变成响应式对象
    }
  },
  mounted() {
    // 初始化时计算一次转换结果
    this.calculateConversion();
  },
  methods: {
    updateSizeRange() {
      // 确保结束尺码不小于开始尺码
      if (this.endSize < this.startSize) {
        this.endSize = this.startSize;
      }
      this.calculateConversion();
    },
    calculateConversion() {
      const result = [];

      // 从起始尺码到结束尺码遍历
      for (let i = this.startSize; i <= this.endSize; i++) {
        const originalSize = this.sizeOrder[i];
        const convertedIndex = Math.max(0, i - this.decrementCount);
        const convertedSize = this.sizeOrder[convertedIndex];

        result.push({
          original: originalSize,
          converted: convertedSize
        });
      }

      this.conversionResult = result;
    },
    copySingleResult(item) {
      const textToCopy = `${item.original}->${item.converted}`;

      navigator.clipboard.writeText(textToCopy)
        .then(() => {
          this.copySuccess = true;
          setTimeout(() => {
            this.copySuccess = false;
          }, 2000);
        })
        .catch(err => {
          console.error('复制失败:', err);
        });
    },
    copyResult() {
      const textToCopy = this.conversionResult
        .map(item => `${item.original}->${item.converted}`)
        .join('\n');

      navigator.clipboard.writeText(textToCopy)
        .then(() => {
          this.copySuccess = true;
          setTimeout(() => {
            this.copySuccess = false;
          }, 2000);
        })
        .catch(err => {
          console.error('无法复制到剪贴板:', err);
        });
    }
  }
}
</script>

<style scoped>
.size-converter-container {
  max-width: 920px;
  margin: 0 auto;
  padding: 20px;
  font-family: 'Helvetica Neue', Arial, sans-serif;
  color: #2c3a32;
}

/* 页面头部 —— 深绿渐变 hero 横幅 */
.page-header {
  position: relative;
  overflow: hidden;
  text-align: center;
  margin: 40px 0 28px;
  padding: 52px 24px;
  border-radius: 18px;
  background: linear-gradient(135deg, #072e19 0%, #0a3d22 45%, #316b49 100%);
  box-shadow: 0 16px 44px rgba(10, 61, 34, 0.28);
}

/* 柔和光晕装饰 */
.page-header::before {
  content: '';
  position: absolute;
  top: -70px;
  right: -50px;
  width: 240px;
  height: 240px;
  background: radial-gradient(circle, rgba(158, 212, 181, 0.35), transparent 70%);
  border-radius: 50%;
}

.page-header::after {
  content: '';
  position: absolute;
  bottom: -90px;
  left: -60px;
  width: 260px;
  height: 260px;
  background: radial-gradient(circle, rgba(90, 143, 115, 0.32), transparent 70%);
  border-radius: 50%;
}

/* 细腻点阵纹理 */
.header-content {
  position: relative;
  z-index: 1;
}

.header-content::before {
  content: '';
  position: absolute;
  inset: -52px -24px;
  background-image: radial-gradient(rgba(255, 255, 255, 0.06) 1px, transparent 1px);
  background-size: 18px 18px;
  pointer-events: none;
  z-index: -1;
}

.eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  letter-spacing: 3px;
  font-weight: 600;
  color: #9ed4b5;
  margin-bottom: 14px;
}

.eyebrow::before,
.eyebrow::after {
  content: '';
  width: 22px;
  height: 1px;
  background: rgba(158, 212, 181, 0.5);
}

.page-header h1 {
  font-size: 34px;
  font-weight: 700;
  margin: 0 0 12px;
  color: #fff;
  letter-spacing: 2px;
}

.page-header p {
  margin: 0;
  color: rgba(255, 255, 255, 0.72);
  font-size: 15px;
}

/* 卡片 */
.card {
  background-color: #fff;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(10, 61, 34, 0.08);
  border: 1px solid #eef1ef;
  overflow: hidden;
}

/* 标签栏 */
.tab-container {
  display: flex;
  border-bottom: 1px solid #eef1ef;
}

.tab {
  position: relative;
  padding: 18px 28px;
  cursor: pointer;
  font-weight: 500;
  font-size: 15px;
  color: #8a8f8c;
  transition: color 0.2s ease;
}

.tab::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 28px;
  right: 28px;
  height: 2.5px;
  background: #5a8f73;
  border-radius: 2px;
  transform: scaleX(0);
  transition: transform 0.25s ease;
}

.tab:hover {
  color: #3d6b52;
}

.tab.active {
  color: #0a3d22;
  font-weight: 600;
}

.tab.active::after {
  transform: scaleX(1);
}

/* 左右分栏布局 */
.conversion-layout {
  display: grid;
  grid-template-columns: 300px 1fr;
}

/* 左侧控制面板 */
.control-panel {
  padding: 28px 24px;
  background: #f4f7f5;
  border-right: 1px solid #eef1ef;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.group-label {
  font-size: 13px;
  font-weight: 600;
  color: #3d6b52;
  letter-spacing: 0.5px;
  margin-bottom: 10px;
}

.size-selection {
  display: flex;
  gap: 12px;
}

.size-range {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.size-range label {
  font-size: 12px;
  color: #8a8f8c;
  margin-bottom: 6px;
}

.select-control {
  width: 100%;
}

/* 转换摘要 */
.conversion-summary {
  margin-top: auto;
  background: #fff;
  border: 1px solid #e3e9e5;
  border-radius: 12px;
  padding: 16px;
  text-align: center;
}

.summary-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 8px;
}

.summary-pill {
  background: linear-gradient(135deg, #0a3d22, #5a8f73);
  color: #fff;
  font-weight: 600;
  font-size: 15px;
  padding: 5px 14px;
  border-radius: 8px;
  min-width: 44px;
}

.summary-sep {
  color: #b6c0ba;
  font-size: 16px;
}

.summary-meta {
  font-size: 13px;
  color: #8a8f8c;
}

/* 右侧结果区 */
.result-panel {
  padding: 24px 28px;
  display: flex;
  flex-direction: column;
}

.result-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
}

.result-panel-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #2c3a32;
}

.result-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 420px;
  overflow-y: auto;
  padding-right: 4px;
}

.result-row {
  display: flex;
  align-items: center;
  gap: 14px;
  background-color: #fff;
  border: 1px solid #eef1ef;
  border-radius: 12px;
  padding: 12px 16px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.result-row:hover {
  border-color: #cfe0d6;
  box-shadow: 0 4px 14px rgba(10, 61, 34, 0.08);
  transform: translateY(-1px);
}

.size-badge {
  font-weight: 600;
  font-size: 15px;
  padding: 6px 16px;
  border-radius: 8px;
  text-align: center;
  min-width: 56px;
}

.size-badge.original {
  background: #f0f2f1;
  color: #6b7672;
  border: 1px solid #e3e9e5;
}

.size-badge.converted {
  background: rgba(90, 143, 115, 0.12);
  color: #2f6b48;
  border: 1px solid rgba(90, 143, 115, 0.3);
}

.result-arrow {
  color: #b6c0ba;
  font-size: 16px;
}

.copy-single-button {
  margin-left: auto;
  width: 34px;
  height: 34px;
  border: 1px solid #e3e9e5;
  background: #fff;
  border-radius: 8px;
  color: #5a8f73;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.copy-single-button:hover {
  background: #5a8f73;
  border-color: #5a8f73;
  color: #fff;
}

/* 空状态 */
.result-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  color: #b6c0ba;
  font-size: 15px;
}

/* 复制成功提示 */
.copy-success {
  margin-top: 16px;
  text-align: center;
  color: #2f6b48;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.success-icon {
  font-style: normal;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  background: #5a8f73;
  color: #fff;
  border-radius: 50%;
  font-size: 12px;
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translateY(6px);
}

/* 敬请期待 */
.recommendation-container {
  padding: 24px;
}

.coming-soon {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
  text-align: center;
}

.coming-soon-badge {
  background: linear-gradient(135deg, #0a3d22, #5a8f73);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 1px;
  padding: 6px 16px;
  border-radius: 20px;
  margin-bottom: 18px;
}

.coming-soon p {
  font-size: 18px;
  color: #2c3a32;
  margin: 0 0 8px;
  font-weight: 500;
}

.coming-soon-hint {
  font-size: 13px;
  color: #b6c0ba;
}

/* Element Plus 自定义样式 */
:deep(.el-select) {
  width: 100%;
}

:deep(.el-input__wrapper) {
  background-color: #fff;
  border-radius: 10px;
  box-shadow: 0 0 0 1px #e3e9e5 inset;
  padding: 0 12px;
}

:deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #5a8f73 inset;
}

:deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 2px rgba(90, 143, 115, 0.3) inset;
}

:deep(.el-select-dropdown__item.selected) {
  color: #5a8f73;
  font-weight: 600;
}

.copy-button {
  font-weight: 500;
  background: linear-gradient(135deg, #0a3d22, #5a8f73);
  border: none;
  border-radius: 10px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.copy-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(10, 61, 34, 0.25);
}

/* 响应式 */
@media (max-width: 768px) {
  .conversion-layout {
    grid-template-columns: 1fr;
  }

  .control-panel {
    border-right: none;
    border-bottom: 1px solid #eef1ef;
  }

  .conversion-summary {
    margin-top: 8px;
  }

  .tab {
    flex: 1;
    text-align: center;
    padding: 16px;
  }
}
</style>
