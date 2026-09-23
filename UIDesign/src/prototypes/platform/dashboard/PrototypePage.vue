<script setup lang="ts">
import { Icon } from '@iconify/vue'

import AppPage from '@shared/components/AppPage.vue'
import PageHeader from '@shared/components/PageHeader.vue'
import DashboardPageTemplate from '@shared/components/page-templates/DashboardPageTemplate.vue'
import StatusTag from '@shared/components/StatusTag.vue'

const metrics = [
  { label: '今日运输单', value: 128, change: '-6.2%', tone: 'primary' },
  { label: '运输中', value: 46, change: '+4.5%', tone: 'success' },
  { label: '待调度', value: 12, change: '-14.3%', tone: 'warning' },
  { label: '异常预警', value: 5, change: '+1', tone: 'danger' },
] as const

const priorities = [
  { title: '沪A12345 到达延迟', description: '预计延迟 2.5 小时', status: '运输中' },
  { title: '粤B56789 需尽快调度', description: '计划 14:00 前发运', status: '待调度' },
  { title: '鲁C88990 电子回单未上传', description: '运输任务已完成', status: '待回单' },
] as const
</script>

<template>
  <AppPage class="dashboard-prototype">
    <DashboardPageTemplate>
      <template #header>
        <PageHeader
          title="物流运营总览"
          description="汇总运输、车辆与权限态势，快速定位今日运营重点"
        >
          <template #actions>
            <el-button type="primary">
              <Icon icon="mdi:plus" width="18" aria-hidden="true" />
              新建运输单
            </el-button>
          </template>
        </PageHeader>
      </template>

      <template #metrics>
        <article v-for="metric in metrics" :key="metric.label" class="metric-card surface">
          <span class="metric-card__label">{{ metric.label }}</span>
          <strong>{{ metric.value }}</strong>
          <small>较昨日 {{ metric.change }}</small>
        </article>
      </template>

      <section class="prototype-main-grid">
        <article class="prototype-panel prototype-panel--route surface">
          <header>
            <h2>运输态势（今日）</h2>
            <span>数据截至 10:30</span>
          </header>
          <div class="route-placeholder" role="img" aria-label="成都至上海运输线路原型">
            <span>成都</span><i></i><span>西安</span><i></i><span>郑州</span><i></i
            ><span>上海</span>
          </div>
        </article>
        <article class="prototype-panel surface">
          <header>
            <h2>今日重点</h2>
            <el-button link type="primary">更多</el-button>
          </header>
          <ul class="priority-list">
            <li v-for="item in priorities" :key="item.title">
              <div>
                <strong>{{ item.title }}</strong
                ><small>{{ item.description }}</small>
              </div>
              <StatusTag :label="item.status" tone="info" />
            </li>
          </ul>
        </article>
      </section>
    </DashboardPageTemplate>
  </AppPage>
</template>

<style scoped lang="scss">
.dashboard-prototype {
  overflow: auto;
}

.metric-card {
  padding: var(--spacing-4) var(--spacing-5);

  span,
  small {
    display: block;
    color: var(--text-secondary);
  }

  strong {
    display: block;
    margin: var(--spacing-2) 0;
    font-size: var(--font-size-metric);
  }
}

.prototype-main-grid {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(320px, 1fr);
  gap: var(--spacing-4);
  min-height: 360px;
}

.prototype-panel {
  overflow: hidden;

  > header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 48px;
    padding: 0 var(--spacing-4);
    border-bottom: 1px solid var(--border-light);
  }

  h2 {
    margin: 0;
    font-size: var(--font-size-md);
  }

  header span {
    color: var(--text-secondary);
    font-size: var(--font-size-xs);
  }
}

.route-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-3);
  height: calc(100% - 48px);
  color: var(--text-regular);
  background: var(--background-muted);

  i {
    width: 18%;
    border-top: 2px dashed var(--color-primary);
  }
}

.priority-list {
  padding: 0 var(--spacing-4);
  margin: 0;
  list-style: none;

  li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-3);
    padding: var(--spacing-3) 0;
    border-bottom: 1px solid var(--border-light);
  }

  strong,
  small {
    display: block;
  }

  small {
    margin-top: var(--spacing-1);
    color: var(--text-secondary);
  }
}
</style>
