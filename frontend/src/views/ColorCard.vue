<template>
  <div class="color-card-container">
    <h1>打色块</h1>
    
    <div class="main-layout">
      <!-- 左侧面板：色值输入和设置 -->
      <div class="left-panel">
        <div class="tool-panel">
          <div class="panel-section">
            <h2>色值输入</h2>
            <div class="input-method-selector">
              <button 
                :class="{ active: inputMethod === 'hex' }" 
                @click="inputMethod = 'hex'"
                class="input-method"
              >
                HEX
              </button>
              <button 
                :class="{ active: inputMethod === 'rgb' }" 
                @click="inputMethod = 'rgb'"
                class="input-method"
              >
                RGB
              </button>
              <button 
                :class="{ active: inputMethod === 'cmyk' }" 
                @click="inputMethod = 'cmyk'"
                class="input-method"
              >
                CMYK
              </button>
              <button 
                :class="{ active: inputMethod === 'lab' }" 
                @click="inputMethod = 'lab'"
                class="input-method"
              >
                Lab
              </button>
            </div>
            
            <!-- HEX输入 -->
            <div v-if="inputMethod === 'hex'" class="input-group">
              <label>HEX值:</label>
              <div class="color-input-wrapper">
                <input 
                  type="text" 
                  v-model="currentColor.hex" 
                  @input="handleHexChange"
                  placeholder="#FFFFFF"
                />
                <input 
                  type="color" 
                  v-model="currentColor.hex" 
                  @input="handleHexChange"
                  class="color-picker modern-picker"
                />
              </div>
              <div class="alpha-slider">
                <label>透明度:</label>
                <div class="alpha-input-container">
                  <input 
                    type="range" 
                    v-model.number="currentColor.alpha" 
                    @input="updateColorWithAlpha"
                    min="0" 
                    max="1" 
                    step="0.01"
                  />
                  <div class="alpha-value-input">
                    <input 
                      type="number" 
                      v-model.number="alphaPercentage" 
                      @input="updateAlphaFromPercentage"
                      min="0" 
                      max="100"
                      class="alpha-percentage-input"
                    />
                    <span>%</span>
                  </div>
                </div>
              </div>
              <div 
                class="color-preview" 
                :style="{ backgroundColor: getColorWithAlpha(currentColor) }"
              ></div>
            </div>
            
            <!-- RGB输入 -->
            <div v-if="inputMethod === 'rgb'" class="input-group">
              <label>R:</label>
              <input 
                type="number" 
                v-model.number="currentColor.rgb.r" 
                @input="handleRgbChange"
                min="0" 
                max="255"
              />
              <label>G:</label>
              <input 
                type="number" 
                v-model.number="currentColor.rgb.g" 
                @input="handleRgbChange"
                min="0" 
                max="255"
              />
              <label>B:</label>
              <input 
                type="number" 
                v-model.number="currentColor.rgb.b" 
                @input="handleRgbChange"
                min="0" 
                max="255"
              />
              <div class="alpha-slider">
                <label>透明度:</label>
                <div class="alpha-input-container">
                  <input 
                    type="range" 
                    v-model.number="currentColor.alpha" 
                    @input="updateColorWithAlpha"
                    min="0" 
                    max="1" 
                    step="0.01"
                  />
                  <div class="alpha-value-input">
                    <input 
                      type="number" 
                      v-model.number="alphaPercentage" 
                      @input="updateAlphaFromPercentage"
                      min="0" 
                      max="100"
                      class="alpha-percentage-input"
                    />
                    <span>%</span>
                  </div>
                </div>
              </div>
              <div 
                class="color-preview" 
                :style="{ backgroundColor: getColorWithAlpha(currentColor) }"
              ></div>
            </div>
            
            <!-- CMYK输入 -->
            <div v-if="inputMethod === 'cmyk'" class="input-group">
              <label>C:</label>
              <input 
                type="number" 
                v-model.number="currentColor.cmyk.c" 
                @input="handleCmykChange"
                min="0" 
                max="100"
              />
              <label>M:</label>
              <input 
                type="number" 
                v-model.number="currentColor.cmyk.m" 
                @input="handleCmykChange"
                min="0" 
                max="100"
              />
              <label>Y:</label>
              <input 
                type="number" 
                v-model.number="currentColor.cmyk.y" 
                @input="handleCmykChange"
                min="0" 
                max="100"
              />
              <label>K:</label>
              <input 
                type="number" 
                v-model.number="currentColor.cmyk.k" 
                @input="handleCmykChange"
                min="0" 
                max="100"
              />
              <div 
                class="color-preview" 
                :style="{ backgroundColor: currentColor.hex }"
              ></div>
            </div>
            
            <!-- Lab输入 -->
            <div v-if="inputMethod === 'lab'" class="input-group">
              <label>L:</label>
              <input 
                type="number" 
                v-model.number="currentColor.lab.L" 
                @input="handleLabChange"
                min="0" 
                max="100"
              />
              <label>a:</label>
              <input 
                type="number" 
                v-model.number="currentColor.lab.a" 
                @input="handleLabChange"
                min="-128" 
                max="127"
              />
              <label>b:</label>
              <input 
                type="number" 
                v-model.number="currentColor.lab.b" 
                @input="handleLabChange"
                min="-128" 
                max="127"
              />
              <div 
                class="color-preview" 
                :style="{ backgroundColor: currentColor.hex }"
              ></div>
            </div>
            
            <div class="note-input">
              <label>备注:</label>
              <input 
                type="text" 
                v-model="currentColor.note" 
                placeholder="针对于单个色卡备注 可忽略"
              />
            </div>
            
            <button class="add-button" @click="addColorCard">添加色卡</button>
          </div>
          
          <div class="panel-section">
            <h2>色卡设置</h2>
            <div class="color-count-control">
              <label>色卡数量（最多100个）:</label>
              <div class="preset-container">
                <div class="preset-buttons">
                  <button class="preset-btn" @click="setColorCount(3)">3</button>
                  <button class="preset-btn" @click="setColorCount(5)">5</button>
                  <button class="preset-btn" @click="setColorCount(7)">7</button>
                  <button class="preset-btn" @click="setColorCount(9)">9</button>
                </div>
                <div class="custom-count-input">
                  <input 
                    type="text" 
                    v-model="colorCount" 
                    placeholder="自定义数量（最多100个）"
                    class="custom-input"
                    @input="validateColorCount"
                  />
                </div>
              </div>
              <button class="generate-btn" @click="generateSimilarColors">生成相似色卡</button>
            </div>
            
            <div class="layout-control">
              <label>布局:</label>
              <button 
                :class="{ active: layoutMode === 'grid' }" 
                @click="layoutMode = 'grid'"
              >
                网格
              </button>
              <button 
                :class="{ active: layoutMode === 'row' }" 
                @click="layoutMode = 'row'"
              >
                行
              </button>
            </div>
            
            <div class="export-settings-row">
              <div class="global-note">
                <label>备注 (这是必须的)</label>
                <textarea 
                  v-model="globalNote" 
                  placeholder="这里必须要备注，不然找不到是哪一个客户。"
                ></textarea>
              </div>
              
              <div class="export-material-setting">
                <label>面料 (这是必须的)</label>
                <div class="material-select-container">
                  <el-select
                    v-model="selectedMaterial"
                    filterable
                    placeholder="选择面料"
                    class="material-select"
                  >
                    <el-option
                      v-for="material in materialOptions"
                      :key="material"
                      :label="material"
                      :value="material"
                    />
                  </el-select>
                </div>
              </div>
            </div>
            
            <div class="export-row-setting">
              <label>导出每行色卡数量:</label>
              <div class="row-count-input">
                <el-select
                  v-model.number="cardsPerRowExport"
                  placeholder="选择每行色卡数量"
                  class="row-count-select"
                >
                  <el-option
                    v-for="n in 10"
                    :key="n"
                    :label="`${n} 个`"
                    :value="n"
                  />
                </el-select>
              </div>
            </div>
            
            <div class="export-control">
              <button class="export-button" @click="exportColorCards">导出色卡</button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 右侧面板：色卡展示 -->
      <div class="right-panel">
        <div class="color-cards-display" :class="layoutMode">
          <!-- 当前编辑的颜色始终显示在第一个位置 -->
          <div 
            class="color-card current-edit-card"
            :style="{ backgroundColor: getColorWithAlpha(currentColor) }"
          >
            <div class="color-info">
              <div class="color-hex">HEX: {{ currentColor.hex }}</div>
              <div class="color-rgb">RGB: {{ currentColor.rgb.r }}, {{ currentColor.rgb.g }}, {{ currentColor.rgb.b }}</div>
              <div v-if="showCmyk" class="color-cmyk">
                CMYK: {{ currentColor.cmyk.c }}%, {{ currentColor.cmyk.m }}%, {{ currentColor.cmyk.y }}%, {{ currentColor.cmyk.k }}%
              </div>
              <div class="color-note">{{ currentColor.note || '基础色' }}</div>
            </div>
          </div>
          
          <div 
            v-for="card in colorCards" 
            :key="card.id" 
            class="color-card"
            :class="{ 'locked': card.locked }"
            :style="{ backgroundColor: getColorWithAlpha(card) }"
          >
            <div class="color-info">
              <div class="color-hex">HEX: {{ card.hex }}</div>
              <div class="color-rgb">RGB: {{ card.rgb.r }}, {{ card.rgb.g }}, {{ card.rgb.b }}</div>
              <div v-if="showCmyk" class="color-cmyk">
                CMYK: {{ card.cmyk.c }}%, {{ card.cmyk.m }}%, {{ card.cmyk.y }}%, {{ card.cmyk.k }}%
              </div>
              <div v-if="card.note" class="color-note">{{ card.note }}</div>
            </div>
            <div class="card-actions">
              <button @click="toggleLock(card.id)" class="action-btn" :title="card.locked ? '解锁色卡' : '锁定色卡'">
                <span>{{ card.locked ? '🔒' : '🔓' }}</span>
              </button>
              <button @click="copyColor(card.hex)" class="action-btn" title="复制色值">
                <span>📋</span>
              </button>
              <button @click="removeColorCard(card.id)" class="action-btn" title="删除色卡">
                <span>🗑️</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 自定义提示框 -->
    <div v-if="showToastState" class="custom-toast" :class="`toast-${toastType}`">
      <div class="toast-content">
        <div class="toast-icon">
          <svg v-if="toastType === 'success'" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <span class="toast-message">{{ toastMessage }}</span>
        <button @click="showToastState = false" class="toast-close">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import chroma from 'chroma-js';

