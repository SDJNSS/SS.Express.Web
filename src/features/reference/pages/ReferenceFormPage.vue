<script setup lang="ts">
import { reactive, ref } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'

import OrganizationSelector from '@shared/business-components/OrganizationSelector.vue'
import UserSelector from '@shared/business-components/UserSelector.vue'
import AppPage from '@shared/components/AppPage.vue'
import PageHeader from '@shared/components/PageHeader.vue'
import FormPageTemplate from '@shared/components/page-templates/FormPageTemplate.vue'
import { notification } from '@shared/services/notification'

interface ReferenceFormModel {
  name: string
  category: string
  organizationId: string
  ownerId: string
  effectiveDate: string
  description: string
}

const formRef = ref<FormInstance>()
const saving = ref(false)
const form = reactive<ReferenceFormModel>({
  name: '',
  category: '',
  organizationId: '',
  ownerId: '',
  effectiveDate: '',
  description: '',
})
const rules: FormRules<ReferenceFormModel> = {
  name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
  category: [{ required: true, message: '请选择业务类型', trigger: 'change' }],
  organizationId: [{ required: true, message: '请选择所属组织', trigger: 'change' }],
}

async function save() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  saving.value = true
  await new Promise((resolve) => window.setTimeout(resolve, 420))
  saving.value = false
  notification.success('表单已保存')
}
</script>

<template>
  <AppPage>
    <FormPageTemplate>
      <template #header>
        <PageHeader
          title="ReferenceFormPage"
          description="复杂表单使用独立页面，并按信息分组组织字段"
        >
          <template #actions
            ><el-button @click="$router.back()">取消</el-button
            ><el-button type="primary" :loading="saving" @click="save">保存</el-button></template
          >
        </PageHeader>
      </template>
      <el-form
        ref="formRef"
        class="reference-form"
        :model="form"
        :rules="rules"
        label-position="top"
      >
        <h2>基础信息</h2>
        <div class="form-grid">
          <el-form-item label="名称" prop="name"
            ><el-input v-model="form.name" placeholder="请输入名称"
          /></el-form-item>
          <el-form-item label="业务类型" prop="category"
            ><el-select v-model="form.category" placeholder="请选择业务类型"
              ><el-option label="基础资料" value="master-data" /><el-option
                label="运营配置"
                value="operation" /></el-select
          ></el-form-item>
          <el-form-item label="所属组织" prop="organizationId"
            ><OrganizationSelector v-model="form.organizationId"
          /></el-form-item>
          <el-form-item label="负责人" prop="ownerId"
            ><UserSelector v-model="form.ownerId"
          /></el-form-item>
          <el-form-item label="生效日期" prop="effectiveDate"
            ><el-date-picker
              v-model="form.effectiveDate"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="请选择生效日期"
          /></el-form-item>
        </div>
        <h2>补充说明</h2>
        <el-form-item label="说明" prop="description"
          ><el-input
            v-model="form.description"
            type="textarea"
            :rows="5"
            maxlength="500"
            show-word-limit
        /></el-form-item>
      </el-form>
    </FormPageTemplate>
  </AppPage>
</template>

<style scoped lang="scss">
.reference-form {
  max-width: 980px;
}
.reference-form h2 {
  padding-bottom: var(--spacing-3);
  margin: 0 0 var(--spacing-4);
  font-size: var(--font-size-md);
  border-bottom: 1px solid var(--border-light);
}
.reference-form h2:not(:first-child) {
  margin-top: var(--spacing-6);
}
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 var(--spacing-5);
}
:deep(.el-select),
:deep(.el-date-editor) {
  width: 100%;
}
</style>
