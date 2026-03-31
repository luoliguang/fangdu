<template>
  <div class="color-card-container">
    <!-- 优化的标题区域 -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-icon">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 8 6.5 8 8 8.67 8 9.5 7.33 11 6.5 11zm3-4C8.67 7 8 6.33 8 5.5S8.67 4 9.5 4s1.5.67 1.5 1.5S10.33 7 9.5 7zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 4 14.5 4s1.5.67 1.5 1.5S15.33 7 14.5 7zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 8 17.5 8s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" fill="currentColor"/>
          </svg>
        </div>
        <div class="header-text">
          <h1>打色卡工具</h1>
          <p class="header-description">专业的色彩管理工具，支持多种色彩空间转换和配色方案生成</p>
        </div>
      </div>
      <div class="header-actions">
        <el-button type="primary" plain @click="resetAll" :icon="RefreshRight">
          重置全部
        </el-button>
      </div>
    </div>
    
    <div class="main-layout">
      <!-- 左侧面板：色值输入和设置 -->
      <div class="left-panel">
        <div class="tool-panel">
          <!-- 色值输入面板 -->
          <div class="panel-section">
            <div class="section-header">
              <h2>色值输入</h2>
              <div class="quick-colors">
                <span class="quick-label">快捷色:</span>
                <div class="quick-color-list">
                  <button 
                    v-for="color in quickColors" 
                    :key="color.hex"
                    class="quick-color-btn"
                    :style="{ backgroundColor: color.hex }"
                    :title="color.name"
                    @click="selectQuickColor(color)"
                  />
                </div>
              </div>
            </div>
            
            <div class="input-method-tabs">
              <button 
                v-for="method in inputMethods"
                :key="method.value"
                :class="['tab-btn', { active: inputMethod === method.value }]" 
                @click="inputMethod = method.value"
              >
                <span class="tab-icon">{{ method.icon }}</span>
                {{ method.label }}
              </button>
            </div>
            
            <!-- HEX输入 -->
            <div v-if="inputMethod === 'hex'" class="input-group">
              <label>HEX值</label>
              <div class="color-input-wrapper">
                <input 
                  type="text" 
                  v-model="currentColor.hex" 
                  @input="handleHexChange"
                  placeholder="#FFFFFF"
                  class="hex-input"
                />
                <div class="color-picker-wrapper">
                  <input 
                    type="color" 
                    v-model="currentColor.hex" 
                    @input="handleHexChange"
                    class="color-picker"
                  />
                </div>
              </div>
              
              <!-- 透明度滑块 -->
              <div class="alpha-slider-container">
                <div class="alpha-header">
                  <label>透明度</label>
                  <div class="alpha-value">
                    <input 
                      type="number" 
                      v-model.number="alphaPercentage" 
                      @input="updateAlphaFromPercentage"
                      min="0" 
                      max="100"
                      class="alpha-input"
                    />
                    <span>%</span>
                  </div>
                </div>
                <el-slider 
                  v-model="currentColor.alpha" 
                  :min="0" 
                  :max="1" 
                  :step="0.01"
                  @input="handleAlphaChange"
                  :show-tooltip="false"
                />
              </div>
              
              <div class="color-preview-row">
                <div 
                  class="color-preview" 
                  :style="{ backgroundColor: getColorWithAlpha(currentColor) }"
                ></div>
                <div class="preview-info">
                  <span class="preview-label">预览</span>
                  <span class="preview-value">{{ getColorWithAlpha(currentColor) }}</span>
                </div>
              </div>
            </div>
            
            <!-- RGB输入 -->
            <div v-if="inputMethod === 'rgb'" class="input-group rgb-inputs">
              <div class="rgb-slider-group">
                <label>
                  <span class="channel-label r">R</span>
                </label>
                <div class="slider-container">
                  <el-slider 
                    v-model="currentColor.rgb.r" 
                    :min="0" 
                    :max="255"
                    :show-tooltip="false"
                    :format-tooltip="val => val"
                    @input="handleRgbChange"
                  />
                </div>
                <input 
                  type="number" 
                  v-model.number="currentColor.rgb.r" 
                  @input="handleRgbChange"
                  min="0" 
                  max="255"
                  class="channel-input"
                />
              </div>
              
              <div class="rgb-slider-group">
                <label>
                  <span class="channel-label g">G</span>
                </label>
                <div class="slider-container">
                  <el-slider 
                    v-model="currentColor.rgb.g" 
                    :min="0" 
                    :max="255"
                    :show-tooltip="false"
                    @input="handleRgbChange"
                  />
                </div>
                <input 
                  type="number" 
                  v-model.number="currentColor.rgb.g" 
                  @input="handleRgbChange"
                  min="0" 
                  max="255"
                  class="channel-input"
                />
              </div>
              
              <div class="rgb-slider-group">
                <label>
                  <span class="channel-label b">B</span>
                </label>
                <div class="slider-container">
                  <el-slider 
                    v-model="currentColor.rgb.b" 
                    :min="0" 
                    :max="255"
                    :show-tooltip="false"
                    @input="handleRgbChange"
                  />
                </div>
                <input 
                  type="number" 
                  v-model.number="currentColor.rgb.b" 
                  @input="handleRgbChange"
                  min="0" 
                  max="255"
                  class="channel-input"
                />
              </div>
              
              <div class="alpha-slider-container">
                <label>透明度</label>
                <el-slider 
                  v-model="currentColor.alpha" 
                  :min="0" 
                  :max="1" 
                  :step="0.01"
                  @input="handleAlphaChange"
                  :show-tooltip="false"
                />
                <div class="alpha-value">
                  <input 
                    type="number" 
                    v-model.number="alphaPercentage" 
                    @input="updateAlphaFromPercentage"
                    min="0" 
                    max="100"
                    class="alpha-input"
                  />
                  <span>%</span>
                </div>
              </div>
              
              <div class="color-preview-row">
                <div 
                  class="color-preview" 
                  :style="{ backgroundColor: getColorWithAlpha(currentColor) }"
                ></div>
              </div>
            </div>
            
            <!-- Lab输入 -->
            <div v-if="inputMethod === 'lab'" class="input-group lab-inputs">
              <div class="lab-grid">
                <div class="lab-item">
                  <label>L</label>
                  <input 
                    type="number" 
                    v-model.number="currentColor.lab.L" 
                    @input="handleLabChange"
                    min="0" 
                    max="100"
                  />
                </div>
                <div class="lab-item">
                  <label>a</label>
                  <input 
                    type="number" 
                    v-model.number="currentColor.lab.a" 
                    @input="handleLabChange"
                    min="-128" 
                    max="127"
                  />
                </div>
                <div class="lab-item">
                  <label>b</label>
                  <input 
                    type="number" 
                    v-model.number="currentColor.lab.b" 
                    @input="handleLabChange"
                    min="-128" 
                    max="127"
                  />
                </div>
              </div>
              
              <div class="color-preview-row">
                <div 
                  class="color-preview" 
                  :style="{ backgroundColor: currentColor.hex }"
                ></div>
              </div>
            </div>
            
            <!-- 备注输入 -->
            <div class="note-input">
              <label>备注</label>
              <input 
                type="text" 
                v-model="currentColor.note" 
                placeholder="针对单个色卡备注（可选）"
              />
            </div>
            
            <button class="add-button" @click="addColorCard">
              <svg viewBox="0 0 24 24" fill="none" class="btn-icon">
                <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
              添加到色卡列表
            </button>
          </div>
          
          <!-- 色卡生成设置面板 -->
          <div class="panel-section">
            <h2>生成配色方案</h2>
            
            <div class="generation-options">
              <div class="option-group">
                <label>配色方案类型</label>
                <el-select v-model="colorScheme" class="scheme-select" @change="handleSchemeChange">
                  <el-option
                    v-for="scheme in colorSchemes"
                    :key="scheme.value"
                    :label="scheme.label"
                    :value="scheme.value"
                  >
                    <div class="scheme-option">
                      <span class="scheme-name">{{ scheme.label }}</span>
                      <span class="scheme-desc">{{ scheme.description }}</span>
                    </div>
                  </el-option>
                </el-select>
              </div>
              
              <div class="option-group" v-if="colorScheme === 'shades'">
                <label>深浅程度</label>
                <div class="shade-options">
                  <button 
                    v-for="shade in shadeOptions"
                    :key="shade.value"
                    :class="['shade-btn', { active: shadeMode === shade.value }]"
                    @click="shadeMode = shade.value"
                  >
                    {{ shade.label }}
                  </button>
                </div>
              </div>
              
              <div class="option-group" v-if="colorScheme === 'customHue'">
                <label>色相偏移角度</label>
                <div class="hue-control">
                  <el-slider 
                    v-model.number="hueOffset" 
                    :min="-180" 
                    :max="180"
                    :show-tooltip="true"
                    :format-tooltip="val => val + '°'"
                  />
                </div>
              </div>
              
              <div class="option-group">
                <label>生成数量</label>
                <div class="count-control">
                  <el-select v-model.number="colorCount" class="count-select">
                    <el-option
                      v-for="n in 50"
                      :key="n"
                      :label="n + ' 个'"
                      :value="n"
                    />
                  </el-select>
                </div>
              </div>
            </div>
            
            <button class="generate-btn" @click="generateColorScheme">
              <svg viewBox="0 0 24 24" fill="none" class="btn-icon">
                <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
              生成配色方案
            </button>
            
            <div class="layout-toggle">
              <span class="toggle-label">布局</span>
              <div class="toggle-buttons">
                <button 
                  :class="['toggle-btn', { active: layoutMode === 'grid' }]" 
                  @click="layoutMode = 'grid'"
                >
                  <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
                    <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2"/>
                    <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2"/>
                    <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2"/>
                    <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2"/>
                  </svg>
                </button>
                <button 
                  :class="['toggle-btn', { active: layoutMode === 'row' }]" 
                  @click="layoutMode = 'row'"
                >
                  <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
                    <rect x="3" y="9" width="18" height="6" rx="1" stroke="currentColor" stroke-width="2"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
          
          <!-- 导出设置面板 -->
          <div class="panel-section">
            <h2>导出设置</h2>
            
            <div class="export-form">
              <div class="form-row">
                <div class="form-group">
                  <label>备注 <span class="required">*</span></label>
                  <textarea 
                    v-model="globalNote" 
                    placeholder="请填写备注信息，方便识别"
                    rows="2"
                  ></textarea>
                </div>
              </div>
              
              <div class="form-row">
                <div class="form-group">
                  <label>面料 <span class="required">*</span></label>
                  <el-select
                    v-model="selectedMaterial"
                    filterable
                    allow-create
                    default-first-option
                    placeholder="选择或输入面料"
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
              
              <div class="form-row">
                <div class="form-group inline">
                  <label>每行色卡数</label>
                  <el-select v-model.number="cardsPerRowExport" class="row-select">
                    <el-option
                      v-for="n in 10"
                      :key="n"
                      :label="n"
                      :value="n"
                    />
                  </el-select>
                </div>
              </div>
              
              <div class="form-row">
                <div class="form-group">
                  <label>导出图片时显示色值</label>
                  <div class="export-color-options">
                    <label class="checkbox-label">
                      <input type="checkbox" v-model="exportShowHex" />
                      <span>HEX</span>
                    </label>
                    <label class="checkbox-label">
                      <input type="checkbox" v-model="exportShowRgb" />
                      <span>RGB</span>
                    </label>
                    <label class="checkbox-label">
                      <input type="checkbox" v-model="exportShowLab" />
                      <span>Lab</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
            
            <button class="export-button" @click="exportColorCards">
              <svg viewBox="0 0 24 24" fill="none" class="btn-icon">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              导出色卡图片
            </button>
          </div>
        </div>
      </div>
      
      <!-- 右侧面板：色卡展示 -->
      <div class="right-panel">
        <div class="display-header">
          <h3>色卡列表</h3>
          <div class="display-stats">
            <span class="stat-item">
              <svg viewBox="0 0 24 24" fill="none" width="14" height="14">
                <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
              </svg>
              {{ totalCards }} 个
            </span>
            <el-switch
              v-model="showColorValues"
              active-text="显示色值"
              inactive-text="隐藏色值"
              class="value-switch"
            />
          </div>
        </div>
        
        <div class="color-cards-display" :class="layoutMode">
          <!-- 当前编辑的颜色 -->
          <div 
            class="color-card current-card"
            :style="{ backgroundColor: getColorWithAlpha(currentColor) }"
          >
            <div class="card-badge">当前</div>
            <div class="color-info" v-if="showColorValues">
              <div class="color-hex">{{ currentColor.hex }}</div>
              <div class="color-rgb">RGB: {{ currentColor.rgb.r }}, {{ currentColor.rgb.g }}, {{ currentColor.rgb.b }}</div>
              <div class="color-lab">Lab: {{ currentColor.lab.L }}, {{ currentColor.lab.a }}, {{ currentColor.lab.b }}</div>
              <div class="color-note">{{ currentColor.note || '当前编辑' }}</div>
            </div>
          </div>
          
          <!-- 已添加的色卡 -->
          <div 
            v-for="card in colorCards" 
            :key="card.id" 
            class="color-card"
            :class="{ 'locked': card.locked }"
            :style="{ backgroundColor: getColorWithAlpha(card) }"
          >
            <div class="card-actions">
              <button @click="toggleLock(card.id)" class="action-btn" :title="card.locked ? '解锁' : '锁定'">
                <svg v-if="card.locked" viewBox="0 0 24 24" fill="none" width="14" height="14">
                  <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" stroke-width="2"/>
                  <path d="M8 11V7a4 4 0 118 0v4" stroke="currentColor" stroke-width="2"/>
                </svg>
                <svg v-else viewBox="0 0 24 24" fill="none" width="14" height="14">
                  <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" stroke-width="2"/>
                  <path d="M8 11V7a4 4 0 018 0" stroke="currentColor" stroke-width="2"/>
                </svg>
              </button>
              <button @click="copyColor(card.hex)" class="action-btn" title="复制">
                <svg viewBox="0 0 24 24" fill="none" width="14" height="14">
                  <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2"/>
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" stroke-width="2"/>
                </svg>
              </button>
              <button @click="editColor(card)" class="action-btn" title="编辑">
                <svg viewBox="0 0 24 24" fill="none" width="14" height="14">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" stroke-width="2"/>
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="2"/>
                </svg>
              </button>
              <button @click="removeColorCard(card.id)" class="action-btn delete" title="删除">
                <svg viewBox="0 0 24 24" fill="none" width="14" height="14">
                  <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" stroke="currentColor" stroke-width="2"/>
                </svg>
              </button>
            </div>
            <div class="color-info" v-if="showColorValues">
              <div class="color-hex">{{ card.hex }}</div>
              <div class="color-rgb">RGB: {{ card.rgb.r }}, {{ card.rgb.g }}, {{ card.rgb.b }}</div>
              <div class="color-lab">Lab: {{ card.lab.L }}, {{ card.lab.a }}, {{ card.lab.b }}</div>
              <div v-if="card.note" class="color-note">{{ card.note }}</div>
            </div>
          </div>
          
          <!-- 空状态 -->
          <div v-if="colorCards.length === 0" class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" width="48" height="48">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8z" stroke="currentColor" stroke-width="1.5"/>
            </svg>
            <p>暂无色卡</p>
            <span>请添加颜色或生成配色方案</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Toast 提示 -->
    <Transition name="toast">
      <div v-if="showToastState" class="custom-toast" :class="`toast-${toastType}`">
        <div class="toast-content">
          <div class="toast-icon">
            <svg v-if="toastType === 'success'" viewBox="0 0 24 24" fill="none">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <svg v-else viewBox="0 0 24 24" fill="none">
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <span class="toast-message">{{ toastMessage }}</span>
          <button @click="showToastState = false" class="toast-close">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import chroma from 'chroma-js';
