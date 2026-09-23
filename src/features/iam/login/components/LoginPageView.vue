<script setup lang="ts">
import { nextTick, reactive, ref } from 'vue'
import { Icon } from '@iconify/vue'
import type { InputInstance } from 'element-plus'

import AuthBrand from '@shared/components/AuthBrand.vue'
import AuthPageTemplate from '@shared/components/page-templates/AuthPageTemplate.vue'
import type { LoginFormModel, LoginPageState } from '../types/login'

const props = withDefaults(
  defineProps<{
    modelValue: LoginFormModel
    productName: string
    title: string
    description: string
    copyright: string
    state: LoginPageState
    feedback?: string
    errorMessage?: string
  }>(),
  {
    feedback: '',
    errorMessage: '账号或密码不正确，请检查后重试',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: LoginFormModel]
  submit: [value: LoginFormModel]
  forgotPassword: []
}>()

const accountInput = ref<InputInstance>()
const passwordInput = ref<InputInstance>()
const passwordVisible = ref(false)
const errors = reactive<Record<'account' | 'password', string>>({
  account: '',
  password: '',
})

function updateModel(patch: Partial<LoginFormModel>) {
  emit('update:modelValue', { ...props.modelValue, ...patch })
}

function updateAccount(value: string) {
  updateModel({ account: value })
  if (errors.account) errors.account = ''
}

function updatePassword(value: string) {
  updateModel({ password: value })
  if (errors.password) errors.password = ''
}

function togglePassword() {
  passwordVisible.value = !passwordVisible.value
  void nextTick(() => passwordInput.value?.focus())
}

async function submitForm() {
  errors.account = props.modelValue.account.trim() ? '' : '请输入账号'
  errors.password = props.modelValue.password ? '' : '请输入密码'

  if (errors.account || errors.password) {
    await nextTick()
    if (errors.account) accountInput.value?.focus()
    else passwordInput.value?.focus()
    return
  }

  emit('submit', { ...props.modelValue, account: props.modelValue.account.trim() })
}
</script>

<template>
  <AuthPageTemplate class="login-page" :data-page-state="state">
    <template #access>
      <div class="login-page__access">
        <header><AuthBrand :product-name="productName" /></header>

        <section class="login-page__form-panel" aria-labelledby="login-title">
          <p class="login-page__eyebrow">UNIFIED ACCESS / 统一入口</p>
          <h1 id="login-title">{{ title }}</h1>
          <p class="login-page__description">{{ description }}</p>

          <el-alert
            v-if="state === 'auth-error'"
            class="login-page__alert"
            :title="errorMessage"
            type="error"
            :closable="false"
            show-icon
          />

          <el-form class="login-page__form" novalidate @submit.prevent="submitForm">
            <el-form-item label="账号" :error="errors.account">
              <el-input
                id="login-account"
                ref="accountInput"
                :model-value="modelValue.account"
                autocomplete="username"
                placeholder="请输入账号"
                :aria-invalid="Boolean(errors.account)"
                :aria-describedby="errors.account ? 'login-account-error' : undefined"
                @update:model-value="updateAccount"
              >
                <template #prefix>
                  <Icon icon="mdi:account-key-outline" width="19" aria-hidden="true" />
                </template>
              </el-input>
              <span v-if="errors.account" id="login-account-error" class="sr-only">
                {{ errors.account }}
              </span>
            </el-form-item>

            <el-form-item label="密码" :error="errors.password">
              <el-input
                id="login-password"
                ref="passwordInput"
                :model-value="modelValue.password"
                :type="passwordVisible ? 'text' : 'password'"
                autocomplete="current-password"
                placeholder="请输入密码"
                :aria-invalid="Boolean(errors.password)"
                :aria-describedby="errors.password ? 'login-password-error' : undefined"
                @update:model-value="updatePassword"
              >
                <template #prefix>
                  <Icon icon="mdi:shield-account-outline" width="19" aria-hidden="true" />
                </template>
                <template #suffix>
                  <button
                    class="login-page__password-toggle"
                    type="button"
                    :aria-label="passwordVisible ? '隐藏密码' : '显示密码'"
                    :aria-pressed="passwordVisible"
                    @click="togglePassword"
                  >
                    <Icon
                      :icon="passwordVisible ? 'mdi:eye-off-outline' : 'mdi:eye-outline'"
                      width="19"
                      aria-hidden="true"
                    />
                  </button>
                </template>
              </el-input>
              <span v-if="errors.password" id="login-password-error" class="sr-only">
                {{ errors.password }}
              </span>
            </el-form-item>

            <div class="login-page__options">
              <el-checkbox
                :model-value="modelValue.remember"
                @update:model-value="updateModel({ remember: Boolean($event) })"
              >
                记住我
              </el-checkbox>
              <button class="login-page__text-action" type="button" @click="emit('forgotPassword')">
                忘记密码
              </button>
            </div>

            <el-button
              class="login-page__submit"
              type="primary"
              native-type="submit"
              :loading="state === 'submitting'"
              :disabled="state === 'submitting'"
            >
              {{ state === 'submitting' ? '正在登录' : '登录' }}
            </el-button>
          </el-form>

          <p class="login-page__feedback" role="status" aria-live="polite">{{ feedback }}</p>
        </section>

        <footer class="login-page__footer">{{ copyright }}</footer>
      </div>
    </template>

    <template #visual>
      <div class="login-page__visual">
        <div class="login-page__visual-heading">
          <p>IDENTITY ROUTING</p>
          <strong>一次认证，贯通物流全链路</strong>
          <span>统一身份与访问控制，为每一次业务流转建立可信入口。</span>
        </div>

        <div class="login-page__route-board">
          <div class="login-page__grid" aria-hidden="true"></div>
          <svg class="login-page__route" viewBox="0 0 640 380" role="presentation">
            <path
              class="login-page__route-path"
              d="M62 292 C154 292 148 106 282 106 S430 282 574 236"
            />
            <path
              class="login-page__route-path login-page__route-path--secondary"
              d="M92 72 C214 72 190 284 344 284 S474 106 584 106"
            />
          </svg>

          <span class="login-page__system-node login-page__system-node--iam">IAM</span>
          <span class="login-page__system-node login-page__system-node--tms">TMS</span>
          <span class="login-page__system-node login-page__system-node--vms">VMS</span>

          <div class="login-page__gateway">
            <span class="login-page__gateway-icon">
              <Icon icon="mdi:shield-account-outline" width="46" />
            </span>
            <span class="login-page__gateway-copy">
              <small>ACCESS GATE</small>
              <strong>统一身份网关</strong>
              <em><i></i> 通行链路正常</em>
            </span>
          </div>

          <div class="login-page__cargo login-page__cargo--left">
            <Icon icon="mdi:cube-outline" width="28" />
            <span>业务身份</span>
          </div>
          <div class="login-page__cargo login-page__cargo--right">
            <Icon icon="mdi:truck-fast-outline" width="30" />
            <span>运输网络</span>
          </div>
        </div>

        <div class="login-page__visual-foot">
          <span>IAM</span><i></i><span>TMS</span><i></i><span>VMS</span>
        </div>
      </div>
    </template>
  </AuthPageTemplate>
