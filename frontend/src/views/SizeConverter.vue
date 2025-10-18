<template>
  <div class="size-converter-container">
    <div class="header">
      <h1>尺码工具</h1>
      <p>主要用于换码标，以及尺码推荐，方便制单</p>
    </div>
    
    <div class="card">
      <div class="tab-container">
        <div 
          class="tab" 
          :class="{ active: activeTab === 'sizeConversion' }" 
          @click="activeTab = 'sizeConversion'"
        >
          <i class="tab-icon">🔄</i>换码标
        </div>
        <div 
          class="tab" 
          :class="{ active: activeTab === 'sizeRecommendation' }" 
          @click="activeTab = 'sizeRecommendation'"
        >
          <i class="tab-icon">📊</i>尺码推荐
        </div>
      </div>

      <div v-if="activeTab === 'sizeConversion'" class="conversion-container">
        <div class="input-group">
          <div class="form-group">
            <label>选择尺码范围</label>
            <div class="size-selection">
              <div class="size-range">
                <label>起始尺码</label>
                <el-select v-model="startSize" @change="updateSizeRange" class="select-control" size="large" popper-class="custom-select-dropdown">
                  <el-option v-for="(size, index) in sizeOrder" :key="index" :label="size" :value="index" />
                </el-select>
              </div>
              <div class="size-range">
                <label>结束尺码</label>
                <el-select v-model="endSize" @change="updateSizeRange" class="select-control" size="large" popper-class="custom-select-dropdown">
                  <el-option v-for="(size, index) in sizeOrder" :key="index" :label="size" :value="index" :disabled="index < startSize" />
                </el-select>
              </div>
            </div>
          </div>
          
          <div class="form-group">
            <label>降码数量</label>
            <el-select v-model="decrementCount" @change="calculateConversion" class="select-control" size="large" popper-class="custom-select-dropdown">
              <el-option v-for="n in 5" :key="n" :label="n" :value="n" />
            </el-select>
          </div>
        </div>

        <div v-if="conversionResult.length > 0" class="result-container">
          <h3>转换结果</h3>
          <div class="result-table">
            <div v-for="(item, index) in conversionResult" :key="index" class="result-row">
              <div class="result-cell original">{{ item.original }}</div>
              <div class="result-cell arrow">→</div>
              <div class="result-cell converted">{{ item.converted }}</div>
              <div class="result-cell action">
                <el-button 
                  size="small" 
                  circle 
                  type="primary" 
                  @click="copySingleResult(item)" 
                  :icon="CopyDocument"
                  class="copy-single-button"
                />
              </div>
            </div>
          </div>
          <div class="action-buttons">
            <el-button type="primary" @click="copyResult" class="copy-button" :icon="CopyDocument">
              复制结果
            </el-button>
          </div>
          <div v-if="copySuccess" class="copy-success">
            <i class="success-icon">✓</i> 已复制到剪贴板！
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'sizeRecommendation'" class="recommendation-container">
        <div class="coming-soon">
          <i class="coming-soon-icon">🚧</i>
          <p>尺码推荐功能正在开发中...</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { markRaw } from 'vue'
import { ElSelect, ElOption, ElButton } from 'element-plus'
import { CopyDocument } from '@element-plus/icons-vue'
import 'element-plus/dist/index.css'

export default {
  name: 'SizeConverter',
  components: {
    ElSelect,
    ElOption,
    ElButton
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
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: 'Helvetica Neue', Arial, sans-serif;
  color: #333;
}

.header {
  text-align: center;
  margin-bottom: 30px;
}

.header h1 {
  color: #2c3e50;
  font-size: 32px;
  font-weight: 600;
  margin-top: 50px;
}

.card {
  background-color: #fff;
  border-radius: 12px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  transition: all 0.3s ease;
}

.tab-container {
  display: flex;
  background-color: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
}

.tab {
  padding: 16px 24px;
  cursor: pointer;
  font-weight: 500;
  color: #6c757d;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.tab:hover {
  background-color: #e9ecef;
  color: #495057;
}

.tab.active {
  background-color: #fff;
  color: #007bff;
  border-bottom: 3px solid #007bff;
}

.tab-icon {
  font-style: normal;
  font-size: 18px;
}

.conversion-container, .recommendation-container {
  padding: 24px;
}

.input-group {
  margin-bottom: 24px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #495057;
}

.size-selection {
  display: flex;
  gap: 20px;
}

.size-range {
  flex: 1;
}

.size-range label {
  font-size: 14px;
  color: #6c757d;
  margin-bottom: 6px;
}

.select-control {
  width: 100%;
}

.result-container {
  background-color: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.result-container h3 {
  margin-top: 0;
  margin-bottom: 16px;
  color: #343a40;
  font-size: 20px;
  font-weight: 600;
}

.result-table {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.result-row {
  display: flex;
  align-items: center;
  background-color: #fff;
  border-radius: 6px;
  padding: 12px 16px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  transition: transform 0.2s ease;
}

.result-row:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.result-cell {
  flex: 1;
  text-align: center;
}

.result-cell.original {
  color: #dc3545;
  font-weight: 600;
}

.result-cell.arrow {
  flex: 0.5;
  color: #6c757d;
  font-size: 18px;
}

.result-cell.converted {
  color: #28a745;
  font-weight: 600;
}

.result-cell.action {
  flex: 0.5;
  display: flex;
  justify-content: center;
}

.copy-single-button {
  transform: scale(0.85);
  transition: all 0.2s ease;
}

.copy-single-button:hover {
  transform: scale(1);
}

.action-buttons {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.copy-button {
  font-size: 16px;
  font-weight: 500;
}

.copy-success {
  margin-top: 16px;
  text-align: center;
  color: #28a745;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  animation: fadeIn 0.3s ease;
}

.success-icon {
  font-style: normal;
  font-size: 18px;
}

.coming-soon {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
  color: #6c757d;
}

.coming-soon-icon {
  font-style: normal;
  font-size: 48px;
  margin-bottom: 16px;
}

.coming-soon p {
  font-size: 18px;
  margin: 0;
}

/* Element Plus 自定义样式 */
:deep(.el-select) {
  width: 100%;
}

:deep(.el-input__wrapper) {
  background-color: #f8f9fa;
  border-radius: 8px;
  box-shadow: 0 0 0 1px #ced4da inset;
  padding: 0 12px;
}

:deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #80bdff inset;
}

:deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25) inset;
}

:deep(.el-select-dropdown__item.selected) {
  color: #007bff;
  font-weight: 600;
}

:deep(.el-button) {
  border-radius: 8px;
  padding: 12px 24px;
  transition: all 0.3s ease;
}

:deep(.el-button:hover) {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 123, 255, 0.3);
}
</style>