import { ElSlider, ElButton, ElSelect, ElOption, ElSwitch } from 'element-plus';
import { RefreshRight } from '@element-plus/icons-vue';

// ========== Toast 提示 ==========
const showToastState = ref(false);
const toastMessage = ref('');
const toastType = ref('success');

const showToast = (message, type = 'success') => {
  toastMessage.value = message;
  toastType.value = type;
  showToastState.value = true;
  setTimeout(() => {
    showToastState.value = false;
  }, 2500);
};

// ========== 输入方式定义 ==========
const inputMethods = [
  { value: 'hex', label: 'HEX', icon: '#' },
  { value: 'rgb', label: 'RGB', icon: 'RGB' },
  { value: 'lab', label: 'Lab', icon: 'Lab' }
];

// ========== 快捷颜色 ==========
const quickColors = [
  { name: '纯红', hex: '#FF0000', rgb: {r: 255, g: 0, b: 0} },
  { name: '橙色', hex: '#FF7F00', rgb: {r: 255, g: 127, b: 0} },
  { name: '黄色', hex: '#FFFF00', rgb: {r: 255, g: 255, b: 0} },
  { name: '绿色', hex: '#00FF00', rgb: {r: 0, g: 255, b: 0} },
  { name: '青色', hex: '#00FFFF', rgb: {r: 0, g: 255, b: 255} },
  { name: '蓝色', hex: '#0000FF', rgb: {r: 0, g: 0, b: 255} },
  { name: '紫色', hex: '#FF00FF', rgb: {r: 255, g: 0, b: 255} },
  { name: '粉色', hex: '#FF69B4', rgb: {r: 255, g: 105, b: 180} },
  { name: '棕色', hex: '#8B4513', rgb: {r: 139, g: 69, b: 19} },
  { name: '灰色', hex: '#808080', rgb: {r: 128, g: 128, b: 128} },
  { name: '黑色', hex: '#000000', rgb: {r: 0, g: 0, b: 0} },
  { name: '白色', hex: '#FFFFFF', rgb: {r: 255, g: 255, b: 255} }
];