</template>

<style scoped lang="scss">
.login-page__access {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  width: 100%;
  height: 100%;
  min-height: 0;
  padding: var(--spacing-12);
}

.login-page__form-panel {
  align-self: center;
  width: min(100%, calc(var(--spacing-10) * 11));
}

.login-page__eyebrow,
.login-page__visual-heading p {
  margin: 0 0 var(--spacing-3);
  color: var(--color-sidebar-brand);
  font-size: var(--font-size-xs);
  font-weight: 650;
  letter-spacing: 0.16em;
}

.login-page__form-panel h1 {
  margin: 0;
  font-size: calc(var(--font-size-metric) + var(--spacing-2));
  line-height: 1.25;
}

.login-page__description {
  margin: var(--spacing-3) 0 var(--spacing-8);
  color: var(--color-sidebar-link);
  line-height: 1.7;
}

.login-page__alert {
  margin-bottom: var(--spacing-4);
}

.login-page__form {
  display: grid;
  gap: var(--spacing-5);
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
:deep(.el-input__prefix),
:deep(.el-input__suffix) {
  color: var(--text-inverse);
}

:deep(.el-input__inner::placeholder) {
  color: var(--color-sidebar-muted);
}

:deep(.el-form-item__error) {
  position: static;
  padding-top: var(--spacing-2);
}

.login-page__password-toggle {
  display: grid;
  width: var(--size-control);
  height: var(--size-control);
  padding: 0;
  color: var(--color-sidebar-link);
  background: transparent;
  border: 0;
  border-radius: var(--radius-default);
  cursor: pointer;
  place-items: center;
}

.login-page__password-toggle:hover,
.login-page__text-action:hover {
  color: var(--color-sidebar-brand);
}

.login-page__options {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: var(--size-control);
}

:deep(.el-checkbox__label) {
  color: var(--color-sidebar-link);
}

.login-page__text-action {
  padding: var(--spacing-2) 0;
  color: var(--color-sidebar-brand);
  font-weight: 600;
  background: transparent;
  border: 0;
  cursor: pointer;
}

.login-page__submit {
  width: 100%;
  min-height: calc(var(--size-control) + var(--spacing-3));
  margin-top: var(--spacing-1);
}

.login-page__feedback {
  min-height: calc(var(--font-size-base) * 1.6);
  margin: var(--spacing-4) 0 0;
  color: var(--color-sidebar-link);
  line-height: 1.6;
}

.login-page__footer {
  color: var(--color-sidebar-muted);
  font-size: var(--font-size-xs);
}

.login-page__visual {
  position: relative;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  width: 100%;
  height: 100%;
  min-height: 0;
  padding: var(--spacing-12);
}

.login-page__visual-heading {
  position: relative;
  z-index: 2;
  max-width: calc(var(--spacing-10) * 10);
}

.login-page__visual-heading strong {
  display: block;
  font-size: var(--font-size-metric);
  line-height: 1.4;
}

.login-page__visual-heading span {
  display: block;
  margin-top: var(--spacing-2);
  color: var(--color-sidebar-link);
  line-height: 1.7;
}

.login-page__route-board {
  position: relative;
  align-self: center;
  justify-self: center;
  width: min(94%, calc(var(--spacing-10) * 16));
  height: min(78%, calc(var(--spacing-10) * 10));
  min-height: calc(var(--spacing-10) * 7);
}

.login-page__grid {
  position: absolute;
  inset: 0;
  opacity: 0.22;
  background-image:
    linear-gradient(
      color-mix(in srgb, var(--color-sidebar-muted) 22%, transparent) 1px,
      transparent 1px
    ),
    linear-gradient(
      90deg,
      color-mix(in srgb, var(--color-sidebar-muted) 22%, transparent) 1px,
      transparent 1px
    );
  background-size: var(--spacing-10) var(--spacing-10);
  mask-image: linear-gradient(to bottom, transparent, var(--background-sidebar), transparent);
}

.login-page__route {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  color: var(--color-sidebar-brand);
  overflow: visible;
}

.login-page__route-path {
  fill: none;
  stroke: currentcolor;
  stroke-dasharray: 7 10;
  stroke-linecap: round;
  stroke-width: 2;
}

.login-page__route-path--secondary {
  opacity: 0.4;
}

.login-page__system-node {
  position: absolute;
  z-index: 2;
  display: grid;
  width: calc(var(--spacing-10) + var(--spacing-2));
  height: calc(var(--spacing-10) + var(--spacing-2));
  color: var(--text-inverse);
  font-size: var(--font-size-xs);
  font-weight: 700;
  background: var(--background-sidebar-active);
  border: 1px solid var(--color-sidebar-brand);
  border-radius: 50%;
  box-shadow: var(--shadow-route-marker);
  place-items: center;
}

.login-page__system-node--iam {
  top: 7%;
  left: 10%;
}

.login-page__system-node--tms {
  top: 66%;
  right: 6%;
}

.login-page__system-node--vms {
  right: 16%;
  bottom: 7%;
}

.login-page__gateway {
  position: absolute;
  z-index: 3;
  top: 50%;
  left: 50%;
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
  width: min(66%, calc(var(--spacing-10) * 7));
  padding: var(--spacing-5);
  color: var(--text-primary);
  background: var(--background-card);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-large);
  box-shadow: var(--shadow-floating);
  transform: translate(-50%, -50%);
}