// 提示框状态
const showToastState = ref(false);
const toastMessage = ref('');
const toastType = ref('success'); // 'success' | 'error'

// 显示自定义提示框
const showToast = (message, type = 'success') => {
  toastMessage.value = message;
  toastType.value = type;
  showToastState.value = true;
  
  // 3秒后自动隐藏
  setTimeout(() => {
    showToastState.value = false;
  }, 2000);
};

// 导出设置
const cardsPerRowExport = ref(5); // 默认每行5个色卡
const materialSearchText = ref('');
const selectedMaterial = ref('');
const showMaterialDropdown = ref(false);
const materialOptions = [
  '速干', '莫代尔', '210克速干', '珠地', '仿棉',  '260克莫代尔', 
  '260克珠地', '冰丝蝴蝶网', '小方格', '水蜜桃', 
  '复合', 'T400', '斜纹', '健康布', '银狐绒'
];

// 过滤面料选项
const filteredMaterials = computed(() => {
  if (!materialSearchText.value) return materialOptions;
  return materialOptions.filter(material => 
    material.toLowerCase().includes(materialSearchText.value.toLowerCase())
  );
});

// 选择面料
const selectMaterial = (material) => {
  selectedMaterial.value = material;
  materialSearchText.value = material;
  showMaterialDropdown.value = false;
};