// ========== 配色方案定义 ==========
const colorSchemes = [
  { value: 'shades', label: '深浅渐变', description: '从浅到深的同色系渐变' },
  { value: 'complementary', label: '互补色', description: '180°色相环对立颜色' },
  { value: 'triadic', label: '三色组', description: '120°等距的三种颜色' },
  { value: 'analogous', label: '类似色', description: '30°相邻的和谐配色' },
  { value: 'splitComplementary', label: '分裂互补', description: '互补色两侧的两种颜色' },
  { value: 'tetradic', label: '四色组', description: '90°等距的四种颜色' },
  { value: 'monochromatic', label: '单色系', description: '同色相不同饱和度' },
  { value: 'customHue', label: '自定义色相', description: '自定义色相偏移角度' }
];

// ========== 深浅选项 ==========
const shadeOptions = [
  { value: 'both', label: '浅-深' },
  { value: 'light', label: '仅浅色' },
  { value: 'dark', label: '仅深色' }
];

// ========== 面料选项 ==========
const materialOptions = [
  '速干', '莫代尔', '210克速干', '珠地', '仿棉', '260克莫代尔', 
  '260克珠地', '冰丝蝴蝶网', '小方格', '水蜜桃', '复合', 'T400', 
  '斜纹', '健康布', '银狐绒', '罗马布', '空气层', '牛奶丝'
];