.login-page__gateway-icon {
  display: grid;
  flex: none;
  width: calc(var(--spacing-10) + var(--spacing-6));
  height: calc(var(--spacing-10) + var(--spacing-6));
  color: var(--color-primary);
  background: var(--color-primary-light);
  border-radius: var(--radius-large);
  place-items: center;
}

.login-page__gateway-copy {
  display: grid;
  gap: var(--spacing-1);
}

.login-page__gateway-copy small {
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
  letter-spacing: 0.12em;
}

.login-page__gateway-copy strong {
  font-size: var(--font-size-lg);
}

.login-page__gateway-copy em {
  color: var(--color-success);
  font-size: var(--font-size-sm);
  font-style: normal;
}

.login-page__gateway-copy i {
  display: inline-block;
  width: var(--spacing-2);
  height: var(--spacing-2);
  margin-right: var(--spacing-1);
  background: var(--color-success);
  border-radius: 50%;
}

.login-page__cargo {
  position: absolute;
  z-index: 2;
  display: grid;
  gap: var(--spacing-2);
  min-width: calc(var(--spacing-10) * 3);
  padding: var(--spacing-4);
  color: var(--color-sidebar-link);
  background: color-mix(in srgb, var(--background-sidebar-active) 68%, var(--background-sidebar));
  border: 1px solid color-mix(in srgb, var(--color-sidebar-brand) 34%, transparent);
  border-radius: var(--radius-large);
  box-shadow: var(--shadow-card);
}

.login-page__cargo svg {
  color: var(--color-sidebar-brand);
}

.login-page__cargo--left {
  bottom: 10%;
  left: 6%;
}

.login-page__cargo--right {
  top: 13%;
  right: 5%;
}

.login-page__visual-foot {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--spacing-3);
  color: var(--color-sidebar-muted);
  font-size: var(--font-size-xs);
  letter-spacing: 0.12em;
}

.login-page__visual-foot i {
  width: var(--spacing-8);
  height: 1px;
  background: color-mix(in srgb, var(--color-sidebar-muted) 42%, transparent);
}

@media (max-height: 800px) {
  .login-page__access,
  .login-page__visual {
    padding: var(--spacing-8) var(--spacing-10);
  }

  .login-page__description {
    margin-bottom: var(--spacing-5);
  }

  .login-page__form {
    gap: var(--spacing-4);
  }
}
</style>
