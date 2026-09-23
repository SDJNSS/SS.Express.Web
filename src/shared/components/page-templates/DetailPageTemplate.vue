<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    scrollMode?: 'contained' | 'page'
  }>(),
  { scrollMode: 'page' },
)
</script>

<template>
  <div
    class="detail-page-template"
    :class="`detail-page-template--${props.scrollMode}-scroll`"
    :data-scroll-mode="props.scrollMode"
  >
    <slot name="header" />
    <slot name="summary" />
    <section class="detail-page-template__content surface"><slot /></section>
  </div>
</template>

<style scoped lang="scss">
.detail-page-template {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--spacing-section);
  width: 100%;
  max-width: 100%;
  min-width: 0;
  min-height: 0;
}
.detail-page-template__content {
  flex: 1;
  box-sizing: border-box;
  min-height: 0;
  padding: var(--spacing-card);
  overflow: hidden;
}

.detail-page-template--contained-scroll > .detail-page-template__content {
  min-height: calc(var(--size-table-row) * 6 + var(--spacing-12));
}

.detail-page-template--page-scroll {
  flex: none;
  min-height: 100%;
}

.detail-page-template--page-scroll > .detail-page-template__content {
  flex: none;
  overflow: visible;
}
</style>