// 处理面料输入框失焦事件
const handleMaterialBlur = () => {
  // 延迟关闭下拉列表，以便点击选项能够生效
  setTimeout(() => {
    showMaterialDropdown.value = false;
  }, 150);
};

// 基础色时钟数据
const basicColors = ref([
  { name: '红色', hex: '#FF0000', rgb: {r: 255, g: 0, b: 0} },
  { name: '橙色', hex: '#FF7F00', rgb: {r: 255, g: 127, b: 0} },
  { name: '黄色', hex: '#FFFF00', rgb: {r: 255, g: 255, b: 0} },
  { name: '黄绿色', hex: '#7FFF00', rgb: {r: 127, g: 255, b: 0} },
  { name: '绿色', hex: '#00FF00', rgb: {r: 0, g: 255, b: 0} },
  { name: '青绿色', hex: '#00FF7F', rgb: {r: 0, g: 255, b: 127} },
  { name: '青色', hex: '#00FFFF', rgb: {r: 0, g: 255, b: 255} },
  { name: '青蓝色', hex: '#007FFF', rgb: {r: 0, g: 127, b: 255} },
  { name: '蓝色', hex: '#0000FF', rgb: {r: 0, g: 0, b: 255} },
  { name: '蓝紫色', hex: '#7F00FF', rgb: {r: 127, g: 0, b: 255} },
  { name: '紫色', hex: '#FF00FF', rgb: {r: 255, g: 0, b: 255} },
  { name: '紫红色', hex: '#FF007F', rgb: {r: 255, g: 0, b: 127} }
]);

// 色卡数据
const colorCards = ref([
  { 
    id: 1, 
    hex: '#E74C3C', 
    rgb: {r: 231, g: 76, b: 60}, 
    cmyk: {c: 0, m: 67, y: 74, k: 9}, 
    lab: {L: 52.3, a: 50.1, b: 35.6}, 
    note: '主色', 
    locked: false,
    alpha: 1
  },
  { 
    id: 2, 
    hex: '#3498DB', 
    rgb: {r: 52, g: 152, b: 219}, 
    cmyk: {c: 76, m: 31, y: 0, k: 14}, 
    lab: {L: 59.6, a: -7.2, b: -41.3}, 
    note: '辅色', 
    locked: false,
    alpha: 1
  },
  { 
    id: 3, 
    hex: '#2ECC71', 
    rgb: {r: 46, g: 204, b: 113}, 
    cmyk: {c: 77, m: 0, y: 45, k: 20}, 
    lab: {L: 73.4, a: -48.1, b: 31.4}, 
    note: '点缀色', 
    locked: false,
    alpha: 1
  }
]);

// 当前编辑的色卡
const currentColor = reactive({
  hex: '#FFFFFF',
  rgb: {r: 255, g: 255, b: 255},
  cmyk: {c: 0, m: 0, y: 0, k: 0},
  lab: {L: 100, a: 0, b: 0},
  note: '',
  alpha: 1
});

// 透明度百分比计算属性
const alphaPercentage = computed({
  get: () => Math.round(currentColor.alpha * 100),
  set: (value) => {
    currentColor.alpha = value / 100;
    updateColorWithAlpha();
  }
});

// 色值输入方式
const inputMethod = ref('hex'); // hex, rgb, cmyk, lab

// 色卡数量
const colorCount = ref(5);

