/**
 * 将色卡数据导出为图片
 * @param {Array} colorCards - 色卡数据数组
 * @param {string} globalNote - 全局备注
 * @param {string} layoutMode - 布局模式 ('grid' 或 'row')
 * @returns {Promise} 返回一个Promise，成功时提供图片的dataURL
 */
export const exportColorCardsAsImage = (colorCards, globalNote, layoutMode) => {
  return new Promise((resolve, reject) => {
    try {
      // 创建一个临时的canvas元素
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // 设置画布尺寸和样式
      const padding = 40;
      const cardSize = 120;
      const cardMargin = 20;
      const headerHeight = 100;
      const footerHeight = globalNote ? 80 : 40;
      
      let width, height, cardsPerRow;
      
      if (layoutMode === 'grid') {
        // 网格布局，每行最多4个色卡
        cardsPerRow = Math.min(4, colorCards.length);
        width = padding * 2 + cardsPerRow * (cardSize + cardMargin) - cardMargin;
        const rows = Math.ceil(colorCards.length / cardsPerRow);
        height = headerHeight + padding * 2 + rows * (cardSize + cardMargin) - cardMargin + footerHeight;
      } else {
        // 行布局，每个色卡一行
        cardsPerRow = 1;
        width = padding * 2 + 600; // 固定宽度
        height = headerHeight + padding * 2 + colorCards.length * (cardSize + cardMargin) - cardMargin + footerHeight;
      }
      
      // 设置画布尺寸
      canvas.width = width;
      canvas.height = height;
      
      // 绘制白色背景
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      
      // 绘制标题
      ctx.fillStyle = '#333333';
      ctx.font = 'bold 24px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('色卡导出', width / 2, padding + 30);
      
      // 绘制导出日期
      const exportDate = new Date().toLocaleDateString('zh-CN');
      ctx.font = '14px Arial, sans-serif';
      ctx.fillText(`导出日期: ${exportDate}`, width / 2, padding + 60);
      
      // 绘制色卡
      colorCards.forEach((card, index) => {
        const row = Math.floor(index / cardsPerRow);
        const col = index % cardsPerRow;
        
        const x = padding + col * (cardSize + cardMargin);
        const y = headerHeight + padding + row * (cardSize + cardMargin);
        
        // 绘制色卡背景
        ctx.fillStyle = card.hex;
        ctx.fillRect(x, y, cardSize, cardSize);
        
        // 绘制色卡边框
        ctx.strokeStyle = '#E0E0E0';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, cardSize, cardSize);
        
        // 绘制色卡信息背景
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(x, y + cardSize - 60, cardSize, 60);
        
        // 绘制HEX值
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 14px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(card.hex, x + cardSize / 2, y + cardSize - 40);
        
        // 绘制RGB值
        ctx.font = '12px Arial, sans-serif';
        const rgbText = `RGB: ${card.rgb.r}, ${card.rgb.g}, ${card.rgb.b}`;
        ctx.fillText(rgbText, x + cardSize / 2, y + cardSize - 20);
        
        // 如果有备注，绘制备注
        if (card.note) {
          ctx.fillStyle = '#333333';
          ctx.font = 'italic 12px Arial, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(card.note, x + cardSize / 2, y + cardSize + 15);
        }
      });
      
      // 如果有全局备注，绘制全局备注
      if (globalNote) {
        const footerY = height - footerHeight + 20;
        ctx.fillStyle = '#333333';
        ctx.font = '14px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('备注: ' + globalNote, width / 2, footerY);
      }
      
      // 绘制页脚
      ctx.fillStyle = '#999999';
      ctx.font = '12px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('在线打色卡工具生成', width / 2, height - 20);
      
      // 转换为图片
      const dataURL = canvas.toDataURL('image/png');
      resolve(dataURL);
    } catch (error) {
      console.error('导出图片错误:', error);
      reject(error);
    }
  });
};

/**
 * 下载数据URL为文件
 * @param {string} dataURL - 数据URL
 * @param {string} fileName - 文件名
 */
export const downloadDataURL = (dataURL, fileName) => {
  const link = document.createElement('a');
  link.href = dataURL;
  link.download = fileName;
  link.click();
};