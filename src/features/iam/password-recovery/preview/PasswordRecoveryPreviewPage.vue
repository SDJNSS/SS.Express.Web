<script setup lang="ts">
import { reactive, ref } from 'vue'

import PasswordRecoveryPageView from '../components/PasswordRecoveryPageView.vue'
import type {
  PasswordRecoveryFormModel,
  PasswordRecoveryPageState,
} from '../types/passwordRecovery'
import { passwordRecoveryPageFixture } from './passwordRecovery.fixture'

const params = new URLSearchParams(window.location.search)
const scenario = params.get('scenario')
const form = reactive<PasswordRecoveryFormModel>({ ...passwordRecoveryPageFixture.initialModel })
const state = ref<PasswordRecoveryPageState>(
  scenario === 'submitting'
    ? 'submitting'
    : scenario === 'submitted'
      ? 'submitted'
      : scenario === 'retryable-error'
        ? 'retryable-error'
        : 'ready',
)
const feedback = ref(scenario === 'submitted' ? '如果该账号可用于找回，请按后续验证提示继续。' : '')

function updateForm(value: PasswordRecoveryFormModel) {
  Object.assign(form, value)
  if (state.value === 'retryable-error' || state.value === 'submitted') state.value = 'ready'
  feedback.value = ''
}

function submitCandidate() {
  state.value = 'submitting'
  feedback.value = ''

  window.setTimeout(() => {
    state.value = 'submitted'
    feedback.value = '如果该账号可用于找回，请按后续验证提示继续。'
  }, 360)
}

function showBackNotice() {
  feedback.value = '候选返回入口已验证；生产路由接入后返回登录页。'
}
</script>

<template>
  <PasswordRecoveryPageView
    :model-value="form"
    :product-name="passwordRecoveryPageFixture.productName"
    :title="passwordRecoveryPageFixture.title"
    :description="passwordRecoveryPageFixture.description"
    :copyright="passwordRecoveryPageFixture.copyright"
    :state="state"
    :feedback="feedback"
    @update:model-value="updateForm"
    @submit="submitCandidate"
    @back="showBackNotice"
  />
</template>
