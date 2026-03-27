<template>
  <div class="statistics-container">
    <div class="page-header reveal" :class="{ 'is-ready': pageReady }" style="--d: 0ms;">
      <div>
        <h2>访问统计总览</h2>
        <p>实时掌握流量趋势、来源质量与内容热度</p>
      </div>
      <button class="refresh-btn" @click="refreshData" :disabled="isRefreshing">
        <span :class="['refresh-icon', { spinning: isRefreshing }]">↻</span>
        {{ isRefreshing ? '刷新中...' : '刷新数据' }}
      </button>
    </div>

    <!-- 顶部4个核心指标 -->
    <div class="kpi-grid reveal" :class="{ 'is-ready': pageReady }" style="--d: 90ms;">
      <div class="kpi-card">
        <span class="kpi-label">今日访问</span>
        <span class="kpi-value">{{ formatNumber(displayedOverview.todayVisits) }}</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">本周访问</span>
        <span class="kpi-value">{{ formatNumber(displayedOverview.weekVisits) }}</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">总访问量</span>
        <span class="kpi-value">{{ formatNumber(displayedOverview.totalVisits) }}</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">当前在线</span>
        <span class="kpi-value">{{ formatNumber(displayedOverview.onlineCount) }}</span>
      </div>
    </div>

    <!-- 中间访问趋势 -->
    <div class="panel trend-panel reveal" :class="{ 'is-ready': pageReady }" style="--d: 170ms;">
      <div class="panel-header">
        <h3>访问趋势</h3>
        <div class="range-switch">
          <button
            v-for="item in timeRanges"
            :key="item.value"
            :class="{ active: selectedRange === item.value }"
            @click="changeTimeRange(item.value)"
          >
            {{ item.label }}
          </button>
        </div>
      </div>
      <div ref="trendChartRef" class="chart-area"></div>
    </div>

    <!-- 下方三列 -->
    <div class="bottom-grid">
      <div class="panel reveal" :class="{ 'is-ready': pageReady }" style="--d: 250ms;">
        <div class="panel-header">
          <h3>访客来源分布</h3>
        </div>
        <div ref="sourceChartRef" class="chart-area chart-small"></div>
      </div>

      <div class="panel reveal" :class="{ 'is-ready': pageReady }" style="--d: 330ms;">
        <div class="panel-header">
          <h3>热门搜索关键词 Top 10</h3>
        </div>
        <ul class="keyword-list">
          <li v-for="(item, index) in topKeywords" :key="`${item.keyword}-${index}`">
            <span class="rank">{{ index + 1 }}</span>
            <span class="keyword">{{ item.keyword }}</span>
            <span class="count">{{ item.search_count }}</span>
          </li>
          <li v-if="topKeywords.length === 0" class="empty-state">
            <span class="empty-icon">⌕</span>
            <span class="empty-title">暂无关键词数据</span>
            <span class="empty-desc">当用户进行搜索后，这里会展示热词排行</span>
          </li>
        </ul>
      </div>

      <div class="panel reveal" :class="{ 'is-ready': pageReady }" style="--d: 410ms;">
        <div class="panel-header">
          <h3>热门素材 Top 5</h3>
        </div>
        <ul class="material-list">
          <li v-for="item in topMaterials" :key="item.id" class="material-item">
            <img :src="item.thumbnail_url || item.cover_image_path || item.file_path" :alt="item.name" class="thumb" />
            <div class="material-meta">
              <p class="material-name">{{ item.name }}</p>
              <p class="material-views">查看 {{ item.view_count || 0 }} 次</p>
            </div>
          </li>
          <li v-if="topMaterials.length === 0" class="empty-state">
            <span class="empty-icon">◈</span>
            <span class="empty-title">暂无素材热度数据</span>
            <span class="empty-desc">素材被查看后，将在这里显示热度排行</span>
          </li>
        </ul>
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
      isRefreshing: false,
      overview: {
        todayVisits: 0,
        weekVisits: 0,
        totalVisits: 0
      },
      displayedOverview: {
        todayVisits: 0,
        weekVisits: 0,
        totalVisits: 0,
        onlineCount: 0
      },
      pageReady: false,
      onlineCount: 0,
      selectedRange: '7',
      timeRanges: [
        { label: '今日', value: '1' },
        { label: '7天', value: '7' },
        { label: '30天', value: '30' }
      ],
      trendData: [],
      referrerData: [],
      topKeywords: [],
      topMaterials: [],
      trendChart: null,
      sourceChart: null,
      refreshTimer: null,
      resizeHandler: null
    }
  },
  async mounted() {
    await this.loadAllData()
    this.startAutoRefresh()
    this.setupResize()
    this.$nextTick(() => {
      requestAnimationFrame(() => {
        this.pageReady = true
      })
    })
  },
  beforeUnmount() {
    if (this.refreshTimer) clearInterval(this.refreshTimer)
    if (this.resizeHandler) window.removeEventListener('resize', this.resizeHandler)
    if (this.trendChart) this.trendChart.dispose()
    if (this.sourceChart) this.sourceChart.dispose()
  },
  methods: {
    formatNumber(num) {
      return Number(num || 0).toLocaleString('zh-CN')
    },

    async loadAllData() {
      await Promise.allSettled([
        this.loadOverview(),
        this.loadOnlineCount(),
        this.loadTrendData(),
        this.loadReferrerData(),
        this.loadTopKeywords(),
        this.loadTopMaterials()
      ])
      this.$nextTick(() => {
        this.renderTrendChart()
        this.renderSourceChart()
      })
    },

    async loadOverview() {
      const response = await apiClient.get('/api/v1/visits/overview')
      const data = response.data?.data || {}
      const nextOverview = {
        todayVisits: data.today?.visits || 0,
        weekVisits: data.week?.visits || 0,
        totalVisits: data.total?.visits || 0
      }
      this.overview = nextOverview
      this.animateCounters({
        ...nextOverview,
        onlineCount: this.onlineCount
      })
    },

    async loadOnlineCount() {
      const response = await apiClient.get('/api/v1/visits/online')
      this.onlineCount = response.data?.data?.onlineCount || 0
      this.animateCounters({
        ...this.overview,
        onlineCount: this.onlineCount
      })
    },

    async loadTrendData() {
      const response = await apiClient.get(`/api/v1/visits/trends?days=${this.selectedRange}`)
      this.trendData = response.data?.data || []
    },

    async loadReferrerData() {
      const response = await apiClient.get('/api/v1/visits/referrers?limit=10')
      this.referrerData = response.data?.data || []
    },

    async loadTopKeywords() {
      const response = await apiClient.get('/api/v1/visits/search/top?limit=10')
      this.topKeywords = response.data?.data || []
    },

    async loadTopMaterials() {
      const response = await apiClient.get('/api/v1/materials/stats/top?limit=5')
      this.topMaterials = response.data?.data || []
    },

    async changeTimeRange(range) {
      this.selectedRange = range
      await this.loadTrendData()
      this.$nextTick(() => this.renderTrendChart())
    },

    async refreshData() {
      this.isRefreshing = true
      try {
        await this.loadAllData()
      } finally {
        setTimeout(() => {
          this.isRefreshing = false
        }, 400)
      }
    },

    startAutoRefresh() {
      this.refreshTimer = setInterval(async () => {
        await Promise.all([this.loadOnlineCount(), this.loadOverview()])
      }, 30000)
    },

    setupResize() {
      this.resizeHandler = () => {
        if (this.trendChart) this.trendChart.resize()
        if (this.sourceChart) this.sourceChart.resize()
      }
      window.addEventListener('resize', this.resizeHandler)
    },

    animateCounters(target) {
      const start = {
        ...this.displayedOverview
      }
      const end = {
        todayVisits: Number(target.todayVisits || 0),
        weekVisits: Number(target.weekVisits || 0),
        totalVisits: Number(target.totalVisits || 0),
        onlineCount: Number(target.onlineCount || 0)
      }

      const duration = 850
      const startTime = performance.now()

      const easeOut = (t) => 1 - Math.pow(1 - t, 3)

      const tick = (now) => {
        const progress = Math.min((now - startTime) / duration, 1)
        const eased = easeOut(progress)

        this.displayedOverview = {
          todayVisits: Math.round(start.todayVisits + (end.todayVisits - start.todayVisits) * eased),
          weekVisits: Math.round(start.weekVisits + (end.weekVisits - start.weekVisits) * eased),
          totalVisits: Math.round(start.totalVisits + (end.totalVisits - start.totalVisits) * eased),
          onlineCount: Math.round(start.onlineCount + (end.onlineCount - start.onlineCount) * eased)
        }

        if (progress < 1) {
          requestAnimationFrame(tick)
        }
      }

      requestAnimationFrame(tick)
    },

    renderTrendChart() {
      if (!this.$refs.trendChartRef) return
      if (this.trendChart) this.trendChart.dispose()
      this.trendChart = echarts.init(this.$refs.trendChartRef)

      const xData = this.trendData.map((d) => d.date)
      const yVisits = this.trendData.map((d) => d.visits)
      const yUnique = this.trendData.map((d) => d.unique_visitors)

      this.trendChart.setOption({
        backgroundColor: 'transparent',
        tooltip: { trigger: 'axis' },
        legend: {
          data: ['访问量', '独立访客'],
          top: 0,
          textStyle: { color: '#cbd5e1' }
        },
        grid: { left: 24, right: 16, top: 36, bottom: 24, containLabel: true },
        xAxis: {
          type: 'category',
          data: xData,
          axisLine: { lineStyle: { color: 'rgba(148,163,184,0.35)' } },
          axisLabel: { color: '#94a3b8' }
        },
        yAxis: {
          type: 'value',
          minInterval: 1,
          axisLine: { lineStyle: { color: 'rgba(148,163,184,0.35)' } },
          splitLine: { lineStyle: { color: 'rgba(148,163,184,0.15)' } },
          axisLabel: { color: '#94a3b8' }
        },
        series: [
          {
            name: '访问量',
            type: 'line',
            smooth: true,
            data: yVisits,
            lineStyle: { width: 2.5, color: '#a855f7' },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(168,85,247,0.32)' },
                { offset: 1, color: 'rgba(168,85,247,0.04)' }
              ])
            },
            symbolSize: 6,
            itemStyle: { color: '#c084fc' }
          },
          {
            name: '独立访客',
            type: 'line',
            smooth: true,
            data: yUnique,
            lineStyle: { width: 2, color: '#8b5cf6' },
            symbolSize: 5,
            itemStyle: { color: '#a78bfa' },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(139,92,246,0.22)' },
                { offset: 1, color: 'rgba(139,92,246,0.03)' }
              ])
            }
          }
        ]
      })
    },

    renderSourceChart() {
      if (!this.$refs.sourceChartRef) return
      if (this.sourceChart) this.sourceChart.dispose()
      this.sourceChart = echarts.init(this.$refs.sourceChartRef)

      const merged = this.normalizeSources(this.referrerData)
      this.sourceChart.setOption({
        tooltip: { trigger: 'item' },
        legend: {
          bottom: 0,
          textStyle: { color: '#cbd5e1' }
        },
        series: [
          {
            type: 'pie',
            radius: ['58%', '78%'],
            avoidLabelOverlap: true,
            itemStyle: { borderColor: '#0d1117', borderWidth: 2 },
            label: { color: '#e2e8f0', formatter: '{b}\n{d}%' },
            data: merged,
            color: ['#c084fc', '#a855f7', '#7c3aed']
          }
        ]
      })
    },

    normalizeSources(raw) {
      const bucket = { 微信: 0, 直接访问: 0, 其他: 0 }
      ;(raw || []).forEach((item) => {
        const src = item.source || '其他来源'
        const visits = Number(item.visits || 0)
        if (src === '微信') bucket['微信'] += visits
        else if (src === '直接访问') bucket['直接访问'] += visits
        else bucket['其他'] += visits
      })
      return Object.entries(bucket).map(([name, value]) => ({ name, value }))
    }
  }
}
</script>

