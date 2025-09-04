/**
 * 教程管理工具类
 * 负责管理用户首次访问检测、教程状态等功能
 */

class TutorialManager {
  constructor() {
    this.STORAGE_KEY = 'fangdu_tutorial_completed';
    this.TUTORIAL_VERSION = '1.0'; // 版本号，用于重置教程
  }

  /**
   * 检查用户是否是首次访问
   * @returns {boolean} true表示首次访问，需要显示教程
   */
  isFirstVisit() {
    try {
      const tutorialData = localStorage.getItem(this.STORAGE_KEY);
      if (!tutorialData) {
        return true;
      }
      
      const data = JSON.parse(tutorialData);
      // 检查版本号，如果版本不匹配也视为首次访问
      return data.version !== this.TUTORIAL_VERSION;
    } catch (error) {
      console.warn('读取教程状态失败:', error);
      return true;
    }
  }

  /**
   * 标记教程已完成
   * @param {string} reason 完成原因：'completed', 'skipped', 'cancelled'
   */
  markTutorialCompleted(reason = 'completed') {
    try {
      const tutorialData = {
        version: this.TUTORIAL_VERSION,
        completed: true,
        completedAt: new Date().toISOString(),
        reason: reason
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(tutorialData));
    } catch (error) {
      console.warn('保存教程状态失败:', error);
    }
  }

  /**
   * 重置教程状态（用于测试或重新显示教程）
   */
  resetTutorial() {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.warn('重置教程状态失败:', error);
    }
  }

  /**
   * 获取教程完成信息
   * @returns {object|null} 教程完成信息
   */
  getTutorialInfo() {
    try {
      const tutorialData = localStorage.getItem(this.STORAGE_KEY);
      return tutorialData ? JSON.parse(tutorialData) : null;
    } catch (error) {
      console.warn('获取教程信息失败:', error);
      return null;
    }
  }

  /**
   * 检查是否为桌面端（教程仅在桌面端显示）
   * @returns {boolean} true表示桌面端
   */
  isDesktop() {
    return window.innerWidth >= 768;
  }
}

// 创建单例实例
const tutorialManager = new TutorialManager();

export default tutorialManager;