// ========== 状态定义 ==========
const inputMethod = ref('hex');
const colorScheme = ref('shades');
const shadeMode = ref('both');
const hueOffset = ref(30);
const colorCount = ref(5);
const colorCards = ref([]);
const showColorValues = ref(true);
const layoutMode = ref('grid');
const globalNote = ref('');
const selectedMaterial = ref('');
const cardsPerRowExport = ref(5);

// 导出时显示的色值选项
const exportShowHex = ref(true);
const exportShowRgb = ref(true);
const exportShowLab = ref(true);

// ========== 当前编辑颜色 ==========
const currentColor = reactive({
  hex: '#3498DB',
  rgb: {r: 52, g: 152, b: 219},
  lab: {L: 60, a: -7, b: -41},
  note: '',
  alpha: 1
});

// ========== 计算属性 ==========
const alphaPercentage = computed({
  get: () => Math.round(currentColor.alpha * 100),
  set: (value) => {
    currentColor.alpha = Math.max(0, Math.min(1, value / 100));
  }
});

const totalCards = computed(() => colorCards.value.length + 1);

// ========== 快捷颜色选择 ==========
const selectQuickColor = (color) => {
  currentColor.hex = color.hex;
  currentColor.rgb = {...color.rgb};
  handleHexChange();
};

// ========== 颜色转换函数 ==========
const updateRgbFromHex = (hex) => {
  try {
    const color = chroma(hex);
    const [r, g, b] = color.rgb();
    return { r: Math.round(r), g: Math.round(g), b: Math.round(b) };
  } catch {
    hex = hex.replace('#', '');
    return {
      r: parseInt(hex.substring(0, 2), 16) || 0,
      g: parseInt(hex.substring(2, 4), 16) || 0,
      b: parseInt(hex.substring(4, 6), 16) || 0
    };
  }
};

const updateHexFromRgb = (r, g, b) => {
  return `#${Math.round(r).toString(16).padStart(2, '0')}${Math.round(g).toString(16).padStart(2, '0')}${Math.round(b).toString(16).padStart(2, '0')}`.toUpperCase();
};

const updateLabFromRgb = (r, g, b) => {
  try {
    const lab = chroma(r, g, b).lab();
    return {
      L: Math.round(lab[0]),
      a: Math.round(lab[1]),
      b: Math.round(lab[2])
    };
  } catch {
    return { L: 50, a: 0, b: 0 };
  }
};

