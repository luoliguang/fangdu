<template>
  <div class="stats-page">
    <!-- 页头 -->
    <div class="stats-header reveal" :class="{ 'is-ready': pageReady }" style="--d: 0ms;">
      <div>
        <h2 class="stats-title">访问统计</h2>
        <p class="stats-subtitle">实时掌握流量趋势、来源质量与内容热度</p>
      </div>
      <button class="refresh-btn" @click="refreshData" :disabled="isRefreshing">
        <svg :class="['refresh-icon', { spinning: isRefreshing }]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/></svg>
        {{ isRefreshing ? '刷新中…' : '刷新数据' }}
      </button>
    </div>

    <!-- KPI 四格 -->
    <div class="kpi-grid reveal" :class="{ 'is-ready': pageReady }" style="--d: 80ms;">
      <div class="kpi-card">
        <div class="kpi-icon-wrap kpi-icon-green">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        </div>
        <div class="kpi-body">
          <span class="kpi-num">{{ formatNumber(displayedOverview.todayVisits) }}</span>
          <span class="kpi-label">今日访问</span>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon-wrap kpi-icon-blue">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        </div>
        <div class="kpi-body">
          <span class="kpi-num">{{ formatNumber(displayedOverview.weekVisits) }}</span>
          <span class="kpi-label">本周访问</span>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon-wrap kpi-icon-teal">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
        </div>
        <div class="kpi-body">
          <span class="kpi-num">{{ formatNumber(displayedOverview.totalVisits) }}</span>
          <span class="kpi-label">累计访问</span>
        </div>
      </div>
      <div class="kpi-card kpi-online-card">
        <div class="kpi-icon-wrap kpi-icon-emerald">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        </div>
        <div class="kpi-body">
          <span class="kpi-num">{{ formatNumber(displayedOverview.onlineCount) }}</span>
          <span class="kpi-label">当前在线</span>
        </div>
        <span class="online-dot"></span>
      </div>
    </div>

    <!-- 访问趋势 -->
    <div class="card trend-card reveal" :class="{ 'is-ready': pageReady }" style="--d: 160ms;">
      <div class="card-header">
        <h3 class="card-title">访问趋势</h3>
        <div class="range-tabs">
          <button
            v-for="item in timeRanges"
            :key="item.value"
            :class="['range-btn', { active: selectedRange === item.value }]"
            @click="changeTimeRange(item.value)"
          >{{ item.label }}</button>
        </div>
      </div>
      <div ref="trendChartRef" class="chart-lg"></div>
    </div>

    <!-- 时段 + 页面分布 -->
    <div class="two-col reveal" :class="{ 'is-ready': pageReady }" style="--d: 240ms;">
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">时段分布</h3>
          <span class="card-meta">近7天·按小时</span>
        </div>
        <div ref="hourlyChartRef" class="chart-md"></div>
      </div>
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">页面访问分布</h3>
          <span class="card-meta">近30天</span>
        </div>
        <div ref="pageChartRef" class="chart-md"></div>
      </div>
    </div>

    <!-- 来源 + 关键词 + 热门素材 -->
    <div class="three-col reveal" :class="{ 'is-ready': pageReady }" style="--d: 320ms;">
      <!-- 访客来源 -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">访客来源</h3>
        </div>
        <div ref="sourceChartRef" class="chart-md"></div>
      </div>

      <!-- 热门搜索 -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">热门搜索词</h3>
          <span class="card-meta">Top 10</span>
        </div>
        <ul v-if="topKeywords.length" class="rank-list">
          <li v-for="(item, idx) in topKeywords" :key="`kw-${idx}`" class="rank-item">
            <span :class="['rank-badge', idx < 3 && 'rank-top']">{{ idx + 1 }}</span>
            <span class="rank-text">{{ item.keyword }}</span>
            <span class="rank-count">{{ item.search_count }}</span>
          </li>
        </ul>
        <div v-else class="empty-block">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <p>暂无搜索数据</p>
        </div>
      </div>

      <!-- 热门素材 -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">热门素材</h3>
          <span class="card-meta">Top 5</span>
        </div>
        <ul v-if="topMaterials.length" class="material-list">
          <li v-for="(item, idx) in topMaterials" :key="item.id" class="material-item">
            <img :src="item.thumbnail_url || item.cover_image_path || item.file_path" :alt="item.name" class="material-thumb" />
            <div class="material-info">
              <p class="material-name">{{ item.name }}</p>
              <p class="material-views">{{ item.view_count || 0 }} 次查看</p>
            </div>
            <span :class="['rank-badge', idx < 3 && 'rank-top']" style="flex-shrink:0">{{ idx + 1 }}</span>
          </li>
        </ul>
        <div v-else class="empty-block">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          <p>暂无素材数据</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import apiClient from '@/axiosConfig'
