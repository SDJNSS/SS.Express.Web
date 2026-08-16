<template>
  <page-container
    :title="isEdit ? '编辑角色' : '创建角色'"
    :show-header="true"
    :show-footer="true"
  >
    <form class="role-form" @submit.prevent="handleSubmit">
      <div class="form-section">
        <h3 class="section-title">基本信息</h3>
        <div class="form-row">
          <div class="form-item">
            <label class="required">角色编码</label>
            <input
              v-model="formData.roleCode"
              type="text"
              placeholder="请输入角色编码"
              :disabled="isEdit"
              class="form-input"
              required
            />
          </div>
          <div class="form-item">
            <label class="required">角色名称</label>
            <input
              v-model="formData.roleName"
              type="text"
              placeholder="请输入角色名称"
              class="form-input"
              required
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-item">
            <label class="required">角色类型</label>
            <select v-model="formData.roleType" class="form-select" required>
              <option value="">请选择角色类型</option>
              <option value="system">系统角色</option>
              <option value="custom">自定义角色</option>
              <option value="template">模板角色</option>
            </select>
          </div>
          <div class="form-item">
            <label class="required">状态</label>
            <select v-model="formData.status" class="form-select" required>
              <option value="">请选择状态</option>
              <option value="active">启用</option>
              <option value="inactive">停用</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-item">
            <label>排序</label>
            <input
              v-model.number="formData.sortOrder"
              type="number"
              placeholder="请输入排序"
              class="form-input"
            />
          </div>
          <div class="form-item"></div>
        </div>
      </div>

      <div class="form-section">
        <h3 class="section-title">其他信息</h3>
        <div class="form-row">
          <div class="form-item full-width">
            <label>备注</label>
            <textarea
              v-model="formData.remarks"
              placeholder="请输入备注"
              class="form-textarea"
              rows="4"
            ></textarea>
          </div>
        </div>
      </div>
    </form>

    <template #footer>
      <div class="form-actions">
        <button type="button" class="btn-cancel" @click="handleCancel">取消</button>
        <button type="button" class="btn-submit" @click="handleSubmit">保存</button>
      </div>
    </template>
  </page-container>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import PageContainer from '@/components/common/PageContainer.vue';
import { createRole, updateRole, getRoleDetail } from '@/api/iam/role';
import { useAuthStore } from '@/stores/auth';
import type { Role } from '@/types';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const isEdit = ref(false);
const roleId = ref<number>(0);

interface RoleFormData {
  tenantId: number;
  roleCode: string;
  roleName: string;
  roleType: string;
  sortOrder: number;
  status: string;
  remarks: string;
}

const formData = reactive<RoleFormData>({
  tenantId: authStore.tenantId || 0,
  roleCode: '',
  roleName: '',
  roleType: '',
  sortOrder: 0,
  status: 'active',
  remarks: '',
});

const loadRoleDetail = async () => {
  try {
    const data = await getRoleDetail(roleId.value);
    Object.assign(formData, data);
  } catch (error) {
    console.error('加载角色详情失败:', error);
    alert('加载角色详情失败');
  }
};

const handleSubmit = async () => {
  try {
    if (isEdit.value) {
      await updateRole(roleId.value, formData);
      alert('更新成功');
    } else {
      await createRole(formData);
      alert('创建成功');
    }
    router.push('/role');
  } catch (error) {
    console.error('保存失败:', error);
    alert('保存失败');
  }
};

const handleCancel = () => {
  router.back();
};

onMounted(() => {
  if (route.params.id) {
    isEdit.value = true;
    roleId.value = Number(route.params.id);
    loadRoleDetail();
  }
});
</script>

<style scoped>
.role-form {
  max-width: 1200px;
}

.form-section {
  background: #fff;
  padding: 24px;
  margin-bottom: 16px;
  border-radius: 4px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 20px 0;
  padding-bottom: 12px;
  border-bottom: 1px solid #e8e8e8;
  color: #262626;
}

.form-row {
  display: flex;
  gap: 24px;
  margin-bottom: 20px;
}

.form-row:last-child {
  margin-bottom: 0;
}

.form-item {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.form-item.full-width {
  flex: 1 1 100%;
}

.form-item label {
  font-size: 14px;
  color: #262626;
  margin-bottom: 8px;
  font-weight: 500;
}

.form-item label.required::before {
  content: '*';
  color: #ff4d4f;
  margin-right: 4px;
}

.form-input,
.form-select,
.form-textarea {
  padding: 8px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 14px;
  transition: all 0.3s;
  width: 100%;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  border-color: #1890ff;
  outline: none;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.1);
}

.form-input:disabled {
  background: #f5f5f5;
  cursor: not-allowed;
}

.form-textarea {
  resize: vertical;
  font-family: inherit;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn-cancel,
.btn-submit {
  padding: 8px 24px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-cancel {
  background: #fff;
  color: #595959;
  border: 1px solid #d9d9d9;
}

.btn-cancel:hover {
  color: #1890ff;
  border-color: #1890ff;
}

.btn-submit {
  background: #1890ff;
  color: #fff;
}

.btn-submit:hover {
  background: #40a9ff;
}
</style>