const getColorWithAlpha = (color) => {
  const rgb = color.rgb;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${color.alpha})`;
};

// ========== 事件处理 ==========
const handleHexChange = () => {
  const rgb = updateRgbFromHex(currentColor.hex);
  currentColor.rgb = rgb;
  currentColor.lab = updateLabFromRgb(rgb.r, rgb.g, rgb.b);
};

const handleRgbChange = () => {
  const {r, g, b} = currentColor.rgb;
  currentColor.hex = updateHexFromRgb(r, g, b);
  currentColor.lab = updateLabFromRgb(r, g, b);
};

const handleLabChange = () => {
  try {
    const rgb = chroma.lab(currentColor.lab.L, currentColor.lab.a, currentColor.lab.b).rgb();
    currentColor.rgb = { r: Math.round(rgb[0]), g: Math.round(rgb[1]), b: Math.round(rgb[2]) };
    const {r, g, b} = currentColor.rgb;
    currentColor.hex = updateHexFromRgb(r, g, b);
  } catch (error) {
    console.error('Lab转换错误:', error);
  }
};

const handleAlphaChange = () => {
  // 透明度变化时不需要额外处理
};

const updateAlphaFromPercentage = () => {
  currentColor.alpha = Math.max(0, Math.min(1, alphaPercentage.value / 100));
};

const handleSchemeChange = () => {
  // 切换配色方案时触发
};

// ========== 添加色卡 ==========
const addColorCard = () => {
  const isDuplicate = colorCards.value.some(
    card => card.hex.toLowerCase() === currentColor.hex.toLowerCase()
  );
  
  if (isDuplicate) {
    showToast('已存在相同色值，不能重复添加', 'error');
    return;
  }
  
  const newId = colorCards.value.length > 0 
    ? Math.max(...colorCards.value.map(card => card.id)) + 1 
    : 1;
  
  colorCards.value.push({
    id: newId,
    hex: currentColor.hex,
    rgb: {...currentColor.rgb},
    lab: {...currentColor.lab},
    note: currentColor.note,
    locked: false,
    alpha: currentColor.alpha
  });
  
  showToast('添加成功', 'success');
};

// ========== 删除色卡 ==========
const removeColorCard = (id) => {
  const index = colorCards.value.findIndex(card => card.id === id);
  if (index !== -1) {
    colorCards.value.splice(index, 1);
    showToast('删除成功', 'success');
  }
};

// ========== 锁定/解锁 ==========
const toggleLock = (id) => {
  const card = colorCards.value.find(card => card.id === id);
  if (card) {
    card.locked = !card.locked;
  }
};

// ========== 编辑颜色 ==========
const editColor = (card) => {
  currentColor.hex = card.hex;
  currentColor.rgb = {...card.rgb};
  currentColor.lab = {...card.lab};
  currentColor.note = card.note;
  currentColor.alpha = card.alpha;
  showToast('已加载到编辑区', 'success');
};

// ========== 复制色值 ==========
const copyColor = (hex) => {
  navigator.clipboard.writeText(hex).then(() => {
    showToast(`已复制: ${hex}`, 'success');
  });
};

// ========== 重置 ==========
const resetAll = () => {
  colorCards.value = [];
  currentColor.hex = '#3498DB';
  currentColor.rgb = {r: 52, g: 152, b: 219};
  currentColor.lab = {L: 60, a: -7, b: -41};
  currentColor.note = '';
  currentColor.alpha = 1;
  globalNote.value = '';
  selectedMaterial.value = '';
  showToast('已重置', 'success');
};

// ========== 生成配色方案 ==========
const generateColorScheme = () => {
  const baseColor = currentColor.hex;
  const count = colorCount.value;
  
  try {
    let colors = [];
    
    switch (colorScheme.value) {
      case 'shades':
        colors = generateShades(baseColor, count, shadeMode.value);
        break;
      case 'complementary':
        colors = generateComplementary(baseColor, count);
        break;
      case 'triadic':
        colors = generateTriadic(baseColor, count);
        break;
      case 'analogous':
        colors = generateAnalogous(baseColor, count);
        break;
      case 'splitComplementary':
        colors = generateSplitComplementary(baseColor, count);
        break;
      case 'tetradic':
        colors = generateTetradic(baseColor, count);
        break;
      case 'monochromatic':
        colors = generateMonochromatic(baseColor, count);
        break;
      case 'customHue':
        colors = generateCustomHue(baseColor, count, hueOffset.value);
        break;
      default:
        colors = generateShades(baseColor, count, 'both');
    }
    
    // 清空现有色卡并添加新生成的
    colorCards.value = [];
    colors.forEach((color, index) => {
      const rgb = updateRgbFromHex(color);
      colorCards.value.push({
        id: index + 1,
        hex: color.toUpperCase(),
        rgb,
        lab: updateLabFromRgb(rgb.r, rgb.g, rgb.b),
        note: '',
        locked: false,
        alpha: currentColor.alpha
      });
    });
    
    showToast(`已生成 ${colors.length} 个配色方案`, 'success');
  } catch (error) {
    console.error('生成配色方案错误:', error);
    showToast('生成失败，请重试', 'error');
  }
};

// ========== 配色方案生成函数 ==========
const generateShades = (baseColor, count, mode) => {
  const colors = [];
  
  if (mode === 'light' || mode === 'both') {
    const lighterCount = mode === 'light' ? count : Math.floor(count / 2);
    for (let i = 1; i <= lighterCount; i++) {
      const factor = i / (lighterCount + 1);
      colors.push(chroma.mix(baseColor, '#FFFFFF', factor, 'rgb').hex());
    }
  }
  
  if (mode === 'dark' || mode === 'both') {
    const darkerCount = mode === 'dark' ? count : count - colors.length;
    for (let i = 1; i <= darkerCount; i++) {
      const factor = i / (darkerCount + 1);
      colors.push(chroma.mix(baseColor, '#000000', factor, 'rgb').hex());
    }
  }
  
  return colors;
};

const generateComplementary = (baseColor, count) => {
  const base = chroma(baseColor);
  const colors = [baseColor];
  
  const comp = base.set('hsl.h', (base.get('hsl.h') + 180) % 360);
  colors.push(comp.hex());
  
  // 添加中间过渡色
  if (count > 2) {
    const steps = count - 2;
    for (let i = 1; i <= steps; i++) {
      const factor = i / (steps + 1);
      colors.splice(1, 0, chroma.mix(base, comp, factor, 'hsl').hex());
    }
  }
  
  return colors.slice(0, count);
};

const generateTriadic = (baseColor, count) => {
  const base = chroma(baseColor);
  const h = base.get('hsl.h');
  const colors = [
    baseColor,
    base.set('hsl.h', (h + 120) % 360).hex(),
    base.set('hsl.h', (h + 240) % 360).hex()
  ];
  
  // 填充到指定数量
  while (colors.length < count) {
    colors.push(colors[colors.length % 3]);
  }
  
  return colors.slice(0, count);
};

const generateAnalogous = (baseColor, count) => {
  const base = chroma(baseColor);
  const h = base.get('hsl.h');
  const colors = [];
  const step = 30;
  
  const startIdx = Math.floor(-(count - 1) / 2);
  for (let i = 0; i < count; i++) {
    const newH = (h + (startIdx + i) * step + 360) % 360;
    colors.push(base.set('hsl.h', newH).hex());
  }
  
  return colors;
};

const generateSplitComplementary = (baseColor, count) => {
  const base = chroma(baseColor);
  const h = base.get('hsl.h');
  const colors = [
    baseColor,
    base.set('hsl.h', (h + 150) % 360).hex(),
    base.set('hsl.h', (h + 210) % 360).hex()
  ];
  
  while (colors.length < count) {
    colors.push(colors[colors.length % 3]);
  }
  
  return colors.slice(0, count);
};

const generateTetradic = (baseColor, count) => {
  const base = chroma(baseColor);
  const h = base.get('hsl.h');
  const colors = [
    baseColor,
    base.set('hsl.h', (h + 90) % 360).hex(),
    base.set('hsl.h', (h + 180) % 360).hex(),
    base.set('hsl.h', (h + 270) % 360).hex()
  ];
  
  while (colors.length < count) {
    colors.push(colors[colors.length % 4]);
  }
  
  return colors.slice(0, count);
};

const generateMonochromatic = (baseColor, count) => {
  const base = chroma(baseColor);
  const colors = [];
  
  for (let i = 0; i < count; i++) {
    const s = 1 - (i / (count - 1)) * 0.8;
    const l = 0.2 + (i / (count - 1)) * 0.6;
    colors.push(base.set('hsl.s', Math.max(0, s)).set('hsl.l', l).hex());
  }
  
  return colors;
};

const generateCustomHue = (baseColor, count, offset) => {
  const base = chroma(baseColor);
  const h = base.get('hsl.h');
  const colors = [baseColor];
  
  const newH = (h + offset + 360) % 360;
  colors.push(base.set('hsl.h', newH).hex());
  
  // 添加过渡色
  if (count > 2) {
    const steps = count - 2;
    for (let i = 1; i <= steps; i++) {
      const factor = i / (steps + 1);
      colors.splice(1, 0, chroma.mix(chroma(baseColor), chroma(colors[1]), factor, 'hsl').hex());
    }
  }
  
  return colors.slice(0, count);
};

// ========== 导出功能 ==========
const exportColorCards = () => {
  if (!globalNote.value.trim()) {
    showToast('请填写备注信息', 'error');
    return;
  }
  
  if (!selectedMaterial.value) {
    showToast('请选择面料', 'error');
    return;
  }
  
  const exportContainer = document.createElement('div');
  exportContainer.className = 'export-container';
  
  const header = document.createElement('div');
  header.className = 'export-header';
  header.innerHTML = `
    <h1>色卡</h1>
    <p class="export-note">${globalNote.value}</p>
    <p class="export-material">面料: ${selectedMaterial.value}</p>
    <p class="export-date">导出时间: ${new Date().toLocaleString()}</p>
  `;
  exportContainer.appendChild(header);
  
  const cardsContainer = document.createElement('div');
  cardsContainer.className = 'export-cards';
  
  const cardsToExport = [
    { ...currentColor, note: '当前色' },
    ...colorCards.value
  ];
  
  let currentRow = null;
  const cardsPerRow = cardsPerRowExport.value;
  
  cardsToExport.forEach((card, index) => {
    if (index % cardsPerRow === 0) {
      currentRow = document.createElement('div');
      currentRow.className = 'export-row';
      cardsContainer.appendChild(currentRow);
    }
    
    const cardElement = document.createElement('div');
    cardElement.className = 'export-card';
    cardElement.style.backgroundColor = card.hex;
    
    const cardInfo = document.createElement('div');
    cardInfo.className = 'export-card-info';
    
    // 根据用户选择构建显示的色值
    let colorValuesHTML = '';
    if (exportShowHex.value) {
      colorValuesHTML += `<div class="export-hex">${card.hex}</div>`;
    }
    if (exportShowRgb.value) {
      colorValuesHTML += `<div class="export-rgb">RGB: ${card.rgb.r}, ${card.rgb.g}, ${card.rgb.b}</div>`;
    }
    if (exportShowLab.value) {
      colorValuesHTML += `<div class="export-lab">Lab: ${card.lab.L}, ${card.lab.a}, ${card.lab.b}</div>`;
    }
    
    cardInfo.innerHTML = `
      ${colorValuesHTML}
      ${card.note ? `<div class="export-card-note">${card.note}</div>` : ''}
    `;
    
    cardElement.appendChild(cardInfo);
    currentRow.appendChild(cardElement);
  });
  
  exportContainer.appendChild(cardsContainer);
  
  const cardWidth = 160;
  const cardGap = 20;
  const containerPadding = 60;
  const containerWidth = cardWidth * cardsPerRow + (cardsPerRow - 1) * cardGap + containerPadding;
  
  const style = document.createElement('style');
  style.textContent = `
    .export-container { font-family: 'Segoe UI', sans-serif; padding: 30px; background: white; width: ${containerWidth}px; margin: 0 auto; }
    .export-header { text-align: center; margin-bottom: 30px; }
    .export-header h1 { font-size: 28px; color: #2c3e50; margin-bottom: 10px; }
    .export-note { font-size: 24px; font-style: italic; color: #333; margin-bottom: 8px; font-weight: bold; }
    .export-material { font-size: 20px; color: #555; margin-bottom: 8px; }
    .export-date { font-size: 14px; color: #999; }
    .export-cards { display: flex; flex-direction: column; gap: 20px; }
    .export-row { display: flex; justify-content: flex-start; gap: 20px; flex-wrap: wrap; width: 100%; }
    .export-card { width: 160px; height: 160px; border-radius: 8px; box-shadow: 0 3px 8px rgba(0,0,0,0.15); position: relative; display: flex; flex-direction: column; justify-content: flex-end; }
    .export-card-info { background: rgba(255,255,255,0.95); padding: 10px; border-radius: 0 0 8px 8px; font-size: 11px; }
    .export-hex { font-weight: bold; font-size: 13px; margin-bottom: 2px; }
    .export-rgb, .export-cmyk { color: #666; font-size: 10px; margin-bottom: 1px; }
    .export-card-note { font-style: italic; margin-top: 3px; font-size: 10px; color: #888; }
  `;
  exportContainer.appendChild(style);
  
  document.body.appendChild(exportContainer);
  exportContainer.style.position = 'absolute';
  exportContainer.style.left = '-9999px';
  
  import('html2canvas').then(html2canvasModule => {
    const html2canvas = html2canvasModule.default;
    
    html2canvas(exportContainer, {
      backgroundColor: '#ffffff',
      scale: 2,
      logging: false
    }).then(canvas => {
      const link = document.createElement('a');
      link.download = `色卡_${globalNote.value}_${new Date().toISOString().slice(0, 10)}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      
      document.body.removeChild(exportContainer);
      showToast('导出成功', 'success');
    }).catch(error => {
      console.error('导出失败:', error);
      showToast('导出失败，请重试', 'error');
      document.body.removeChild(exportContainer);
    });
  }).catch(() => {
    showToast('导出功能加载失败', 'error');
    document.body.removeChild(exportContainer);
  });
};

// ========== 初始化 ==========
onMounted(() => {
  // 处理初始颜色
  handleHexChange();
});
</script>

<style scoped>
.color-card-container {
  max-width: 1400px;
  margin: 0 auto;
  margin-top: 3%;
  padding: 24px;
  font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
  color: #2c3e50;
}

/* ========== 页面头部 ========== */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 20px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 14px;
  color: white;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 12px;
}

