<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'split' | 'focused'
  }>(),
  {
    variant: 'split',
  },
)
</script>

<template>
  <main
    class="auth-page-template"
    :class="`auth-page-template--${variant}`"
    :data-auth-page-variant="variant"
    data-auth-page-template
  >
    <section class="auth-page-template__access" aria-label="身份验证">
      <slot name="access" />
    </section>

    <section v-if="variant === 'split'" class="auth-page-template__visual" aria-hidden="true">
      <slot name="visual" />
    </section>
  </main>
</template>

<style scoped lang="scss">
.auth-page-template {
  display: grid;
  grid-template-columns: minmax(0, 0.94fr) minmax(0, 1.06fr);
  flex: 1;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  color: var(--text-inverse);
  background: var(--background-sidebar);
}

.auth-page-template__access,
.auth-page-template__visual {
  position: relative;
  min-width: 0;
  min-height: 0;
}

.auth-page-template__access {
  z-index: 1;
  border-right: 1px solid color-mix(in srgb, var(--color-sidebar-muted) 18%, transparent);
}

.auth-page-template__visual {
  overflow: hidden;
  background: color-mix(in srgb, var(--background-sidebar) 84%, var(--background-sidebar-active));
}

.auth-page-template--focused {
  grid-template-columns: minmax(0, 1fr);
}

.auth-page-template--focused .auth-page-template__access {
  border-right: 0;
}
</style>
