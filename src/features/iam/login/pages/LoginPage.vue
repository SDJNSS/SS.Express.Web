<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { login, loginErrorMessage, persistLoginSession } from '../api/loginApi'
import LoginPageView from '../components/LoginPageView.vue'
import { loginPageContent } from '../loginPage.config'
import type { LoginFormModel, LoginPageState } from '../types/login'
import { IAM_LOGIN_STATES } from '../types/loginApi'

const route = useRoute()
const router = useRouter()
const form = reactive<LoginFormModel>({ account: '', password: '', remember: false })
const state = ref<LoginPageState>('ready')
const feedback = ref('')
const errorMessage = ref('账号或密码不正确，请检查后重试')

function updateForm(value: LoginFormModel) {
  Object.assign(form, value)
  if (state.value === 'auth-error') state.value = 'ready'
  feedback.value = ''
}

function safeRedirect(): string {
  const target = route.query.redirect
  return typeof target === 'string' && target.startsWith('/') && !target.startsWith('//')
    ? target
    : '/platform/welcome'
}

async function submitLogin(value: LoginFormModel) {
  if (state.value === 'submitting') return
  state.value = 'submitting'
  feedback.value = ''

  try {
    const response = await login(value)
    persistLoginSession(response, value.account, value.remember)
    form.password = ''

    if (
      response.login_state === IAM_LOGIN_STATES.authenticated ||
      response.login_state === IAM_LOGIN_STATES.initialPasswordChangeRequired
    ) {
      await router.replace(
        response.login_state === IAM_LOGIN_STATES.authenticated
          ? safeRedirect()
          : '/platform/welcome',
      )
      return
    }

    if (response.login_state === IAM_LOGIN_STATES.tenantSelectionRequired) {
      await router.replace('/iam/select-tenant')
      return
    }

    state.value = 'ready'
    feedback.value = '账号验证成功，但当前登录状态暂不支持，请联系管理员。'
  } catch (error) {
    form.password = ''
    errorMessage.value = loginErrorMessage(error)
    state.value = 'auth-error'
  }
}

function handlePasswordRecovery() {
  feedback.value = '密码找回服务尚未接入，请联系管理员。'
}
</script>

<template>
  <LoginPageView
    :model-value="form"
    :product-name="loginPageContent.productName"
    :title="loginPageContent.title"
    :description="loginPageContent.description"
    :copyright="loginPageContent.copyright"
    :state="state"
    :feedback="feedback"
    :error-message="errorMessage"
    @update:model-value="updateForm"
    @submit="submitLogin"
    @forgot-password="handlePasswordRecovery"
  />
</template>
