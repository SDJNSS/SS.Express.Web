<script setup lang="ts">
import { Icon } from '@iconify/vue'

import type { FoundationPreviewState, TenantOption } from '../types/foundation'

defineProps<{
  options: TenantOption[]
  selectedId: number | undefined
  setAsDefault: boolean
  state: FoundationPreviewState
  mode: 'select' | 'switch'
}>()

const emit = defineEmits<{
  select: [id: number]
  'update:setAsDefault': [value: boolean]
  submit: []
  cancel: []
  retry: []
}>()
</script>

<template>
  <section
    class="tenant-choice"
    :data-tenant-choice-mode="mode"
    aria-labelledby="tenant-choice-title"
  >
    <header class="tenant-choice__header">
      <div class="tenant-choice__eyebrow">TENANT CONTEXT / 业务空间</div>
      <h1 id="tenant-choice-title">
        {{ mode === 'select' ? '选择要进入的 Tenant' : '切换当前 Tenant' }}
      </h1>
      <p>
        {{
          mode === 'select'
            ? '登录成功。请选择本次要进入的业务空间，系统只展示你当前可访问的 Tenant。'
            : '切换成功后将清空当前 Tenant 的页面数据，并在新的业务空间重新加载。'
        }}
      </p>
    </header>

    <div v-if="state === 'loading'" class="tenant-choice__state" role="status">
      <el-icon class="is-loading"
        ><Icon icon="mdi:refresh" width="22" aria-hidden="true"
      /></el-icon>
      <span>正在确认可进入的 Tenant</span>
    </div>
    <div
      v-else-if="state === 'retryable-error'"
      class="tenant-choice__state tenant-choice__state--error"
      role="alert"
    >
      <Icon icon="mdi:alert-circle-outline" width="26" aria-hidden="true" />
      <strong>可用 Tenant 加载失败</strong>
      <span>当前没有切换任何业务上下文，请重新加载。</span>
      <el-button type="primary" plain @click="emit('retry')">重新加载</el-button>
    </div>
    <div v-else-if="state === 'empty'" class="tenant-choice__state">
      <Icon icon="mdi:inbox-outline" width="30" aria-hidden="true" />
      <strong>当前没有可用 Tenant</strong>
      <span>请联系集团或 Tenant 管理员核实成员状态与有效期。</span>
      <el-button @click="emit('cancel')">退出登录</el-button>
    </div>

    <div v-else class="tenant-choice__body">
      <div class="tenant-choice__list" role="radiogroup" aria-label="可进入 Tenant">
        <button
          v-for="option in options"
          :key="option.id"
          class="tenant-choice__card"
          :class="{ 'is-selected': option.id === selectedId }"
          type="button"
          role="radio"
          :aria-checked="option.id === selectedId"
          @click="emit('select', option.id)"
        >
          <span class="tenant-choice__mark" aria-hidden="true">{{ option.accent }}</span>
          <span class="tenant-choice__identity">
            <strong>{{ option.name }}</strong>
            <small>{{ option.code }} · {{ option.type }}</small>
          </span>
          <span class="tenant-choice__meta">
            <em v-if="option.isDefault">默认</em>
            <small>{{ option.timezone }}</small>
          </span>
          <span class="tenant-choice__check" aria-hidden="true">
            <Icon
              :icon="option.id === selectedId ? 'mdi:clipboard-check-outline' : 'mdi:chevron-right'"
              width="21"
            />
          </span>
        </button>
      </div>

      <footer class="tenant-choice__footer">
        <el-checkbox
          :model-value="setAsDefault"
          @update:model-value="emit('update:setAsDefault', Boolean($event))"
        >
          将所选 Tenant 设为默认
        </el-checkbox>
        <div>
          <el-button @click="emit('cancel')">{{
            mode === 'select' ? '退出登录' : '保持当前 Tenant'
          }}</el-button>
          <el-button type="primary" :disabled="!selectedId" @click="emit('submit')">
            {{ mode === 'select' ? '进入 Tenant' : '确认切换' }}
            <Icon icon="mdi:chevron-right" width="18" aria-hidden="true" />
          </el-button>
        </div>
      </footer>
    </div>
  </section>
