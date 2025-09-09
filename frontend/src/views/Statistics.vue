<template>
  <div class="statistics-container">
    <div class="stats-header">
      <h2>网站访问统计</h2>
      <div class="refresh-btn" @click="refreshData">
        <i class="refresh-icon">🔄</i>
        刷新数据
      </div>
    </div>

    <!-- 统计概览卡片 -->
    <div class="overview-cards">
      <div class="stat-card">
        <div class="stat-number">{{ overview.totalVisits }}</div>
        <div class="stat-label">总访问量</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">{{ overview.totalUniqueVisitors }}</div>
        <div class="stat-label">独立访客</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">{{ overview.todayVisits }}</div>
        <div class="stat-label">今日访问</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">{{ onlineCount }}</div>
        <div class="stat-label">当前在线</div>
      </div>
      <div class="stat-card growth" :class="{ positive: overview.growth > 0, negative: overview.growth < 0 }">
        <div class="stat-number">{{ overview.growth }}%</div>
        <div class="stat-label">较昨日增长</div>
      </div>
    </div>

    <!-- 图表区域 -->
    <div class="charts-container">
      <!-- 访问趋势图 -->
      <div class="chart-card">
        <div class="chart-header">
          <h3>访问趋势</h3>
          <div class="time-range-selector">
            <button 
              v-for="range in timeRanges" 
              :key="range.value"
              :class="{ active: selectedRange === range.value }"
              @click="changeTimeRange(range.value)"
            >
              {{ range.label }}
            </button>
          </div>
        </div>
        <div ref="trendChart" class="chart" style="height: 300px;"></div>
      </div>

      <!-- 页面访问排行 -->
      <div class="chart-card">
        <div class="chart-header">
          <h3>页面访问排行</h3>
        </div>
        <div ref="pageChart" class="chart" style="height: 300px;"></div>
      </div>
    </div>

    <!-- 页面访问详情表格 -->
    <div class="table-card">
      <h3>页面访问详情</h3>
      <div class="table-container">
        <table class="stats-table">
          <thead>
            <tr>
              <th>页面路径</th>
              <th>访问次数</th>
              <th>独立访客</th>
              <th>访问率</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="page in pageStats" :key="page.page">
              <td class="page-path">{{ page.page }}</td>
              <td>{{ page.visits }}</td>
              <td>{{ page.unique_visitors }}</td>
              <td>{{ ((page.visits / totalPageVisits) * 100).toFixed(1) }}%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script>
import apiClient from '@/axiosConfig'
import * as echarts from 'echarts'

