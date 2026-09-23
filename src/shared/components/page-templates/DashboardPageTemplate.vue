<template>
  <div class="dashboard-page-template">
    <slot name="header" />
    <section class="dashboard-page-template__metrics"><slot name="metrics" /></section>
    <section class="dashboard-page-template__main"><slot /></section>
  </div>
</template>

<style scoped lang="scss">
.dashboard-page-template {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--spacing-section);
  width: 100%;
  max-width: 100%;
  min-width: 0;
  min-height: 0;
}
.dashboard-page-template__metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--spacing-section);
}
.dashboard-page-template__main {
  flex: 1;
  min-height: 0;
}
</style>