// 全局备注
const globalNote = ref('');

// 是否显示CMYK值
const showCmyk = ref(true);

// 色卡布局方式
const layoutMode = ref('grid'); // grid, row

// 添加新色卡
const addColorCard = () => {
  const newId = colorCards.value.length > 0 
    ? Math.max(...colorCards.value.map(card => card.id)) + 1 
    : 1;
  
  // 检查是否已存在相同色值的色卡
  const isDuplicate = colorCards.value.some(card => card.hex.toLowerCase() === currentColor.hex.toLowerCase());
  
  if (isDuplicate) {
    showToast('已存在相同色值的色卡，不能重复添加！', 'error');
    return;
  }
  
  colorCards.value.push({
    id: newId,
    hex: currentColor.hex,
    rgb: {...currentColor.rgb},
    cmyk: {...currentColor.cmyk},
    lab: {...currentColor.lab},
    note: currentColor.note,
    locked: false,
    alpha: currentColor.alpha
  });
  
  // 重置当前编辑的色卡
  resetCurrentColor();
};

// 获取带透明度的颜色值
const getColorWithAlpha = (color) => {
  const rgb = color.rgb;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${color.alpha})`;
};

// 更新颜色时同时考虑透明度
const updateColorWithAlpha = () => {
  // 透明度改变时更新预览，但不改变基础色值
  // 实际颜色显示会通过getColorWithAlpha方法处理
};

// 从百分比更新透明度值
const updateAlphaFromPercentage = () => {
  currentColor.alpha = alphaPercentage.value / 100;
  updateColorWithAlpha();
};

// 设置色卡数量
const setColorCount = (count) => {
  colorCount.value = count;
};

// 验证色卡数量输入
const validateColorCount = () => {
  // 允许空字符串或删除操作
  if (colorCount.value === '' || colorCount.value === null) {
    return;
  }
  
  // 确保输入是数字
  const value = parseInt(colorCount.value);
  if (isNaN(value)) {
    return;
  }
  
  // 限制范围在1-100之间
  if (value < 1) {
    colorCount.value = 1;
  } else if (value > 100) {
    colorCount.value = 100;
  } else {
    // 确保存储为数字类型
    colorCount.value = value;
  }
};

// 复制色值到剪贴板
const copyColor = (color) => {
  navigator.clipboard.writeText(color).then(() => {
    showCopyNotification(color);
  });
};

// 显示复制成功通知
const showCopyNotification = (color) => {
  const notification = document.createElement('div');
  notification.className = 'copy-notification';
  notification.innerHTML = `
    <div class="notification-content">
      <div class="color-dot" style="background-color: ${color}"></div>
      <span>已复制色值: ${color}</span>
    </div>
  `;
  document.body.appendChild(notification);
  
  // 添加动画效果
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);
  
  // 2秒后移除通知
  setTimeout(() => {
    notification.classList.remove('show');
    notification.classList.add('hide');
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, 2000);
};
// 从基础色时钟选择颜色
const selectBasicColor = (color) => {
  currentColor.hex = color.hex;
  currentColor.rgb = {...color.rgb};
  // 更新其他颜色格式
  handleHexChange();
};
const resetCurrentColor = () => {
  currentColor.hex = '#FFFFFF';
  currentColor.rgb = {r: 255, g: 255, b: 255};
  currentColor.cmyk = {c: 0, m: 0, y: 0, k: 0};
  currentColor.lab = {L: 100, a: 0, b: 0};
  currentColor.note = '';
  currentColor.alpha = 1;
};

// 删除色卡
const removeColorCard = (id) => {
  const index = colorCards.value.findIndex(card => card.id === id);
  if (index !== -1) {
    colorCards.value.splice(index, 1);
  }
};

// 锁定/解锁色卡
const toggleLock = (id) => {
  const card = colorCards.value.find(card => card.id === id);
  if (card) {
    card.locked = !card.locked;
  }
};

// 这个函数已被上面的copyColor替代，使用showCopyNotification提供更好的用户体验

// 从HEX更新RGB
const updateRgbFromHex = (hex) => {
  // 移除#号
  hex = hex.replace('#', '');
  
  // 解析RGB值
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  return {r, g, b};
};

// 从RGB更新HEX
const updateHexFromRgb = (r, g, b) => {
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
};

// 从RGB更新CMYK
const updateCmykFromRgb = (r, g, b) => {
  try {
    // 使用chroma.js进行转换
    const cmyk = chroma(r, g, b).cmyk();
    return {
      c: Math.round(cmyk[0] * 100),
      m: Math.round(cmyk[1] * 100),
      y: Math.round(cmyk[2] * 100),
      k: Math.round(cmyk[3] * 100)
    };
  } catch (error) {
    // 回退到简化版转换
    const rRatio = r / 255;
    const gRatio = g / 255;
    const bRatio = b / 255;
    
    const k = 1 - Math.max(rRatio, gRatio, bRatio);
    
    if (k === 1) {
      return { c: 0, m: 0, y: 0, k: 100 };
    }
    
    const c = Math.round(((1 - rRatio - k) / (1 - k)) * 100);
    const m = Math.round(((1 - gRatio - k) / (1 - k)) * 100);
    const y = Math.round(((1 - bRatio - k) / (1 - k)) * 100);
    
    return { c, m, y, k: Math.round(k * 100) };
  }
};

// 从RGB更新Lab
const updateLabFromRgb = (r, g, b) => {
  try {
    // 使用chroma.js进行转换
    const lab = chroma(r, g, b).lab();
    return {
      L: Math.round(lab[0] * 10) / 10,
      a: Math.round(lab[1] * 10) / 10,
      b: Math.round(lab[2] * 10) / 10
    };
  } catch (error) {
    // 回退到简化版转换
    // 这里只是一个非常简化的转换，不够精确
    const L = Math.round((0.2126 * r + 0.7152 * g + 0.0722 * b) / 2.55);
    const a = Math.round((r - g) / 2);
    const b_val = Math.round((g - b) / 2);
    
    return { L, a, b: b_val };
  }
};

// 监听HEX输入变化
const handleHexChange = () => {
  const rgb = updateRgbFromHex(currentColor.hex);
  currentColor.rgb = rgb;
  currentColor.cmyk = updateCmykFromRgb(rgb.r, rgb.g, rgb.b);
  currentColor.lab = updateLabFromRgb(rgb.r, rgb.g, rgb.b);
};

// 监听RGB输入变化
const handleRgbChange = () => {
  const {r, g, b} = currentColor.rgb;
  currentColor.hex = updateHexFromRgb(r, g, b);
  currentColor.cmyk = updateCmykFromRgb(r, g, b);
  currentColor.lab = updateLabFromRgb(r, g, b);
};

// 监听CMYK输入变化
const handleCmykChange = () => {
  // 简化版CMYK到RGB转换
  const {c, m, y, k} = currentColor.cmyk;
  
  const r = Math.round(255 * (1 - c/100) * (1 - k/100));
  const g = Math.round(255 * (1 - m/100) * (1 - k/100));
  const b = Math.round(255 * (1 - y/100) * (1 - k/100));
  
  currentColor.rgb = {r, g, b};
  currentColor.hex = updateHexFromRgb(r, g, b);
  currentColor.lab = updateLabFromRgb(r, g, b);
};

// 监听Lab输入变化
const handleLabChange = () => {
  try {
    // 使用chroma.js进行转换
    const rgb = chroma.lab(currentColor.lab.L, currentColor.lab.a, currentColor.lab.b).rgb();
    
    currentColor.rgb = {
      r: Math.round(rgb[0]),
      g: Math.round(rgb[1]),
      b: Math.round(rgb[2])
    };
    
    const {r, g, b} = currentColor.rgb;
    currentColor.hex = updateHexFromRgb(r, g, b);
    currentColor.cmyk = updateCmykFromRgb(r, g, b);
  } catch (error) {
    console.error('Lab转换错误:', error);
  }
};

// 生成相似颜色
const generateSimilarColors = () => {
  const baseColor = currentColor.hex;
  const count = colorCount.value;
  
  try {
    // 使用chroma.js生成色阶
    const scale = chroma.scale([
      chroma(baseColor).brighten(2),
      baseColor,
      chroma(baseColor).darken(2)
    ]).mode('lab').colors(count);
    
    // 清空现有色卡
    colorCards.value = [];
    
    // 添加生成的色卡
    scale.forEach((color, index) => {
      const hex = color.toUpperCase();
      const rgb = updateRgbFromHex(hex);
      const cmyk = updateCmykFromRgb(rgb.r, rgb.g, rgb.b);
      const lab = updateLabFromRgb(rgb.r, rgb.g, rgb.b);
      
      colorCards.value.push({
        id: index + 1,
        hex,
        rgb,
        cmyk,
        lab,
        note: '',
        locked: false,
        alpha: currentColor.alpha // 保持与当前编辑颜色相同的透明度
      });
    });
  } catch (error) {
    console.error('生成相似色卡错误:', error);
  }
};

// 导出色卡
const exportColorCards = () => {
  // 检查全局备注是否填写
  if (!globalNote.value.trim()) {
    showToast('请填写全局备注，这是必须的！', 'error');
    return;
  }
  
  // 创建一个临时容器来渲染导出内容
  const exportContainer = document.createElement('div');
  exportContainer.className = 'export-container';
  
  // 添加标题和全局备注
  const header = document.createElement('div');
  header.className = 'export-header';
  header.innerHTML = `
    <h1>🎨 色卡</h1>
    ${globalNote.value ? `<p class="export-note">${globalNote.value}</p>` : ''}
    ${selectedMaterial.value ? `<p class="export-material">面料: ${selectedMaterial.value}</p>` : ''}
    <p class="export-date">导出时间: ${new Date().toLocaleString()}</p>
  `;
  exportContainer.appendChild(header);
  
  // 添加色卡 - 使用左对齐布局
  const cardsContainer = document.createElement('div');
  cardsContainer.className = 'export-cards';
  
  // 计算每行显示的色卡数量
  const cardsPerRow = cardsPerRowExport.value; // 使用用户设置的每行色卡数量
  
  // 创建行容器
  let currentRow = null;
  
  // 创建要导出的色卡数组，首先添加基础色
  const cardsToExport = [
    {
      id: 0,
      hex: currentColor.hex,
      rgb: currentColor.rgb,
      cmyk: currentColor.cmyk,
      lab: currentColor.lab,
      note: '基础色',
      locked: false,
      alpha: currentColor.alpha
    },
    ...colorCards.value
  ];
  
  cardsToExport.forEach((card, index) => {
    // 每行开始时创建新的行容器
    if (index % cardsPerRow === 0) {
      currentRow = document.createElement('div');
      currentRow.className = 'export-row';
      currentRow.style.justifyContent = 'flex-start'; // 设置为左对齐
      cardsContainer.appendChild(currentRow);
    }
    
    const cardElement = document.createElement('div');
    cardElement.className = 'export-card';
    cardElement.style.backgroundColor = card.hex;
    
    const cardInfo = document.createElement('div');
    cardInfo.className = 'export-card-info';
    cardInfo.innerHTML = `
      <div class="export-hex">${card.hex}</div>
      <div class="export-rgb">RGB: ${card.rgb.r}, ${card.rgb.g}, ${card.rgb.b}</div>
      <div class="export-cmyk">CMYK: ${card.cmyk.c}%, ${card.cmyk.m}%, ${card.cmyk.y}%, ${card.cmyk.k}%</div>
      ${card.note ? `<div class="export-card-note">${card.note}</div>` : ''}
    `;
    
    cardElement.appendChild(cardInfo);
    currentRow.appendChild(cardElement);
  });
  
  exportContainer.appendChild(cardsContainer);
  
  // 计算容器宽度
  const cardWidth = 160; // 每个色卡的宽度
  const cardGap = 20; // 色卡之间的间距
  const containerPadding = 60; // 左右各30px的padding
  const containerWidth = cardWidth * cardsPerRow + (cardsPerRow - 1) * cardGap + containerPadding;
  
  // 添加样式
  const style = document.createElement('style');
  style.textContent = `
    .export-container {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      padding: 30px;
      background-color: white;
      width: ${containerWidth}px;
      margin: 0 auto;
    }
    .export-header {
      text-align: center;
      margin-bottom: 30px;
    }
    .export-header h1 {
      font-size: 28px;
      color: #2c3e50;
      margin-bottom: 10px;
    }
    .export-note {
      font-size: 40px;
      font-style: italic;
      color: #666;
      margin-bottom: 10px;
    }
    .export-material {
      font-size: 40px;
      color: #555;
      margin-bottom: 10px;
    }
    .export-date {
      font-size: 2em;
      color: #999;
    }
    .export-cards {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .export-row {
      display: flex;
      justify-content: flex-start;
      gap: 20px;
      flex-wrap: wrap;
      width: 100%;
    }
    .export-card {
      width: 160px;
      height: 160px;
      border-radius: 8px;
      padding: 0;
      box-shadow: 0 3px 8px rgba(0,0,0,0.15);
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
    }
    .export-card-info {
      background-color: rgba(255, 255, 255, 0.9);
      padding: 10px;
      border-radius: 0 0 8px 8px;
      font-size: 12px;
    }
    .export-hex {
      font-weight: bold;
      font-size: 14px;
      margin-bottom: 3px;
    }
    .export-card-note {
      font-style: italic;
      margin-top: 4px;
      font-size: 11px;
      color: #666;
    }
  `;
  exportContainer.appendChild(style);
  
  // 将容器添加到文档中（但不可见）
  document.body.appendChild(exportContainer);
  exportContainer.style.position = 'absolute';
  exportContainer.style.left = '-9999px';
  
  // 使用html2canvas将容器转换为图片
  import('html2canvas').then(html2canvasModule => {
    const html2canvas = html2canvasModule.default;
    
    html2canvas(exportContainer, {
      backgroundColor: '#ffffff',
      scale: 2, // 提高导出图片质量
      logging: false,
      allowTaint: true,
      useCORS: true
    }).then(canvas => {
      // 创建下载链接
      const link = document.createElement('a');
      link.download = `色卡_${new Date().toISOString().slice(0, 10)}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      
      // 清理DOM
      document.body.removeChild(exportContainer);
    }).catch(error => {
      console.error('导出图片失败:', error);
      showToast('导出图片失败，请稍后再试', 'error');
      document.body.removeChild(exportContainer);
    });
  }).catch(() => {
    showToast('正在加载导出功能，请稍后再试...', 'error');
    document.body.removeChild(exportContainer);
  });
};

