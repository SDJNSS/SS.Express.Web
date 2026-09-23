<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import type { EChartsCoreOption } from 'echarts/core'

import AppPage from '@shared/components/AppPage.vue'
import PageHeader from '@shared/components/PageHeader.vue'
import RowActionGrid from '@shared/components/RowActionGrid.vue'
import StatusTag from '@shared/components/StatusTag.vue'
import DataTable, { type DataTableColumn } from '@shared/components/DataTable.vue'
import LoadingState from '@shared/components/LoadingState.vue'
import BaseChart from '@shared/components/charts/BaseChart.vue'
import DashboardPageTemplate from '@shared/components/page-templates/DashboardPageTemplate.vue'
import { createChartTheme } from '@shared/charts/chartTheme'
import { notification } from '@shared/services/notification'
import RouteOverview from '../components/RouteOverview.vue'
import { useDashboard } from '../composables/useDashboard'
import type { TransportTask } from '../types/dashboard'

const { data, loading, refresh, isWelcomeOnlySession, welcomeDisplayName } = useDashboard()
const chartTheme = createChartTheme()

const taskColumns: DataTableColumn[] = [
  { prop: 'orderNo', label: '运输单号', minWidth: 142 },
  { prop: 'customer', label: '客户', minWidth: 108 },
  { prop: 'route', label: '线路', minWidth: 120 },
  { prop: 'vehicle', label: '承运车辆', minWidth: 150 },
  { prop: 'eta', label: '计划到达', minWidth: 112 },
  { label: '状态', width: 88, slot: 'status' },
  { label: '操作', width: 108, fixed: 'right', slot: 'actions' },
]

const vehicleChartOption = computed<EChartsCoreOption>(() => ({
  ...chartTheme.baseOption,
  color: chartTheme.colors,
  tooltip: { trigger: 'item', formatter: '{b}<br/>{c} 辆 · {d}%' },
  legend: {
    orient: 'vertical',
    right: chartTheme.spacing2,
    top: 'middle',
    itemWidth: chartTheme.spacing2,
    itemHeight: chartTheme.spacing2,
    icon: 'circle',
    itemGap: chartTheme.spacing3,
    textStyle: { color: chartTheme.textSecondary, fontSize: chartTheme.fontSizeXs },
  },
  series: [
    {
      name: '车辆状态',
      type: 'pie',
      radius: ['52%', '72%'],
      center: ['34%', '51%'],
      label: { show: false },
      emphasis: { scale: true, scaleSize: 5 },
      data: data.value?.vehicleDistribution ?? [],
    },
  ],
  graphic: [
    {
      type: 'text',
      left: '28%',
      top: '43%',
      style: { text: '总数', fill: chartTheme.textSecondary, fontSize: chartTheme.fontSizeXs },
    },
    {
      type: 'text',
      left: '27%',
      top: '51%',
      style: {
        text: '286',
        fill: chartTheme.textPrimary,
        fontSize: chartTheme.fontSizeMetric,
        fontWeight: 650,
      },
    },
  ],
}))

function asTask(row: Record<string, unknown>): TransportTask {
  return row as TransportTask
}

function createOrder() {
  notification.success('已打开运输单创建流程（演示）')
}
</script>

