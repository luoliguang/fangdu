import chroma from 'chroma-js';

/**
 * 使用chroma.js进行精确的RGB到Lab转换
 * @param {number} r - 红色通道值 (0-255)
 * @param {number} g - 绿色通道值 (0-255)
 * @param {number} b - 蓝色通道值 (0-255)
 * @returns {Object} Lab颜色对象 {L, a, b}
 */
export const rgbToLab = (r, g, b) => {
  try {
    const color = chroma([r, g, b]);
    const labValues = color.lab();
    return {
      L: Math.round(labValues[0]),
      a: Math.round(labValues[1]),
      b: Math.round(labValues[2])
    };
  } catch (error) {
    console.error('RGB到Lab转换错误:', error);
    // 回退到简化版转换
    const L = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
    const a = Math.round(((r - g) + 128) / 2);
    const b_val = Math.round(((g - b) + 128) / 2);
    return {L, a, b: b_val};
  }
};

/**
 * 使用chroma.js进行精确的RGB到CMYK转换
 * @param {number} r - 红色通道值 (0-255)
 * @param {number} g - 绿色通道值 (0-255)
 * @param {number} b - 蓝色通道值 (0-255)
 * @returns {Object} CMYK颜色对象 {c, m, y, k}
 */
export const rgbToCmyk = (r, g, b) => {
  try {
    const color = chroma([r, g, b]);
    const cmyk = color.cmyk();
    return {
      c: Math.round(cmyk[0] * 100),
      m: Math.round(cmyk[1] * 100),
      y: Math.round(cmyk[2] * 100),
      k: Math.round(cmyk[3] * 100)
    };
  } catch (error) {
    console.error('RGB到CMYK转换错误:', error);
    // 回退到传统转换方法
    const rNorm = r / 255;
    const gNorm = g / 255;
    const bNorm = b / 255;
    
    const k = 1 - Math.max(rNorm, gNorm, bNorm);
    
    if (k === 1) {
      return {c: 0, m: 0, y: 0, k: 100};
    }
    
    const c = Math.round(((1 - rNorm - k) / (1 - k)) * 100);
    const m = Math.round(((1 - gNorm - k) / (1 - k)) * 100);
    const y = Math.round(((1 - bNorm - k) / (1 - k)) * 100);
    const kPercent = Math.round(k * 100);
    
    return {c, m, y, k: kPercent};
  }
};

/**
 * 使用chroma.js生成相似颜色
 * @param {string} baseColor - 基础颜色的HEX值
 * @param {number} count - 需要生成的颜色数量
 * @param {string} mode - 生成模式: 'light'(浅色系), 'dark'(深色系), 'both'(浅色和深色)
 * @returns {Array} 颜色对象数组
 */
export const generateSimilarColors = (baseColor, count, mode = 'both') => {
  const colors = [];
  try {
    const baseChroma = chroma(baseColor);
    
    // 添加基础颜色
    colors.push({
      hex: baseColor,
      rgb: {
        r: Math.round(baseChroma.get('rgb.r')),
        g: Math.round(baseChroma.get('rgb.g')),
        b: Math.round(baseChroma.get('rgb.b'))
      }
    });
    
    // 计算需要生成的浅色和深色数量
    let lighterCount = 0;
    let darkerCount = 0;
    
    if (mode === 'light') {
      lighterCount = count - 1;
    } else if (mode === 'dark') {
      darkerCount = count - 1;
    } else {
      // 'both' 模式，平均分配
      lighterCount = Math.floor((count - 1) / 2);
      darkerCount = count - 1 - lighterCount;
    }
    
    // 生成浅色系列
    for (let i = 0; i < lighterCount; i++) {
      const factor = (i + 1) / (lighterCount + 1);
      const color = chroma.mix(baseColor, '#FFFFFF', factor, 'rgb');
      
      colors.push({
        hex: color.hex(),
        rgb: {
          r: Math.round(color.get('rgb.r')),
          g: Math.round(color.get('rgb.g')),
          b: Math.round(color.get('rgb.b'))
        }
      });
    }
    
    // 生成深色系列
    for (let i = 0; i < darkerCount; i++) {
      const factor = (i + 1) / (darkerCount + 1);
      const color = chroma.mix(baseColor, '#000000', factor, 'rgb');
      
      colors.push({
        hex: color.hex(),
        rgb: {
          r: Math.round(color.get('rgb.r')),
          g: Math.round(color.get('rgb.g')),
          b: Math.round(color.get('rgb.b'))
        }
      });
    }
    
    // 按照从浅到深排序
    colors.sort((a, b) => {
      const aSum = a.rgb.r + a.rgb.g + a.rgb.b;
      const bSum = b.rgb.r + b.rgb.g + b.rgb.b;
      return bSum - aSum;
    });
    
    return colors;
  } catch (error) {
    console.error('生成相似颜色错误:', error);
    return [{ hex: baseColor }];
  }
};

/**
 * 使用chroma.js计算两个颜色之间的差异值(Delta E)
 * @param {string} color1 - 第一个颜色的HEX值
 * @param {string} color2 - 第二个颜色的HEX值
 * @returns {number} 颜色差异值
 */
export const calculateDeltaE = (color1, color2) => {
  try {
    const c1 = chroma(color1);
    const c2 = chroma(color2);
    return Math.round(chroma.deltaE(c1, c2) * 10) / 10;
  } catch (error) {
    console.error('计算颜色差异错误:', error);
    return 100; // 返回一个大值表示差异很大
  }
};