</template>

<style scoped lang="scss">
.tenant-choice {
  display: grid;
  align-content: start;
  gap: var(--spacing-6);
  width: min(100%, calc(var(--spacing-12) * 16));
}

.tenant-choice__header {
  text-align: center;
}

.tenant-choice__eyebrow {
  margin-bottom: var(--spacing-2);
  color: var(--color-sidebar-brand);
  font-size: var(--font-size-xs);
  font-weight: 650;
  letter-spacing: 0.15em;
}

.tenant-choice__header h1 {
  margin: 0;
  color: var(--text-inverse);
  font-size: var(--font-size-metric);
  line-height: 1.4;
}

.tenant-choice__header p {
  max-width: calc(var(--spacing-12) * 12);
  margin: var(--spacing-2) auto 0;
  color: var(--color-sidebar-link);
  line-height: 1.7;
}

.tenant-choice__body {
  display: grid;
  gap: var(--spacing-5);
}

.tenant-choice__list {
  display: grid;
  gap: var(--spacing-3);
}

.tenant-choice__card {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto auto;
  align-items: center;
  gap: var(--spacing-4);
  width: 100%;
  min-height: calc(var(--spacing-12) + var(--spacing-8));
  padding: var(--spacing-4);
  color: var(--text-inverse);
  text-align: left;
  background: color-mix(in srgb, var(--background-sidebar-active) 36%, var(--background-sidebar));
  border: 1px solid color-mix(in srgb, var(--color-sidebar-muted) 34%, transparent);
  border-radius: var(--radius-large);
  cursor: pointer;
}

.tenant-choice__card:hover,
.tenant-choice__card.is-selected {
  border-color: var(--color-sidebar-brand);
}

.tenant-choice__card.is-selected {
  background: color-mix(in srgb, var(--background-sidebar-active) 70%, var(--background-sidebar));
  box-shadow: var(--shadow-route-marker);
}

.tenant-choice__mark {
  display: grid;
  width: var(--spacing-12);
  height: var(--spacing-12);
  color: var(--text-inverse);
  font-size: var(--font-size-md);
  font-weight: 700;
  background: var(--background-sidebar-active);
  border: 1px solid color-mix(in srgb, var(--color-sidebar-brand) 44%, transparent);
  border-radius: var(--radius-large);
  place-items: center;
}

.tenant-choice__identity strong,
.tenant-choice__identity small,
.tenant-choice__meta small {
  display: block;
}

.tenant-choice__identity strong {
  margin-bottom: var(--spacing-1);
  font-size: var(--font-size-md);
}

.tenant-choice__identity small,
.tenant-choice__meta small {
  color: var(--color-sidebar-link);
}

.tenant-choice__meta {
  display: grid;
  justify-items: end;
  gap: var(--spacing-2);
}

.tenant-choice__meta em {
  padding: var(--spacing-1) var(--spacing-2);
  color: var(--color-sidebar-brand);
  font-size: var(--font-size-xs);
  font-style: normal;
  background: color-mix(in srgb, var(--color-sidebar-brand) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-sidebar-brand) 34%, transparent);
  border-radius: var(--radius-small);
}

.tenant-choice__check {
  display: grid;
  width: var(--size-control);
  height: var(--size-control);
  color: var(--color-sidebar-brand);
  place-items: center;
}

.tenant-choice__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-4);
  padding-top: var(--spacing-5);
  border-top: 1px solid color-mix(in srgb, var(--color-sidebar-muted) 26%, transparent);
}

.tenant-choice__footer > div {
  display: flex;
  gap: var(--spacing-3);
}

:deep(.tenant-choice__footer .el-checkbox__label) {
  color: var(--color-sidebar-link);
}

.tenant-choice__state {
  display: grid;
  min-height: calc(var(--spacing-12) * 5);
  gap: var(--spacing-3);
  color: var(--color-sidebar-link);
  place-content: center;
  justify-items: center;
  text-align: center;
}

.tenant-choice__state strong {
  color: var(--text-inverse);
  font-size: var(--font-size-md);
}

.tenant-choice__state--error {
  color: var(--color-sidebar-link);
}
</style>