onMounted(() => {
  // 初始化操作
  handleHexChange();
});
</script>

<style scoped>
.color-card-container {
  max-width: 1200px;
  margin: 0 auto;
  margin-top: 30px;
  padding: 20px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  color: #333;
  background-color: #f8f9fa;
  border-radius: 12px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
}

h1, h2 {
  color: #2c3e50;
  margin-bottom: 20px;
  font-weight: 600;
}

h1 {
  text-align: center;
  font-size: 2.2rem;
  margin-bottom: 30px;
  background: linear-gradient(45deg, #3498db, #9b59b6);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  padding: 10px 0;
}

h2 {
  font-size: 1.5rem;
  border-bottom: 2px solid #e0e0e0;
  padding-bottom: 10px;
  margin-top: 0;
}

/* 新的左右布局 */
.main-layout {
  display: flex;
  gap: 25px;
}

.left-panel {
  flex: 0 0 350px;
}

.right-panel {
  flex: 1;
  min-width: 300px;
}

.tool-panel {
  background-color: white;
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.08);
}

.panel-section {
  padding: 15px;
  background-color: #f9f9f9;
  border-radius: 8px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.03);
  margin-bottom: 20px;
}

.panel-section:last-child {
  margin-bottom: 0;
}

.input-method-selector {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
  flex-wrap: wrap;
}

