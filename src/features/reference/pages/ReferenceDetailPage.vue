<script setup lang="ts">
import AppPage from '@shared/components/AppPage.vue'
import PageHeader from '@shared/components/PageHeader.vue'
import DetailPageTemplate from '@shared/components/page-templates/DetailPageTemplate.vue'
import StatusTag from '@shared/components/StatusTag.vue'
</script>

<template>
  <AppPage>
    <DetailPageTemplate scroll-mode="page">
      <template #header>
        <PageHeader
          title="ReferenceDetailPage"
          description="标准详情页模板：摘要、分组信息、业务数据、资料与历史记录"
        >
          <template #actions
            ><el-button @click="$router.back()">返回</el-button
            ><el-button type="primary">编辑</el-button></template
          >
        </PageHeader>
      </template>
      <template #summary>
        <section class="detail-summary surface">
          <div><span>记录编号</span><strong>REF-202609-001</strong></div>
          <div><span>当前状态</span><StatusTag label="正常" tone="success" /></div>
          <div><span>负责人</span><strong>林嘉</strong></div>
          <div><span>更新时间</span><strong>2026-09-01 10:24</strong></div>
        </section>
      </template>
      <el-tabs model-value="basic">
        <el-tab-pane label="基本信息" name="basic"
          ><el-descriptions :column="3" border
            ><el-descriptions-item label="名称">华东区域基础资料</el-descriptions-item
            ><el-descriptions-item label="所属组织">华东运输中心</el-descriptions-item
            ><el-descriptions-item label="业务类型">基础资料</el-descriptions-item
            ><el-descriptions-item label="创建人">林嘉</el-descriptions-item
            ><el-descriptions-item label="创建时间">2026-08-12 09:30</el-descriptions-item
            ><el-descriptions-item label="备注"
              >标准详情页参考数据</el-descriptions-item
            ></el-descriptions
          ></el-tab-pane
        >
        <el-tab-pane label="业务数据" name="business"
          ><el-empty description="暂无业务数据"
        /></el-tab-pane>
        <el-tab-pane label="资料文件" name="documents"
          ><el-empty description="暂无资料文件"
        /></el-tab-pane>
        <el-tab-pane label="历史记录" name="history"
          ><el-timeline
            ><el-timeline-item timestamp="2026-09-01 10:24">更新基础信息</el-timeline-item
            ><el-timeline-item timestamp="2026-08-12 09:30">创建记录</el-timeline-item></el-timeline
          ></el-tab-pane
        >
      </el-tabs>
    </DetailPageTemplate>
  </AppPage>
</template>

<style scoped lang="scss">
.detail-summary {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  padding: var(--spacing-5);
}
.detail-summary > div {
  padding: 0 var(--spacing-5);
  border-right: 1px solid var(--border-light);
}
.detail-summary > div:first-child {
  padding-left: 0;
}
.detail-summary > div:last-child {
  border-right: 0;
}
.detail-summary span {
  display: block;
  margin-bottom: var(--spacing-2);
  color: var(--text-secondary);
}
</style>