.header-icon svg {
  width: 28px;
  height: 28px;
}

.header-text h1 {
  margin: 0;
  font-size: 1.75rem;
  font-weight: 600;
  color: white;
}

.header-description {
  margin: 4px 0 0;
  font-size: 0.9rem;
  opacity: 0.9;
}

/* ========== 主布局 ========== */
.main-layout {
  display: flex;
  gap: 24px;
}

.left-panel {
  flex: 0 0 380px;
}

.right-panel {
  flex: 1;
  min-width: 0;
}

/* ========== 工具面板 ========== */
.tool-panel {
  background: #ffffff;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.panel-section {
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
}

.panel-section:last-child {
  border-bottom: none;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
}

.panel-section h2 {
  margin: 0 0 16px;
  font-size: 1.1rem;
  font-weight: 600;
  color: #2c3e50;
}

.section-header h2 {
  margin: 0;
}

/* ========== 快捷颜色 ========== */
.quick-colors {
  display: flex;
  align-items: center;
  gap: 8px;
}

.quick-label {
  font-size: 0.8rem;
  color: #7f8c8d;
}

.quick-color-list {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.quick-color-btn {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: 2px solid rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition: transform 0.2s;
}

.quick-color-btn:hover {
  transform: scale(1.2);
}

/* ========== 输入方式标签 ========== */
.input-method-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  background: #f8f9fa;
  padding: 4px;
  border-radius: 6px;
}

