<script setup lang="ts">
withDefaults(
  defineProps<{
    scrollable?: boolean
  }>(),
  { scrollable: true },
)
</script>

<template>
  <main
    class="app-page"
    :class="scrollable ? 'app-page--scrollable' : 'app-page--contained'"
    data-app-page
    :data-scroll-mode="scrollable ? 'page' : 'contained'"
  >
    <slot />
  </main>
</template>

<style scoped lang="scss">
.app-page {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--spacing-section);
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
  min-width: 0;
  min-height: 0;
  padding: var(--spacing-page);
  background: var(--background-page);
}

.app-page--scrollable,
.app-page--contained {
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
}
</style>
