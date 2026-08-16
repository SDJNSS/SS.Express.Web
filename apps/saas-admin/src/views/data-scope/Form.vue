<template>
  <page-container
    :title="isEdit ? '编辑数据权限' : '创建数据权限'"
    :show-header="true"
    :show-footer="true"
  >
    <form class="data-scope-form" @submit.prevent="handleSubmit">
      <div class="form-section">
        <h3 class="section-title">基本信息</h3>
        <div class="form-row">
          <div class="form-item">
            <label class="required">角色</label>
            <select v-model.number="formData.roleId" class="form-select" required :disabled="isEdit">
              <option value="0">请选择角色</option>
              <option v-for="role in roleList" :key="role.id" :value="role.id">
                {{ role.roleName }}
              </option>
            </select>
          </div>
          <div class="form-item">
            <label class="required">应用</label>
            <select v-model.number="formData.appId" class="form-select" required :disabled="isEdit">
              <option value="0">请选择应用</option>
              <option v-for="app in appList" :key="app.id" :value="app.id">
                {{ app.appName }}
              </option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-item">
            <label class="required">资源类型</label>
            <input
              v-model="formData.resourceType"
              type="text"
              placeholder="请输入资源类型，如：order、customer"
              class="form-input"
              required
            />
          </div>
          <div class="form-item">
            <label class="required">权限范围模式</label>
            <select v-model="formData.scopeMode" class="form-select" required>
              <option value="">请选择权限范围模式</option>
              <option value="all">全部数据</option>
              <option value="dept">本部门数据</option>
              <option value="dept_tree">本部门及下级部门数据</option>
              <option value="self">仅本人数据</option>
              <option value="custom">自定义数据</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-item">
            <label>字段名称</label>
            <input
              v-model="formData.fieldName"
              type="text"
              placeholder="请输入字段名称，如：org_id"
              class="form-input"
            />
          </div>
          <div class="form-item">
            <label>包含子级</label>
            <select v-model="formData.includeChildren" class="form-select">
              <option :value="true">是</option>
              <option :value="false">否</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-item">
            <label class="required">状态</label>
            <select v-model="formData.status" class="form-select" required>
              <option value="">请选择状态</option>
              <option value="active">启用</option>
              <option value="inactive">停用</option>
            </select>
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
import { createDataScope, updateDataScope, getDataScopeDetail } from '@/api/iam/data-scope';
import { getRoleList } from '@/api/iam/role';
import { getAppList } from '@/api/saas/app';
import { useAuthStore } from '@/stores/auth';
import type { DataScope, Role, App } from '@/types';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const isEdit = ref(false);
const dataScopeId = ref<number>(0);
const roleList = ref<Role[]>([]);
const appList = ref<App[]>([]);

interface DataScopeFormData {
  tenantId: number;
  roleId: number;
  appId: number;
  resourceType: string;
  scopeMode: 'all' | 'dept' | 'dept_tree' | 'self' | 'custom' | '';
  fieldName: string;
  includeChildren: boolean;
  status: string;
  remarks: string;
}

const formData = reactive<DataScopeFormData>({
  tenantId: authStore.tenantId || 0,
  roleId: 0,
  appId: 0,
  resourceType: '',
  scopeMode: '',
  fieldName: '',
  includeChildren: false,
  status: 'active',
  remarks: '',
});

const loadRoleList = async () => {
  try {
    const result = await getRoleList({
      tenantId: formData.tenantId,
      pageNum: 1,
      pageSize: 100
    });
    roleList.value = result.records || [];
  } catch (error) {
    console.error('加载角色列表失败:', error);
  }
};

const loadAppList = async () => {
  try {
    const result = await getAppList({ pageNum: 1, pageSize: 100 });
    appList.value = result.records || [];
  } catch (error) {
    console.error('加载应用列表失败:', error);
  }
};

const loadDataScopeDetail = async () => {
  try {
    const data = await getDataScopeDetail(dataScopeId.value);
    Object.assign(formData, data);
  } catch (error) {
    console.error('加载数据权限详情失败:', error);
    alert('加载数据权限详情失败');
  }
};

const handleSubmit = async () => {
  if (!formData.roleId) {
    alert('请选择角色');
    return;
  }
  if (!formData.appId) {
    alert('请选择应用');
    return;
  }

  try {
    if (isEdit.value) {
      await updateDataScope(dataScopeId.value, formData);
      alert('更新成功');
    } else {
      await createDataScope(formData);
      alert('创建成功');
    }
    router.push('/data-scope');
  } catch (error) {
    console.error('保存失败:', error);
    alert('保存失败');
  }
};

const handleCancel = () => {
  router.back();
};

onMounted(async () => {
  await Promise.all([loadRoleList(), loadAppList()]);

  if (route.params.id) {
    isEdit.value = true;
    dataScopeId.value = Number(route.params.id);
    await loadDataScopeDetail();
  }
});
</script>

<style scoped>
.data-scope-form {
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

.form-input:disabled,
.form-select:disabled {
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
