<script setup lang="ts">
import { ref } from 'vue'
import { Icon } from '@iconify/vue'

const props = withDefaults(
  defineProps<{
    loading?: boolean
    collapsible?: boolean
    defaultExpanded?: boolean
  }>(),
  {
    loading: false,
    collapsible: false,
    defaultExpanded: false,
  },
)

const emit = defineEmits<{
  search: []
  reset: []
}>()

const expanded = ref(props.defaultExpanded)
</script>

<template>
  <section class="search-panel surface" aria-label="查询条件">
    <div class="search-panel__fields">
      <slot />
    </div>

    <div v-if="collapsible && expanded" class="search-panel__advanced">
      <slot name="advanced" />
    </div>

    <div class="search-panel__footer">
      <div class="search-panel__footer-leading">
        <slot name="footer-leading" />
        <el-button v-if="collapsible" link type="primary" @click="expanded = !expanded">
          {{ expanded ? '收起筛选' : '更多筛选' }}
          <Icon
            :icon="expanded ? 'mdi:chevron-up' : 'mdi:chevron-down'"
            width="18"
            aria-hidden="true"
          />
        </el-button>
      </div>
      <div class="search-panel__actions">
        <el-button @click="emit('reset')">重置</el-button>
        <el-button type="primary" :loading="loading" @click="emit('search')">查询</el-button>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
.search-panel {
  container-type: inline-size;
  padding: var(--spacing-2) var(--spacing-3);
}

.search-panel__fields,
.search-panel__advanced {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: var(--spacing-1) var(--spacing-3);
  align-items: end;
}

.search-panel :deep(.el-form-item) {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  min-width: 0;
  margin: 0;
}

.search-panel :deep(.el-form-item__label) {
  justify-content: flex-start;
  height: auto;
  min-height: var(--spacing-4);
  padding: 0;
  margin: 0;
  line-height: var(--spacing-4);
}

.search-panel :deep(.el-form-item__content) {
  min-width: 0;
  line-height: normal;
}

.search-panel :deep(.el-input),
.search-panel :deep(.el-select),
.search-panel :deep(.el-date-editor) {
  width: 100%;
}

.search-panel :deep(.el-select__wrapper),
.search-panel :deep(.el-select__selection) {
  flex-wrap: nowrap;
  min-width: 0;
}

.search-panel :deep(.el-select__wrapper) {
  height: var(--size-control);
  overflow: hidden;
}

.search-panel__advanced {
  padding-top: var(--spacing-2);
  margin-top: var(--spacing-2);
  border-top: 1px dashed var(--border-default);
}

.search-panel__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-2);
  margin-top: var(--spacing-1);
}

.search-panel__footer-leading,
.search-panel__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-2);
}

@container (max-width: 1360px) {
  .search-panel__fields,
  .search-panel__advanced {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
}

@container (max-width: 1050px) {
  .search-panel__fields,
  .search-panel__advanced {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@container (max-width: 800px) {
  .search-panel__fields,
  .search-panel__advanced {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@container (max-width: 600px) {
  .search-panel__fields,
  .search-panel__advanced {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
