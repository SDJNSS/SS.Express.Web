<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { Icon } from '@iconify/vue'
import type { InputInstance } from 'element-plus'

import AuthBrand from '@shared/components/AuthBrand.vue'
import AuthPageTemplate from '@shared/components/page-templates/AuthPageTemplate.vue'
import type {
  PasswordRecoveryFormModel,
  PasswordRecoveryPageState,
} from '../types/passwordRecovery'

const props = defineProps<{
  modelValue: PasswordRecoveryFormModel
  productName: string
  title: string
  description: string
  copyright: string
  state: PasswordRecoveryPageState
  feedback?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: PasswordRecoveryFormModel]
  submit: [value: PasswordRecoveryFormModel]
  back: []
}>()

const accountInput = ref<InputInstance>()
const accountError = ref('')

function updateAccount(value: string) {
  emit('update:modelValue', { account: value })
  if (accountError.value) accountError.value = ''
}

async function submitForm() {
  const account = props.modelValue.account.trim()
  accountError.value = account ? '' : '请输入账号'

  if (accountError.value) {
    await nextTick()
    accountInput.value?.focus()
    return
  }

  emit('submit', { account })
}
</script>

<template>
  <AuthPageTemplate class="password-recovery-page" variant="focused" :data-page-state="state">
    <template #access>
      <div class="password-recovery-page__surface">
        <header class="password-recovery-page__brand">
          <AuthBrand :product-name="productName" />
        </header>

        <main class="password-recovery-page__main">
          <section class="password-recovery-page__panel" aria-labelledby="recovery-title">
            <div class="password-recovery-page__route-cue" aria-hidden="true">
              <i></i>
              <span>
                <Icon icon="mdi:account-key-outline" width="30" />
              </span>
              <i></i>
            </div>

            <p class="password-recovery-page__eyebrow">ACCOUNT RECOVERY / 账号找回</p>
            <h1 id="recovery-title">{{ title }}</h1>
            <p class="password-recovery-page__description">{{ description }}</p>

            <el-alert
              v-if="state === 'retryable-error'"
              class="password-recovery-page__alert"
              title="暂时无法提交找回请求，请稍后重试"
              type="error"
              :closable="false"
              show-icon
            />

            <el-alert
              v-if="state === 'submitted'"
              class="password-recovery-page__alert"
              title="找回请求已受理"
              type="success"
              :closable="false"
              show-icon
            />

            <el-form class="password-recovery-page__form" novalidate @submit.prevent="submitForm">
              <el-form-item label="账号" :error="accountError">
                <el-input
                  id="recovery-account"
                  ref="accountInput"
                  :model-value="modelValue.account"
                  autocomplete="username"
                  placeholder="请输入账号"
                  :aria-invalid="Boolean(accountError)"
                  :aria-describedby="accountError ? 'recovery-account-error' : undefined"
                  @update:model-value="updateAccount"
                >
                  <template #prefix>
                    <Icon icon="mdi:account-key-outline" width="19" aria-hidden="true" />
                  </template>
                </el-input>
                <span v-if="accountError" id="recovery-account-error" class="sr-only">
                  {{ accountError }}
                </span>
              </el-form-item>

              <el-button
                class="password-recovery-page__submit"
                type="primary"
                native-type="submit"
                :loading="state === 'submitting'"
                :disabled="state === 'submitting'"
              >
                {{ state === 'submitting' ? '正在发送' : '发送验证码' }}
              </el-button>
            </el-form>

            <button class="password-recovery-page__back" type="button" @click="emit('back')">
              <Icon icon="mdi:chevron-left" width="20" aria-hidden="true" />
              返回登录
            </button>

            <p class="password-recovery-page__feedback" role="status" aria-live="polite">
              {{ feedback }}
            </p>
          </section>
        </main>

        <footer class="password-recovery-page__footer">{{ copyright }}</footer>
      </div>
    </template>
  </AuthPageTemplate>
</template>

<style scoped lang="scss">
.password-recovery-page__surface {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  width: 100%;
  height: 100%;
  min-height: 0;
  padding: var(--spacing-12);
}