<style scoped>
.statistics-container {
  padding: 0.5rem;
  color: #e2e8f0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.page-header h2 {
  margin: 0;
  font-size: 1.3rem;
  color: #f8fafc;
}

.page-header p {
  margin: 0.35rem 0 0;
  color: #94a3b8;
  font-size: 0.9rem;
}

.refresh-btn {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #e2e8f0;
  border-radius: 10px;
  padding: 0.5rem 0.9rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.refresh-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.refresh-icon.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.9rem;
  margin-bottom: 1rem;
}

.kpi-card {
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.72), rgba(15, 23, 42, 0.45));
  border-radius: 14px;
  padding: 0.95rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  transition: transform 0.28s ease, box-shadow 0.28s ease, border-color 0.28s ease;
}

.kpi-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 24px rgba(124, 58, 237, 0.18);
  border-color: rgba(192, 132, 252, 0.42);
}

.kpi-label {
  color: #94a3b8;
  font-size: 0.82rem;
}

.kpi-value {
  color: #f8fafc;
  font-size: 1.45rem;
  font-weight: 650;
}

.panel {
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.68), rgba(15, 23, 42, 0.48));
  border-radius: 14px;
  padding: 0.9rem;
  transition: transform 0.28s ease, box-shadow 0.28s ease, border-color 0.28s ease;
}

