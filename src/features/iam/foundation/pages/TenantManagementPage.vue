<script setup lang="ts">
import { onMounted, ref } from 'vue'

import { notification } from '@shared/services/notification'
import { foundationApi } from '../api/foundationApi'
import { mapTenant } from '../adapters/foundationAdapter'
import TenantManagementPageView from '../components/TenantManagementPageView.vue'
import { foundationErrorMessage } from '../api/foundationSession'
import type {
  FoundationPreviewState,
  TenantFormValue,
  TenantInitialAdminValue,
  TenantRecord,
} from '../types/foundation'

const records = ref<TenantRecord[]>([])
const state = ref<FoundationPreviewState>('loading')

async function load() {
  state.value = 'loading'
  try {
    const response = await foundationApi.queryTenants({ page_index: 1, page_size: 1000 })
    records.value = response.items.map(mapTenant)
    state.value = records.value.length ? 'ready' : 'empty'
  } catch (error) {
    state.value = 'retryable-error'
    notification.error(foundationErrorMessage(error, 'Tenant 列表加载失败'))
  }
}

async function save(value: TenantFormValue, record: TenantRecord) {
  try {
    await foundationApi.updateTenant({
      id: record.id,
      version: record.version,
      group_id: record.groupId,
      tenant_name: value.name.trim(),
      tenant_type: value.type,
      company_name: value.name.trim(),
      contact_name: value.contactName.trim(),
      contact_phone: value.contactPhone.trim(),
      contact_email: value.contactEmail.trim(),
      address: value.address.trim(),
      domain: value.domain.trim(),
      subdomain: value.subdomain.trim(),
      logo_url: value.logoFileId ? '' : value.logoUrl.trim(),
      logo_file_id: value.logoFileId ?? '',
      timezone: value.timezone,
      language: value.language,
      sort_order: value.sortOrder,
      remarks: value.remarks.trim(),
    })
    notification.success('Tenant 已保存')
    await load()
  } catch (error) {
    notification.error(foundationErrorMessage(error, 'Tenant 保存失败'))
    throw error
  }
}

async function create(value: TenantFormValue, admin: TenantInitialAdminValue) {
  try {
    await foundationApi.createTenant({
      tenant_name: value.name.trim(),
      tenant_type: value.type,
      company_name: value.name.trim(),
      contact_name: value.contactName.trim(),
      contact_phone: value.contactPhone.trim(),
      contact_email: value.contactEmail.trim(),
      address: value.address.trim(),
      domain: value.domain.trim(),
      subdomain: value.subdomain.trim(),
      logo_url: value.logoFileId ? '' : value.logoUrl.trim(),
      logo_file_id: value.logoFileId ?? '',
      timezone: value.timezone,
      language: value.language,
      sort_order: value.sortOrder,
      remarks: value.remarks.trim(),
      initial_admin: {
        tenant_id: 0,
        use_existing_user: admin.mode === 'existing',
        ...(admin.mode === 'existing'
          ? { existing_user_name: admin.existingUserName.trim() }
          : {
              new_user: {
                user_name: admin.userName.trim(),
                real_name: admin.realName.trim(),
                nick_name: admin.nickName.trim(),
                phone: admin.phone.trim(),
                email: admin.email.trim(),
                avatar_url: admin.avatarFileId ? '' : admin.avatarUrl.trim(),
                avatar_file_id: admin.avatarFileId ?? '',
                user_type: admin.userType,
              },
            }),
        user_type: admin.memberUserType,
        effective_start: admin.effectiveStart,
        ...(admin.effectiveEnd ? { effective_end: admin.effectiveEnd } : {}),
        is_tenant_admin: true,
        remarks: admin.remarks.trim(),
        organizations: [],
        positions: [],
      },
    })
    notification.success('Tenant 与首名管理员已创建')
    await load()
  } catch (error) {
    notification.error(foundationErrorMessage(error, 'Tenant 创建失败'))
    throw error
  }
}

async function changeStatus(record: TenantRecord, targetStatus: 'ACTIVE' | 'DISABLED') {
  try {
    await foundationApi.changeTenantStatus({
      id: record.id,
      version: record.version,
      target_status: targetStatus,
    })
    notification.success(targetStatus === 'ACTIVE' ? 'Tenant 已启用' : 'Tenant 已停用')
    await load()
  } catch (error) {
    notification.error(foundationErrorMessage(error, 'Tenant 状态更新失败'))
    throw error
  }
}

onMounted(load)
</script>

<template>
  <TenantManagementPageView
    :records="records"
    :state="state"
    :save="save"
    :create="create"
    :change-status="changeStatus"
    @retry="load"
  />
</template>