<template>
  <AppPage v-if="isWelcomeOnlySession" class="welcome-page">
    <PageHeader title="欢迎页" description="欢迎进入陆链统一物流平台" />

    <section class="welcome-page__panel surface" aria-labelledby="welcome-title">
      <div class="welcome-page__content">
        <span class="welcome-page__icon" aria-hidden="true">
          <Icon icon="mdi:truck-fast-outline" width="32" />
        </span>
        <p class="welcome-page__eyebrow">UNIFIED LOGISTICS PLATFORM</p>
        <h2 id="welcome-title">欢迎，{{ welcomeDisplayName }}</h2>
        <p>
          您已成功登录陆链控制台。平台 Dashboard 正在建设中，后续将在这里汇总 IAM、TMS 与 VMS
          的关键数据。
        </p>
      </div>
    </section>
  </AppPage>

  <AppPage v-else class="dashboard-page">
    <DashboardPageTemplate>
      <template #header>
        <PageHeader
          title="物流运营总览"
          description="汇总运输、车辆与权限态势，快速定位今日运营重点"
        >
          <template #actions>
            <el-button type="primary" @click="createOrder">
              <Icon icon="mdi:plus" width="18" aria-hidden="true" />
              新建运输单
            </el-button>
          </template>
        </PageHeader>
      </template>

      <template #metrics>
        <article
          v-for="metric in data?.metrics ?? []"
          :key="metric.label"
          class="metric-card surface"
        >
          <span class="metric-card__icon" :class="`metric-card__icon--${metric.tone}`">
            <Icon :icon="metric.icon" width="24" aria-hidden="true" />
          </span>
          <div>
            <span class="metric-card__label">{{ metric.label }}</span>
            <strong>{{ metric.value }}</strong>
            <small>
              较昨日
              <em :class="metric.direction">
                <Icon
                  :icon="metric.direction === 'up' ? 'mdi:arrow-up' : 'mdi:arrow-down'"
                  width="13"
                />
                {{ metric.change }}
              </em>
            </small>
          </div>
        </article>
      </template>

      <LoadingState v-if="loading && !data" label="正在汇总运营数据…" />

      <template v-else-if="data">
        <section class="dashboard-grid dashboard-grid--main">
          <article class="dashboard-panel surface">
            <header class="panel-header">
              <h2>运输态势（今日）</h2>
              <span>数据截至 10:30</span>
            </header>
            <RouteOverview />
          </article>

          <article class="dashboard-panel surface">
            <header class="panel-header">
              <h2>今日重点</h2>
              <el-button link type="primary"
                >更多 <Icon icon="mdi:chevron-right" width="17"
              /></el-button>
            </header>
            <ol class="priority-list">
              <li v-for="(item, index) in data.priorities" :key="item.id">
                <span class="priority-list__index">{{ index + 1 }}</span>
                <div>
                  <strong>{{ item.title }}</strong>
                  <small>{{ item.description }}</small>
                </div>
                <StatusTag :label="item.status" :tone="item.tone" />
              </li>
            </ol>
          </article>
        </section>

        <section class="dashboard-grid dashboard-grid--bottom">
          <article class="dashboard-panel dashboard-panel--table surface">
            <header class="panel-header">
              <h2>最新运输任务</h2>
              <div class="panel-header__actions">
                <el-select model-value="all" class="task-status-select" aria-label="运输任务状态">
                  <el-option label="全部状态" value="all" />
                  <el-option label="运输中" value="transit" />
                  <el-option label="待调度" value="pending" />
                </el-select>
                <el-button :loading="loading" @click="refresh">刷新</el-button>
              </div>
            </header>
            <div class="task-table">
              <DataTable :data="data.tasks" :columns="taskColumns" height="100%">
                <template #status="{ row }">
                  <StatusTag :label="asTask(row).status" :tone="asTask(row).statusTone" />
                </template>
                <template #actions="{ row }">
                  <RowActionGrid :aria-label="`${asTask(row).orderNo} 的操作`">
                    <el-button
                      link
                      type="primary"
                      @click.stop="notification.info(`查看 ${asTask(row).orderNo}`)"
                      >详情</el-button
                    >
                    <el-button
                      link
                      type="primary"
                      @click.stop="notification.info(`跟踪 ${asTask(row).orderNo}`)"
                      >跟踪</el-button
                    >
                  </RowActionGrid>
                </template>
              </DataTable>
            </div>
          </article>

          <article class="dashboard-panel surface">
            <header class="panel-header">
              <h2>车辆状态分布</h2>
              <el-button link type="primary" @click="$router.push('/vms/overview')"
                >车辆管理 <Icon icon="mdi:chevron-right" width="17"
              /></el-button>
            </header>
            <div class="vehicle-chart">
              <BaseChart :option="vehicleChartOption" accessibility-label="车辆状态分布环形图" />
            </div>
            <div class="panel-footnote">共 286 辆 · 数据截至 10:30</div>
          </article>
        </section>
      </template>
    </DashboardPageTemplate>
  </AppPage>
</template>

<style scoped lang="scss">
.welcome-page__panel {
  display: grid;
  flex: 1;
  min-height: 0;
  padding: var(--spacing-12);
  place-items: center;
  text-align: center;
}

.welcome-page__content {
  display: flex;
  max-width: calc(var(--spacing-10) * 14);
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-3);
}

