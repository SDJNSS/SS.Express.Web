<script setup lang="ts">
import { reactive, ref } from 'vue'
import { Icon } from '@iconify/vue'

import AppPage from '@shared/components/AppPage.vue'
import DetailPageTemplate from '@shared/components/page-templates/DetailPageTemplate.vue'
import FormDrawer from '@shared/components/FormDrawer.vue'
import ImageAssetField from '@shared/business-components/ImageAssetField.vue'
import LoadingState from '@shared/components/LoadingState.vue'
import PageHeader from '@shared/components/PageHeader.vue'
import { IAM_PERMISSIONS } from '@shared/constants/iamPermissions'
import type { FoundationPreviewState, GroupProfile } from '../types/foundation'

const props = defineProps<{
  profile: GroupProfile
  state: FoundationPreviewState
  save?: (profile: GroupProfile) => Promise<void>
}>()

const emit = defineEmits<{
  action: [message: string]
  retry: []
}>()

const editVisible = ref(false)
const submitting = ref(false)
const uploadBlocked = ref(false)
const editForm = reactive<GroupProfile>({ ...props.profile })

function openEdit() {
  Object.assign(editForm, props.profile)
  uploadBlocked.value = false
  editVisible.value = true
}

async function finishEdit() {
  if (submitting.value || uploadBlocked.value) return
  if (!props.save) {
    editVisible.value = false
    emit('action', '集团信息与 Logo 候选编辑已保存')
    return
  }
  submitting.value = true
  try {
    await props.save({ ...editForm })
    editVisible.value = false
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <AppPage class="group-profile-page">
    <DetailPageTemplate scroll-mode="page">
      <template #header>
        <PageHeader title="集团信息" description="维护平台级品牌、联系信息与默认区域设置">
          <template #actions>
            <el-button @click="emit('retry')">
              <Icon icon="mdi:refresh" width="18" aria-hidden="true" />
              刷新
            </el-button>
            <el-button v-permission="IAM_PERMISSIONS.group.update" type="primary" @click="openEdit"
              >编辑集团信息</el-button
            >
          </template>
        </PageHeader>
      </template>

      <template #summary>
        <section class="group-identity surface" aria-label="集团摘要">
          <div class="group-identity__logo">
            <img v-if="profile.logoUrl" :src="profile.logoUrl" :alt="`${profile.groupName} Logo`" />
            <span v-else aria-label="集团 Logo 未设置">SS</span>
          </div>
          <div class="group-identity__copy">
            <p>GROUP PROFILE / 集团档案</p>
            <h2>{{ profile.groupName }}</h2>
            <span>{{ profile.fullName }}</span>
          </div>
          <dl class="group-identity__metrics">
            <div>
              <dt>集团编码</dt>
              <dd>{{ profile.groupCode }}</dd>
            </div>
            <div>
              <dt>平台名称</dt>
              <dd>{{ profile.platformName }}</dd>
            </div>
            <div>
              <dt>默认时区</dt>
              <dd>{{ profile.timezone }}</dd>
            </div>
          </dl>
        </section>
      </template>

      <LoadingState v-if="state === 'loading'" class="group-profile-page__state" />
      <el-result
        v-else-if="state === 'retryable-error'"
        icon="error"
        title="集团信息加载失败"
        sub-title="请检查网络连接后重新加载，编辑入口暂不可用。"
      >
        <template #extra>
          <el-button type="primary" @click="emit('retry')">重新加载</el-button>
        </template>
      </el-result>
      <el-empty v-else-if="state === 'empty'" description="尚未配置集团信息" />

      <div v-else class="group-profile-page__sections">
        <section class="profile-section" aria-labelledby="group-basic-title">
          <header>
            <Icon icon="mdi:domain" width="21" aria-hidden="true" />
            <div>
              <h2 id="group-basic-title">基础信息</h2>
              <p>平台展示、品牌与集团识别信息</p>
            </div>
          </header>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="集团 Logo">
              <div class="profile-logo-value">
                <img
                  v-if="profile.logoUrl"
                  :src="profile.logoUrl"
                  :alt="`${profile.groupName} Logo`"
                />
                <span v-else>未设置</span>
              </div>
            </el-descriptions-item>
            <el-descriptions-item label="集团编码">
              <span class="read-only-value">{{ profile.groupCode }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="集团名称">{{ profile.groupName }}</el-descriptions-item>
            <el-descriptions-item label="集团简称">{{ profile.shortName }}</el-descriptions-item>
            <el-descriptions-item label="集团全称">{{ profile.fullName }}</el-descriptions-item>
            <el-descriptions-item label="平台展示名称">
              <span class="read-only-value">{{ profile.platformName }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="网站">{{ profile.website }}</el-descriptions-item>
            <el-descriptions-item label="集团说明">{{ profile.description }}</el-descriptions-item>
          </el-descriptions>
        </section>

        <section class="profile-section" aria-labelledby="group-contact-title">
          <header>
            <Icon icon="mdi:card-account-details-outline" width="21" aria-hidden="true" />
            <div>
              <h2 id="group-contact-title">联系与区域设置</h2>
              <p>对外联系信息和平台默认显示规则</p>
            </div>
          </header>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="联系人">{{ profile.contactName }}</el-descriptions-item>
            <el-descriptions-item label="联系电话">{{ profile.contactPhone }}</el-descriptions-item>
            <el-descriptions-item label="联系邮箱">{{ profile.contactEmail }}</el-descriptions-item>
            <el-descriptions-item label="地址">{{ profile.address }}</el-descriptions-item>
            <el-descriptions-item label="默认时区">{{ profile.timezone }}</el-descriptions-item>
            <el-descriptions-item label="默认语言">{{ profile.language }}</el-descriptions-item>
            <el-descriptions-item label="备注">{{ profile.remarks }}</el-descriptions-item>
            <el-descriptions-item label="更新时间">{{ profile.updatedAt }}</el-descriptions-item>
          </el-descriptions>
        </section>
      </div>
    </DetailPageTemplate>

    <FormDrawer
      v-model="editVisible"
      title="编辑集团信息"
      size="min(820px, 86%)"
      :submitting="submitting"
      :confirm-disabled="uploadBlocked"
      confirm-button-text="保存集团信息"
      @confirm="finishEdit"
    >
      <el-alert
        title="集团编码与平台展示名称为只读字段；上传 Logo 后保存文件 ID，访问链接按需获取。"
        type="info"
        :closable="false"
        show-icon
      />
      <el-form class="group-profile-form" label-position="top">
        <el-form-item label="集团编码">
          <el-input v-model="editForm.groupCode" disabled />
        </el-form-item>
        <el-form-item label="平台展示名称">
          <el-input v-model="editForm.platformName" disabled />
        </el-form-item>
        <el-form-item label="集团名称"><el-input v-model="editForm.groupName" /></el-form-item>
        <el-form-item label="集团简称"><el-input v-model="editForm.shortName" /></el-form-item>
        <el-form-item class="group-profile-form__wide" label="集团全称">
          <el-input v-model="editForm.fullName" />
        </el-form-item>
        <el-form-item class="group-profile-form__wide" label="集团 Logo">
          <ImageAssetField
            v-model:file-id="editForm.logoFileId"
            v-model:image-url="editForm.logoUrl"
            :disabled="submitting"
            @blocked-change="uploadBlocked = $event"
          />
        </el-form-item>
        <el-form-item label="联系人"><el-input v-model="editForm.contactName" /></el-form-item>
        <el-form-item label="联系电话"><el-input v-model="editForm.contactPhone" /></el-form-item>
        <el-form-item label="联系邮箱"><el-input v-model="editForm.contactEmail" /></el-form-item>
        <el-form-item label="网站"><el-input v-model="editForm.website" /></el-form-item>
        <el-form-item class="group-profile-form__wide" label="地址">
          <el-input v-model="editForm.address" />
        </el-form-item>
        <el-form-item label="默认时区">
          <el-select v-model="editForm.timezone">
            <el-option label="Asia/Shanghai (UTC+08:00)" value="Asia/Shanghai" />
          </el-select>
        </el-form-item>
        <el-form-item label="默认语言">
          <el-select v-model="editForm.language">
            <el-option label="简体中文" value="zh-CN" />
            <el-option label="English" value="en-US" />
          </el-select>
        </el-form-item>
        <el-form-item class="group-profile-form__wide" label="集团说明">
          <el-input v-model="editForm.description" type="textarea" :rows="4" resize="none" />
        </el-form-item>
        <el-form-item class="group-profile-form__wide" label="备注">
          <el-input v-model="editForm.remarks" type="textarea" :rows="3" resize="none" />
        </el-form-item>
      </el-form>
    </FormDrawer>
  </AppPage>
</template>

<style scoped lang="scss">
.group-profile-page__state {
  min-height: calc(var(--spacing-12) * 5);
}

.group-identity {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) minmax(0, 2fr);
  align-items: center;
  gap: var(--spacing-5);
  padding: var(--spacing-5) var(--spacing-6);
  overflow: hidden;
}

.group-identity__logo {
  display: grid;
  width: calc(var(--spacing-12) * 2 + var(--spacing-4));
  height: calc(var(--spacing-12) + var(--spacing-6));
  overflow: hidden;
  background: var(--background-sidebar);
  border-radius: var(--radius-large);
  place-items: center;
}

.group-identity__logo img,
.profile-logo-value img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.group-identity__logo span {
  color: var(--text-inverse);
  font-size: var(--font-size-lg);
  font-weight: 700;
}

.group-identity__copy p {
  margin: 0 0 var(--spacing-1);
  color: var(--color-primary);
  font-size: var(--font-size-xs);
  font-weight: 650;
  letter-spacing: 0.12em;
}

.group-identity__copy h2,
.profile-section h2 {
  margin: 0;
  color: var(--text-primary);
}

.group-identity__copy h2 {
  font-size: var(--font-size-xl);
}

.group-identity__copy span,
.profile-section header p {
  color: var(--text-secondary);
}

.group-identity__metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin: 0;
}

.group-identity__metrics div {
  min-width: 0;
  padding: var(--spacing-2) var(--spacing-5);
  border-left: 1px solid var(--border-light);
}

.group-identity__metrics dt {
  margin-bottom: var(--spacing-2);
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
}

.group-identity__metrics dd {
  margin: 0;
  overflow-wrap: anywhere;
  color: var(--text-primary);
  font-weight: 600;
}

.group-profile-page__sections {
  display: grid;
  gap: var(--spacing-6);
}

.profile-section header {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-3);
  margin-bottom: var(--spacing-4);
  color: var(--color-primary);
}

.profile-section h2 {
  font-size: var(--font-size-md);
}

.profile-section header p {
  margin: var(--spacing-1) 0 0;
  font-size: var(--font-size-sm);
}

.profile-section :deep(.el-descriptions__table) {
  table-layout: fixed;
}

.profile-section :deep(.el-descriptions__content) {
  overflow-wrap: anywhere;
  white-space: normal;
  word-break: break-word;
}

.profile-logo-value {
  width: calc(var(--spacing-12) * 2);
  height: var(--spacing-12);
}

.read-only-value,
.profile-logo-value span {
  color: var(--text-secondary);
}

.group-profile-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 var(--spacing-4);
  margin-top: var(--spacing-5);
}

.group-profile-form__wide {
  grid-column: 1 / -1;
}

.group-profile-form__help {
  width: 100%;
  margin: var(--spacing-2) 0 0;
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
}

@media (max-width: 1500px) {
  .group-identity {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .group-identity__metrics {
    grid-column: 1 / -1;
  }

  .group-identity__metrics div:first-child {
    border-left: 0;
  }
}
</style>