.input-method {
  padding: 8px 15px;
  background-color: #f1f1f1;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
  flex: 1;
  min-width: 60px;
  text-align: center;
}

.input-method:hover {
  background-color: #e0e0e0;
}

.input-method.active {
  background-color: #3498db;
  color: white;
  box-shadow: 0 2px 5px rgba(52, 152, 219, 0.3);
}

.input-group {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 10px;
  align-items: center;
  margin-bottom: 15px;
  padding: 10px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.input-group label {
  font-weight: 500;
  color: #555;
  min-width: 30px;
}

.input-group input[type="text"],
.input-group input[type="number"] {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  transition: border 0.2s;
}

.input-group input[type="text"]:focus,
.input-group input[type="number"]:focus {
  border-color: #3498db;
  outline: none;
  box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
}

.color-input-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
  position: relative;
}

.color-picker.modern-picker {
  width: 40px;
  height: 40px;
  border: #3498db 2px solid;
  border-radius: 50%;
  overflow: hidden;
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
  padding: 0;
  background: none;
}

.color-picker.modern-picker::-webkit-color-swatch-wrapper {
  padding: 0;
}

.color-picker.modern-picker::-webkit-color-swatch {
  border: none;
  border-radius: 50%;
  box-shadow: 0 0 0 2px white, 0 0 0 3px #ddd;
}