import * as echarts from 'echarts'

// 浅色主题图表通用颜色
const AXIS_LABEL = '#94a3b8'
const SPLIT_LINE = 'rgba(226,232,240,0.8)'
const TOOLTIP_BG = '#1e293b'

export default {
  name: 'Statistics',
  data() {
    return {
      isRefreshing: false,
      overview: { todayVisits: 0, weekVisits: 0, totalVisits: 0 },
      displayedOverview: { todayVisits: 0, weekVisits: 0, totalVisits: 0, onlineCount: 0 },
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
      hourlyData: [],
      pageData: [],
      trendChart: null,
      sourceChart: null,
      hourlyChart: null,
      pageChart: null,
      refreshTimer: null,
      resizeHandler: null
    }
  },
  async mounted() {
    await this.loadAllData()
    this.startAutoRefresh()
    this.setupResize()
    this.$nextTick(() => {
      requestAnimationFrame(() => { this.pageReady = true })
    })
  },
  beforeUnmount() {
    if (this.refreshTimer) clearInterval(this.refreshTimer)
    if (this.resizeHandler) window.removeEventListener('resize', this.resizeHandler)
    ;[this.trendChart, this.sourceChart, this.hourlyChart, this.pageChart]
      .forEach(c => c?.dispose())
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
        this.loadTopMaterials(),
        this.loadHourlyData(),
        this.loadPageData()
      ])
      this.$nextTick(() => {
        this.renderTrendChart()
        this.renderSourceChart()
        this.renderHourlyChart()
        this.renderPageChart()
      })
    },

    async loadOverview() {
      const res = await apiClient.get('/api/v1/visits/overview')
      const d = res.data?.data || {}
      const next = {
        todayVisits: d.today?.visits || 0,
        weekVisits: d.week?.visits || 0,
        totalVisits: d.total?.visits || 0
      }
      this.overview = next
      this.animateCounters({ ...next, onlineCount: this.onlineCount })
    },

    async loadOnlineCount() {
      const res = await apiClient.get('/api/v1/visits/online')
      this.onlineCount = res.data?.data?.onlineCount || 0
      this.animateCounters({ ...this.overview, onlineCount: this.onlineCount })
    },

    async loadTrendData() {
      const res = await apiClient.get(`/api/v1/visits/trends?days=${this.selectedRange}`)
      this.trendData = res.data?.data || []
    },

    async loadReferrerData() {
      const res = await apiClient.get('/api/v1/visits/referrers?limit=10')
      this.referrerData = res.data?.data || []
    },

    async loadTopKeywords() {
      const res = await apiClient.get('/api/v1/visits/search/top?limit=10')
      this.topKeywords = res.data?.data || []
    },

    async loadTopMaterials() {
      const res = await apiClient.get('/api/v1/materials/stats/top?limit=5')
      this.topMaterials = res.data?.data || []
    },

    async loadHourlyData() {
      const res = await apiClient.get('/api/v1/visits/hourly')
      this.hourlyData = res.data?.data || []
    },

    async loadPageData() {
      const res = await apiClient.get('/api/v1/visits/pages?limit=8')
      this.pageData = res.data?.data || []
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
        setTimeout(() => { this.isRefreshing = false }, 400)
      }
    },

    startAutoRefresh() {
      this.refreshTimer = setInterval(async () => {
        await Promise.all([this.loadOnlineCount(), this.loadOverview()])
      }, 30000)
    },

    setupResize() {
      this.resizeHandler = () => {
        ;[this.trendChart, this.sourceChart, this.hourlyChart, this.pageChart]
          .forEach(c => c?.resize())
      }
      window.addEventListener('resize', this.resizeHandler)
    },

    animateCounters(target) {
      const start = { ...this.displayedOverview }
      const end = {
        todayVisits: Number(target.todayVisits || 0),
        weekVisits: Number(target.weekVisits || 0),
        totalVisits: Number(target.totalVisits || 0),
        onlineCount: Number(target.onlineCount || 0)
      }
      const duration = 800
      const startTime = performance.now()
      const easeOut = t => 1 - Math.pow(1 - t, 3)
      const tick = now => {
        const p = Math.min((now - startTime) / duration, 1)
        const e = easeOut(p)
        this.displayedOverview = {
          todayVisits: Math.round(start.todayVisits + (end.todayVisits - start.todayVisits) * e),
          weekVisits: Math.round(start.weekVisits + (end.weekVisits - start.weekVisits) * e),
          totalVisits: Math.round(start.totalVisits + (end.totalVisits - start.totalVisits) * e),
          onlineCount: Math.round(start.onlineCount + (end.onlineCount - start.onlineCount) * e)
        }
        if (p < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    },

    renderTrendChart() {
      if (!this.$refs.trendChartRef) return
      if (this.trendChart) this.trendChart.dispose()
      this.trendChart = echarts.init(this.$refs.trendChartRef)

      const xData = this.trendData.map(d => d.date)
      const yVisits = this.trendData.map(d => d.visits)
      const yUnique = this.trendData.map(d => d.unique_visitors)

      this.trendChart.setOption({
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'axis',
          backgroundColor: TOOLTIP_BG,
          borderColor: 'transparent',
          textStyle: { color: '#f1f5f9', fontSize: 13 },
          axisPointer: { lineStyle: { color: '#e2e8f0' } }
        },
        legend: {
          data: ['访问量', '独立访客'],
          top: 4,
          right: 0,
          textStyle: { color: '#64748b', fontSize: 12 },
          icon: 'circle',
          itemWidth: 8, itemHeight: 8
        },
        grid: { left: 8, right: 8, top: 40, bottom: 8, containLabel: true },
        xAxis: {
          type: 'category',
          data: xData,
          axisLine: { lineStyle: { color: '#e2e8f0' } },
          axisLabel: { color: AXIS_LABEL, fontSize: 12 },
          axisTick: { show: false }
        },
        yAxis: {
          type: 'value',
          minInterval: 1,
          axisLine: { show: false },
          splitLine: { lineStyle: { color: SPLIT_LINE, type: 'dashed' } },
          axisLabel: { color: AXIS_LABEL, fontSize: 12 }
        },
        series: [
          {
            name: '访问量',
            type: 'line',
            smooth: true,
            data: yVisits,
            lineStyle: { width: 2.5, color: '#5a8f73' },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(90,143,115,0.22)' },
                { offset: 1, color: 'rgba(90,143,115,0.02)' }
              ])
            },
            symbolSize: 6,
            itemStyle: { color: '#5a8f73' }
          },
          {
            name: '独立访客',
            type: 'line',
            smooth: true,
            data: yUnique,
            lineStyle: { width: 2, color: '#38bdf8', type: 'dashed' },
            symbolSize: 5,
            itemStyle: { color: '#38bdf8' }
          }
        ]
      })
    },

    renderSourceChart() {
      if (!this.$refs.sourceChartRef) return
      if (this.sourceChart) this.sourceChart.dispose()
      this.sourceChart = echarts.init(this.$refs.sourceChartRef)

      const merged = this.normalizeSources(this.referrerData)
      const total = merged.reduce((s, d) => s + d.value, 0)

      if (total === 0) {
        this.sourceChart.setOption({
          backgroundColor: 'transparent',
          graphic: [{ type: 'text', left: 'center', top: 'middle',
            style: { text: '暂无来源数据', fill: '#94a3b8', fontSize: 13 } }]
        })
        return
      }

      const COLORS = ['#5a8f73', '#38bdf8', '#fb923c']
      this.sourceChart.setOption({
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'item',
          backgroundColor: TOOLTIP_BG,
          borderColor: 'transparent',
          textStyle: { color: '#f1f5f9', fontSize: 13 },
          formatter: '{b}：{c} 次 ({d}%)'
        },
        legend: {
          bottom: 4,
          textStyle: { color: '#64748b', fontSize: 12 },
          icon: 'circle',
          itemWidth: 8, itemHeight: 8
        },
        series: [{
          type: 'pie',
          radius: ['52%', '72%'],
          center: ['50%', '44%'],
          avoidLabelOverlap: false,
          itemStyle: { borderColor: '#fff', borderWidth: 3, borderRadius: 4 },
          label: { show: false },
          emphasis: {
            label: { show: true, fontSize: 13, fontWeight: 600, color: '#1a2332' }
          },
          data: merged,
          color: COLORS
        }]
      })
    },

    renderHourlyChart() {
      if (!this.$refs.hourlyChartRef) return
      if (this.hourlyChart) this.hourlyChart.dispose()
      this.hourlyChart = echarts.init(this.$refs.hourlyChartRef)

      const hours = this.hourlyData.map(d => `${d.hour}`)
      const visits = this.hourlyData.map(d => d.visits)
      const maxVal = Math.max(...visits, 1)

      this.hourlyChart.setOption({
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'axis',
          backgroundColor: TOOLTIP_BG,
          borderColor: 'transparent',
          textStyle: { color: '#f1f5f9', fontSize: 13 },
          formatter: p => `${p[0].name}:00 — ${p[0].value} 次`
        },
        grid: { left: 8, right: 12, top: 8, bottom: 8, containLabel: true },
        xAxis: {
          type: 'category',
          data: hours,
          axisLine: { lineStyle: { color: '#e2e8f0' } },
          axisLabel: { color: AXIS_LABEL, fontSize: 11, interval: 3 },
          axisTick: { show: false }
        },
        yAxis: {
          type: 'value',
          minInterval: 1,
          axisLine: { show: false },
          splitLine: { lineStyle: { color: SPLIT_LINE, type: 'dashed' } },
          axisLabel: { color: AXIS_LABEL, fontSize: 11 }
        },
        series: [{
          type: 'bar',
          data: visits.map(v => ({
            value: v,
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: v >= maxVal * 0.65 ? '#5a8f73' : '#93c4a8' },
                { offset: 1, color: v >= maxVal * 0.65 ? 'rgba(90,143,115,0.35)' : 'rgba(147,196,168,0.25)' }
              ]),
              borderRadius: [3, 3, 0, 0]
            }
          })),
          barMaxWidth: 14
        }]
      })
    },

    renderPageChart() {
      if (!this.$refs.pageChartRef) return
      if (this.pageChart) this.pageChart.dispose()
      this.pageChart = echarts.init(this.$refs.pageChartRef)

      const pages = this.pageData.slice(0, 8)
      if (pages.length === 0) {
        this.pageChart.setOption({
          backgroundColor: 'transparent',
          graphic: [{ type: 'text', left: 'center', top: 'middle',
            style: { text: '暂无页面数据', fill: '#94a3b8', fontSize: 13 } }]
        })
        return
      }

      const labels = pages.map(d => {
        const p = d.page || '/'
        return p.length > 18 ? p.slice(0, 16) + '…' : p
      })
      const values = pages.map(d => d.visits)
      const maxV = Math.max(...values, 1)

      this.pageChart.setOption({
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'axis',
          backgroundColor: TOOLTIP_BG,
          borderColor: 'transparent',
          textStyle: { color: '#f1f5f9', fontSize: 13 },
          axisPointer: { type: 'none' },
          formatter: p => `${pages[p[0].dataIndex]?.page || '/'}<br/>${p[0].value} 次`
        },
        grid: { left: 8, right: 48, top: 4, bottom: 4, containLabel: true },
        xAxis: {
          type: 'value',
          minInterval: 1,
          axisLine: { show: false },
          splitLine: { lineStyle: { color: SPLIT_LINE, type: 'dashed' } },
          axisLabel: { color: AXIS_LABEL, fontSize: 11 }
        },
        yAxis: {
          type: 'category',
          data: labels,
          inverse: true,
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: { color: '#475569', fontSize: 11 }
        },
        series: [{
          type: 'bar',
          data: values.map(v => ({
            value: v,
            itemStyle: {
              color: new echarts.graphic.LinearGradient(1, 0, 0, 0, [
                { offset: 0, color: v >= maxV * 0.6 ? '#5a8f73' : '#93c4a8' },
                { offset: 1, color: 'rgba(90,143,115,0.15)' }
              ]),
              borderRadius: [0, 3, 3, 0]
            }
          })),
          barMaxWidth: 12,
          label: { show: true, position: 'right', color: '#64748b', fontSize: 11, formatter: '{c}' }
        }]
      })
    },

    normalizeSources(raw) {
      const bucket = { 微信: 0, 直接访问: 0, 其他: 0 }
      ;(raw || []).forEach(item => {
        const src = item.source || '其他来源'
        const v = Number(item.visits || 0)
        if (src === '微信') bucket['微信'] += v
        else if (src === '直接访问') bucket['直接访问'] += v
        else bucket['其他'] += v
      })
      return Object.entries(bucket).map(([name, value]) => ({ name, value }))
    }
  }
}
</script>

