<script setup lang="ts">
import { onMounted, ref } from 'vue'

import { notification } from '@shared/services/notification'
import { foundationApi } from '../api/foundationApi'
import { mapGroup } from '../adapters/foundationAdapter'
import GroupProfilePageView from '../components/GroupProfilePageView.vue'
import { foundationErrorMessage } from '../api/foundationSession'
import type { FoundationPreviewState, GroupProfile } from '../types/foundation'

const profile = ref<GroupProfile>({
  id: 0,
  groupCode: '',
  groupName: '',
  fullName: '',
  shortName: '',
  logoUrl: '',
  platformName: '',
  description: '',
  contactName: '',
  contactPhone: '',
  contactEmail: '',
  website: '',
  address: '',
  timezone: '',
  language: '',
  remarks: '',
  version: '',
  updatedAt: '',
})
const state = ref<FoundationPreviewState>('loading')

async function load() {
  state.value = 'loading'
  try {
    profile.value = mapGroup(await foundationApi.groupInfo())
    state.value = profile.value.id ? 'ready' : 'empty'
  } catch (error) {
    state.value = 'retryable-error'
    notification.error(foundationErrorMessage(error, '集团信息加载失败'))
  }
}

async function save(value: GroupProfile) {
  try {
    profile.value = mapGroup(
      await foundationApi.updateGroup({
        id: value.id,
        version: value.version,
        group_name: value.groupName,
        full_name: value.fullName,
        short_name: value.shortName,
        logo_url: value.logoFileId ? '' : value.logoUrl,
        logo_file_id: value.logoFileId ?? '',
        description: value.description,
        contact_name: value.contactName,
        contact_phone: value.contactPhone,
        contact_email: value.contactEmail,
        website: value.website,
        address: value.address,
        timezone: value.timezone,
        language: value.language,
        remarks: value.remarks,
      }),
    )
    notification.success('集团信息已保存')
  } catch (error) {
    notification.error(foundationErrorMessage(error, '集团信息保存失败'))
    throw error
  }
}

onMounted(load)
</script>

<template>
  <GroupProfilePageView :profile="profile" :state="state" :save="save" @retry="load" />
</template>