.tab-btn {
  flex: 1;
  padding: 10px 12px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  color: #7f8c8d;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.tab-btn:hover {
  color: #2c3e50;
}

.tab-btn.active {
  background: #ffffff;
  color: #3498db;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.tab-icon {
  font-weight: 700;
  font-size: 0.9rem;
}

/* ========== 输入组 ========== */
.input-group {
  margin-bottom: 16px;
}

.input-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 0.85rem;
  font-weight: 500;
  color: #7f8c8d;
}

.color-input-wrapper {
  display: flex;
  gap: 10px;
}

.hex-input {
  flex: 1;
  padding: 10px 14px;
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  font-size: 1rem;
  font-family: monospace;
  transition: border-color 0.2s;
}

.hex-input:focus {
  outline: none;
  border-color: #3498db;
}

.color-picker-wrapper {
  position: relative;
}

.color-picker {
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  padding: 0;
}

.color-picker::-webkit-color-swatch-wrapper {
  padding: 0;
}

.color-picker::-webkit-color-swatch {
  border: 2px solid #e0e0e0;
  border-radius: 6px;
}

/* ========== 透明度滑块 ========== */
.alpha-slider-container {
  margin-top: 16px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
}

.alpha-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.alpha-header label {
  margin: 0;
  font-size: 0.85rem;
}

.alpha-value {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.85rem;
  color: #7f8c8d;
}

.alpha-input {
  width: 50px;
  padding: 4px 8px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  text-align: center;
  font-size: 0.85rem;
}

/* ========== 颜色预览 ========== */
.color-preview-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
}

.color-preview {
  width: 60px;
  height: 60px;
  border-radius: 6px;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.1);
}

.preview-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.preview-label {
  font-size: 0.75rem;
  color: #7f8c8d;
}

.preview-value {
  font-size: 0.85rem;
  font-family: monospace;
  color: #2c3e50;
}

/* ========== RGB 滑块输入 ========== */
.rgb-slider-group {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.rgb-slider-group label {
  margin: 0;
  width: 24px;
}

.channel-label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 700;
  color: white;
}