<style scoped>
/* ── 容器 ── */
.stats-page {
  padding: 24px 20px 60px;
  max-width: 1200px;
}

/* ── 入场动画 ── */
.reveal {
  opacity: 0;
  transform: translateY(8px);
  transition: opacity 0.4s ease, transform 0.4s ease;
  transition-delay: var(--d, 0ms);
}
.reveal.is-ready {
  opacity: 1;
  transform: none;
}

/* ── 页头 ── */
.stats-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.stats-title {
  font-size: 1.4rem;
  font-weight: 700;
  color: #1a2332;
  margin: 0 0 4px;
  letter-spacing: -0.01em;
}

.stats-subtitle {
  font-size: 0.88rem;
  color: #64748b;
  margin: 0;
}

.refresh-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.85rem;
  color: #374151;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
  white-space: nowrap;
}
.refresh-btn:hover { background: #f8fafc; border-color: #cbd5e1; }
.refresh-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.refresh-icon { flex-shrink: 0; }
.refresh-icon.spinning { animation: spin 1s linear infinite; }

@keyframes spin { to { transform: rotate(360deg); } }

/* ── KPI 四格 ── */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.kpi-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px 18px;
  display: flex;
  align-items: center;
  gap: 14px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  transition: box-shadow 0.2s, transform 0.2s;
  position: relative;
  overflow: hidden;
}
.kpi-card:hover {
  box-shadow: 0 4px 16px rgba(90,143,115,0.12);
  transform: translateY(-1px);
}

