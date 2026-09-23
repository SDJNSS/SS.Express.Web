<script setup lang="ts">
import { reactive, ref } from 'vue'

import LoginPageView from '../components/LoginPageView.vue'
import type { LoginFormModel, LoginPageState } from '../types/login'
import { loginPageFixture } from './login.fixture'

const params = new URLSearchParams(window.location.search)
const scenario = params.get('scenario')
const form = reactive<LoginFormModel>({ ...loginPageFixture.initialModel })
const state = ref<LoginPageState>(
  scenario === 'auth-error' ? 'auth-error' : scenario === 'submitting' ? 'submitting' : 'ready',
)
const feedback = ref('')

function updateForm(value: LoginFormModel) {
  Object.assign(form, value)
  if (state.value === 'auth-error') state.value = 'ready'
}

function submitCandidate() {
  state.value = 'submitting'
  feedback.value = ''

  window.setTimeout(() => {
    state.value = 'ready'
    feedback.value = '候选交互已验证；正式登录需接入 IAM 服务。'
  }, 360)
}

function showPasswordRecoveryNotice() {
  feedback.value = '密码找回流程将在生产接入时由 IAM 策略确定。'
}
</script>

<template>
  <LoginPageView
    :model-value="form"
    :product-name="loginPageFixture.productName"
    :title="loginPageFixture.title"
    :description="loginPageFixture.description"
    :copyright="loginPageFixture.copyright"
    :state="state"
    :feedback="feedback"
    @update:model-value="updateForm"
    @submit="submitCandidate"
    @forgot-password="showPasswordRecoveryNotice"
  />
</template>
