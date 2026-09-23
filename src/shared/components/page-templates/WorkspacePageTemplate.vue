<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    asideWidth?: string
    scrollMode?: 'contained' | 'page' | 'capped-page'
    pageHeightLimit?: 2 | 3
  }>(),
  {
    asideWidth: '320px',
    scrollMode: 'contained',
    pageHeightLimit: 2,
  },
)
</script>

<template>
  <div
    class="workspace-page-template"
    :class="`workspace-page-template--${props.scrollMode}-scroll`"
    :style="{
      '--workspace-aside': props.asideWidth,
      '--workspace-page-max-height': `${props.pageHeightLimit * 100}%`,
    }"
  >
    <aside><slot name="aside" /></aside>
    <main><slot /></main>
    <section v-if="$slots.inspector" class="workspace-page-template__inspector">
      <slot name="inspector" />
    </section>
  </div>
</template>

<style scoped lang="scss">
.workspace-page-template {
  display: grid;
  grid-template-columns: var(--workspace-aside) minmax(0, 1fr);
  flex: 1;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: var(--background-card);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-default);
}
.workspace-page-template--page-scroll,
.workspace-page-template--capped-page-scroll {
  flex: none;
  overflow: visible;
}
.workspace-page-template--contained-scroll {
  min-height: calc(var(--size-table-row) * 6 + var(--spacing-12));
}
.workspace-page-template--capped-page-scroll {
  max-height: var(--workspace-page-max-height);
}
.workspace-page-template > aside,
.workspace-page-template > main,
.workspace-page-template__inspector {
  min-height: 0;
}
.workspace-page-template > aside {
  border-right: 1px solid var(--border-default);
}
.workspace-page-template > main {
  min-width: 0;
  overflow: auto;
}
.workspace-page-template--page-scroll > main,
.workspace-page-template--capped-page-scroll > main {
  overflow: visible;
}
.workspace-page-template__inspector {
  border-left: 1px solid var(--border-default);
}
</style>