.color-preview {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  align-self: self-end;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1), 0 2px 5px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s;
}

.color-preview:hover {
  transform: scale(1.1);
}

.note-input {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 10px;
  align-items: center;
  margin-bottom: 15px;
  padding: 10px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.note-input input {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
}

.add-button {
  width: 100%;
  padding: 12px;
  background: linear-gradient(45deg, #3498db, #2980b9);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 10px;
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.1);
}

.add-button:hover {
  background: linear-gradient(45deg, #2980b9, #3498db);
  transform: translateY(-2px);
  box-shadow: 0 5px 10px rgba(0, 0, 0, 0.15);
}

.add-button:active {
  transform: translateY(0);
}

.color-count-control,
.layout-control,
.global-note {
  margin-bottom: 20px;
  padding: 15px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.color-count-control {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.color-count-control label {
  font-weight: 600;
  color: #333;
}

.preset-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 15px;
}

.preset-buttons {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.preset-btn {
  flex: 1;
  min-width: 40px;
  padding: 8px 0;
  background-color: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.preset-btn:hover {
  background-color: #e9e9e9;
  border-color: #ccc;
}

.preset-btn:active {
  background-color: #3498db;
  color: white;
  border-color: #3498db;
}

.custom-count-input {
  width: 100%;
}

.custom-input {
  width: 100%;
  padding: 8px 0;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  text-align: center;
}

.layout-control {
  display: flex;
  align-items: center;
  gap: 10px;
}

.layout-control button,
.color-count-control button {
  padding: 8px 15px;
  background-color: #f1f1f1;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.layout-control button:hover,
.color-count-control button:hover {
  background-color: #e0e0e0;
}

.layout-control button.active {
  background-color: #3498db;
  color: white;
}

.export-settings-row {
  display: flex;
  gap: 20px;
  margin-bottom: 15px;
}

.global-note {
  display: grid;
  grid-template-rows: auto 1fr;
  gap: 10px;
  flex: 1;
}

.export-material-setting {
  flex: 1;
}

.global-note textarea {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  resize: vertical;
  min-height: 80px;
  font-family: inherit;
}

.global-note label::after,
.export-material-setting label::after {
  content: ' *';
  color: #e74c3c;
  font-weight: bold;
}

.alpha-input-container {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
}

.alpha-value-input {
  display: flex;
  align-items: center;
  min-width: 60px;
}

.alpha-percentage-input {
  width: 40px;
  text-align: right;
  padding: 4px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

/* 导出设置样式 */
.export-row-setting,
.export-material-setting {
  margin-bottom: 15px;
}

.export-row-setting label,
.export-material-setting label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
}

.styled-select {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background-color: white;
  font-size: 14px;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23555' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  cursor: pointer;
  transition: border-color 0.2s;
}

.styled-select:hover {
  border-color: #aaa;
}

.styled-select:focus {
  border-color: #9b59b6;
  outline: none;
  box-shadow: 0 0 0 2px rgba(155, 89, 182, 0.2);
}

.material-select-container {
  position: relative;
}

.material-search-input {
  width: 90%;
  padding: 10px 0px;
  padding-left: 15px; /* 增加左侧内边距 */
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.material-search-input::placeholder {
  color: #999; /* 设置placeholder颜色 */
}

.material-search-input:hover {
  border-color: #aaa;
}

.material-search-input:focus {
  border-color: #9b59b6;
  outline: none;
  box-shadow: 0 0 0 2px rgba(155, 89, 182, 0.2);
}

.material-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  max-height: 200px;
  overflow-y: auto;
  background-color: white;
  border: 1px solid #ddd;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 100;
}

.material-option {
  padding: 10px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.material-option:hover {
  background-color: #f0f0f0;
}

.export-control {
  text-align: center;
}

.export-button {
  padding: 12px 25px;
  background: linear-gradient(45deg, #9b59b6, #8e44ad);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.1);
}

.export-button:hover {
  background: linear-gradient(45deg, #8e44ad, #9b59b6);
  transform: translateY(-2px);
  box-shadow: 0 5px 10px rgba(0, 0, 0, 0.15);
}

.color-cards-display {
  display: grid;
  gap: 20px;
  margin-top: 30px;
}

.color-cards-display.grid {
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
}

.color-cards-display.row {
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
}

.color-card {
  position: relative;
  height: 180px;
  border-radius: 10px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  overflow: hidden;
  transition: all 0.3s ease;
}

.color-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
}

.color-card.locked {
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1), 0 0 0 3px #f39c12;
}

.color-info {
  background-color: rgba(255, 255, 255, 0.9);
  padding: 12px;
  border-radius: 8px 8px 0 0;
  backdrop-filter: blur(5px);
  transition: transform 0.3s;
  color: #333;
  text-align: left;
}

.color-card:hover .color-info {
  transform: translateY(0);
}

.color-hex {
  font-weight: bold;
  font-size: 16px;
  margin-bottom: 5px;
}

.color-rgb, .color-cmyk {
  font-size: 12px;
  color: #555;
  margin-bottom: 3px;
}

.color-note {
  font-style: italic;
  font-size: 12px;
  color: #777;
  margin-top: 5px;
  border-top: 1px dashed #ddd;
  padding-top: 5px;
}

.card-actions {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  gap: 5px;
  opacity: 0;
  transition: opacity 0.2s;
}

.color-card:hover .card-actions {
  opacity: 1;
}

.action-btn {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: none;
  background-color: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(5px);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  transition: all 0.2s;
}

.action-btn:hover {
  background-color: white;
  transform: scale(1.1);
}

/* 复制通知样式 */
.copy-notification {
  position: fixed;
  bottom: 20px;
  left: 20px;
  background-color: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 0;
  border-radius: 8px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
  z-index: 9999;
  transform: translateY(100px);
  opacity: 0;
  transition: all 0.3s ease;
}

.copy-notification.show {
  transform: translateY(0);
  opacity: 1;
}

.copy-notification.hide {
  transform: translateY(100px);
  opacity: 0;
}

.notification-content {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  gap: 10px;
}

.color-dot {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid white;
}

/* 高端提示框样式 */
.custom-toast {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  min-width: 320px;
  max-width: 500px;
  backdrop-filter: blur(20px);
  border-radius: 16px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.1);
  animation: toastSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;
}

.toast-content {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  gap: 12px;
}

.toast-success {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.95) 0%, rgba(21, 128, 61, 0.95) 100%);
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.toast-error {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.95) 0%, rgba(185, 28, 28, 0.95) 100%);
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.toast-icon {
  width: 24px;
  height: 24px;
  color: white;
  flex-shrink: 0;
}

.toast-icon svg {
  width: 100%;
  height: 100%;
}

.toast-message {
  color: white;
  font-size: 15px;
  font-weight: 500;
  line-height: 1.4;
  flex: 1;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.toast-close {
  width: 20px;
  height: 20px;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.toast-close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  transform: scale(1.1);
}

.toast-close svg {
  width: 14px;
  height: 14px;
}

@keyframes toastSlideIn {
  from {
    transform: translateX(100%) scale(0.9);
    opacity: 0;
  }
  to {
    transform: translateX(0) scale(1);
    opacity: 1;
  }
}

/* 响应式布局调整 */
@media (max-width: 900px) {
  .main-layout {
    flex-direction: column;
  }
  
  .left-panel {
    flex: 0 0 100%;
  }
  
  .right-panel {
    width: 100%;
  }
}

@media (max-width: 768px) {
  .tool-panel {
    grid-template-columns: 1fr;
  }
  
  .color-cards-display.grid,
  .color-cards-display.row {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  }
  
  .custom-toast {
    top: 10px;
    right: 10px;
    left: 10px;
    min-width: auto;
    max-width: none;
  }
  
  .toast-content {
    padding: 14px 16px;
  }
  
  .toast-message {
    font-size: 14px;
  }
}

@media (max-width: 600px) {
  .color-cards-display {
    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  }
  
  .input-group {
    grid-template-columns: 1fr;
  }
  
  .color-count-control {
    grid-template-columns: 1fr;
  }
  
  h1 {
    font-size: 1.8rem;
  }
}
</style>