export default {
  name: 'Statistics',
  data() {
    return {
      overview: {
        totalVisits: 0,
        totalUniqueVisitors: 0,
        todayVisits: 0,
        yesterdayVisits: 0,
        growth: 0
      },
      onlineCount: 0,
      trendData: [],
      pageStats: [],
      selectedRange: '7d',
      timeRanges: [
        { label: '今日', value: '1d' },
        { label: '7天', value: '7d' },
        { label: '30天', value: '30d' }
      ],
      trendChart: null,
      pageChart: null,
      refreshTimer: null,
      resizeHandler: null
    }
  },
  computed: {
    totalPageVisits() {
      return this.pageStats.reduce((sum, page) => sum + page.visits, 0)
    }
  },
  async mounted() {
    await this.loadData()
    this.startAutoRefresh()
  },
  beforeUnmount() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
    }
    // 清理resize事件监听器
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler)
    }
    // 清理图表实例
    if (this.trendChart) {
      this.trendChart.dispose()
      this.trendChart = null
    }
    if (this.pageChart) {
      this.pageChart.dispose()
      this.pageChart = null
    }
  },
  methods: {
    async loadData() {
      try {
        await Promise.all([
          this.loadOverview(),
          this.loadOnlineCount(),
          this.loadTrendData(),
          this.loadPageStats()
        ])
      } catch (error) {
        console.error('加载统计数据失败:', error)
      }
    },
    
    async loadOverview() {
      try {
        const response = await apiClient.get('/api/v1/visits/overview')
        const data = response.data.data
        this.overview = {
          totalVisits: data.total.visits,
          totalUniqueVisitors: data.total.uniqueVisitors,
          todayVisits: data.today.visits,
          yesterdayVisits: 0, // 需要后端提供昨日数据
          growth: data.growth?.today || 0
        }
      } catch (error) {
        console.error('加载概览数据失败:', error)
      }
    },
    
    async loadOnlineCount() {
      try {
        const response = await apiClient.get('/api/v1/visits/online')
        this.onlineCount = response.data.data.onlineCount
      } catch (error) {
        console.error('加载在线人数失败:', error)
      }
    },
    
    async loadTrendData() {
      try {
        const response = await apiClient.get(`/api/v1/visits/trends?days=${this.selectedRange.replace('d', '')}`)
        this.trendData = response.data.data
        this.$nextTick(() => {
          this.renderTrendChart()
        })
      } catch (error) {
        console.error('加载趋势数据失败:', error)
      }
    },
    
    async loadPageStats() {
      try {
        const response = await apiClient.get('/api/v1/visits/pages')
        this.pageStats = response.data.data
        this.$nextTick(() => {
          this.renderPageChart()
        })
      } catch (error) {
        console.error('加载页面统计失败:', error)
      }
    },
    
    async changeTimeRange(range) {
      this.selectedRange = range
      await this.loadTrendData()
    },
    
    async refreshData() {
      await this.loadData()
    },
    
    startAutoRefresh() {
      // 每30秒自动刷新在线人数
      this.refreshTimer = setInterval(() => {
        this.loadOnlineCount()
      }, 30000)
    },
    
    renderTrendChart() {
      if (!this.$refs.trendChart || !this.trendData.length) return
      
      // 销毁已存在的图表实例
      if (this.trendChart) {
        this.trendChart.dispose()
      }
      
      // 创建新的图表实例
      this.trendChart = echarts.init(this.$refs.trendChart)
      
      const dates = this.trendData.map(item => item.date)
      const visits = this.trendData.map(item => item.visits)
      const uniqueVisitors = this.trendData.map(item => item.unique_visitors)
      
      const option = {
        title: {
          text: '访问趋势',
          left: 'center',
          textStyle: {
            fontSize: 16,
            color: '#333'
          }
        },
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'cross'
          }
        },
        legend: {
          data: ['总访问量', '独立访客'],
          top: 30
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          top: '15%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          boundaryGap: false,
          data: dates,
          axisLabel: {
            formatter: function(value) {
              return new Date(value).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
            }
          }
        },
        yAxis: {
          type: 'value',
          minInterval: 1
        },
        series: [
          {
            name: '总访问量',
            type: 'line',
            data: visits,
            smooth: true,
            itemStyle: {
              color: '#007bff'
            },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(0, 123, 255, 0.3)' },
                { offset: 1, color: 'rgba(0, 123, 255, 0.1)' }
              ])
            }
          },
          {
            name: '独立访客',
            type: 'line',
            data: uniqueVisitors,
            smooth: true,
            itemStyle: {
              color: '#28a745'
            },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(40, 167, 69, 0.3)' },
                { offset: 1, color: 'rgba(40, 167, 69, 0.1)' }
              ])
            }
          }
        ]
      }
      
      this.trendChart.setOption(option)
      
      // 设置响应式调整（只设置一次）
      if (!this.resizeHandler) {
        this.resizeHandler = () => {
          if (this.trendChart) {
            this.trendChart.resize()
          }
          if (this.pageChart) {
            this.pageChart.resize()
          }
        }
        window.addEventListener('resize', this.resizeHandler)
      }
    },
    
    renderPageChart() {
      if (!this.$refs.pageChart || !this.pageStats.length) return
      
      // 销毁已存在的图表实例
      if (this.pageChart) {
        this.pageChart.dispose()
      }
      
      // 创建新的图表实例
      this.pageChart = echarts.init(this.$refs.pageChart)
      
      // 取前10个页面数据
      const topPages = this.pageStats.slice(0, 10)
      const pageNames = topPages.map(item => {
        // 简化页面路径显示
        const path = item.page
        if (path === '/') return '首页'
        if (path.includes('/admin')) return '管理后台'
        return path.length > 20 ? path.substring(0, 20) + '...' : path
      })
      const pageVisits = topPages.map(item => item.visits)
      
      const option = {
        title: {
          text: '热门页面',
          left: 'center',
          textStyle: {
            fontSize: 16,
            color: '#333'
          }
        },
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'shadow'
          },
          formatter: function(params) {
            const data = topPages[params[0].dataIndex]
            return `页面: ${data.page}<br/>访问量: ${data.visits}<br/>独立访客: ${data.unique_visitors}`
          }
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          top: '15%',
          containLabel: true
        },
        xAxis: {
          type: 'value',
          minInterval: 1
        },
        yAxis: {
          type: 'category',
          data: pageNames,
          axisLabel: {
            interval: 0,
            fontSize: 12
          }
        },
        series: [
          {
            name: '访问量',
            type: 'bar',
            data: pageVisits,
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                { offset: 0, color: '#007bff' },
                { offset: 1, color: '#0056b3' }
              ])
            },
            label: {
              show: true,
              position: 'right',
              formatter: '{c}'
            }
          }
        ]
      }
      
      this.pageChart.setOption(option)
    }
  }
}
</script>

<style scoped>
.statistics-container {
  padding: 20px;
  background-color: #f5f5f5;
  min-height: 100vh;
}

.stats-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.stats-header h2 {
  color: #333;
  margin: 0;
}

.refresh-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.refresh-btn:hover {
  background: #0056b3;
}

.refresh-icon {
  font-size: 14px;
}

.overview-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  text-align: center;
}

.stat-card.growth.positive {
  background: linear-gradient(135deg, #4CAF50, #45a049);
  color: white;
}

.stat-card.growth.negative {
  background: linear-gradient(135deg, #f44336, #da190b);
  color: white;
}

.stat-number {
  font-size: 2em;
  font-weight: bold;
  color: #333;
  margin-bottom: 8px;
}

.stat-card.growth .stat-number {
  color: white;
}

.stat-label {
  color: #666;
  font-size: 0.9em;
}

.stat-card.growth .stat-label {
  color: rgba(255, 255, 255, 0.9);
}

.charts-container {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
  margin-bottom: 30px;
}

.chart-card {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.chart-header h3 {
  margin: 0;
  color: #333;
}

.time-range-selector {
  display: flex;
  gap: 8px;
}

.time-range-selector button {
  padding: 6px 12px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
}

.time-range-selector button.active {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.time-range-selector button:hover {
  border-color: #007bff;
}

.chart {
  width: 100%;
}

.table-card {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.table-card h3 {
  margin: 0 0 20px 0;
  color: #333;
}

.table-container {
  overflow-x: auto;
}

.stats-table {
  width: 100%;
  border-collapse: collapse;
}

.stats-table th,
.stats-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.stats-table th {
  background: #f8f9fa;
  font-weight: 600;
  color: #333;
}

.stats-table tr:hover {
  background: #f8f9fa;
}

.page-path {
  font-family: monospace;
  color: #007bff;
}

@media (max-width: 768px) {
  .charts-container {
    grid-template-columns: 1fr;
  }
  
  .overview-cards {
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  }
  
  .stats-header {
    flex-direction: column;
    gap: 15px;
    align-items: flex-start;
  }
}
</style>