.welcome-page__icon {
  display: grid;
  width: calc(var(--spacing-12) + var(--spacing-4));
  height: calc(var(--spacing-12) + var(--spacing-4));
  margin-bottom: var(--spacing-2);
  color: var(--color-primary);
  background: var(--color-primary-light);
  border-radius: 50%;
  place-items: center;
}

.welcome-page__eyebrow {
  margin: 0;
  color: var(--color-primary);
  font-size: var(--font-size-xs);
  font-weight: 650;
  letter-spacing: 0.12em;
}

.welcome-page__content h2 {
  margin: 0;
  font-size: var(--font-size-metric);
  line-height: 1.4;
}

.welcome-page__content > p:last-child {
  margin: 0;
  color: var(--text-secondary);
  line-height: 1.8;
}

.dashboard-page {
  gap: var(--spacing-3);
}

.metric-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
  min-height: 108px;
  padding: var(--spacing-4) var(--spacing-5);
}

.metric-card__icon {
  display: grid;
  flex: none;
  width: 52px;
  height: 52px;
  color: var(--color-primary);
  background: var(--color-primary-light);
  border-radius: 50%;
  place-items: center;
}

.metric-card__icon--success {
  color: var(--color-success);
  background: var(--color-success-light);
}
.metric-card__icon--warning {
  color: var(--color-warning);
  background: var(--color-warning-light);
}
.metric-card__icon--danger {
  color: var(--color-danger);
  background: var(--color-danger-light);
}

.metric-card__label {
  display: block;
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}

.metric-card strong {
  display: block;
  margin-top: var(--spacing-1);
  font-size: var(--font-size-metric);
  line-height: 1.25;
  font-variant-numeric: tabular-nums;
}

.metric-card small {
  display: flex;
  gap: var(--spacing-2);
  margin-top: var(--spacing-1);
  color: var(--text-secondary);
}

.metric-card em {
  display: flex;
  align-items: center;
  font-style: normal;
}

.metric-card em.up {
  color: var(--color-danger);
}
.metric-card em.down {
  color: var(--color-success);
}

.dashboard-grid {
  display: grid;
  gap: var(--spacing-3);
  min-height: 0;
}

.dashboard-grid--main {
  grid-template-columns: minmax(0, 2fr) minmax(320px, 1fr);
  min-height: 300px;
}

.dashboard-grid--bottom {
  grid-template-columns: minmax(0, 2fr) minmax(320px, 1fr);
  min-height: 270px;
}

.dashboard-panel {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.panel-header {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: space-between;
  min-height: 48px;
  padding: 0 var(--spacing-4);
  border-bottom: 1px solid var(--border-light);

  h2 {
    margin: 0;
    font-size: var(--font-size-md);
    font-weight: 650;
  }

  > span {
    color: var(--text-secondary);
    font-size: var(--font-size-xs);
  }
}

.panel-header__actions {
  display: flex;
  gap: var(--spacing-2);
}

.priority-list {
  padding: 0 var(--spacing-4);
  margin: 0;
  list-style: none;

  li {
    display: grid;
    grid-template-columns: 24px minmax(0, 1fr) auto;
    align-items: center;
    gap: var(--spacing-3);
    min-height: 49px;
    border-bottom: 1px solid var(--border-light);
  }

  strong,
  small {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  strong {
    font-size: var(--font-size-sm);
    font-weight: 600;
  }

  small {
    margin-top: var(--spacing-1);
    color: var(--text-secondary);
    font-size: var(--font-size-xs);
  }
}

.priority-list__index {
  display: grid;
  width: 22px;
  height: 22px;
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
  background: var(--background-muted);
  border-radius: var(--radius-small);
  place-items: center;
}

.priority-list li:first-child .priority-list__index {
  color: var(--text-inverse);
  background: var(--color-danger);
}
.priority-list li:nth-child(2) .priority-list__index,
.priority-list li:nth-child(3) .priority-list__index {
  color: var(--text-inverse);
  background: var(--color-warning);
}

.dashboard-panel--table {
  min-height: 270px;
}

.task-table {
  flex: 1;
  min-height: 0;
}

.task-status-select {
  width: 108px;
}

.vehicle-chart {
  flex: 1;
  min-height: 190px;
}

.panel-footnote {
  padding: 0 var(--spacing-4) var(--spacing-3);
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
}

@media (max-height: 850px) {
  .dashboard-page {
    overflow: auto;
  }
}
</style>