.panel:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 28px rgba(124, 58, 237, 0.14);
  border-color: rgba(192, 132, 252, 0.34);
}

.trend-panel {
  margin-bottom: 1rem;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.panel-header h3 {
  margin: 0;
  color: #f8fafc;
  font-size: 1rem;
}

.range-switch {
  display: flex;
  gap: 0.45rem;
}

.range-switch button {
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(255, 255, 255, 0.04);
  color: #cbd5e1;
  border-radius: 8px;
  padding: 0.3rem 0.7rem;
  cursor: pointer;
}

.range-switch button.active {
  background: linear-gradient(135deg, rgba(124, 58, 237, 0.52), rgba(168, 85, 247, 0.36));
  border-color: rgba(192, 132, 252, 0.75);
  color: #fff;
}

.chart-area {
  width: 100%;
  height: 320px;
}

.chart-small {
  height: 260px;
}

.bottom-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
}

.keyword-list,
.material-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.keyword-list li {
  display: grid;
  grid-template-columns: 26px 1fr auto;
  gap: 0.6rem;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px dashed rgba(148, 163, 184, 0.25);
}

.keyword-list li:last-child,
.material-item:last-child {
  border-bottom: none;
}

.rank {
  width: 22px;
  height: 22px;
  border-radius: 999px;
  background: rgba(168, 85, 247, 0.25);
  color: #ddd6fe;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
}

