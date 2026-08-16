<template>
  <div class="page-container">
    <div v-if="showHeader" class="page-header">
      <div class="header-left">
        <h2 class="page-title">{{ title }}</h2>
        <p v-if="description" class="page-description">{{ description }}</p>
      </div>
      <div class="header-right">
        <slot name="headerExtra"></slot>
      </div>
    </div>

    <div v-if="showSearch" class="page-search">
      <slot name="search"></slot>
    </div>

    <div class="page-content" :class="{ 'has-footer': showFooter }">
      <slot></slot>
    </div>

    <div v-if="showFooter" class="page-footer">
      <slot name="footer"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title?: string;
  description?: string;
  showHeader?: boolean;
  showSearch?: boolean;
  showFooter?: boolean;
}>();
</script>

<style scoped>
.page-container {
  padding: 16px;
  background: #fff;
  min-height: calc(100vh - 120px);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.header-left {
  flex: 1;
}

.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #262626;
}

.page-description {
  margin: 8px 0 0 0;
  font-size: 14px;
  color: #8c8c8c;
}

.header-right {
  flex-shrink: 0;
  margin-left: 16px;
}

.page-search {
  margin-bottom: 16px;
  padding: 16px;
  background: #fafafa;
  border-radius: 4px;
}

.page-content {
  min-height: 200px;
}

.page-content.has-footer {
  padding-bottom: 60px;
}

.page-footer {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
  text-align: right;
}
</style>