.channel-label.r { background: #e74c3c; }
.channel-label.g { background: #27ae60; }
.channel-label.b { background: #3498db; }

.slider-container {
  flex: 1;
}

.channel-input {
  width: 60px;
  padding: 6px 8px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  text-align: center;
  font-size: 0.85rem;
}

/* ========== CMYK 输入 ========== */
.lab-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.lab-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.lab-item label {
  margin: 0;
  width: 20px;
}

.lab-item input {
  flex: 1;
  padding: 8px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  text-align: center;
}

/* ========== 备注输入 ========== */
.note-input {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
}

.note-input label {
  margin: 0;
  white-space: nowrap;
}

.note-input input {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
}

/* ========== 按钮 ========== */
.add-button, .generate-btn, .export-button {
  width: 100%;
  padding: 12px 20px;
  border: none;
  border-radius: 6px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 16px;
  color: white;
}

.add-button {
  background: linear-gradient(135deg, #3498db, #2980b9);
}

.add-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(52, 152, 219, 0.4);
}

.generate-btn {
  background: linear-gradient(135deg, #667eea, #764ba2);
}

.generate-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.export-button {
  background: linear-gradient(135deg, #27ae60, #219a52);
}

.export-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(39, 174, 96, 0.4);
}

.btn-icon {
  width: 18px;
  height: 18px;
}

/* ========== 配色方案选项 ========== */
.generation-options {
  margin-bottom: 16px;
}

.option-group {
  margin-bottom: 16px;
}

.option-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 0.85rem;
  font-weight: 500;
  color: #7f8c8d;
}

.scheme-select, .count-select, .material-select, .row-select {
  width: 100%;
}

.scheme-option {
  display: flex;
  flex-direction: column;
}

.scheme-name {
  font-weight: 500;
}

.scheme-desc {
  font-size: 0.75rem;
  color: #7f8c8d;
}

.shade-options {
  display: flex;
  gap: 8px;
}

.shade-btn {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #e0e0e0;
  background: #ffffff;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
}

.shade-btn:hover {
  border-color: #3498db;
}

.shade-btn.active {
  background: #3498db;
  border-color: #3498db;
  color: white;
}

/* ========== 布局切换 ========== */
.layout-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e0e0e0;
}

.toggle-label {
  font-size: 0.85rem;
  color: #7f8c8d;
}

.toggle-buttons {
  display: flex;
  gap: 4px;
  background: #f8f9fa;
  padding: 4px;
  border-radius: 6px;
}

.toggle-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #7f8c8d;
  transition: all 0.2s;
}

.toggle-btn:hover {
  color: #2c3e50;
}

.toggle-btn.active {
  background: #ffffff;
  color: #3498db;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

/* ========== 导出表单 ========== */
.export-form {
  margin-bottom: 16px;
}

.form-row {
  margin-bottom: 12px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  margin: 0;
  font-size: 0.85rem;
  font-weight: 500;
  color: #7f8c8d;
}

.form-group.inline {
  flex-direction: row;
  align-items: center;
}

.form-group.inline label {
  margin-right: 12px;
}

.form-group.inline .row-select {
  width: 80px;
}

/* 导出色值选项 */
.export-color-options {
  display: flex;
  gap: 12px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  color: #2c3e50;
}

.checkbox-label input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.required {
  color: #e74c3c;
}

.form-group textarea {
  padding: 10px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  resize: vertical;
  font-family: inherit;
}

.form-group textarea:focus {
  outline: none;
  border-color: #3498db;
}

/* ========== 色卡展示区域 ========== */
.display-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 16px 20px;
  background: #ffffff;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.display-header h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.display-stats {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  color: #7f8c8d;
}

.value-switch {
  font-size: 0.85rem;
}

/* ========== 色卡列表 ========== */
.color-cards-display {
  display: grid;
  gap: 16px;
}

.color-cards-display.grid {
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
}

.color-cards-display.row {
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
}

.color-card {
  position: relative;
  height: 160px;
  border-radius: 10px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  overflow: hidden;
  transition: all 0.3s ease;
}

.color-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.color-card.locked {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15), 0 0 0 3px #f39c12;
}

.color-card.current-card {
  border: 3px solid #3498db;
}

.card-badge {
  position: absolute;
  top: 10px;
  left: 10px;
  padding: 4px 10px;
  background: #3498db;
  color: white;
  font-size: 0.7rem;
  font-weight: 600;
  border-radius: 20px;
  text-transform: uppercase;
}

.color-info {
  background: rgba(255, 255, 255, 0.95);
  padding: 10px 12px;
  font-size: 0.75rem;
}

.color-hex {
  font-weight: 700;
  font-size: 0.9rem;
  margin-bottom: 2px;
}

.color-rgb, .color-cmyk, .color-lab {
  color: #666;
  font-size: 0.7rem;
}

.color-note {
  margin-top: 4px;
  padding-top: 4px;
  border-top: 1px dashed #ddd;
  font-style: italic;
  color: #888;
}

/* ========== 色卡操作按钮 ========== */
.card-actions {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.color-card:hover .card-actions {
  opacity: 1;
}

.action-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  transition: all 0.2s;
}

.action-btn:hover {
  background: white;
  color: #3498db;
  transform: scale(1.1);
}

.action-btn.delete:hover {
  color: #e74c3c;
}

/* ========== 空状态 ========== */
.empty-state {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px;
  background: #ffffff;
  border-radius: 10px;
  color: #7f8c8d;
}

.empty-state svg {
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state p {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 500;
}

.empty-state span {
  font-size: 0.85rem;
  margin-top: 4px;
}

/* ========== Toast 提示 ========== */
.custom-toast {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  min-width: 300px;
  max-width: 420px;
  border-radius: 10px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.toast-content {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  gap: 12px;
  color: white;
}

.toast-success {
  background: linear-gradient(135deg, #27ae60, #219a52);
}

.toast-error {
  background: linear-gradient(135deg, #e74c3c, #c0392b);
}

.toast-icon {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
}

.toast-icon svg {
  width: 100%;
  height: 100%;
}

.toast-message {
  flex: 1;
  font-size: 0.9rem;
  font-weight: 500;
}

.toast-close {
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s;
}

.toast-close:hover {
  color: white;
}

.toast-close svg {
  width: 14px;
  height: 14px;
}

/* ========== Toast 动画 ========== */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from,
.toast-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

/* ========== 响应式 ========== */
@media (max-width: 1100px) {
  .main-layout {
    flex-direction: column;
  }
  
  .left-panel {
    flex: none;
    width: 100%;
  }
  
  .right-panel {
    width: 100%;
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }
  
  .header-content {
    flex-direction: column;
  }
  
  .display-header {
    flex-direction: column;
    gap: 12px;
  }
  
  .color-cards-display.grid,
  .color-cards-display.row {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  }
  
  .cmyk-grid, .lab-grid {
    grid-template-columns: 1fr;
  }
}
</style>
