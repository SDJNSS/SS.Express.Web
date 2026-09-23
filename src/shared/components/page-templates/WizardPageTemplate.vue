<script setup lang="ts">
defineProps<{ active: number; steps: string[] }>()
</script>

<template>
  <div class="wizard-page-template surface">
    <el-steps :active="active" finish-status="success" align-center>
      <el-step v-for="step in steps" :key="step" :title="step" />
    </el-steps>
    <div class="wizard-page-template__content"><slot /></div>
    <footer><slot name="footer" /></footer>
  </div>
</template>

<style scoped lang="scss">
.wizard-page-template {
  flex: 1;
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  padding: var(--spacing-card);
}
.wizard-page-template__content {
  min-height: 320px;
  padding: var(--spacing-5) 0;
}
.wizard-page-template footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-2);
  border-top: 1px solid var(--border-light);
  padding-top: var(--spacing-3);
}
</style>