.password-recovery-page__brand {
  justify-self: center;
}

.password-recovery-page__main {
  display: grid;
  min-height: 0;
  place-items: center;
}

.password-recovery-page__panel {
  width: min(100%, calc(var(--spacing-10) * 12));
  text-align: center;
}

.password-recovery-page__route-cue {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-3);
  margin-bottom: var(--spacing-5);
  color: var(--color-sidebar-brand);
}

.password-recovery-page__route-cue i {
  width: var(--spacing-10);
  height: 1px;
  background: color-mix(in srgb, var(--color-sidebar-brand) 34%, transparent);
}

.password-recovery-page__route-cue span {
  display: grid;
  width: calc(var(--spacing-10) + var(--spacing-5));
  height: calc(var(--spacing-10) + var(--spacing-5));
  background: color-mix(in srgb, var(--background-sidebar-active) 72%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-sidebar-brand) 46%, transparent);
  border-radius: 50%;
  box-shadow: var(--shadow-route-marker);
  place-items: center;
}

.password-recovery-page__eyebrow {
  margin: 0 0 var(--spacing-3);
  color: var(--color-sidebar-brand);
  font-size: var(--font-size-xs);
  font-weight: 650;
  letter-spacing: 0.16em;
}

.password-recovery-page__panel h1 {
  margin: 0;
  font-size: calc(var(--font-size-metric) + var(--spacing-2));
  line-height: 1.25;
}

.password-recovery-page__description {
  margin: var(--spacing-3) 0 var(--spacing-8);
  color: var(--color-sidebar-link);
  line-height: 1.7;
}

.password-recovery-page__alert {
  margin-bottom: var(--spacing-4);
  text-align: left;
}

.password-recovery-page__form {
  display: grid;
  gap: var(--spacing-6);
  text-align: left;
}

:deep(.el-form-item) {
  display: grid;
  gap: var(--spacing-2);
  margin: 0;
}

:deep(.el-form-item__label) {
  justify-content: flex-start;
  height: auto;
  color: var(--text-inverse);
  line-height: 1.4;
}

:deep(.el-form-item__content) {
  display: block;
  line-height: normal;
}

:deep(.el-input__wrapper) {
  min-height: calc(var(--size-control) + var(--spacing-3));
  padding: 0 var(--spacing-4);
  background: color-mix(in srgb, var(--background-sidebar) 70%, var(--background-sidebar-active));
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--color-sidebar-muted) 34%, transparent) inset;
}

:deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px var(--color-sidebar-brand) inset;
}

:deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px var(--border-focus) inset;
}

:deep(.el-input__inner),
:deep(.el-input__prefix) {
  color: var(--text-inverse);
}

:deep(.el-input__inner::placeholder) {
  color: var(--color-sidebar-muted);
}

:deep(.el-form-item__error) {
  position: static;
  padding-top: var(--spacing-2);
}

.password-recovery-page__submit {
  width: 100%;
  min-height: calc(var(--size-control) + var(--spacing-3));
}

.password-recovery-page__back {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-1);
  margin-top: var(--spacing-4);
  padding: var(--spacing-2);
  color: var(--color-sidebar-brand);
  font-weight: 600;
  background: transparent;
  border: 0;
  border-radius: var(--radius-default);
  cursor: pointer;
}

.password-recovery-page__back:hover {
  color: var(--text-inverse);
  background: color-mix(in srgb, var(--background-sidebar-active) 42%, transparent);
}

.password-recovery-page__feedback {
  min-height: calc(var(--font-size-base) * 1.6);
  margin: var(--spacing-3) 0 0;
  color: var(--color-sidebar-link);
  line-height: 1.6;
}

.password-recovery-page__footer {
  justify-self: center;
  color: var(--color-sidebar-muted);
  font-size: var(--font-size-xs);
}

@media (max-height: 800px) {
  .password-recovery-page__surface {
    padding: var(--spacing-6) var(--spacing-10);
  }

  .password-recovery-page__route-cue {
    margin-bottom: var(--spacing-3);
  }

  .password-recovery-page__description {
    margin-bottom: var(--spacing-5);
  }
}
</style>
