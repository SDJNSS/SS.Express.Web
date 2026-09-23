<script setup lang="ts">
export type ListPageScrollMode = 'page' | 'contained'

withDefaults(
  defineProps<{
    scrollMode?: ListPageScrollMode
  }>(),
  {
    scrollMode: 'page',
  },
)
</script>

<template>
  <div
    class="list-page-template"
    :class="`list-page-template--${scrollMode}`"
    :data-scroll-mode="scrollMode"
  >
    <slot name="header" />
    <slot name="search" />
    <section class="list-page-template__content surface">
      <slot name="toolbar" />
      <div class="list-page-template__table"><slot /></div>
      <slot name="pagination" />
    </section>
  </div>
</template>

<style scoped lang="scss">
.list-page-template {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-section);
  width: 100%;
  max-width: 100%;
  min-width: 0;
  min-height: 0;
}

.list-page-template--page {
  flex: 0 0 auto;
  min-height: 100%;
}

.list-page-template--contained {
  flex: 1;
}

.list-page-template__content {
  display: flex;
  flex-direction: column;
  min-height: calc(var(--size-table-row) * 6 + var(--spacing-12));
}

.list-page-template--page .list-page-template__content {
  flex: 0 0 auto;
  overflow: visible;
}

.list-page-template--contained .list-page-template__content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.list-page-template__table {
  min-width: 0;
  min-height: 0;
}

.list-page-template__table :deep(.el-alert) {
  width: auto;
}

.list-page-template--page .list-page-template__table {
  flex: 0 0 auto;
}

.list-page-template--contained .list-page-template__table {
  flex: 1;
}
</style>