.kpi-icon-wrap {
  width: 42px; height: 42px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.kpi-icon-green   { background: rgba(90,143,115,0.12); color: #5a8f73; }
.kpi-icon-blue    { background: rgba(56,189,248,0.12); color: #0ea5e9; }
.kpi-icon-teal    { background: rgba(20,184,166,0.12); color: #14b8a6; }
.kpi-icon-emerald { background: rgba(16,185,129,0.12); color: #10b981; }

.kpi-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.kpi-num {
  font-size: 1.55rem;
  font-weight: 700;
  color: #1a2332;
  line-height: 1.1;
  letter-spacing: -0.02em;
}
.kpi-label {
  font-size: 0.8rem;
  color: #64748b;
}

/* 在线绿点 */
.online-dot {
  position: absolute;
  top: 14px; right: 14px;
  width: 8px; height: 8px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 0 3px rgba(16,185,129,0.2);
  animation: pulse 2s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 3px rgba(16,185,129,0.2); }
  50%       { box-shadow: 0 0 0 6px rgba(16,185,129,0.08); }
}

/* ── 通用卡片 ── */
.card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 18px 20px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.card-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: #1a2332;
  margin: 0;
}

.card-meta {
  font-size: 0.78rem;
  color: #94a3b8;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 2px 8px;
}

/* ── 图表尺寸 ── */
.trend-card { margin-bottom: 16px; }
.chart-lg { width: 100%; height: 300px; }
.chart-md { width: 100%; height: 240px; }

/* ── 两列 ── */
.two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-bottom: 16px;
}

/* ── 三列 ── */
.three-col {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}

/* ── 时段范围按钮 ── */
.range-tabs {
  display: flex;
  gap: 4px;
  background: #f1f5f9;
  padding: 3px;
  border-radius: 8px;
}
.range-btn {
  padding: 4px 14px;
  border: none;
  border-radius: 6px;
  font-size: 0.82rem;
  font-weight: 500;
  color: #64748b;
  background: transparent;
  cursor: pointer;
  transition: all 0.15s;
}
.range-btn.active {
  background: #fff;
  color: #0a3d22;
  font-weight: 600;
  box-shadow: 0 1px 4px rgba(0,0,0,0.1);
}

/* ── 排行榜 ── */
.rank-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.rank-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid #f1f5f9;
}
.rank-item:last-child { border-bottom: none; }

.rank-badge {
  width: 22px; height: 22px;
  border-radius: 6px;
  background: #f1f5f9;
  color: #64748b;
  font-size: 0.75rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.rank-badge.rank-top {
  background: linear-gradient(135deg, #0a3d22, #5a8f73);
  color: #fff;
}

.rank-text {
  flex: 1;
  font-size: 0.88rem;
  color: #374151;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rank-count {
  font-size: 0.82rem;
  color: #94a3b8;
  white-space: nowrap;
}

/* ── 素材列表 ── */
.material-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.material-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid #f1f5f9;
}
.material-item:last-child { border-bottom: none; }

.material-thumb {
  width: 44px; height: 44px;
  border-radius: 8px;
  object-fit: cover;
  border: 1px solid #e2e8f0;
  flex-shrink: 0;
}
.material-info { flex: 1; min-width: 0; }
.material-name {
  font-size: 0.87rem;
  color: #374151;
  margin: 0 0 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.material-views {
  font-size: 0.78rem;
  color: #94a3b8;
  margin: 0;
}

/* ── 空状态 ── */
.empty-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 32px 16px;
}
.empty-block p {
  font-size: 0.85rem;
  color: #94a3b8;
  margin: 0;
}

/* ── 响应式 ── */
@media (max-width: 1100px) {
  .kpi-grid { grid-template-columns: repeat(2, 1fr); }
  .three-col { grid-template-columns: 1fr 1fr; }
  .three-col > .card:last-child { grid-column: span 2; }
}

@media (max-width: 768px) {
  .stats-page { padding: 16px 12px 48px; }
  .kpi-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
  .two-col { grid-template-columns: 1fr; }
  .three-col { grid-template-columns: 1fr; }
  .three-col > .card:last-child { grid-column: auto; }
  .stats-header { flex-direction: column; gap: 10px; }
  .chart-lg { height: 240px; }
  .chart-md { height: 200px; }
  .kpi-num { font-size: 1.3rem; }
}
</style>
