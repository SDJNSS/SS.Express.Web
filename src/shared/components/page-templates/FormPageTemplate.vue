<template>
  <div class="form-page-template">
    <slot name="header" />
    <section class="form-page-template__content surface"><slot /></section>
    <footer v-if="$slots.footer" class="form-page-template__footer">
      <slot name="footer" />
    </footer>
  </div>
</template>

<style scoped lang="scss">
.form-page-template {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--spacing-section);
  width: 100%;
  max-width: 100%;
  min-width: 0;
  min-height: 0;
}

.form-page-template__content {
  flex: 1;
  padding: var(--spacing-card);
}

.form-page-template__footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-2);
}
</style>