.keyword {
  color: #e2e8f0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.count {
  color: #94a3b8;
  font-size: 0.86rem;
}

.material-item {
  display: flex;
  gap: 0.7rem;
  align-items: center;
  padding: 0.55rem 0;
  border-bottom: 1px dashed rgba(148, 163, 184, 0.25);
}

.thumb {
  width: 52px;
  height: 52px;
  border-radius: 10px;
  object-fit: cover;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(15, 23, 42, 0.7);
}

.material-name {
  margin: 0;
  color: #f1f5f9;
  font-size: 0.9rem;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.material-views {
  margin: 0.3rem 0 0;
  color: #94a3b8;
  font-size: 0.82rem;
}

.empty-tip {
  color: #94a3b8;
  padding: 0.75rem 0;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.28rem;
  padding: 1.25rem 0.5rem;
  border: 1px dashed rgba(192, 132, 252, 0.28);
  border-radius: 12px;
  background: radial-gradient(120% 120% at 0% 0%, rgba(168, 85, 247, 0.12), rgba(168, 85, 247, 0.02));
}

.empty-icon {
  font-size: 1.25rem;
  color: #c084fc;
}

.empty-title {
  color: #e9d5ff;
  font-size: 0.88rem;
  font-weight: 600;
}

.empty-desc {
  color: #94a3b8;
  font-size: 0.78rem;
  text-align: center;
}

.reveal {
  opacity: 0;
  transform: translateY(10px);
  transition: opacity 0.45s ease, transform 0.45s ease;
  transition-delay: var(--d, 0ms);
}

.reveal.is-ready {
  opacity: 1;
  transform: translateY(0);
}

@media (max-width: 1180px) {
  .kpi-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .bottom-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .kpi-grid {
    grid-template-columns: 1fr;
  }

  .chart-area {
    height: 280px;
  }
}
</style>
