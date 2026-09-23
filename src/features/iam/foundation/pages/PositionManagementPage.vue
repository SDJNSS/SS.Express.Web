<script setup lang="ts">
import { onMounted, ref } from 'vue'

import { notification } from '@shared/services/notification'
import { foundationApi } from '../api/foundationApi'
import { mapPosition } from '../adapters/foundationAdapter'
import PositionManagementPageView from '../components/PositionManagementPageView.vue'
import {
  currentTenantId,
  foundationErrorMessage,
  getFoundationSession,
} from '../api/foundationSession'
import type { FoundationPreviewState, PositionFormValue, PositionRecord } from '../types/foundation'

const records = ref<PositionRecord[]>([])
const state = ref<FoundationPreviewState>('loading')
const tenant = ref({ name: '', code: '', timezone: '' })

async function load() {
  state.value = 'loading'
  try {
    const session = getFoundationSession()
    tenant.value = {
      name: session?.currentTenantName ?? '',
      code: session?.currentTenantCode ?? '',
      timezone:
        session?.availableTenants?.find((item) => item.tenantId === session.currentTenantId)
          ?.timezone ?? '',
    }
    const response = await foundationApi.queryPositions({
      tenant_id: currentTenantId(),
      page_index: 1,
      page_size: 1000,
    })
    records.value = response.items.map(mapPosition)
    state.value = records.value.length ? 'ready' : 'empty'
  } catch (error) {
    state.value = 'retryable-error'
    notification.error(foundationErrorMessage(error, '岗位加载失败'))
  }
}

async function save(mode: 'create' | 'edit', value: PositionFormValue, record: PositionRecord) {
  try {
    const tenantId = currentTenantId()
    const common = {
      tenant_id: tenantId,
      position_name: value.name.trim(),
      position_type: value.type,
      sort_order: value.sortOrder,
      remarks: value.remarks.trim(),
    }
    if (mode === 'create') await foundationApi.createPosition(common)
    else {
      await foundationApi.updatePosition({
        ...common,
        id: record.id,
        version: record.version ?? '',
      })
    }
    notification.success(mode === 'create' ? '岗位已创建' : '岗位已保存')
    await load()
  } catch (error) {
    notification.error(foundationErrorMessage(error, '岗位保存失败'))
    throw error
  }
}

async function changeStatus(record: PositionRecord, targetStatus: 'ACTIVE' | 'DISABLED') {
  try {
    await foundationApi.changePositionStatus({
      id: record.id,
      version: record.version ?? '',
      target_status: targetStatus,
    })
    notification.success(targetStatus === 'ACTIVE' ? '岗位已启用' : '岗位已停用')
    await load()
  } catch (error) {
    notification.error(foundationErrorMessage(error, '岗位状态更新失败'))
    throw error
  }
}

onMounted(load)
</script>

<template>
  <PositionManagementPageView
    :records="records"
    :state="state"
    :tenant="tenant"
    :save="save"
    :change-status="changeStatus"
    @retry="load"
  />
</template>
